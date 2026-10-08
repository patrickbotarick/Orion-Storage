#!/bin/sh
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1
cd "$SCRIPT_DIR" || exit 1
if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev > /tmp/orion-storage-dev.log 2>&1 &
