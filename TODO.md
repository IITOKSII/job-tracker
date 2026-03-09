# TODO — WorkAble

> Priority: P0 = blocks launch, P1 = important, P2 = nice-to-have

## Phase 1 — A11y & Rename (current)
- [ ] **P0** Rename "JobTrack" → "WorkAble" (title, manifest, setup screen, all UI strings)
- [ ] **P0** Add ARIA landmarks: `<main>`, `<nav role="navigation">`, `<section aria-label>`
- [ ] **P0** Modal a11y: focus trap, `role="dialog"`, `aria-modal="true"`, Escape-to-close, return focus
- [ ] **P0** Toast notifications: `aria-live="polite"`, `role="status"`
- [ ] **P0** Replace native `prompt()`/`confirm()` with accessible custom dialogs
- [ ] **P0** Visible focus indicators (`:focus-visible` rings) on all interactive elements
- [ ] **P0** Canvas chart alternatives: add `aria-label` + hidden data tables
- [ ] **P1** Color contrast audit — verify all text/UI meets 4.5:1 / 3:1 ratios
- [ ] **P1** Keyboard nav: arrow keys in sidebar, Enter/Space activation
- [ ] **P1** Form validation: inline errors with `aria-describedby`, error summary

## Phase 2 — Architecture
- [ ] **P1** Extract JS into modules (app.js, a11y.js, ai.js, ui.js)
- [ ] **P1** Move CSS to external stylesheet
- [ ] **P1** Add unit tests for core functions (job CRUD, status transitions)

## Phase 2.5 — AI
- [ ] **P1** Fix Gemini hallucinations (prompt engineering, response validation, grounding)

## Phase 3 — Features
- [ ] **P2** Dark/light theme toggle (prefers-color-scheme)
- [ ] **P2** Notification reminders (follow-up dates)
- [ ] **P2** Multi-language support (i18n)
- [ ] **P2** Drag-and-drop Kanban (keyboard accessible)
