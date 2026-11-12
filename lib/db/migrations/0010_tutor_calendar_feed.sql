ALTER TABLE "tutors"
  ADD COLUMN IF NOT EXISTS "calendar_feed_enabled" boolean NOT NULL DEFAULT false;

ALTER TABLE "tutors"
  ADD COLUMN IF NOT EXISTS "calendar_feed_version" integer NOT NULL DEFAULT 1;
