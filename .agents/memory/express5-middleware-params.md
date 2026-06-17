---
name: Express 5 middleware param types
description: When chaining a custom middleware before an async handler, req.params values need explicit `as string` cast to satisfy TypeScript.
---

## Rule
When using `router.post("/route/:id", customMiddleware, async (req, res) => { ... })`, TypeScript infers `req.params["id"]` as `string | string[]` rather than `string`. Cast explicitly:

```typescript
const id = parseInt(req.params["id"] as string, 10);
```

**Why:** Express 5 + TypeScript strict mode widens the param type when a middleware is in the chain, even though runtime values are always `string` for route params.

**How to apply:** Any route handler that accepts a custom middleware as second argument AND reads `req.params` must cast the param value.
