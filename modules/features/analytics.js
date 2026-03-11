// Analytics view: KPIs, timeline chart, status chart, funnel, company breakdown.

import { state } from "../state.js";
import { STATUS, STATUS_ORDER, CHECKLIST_ITEMS } from "../assets/constants.js";
import { esc } from "../ui/utils.js";

export function renderAnalytics() {
  const total  = state.jobs.length;
  const counts = {}; STATUS_ORDER.forEach(s => counts[s] = 0);
  state.jobs.forEach(j => counts[j.status] = (counts[j.status] || 0) + 1);

  const interviewRate = total > 0 ? Math.round(((counts.interview || 0) + (counts.offer || 0)) / total * 100) : 0;
  const offerRate     = total > 0 ? Math.round((counts.offer || 0) / total * 100) : 0;

  const withDates = state.jobs.filter(j => j.interviewDate && j.date);
  let avgDays = "\u2014";
  if (withDates.length) {
    const totalDays = withDates.reduce((sum, j) => sum + Math.abs(Math.round((new Date(j.interviewDate) - new Date(j.date)) / (1000 * 60 * 60 * 24))), 0);
    avgDays = Math.round(totalDays / withDates.length) + " days";
  }

  let checkTotal = 0, checkDone = 0;
  state.jobs.forEach(j => { if (j.checklist) CHECKLIST_ITEMS.forEach(item => { checkTotal++; if (j.checklist[item.key]) checkDone++; }); });
  const checkPct = checkTotal > 0 ? Math.round(checkDone / checkTotal * 100) : 0;

  document.getElementById("analytics-kpis").innerHTML =
    `<div class="kpi-card"><div class="kpi-val">${total}</div><div class="kpi-label">Total Apps</div></div>` +
    `<div class="kpi-card"><div class="kpi-val" style="color:var(--accent)">${interviewRate}%</div><div class="kpi-label">Interview Rate</div></div>` +
    `<div class="kpi-card"><div class="kpi-val" style="color:var(--green)">${offerRate}%</div><div class="kpi-label">Offer Rate</div></div>` +
    `<div class="kpi-card"><div class="kpi-val" style="color:var(--blue)">${avgDays}</div><div class="kpi-label">Avg to Interview</div></div>` +
    `<div class="kpi-card"><div class="kpi-val" style="color:var(--purple)">${checkPct}%</div><div class="kpi-label">Checklist Done</div></div>`;

  _renderTimelineChart();
  _renderStatusChart();
  _renderFunnel(total, counts);
  _renderCompanyChart();
}

function _renderTimelineChart() {
  const canvas = document.getElementById("chart-timeline");
  const ctx    = canvas.getContext("2d");
  const w = canvas.width = canvas.parentElement.clientWidth - 32;
  const h = canvas.height = 180;
  ctx.clearRect(0, 0, w, h);
  if (!state.jobs.length) { ctx.fillStyle = "#7b8c9a"; ctx.font = "13px DM Sans"; ctx.fillText("No data yet", w / 2 - 30, h / 2); return; }

  const weeks = {};
  state.jobs.forEach(j => {
    const d = new Date(j.date); const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
    const key = ws.toISOString().slice(0, 10);
    weeks[key] = (weeks[key] || 0) + 1;
  });
  const keys  = Object.keys(weeks).sort();
  if (!keys.length) return;
  const vals  = keys.map(k => weeks[k]);
  const maxV  = Math.max(...vals, 1);
  const barW  = Math.max(12, Math.min(40, (w - 40) / keys.length - 4));
  const chartH = h - 40;
  const startX = (w - (keys.length * (barW + 4))) / 2;

  keys.forEach((k, i) => {
    const x    = startX + i * (barW + 4);
    const barH = (vals[i] / maxV) * chartH;
    const y    = h - 24 - barH;
    ctx.fillStyle = "rgba(46,196,182,0.7)";
    ctx.beginPath(); ctx.roundRect(x, y, barW, barH, 3); ctx.fill();
    ctx.fillStyle = "#e8ecf0"; ctx.font = "bold 10px DM Sans"; ctx.textAlign = "center";
    ctx.fillText(vals[i], x + barW / 2, y - 4);
    ctx.fillStyle = "#7b8c9a"; ctx.font = "9px DM Sans";
    const label = new Date(k).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
    if (keys.length <= 12 || i % Math.ceil(keys.length / 10) === 0) ctx.fillText(label, x + barW / 2, h - 6);
  });
}

