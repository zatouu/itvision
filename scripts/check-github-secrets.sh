#!/bin/bash
# Script pour vérifier les secrets GitHub configurés
# Usage: ./scripts/check-github-secrets.sh <owner/repo>

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <owner/repo>"
  echo "Exemple: $0 zatouu/itvision"
  exit 1
fi

REPO="$1"
OWNER="${REPO%/*}"
REPO_NAME="${REPO#*/}"

echo "🔍 Vérification des secrets GitHub pour $REPO"
echo "================================================"
echo ""

# Vérifier que gh CLI est installé
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) n'est pas installé."
  echo "   Installez-le depuis: https://cli.github.com/"
  exit 1
fi

# Vérifier l'authentification
if ! gh auth status &> /dev/null; then
  echo "❌ Non authentifié avec GitHub CLI."
  echo "   Lancez: gh auth login"
  exit 1
fi

echo "✅ GitHub CLI installé et authentifié"
echo ""

# Liste des secrets requis (tels que définis dans le workflow)
REQUIRED_SECRETS=(
  "SSH_HOST"
  "SSH_USER"
  "SSH_KEY"
  "MONGO_ROOT_PASSWORD"
  "MONGO_APP_PASSWORD"
  "NEXTAUTH_SECRET"
  "JWT_SECRET"
  "CRON_SECRET"
  "NEXT_PUBLIC_SITE_URL"
  "REDIS_URL"
  "SMTP_HOST"
  "SMTP_PORT"
  "SMTP_USER"
  "SMTP_PASS"
  "SMTP_FROM"
  "SMTP_SECURE"
  "SMS_PROVIDER"
  "TWILIO_ACCOUNT_SID"
  "TWILIO_AUTH_TOKEN"
  "TWILIO_FROM_NUMBER"
  "ALLOW_TEST_CODES"
  "OTP_TEST_PHONES"
  "PAYMENTS_MOCK"
  "PAYDUNYA_MASTER_KEY"
  "PAYDUNYA_PRIVATE_KEY"
  "PAYDUNYA_TOKEN"
  "PAYDUNYA_MODE"
  "PAYDUNYA_STORE_NAME"
  "WAVE_MERCHANT_PHONE"
  "WAVE_QR_URL"
  "WAVE_PAY_URL"
  "OPENAI_API_KEY"
  "QWEN_CLOUD_API_KEY"
  "QWEN_CLOUD_BASE_URL"
  "QWEN_MODEL"
  "APIFY_TOKEN"
  "ADMIN_EMAIL"
  "MAINTENANCE_CRON_DISABLED"
  "SENTRY_DSN"
  "DEEPSEEK_API_KEY"
  "ALIEXPRESS_RAPIDAPI_KEY"
)

# Liste des variables requises
REQUIRED_VARS=(
  "NEXT_PUBLIC_SENTRY_DSN"
  "DEEPSEEK_MODEL"
  "LLM_TEXT_PROVIDER"
  "AGENT_WORKER_ENABLED"
)

echo "📋 Secrets GitHub requis (${#REQUIRED_SECRETS[@]}):"
echo "----------------------------------------------"

# Récupérer les secrets existants
EXISTING_SECRETS=$(gh secret list -R "$REPO" 2>/dev/null || echo "")

MISSING_COUNT=0
for secret in "${REQUIRED_SECRETS[@]}"; do
  if echo "$EXISTING_SECRETS" | grep -q "^$secret"; then
    echo "✅ $secret"
  else
    echo "❌ $secret (MANQUANT)"
    ((MISSING_COUNT++))
  fi
done

echo ""
echo "📋 Variables GitHub requises (${#REQUIRED_VARS[@]}):"
echo "---------------------------------------------------"

# Récupérer les variables existantes
EXISTING_VARS=$(gh variable list -R "$REPO" 2>/dev/null || echo "")

MISSING_VARS_COUNT=0
for var in "${REQUIRED_VARS[@]}"; do
  if echo "$EXISTING_VARS" | grep -q "^$var"; then
    echo "✅ $var"
  else
    echo "❌ $var (MANQUANT)"
    ((MISSING_VARS_COUNT++))
  fi
done

echo ""
echo "================================================"
echo "📊 Résumé:"
echo "   Secrets manquants: $MISSING_COUNT / ${#REQUIRED_SECRETS[@]}"
echo "   Variables manquantes: $MISSING_VARS_COUNT / ${#REQUIRED_VARS[@]}"

if [ $MISSING_COUNT -eq 0 ] && [ $MISSING_VARS_COUNT -eq 0 ]; then
  echo ""
  echo "✅ Tous les secrets et variables sont configurés !"
  echo "   Vous pouvez procéder au déploiement."
  exit 0
else
  echo ""
  echo "⚠️  Des secrets/variables sont manquants."
  echo "   Configurez-les dans GitHub > Settings > Secrets and variables > Actions"
  echo "   Voir docs/CHECKLIST_SECRETS_GITHUB.md pour les détails."
  exit 1
fi
