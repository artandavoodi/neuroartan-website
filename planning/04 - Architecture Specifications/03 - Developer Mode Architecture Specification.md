---
type: "Architecture Specification"
subtype: "Developer Mode Architecture"

title: "Developer Mode Architecture Specification"
document_id: "NA-WEB-ARCH-SPEC-0003"

classification: "Internal"
authority_level: "Departmental"
department: "Website Systems & Development"
office: "Website Systems & Development Office"
owner: "Website Systems & Development Agent"

stakeholders:
  - "Founder"
  - "Website Systems & Development Agent"
  - "Software Applications Development Agent"
  - "Debugging & Systems Integrity Agent"
  - "Legal Operations Agent"

legal_sensitive: true
requires_gc_review: true
requires_creo_review: true
approval_status: "Draft"

gsa_protocol: true
gsa_approved: false

status: "Active Draft"
lifecycle: "Architecture Definition"
system: "Neuroartan Website"

spine_version: "1.0"
template_lock: true
version: "0.1"

created_date: "2026-05-02"
last_updated: "2026-05-02"
last_reviewed: "2026-05-02"
review_cycle: "Monthly"

effective_date: "2026-05-02"

publish: false
publish_to_website: false
featured: false
visibility: "Internal"
institutional_visibility: "Restricted Internal"

scope:
  - "Developer Mode architecture"
  - "AI coding agent frontend boundary"
  - "Provider selection interface"
  - "Repository-aware development command surface"
  - "Secure backend runtime coordination"

index_targets:
  - "Website Planning Index"
  - "Architecture Specifications Register"
  - "Developer Mode Register"

vault_path: "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/03 - Developer Mode Architecture Specification.md"

related:
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/01 - AI Development Cockpit Architecture Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/02 - Website Modular Architecture Doctrine.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/04 - AI Coding Agent Runtime Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/05 - GitHub Repository Access & Permission Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/06 - Agent Sandbox & Internet Egress Governance Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/07 - Voice-to-Agent Command Pipeline Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/08 - Patch Review, Test, Commit & PR Workflow Specification.md"

tags:
  - "developer-mode"
  - "ai-coding-agent"
  - "codex-equivalent"
  - "github-access"
  - "model-provider-routing"
  - "website-architecture"
---

# Developer Mode Architecture Specification

## I. Purpose

This specification defines the Developer Mode architecture for the Neuroartan website platform.

Developer Mode is the controlled interface layer through which an authorized developer may issue voice or text commands, select an AI model provider, select a repository scope, request scans, review proposed patches, approve tests, and authorize commits or pull requests through a secure runtime boundary.

Developer Mode must not expose repository mutation, provider secrets, GitHub credentials, sandbox execution, or internet access directly from the browser.

---

## II. Current State

The existing platform already includes a development cockpit frontend with command-generation capability.

Current reusable elements include:

- development cockpit shell
- prompt composer
- provider router interface
- terminal scan generator
- file target selector
- patch instruction generator
- GitHub commit message generator
- open-file-next workflow
- daily execution log
- provider registry data
- repository scope registry data
- scan template registry data
- prompt template registry data
- workflow registry data
- model creation interface layer
- voice interaction foundations

The current cockpit is not yet an autonomous coding agent runtime. It does not currently provide secure API execution, repository authorization, sandboxed worktrees, internet egress control, patch application, automated testing, commits, or pull request creation.

---

## III. Target Architecture

The target architecture is:

```text
Developer Mode Toggle
→ Developer Command Surface
→ Voice/Text Command Composer
→ Provider Router
→ Repository Scope Selector
→ Agent Runtime Server
→ GitHub App / OAuth Boundary
→ Repository Sandbox / Worktree
→ Scan / Plan / Patch / Test
→ Review & Approval Interface
→ Commit / Pull Request Execution
```

The browser is the command and review surface.

The backend runtime is the execution authority.

---

## IV. Frontend Responsibilities

The frontend may own:

- developer mode toggle visibility
- developer command surface
- voice-to-command interface
- text prompt composer
- provider selection interface
- repository selection interface
- scan template selection
- file target selection
- generated command preview
- patch proposal preview
- test command preview
- approval controls
- execution status display
- daily execution log display

The frontend must never own:

- provider API keys
- GitHub tokens
- repository clone credentials
- unrestricted file mutation
- local or cloud shell execution
- internet allowlist enforcement
- direct commit authority
- direct pull request creation authority

---

## V. Backend Runtime Responsibilities

The backend/runtime layer must own:

