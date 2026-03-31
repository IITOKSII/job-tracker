// Capabal.app Clipper — bridge.js
// Runs in world: "MAIN" (page JS context). chrome.* APIs are NOT available here.
// Communicates with bridge-relay.js (ISOLATED world) via postMessage to access
// chrome.storage.local. bridge-relay.js must be loaded alongside this file.
//
// Storage contract (matches db.service.js storeGet/storeSet):
//   get(key)        → Promise<{ value: string } | null>
//   set(key, value) → Promise<void>

(function () {
  "use strict";

  if (window.__workableClipper) return; // guard against double-injection
  window.__workableClipper = true;

  let _nextId = 0;
  const _pending = new Map();

  // Receive replies from bridge-relay.js (ISOLATED world)
  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data?.__workableBridgeReply) return;
    const { id, result, error } = event.data;
    const p = _pending.get(id);
    if (!p) return;
    _pending.delete(id);
    if (error) p.reject(new Error(error));
    else p.resolve(result);
  });

  function call(method, args) {
    return new Promise((resolve, reject) => {
      const id = ++_nextId;
      _pending.set(id, { resolve, reject });
      window.postMessage({ __workableBridge: true, id, method, args }, "*");
    });
  }

  window.storage = {
    get(key)        { return call("get", [key]); },
    set(key, value) { return call("set", [key, value]); },
  };

  window.__clipperVersion = "1.0.0";
})();
