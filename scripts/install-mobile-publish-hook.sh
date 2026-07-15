#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT"

HOOK_DIR=".git/hooks"
HOOK_FILE="$HOOK_DIR/post-commit"

mkdir -p "$HOOK_DIR"

cat > "$HOOK_FILE" <<'EOF'
#!/usr/bin/env bash
# Hook post-commit : publie automatiquement les modifications mobiles
# soit par OTA (JS/assets), soit par build local si changements natifs.
# Desactive ce hook en le renommant ou en supprimant ce fichier.

REPO_ROOT=$(git rev-parse --show-toplevel)
"$REPO_ROOT/scripts/publish-mobile.sh" all auto >> "$REPO_ROOT/.mobile-publish.log" 2>&1 &
EOF

chmod +x "$HOOK_FILE"
echo "Hook post-commit installe : $HOOK_FILE"
echo "Les publications seront loguees dans .mobile-publish.log"
echo "Pour desactiver : rm $HOOK_FILE"
