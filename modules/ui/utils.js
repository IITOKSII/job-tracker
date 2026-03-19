// Shared DOM utility helpers — no state, no imports.

export function esc(s) {
  return String(s)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");
}

export function toast(msg, type = "") {
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = msg;
  t.setAttribute("role", "alert");
  t.setAttribute("aria-live", type === "err" ? "assertive" : "polite");
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

export function setStatus(id, html) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html;
  el.style.display = html ? "flex" : "none";
}

export function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

export function clearErr(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = "";
  el.style.display = "none";
}

export function scoreColor(n) {
  return n >= 80 ? "var(--green)"
       : n >= 60 ? "var(--accent)"
       : n >= 40 ? "var(--blue)"
       :           "var(--red)";
}
