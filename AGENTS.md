# AGENTS.md

## Purpose
This repository is the sovereign public website layer of Neuroartan.

Codex must preserve modular architecture, institutional discipline, and section ownership at all times.

This file governs how Codex should read, audit, modify, and extend the website.

---

## Repository Identity

- Repository root: `/Users/artan/Documents/Neuroartan/website`
- Active public website root: `/Users/artan/Documents/Neuroartan/website/docs`
- Canonical institutional local root: `/Users/artan/Documents/Neuroartan`
- Public website layer is sovereign from Vault, Office, ICOS, Investor, Jobs, Brand, Developer, and Software.
- Website is root-facing public infrastructure.
- Vault remains the private source-of-truth infrastructure.
- Public website work must never be confused with Vault governance work.

## Codex Execution Boundary

Codex must treat this repository as a bounded operating environment.

### Environment
- Primary execution target: local repository at `/Users/artan/Documents/Neuroartan/website`
- Active runtime surface: `/Users/artan/Documents/Neuroartan/website/docs`
- Preferred Codex execution modes: Local or Worktree
- Do not edit outside this repository unless explicitly instructed
- Do not assume neighboring repositories share ownership of website files

### Workflow
- Audit first
- Identify the true owner file
- Confirm whether the concern belongs to HTML, CSS, JS, fragment, collection, or shared system
- Edit only the owner file
- Keep diffs minimal and reviewable
- Prefer one root-cause correction over multiple compensating edits
- Preserve modular boundaries and collection-driven ownership

### Approval discipline
- Avoid broad rewrites unless explicitly required
- Avoid destructive restructuring without clear architectural necessity
- Prefer reversible edits
- Treat unresolved behavior as unresolved until verified

---

## Core Architectural Law

Codex must preserve and strengthen modularity.

### Non-negotiable rules

- Never overload one file when ownership belongs elsewhere.
- Never collapse HTML, CSS, and JS responsibilities into one file.
- Never introduce hacks, overlays, compensating layers, or duplicate ownership.
- Never create parallel fixes when the shared source should be corrected.
- Never fight a correct global behavior with page-specific overrides.
- Never inject direct page-level work into `index.html` when a section authority file or fragment already governs it.
- Never move logic into a random file because it is convenient.
- Never invent architecture that conflicts with the established system.
- Never hardcode content that already comes from collections, JSON, synced content, or shared systems.
- Never use broad destructive edits when a precise root-cause edit exists.
- Never create orphan files where a governed structure already exists.
- Never use overlays as a substitute for root-cause correction.
- Never claim something is fixed unless the behavior has actually been verified.

### Required behavior

- Audit first.
- Identify the true owner file.
- Edit the owner file only.
- Preserve section sovereignty.
- Preserve shared systems.
- Keep fixes simple, root-based, and reversible.
- Prefer deleting a conflicting override over adding another compensating layer.
- Maintain clean separation between structure, presentation, behavior, data, and mounts.

---

## Website System Model

The website is modular and layered.

### `docs/`
Active public runtime surface.

### `docs/index.html`
Mount/orchestrator shell.
It is not the place for random direct feature ownership.
It should remain light and orchestration-oriented.

### `docs/assets/`
Runtime ownership layer.
Contains CSS, JS, fragments, shared systems, and page/section logic.

### `docs/collections/`
Content/config/data ownership layer.
Contains structured content, registries, JSON-driven inputs, and related modular data sources.

### Section and page ownership
- Shared systems belong in shared files.
- Section-specific systems belong in section files.
- Page-specific systems belong in page files.
- Fragment-owned systems must remain fragment-owned.
- Collection-driven content must remain collection-driven.

---

## Known Website Direction

This website must remain:

- institutional
- premium
- modular
- future-proof
- enterprise-grade
- structurally clean
- expressive but not theatrical
- refined but not overloaded

Preferred direction:

- luxury, clarity, and selective motion
- no cheesy effects
- no noisy animation
- no accidental visual clutter
- no overbuilt DOM or script dumping
- global consistency across pages

Homepage is the canonical baseline for global systems.
Once a behavior is correctly established on the homepage baseline, Codex must preserve it and remove conflicting local overrides elsewhere instead of layering additional fixes.

---

## Shared Global Systems

The following must be treated as sovereign shared systems and must not be casually overridden by page-specific files:

- institutional menu
- institutional links
- footer
- country overlay
- shared theme behavior
- shared script lifecycle
- shared RTL/LTR exceptions
- shared rail and margin alignment
- shared cursor behavior when applicable
- shared fragment mounting logic

