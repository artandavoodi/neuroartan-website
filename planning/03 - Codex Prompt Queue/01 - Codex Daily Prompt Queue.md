---
type: Execution Queue
subtype: "Codex Daily Prompt Queue"

title: "Codex Daily Prompt Queue"
document_id: "NA-WEBSITE-PLANNING-CODEX-QUEUE-0001"

classification: Internal
authority_level: Departmental
department: "Website Systems & Development"
office: "Website Planning"
owner: "Website Systems & Development Agent"

stakeholders:
  - "Founder / CEO"
  - "Website Systems & Development Agent"
  - "Codex"
  - "Developer Operations"
  - "GitHub Repository Workflow"

legal_sensitive: false
requires_gc_review: false
requires_creo_review: true
approval_status: Draft

gsa_protocol: "Pending Founder Validation"
gsa_approved: false

status: Active
lifecycle: Draft
system: "Website Planning"

spine_version: "1.0"
template_lock: "Global Document Metadata Standard"
version: "0.1"

created_date: "2026-05-02"
last_updated: "2026-05-02"
last_reviewed: "2026-05-02"
review_cycle: "Daily"

effective_date: "2026-05-02"

publish: false
publish_to_website: false
featured: false
visibility: Internal
institutional_visibility: Departmental

scope:
  - "Codex daily prompt governance"
  - "AI Development Cockpit implementation prompts"
  - "Website modular development sequencing"
  - "Prompt-by-prompt execution control"
  - "Limited-rate Codex usage discipline"

index_targets:
  - "Website Planning Index"
  - "Codex Prompt Queue Register"
  - "AI Development Cockpit Planning Layer"

vault_path: "/Users/artan/Documents/Neuroartan/website/planning/03 - Codex Prompt Queue/01 - Codex Daily Prompt Queue.md"

related:
  - "/Users/artan/Documents/Neuroartan/website/planning/00 - Index & Dashboards/00 - Website Planning Index.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/01 - Strategic Decisions/01 - Web App Development Continuity Decision.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/02 - Execution Roadmaps/01 - Thirty Day AI Development Cockpit Roadmap.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/01 - AI Development Cockpit Architecture Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/05 - Provider & Runtime Strategy/01 - Model Provider Strategy.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/06 - GitHub & Terminal Workflows/01 - Repository Development Workflow Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/07 - Daily Execution Records/01 - Daily Execution Log.md"

tags:
  - "website-planning"
  - "codex-prompt-queue"
  - "ai-development-cockpit"
  - "daily-execution"
  - "development-continuity"
---

# Codex Daily Prompt Queue

---

## 1. Purpose

This document governs the daily Codex prompt queue for the AI Development Cockpit implementation cycle.

The queue exists to preserve Codex usage discipline under limited availability and to prevent broad, uncontrolled, or overloaded implementation requests.

Each prompt must define one bounded implementation objective.

---

## 2. Operating Rule

Only one Codex prompt should be executed at a time.

Each prompt must be followed by:

1. terminal scan or browser verification
2. ChatGPT surgical review
3. correction of any root issue
4. documentation of completion state
5. preparation of the next prompt

No prompt may ask Codex to redesign the entire website or create an overloaded monolithic implementation.

---

## 3. Prompt Requirements

Each Codex prompt must include:

- exact active root
- exact target scope
- files and folders allowed for creation
- files and folders forbidden from modification
- modular architecture requirements
- no-overlay rule
- no-hardcode rule
- no-monolithic-file rule
- verification output request
- expected completion summary

---

## 4. Daily Prompt Queue

### Prompt 01 — AI Development Cockpit Structural Foundation

Status: Draft

Purpose: Create the modular AI Development Cockpit structure inside the website layer without overloading existing homepage files.

Prompt:

