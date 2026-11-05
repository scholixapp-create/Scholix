---
name: Drizzle SQL composition
description: Non-obvious SQL interpolation and correlated-select behaviour that affects permissions and admin flags.
---

Do not interpolate a JavaScript array directly into a SQL `ANY`/`ALL` expression. Build an explicitly typed SQL array using bound scalar parameters, or use Drizzle's `inArray` helpers.

**Why:** Drizzle expands array interpolation as a list/record, not a single PostgreSQL array parameter. This can pass TypeScript checks but fail at runtime, especially for empty and multi-element arrays.

**How to apply:** Cover empty, singleton and multi-element cases in real database tests for destructive account operations.

Correlated subqueries in a single-table select must preserve explicit SQL qualification of the outer table.

**Why:** Drizzle may unqualify interpolated column objects in that selection context. An intended outer `users.id` can then bind to the inner table's `id`, silently returning the wrong account's status or no status.

**How to apply:** Use explicit static qualified SQL identifiers/aliases for correlated expressions, never user-supplied SQL. Test with account IDs and request/profile IDs that differ.
