# ============================================================
# start-expo.ps1 — Lance Expo avec l'IP Windows correcte
# Usage (depuis WSL Debian):
#   powershell.exe -File /mnt/d/itvision-1/mobile/start-expo.ps1 consumer
#   powershell.exe -File /mnt/d/itvision-1/mobile/start-expo.ps1 provider
#
# Ou directement dans PowerShell Windows:
#   .\mobile\start-expo.ps1 consumer
# ============================================================

param(
  [string]$App = "consumer",
  [string]$Mode = "web"   # web | android | ios
)

# Détecte l'IP LAN de la machine Windows
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet' -and $_.IPAddress -notlike '169.*' } |
       Select-Object -First 1).IPAddress

if (-not $ip) {
  $ip = "localhost"
  Write-Warning "IP LAN introuvable, utilisation de localhost"
}

Write-Host "✅ IP détectée : $ip" -ForegroundColor Green
Write-Host "📱 App : $App | Mode : $Mode`n" -ForegroundColor Cyan

$appPath = Join-Path $PSScriptRoot $App
Set-Location $appPath

# Définit l'IP pour le packager Expo ET l'API backend
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
$env:EXPO_PUBLIC_API_BASE_URL = "http://${ip}:3000"

Write-Host "EXPO_PUBLIC_API_BASE_URL = http://${ip}:3000`n" -ForegroundColor Yellow

if ($Mode -eq "web") {
  npx expo start --web -c
} elseif ($Mode -eq "android") {
  npx expo start --android
} else {
  npx expo start
}
