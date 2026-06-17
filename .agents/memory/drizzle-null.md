---
name: Drizzle null comparisons
description: How to correctly check for NULL values in drizzle-orm WHERE clauses.
---

Use `isNull(column)` from `drizzle-orm`, not `eq(column, null)`.

`eq(column, null)` generates `column = NULL` which is always false in SQL.
`isNull(column)` generates `column IS NULL` which is correct.

**Why:** Hit this when writing OTP invalidation (WHERE usedAt IS NULL). Used `eq(col, null as unknown as Date)` first — this produces wrong SQL and silently breaks the query.

**How to apply:** Any time you check for a nullable column being null in a drizzle `.where()` clause, import and use `isNull` from `drizzle-orm`.
