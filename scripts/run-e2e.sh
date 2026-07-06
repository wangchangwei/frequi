#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# run-e2e.sh — one-shot wrapper for the FreqUI Playwright e2e suite.
#
# What it does:
#   1. Forces Node 22 (the .nvm install on this machine). A stale Node 14 in
#      /usr/local/bin breaks `npx playwright` ("Playwright requires Node 18+").
#   2. Installs pnpm deps only if node_modules looks stale or missing.
#   3. Runs `pnpm run typecheck` + `pnpm run lint` (gates).
#   4. Runs a fast *smoke* (just e2e/login.spec.ts) — that spec is currently the
#      most brittle one (UI has been i18n'd to Chinese + migrated to Nuxt UI v4).
#   5. If smoke passes, runs the FULL e2e suite. By default that includes
#      e2e/pipeline.spec.ts which talks to a real freqtrade backend at
#      http://localhost:8080 — set FT_USER / FT_PASS and start the bot, or pass
#      --no-pipeline to skip it.
#   6. Writes artifacts to ./artifacts/e2e-{timestamp}/  (HTML report + JUnit
#      XML + screenshots). Symlinked as ./artifacts/latest -> newest run.
#
# Exit codes:
#   0   all selected stages green
#   1   a stage failed
#   2   bad CLI usage / missing prerequisites
#   130 SIGINT (Ctrl-C)
#
# Usage:
#   ./scripts/run-e2e.sh                          # full pipeline, linux chromium
#   ./scripts/run-e2e.sh --smoke-only             # login.spec.ts only
#   ./scripts/run-e2e.sh --no-pipeline            # full but skip the real-bot spec
#   ./scripts/run-e2e.sh --project=firefox        # pick a playwright project
#   ./scripts/run-e2e.sh --spec=e2e/backtest.spec.ts
#   ./scripts/run-e2e.sh --headed                 # show the browser (debugging)
#
# Env:
#   FT_USER, FT_PASS          real freqtrade credentials (pipeline.spec.ts)
#   PLAYWRIGHT_BROWSERS_PATH  override browser cache (default: ~/.cache/ms-playwright)
#   BASE_URL                  override Playwright baseURL (default: http://localhost:3000)
# ------------------------------------------------------------------------------

set -Euo pipefail
IFS=$'\n\t'

# --- pretty logging ---------------------------------------------------------
log()  { printf '\033[1;34m[run-e2e]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[run-e2e]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[run-e2e]\033[0m %s\n' "$*" >&2; }
ok()   { printf '\033[1;32m[run-e2e]\033[0m %s\n' "$*"; }

# Always run from repo root, regardless of where the user invokes us from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

cleanup() {
  local ec=$?
  # nothing async to kill — webServer is owned by Playwright
  if [[ $ec -eq 0 ]]; then ok "artifacts: $ARTIFACT_DIR"
  else                    err "failed (exit $ec) — see $ARTIFACT_DIR"
  fi
  exit $ec
}
trap cleanup EXIT INT TERM

# --- arg parsing ------------------------------------------------------------
SMOKE_ONLY=0
NO_PIPELINE=0
PROJECT="chromium"
SPEC_ARG=""
HEADED=0
EXTRA_ARGS=()

usage() {
  sed -n '2,40p' "$0" | sed 's/^# \?//'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --smoke-only)   SMOKE_ONLY=1 ;;
    --no-pipeline)  NO_PIPELINE=1 ;;
    --project=*)    PROJECT="${1#*=}" ;;
    --spec=*)       SPEC_ARG="${1#*=}" ;;
    --headed)       HEADED=1; EXTRA_ARGS+=(--headed) ;;
    -h|--help)      usage; exit 0 ;;
    *)              EXTRA_ARGS+=("$1") ;;
  esac
  shift
done

# --- preflight: pin Node ---------------------------------------------------
NODE_VERSION_REQUIRED="v22.22.0"
if command -v nvm >/dev/null 2>&1; then
  # shellcheck disable=SC1090,SC1091
  source "${NVM_DIR:-$HOME/.nvm}/nvm.sh" || true
fi

