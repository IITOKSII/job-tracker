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

## Fix Log (2026-03-15)
- **app.js:** Added `import { clearErr, showErr, setStatus } from "./ui/utils.js"` (was missing — caused ReferenceError on boot)
- **app.js:** Added `clearErr, showErr, setStatus` to `Object.assign(window, {...})` block
- **Effect:** Resolves loading screen hang caused by ReferenceError before `Object.assign` completed
- **index.html line 281:** A11y commit (c8f2545) used Unicode smart quotes (U+201D) as HTML attribute delimiters on cover-name-input, corrupting id/class/placeholder/aria-label. Fixed with sed replacing smart quotes with ASCII straight quotes. Root cause of "View button does not work for cover letters" bug.

## Confirmation Gate — Active
DO NOT begin WorkAble Clipper extension build until:
1. Checklist 2 (UI) is manually verified by the user in Chrome
2. User explicitly confirms "UI check done, proceed to Clipper"