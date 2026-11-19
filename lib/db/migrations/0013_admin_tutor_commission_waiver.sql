-- Apply before deploying the API and admin UI that manage tutor commission waivers.
-- Existing invoices and session records are not modified.
BEGIN;

ALTER TABLE "tutors"
  ADD COLUMN IF NOT EXISTS "commission_waived" boolean NOT NULL DEFAULT false;

ALTER TABLE "admin_user_actions"
  ADD COLUMN IF NOT EXISTS "reason" text;

CREATE TABLE IF NOT EXISTS "admin_sensitive_action_attempts" (
  "user_id" integer PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "failed_attempts" integer NOT NULL DEFAULT 0,
  "window_started_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "admin_sensitive_action_attempts_count_check"
    CHECK ("failed_attempts" BETWEEN 0 AND 5)
);

ALTER TABLE "admin_user_actions"
  DROP CONSTRAINT IF EXISTS "admin_user_actions_action_check";

ALTER TABLE "admin_user_actions"
  ADD CONSTRAINT "admin_user_actions_action_check"
  CHECK ("action" IN (
    'deactivated', 'reactivated', 'deleted',
    'parent_approved', 'education_approved', 'education_rejected',
    'commission_waiver_granted', 'commission_waiver_revoked'
  ));

COMMIT;
