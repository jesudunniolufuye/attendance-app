#!/usr/bin/env bash
# TEMP frontend verification helper (safe: read-only against the DB — it never
# calls clock-in/out, only staff.php GET and login.php which does a SELECT).
# Starts the Vite dev server under `timeout` so it can never block the session.
# Remove this file when done: rm verify-frontend.sh
cd ~/Projects/attendance-app || exit 1

line() { printf '\n===== %s =====\n' "$1"; }

line "Toolchain"
command -v git >/dev/null 2>&1 && git --version || echo "git: MISSING"
echo "node: $(node --version 2>&1)"
echo "npm:  $(npm --version 2>&1)"
command -v curl >/dev/null 2>&1 && echo "curl: present" || echo "curl: MISSING"

line "Apache on :80 (direct, bypassing Vite)"
curl -s -o /tmp/av_staff_direct.txt -w "staff.php direct -> HTTP %{http_code}\n" --max-time 5 \
  http://localhost/api/staff.php || echo "curl to Apache failed — is Apache running?"
echo "body: $(head -c 400 /tmp/av_staff_direct.txt 2>/dev/null)"

line "Frontend compile check (vite build)"
if npm run build > /tmp/av_build.log 2>&1; then
  echo "BUILD OK"
  grep -E "modules transformed|built in" /tmp/av_build.log | tail -3
else
  echo "BUILD FAILED — last 25 lines:"
  tail -25 /tmp/av_build.log
fi

line "Start dev server (timeout 60s guard)"
rm -f /tmp/av_vite.log
timeout 60 node_modules/.bin/vite --port 5173 --strictPort > /tmp/av_vite.log 2>&1 &
VITE_PID=$!
READY=0
for i in $(seq 1 30); do
  if grep -qi "Local:" /tmp/av_vite.log 2>/dev/null; then READY=1; break; fi
  if ! kill -0 "$VITE_PID" 2>/dev/null; then break; fi
  sleep 0.5
done
if [ "$READY" = "1" ]; then
  echo "dev server READY:"; grep -i "Local:" /tmp/av_vite.log | head -1
else
  echo "dev server NOT ready — vite log:"; tail -20 /tmp/av_vite.log
fi

if [ "$READY" = "1" ]; then
  line "Proxy check: GET /api/staff.php through Vite (:5173)"
  curl -s -o /tmp/av_staff_proxy.txt -w "staff.php via proxy -> HTTP %{http_code}\n" --max-time 8 \
    http://localhost:5173/api/staff.php
  echo "body: $(head -c 400 /tmp/av_staff_proxy.txt 2>/dev/null)"

  line "login.php actual behavior (POST test creds via proxy)"
  echo "--- correct PIN {user_id:1, pin:\"1234\"} ---"
  curl -s -w "\n-> HTTP %{http_code}\n" --max-time 8 -X POST \
    http://localhost:5173/api/login.php \
    -H "Content-Type: application/json" \
    -d '{"user_id":1,"pin":"1234"}'
  echo "--- wrong PIN {user_id:1, pin:\"9999\"} ---"
  curl -s -w "\n-> HTTP %{http_code}\n" --max-time 8 -X POST \
    http://localhost:5173/api/login.php \
    -H "Content-Type: application/json" \
    -d '{"user_id":1,"pin":"9999"}'
  echo "--- no such user {user_id:99999, pin:\"1234\"} ---"
  curl -s -w "\n-> HTTP %{http_code}\n" --max-time 8 -X POST \
    http://localhost:5173/api/login.php \
    -H "Content-Type: application/json" \
    -d '{"user_id":99999,"pin":"1234"}'
fi

line "Cleanup: stop dev server"
kill "$VITE_PID" 2>/dev/null
sleep 1
if kill -0 "$VITE_PID" 2>/dev/null; then kill -9 "$VITE_PID" 2>/dev/null; fi
echo "done."
