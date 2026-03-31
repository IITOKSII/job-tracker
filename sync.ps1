Write-Host "--- Starting Smart Sync & PR ---" -ForegroundColor Cyan

# 1. Pull latest to prevent conflicts
git pull origin (git branch --show-current) --rebase

# 2. Stage and Commit
git add .
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -m "Capabal.app Update: $timestamp"

# 3. Push to current branch
$branch = git branch --show-current
git push origin $branch

# 4. Handle PR logic
if ($branch -ne "main") {
    Write-Host "Feature branch detected. Checking for open PR..." -ForegroundColor Yellow
    $prExists = gh pr list --head $branch --json number --jq '.[0].number'
    
    if (-not $prExists) {
        Write-Host "Creating new Pull Request..." -ForegroundColor Green
        gh pr create --title "Update: $branch ($timestamp)" --body "Automated sync from Ryzen 7 workstation."
    } else {
        Write-Host "Existing PR #$prExists updated." -ForegroundColor Green
    }
}
Write-Host "--- Sync Complete! ---" -ForegroundColor Cyan
