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

// ── Gemini analysis ───────────────────────────────────────────────────────────

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-1.5-pro"];

async function getApiKey() {
  // 1. Try chrome.storage.local first
  const stored = await new Promise(resolve => {
    chrome.storage.local.get("gemini_key", data => {
      resolve(data.gemini_key?.value || null);
    });
  });
  if (stored) return stored;

  // 2. Fall back: read from the active tab's localStorage (where WorkAble stores it)
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const resp = await chrome.tabs.sendMessage(tab.id, { type: "GET_GEMINI_KEY" });
    return resp?.key || null;
  } catch (_e) { return null; }
}

function parseGeminiJSON(text) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(cleaned); } catch (_e) {}
  const start = cleaned.indexOf("{");
  const end   = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(cleaned.substring(start, end + 1)); } catch (_e) { return null; }
}

async function analyseWithGemini(description, key) {
  const sanitised = description.replace(/\r\n/g, "\n").substring(0, 8000);
  const systemMsg = "You are a job posting analyser. You MUST respond with ONLY a raw JSON object. No markdown, no backticks, no commentary, no text before or after the JSON. Just the JSON object.";
  const prompt = `Extract structured information from this job advertisement text. If any field is not mentioned in the text, use "N/A" for strings or empty arrays for lists.\n\nIMPORTANT: Separate the job ad's own screening/application questions from interview preparation questions you generate to help the applicant practise.\n\nJOB AD TEXT:\n"""\n${sanitised}\n"""\n\nRespond with ONLY this JSON structure (no other text):\n{"title":"job title","company":"company name","location":"city or region","salary":"salary if mentioned","description":"3-4 concise bullet points (each on a new line starting with • ) summarizing the core responsibilities and unique aspects of the role","requirements":["requirement 1","requirement 2","requirement 3"],"application_questions":[{"question":"screening question from the job ad itself"}],"interview_questions":[{"type":"Behavioral","question":"AI-generated practice question","answer":"A strong 3-4 sentence suggested answer using STAR method where appropriate"},{"type":"Technical","question":"...","answer":"..."},{"type":"Role-Specific","question":"...","answer":"..."},{"type":"Situational","question":"...","answer":"..."},{"type":"Culture Fit","question":"...","answer":"..."}],"company_facts":[{"label":"Industry","value":"..."},{"label":"Size","value":"..."},{"label":"Known For","value":"..."},{"label":"Culture","value":"..."}]}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4 },
    systemInstruction: { parts: [{ text: systemMsg }] },
  });

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || "";
        if (msg.includes("not found") || msg.includes("not supported") || res.status === 404) continue;
        break; // non-retryable error
      }
      const data = await res.json();
      const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!txt) break;
      return parseGeminiJSON(txt);
    } catch (_e) { continue; }
  }
  return null;
}

// ── Job builder ───────────────────────────────────────────────────────────────

function buildJob(scrapedData, analysed, status) {
  return {
    id:                   Date.now(),
    url:                  scrapedData.url          || "",
    title:                analysed?.title    || scrapedData.title    || "Unknown Title",
    company:              analysed?.company  || scrapedData.company  || "Unknown Company",
    location:             analysed?.location || scrapedData.location || "N/A",
    salary:               analysed?.salary   || scrapedData.salary   || "N/A",
    description:          analysed?.description || scrapedData.description || "",
    requirements:         analysed?.requirements         || [],
    application_questions: analysed?.application_questions || [],
    interview_questions:  analysed?.interview_questions  || [],
    company_facts:        analysed?.company_facts        || [],
    status,
    notes:                "",
    date:                 new Date().toISOString(),
    source:               "clipper",
    seen:                 false,
  };
}

// ── Clip handler ──────────────────────────────────────────────────────────────

async function handleClip() {
  if (!currentJob) return;

  const btn = document.getElementById("clip-btn");
  btn.disabled = true;

  const status = document.getElementById("job-status-select").value;

  // Attempt Gemini analysis if API key is available
  let analysed = null;
  if (currentJob.description) {
    btn.textContent = "Analysing…";
    const key = await getApiKey();
    if (key) analysed = await analyseWithGemini(currentJob.description, key);
  }

  btn.textContent = "Saving…";
  const job = buildJob(currentJob, analysed, status);

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
