// Document management: resume and cover letter list, editor, CRUD, file upload.

import { state } from "../state.js";
import { saveResumes, saveCovers } from "../services/db.service.js";
import { esc, toast } from "../ui/utils.js";
import { setEditorMode, updateWordCount, refreshPreview } from "./preview-engine.js";

// ── Resume list ──────────────────────────────────────────────────────────────

export function renderResumeList() {
  document.getElementById("resume-list-view").style.display   = "";
  document.getElementById("resume-editor-view").style.display = "none";
  const el = document.getElementById("resume-list");
  if (!state.resumes.length) {
    el.innerHTML = '<div class="doc-empty">No resumes saved yet.<br><span style="font-size:12px;">Click <strong>New Resume</strong> to paste or upload one, or<br><strong>Generate from Scratch</strong> to have AI build one for you.</span></div>';
    return;
  }
  el.innerHTML = state.resumes.map(r =>
    `<div class="doc-item">
      <div class="doc-info">
        <div class="doc-name">${esc(r.name)}</div>
        <div class="doc-meta">${r.wordCount || 0} words &middot; Last edited ${new Date(r.updated).toLocaleDateString("en-AU", {day:"numeric",month:"short",year:"numeric"})}</div>
      </div>
      <div class="doc-actions">
        <button class="btn btn-primary btn-sm" onclick="viewDocument('resume',${r.id})">View</button>
        <button class="btn btn-ghost btn-sm"   onclick="editDocument('resume',${r.id})">Edit</button>
        <button class="btn btn-ghost btn-sm"   onclick="duplicateResumeById(${r.id})">Duplicate</button>
        <button class="btn btn-danger btn-sm"  onclick="deleteDocument('resume',${r.id})">Delete</button>
      </div>
    </div>`
  ).join("");
}

// ── Cover list ───────────────────────────────────────────────────────────────

export function renderCoverList() {
  document.getElementById("cover-list-view").style.display   = "";
  document.getElementById("cover-editor-view").style.display = "none";
  const el = document.getElementById("cover-list");
  if (!state.covers.length) {
    el.innerHTML = '<div class="doc-empty">No cover letters saved yet.<br><span style="font-size:12px;">Click <strong>New Cover Letter</strong> or <strong>Generate from Job</strong> to get started.</span></div>';
    return;
  }
  el.innerHTML = state.covers.map(c =>
    `<div class="doc-item">
      <div class="doc-info">
        <div class="doc-name">${esc(c.name)}</div>
        <div class="doc-meta">${c.wordCount || 0} words &middot; Last edited ${new Date(c.updated).toLocaleDateString("en-AU", {day:"numeric",month:"short",year:"numeric"})}</div>
      </div>
      <div class="doc-actions">
        <button class="btn btn-primary btn-sm" onclick="viewDocument('cover',${c.id})">View</button>
        <button class="btn btn-ghost btn-sm"   onclick="editDocument('cover',${c.id})">Edit</button>
        <button class="btn btn-ghost btn-sm"   onclick="duplicateCoverById(${c.id})">Duplicate</button>
        <button class="btn btn-danger btn-sm"  onclick="deleteDocument('cover',${c.id})">Delete</button>
      </div>
    </div>`
  ).join("");
}

// ── Open editor ──────────────────────────────────────────────────────────────

export function newDocument(type) {
  state.editingDocId[type] = null;
  document.getElementById(type + "-name-input").value = "";
  document.getElementById(type + "-textarea").value   = "";
  updateWordCount(type);
  document.getElementById(type + "-list-view").style.display   = "none";
  document.getElementById(type + "-editor-view").style.display = "";
  if (type === "cover")  populateCoverJobSelect();
  if (type === "resume") populateResumeJobSelect();
}

export function editDocument(type, id) {
  const list = type === "resume" ? state.resumes : state.covers;
  const doc  = list.find(d => d.id === id);
  if (!doc) return;
  state.editingDocId[type] = id;
  document.getElementById(type + "-name-input").value = doc.name;
  document.getElementById(type + "-textarea").value   = doc.content;
  updateWordCount(type);
  document.getElementById(type + "-list-view").style.display   = "none";
  document.getElementById(type + "-editor-view").style.display = "";
  if (type === "cover")  populateCoverJobSelect();
  if (type === "resume") populateResumeJobSelect();
}

