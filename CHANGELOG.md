# CHANGELOG — WorkAble (formerly JobTrack)

## [2026-03-29]
- Implemented focus trapping for accessibility panel (`#a11y-panel`) in `modules/a11y/toolbar.js`: Tab/Shift+Tab cycles within panel, Escape closes, focus returns to `#a11y-fab` on close.
- Enhanced focus visibility in `styles/base.css`: 3px outline + soft outer glow on all `:focus-visible` elements.

## [2026-03-26] — Task 3: Lazy-Loading Foundations
- **Added**: `loadScript(url)` promise-based utility in `modules/ui/utils.js` — deduplicates concurrent loads via `_loadedScripts` cache map.
- **Refactored**: `_extractPDF`, `_extractDOCX`, `_renderPDFPages` in `modules/features/documents.js` — now `await loadScript(...)` on demand instead of assuming globals.
- **Removed**: Blocking `<script>` tags for pdf.js (3.11.174) and mammoth (1.6.0) from `index.html` `<head>`.

## [0.1.1] — 2026-03-10 — Planning
- Added P1 TODO item: Fix Gemini hallucinations (Phase 2.5 — AI)

## [0.1.0] — 2026-03-07 — Project Audit & Rename Kickoff

### Existing Codebase (inherited)
- Single-file `index.html` (~3,500+ lines) with vanilla JS
- **Core features:** Job CRUD (URL parse + paste), status pipeline (Saved → Applied → Interview → Offer → Rejected), Kanban board, analytics dashboard (timeline chart, status chart, funnel, company breakdown), KPI cards
- **AI integration:** Gemini API — job ad analysis, resume/cover letter generation & tailoring, resume-job match scoring, interview question generation
- **Documents:** Resume & cover letter editor with edit/preview modes, 4 templates (modern/classic/minimal/executive), PDF/TXT export
- **Auth & storage:** Firebase Auth (Google sign-in) + Firestore, fallback to `window.storage` artifact API
- **Accessibility (partial):** Skip-link, a11y toolbar (text size, line spacing, easy read, high contrast, dyslexia font, reduce motion), TTS engine with mini-player, voice input via Web Speech API
- **Other:** Email templates, checklist per job, data import/export (JSON), PWA manifest, responsive sidebar

### Identified — Needs Work
- No `role`, `aria-live`, or `aria-label` on dynamic regions (toast, modal, sidebar nav)
- `<canvas>` charts lack text alternatives
- Color contrast not verified against WCAG 2.2 AA (4.5:1 text, 3:1 UI)
- Focus management missing on modal open/close
- Keyboard navigation incomplete (no visible focus rings, no Escape-to-close)
- `prompt()` / `confirm()` used for user input (not accessible)
- No error summary or inline validation on forms
- Missing `<main>`, `<nav>`, `<section>` landmarks in places
- App name still "JobTrack" — rename to "WorkAble" pending

## [2026-03-10]
- Modularized index.html: Moved CSS/JS to 'modules' folder.
- Added .claudignore to optimize AI context window.
- Fixed 'File too large' error for future sessions.

### [2026-03-22] - Performance & Hygiene Optimization
- **Completed**: Task 3 — Optimize PDF.js/Mammoth.js loading (Lighthouse Performance).
- **Added**: `loadScript` promise-based utility to `modules/ui/utils.js`.
- **Improved**: Lazy-loading of `pdf.min.js` and `mammoth.browser.min.js` (loaded only on file upload).
- **Improved**: Configuration of `pdf.worker.js` now uses the official worker script for better performance.
- **Changed**: Removed blocking script tags for heavy libraries from `index.html`.
- **Non-Technical Summary**: Generated and saved to `docs/updates/2026-03-22_LazyLoading.md`.
- **Cleanup**: Purged redundant worktrees and business documentation as part of the repository hygiene update.
