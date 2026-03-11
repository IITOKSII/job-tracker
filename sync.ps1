# sync.ps1 — PR-Aware commit, push, and pull request automation
# Behaviour:
#   - On a feature branch: commits, pushes, then creates or surfaces a PR targeting main.
#   - On main: aborts. Direct commits to main are blocked (branch protection).
# After PR creation, wait for manual approval on GitHub or: gh pr review --approve

Set-Location $PSScriptRoot

# ── 1. Resolve current branch ────────────────────────────────────────────────
$branch = git rev-parse --abbrev-ref HEAD 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Could not determine current branch. Are you inside a git repo?"
    exit 1
}

if ($branch -eq "main") {
    Write-Host ""
    Write-Host "  [sync.ps1] Aborted: you are on 'main'." -ForegroundColor Red
    Write-Host "  main is protected. Create a feature branch first:" -ForegroundColor Yellow
    Write-Host "    git checkout -b claude/<branch-name>" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "  [sync.ps1] Branch : $branch" -ForegroundColor Cyan

# ── 2. Stage & commit ────────────────────────────────────────────────────────
$status = git status --porcelain
if (-not $status) {
    Write-Host "  [sync.ps1] Nothing to commit — working tree clean." -ForegroundColor Yellow
} else {
    git add .
    # Build a commit message from staged file names (max 5 listed)
    $files = ($status -replace '^\s*\S+\s+', '' | Select-Object -First 5) -join ", "
    $commitMsg = "Sync: $files"
    git commit -m $commitMsg
    if ($LASTEXITCODE -ne 0) {
        Write-Error "git commit failed."
        exit 1
    }
    Write-Host "  [sync.ps1] Committed: $commitMsg" -ForegroundColor Green
}

# ── 3. Push ──────────────────────────────────────────────────────────────────
git push origin HEAD
if ($LASTEXITCODE -ne 0) {
    Write-Error "git push failed."
    exit 1
}
Write-Host "  [sync.ps1] Pushed   : origin/$branch" -ForegroundColor Green

# ── 4. Create or surface PR ──────────────────────────────────────────────────
$existingPR = gh pr view --json url --jq '.url' 2>$null
if ($existingPR) {
    Write-Host ""
    Write-Host "  [sync.ps1] PR already open:" -ForegroundColor Yellow
    Write-Host "    $existingPR" -ForegroundColor Cyan
} else {
    Write-Host "  [sync.ps1] Creating PR -> main ..." -ForegroundColor Yellow
    $prUrl = gh pr create `
        --base main `
        --head $branch `
        --title "Sync: $branch" `
        --body "Automated PR from \`sync.ps1\`.\`\`Branch: \`$branch\`\`Merge into \`main\` after review." `
        2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "gh pr create failed: $prUrl"
        exit 1
    }
    Write-Host ""
    Write-Host "  [sync.ps1] PR created:" -ForegroundColor Green
    Write-Host "    $prUrl" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "  [sync.ps1] Done. Waiting for approval on GitHub." -ForegroundColor Green
Write-Host "  To approve via CLI: gh pr review --approve" -ForegroundColor DarkGray
Write-Host ""
