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

It runs `git add . && git commit && git push origin HEAD`.

> [!IMPORTANT]
> `sync.ps1` pushes to the **current branch** (e.g. `claude/my-branch`), **not directly to `main`**.
> The `main` branch is protected — it requires a Pull Request and at least 1 approved review before merging. Force-pushes and direct deletions are blocked.
> After running `sync.ps1`, open a PR on GitHub to merge into `main`.

### Claude Automation Authorization
**Claude is authorized to run these scripts directly via the terminal tool:**
- `node server.js` — start the local dev server
- `.\sync.ps1` — commit and push the current branch to origin
- Standard `git` commands (`status`, `log`, `diff`, `fetch`, `branch`)
- `gh` CLI commands for PR and branch management

---

### 🟥 A11Y CHECKLIST
- [ ] 🎨 **Contrast:** Ratio at least 4.5:1.
- [ ] ⌨️ **Keyboard:** Navigable via 'Tab' key.
- [ ] 🗺️ **Landmarks:** UI inside <main>, <nav>, or <header>.
- [ ] 🖼️ **Alt Text:** Images/icons have 'alt' tags.
