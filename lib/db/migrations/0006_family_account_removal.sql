-- Apply after 0005 and BEFORE deploying the API that reads archived_at.
-- No records are removed by this migration.
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at timestamp;
ALTER TABLE students ADD COLUMN IF NOT EXISTS archived_at timestamp;
ALTER TABLE account_deletion_requests ADD COLUMN IF NOT EXISTS review_notes text;
CREATE TABLE IF NOT EXISTS account_lifecycle_actions (
  id serial PRIMARY KEY,
  actor_user_id integer NOT NULL,
  target_user_id integer,
  student_id integer,
  request_id integer,
  action text NOT NULL CHECK (action IN ('student_updated', 'student_removed', 'family_archived', 'deletion_request_rejected')),
  retained_history boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);
-- No foreign keys: evidence must survive deletion of unused profiles.
CREATE OR REPLACE FUNCTION prevent_account_lifecycle_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'account_lifecycle_actions is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS account_lifecycle_append_only ON account_lifecycle_actions;
CREATE TRIGGER account_lifecycle_append_only
BEFORE UPDATE OR DELETE OR TRUNCATE ON account_lifecycle_actions
FOR EACH STATEMENT EXECUTE FUNCTION prevent_account_lifecycle_mutation();
COMMIT;
