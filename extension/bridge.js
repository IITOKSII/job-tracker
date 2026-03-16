// WorkAble Clipper — bridge.js
// Injected into the WorkAble app page (world: "MAIN") so it runs in the page
// JS context. Exposes window.storage as a chrome.storage.local proxy so
// db.service.js can transparently read/write clipped jobs via the extension.
//
// Storage contract (matches db.service.js storeGet/storeSet):
//   get(key)        → Promise<{ value: string } | null>
//   set(key, value) → Promise<void>
//
// This file runs at document_start — before any app JS — so window.storage
// is already set when WorkAble's boot sequence runs.

(function () {
  "use strict";

  if (window.__workableClipper) return; // guard against double-injection
  window.__workableClipper = true;

  window.storage = {
    get(key) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(key, data => {
          if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
          resolve(data[key] || null);
        });
      });
    },
    set(key, value) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: { value } }, () => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve();
        });
      });
    },
  };

  // Signal to the app that the Clipper extension is present
  window.__clipperVersion = "1.0.0";
})();
