CREATE TABLE IF NOT EXISTS "tutor_unavailable_periods" (
  "id" serial PRIMARY KEY,
  "tutor_id" integer NOT NULL REFERENCES "tutors"("id") ON DELETE CASCADE,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "note" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "tutor_unavailable_periods_valid_range" CHECK ("start_date" <= "end_date")
);

CREATE INDEX IF NOT EXISTS "tutor_unavailable_periods_tutor_dates_idx"
  ON "tutor_unavailable_periods" ("tutor_id", "start_date", "end_date");
