// Document management: resume and cover letter list, editor, CRUD, file upload.

import { state } from "../state.js";
import { saveResumes, saveCovers } from "../services/db.service.js";
import { esc, toast, loadScript } from "../ui/utils.js";
import { setEditorMode, updateWordCount, refreshPreview } from "./preview-engine.js";

// ── Version helpers ───────────────────────────────────────────────────────────

function getVersionFamily(list, doc) {
  const rootId = doc.parentId || doc.id;
  return list
    .filter(d => d.id === rootId || d.parentId === rootId)
    .sort((a, b) => a.created.localeCompare(b.created));
}

function _refreshVersionSelect(type, activeId) {
  const list    = type === "resume" ? state.resumes : state.covers;
  const editId  = activeId != null ? activeId : state.editingDocId[type];
  const current = list.find(d => d.id === editId);
  const btn     = document.getElementById(type + "-new-version-btn");
  const bar     = document.getElementById(type + "-version-bar");
  if (!current) {
    if (btn) btn.style.display = "none";
    if (bar) bar.style.display = "none";
    return;
  }
  if (btn) btn.style.display = "";
  const family = getVersionFamily(list, current);
  const sel    = document.getElementById(type + "-version-select");
  if (family.length > 1 && sel && bar) {
    sel.innerHTML = family.map((d, i) =>
      `<option value="${d.id}"${d.id === editId ? " selected" : ""}>Version ${i + 1} \u2014 ${new Date(d.created).toLocaleDateString("en-AU",{day:"numeric",month:"short"})}</option>`
    ).join("");
    bar.style.display = "flex";
  } else if (bar) {
    bar.style.display = "none";
  }
}

// ── Resume list ──────────────────────────────────────────────────────────────

export function renderResumeList() {
  document.getElementById("resume-list-view").style.display   = "";
  document.getElementById("resume-editor-view").style.display = "none";
  const el = document.getElementById("resume-list");
  const resumeRoots = state.resumes.filter(r => !r.parentId);
  if (!resumeRoots.length) {
    el.innerHTML = '<div class="doc-empty">No resumes saved yet.<br><span style="font-size:12px;">Click <strong>New Resume</strong> to paste or upload one, or<br><strong>Generate from Scratch</strong> to have AI build one for you.</span></div>';
    return;
  }
  el.innerHTML = resumeRoots.map(r => {
    const vCount = state.resumes.filter(d => d.parentId === r.id).length;
    const vBadge = vCount > 0 ? ` <span style="font-size:10px;padding:1px 6px;background:var(--accent);color:#fff;border-radius:10px;vertical-align:middle;">${vCount + 1} versions</span>` : "";
    return `<div class="doc-item">
      <div class="doc-info">
        <div class="doc-name">${esc(r.name)}${vBadge}</div>
        <div class="doc-meta">${r.wordCount || 0} words &middot; Last edited ${new Date(r.updated).toLocaleDateString("en-AU", {day:"numeric",month:"short",year:"numeric"})}</div>
      </div>
      <div class="doc-actions">
        <button class="btn btn-primary btn-sm" onclick="viewDocument('resume',${r.id})">View</button>
        <button class="btn btn-ghost btn-sm"   onclick="editDocument('resume',${r.id})">Edit</button>
        <button class="btn btn-ghost btn-sm"   onclick="duplicateResumeById(${r.id})">Duplicate</button>
        <button class="btn btn-danger btn-sm"  onclick="deleteDocument('resume',${r.id})">Delete</button>
      </div>
    </div>`;
  }).join("");
}

// ── Cover list ───────────────────────────────────────────────────────────────

export function renderCoverList() {
  document.getElementById("cover-list-view").style.display   = "";
  document.getElementById("cover-editor-view").style.display = "none";
  const el = document.getElementById("cover-list");
  const coverRoots = state.covers.filter(c => !c.parentId);
  if (!coverRoots.length) {
    el.innerHTML = '<div class="doc-empty">No cover letters saved yet.<br><span style="font-size:12px;">Click <strong>New Cover Letter</strong> or <strong>Generate from Job</strong> to get started.</span></div>';
    return;
  }
  el.innerHTML = coverRoots.map(c => {
    const vCount = state.covers.filter(d => d.parentId === c.id).length;
    const vBadge = vCount > 0 ? ` <span style="font-size:10px;padding:1px 6px;background:var(--accent);color:#fff;border-radius:10px;vertical-align:middle;">${vCount + 1} versions</span>` : "";
    return `<div class="doc-item">
      <div class="doc-info">
        <div class="doc-name">${esc(c.name)}${vBadge}</div>
        <div class="doc-meta">${c.wordCount || 0} words &middot; Last edited ${new Date(c.updated).toLocaleDateString("en-AU", {day:"numeric",month:"short",year:"numeric"})}</div>
      </div>
      <div class="doc-actions">
        <button class="btn btn-primary btn-sm" onclick="viewDocument('cover',${c.id})">View</button>
        <button class="btn btn-ghost btn-sm"   onclick="editDocument('cover',${c.id})">Edit</button>
        <button class="btn btn-ghost btn-sm"   onclick="duplicateCoverById(${c.id})">Duplicate</button>
        <button class="btn btn-danger btn-sm"  onclick="deleteDocument('cover',${c.id})">Delete</button>
      </div>
    </div>`;
  }).join("");
}

