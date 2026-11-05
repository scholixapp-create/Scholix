-- Apply after 0001, 0002, and 0003, BEFORE deploying the API that reads these columns.
-- Existing parents remain approved. New parent signup explicitly sets approval to false.
-- Existing published qualifications and review history are not changed.
BEGIN;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "parent_approved" boolean NOT NULL DEFAULT true;

ALTER TABLE "tutors"
  ADD COLUMN IF NOT EXISTS "pending_education_details" text,
  ADD COLUMN IF NOT EXISTS "education_review_status" text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "education_review_notes" text,
  ADD COLUMN IF NOT EXISTS "education_submitted_at" timestamp(3),
  ADD COLUMN IF NOT EXISTS "promotion_actions" text[] NOT NULL DEFAULT '{}';

ALTER TABLE "admin_user_actions"
  DROP CONSTRAINT IF EXISTS "admin_user_actions_action_check";
ALTER TABLE "admin_user_actions"
  ADD CONSTRAINT "admin_user_actions_action_check"
  CHECK ("action" IN (
    'deactivated', 'reactivated', 'deleted',
    'parent_approved', 'education_approved', 'education_rejected'
  ));

COMMIT;
