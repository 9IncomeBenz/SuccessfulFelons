// Managed Neon Auth users have UUID IDs in neon_auth."user".
// Checking live identity state prevents a previously issued short-lived JWT
// from continuing to save data after the identity is deleted or banned.
export async function requireLiveAccount(sql, owner) {
  if (typeof owner !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner)) {
    const error = new Error('Authentication required');error.statusCode=401;throw error;
  }
  try {
    const rows=await sql`
      SELECT EXISTS (
        SELECT 1 FROM neon_auth."user"
        WHERE id=${owner}::uuid
          AND "emailVerified"=TRUE
          AND COALESCE(banned,FALSE)=FALSE
      ) AS active
    `;
    if (rows[0]?.active === true) return owner;
  } catch (error) {
    if (error?.statusCode===401) throw error;
    const fail=new Error('Account service unavailable');fail.statusCode=503;throw fail;
  }
  const error=new Error('Account not active or email not verified');
  error.statusCode=401;throw error;
}
