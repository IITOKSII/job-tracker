// ── WorkAble Data Type Definitions ──────────────────────────────────────────
// TypeScript-style interface documentation for all Firestore-persisted objects.
// This file is import-free (assets layer — zero dependencies).
//
// ════════════════════════════════════════════════════════════════════════════
// FIRESTORE SCHEMA REPORT
// ════════════════════════════════════════════════════════════════════════════
//
// Root path: users/{uid}/
//
//   Sub-collection: settings/
//     Document ID  : any key string (e.g. "gemini_key", "jt_jobs", "jt_resume_tpl")
//     Fields       : { value: any, updated: string }   ← ISO timestamp
//     Purpose      : Per-user key/value store (API keys, templates, local mirrors)
//
//   Sub-collection: data/
//     Document IDs : "jobs" | "resumes" | "covers"
//     Fields       : { items: string, updated: string }
//                    items = JSON.stringify(Job[] | Document[] | Document[])
//     Purpose      : Blob storage for each top-level data array
//
// ════════════════════════════════════════════════════════════════════════════
// SECURITY FINDINGS
// ════════════════════════════════════════════════════════════════════════════
//
// ✔  Firebase apiKey in firebase.config.js is a PUBLIC project identifier —
//    not a secret. Firebase security is enforced by Firestore Security Rules,
//    not by keeping this key private. No remediation required.
//
// ✔  Gemini API key is stored at runtime in Firestore (settings/gemini_key)
//    and in localStorage — never in source code. No hardcoded secrets found.
//
// ✔  All Firestore paths are scoped to the authenticated user's UID.
//    Cross-user access is structurally impossible (no shared collections).
//    See firestore.rules for the enforced Owner-Only rule.
//
// ════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} InterviewQuestion
 * @property {"Behavioral"|"Technical"|"Role-Specific"|"Situational"|"Culture Fit"} type
 * @property {string} question
 * @property {string} answer  - STAR-method suggested answer
 */

/**
 * @typedef {Object} ApplicationQuestion
 * @property {string} question  - Screening question from the job ad itself
 */

/**
 * @typedef {Object} CompanyFact
 * @property {string} label  - e.g. "Industry", "Size", "Culture"
 * @property {string} value
 */

/**
 * @typedef {Object} Job
 * @property {number} id                              - Date.now() at creation
 * @property {string} url                             - Source URL (empty for paste-in jobs)
 * @property {string} title
 * @property {string} company
 * @property {string} location
 * @property {string} salary                          - "N/A" if not listed
 * @property {string} description                     - 2-3 sentence AI summary
 * @property {string[]} requirements
 * @property {ApplicationQuestion[]} application_questions
 * @property {InterviewQuestion[]} interview_questions
 * @property {CompanyFact[]} company_facts
 * @property {"saved"|"applied"|"interview"|"offer"|"rejected"} status
 * @property {string} notes                           - Free-text user notes
 * @property {string} date                            - ISO timestamp of creation
 * @property {string} [rawText]                       - Present only for paste-in jobs
 * @property {number} [parentId]                      - Version child: points to the root document's id
 * @property {"clipper"} [source]                     - Present only for Clipper extension jobs
 * @property {boolean} [seen]                         - false → shows amber "NEW" badge (Clipper jobs)
 * @property {BarrierLog[]} [barriers]               - User-logged accessibility/process barriers for this job
 * @property {A11yRating} [a11yRating]               - AI-extracted accessibility rating
 * @property {JobSection[]} [breakdown]               - Detailed, structured breakdown of the job
 */

/**
 * @typedef {Object} JobSection
 * @property {string} section                         - e.g. "Role Overview", "Responsibilities", "Perks & Benefits"
 * @property {string[]} items                         - Bullet points for this section
 */

/**
 * @typedef {Object} A11yRating
 * @property {number} score                           - 1 to 5 based on disclosed support
 * @property {string} details                         - Brief justification for the score
 * @property {string[]} criteria                      - Key a11y points found (e.g. "Adjustments mentioned", "Inclusion policy")
 */

/**
 * @typedef {Object} BarrierLog
 * @property {number} id                              - Date.now() at creation
 * @property {"site-friction"|"process-barrier"|"unresponsive"} type
 * @property {string} description                     - Free-text description of the barrier
 * @property {string} date                            - ISO timestamp of when the barrier was logged
 */

/**
 * @typedef {Object} Document
 * @property {number} id          - Date.now() at creation
 * @property {string} name        - User-assigned display name
 * @property {string} content     - Full plain-text content
 * @property {number} wordCount   - Cached word count
 * @property {string} created     - ISO timestamp of creation
 * @property {string} updated     - ISO timestamp of last save
 * @property {number} [parentId]  - If set, this document is a version child; points to root document's id
 */

// Document is used for both Resumes (state.resumes) and Cover Letters (state.covers).
// The arrays are stored separately in Firestore under data/resumes and data/covers.

export const WORKABLE_TYPES = "defined-above"; // prevents tree-shaking of this file
