---
type: Strategy
subtype: "Model Provider Strategy"

title: "Model Provider Strategy"
document_id: "NA-WEBSITE-PLANNING-PROVIDER-STRATEGY-0001"

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
  - "Model provider strategy"
  - "Cloud provider route"
  - "Local runtime route"
  - "Manual provider route"
  - "AI Development Cockpit provider abstraction"

index_targets:
  - "Website Planning Index"
  - "Provider Strategy Register"
  - "AI Development Cockpit Planning Layer"

vault_path: "/Users/artan/Documents/Neuroartan/website/planning/05 - Provider & Runtime Strategy/01 - Model Provider Strategy.md"

related:
  - "/Users/artan/Documents/Neuroartan/website/planning/00 - Index & Dashboards/00 - Website Planning Index.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/01 - Strategic Decisions/01 - Web App Development Continuity Decision.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/02 - Execution Roadmaps/01 - Thirty Day AI Development Cockpit Roadmap.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/03 - Codex Prompt Queue/01 - Codex Daily Prompt Queue.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/01 - AI Development Cockpit Architecture Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/06 - GitHub & Terminal Workflows/01 - Repository Development Workflow Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/07 - Daily Execution Records/01 - Daily Execution Log.md"

tags:
  - "website-planning"
  - "model-provider-strategy"
  - "ai-development-cockpit"
  - "cloud-local-manual"
  - "development-continuity"
---

# Model Provider Strategy

---

## 1. Strategy Purpose

This document defines the model provider strategy for the AI Development Cockpit.

The purpose is to ensure that the cockpit can support development continuity through cloud, local, and manual provider modes without becoming locked to a single model, vendor, endpoint, runtime, or implementation pathway.

---

## 2. Strategic Position

The provider system must be modular from the beginning.

The cockpit should not be built as a single-provider interface.

The provider layer exists to allow Artan to experiment with available free-tier, low-cost, local, and manual workflows while preserving one consistent development cockpit experience.

---

## 3. Provider Modes

The initial provider strategy includes three provider modes:

| Provider Mode | Role |
|---|---|
| Cloud | Online model access for high-velocity reasoning, code assistance, prompt generation, and development continuity. |
| Local | Local GGUF or compatible runtime access for offline fallback and future sovereignty. |
| Manual | Human-mediated copy/paste workflow for providers that cannot be directly connected. |

Each provider mode must be replaceable.

---

## 4. Cloud Provider Route

The cloud route is the near-term priority for continuity.

Its purpose is to support development when premium AI tooling access becomes limited or unavailable.

Cloud providers should be represented through a registry rather than hardcoded JavaScript logic.

The registry should eventually define:

- provider name
- provider mode
- model name
- endpoint type
- input format
- output format
- usage limits
- cost status
- authentication requirements
- cockpit compatibility status
- notes

No API key or private credential should be stored in public website files.

---

## 5. Local Provider Route

The local route is a fallback and future sovereignty path.

Its purpose is to support offline experimentation with locally available models and runtimes.

The local route should not become the critical path during the current thirty-day cycle.

The local route should eventually support:

- GGUF model reference
- local runtime reference
- model capability profile
- context window limits
- speed limitations
- coding usefulness notes
- terminal integration notes
- fallback workflow notes

Local runtime integration must remain modular and should not be embedded directly into the cockpit shell.

---

## 6. Manual Provider Route

The manual route preserves continuity when direct automation is unavailable.

Manual provider mode should support copy/paste workflows where the cockpit generates a precise prompt and the user runs it in an external model interface.

The manual route should support:

- prompt export
- expected response format
- result paste-back
- manual review
- next-action extraction

Manual mode is not inferior. It is a continuity route.

---

## 7. Provider Registry Requirement

The cockpit should use a provider registry file:

`website/docs/assets/data/website/development-cockpit/provider-registry.json`

The provider registry should define provider metadata without embedding provider-specific logic in UI files.

Initial provider categories should include:

- cloud
- local
- manual

Provider entries should remain inactive until explicitly implemented and verified.

---

## 8. Provider Router Requirement

The provider router should be a separate module.

Expected files:

`website/docs/assets/fragments/layers/website/development-cockpit/provider-router.html`

`website/docs/assets/css/layers/website/development-cockpit/provider-router.css`

`website/docs/assets/js/layers/website/development-cockpit/provider-router.js`

The provider router should not own prompt composition, scan generation, patch generation, or commit message generation.

Its responsibility is only provider selection, provider metadata display, and provider mode routing.

---

## 9. Provider Output Contract

Every provider route should eventually return or support a common response pattern:

- provider mode
- provider name
- prompt submitted
- response received
- confidence or limitation note
- next action
- target file path when applicable
- verification command when applicable

The cockpit should normalize different provider responses into one internal workflow format.

---

## 10. Security Boundary

The provider system must not expose secrets in public files.

No API key should be committed into:

- HTML
- CSS
- JavaScript
- JSON registries
- public documentation
- browser-visible configuration

Any credential-bearing integration requires a later secure backend or local-only configuration layer.

---

## 11. Current Thirty-Day Position

During the current thirty-day cycle, the provider strategy should remain focused on architecture and practical fallback.

Priority order:

1. define provider registry
2. scaffold provider router
3. support manual provider mode
4. prepare cloud provider abstraction
5. keep local provider as fallback
6. avoid full automation until architecture is verified

---

## 12. Non-Goals

This strategy does not attempt to complete:

- full autonomous provider orchestration
- direct credential management
- production API billing integration
- direct GitHub write automation
- complete local runtime replacement
- full Codex replacement

Those remain future-phase objectives.

---

## 13. Success Criteria

This strategy is successful if the cockpit can support provider routing without being locked to a single model or vendor.

Success requires:

- provider registry exists
- provider router exists
- provider modes are clearly separated
- no provider is hardcoded into shell behavior
- manual mode is usable
- cloud mode is structurally prepared
- local mode is represented as fallback
- security boundaries are documented

---

## Change Log

- 2026-05-02 — v0.1 Initial model provider strategy created for cloud, local, and manual AI Development Cockpit routing. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Website Systems & Development Agent. Agent ID: A-0205-0022. Execution Context: Website planning layer under `/Users/artan/Documents/Neuroartan/website`.

---

## Document Control & Validation

GSA PROTOCOL STATUS: Pending Founder Validation  
GSA APPROVAL: false  
DOCUMENT STATUS: Draft — Model Provider Strategy  
VISIBILITY: Internal  
PUBLISH TO WEBSITE: No  
VERSION: 0.1

---

END OF DOCUMENT