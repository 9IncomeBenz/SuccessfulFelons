import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Tests real app handlers against an isolated in-memory DB, without live user data.
function source(path) {
  return readFileSync(path, 'utf8').replace(/^import .*;?\s*$/gm, '').replace(/export (default )?/g, '');
}

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const accounts = new Map([
  [a, { banned: false, verified: false }],
  [b, { banned: false, verified: false }]
]);
const records = new Map();
const ownerRecords = owner => [...records.values()].filter(item => item.owner_user_id === owner);
const fakeSql = async (strings, ...params) => {
  const statement = strings.join('?');
  if (statement.includes('FROM neon_auth."user"')) {
    const account = accounts.get(params[0]);
    return [{ active: Boolean(account && !account.banned) }];
  }
  if (statement.includes('SELECT lead_id AS id')) {
    return ownerRecords(params[0]).map(({ owner_user_id, ...entry }) => ({ ...entry }));
  }
  if (statement.includes('SELECT count(*)::int AS total')) {
    return [{
      total: ownerRecords(params[2]).length,
      already_saved: records.has(params[0] + ':' + params[1])
    }];
  }
  if (statement.includes('INSERT INTO sf_private.saved_leads')) {
    const [owner_user_id, id, title, organization, url] = params;
    const entry = { owner_user_id, id, title, organization, url };
    records.set(owner_user_id + ':' + id, entry);
    return [{ ...entry }];
  }
  if (statement.includes('DELETE FROM sf_private.saved_leads')) {
    // The clear API has a single owner param; single deletion has owner + ID.
    const owner = params[0], id = params[1];
    if (id !== undefined) {
      if (!records.delete(owner + ':' + id)) return [];
      return [{ lead_id: id }];
    }
    const deleted = ownerRecords(owner).map(x => ({ lead_id: x.id }));
    for (const row of deleted) records.delete(owner + ':' + row.lead_id);
    return deleted;
  }
  throw Error('Unexpected SQL query: ' + statement.slice(0, 100));
};

const requireLiveAccount = new Function(
  source('api/_lib/account-active.js') + ';return requireLiveAccount;'
)();

const requireAuthUser = async request => {
  if (request.headers?.authorization === 'Bearer QA_OWNER_A') return a;
  if (request.headers?.authorization === 'Bearer QA_OWNER_B') return b;
  throw Object.assign(Error('No auth'), { statusCode: 401 });
};
const env = {
  DATABASE_URL: 'postgresql://testing.invalid/qa',
  NEON_AUTH_BASE_URL: 'https://auth.testing.invalid/example',
  ACCOUNT_REGISTRATION_ENABLED: 'true'
};
const headers = res => res.setHeader('Cache-Control', 'no-store');
const savedHandler = new Function(
  'neon', 'authHeaders', 'requireAuthUser', 'requireLiveAccount', 'URL', 'process',
  source('api/account/saved.js') + ';return handler;'
)(() => fakeSql, headers, requireAuthUser, requireLiveAccount, URL, { env });
const clearHandler = new Function(
  'neon', 'authHeaders', 'requireAuthUser', 'requireLiveAccount', 'process',
  source('api/account/clear.js') + ';return handler;'
)(() => fakeSql, headers, requireAuthUser, requireLiveAccount, { env });

async function request(handler, who, method, body) {
  const res = {
    statusCode: 200, headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; }
  };
  await handler({
    method,
    body,
    headers: { authorization: who ? 'Bearer QA_OWNER_' + who : '' }
  }, res);
  return res;
}

const one = { id: 'shared-id', title: 'Account A opportunity', organization: 'Sample employer A', url: 'https://example.org/a' };
const two = { id: 'second-id', title: 'Account B opportunity', organization: 'Sample employer B', url: 'https://example.org/b' };

// A new unverified but legitimate account can save; email verification is optional.
assert.equal((await request(savedHandler, 'A', 'PUT', { item: one })).statusCode, 200);
assert.equal((await request(savedHandler, 'B', 'GET')).body.leads.length, 0, 'B must not read A saved leads');

// B must not be able to delete or overwrite A records, even using a known lead ID.
assert.deepEqual((await request(savedHandler, 'B', 'DELETE', { id: 'shared-id' })).body, { deleted: false });
assert.equal((await request(savedHandler, 'A', 'GET')).body.leads[0].title, one.title);

// Client-provided owner identifiers never change the authenticated owner.
assert.equal((await request(savedHandler, 'B', 'PUT', { owner_user_id: a, item: two })).statusCode, 200);
assert.equal((await request(savedHandler, 'A', 'GET')).body.leads.length, 1, 'Forged owner may not write to A');
assert.equal((await request(savedHandler, 'B', 'GET')).body.leads.length, 1, 'B sees only B opportunity');

// Same lead ID in a second account is a separate private record.
const collision = { ...one, title: 'B version of shared ID' };
assert.equal((await request(savedHandler, 'B', 'PUT', { item: collision })).statusCode, 200);
assert.equal((await request(savedHandler, 'A', 'GET')).body.leads[0].title, one.title);

// Clearing B cloud data must preserve A cloud data.
assert.equal((await request(clearHandler, 'B', 'POST', { confirmation: 'DELETE CLOUD SAVES' })).statusCode, 200);
assert.equal((await request(savedHandler, 'B', 'GET')).body.leads.length, 0);
assert.equal((await request(savedHandler, 'A', 'GET')).body.leads.length, 1);

// Banned identity and missing authorization must not access private records.
accounts.get(a).banned = true;
assert.equal((await request(savedHandler, 'A', 'GET')).statusCode, 401);
accounts.get(a).banned = false;
assert.equal((await request(savedHandler, null, 'GET')).statusCode, 401);
assert.equal((await request(savedHandler, 'A', 'GET')).body.leads.length, 1);
console.log('PASS: Separate A/B private records, owner spoofing denied, cloud clearing isolated, unverified sign-in supported, banned/anonymous blocked.');
