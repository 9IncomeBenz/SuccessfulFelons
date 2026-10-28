import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // This status route never exposes connection strings, tokens or user data.
  let privateStorageReady = false;
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      const rows = await sql`SELECT to_regclass('sf_private.saved_leads') IS NOT NULL AS ready`;
      privateStorageReady = rows[0]?.ready === true;
    } catch {
      privateStorageReady = false;
    }
  }
  const managedIdentityConfigured = Boolean(process.env.NEON_AUTH_BASE_URL);
  return res.status(200).json({
    accountsAvailable: false,
    localSavingAvailable: true,
    managedIdentityConfigured,
    privateStorageReady,
    onlineSyncAvailable: false,
    nextStep: privateStorageReady ? 'Private storage is installed. Complete account sign-in, email verification, cross-device isolation, export and deletion tests before enabling accounts.' : 'Private storage is unavailable. Verify the reviewed migration and database connection before testing account sign-in.'
  });
}
