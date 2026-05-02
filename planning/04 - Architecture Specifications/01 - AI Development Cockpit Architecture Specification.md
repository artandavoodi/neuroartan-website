---
type: Architecture Specification
subtype: "AI Development Cockpit"

title: "AI Development Cockpit Architecture Specification"
document_id: "NA-WEBSITE-PLANNING-ARCH-SPEC-0001"

classification: Internal
authority_level: Departmental
department: "Website Systems & Development"
office: "Website Planning"
owner: "Website Systems & Development Agent"

stakeholders:
  - "Founder / CEO"
  - "Website Systems & Development Agent"
  - "Software Applications Development Agent"
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
review_cycle: "Weekly"

effective_date: "2026-05-02"

publish: false
publish_to_website: false
featured: false
visibility: Internal
institutional_visibility: Departmental

scope:
  - "AI Development Cockpit architecture"
  - "Modular website implementation structure"
  - "Prompt composer architecture"
  - "Development workflow modules"
  - "Provider routing architecture"

index_targets:
  - "Website Planning Index"
  - "Architecture Specifications Register"
  - "AI Development Cockpit Planning Layer"

vault_path: "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/01 - AI Development Cockpit Architecture Specification.md"

related:
  - "/Users/artan/Documents/Neuroartan/website/planning/00 - Index & Dashboards/00 - Website Planning Index.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/01 - Strategic Decisions/01 - Web App Development Continuity Decision.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/02 - Execution Roadmaps/01 - Thirty Day AI Development Cockpit Roadmap.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/03 - Codex Prompt Queue/01 - Codex Daily Prompt Queue.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/05 - Provider & Runtime Strategy/01 - Model Provider Strategy.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/06 - GitHub & Terminal Workflows/01 - Repository Development Workflow Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/07 - Daily Execution Records/01 - Daily Execution Log.md"

tags:
  - "website-planning"
  - "ai-development-cockpit"
  - "architecture-specification"
  - "modular-web-app"
  - "development-continuity"
---

# AI Development Cockpit Architecture Specification

---

## 1. Specification Purpose

This document defines the modular architecture for the AI Development Cockpit inside the Neuroartan website layer.

The cockpit is an internal development-support surface intended to preserve development continuity through structured prompt composition, terminal scan generation, file targeting, patch instruction generation, GitHub commit message generation, provider routing, and daily execution logging.

---

## 2. Architectural Position

The AI Development Cockpit belongs to the website layer.

It should not overload the homepage, platform menu, product pages, legal pages, or global navigation systems.

The cockpit must be implemented as a separate modular web app surface under the website public development layer, with clear ownership across page shell, fragments, CSS modules, JavaScript modules, and data registries.

---

## 3. Active Root

The active root for implementation is:

`/Users/artan/Documents/Neuroartan/website`

The cockpit implementation should remain within the website repository unless a separate software/runtime bridge is explicitly approved later.

---

## 4. Proposed Public Layer Structure

The first implementation pass should create a modular cockpit layer under:

`website/docs/pages/development-cockpit/`

`website/docs/assets/fragments/layers/website/development-cockpit/`

`website/docs/assets/css/layers/website/development-cockpit/`

`website/docs/assets/js/layers/website/development-cockpit/`

`website/docs/assets/data/website/development-cockpit/`

This keeps the cockpit separate from the homepage while allowing reuse of global tokens, shared chrome, and website foundation systems.

---

## 5. Required Page Shell

The cockpit page shell should be:

`website/docs/pages/development-cockpit/index.html`

The page shell should:

- load the established website core systems
- mount cockpit fragments
- avoid hardcoded implementation content where fragments should own structure
- preserve global theme behavior
- preserve global navigation behavior
- remain lightweight

---

## 6. Required Fragment Structure

The cockpit should use fragments for each functional module.

Required fragment ownership:

| Fragment | Purpose |
|---|---|
| `development-cockpit-shell.html` | Main cockpit layout and module mount structure. |
| `prompt-composer.html` | Prompt composition interface. |
| `terminal-scan-generator.html` | Terminal scan command interface. |
| `file-target-selector.html` | Exact file path selection interface. |
| `patch-instruction-generator.html` | Patch instruction construction interface. |
| `github-commit-message-generator.html` | Commit message drafting interface. |
| `open-file-next-workflow.html` | Open-next-file workflow interface. |
| `provider-router.html` | Cloud, local, and manual provider route selection. |
| `daily-execution-log.html` | Daily action and verification log interface. |

Each fragment must have a clear responsibility and must not become a general-purpose mixed-content container.

---

## 7. Required CSS Structure

The cockpit CSS must be modular.

Required CSS ownership:

| CSS File | Purpose |
|---|---|
| `development-cockpit.css` | Cockpit layer orchestrator or page-level import file. |
| `development-cockpit-shell.css` | Main cockpit shell layout. |
| `prompt-composer.css` | Prompt composer module styling. |
| `terminal-scan-generator.css` | Terminal scan generator module styling. |
| `file-target-selector.css` | File target selector module styling. |
| `patch-instruction-generator.css` | Patch instruction generator module styling. |
| `github-commit-message-generator.css` | Commit message generator styling. |
| `open-file-next-workflow.css` | Open-next-file workflow styling. |
| `provider-router.css` | Provider router styling. |
| `daily-execution-log.css` | Daily execution log styling. |

