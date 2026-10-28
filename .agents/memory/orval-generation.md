---
name: Orval generation in restricted installs
description: Code-generation dependency resolution can be limited by the workspace package registry.
---

When the configured Orval version is unavailable through the workspace registry, do not change the project's dependency versions just to work around it. An available `pnpm dlx` Orval may produce output for a different Zod or TanStack Query major unless those output targets are explicitly configured to match the workspace.

**Why:** The package registry rejected requests for the pinned Orval package, while the available newer generator auto-detected incompatible output targets.

**How to apply:** Before regenerating API clients, confirm the generator can resolve, set its Zod and TanStack Query target versions to the workspace versions, and run library typechecks on the generated output.