function _renderStatusChart() {
  const canvas = document.getElementById("chart-status");
  const ctx    = canvas.getContext("2d");
  const w = canvas.width = canvas.parentElement.clientWidth - 32;
  const h = canvas.height = 180;
  ctx.clearRect(0, 0, w, h);
  if (!state.jobs.length) { ctx.fillStyle = "#7b8c9a"; ctx.font = "13px DM Sans"; ctx.fillText("No data yet", w / 2 - 30, h / 2); return; }

  const counts = {}; STATUS_ORDER.forEach(s => counts[s] = 0);
  state.jobs.forEach(j => counts[j.status] = (counts[j.status] || 0) + 1);
  const colors = { saved: "#2ec4b6", applied: "#56b4f9", interview: "#9d8df1", offer: "#2ed573", rejected: "#ff6b81" };
  const barH = 24, gap = 8, chartW = w - 120, maxV = Math.max(...Object.values(counts), 1);

  STATUS_ORDER.forEach((s, i) => {
    const y  = 20 + i * (barH + gap);
    const bw = Math.max(4, (counts[s] / maxV) * chartW);
    ctx.fillStyle = "#7b8c9a"; ctx.font = "12px DM Sans"; ctx.textAlign = "right";
    ctx.fillText(STATUS[s].label, 90, y + barH / 2 + 4);
    ctx.fillStyle = colors[s] || "#2ec4b6";
    ctx.beginPath(); ctx.roundRect(100, y, bw, barH, 4); ctx.fill();
    ctx.fillStyle = "#e8ecf0"; ctx.font = "bold 11px DM Sans"; ctx.textAlign = "left";
    ctx.fillText(counts[s], 104 + bw, y + barH / 2 + 4);
  });
}

function _renderFunnel(total, counts) {
  const el = document.getElementById("chart-funnel");
  if (!total) { el.innerHTML = '<p style="color:var(--muted);font-size:13px;">No data yet</p>'; return; }
  const stages = [
    { label: "Applied",        count: total,                                        color: "var(--blue)"   },
    { label: "Got Interview",  count: (counts.interview || 0) + (counts.offer || 0), color: "var(--purple)" },
    { label: "Received Offer", count: counts.offer || 0,                             color: "var(--green)"  },
  ];
  el.innerHTML = stages.map(s => {
    const pct = Math.max(8, Math.round(s.count / total * 100));
    return `<div class="funnel-bar"><div class="funnel-fill" style="width:${pct}%;background:${s.color};">${s.count}</div><div class="funnel-label">${s.label} (${Math.round(s.count / total * 100)}%)</div></div>`;
  }).join("");
}

function _renderCompanyChart() {
  const el = document.getElementById("chart-companies");
  if (!state.jobs.length) { el.innerHTML = '<p style="color:var(--muted);font-size:13px;">No data yet</p>'; return; }
  const counts = {};
  state.jobs.forEach(j => { counts[j.company] = (counts[j.company] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const max = sorted[0] ? sorted[0][1] : 1;
  el.innerHTML = sorted.map(([name, count]) => {
    const pct = Math.round(count / max * 100);
    return `<div class="company-bar">
      <span style="min-width:100px;text-align:right;color:var(--text);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(name)}</span>
      <div class="company-bar-fill" style="width:${pct}%;"></div>
      <span style="color:var(--muted);font-size:11px;">${count}</span>
    </div>`;
  }).join("");
}
