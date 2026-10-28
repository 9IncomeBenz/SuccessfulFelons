import { neon } from '@neondatabase/serverless';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method!=='GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  let privateStorageReady=false;
  if(process.env.DATABASE_URL)try{
    const sql=neon(process.env.DATABASE_URL);
    const result=await sql`SELECT to_regclass('sf_private.saved_leads') IS NOT NULL AND EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid='sf_private.saved_leads'::regclass
        AND tgname='sf_saved_leads_quota_before_insert'
        AND tgenabled='O'
    ) AS ready`;
    privateStorageReady=result[0]?.ready===true;
  }catch{}
  const configured=Boolean(process.env.NEON_AUTH_BASE_URL);
  const enabled=privateStorageReady&&configured&&process.env.ACCOUNT_REGISTRATION_ENABLED==='true';
  return res.status(200).json({
    accountsAvailable:enabled,
    onlineSyncAvailable:enabled,
    localSavingAvailable:true,
    privateStorageReady,
    managedIdentityConfigured:configured,
    authUrl:enabled?process.env.NEON_AUTH_BASE_URL:null,
    nextStep:enabled?'Sign in to access your private saved links. Local import is opt-in.':'Account sign-in is not publicly enabled. Local links and backups remain available.'
  });
}
