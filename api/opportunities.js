import { neon } from '@neondatabase/serverless';

const kinds=new Set(['housing','employment','project','training','support']);
const types=new Set(['vacancy','directory','program']);
const value=(v,max=80)=>typeof v==='string'?v.trim().slice(0,max):'';

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'Database not configured'});
 const kind=value(req.query?.kind,20);
 const listingType=value(req.query?.listing_type,20);
 const city=value(req.query?.city);
 const county=value(req.query?.county);
 const search=value(req.query?.q,120);
 if((kind&&!kinds.has(kind))||(listingType&&!types.has(listingType)))return res.status(400).json({error:'Invalid filter'});
 const cityPattern='%'+city+'%',searchPattern='%'+search+'%';
 try{
  const sql=neon(process.env.DATABASE_URL);
  const opportunities=await sql`
   SELECT o.id,o.kind,o.listing_type,o.title,o.description,o.city,o.county,o.state,
      o.application_url,o.source_url,o.source_checked_at,o.review_due_at,
      o.provider_confirmed_at,o.verified_at,o.verification_method,
      o.screening_policy,o.compensation_text,o.rent_text,
      g.name AS organization_name
   FROM public.opportunities o JOIN public.organizations g ON g.id=o.organization_id
   WHERE o.status='published' AND g.verified=TRUE
     AND o.verified_at IS NOT NULL
     AND o.source_url LIKE 'https://%'
     AND o.source_checked_at IS NOT NULL AND o.source_checked_at>=now()-interval '90 days'
     AND o.review_due_at IS NOT NULL AND o.review_due_at>now()
     AND (o.expires_at IS NULL OR o.expires_at>now())
     AND (o.listing_type<>'vacancy' OR
          (o.verification_method='provider_contact' AND o.provider_confirmed_at>now()-interval '30 days'))
     AND (${kind}='' OR o.kind=${kind})
     AND (${listingType}='' OR o.listing_type=${listingType})
     AND (${county}='' OR o.county='' OR lower(o.county)=lower(${county}))
     AND (${city}='' OR lower(o.city)='statewide' OR o.city ILIKE ${cityPattern})
     AND (${search}='' OR o.title ILIKE ${searchPattern}
          OR o.description ILIKE ${searchPattern} OR g.name ILIKE ${searchPattern})
   ORDER BY CASE WHEN o.listing_type='vacancy' THEN 0 ELSE 1 END,
     o.verified_at DESC,o.created_at DESC
   LIMIT 50
  `;
  return res.status(200).json({opportunities,notice:'Directories are not confirmed vacancies. Verify provider rules and availability before relying on a listing.'});
 }catch(error){
  console.error('Opportunity search unavailable',error?.code||'unknown');
  return res.status(503).json({error:'Listings temporarily unavailable'});
 }
}
