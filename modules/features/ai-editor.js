// AI document editing: rewrite, cover letter generator, resume generator, tailor resume.
// Export/import data also lives here.

import { state } from "../state.js";
import { SYDNEY_RECRUITER, RESUME_EXPERT } from "../assets/ai-prompts.js";
import { callGemini } from "../config/gemini.config.js";
import { saveResumes, saveCovers, saveJobs } from "../services/db.service.js";
import { esc, toast } from "../ui/utils.js";
import { updateWordCount, setEditorMode } from "./preview-engine.js";
import { editDocument, populateCoverJobSelect } from "./documents.js";

// ── AI rewrite ───────────────────────────────────────────────────────────────

export function toggleAIPanel(type) {
  const panel = document.getElementById(type + "-ai-panel");
  panel.style.display = panel.style.display === "none" ? "" : "none";
}

export function setInstruction(type, text) {
  document.getElementById(type + "-ai-instruction").value = text;
}

export async function aiEditDocument(type) {
  const content     = document.getElementById(type + "-textarea").value.trim();
  const instruction = document.getElementById(type + "-ai-instruction").value.trim();
  if (!content)     { toast("Document is empty",          "err"); return; }
  if (!instruction) { toast("Please enter an instruction", "err"); return; }

  let jobContext = "", resumeContext = "";
  const jobSel = document.getElementById(type === "resume" ? "resume-job-select" : "cover-job-select");
  if (jobSel) {
    const jobId = parseInt(jobSel.value);
    if (jobId) {
      const job = state.jobs.find(j => j.id === jobId);
      if (job) jobContext = `\n\nTARGET JOB: ${job.title} at ${job.company}\nJOB DESCRIPTION: ${job.description}\nKEY REQUIREMENTS: ${(job.requirements || []).join(", ")}`;
    }
  }
  if (type === "cover") {
    const rsel = document.getElementById("cover-resume-select");
    if (rsel) { const rid = parseInt(rsel.value); if (rid) { const r = state.resumes.find(x => x.id === rid); if (r) resumeContext = `\n\nCANDIDATE RESUME:\n${r.content}`; } }
  }

  const btn      = document.getElementById(type + "-ai-btn");
  const statusEl = document.getElementById(type + "-ai-status");
  btn.disabled = true;
  statusEl.innerHTML = "<span class='spinner'></span> Rewriting...";
  try {
    const dt           = type === "resume" ? "resume" : "cover letter";
    const systemPrompt = type === "resume" ? RESUME_EXPERT : SYDNEY_RECRUITER;
    const rewritten    = await callGemini(
      `The candidate has the following ${dt}:\n\n${content}${jobContext}${resumeContext}\n\nYour task: ${instruction}\n\nReturn only the rewritten ${dt} text. No commentary, no explanation.`,
      systemPrompt
    );
    document.getElementById(type + "-textarea").value = rewritten.trim();
    updateWordCount(type);
    statusEl.textContent = "Done!";
    setTimeout(() => statusEl.textContent = "", 2500);
    setTimeout(() => setEditorMode(type, "preview"), 150);
  } catch (e) {
    statusEl.textContent = "Failed. Try again.";
    setTimeout(() => statusEl.textContent = "", 3000);
  } finally { btn.disabled = false; }
}

// ── Cover letter generator (from modal) ──────────────────────────────────────

export function newDocumentFromJob() {
  if (!state.jobs.length) { toast("Add some jobs first", "err"); return; }
  document.getElementById("gen-job-select").innerHTML = state.jobs.map(j =>
    `<option value="${j.id}">${esc(j.title)} \u2014 ${esc(j.company)}</option>`
  ).join("");
  document.getElementById("gen-resume-select").innerHTML =
    '<option value="">Paste manually below</option>' + state.resumes.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join("");
  document.getElementById("gen-resume-text").value = "";
  document.getElementById("gen-extra").value = "";
  window.clearErr("gen-error");
  document.getElementById("gen-status").textContent = "";
  document.getElementById("gen-btn").disabled = false;
  document.getElementById("gen-modal").style.display = "flex";
}

export function closeGenModal() { document.getElementById("gen-modal").style.display = "none"; }

export function fillResumeFromSaved() {
  const id = parseInt(document.getElementById("gen-resume-select").value); if (!id) return;
  const r  = state.resumes.find(x => x.id === id);
  if (r) document.getElementById("gen-resume-text").value = r.content;
}

