#!/bin/sh

set -e

# Start Metro automatically when launching Debug from Xcode.
if [ "${CONFIGURATION:-Debug}" != "Debug" ]; then
  exit 0
fi

IOS_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
APP_ROOT="$(cd "$IOS_DIR/.." && pwd)"
LOG_DIR="$APP_ROOT/.rn"
LOG_FILE="$LOG_DIR/xcode-metro.log"

mkdir -p "$LOG_DIR"

if ! /usr/sbin/lsof -iTCP:8081 -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  /bin/bash -lc "cd \"$APP_ROOT\" && CI=1 nohup npx react-native start --port 8081 > \"$LOG_FILE\" 2>&1 &"
  sleep 2
fi

# Ensure React Native bridge uses localhost Metro in simulator sessions.
if command -v xcrun >/dev/null 2>&1; then
  xcrun simctl spawn booted defaults write com.facebook.ReactNativeDevBundleURLProvider jsLocation "127.0.0.1:8081" >/dev/null 2>&1 || true
fi
