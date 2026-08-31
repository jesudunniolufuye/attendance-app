#!/usr/bin/env bash
# ==============================================================================
# attendance-app :: system health audit
# Run on the actual Linux Mint machine (this cannot be run from the chat):
#   cd ~/Projects/attendance-app
#   bash audit.sh | tee audit-report.txt
# It is read-only except for `sudo mysqladmin ping`, which just tests a connection.
# ==============================================================================
set -uo pipefail
PROJECT_DIR="$HOME/Projects/attendance-app"

pass() { echo "  [PASS] $1"; }
fail() { echo "  [FAIL] $1"; }
info() { echo "  [INFO] $1"; }

echo "======================================================"
echo " 1. NODE / NPM"
echo "======================================================"
if command -v node >/dev/null 2>&1; then
  pass "node found: $(node -v) at $(command -v node)"
else
  fail "node not found on PATH"
fi

if command -v npm >/dev/null 2>&1; then
  pass "npm found: $(npm -v) at $(command -v npm)"
else
  fail "npm not found on PATH"
fi

echo "  -- checking for conflicting apt-installed node/npm packages --"
dpkg -l 2>/dev/null | grep -iE '^ii\s+(nodejs|npm)\s' || info "no apt-managed nodejs/npm packages found (good if you installed via NodeSource only)"

echo "  -- every 'node' executable currently on PATH --"
type -a node 2>/dev/null

echo
echo "======================================================"
echo " 2. PROJECT: $PROJECT_DIR"
echo "======================================================"
if [ -d "$PROJECT_DIR" ]; then
  pass "project directory exists"
  cd "$PROJECT_DIR" || exit 1

  if [ -f package.json ]; then
    pass "package.json found"
    echo "  --- devDependencies (raw) ---"
    node -e "const p=require('./package.json'); console.log(JSON.stringify(p.devDependencies||{}, null, 2))"
    echo "  --- dependencies (raw) ---"
    node -e "const p=require('./package.json'); console.log(JSON.stringify(p.dependencies||{}, null, 2))"
  else
    fail "package.json missing — are you in the right directory?"
  fi

  if [ -d node_modules ]; then
    pass "node_modules exists"
  else
    fail "node_modules missing — run: npm install"
  fi

  echo "  --- tailwindcss install check (this is the key diagnostic) ---"
  if [ -f node_modules/tailwindcss/package.json ]; then
    TW_VER=$(node -p "require('./node_modules/tailwindcss/package.json').version" 2>/dev/null)
    TW_BIN=$(node -p "JSON.stringify(require('./node_modules/tailwindcss/package.json').bin || null)" 2>/dev/null)
    info "installed tailwindcss version: $TW_VER"
    info "tailwindcss package.json 'bin' field: $TW_BIN"
    if [ "$TW_BIN" = "null" ]; then
      fail "this tailwindcss version ships NO CLI binary -> explains 'could not determine executable to run'"
    fi
  else
    fail "node_modules/tailwindcss not found"
  fi
  echo "  --- tailwind-related binaries actually present in node_modules/.bin ---"
  ls node_modules/.bin/ 2>/dev/null | grep -i tailwind || info "none found"

else
  fail "project directory not found at $PROJECT_DIR"
fi

echo
echo "======================================================"
echo " 3. APACHE2"
echo "======================================================"
if systemctl is-active --quiet apache2 2>/dev/null; then
  pass "apache2 service is active"
else
  fail "apache2 service is NOT active"
fi
systemctl is-enabled apache2 >/dev/null 2>&1 && pass "apache2 enabled on boot" || info "apache2 not enabled on boot (systemctl enable apache2 if you want it to survive reboot)"
echo "  --- HTTP check ---"
curl -sI http://localhost 2>&1 | head -n 1 || fail "curl to http://localhost failed"

echo
echo "======================================================"
echo " 4. MYSQL"
echo "======================================================"
if systemctl is-active --quiet mysql 2>/dev/null; then
  pass "mysql service is active"
else
  fail "mysql service is NOT active"
fi
mysql --version 2>&1
echo "  --- connection test (may prompt for sudo password) ---"
sudo mysqladmin ping 2>&1

echo
echo "======================================================"
echo " 5. PHP"
echo "======================================================"
if command -v php >/dev/null 2>&1; then
  pass "php CLI found: $(php -v | head -n 1)"
else
  fail "php CLI not found"
fi
echo "  --- pdo_mysql extension (CLI) ---"
php -m 2>/dev/null | grep -i pdo || fail "pdo_mysql not loaded for PHP CLI"
echo "  --- apache php module ---"
sudo apache2ctl -M 2>/dev/null | grep -i php || fail "php module not loaded in apache2"

echo
echo "======================================================"
echo " DONE. Paste this full output back if anything shows [FAIL]."
echo "======================================================"
