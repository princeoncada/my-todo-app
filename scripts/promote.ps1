# promote.ps1 - Tidy version promotion script
#
# Strips -alpha from the current STATE.json version and marks all five
# versioning locations as stable.
#
# Usage:
#   .\scripts\promote.ps1                     # auto-detects version from STATE.json
#   .\scripts\promote.ps1 -Version "1.0.0"    # override target stable version
#
# Five versioning locations updated:
#   1. STATE.json
#   2. docs/VERSIONING.md
#   3. docs/AI_HANDOFF.md
#   4. package.json
#   5. docs/WORKFLOW.md

param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

# Read STATE.json
if (-not (Test-Path "STATE.json")) {
    Write-Error "STATE.json not found. Run from the repo root."
    exit 1
}

$stateRaw  = Get-Content "STATE.json" -Raw
$state     = $stateRaw | ConvertFrom-Json
$alphaVer  = $state.version

# Determine stable version
if ($Version -ne "") {
    $stableVer = $Version
} else {
    $stableVer = $alphaVer -replace "-alpha$", "" -replace "-beta$", ""
}

if ($stableVer -eq $alphaVer) {
    Write-Host "Version $alphaVer is already stable - nothing to promote." -ForegroundColor Yellow
    exit 0
}

Write-Host "Promoting $alphaVer -> $stableVer" -ForegroundColor Cyan
$today = Get-Date -Format "yyyy-MM-dd"

# UTF-8 without BOM encoder (BOM breaks JSON parsers for package.json / STATE.json)
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

# Helper: string-replace in a text file
function Update-FileText {
    param([string]$Path, [string]$OldStr, [string]$NewStr)
    if (-not (Test-Path $Path)) {
        Write-Warning "File not found, skipping: $Path"
        return
    }
    $content = Get-Content $Path -Raw
    if ($content.IndexOf($OldStr) -lt 0) {
        Write-Warning "Pattern not found in $Path - manual update may be needed: '$OldStr'"
        return
    }
    $updated = $content.Replace($OldStr, $NewStr)
    [System.IO.File]::WriteAllText((Resolve-Path $Path).Path, $updated, $utf8NoBom)
    Write-Host "  Updated: $Path" -ForegroundColor Green
}

# 1. STATE.json
$state.version     = $stableVer
$state.state       = "stable"
$state.lastUpdated = $today
$stateJson = $state | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText(
    (Resolve-Path "STATE.json").Path,
    $stateJson,
    $utf8NoBom
)
Write-Host "  Updated: STATE.json" -ForegroundColor Green

# 2. docs/VERSIONING.md
$baseVer = $stableVer
Update-FileText "docs/VERSIONING.md" "| $baseVer | alpha |" "| $baseVer | stable |"

# 3. docs/AI_HANDOFF.md
Update-FileText "docs/AI_HANDOFF.md" `
    "<!-- Current Version: $alphaVer -->" `
    "<!-- Current Version: $stableVer -->"

# 4. package.json
$pkgPath    = Resolve-Path "package.json"
$pkgContent = Get-Content $pkgPath -Raw
$pkgUpdated = [System.Text.RegularExpressions.Regex]::Replace(
    $pkgContent,
    '"version":\s*"[^"]*"',
    "`"version`": `"$stableVer`""
)
[System.IO.File]::WriteAllText($pkgPath.Path, $pkgUpdated, $utf8NoBom)
Write-Host "  Updated: package.json" -ForegroundColor Green

# 5. docs/WORKFLOW.md
Update-FileText "docs/WORKFLOW.md" `
    "<!-- Current Version: $alphaVer -->" `
    "<!-- Current Version: $stableVer -->"

# Done
Write-Host ""
Write-Host "Promotion complete: $alphaVer -> $stableVer" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  git add STATE.json docs/VERSIONING.md docs/AI_HANDOFF.md package.json docs/WORKFLOW.md"
Write-Host "  git commit -m `"chore(release): promote $alphaVer to $stableVer`""
Write-Host "  git push origin [branch]"
