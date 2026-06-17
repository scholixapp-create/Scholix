---
name: esbuild externals — zod/v4
description: The zod/v4 subpath cannot be resolved by esbuild in api-server
---

`import { z } from "zod/v4"` fails esbuild in `artifacts/api-server` with "Could not resolve zod/v4".

The build.mjs marks `zod` as external but `zod/v4` is a subpath export esbuild can't resolve.

**Fix:** In API route files, either:
- Do plain JS validation (`const { field } = req.body as { field?: string }; if (!field) ...`)
- Import generated Zod schemas from `@workspace/api-zod` instead of writing inline schemas

**Why:** esbuild bundles the api-server; `zod/v4` subpath doesn't resolve the same way `zod` does.

**How to apply:** Never `import { z } from "zod/v4"` in any file under `artifacts/api-server/src/`.