- provider secret storage
- provider API execution
- model routing execution
- GitHub App or OAuth authorization
- repository clone and worktree creation
- sandboxed file reading and writing
- terminal command execution
- dependency installation control
- test execution
- patch application
- commit creation
- pull request creation
- internet egress governance
- audit logging
- execution rollback support

The runtime must enforce explicit approval gates before repository mutation.

---

## VI. Security Boundaries

Developer Mode must follow these boundaries:

- no frontend secrets
- no unrestricted internet access by default
- no browser-side repository mutation
- no unreviewed patch application
- no unapproved commit or pull request creation
- no full-account GitHub token exposure
- repository access scoped per repository
- provider access scoped per runtime environment
- internet access governed by explicit allowlist
- risky HTTP methods restricted by default
- prompt-injection risk documented and mitigated
- secret-exfiltration risk documented and mitigated
- dependency and license-contamination risk documented and mitigated

This architecture must treat Codex-style execution as a controlled environment, not as a browser feature.

---

## VII. Developer Mode Activation Model

Developer Mode should be exposed through a developer-only toggle.

Required activation controls:

- authenticated user check
- developer role check
- private platform visibility check
- environment-mode check
- confirmation before runtime activation
- session-level runtime audit record

Developer Mode must remain hidden from normal public users unless explicitly authorized.

---

## VIII. Provider Routing Model

Developer Mode must support provider routing without binding the platform to one model vendor.

Supported provider categories:

- OpenAI Codex / OpenAI model APIs
- Gemini model APIs
- local or self-hosted model runtimes
- future provider adapters

Provider routing must be abstracted behind a backend interface.

The frontend may display provider options, but it must not contain provider secrets or direct provider execution logic.

---

## IX. Repository Scope Model

Developer Mode must allow repository selection through a governed repository scope registry.

Repository access must define:

- repository name
- repository visibility
- GitHub installation scope
- allowed branches
- write permission status
- protected file paths
- allowed command classes
- required review level
- commit attribution model

No repository may be mutated without explicit authorization.

---

## X. Implementation Phases

Phase 01 — Architecture Documentation

- create Developer Mode specification
- create AI Coding Agent Runtime specification
- create GitHub access specification
- create sandbox and internet egress specification
- create voice-to-agent pipeline specification
- create patch review and commit workflow specification
- update Website Planning Index

Phase 02 — Frontend Surface Consolidation

- normalize cockpit as Developer Mode surface
- connect developer toggle to cockpit visibility
- map provider, repository, scan, and workflow registries
- preserve page-local isolation until runtime architecture is ready

Phase 03 — Backend Interface Stub

- define backend API contract
- create safe placeholder endpoints
- return non-mutating scan and plan responses only
- prohibit secrets in frontend

Phase 04 — Runtime Prototype

- implement provider execution server-side
- implement GitHub App or OAuth repo authorization
- implement sandboxed worktree clone
- implement read-only scan execution

Phase 05 — Patch Review Pipeline

- implement patch generation
- implement patch preview
- implement approval gate
- implement test command execution
- implement commit and pull request route after approval

---

## XI. Verification Requirements

Required verification before runtime activation:

- frontend contains no provider secrets
- frontend contains no GitHub tokens
- Developer Mode is hidden unless authorized
- provider routing calls backend only
- repository access calls backend only
- sandbox path is isolated
- internet access is disabled by default
- allowlist is enforced before egress
- patch preview is required before mutation
- commit and pull request actions require approval
- audit log records every execution step

---

## XII. Approval Routing

Review order:

1. Website Systems & Development Agent
2. Software Applications Development Agent
3. Debugging & Systems Integrity Agent
4. Legal Operations Agent
5. Founder

Legal review is required before external user exposure, third-party provider execution, GitHub authorization, or any repository mutation automation.

---

## XIII. Status

Developer Mode is approved for architecture definition.

Developer Mode is not yet approved for live autonomous repository mutation.

Implementation must proceed through document completion, index propagation, frontend consolidation, backend interface design, and then runtime prototype.

---

## Change Log

- 2026-05-02 — v0.1 Created Developer Mode Architecture Specification to define the governed frontend/backend boundary for Codex-equivalent developer functionality. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Website Systems & Development Agent. Agent ID: A-0205-0022. Execution Context: Developer Mode architecture specification under `/Users/artan/Documents/Neuroartan/website`.

---

## Document Control & Validation

DOCUMENT STATUS: Active Draft  
GSA PROTOCOL STATUS: Pending Review  
GSA APPROVAL: false  
LEGAL REVIEW REQUIRED: true  
CREO REVIEW REQUIRED: true  
VERSION: 0.1

END OF DOCUMENT