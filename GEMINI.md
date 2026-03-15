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
- [x] Full Backend Audit — all checks passed
- [x] Fix window.clearErr/showErr/setStatus missing from app.js (PR #9)
- [x] Knowledge Injection — dependency order, module map, sync pipeline, boot logic written to CLAUDE.md
- [x] Create .firebaseignore — protects sync.ps1, server.js, dev docs from Firebase Hosting deployment
- [x] A11y/TTS window binding code audit — all 40+ onclick/oninput/onchange handlers verified ✅
- [x] A11y Audit index.html — 18 issues fixed (2026-03-15, sweet-lamarr):
      duplicate role="main", 15 missing aria-labels, emoji spans aria-hidden, download dropdown aria attrs, mob-more-menu role, setup link rel/aria
- [x] PRD Empowerment Barrier Audit — 4 critical fixes (2026-03-15, sweet-lamarr):
      job-card/k-card keyboard access (tabindex+role+onkeydown), showView focus management, modal focus to #m-title, delete btn aria-label
- [x] Bug Fix: constants.js GEMINI_MODELS — removed gemini-2.5-flash (404), added gemini-1.5-pro (2026-03-15, sweet-lamarr)
- [x] Bug Fix: tts.js ttsStop() hardened — _utterance=null reset added; prescribed toggle logic was already present (2026-03-15, sweet-lamarr)

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