export async function generateCoverLetter() {
  const jobId      = parseInt(document.getElementById("gen-job-select").value);
  const job        = state.jobs.find(j => j.id === jobId);
  const resumeText = document.getElementById("gen-resume-text").value.trim();
  const extra      = document.getElementById("gen-extra").value.trim();
  if (!job)        { window.showErr("gen-error", "Please select a job.");          return; }
  if (!resumeText) { window.showErr("gen-error", "Please paste or select your resume."); return; }
  window.clearErr("gen-error");

  const btn = document.getElementById("gen-btn");
  btn.disabled = true;
  document.getElementById("gen-status").innerHTML = "<span class='spinner'></span> Writing your cover letter...";
  try {
    const today      = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    const coverText  = await callGemini(
      `Write a compelling, tailored cover letter for this job application.\n\nTODAY'S DATE: ${today}\nJOB TITLE: ${job.title}\nCOMPANY: ${job.company}\nLOCATION: ${job.location}\nJOB DESCRIPTION: ${job.description}\nKEY REQUIREMENTS: ${(job.requirements || []).join(", ")}\n\nCANDIDATE RESUME:\n${resumeText}\n\n${extra ? "ADDITIONAL INSTRUCTIONS: " + extra + "\n\n" : ""}Write a professional cover letter tailored to this role. Use Australian spelling. Use the date provided above \u2014 never invent a date. Return only the cover letter text.`,
      SYDNEY_RECRUITER
    );
    document.getElementById("gen-status").textContent = "";
    closeGenModal();
    const now     = new Date().toISOString();
    const content = coverText.trim();
    const newDoc  = { id: Date.now(), name: `${job.title} \u2014 ${job.company}`, content, wordCount: content.split(/\s+/).filter(Boolean).length, created: now, updated: now };
    state.covers.unshift(newDoc);
    saveCovers();
    editDocument("cover", newDoc.id);
    window.showView("covers");
    document.getElementById("cover-list-view").style.display   = "none";
    document.getElementById("cover-editor-view").style.display = "";
    toast("Cover letter generated and saved!", "ok");
    setTimeout(() => setEditorMode("cover", "preview"), 100);
  } catch (e) {
    document.getElementById("gen-status").textContent = "";
    window.showErr("gen-error", "Generation failed: " + (e.message || "Please try again."));
  } finally { btn.disabled = false; }
}

// ── Resume generator ─────────────────────────────────────────────────────────

export function openResumeGenerator() {
  document.getElementById("rgen-name").value       = "";
  document.getElementById("rgen-target").value     = "";
  document.getElementById("rgen-background").value = "";
  document.getElementById("rgen-extra").value      = "";
  document.getElementById("rgen-job-select").innerHTML =
    `<option value="">General resume \u2014 no specific job</option>` +
    state.jobs.map(j => `<option value="${j.id}">${esc(j.title)} \u2014 ${esc(j.company)}</option>`).join("");
  window.clearErr("rgen-error");
  document.getElementById("rgen-status").textContent = "";
  document.getElementById("rgen-btn").disabled = false;
  document.getElementById("resume-gen-modal").style.display = "flex";
}

export function closeResumeGenModal() { document.getElementById("resume-gen-modal").style.display = "none"; }

export async function generateResume() {
  const name       = document.getElementById("rgen-name").value.trim();
  const target     = document.getElementById("rgen-target").value.trim();
  const background = document.getElementById("rgen-background").value.trim();
  const extra      = document.getElementById("rgen-extra").value.trim();
  if (!background || background.length < 50) {
    window.showErr("rgen-error", "Please provide more detail about your background (at least a paragraph).");
    return;
  }
  window.clearErr("rgen-error");

  const btn = document.getElementById("rgen-btn");
  btn.disabled = true;
  document.getElementById("rgen-status").innerHTML = "<span class='spinner'></span> Crafting your resume...";

  let jobContext = "";
  const jobId = parseInt(document.getElementById("rgen-job-select").value);
  if (jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (job) jobContext = `\n\nTARGET JOB TO TAILOR FOR:\nTitle: ${job.title}\nCompany: ${job.company}\nDescription: ${job.description}\nKey Requirements: ${(job.requirements || []).join(", ")}`;
  }

  try {
    const prompt = `Generate a complete, professional resume from the following information.\n\n${name ? "CANDIDATE NAME & CONTACT:\n" + name + "\n\n" : ""}${target ? "TARGET ROLE / INDUSTRY:\n" + target + "\n\n" : ""}BACKGROUND & EXPERIENCE:\n${background}${jobContext}${extra ? "\n\nADDITIONAL INSTRUCTIONS: " + extra : ""}\n\nGenerate the full resume text now. Include all standard sections. Make every bullet achievement-focused with metrics where possible. Return only the resume text.`;
    const resumeText = await callGemini(prompt, RESUME_EXPERT);
    document.getElementById("rgen-status").textContent = "";
    closeResumeGenModal();
    const now       = new Date().toISOString();
    const content   = resumeText.trim();
    const resumeName = target || (name ? name.split("|")[0].trim() + " Resume" : "New Resume");
    const newDoc    = { id: Date.now(), name: resumeName, content, wordCount: content.split(/\s+/).filter(Boolean).length, created: now, updated: now };
    state.resumes.unshift(newDoc);
    saveResumes();
    editDocument("resume", newDoc.id);
    window.showView("resumes");
    document.getElementById("resume-list-view").style.display   = "none";
    document.getElementById("resume-editor-view").style.display = "";
    toast("Resume generated and saved!", "ok");
    setTimeout(() => setEditorMode("resume", "preview"), 100);
  } catch (e) {
    document.getElementById("rgen-status").textContent = "";
    window.showErr("rgen-error", "Generation failed: " + (e.message || "Please try again."));
  } finally { btn.disabled = false; }
}

