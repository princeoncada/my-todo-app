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

function Get-MarkdownSection {
    param([string]$Content, [string]$Heading)
    $pattern = "(?ms)^## " + [regex]::Escape($Heading) + "\s*\r?\n(?<body>.*?)(?=^---\s*$|^## |\z)"
    return [regex]::Match($Content, $pattern)
}

function Test-InProgressPhase {
    param([string]$Content, [string]$PhaseLabel)
    $section = Get-MarkdownSection $Content "In Progress"
    if (-not $section.Success) { return $false }
    $pattern = "(?m)^\s*-\s+" + [regex]::Escape($PhaseLabel) + "(\s|\(|-|$)"
    return $section.Groups["body"].Value -match $pattern
}

function Test-PlannedPhaseHeading {
    param([string]$Content, [string]$PhaseLabel)
    $pattern = "(?m)^###\s+" + [regex]::Escape($PhaseLabel) + "\s*$"
    return $Content -match $pattern
}

function Get-PlannedPhaseSection {
    param([string]$Content, [string]$PhaseLabel)
    $pattern = "(?ms)^###\s+" + [regex]::Escape($PhaseLabel) + "\s*\r?\n(?<body>.*?)(?=^###\s+|^---\s*$|^##\s+|\z)"
    return [regex]::Match($Content, $pattern)
}

function Test-CompletedPhase {
    param([string]$Content, [string]$PhaseLabel)
    $pattern = "(?m)^\s*-\s+~~" + [regex]::Escape($PhaseLabel) + "~~\s+\(stable\s+\d{4}-\d{2}-\d{2}\)"
    return $Content -match $pattern
}

function Get-FirstPlannedHeading {
    param([string]$Content)
    $section = Get-MarkdownSection $Content "Planned"
    if (-not $section.Success) { return "" }
    $match = [regex]::Match($section.Groups["body"].Value, "(?m)^###\s+(?<heading>.+?)\s*$")
    if ($match.Success) { return $match.Groups["heading"].Value }
    return ""
}

function Normalize-CodebaseGraph {
    param([string]$Path)
    $graph = Get-Content $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    $graph.generatedAt = "<normalized>"
    return ($graph | ConvertTo-Json -Depth 100)
}

Write-Host "`n=== Tidy Validation === $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -ForegroundColor Cyan

# STATE.json
if (Test-Path "STATE.json") {
    $state = Get-Content "STATE.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    Add-Result "STATE.json" $true "$($state.version) - $($state.phaseTitle)"
} else {
    Add-Result "STATE.json" $false "file missing"
}

# Version consistency gate - all five versioning locations must carry STATE.json's version verbatim
if (Test-Path "STATE.json") {
    $verState = Get-Content "STATE.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    $ver      = $verState.version
    $verErrors = @()

    $pkgVer = (Get-Content "package.json" -Raw -Encoding UTF8 | ConvertFrom-Json).version
    if ($pkgVer -ne $ver) { $verErrors += "package.json=$pkgVer" }

    $handoff = Get-Content "docs/AI_HANDOFF.md" -Raw -Encoding UTF8
    if ($handoff -notmatch ("<!-- Current Version: " + [regex]::Escape($ver) + " -->")) { $verErrors += "AI_HANDOFF.md comment" }

    $workflow = Get-Content "docs/WORKFLOW.md" -Raw -Encoding UTF8
    if ($workflow -notmatch ("<!-- Current Version: " + [regex]::Escape($ver) + " -->")) { $verErrors += "WORKFLOW.md comment" }

    $versioning = Get-Content "docs/VERSIONING.md" -Raw -Encoding UTF8
    if ($versioning -notmatch ("Current version:\*\*\s*" + [regex]::Escape($ver) + "(\s|$)")) { $verErrors += "VERSIONING.md current line" }

    $suffixAlpha = $ver -match "-alpha$"
    if ($suffixAlpha -and $verState.state -ne "alpha") { $verErrors += "state=$($verState.state) but version is -alpha" }
    if ((-not $suffixAlpha) -and $verState.state -ne "stable") { $verErrors += "state=$($verState.state) but version has no -alpha suffix" }

    if ($verErrors.Count -eq 0) {
        Add-Result "version consistency" $true "$ver across all five locations"
    } else {
        Add-Result "version consistency" $false ("mismatch: " + ($verErrors -join ", "))
    }
} else {
    Add-Result "version consistency" $false "STATE.json missing"
}