// ── Open editor ──────────────────────────────────────────────────────────────

export function newDocument(type) {
  state.editingDocId[type] = null;
  _refreshVersionSelect(type, null);
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
  _refreshVersionSelect(type, id);
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
  if (type === "resume") {
    const doc = state.resumes.find(r => r.id === id);
    if (doc && !doc.parentId) {
      // Deleting a root — promote oldest child to new root
      const children = state.resumes.filter(r => r.parentId === id).sort((a, b) => a.created.localeCompare(b.created));
      if (children.length) {
        const newRootId = children[0].id;
        state.resumes = state.resumes.filter(r => r.id !== id).map(r =>
          r.parentId === id ? (r.id === newRootId ? { ...r, parentId: undefined } : { ...r, parentId: newRootId }) : r
        );
      } else { state.resumes = state.resumes.filter(r => r.id !== id); }
    } else { state.resumes = state.resumes.filter(r => r.id !== id); }
    saveResumes(); renderResumeList();
  } else {
    const doc = state.covers.find(c => c.id === id);
    if (doc && !doc.parentId) {
      const children = state.covers.filter(c => c.parentId === id).sort((a, b) => a.created.localeCompare(b.created));
      if (children.length) {
        const newRootId = children[0].id;
        state.covers = state.covers.filter(c => c.id !== id).map(c =>
          c.parentId === id ? (c.id === newRootId ? { ...c, parentId: undefined } : { ...c, parentId: newRootId }) : c
        );
      } else { state.covers = state.covers.filter(c => c.id !== id); }
    } else { state.covers = state.covers.filter(c => c.id !== id); }
    saveCovers(); renderCoverList();
  }
  toast("Deleted", "ok");
}

// ── Versioning ────────────────────────────────────────────────────────────────

export function saveAsNewVersion(type) {
  const name    = document.getElementById(type + "-name-input").value.trim();
  const content = document.getElementById(type + "-textarea").value.trim();
  if (!name)    { toast("Please enter a name", "err"); return; }
  if (!content) { toast("Document is empty",   "err"); return; }
  const editId = state.editingDocId[type];
  if (!editId)  { toast("Save the document first before creating a version", "err"); return; }
  const list    = type === "resume" ? state.resumes : state.covers;
  const current = list.find(d => d.id === editId);
  if (!current) return;
  const rootId    = current.parentId || current.id;
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const now       = new Date().toISOString();
  const newDoc    = { id: Date.now(), name, content, wordCount, created: now, updated: now, parentId: rootId };
  if (type === "resume") { state.resumes.unshift(newDoc); saveResumes(); }
  else                   { state.covers.unshift(newDoc);  saveCovers(); }
  state.editingDocId[type] = newDoc.id;
  _refreshVersionSelect(type, newDoc.id);
  const family = getVersionFamily(type === "resume" ? state.resumes : state.covers, newDoc);
  toast(`Saved as Version ${family.findIndex(d => d.id === newDoc.id) + 1}`, "ok");
}

export function loadVersion(type, id) {
  const list = type === "resume" ? state.resumes : state.covers;
  const doc  = list.find(d => d.id === id);
  if (!doc) return;
  state.editingDocId[type] = id;
  document.getElementById(type + "-name-input").value = doc.name;
  document.getElementById(type + "-textarea").value   = doc.content;
  updateWordCount(type);
  const family = getVersionFamily(list, doc);
  toast(`Switched to Version ${family.findIndex(d => d.id === id) + 1}`, "");
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
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
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
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  if (!result.value.trim()) throw new Error("No text found in document.");
  return result.value;
}

async function _renderPDFPages(file) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
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
