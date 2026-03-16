// WorkAble Clipper — popup.js
// Orchestrates the popup UI: requests job data from content.js,
// displays it, and saves via background.js when the user clips.

"use strict";

// ── State ─────────────────────────────────────────────────────────────────────

let currentJob = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────

const screens = {
  detecting: document.getElementById("state-detecting"),
  found:     document.getElementById("state-found"),
  "no-job":  document.getElementById("state-no-job"),
  success:   document.getElementById("state-success"),
  duplicate: document.getElementById("state-duplicate"),
  error:     document.getElementById("state-error"),
};

// ── Screen management ─────────────────────────────────────────────────────────

function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.style.display = key === name ? "" : "none";
  }
  // Move focus to the active screen's first focusable child (a11y)
  const active = screens[name];
  if (!active) return;
  active.removeAttribute("tabindex");
  active.setAttribute("tabindex", "-1");
  active.focus({ preventScroll: true });
}

// ── Field population ──────────────────────────────────────────────────────────

function truncate(str, max) {
  if (!str) return "—";
  return str.length > max ? str.substring(0, max) + "…" : str || "—";
}

function populatePreview(data) {
  document.getElementById("job-title").textContent   = truncate(data.title,   60) || "—";
  document.getElementById("job-company").textContent = truncate(data.company, 50) || "—";
  document.getElementById("job-location").textContent = truncate(data.location, 50) || "—";
  document.getElementById("job-salary").textContent  = truncate(data.salary,  40) || "N/A";
}

// ── Job builder ───────────────────────────────────────────────────────────────

function buildJob(scrapedData, status) {
  return {
    id:                   Date.now(),
    url:                  scrapedData.url          || "",
    title:                scrapedData.title        || "Unknown Title",
    company:              scrapedData.company      || "Unknown Company",
    location:             scrapedData.location     || "N/A",
    salary:               scrapedData.salary       || "N/A",
    description:          scrapedData.description  || "",
    requirements:         [],
    application_questions: [],
    interview_questions:  [],
    company_facts:        [],
    status,
    notes:                "",
    date:                 new Date().toISOString(),
    source:               "clipper",
  };
}

// ── Clip handler ──────────────────────────────────────────────────────────────

async function handleClip() {
  if (!currentJob) return;

  const btn = document.getElementById("clip-btn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  const status = document.getElementById("job-status-select").value;
  const job = buildJob(currentJob, status);

  try {
    const resp = await chrome.runtime.sendMessage({ type: "SAVE_JOB", job });
    if (resp.ok) {
      document.getElementById("success-job-name").textContent =
        `"${truncate(job.title, 50)}" at ${truncate(job.company, 40)}`;
      showScreen("success");
    } else if (resp.error === "DUPLICATE") {
      showScreen("duplicate");
    } else {
      document.getElementById("error-detail").textContent = resp.error || "Unknown error";
      showScreen("error");
    }
  } catch (e) {
    document.getElementById("error-detail").textContent = e.message || "Could not save job.";
    showScreen("error");
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

async function boot() {
  showScreen("detecting");

  // Get the active tab
  let tab;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab;
  } catch (e) {
    document.getElementById("error-detail").textContent = "Cannot access the current tab.";
    showScreen("error");
    return;
  }

  // Attempt to send scrape request to content.js
  let response;
  try {
    response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_JOB" });
  } catch (_e) {
    // content.js not injected yet — inject on demand then retry
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_JOB" });
    } catch (e) {
      document.getElementById("error-detail").textContent =
        "Cannot read this page. Try refreshing and reopening the extension.";
      showScreen("error");
      return;
    }
  }

  if (!response?.ok || !response.detected) {
    showScreen("no-job");
    return;
  }

  currentJob = response.data;
  populatePreview(currentJob);

  // Pre-check for duplicate
  try {
    const dup = await chrome.runtime.sendMessage({ type: "CHECK_DUPLICATE", url: currentJob.url });
    if (dup.duplicate) {
      showScreen("duplicate");
      return;
    }
  } catch (_e) { /* non-fatal */ }

  showScreen("found");

  // Wire up clip button
  document.getElementById("clip-btn").addEventListener("click", handleClip);
}

document.addEventListener("DOMContentLoaded", boot);
