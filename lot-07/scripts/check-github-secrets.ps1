# Script PowerShell to check GitHub secrets
# Usage: .\scripts\check-github-secrets.ps1 -OwnerRepo "zatouu/itvision"

param(
    [Parameter(Mandatory=$true)]
    [string]$OwnerRepo
)

$ErrorActionPreference = "Stop"

Write-Host "Checking GitHub secrets for $OwnerRepo" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: GitHub CLI (gh) is not installed." -ForegroundColor Red
    Write-Host "   Install it from: https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# Check authentication
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Not authenticated with GitHub CLI." -ForegroundColor Red
    Write-Host "   Run: gh auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: GitHub CLI installed and authenticated" -ForegroundColor Green
Write-Host ""

# Required secrets list
$requiredSecrets = @(
    "SSH_HOST",
    "SSH_USER",
    "SSH_KEY",
    "MONGO_ROOT_PASSWORD",
    "MONGO_APP_PASSWORD",
    "NEXTAUTH_SECRET",
    "JWT_SECRET",
    "CRON_SECRET",
    "NEXT_PUBLIC_SITE_URL",
    "REDIS_URL",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "SMTP_SECURE",
    "SMS_PROVIDER",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
    "ALLOW_TEST_CODES",
    "OTP_TEST_PHONES",
    "PAYMENTS_MOCK",
    "PAYDUNYA_MASTER_KEY",
    "PAYDUNYA_PRIVATE_KEY",
    "PAYDUNYA_TOKEN",
    "PAYDUNYA_MODE",
    "PAYDUNYA_STORE_NAME",
    "WAVE_MERCHANT_PHONE",
    "WAVE_QR_URL",
    "WAVE_PAY_URL",
    "OPENAI_API_KEY",
    "QWEN_CLOUD_API_KEY",
    "QWEN_CLOUD_BASE_URL",
    "QWEN_MODEL",
    "APIFY_TOKEN",
    "ADMIN_EMAIL",
    "MAINTENANCE_CRON_DISABLED",
    "SENTRY_DSN",
    "DEEPSEEK_API_KEY",
    "ALIEXPRESS_RAPIDAPI_KEY"
)

# Required variables list
$requiredVars = @(
    "NEXT_PUBLIC_SENTRY_DSN",
    "DEEPSEEK_MODEL",
    "LLM_TEXT_PROVIDER",
    "AGENT_WORKER_ENABLED"
)

Write-Host "Required GitHub secrets ($($requiredSecrets.Count)):" -ForegroundColor Cyan
Write-Host "----------------------------------------------" -ForegroundColor Cyan

# Get existing secrets
$existingSecrets = gh secret list -R $OwnerRepo 2>&1
$missingCount = 0

foreach ($secret in $requiredSecrets) {
    if ($existingSecrets -match "^$secret") {
        Write-Host "[OK] $secret" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $secret" -ForegroundColor Red
        $missingCount++
    }
}

Write-Host ""
Write-Host "Required GitHub variables ($($requiredVars.Count)):" -ForegroundColor Cyan
Write-Host "---------------------------------------------------" -ForegroundColor Cyan

# Get existing variables
$existingVars = gh variable list -R $OwnerRepo 2>&1
$missingVarsCount = 0

foreach ($var in $requiredVars) {
    if ($existingVars -match "^$var") {
        Write-Host "[OK] $var" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $var" -ForegroundColor Red
        $missingVarsCount++
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   Missing secrets: $missingCount / $($requiredSecrets.Count)" -ForegroundColor $(if ($missingCount -eq 0) { "Green" } else { "Red" })
Write-Host "   Missing variables: $missingVarsCount / $($requiredVars.Count)" -ForegroundColor $(if ($missingVarsCount -eq 0) { "Green" } else { "Red" })

if ($missingCount -eq 0 -and $missingVarsCount -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS: All secrets and variables are configured!" -ForegroundColor Green
    Write-Host "   You can proceed with deployment." -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "WARNING: Some secrets/variables are missing." -ForegroundColor Yellow
    Write-Host "   Configure them in GitHub Settings" -ForegroundColor Yellow
    Write-Host "   See CHECKLIST_SECRETS_GITHUB.md for details." -ForegroundColor Yellow
    exit 1
}
