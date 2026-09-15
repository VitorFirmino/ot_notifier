#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${LOADTEST_PORT:-3077}"
STORAGE_DIR="$(pwd)/loadtest/.storage"

mkdir -p "$STORAGE_DIR"

API_PORT="$PORT" \
SERVER_STORAGE_DIR="$STORAGE_DIR" \
DASHBOARD_URL="http://localhost:$PORT" \
E2E_TEST_MODE=true \
xvfb-run -a tsx src/api/server.ts
