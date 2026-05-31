# open-phase.ps1 - Tidy alpha phase opener
#
# Opens a new alpha phase from a stable release, or repairs a broken alpha
# whose versioning locations are missing the -alpha suffix.
#
# Usage:
#   .\scripts\open-phase.ps1 -Version "1.2.2" -PhaseTitle "Chroma Visibility Fix"
#   .\scripts\open-phase.ps1 -Version "1.2.2" -PhaseTitle "Chroma Visibility Fix" -Repair
#
# Five versioning locations updated:
#   1. STATE.json
#   2. docs/VERSIONING.md
#   3. docs/AI_HANDOFF.md
#   4. package.json
#   5. docs/WORKFLOW.md
#
# Roadmap state:
#   docs/FUTURE_PLANS.md
#
# Generated artifacts:
#   codebase-graph.json

param(
    [string]$Version = "",
    [string]$PhaseTitle = "",
    [string]$NextPhase = "",
    [switch]$Repair
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Version)) {
    Write-Error "-Version is required and must be a bare version number without -alpha."
    exit 1
}

if ([string]::IsNullOrWhiteSpace($PhaseTitle)) {
    Write-Error "-PhaseTitle is required."
    exit 1
}

if ($Version -match "-alpha$") {
    Write-Error "-Version must not include -alpha. Received '$Version'."
    exit 1
}

if (-not (Test-Path "STATE.json")) {
    Write-Error "STATE.json not found. Run from the repo root."
    exit 1
}

$stateRaw = Get-Content "STATE.json" -Raw -Encoding UTF8
$state = $stateRaw | ConvertFrom-Json
$currentVer = $state.version
$currentState = $state.state
$currentPhaseLabel = "$($state.phase) - $($state.phaseTitle)"
$currentNextPhase = $state.nextPhase
$alphaVer = "$Version-alpha"

if ($Repair) {
    if ($currentState -ne "alpha") {
        Write-Error "Repair mode requires state=alpha. Current state is '$currentState'."
        exit 1
    }
} elseif ($currentState -ne "stable") {
    Write-Error "Current state is '$currentState', not stable. Use -Repair to fix a broken alpha."
    exit 1
}

$nextPhaseValue = if ([string]::IsNullOrWhiteSpace($NextPhase)) { $currentNextPhase } else { $NextPhase }
$today = Get-Date -Format "yyyy-MM-dd"
$futurePlansChanged = $false
$graphChanged = $false

Write-Host "Opening alpha phase: $alphaVer - $PhaseTitle" -ForegroundColor Cyan

# UTF-8 without BOM encoder (BOM breaks JSON parsers for package.json / STATE.json)
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

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

# 1. STATE.json
$state.version = $alphaVer
$state.state = "alpha"
$state.phase = $Version
$state.phaseTitle = $PhaseTitle
$state.lastUpdated = $today
$state.nextPhase = $nextPhaseValue
$stateJson = $state | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText(
    (Resolve-Path "STATE.json").Path,
    $stateJson,
    $utf8NoBom
)
Write-Host "  Updated: STATE.json" -ForegroundColor Green

# 2. package.json
$pkgPath = Resolve-Path "package.json"
$pkgContent = Get-Content $pkgPath -Raw -Encoding UTF8
$pkgUpdated = [System.Text.RegularExpressions.Regex]::Replace(
    $pkgContent,
    '"version":\s*"[^"]*"',
    "`"version`": `"$alphaVer`""
)
[System.IO.File]::WriteAllText($pkgPath.Path, $pkgUpdated, $utf8NoBom)
Write-Host "  Updated: package.json" -ForegroundColor Green

# 3. docs/AI_HANDOFF.md
Update-FileText "docs/AI_HANDOFF.md" `
    "<!-- Current Version: $currentVer -->" `
    "<!-- Current Version: $alphaVer -->"
Update-FileText "docs/AI_HANDOFF.md" `
    "**Current Version**: $currentVer" `
    "**Current Version**: $alphaVer"
