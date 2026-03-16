# Firebase Agent Skills Definitions
- Database: Firestore (Compat SDK v10.12.2)
- Auth: Google Sign-In (Firebase Auth)
- Pattern: Triple-guarded storage (Firestore > Extension > LocalStorage)
- Rules: Enforce strict role-based access in Firestore security rules.
- Schema: 
  - `users/{uid}/data/jobs`: JSON string of job objects
  - `users/{uid}/data/resumes`: JSON string of resume objects
  - `users/{uid}/data/covers`: JSON string of cover letter objects
  - `users/{uid}/settings/{key}`: Key-value settings storage