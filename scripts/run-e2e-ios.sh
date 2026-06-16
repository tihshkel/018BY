#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_ID="com.tihshkel.x018BY"
FLOWS_DIR="e2e/maestro/flows"

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro CLI not found. Install: curl -Ls https://get.maestro.mobile.dev | bash"
  exit 1
fi

FLOW_ARG="${1:-}"

if [[ -n "${FLOW_ARG}" ]]; then
  maestro test "${FLOWS_DIR}/${FLOW_ARG}"
  exit 0
fi

echo "Running smoke E2E on iOS Simulator (${APP_ID})..."
maestro test "${FLOWS_DIR}/00-smoke"
