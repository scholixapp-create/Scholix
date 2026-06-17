---
name: Invoice on payment
description: Where and when invoices are created; duplicate-prevention pattern
---

Invoices are created in `payments.ts` immediately when `POST /api/payments/simulate` is called.

Commission calculation (`getTierCommission`) in payments.ts handles: `first_student_free`, `first_session_free`, and tier rates (Starter 30% → Expert 15%).

Sessions complete route (`POST /api/sessions/:id/complete`) checks for an existing invoice before inserting — so completing a session that was already invoiced on payment does not duplicate it.

**Why:** Parents need the invoice receipt immediately after payment, not only after the session completes.

**How to apply:** Don't insert invoices in the complete route if one already exists (existing guard is in place).
