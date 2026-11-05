-- Curated official Ohio employment and housing search directories, reviewed 2026-11-05.

-- All six records are directories; none is a confirmed vacancy or record-screening approval.

-- Safe to rerun; avoids duplicate organization names and source URLs.



INSERT INTO public.organizations(name,kind,verified) SELECT 'OhioMeansJobs','community_partner',true WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE name='OhioMeansJobs');

INSERT INTO public.organizations(name,kind,verified) SELECT 'Ohio Housing Locator','housing_provider',true WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE name='Ohio Housing Locator');

INSERT INTO public.organizations(name,kind,verified) SELECT 'Ohio Housing Finance Agency','community_partner',true WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE name='Ohio Housing Finance Agency');

INSERT INTO public.organizations(name,kind,verified) SELECT 'Ohio 211','community_partner',true WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE name='Ohio 211');



INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'employment','Statewide job search and career tools','Official Ohio job-search and career-support directory. Not a verified current vacancy or fair-chance policy.','Statewide','OH','https://ohiomeansjobs.ohio.gov/job-seekers/','published',now(),'','directory','https://ohiomeansjobs.ohio.gov/job-seekers/',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='OhioMeansJobs' AND NOT EXISTS(SELECT 1 FROM public.opportunities WHERE application_url='https://ohiomeansjobs.ohio.gov/job-seekers/');

INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'employment','Find a local OhioMeansJobs job center','Official locator for local workforce centers. Service availability varies; this is not a current vacancy.','Statewide','OH','https://ohiomeansjobs.ohio.gov/job-seekers/find-a-job/local-help','published',now(),'','directory','https://ohiomeansjobs.ohio.gov/job-seekers/find-a-job/local-help',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='OhioMeansJobs' AND NOT EXISTS(SELECT 1 FROM public.opportunities WHERE application_url='https://ohiomeansjobs.ohio.gov/job-seekers/find-a-job/local-help');

INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'employment','Bonds4Jobs federal bonding information','Official guidance on free federal bonding that may help reduce hiring barriers; no job or eligibility guarantee.','Statewide','OH','https://ohiomeansjobs.ohio.gov/for-employers/resources-for-employers/bonds-4-jobs','published',now(),'','directory','https://ohiomeansjobs.ohio.gov/for-employers/resources-for-employers/bonds-4-jobs',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='OhioMeansJobs' AND NOT EXISTS(SELECT 1 FROM public.opportunities WHERE application_url='https://ohiomeansjobs.ohio.gov/for-employers/resources-for-employers/bonds-4-jobs');

INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'housing','Ohio Housing Locator rental search','Free statewide rental directory. Units, rent, landlord screening and availability need independent confirmation.','Statewide','OH','https://www.ohiohousinglocator.org/','published',now(),'','directory','https://www.ohiohousinglocator.org/',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='Ohio Housing Locator' AND NOT EXISTS(SELECT 1 FROM public.opportunities WHERE application_url='https://www.ohiohousinglocator.org/');

INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'housing','OHFA renter assistance and rental search resources','Official renter guidance and housing search links. No specific apartment or screening policy is confirmed.','Statewide','OH','https://www.ohiohome.org/renters.aspx','published',now(),'','directory','https://www.ohiohome.org/renters.aspx',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='Ohio Housing Finance Agency' AND NOT EXISTS(SELECT 1 FROM public.opportunities WHERE application_url='https://www.ohiohome.org/renters.aspx');

INSERT INTO public.opportunities(organization_id,kind,title,description,city,state,application_url,status,verified_at,county,listing_type,source_url,source_checked_at,review_due_at,verification_method,screening_policy)
SELECT id,'housing','Ohio 211 housing and shelter referral service','Statewide housing, shelter and rental assistance referrals; local provider availability is not guaranteed.','Statewide','OH','https://ohio211.org/how-to-find-help/','published',now(),'','directory','https://ohio211.org/how-to-find-help/',now(),now()+interval '60 days','official_directory','not_confirmed'
FROM public.organizations WHERE name='Ohio 211' AND NOT EXISTS(SELECT 1 FROM public.opportunities WHERE application_url='https://ohio211.org/how-to-find-help/');
