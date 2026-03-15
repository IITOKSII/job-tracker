# WorkAble Master Project Memory
Last updated: 2026-03-12 (Real-Time Sync Rule active)

## System Architecture (Verified)
- **Entry:** index.html → modules/app.js (Object.assign window boot)
- **State:** modules/state.js (Singleton: { state, fb } — only source of truth)
- **Storage:** db.service.js (Triple-guarded: Firestore → Extension → LocalStorage)
- **A11y:** tts.js (en-AU voice), toolbar.js (preferences: contrast/dyslexia/easyread/motion/size/spacing)
- **Pipeline:** sync.ps1 (Smoke test → commit → push → PR → conflict check → auto-merge)
- **Full module map + dependency order:** see CLAUDE.md

## Master To-Do List

### ✅ Done (confirmed)
- [x] **Fix #4 — ReferenceError app.js:** Added missing `import { clearErr, showErr, setStatus }` from `./ui/utils.js` + exposed on `window`. Loading screen hang resolved. (2026-03-15, optimistic-babbage)
- [x] **Fix: Cover Letter View button broken** — index.html line 281 had Unicode smart quotes as attribute delimiters (from a11y commit), making getElementById('cover-name-input') return null. Fixed via sed. Verified in Chrome. (2026-03-15, optimistic-babbage)
- [x] Full Backend Audit — all checks passed
- [x] Fix window.clearErr/showErr/setStatus missing from app.js (PR #9)
- [x] Knowledge Injection — dependency order, module map, sync pipeline, boot logic written to CLAUDE.md
- [x] Create .firebaseignore — protects sync.ps1, server.js, dev docs from Firebase Hosting deployment
- [x] A11y/TTS window binding code audit — all 40+ onclick/oninput/onchange handlers verified ✅

### 🔲 Awaiting User Action
- [ ] **Checklist 2 — UI Manual Testing** (user must verify in Chrome at http://localhost:3000)
  Start server: `node server.js`
  Covers: Auth flow, Dashboard filters/views, Job modal, A11y toolbar, TTS, Voice input,
  Documents, Analytics, Email templates, Navigation, Settings

### 🔲 Blocked (waiting on Checklist 2 confirmation)
- [ ] **WorkAble Clipper** — Chrome Extension MV3 build
  Unblocked when user says: "UI check done, proceed to Clipper"

## One Noted A11y Gap (non-blocking, for polish sprint)
- `a11y-panel` has `role="dialog"` but toolbar.js does not implement focus trapping.
  The job modal DOES trap focus (modal.js). The toolbar panel should match.
  Flag for Clipper sprint or next polish pass — not a blocker for UI Checklist 2.

## Real-Time Sync Rule (Active — 2026-03-12)
Both Claude and Gemini update CLAUDE.md + GEMINI.md immediately after every fix or discovery.
Do NOT batch updates to end of session.

## Persistence Rule
- ALWAYS read CLAUDE.md and GEMINI.md at start of every session.
- DO NOT mark tasks 'Done' until User confirms actioned results.