// Document preview: resume renderer, cover renderer, template switching, PDF/DOCX export.
// Depends on tts.js only for the inline read-aloud buttons.

import { state } from "../state.js";
import { esc, toast } from "../ui/utils.js";
import { storeSet } from "../services/db.service.js";
import { ttsBtnHTML } from "../a11y/tts.js";

// ── Template switching ───────────────────────────────────────────────────────

export function setResumeTemplate(tpl) {
  state.resumeTemplate = tpl;
  storeSet("jt_resume_tpl", tpl);
  ["modern", "classic", "minimal", "executive"].forEach(t => {
    const btn = document.getElementById("rtpl-" + t);
    if (btn) btn.classList.toggle("active", t === tpl);
  });
  refreshPreview("resume");
}

export function setCoverTemplate(tpl) {
  state.coverTemplate = tpl;
  storeSet("jt_cover_tpl", tpl);
  ["modern", "classic", "minimal", "executive"].forEach(t => {
    const btn = document.getElementById("ctpl-" + t);
    if (btn) btn.classList.toggle("active", t === tpl);
  });
  refreshPreview("cover");
}

// ── Edit / Preview mode toggle ───────────────────────────────────────────────

export function setEditorMode(type, mode) {
  document.getElementById(type + "-edit-mode").style.display    = mode === "edit"    ? "" : "none";
  document.getElementById(type + "-preview-mode").style.display = mode === "preview" ? "" : "none";
  document.getElementById(type + "-mode-edit").classList.toggle("active",    mode === "edit");
  document.getElementById(type + "-mode-preview").classList.toggle("active", mode === "preview");
  if (mode === "preview") refreshPreview(type);
}

export function refreshPreview(type) {
  const text = document.getElementById(type + "-textarea").value;
  const el   = document.getElementById(type + "-preview-content");
  const tpl  = type === "resume" ? state.resumeTemplate : state.coverTemplate;
  el.className = "doc-preview tpl-" + tpl;
  el.innerHTML = type === "resume" ? renderResumePreview(text) : renderCoverPreview(text);
  // Inject per-paragraph TTS buttons
  el.querySelectorAll("p,.summary,.cover-body p,h1,h2,.contact-line,.role-header,.skills-grid,.cover-greeting,.cover-sign,.cover-date").forEach(node => {
    const txt = node.textContent.trim();
    if (txt.length > 2) {
      const btn = document.createElement("button");
      btn.className = "tts-btn";
      btn.innerHTML = "&#128264;";
      btn.title = "Read aloud";
      btn.setAttribute("aria-label", "Read this section aloud");
      btn.onclick = (e) => { e.stopPropagation(); window.ttsSpeak(btn, txt); };
      btn.style.cssText = "float:right;margin-top:2px;";
      node.insertBefore(btn, node.firstChild);
    }
  });
}

export function updateWordCount(type) {
  const val = document.getElementById(type + "-textarea")?.value || "";
  const wc  = val.split(/\s+/).filter(Boolean).length;
  const el  = document.getElementById(type + "-wordcount");
  if (el) el.textContent = wc + " words";
}

// ── Resume preview renderer ──────────────────────────────────────────────────

