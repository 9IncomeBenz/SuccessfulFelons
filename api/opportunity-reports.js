import { neon } from '@neondatabase/serverless';
import { authHeaders, requireAuthUser } from './_lib/auth.js';
import { requireLiveAccount } from './_lib/account-active.js';

const reasons=new Set(['closed','incorrect','screening','other']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function handler(req,res){
 authHeaders(res);res.setHeader('Allow','POST');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(process.env.ACCOUNT_REGISTRATION_ENABLED!=='true')return res.status(503).json({error:'Report service unavailable'});
 let owner;
 try{owner=await requireAuthUser(req)}catch(e){return res.status(e?.statusCode===401?401:503).json({error:'Sign in to report a listing'})}
 const sql=neon(process.env.DATABASE_URL);
 try{await requireLiveAccount(sql,owner)}catch(e){return res.status(e?.statusCode===401?401:503).json({error:'Account unavailable'})}
 try{
  const payload=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
  if(payload.length>1400)return res.status(413).json({error:'Report too large'});
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const id=typeof data.opportunity_id==='string'?data.opportunity_id.trim():'';
  const reason=typeof data.reason==='string'?data.reason.trim():'';
  const details=typeof data.details==='string'?data.details.trim():'';
  if(!uuid.test(id)||!reasons.has(reason)||details.length>500)return res.status(400).json({error:'Invalid listing report'});
  const limits=await sql`
   SELECT count(*)::int AS daily FROM sf_private.opportunity_reports
   WHERE owner_user_id=${owner} AND updated_at>now()-interval '24 hours'
  `;
  if(limits[0]?.daily>=15)return res.status(429).json({error:'Daily report limit reached'});
  const found=await sql`SELECT id FROM public.opportunities WHERE id=${id}::uuid AND status='published' LIMIT 1`;
  if(!found.length)return res.status(404).json({error:'Listing not found'});
  const row=await sql`
   INSERT INTO sf_private.opportunity_reports(owner_user_id,opportunity_id,reason,details)
   VALUES(${owner},${id}::uuid,${reason},${details})
   ON CONFLICT(owner_user_id,opportunity_id) DO UPDATE
   SET reason=excluded.reason,details=excluded.details,status='pending',updated_at=now()
   RETURNING id,status
  `;
  return res.status(201).json({report:row[0],message:'Thank you. Your report is in the private review queue.'});
 }catch(e){if(e instanceof SyntaxError)return res.status(400).json({error:'Invalid JSON'});
  console.error('Listing report error',e?.code||'unknown');
  return res.status(503).json({error:'Report service unavailable'});
 }
}
