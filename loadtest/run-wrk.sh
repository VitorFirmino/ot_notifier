#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

API_BASE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.session.json','utf-8')).apiBase)")
export LOADTEST_COOKIE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.session.json','utf-8')).cookie)")

wrk -t4 -c50 -d15s -s wrk.lua "$API_BASE"