export function renderResumePreview(text) {
  if (!text.trim()) return '<p style="color:#999;text-align:center;padding:40px;">Nothing to preview yet.</p>';
  const lines = text.split("\n");
  let html = "", firstHeading = true, inList = false, summaryDone = false;

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { if (inList) { html += "</ul>"; inList = false; } continue; }

    const nextLine      = (lines[i + 1] || "").trim();
    const isAllCaps     = trimmed.length > 2 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && !/^[\u2022\-\*\d]/.test(trimmed);
    const isDashUnder   = /^[-=]{3,}$/.test(nextLine);
    const isColonHeader = trimmed.length < 50 && trimmed.endsWith(":") && /[A-Z]/.test(trimmed[0]) && !trimmed.includes(",");

    if (isAllCaps || isDashUnder || isColonHeader) {
      if (inList) { html += "</ul>"; inList = false; }
      if (firstHeading && i < 3) {
        html += `<h1>${esc(trimmed)}</h1>`;
        firstHeading = false;
      } else {
        const cleaned = trimmed.replace(/[-=:]+$/, "").trim();
        html += `<h2>${esc(cleaned)}</h2>`;
        if (!summaryDone && /summary|profile|objective|about/i.test(cleaned)) {
          summaryDone = true;
          let si = isDashUnder ? i + 2 : i + 1;
          const sl = [];
          while (si < lines.length && lines[si].trim() && !/^[\u2022\-\*]/.test(lines[si].trim()) && !(lines[si].trim() === lines[si].trim().toUpperCase() && lines[si].trim().length > 2)) {
            sl.push(lines[si].trim()); si++;
          }
          if (sl.length) { html += `<div class="summary">${sl.map(l => esc(l)).join(" ")}${ttsBtnHTML(sl.join(" "))}</div>`; i = si - 1; continue; }
        }
      }
      if (isDashUnder) i++;
      continue;
    }

    if (/^[-=]{3,}$/.test(trimmed)) continue;

    if (i < 6 && (trimmed.includes("|") || trimmed.includes("@") || (trimmed.match(/,/g) || []).length >= 2) && !firstHeading) {
      if (inList) { html += "</ul>"; inList = false; }
      const formatted = esc(trimmed).replace(/\s*\|\s*/g, '<span class="sep">\u2022</span>');
      html += `<div class="contact-line">${formatted}${ttsBtnHTML(trimmed)}</div>`;
      continue;
    }

    if (/^[\u2022\-\*]\s/.test(trimmed) || /^\d+[\.\)]\s/.test(trimmed)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${esc(trimmed.replace(/^[\u2022\-\*]\s*|^\d+[\.\)]\s*/, ""))}</li>`;
      continue;
    }

    if (trimmed.includes("|") && trimmed.split("|").length >= 2) {
      if (inList) { html += "</ul>"; inList = false; }
      const parts = trimmed.split("|").map(p => p.trim());
      const last  = parts[parts.length - 1];
      if (/\d{4}|present|current/i.test(last) && parts.length >= 2) {
        html += `<div class="role-header"><span class="role-title">${esc(parts.slice(0, -1).join(" \u2014 "))}</span><span class="role-date">${esc(last)}</span></div>`;
      } else {
        html += `<h3>${esc(trimmed)}</h3>`;
      }
      continue;
    }

    if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b/i.test(trimmed) && /\d{4}/.test(trimmed) && trimmed.length < 60) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<div style="font-size:12px;color:#999;margin:2px 0;letter-spacing:0.3px;">${esc(trimmed)}</div>`;
      continue;
    }

    if ((trimmed.match(/,/g) || []).length >= 4 && trimmed.length < 400) {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<div class="skills-grid">${trimmed.split(",").map(s => `<span class="skill-tag">${esc(s.trim())}</span>`).join("")}</div>`;
      continue;
    }

    if (inList) { html += "</ul>"; inList = false; }
    if (trimmed.length < 60 && !trimmed.includes(".") && /[A-Z]/.test(trimmed[0]) && !/^(I |A |The |An |My |In |At |To |For |With )/.test(trimmed)) {
      html += `<h3>${esc(trimmed)}</h3>`;
    } else {
      html += `<p>${esc(trimmed)}${ttsBtnHTML(trimmed)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}

// ── Cover letter preview renderer ────────────────────────────────────────────

export function renderCoverPreview(text) {
  if (!text.trim()) return '<p style="color:#999;text-align:center;padding:40px;">Nothing to preview yet.</p>';
  const lines = text.split("\n");
  let html = "", bodyStarted = false, greetingFound = false;
  const headerLines = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (/^(dear|hi|hello|to whom|attention)/i.test(trimmed)) { greetingFound = true; break; }
    headerLines.push({ line: trimmed, index: i });
  }

  if (headerLines.length) {
    html += '<div class="cover-header-block">';
    for (const h of headerLines) {
      const t = h.line;
      if (t.includes("@") || t.includes("|")) {
        html += `<div style="font-size:12px;color:#666;letter-spacing:0.3px;">${esc(t).replace(/\s*\|\s*/g, '<span style="color:#2ec4b6;margin:0 8px;">\u2022</span>')}</div>`;
      } else if (h === headerLines[0] && !t.includes(",") && t.length < 60) {
        html += `<h1 style="font-size:22px;margin-bottom:2px;">${esc(t)}</h1>`;
      } else {
        html += `<div style="font-size:13px;color:#555;">${esc(t)}</div>`;
      }
    }
    html += "</div>";
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) { if (bodyStarted) html += ""; continue; }
    if (!bodyStarted && headerLines.some(h => h.index === i)) continue;
    if (!bodyStarted && /\d{1,2}\s+\w+\s+\d{4}|\w+\s+\d{1,2},?\s+\d{4}/.test(trimmed)) {
      html += `<div class="cover-date">${esc(trimmed)}</div>`; continue;
    }
    if (!bodyStarted && !greetingFound) continue;
    if (!bodyStarted && /^(dear|hi|hello|to whom|attention)/i.test(trimmed)) {
      html += `<div class="cover-greeting">${esc(trimmed)}</div><div class="cover-body">`;
      bodyStarted = true; continue;
    }
    if (bodyStarted && /^(kind regards|regards|sincerely|yours|best|cheers|thank you|thanks|warm regards|warmly)/i.test(trimmed)) {
      html += '</div><div class="cover-sign">';
      for (let j = i; j < lines.length; j++) {
        const sl = lines[j].trim();
        if (!sl)                                                     { html += "<br>"; continue; }
        if (j === i)                                                 { html += `<div style="margin-bottom:4px;font-weight:500;">${esc(sl)}</div>`; }
        else if (sl.includes("@") || sl.includes("|"))               { html += `<div style="font-size:12px;color:#888;">${esc(sl)}</div>`; }
        else                                                         { html += `<div>${esc(sl)}</div>`; }
      }
      html += "</div>";
      return html;
    }
    if (bodyStarted) html += `<p>${esc(trimmed)}${ttsBtnHTML(trimmed)}</p>`;
  }
  if (bodyStarted) html += "</div>";
  if (!bodyStarted) {
    html = '<div class="cover-body">';
    for (const line of lines) {
      const t = line.trim();
      if (!t) { html += "<br>"; continue; }
      html += `<p>${esc(t)}${ttsBtnHTML(t)}</p>`;
    }
    html += "</div>";
  }
  return html;
}

