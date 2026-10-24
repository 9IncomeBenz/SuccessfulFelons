import { neon } from '@neondatabase/serverless';

const allowedKinds = new Set(['housing','employment','project','training','support']);
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.DATABASE_URL) return res.status(503).json({ error: 'Database not configured' });
  const kind = typeof req.query.kind === 'string' ? req.query.kind : '';
  const city = typeof req.query.city === 'string' ? req.query.city.trim().slice(0,80) : '';
  if (kind && !allowedKinds.has(kind)) return res.status(400).json({ error: 'Invalid opportunity type' });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const results = await sql`
      select o.id, o.kind, o.title, o.description, o.city, o.state,
             o.application_url, o.verified_at, o.expires_at, g.name as organization_name
      from opportunities o
      join organizations g on g.id = o.organization_id
      where o.status = 'published'
        and o.verified_at is not null
        and g.verified = true
        and (o.expires_at is null or o.expires_at > now())
        and (${kind} = '' or o.kind = ${kind})
        and (${city} = '' or o.city ilike ${city})
      order by o.verified_at desc, o.created_at desc
      limit 50
    `;
    return res.status(200).json({ opportunities: results });
  } catch (error) {
    console.error('Opportunity listing query failed', error?.code || 'unknown');
    return res.status(503).json({ error: 'Listings temporarily unavailable' });
  }
}
