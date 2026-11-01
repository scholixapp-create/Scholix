#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Keep Replit's installed pnpm from recursively bootstrapping another version.
# This invocation-only setting does not change Railway's package manager.
export CI=true
export npm_config_manage_package_manager_versions=false

pnpm install --frozen-lockfile
node node_modules/typescript/bin/tsc --build

# Schema migrations are an explicit release step, never an automatic schema push.
# Do not seed accounts or alter any database during post-merge setup.
