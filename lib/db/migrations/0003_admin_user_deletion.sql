BEGIN;

ALTER TABLE "legal_agreements"
  ALTER COLUMN "user_id" DROP NOT NULL;

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

COMMIT;
