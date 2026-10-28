-- SuccessfulFelons private cloud-saved leads (staged migration, NOT applied by deployment).
-- Run only with the production database owner after reviewing rollback/backups.
-- The sf_private schema is never exposed via the Neon Data API.
BEGIN;
CREATE SCHEMA IF NOT EXISTS sf_private;
REVOKE ALL ON SCHEMA sf_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS sf_private.saved_leads (
  owner_user_id TEXT NOT NULL CHECK (char_length(owner_user_id) BETWEEN 1 AND 160),
  lead_id TEXT NOT NULL CHECK (char_length(lead_id) BETWEEN 1 AND 120),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 180),
  organization TEXT NOT NULL DEFAULT '' CHECK (char_length(organization) <= 180),
  source_url TEXT NOT NULL DEFAULT '' CHECK (
    char_length(source_url) <= 1800 AND
    (source_url = '' OR source_url ~ '^https://[^[:space:]]+$')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_user_id, lead_id)
);
REVOKE ALL ON TABLE sf_private.saved_leads FROM PUBLIC;
CREATE INDEX IF NOT EXISTS sf_saved_leads_owner_updated_idx
ON sf_private.saved_leads (owner_user_id, updated_at DESC);
-- Serialize inserts by owner and enforce the same 100-item limit in Postgres,
-- including when parallel requests race. Updating an existing lead remains allowed.
CREATE OR REPLACE FUNCTION sf_private.enforce_saved_leads_quota()
RETURNS trigger LANGUAGE plpgsql AS $
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.owner_user_id, 0));
  IF NOT EXISTS (
    SELECT 1 FROM sf_private.saved_leads
    WHERE owner_user_id = NEW.owner_user_id AND lead_id = NEW.lead_id
  ) AND (
    SELECT COUNT(*) FROM sf_private.saved_leads
    WHERE owner_user_id = NEW.owner_user_id
  ) >= 100 THEN
    RAISE EXCEPTION 'Saved lead limit exceeded'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$;
REVOKE ALL ON FUNCTION sf_private.enforce_saved_leads_quota() FROM PUBLIC;
DROP TRIGGER IF EXISTS sf_saved_leads_quota_before_insert
ON sf_private.saved_leads;
CREATE TRIGGER sf_saved_leads_quota_before_insert
BEFORE INSERT ON sf_private.saved_leads
FOR EACH ROW EXECUTE FUNCTION sf_private.enforce_saved_leads_quota();

COMMENT ON TABLE sf_private.saved_leads IS
'Private authenticated saved link metadata only. No applicant criminal history, resumes, notes or passwords.';
COMMIT;
