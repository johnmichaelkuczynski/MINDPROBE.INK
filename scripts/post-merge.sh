#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Restore the merged lockfile exactly, including tools needed by the dev workflow.
npm ci --include=dev --no-audit --no-fund

# Refresh the frontend and server bundle before workflow reconciliation restarts them.
npm run build
