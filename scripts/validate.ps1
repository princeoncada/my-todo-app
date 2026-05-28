# validate.ps1 - Tidy validation script
#
# Runs: STATE.json check, optional ChromaDB ingest, TypeScript, ESLint, Vitest.
# E2E tests require a running dev server -- run `npm run test:e2e` separately.
#
# Usage:
#   .\scripts\validate.ps1              # full run
#   .\scripts\validate.ps1 -SkipChroma # skip ChromaDB step
#   .\scripts\validate.ps1 -SkipTests  # state + chroma check only

param(
    [switch]$SkipChroma,
    [switch]$SkipTests
)

$ErrorActionPreference = "Continue"
$results = [System.Collections.Generic.List[PSCustomObject]]::new()

function Add-Result {
    param([string]$Label, [bool]$Passed, [string]$Detail = "")
    $results.Add([PSCustomObject]@{ Label = $Label; Passed = $Passed; Detail = $Detail })
}

Write-Host "`n=== Tidy Validation ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

# STATE.json
Write-Host "`n--- Project State ---"
if (Test-Path "STATE.json") {
    $state = Get-Content "STATE.json" -Raw | ConvertFrom-Json
    Write-Host "Version  : $($state.version)"
    Write-Host "Phase    : $($state.phaseTitle)"
    Write-Host "Next     : $($state.nextPhase)"
    Add-Result "STATE.json" $true
} else {
    Write-Host "WARNING: STATE.json not found" -ForegroundColor Red
    Add-Result "STATE.json" $false "file missing"
}

# ChromaDB (optional)
if (-not $SkipChroma) {
    Write-Host "`n--- ChromaDB ---"
    $chromaUp = $false
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:8000/api/v2/heartbeat" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        $chromaUp = $true
        Write-Host "ChromaDB: running" -ForegroundColor Green
        Add-Result "ChromaDB health" $true
    } catch {
        Write-Host "ChromaDB: not running - skipping ingest (run 'npm run chroma' to enable)" -ForegroundColor DarkYellow
        Add-Result "ChromaDB health" $true "not running, skipped"
    }

    if ($chromaUp) {
        Write-Host "Ingesting docs into tidy_docs..."
        python scripts/ingest_docs.py
        $ingestExit = $LASTEXITCODE
        Add-Result "ChromaDB ingest" ($ingestExit -eq 0) "exit $ingestExit"
    }
}

# TypeScript
if (-not $SkipTests) {
    Write-Host "`n--- TypeScript ---"
    npm run typecheck
    $tsExit = $LASTEXITCODE
    Add-Result "TypeScript" ($tsExit -eq 0) "exit $tsExit"

    # ESLint
    Write-Host "`n--- ESLint ---"
    npm run lint
    $lintExit = $LASTEXITCODE
    Add-Result "ESLint" ($lintExit -eq 0) "exit $lintExit"

    # Vitest
    Write-Host "`n--- Unit Tests (Vitest) ---"
    npm run test
    $testExit = $LASTEXITCODE
    Add-Result "Unit tests" ($testExit -eq 0) "exit $testExit"
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.Passed }).Count
$failed = ($results | Where-Object { -not $_.Passed }).Count

foreach ($r in $results) {
    $icon  = if ($r.Passed) { "PASS" } else { "FAIL" }
    $color = if ($r.Passed) { "Green" } else { "Red" }
    $detail = if ($r.Detail) { "  ($($r.Detail))" } else { "" }
    Write-Host "  [$icon] $($r.Label)$detail" -ForegroundColor $color
}

Write-Host ""
if ($failed -gt 0) {
    Write-Host "$passed passed, $failed failed - fix failures before promoting." -ForegroundColor Red
    exit 1
} else {
    Write-Host "$passed passed - ready for promote.ps1." -ForegroundColor Green
}
