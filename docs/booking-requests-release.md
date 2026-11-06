# Booking requests and beta holds

This release keeps payments simulated. No card is authorised or charged. Real
payment integration is separate work, not enabled by these changes.

## Lifecycle

- Creating a checkout reserves the tutor's time as `pending_payment`, for up to
  15 minutes or the session start, whichever is sooner.
- `POST /api/payments/simulate` creates an `authorized` beta payment and changes
  the session to `pending_confirmation`. The response deadline is 24 hours from
  submission or the session start, whichever is sooner.
- Only the owning, active, approved tutor can accept a request. Acceptance
  atomically changes the beta payment to `paid`, creates the invoice and changes
  the session to `scheduled`. Repeating acceptance does not capture twice.
- Decline, withdrawal and expiry cancel the request and release the simulated
  hold. Cancelling a confirmed beta session marks its simulated payment
  `refunded`; this does not refund any separate cash or bank payment.
- A scheduler expires requests every minute. Availability ignores expired
  reservations immediately; session reads and decisions also process expiry.
- Parents and tutors have visible request lists, with 30-second refreshes.
- Existing scheduled/completed sessions are not put back through approval.

Start times use Australia/Melbourne, including daylight saving. New sessions
snapshot lesson mode and travel buffer. For legacy sessions without snapshots,
existing relationship settings are used, with conservative in-person treatment
when a mixed-mode lesson's actual mode is unknown.

## Safest Railway release order

There is no automatic migration runner in this release. Do not push a commit
that auto-deploys the new API until the production migration has been applied.

1. Take a production database backup using your normal Railway procedure. Pause
   new booking activity for the short release window.
2. Open the **production PostgreSQL service belonging to the existing Scholix
   API**, not Replit's development database. In its SQL query interface, execute
   the SQL contents of `lib/db/migrations/0007_booking_requests.sql`. The file
   name itself is not a SQL command. If the interface requires smaller batches,
   execute each semicolon-terminated statement separately, in file order.
3. Ensure the migration finishes and commits before starting the new API.
   PostgreSQL enum additions cannot be used until committed. The migration does
   not use the newly added enum labels in data changes, and can be rerun safely.
4. Verify the `sessions` columns `lesson_mode`, `travel_buffer_minutes`,
   `request_expires_at`, `tutor_confirmed_at`, `cancellation_reason`, and the
   `payments.provider` column exist. Check the enum labels
   `session_status.pending_confirmation`, `payment_status.authorized` and
   `payment_status.released` exist.
5. Push the tested changes to the Railway-linked GitHub branch. Deploy the API
   first, then the frontend from the same commit. If both auto-deploy together,
   wait until both succeed before allowing bookings again.
6. Reload the site to obtain the new frontend. Old cached clients do not send
   the required lesson mode and must not be used to validate this release.
7. On the actual site, use approved test parent/tutor accounts to request a
   lesson, inspect the held/unconfirmed state, accept it as tutor and verify the
   parent's confirmed state and invoice. Also check a declined request frees
   its time without a captured payment. Payments remain labelled beta.

The migration is additive and preserves booking, invoice and payment history.
Old unpaid abandoned checkouts get a bounded expiry rather than blocking
availability indefinitely.

## Local checks

Build generated libraries before checking the API and frontend:

```sh
node_modules/.bin/tsc --build
node_modules/.bin/tsc --noEmit -p artifacts/api-server/tsconfig.json
node_modules/.bin/tsc --noEmit -p artifacts/scholix/tsconfig.json
NODE_ENV=development RUN_BOOKING_REQUESTS_INTEGRATION=1 \
  artifacts/api-server/node_modules/.bin/tsx --test artifacts/api-server/src/lib/*.test.ts
```

The opt-in integration tests refuse Railway hosts and production mode, use
synthetic development accounts, and clean up their own data.

## Before real payments

Replace the explicit beta payment boundary with a provider integration using
real authorisation/capture/void operations, persisted provider references,
idempotency keys, verified webhooks and reconciliation. Handle expired card
authorisations, capture failures and cancellation/refund policy. Do not perform
provider network calls while holding the current database row locks.

Notifications currently run after the transaction and are best effort. The
request lists remain authoritative if delivery fails; durable queued delivery
is advisable before relying on payment-related email alerts in production.
