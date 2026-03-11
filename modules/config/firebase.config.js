// Firebase project configuration and initialisation.
// To use a different Firebase project: edit FIREBASE_CONFIG below.
// Get values from: Firebase Console → Project Settings → General → Your apps → Web app

import { fb } from "../state.js";

export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDmAZzZkLosXBprTP9-z1pHQiQVRdh-Emk",
  authDomain:        "jobtrack-bcbcf.firebaseapp.com",
  projectId:         "jobtrack-bcbcf",
  storageBucket:     "jobtrack-bcbcf.firebasestorage.app",
  messagingSenderId: "905043988733",
  appId:             "1:905043988733:web:f5ed632fb58404b12dee94",
};

export function isFirebaseConfigured() {
  return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}

export function initFirebase() {
  if (!isFirebaseConfigured()) return false;
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    fb.db = firebase.firestore();
    fb.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    fb.ready = true;
    return true;
  } catch (e) {
    console.warn("Firebase init failed:", e);
    return false;
  }
}
