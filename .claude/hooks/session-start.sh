#!/bin/bash
set -euo pipefail

# SessionStart hook for Claude Code on the web.
# Installs dependencies so typecheck, lint, and build work from the first turn.

# Only run in the remote (Claude Code on the web) environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install JS dependencies. `npm install` (not `ci`) benefits from container caching.
npm install

# Generate the Prisma client — required for tsc/next build/lint to resolve @prisma/client.
npx prisma generate
