// Capabal.app Clipper — bridge-relay.js
// Runs in ISOLATED world (default content script context).
// Has access to chrome.storage.local. Relays requests from bridge.js (MAIN world)
// via window.postMessage and sends back results.

(function () {
  "use strict";

  window.addEventListener("message", async (event) => {
    if (event.source !== window || !event.data?.__workableBridge) return;
    const { id, method, args } = event.data;

    try {
      let result;

      if (method === "get") {
        const key = args[0];
        result = await new Promise((resolve, reject) => {
          chrome.storage.local.get(key, data => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message)); return;
            }
            resolve(data[key] || null);
          });
        });

      } else if (method === "set") {
        const [key, value] = args;
        result = await new Promise((resolve, reject) => {
          chrome.storage.local.set({ [key]: { value } }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message)); return;
            }
            resolve();
          });
        });
      }

      window.postMessage({ __workableBridgeReply: true, id, result: result ?? null }, "*");
    } catch (e) {
      window.postMessage({ __workableBridgeReply: true, id, error: e.message }, "*");
    }
  });
})();
