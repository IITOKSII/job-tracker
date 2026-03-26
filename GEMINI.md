# WorkAble Architect's Memory (Architect: Gemini)
Last updated: 2026-03-22

## AI Persona: Elite Technical Project Manager (The Sheriff)
- **Role**: Chief Architect & Strategic Overseer.
- **Tone**: Professional, direct, action-first.
- **Workflow**: Mandatory **'Outstanding Tasks -> Blockers -> Verification -> Next Tasks'**.
- **Efficiency**: Architect provides blueprints and surgical code deltas; Claude implements.

## Source of Truth Protocol (Mandatory for Handoff)
1. **CLAUDE.md**: Engineer's Manual (Instructions, Blueprints, Efficiency).
2. **GEMINI.md**: Architect's Memory (Task Status, Architecture, Strategic Oversight).
3. **MEMORY.md**: Project History & Gotchas (Persistence, Technical Facts).
4. **CHANGELOG.md**: Change Audit Trail (Must be updated after every task).

## System Architecture (Verified)
- **Entry**: index.html -> modules/app.js (Object.assign window boot)
- **State**: modules/state.js (Singleton: { state, fb } -- only source of truth)
- **Storage**: db.service.js (Triple-guarded: Firestore -> Extension -> LocalStorage)
- **A11y**: tts.js (en-AU voice), toolbar.js (preferences: contrast/dyslexia/easyread/motion/size/spacing)
- **Pipeline**: sync.ps1 (Smoke test -> commit -> push -> PR -> conflict check -> auto-merge)

## Master To-Do List

### Outstanding Tasks
- [ ] WCAG AA 4.5:1 Color Contrast Check (added from TODO.md)
- [ ] Add icon PNGs (run: npm install sharp && node extension/generate-icons.js)
- [ ] Focus trapping for `a11y-panel` in `toolbar.js` (non-blocking polish)

### Done (confirmed)
- [x] Optimize PDF.js/Mammoth.js loading (Lighthouse Performance) — 2026-03-22
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
- [x] WorkAble Clipper -- Chrome Extension MV3 built and merged (PR #18)
- [x] Self-Advocacy -- Accommodation Request templates and AI generator (PR #24)

### Outstanding Tasks
- [ ] Add icon PNGs (run: npm install sharp && node extension/generate-icons.js)
- [ ] Focus trapping for `a11y-panel` in `toolbar.js` (non-blocking polish)
- [ ] Optimize PDF.js/Mammoth.js loading (Lighthouse Performance)

## Sync Rule (Lightweight -- 2026-03-20)
Update CLAUDE.md + MEMORY.md on meaningful changes only. GEMINI.md on task status changes only.

## Persistence Rule
- ALWAYS read CLAUDE.md and GEMINI.md at start of every session.
- DO NOT mark tasks 'Done' until User confirms actioned results.

