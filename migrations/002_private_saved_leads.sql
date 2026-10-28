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
COMMENT ON TABLE sf_private.saved_leads IS
'Private authenticated saved link metadata only. No applicant criminal history, resumes, notes or passwords.';
COMMIT;
