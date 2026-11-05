import {neon} from '@neondatabase/serverless';
import {authHeaders,requireAuthUser} from '../_lib/auth.js';
import {requireLiveAccount} from '../_lib/account-active.js';

// Called only after the member explicitly confirms permanent identity deletion.
// The browser must still request actual Neon Auth identity deletion separately.
export default async function handler(req,res){
 authHeaders(res);
 res.setHeader('Allow','POST');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(process.env.ACCOUNT_REGISTRATION_ENABLED!=='true'||!process.env.DATABASE_URL)
  return res.status(503).json({error:'Account deletion unavailable'});
 let owner;
 try{owner=await requireAuthUser(req)}
 catch(e){return res.status(e?.statusCode===401?401:503).json({error:'Account authorization required'})}
 const sql=neon(process.env.DATABASE_URL);
 try{await requireLiveAccount(sql,owner)}
 catch(e){return res.status(e?.statusCode===401?401:503).json({error:'Account not active'})}
 try{
  const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
  if(raw.length>250)return res.status(413).json({error:'Invalid confirmation'});
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(data.confirmation!=='DELETE MY ACCOUNT')return res.status(400).json({error:'Explicit identity deletion confirmation required'});
  // One atomic Postgres query: partial application-data deletion must never be
  // described as success. Every owner ID comes from the verified bearer token.
  const result=await sql`
   WITH saves AS (
    DELETE FROM sf_private.saved_leads WHERE owner_user_id=${owner} RETURNING lead_id
   ), tracker AS (
    DELETE FROM sf_private.member_applications WHERE owner_user_id=${owner} RETURNING id
   ), preferences AS (
    DELETE FROM sf_private.member_preferences WHERE owner_user_id=${owner} RETURNING owner_user_id
   ), submissions AS (
    DELETE FROM sf_private.opportunity_submissions WHERE owner_user_id=${owner} RETURNING id
   ), reports AS (
    DELETE FROM sf_private.opportunity_reports WHERE owner_user_id=${owner} RETURNING id
   )
   SELECT
    (SELECT COUNT(*)::int FROM saves) AS deleted_saves,
    (SELECT COUNT(*)::int FROM tracker) AS deleted_applications,
    (SELECT COUNT(*)::int FROM preferences) AS deleted_preferences,
    (SELECT COUNT(*)::int FROM submissions) AS deleted_submissions,
    (SELECT COUNT(*)::int FROM reports) AS deleted_reports
  `;
  return res.status(200).json({app_data_deleted:true,counts:result[0]});
 }catch(e){
  if(e instanceof SyntaxError)return res.status(400).json({error:'Invalid JSON'});
  console.error('Account private-data erasure failed',e?.code||'unknown');
  return res.status(503).json({error:'Unable to erase all cloud account data. Identity deletion was not attempted.'});
 }
}
