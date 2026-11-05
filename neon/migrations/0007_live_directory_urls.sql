-- Reviewed 2026-11-05; replace source paths returning HTTP 404 with live official destinations.
-- Directory status remains directory. No vacancy or landlord screening claim is implied.

INSERT INTO public.organizations(name,kind,verified) VALUES ('CareerOneStop','community_partner',true) ON CONFLICT(name) DO UPDATE SET verified=true;

INSERT INTO public.organizations(name,kind,verified) VALUES ('Federal Bonding Program','community_partner',true) ON CONFLICT(name) DO UPDATE SET verified=true;

UPDATE public.opportunities SET
 organization_id=(SELECT id FROM public.organizations WHERE name='OhioMeansJobs'),
 title='OhioMeansJobs statewide job search',description='Official OhioMeansJobs job-search portal. Search actual job postings by location and category, then confirm details and employer screening policies directly. This is a search directory, not a provider-confirmed vacancy.',
 application_url='https://jobs.ohiomeansjobs.applygovt.com/Search.aspx',source_url='https://jobs.ohiomeansjobs.applygovt.com/Search.aspx',
 verified_at=now(),source_checked_at=now(),review_due_at=now()+interval '60 days'
 WHERE listing_type='directory' AND status='published' AND application_url='https://ohiomeansjobs.ohio.gov/job-seekers/';

UPDATE public.opportunities SET
 organization_id=(SELECT id FROM public.organizations WHERE name='CareerOneStop'),
 title='Find a local American Job Center',description='U.S. Department of Labor-supported American Job Center finder. Search by Ohio city or ZIP for local job-search and training help; contact the center for hours and services. This is a directory, not a current job opening.',
 application_url='https://cloudfront.careeronestop.org/LocalHelp/AmericanJobCenters/american-job-centers.aspx',source_url='https://cloudfront.careeronestop.org/LocalHelp/AmericanJobCenters/american-job-centers.aspx',
 verified_at=now(),source_checked_at=now(),review_due_at=now()+interval '60 days'
 WHERE listing_type='directory' AND status='published' AND application_url='https://ohiomeansjobs.ohio.gov/job-seekers/find-a-job/local-help';

UPDATE public.opportunities SET
 organization_id=(SELECT id FROM public.organizations WHERE name='Federal Bonding Program'),
 title='Federal Bonding Program for employment barriers',description='Official Federal Bonding Program information for job seekers who may benefit from fidelity bonding. Eligibility and obtaining a bond require confirmation with the program or state coordinator; this is not a job opening.',
 application_url='https://bonds4jobs.com/our-services/get-your-bond-today',source_url='https://bonds4jobs.com/our-services/get-your-bond-today',
 verified_at=now(),source_checked_at=now(),review_due_at=now()+interval '60 days'
 WHERE listing_type='directory' AND status='published' AND application_url='https://ohiomeansjobs.ohio.gov/for-employers/resources-for-employers/bonds-4-jobs';

UPDATE public.opportunities SET description='Ohio 211 offers housing, shelter and rental-assistance referrals across Ohio. If the website does not load, call 2-1-1 or 1-888-644-6211. Local program availability must be confirmed with providers.' WHERE status='published' AND listing_type='directory' AND source_url='https://ohio211.org/how-to-find-help/';
