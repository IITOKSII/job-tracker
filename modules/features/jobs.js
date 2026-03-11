// Job analysis: URL analyser, paste analyser, add-mode toggle, CV match.
// Owns the "Add Job" and "CV Match" views.

import { state } from "../state.js";
import { callGemini, parseJSON } from "../config/gemini.config.js";
import { saveJobs } from "../services/db.service.js";
import { setStatus, showErr, clearErr, scoreColor, toast } from "../ui/utils.js";
import { esc } from "../ui/utils.js";

// ── Add-mode tab toggle ──────────────────────────────────────────────────────

export function setAddMode(mode) {
  document.getElementById("add-mode-url").style.display   = mode === "url"   ? "" : "none";
  document.getElementById("add-mode-paste").style.display = mode === "paste" ? "" : "none";
  document.getElementById("add-tab-url").classList.toggle("active",   mode === "url");
  document.getElementById("add-tab-paste").classList.toggle("active", mode === "paste");
}

// ── Analyse from URL ─────────────────────────────────────────────────────────

export async function analyseJob() {
  const url = document.getElementById("url-input").value.trim();
  if (!url) { showErr("add-error", "Please enter a URL"); return; }
  const btn = document.getElementById("analyse-btn");
  btn.disabled = true;
  setStatus("add-status", "<span class='spinner'></span> Analysing job posting...");
  clearErr("add-error");
  try {
    const systemMsg = "You are a job posting analyser. You MUST respond with ONLY a raw JSON object. No markdown, no backticks, no commentary, no text before or after the JSON.";
    const prompt = `Analyse this job posting URL and extract all available information. If something is not available, use "N/A".\n\nURL: ${url}\n\nIMPORTANT: Separate the job ad's own screening/application questions (like notice period, work rights, availability, salary expectations, licences) from interview preparation questions.\n\nRespond with ONLY this JSON structure:\n{"title":"...","company":"...","location":"...","salary":"...","description":"2-3 sentence summary","requirements":["r1","r2","r3"],"application_questions":[{"question":"screening question from the job ad itself"}],"interview_questions":[{"type":"Behavioral","question":"AI-generated practice question","answer":"A strong 3-4 sentence suggested answer using STAR method where appropriate"},{"type":"Technical","question":"...","answer":"..."},{"type":"Role-Specific","question":"...","answer":"..."},{"type":"Situational","question":"...","answer":"..."},{"type":"Culture Fit","question":"...","answer":"..."}],"company_facts":[{"label":"Industry","value":"..."},{"label":"Size","value":"..."},{"label":"Known For","value":"..."},{"label":"Culture","value":"..."}]}`;
    const d = parseJSON(await callGemini(prompt, systemMsg));
    const job = {
      id: Date.now(), url, title: d.title || "Unknown Title", company: d.company || "Unknown Company",
      location: d.location || "N/A", salary: d.salary || "N/A", description: d.description || "",
      requirements: d.requirements || [], application_questions: d.application_questions || [],
      interview_questions: d.interview_questions || [], company_facts: d.company_facts || [],
      status: "applied", notes: "", date: new Date().toISOString(),
    };
    state.jobs.unshift(job);
    saveJobs();
    document.getElementById("url-input").value = "";
    setStatus("add-status", "");
    toast("Job added!", "ok");
    window.showView("dashboard");
  } catch (e) {
    setStatus("add-status", "");
    showErr("add-error", e.message?.includes("API_KEY")
      ? "Invalid API key. Check Settings."
      : "Couldn't analyse that URL. Make sure it's a public job posting.");
  } finally { btn.disabled = false; }
}

// ── Analyse from pasted text ─────────────────────────────────────────────────

export async function analyseJobText() {
  const raw = document.getElementById("paste-input").value.trim();
  if (!raw || raw.length < 30) { showErr("paste-error", "Please paste the full job ad text (at least a few sentences)."); return; }
  const btn = document.getElementById("analyse-paste-btn");
  btn.disabled = true;
  setStatus("paste-status", "<span class='spinner'></span> Analysing job ad...");
  clearErr("paste-error");
  try {
    const sanitised = raw.replace(/\r\n/g, "\n").substring(0, 8000);
    const systemMsg = "You are a job posting analyser. You MUST respond with ONLY a raw JSON object. No markdown, no backticks, no commentary, no text before or after the JSON. Just the JSON object.";
    const prompt = `Extract structured information from this job advertisement text. If any field is not mentioned in the text, use "N/A" for strings or empty arrays for lists. Infer the company name and other details from context if not explicitly stated.\n\nIMPORTANT: Separate the job ad's own screening/application questions from interview preparation questions you generate to help the applicant practise.\n\nJOB AD TEXT:\n"""\n${sanitised}\n"""\n\nRespond with ONLY this JSON structure (no other text):\n{"title":"job title","company":"company name","location":"city or region","salary":"salary if mentioned","description":"2-3 sentence summary of the role","requirements":["requirement 1","requirement 2","requirement 3"],"application_questions":[{"question":"screening question from the job ad itself"}],"interview_questions":[{"type":"Behavioral","question":"AI-generated practice question","answer":"A strong 3-4 sentence suggested answer using STAR method where appropriate"},{"type":"Technical","question":"...","answer":"..."},{"type":"Role-Specific","question":"...","answer":"..."},{"type":"Situational","question":"...","answer":"..."},{"type":"Culture Fit","question":"...","answer":"..."}],"company_facts":[{"label":"Industry","value":"..."},{"label":"Size","value":"..."},{"label":"Known For","value":"..."},{"label":"Culture","value":"..."}]}`;
    const d = parseJSON(await callGemini(prompt, systemMsg));
    const job = {
      id: Date.now(), url: "", title: d.title || "Unknown Title", company: d.company || "Unknown Company",
      location: d.location || "N/A", salary: d.salary || "N/A", description: d.description || "",
      requirements: d.requirements || [], application_questions: d.application_questions || [],
      interview_questions: d.interview_questions || [], company_facts: d.company_facts || [],
      status: "saved", notes: "", date: new Date().toISOString(), rawText: raw,
    };
    state.jobs.unshift(job);
    saveJobs();
    document.getElementById("paste-input").value = "";
    setStatus("paste-status", "");
    toast("Job added!", "ok");
    window.showView("dashboard");
  } catch (e) {
    setStatus("paste-status", "");
    const msg = e.message || "";
    if (msg.includes("API_KEY") || msg.includes("API key")) showErr("paste-error", "Invalid API key. Check Settings.");
    else if (msg.includes("quota") || msg.includes("429"))  showErr("paste-error", "API rate limit hit. Wait a moment and try again.");
    else showErr("paste-error", "Analysis failed: " + msg + ". Try pasting a longer or cleaner version of the ad.");
  } finally { btn.disabled = false; }
}

