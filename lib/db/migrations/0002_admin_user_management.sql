ALTER TABLE "users"
  ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;

CREATE TABLE "admin_user_actions" (
  "id" serial PRIMARY KEY,
  "actor_user_id" integer NOT NULL,
  "target_user_id" integer NOT NULL,
  "action" text NOT NULL CHECK ("action" IN ('deactivated', 'reactivated')),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX "admin_user_actions_actor_created_idx"
  ON "admin_user_actions" ("actor_user_id", "created_at");

CREATE INDEX "admin_user_actions_target_created_idx"
  ON "admin_user_actions" ("target_user_id", "created_at");

CREATE FUNCTION "reject_admin_user_action_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'admin_user_actions is append-only';
END;
$$;

CREATE TRIGGER "admin_user_actions_append_only"
  BEFORE UPDATE OR DELETE ON "admin_user_actions"
  FOR EACH ROW EXECUTE FUNCTION "reject_admin_user_action_mutation"();