export function viewDocument(type, id) {
  editDocument(type, id);
  setTimeout(() => setEditorMode(type, "preview"), 50);
}

export function closeDocEditor(type) {
  document.getElementById(type + "-list-view").style.display   = "";
  document.getElementById(type + "-editor-view").style.display = "none";
  document.getElementById(type + "-ai-panel").style.display    = "none";
  setEditorMode(type, "edit");
  state.editingDocId[type] = null;
  if (type === "resume") renderResumeList();
  else renderCoverList();
}

// ── Save / Delete ────────────────────────────────────────────────────────────

export function saveDocument(type) {
  const name    = document.getElementById(type + "-name-input").value.trim();
  const content = document.getElementById(type + "-textarea").value.trim();
  if (!name)    { toast("Please enter a name", "err");  return; }
  if (!content) { toast("Document is empty",   "err");  return; }
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const now = new Date().toISOString();
  if (type === "resume") {
    if (state.editingDocId.resume)
      state.resumes = state.resumes.map(r => r.id === state.editingDocId.resume ? { ...r, name, content, wordCount, updated: now } : r);
    else
      state.resumes.unshift({ id: Date.now(), name, content, wordCount, created: now, updated: now });
    saveResumes();
  } else {
    if (state.editingDocId.cover)
      state.covers = state.covers.map(c => c.id === state.editingDocId.cover ? { ...c, name, content, wordCount, updated: now } : c);
    else
      state.covers.unshift({ id: Date.now(), name, content, wordCount, created: now, updated: now });
    saveCovers();
  }
  toast((type === "resume" ? "Resume" : "Cover letter") + " saved!", "ok");
  closeDocEditor(type);
}

export function deleteDocument(type, id) {
  if (!confirm("Delete this document? This cannot be undone.")) return;
  if (type === "resume") { state.resumes = state.resumes.filter(r => r.id !== id); saveResumes(); renderResumeList(); }
  else                   { state.covers  = state.covers.filter(c => c.id !== id);  saveCovers();  renderCoverList(); }
  toast("Deleted", "ok");
}

// ── Duplicate ────────────────────────────────────────────────────────────────

export function duplicateResume() {
  const content = document.getElementById("resume-textarea").value;
  const name    = document.getElementById("resume-name-input").value;
  if (!content) { toast("Nothing to duplicate", "err"); return; }
  const now = new Date().toISOString();
  state.resumes.unshift({ id: Date.now(), name: "Copy of " + name, content, wordCount: content.split(/\s+/).filter(Boolean).length, created: now, updated: now });
  saveResumes();
  toast("Duplicated!", "ok");
}

export function duplicateResumeById(id) {
  const r = state.resumes.find(x => x.id === id); if (!r) return;
  const now = new Date().toISOString();
  state.resumes.unshift({ id: Date.now(), name: "Copy of " + r.name, content: r.content, wordCount: r.wordCount, created: now, updated: now });
  saveResumes(); renderResumeList(); toast("Duplicated!", "ok");
}

export function duplicateCover() {
  const content = document.getElementById("cover-textarea").value;
  const name    = document.getElementById("cover-name-input").value;
  if (!content) { toast("Nothing to duplicate", "err"); return; }
  const now = new Date().toISOString();
  state.covers.unshift({ id: Date.now(), name: "Copy of " + name, content, wordCount: content.split(/\s+/).filter(Boolean).length, created: now, updated: now });
  saveCovers(); toast("Duplicated!", "ok");
}

export function duplicateCoverById(id) {
  const c = state.covers.find(x => x.id === id); if (!c) return;
  const now = new Date().toISOString();
  state.covers.unshift({ id: Date.now(), name: "Copy of " + c.name, content: c.content, wordCount: c.wordCount, created: now, updated: now });
  saveCovers(); renderCoverList(); toast("Duplicated!", "ok");
}

