// Job detail modal: open/close, status update, notes, timeline, checklist.

import { state } from "../state.js";
import { STATUS, STATUS_ORDER, CHECKLIST_ITEMS } from "../assets/constants.js";
import { esc, scoreColor, toast } from "../ui/utils.js";
import { saveJobs } from "../services/db.service.js";
import { ttsBtnHTML } from "../a11y/tts.js";

// ── Open / Close ─────────────────────────────────────────────────────────────

export function openModal(id) {
  const j = state.jobs.find(x => x.id === id); if (!j) return;
  state.currentJobId = id;
  // Clear "New" badge on first open
  if (j.source === "clipper" && !j.seen) { j.seen = true; saveJobs(); }

  document.getElementById("m-company").textContent = j.company;
  document.getElementById("m-title").textContent   = j.title;

  document.getElementById("m-meta").innerHTML = [
    j.location !== "N/A" ? _mi("\u{1F4CD}", "Location",  j.location) : "",
    j.salary   !== "N/A" ? _mi("\u{1F4B0}", "Salary",    j.salary)   : "",
    _mi("\u{1F4C5}", "Added", new Date(j.date).toLocaleDateString()),
    j.url       ? `<div class="meta-item"><span style="font-size:14px">\u{1F517}</span><div><div class="meta-label">Posting</div><div class="meta-val"><a href="${j.url}" target="_blank" style="color:var(--accent);text-decoration:none;">View Job</a></div></div></div>` : "",
    j.matchScore ? `<div class="meta-item"><span style="font-size:14px">\u{1F3AF}</span><div><div class="meta-label">CV Match</div><div class="meta-val" style="color:${scoreColor(j.matchScore)};font-weight:700;">${j.matchScore}%</div></div></div>` : "",
  ].join("");

  document.getElementById("m-status").innerHTML = STATUS_ORDER.map(s => {
    const m = STATUS[s]; const a = j.status === s;
    return `<button class="status-opt" style="${a ? `color:${m.color};border-color:${m.color};background:${m.color}18` : ""}" onclick="updateStatus('${s}')">${m.label}</button>`;
  }).join("");

  if (j.description) {
    document.getElementById("m-desc").innerHTML =
      `<p>${esc(j.description)}${ttsBtnHTML(j.description)}</p>` +
      ((j.requirements || []).length
        ? `<ul style="padding-left:17px;margin-top:9px;">${(j.requirements || []).map(r => `<li style="font-size:13px;color:var(--muted);margin-bottom:2px;">${esc(r)}</li>`).join("")}</ul>`
        : "");
    document.getElementById("m-desc-sec").style.display = "";
  } else {
    document.getElementById("m-desc-sec").style.display = "none";
  }

  if (j.application_questions?.length) {
    document.getElementById("m-app-questions").innerHTML = j.application_questions.map(q =>
      `<div class="aq-item"><span class="aq-type">Application Question</span>${esc(q.question)}${ttsBtnHTML(q.question)}</div>`
    ).join("");
    document.getElementById("m-aq-sec").style.display = "";
  } else {
    document.getElementById("m-aq-sec").style.display = "none";
  }

  if (j.interview_questions?.length) {
    document.getElementById("m-questions").innerHTML = j.interview_questions.map((q) =>
      `<div class="q-item">
        <span class="q-type">${esc(q.type)}</span>${esc(q.question)}${ttsBtnHTML(q.question)}
        ${q.answer
          ? `<button class="q-toggle" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.textContent=this.nextElementSibling.style.display==='none'?'Show Answer':'Hide Answer'">Show Answer</button>
             <div class="q-answer" style="display:none;">${esc(q.answer)}${ttsBtnHTML(q.answer)}</div>`
          : ""}
      </div>`
    ).join("");
    document.getElementById("m-q-sec").style.display = "";
  } else {
    document.getElementById("m-q-sec").style.display = "none";
  }

  if (j.company_facts?.length) {
    document.getElementById("m-facts").innerHTML = j.company_facts.map(f =>
      `<div class="fact-item"><span class="fact-label">${esc(f.label)}</span>${esc(f.value)}${ttsBtnHTML(f.label + ": " + f.value)}</div>`
    ).join("");
    document.getElementById("m-facts-sec").style.display = "";
  } else {
    document.getElementById("m-facts-sec").style.display = "none";
  }

  document.getElementById("m-notes").value = j.notes || "";

  const isec = document.getElementById("m-interview-sec");
  if (j.status === "interview" || j.interviewDate || j.interviewType) {
    isec.style.display = "";
    document.getElementById("m-interview-date").value = j.interviewDate || "";
    document.getElementById("m-interview-type").value = j.interviewType || "";
    _refreshInterviewStatus(j);
  } else {
    isec.style.display = "none";
  }

  document.getElementById("m-actions").innerHTML =
    `<button class="btn btn-primary" onclick="saveNotes()">Save Notes</button>` +
    (j.url ? `<a href="${j.url}" target="_blank" class="btn btn-ghost">Open Job</a>` : "") +
    `<button class="btn btn-ghost btn-sm" onclick="quickGenCoverFromModal(${j.id})">Write Cover Letter</button>` +
    (state.resumes.length ? `<button class="btn btn-ghost btn-sm" onclick="autoTailorResume(${j.id})">&#9997; Tailor Resume</button>` : "") +
    `<button class="btn btn-ghost btn-sm" onclick="openAccommodationModal(${j.id})">&#9855; Request Accommodations</button>` +
    `<button class="btn btn-danger btn-sm" style="margin-left:auto;" onclick="deleteFromModal()">Delete</button>`;

  renderTimeline(j);
  renderChecklist(j);
  document.getElementById("modal").style.display = "flex";
  document.addEventListener("keydown", _modalKeyHandler);
  // Focus job title so screen readers announce dialog with full job context, not "Close"
  setTimeout(() => {
    const t = document.getElementById("m-title");
    if (t) { t.setAttribute("tabindex", "-1"); t.focus(); }
  }, 100);
}

