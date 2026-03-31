// Capabal.app Clipper — content.js
// Extracts job data from popular job sites.
// Runs on all pages at document_idle; responds to SCRAPE_JOB messages from popup.

(function () {
  "use strict";

  // ── Utilities ────────────────────────────────────────────────────────────────

  function text(selector, root) {
    return (root || document).querySelector(selector)?.textContent.trim() || "";
  }

  function metaContent(name) {
    const el = document.querySelector(
      `meta[name="${name}"], meta[property="${name}"]`
    );
    return el ? el.getAttribute("content") || "" : "";
  }

  function bodyText(selector, root) {
    return (root || document).querySelector(selector)?.innerText.trim().substring(0, 4000) || "";
  }

  // ── Site scrapers ─────────────────────────────────────────────────────────────

  function scrapeLinkedIn() {
    const title =
      text("h1.job-details-jobs-unified-top-card__job-title") ||
      text("h1.topcard__title");
    const company =
      text(".job-details-jobs-unified-top-card__company-name a") ||
      text(".topcard__org-name-link") ||
      text(".topcard__flavor--black-link");
    const location =
      text(".job-details-jobs-unified-top-card__primary-description-without-modal .tvm__text") ||
      text(".topcard__flavor.topcard__flavor--bullet");
    const salary =
      text(".job-details-jobs-unified-top-card__job-insight--highlight span") ||
      "N/A";
    const description = bodyText("#job-details") || bodyText(".description__text");
    return { title, company, location, salary, description };
  }

  function scrapeIndeed() {
    const title =
      text("h1.jobsearch-JobInfoHeader-title") ||
      text("[data-testid='jobsearch-JobInfoHeader-title']");
    const company =
      text("[data-testid='inlineHeader-companyName'] a") ||
      text(".jobsearch-InlineCompanyRating-companyHeader a") ||
      text("[data-testid='company-name']");
    const location =
      text("[data-testid='job-location']") ||
      text(".jobsearch-JobInfoHeader-subtitle div:last-child");
    const salary =
      text("[data-testid='attribute_snippet_testid']") ||
      text(".salary-snippet") ||
      text("[data-testid='salaryInfoAndJobType']") ||
      "N/A";
    const description = bodyText("#jobDescriptionText");
    return { title, company, location, salary, description };
  }

  function scrapeSeek() {
    const title =
      text("[data-automation='job-detail-title']") ||
      text("h1[class*='Title'], h1[class*='title']");
    const company =
      text("[data-automation='advertiser-name']") ||
      text("[class*='AdvertiserName'], [class*='advertiserName']");
    const location =
      text("[data-automation='job-detail-location']") ||
      text("[class*='Location'][class*='job'], [class*='jobLocation']");
    const salary =
      text("[data-automation='job-detail-salary']") ||
      "N/A";
    const description = bodyText("[data-automation='jobAdDetails']");
    return { title, company, location, salary, description };
  }

  function scrapeJora() {
    const title = text("h1.job-title") || text(".job-header h1") || text("h1");
    const company =
      text(".company-name") ||
      text("[class*='company-name']") ||
      text("[class*='companyName']");
    const location =
      text(".location") ||
      text("[class*='job-location']") ||
      text("[class*='jobLocation']");
    const description = bodyText(".job-description") || bodyText("[class*='description']");
    return { title, company, location, salary: "N/A", description };
  }

  function scrapeGlassdoor() {
    const title =
      text("[data-test='job-title']") ||
      text("h1[class*='JobDetails']") ||
      text("h1");
    const company =
      text("[data-test='employer-name']") ||
      text("[class*='EmployerName']");
    const location =
      text("[data-test='location']") ||
      text("[class*='JobDetails'] [class*='location']");
    const salary =
      text("[data-test='detailSalary']") ||
      text("[class*='SalaryEstimate']") ||
      "N/A";
    const description = bodyText("[class*='JobDetails__JobDescription']") || bodyText("[class*='jobDescriptionContent']");
    return { title, company, location, salary, description };
  }

  function scrapeWorkable() {
    const title = text("h1.job-title") || text("h1[class*='title']") || text("h1");
    const company = text("[class*='company-name']") || metaContent("og:site_name");
    const location = text("[class*='location']") || text("[class*='workplace-type']");
    const description = bodyText("[class*='job-description']") || bodyText("[class*='details']");
    return { title, company, location, salary: "N/A", description };
  }

  function scrapeGeneric() {
    const title =
      text("h1") ||
      metaContent("og:title") ||
      document.title.split("|")[0].split("-")[0].trim();
    const company =
      metaContent("og:site_name") ||
      text("[class*='company'], [class*='employer'], [class*='organisation']") ||
      "";
    const location =
      text("[class*='location'], [class*='Location']") ||
      metaContent("geo.region") ||
      "";
    const description =
      metaContent("description") ||
      metaContent("og:description") ||
      bodyText("article") ||
      bodyText("main") ||
      bodyText("[class*='job'], [class*='description']") ||
      "";
    return { title, company, location, salary: "N/A", description };
  }

  // ── Canonical URL helpers ─────────────────────────────────────────────────────

  function linkedInCanonicalUrl() {
    // Prefer the title link href (already a clean /jobs/view/ID path)
    const titleLink = document.querySelector("a.job-details-jobs-unified-top-card__job-title");
    if (titleLink) {
      const m = titleLink.href.match(/\/jobs\/view\/(\d+)/);
      if (m) return `https://www.linkedin.com/jobs/view/${m[1]}`;
    }
    // Fall back: extract ID from current URL
    const m = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
    if (m) return `https://www.linkedin.com/jobs/view/${m[1]}`;
    return window.location.href;
  }

  function seekCanonicalUrl() {
    // 1. Prefer <link rel="canonical"> if it contains a job ID
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical?.href) {
      const mc = canonical.href.match(/\/job\/(\d+)/);
      if (mc) return `https://www.seek.com.au/job/${mc[1]}`;
    }
    // 2. Pathname match (direct job page URL)
    const mp = window.location.pathname.match(/\/job\/(\d+)/);
    if (mp) return `https://www.seek.com.au/job/${mp[1]}`;
    // 3. Search page: find the active/highlighted job card link in the results sidebar
    const activeLink =
      document.querySelector('[data-automation="jobTitle"][href*="/job/"]') ||
      document.querySelector('a[href*="/job/"][aria-current]') ||
      document.querySelector('a[href*="/job/"][class*="active"]') ||
      document.querySelector('[data-job-id]');
    if (activeLink) {
      const href = activeLink.getAttribute("href") || "";
      const mh = href.match(/\/job\/(\d+)/);
      if (mh) return `https://www.seek.com.au/job/${mh[1]}`;
      const did = activeLink.getAttribute("data-job-id");
      if (did) return `https://www.seek.com.au/job/${did}`;
    }
    return window.location.href;
  }

  // ── Dispatcher ────────────────────────────────────────────────────────────────

  function scrape() {
    const host = window.location.hostname.toLowerCase();
    let data;
    let canonicalUrl = window.location.href;

    if (host.includes("linkedin.com"))     { data = scrapeLinkedIn();  canonicalUrl = linkedInCanonicalUrl(); }
    else if (host.includes("indeed.com"))  { data = scrapeIndeed(); }
    else if (host.includes("seek.com"))    { data = scrapeSeek();       canonicalUrl = seekCanonicalUrl(); }
    else if (host.includes("jora.com"))    { data = scrapeJora(); }
    else if (host.includes("glassdoor.")) { data = scrapeGlassdoor(); }
    else if (host.includes("workable."))  { data = scrapeWorkable(); }
    else                                   { data = scrapeGeneric(); }

    // Quality gate — if we got nothing useful fall back to generic
    if (!data.title && !data.company) data = scrapeGeneric();

    return {
      title:       data.title       || "",
      company:     data.company     || "",
      location:    data.location    || "",
      salary:      data.salary      || "N/A",
      description: data.description || "",
      requirements: [],
      url:         canonicalUrl,
      source:      host,
    };
  }

  // ── Message handler ───────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "SCRAPE_JOB") {
      try {
        const data = scrape();
        // Consider the scrape successful if we have at least a title or company
        const detected = !!(data.title || data.company);
        sendResponse({ ok: true, detected, data });
      } catch (e) {
        sendResponse({ ok: false, detected: false, data: null, error: e.message });
      }
    } else if (msg.type === "GET_GEMINI_KEY") {
      // Read from the page's localStorage (where Capabal.app stores the key)
      try {
        sendResponse({ key: localStorage.getItem("gemini_key") || null });
      } catch (_e) {
        sendResponse({ key: null });
      }
    }
    return true;
  });
})();
