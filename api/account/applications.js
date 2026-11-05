import {neon} from '@neondatabase/serverless';
import {authHeaders,requireAuthUser} from '../_lib/auth.js';
import {requireLiveAccount} from '../_lib/account-active.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const stages=new Set(['Interested','Contacted','Applied','Interview','Offer','Closed']);
const kinds=new Set(['employment','housing']);
const str=(x,max)=>typeof x==='string'?x.trim().slice(0,max+1):'';
function cleanUrl(raw){
 if(!raw)return '';
 try{const parsed=new URL(raw);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&parsed.href.length<=1800?parsed.href:null}catch{return null}
}
function cleanDate(raw){
 if(raw==null||raw==='')return null;
 if(typeof raw!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(raw))return undefined;
 const d=new Date(raw+'T00:00:00Z');
 return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===raw?raw:undefined;
}
export default async function handler(req,res){
 authHeaders(res);res.setHeader('Allow','GET, POST, PUT, DELETE');
 if(!['GET','POST','PUT','DELETE'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 if(process.env.ACCOUNT_REGISTRATION_ENABLED!=='true'||!process.env.DATABASE_URL)return res.status(503).json({error:'Application tracker unavailable'});
 let owner;
 try{owner=await requireAuthUser(req)}catch(e){return res.status(e?.statusCode===401?401:503).json({error:'Sign in to manage your applications'})}
 const sql=neon(process.env.DATABASE_URL);
 try{await requireLiveAccount(sql,owner)}catch(e){return res.status(e?.statusCode===401?401:503).json({error:'Your account is unavailable'})}
 try{
  if(req.method==='GET'){
   const applications=await sql`
    SELECT id,kind,title,organization,source_url,stage,next_step,follow_up_on,created_at,updated_at
    FROM sf_private.member_applications WHERE owner_user_id=${owner}
    ORDER BY CASE WHEN follow_up_on IS NULL THEN 1 ELSE 0 END,
      follow_up_on ASC,updated_at DESC LIMIT 100
   `;
   return res.status(200).json({applications,limit:100});
  }
  const payload=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
  if(payload.length>3000)return res.status(413).json({error:'Application details too long'});
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const id=str(data.id,50);
  if(req.method==='DELETE'){
   if(!uuid.test(id))return res.status(400).json({error:'Invalid application ID'});
   const removed=await sql`
     DELETE FROM sf_private.member_applications WHERE id=${id}::uuid AND owner_user_id=${owner}
     RETURNING id
   `;
   return res.status(200).json({deleted:removed.length>0});
  }
  if(req.method==='PUT'&&!uuid.test(id))return res.status(400).json({error:'Invalid application ID'});
  const kind=str(data.kind,30),title=str(data.title,180),organization=str(data.organization,180);
  const sourceUrl=cleanUrl(str(data.source_url,1800)),stage=str(data.stage,30);
  const nextStep=str(data.next_step,300),followUp=cleanDate(data.follow_up_on);
  if(!kinds.has(kind)||title.length<3||title.length>180||organization.length>180||
     sourceUrl===null||!stages.has(stage)||nextStep.length>300||followUp===undefined)
   return res.status(400).json({error:'Invalid application details'});
  if(req.method==='POST'){
   const rows=await sql`
     INSERT INTO sf_private.member_applications
     (owner_user_id,kind,title,organization,source_url,stage,next_step,follow_up_on)
     VALUES(${owner},${kind},${title},${organization},${sourceUrl},${stage},${nextStep},${followUp}::date)
     RETURNING id,kind,title,organization,source_url,stage,next_step,follow_up_on,created_at,updated_at
   `;
   return res.status(201).json({application:rows[0]});
  }
  const rows=await sql`
   UPDATE sf_private.member_applications
   SET kind=${kind},title=${title},organization=${organization},source_url=${sourceUrl},
       stage=${stage},next_step=${nextStep},follow_up_on=${followUp}::date,updated_at=now()
   WHERE id=${id}::uuid AND owner_user_id=${owner}
   RETURNING id,kind,title,organization,source_url,stage,next_step,follow_up_on,created_at,updated_at
  `;
  if(!rows.length)return res.status(404).json({error:'Application not found in your account'});
  return res.status(200).json({application:rows[0]});
 }catch(e){
  if(e instanceof SyntaxError)return res.status(400).json({error:'Invalid JSON'});
  if(e?.code==='23514')return res.status(429).json({error:'Your account can track up to 100 applications'});
  console.error('Private application tracker failed',e?.code||'unknown');
  return res.status(503).json({error:'Application tracker temporarily unavailable'});
 }
}
