# sync.ps1 -- Full CI pipeline: smoke test -> commit -> push -> PR -> merge
#
# Steps:
#   1. Guard:      abort if on main (protected branch)
#   2. Smoke test: start node server.js, verify HTTP 200 on :3000, kill server
#   3. Commit:     git add . && git commit (auto-message from file names)
#   4. Push:       git push origin HEAD
#   5. PR:         gh pr create targeting main (or surface existing PR)
#   6. Conflicts:  abort if PR is CONFLICTING
#   7. Merge:      gh pr merge --auto --merge
#
# Branch protection: PRs required, 0 approvals required (no self-approve step).
# Authorization: Claude may run this full sequence autonomously when
#   smoke test passes (step 2) and PR has no merge conflicts (step 6).

Set-Location $PSScriptRoot

# ── 1. Branch guard ───────────────────────────────────────────────────────────
$branch = git rev-parse --abbrev-ref HEAD 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Could not determine current branch. Are you inside a git repo?"
    exit 1
}
if ($branch -eq "main") {
    Write-Host ""
    Write-Host "  [sync] ABORT: on 'main' - protected branch." -ForegroundColor Red
    Write-Host "         Create a feature branch: git checkout -b claude/<name>" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host ""
Write-Host "  [sync] Branch : $branch" -ForegroundColor Cyan

# ── 2. Smoke test ─────────────────────────────────────────────────────────────
Write-Host "  [sync] Smoke test: starting node server.js ..." -ForegroundColor Yellow

$nodePath = "C:\Program Files\nodejs\node.exe"
$serverProc = Start-Process `
    -FilePath $nodePath `
    -ArgumentList "server.js" `
    -WorkingDirectory $PSScriptRoot `
    -PassThru `
    -WindowStyle Hidden `
    -RedirectStandardOutput "$env:TEMP\sync_server.log" `
    -RedirectStandardError "$env:TEMP\sync_server_err.log"

Start-Sleep -Seconds 2

$smokePass = $false
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($resp.StatusCode -eq 200) { $smokePass = $true }
} catch {}

Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue

if (-not $smokePass) {
    Write-Host "  [sync] ABORT: smoke test FAILED - server did not respond on :3000." -ForegroundColor Red
    Write-Host "         Run 'node server.js' manually to diagnose." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "  [sync] Smoke test : PASS (HTTP 200)" -ForegroundColor Green

# ── 3. Stage & commit ─────────────────────────────────────────────────────────
$dirty = git status --porcelain
if (-not $dirty) {
    Write-Host "  [sync] Nothing to commit - working tree clean." -ForegroundColor Yellow
} else {
    git add .
    $files = ($dirty -replace '^\s*\S+\s+', '' | Select-Object -First 5) -join ", "
    $msg = "Sync: $files"
    git commit -m $msg
    if ($LASTEXITCODE -ne 0) {
        Write-Error "git commit failed."
        exit 1
    }
    Write-Host "  [sync] Committed  : $msg" -ForegroundColor Green
}

# ── 4. Push ───────────────────────────────────────────────────────────────────
git push origin HEAD
if ($LASTEXITCODE -ne 0) {
    Write-Error "git push failed."
    exit 1
}
Write-Host "  [sync] Pushed     : origin/$branch" -ForegroundColor Green

# ── 5. Create or surface PR ───────────────────────────────────────────────────
$prData = gh pr view --json url,mergeable 2>$null | ConvertFrom-Json
if ($prData) {
    $prUrl = $prData.url
    $mergeable = $prData.mergeable
    Write-Host "  [sync] PR open    : $prUrl" -ForegroundColor Cyan
} else {
    Write-Host "  [sync] Creating PR -> main ..." -ForegroundColor Yellow
    $prUrl = gh pr create --base main --head $branch --title "Sync: $branch" --body "Automated PR from sync.ps1. Branch: $branch" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "gh pr create failed: $prUrl"
        exit 1
    }
    Write-Host "  [sync] PR created : $prUrl" -ForegroundColor Green
    Start-Sleep -Seconds 3
    $prData = gh pr view --json url,mergeable 2>$null | ConvertFrom-Json
    if ($prData) { $mergeable = $prData.mergeable } else { $mergeable = "UNKNOWN" }
}

# ── 6. Conflict check ─────────────────────────────────────────────────────────
if ($mergeable -eq "CONFLICTING") {
    Write-Host ""
    Write-Host "  [sync] ABORT: PR has merge conflicts." -ForegroundColor Red
    Write-Host "         Resolve conflicts, then re-run .\sync.ps1" -ForegroundColor Yellow
    Write-Host "         PR: $prUrl" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
Write-Host "  [sync] Mergeable  : $mergeable" -ForegroundColor Green

# ── 7. Merge ──────────────────────────────────────────────────────────────────
Write-Host "  [sync] Enabling auto-merge ..." -ForegroundColor Yellow
gh pr merge --auto --merge
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [sync] WARNING: auto-merge failed - merge manually: $prUrl" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "  [sync] Pipeline complete." -ForegroundColor Green
Write-Host "         Auto-merge queued - will land on main once checks pass." -ForegroundColor DarkGray
Write-Host "         $prUrl" -ForegroundColor Cyan
Write-Host ""
