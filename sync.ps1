# sync.ps1 — Commit and push all changes to current branch
# NOTE: Pushes to 'claude/festive-ritchie' (current branch), NOT 'main'.
# To merge into main, open a PR from that branch after pushing.

Set-Location $PSScriptRoot

git add .
git commit -m "Automated modular restructure sync"
git push origin HEAD