# Phase identity and roadmap drift gate
if (Test-Path "STATE.json") {
    $phaseState = Get-Content "STATE.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    $phaseLabel = "$($phaseState.phase) - $($phaseState.phaseTitle)"
    $nextPhase = $phaseState.nextPhase
    $phaseErrors = @()

    if (Test-Path "docs/VERSIONING.md") {
        $versioning = Get-Content "docs/VERSIONING.md" -Raw -Encoding UTF8
        if ($versioning -notmatch ("(?m)^-\s+\*\*Current phase:\*\*\s+" + [regex]::Escape($phaseLabel) + "\s*$")) {
            $phaseErrors += "docs/VERSIONING.md Current phase does not match STATE.json phase '$phaseLabel'"
        }
        if ($versioning -notmatch ("(?m)^-\s+\*\*Next phase:\*\*\s+" + [regex]::Escape($nextPhase) + "\s*$")) {
            $phaseErrors += "docs/VERSIONING.md Next phase does not match STATE.json nextPhase '$nextPhase'"
        }
    } else {
        $phaseErrors += "docs/VERSIONING.md missing"
    }

    if (Test-Path "docs/AI_HANDOFF.md") {
        $handoff = Get-Content "docs/AI_HANDOFF.md" -Raw -Encoding UTF8
        if ($handoff -notmatch ("(?m)^\*\*Current Phase\*\*:\s+" + [regex]::Escape($phaseLabel) + "\s*$")) {
            $phaseErrors += "docs/AI_HANDOFF.md Current Phase does not match STATE.json phase '$phaseLabel'"
        }
        if ($handoff -notmatch ("(?m)^\*\*Next\*\*:\s+" + [regex]::Escape($nextPhase) + "\s*$")) {
            $phaseErrors += "docs/AI_HANDOFF.md Next does not match STATE.json nextPhase '$nextPhase'"
        }
    } else {
        $phaseErrors += "docs/AI_HANDOFF.md missing"
    }

    if (Test-Path "docs/FUTURE_PLANS.md") {
        $futurePlans = Get-Content "docs/FUTURE_PLANS.md" -Raw -Encoding UTF8
        $inProgress = Test-InProgressPhase $futurePlans $phaseLabel
        $plannedHeading = Test-PlannedPhaseHeading $futurePlans $phaseLabel
        $plannedPhaseSection = Get-PlannedPhaseSection $futurePlans $phaseLabel
        $completed = Test-CompletedPhase $futurePlans $phaseLabel
        $firstPlannedHeading = Get-FirstPlannedHeading $futurePlans

        if ($phaseState.state -eq "alpha") {
            if (-not $inProgress) {
                $phaseErrors += "docs/FUTURE_PLANS.md In Progress is missing current alpha phase '$phaseLabel'"
            }
            if (-not $plannedHeading) {
                $phaseErrors += "docs/FUTURE_PLANS.md Planned is missing current alpha heading '### $phaseLabel'"
            } elseif ($plannedPhaseSection.Groups["body"].Value -notmatch "(?m)^-\s+\*\*Status:\*\*\s+In progress(\s|\(|$)") {
                $phaseErrors += "docs/FUTURE_PLANS.md Planned heading '### $phaseLabel' is missing Status: In progress"
            }
        } elseif ($phaseState.state -eq "stable") {
            if (-not $completed) {
                $phaseErrors += "docs/FUTURE_PLANS.md Completed is missing stable phase '$phaseLabel'"
            }
            if ($inProgress) {
                $phaseErrors += "docs/FUTURE_PLANS.md In Progress still contains stable phase '$phaseLabel'"
            }
            if ($plannedHeading) {
                $phaseErrors += "docs/FUTURE_PLANS.md Planned still contains stable heading '### $phaseLabel'"
            }
            if ($firstPlannedHeading -eq $phaseLabel) {
                $phaseErrors += "docs/FUTURE_PLANS.md first Planned heading is already-stable phase '$phaseLabel'"
            }
        } else {
            $phaseErrors += "STATE.json state '$($phaseState.state)' is not alpha or stable"
        }
    } else {
        $phaseErrors += "docs/FUTURE_PLANS.md missing"
    }

    if ($phaseErrors.Count -eq 0) {
        Add-Result "phase/roadmap consistency" $true "$phaseLabel"
    } else {
        Add-Result "phase/roadmap consistency" $false ($phaseErrors -join "; ")
    }
} else {
    Add-Result "phase/roadmap consistency" $false "STATE.json missing"
}

# Codebase graph freshness and structure
$graphErrors = @()
$requiredGraphFiles = @(
    "scripts/generate-codebase-graph.ps1",
    "scripts/generate_codebase_graph.py",
    "scripts/audit-codebase-graph.ps1",
    "scripts/audit_codebase_graph.py",
    ".graphifyignore",
    "docs/CODEBASE_GRAPH.md",
    "codebase-graph.json"
)

foreach ($requiredGraphFile in $requiredGraphFiles) {
    if (-not (Test-Path $requiredGraphFile)) {
        $graphErrors += "$requiredGraphFile missing"
    }
}

