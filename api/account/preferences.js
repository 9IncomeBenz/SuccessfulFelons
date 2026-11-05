import {neon} from '@neondatabase/serverless';
import {authHeaders,requireAuthUser} from '../_lib/auth.js';
import {requireLiveAccount} from '../_lib/account-active.js';
export default async function handler(req,res){
 authHeaders(res);res.setHeader('Allow','GET, PUT');
 if(!['GET','PUT'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 if(process.env.ACCOUNT_REGISTRATION_ENABLED!=='true')return res.status(503).json({error:'Preferences unavailable'});
 let owner;try{owner=await requireAuthUser(req)}catch(e){return res.status(401).json({error:'Sign in required'})}
 const sql=neon(process.env.DATABASE_URL);
 try{await requireLiveAccount(sql,owner)}catch(e){return res.status(401).json({error:'Account unavailable'})}
 try{
  if(req.method==='GET'){
   const rows=await sql`SELECT home_county,focus,updated_at FROM sf_private.member_preferences WHERE owner_user_id=${owner}`;
   return res.status(200).json({preferences:rows[0]||{home_county:'',focus:'all'}});
  }
  const payload=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
  if(payload.length>500)return res.status(413).json({error:'Too much data'});
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const county=typeof data.home_county==='string'?data.home_county.trim():'';
  const focus=data.focus;
  if(county.length>80||!['all','employment','housing'].includes(focus))return res.status(400).json({error:'Invalid preferences'});
  const rows=await sql`
   INSERT INTO sf_private.member_preferences(owner_user_id,home_county,focus)
   VALUES(${owner},${county},${focus})
   ON CONFLICT(owner_user_id) DO UPDATE SET home_county=excluded.home_county,focus=excluded.focus,updated_at=now()
   RETURNING home_county,focus,updated_at
  `;
  return res.status(200).json({preferences:rows[0]});
 }catch(e){return res.status(503).json({error:'Preferences unavailable'})}
}
