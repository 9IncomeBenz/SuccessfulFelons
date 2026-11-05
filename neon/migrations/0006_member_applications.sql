-- Private account-synced application tracking, 100 records maximum per user.
-- No criminal history or applicant eligibility information requested.
CREATE TABLE IF NOT EXISTS sf_private.member_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id text NOT NULL CHECK (char_length(owner_user_id) BETWEEN 1 AND 160),
  kind text NOT NULL CHECK (kind IN ('employment','housing')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 180),
  organization text NOT NULL DEFAULT '' CHECK (char_length(organization)<=180),
  source_url text NOT NULL DEFAULT '' CHECK (char_length(source_url)<=1800 AND (source_url='' OR source_url LIKE 'https://%')),
  stage text NOT NULL DEFAULT 'Interested' CHECK (stage IN ('Interested','Contacted','Applied','Interview','Offer','Closed')),
  next_step text NOT NULL DEFAULT '' CHECK (char_length(next_step)<=300),
  follow_up_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE sf_private.member_applications FROM PUBLIC;

CREATE INDEX IF NOT EXISTS sf_member_applications_owner_recent ON sf_private.member_applications(owner_user_id,updated_at DESC);

CREATE OR REPLACE FUNCTION sf_private.enforce_member_applications_quota()
RETURNS trigger LANGUAGE plpgsql AS $limit$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.owner_user_id,17));
 IF (SELECT count(*) FROM sf_private.member_applications WHERE owner_user_id=NEW.owner_user_id)>=100
 THEN RAISE EXCEPTION 'Application tracker limit exceeded' USING ERRCODE='check_violation'; END IF;
 RETURN NEW;
END;
$limit$;

REVOKE ALL ON FUNCTION sf_private.enforce_member_applications_quota() FROM PUBLIC;

CREATE OR REPLACE TRIGGER sf_member_applications_quota_before_insert
BEFORE INSERT ON sf_private.member_applications
FOR EACH ROW EXECUTE FUNCTION sf_private.enforce_member_applications_quota();

