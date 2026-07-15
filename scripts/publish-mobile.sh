#!/usr/bin/env bash
set -euo pipefail

APP=${1:-}
FORCE_MODE=${2:-auto}

usage() {
  echo "Usage: $0 {consumer|provider|all} [auto|ota|build]"
  echo ""
  echo "  auto  - Detecte automatiquement si c'est une mise a jour OTA ou un rebuild natif"
  echo "  ota   - Force une publication OTA (JS/assets uniquement)"
  echo "  build - Force un build local EAS (APK natif)"
  exit 1
}

case ${APP:-} in
  consumer|provider|all) ;;
  *) usage ;;
esac

case ${FORCE_MODE:-} in
  auto|ota|build) ;;
  *) usage ;;
esac

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT"

publish_app() {
  local app=$1
  local dir="mobile/$app"
  local tag="mobile-$app-published"

  if [ ! -d "$dir" ]; then
    echo "[$app] Dossier $dir introuvable. Skip."
    return 0
  fi

  local base
  base=$(git rev-parse -q --verify "$tag" 2>/dev/null || echo "HEAD~1")

  local changed
  changed=$(git diff --name-only "$base" -- "$dir" 2>/dev/null || true)

  if [ -z "$changed" ]; then
    echo "[$app] Aucun changement detecte depuis $base. Skip."
    return 0
  fi

  echo "[$app] Fichiers modifies depuis $base :"
  echo "$changed" | sed 's/^/  - /'

  local native_files
  native_files=$(echo "$changed" | grep -iE \
    "^mobile/$app/(package\.json|app\.json|app\.config\.(js|ts)|eas\.json|plugins/.*|android/.*|ios/.*|metro\.config\.js|babel\.config\.js|tsconfig\.json|.*\.gradle|gradle\.properties|fastlane/.*|Gemfile.*)$" || true)

  local mode=$FORCE_MODE
  if [ "$mode" = "auto" ]; then
    if [ -n "$native_files" ]; then
      mode=build
      echo "[$app] Changements natifs detectes -> mode BUILD"
      echo "$native_files" | sed 's/^/    NATIF: /'
    else
      mode=ota
      echo "[$app] Changements JS/assets detectes -> mode OTA"
    fi
  fi

  local message
  message="publish $(date '+%Y-%m-%d %H:%M')"

  cd "$dir"

  if [ "$mode" = "ota" ]; then
    echo "[$app] Publication OTA sur le channel 'ec2'..."
    npx eas update --channel ec2 --message "$message" --non-interactive
  else
    echo "[$app] Build local EAS (APK) profile 'ec2'..."
    if command -v eas >/dev/null 2>&1; then
      eas build --platform android --profile ec2 --local --non-interactive
    else
      npx eas-cli build --platform android --profile ec2 --local --non-interactive
    fi
  fi

  cd "$REPO_ROOT"

  git tag -f "$tag" >/dev/null 2>&1 || true
  echo "[$app] OK - tag '$tag' mis a jour."
}

if [ "$APP" = "all" ]; then
  publish_app consumer
  publish_app provider
else
  publish_app "$APP"
fi