// ── Auto-tailor resume ───────────────────────────────────────────────────────

export async function autoTailorResume(jobId) {
  const j = state.jobs.find(x => x.id === jobId); if (!j) return;
  if (!state.resumes.length) { toast("No resumes saved yet", "err"); return; }

  let src = state.resumes[0];
  if (state.resumes.length > 1) {
    const pick = prompt("Which resume to tailor? Enter number:\n" + state.resumes.map((r, i) => (i + 1) + ". " + r.name).join("\n"));
    if (!pick) return;
    const idx = parseInt(pick) - 1;
    if (idx >= 0 && idx < state.resumes.length) src = state.resumes[idx];
    else { toast("Invalid selection", "err"); return; }
  }
  toast("Tailoring resume for " + j.title + "...", "ok");
  try {
    const prompt = `You have this resume:\n\n${src.content}\n\nTailor it specifically for this job:\nTitle: ${j.title}\nCompany: ${j.company}\nDescription: ${j.description || "N/A"}\nRequirements: ${(j.requirements || []).join(", ")}\n\nRewrite the resume to emphasise relevant experience, match key requirements, and use keywords from the job posting. Keep the same structure but tailor every bullet point. Return only the rewritten resume text.`;
    const result = await callGemini(prompt, RESUME_EXPERT);
    const now    = new Date().toISOString();
    const newDoc = { id: Date.now(), name: `${src.name} \u2014 ${j.company}`, content: result.trim(), wordCount: result.split(/\s+/).filter(Boolean).length, created: now, updated: now };
    state.resumes.unshift(newDoc);
    saveResumes();
    toast("Tailored resume created!", "ok");
    window.closeModal();
    editDocument("resume", newDoc.id);
    window.showView("resumes");
    document.getElementById("resume-list-view").style.display   = "none";
    document.getElementById("resume-editor-view").style.display = "";
    setTimeout(() => setEditorMode("resume", "preview"), 100);
  } catch (e) { toast("Tailoring failed: " + e.message, "err"); }
}

// ── Export / Import ──────────────────────────────────────────────────────────

export function exportAllData() {
  const data = { version: 1, exported: new Date().toISOString(), jobs: state.jobs, resumes: state.resumes, covers: state.covers };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href     = URL.createObjectURL(blob);
  link.download = "JobTrack_Backup_" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  URL.revokeObjectURL(link.href);
  toast("Backup exported!", "ok");
}

export function importAllData(e) {
  const file = e.target.files[0]; if (!file) return;
  const msg  = document.getElementById("import-msg");
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.jobs && !data.resumes && !data.covers) throw new Error("Invalid backup file");
      const existingJobIds    = new Set(state.jobs.map(j => j.id));
      const existingResumeIds = new Set(state.resumes.map(r => r.id));
      const existingCoverIds  = new Set(state.covers.map(c => c.id));
      let added = { j: 0, r: 0, c: 0 };
      if (data.jobs)    data.jobs.forEach(j    => { if (!existingJobIds.has(j.id))       { state.jobs.unshift(j);       added.j++; } });
      if (data.resumes) data.resumes.forEach(r => { if (!existingResumeIds.has(r.id)) { state.resumes.unshift(r); added.r++; } });
      if (data.covers)  data.covers.forEach(c  => { if (!existingCoverIds.has(c.id))   { state.covers.unshift(c);  added.c++; } });
      saveJobs(); saveResumes(); saveCovers();
      msg.style.display = "block"; msg.style.color = "var(--green)";
      msg.textContent = `Imported: ${added.j} jobs, ${added.r} resumes, ${added.c} covers`;
      window.renderDashboard();
      setTimeout(() => msg.style.display = "none", 4000);
    } catch (err) {
      msg.style.display = "block"; msg.style.color = "var(--red)";
      msg.textContent = "Import failed: " + err.message;
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}
