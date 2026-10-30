---
name: Railway operational constraints
description: Production migration execution and Railway service-update constraints observed during recovery.
---

Treat production SQL migration execution as an explicit, verified release step until a tracked migration runner is introduced. Do not substitute automatic schema synchronization on API startup.

**Why:** A code release queried a newly added user-status column before production received the schema change, breaking login. Blind schema synchronization is not a substitute for the handwritten migrations, including audit-log constraints and triggers.

**How to apply:** Check actual schema compatibility, apply the required changes before the dependent API release, and distinguish user-reported execution from independently verified execution. Keep destructive changes out of startup.

Do not assume Railway's dashboard query editor can run a complete transaction-wrapped migration script.

**Why:** During recovery it accepted standalone DDL but rejected a migration batch with a `LIMIT` syntax error even though the migration contained no `LIMIT`. The exact editor transformation was not established.

**How to apply:** Prefer a proper SQL client or tracked runner. If browser-only execution is necessary, account for transaction/session boundaries, verify partial state after errors, and verify every intended schema effect rather than declaring the whole file applied.

Preserve the existing sleeping flag explicitly when updating these Railway services through the connected tool.

**Why:** Updating only health checks and watch patterns was rejected with a requirement that sleeping remain enabled; passing the already-enabled sleeping flag explicitly allowed the update.

**How to apply:** Read current settings first, retain `sleepApplication: true` where already enabled, and do not interpret this tool validation error as permission to change service capacity or billing.