if (Test-Path "package.json") {
    try {
        $pkg = Get-Content "package.json" -Raw -Encoding UTF8 | ConvertFrom-Json
        if (-not $pkg.scripts.'graph:codebase') {
            $graphErrors += "package.json missing graph:codebase script"
        }
        if (-not $pkg.scripts.'graph:audit') {
            $graphErrors += "package.json missing graph:audit script"
        }
    } catch {
        $graphErrors += "package.json could not be parsed"
    }
} else {
    $graphErrors += "package.json missing"
}

$graph = $null
if (Test-Path "codebase-graph.json") {
    try {
        $graph = Get-Content "codebase-graph.json" -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        $graphErrors += "codebase-graph.json could not be parsed as JSON"
    }
}

if ($graph) {
    if ($graph.schemaVersion -ne "tidy-codebase-graph/v1") {
        $graphErrors += "codebase-graph.json schemaVersion is '$($graph.schemaVersion)'"
    }
    if (Test-Path "STATE.json") {
        try {
            $graphState = Get-Content "STATE.json" -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($graph.version -ne $graphState.version) {
                $graphErrors += "codebase-graph.json version '$($graph.version)' does not match STATE.json '$($graphState.version)'"
            }
        } catch {
            $graphErrors += "STATE.json could not be parsed for graph version check"
        }
    }

    $readFirst = @($graph.readFirst)
    if ($readFirst -notcontains "STATE.json") {
        $graphErrors += "codebase-graph.json readFirst missing STATE.json"
    }
    if ($readFirst -notcontains "codebase-graph.json") {
        $graphErrors += "codebase-graph.json readFirst missing codebase-graph.json"
    }

    $protectedNodeRoots = @(
        "app/generated/prisma",
        "node_modules",
        ".next",
        "graphify-out",
        "chroma-data"
    )
    $nodePaths = @($graph.nodes | ForEach-Object { $_.path })
    foreach ($protectedNodeRoot in $protectedNodeRoots) {
        $badNode = @($nodePaths | Where-Object { $_ -eq $protectedNodeRoot -or $_ -like "$protectedNodeRoot/*" })
        if ($badNode.Count -gt 0) {
            $graphErrors += "codebase-graph.json includes protected node path under $protectedNodeRoot"
        }
    }
}

if (
    (Test-Path "scripts/generate-codebase-graph.ps1") -and
    (Test-Path "scripts/generate_codebase_graph.py") -and
    (Test-Path "codebase-graph.json")
) {
    $tempGraph = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "tidy-codebase-graph-$([System.Guid]::NewGuid()).json")
    $oldGraphOutput = $env:TIDY_CODEBASE_GRAPH_OUTPUT
    try {
        $env:TIDY_CODEBASE_GRAPH_OUTPUT = $tempGraph
        $generatorOutput = & powershell -ExecutionPolicy Bypass -File "scripts/generate-codebase-graph.ps1" -FallbackOnly 2>&1
        if ($LASTEXITCODE -ne 0) {
            $graphErrors += "fallback graph generator failed: $($generatorOutput -join ' ')"
        } elseif (-not (Test-Path $tempGraph)) {
            $graphErrors += "fallback graph generator did not write temp output"
        } else {
            try {
                $currentGraph = Normalize-CodebaseGraph "codebase-graph.json"
                $freshGraph = Normalize-CodebaseGraph $tempGraph
                if ($currentGraph -ne $freshGraph) {
                    $graphErrors += "codebase-graph.json is stale; run npm run graph:codebase"
                }
            } catch {
                $graphErrors += "could not compare graph freshness: $($_.Exception.Message)"
            }
        }
    } finally {
        if ($null -eq $oldGraphOutput) {
            Remove-Item Env:TIDY_CODEBASE_GRAPH_OUTPUT -ErrorAction SilentlyContinue
        } else {
            $env:TIDY_CODEBASE_GRAPH_OUTPUT = $oldGraphOutput
        }
        Remove-Item $tempGraph -ErrorAction SilentlyContinue
    }
}

if (Test-Path "scripts/audit-codebase-graph.ps1") {
    $auditOutput = & powershell -ExecutionPolicy Bypass -File "scripts/audit-codebase-graph.ps1" 2>&1
    if ($LASTEXITCODE -ne 0) {
        $graphErrors += "codebase graph audit failed: $($auditOutput -join ' ')"
    }
} else {
    $graphErrors += "scripts/audit-codebase-graph.ps1 missing"
}

if ($graphErrors.Count -eq 0) {
    Add-Result "codebase graph" $true "fresh"
} else {
    Add-Result "codebase graph" $false ($graphErrors -join "; ")
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
