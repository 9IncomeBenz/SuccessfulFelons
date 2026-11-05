import { neon } from '@neondatabase/serverless';
import { authHeaders, requireAuthUser } from './_lib/auth.js';
import { requireLiveAccount } from './_lib/account-active.js';

const text=(v,max)=>typeof v==='string'?v.trim().slice(0,max+1):'';
const kinds=new Set(['employment','housing']);
const types=new Set(['vacancy','directory','program']);
function validUrl(input){
 try{const u=new URL(input);return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=1800?u.href:null}catch{return null}
}
export default async function handler(req,res){
 authHeaders(res);res.setHeader('Allow','POST');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(process.env.ACCOUNT_REGISTRATION_ENABLED!=='true')return res.status(503).json({error:'Member submissions are unavailable'});
 let owner;
 try{owner=await requireAuthUser(req);}catch(e){return res.status(e?.statusCode===401?401:503).json({error:'Sign in to suggest an opportunity'});}
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'Storage unavailable'});
 const sql=neon(process.env.DATABASE_URL);
 try{await requireLiveAccount(sql,owner)}catch(e){return res.status(e?.statusCode===401?401:503).json({error:'Account unavailable'});}
 try{
  const payload=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
  if(payload.length>6000)return res.status(413).json({error:'Submission too large'});
  const data=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const kind=text(data.kind,20),listingType=text(data.listing_type,20);
  const title=text(data.title,180),organization=text(data.organization_name,160);
  const city=text(data.city,100),county=text(data.county,80);
  const sourceUrl=validUrl(text(data.source_url,1800));
  const description=text(data.description,1500);
  if(!kinds.has(kind)||!types.has(listingType)||title.length<4||title.length>180||
     organization.length<2||organization.length>160||city.length>100||county.length>80||
     !sourceUrl||description.length<15||description.length>1500)return res.status(400).json({error:'Complete all required fields and provide a valid HTTPS source'});
  const limits=await sql`
   SELECT count(*) FILTER (WHERE created_at>now()-interval '24 hours')::int AS daily,
   count(*) FILTER (WHERE status='pending')::int AS pending
   FROM sf_private.opportunity_submissions WHERE owner_user_id=${owner}
  `;
  if(limits[0]?.daily>=5||limits[0]?.pending>=10)return res.status(429).json({error:'Submission limit reached. Try again later.'});
  const record=await sql`
   INSERT INTO sf_private.opportunity_submissions
   (owner_user_id,kind,listing_type,title,organization_name,city,county,source_url,description)
   VALUES (${owner},${kind},${listingType},${title},${organization},${city},${county},${sourceUrl},${description})
   RETURNING id,status,created_at
  `;
  return res.status(201).json({submission:record[0],message:'Received for human review. This suggestion is not publicly listed or verified.'});
 }catch(e){if(e instanceof SyntaxError)return res.status(400).json({error:'Invalid request'});
  console.error('Opportunity submission failed',e?.code||'unknown');
  return res.status(503).json({error:'Submission service unavailable'});
 }
}
