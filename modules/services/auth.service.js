// Firebase auth: sign-in, sign-out, auth-state listener, and master data loader.
// Also owns the API-key save/update flows (they gate access to the app).

import { state, fb } from "../state.js";
import { isFirebaseConfigured, initFirebase } from "../config/firebase.config.js";
import { storeGet, storeSet, fbLoadCollection } from "./db.service.js";
import { toast } from "../ui/utils.js";

// ── Google Sign-in / Sign-out ────────────────────────────────────────────────

export async function signInWithGoogle() {
  if (!fb.ready) { toast("Firebase not configured", "err"); return; }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(provider);
  } catch (e) {
    if (e.code !== "auth/popup-closed-by-user") toast("Sign-in failed: " + e.message, "err");
  }
}

export function signOut() {
  if (!fb.ready) return;
  firebase.auth().signOut();
  fb.user = null;
  state.jobs = []; state.resumes = []; state.covers = []; fb.apiKey = "";
  document.getElementById("app").style.display = "none";
  document.getElementById("setup-screen").style.display = "block";
  updateAuthUI();
}

// ── Auth status UI ───────────────────────────────────────────────────────────

const GOOGLE_BTN = `<button class="btn btn-primary btn-sm" onclick="signInWithGoogle()" style="gap:6px;"><svg width="14" height="14" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg> Sign in with Google</button>`;

export function updateAuthUI() {
  const indicator      = document.getElementById("auth-indicator");
  const settingsStatus = document.getElementById("settings-auth-status");
  const settingsActions = document.getElementById("settings-auth-actions");

  if (fb.user) {
    const name  = fb.user.displayName || fb.user.email || "User";
    const email = fb.user.email || "";
    const photo = fb.user.photoURL;
    if (indicator) {
      indicator.innerHTML =
        (photo ? `<img src="${photo}" style="width:22px;height:22px;border-radius:50%;border:1.5px solid var(--border);">` : "") +
        `<span style="font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100px;">${name.split(" ")[0]}</span>` +
        `<button class="btn-sm" style="font-size:10px;padding:3px 8px;background:var(--surface2);border:1px solid var(--border);color:var(--muted);border-radius:5px;cursor:pointer;" onclick="signOut()">Sign Out</button>`;
    }
    if (settingsStatus) settingsStatus.innerHTML =
      `<span style="color:var(--green);">&#9679;</span> Signed in as <strong style="color:var(--text);">${name}</strong>${email ? " (" + email + ")" : ""}<br>Your data syncs to the cloud automatically.`;
    if (settingsActions) settingsActions.innerHTML =
      `<button class="btn btn-ghost btn-sm" onclick="signOut()">Sign Out</button>`;

  } else if (isFirebaseConfigured()) {
    if (indicator) indicator.innerHTML =
      `<button class="btn btn-sm btn-ghost" style="width:100%;justify-content:center;" onclick="signInWithGoogle()">Sign In</button>`;
    if (settingsStatus) settingsStatus.innerHTML =
      `<span style="color:var(--muted);">&#9679;</span> Not signed in. Sign in with Google to sync your data across devices.`;
    if (settingsActions) settingsActions.innerHTML = GOOGLE_BTN;

  } else {
    if (indicator) indicator.innerHTML =
      `<span style="font-size:10px;color:var(--muted);">Local mode</span>`;
    if (settingsStatus) settingsStatus.innerHTML =
      `Running in local mode. To enable cloud sync, configure Firebase in <code>modules/config/firebase.config.js</code>.`;
    if (settingsActions) settingsActions.innerHTML = "";
  }
}

// ── Master data loader (called once on app start) ────────────────────────────

export async function loadAllData() {
  const fbOk = initFirebase();
  const setupAuth = document.getElementById("setup-auth");
  if (setupAuth && fbOk) setupAuth.style.display = "block";

  if (fbOk) {
    firebase.auth().onAuthStateChanged(async (user) => {
      fb.user = user;
      updateAuthUI();
      if (user) {
        const [fj, fr, fc] = await Promise.all([
          fbLoadCollection("jobs"), fbLoadCollection("resumes"), fbLoadCollection("covers"),
        ]);
        if (fj) state.jobs    = fj;
        if (fr) state.resumes = fr;
        if (fc) state.covers  = fc;
        // Merge any clipper jobs stored locally by the extension (not yet in Firestore)
        try {
          if (window.storage) {
            const r = await window.storage.get("jt_jobs");
            if (r?.value) {
              const clipped = JSON.parse(r.value);
              if (clipped.length) {
                const ids = new Set(state.jobs.map(j => j.id));
                const newOnes = clipped.filter(j => !ids.has(j.id));
                if (newOnes.length) state.jobs = [...newOnes, ...state.jobs];
              }
            }
          }
        } catch (_e) {}
        const [k, rt, ct, wm] = await Promise.all([
          storeGet("gemini_key"), storeGet("jt_resume_tpl"),
          storeGet("jt_cover_tpl"), storeGet("jt_gemini_model"),
        ]);
        fb.apiKey            = k  || "";
        state.resumeTemplate = rt || "modern";
        state.coverTemplate  = ct || "modern";
        fb.workingModel      = wm || "";
        document.getElementById("loading-screen").style.display = "none";
        if (fb.apiKey) {
          document.getElementById("setup-screen").style.display = "none";
          document.getElementById("app").style.display = "flex";
          window.renderDashboard();
        } else {
          document.getElementById("setup-screen").style.display = "block";
        }
      } else {
        document.getElementById("loading-screen").style.display = "none";
        document.getElementById("setup-screen").style.display = "block";
      }
    });
  } else {
    try {
      const [j, r, c, k, rt, ct, wm] = await Promise.all([
        storeGet("jt_jobs"), storeGet("jt_resumes"), storeGet("jt_covers"),
        storeGet("gemini_key"), storeGet("jt_resume_tpl"),
        storeGet("jt_cover_tpl"), storeGet("jt_gemini_model"),
      ]);
      state.jobs    = j ? JSON.parse(j) : [];
      state.resumes = r ? JSON.parse(r) : [];
      state.covers  = c ? JSON.parse(c) : [];
      fb.apiKey            = k  || "";
      state.resumeTemplate = rt || "modern";
      state.coverTemplate  = ct || "modern";
      fb.workingModel      = wm || "";
    } catch (e) { console.error("Load error:", e); }
    document.getElementById("loading-screen").style.display = "none";
    if (fb.apiKey) {
      document.getElementById("app").style.display = "flex";
      document.getElementById("setup-screen").style.display = "none";
      window.renderDashboard();
    } else {
      document.getElementById("setup-screen").style.display = "block";
    }
  }
  updateAuthUI();
}

// ── API key management ───────────────────────────────────────────────────────

export async function saveKey() {
  const k = document.getElementById("key-input").value.trim();
  if (!k || k.length < 20) { document.getElementById("key-error").style.display = "block"; return; }
  fb.apiKey = k;
  await storeSet("gemini_key", k);
  document.getElementById("setup-screen").style.display = "none";
  document.getElementById("app").style.display = "flex";
  window.renderDashboard();
}

export async function updateKey() {
  const k   = document.getElementById("new-key-input").value.trim();
  const msg = document.getElementById("key-update-msg");
  if (!k || k.length < 20) {
    msg.style.display = "block"; msg.style.color = "var(--red)"; msg.textContent = "Invalid key."; return;
  }
  fb.apiKey = k;
  await storeSet("gemini_key", k);
  msg.style.display = "block"; msg.style.color = "var(--green)"; msg.textContent = "Key updated!";
  setTimeout(() => msg.style.display = "none", 2500);
}
