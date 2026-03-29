# WorkAble Master Project Memory
Last updated: 2026-03-29

## System Architecture (Verified)
- **Entry:** index.html -> modules/app.js (Object.assign window boot)
- **State:** modules/state.js (Singleton: { state, fb } -- only source of truth)
- **Storage:** db.service.js (Triple-guarded: Firestore -> Extension -> LocalStorage)
- **A11y:** tts.js (en-AU voice), toolbar.js (preferences: contrast/dyslexia/easyread/motion/size/spacing)
- **Pipeline:** sync.ps1 (Smoke test -> commit -> push -> PR -> conflict check -> auto-merge)
- **Full module map + dependency order:** see CLAUDE.md

## Master To-Do List

### Done (confirmed)
- [x] Full Backend Audit -- all checks passed
- [x] Fix window.clearErr/showErr/setStatus missing from app.js (PR #9)
- [x] Knowledge Injection -- dependency order, module map, sync pipeline, boot logic written to CLAUDE.md
- [x] Create .firebaseignore -- protects sync.ps1, server.js, dev docs from Firebase Hosting deployment
- [x] A11y/TTS window binding code audit -- all 40+ onclick/oninput/onchange handlers verified
- [x] A11y Audit index.html -- 18 issues fixed (2026-03-15, sweet-lamarr)
- [x] PRD Empowerment Barrier Audit -- 4 critical fixes (2026-03-15, sweet-lamarr)
- [x] Bug Fix: constants.js GEMINI_MODELS -- removed gemini-2.5-flash (404), added gemini-1.5-pro
- [x] Bug Fix: tts.js ttsStop() hardened -- _utterance=null reset added
- [x] Bug Fix: app.js -- added clearErr/showErr/setStatus import + window binding
- [x] Bug Fix: ai-editor.js -- generateCoverLetter/generateResume/autoTailorResume reordered
- [x] Bug Fix: preview-engine.js -- TTS .tts-btn removal (PR #10)
- [x] Bug Fix: preview-engine.js -- blank second PDF page fix (2026-03-16, quizzical-lamport)
- [x] Checklist 2 -- UI Manual Testing (user confirmed 2026-03-16)

### Done -- WorkAble Clipper fixes (2026-03-16, upbeat-chatterjee, PR #17 + #18)
- [x] Bug Fix: bridge.js -- CRITICAL: was calling chrome.storage.local in MAIN world (chrome undefined there)
  - Fix: postMessage relay. bridge.js (MAIN) sends messages; bridge-relay.js (ISOLATED, new) handles chrome.storage
  - manifest.json updated to load bridge-relay.js at document_start (ISOLATED world)
- [x] popup.js -- Gemini analysis before save (requirements, interview_questions, company_facts populated)
- [x] auth.service.js -- Firebase users now get clipper jobs merged (window.storage.get direct call post-Firestore load)
- [x] dashboard.js + modal.js -- "NEW" badge for unseen clipper jobs; cleared on modal open

### Awaiting User Verification
- [ ] Reload extension at chrome://extensions after PR #18 merges, then test clip → WorkAble flow
- [ ] Confirm clipped jobs appear in dashboard with full AI-analysed data

### Done — A11y Polish Sprint (2026-03-29)
- [x] Focus trapping for `#a11y-panel` in toolbar.js (2026-03-29)
- [x] Enhanced focus-visible indicators in base.css — 3px outline + outer glow (2026-03-29)
- [x] Extension icon PNGs generated (icon16.png, icon48.png, icon128.png) (2026-03-29)

## Sync Rule (Lightweight -- 2026-03-16)
Update CLAUDE.md + MEMORY.md on meaningful changes only. GEMINI.md on task status changes only.

## Persistence Rule
- ALWAYS read CLAUDE.md and GEMINI.md at start of every session.
- DO NOT mark tasks 'Done' until User confirms actioned results.
