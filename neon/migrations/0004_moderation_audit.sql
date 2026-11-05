-- Admin moderation audit log. Not publicly readable.
CREATE TABLE IF NOT EXISTS sf_private.moderation_events (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
actor_user_id text NOT NULL CHECK (char_length(actor_user_id) BETWEEN 1 AND 160),
target_type text NOT NULL CHECK (target_type IN ('submission','report','opportunity')),
target_id uuid NOT NULL,
action text NOT NULL CHECK (action IN ('publish','reject','resolve','expire')),
note text NOT NULL CHECK (char_length(note) BETWEEN 4 AND 500),
created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE sf_private.moderation_events FROM PUBLIC;

CREATE INDEX IF NOT EXISTS sf_moderation_events_recent ON sf_private.moderation_events(created_at DESC);
