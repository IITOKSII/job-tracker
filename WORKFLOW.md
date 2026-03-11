# 🛠 WORKFLOW: AI-Assisted Development (2026)

> [!TIP]
> **PRE-SESSION: Starting a New Chat**
> Before starting, run \git pull\. Use this as your first message:

### 🟦 The Handoff Prompt

**PROJECT CONTEXT:** WorkAble (Modular)  
**Architecture:** - \index.html\: UI Skeleton  
- \modules/app.js\: Logic/Firebase  
- \modules/style.css\: Styling  

**Latest Status:** [Paste from CHANGELOG.md]  
**Current Goal:** [Paste from TODO.md]  

---

> [!IMPORTANT]
> **DURING-SESSION: Coding Rules**
> 1. **Small Steps:** One function at a time.
> 2. **A11y First:** Proper labels and contrast.
> 3. **Modular:** No CSS/JS back into HTML.

---

> [!NOTE]
> **POST-SESSION: The Landing Sequence**
> 1. **Handoff:** Ask Claude for a "Handoff Prompt" for next time.
> 2. **Sync:** Run these in PowerShell:
>    \\\powershell
>    git add .
>    git commit -m "Update: [Progress]"
>    git push
>    \\\

---

---

## ⚙️ Automation & Environment

### PowerShell Execution Policy
The local machine's PowerShell execution policy is set to **RemoteSigned**.
This allows locally-created scripts (e.g. `.\sync.ps1`) to run without signing, while requiring downloaded scripts to be signed by a trusted publisher.

To verify or re-apply:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
Get-ExecutionPolicy -List
```

### Node.js & Local Dev Server
Node.js **v25.8.0** is installed at `C:\Program Files\nodejs\node.exe`.

The local dev server is a zero-dependency custom server (`server.js`) that runs on **port 3000** and correctly sets `Content-Type: application/javascript` for ES module imports (required since the project uses `type="module"` — a plain file server like `npx serve` will break MIME-type validation in strict browsers).

**To start the server:**
```powershell
node server.js
# → http://localhost:3000
```

> [!NOTE]
> When using Claude Code's `preview_start`, the launch config (`.claude/launch.json`) invokes the full binary path `C:\Program Files\nodejs\node.exe server.js` because `npx`/`.cmd` wrappers are not compatible with the preview tool on Windows.

### Sync Script — Pushing Changes
`.\sync.ps1` is the standard way to commit and push the **current working branch** to the remote:

```powershell
.\sync.ps1
```

It runs a full 7-step CI pipeline: smoke test -> commit -> push -> PR -> conflict check -> auto-merge.

> [!IMPORTANT]
> `sync.ps1` pushes to the **current branch** (e.g. `claude/my-branch`), **not directly to `main`**.
> The `main` branch is protected — Pull Requests are required, force-pushes and deletions are blocked.
> PRs require **0 approvals** — `sync.ps1` will auto-merge immediately once the conflict check passes.

### Claude Automation Authorization
**Claude is authorized to run these scripts directly via the terminal tool:**
- `node server.js` — start the local dev server
- `.\sync.ps1` — commit and push the current branch to origin
- Standard `git` commands (`status`, `log`, `diff`, `fetch`, `branch`)
- `gh` CLI commands for PR and branch management

---

## Tomorrow's Mission: The Clipper

### What We Are Building
**Method 1 of Smart Ingest: The WorkAble Clipper** — a Chrome Extension that lets users clip job listings directly from any browser tab into WorkAble.

> [!NOTE]
> **Pivot Decision:** The 'Paste URL' box approach has been dropped.
> The Clipper is the canonical Smart Ingest method going forward.

### Ground Rules for Extension Code
- All extension source lives exclusively in **`/extension/`** — no extension code in the main app modules.
- Every UI element in the extension popup/panel must be built with a **strict A11y lens** (see checklist below). This is non-negotiable.
- The extension is a separate build context — it does not share `modules/` imports. Shared logic must be duplicated or extracted to a neutral utility.

### Session Start Protocol (Do This First — Every Time)
Before a single line of extension code is written, run a **Full System Review**:

1. **Infrastructure check** — confirm `node server.js` starts clean, no port conflicts, no server.js regressions.
2. **Auth check** — verify Google Sign-In flow works end-to-end in the browser (sign in, sign out, reload).
3. **Firestore check** — confirm `userDocRef` pattern is intact: data saves and loads correctly for a signed-in user.

Only after all three checks pass do we open `/extension/` and start building.

### Clipper — Planned File Structure
```
/extension/
  manifest.json        -- Chrome Extension Manifest V3
  popup.html           -- Extension popup UI
  popup.js             -- Popup logic (clip, preview, send to WorkAble)
  content.js           -- Content script: scrapes job data from active tab
  background.js        -- Service worker: handles messaging between content/popup
  styles/
    popup.css          -- Popup styles (A11y-first: contrast, focus, sizing)
  icons/
    icon16.png
    icon48.png
    icon128.png
```

### A11y Requirements for the Clipper
All extension UI must pass the full A11y checklist below. The popup is a constrained UI surface — accessible design is easier here, not harder.

---

### 🟥 A11Y CHECKLIST
- [ ] 🎨 **Contrast:** Ratio at least 4.5:1.
- [ ] ⌨️ **Keyboard:** Navigable via 'Tab' key.
- [ ] 🗺️ **Landmarks:** UI inside <main>, <nav>, or <header>.
- [ ] 🖼️ **Alt Text:** Images/icons have 'alt' tags.
