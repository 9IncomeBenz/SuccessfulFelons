import { neon } from '@neondatabase/serverless';
import { authHeaders, requireAuthUser } from '../_lib/auth.js';
import { requireLiveAccount } from '../_lib/account-active.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const actionSet=new Set(['publish','reject','resolve','expire']);
const clean=(x,n)=>typeof x==='string'?x.trim().slice(0,n+1):'';
export default async function handler(req,res){
 authHeaders(res);res.setHeader('Allow','GET, POST');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 if(process.env.ACCOUNT_REGISTRATION_ENABLED!=='true')return res.status(503).json({error:'Review service unavailable'});
 let owner;
 try{owner=await requireAuthUser(req)}catch(e){return res.status(e?.statusCode===401?401:503).json({error:'Authentication required'})}
 const authorized=new Set((process.env.SF_MODERATOR_USER_IDS||'').split(',').map(x=>x.trim()).filter(x=>uuid.test(x)));
 if(!authorized.has(owner))return res.status(403).json({error:'Moderation access denied'});
 const sql=neon(process.env.DATABASE_URL);
 try{await requireLiveAccount(sql,owner)}catch(e){return res.status(401).json({error:'Moderator account is not active'})}
 try{
  if(req.method==='GET'){
   const submissions=await sql`
    SELECT id,kind,listing_type,title,organization_name,city,county,source_url,description,status,created_at
    FROM sf_private.opportunity_submissions WHERE status='pending'
    ORDER BY created_at ASC LIMIT 75
   `;
   const reports=await sql`
    SELECT r.id,r.opportunity_id,r.reason,r.details,r.created_at,o.title AS opportunity_title
    FROM sf_private.opportunity_reports r
    JOIN public.opportunities o ON o.id=r.opportunity_id
    WHERE r.status='pending' ORDER BY r.created_at ASC LIMIT 75
   `;
   return res.status(200).json({submissions,reports,reviewer:owner});
  }
  const serialized=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
  if(serialized.length>1700)return res.status(413).json({error:'Review request too large'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  const action=clean(body.action,30),id=clean(body.id,50),note=clean(body.note,500);
  if(!actionSet.has(action)||!uuid.test(id)||note.length<12||note.length>500)
   return res.status(400).json({error:'Valid action, ID and review note (12–500 characters) required'});
  if(action==='publish'){
   const type=clean(body.listing_type,25);
   // Reviewers must attest to direct provider confirmation for a vacancy.
   if(!['vacancy','directory','program'].includes(type)||
      (type==='directory' ? body.official_source_confirmed!==true : body.provider_confirmed!==true))
    return res.status(400).json({error:'Source or direct provider confirmation required before publication'});
   const method=type==='directory'?'official_directory':'provider_contact';
   const days=type==='directory'?60:type==='vacancy'?14:30;
   const published=await sql`
    WITH claimed AS (
     UPDATE sf_private.opportunity_submissions
     SET status='published',reviewer_note=${note},reviewed_at=now()
     WHERE id=${id}::uuid AND status='pending' AND listing_type=${type}
     RETURNING *
    ),
    org AS (
     INSERT INTO public.organizations(name,kind,verified)
     SELECT organization_name,
       CASE WHEN kind='housing' THEN 'housing_provider' ELSE 'employer' END,true
     FROM claimed
     ON CONFLICT (name) DO UPDATE SET verified=true
     RETURNING id
    ),
    inserted AS (
     INSERT INTO public.opportunities(
      organization_id,kind,title,description,city,state,county,application_url,
      status,listing_type,source_url,verified_at,source_checked_at,review_due_at,
      provider_confirmed_at,verification_method,screening_policy
     )
     SELECT org.id,c.kind,c.title,c.description,
       COALESCE(NULLIF(c.city,''),'Statewide'),'OH',c.county,c.source_url,
       'published',c.listing_type,c.source_url,now(),now(),now()+${days}*interval '1 day',
       CASE WHEN c.listing_type='directory' THEN NULL ELSE now() END,
       ${method},'not_confirmed'
     FROM claimed c CROSS JOIN org
     RETURNING id
    ),
    logged AS (
     INSERT INTO sf_private.moderation_events(actor_user_id,target_type,target_id,action,note)
     SELECT ${owner},'submission',c.id,'publish',${note}
     FROM claimed c WHERE EXISTS(SELECT 1 FROM inserted)
     RETURNING id
    )
    SELECT id FROM inserted
   `;
   if(!published.length)return res.status(404).json({error:'Pending submission not found or classification changed'});
   return res.status(200).json({published_id:published[0].id,message:'Reviewed opportunity published'});
  }
  if(action==='reject'){
   const record=await sql`
    WITH done AS (
     UPDATE sf_private.opportunity_submissions SET status='rejected',reviewer_note=${note},reviewed_at=now()
     WHERE id=${id}::uuid AND status='pending' RETURNING id
    ), audit AS (
     INSERT INTO sf_private.moderation_events(actor_user_id,target_type,target_id,action,note)
     SELECT ${owner},'submission',id,'reject',${note} FROM done RETURNING id
    )
    SELECT id FROM done
   `;
   if(!record.length)return res.status(404).json({error:'Pending suggestion not found'});
   return res.status(200).json({rejected:true});
  }
  if(action==='resolve'){
   const record=await sql`
    WITH done AS (
     UPDATE sf_private.opportunity_reports SET status='reviewed',updated_at=now()
     WHERE id=${id}::uuid AND status='pending' RETURNING id
    ), audit AS (
     INSERT INTO sf_private.moderation_events(actor_user_id,target_type,target_id,action,note)
     SELECT ${owner},'report',id,'resolve',${note} FROM done RETURNING id
    )
    SELECT id FROM done
   `;
   if(!record.length)return res.status(404).json({error:'Pending report not found'});
   return res.status(200).json({resolved:true});
  }
  const record=await sql`
   WITH done AS (
    UPDATE public.opportunities SET status='expired' WHERE id=${id}::uuid AND status='published'
    RETURNING id
   ), audit AS (
    INSERT INTO sf_private.moderation_events(actor_user_id,target_type,target_id,action,note)
    SELECT ${owner},'opportunity',id,'expire',${note} FROM done RETURNING id
   ) SELECT id FROM done
  `;
  if(!record.length)return res.status(404).json({error:'Published opportunity not found'});
  return res.status(200).json({expired:true});
 }catch(e){if(e instanceof SyntaxError)return res.status(400).json({error:'Invalid JSON'});
  console.error('Moderation request failed',e?.code||'unknown');
  return res.status(503).json({error:'Moderation service unavailable'});
 }
}
