# WorkAble / JobTrack — Project Memory

## Project
- Repo: https://github.com/IITOKSII/job-tracker
- Active worktree branch: claude/modest-elbakyan (merged to main 2026-03-19)
- Active worktree path: C:\Users\local_f9\WorkAble\.claude\worktrees\modest-elbakyan
- Main branch: main
- Stack: Vanilla HTML/CSS/JS (no bundler), Firebase compat v10.12.2, Gemini API

## Architecture
SPA: index.html → modules/app.js (ES modules, Object.assign window bindings).
Dependency order + full module map: see worktree CLAUDE.md (do not duplicate here).

## Dev Server
- Node.js v25.8.0 installed at C:\Program Files\nodejs\
- npm globals at C:\Users\local_f9\AppData\Roaming\npm\
- launch.json uses full node.exe path (npx/.cmd files don't work with preview_start on Windows)
- Start: preview_start "dev-server" → http://localhost:3000

## Active Gotchas (patterns that recur — do not delete)
- Firebase double-init: `firebase.apps.length` guard required — without it, reload throws "app already exists"
- Circular dep pattern: use `window.*` runtime calls (not imports) when a lower module needs a higher one. Examples: auth.service→window.renderDashboard, modal→window.saveJobs/saveResumes/saveCovers
- Smart-quote trap: Edit tool can re-introduce Unicode smart quotes (U+201D) on corrupted lines. If a line has smart quotes as attribute delimiters, fix with `sed` only, never Edit tool
- sync.ps1 on Windows bash: must use full path `powershell.exe -ExecutionPolicy Bypass -File "C:\...\sync.ps1"`
- Dev server: `node server.js` only (never `npx serve`) — npx breaks ES module MIME types


## Git Workflow
- sync.ps1 is a full CI pipeline: smoke test -> commit -> push -> PR -> conflict check -> auto-merge
- Branch protection: PRs required, **0 approvals required** (changed to 0 via API 2026-03-16) — auto-merge fires immediately after conflict check. Never run gh pr review --approve
- Aborts if on main (protected) or if PR is CONFLICTING
- Smoke test: starts node server.js (full path C:\Program Files\nodejs\node.exe), checks HTTP 200 on :3000, kills server
- Merge: gh pr merge --auto --merge fires immediately after conflict check passes
- Claude is authorized to run the full .\sync.ps1 pipeline autonomously when smoke test passes and no conflicts
- .claude/ directory is in .gitignore — launch.json is NOT committed

## Claude Automation Authorization
User has explicitly authorized Claude to run these directly via terminal:
- `node server.js` — start local dev server
- `.\sync.ps1` — commit and push current branch to origin
- Standard git commands (status, log, diff, fetch, branch)
- gh CLI commands for PR and branch management

## WorkAble Clipper (Chrome Extension) — PRs #17, #18, #20 merged
- `/extension/` dir in main repo
- Files: manifest.json (MV3), content.js, background.js, bridge.js, bridge-relay.js, popup.html/js, styles/popup.css
- Load at chrome://extensions → Enable Developer Mode → Load unpacked → select /extension/
- **After any extension file change: must reload extension at chrome://extensions**
- **PR #20 fix (Gemini key):** popup.js `getApiKey()` was only checking `chrome.storage.local` — main app writes key to `localStorage` not chrome.storage. Fix: falls back to sending `GET_GEMINI_KEY` message to content.js, which reads `localStorage.getItem("gemini_key")` and returns it.
- Storage contract: `chrome.storage.local` key `jt_jobs` → `{ value: "[{...}]" }` — mirrors db.service.js storeGet/storeSet
- Gemini key contract: main app stores as plain string at `localStorage["gemini_key"]`
- Firebase user clipper merge: auth.service.js reads `window.storage.get("jt_jobs")` after Firestore load, merges unseen clipper jobs by ID
- "NEW" badge: `job.source === "clipper" && !job.seen` → amber badge on grid + kanban cards; cleared on modal open
- Clipper job structure is identical to analyseJobText output: title, company, location, salary, description, requirements[], application_questions[], interview_questions[], company_facts[]
- **Next session: end-to-end test — reload extension → clip a job on localhost:3000 tab → verify full AI data appears in WorkAble modal**

## User Preferences
- Zero manual clicks preferred for automation tasks
- No need to confirm before running node server.js or .\sync.ps1
- Full autonomy for WorkAble: code → sync → merge without checkpoints.
- Plan gate RE-ENABLED globally (2026-03-19): write numbered plan first for any 3+ step task. WorkAble exception: skip unless architectural decision.
- Self-directed task selection authorized: Claude picks next task from GEMINI.md autonomously.

## Completed This Session (2026-03-19) — PRs #22, #23 merged to main
- **Task 1.1** (PR #22): firestore.rules (Owner-Only), modules/assets/types.js (schema report + JSDoc), db.service.js (toast on permission-denied), ui/utils.js (aria-live assertive for errors)
- **Task 1.2** (PR #23): Document versioning engine — saveAsNewVersion(), loadVersion(), version dropdown (aria-labelled), versions badge in list, root-promotion on delete. parentId field added to Document typedef.

## Next Tasks (from task backlog)
- Task 1.3: (check GEMINI.md for next task definition — not yet seen this session)
- Clipper end-to-end test still pending: reload extension → clip job on localhost:3000 → verify AI data in modal

## Feedback / Behavior Rules
- Do NOT restore or recreate missing files (e.g. from .bak) without asking the user first — see feedback_file_restoration.md
- **Token Efficiency Protocol** (2026-03-16) — see feedback_token_efficiency.md: lazy file loading, delta-only edits, plan gate for >2 files, context alerts at 15-20 msgs, no trailing summaries

## Worktree Notes
- goofy-cerf worktree had GEMINI.md missing (only .bak existed) — GEMINI.md recreated 2026-03-16
- Always verify GEMINI.md exists in new worktrees at session start; if missing, recreate from GEMINI.md.bak or MEMORY.md

## Sync Rule (Lightweight — replaces old 3-file rule, 2026-03-16)
Update CLAUDE.md + MEMORY.md only on meaningful changes (bugs, architecture, new rules).
Git history is the audit trail for code changes — don't duplicate it in docs.
GEMINI.md: update only when task status changes (started/done/blocked).

## Session Log Hygiene (MANDATORY — 2026-03-16)
- Session logs belong to their worktree. When merged, DELETE logs from CLAUDE.md.
- Never carry forward logs from other worktrees into new branches.
- Max CLAUDE.md target: ~100 lines. Prune completed logs first if over.