export function closeModal() {
  document.getElementById("modal").style.display = "none";
  state.currentJobId = null;
  document.removeEventListener("keydown", _modalKeyHandler);
}

function _modalKeyHandler(e) {
  if (e.key === "Escape") { closeModal(); return; }
  if (e.key === "Tab") {
    const modal    = document.querySelector("#modal .modal"); if (!modal) return;
    const focusable = modal.querySelectorAll("button,input,select,textarea,[tabindex]:not([tabindex='-1'])");
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first)  { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

// ── Status ───────────────────────────────────────────────────────────────────

export function updateStatus(s) {
  const j = state.jobs.find(x => x.id === state.currentJobId); if (!j) return;
  j.status = s;
  if (s === "applied"   && !j.appliedDate)        j.appliedDate        = new Date().toISOString();
  if (s === "interview" && !j.interviewStatusDate) j.interviewStatusDate = new Date().toISOString();
  if (s === "offer"     && !j.offerDate)           j.offerDate          = new Date().toISOString();
  if (s === "rejected"  && !j.rejectedDate)        j.rejectedDate       = new Date().toISOString();
  saveJobs();

  document.getElementById("m-status").innerHTML = STATUS_ORDER.map(st => {
    const m = STATUS[st]; const a = j.status === st;
    return `<button class="status-opt" style="${a ? `color:${m.color};border-color:${m.color};background:${m.color}18` : ""}" onclick="updateStatus('${st}')">${m.label}</button>`;
  }).join("");

  const isec = document.getElementById("m-interview-sec");
  if (s === "interview") {
    isec.style.display = "";
    if (!j.interviewDate) {
      document.getElementById("m-interview-date").value = "";
      document.getElementById("m-interview-type").value = "";
      document.getElementById("m-interview-status").textContent = "";
    }
  }
  renderTimeline(j);
  window.renderDashboard();
}

export function saveInterviewDate() {
  const j = state.jobs.find(x => x.id === state.currentJobId); if (!j) return;
  j.interviewDate = document.getElementById("m-interview-date").value;
  saveJobs();
  _refreshInterviewStatus(j);
  toast("Interview date saved", "ok");
}

export function saveInterviewType() {
  const j = state.jobs.find(x => x.id === state.currentJobId); if (!j) return;
  j.interviewType = document.getElementById("m-interview-type").value;
  saveJobs();
  toast("Interview type saved", "ok");
}

export function saveNotes() {
  const j = state.jobs.find(x => x.id === state.currentJobId); if (!j) return;
  j.notes = document.getElementById("m-notes").value;
  saveJobs();
  toast("Notes saved", "ok");
}

export function deleteFromModal() {
  if (!confirm("Remove this application?")) return;
  state.jobs = state.jobs.filter(j => j.id !== state.currentJobId);
  saveJobs();
  closeModal();
  window.renderDashboard();
  toast("Application removed", "ok");
}

export function clearAllData() {
  if (!confirm("Delete ALL jobs, resumes and cover letters? Cannot be undone.")) return;
  state.jobs = []; state.resumes = []; state.covers = [];
  window.saveJobs(); window.saveResumes(); window.saveCovers();
  window.renderDashboard();
  toast("All data cleared", "ok");
}

// ── Cover letter quick-gen from modal ────────────────────────────────────────

export function quickGenCoverFromModal(jobId) {
  closeModal();
  document.getElementById("gen-job-select").innerHTML = state.jobs.map(j =>
    `<option value="${j.id}"${j.id === jobId ? " selected" : ""}>${esc(j.title)} \u2014 ${esc(j.company)}</option>`
  ).join("");
  document.getElementById("gen-resume-select").innerHTML =
    '<option value="">Paste manually below</option>' + state.resumes.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join("");
  document.getElementById("gen-resume-text").value = "";
  document.getElementById("gen-extra").value = "";
  window.clearErr("gen-error");
  document.getElementById("gen-status").textContent = "";
  document.getElementById("gen-btn").disabled = false;
  document.getElementById("gen-modal").style.display = "flex";
  window.showView("covers");
}

// ── Timeline ─────────────────────────────────────────────────────────────────

export function renderTimeline(j) {
  const events = [];
  events.push({ label: "Application Saved", date: j.date, done: true });
  if (j.status !== "saved") events.push({ label: "Applied", date: j.appliedDate || j.date, done: true });
  if (j.interviewDate) events.push({ label: "Interview" + (j.interviewType ? " (" + j.interviewType + ")" : ""), date: j.interviewDate, done: new Date(j.interviewDate) <= new Date() });
  if (j.status === "offer")    events.push({ label: "Offer Received", date: j.offerDate    || "", done: true });
  if (j.status === "rejected") events.push({ label: "Rejected",       date: j.rejectedDate || "", done: true });
  if (j.status === "applied"   && !j.interviewDate)                          events.push({ label: "Awaiting Response",   date: "", done: false });
  if (j.status === "interview" && j.interviewDate && new Date(j.interviewDate) > new Date()) events.push({ label: "Interview Upcoming", date: "", done: false });

  document.getElementById("m-timeline").innerHTML = events.map(e => {
    const cls = e.done ? "tl-item done" : "tl-item";
    const dt  = e.date ? `<div class="tl-date">${new Date(e.date).toLocaleDateString("en-AU", {day:"numeric",month:"short",year:"numeric"})}</div>` : "";
    return `<div class="${cls}">${dt}<div class="tl-label">${esc(e.label)}</div></div>`;
  }).join("");
}

// ── Checklist ────────────────────────────────────────────────────────────────

export function renderChecklist(j) {
  if (!j.checklist) j.checklist = {};
  document.getElementById("m-checklist").innerHTML = CHECKLIST_ITEMS.map(item => {
    const checked = j.checklist[item.key] ? "checked" : "";
    return `<div class="cl-item ${checked}" onclick="toggleChecklistItem('${item.key}')">
      <div class="cl-check">\u2713</div>
      <span class="cl-label">${esc(item.label)}</span>
    </div>`;
  }).join("");
}

export function toggleChecklistItem(key) {
  const j = state.jobs.find(x => x.id === state.currentJobId); if (!j) return;
  if (!j.checklist) j.checklist = {};
  j.checklist[key] = !j.checklist[key];
  saveJobs();
  renderChecklist(j);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _mi(icon, label, val) {
  return `<div class="meta-item"><span style="font-size:14px">${icon}</span><div><div class="meta-label">${label}</div><div class="meta-val">${esc(val)}</div></div></div>`;
}

function _refreshInterviewStatus(j) {
  const istat = document.getElementById("m-interview-status");
  if (j.interviewDate) {
    const d = new Date(j.interviewDate); const now = new Date();
    istat.innerHTML = d > now
      ? `<span style="color:var(--purple);">\u{1F4C5} Interview in ${Math.ceil((d - now) / (1000 * 60 * 60 * 24))} days</span>`
      : `<span style="color:var(--green);">\u2705 Interview completed</span>`;
  } else {
    istat.textContent = "";
  }
}