// ── Download (PDF + DOCX) ────────────────────────────────────────────────────

export async function downloadDoc(type, format) {
  const text    = document.getElementById(type + "-textarea").value.trim();
  if (!text) { toast("Document is empty", "err"); return; }
  const docName = (document.getElementById(type + "-name-input").value.trim() || type).replace(/[^a-zA-Z0-9\s\-_]/g, "");
  const tpl     = type === "resume" ? state.resumeTemplate : state.coverTemplate;
  const previewEl = document.getElementById(type + "-preview-content");
  previewEl.innerHTML = type === "resume" ? renderResumePreview(text) : renderCoverPreview(text);

  if (format === "pdf") {
    toast("Generating PDF...", "ok");
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:fixed;top:-9999px;left:0;width:794px;background:#fff;padding:52px 56px;font-family:DM Sans,sans-serif;";
    wrap.className = "doc-preview tpl-" + tpl;
    wrap.innerHTML = previewEl.innerHTML;
    wrap.querySelectorAll(".tts-btn").forEach(b => b.remove());
    document.body.appendChild(wrap);
    try {
      const canvas = await html2canvas(wrap, { scale: 2, useCORS: true, backgroundColor: "#ffffff", width: 794 });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = pdfW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 0;
      while (y < imgH) {
        if (y > 0) {
          if (imgH - y < 5) break;
          pdf.addPage();
        }
        pdf.addImage(imgData, "JPEG", 0, -y, imgW, imgH);
        y += pdfH;
      }
      pdf.save(docName + ".pdf");
      toast("PDF downloaded!", "ok");
    } catch (e) { toast("PDF export failed: " + e.message, "err"); }
    finally { document.body.removeChild(wrap); }

  } else if (format === "docx") {
    toast("Generating DOCX...", "ok");
    try {
      const blob = _generateDocxBlob(_buildDocxHTML(type, text));
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = docName + ".docx";
      link.click();
      URL.revokeObjectURL(link.href);
      toast("DOCX downloaded!", "ok");
    } catch (e) { toast("DOCX export failed: " + e.message, "err"); }
  }
}

function _buildDocxHTML(type, text) {
  const lines = text.split("\n");
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><link rel="stylesheet" href="modules/style.css"></head><body>';
  if (type === "resume") {
    let firstHeading = true;
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim(); if (!t) continue;
      const next = (lines[i + 1] || "").trim();
      const isAllCaps = t.length > 2 && t === t.toUpperCase() && /[A-Z]/.test(t) && !/^[\u2022\-\*\d]/.test(t);
      const isDash = /^[-=]{3,}$/.test(next);
      if (isAllCaps || isDash) {
        if (firstHeading && i < 3) { html += `<h1>${esc(t)}</h1>`; firstHeading = false; }
        else html += `<h2>${esc(t.replace(/[-=:]+$/, "").trim())}</h2>`;
        if (isDash) i++;
        continue;
      }
      if (i < 5 && (t.includes("|") || t.includes("@")) && !firstHeading) { html += `<p class="contact">${esc(t)}</p>`; continue; }
      if (/^[\u2022\-\*]\s/.test(t)) { html += `<ul><li>${esc(t.replace(/^[\u2022\-\*]\s*/, ""))}</li></ul>`; continue; }
      if (t.includes("|") && t.split("|").length >= 2) {
        const parts = t.split("|").map(p => p.trim()); const last = parts[parts.length - 1];
        if (/\d{4}|present|current/i.test(last)) { html += `<p class="role-line"><span class="role-title">${esc(parts.slice(0, -1).join(" \u2014 "))}</span> <span class="role-date">${esc(last)}</span></p>`; }
        else html += `<h3>${esc(t)}</h3>`;
        continue;
      }
      if ((t.match(/,/g) || []).length >= 4 && t.length < 300) { html += `<p class="skills">${t.split(",").map(s => `<span class="skill">${esc(s.trim())}</span>`).join(" ")}</p>`; continue; }
      if (t.length < 60 && !t.includes(".") && /[A-Z]/.test(t[0])) html += `<h3>${esc(t)}</h3>`;
      else html += `<p>${esc(t)}</p>`;
    }
  } else {
    for (const line of lines) { const t = line.trim(); if (!t) { html += "<br>"; continue; } html += `<p>${esc(t)}</p>`; }
  }
  html += "</body></html>";
  return html;
}

function _generateDocxBlob(htmlContent) {
  const header = 'MIME-Version: 1.0\r\nContent-Type: multipart/related; boundary="----=_NextPart"\r\n\r\n------=_NextPart\r\nContent-Type: text/html; charset="utf-8"\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n';
  const footer = "\r\n------=_NextPart--";
  return new Blob([header + htmlContent + footer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