if command -v node >/dev/null 2>&1; then
  CURRENT_NODE="$(node -v 2>/dev/null || echo 'unknown')"
else
  CURRENT_NODE="none"
fi

# Hard-pin a known-good node binary. We prefer nvm-managed v22 if available.
if [[ -x "$HOME/.nvm/versions/node/$NODE_VERSION_REQUIRED/bin/node" ]]; then
  log "pinning node to nvm $NODE_VERSION_REQUIRED (was: $CURRENT_NODE)"
  export PATH="$HOME/.nvm/versions/node/$NODE_VERSION_REQUIRED/bin:$PATH"
elif command -v fnm >/dev/null 2>&1; then
  log "pinning node via fnm to $NODE_VERSION_REQUIRED (was: $CURRENT_NODE)"
  eval "$(fnm env)" && fnm use "$NODE_VERSION_REQUIRED" >/dev/null 2>&1 || true
else
  if [[ "$CURRENT_NODE" != v18* && "$CURRENT_NODE" != v20* && "$CURRENT_NODE" != v22* ]]; then
    warn "current node is $CURRENT_NODE — Playwright needs 18+. Continuing, but expect breakage."
  else
    log "using $CURRENT_NODE"
  fi
fi

hash -r

# --- preflight: playwright browsers ----------------------------------------
PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/Library/Caches/ms-playwright}"
# on linux default is ~/.cache/ms-playwright, on mac default is ~/Library/Caches/ms-playwright
if [[ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ]]; then
  PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/ms-playwright"
fi
export PLAYWRIGHT_BROWSERS_PATH

if [[ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ]] || \
   ! ls "$PLAYWRIGHT_BROWSERS_PATH" 2>/dev/null | grep -q .; then
  warn "no playwright browsers found at $PLAYWRIGHT_BROWSERS_PATH"
  warn "install with: pnpm exec playwright install chromium"
fi

# --- preflight: pnpm -------------------------------------------------------
if ! command -v pnpm >/dev/null 2>&1; then
  if [[ -x "$HOME/.nvm/versions/node/$NODE_VERSION_REQUIRED/bin/pnpm" ]]; then
    export PATH="$HOME/.nvm/versions/node/$NODE_VERSION_REQUIRED/bin:$PATH"
  fi
fi
command -v pnpm >/dev/null 2>&1 || { err "pnpm not on PATH after node pin"; exit 2; }

# --- deps: install only if missing/stale ------------------------------------
install_deps_if_needed() {
  if [[ ! -d node_modules ]] || [[ ! -x node_modules/.bin/playwright ]]; then
    log "node_modules missing or incomplete — running pnpm install"
    pnpm install --frozen-lockfile=false
    return
  fi
  # if package.json is newer than the .modules.yaml marker, refresh
  local marker="node_modules/.modules.yaml"
  if [[ -f "$marker" ]] && [[ package.json -nt "$marker" ]]; then
    log "package.json newer than $marker — running pnpm install"
    pnpm install --frozen-lockfile=false
    return
  fi
  log "node_modules looks fresh — skipping install"
}

# --- stage helpers ---------------------------------------------------------
run_stage() {
  local name="$1"; shift
  log "▶ stage: $name"
  if "$@"; then
    ok "  ✓ $name"
    return 0
  else
    local ec=$?
    err "  ✗ $name (exit $ec)"
    return $ec
  fi
}

# --- artifact dir ----------------------------------------------------------
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARTIFACT_DIR="artifacts/e2e-$TIMESTAMP"
mkdir -p "$ARTIFACT_DIR/screenshots"
ln -sfn "$ARTIFACT_DIR" artifacts/latest
log "artifacts -> $ARTIFACT_DIR"

# --- command construction -------------------------------------------------
PW_BIN="$REPO_ROOT/node_modules/.bin/playwright"

