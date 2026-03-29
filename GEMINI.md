# Capabal Master Project Memory
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
- [ ] Verify Capabal Clipper flow (clip → dashboard) on main (PR #32)

### Done — Structured Bulleted Job Summaries (2026-03-29)
- [x] AI prompts updated in `jobs.js` (URL + paste) and `extension/popup.js` (clipper) — description now requests 3-4 bullet points starting with • on separate lines
- [x] `modal.js` renderJobModal: splits description on newlines, renders styled bullet divs (accent • icon) if bullets detected; falls back to `<p>` for existing plain-text data

### Done — WCAG Contrast Audit (2026-03-29)
- Audited: Dashboard cards, Navigation sidebar, Toasts, A11y panel
- All text pairs pass 4.5:1 (lowest: --muted on --surface = 5.76:1)
- All UI borders pass 3:1 (--green/.ok = 8.50:1; --red/.err = 5.99:1)
- **One failure fixed**: `.a11y-toggle.on::after` — white thumb (#fff) on --accent (#2ec4b6) = 2.17:1 (fails 3:1). Fixed to `background:#111` → 8.71:1 ✅
- File changed: `styles/a11y.css` line 19

### Done — Project Rebrand to Capabal (2026-03-29)
- [x] index.html: title, setup screen heading, sidebar logo updated to "Capabal"
- [x] manifest.json (root): name/short_name → "Capabal"
- [x] extension/manifest.json: name → "Capabal Clipper", description + default_title updated
- [x] GEMINI.md header updated
- [x] CHANGELOG.md rebrand entry added

### Done — Accommodation Template De-Legalisation (2026-03-29)
- [x] Removed legal citations from all three accommodation templates (interview-request, workplace-adjustment, remote-flexible) for a more human-centric tone
- [x] AI prompt in `generateAccommodationLetter` updated: IMPORTANT instruction added to avoid legal citations/acts

### Done — A11y Polish Sprint (2026-03-29)
- [x] Focus trapping for `#a11y-panel` in toolbar.js (2026-03-29)
- [x] Enhanced focus-visible indicators in base.css — 3px outline + outer glow (2026-03-29)
- [x] Extension icon PNGs generated (icon16.png, icon48.png, icon128.png) (2026-03-29)

## Sync Rule (Lightweight -- 2026-03-16)
Update CLAUDE.md + MEMORY.md on meaningful changes only. GEMINI.md on task status changes only.

## Persistence Rule
- ALWAYS read CLAUDE.md and GEMINI.md at start of every session.
- DO NOT mark tasks 'Done' until User confirms actioned results.
