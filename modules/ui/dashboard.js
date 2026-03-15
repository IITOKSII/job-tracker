// Dashboard view: grid, kanban, stats, filter, sort, quick-delete.

import { state } from "../state.js";
import { STATUS, STATUS_ORDER } from "../assets/constants.js";
import { esc, scoreColor, toast } from "./utils.js";
import { saveJobs } from "../services/db.service.js";

// ── Filter / sort ────────────────────────────────────────────────────────────

export function getFiltered() {
  const s    = (document.getElementById("search-input")?.value || "").toLowerCase();
  const sort = document.getElementById("sort-select")?.value || "date-desc";
  return [...state.jobs]
    .filter(j =>
      (state.currentFilter === "all" || j.status === state.currentFilter) &&
      (!s || j.title.toLowerCase().includes(s) || j.company.toLowerCase().includes(s))
    )
    .sort((a, b) => {
      if (sort === "date-desc")    return new Date(b.date) - new Date(a.date);
      if (sort === "date-asc")     return new Date(a.date) - new Date(b.date);
      if (sort === "company-asc")  return a.company.localeCompare(b.company);
      if (sort === "company-desc") return b.company.localeCompare(a.company);
      if (sort === "title-asc")    return a.title.localeCompare(b.title);
      if (sort === "status")       return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      return 0;
    });
}

export function setFilter(f) { state.currentFilter = f; renderDashboard(); }
export function setView(v)   { state.boardView = v;     renderDashboard(); }

export function quickDelete(id, e) {
  e.stopPropagation();
  if (!confirm("Remove this application?")) return;
  state.jobs = state.jobs.filter(j => j.id !== id);
  saveJobs();
  renderDashboard();
  toast("Application removed", "ok");
}

// ── Main render ──────────────────────────────────────────────────────────────

export function renderDashboard() {
  const counts = {};
  state.jobs.forEach(j => { counts[j.status] = (counts[j.status] || 0) + 1; });

  document.getElementById("filter-bar").innerHTML =
    ["all", ...STATUS_ORDER].map(f =>
      `<button class="filter-btn ${state.currentFilter === f ? "active" : ""}" onclick="setFilter('${f}')">
        ${f === "all" ? "All (" + state.jobs.length + ")" : STATUS[f].label + (counts[f] ? " (" + counts[f] + ")" : "")}
      </button>`
    ).join("") +
    `<div class="view-toggle">
      <button class="view-btn ${state.boardView === "grid"   ? "active" : ""}" onclick="setView('grid')">Grid</button>
      <button class="view-btn ${state.boardView === "kanban" ? "active" : ""}" onclick="setView('kanban')">Kanban</button>
    </div>`;

  if (state.boardView === "grid") renderGrid();
  else renderKanban();
  renderStats();
}

// ── Grid view ────────────────────────────────────────────────────────────────