# Combine spec list per mode.
build_spec_list() {
  SPEC_LIST=()
  if [[ -n "$SPEC_ARG" ]]; then
    SPEC_LIST=("$SPEC_ARG")
    return
  fi
  if [[ $SMOKE_ONLY -eq 1 ]]; then
    SPEC_LIST=("e2e/login.spec.ts")
    return
  fi
  # Full mode: every spec under e2e/ that isn't the pipeline (unless allowed).
  shopt -s nullglob
  for s in e2e/*.spec.ts; do
    if [[ $NO_PIPELINE -eq 1 && "$s" == "e2e/pipeline.spec.ts" ]]; then
      continue
    fi
    SPEC_LIST+=("$s")
  done
  shopt -u nullglob
}
build_spec_list

log "spec list: ${SPEC_LIST[*]} (project: $PROJECT)"

# --- gate 1: deps ----------------------------------------------------------
run_stage "deps" install_deps_if_needed || exit 1

# --- gate 2: typecheck ----------------------------------------------------
run_stage "typecheck" pnpm run typecheck || exit 1

# --- gate 3: lint ---------------------------------------------------------
# Some specs use getByLabel / older nuxtui patterns that lint may flag; allow opt-out.
if [[ ${SKIP_LINT:-0} -eq 0 ]]; then
  run_stage "lint" pnpm run lint-ci || {
    warn "lint reported issues — continuing (set SKIP_LINT=1 to skip)"
  }
fi

# --- gate 4: e2e ----------------------------------------------------------
# Playwright reporter layout:
#   --output   controls where test-results/ (artifacts per spec) goes
#   --reporter=html emits an HTML report into ${output}/html by default; we
#                  steer that to ARTIFACT_DIR/html via PW_HTML_OUTPUT_FILE.
#   --reporter=junit emits junit XML; we redirect via PW_JUNIT_OUTPUT_NAME.
#
# We rely on environment variables set HERE rather than passing --output-stack
# via CLI flags, so the call site stays trivial.
export PLAYWRIGHT_HTML_REPORTER_OUTPUT_DIRECTORY="$ARTIFACT_DIR/html-report"
export PLAYWRIGHT_JUNIT_OUTPUT_NAME="$ARTIFACT_DIR/junit.xml"
export PLAYWRIGHT_OUTPUT_DIR="$ARTIFACT_DIR/test-results"

run_playwright() {
  local label="$1"; shift
  log "▶ e2e: $label"
  # "$@" is the spec files (no other flags here).
  local pw_args=(test --project="$PROJECT" --reporter=list "$@")
  if [[ $HEADED -eq 1 ]]; then
    pw_args+=("${EXTRA_ARGS[@]}")
  fi
  "$PW_BIN" "${pw_args[@]}"
}

# 4a — smoke (login.spec.ts). Runs in default/full mode AND --smoke-only mode
# (--smoke-only means "only the smoke spec, not the rest of the suite").
# Skipped when --spec= is given (single-spec mode takes over in 4c).
if [[ -z "$SPEC_ARG" ]]; then
  if [[ $SMOKE_ONLY -eq 0 ]]; then
    run_playwright "smoke (login.spec.ts)" "e2e/login.spec.ts" || {
      err "smoke failed — aborting full run. Re-run with ./scripts/run-e2e.sh --smoke-only --headed to debug."
      exit 1
    }
    ok "smoke passed"
  else
    run_playwright "smoke-only (login.spec.ts)" "e2e/login.spec.ts" || {
      err "smoke-only failed. Re-run with ./scripts/run-e2e.sh --smoke-only --headed to debug."
      exit 1
    }
    ok "smoke-only passed"
  fi
fi

# 4b — full run (default mode only)
if [[ $SMOKE_ONLY -eq 0 ]] && [[ -z "$SPEC_ARG" ]]; then
  # Skip login.spec.ts in the full pass (it already ran as smoke).
  FULL_LIST=()
  for s in "${SPEC_LIST[@]}"; do
    [[ "$s" == "e2e/login.spec.ts" ]] && continue
    FULL_LIST+=("$s")
  done
  if [[ ${#FULL_LIST[@]} -gt 0 ]]; then
    run_playwright "full suite (${#FULL_LIST[@]} specs)" "${FULL_LIST[@]}" || exit 1
  fi
fi

# 4c — single-spec path
if [[ -n "$SPEC_ARG" ]]; then
  run_playwright "single spec: $SPEC_ARG" "$SPEC_ARG" || exit 1
fi

ok "all e2e stages passed"
