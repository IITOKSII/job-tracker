/**
 * app.js — Bootstrap
 * Imports all modules, wires window.* for HTML onclick compatibility,
 * installs polyfills, and starts the app.
 */

// ── Polyfills ────────────────────────────────────────────────────────────────
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}
if (typeof pdfjsLib !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";
  pdfjsLib.disableWorker = true;
}

// ── Imports ──────────────────────────────────────────────────────────────────
import { initFirebase } from "./config/firebase.config.js";
import { loadA11yPrefs } from "./a11y/toolbar.js";
import { loadAllData } from "./services/auth.service.js";

// Navigation
import { showView, mobNav, toggleMobMore } from "./ui/nav.js";

// Dashboard
import {
  setFilter, setView, quickDelete,
  renderDashboard, renderGrid, renderKanban, renderStats,
} from "./ui/dashboard.js";

// Jobs
import {
  setAddMode, analyseJob, analyseJobText,
  renderCVJobList, selCvJob, analyseCV,
} from "./features/jobs.js";

// Documents
import {
  renderResumeList, renderCoverList,
  newDocument, editDocument, viewDocument, closeDocEditor,
  saveDocument, deleteDocument,
  duplicateResume, duplicateResumeById,
  duplicateCover, duplicateCoverById,
  populateCoverJobSelect, populateResumeJobSelect,
  triggerUpload, handleDocUpload,
} from "./features/documents.js";

// Preview engine
import {
  setResumeTemplate, setCoverTemplate,
  setEditorMode, refreshPreview, updateWordCount,
  renderResumePreview, renderCoverPreview, downloadDoc,
} from "./features/preview-engine.js";

// Modal
import {
  openModal, closeModal, updateStatus,
  saveInterviewDate, saveInterviewType, saveNotes,
  deleteFromModal, clearAllData, quickGenCoverFromModal,
  renderTimeline, renderChecklist, toggleChecklistItem,
} from "./features/modal.js";

// Analytics
import { renderAnalytics } from "./features/analytics.js";

// Email
import {
  renderEmailTemplates, selectTemplate,
  updateEmailWC, generateEmailFromJob,
  copyEmail, saveEmailAsCover,
} from "./features/email.js";

// AI editor
import {
  toggleAIPanel, setInstruction, aiEditDocument,
  newDocumentFromJob, closeGenModal, fillResumeFromSaved,
  generateCoverLetter, openResumeGenerator, closeResumeGenModal,
  generateResume, autoTailorResume,
  exportAllData, importAllData,
} from "./features/ai-editor.js";

// Auth
import {
  signInWithGoogle, signOut, updateAuthUI,
  saveKey, updateKey,
} from "./services/auth.service.js";

// Accessibility
import {
  ttsSpeak, ttsPause, ttsStop, ttsCycleSpeed,
  startVoiceInput, addVoiceButtons,
} from "./a11y/tts.js";
import {
  toggleA11yPanel, toggleA11y,
  setTextSize, setLineSpacing,
} from "./a11y/toolbar.js";

// Storage helpers (for window exposure)
import { saveJobs, saveResumes, saveCovers } from "./services/db.service.js";

// ── Expose on window (HTML onclick compatibility) ────────────────────────────
Object.assign(window, {
  // Nav
  showView, mobNav, toggleMobMore,

  // Dashboard
  setFilter, setView, quickDelete,
  renderDashboard, renderGrid, renderKanban, renderStats,

  // Jobs
  setAddMode, analyseJob, analyseJobText,
  renderCVJobList, selCvJob, analyseCV,

  // Documents
  renderResumeList, renderCoverList,
  newDocument, editDocument, viewDocument, closeDocEditor,
  saveDocument, deleteDocument,
  duplicateResume, duplicateResumeById,
  duplicateCover, duplicateCoverById,
  populateCoverJobSelect, populateResumeJobSelect,
  triggerUpload, handleDocUpload,

  // Preview
  setResumeTemplate, setCoverTemplate,
  setEditorMode, refreshPreview, updateWordCount,
  renderResumePreview, renderCoverPreview, downloadDoc,

  // Modal
  openModal, closeModal, updateStatus,
  saveInterviewDate, saveInterviewType, saveNotes,
  deleteFromModal, clearAllData, quickGenCoverFromModal,
  renderTimeline, renderChecklist, toggleChecklistItem,

  // Analytics
  renderAnalytics,

  // Email
  renderEmailTemplates, selectTemplate,
  updateEmailWC, generateEmailFromJob,
  copyEmail, saveEmailAsCover,

  // AI editor
  toggleAIPanel, setInstruction, aiEditDocument,
  newDocumentFromJob, closeGenModal, fillResumeFromSaved,
  generateCoverLetter, openResumeGenerator, closeResumeGenModal,
  generateResume, autoTailorResume,
  exportAllData, importAllData,

  // Auth
  signInWithGoogle, signOut, updateAuthUI,
  saveKey, updateKey,

  // Accessibility
  ttsSpeak, ttsPause, ttsStop, ttsCycleSpeed,
  startVoiceInput, addVoiceButtons,
  toggleA11yPanel, toggleA11y,
  setTextSize, setLineSpacing,

  // DB helpers (used by modal clearAllData etc.)
  saveJobs, saveResumes, saveCovers,
});

// ── Boot ─────────────────────────────────────────────────────────────────────
initFirebase();
loadAllData();
loadA11yPrefs();
