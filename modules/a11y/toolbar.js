// Accessibility toolbar: easy-read mode, high contrast, dyslexia font,
// reduce motion, text size, line spacing. Persists prefs to storage.

import { storeGet, storeSet } from "../services/db.service.js";
import { EASY_LABELS } from "../assets/constants.js";

let _prefs = {
  easyread:    false,
  contrast:    false,
  dyslexia:    false,
  motion:      false,
  textSize:    "sm",
  lineSpacing: "normal",
};

// ── Panel toggle ─────────────────────────────────────────────────────────────

export function toggleA11yPanel() {
  const panel = document.getElementById("a11y-panel");
  const fab   = document.getElementById("a11y-fab");
  const isOpen = panel.classList.toggle("open");
  if (fab) fab.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

// ── Toggle features ───────────────────────────────────────────────────────────

export function toggleA11y(key) {
  _prefs[key] = !_prefs[key];
  const btn = document.getElementById("a11y-" + key);
  if (btn) { btn.classList.toggle("on", _prefs[key]); btn.setAttribute("aria-pressed", _prefs[key] ? "true" : "false"); }
  applyA11yPrefs();
  _savePrefs();
}

export function setTextSize(size) {
  _prefs.textSize = size;
  document.querySelectorAll(".a11y-size-btn").forEach(b => {
    const active = b.dataset.size === size;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", active ? "true" : "false");
  });
  applyA11yPrefs();
  _savePrefs();
}

export function setLineSpacing(spacing) {
  _prefs.lineSpacing = spacing;
  document.querySelectorAll(".a11y-spacing-btn").forEach(b => {
    const active = b.dataset.spacing === spacing;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", active ? "true" : "false");
  });
  applyA11yPrefs();
  _savePrefs();
}

// ── Apply all prefs to DOM ────────────────────────────────────────────────────

export function applyA11yPrefs() {
  const b = document.body;
  b.classList.toggle("easy-read",     _prefs.easyread);
  b.classList.toggle("high-contrast", _prefs.contrast);
  b.classList.toggle("dyslexia-font", _prefs.dyslexia);
  b.classList.toggle("reduce-motion", _prefs.motion);

  b.classList.remove("text-sm", "text-md", "text-lg", "text-xl");
  if (_prefs.textSize !== "sm") b.classList.add("text-" + _prefs.textSize);

  b.classList.remove("line-wide", "line-xwide");
  if (_prefs.lineSpacing !== "normal") b.classList.add("line-" + _prefs.lineSpacing);

  ["easyread", "contrast", "dyslexia", "motion"].forEach(k => {
    const btn = document.getElementById("a11y-" + k);
    if (btn) { btn.classList.toggle("on", _prefs[k]); btn.setAttribute("aria-pressed", _prefs[k] ? "true" : "false"); }
  });

  document.querySelectorAll(".a11y-size-btn").forEach(b =>
    b.setAttribute("aria-pressed", b.dataset.size    === (_prefs.textSize    || "sm")     ? "true" : "false")
  );
  document.querySelectorAll(".a11y-spacing-btn").forEach(b =>
    b.setAttribute("aria-pressed", b.dataset.spacing === (_prefs.lineSpacing || "normal") ? "true" : "false")
  );

  if (_prefs.easyread) _applyEasyReadLabels();
  else _restoreLabels();
}

// ── Load persisted prefs ──────────────────────────────────────────────────────

export async function loadA11yPrefs() {
  try {
    const raw = await storeGet("jt_a11y");
    if (raw) {
      _prefs = { ..._prefs, ...JSON.parse(raw) };
      applyA11yPrefs();
      document.querySelectorAll(".a11y-size-btn").forEach(b =>
        b.classList.toggle("active", b.dataset.size === _prefs.textSize)
      );
      document.querySelectorAll(".a11y-spacing-btn").forEach(b =>
        b.classList.toggle("active", b.dataset.spacing === _prefs.lineSpacing)
      );
    }
  } catch (e) {}
}

function _savePrefs() { storeSet("jt_a11y", JSON.stringify(_prefs)); }

// ── Easy-read label swapping ──────────────────────────────────────────────────

let _origLabels = new Map();

function _applyEasyReadLabels() {
  document.querySelectorAll(".section-title,.page-title span,.nav-label,.card h3,.btn,.btn-sm,.tpl-pick,.filter-btn").forEach(el => {
    const txt = el.textContent.trim();
    if (EASY_LABELS[txt] && !_origLabels.has(el)) {
      _origLabels.set(el, txt);
      el.textContent = EASY_LABELS[txt];
    }
  });
}

function _restoreLabels() {
  _origLabels.forEach((orig, el) => { el.textContent = orig; });
  _origLabels = new Map();
}
