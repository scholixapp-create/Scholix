---
name: Replit pnpm bootstrap recursion
description: Replit's pnpm 10 wrapper recursively tries to install the repository-declared pnpm 11 and can exhaust the process limit.
---

When running pnpm in this Replit workspace, set `npm_config_manage_package_manager_versions=false` for that invocation. If validation is still blocked by nested package scripts, invoke the installed TypeScript, Vite, and build entry points directly.

**Why:** The workspace pnpm wrapper repeatedly launched `pnpm add pnpm@11.9.0`, creating a deep process chain that exhausted the container process limit and prevented workflows and shell commands from spawning.

**How to apply:** Keep this as a Replit-only command/workflow concern. Direct Node commands in managed development services are another safe way to avoid the wrapper and nested-script recursion. Managed service commands run from the artifact directory, not the workspace root. Do not change the repository's declared package-manager version or production commands to solve this local problem.