#!/usr/bin/env bash
set -euo pipefail

URL="${1:-http://127.0.0.1:4173}"

open -a Simulator || true

BOOTED_UDID="$(xcrun simctl list devices booted | sed -n 's/.*(\([0-9A-F-]\{36\}\)) (Booted).*/\1/p' | head -n 1)"

if [[ -z "${BOOTED_UDID}" ]]; then
  TARGET_UDID="$(xcrun simctl list devices available | sed -n 's/^[[:space:]]*iPhone[^()]* (\([0-9A-F-]\{36\}\)) (Shutdown).*/\1/p' | head -n 1)"
  if [[ -z "${TARGET_UDID}" ]]; then
    echo "No available iPhone simulator found."
    exit 1
  fi
  xcrun simctl boot "${TARGET_UDID}" || true
  xcrun simctl bootstatus "${TARGET_UDID}" -b || true
  BOOTED_UDID="${TARGET_UDID}"
fi

xcrun simctl openurl "${BOOTED_UDID}" "${URL}"
echo "Opened ${URL} on simulator ${BOOTED_UDID}"