export function renderGrid() {
  document.getElementById("jobs-grid").style.display   = "";
  document.getElementById("kanban-board").style.display = "none";
  const f = getFiltered();
  const g = document.getElementById("jobs-grid");

  if (!f.length) {
    g.innerHTML = `<div class="empty">
      <div class="empty-icon">\u{1F4ED}</div>
      <h3>${state.jobs.length ? "No matches" : "Start tracking your applications"}</h3>
      <p style="font-size:12px;margin-top:5px;color:var(--muted);line-height:1.6;">
        ${state.jobs.length ? "Try a different filter or search term" : "Add a job posting URL or paste a job ad, and let AI analyse it for you."}
      </p>
      ${!state.jobs.length ? '<button class="btn btn-primary btn-sm" style="margin-top:12px;" onclick="showView(\'add\')">&#10010; Add Your First Job</button>' : ""}
    </div>`;
    return;
  }

  g.innerHTML = f.map(j => `
    <div class="job-card" onclick="openModal(${j.id})" tabindex="0" role="button"
      aria-label="${esc(j.company)} – ${esc(j.title)}, ${STATUS[j.status].label}"
      onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openModal(${j.id})}">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <div class="card-company">${esc(j.company)}</div>
        <span class="badge badge-${j.status}">${STATUS[j.status].label}</span>
      </div>
      <div class="card-title">${esc(j.title)}</div>
      <div class="card-meta">
        ${j.location !== "N/A" ? `<span>\u{1F4CD} ${esc(j.location)}</span>` : ""}
        ${j.salary   !== "N/A" ? `<span>\u{1F4B0} ${esc(j.salary)}</span>`   : ""}
        ${j.interviewDate ? `<span style="color:var(--purple);">\u{1F4C5} Interview: ${new Date(j.interviewDate).toLocaleDateString("en-AU", {day:"numeric",month:"short"})}</span>` : ""}
      </div>
      <div class="card-footer">
        <span class="card-date">${new Date(j.date).toLocaleDateString("en-AU", {day:"numeric",month:"short",year:"numeric"})}</span>
        <div style="display:flex;align-items:center;gap:5px;">
          ${j.matchScore ? `<span class="match-pill" style="background:${scoreColor(j.matchScore)}22;color:${scoreColor(j.matchScore)}">${j.matchScore}% match</span>` : ""}
          <button onclick="quickDelete(${j.id},event)" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;padding:2px 5px;border-radius:5px;"
            onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted)'"
            aria-label="Delete ${esc(j.company)} – ${esc(j.title)}">\u{1F5D1}</button>
        </div>
      </div>
    </div>`).join("");
}

// ── Kanban view ──────────────────────────────────────────────────────────────

export function renderKanban() {
  document.getElementById("jobs-grid").style.display   = "none";
  document.getElementById("kanban-board").style.display = "flex";
  const s = (document.getElementById("search-input")?.value || "").toLowerCase();
  document.getElementById("kanban-board").innerHTML = STATUS_ORDER.map(status => {
    const col = state.jobs.filter(j =>
      j.status === status && (!s || j.title.toLowerCase().includes(s) || j.company.toLowerCase().includes(s))
    );
    return `<div class="k-col">
      <div class="k-header">
        <span class="k-title-label" style="color:${STATUS[status].color}">${STATUS[status].label}</span>
        <span class="k-count">${col.length}</span>
      </div>
      <div class="k-cards">
        ${col.length
          ? col.map(j => `<div class="k-card" onclick="openModal(${j.id})" tabindex="0" role="button"
              aria-label="${esc(j.company)} – ${esc(j.title)}"
              onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openModal(${j.id})}">
              <div class="k-company">${esc(j.company)}</div>
              <div class="k-title-text">${esc(j.title)}</div>
              <div class="k-footer">
                <span>${new Date(j.date).toLocaleDateString("en-AU", {day:"numeric",month:"short"})}</span>
                <button onclick="quickDelete(${j.id},event)" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:12px;"
                  onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted)'">\u{1F5D1}</button>
              </div>
            </div>`).join("")
          : `<div style="padding:16px 0;text-align:center;font-size:12px;color:var(--muted);opacity:0.5;">Empty</div>`}
      </div>
    </div>`;
  }).join("");
}

// ── Sidebar stats ────────────────────────────────────────────────────────────

export function renderStats() {
  const c = {};
  state.jobs.forEach(j => { c[j.status] = (c[j.status] || 0) + 1; });
  document.getElementById("sidebar-stats").innerHTML =
    `<div class="stat-row"><span class="stat-label">Total</span><strong>${state.jobs.length}</strong></div>` +
    `<div class="stat-row"><span class="stat-label">Applied</span><strong style="color:var(--blue)">${c.applied || 0}</strong></div>` +
    `<div class="stat-row"><span class="stat-label">Interviews</span><strong style="color:var(--purple)">${c.interview || 0}</strong></div>` +
    `<div class="stat-row"><span class="stat-label">Offers</span><strong style="color:var(--green)">${c.offer || 0}</strong></div>` +
    `<div class="stat-row"><span class="stat-label">Resumes</span><strong style="color:var(--accent)">${state.resumes.length}</strong></div>` +
    `<div class="stat-row"><span class="stat-label">Covers</span><strong style="color:var(--muted)">${state.covers.length}</strong></div>`;
}
