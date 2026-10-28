BEGIN;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "admin_user_actions" (
  "id" serial PRIMARY KEY,
  "actor_user_id" integer NOT NULL,
  "target_user_id" integer NOT NULL,
  "target_email" text,
  "action" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "admin_user_actions"
  ADD COLUMN IF NOT EXISTS "target_email" text;

DO $$
DECLARE constraint_record record;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'admin_user_actions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%action%'
  LOOP
    EXECUTE format('ALTER TABLE admin_user_actions DROP CONSTRAINT %I', constraint_record.conname);
  END LOOP;
END;
$$;

ALTER TABLE "admin_user_actions"
  ADD CONSTRAINT "admin_user_actions_action_check"
  CHECK ("action" IN ('deactivated', 'reactivated', 'deleted'));

CREATE INDEX IF NOT EXISTS "admin_user_actions_actor_created_idx"
  ON "admin_user_actions" ("actor_user_id", "created_at");

CREATE INDEX IF NOT EXISTS "admin_user_actions_target_created_idx"
  ON "admin_user_actions" ("target_user_id", "created_at");

CREATE OR REPLACE FUNCTION "reject_admin_user_action_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'admin_user_actions is append-only';
END;
$$;

DROP TRIGGER IF EXISTS "admin_user_actions_append_only" ON "admin_user_actions";

CREATE TRIGGER "admin_user_actions_append_only"
  BEFORE UPDATE OR DELETE ON "admin_user_actions"
  FOR EACH ROW EXECUTE FUNCTION "reject_admin_user_action_mutation"();

COMMIT;
