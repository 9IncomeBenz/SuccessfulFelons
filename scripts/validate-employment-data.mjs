import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/employment-research.json', 'utf8'));
const homepage = readFileSync('index.html', 'utf8');
const directory = readFileSync('employment.html', 'utf8');

assert.equal(data.schema_version, 1, 'Unexpected data schema version');
assert.ok(Array.isArray(data.records) && data.records.length > 0, 'No research records');
assert.match(homepage, /fetch\('\/data\/employment-research\.json'/, 'Main search must use shared research data');
assert.match(directory, /fetch\('\/data\/employment-research\.json'/, 'Directory must use shared research data');
assert.match(homepage, /item\.opening_status==='not_employer_confirmed'/, 'Main search must exclude archived and unavailable jobs');
assert.match(directory, /id="availability"/, 'Directory must offer historical status filter');
assert.match(homepage, /employer has not confirmed the vacancy/i, 'Main search must disclose lack of employer confirmation');

const ids = new Set();
const kinds = new Set(['program', 'posting', 'timed', 'case']);
const statuses = new Set(['not_employer_confirmed', 'expired_listing', 'source_unavailable']);
const domains = new Set();

for (const item of data.records) {
  for (const field of ['id', 'employer', 'role', 'area', 'source', 'rule', 'detail', 'reviewed_on', 'date']) {
    assert.ok(typeof item[field] === 'string' && item[field].trim(), `${item.id || 'unknown'}: missing ${field}`);
  }
  assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid stable ID');
  assert.ok(!ids.has(item.id), `Duplicate employer research ID: ${item.id}`);
  ids.add(item.id);
  assert.ok(kinds.has(item.kind), `Invalid category for ${item.id}`);
  assert.ok(statuses.has(item.opening_status), `Invalid job status for ${item.id}`);
  assert.equal(item.is_verified_vacancy, false, `Research incorrectly labeled verified vacancy: ${item.id}`);
  assert.match(item.reviewed_on, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(Number.isFinite(Date.parse(item.reviewed_on)), 'Invalid review date');
  const url = new URL(item.source);
  assert.equal(url.protocol, 'https:', 'Only HTTPS source links allowed');
  domains.add(url.hostname);
  if (item.kind === 'timed') {
    assert.ok(Number.isInteger(item.years) && item.years > 0, `Invalid waiting period: ${item.id}`);
    assert.match(item.rule, new RegExp(String(item.years)), `Year restriction not in policy: ${item.id}`);
    assert.equal(item.screening_scope, 'position_or_assignment', 'Waiting period must be position-scoped');
  } else {
    assert.equal(item.years, undefined, 'Do not invent a numeric cutoff where none is documented');
  }
  if (item.opening_status !== 'not_employer_confirmed') {
    assert.ok(typeof item.status_note === 'string' && item.status_note.length > 10, 'Archive status needs explanation');
  }
}
console.log(`Employment research validated: ${data.records.length} records, ${ids.size} unique IDs, ${domains.size} source domains. No research lead is presented as an employer-confirmed vacancy.`);
