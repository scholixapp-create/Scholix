---
name: Review integrity
description: Why review uniqueness is enforced by serialized API writes rather than a new production migration.
---

Review submission intentionally uses an existing-session row lock and an explicit READ COMMITTED transaction rather than introducing a unique-index migration in this release. Existing review history must not be silently deleted or deduplicated.

**Why:** This provides concurrency-safe submissions through the existing API without adding another production schema step or requiring decisions about any legacy duplicate records.

**How to apply:** Every future review writer, including background jobs or imports, must use the same locking transaction before checking for an existing review. Direct SQL writes are not protected by a database uniqueness constraint. If adding a constraint later, assess existing records first and preserve business history rather than automatically deleting duplicates.
