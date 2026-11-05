---
name: Review integrity
description: Why review uniqueness is enforced by serialized API writes rather than a new production migration.
---

Reviews are limited to one per parent and tutor, not one per lesson. Review submission intentionally locks the parent row first, then the completed session row, in a READ COMMITTED transaction rather than introducing a unique-index migration. Locking only the session does not prevent simultaneous reviews on different lessons with the same tutor. Existing review history must not be silently deleted or deduplicated; public ratings use the first review from each parent.

**Why:** The user chose one review per parent and tutor to avoid unrealistic ratings from repeated lessons. Serialized writes preserve historical records without requiring a destructive cleanup of any legacy duplicates.

**How to apply:** Every future review writer, including background jobs or imports, must lock in the same parent-then-session order before checking for a parent–tutor review. Direct SQL writes are not protected by a database uniqueness constraint. If adding a constraint later, assess existing records first and preserve business history rather than automatically deleting duplicates.
