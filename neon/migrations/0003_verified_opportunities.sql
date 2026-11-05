-- SuccessfulFelons Verified Opportunity Engine. Additive and repeatable.
-- Direct vacancies cannot publish without documented provider contact.
-- Provider submissions and community reports are private and never auto-published.
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS county text NOT NULL DEFAULT '';

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'vacancy';

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS source_url text;

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS source_checked_at timestamptz;

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS review_due_at timestamptz;

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS provider_confirmed_at timestamptz;

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS verification_method text NOT NULL DEFAULT 'unreviewed';

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS screening_policy text NOT NULL DEFAULT 'not_confirmed';

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS compensation_text text NOT NULL DEFAULT '';

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS rent_text text NOT NULL DEFAULT '';

DO $m$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sf_opportunity_evidence_guard') THEN
  ALTER TABLE public.opportunities ADD CONSTRAINT sf_opportunity_evidence_guard CHECK (
   listing_type IN ('vacancy','directory','program') AND screening_policy IN ('not_confirmed','documented_fair_chance','documented_lookback','case_by_case','not_applicable')
   AND (status <> 'published' OR (
    verified_at IS NOT NULL AND source_checked_at IS NOT NULL
    AND review_due_at IS NOT NULL AND review_due_at > source_checked_at
    AND source_url LIKE 'https://%'
    AND (listing_type <> 'vacancy' OR (provider_confirmed_at IS NOT NULL AND verification_method='provider_contact'))
   ))
  );
 END IF;
END $m$;

CREATE INDEX IF NOT EXISTS sf_public_opportunity_review_idx ON public.opportunities(status, listing_type, review_due_at);

CREATE TABLE IF NOT EXISTS sf_private.opportunity_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id text NOT NULL CHECK (char_length(owner_user_id) BETWEEN 1 AND 160),
 kind text NOT NULL CHECK (kind IN ('employment','housing')),
 listing_type text NOT NULL CHECK (listing_type IN ('vacancy','directory','program')),
 title text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 180),
 organization_name text NOT NULL CHECK (char_length(organization_name) BETWEEN 2 AND 160),
 city text NOT NULL DEFAULT '' CHECK (char_length(city) <= 100),
 county text NOT NULL DEFAULT '' CHECK (char_length(county) <= 80),
 source_url text NOT NULL CHECK (char_length(source_url) BETWEEN 10 AND 1800 AND source_url LIKE 'https://%'),
 description text NOT NULL CHECK (char_length(description) BETWEEN 15 AND 1500),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','published','rejected')),
 reviewer_note text NOT NULL DEFAULT '' CHECK (char_length(reviewer_note) <= 500),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz
);

REVOKE ALL ON TABLE sf_private.opportunity_submissions FROM PUBLIC;

CREATE INDEX IF NOT EXISTS sf_submissions_owner_recent ON sf_private.opportunity_submissions(owner_user_id,created_at DESC);

CREATE INDEX IF NOT EXISTS sf_submissions_moderation ON sf_private.opportunity_submissions(status,created_at DESC);

CREATE TABLE IF NOT EXISTS sf_private.opportunity_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_user_id text NOT NULL CHECK (char_length(owner_user_id) BETWEEN 1 AND 160),
 opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
 reason text NOT NULL CHECK (reason IN ('closed','incorrect','screening','other')),
 details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 500),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_user_id, opportunity_id)
);

REVOKE ALL ON TABLE sf_private.opportunity_reports FROM PUBLIC;

CREATE INDEX IF NOT EXISTS sf_reports_moderation ON sf_private.opportunity_reports(status,updated_at DESC);