// ── Job selectors in editor ──────────────────────────────────────────────────

export function populateCoverJobSelect() {
  const sel  = document.getElementById("cover-job-select");
  sel.innerHTML = '<option value="">No specific job</option>' + state.jobs.map(j => `<option value="${j.id}">${esc(j.title)} \u2014 ${esc(j.company)}</option>`).join("");
  const rsel = document.getElementById("cover-resume-select");
  if (rsel) rsel.innerHTML = '<option value="">No resume</option>' + state.resumes.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join("");
}

export function populateResumeJobSelect() {
  const sel = document.getElementById("resume-job-select");
  if (sel) sel.innerHTML = '<option value="">General \u2014 no specific job</option>' + state.jobs.map(j => `<option value="${j.id}">${esc(j.title)} \u2014 ${esc(j.company)}</option>`).join("");
}

// ── File upload (PDF, DOCX, TXT) ─────────────────────────────────────────────

export function triggerUpload(type) { document.getElementById(type + "-file-upload").click(); }

export async function handleDocUpload(e, type) {
  const file = e.target.files[0]; if (!file) return;
  const bar  = document.getElementById(type + "-upload-bar");
  bar.style.display = "block";
  try {
    const ext = file.name.split(".").pop().toLowerCase();
    let text = "";
    if (ext === "pdf")              { text = await _extractPDF(file);  if (type === "resume") await _renderPDFPages(file); }
    else if (ext === "docx" || ext === "doc") text = await _extractDOCX(file);
    else                            text = await _readAsText(file);
    document.getElementById(type + "-textarea").value = text.trim();
    if (!document.getElementById(type + "-name-input").value)
      document.getElementById(type + "-name-input").value = file.name.replace(/\.[^.]+$/, "");
    updateWordCount(type);
    toast(file.name + " loaded (" + text.split(/\s+/).filter(Boolean).length + " words)", "ok");
    setEditorMode(type, "preview");
  } catch (err) { toast("Couldn't read file: " + err.message, "err"); }
  finally { bar.style.display = "none"; e.target.value = ""; }
}

function _readAsText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = ev => res(ev.target.result);
    r.onerror = () => rej(new Error("Could not read file"));
    r.readAsText(file);
  });
}

async function _extractPDF(file) {
  if (typeof pdfjsLib === "undefined") throw new Error("PDF library not loaded. Please refresh.");
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    full += content.items.map(it => it.str).join(" ") + "\n\n";
  }
  if (!full.trim()) throw new Error("No text found in PDF (may be a scanned image).");
  return full;
}

async function _extractDOCX(file) {
  if (typeof mammoth === "undefined") throw new Error("DOCX library not loaded. Please refresh.");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  if (!result.value.trim()) throw new Error("No text found in document.");
  return result.value;
}

async function _renderPDFPages(file) {
  const viewer    = document.getElementById("resume-pdf-viewer");
  const container = document.getElementById("resume-pdf-pages");
  if (!viewer || !container) return;
  container.innerHTML = '<p style="color:var(--muted);font-size:13px;">Rendering pages...</p>';
  viewer.style.display = "block";
  try {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    container.innerHTML = "";
    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
      const page   = await pdf.getPage(i);
      const vp     = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement("canvas");
      canvas.width = vp.width; canvas.height = vp.height;
      const maxW = container.clientWidth - 8;
      canvas.style.width  = (vp.width > maxW ? maxW : vp.width) + "px";
      canvas.style.height = "auto";
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
      container.appendChild(canvas);
    }
    if (pdf.numPages > 5) {
      const note = document.createElement("p");
      note.style.cssText = "text-align:center;font-size:12px;color:var(--muted);margin-top:8px;";
      note.textContent = "Showing first 5 of " + pdf.numPages + " pages";
      container.appendChild(note);
    }
  } catch (err) { container.innerHTML = '<p style="color:var(--red);font-size:13px;">Could not render PDF preview.</p>'; }
}
