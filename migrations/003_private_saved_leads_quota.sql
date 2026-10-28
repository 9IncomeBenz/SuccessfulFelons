-- Quota enforcement amendment to apply only after reviewed base migration.
-- Run this as an independent SQL function/trigger migration in a tested Neon branch.
BEGIN;
-- Serialize inserts by owner and enforce the same 100-item limit in Postgres,
-- including when parallel requests race. Updating an existing lead remains allowed.
CREATE OR REPLACE FUNCTION sf_private.enforce_saved_leads_quota()
RETURNS trigger LANGUAGE plpgsql AS $sfquota$
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
$sfquota$;
REVOKE ALL ON FUNCTION sf_private.enforce_saved_leads_quota() FROM PUBLIC;
CREATE OR REPLACE TRIGGER sf_saved_leads_quota_before_insert
BEFORE INSERT ON sf_private.saved_leads
FOR EACH ROW EXECUTE FUNCTION sf_private.enforce_saved_leads_quota();

COMMIT;
