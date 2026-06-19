$f = 'd:\itvision-1\src\app\achats-groupes\[groupId]\page.tsx'
$lines = Get-Content -LiteralPath $f
$lines[300] = '      `🔥 *ACHAT GROUPÉ EN COURS !*\n\n` +'
$lines | Set-Content -LiteralPath $f -Encoding UTF8
Write-Output 'Fixed line 301'
