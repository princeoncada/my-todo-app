param(
    [string]$Question = "",
    [switch]$SkipChroma,
    [switch]$SkipDiff
)

$ErrorActionPreference = "Continue"

function Write-Section {
    param([string]$Title)
    Write-Output ""
    Write-Output $Title
    Write-Output ("=" * $Title.Length)
}

function Write-IndentedLines {
    param([object[]]$Lines)
    if (-not $Lines -or $Lines.Count -eq 0) {
        Write-Output "    (no output)"
        return
    }
    foreach ($line in $Lines) {
        Write-Output ("    " + $line)
    }
}

function Invoke-Capture {
    param([string]$Command, [string[]]$Arguments)
    try {
        $output = & $Command @Arguments 2>&1
        if ($LASTEXITCODE -ne 0) {
            return @("command failed with exit code $LASTEXITCODE", $output)
        }
        if (-not $output) {
            return @()
        }
        return @($output)
    } catch {
        return @("command unavailable: $($_.Exception.Message)")
    }
}

Write-Section "CHATGPT ARCHITECT CONTEXT PACKET"
Write-Output "Generated locally for paste into ChatGPT."
Write-Output "This packet contains pushed-state context plus local evidence that ChatGPT cannot read directly."

Write-Section "WHAT CHANGED IN 1.3.0"
Write-Output "- ChatGPT Architect Mode was added."
Write-Output "- Local Evidence Packet was added."
Write-Output "- Local ChromaDB and local graph limitations were documented."
Write-Output "- Codex prompts must state local evidence status."
Write-Output "- Validation checks confirm ChatGPT architect docs exist."

Write-Section "CURRENT LOCAL STATE"
if (Test-Path "STATE.json") {
    try {
        $state = Get-Content "STATE.json" -Raw -Encoding UTF8 | ConvertFrom-Json
        Write-Output "STATE.json:"
        Write-Output "    version: $($state.version)"
        Write-Output "    state: $($state.state)"
        Write-Output "    phase: $($state.phase)"
        Write-Output "    phaseTitle: $($state.phaseTitle)"
        Write-Output "    nextPhase: $($state.nextPhase)"
    } catch {
        Write-Output "STATE.json could not be parsed: $($_.Exception.Message)"
    }
} else {
    Write-Output "STATE.json missing."
}

Write-Section "REMOTE VS LOCAL AUTHORITY"
Write-Output "- ChatGPT architect sees pushed GitHub state plus pasted evidence only."
Write-Output "- Remote master is authoritative only after push."
Write-Output "- Local uncommitted work, branch-only files, ChromaDB output, validation output, and regenerated graph output are invisible to ChatGPT unless pasted."
Write-Output "- Anything not pushed or pasted does not exist to ChatGPT architect."

Write-Section "LOCAL EVIDENCE PACKET"
Write-Output "git status --short"
Write-IndentedLines (Invoke-Capture "git" @("status", "--short"))
Write-Output ""
Write-Output "git log --oneline -5"
Write-IndentedLines (Invoke-Capture "git" @("log", "--oneline", "-5"))
Write-Output ""
if ($SkipDiff) {
    Write-Output "git diff --stat"
    Write-Output "    skipped because -SkipDiff was provided"
} else {
    Write-Output "git diff --stat"
    Write-IndentedLines (Invoke-Capture "git" @("diff", "--stat"))
}

Write-Section "CHROMADB CONTEXT"
if ($SkipChroma) {
    Write-Output "ChromaDB query skipped because -SkipChroma was provided."
} elseif ([string]::IsNullOrWhiteSpace($Question)) {
    Write-Output "ChromaDB query skipped because -Question was empty."
} else {
    Write-Output "python scripts/query_docs.py `"$Question`""
    Write-IndentedLines (Invoke-Capture "python" @("scripts/query_docs.py", $Question))
}

Write-Section "GRAPH CONTEXT"
if (Test-Path "codebase-graph.json") {
    try {
        $graph = Get-Content "codebase-graph.json" -Raw -Encoding UTF8 | ConvertFrom-Json
        Write-Output "codebase-graph.json:"
        Write-Output "    version: $($graph.version)"
        Write-Output "    schemaVersion: $($graph.schemaVersion)"
        Write-Output "    generatedAt: $($graph.generatedAt)"
        Write-Output "    graph role: orientation map only; direct file reads are still required before editing"
    } catch {
        Write-Output "codebase-graph.json could not be parsed: $($_.Exception.Message)"
    }
} else {
    Write-Output "codebase-graph.json missing."
}

Write-Section "WORKFLOW PREVIEW"
Write-Output "1. User/controller runs this export script locally."
Write-Output "2. User/controller pastes the output into ChatGPT."
Write-Output "3. ChatGPT scopes using pushed GitHub state plus pasted local evidence."
Write-Output "4. ChatGPT produces a Codex prompt with LOCAL EVIDENCE PROVIDED."
Write-Output "5. Codex works locally and reads files directly before editing."
Write-Output "6. User/controller validates, commits, promotes, and pushes."

Write-Section "APPROVAL CHECKPOINT"
Write-Output "- Approve this packet layout"
Write-Output "- Request changes to packet layout"
Write-Output "- Proceed to 1.4.0 scoping only after approval"