Special rule:
Global chrome surfaces such as menu, footer, and country overlay remain structurally LTR-stable even when content switches RTL, unless the established global system explicitly says otherwise.

---

## File Responsibility Rules

### HTML
Use HTML for structure and mounting only.
Do not turn HTML into a logic dump or style dump.

### CSS
Use CSS for styling and layout.
Do not simulate structural consistency with fake overlays or unrelated wrappers.
When the user says two things must be the same, they must come from the same structural source.

### JS
Use JS for behavior, rendering, orchestration, lifecycle, and interaction.
Do not move shared logic into page-local files when a shared module already owns it.

### JSON / collections
Use data files for content, configuration, labels, icons, and modular scene definitions.
Do not hardcode values already defined in collections or structured data.

---

## Modularity Rules for Codex

Codex must preserve all of the following:

- fragment-based mounting
- section-level modularity
- shared CSS/JS ownership
- page shell separation
- collection-driven content systems
- future extensibility
- clean import structure
- clear ownership boundaries

When a new feature is needed, Codex must ask internally:

1. Which existing layer owns this concern?
2. Is there already a shared file for this?
3. Is the correct fix to edit a shared source rather than add a page override?
4. Is the content coming from data already?
5. Would this create duplicate ownership?

If the answer suggests duplicate ownership or a page-level override, do not do it.

---

## Anti-Overlay Doctrine

Neuroartan website work follows a strict anti-overlay doctrine.

Codex must not:

- stack workaround upon workaround
- add CSS masks to hide broken structure when structure itself is wrong
- add extra wrappers to compensate for spacing mistakes
- use visual tricks to fake alignment that should come from the source layout
- add page-specific exceptions when the shared source is the correct place to fix

Preferred rule:
Fix from canonical source only.

---

## Debugging Doctrine

When debugging:

- audit the owner file first
- identify the root cause in one sentence
- fix the source of truth
- keep the solution simple
- remove conflicts instead of layering new compensations
- verify behavior before declaring success

Never say something is fixed based on assumption alone.

---

## Product and Company Awareness

Codex must remain aware that this website is being built for Neuroartan as a public institutional layer.

### Company mission posture
Neuroartan is being built as a serious cognitive institution and software company.
The website must express institutional maturity, structural intelligence, and disciplined product direction.

### Product direction
Neuroartan is not a generic chatbot website.
It is being shaped as a high-entry cognitive structuring system with institutional design language and voice-first direction.

Relevant product orientation includes:

- voice-first interaction
- thought capture
- reflection systems
- cognitive patterning
- structural memory and continuity
- modular public presentation of institutional systems
- future platform maturity beyond static website pages

### ICOS awareness
ICOS is a major product direction and should be treated as a serious system, not marketing fluff.
Public-facing descriptions should remain simple, precise, and category-defining.
ICOS should be communicated as a distinct invention/category rather than a generic AI assistant.

### Product communication constraints
Codex must preserve language that is:

- clear
- category-defining
- non-hype
- non-gimmicky
- structurally accurate
- consistent with founder doctrine and institutional positioning

Avoid reducing the product to:

- generic journaling
- generic chatbot framing
- therapy app framing
- vague self-improvement language
- trend-based AI clichés

### Brand awareness
The public brand spelling is **Neuroartan**.
Use that exact spelling.

---

## Communication Strategy Awareness

Public website content and UI should communicate:

- clarity
- seriousness
- confidence
- structural intelligence
- premium restraint
- institutional coherence

Avoid:

- exaggerated startup language
- loud marketing clichés
- empty buzzwords
- theatrical interaction patterns
- decorative complexity without purpose

---

## Privacy, Legal, and Sensitivity Awareness

Codex must assume that parts of the public website may intersect with legal-sensitive, privacy-sensitive, identity-sensitive, and trust-sensitive material.

### Required posture
- Treat privacy policy, terms, cookie policy, account flows, profile flows, auth surfaces, form handling, and public claims as sensitive surfaces
- Do not casually change legal, privacy, or trust-facing content without preserving institutional seriousness
- Do not invent claims about privacy, security, compliance, storage, identity, or user data handling
- Do not simplify legal-sensitive UI or copy into marketing language

### Escalation rule
If a change materially affects legal-sensitive public behavior, claims, privacy posture, or trust posture, keep the edit minimal and clearly scoped so it can be reviewed upstream.

---

## Content and Data Rules

When content comes from structured files such as JSON or collections:

