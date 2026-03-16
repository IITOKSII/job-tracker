# WorkAble Master Project Memory
Last updated: 2026-03-16

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

### Next -- Ready to Build
- [ ] **WorkAble Clipper** -- Chrome Extension MV3 build
  Structure: /extension/ -> manifest.json (MV3), popup.html/js, content.js, background.js, styles/popup.css, icons/
  A11y lens: every popup element must pass contrast/keyboard/landmark checks

## One Noted A11y Gap (non-blocking, for polish sprint)
- `a11y-panel` has `role="dialog"` but toolbar.js does not implement focus trapping.
  The job modal DOES trap focus (modal.js). The toolbar panel should match.

## Sync Rule (Lightweight -- 2026-03-16)
Update CLAUDE.md + MEMORY.md on meaningful changes only. GEMINI.md on task status changes only.

## Persistence Rule
- ALWAYS read CLAUDE.md and GEMINI.md at start of every session.
- DO NOT mark tasks 'Done' until User confirms actioned results.
