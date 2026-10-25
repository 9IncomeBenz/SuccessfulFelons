import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.DATABASE_URL) return res.status(503).json({ healthy: false, error: 'Database not configured' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      select to_regclass('public.organizations') is not null as organizations_exists,
             to_regclass('public.opportunities') is not null as opportunities_exists
    `;
    const { organizations_exists, opportunities_exists } = rows[0];
    const healthy = Boolean(organizations_exists && opportunities_exists);
    return res.status(healthy ? 200 : 503).json({
      healthy,
      organizations_exists,
      opportunities_exists
    });
  } catch (error) {
    console.error('Database health check failed', error?.code || 'unknown');
    return res.status(503).json({ healthy: false, error: 'Database connectivity check failed' });
  }
}
