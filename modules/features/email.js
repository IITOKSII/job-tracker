// Email template view: template selector, AI personalisation, copy, save-as-cover.

import { state } from "../state.js";
import { EMAIL_TEMPLATES } from "../assets/email-templates.js";
import { SYDNEY_RECRUITER } from "../assets/ai-prompts.js";
import { callGemini, parseJSON } from "../config/gemini.config.js";
import { saveCovers } from "../services/db.service.js";
import { esc, toast } from "../ui/utils.js";

export function renderEmailTemplates() {
  document.getElementById("tpl-grid").innerHTML = EMAIL_TEMPLATES.map(t =>
    `<div class="tpl-card ${state.activeTemplate === t.id ? "sel" : ""}" onclick="selectTemplate('${t.id}')">
      <div class="tpl-icon">${t.icon}</div>
      <div class="tpl-name">${t.name}</div>
      <div class="tpl-desc">${t.desc}</div>
    </div>`
  ).join("");

  const sel = document.getElementById("email-job-select");
  sel.innerHTML = '<option value="">Select a saved job...</option>' +
    state.jobs.map(j => `<option value="${j.id}">${esc(j.title)} \u2014 ${esc(j.company)}</option>`).join("");

  if (state.activeTemplate) document.getElementById("email-preview").style.display = "";
}

export function selectTemplate(id) {
  state.activeTemplate = id;
  const tpl = EMAIL_TEMPLATES.find(t => t.id === id); if (!tpl) return;
  document.getElementById("email-subject").value = tpl.subject;
  document.getElementById("email-body").value    = tpl.body;
  updateEmailWC();
  document.getElementById("email-preview").style.display = "";
  document.querySelectorAll(".tpl-card").forEach((c, i) => c.classList.toggle("sel", EMAIL_TEMPLATES[i]?.id === id));
}

export function updateEmailWC() {
  const body = document.getElementById("email-body")?.value || "";
  const el   = document.getElementById("email-wordcount");
  if (el) el.textContent = body.split(/\s+/).filter(Boolean).length + " words";
}

export async function generateEmailFromJob() {
  const jobId = parseInt(document.getElementById("email-job-select").value);
  if (!jobId)               { toast("Select a job first",        "err"); return; }
  if (!state.activeTemplate){ toast("Select an email type first", "err"); return; }
  const job = state.jobs.find(j => j.id === jobId);
  const tpl = EMAIL_TEMPLATES.find(t => t.id === state.activeTemplate);
  if (!job || !tpl) return;

  const btn      = document.getElementById("gen-email-btn");
  const statusEl = document.getElementById("email-gen-status");
  btn.disabled = true;
  statusEl.innerHTML = "<span class='spinner'></span> Generating...";
  try {
    const result = await callGemini(
      `Write a professional follow-up email.\n\nEMAIL TYPE: ${tpl.name}\nJOB TITLE: ${job.title}\nCOMPANY: ${job.company}\n\nReturn raw JSON only with two fields: {"subject":"email subject","body":"full email body"}`,
      SYDNEY_RECRUITER
    );
    const data = parseJSON(result);
    document.getElementById("email-subject").value = data.subject || tpl.subject;
    document.getElementById("email-body").value    = data.body    || tpl.body;
    updateEmailWC();
    document.getElementById("email-preview").style.display = "";
    statusEl.textContent = "Done!";
    setTimeout(() => statusEl.textContent = "", 2500);
  } catch (e) {
    statusEl.textContent = "Failed. Try again.";
    setTimeout(() => statusEl.textContent = "", 3000);
  } finally { btn.disabled = false; }
}

export function copyEmail() {
  const subject = document.getElementById("email-subject").value;
  const body    = document.getElementById("email-body").value;
  navigator.clipboard.writeText("Subject: " + subject + "\n\n" + body)
    .then(() => toast("Copied!", "ok"))
    .catch(() => toast("Please select and copy manually", "err"));
}

export function saveEmailAsCover() {
  const name    = document.getElementById("email-subject").value || "Follow-up Email";
  const content = document.getElementById("email-body").value.trim();
  if (!content) { toast("Email is empty", "err"); return; }
  const now = new Date().toISOString();
  state.covers.unshift({ id: Date.now(), name, content, wordCount: content.split(/\s+/).filter(Boolean).length, created: now, updated: now });
  saveCovers();
  toast("Saved to Cover Letters!", "ok");
}

// Wire up live word count after DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const eb = document.getElementById("email-body");
  if (eb) eb.addEventListener("input", updateEmailWC);
});