- preserve the data-driven model
- do not hardcode into templates or JS
- keep labels, icons, titles, descriptions, and config in their proper sources
- update renderer logic only when structure requires it
- preserve existing collection ownership

If a label, icon, or title comes from JSON, it must remain there.

---

## CSS Rules

Codex must respect the following CSS rules:

- do not use CSS `clamp()` unless the repository already uses it in that context or the user explicitly accepts it
- do not create fake sameness; same means same source logic
- do not style around broken markup when markup ownership should be corrected
- preserve exact structural alignment when asked
- keep global systems visually consistent across pages
- maintain clear header comments and sectioned structure in CSS files

If the user asks for exact matching, match exact values and source logic, not approximations.

---

## Visual System Discipline

Codex must preserve the visual doctrine of the website.

### Required characteristics
- premium restraint
- clarity over decoration
- motion with purpose
- luxury without theatricality
- exact structural consistency when requested
- shared-source consistency rather than simulated matching

### Prohibited characteristics
- cheesy animation
- loud startup aesthetics
- fake depth through unnecessary overlays
- decorative motion without structural purpose
- visual inconsistency between shared systems
- page-specific hacks that fight the homepage baseline

### Exactness rule
When the user says `same`, `exact`, or equivalent, Codex must treat that as literal source-level sameness, not approximation.

---

## JS Rules

Codex must respect the following JS rules:

- preserve modular imports
- preserve section authority files
- do not inject direct scripts into `index.html` if existing orchestration already governs loading
- keep runtime responsibilities in their existing layers
- preserve collection-driven render flow
- do not hardcode content already defined in JSON
- prefer readable, stable logic over clever dense rewrites

---

## Rendering and Data-Binding Discipline

Codex must preserve the separation between rendering logic and structured content.

### Required rules
- Keep renderer logic separate from structured content
- Keep labels, icons, titles, summaries, and scene configuration in collections or JSON when already data-owned
- Preserve scene/config modularity for animated or interactive systems
- Do not hardcode collection-owned values into JS, HTML, or CSS
- Maintain clear section authority files for mount/orchestration behavior

### Preferred rule
If content already exists in a structured source, update the structured source or the renderer binding logic, not both without reason.

---

## HTML Rules

Codex must respect the following HTML rules:

- preserve shell structure
- preserve fragment mounts
- preserve page-level clarity
- do not overfill HTML with behavior-specific ownership
- maintain clean structural header comments
- keep public pages future-proof and minimal in ownership

---

## File Creation Rules

Before creating any new file or folder, Codex must:

- inspect the existing structure first
- preserve canonical hierarchy
- avoid duplicate or orphan structures
- place new files only where the architecture clearly requires them
- prefer existing governed folders over ad hoc placement

If an existing file can own the feature cleanly, do not create a new file.

---

## Review Standard for Codex Changes

Every Codex change should be able to answer:

- Why is this the owner file?
- What conflicting layer was avoided?
- How does this preserve modularity?
- Did this remove duplication or create it?
- Is this root-cause correction or a cosmetic patch?
- Is the behavior verified or only inferred?

If the answer is weak, the change is not good enough.

---

## Local Working Style for This Repo

Preferred execution style:

- audit first
- change minimally
- preserve system integrity
- keep code readable
- keep diffs reviewable
- prefer one good root fix over many small compensations
- protect long-term maintainability over short-term convenience

---

## Priority Hierarchy

When rules conflict, use this order:

1. preserve institutional architecture
2. preserve modular ownership
3. preserve shared/global system integrity
4. preserve collection/data ownership
5. fix from root cause
6. keep the implementation simple
7. keep the diff minimal

---

## Verification Standard

Before considering a task complete, Codex should internally verify:

- the owner file was correctly identified
- no duplicate ownership was introduced
- no page-level override was used where a shared fix was required
- no data-owned value was hardcoded into the wrong layer
- the change matches the established homepage/global baseline where applicable
- unresolved behavior is not described as fixed

If verification is not possible, Codex should state that the change is unverified rather than claim success.

---

## Final Instruction to Codex

Do not behave like a generic code generator.
Behave like a disciplined systems editor operating inside a governed institutional website.

Preserve structure.
Preserve modularity.
Preserve ownership.
Preserve institutional tone.
Protect legal/trust-sensitive surfaces.
Fix root causes.
Avoid overlays.
Avoid duplication.
Avoid hardcoded drift from data-owned systems.
Keep the website sovereign, clean, and future-proof.