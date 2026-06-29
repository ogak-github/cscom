#!/bin/bash
set -e

echo "[1/3] Typecheck..."
bun run tsgo --noEmit

echo "[2/3] Embedding dashboard..."
printf 'export const dashboardHtml = ' > src/transport/dashboard-embed.ts
cat src/transport/dashboard.html | jq -Rs . >> src/transport/dashboard-embed.ts
printf ';\n' >> src/transport/dashboard-embed.ts

echo "[3/3] Building binaries..."
bun build --compile --outfile dist/cscom index.ts
bun build --compile --outfile dist/cscom-serve src/transport/server.ts

ls -lh dist/cscom dist/cscom-serve
