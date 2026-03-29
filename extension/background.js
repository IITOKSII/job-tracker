// WorkAble Clipper — background.js (MV3 Service Worker)
// Handles persistent storage operations for job clipping.
// Storage format mirrors WorkAble's db.service.js storeGet/storeSet contract:
//   chrome.storage.local key "jt_jobs" → { value: "[{...}]" }

"use strict";

// ── Message router ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "SAVE_JOB") {
    saveJob(msg.job)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true; // keep channel open for async response
  }

  if (msg.type === "GET_JOB_COUNT") {
    getJobCount()
      .then(count => sendResponse({ ok: true, count }))
      .catch(() => sendResponse({ ok: true, count: 0 }));
    return true;
  }

  if (msg.type === "CHECK_DUPLICATE") {
    isDuplicate(msg.url)
      .then(dup => sendResponse({ ok: true, duplicate: dup }))
      .catch(() => sendResponse({ ok: true, duplicate: false }));
    return true;
  }
});

// ── Storage helpers ───────────────────────────────────────────────────────────

function getJobs() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("jt_jobs", data => {
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      try {
        const raw = data.jt_jobs?.value;
        resolve(raw ? JSON.parse(raw) : []);
      } catch (e) { resolve([]); }
    });
  });
}

function setJobs(jobs) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      { jt_jobs: { value: JSON.stringify(jobs) } },
      () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      }
    );
  });
}

// ── URL normalisation ─────────────────────────────────────────────────────────
// Strips query parameters and trailing slashes so tracking variants of the
// same job URL (e.g. ?refId=xyz, ?trackingId=abc) are treated as duplicates.

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return (u.origin + u.pathname).replace(/\/+$/, "").toLowerCase();
  } catch (_e) {
    return url.split("?")[0].replace(/\/+$/, "").toLowerCase();
  }
}

async function saveJob(job) {
  const jobs = await getJobs();

  // Duplicate check by normalised URL (skip for jobs with no URL)
  if (job.url) {
    const norm = normalizeUrl(job.url);
    if (jobs.some(j => j.url && normalizeUrl(j.url) === norm)) {
      throw new Error("DUPLICATE");
    }
  }

  jobs.unshift(job);
  await setJobs(jobs);
}

async function getJobCount() {
  const jobs = await getJobs();
  return jobs.length;
}

async function isDuplicate(url) {
  if (!url) return false;
  const norm = normalizeUrl(url);
  const jobs = await getJobs();
  return jobs.some(j => j.url && normalizeUrl(j.url) === norm);
}