Update-FileText "docs/AI_HANDOFF.md" `
    "**Current Phase**: $currentPhaseLabel" `
    "**Current Phase**: $Version - $PhaseTitle"
Update-FileText "docs/AI_HANDOFF.md" `
    "**Next**: $currentNextPhase" `
    "**Next**: $nextPhaseValue"

# 4. docs/WORKFLOW.md
Update-FileText "docs/WORKFLOW.md" `
    "<!-- Current Version: $currentVer -->" `
    "<!-- Current Version: $alphaVer -->"

# 5. docs/VERSIONING.md
Update-FileText "docs/VERSIONING.md" `
    "**Current version:** $currentVer" `
    "**Current version:** $alphaVer"
Update-FileText "docs/VERSIONING.md" `
    "**Current phase:** $currentPhaseLabel" `
    "**Current phase:** $Version - $PhaseTitle"
if ($nextPhaseValue -ne $currentNextPhase) {
    Update-FileText "docs/VERSIONING.md" `
        "**Next phase:** $currentNextPhase" `
        "**Next phase:** $nextPhaseValue"
}

$versioningPath = Resolve-Path "docs/VERSIONING.md"
$versioningContent = Get-Content $versioningPath -Raw -Encoding UTF8
$historyRowPattern = "\|\s*" + [regex]::Escape($Version) + "\s*\|\s*alpha\s*\|"
if ((-not $Repair) -or ($versioningContent -notmatch $historyRowPattern)) {
    $newRow = "| $Version | alpha | $today | $PhaseTitle | (in progress) |"
    $historyHeadingIndex = $versioningContent.IndexOf("## Version History")
    if ($historyHeadingIndex -lt 0) {
        Write-Warning "Version History section not found in docs/VERSIONING.md; alpha row was not inserted."
    } else {
        $historyContent = $versioningContent.Substring($historyHeadingIndex)
        $separatorMatch = [regex]::Match($historyContent, "(?m)^\|[-| ]+\|\s*$")
        if ($separatorMatch.Success) {
            $insertAt = $historyHeadingIndex + $separatorMatch.Index + $separatorMatch.Length
        $versioningContent = $versioningContent.Insert($insertAt, "`n$newRow")
        [System.IO.File]::WriteAllText($versioningPath.Path, $versioningContent, $utf8NoBom)
        Write-Host "  Updated: docs/VERSIONING.md (history row)" -ForegroundColor Green
        } else {
            Write-Warning "Version history table separator not found in docs/VERSIONING.md; alpha row was not inserted."
        }
    }
}

# 6. docs/FUTURE_PLANS.md roadmap state
$futurePlansPath = "docs/FUTURE_PLANS.md"
if (Test-Path $futurePlansPath) {
    $futurePlans = Get-Content $futurePlansPath -Raw -Encoding UTF8
    $futurePlansUpdated = $futurePlans
    if (-not (Test-InProgressPhase $futurePlansUpdated $Version $PhaseTitle)) {
        $inProgressSection = Get-MatchedSection $futurePlansUpdated "In Progress"
        if ($inProgressSection.Success) {
            $insertAt = $inProgressSection.Groups["body"].Index
            $futurePlansUpdated = $futurePlansUpdated.Insert($insertAt, "- $Version - $PhaseTitle (active) - see Planned`n")
        } else {
            Write-Warning "$futurePlansPath is missing the In Progress section."
        }
    }
    if (-not (Test-PlannedHeading $futurePlansUpdated $Version $PhaseTitle)) {
        Write-Warning "$futurePlansPath is missing Planned heading '### $Version - $PhaseTitle'."
    }
    if ($futurePlansUpdated -ne $futurePlans) {
        [System.IO.File]::WriteAllText((Resolve-Path $futurePlansPath).Path, $futurePlansUpdated, $utf8NoBom)
        $futurePlansChanged = $true
        Write-Host "  Updated: $futurePlansPath (roadmap in-progress)" -ForegroundColor Green
    }
} else {
    Write-Warning "$futurePlansPath not found; roadmap in-progress state was not updated."
}

