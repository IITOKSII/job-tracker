# Engineer Instructions
- Read this and GEMINI.md at the start of every session.
- You are authorized to edit both files to log progress.
- Current Sprint: UI Accessibility and SaaS Commercial Readiness.

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

## Modular File Hierarchy (complete map)
```
modules/
  state.js                     ← Singleton: { state, fb } — the only source of truth
  assets/
    constants.js               ← STATUS, STATUS_ORDER, GEMINI_MODELS, CHECKLIST_ITEMS, EASY_LABELS
    ai-prompts.js              ← SYDNEY_RECRUITER, RESUME_EXPERT prompt strings
    email-templates.js         ← EMAIL_TEMPLATES array
  config/
    firebase.config.js         ← FIREBASE_CONFIG, initFirebase() (apps.length guard + fb.ready guard)
    gemini.config.js           ← callGemini() multi-model waterfall, parseJSON(), getKey()
  services/
    db.service.js              ← userDocRef(), storeGet/storeSet, fbSaveCollection/fbLoadCollection,
                                  saveJobs(), saveResumes(), saveCovers()
    auth.service.js            ← signInWithGoogle(), signOut(), loadAllData(), updateAuthUI(),
                                  saveKey(), updateKey()
  ui/
    utils.js                   ← esc(), toast(), setStatus(), showErr(), clearErr(), scoreColor()
    nav.js                     ← showView(), mobNav(), toggleMobMore() — all renders via window.*
    dashboard.js               ← renderDashboard(), renderGrid(), renderKanban(), renderStats(),
                                  setFilter(), setView(), quickDelete()
  features/
    jobs.js                    ← setAddMode(), analyseJob(), analyseJobText(), analyseCV(),
                                  renderCVJobList(), selCvJob()
    modal.js                   ← openModal(), closeModal(), updateStatus(), saveNotes(),
                                  saveInterviewDate(), saveInterviewType(), deleteFromModal(),
                                  clearAllData(), quickGenCoverFromModal(), renderTimeline(),
                                  renderChecklist(), toggleChecklistItem()
    documents.js               ← renderResumeList(), renderCoverList(), newDocument(),
                                  editDocument(), viewDocument(), closeDocEditor(), saveDocument(),
                                  deleteDocument(), duplicateResume/Cover(), triggerUpload(),
                                  handleDocUpload(), populateCover/ResumeJobSelect()
    preview-engine.js          ← setResumeTemplate(), setCoverTemplate(), setEditorMode(),
                                  refreshPreview(), updateWordCount(), renderResumePreview(),
                                  renderCoverPreview(), downloadDoc()
    ai-editor.js               ← toggleAIPanel(), setInstruction(), aiEditDocument(),
                                  newDocumentFromJob(), closeGenModal(), fillResumeFromSaved(),
                                  generateCoverLetter(), openResumeGenerator(), closeResumeGenModal(),
                                  generateResume(), autoTailorResume(), exportAllData(), importAllData()
    analytics.js               ← renderAnalytics()
    email.js                   ← renderEmailTemplates(), selectTemplate(), updateEmailWC(),
                                  generateEmailFromJob(), copyEmail(), saveEmailAsCover()
  a11y/
    tts.js                     ← ttsSpeak(), ttsPause(), ttsStop(), ttsCycleSpeed(),
                                  startVoiceInput(), addVoiceButtons(), ttsBtnHTML()
    toolbar.js                 ← toggleA11yPanel(), toggleA11y(), setTextSize(), setLineSpacing(),
                                  loadA11yPrefs()
  app.js                       ← Bootstrap: imports all modules, Object.assign(window), boot sequence
```

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

## Object.assign Boot Logic (app.js)
Why it exists: index.html uses inline `onclick="functionName()"` attributes. ES modules are
scoped — functions are not global by default. `Object.assign(window, {...})` makes every
exported function available as a global so HTML onclick works.

The rule: **If you add ANY new `onclick`, `oninput`, or `onchange` call to index.html,
you MUST add the function to the Object.assign block in app.js in the same commit.**

Current window binding groups (app.js lines 113–172):
- Nav: showView, mobNav, toggleMobMore
- Dashboard: setFilter, setView, quickDelete, renderDashboard, renderGrid, renderKanban, renderStats
- Jobs: setAddMode, analyseJob, analyseJobText, renderCVJobList, selCvJob, analyseCV
- Documents: renderResumeList, renderCoverList, newDocument, editDocument, viewDocument,
  closeDocEditor, saveDocument, deleteDocument, duplicateResume, duplicateResumeById,
  duplicateCover, duplicateCoverById, populateCoverJobSelect, populateResumeJobSelect,
  triggerUpload, handleDocUpload
- Preview: setResumeTemplate, setCoverTemplate, setEditorMode, refreshPreview,
  updateWordCount, renderResumePreview, renderCoverPreview, downloadDoc
- Modal: openModal, closeModal, updateStatus, saveInterviewDate, saveInterviewType,
  saveNotes, deleteFromModal, clearAllData, quickGenCoverFromModal, renderTimeline,
  renderChecklist, toggleChecklistItem
- Analytics: renderAnalytics
- Email: renderEmailTemplates, selectTemplate, updateEmailWC, generateEmailFromJob,
  copyEmail, saveEmailAsCover
- AI Editor: toggleAIPanel, setInstruction, aiEditDocument, newDocumentFromJob,
  closeGenModal, fillResumeFromSaved, generateCoverLetter, openResumeGenerator,
  closeResumeGenModal, generateResume, autoTailorResume, exportAllData, importAllData
