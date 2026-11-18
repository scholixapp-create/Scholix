CREATE TABLE IF NOT EXISTS "tutor_availability_overrides" (
  "id" serial PRIMARY KEY,
  "tutor_id" integer NOT NULL REFERENCES "tutors"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "timezone" text NOT NULL DEFAULT 'Australia/Melbourne',
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "tutor_availability_overrides_valid_window"
    CHECK (
      "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      AND "start_time" < "end_time"
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS "tutor_availability_overrides_tutor_date_uq"
  ON "tutor_availability_overrides" ("tutor_id", "date");
