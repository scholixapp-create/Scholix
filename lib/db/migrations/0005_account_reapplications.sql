-- Apply after 0004 and BEFORE deploying the updated API.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_version integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS account_reapplications (
  user_id integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  otp_hash text,
  expires_at timestamp NOT NULL,
  verified_at timestamp,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  sends integer NOT NULL DEFAULT 1 CHECK (sends > 0),
  window_started_at timestamp NOT NULL DEFAULT now()
);
COMMIT;