// ── CV Match view ────────────────────────────────────────────────────────────

export function renderCVJobList() {
  const el = document.getElementById("cv-job-list");
  if (!state.jobs.length) { el.innerHTML = '<p style="font-size:13px;color:var(--muted);padding:6px 0;">No jobs added yet.</p>'; return; }
  el.innerHTML = state.jobs.map(j =>
    `<div class="job-pick ${state.selectedCvJobId === j.id ? "sel" : ""}" onclick="selCvJob(${j.id})">
      <input type="radio" name="cvj" ${state.selectedCvJobId === j.id ? "checked" : ""} style="accent-color:var(--accent);width:14px;height:14px;flex-shrink:0;">
      <span style="font-size:13px;"><strong>${esc(j.title)}</strong> <span style="color:var(--muted)">\u2014 ${esc(j.company)}</span></span>
    </div>`
  ).join("");
}

export function selCvJob(id) { state.selectedCvJobId = id; renderCVJobList(); }

export async function analyseCV() {
  if (!state.selectedCvJobId) { showErr("cv-error", "Please select a job first."); return; }
  const cv = document.getElementById("cv-text").value.trim();
  if (!cv) { showErr("cv-error", "Please paste your CV first."); return; }
  const job = state.jobs.find(j => j.id === state.selectedCvJobId);
  if (!job) return;
  clearErr("cv-error");
  document.getElementById("cv-btn").disabled = true;
  document.getElementById("cv-result").innerHTML = "";
  setStatus("cv-status", "<span class='spinner'></span> Analysing your CV...");
  try {
    const prompt = `Analyse how well this CV matches the job. Return ONLY raw JSON.\nJOB: ${job.title} at ${job.company}\nDESCRIPTION: ${job.description}\nREQUIREMENTS: ${(job.requirements || []).join(", ")}\nCV:\n${cv}\nReturn exactly:\n{"score":75,"summary":"one sentence","strengths":["s1","s2","s3"],"gaps":["g1","g2","g3"],"skills_match":"brief","experience_match":"brief","recommendation":"one tip"}`;
    const d = parseJSON(await callGemini(prompt, "You are an expert recruitment analyst. Return raw JSON only."));
    const sc = parseInt(d.score) || 0;
    const col = scoreColor(sc);
    state.jobs = state.jobs.map(j => j.id === state.selectedCvJobId ? { ...j, matchScore: sc } : j);
    saveJobs();
    setStatus("cv-status", "");
    document.getElementById("cv-result").innerHTML =
      `<div class="match-result">
        <div style="display:flex;align-items:flex-end;gap:14px;margin-bottom:5px;">
          <div class="score-big" style="color:${col}">${sc}<span style="font-size:22px;color:var(--muted)">%</span></div>
          <div style="flex:1;padding-bottom:3px;">
            <p style="font-size:13px;color:var(--muted);margin-bottom:7px;">${esc(d.summary || "")}</p>
            <div class="bar-outer"><div class="bar-inner" id="score-bar" style="width:0%;background:${col}"></div></div>
          </div>
        </div>
        <div class="match-grid">
          <div class="match-box"><strong>Strengths</strong>${(d.strengths || []).map(s => `<div style="font-size:12px;color:var(--muted);padding:3px 0;border-bottom:1px solid var(--border)">+ ${esc(s)}</div>`).join("")}</div>
          <div class="match-box"><strong>Gaps</strong>${(d.gaps || []).map(g => `<div style="font-size:12px;color:var(--muted);padding:3px 0;border-bottom:1px solid var(--border)">- ${esc(g)}</div>`).join("")}</div>
          <div class="match-box"><strong>Skills Match</strong><p style="font-size:12px;color:var(--text);margin-top:4px;">${esc(d.skills_match || "")}</p></div>
          <div class="match-box"><strong>Experience Match</strong><p style="font-size:12px;color:var(--text);margin-top:4px;">${esc(d.experience_match || "")}</p></div>
        </div>
        ${d.recommendation ? `<div style="margin-top:11px;padding:12px 14px;background:rgba(232,184,75,0.07);border:1px solid rgba(232,184,75,0.2);border-radius:9px;font-size:13px;"><strong>Tip:</strong> ${esc(d.recommendation)}</div>` : ""}
        <div style="margin-top:9px;font-size:12px;color:var(--green);">Score saved to "${esc(job.title)}"</div>
      </div>`;
    setTimeout(() => { const b = document.getElementById("score-bar"); if (b) b.style.width = sc + "%"; }, 80);
  } catch (e) {
    setStatus("cv-status", "");
    showErr("cv-error", "Couldn't analyse CV. Please try again.");
  } finally { document.getElementById("cv-btn").disabled = false; }
}
