---
name: Availability model
description: Slots are date-specific (not day-of-week); isBooked lifecycle
---

Availability slots use `date` (YYYY-MM-DD text), `startTime`, `endTime` (HH:MM), `isBooked` boolean.

`dayOfWeek` column still exists in the schema (kept for migration compatibility) but is nullable and unused.

**isBooked lifecycle:**
1. Session creation (`POST /api/sessions`): checks slot exists + not booked; stores `availabilitySlotId` on session.
2. Payment (`POST /api/payments/simulate`): sets `isBooked = true` on the slot AND generates the invoice.

**Why:** DB was pushed with `--force` (truncating availability table) to add the `date` and `isBooked` columns.

**How to apply:** Any new availability-related feature must use `date` field, not `dayOfWeek`.
