// Navigation: view switching and mobile nav helpers.
// All render functions are called via window.* to avoid circular imports.

export function showView(v) {
  ["dashboard", "analytics", "add", "cv", "resumes", "covers", "emails", "settings"].forEach(n => {
    document.getElementById("view-" + n).style.display = n === v ? "" : "none";
    const nb = document.getElementById("nav-" + n);
    if (nb) nb.classList.toggle("active", n === v);
  });

  // Sync mobile bottom-tab active state
  const mobMap = { dashboard: "mob-dashboard", add: "mob-add", resumes: "mob-resumes", covers: "mob-covers" };
  document.querySelectorAll(".mob-tab").forEach(t => t.classList.remove("active"));
  if (mobMap[v]) { const mt = document.getElementById(mobMap[v]); if (mt) mt.classList.add("active"); }
  else           { const mm = document.getElementById("mob-more"); if (mm) mm.classList.add("active"); }

  const moreMenu = document.getElementById("mob-more-menu");
  if (moreMenu) moreMenu.classList.remove("open");
  document.querySelector(".main")?.scrollTo(0, 0);

  // Delegate rendering to the relevant module (exposed on window by app.js)
  if (v === "dashboard") window.renderDashboard();
  if (v === "analytics") window.renderAnalytics();
  if (v === "cv")        window.renderCVJobList();
  if (v === "resumes")   window.renderResumeList();
  if (v === "covers")    window.renderCoverList();
  if (v === "emails")    window.renderEmailTemplates();
}

export function mobNav(v) { showView(v); }

export function toggleMobMore() {
  document.getElementById("mob-more-menu").classList.toggle("open");
}

// Close the mobile "more" menu when user taps anywhere else
document.addEventListener("click", (e) => {
  const menu = document.getElementById("mob-more-menu");
  const btn  = document.getElementById("mob-more");
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target))
    menu.classList.remove("open");
});
