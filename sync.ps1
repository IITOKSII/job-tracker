# sync.ps1 — Full CI pipeline: smoke test → commit → push → PR → approve → merge
#
# Pipeline:
#   1. Guard: abort if on main
#   2. Smoke test: start node server.js, verify HTTP 200 on localhost:3000, kill server
#   3. Stage & commit (auto-message from file names)
#   4. Push to origin HEAD
#   5. Create PR targeting main (or surface existing PR)
#   6. Check for merge conflicts — abort merge if conflicts detected
#   7. Self-approve: gh pr review --approve
#   8. Auto-merge: gh pr merge --auto --merge
#
# Authorization: Claude is authorized to run this full sequence when:
#   - The local smoke test passes (step 2)
#   - The PR has no merge conflicts (step 6)

Set-Location $PSScriptRoot

# ── 1. Branch guard ───────────────────────────────────────────────────────────
$branch = git rev-parse --abbrev-ref HEAD 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Could not determine current branch. Are you inside a git repo?"
    exit 1
}
if ($branch -eq "main") {
    Write-Host ""
    Write-Host "  [sync] ABORT: on 'main' — protected branch." -ForegroundColor Red
    Write-Host "         Create a feature branch: git checkout -b claude/<name>" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host ""
Write-Host "  [sync] Branch : $branch" -ForegroundColor Cyan

# ── 2. Local smoke test ───────────────────────────────────────────────────────
Write-Host "  [sync] Smoke test: starting node server.js ..." -ForegroundColor Yellow
$serverProc = Start-Process -FilePath "node" -ArgumentList "server.js" `
    -PassThru -WindowStyle Hidden -RedirectStandardOutput "$env:TEMP\sync_server.log" `
    -RedirectStandardError "$env:TEMP\sync_server_err.log"

Start-Sleep -Seconds 2   # give server time to bind

$smokePass = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) { $smokePass = $true }
} catch {}

Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue

if (-not $smokePass) {
    Write-Host "  [sync] ABORT: smoke test FAILED — server did not respond on :3000." -ForegroundColor Red
    Write-Host "         Check server.js or run 'node server.js' manually to diagnose." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "  [sync] Smoke test : PASS (HTTP 200 on localhost:3000)" -ForegroundColor Green

# ── 3. Stage & commit ─────────────────────────────────────────────────────────
$status = git status --porcelain
if (-not $status) {
    Write-Host "  [sync] Nothing to commit — working tree clean." -ForegroundColor Yellow
} else {
    git add .
    $files = ($status -replace '^\s*\S+\s+', '' | Select-Object -First 5) -join ", "
    $commitMsg = "Sync: $files"
    git commit -m $commitMsg
    if ($LASTEXITCODE -ne 0) { Write-Error "git commit failed."; exit 1 }
    Write-Host "  [sync] Committed  : $commitMsg" -ForegroundColor Green
}

# ── 4. Push ───────────────────────────────────────────────────────────────────
git push origin HEAD
if ($LASTEXITCODE -ne 0) { Write-Error "git push failed."; exit 1 }
Write-Host "  [sync] Pushed     : origin/$branch" -ForegroundColor Green

# ── 5. Create or surface PR ───────────────────────────────────────────────────
$prData = gh pr view --json url,mergeable 2>$null | ConvertFrom-Json
if ($prData) {
    $prUrl = $prData.url
    $mergeable = $prData.mergeable
    Write-Host "  [sync] PR open    : $prUrl" -ForegroundColor Cyan
} else {
    Write-Host "  [sync] Creating PR -> main ..." -ForegroundColor Yellow
    $prUrl = gh pr create `
        --base main `
        --head $branch `
        --title "Sync: $branch" `
        --body "Automated PR from sync.ps1. Branch: $branch" `
        2>&1
    if ($LASTEXITCODE -ne 0) { Write-Error "gh pr create failed: $prUrl"; exit 1 }
    Write-Host "  [sync] PR created : $prUrl" -ForegroundColor Green
    # Re-fetch mergeability after creation
    Start-Sleep -Seconds 3
    $prData = gh pr view --json url,mergeable 2>$null | ConvertFrom-Json
    $mergeable = if ($prData) { $prData.mergeable } else { "UNKNOWN" }
}

# ── 6. Conflict check ─────────────────────────────────────────────────────────
if ($mergeable -eq "CONFLICTING") {
    Write-Host ""
    Write-Host "  [sync] ABORT: PR has merge conflicts — cannot self-approve." -ForegroundColor Red
    Write-Host "         Resolve conflicts manually, then re-run .\sync.ps1" -ForegroundColor Yellow
    Write-Host "         PR: $prUrl" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
Write-Host "  [sync] Mergeable  : $mergeable" -ForegroundColor Green

# ── 7. Self-approve ───────────────────────────────────────────────────────────
Write-Host "  [sync] Approving PR ..." -ForegroundColor Yellow
gh pr review --approve
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [sync] WARNING: self-approve failed (may need a second reviewer)." -ForegroundColor Yellow
    Write-Host "         PR is pushed and open — approve manually on GitHub." -ForegroundColor Yellow
    Write-Host "         $prUrl" -ForegroundColor Cyan
    exit 0
}
Write-Host "  [sync] Approved   : OK" -ForegroundColor Green

# ── 8. Auto-merge ─────────────────────────────────────────────────────────────
Write-Host "  [sync] Enabling auto-merge ..." -ForegroundColor Yellow
gh pr merge --auto --merge
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [sync] WARNING: auto-merge flag failed — merge manually on GitHub." -ForegroundColor Yellow
    Write-Host "         $prUrl" -ForegroundColor Cyan
    exit 0
}

Write-Host ""
Write-Host "  [sync] Pipeline complete." -ForegroundColor Green
Write-Host "         Auto-merge queued — will land on main once checks pass." -ForegroundColor DarkGray
Write-Host "         $prUrl" -ForegroundColor Cyan
Write-Host ""
