# Attendance App — Project Notes
(update this file at the end of every session, in any tool)

## STATUS: MVP COMPLETE AND TESTED END-TO-END
Backend, frontend, real-device testing, version control, and the employer
limitations doc are all done. What's left is optional polish only (see
bottom of this file).

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
  - purpose: buddy-punching detection, not prevention — see LIMITATIONS.md

## Environment status
- Node: nvm-managed v24.20.0; the apt-installed nodejs package was removed
- Apache: mpm_prefork + php8.3 module enabled — mod_php needs prefork, the
  default event MPM conflicts with it
- MySQL: reinstalled clean; attendance_app DB + attendance_app@localhost user
  created via schema.sql, password reset via ALTER USER after reinstall
- Tailwind: v4.3.3 — ships no CLI binary by design, not a broken install
- Apache document root: /var/www/html/api is a symlink to the real project's
  api/ folder (chmod o+x needed on home dir + parents so www-data can
  traverse to it)
- db.php: real credentials hardcoded directly in db.php on this machine.
  db.php itself is gitignored — NOT pushed to GitHub. api/db.php.example is
  the tracked template with placeholder values; anyone else running this
  project copies it to db.php and fills in their own real credentials.
- git: installed, repo initialized, pushed to a PRIVATE GitHub repo at
  github.com/jesudunniolufuye/attendance-app

## Known gotchas
- Vite dev server (5173) and Apache (80) are different origins — use the
  Vite proxy for /api instead of fighting CORS (already added to
  vite.config.js: target http://localhost, changeOrigin)
- SALON_LAT / SALON_LNG in config.php are the REAL salon coordinates,
  confirmed working via curl AND on a real phone's GPS
- MySQL root uses unix_socket auth — use `sudo mysql`, not `mysql -u root -p`
- Geolocation requires a secure context (HTTPS or localhost). For LAN/phone
  testing over plain http, use Chrome's chrome://flags → "Insecure origins
  treated as secure" → add the exact http://<ip>:5173 address being tested
- Public/hotel/guest Wi-Fi often has "client isolation" enabled, which
  silently blocks phone-to-laptop LAN testing even on the same network with
  no error explaining why. Fix: use a personal phone hotspot instead and
  connect the laptop to that, so you control the network.

## Known limitations
See LIMITATIONS.md (in the project root) for the full writeup meant for the
employer. Short version:
1. PIN-based clock-in can be shared between staff ("buddy punching"). IP
   logging gives after-the-fact evidence, not prevention. Full prevention
   would need biometric or device-bound verification — bigger scope,
   intentionally deferred.
2. New staff are added via a terminal command (api/add-staff.php), not a
   page in the app — deliberate choice to avoid building a second admin
   login system for something that happens rarely.

## What's built and tested

### Backend — all 5 endpoints done and tested via curl
- [x] config.php + distance.php — real salon coordinates
- [x] clock-in.php — logs ip_address, rejects out-of-range locations
- [x] clock-out.php — logs clock_out_ip, rejects if no open session
- [x] staff.php — returns active users for the picker screen
- [x] login.php — password_verify() against the hash, returns
      {name, has_open_session}; three bugs from the first draft were found
      and fixed (wrong body key, undefined variable in validation, missing
      has_open_session lookup + response entirely)
- [x] add-staff.php — CLI-only script (not a web endpoint) for onboarding
      new staff: `php add-staff.php "Name" 1234`

### Frontend — fully tested, desktop AND real phone
- [x] vite.config.js — /api proxy to http://localhost
- [x] src/App.jsx — staff picker → PIN entry → clock in/out, single `step`
      state, no router
- [x] Full flow verified in a desktop browser: wrong PIN correctly
      rejected, correct PIN reaches clock screen with the right
      Clock In/Out label, geolocation correctly rejects real (France) vs
      salon location, works with Chrome DevTools location override
- [x] Full flow verified on a REAL PHONE over its own hotspot network,
      real GPS, real touch interaction — no layout or functional issues
      reported

### Version control
- [x] git installed, configured, initialized
- [x] db.php gitignored; db.php.example committed as the safe template
- [x] Pushed to a private GitHub repo — off-machine backup exists

### Documentation
- [x] LIMITATIONS.md written — ready to hand to the employer as-is (user
      should read it over once and adjust tone/wording to sound like their
      own voice before sending)

## Optional remaining polish (not required — MVP is demo-ready as-is)
- [ ] Admin screen for adding staff through the app instead of the
      terminal (would need its own lightweight auth, separate from the PIN
      system) — only worth doing if there's real spare time
- [ ] HTTPS setup for LAN so the chrome://flags workaround isn't needed for
      real deployment (only matters if this needs to run somewhere other
      than the demo laptop long-term)
- [ ] Tidy the repo: audit-report.txt and verify-frontend.sh are debugging
      artifacts from the build process, harmless to leave but could be
      `git rm`'d for a cleaner history
