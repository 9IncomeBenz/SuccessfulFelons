-- Reviewed 2026-11-05; current official resource and directory destinations.
-- Six directories, no confirmed vacancies or promises of acceptance. This seed can be rerun.

INSERT INTO public.organizations(name,kind,verified) VALUES ('OhioMeansJobs','community_partner',true)
ON CONFLICT (name) DO UPDATE SET verified=true;

INSERT INTO public.organizations(name,kind,verified) VALUES ('CareerOneStop','community_partner',true)
ON CONFLICT (name) DO UPDATE SET verified=true;

INSERT INTO public.organizations(name,kind,verified) VALUES ('Federal Bonding Program','community_partner',true)
ON CONFLICT (name) DO UPDATE SET verified=true;

INSERT INTO public.organizations(name,kind,verified) VALUES ('Ohio Housing Locator','housing_provider',true)
ON CONFLICT (name) DO UPDATE SET verified=true;

INSERT INTO public.organizations(name,kind,verified) VALUES ('Ohio Housing Finance Agency','community_partner',true)
ON CONFLICT (name) DO UPDATE SET verified=true;

INSERT INTO public.organizations(name,kind,verified) VALUES ('Ohio 211','community_partner',true)
ON CONFLICT (name) DO UPDATE SET verified=true;

INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'employment','OhioMeansJobs statewide job search','Official OhioMeansJobs job-search portal. Search actual job postings by location and category, then confirm details and employer screening policies directly. This is a search directory, not a provider-confirmed vacancy.','Statewide','OH','https://jobs.ohiomeansjobs.applygovt.com/Search.aspx','published',now(),'','directory','https://jobs.ohiomeansjobs.applygovt.com/Search.aspx',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='OhioMeansJobs' AND NOT EXISTS (SELECT 1 FROM public.opportunities WHERE source_url='https://jobs.ohiomeansjobs.applygovt.com/Search.aspx');

INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'employment','Find a local American Job Center','U.S. Department of Labor-supported American Job Center finder. Search by Ohio city or ZIP for local job-search and training help; contact the center for hours and services. This is a directory, not a current job opening.','Statewide','OH','https://cloudfront.careeronestop.org/LocalHelp/AmericanJobCenters/american-job-centers.aspx','published',now(),'','directory','https://cloudfront.careeronestop.org/LocalHelp/AmericanJobCenters/american-job-centers.aspx',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='CareerOneStop' AND NOT EXISTS (SELECT 1 FROM public.opportunities WHERE source_url='https://cloudfront.careeronestop.org/LocalHelp/AmericanJobCenters/american-job-centers.aspx');

INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'employment','Federal Bonding Program for employment barriers','Official Federal Bonding Program information for job seekers who may benefit from fidelity bonding. Eligibility and obtaining a bond require confirmation with the program or state coordinator; this is not a job opening.','Statewide','OH','https://bonds4jobs.com/our-services/get-your-bond-today','published',now(),'','directory','https://bonds4jobs.com/our-services/get-your-bond-today',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='Federal Bonding Program' AND NOT EXISTS (SELECT 1 FROM public.opportunities WHERE source_url='https://bonds4jobs.com/our-services/get-your-bond-today');

INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'housing','Ohio Housing Locator rental search','Free statewide rental directory. Units, rent, landlord screening and availability need independent confirmation.','Statewide','OH','https://www.ohiohousinglocator.org/','published',now(),'','directory','https://www.ohiohousinglocator.org/',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='Ohio Housing Locator' AND NOT EXISTS (SELECT 1 FROM public.opportunities WHERE source_url='https://www.ohiohousinglocator.org/');

INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'housing','OHFA renter assistance and rental search resources','Official renter guidance and housing search links. No specific apartment or screening policy is confirmed.','Statewide','OH','https://www.ohiohome.org/renters.aspx','published',now(),'','directory','https://www.ohiohome.org/renters.aspx',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='Ohio Housing Finance Agency' AND NOT EXISTS (SELECT 1 FROM public.opportunities WHERE source_url='https://www.ohiohome.org/renters.aspx');

INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'housing','Ohio 211 housing and shelter referral service','Ohio 211 offers housing, shelter and rental-assistance referrals across Ohio. If the website does not load, call 2-1-1 or 1-888-644-6211. Local program availability must be confirmed with providers.','Statewide','OH','https://ohio211.org/how-to-find-help/','published',now(),'','directory','https://ohio211.org/how-to-find-help/',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='Ohio 211' AND NOT EXISTS (SELECT 1 FROM public.opportunities WHERE source_url='https://ohio211.org/how-to-find-help/');

