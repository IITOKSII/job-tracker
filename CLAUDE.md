# Engineer Instructions
- Read this at session start. GEMINI.md is for the Gemini AI assistant (not Claude).
- Current Sprint: UI Accessibility and SaaS Commercial Readiness.

## Quick Start
```
git clone https://github.com/IITOKSII/job-tracker && cd job-tracker
node server.js          # http://localhost:3000
.\sync.ps1              # commit → push → PR → auto-merge
```

## Token Efficiency Protocol (MANDATORY — all sessions)
1. **Lazy Loading** — don't read files until the current sub-task needs them
2. **Delta-Only** — Edit tool only, never full file rewrites; use `// ... existing code` in explanations
3. **Plan Gate** — >2 files touched = 3-bullet plan → wait for "GO" before coding
4. **Context Alert** — at ~15-20 messages: "Context is heavy. Summarize and start a new thread?"
5. **Response Discipline** — no trailing summaries, no preamble, action-first, 1-sentence status updates

## Module Dependency Order (NO circular imports — enforce strictly)
```
assets → state → ui/utils → config → services → features → a11y → app.js
```
- `assets/` — zero imports (constants, prompts, templates)
- `state.js` — zero imports (pure singleton)
- `ui/utils.js` — zero imports (DOM helpers: esc, toast, showErr, clearErr, setStatus)
- `config/` — imports state only (firebase.config, gemini.config)
- `services/` — imports state + config (db.service, auth.service)
- `features/` — imports state, assets, config, services, ui/utils, a11y/tts.js (one-way only)
- `a11y/` — imports services/db.service and ui/utils only (no features imports)
- `app.js` — imports everything; exposes all public functions via `Object.assign(window, {...})`

## Circular Import Prevention Rules
- Features that need `renderDashboard` → call `window.renderDashboard()` at runtime, never import dashboard.js
- `clearAllData` in modal.js uses `window.saveResumes/saveCovers` for the same reason
- `ui/nav.js` calls all render functions via `window.*` — no imports from features
- When a new module needs to call something from a higher layer → use `window.*`, not import

## Window Bindings (app.js Object.assign)
Every function called from HTML `onclick=""` must be in the `Object.assign(window, {...})` block.
Currently exposed: nav, dashboard, jobs, documents, preview, modal, analytics, email, ai-editor,
auth, tts, toolbar, db helpers (saveJobs/saveResumes/saveCovers), ui utils (clearErr/showErr/setStatus).
If you add a new onclick in index.html → add it to app.js window block immediately.

## Module Structure
```
modules/
  state.js              ← singleton: { state, fb }
  assets/               ← constants, ai-prompts, email-templates (zero imports)
  config/               ← firebase.config, gemini.config (imports state)
  services/             ← db.service, auth.service (imports state + config)
  ui/                   ← utils, nav, dashboard (imports state + ui/utils)
  features/             ← jobs, modal, documents, preview-engine, ai-editor, analytics, email
  a11y/                 ← tts, toolbar (imports services + ui/utils only)
  app.js                ← bootstrap + Object.assign(window, {...})
```
For full export lists, read the individual files.

## sync.ps1 Pipeline (full sequence)
Every commit goes through this pipeline — do not bypass:
```
1. Smoke test    → starts node server.js, checks HTTP 200 on :3000, kills server
                   ABORTS if non-200 (nothing is pushed if the server is broken)
2. git add + commit → "WorkAble Update: {date}"
3. git push      → pushes branch to origin
4. PR check      → if PR exists: updates it; if not: creates new PR via gh pr create
5. Conflict check → gh pr view --json mergeable; ABORTS if CONFLICTING
6. Auto-merge    → gh pr merge --auto --merge (fires immediately after conflict check)
```
- Never use `--no-verify` or skip the smoke test
- Always run from the active worktree — never from main directly
- .claude/ is in .gitignore — launch.json is never committed

## Window Bindings Rule (app.js Object.assign)
Any new `onclick`/`oninput`/`onchange` in index.html → add the function to `Object.assign(window, {...})` in app.js in the same commit. Read app.js for the current list.

## Sync Rule (Lightweight — replaces old 3-file rule)
Update CLAUDE.md and MEMORY.md only on **meaningful** changes (new bugs, architecture shifts, new rules).
Do NOT log every micro-fix. Git history is the audit trail for code changes.
GEMINI.md: update task status only when tasks change state (started/done/blocked).

## Session Log Hygiene (MANDATORY)
- Session logs belong to their worktree. When a worktree is merged, its logs are DELETED from CLAUDE.md.
- Never carry forward logs from other worktrees (e.g. sweet-lamarr logs in a new branch).
- Keep only: active rules, module map, pipeline docs, confirmation gates.
- Max CLAUDE.md target: ~100 lines. If over, prune completed session logs first.

## Confirmation Gate — Active
DO NOT begin WorkAble Clipper extension build until:
1. Checklist 2 (UI) is manually verified by the user in Chrome
2. User explicitly confirms "UI check done, proceed to Clipper"

## Carry-Forward Items (from merged worktrees)
- `#a11y-panel` focus trapping not yet implemented in toolbar.js
- PRD feature gaps not yet built: A11y Ratings, Self-Advocacy templates, Barrier Logs