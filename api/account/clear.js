import { neon } from '@neondatabase/serverless';
import { authHeaders, requireAuthUser } from '../_lib/auth.js';
export default async function handler(req,res){
  authHeaders(res);res.setHeader('Allow','POST');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  let owner;try{owner=await requireAuthUser(req)}catch(error){return res.status(error?.statusCode===401?401:503).json({error:'Account authorization required'})}
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!body||body.confirmation!=='DELETE CLOUD SAVES')return res.status(400).json({error:'Explicit deletion confirmation required'});
    const sql=neon(process.env.DATABASE_URL);
    const result=await sql`DELETE FROM sf_private.saved_leads WHERE owner_user_id=${owner} RETURNING lead_id`;
    return res.status(200).json({deleted_count:result.length});
  }catch(error){
    if(error instanceof SyntaxError)return res.status(400).json({error:'Invalid JSON'});
    console.error('Cloud lead delete failed',error?.code||'unknown');
    return res.status(503).json({error:'Could not delete cloud saves; no success reported'});
  }
}
