#!/usr/bin/env bash
# ============================================================
# Budget Tracker — start both servers locally with one command.
#   Usage:  ./start.sh
#   Stop:   press Ctrl+C (cleans up both servers)
# ============================================================

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load nvm so `node`/`npm` are available even from a fresh shell
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1090
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ node not found. Open a terminal and run:  nvm install --lts"
  exit 1
fi

mkdir -p "$ROOT/logs"

# Free the ports in case something is already listening (e.g. an old run)
for port in 3001 5173; do
  pid="$(lsof -ti :"$port" 2>/dev/null || true)"
  [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
done

# Kill all child processes on exit / Ctrl+C
cleanup() {
  echo ""
  echo "Shutting down Budget Tracker..."
  kill 0
}
trap cleanup EXIT INT TERM

# Run a process and auto-restart it if it crashes
run_with_restart() {
  local name="$1"; shift
  local dir="$1"; shift
  while true; do
    echo "[$name] starting..."
    ( cd "$dir" && "$@" ) >> "$ROOT/logs/$name.log" 2>&1 || true
    echo "[$name] stopped — restarting in 2s (Ctrl+C to quit)..."
    sleep 2
  done
}

run_with_restart backend  "$ROOT/backend"  node src/index.js &
run_with_restart frontend "$ROOT/frontend" npm run dev &

sleep 3
echo ""
echo "  ✅ Budget Tracker is running:"
echo "       App:   http://localhost:5173"
echo "       API:   http://localhost:3001"
echo "       Logs:  $ROOT/logs/"
echo ""
echo "  Press Ctrl+C here to stop both servers."
echo ""
wait
