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

Treat Railway's AI-agent usage limit separately from the availability of its direct integration tools.

**Why:** The AI-agent call was blocked by its usage limit while direct service inspection and public health checks still worked.

**How to apply:** Use available direct tools for independent evidence, do not change billing or usage limits automatically, and state explicitly when authenticated database or admin-status checks remain unverified.

Keep the tutor-document volume mounted at the legacy API uploads directory unless a deliberate file migration is planned.

**Why:** The mount location was chosen to keep both the previously deployed API and the new mount-aware API compatible during rollout. A different mount location would leave the old API writing ephemeral files between deployment steps. The owner explicitly accepted possible re-uploads for the initial volume attachment, not for every future release.

**How to apply:** Inspect the actual Railway mount before changing it. Preserve existing bytes and private admin-authorized delivery; changing a path or attaching a fresh volume does not migrate files. Do not delete or replace the volume as part of ordinary code deployment.
