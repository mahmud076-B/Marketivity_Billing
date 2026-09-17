#!/bin/sh
# Restart contract for the App Builder preview.
# Idempotent: if already healthy on :8080, do nothing.
set -eu
if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
cd /workspace
npm run dev > /tmp/marketivity-dev.log 2>&1 &
# Wait briefly for bind so revive isn't racing the first request
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/; then
    exit 0
  fi
  sleep 0.4
done
exit 0
