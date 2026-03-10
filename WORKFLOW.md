# ?? WORKFLOW: AI-Assisted Development (2026)

> [!TIP]
> **PRE-SESSION: Starting a New Chat**
> Before starting, run \git pull\. Use this as your first message:

### ?? The Handoff Prompt
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

### ?? A11Y CHECKLIST
- [ ] ?? **Contrast:** Ratio at least 4.5:1.
- [ ] ?? **Keyboard:** Navigable via 'Tab' key.
- [ ] ??? **Landmarks:** UI inside <main>, <nav>, or <header>.
- [ ] ??? **Alt Text:** Images/icons have 'alt' tags.

---

> [!CAUTION]
> **??? SECURITY & SUBSCRIPTION PROTOCOL**
> 1. **Public Repo Rule:** Never hardcode passwords, secret keys (Stripe/Firebase Secret), or private emails.
> 2. **Client-Side Logic:** Assume the user can read all JS. Security must happen in **Firebase Rules**, not JS.
> 3. **Modular Privacy:** Keep user-specific data fetching restricted to the current Auth UID.
> 4. **AI Instruction:** Tell Claude: "Build this for a scalable, paid platform. Use secure patterns."
