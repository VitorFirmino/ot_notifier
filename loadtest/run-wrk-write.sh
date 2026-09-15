#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

export LOADTEST_API_BASE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.session.json','utf-8')).apiBase)")
export LOADTEST_COOKIE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.session.json','utf-8')).cookie)")
export LOADTEST_SERVER_IDS=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.session.json','utf-8')).serverIds.join(','))")

wrk -t4 -c20 -d15s -s wrk-write.lua "$LOADTEST_API_BASE"
