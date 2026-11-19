-- Store parent intake, initial student profiles, and admin information requests.
BEGIN;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "signup_intent" text,
  ADD COLUMN IF NOT EXISTS "signup_intent_details" text,
  ADD COLUMN IF NOT EXISTS "known_tutor_name" text;

ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'parent_information_requested';

CREATE TABLE IF NOT EXISTS "parent_information_requests" (
  "id" serial PRIMARY KEY,
  "parent_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "target_user_id" integer NOT NULL,
  "parent_email" text NOT NULL,
  "admin_user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "request_text" text NOT NULL,
  "response_text" text,
  "status" text NOT NULL DEFAULT 'pending',
  "requested_at" timestamp NOT NULL DEFAULT now(),
  "responded_at" timestamp,
  "closed_at" timestamp,
  CONSTRAINT "parent_information_requests_status_check"
    CHECK ("status" IN ('pending', 'responded', 'closed'))
);

CREATE INDEX IF NOT EXISTS "parent_information_requests_parent_status_idx"
  ON "parent_information_requests" ("parent_user_id", "status");

ALTER TABLE "admin_user_actions"
  DROP CONSTRAINT IF EXISTS "admin_user_actions_action_check";

ALTER TABLE "admin_user_actions"
  ADD CONSTRAINT "admin_user_actions_action_check"
  CHECK ("action" IN (
    'deactivated', 'reactivated', 'deleted',
    'parent_approved', 'education_approved', 'education_rejected',
    'commission_waiver_granted', 'commission_waiver_revoked',
    'parent_information_requested', 'parent_information_closed'
  ));

COMMIT;
