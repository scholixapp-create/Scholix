---
name: SignupBody generated type gaps
description: The OpenAPI-generated SignupBody Zod schema does not include phone or termsAccepted; extract these from req.body directly.
---

## Rule
`SignupBody` from `@workspace/api-zod` is generated from the OpenAPI spec. Fields not in the spec (e.g. `phone`, `termsAccepted`) are absent from the type. Access them via:

```typescript
const { email, password, firstName, lastName, role } = parsed.data; // validated fields
const body = req.body as { phone?: string; termsAccepted?: boolean }; // extra fields
```

**Why:** Adding these to the OpenAPI spec would require running codegen and regenerating hooks — not worth it for simple extra fields that don't need client-side type safety via generated hooks.

**How to apply:** Whenever adding new signup/auth fields without touching the OpenAPI spec, extract from `req.body` with a cast after validating the core fields with the Zod schema.
