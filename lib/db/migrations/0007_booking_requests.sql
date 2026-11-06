-- Apply BEFORE deploying the booking-request API and frontend.
-- Additive: existing scheduled/completed sessions and financial history are preserved.
-- No real payment provider or card authorisation is created by this migration.
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'pending_confirmation';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'authorized';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'released';

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lesson_mode text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS travel_buffer_minutes integer;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS request_expires_at timestamptz;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS tutor_confirmed_at timestamptz;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'beta';

-- Old unpaid checkouts must not reserve calendar time indefinitely.
UPDATE sessions SET request_expires_at =
  LEAST(scheduled_at AT TIME ZONE 'UTC', (created_at AT TIME ZONE 'UTC') + INTERVAL '15 minutes')
WHERE status::text = 'pending_payment' AND request_expires_at IS NULL;

CREATE INDEX IF NOT EXISTS sessions_tutor_booking_time_idx ON sessions(tutor_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS sessions_request_expiry_idx ON sessions(request_expires_at);
CREATE INDEX IF NOT EXISTS payments_session_lookup_idx ON payments(session_id);
