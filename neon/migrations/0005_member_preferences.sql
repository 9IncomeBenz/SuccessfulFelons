-- Private voluntary member search preferences; do not store criminal history.
CREATE TABLE IF NOT EXISTS sf_private.member_preferences(
 owner_user_id text PRIMARY KEY CHECK(char_length(owner_user_id) BETWEEN 1 AND 160),
 home_county text NOT NULL DEFAULT '' CHECK(char_length(home_county)<=80),
 focus text NOT NULL DEFAULT 'all' CHECK(focus IN ('all','employment','housing')),
 updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE sf_private.member_preferences FROM PUBLIC;
