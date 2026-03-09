# CHANGELOG — WorkAble (formerly JobTrack)

## [0.3.0] — 2026-03-09 — ARIA Landmarks & GitHub Pages Deploy

### Build
- Added `.nojekyll` to prevent GitHub Pages from invoking Jekyll on the static HTML
- Added `.github/workflows/pages.yml` — explicit GitHub Actions deploy-to-Pages workflow (push to `main`, artifact = repo root)

### Accessibility (WCAG 2.2 AA — P0)
- `index.html:448` — Changed `<aside class="sidebar" role="navigation">` → `<nav class="sidebar">` (native landmark element; removes conflicting `complementary`→`navigation` role override)
- `index.html:470` — Removed redundant `role="main"` from `<main>` (implicit ARIA semantics)
- `index.html:472–756` — Added `role="region" aria-labelledby="heading-{view}"` to all 8 view panels (`dashboard`, `analytics`, `add`, `cv`, `resumes`, `covers`, `emails`, `settings`); added matching `id="heading-{view}"` to each panel's `<h1>` — screen readers can now navigate directly to each section via landmark menu

## [0.2.0] — 2026-03-09 — Rename: JobTrack → WorkAble
- Updated `<title>` to "WorkAble — Application Manager"
- Updated PWA manifest `name`/`short_name` + icon letter (J→W) via re-encoded base64
- Updated setup screen `<h1>` welcome string
- Updated backup export filename prefix to `WorkAble_Backup_`
- Firebase project IDs (`jobtrack-bcbcf.*`) intentionally unchanged (infrastructure identifiers)

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
