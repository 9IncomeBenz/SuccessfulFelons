-- Research-backed statewide directories; directory entries are not vacancies.
-- A review date is a source check, never an eligibility approval.
INSERT INTO public.organizations(name,kind,verified)
SELECT 'OhioMeansJobs','community_partner',true
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE name='OhioMeansJobs');
INSERT INTO public.organizations(name,kind,verified)
SELECT 'Ohio Housing Locator','housing_provider',true
WHERE NOT EXISTS (SELECT 1 FROM public.organizations WHERE name='Ohio Housing Locator');