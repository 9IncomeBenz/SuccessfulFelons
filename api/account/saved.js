import { neon } from '@neondatabase/serverless';
import { authHeaders, requireAuthUser } from '../_lib/auth.js';
import { requireLiveAccount } from '../_lib/account-active.js';

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max + 1) : '';
}

function validateItem(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = clean(raw.id, 120);
  const title = clean(raw.title, 180);
  const organization = clean(raw.organization, 180);
  const urlText = clean(raw.url, 1800);
  if (!id || id.length > 120 || !title || title.length > 180 ||
      organization.length > 180 || urlText.length > 1800) return null;
  let url = '';
  if (urlText) {
    try {
      const parsed = new URL(urlText);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
          !parsed.hostname || parsed.href.length > 1800) return null;
      url = parsed.href;
    } catch { return null; }
  }
  return { id, title, organization, url };
}

export default async function handler(req, res) {
  authHeaders(res);
  res.setHeader('Allow', 'GET, PUT, DELETE');
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (process.env.ACCOUNT_REGISTRATION_ENABLED !== 'true') {
    return res.status(503).json({ error: 'Private account service is not yet available' });
  }
  let owner;
  try {
    owner = await requireAuthUser(req);
  } catch (error) {
    return res.status(error?.statusCode || 503).json({ error: error?.statusCode === 401 ? 'Authentication required' : 'Account service unavailable' });
  }
  const sql = neon(process.env.DATABASE_URL);
  try {await requireLiveAccount(sql,owner)} catch(error) {return res.status(error?.statusCode===401?401:503).json({error:'Account not active or email not verified'});}
  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT lead_id AS id, title, organization, source_url AS url, updated_at
        FROM sf_private.saved_leads
        WHERE owner_user_id = ${owner}
        ORDER BY updated_at DESC
        LIMIT 100
      `;
      return res.status(200).json({ leads: rows, storage: 'private-account', authenticated: true });
    }
    if (req.method === 'PUT') {
      const serialized = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || '');
      if (serialized.length > 5000) return res.status(413).json({ error: 'Request too large' });
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const item = validateItem(body?.item);
      if (!item) return res.status(400).json({ error: 'Invalid saved lead' });
      // Quota is enforced on the server. Only the identity verified from the
      // JWT is used as the row owner; user-provided owner IDs are ignored.
      const count = await sql`
        SELECT count(*)::int AS total, EXISTS (
          SELECT 1 FROM sf_private.saved_leads
          WHERE owner_user_id = ${owner} AND lead_id = ${item.id}
        ) AS already_saved
        FROM sf_private.saved_leads WHERE owner_user_id = ${owner}
      `;
      if (!count[0].already_saved && count[0].total >= 100) {
        return res.status(409).json({ error: '100 saved-lead limit reached' });
      }
      const rows = await sql`
        INSERT INTO sf_private.saved_leads (owner_user_id, lead_id, title, organization, source_url)
        VALUES (${owner}, ${item.id}, ${item.title}, ${item.organization}, ${item.url})
        ON CONFLICT (owner_user_id, lead_id) DO UPDATE
        SET title = excluded.title,
            organization = excluded.organization,
            source_url = excluded.source_url,
            updated_at = now()
        RETURNING lead_id AS id, title, organization, source_url AS url, updated_at
      `;
      return res.status(200).json({ saved: rows[0] });
    }
    const serialized = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || '');
    if (serialized.length > 1000) return res.status(413).json({ error: 'Request too large' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const id = clean(body?.id, 120);
    if (!id || id.length > 120) return res.status(400).json({ error: 'Invalid lead ID' });
    const deleted = await sql`
      DELETE FROM sf_private.saved_leads
      WHERE owner_user_id = ${owner} AND lead_id = ${id}
      RETURNING lead_id
    `;
    return res.status(200).json({ deleted: deleted.length > 0 });
  } catch (error) {
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid JSON' });
    console.error('Private account saved-leads query failed', error?.code || 'unknown');
    return res.status(503).json({ error: 'Private saved-leads service unavailable' });
  }
}