- Auth: signInWithGoogle, signOut, updateAuthUI, saveKey, updateKey
- A11y: ttsSpeak, ttsPause, ttsStop, ttsCycleSpeed, startVoiceInput, addVoiceButtons,
  toggleA11yPanel, toggleA11y, setTextSize, setLineSpacing
- DB helpers: saveJobs, saveResumes, saveCovers
- UI utils: clearErr, showErr, setStatus

## Real-Time Sync Rule (Active — enforced from 2026-03-12)
After EVERY significant change, discovery, or fix:
1. Update CLAUDE.md — technical log (what changed, what file, why)
2. Update GEMINI.md — task status (mark done/in-progress, add new tasks)
Do NOT wait until end of session. Write it immediately.

## Confirmation Gate — Active
DO NOT begin WorkAble Clipper extension build until:
1. Checklist 2 (UI) is manually verified by the user in Chrome
2. User explicitly confirms "UI check done, proceed to Clipper"

## Session Log — 2026-03-15 (sweet-lamarr worktree)

### A11y Audit — index.html (COMPLETED)
Fixed 18 issues across 6 categories:
1. **Duplicate role="main"** — `#setup-screen` changed from `role="main"` to `role="region"` (line 50)
2. **15 form inputs missing aria-label** — added `aria-label` to:
   - `#key-input`, `#url-input`, `#paste-input`, `#cv-text`
   - `#resume-name-input`, `#resume-textarea`, `#resume-ai-instruction`
   - `#cover-name-input`, `#cover-textarea`, `#cover-ai-instruction`
   - `#email-subject`, `#email-body`, `#new-key-input`
   - `#m-notes`, `#gen-resume-text`
3. **Emoji nav-icon spans** — added `aria-hidden="true"` to all `<span class="nav-icon">` and `<span class="mob-icon">` (replace_all)
4. **Download dropdown triggers** — added `aria-haspopup="true" aria-expanded="false" aria-label` to resume + cover download buttons
5. **mob-more-menu** — added `role="navigation" aria-label="More navigation options"`
6. **Setup external link** — added `rel="noopener noreferrer"` + `aria-label` with "(opens in new tab)"

### Remaining non-blocking gap (carry forward)
- `#a11y-panel` has `aria-modal="true"` but toolbar.js does not implement focus trapping — noted in GEMINI.md

### .firebaseignore — CREATED
Excludes: sync.ps1, server.js, node_modules/, .git/, .claude/, *.md (except README), *.env, test files, OS files

### PRD Empowerment Barrier Audit (2026-03-15, sweet-lamarr)
PRD.md read — Mission: Empowering people with disabilities. Pillars: Universal Data Harvesting, Modular Accessibility, Individual Agency.
Three critical navigation friction barriers identified and fixed:

1. **Job cards not keyboard-accessible** (dashboard.js:84, 123) — `div.job-card` and `div.k-card` had `onclick` but no `tabindex`, `role`, or keyboard handler. Keyboard users could not Tab to or activate any job.
   - Fix: Added `tabindex="0"`, `role="button"`, `aria-label` (company + title + status), `onkeydown` Enter/Space handler to both grid and kanban cards.

2. **`showView()` no focus management** (nav.js) — Switching views left focus stranded on the nav button. Screen reader users got no announcement that the view changed.
   - Fix: After rendering, `showView()` now moves focus to `#view-{v} .page-title` via `tabindex="-1"` + `.focus()`.

3. **Modal opens focused on "Close ×"** (modal.js:98) — First thing screen reader announced on modal open was "Close, button" with no job context.
   - Fix: Focus moved to `#m-title` element (populated with job title) via `tabindex="-1"` + `.focus()`. Screen reader now announces job title first, then dialog context.

4. **Delete button aria-label** (dashboard.js) — Trash emoji `title="Delete"` was ambiguous. Fixed to `aria-label="Delete {company} – {title}"`.

### PRD Feature Gaps (not yet built — carry forward for Clipper sprint)
- A11y Ratings: no way to log employer accessibility hurdles
- Self-Advocacy: no accommodation request template storage
- Barrier Logs: no tracking of external job site technical debt

### Urgent Bug Fixes (2026-03-15, sweet-lamarr — continued from context compaction)

**Bug 1 — constants.js GEMINI_MODELS (FIXED)**
- `"gemini-2.5-flash"` removed (caused API 404 on every first AI call)
- `"gemini-1.5-pro"` added as final waterfall fallback
- New order: `gemini-2.0-flash → gemini-2.0-flash-lite → gemini-1.5-flash → gemini-1.5-pro`

**Bug 2 — tts.js TTS Stop reliability (ASSESSED + HARDENED)**
- Prescribed toggle logic (lines 22–23) was already implemented in the worktree copy
- `ttsStop()` hardened: added `_utterance = null` reset so `ttsCycleSpeed()` cannot
  operate on a stale/cancelled utterance after stop
- `ttsBtnHTML()` already had `event.stopPropagation()` — no change needed

**Bug 3 — app.js missing clearErr/showErr/setStatus window bindings (FIXED)**
- `ui/utils.js` was never imported in app.js — added import for `clearErr, showErr, setStatus`
- Added all three to `Object.assign(window, {...})` so ai-editor.js `window.clearErr/showErr/setStatus` calls resolve

**Bug 4 — ai-editor.js UI state crash after generation (FIXED)**
- `generateCoverLetter`, `generateResume`, `autoTailorResume` all called `editDocument()` before
  `showView()`, then forced `.style.display` manually — conflicting with `editDocument` internals
- Fix: `window.showView(view)` first, then `editDocument(type, id)`, manual display lines removed
- All three functions corrected identically