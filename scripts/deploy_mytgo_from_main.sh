#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="/home/ubuntu/MYTGO"
BACKEND_DIR="$REPO_ROOT/mytgo-backend"
FRONTEND_DIR="$REPO_ROOT/mytgo-frontend"
BACKEND_VENV="$BACKEND_DIR/.venv"
TARGET_SHA="${1:-origin/main}"

log() {
  printf '[deploy] %s\n' "$*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'missing required command: %s\n' "$1" >&2
    exit 1
  }
}

require_cmd git
require_cmd python3
require_cmd npm
require_cmd rsync
require_cmd curl
require_cmd systemctl

if [ ! -d "$REPO_ROOT/.git" ]; then
  echo "repo not found at $REPO_ROOT" >&2
  exit 1
fi

cd "$REPO_ROOT"

log "fetching origin/main"
git fetch --prune origin main

log "checking out main"
git checkout main
log "resetting working tree to $TARGET_SHA"
git reset --hard "$TARGET_SHA"
log "cleaning untracked files"
git clean -fd

log "preparing backend virtualenv"
if [ ! -x "$BACKEND_VENV/bin/python" ]; then
  python3 -m venv "$BACKEND_VENV"
fi
"$BACKEND_VENV/bin/pip" install --upgrade pip
"$BACKEND_VENV/bin/pip" install -r "$BACKEND_DIR/requirements.txt"

log "running backend syntax check"
"$BACKEND_VENV/bin/python" -m py_compile "$BACKEND_DIR/app/main.py"

log "installing frontend dependencies"
cd "$FRONTEND_DIR"
npm ci

log "running frontend build"
npm run build

log "publishing frontend assets"
sudo rsync -a --delete "$FRONTEND_DIR/dist/" /var/www/mytgo/

log "restarting E-Cars services"
sudo systemctl restart mytgo-backend mytgo-telegram-poller

log "waiting for backend health"
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:8010/health >/tmp/mytgo-health.json; then
    cat /tmp/mytgo-health.json
    rm -f /tmp/mytgo-health.json
    log "deploy successful"
    exit 0
  fi
  sleep 3
done

echo "backend health check failed after restart" >&2
sudo systemctl status --no-pager mytgo-backend mytgo-telegram-poller >&2 || true
exit 1