# 7. Generated graph refresh
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
        Write-Error "codebase graph refresh failed while opening alpha phase"
        exit 1
    }

    if (-not (Test-Path $graphPath)) {
        Write-Error "$graphPath missing after graph refresh"
        exit 1
    }

    try {
        $postGraph = Get-Content $graphPath -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        Write-Error "$graphPath could not be parsed after graph refresh: $($_.Exception.Message)"
        exit 1
    }

    if ($postGraph.schemaVersion -ne "tidy-codebase-graph/v1") {
        Write-Error "$graphPath schemaVersion '$($postGraph.schemaVersion)' does not match tidy-codebase-graph/v1"
        exit 1
    }
    if ($postGraph.version -ne $alphaVer) {
        Write-Error "$graphPath version '$($postGraph.version)' does not match opened version '$alphaVer'"
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

# 8. Self-verify
$verifyErrors = @()
$postState = Get-Content "STATE.json" -Raw -Encoding UTF8 | ConvertFrom-Json
if ($postState.version -ne $alphaVer) { $verifyErrors += "STATE.json=$($postState.version)" }
if ($postState.state -ne "alpha") { $verifyErrors += "STATE.json state=$($postState.state)" }
$postPkg = (Get-Content "package.json" -Raw -Encoding UTF8 | ConvertFrom-Json).version
if ($postPkg -ne $alphaVer) { $verifyErrors += "package.json=$postPkg" }
$postHandoff = Get-Content "docs/AI_HANDOFF.md" -Raw -Encoding UTF8
if ($postHandoff -notmatch ("<!-- Current Version: " + [regex]::Escape($alphaVer) + " -->")) { $verifyErrors += "AI_HANDOFF.md comment" }
$postWorkflow = Get-Content "docs/WORKFLOW.md" -Raw -Encoding UTF8
if ($postWorkflow -notmatch ("<!-- Current Version: " + [regex]::Escape($alphaVer) + " -->")) { $verifyErrors += "WORKFLOW.md comment" }
$postVersioning = Get-Content "docs/VERSIONING.md" -Raw -Encoding UTF8
if ($postVersioning -notmatch ("Current version:\*\*\s*" + [regex]::Escape($alphaVer) + "(\s|$)")) { $verifyErrors += "VERSIONING.md current line" }
if ($postVersioning -notmatch ("\|\s*" + [regex]::Escape($Version) + "\s*\|\s*alpha\s*\|")) { $verifyErrors += "VERSIONING.md history row" }
if ($verifyErrors.Count -gt 0) {
    Write-Error ("Open-phase self-verify FAILED - locations inconsistent: " + ($verifyErrors -join ", "))
    exit 1
}
Write-Host "  Self-verify: all five locations at $alphaVer, history row present, graph artifact verified" -ForegroundColor Green

Write-Host ""
Write-Host "Alpha phase open: $alphaVer - $PhaseTitle" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps (one commit per file, per commit discipline):"
Write-Host "  .\scripts\commit.ps1 -Files `"STATE.json`"              -Message `"chore(release): open $alphaVer`""
Write-Host "  .\scripts\commit.ps1 -Files `"docs/VERSIONING.md`"      -Message `"chore(release): open $alphaVer`""
Write-Host "  .\scripts\commit.ps1 -Files `"docs/AI_HANDOFF.md`"      -Message `"chore(release): open $alphaVer`""
Write-Host "  .\scripts\commit.ps1 -Files `"package.json`"            -Message `"chore(release): open $alphaVer`""
Write-Host "  .\scripts\commit.ps1 -Files `"docs/WORKFLOW.md`"        -Message `"chore(release): open $alphaVer`""
if ($futurePlansChanged) {
    Write-Host "  .\scripts\commit.ps1 -Files `"docs/FUTURE_PLANS.md`"    -Message `"chore(release): mark $Version in progress`""
}
if ($graphChanged) {
    Write-Host "  .\scripts\commit.ps1 -Files `"codebase-graph.json`"      -Message `"chore(graph): refresh graph for $alphaVer`""
}
