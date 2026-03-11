// Central mutable application state — import this object, mutate it in-place.
// All modules share the same reference so changes are immediately visible everywhere.

export const state = {
  jobs:            [],
  resumes:         [],
  covers:          [],
  currentJobId:    null,
  currentFilter:   "all",
  boardView:       "grid",
  selectedCvJobId: null,
  activeTemplate:  null,
  editingDocId:    { resume: null, cover: null },
  resumeTemplate:  "modern",
  coverTemplate:   "modern",
};

// Firebase + API runtime values (not serialisable — don't persist these)
export const fb = {
  user:         null,   // firebase.User | null
  db:           null,   // firebase.firestore.Firestore | null
  ready:        false,
  apiKey:       "",
  workingModel: "",
};