```text
You are working inside the active Neuroartan website repository.

Active root:
/Users/artan/Documents/Neuroartan/website

Mission:
Create the structural foundation for an AI Development Cockpit as a modular internal web app layer. This cockpit will support prompt composition, terminal scan generation, file path targeting, patch instruction generation, GitHub commit message generation, model provider routing, and daily execution logging.

Non-negotiable rules:
- Do not modify unrelated homepage, product, legal, or global navigation files.
- Do not overload any existing file.
- Do not create monolithic HTML, CSS, or JS.
- Do not hardcode model providers into UI behavior.
- Do not add workaround layers, overlays, or compatibility hacks.
- Preserve existing website architecture and token systems.
- Use modular fragments, CSS, JS, and JSON data files.
- Create only empty or minimal scaffold files unless implementation is explicitly requested.
- Add clear file header comments to every HTML, CSS, and JS file.

Create this structure if it does not already exist:

website/docs/pages/development-cockpit/index.html
website/docs/assets/fragments/layers/website/development-cockpit/development-cockpit-shell.html
website/docs/assets/css/layers/website/development-cockpit/development-cockpit.css
website/docs/assets/css/layers/website/development-cockpit/development-cockpit-shell.css
website/docs/assets/js/layers/website/development-cockpit/development-cockpit.js
website/docs/assets/js/layers/website/development-cockpit/development-cockpit-shell.js
website/docs/assets/data/website/development-cockpit/provider-registry.json
website/docs/assets/data/website/development-cockpit/workflow-registry.json
website/docs/assets/data/website/development-cockpit/prompt-template-registry.json

Required modules to scaffold:
- prompt-composer
- terminal-scan-generator
- file-target-selector
- patch-instruction-generator
- github-commit-message-generator
- open-file-next-workflow
- provider-router
- daily-execution-log

For each module, create separate fragment, CSS, and JS files under the development-cockpit layer using clear names.

Expected output:
1. List all created files.
2. List all modified files.
3. Confirm no unrelated files were modified.
4. Provide the next verification command.
```

---

### Prompt 02 — Prompt Composer Baseline

Status: Pending

Purpose: Implement the first usable prompt composer shell after the structure is created and verified.

Prompt: Pending after Prompt 01 verification.

---

### Prompt 03 — Terminal Scan Generator Baseline

Status: Pending

Purpose: Implement the first reusable terminal scan generator workflow.

Prompt: Pending after Prompt 02 verification.

---

### Prompt 04 — File Target Selector Baseline

Status: Pending

Purpose: Implement exact-path file targeting for open/edit workflows.

Prompt: Pending after Prompt 03 verification.

---

### Prompt 05 — Patch Instruction Generator Baseline

Status: Pending

Purpose: Implement structured patch instruction generation based on target file, issue, and root-cause description.

Prompt: Pending after Prompt 04 verification.

---

### Prompt 06 — GitHub Commit Message Generator Baseline

Status: Pending

Purpose: Implement repository commit message generation for completed verified changes.

Prompt: Pending after Prompt 05 verification.

---

### Prompt 07 — Provider Registry and Router Baseline

Status: Pending

Purpose: Implement provider abstraction scaffolding for cloud, local, and manual provider modes.

Prompt: Pending after Prompt 06 verification.

---

### Prompt 08 — Daily Execution Log Baseline

Status: Pending

Purpose: Implement the first cockpit-facing daily execution log structure.

Prompt: Pending after Prompt 07 verification.

---

## 5. Prompt Execution Discipline

A prompt is not complete until its result is scanned or reviewed.

A prompt should not be marked complete merely because Codex created files.

Completion requires:

- structure exists
- ownership is clear
- files are modular
- no unrelated files were modified
- no obvious hardcode or overlay was introduced
- next action is defined

---

## 6. Current Priority

The current priority is Prompt 01.

Prompt 01 must create the modular architecture only.

Implementation depth should remain limited until the structure is verified.

---

## Change Log

- 2026-05-02 — v0.1 Initial Codex daily prompt queue created for AI Development Cockpit execution. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Website Systems & Development Agent. Agent ID: A-0205-0022. Execution Context: Website planning layer under `/Users/artan/Documents/Neuroartan/website`.

---

## Document Control & Validation

GSA PROTOCOL STATUS: Pending Founder Validation  
GSA APPROVAL: false  
DOCUMENT STATUS: Draft — Codex Daily Prompt Queue  
VISIBILITY: Internal  
PUBLISH TO WEBSITE: No  
VERSION: 0.1

---

END OF DOCUMENT