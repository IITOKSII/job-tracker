// Unified storage layer: Firestore → window.storage → localStorage.
// Also owns the save helpers for top-level collections (jobs, resumes, covers).

import { state, fb } from "../state.js";

// ── Core ref ────────────────────────────────────────────────────────────────

export function userDocRef(collection) {
  if (fb.ready && fb.user && fb.db)
    return fb.db.collection("users").doc(fb.user.uid).collection(collection);
  return null;
}

// ── Generic key/value store ─────────────────────────────────────────────────

export async function storeGet(key) {
  if (fb.ready && fb.user && fb.db) {
    try {
      const doc = await fb.db.collection("users").doc(fb.user.uid)
        .collection("settings").doc(key).get();
      return doc.exists ? doc.data().value : null;
    } catch (e) {}
  }
  try { if (window.storage) { const r = await window.storage.get(key); return r ? r.value : null; } } catch (e) {}
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

export async function storeSet(key, value) {
  if (fb.ready && fb.user && fb.db) {
    try {
      await fb.db.collection("users").doc(fb.user.uid)
        .collection("settings").doc(key)
        .set({ value, updated: new Date().toISOString() });
      // Mirror to chrome.storage.local so the Clipper extension can read it
      try { if (window.storage) await window.storage.set(key, value); } catch (e) {}
      return;
    } catch (e) {}
  }
  try { if (window.storage) { await window.storage.set(key, value); return; } } catch (e) {}
  try { localStorage.setItem(key, value); } catch (e) {}
}

// ── Firestore collection helpers ────────────────────────────────────────────

export async function fbSaveCollection(name, arr) {
  if (!fb.ready || !fb.user || !fb.db) return;
  try {
    await fb.db.collection("users").doc(fb.user.uid)
      .collection("data").doc(name)
      .set({ items: JSON.stringify(arr), updated: new Date().toISOString() });
  } catch (e) { console.warn("Firebase save error:", e); }
}

export async function fbLoadCollection(name) {
  if (!fb.ready || !fb.user || !fb.db) return null;
  try {
    const doc = await fb.db.collection("users").doc(fb.user.uid)
      .collection("data").doc(name).get();
    if (doc.exists && doc.data().items) return JSON.parse(doc.data().items);
  } catch (e) {}
  return null;
}

// ── Top-level collection savers ─────────────────────────────────────────────

export function saveJobs()    { storeSet("jt_jobs",    JSON.stringify(state.jobs));    fbSaveCollection("jobs",    state.jobs); }
export function saveResumes() { storeSet("jt_resumes", JSON.stringify(state.resumes)); fbSaveCollection("resumes", state.resumes); }
export function saveCovers()  { storeSet("jt_covers",  JSON.stringify(state.covers));  fbSaveCollection("covers",  state.covers); }
