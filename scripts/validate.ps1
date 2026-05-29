# validate.ps1 - Tidy validation runner
#
# Captures output per step. Silent on pass, verbose on fail.
#
# Usage:
#   .\scripts\validate.ps1             # full run (typecheck, lint, unit, e2e)
#   .\scripts\validate.ps1 -SkipChroma # skip ChromaDB check
#   .\scripts\validate.ps1 -SkipE2E   # skip Playwright e2e

param(
    [switch]$SkipChroma,
    [switch]$SkipE2E
)

$ErrorActionPreference = "Continue"
$results = [System.Collections.Generic.List[PSCustomObject]]::new()

function Add-Result {
    param([string]$Label, [bool]$Passed, [string]$Detail = "")
    $results.Add([PSCustomObject]@{ Label = $Label; Passed = $Passed; Detail = $Detail })
}

function Run-Step {
    param([string]$Label, [string[]]$Cmd, [string]$SummaryPattern = "")
    $tmpFile = [System.IO.Path]::GetTempFileName()
    $passed  = $false
    $detail  = ""
    try {
        & $Cmd[0] $Cmd[1..($Cmd.Length - 1)] 2>&1 | Out-File $tmpFile -Encoding UTF8
        $passed = $LASTEXITCODE -eq 0
        $out    = Get-Content $tmpFile -Encoding UTF8
        if ($SummaryPattern -and $passed -and $out) {
            $clean = $out | ForEach-Object { $_ -replace '\x1b\[[0-9;]*[mGKHF]', '' }
            $match = @($clean | Where-Object { $_ -match $SummaryPattern })[0]
            if ($match) { $detail = ($match -replace '\s+', ' ').Trim() }
        }
        if (-not $passed) {
            Write-Host "`n--- $Label output ---" -ForegroundColor Red
            $out | ForEach-Object { Write-Host $_ }
        }
    } finally {
        Remove-Item $tmpFile -ErrorAction SilentlyContinue
    }
    Add-Result $Label $passed $detail
}

Write-Host "`n=== Tidy Validation === $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan

# STATE.json
if (Test-Path "STATE.json") {
    $state = Get-Content "STATE.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    Add-Result "STATE.json" $true "$($state.version) - $($state.phaseTitle)"
} else {
    Add-Result "STATE.json" $false "file missing"
}

# ChromaDB
if (-not $SkipChroma) {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:8000/api/v2/heartbeat" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Add-Result "ChromaDB" $true "running"
    } catch {
        Add-Result "ChromaDB" $true "not running, skipped"
    }
}

# Typecheck
Run-Step "typecheck" @("npm", "run", "typecheck")

# Lint
Run-Step "lint" @("npm", "run", "lint")

# Mojibake scan
$mojiFiles = @(Get-ChildItem "docs/*.md" -File) + @(Get-Item "AGENTS.md")
$mojiCount = 0
$mojiLines = @()
foreach ($f in $mojiFiles) {
    $hits = Select-String -Path $f.FullName -Pattern "[^\x00-\x7F]"
    if ($hits) {
        $mojiCount += $hits.Count
        $mojiLines += $hits | ForEach-Object { "  $($f.Name):$($_.LineNumber)" }
    }
}
if ($mojiCount -gt 0) {
    Write-Host "`n--- mojibake scan output ---" -ForegroundColor Red
    $mojiLines | ForEach-Object { Write-Host $_ }
    Add-Result "mojibake scan" $false "$mojiCount occurrence(s) - run .\scripts\fix-mojibake.ps1"
} else {
    Add-Result "mojibake scan" $true "clean"
}

# Unit tests
Run-Step "unit tests" @("npm", "run", "test") "Tests\s+\d+ passed"

# E2E
if (-not $SkipE2E) {
    Run-Step "e2e" @("npm", "run", "test:e2e", "--", "--reporter=dot") "\d+ passed"
}

# Summary
Write-Host ""
$passCount = ($results | Where-Object { $_.Passed }).Count
$failCount  = ($results | Where-Object { -not $_.Passed }).Count

foreach ($r in $results) {
    $icon   = if ($r.Passed) { "PASS" } else { "FAIL" }
    $color  = if ($r.Passed) { "Green" } else { "Red" }
    $detail = if ($r.Detail) { "  $($r.Detail)" } else { "" }
    Write-Host "  [$icon] $($r.Label)$detail" -ForegroundColor $color
}

Write-Host ""
if ($failCount -gt 0) {
    Write-Host "$passCount passed, $failCount FAILED - fix before promoting." -ForegroundColor Red
    exit 1
} else {
    Write-Host "$passCount passed - ready for promote.ps1." -ForegroundColor Green
    exit 0
}