All CSS must consume global tokens wherever possible.

No local hardcoded visual system should be introduced when a global token already exists.

---

## 8. Required JavaScript Structure

The cockpit JavaScript must be modular and workflow-owned.

Required JavaScript ownership:

| JavaScript File | Purpose |
|---|---|
| `development-cockpit.js` | Cockpit layer orchestrator. |
| `development-cockpit-shell.js` | Shell mounting and module coordination. |
| `prompt-composer.js` | Prompt composer behavior. |
| `terminal-scan-generator.js` | Scan command generation behavior. |
| `file-target-selector.js` | File target selection behavior. |
| `patch-instruction-generator.js` | Patch instruction generation behavior. |
| `github-commit-message-generator.js` | Commit message generation behavior. |
| `open-file-next-workflow.js` | Open-next-file workflow behavior. |
| `provider-router.js` | Provider route selection behavior. |
| `daily-execution-log.js` | Daily execution log behavior. |

No module should own unrelated behavior.

---

## 9. Required Data Registries

The cockpit should use JSON registries for repeatable configuration.

Required data ownership:

| Data File | Purpose |
|---|---|
| `provider-registry.json` | Defines cloud, local, and manual provider modes. |
| `workflow-registry.json` | Defines cockpit workflows and outputs. |
| `prompt-template-registry.json` | Defines reusable prompt templates. |
| `scan-template-registry.json` | Defines reusable terminal scan templates. |
| `repository-scope-registry.json` | Defines website, software, office, and other repository scopes. |

The data layer should prevent hardcoded provider names, workflow labels, and scan templates inside JavaScript modules.

---

## 10. Required Functional Modules

The first architecture must support these modules:

| Module | Function |
|---|---|
| Prompt Composer | Build structured prompts from intent, target scope, constraints, and expected output. |
| Terminal Scan Generator | Generate scan commands for repository and file analysis. |
| File Target Selector | Select exact files for open/edit workflows. |
| Patch Instruction Generator | Convert analysis into precise patch instructions. |
| GitHub Commit Message Generator | Produce concise commit messages for verified work. |
| Open File Next Workflow | Preserve exact-path next-file workflow. |
| Provider Router | Route work to cloud, local, or manual model modes. |
| Daily Execution Log | Record daily execution results and continuation state. |

---

## 11. Provider Abstraction Rule

Provider behavior must be abstracted.

The cockpit should not be hardcoded to one model provider.

Initial provider modes:

- Cloud
- Local
- Manual

Provider-specific keys, endpoints, models, limits, and capabilities must belong in registries or future secure configuration layers, not hardcoded UI logic.

---

## 12. Codex Compatibility Rule

The cockpit must support Codex-oriented workflows.

Codex prompts should be generated as bounded implementation instructions that include:

- active root
- target scope
- allowed files
- forbidden files
- modular requirements
- no-overlay rule
- no-hardcode rule
- verification command
- expected completion output

The cockpit should never generate a broad instruction asking Codex to redesign the entire system.

---

## 13. Development Workflow Rule

The cockpit must preserve the established Neuroartan development rhythm:

1. scan
2. identify owner
3. define exact target
4. generate prompt or patch instruction
5. apply controlled change
6. verify result
7. record outcome
8. define next action

This workflow must remain visible and reusable inside the cockpit.

---

## 14. Visibility Boundary

The cockpit is an internal development surface.

It must not be treated as a public-facing product feature until visibility, access, privacy, security, and provider-routing concerns are reviewed.

If public exposure becomes intended, Legal Operations and governance review must occur before deployment.

---

## 15. Non-Overload Rule

No cockpit module may become a large all-purpose file.

If a module grows beyond its clear responsibility, it must be split into a more specific module.

This applies equally to HTML, CSS, JavaScript, and data files.

---

## 16. First Implementation Requirement

The first implementation should create the modular scaffold only.

It should not attempt full provider integration, direct GitHub automation, or local runtime integration in the same pass.

The first pass must prioritize architecture correctness over feature completion.

---

## 17. Verification Requirement

After the first scaffold is created, verification must confirm:

- all expected files exist
- no unrelated files were modified
- no monolithic file was created
- page shell is isolated
- fragment structure is present
- CSS modules are present
- JavaScript modules are present
- data registries are present
- no provider is hardcoded into shell behavior

---

## Change Log

- 2026-05-02 — v0.1 Initial AI Development Cockpit architecture specification created for modular website-led development continuity. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Website Systems & Development Agent. Agent ID: A-0205-0022. Execution Context: Website planning layer under `/Users/artan/Documents/Neuroartan/website`.

---

## Document Control & Validation

GSA PROTOCOL STATUS: Pending Founder Validation  
GSA APPROVAL: false  
DOCUMENT STATUS: Draft — AI Development Cockpit Architecture Specification  
VISIBILITY: Internal  
PUBLISH TO WEBSITE: No  
VERSION: 0.1

---

END OF DOCUMENT