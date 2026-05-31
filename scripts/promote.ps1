# promote.ps1 - Tidy version promotion script
#
# Strips -alpha from the current STATE.json version, marks all five
# versioning locations as stable, closes the promoted roadmap item in
# docs/FUTURE_PLANS.md, and refreshes codebase-graph.json when graph tooling
# exists. FUTURE_PLANS.md is roadmap state, not a sixth versioning location.
# codebase-graph.json is a generated artifact, not a sixth versioning location.
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
#
# Roadmap closeout:
#   docs/FUTURE_PLANS.md
#
# Generated artifacts:
#   codebase-graph.json

param(
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

# Read STATE.json
if (-not (Test-Path "STATE.json")) {
    Write-Error "STATE.json not found. Run from the repo root."
    exit 1
}

$stateRaw  = Get-Content "STATE.json" -Raw -Encoding UTF8
$state     = $stateRaw | ConvertFrom-Json
$alphaVer  = $state.version
$phaseTitle = $state.phaseTitle

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
$futurePlansChanged = $false
$graphChanged = $false

# UTF-8 without BOM encoder (BOM breaks JSON parsers for package.json / STATE.json)
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

# Helper: string-replace in a text file
function Update-FileText {
    param([string]$Path, [string]$OldStr, [string]$NewStr)
    if (-not (Test-Path $Path)) {
        Write-Warning "File not found, skipping: $Path"
        return
    }
    $content = Get-Content $Path -Raw -Encoding UTF8
    if ($content.IndexOf($OldStr) -lt 0) {
        Write-Warning "Pattern not found in $Path - manual update may be needed: '$OldStr'"
        return
    }
    $updated = $content.Replace($OldStr, $NewStr)
    [System.IO.File]::WriteAllText((Resolve-Path $Path).Path, $updated, $utf8NoBom)
    Write-Host "  Updated: $Path" -ForegroundColor Green
}

function Get-MatchedSection {
    param([string]$Content, [string]$Heading)
    $pattern = "(?ms)^## " + [regex]::Escape($Heading) + "\s*\r?\n(?<body>.*?)(?=^---\s*$|^## |\z)"
    return [regex]::Match($Content, $pattern)
}

function Test-InProgressPhase {
    param([string]$Content, [string]$Version, [string]$Title)
    $section = Get-MatchedSection $Content "In Progress"
    if (-not $section.Success) { return $false }
    $pattern = "(?m)^\s*-\s+" + [regex]::Escape($Version) + "\s+-\s+" + [regex]::Escape($Title) + "(\s|\(|-|$)"
    return $section.Groups["body"].Value -match $pattern
}

function Test-PlannedHeading {
    param([string]$Content, [string]$Version, [string]$Title)
    $pattern = "(?m)^###\s+" + [regex]::Escape($Version) + "\s+-\s+" + [regex]::Escape($Title) + "\s*$"
    return $Content -match $pattern
}

function Test-CompletedPhase {
    param([string]$Content, [string]$Bullet)
    return $Content.Contains($Bullet)
}

function Get-FirstPlannedHeading {
    param([string]$Content)
    $section = Get-MatchedSection $Content "Planned"
    if (-not $section.Success) { return "" }
    $match = [regex]::Match($section.Groups["body"].Value, "(?m)^###\s+(?<heading>.+?)\s*$")
    if ($match.Success) { return $match.Groups["heading"].Value }
    return ""
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
Update-FileText "docs/VERSIONING.md" "**Current version:** $alphaVer" "**Current version:** $stableVer"

# 3. docs/AI_HANDOFF.md
Update-FileText "docs/AI_HANDOFF.md" `
    "<!-- Current Version: $alphaVer -->" `
    "<!-- Current Version: $stableVer -->"
Update-FileText "docs/AI_HANDOFF.md" `
    "**Current Version**: $alphaVer" `
    "**Current Version**: $stableVer"

# 4. package.json
$pkgPath    = Resolve-Path "package.json"
$pkgContent = Get-Content $pkgPath -Raw -Encoding UTF8
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

# Roadmap closeout: docs/FUTURE_PLANS.md is not a versioning location
$futurePlansPath = "docs/FUTURE_PLANS.md"
if (-not (Test-Path $futurePlansPath)) {
    Write-Error "$futurePlansPath not found. Cannot close promoted roadmap item."
    exit 1
}

$futurePlansBefore = Get-Content $futurePlansPath -Raw -Encoding UTF8
$completedBullet = "- ~~$stableVer - $phaseTitle~~ (stable $today)"
$alreadyClosed = (
    (Test-CompletedPhase $futurePlansBefore $completedBullet) -and
    (-not (Test-InProgressPhase $futurePlansBefore $stableVer $phaseTitle)) -and
    (-not (Test-PlannedHeading $futurePlansBefore $stableVer $phaseTitle))
)
$hadPlannedHeading = Test-PlannedHeading $futurePlansBefore $stableVer $phaseTitle

if ((-not $hadPlannedHeading) -and (-not $alreadyClosed)) {
    Write-Error "$futurePlansPath does not contain expected Planned heading '### $stableVer - $phaseTitle' and is not already closed out."
    exit 1
}

$futurePlansUpdated = $futurePlansBefore

if (-not (Test-CompletedPhase $futurePlansUpdated $completedBullet)) {
    $completedSection = Get-MatchedSection $futurePlansUpdated "Completed"
    if (-not $completedSection.Success) {
        Write-Error "$futurePlansPath is missing the Completed section."
        exit 1
    }
    $completedBody = $completedSection.Groups["body"].Value
    $preVersioningIndex = $completedBody.IndexOf("Pre-versioning")
    if ($preVersioningIndex -ge 0) {
        $insertAt = $completedSection.Groups["body"].Index + $preVersioningIndex
    } else {
        $insertAt = $completedSection.Index + $completedSection.Length
    }
    $futurePlansUpdated = $futurePlansUpdated.Insert($insertAt, "$completedBullet`n`n")
}

$inProgressSection = Get-MatchedSection $futurePlansUpdated "In Progress"
if ($inProgressSection.Success) {
    $phaseLinePattern = "(?m)^\s*-\s+" + [regex]::Escape($stableVer) + "\s+-\s+" + [regex]::Escape($phaseTitle) + ".*(?:\r?\n)?"
    $newBody = [regex]::Replace($inProgressSection.Groups["body"].Value, $phaseLinePattern, "")
    if ($newBody -ne $inProgressSection.Groups["body"].Value) {
        $futurePlansUpdated = $futurePlansUpdated.Substring(0, $inProgressSection.Groups["body"].Index) +
            $newBody +
            $futurePlansUpdated.Substring($inProgressSection.Groups["body"].Index + $inProgressSection.Groups["body"].Length)
    }
}

$plannedSectionPattern = "(?ms)^###\s+" + [regex]::Escape($stableVer) + "\s+-\s+" + [regex]::Escape($phaseTitle) + "\s*\r?\n.*?(?=^###\s+|^---\s*$|^##\s+|\z)"
$futurePlansUpdated = [regex]::Replace($futurePlansUpdated, $plannedSectionPattern, "", 1)
$futurePlansUpdated = [regex]::Replace($futurePlansUpdated, "(?m)\n{3,}(?=### )", "`n`n")

if ($futurePlansUpdated -ne $futurePlansBefore) {
    [System.IO.File]::WriteAllText((Resolve-Path $futurePlansPath).Path, $futurePlansUpdated, $utf8NoBom)
    $futurePlansChanged = $true
    Write-Host "  Updated: $futurePlansPath (roadmap closeout)" -ForegroundColor Green
} else {
    Write-Host "  Roadmap already closed: $futurePlansPath" -ForegroundColor Yellow
}

if (-not $state.seriesComplete -and -not [string]::IsNullOrWhiteSpace($state.nextPhase)) {
    $firstPlannedHeading = Get-FirstPlannedHeading $futurePlansUpdated
    if ($firstPlannedHeading -ne $state.nextPhase) {
        Write-Error "Post-promotion roadmap drift: first FUTURE_PLANS Planned heading '$firstPlannedHeading' does not match STATE.json nextPhase '$($state.nextPhase)'."
        exit 1
    }
}

# Generated graph refresh: not a versioning location, but embedded version must
# match the promoted STATE.json version.
$graphPath = "codebase-graph.json"
$graphWrapperPath = "scripts/generate-codebase-graph.ps1"
$graphGeneratorPath = "scripts/generate_codebase_graph.py"
$graphToolingExists = (Test-Path $graphWrapperPath) -and (Test-Path $graphGeneratorPath)
$graphBefore = $null

if (Test-Path $graphPath) {
    $graphBefore = Get-Content $graphPath -Raw -Encoding UTF8
}

if ($graphToolingExists) {
    $graphOutput = & powershell -ExecutionPolicy Bypass -File $graphWrapperPath -FallbackOnly 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n--- codebase graph refresh output ---" -ForegroundColor Red
        $graphOutput | ForEach-Object { Write-Host $_ }
        Write-Error "codebase graph refresh failed during promotion"
        exit 1
    }

    if (-not (Test-Path $graphPath)) {
        Write-Error "$graphPath missing after graph refresh"
        exit 1
    }

    try {
        $postPromoteGraph = Get-Content $graphPath -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        Write-Error "$graphPath could not be parsed after graph refresh: $($_.Exception.Message)"
        exit 1
    }

    if ($postPromoteGraph.schemaVersion -ne "tidy-codebase-graph/v1") {
        Write-Error "$graphPath schemaVersion '$($postPromoteGraph.schemaVersion)' does not match tidy-codebase-graph/v1"
        exit 1
    }
    if ($postPromoteGraph.version -ne $stableVer) {
        Write-Error "$graphPath version '$($postPromoteGraph.version)' does not match promoted version '$stableVer'"
        exit 1
    }

    $graphAfter = Get-Content $graphPath -Raw -Encoding UTF8
    $graphChanged = $graphBefore -ne $graphAfter
    if ($graphChanged) {
        Write-Host "  Updated: $graphPath (graph refresh)" -ForegroundColor Green
    } else {
        Write-Host "  Graph already fresh: $graphPath" -ForegroundColor Yellow
    }
} elseif (Test-Path $graphPath) {
    Write-Error "Graph artifact exists but graph tooling is missing. Expected $graphWrapperPath and $graphGeneratorPath."
    exit 1
}

# Self-verify: every versioning location must now carry the stable version
$verifyErrors = @()
$postState = Get-Content "STATE.json" -Raw -Encoding UTF8 | ConvertFrom-Json
if ($postState.version -ne $stableVer) { $verifyErrors += "STATE.json=$($postState.version)" }
if ($postState.state -ne "stable")     { $verifyErrors += "STATE.json state=$($postState.state)" }
$postPkg = (Get-Content "package.json" -Raw -Encoding UTF8 | ConvertFrom-Json).version
if ($postPkg -ne $stableVer) { $verifyErrors += "package.json=$postPkg" }
$postHandoff = Get-Content "docs/AI_HANDOFF.md" -Raw -Encoding UTF8
if ($postHandoff -notmatch ("<!-- Current Version: " + [regex]::Escape($stableVer) + " -->")) { $verifyErrors += "AI_HANDOFF.md comment" }
$postWorkflow = Get-Content "docs/WORKFLOW.md" -Raw -Encoding UTF8
if ($postWorkflow -notmatch ("<!-- Current Version: " + [regex]::Escape($stableVer) + " -->")) { $verifyErrors += "WORKFLOW.md comment" }
$postVersioning = Get-Content "docs/VERSIONING.md" -Raw -Encoding UTF8
if ($postVersioning -notmatch ("Current version:\*\*\s*" + [regex]::Escape($stableVer) + "(\s|$)")) { $verifyErrors += "VERSIONING.md current line" }
if ($postVersioning -notmatch ("\|\s*" + [regex]::Escape($stableVer) + "\s*\|\s*stable\s*\|")) { $verifyErrors += "VERSIONING.md history row" }
$postFuturePlans = Get-Content "docs/FUTURE_PLANS.md" -Raw -Encoding UTF8
if (-not (Test-CompletedPhase $postFuturePlans $completedBullet)) { $verifyErrors += "FUTURE_PLANS.md completed closeout" }
if (Test-InProgressPhase $postFuturePlans $stableVer $phaseTitle) { $verifyErrors += "FUTURE_PLANS.md still in progress" }
if (Test-PlannedHeading $postFuturePlans $stableVer $phaseTitle) { $verifyErrors += "FUTURE_PLANS.md still planned" }
if (Test-Path "codebase-graph.json") {
    try {
        $postGraph = Get-Content "codebase-graph.json" -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($postGraph.schemaVersion -ne "tidy-codebase-graph/v1") {
            $verifyErrors += "codebase-graph.json schemaVersion=$($postGraph.schemaVersion)"
        }
        if ($postGraph.version -ne $stableVer) {
            $verifyErrors += "codebase-graph.json=$($postGraph.version)"
        }
    } catch {
        $verifyErrors += "codebase-graph.json parse error"
    }
} else {
    $verifyErrors += "codebase-graph.json missing"
}
if ($verifyErrors.Count -gt 0) {
    Write-Error ("Promote self-verify FAILED - locations inconsistent: " + ($verifyErrors -join ", "))
    exit 1
}
Write-Host "  Self-verify: all five locations at $stableVer, roadmap closeout complete, graph artifact verified" -ForegroundColor Green

# Done
Write-Host ""
Write-Host "Promotion complete: $alphaVer -> $stableVer (graph refreshed)" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps (one commit per file, per commit discipline):"
Write-Host "  .\scripts\commit.ps1 -Files `"STATE.json`"         -Message `"chore(release): promote $alphaVer to $stableVer-stable`""
Write-Host "  .\scripts\commit.ps1 -Files `"docs/VERSIONING.md`" -Message `"chore(release): promote $alphaVer to $stableVer-stable`""
Write-Host "  .\scripts\commit.ps1 -Files `"docs/AI_HANDOFF.md`" -Message `"chore(release): promote $alphaVer to $stableVer-stable`""
Write-Host "  .\scripts\commit.ps1 -Files `"package.json`"       -Message `"chore(release): promote $alphaVer to $stableVer-stable`""
Write-Host "  .\scripts\commit.ps1 -Files `"docs/WORKFLOW.md`"   -Message `"chore(release): promote $alphaVer to $stableVer-stable`""
if ($futurePlansChanged) {
    Write-Host "  .\scripts\commit.ps1 -Files `"docs/FUTURE_PLANS.md`" -Message `"chore(release): close $stableVer roadmap item`""
}
if ($graphChanged) {
    Write-Host "  .\scripts\commit.ps1 -Files `"codebase-graph.json`" -Message `"chore(graph): refresh graph for $stableVer-stable`""
}
Write-Host "  git push origin master"
