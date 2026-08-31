# Attendance App — Project Notes
(update this file at the end of every session, in any tool)

## Stack
- Frontend: React (Vite) + Tailwind CSS v4 via @tailwindcss/vite plugin — no
  tailwind.config.js, no CLI needed, this is expected in v4
- Backend: plain PHP (PDO) REST endpoints under /api, no framework
- DB: MySQL 8.0
- Geolocation: navigator.geolocation on the client; distance to the salon is
  verified server-side with the Haversine formula — never trust the client

## Schema
- users(id, name, pin_code [password_hash output], role, is_active, created_at)
- attendance_logs(id, user_id, clock_in_time, clock_out_time, clock_out_ip,
  latitude, longitude, ip_address, created_at) — an "open" session is
  clock_out_time IS NULL
  - ip_address = REMOTE_ADDR captured at clock-in
  - clock_out_ip = REMOTE_ADDR captured at clock-out
  - purpose: buddy-punching detection, not prevention — see Known Limitations

## Environment status (as of Aug 31 2026)
- Node: nvm-managed v24.20.0; the apt-installed nodejs package was removed
- Apache: mpm_prefork + php8.3 module enabled — mod_php needs prefork, the
  default event MPM conflicts with it
- MySQL: reinstalled clean; attendance_app DB + attendance_app@localhost user
  created via schema.sql, password reset via ALTER USER after reinstall
- Tailwind: v4.3.3 — ships no CLI binary by design, not a broken install
- Apache document root: /var/www/html/api is a symlink to the real project's
  api/ folder (chmod o+x needed on home dir + parents so www-data can
  traverse to it)
- db.php: credentials hardcoded directly (not env vars)
- git: NOT currently installed on this machine — install with
  `sudo apt install -y git` before the next Claude Code session so it can
  set up proper commits/rollback points

## Known gotchas
- Vite dev server (5173) and Apache (80) are different origins — use the
  Vite proxy for /api instead of fighting CORS (already added to
  vite.config.js: target http://localhost, changeOrigin)
- SALON_LAT / SALON_LNG in config.php are the REAL salon coordinates,
  confirmed working via curl
- MySQL root uses unix_socket auth — use `sudo mysql`, not `mysql -u root -p`
- Geolocation requires a secure context (HTTPS or localhost) — a plain-http
  LAN IP (phone testing) will NOT get location until served over HTTPS.
  Frontend already checks window.isSecureContext and shows a clear message
  if it fails.

## Known limitations (worth disclosing to the employer, not hiding)
- PIN-based clock-in can be shared between staff ("buddy punching"). Full
  prevention needs biometric or device-bound verification — out of scope
  for this MVP. IP logging gives after-the-fact evidence, not prevention.

## Current state / next task

### Backend — ALL FOUR ENDPOINTS DONE AND TESTED
- [x] config.php + distance.php — real salon coordinates, curl-verified
- [x] clock-in.php — tested via curl, logs ip_address
- [x] clock-out.php — tested via curl, logs clock_out_ip
- [x] staff.php — SELECT id, name FROM users WHERE is_active = 1
- [x] login.php — FIXED this session, three bugs from the user's draft
      corrected: (1) was reading $body['pin_code'], now correctly reads
      $body['pin'] to match the frontend contract; (2) validation check
      referenced an undefined variable, now checks the right one; (3) was
      missing the has_open_session lookup and the final response entirely
      — both added, response now matches the agreed contract exactly:
      {"name": string, "has_open_session": boolean} on success, 400 if
      user_id/pin missing, 401 if user_id or pin invalid (deliberately the
      same generic error either way, to avoid leaking which user IDs exist)
- [ ] NOT YET DONE: curl-test login.php with the corrected file in place:
      curl -X POST http://localhost/api/login.php -H "Content-Type:
      application/json" -d '{"user_id":1,"pin":"1234"}'
      Expect {"name":"Test Staff","has_open_session":<true or false>}

### Frontend — written by Claude Code CLI, NOT YET RUNTIME-TESTED
- [x] vite.config.js — /api proxy to http://localhost, changeOrigin
- [x] src/App.jsx — staff picker, PIN entry, clock in/out screens, single
      `step` state variable, no router. Built against login.php's INTENDED
      contract, which is now actually correct after this session's fixes —
      so the frontend should work against it without changes needed.
- [ ] Full runtime test needed now that login.php is actually correct:
      1. npm run dev
      2. Open http://localhost:5173 in a browser
      3. Walk through: pick staff → enter PIN 1234 → should land on clock
         screen showing correct Clock In/Out label matching has_open_session
      4. Tap the button, allow location permission, confirm success message
      5. Refresh and repeat to confirm the label flips correctly
- [ ] Only after the above passes: test from a phone on the same LAN
      (`npm run dev -- --host`) — expect geolocation to fail until served
      over HTTPS, per the secure-context gotcha above; decide whether to
      set up a quick HTTPS dev cert or accept desktop-only demo for now

### Once frontend is verified
- [ ] git init + commit (blocked until git is installed, see above)
- [ ] Optional, if time allows: write up the Known Limitations note
      (buddy-punching) as something to literally hand the employer, not
      just keep in this file
