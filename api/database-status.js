import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Database not configured' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      select current_database() as database_name,
        current_schema() as schema_name,
        to_regclass('public.organizations') is not null as organizations_exists,
        to_regclass('public.opportunities') is not null as opportunities_exists
    `;
    return res.status(200).json(rows[0]);
  } catch (error) {
    return res.status(503).json({ error: 'Database connectivity check failed', code: error?.code || 'unknown' });
  }
}
