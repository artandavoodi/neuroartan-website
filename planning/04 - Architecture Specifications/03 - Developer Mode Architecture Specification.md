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
version: "0.3"

created_date: "2026-05-02"
last_updated: "2026-05-03"
last_reviewed: "2026-05-03"
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
  - "Developer-specific top menu architecture"
  - "Developer left and right sidebar architecture"
  - "Repository-aware developer workspace architecture"
  - "Codex-equivalent developer navigation model"
  - "Developer command and review surface architecture"
  - "Homepage Developer Mode workspace implementation boundary"
  - "Backend session-state boundary"
  - "GitHub and provider configuration route boundary"

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
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/09 - Control Center Grouped Settings Surface Design Doctrine.md"

tags:
  - "developer-mode"
  - "ai-coding-agent"
  - "codex-equivalent"
  - "github-access"
  - "model-provider-routing"
  - "website-architecture"
  - "developer-topbar"
  - "developer-sidebar"
  - "repository-workspace"
  - "codex-style-interface"
  - "developer-command-surface"
---

# Developer Mode Architecture Specification

## I. Purpose

This specification defines the Developer Mode architecture for the Neuroartan website platform.

Developer Mode is the controlled interface layer through which an authorized developer may issue voice or text commands, select an AI model provider, select a repository scope, request scans, review proposed patches, approve tests, and authorize commits or pull requests through a secure runtime boundary.

Developer Mode must not expose repository mutation, provider secrets, GitHub credentials, sandbox execution, or internet access directly from the browser.

---

## II. Current State

The existing platform already includes early Developer Mode and development cockpit surfaces, but the architecture is still immature.

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
- Platform Menu workspace destination for Developer Mode
- homepage stage developer workbench controls
- repository selector placeholder
- environment selector placeholder
- GitHub connection placeholder
- repository discovery placeholder
- workspace creation placeholder

The current cockpit is not yet an autonomous coding agent runtime.

It does not currently provide secure API execution, repository authorization, sandboxed worktrees, internet egress control, patch application, automated testing, commits, or pull request creation.

It also does not yet provide a dedicated developer-specific top menu or developer workspace navigation environment.

Current gaps include:

```text
No developer-specific topbar
No developer-specific left sidebar
No developer-specific right sidebar
No repository workspace navigation model
No developer-only replacement for platform navigation items such as Feed or public Dashboard
No Codex-style session navigation model
No visible command categories for scan, plan, debug, patch, review, test, commit, and pull request
No repository connection and discovery workflow surface
No prompt engineering workspace
No code review workspace
No issue debugging workspace
No runtime status workspace
No approval queue workspace
No reusable developer menu fragment authority model
No developer navigation doctrine based on the approved Control Center nested settings baseline
```

The immediate architecture task is to define Developer Mode as its own developer workspace with dedicated navigation, not as a generic Platform Menu destination.
----

## III. Target Architecture

The target architecture is:

```text
Developer Mode Toggle
→ Developer Workspace Shell
→ Developer-Specific Top Menu
→ Developer Left Sidebar
→ Developer Right Sidebar
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

The browser is the command, navigation, context, and review surface.

The backend runtime is the execution authority.

Developer Mode must not reuse the public platform top menu as-is.

Developer Mode requires its own top menu because the developer surface has different information architecture from the public platform surface.

Public platform navigation may include:

```text
Menu
Search
Models
Feed
Dashboard
Profile
```

Developer Mode navigation should instead prioritize:

```text
Workspace
Repositories
Branches
Prompt
Scan
Plan
Debug
Patch
Review
Tests
Commits
Pull requests
Runtime
Logs
Settings
```

Developer Mode must feel like a focused coding-agent workspace, not a public content or profile navigation surface.
----

## IV. Developer-Specific Top Menu Architecture

Developer Mode requires a dedicated top menu that replaces the generic platform topbar while Developer Mode is active.

The developer top menu must be fragmented, reusable, token-based, and registered through the website fragment authority system.

The developer top menu must not include irrelevant public-platform items unless explicitly required.

Items to exclude from the default developer top menu:

```text
Feed
Public dashboard shortcut
Public model directory shortcut
Generic public platform navigation
```

Required developer top menu zones:

```text
Developer mode identity
Repository connection state
Active repository selector
Branch selector
Runtime/provider status
Command mode selector
Review queue shortcut
Logs/status shortcut
Developer settings shortcut
Profile/account utility
```

The developer top menu should expose high-signal actions only.

It must stay calm, sparse, and operational.

It must not become a crowded command ribbon.

Approved top menu candidate items:

```text
Repository
Branch
Prompt
Scan
Debug
Review
Tests
Pull request
Runtime
Settings
```

The top menu is for global developer context and mode switching.

Detailed controls belong in sidebars or the main command surface.

---

## V. Developer Workspace Shell Architecture

Developer Mode requires its own workspace shell.

Approved shell regions:

```text
Developer top menu
Developer left sidebar
Main command/review surface
Developer right sidebar
Runtime/status footer or status rail
```

The developer shell must be modular.

Potential fragment structure:

```text
home/developer-mode/
  developer-mode-shell.html
  developer-mode-topbar.html
  developer-mode-left-sidebar.html
  developer-mode-right-sidebar.html
  developer-mode-command-surface.html
  developer-mode-status-rail.html
```

Potential style ownership:

```text
assets/css/layers/website/home/developer-mode/developer-mode-shell.css
assets/css/layers/website/home/developer-mode/developer-mode-topbar.css
assets/css/layers/website/home/developer-mode/developer-mode-sidebar.css
assets/css/layers/website/home/developer-mode/developer-mode-command-surface.css
```

Potential runtime ownership:

```text
assets/js/layers/website/home/developer-mode/developer-mode-shell.js
assets/js/layers/website/home/developer-mode/developer-mode-navigation.js
assets/js/layers/website/home/developer-mode/developer-mode-runtime-state.js
```

The final file structure must be created only after a live scan of the current website architecture.

---

## VI. Developer Left Sidebar Architecture

The developer left sidebar should own workspace navigation.

It should behave like a developer cockpit navigation rail, not like public website navigation.

Recommended left sidebar sections:

```text
Overview
Repositories
Workspaces
Prompts
Scans
Plans
Debugging
Patches
Reviews
Tests
Commits
Pull requests
Logs
Settings
```

The left sidebar should support nested Apple-native navigation using the approved Control Center nested settings baseline.

Examples:

```text
Repositories
  Connected repositories
  Discover repositories
  Repository permissions
  Protected paths

Debugging
  Current issue
  Console errors
  Runtime traces
  Failed tests

Reviews
  Pending patches
  Test results
  Approval queue
  Commit draft
```

The left sidebar must remain stable while the main panel changes.

---

## VII. Developer Right Sidebar Architecture

The developer right sidebar should own context, not primary navigation.

Recommended right sidebar panels:

```text
Active repository
Active branch
Current file target
Runtime provider
Sandbox status
Approval status
Risk warnings
Recent logs
Current task metadata
```

The right sidebar should support collapsible visibility.

It should be useful for developer awareness without overwhelming the command surface.

The right sidebar must not contain secrets, credentials, or direct mutation controls.

---

## VIII. Developer Command Surface Architecture

The main command surface is the core Developer Mode working area.

Required command categories:

```text
Prompt engineering
Repository scan
File targeting
Plan generation
Debug issue
Fix code
Patch review
Test command generation
Commit preparation
Pull request preparation
Runtime log review
```

The command surface should support both voice and text input.

It should provide structured command templates rather than one uncontrolled freeform field.

Recommended command mode options:

```text
Scan repository
Explain architecture
Find file
Open file
Debug issue
Fix code
Review patch
Generate tests
Prepare commit
Prepare pull request
Document change
```

Developer Mode must retain the established Neuroartan workflow:

```text
Scan
Analyze
Open exact file
Edit only after confirmation
Verify
Document
Propagate
```

---

## IX. Developer Navigation Reuse Rule

Developer Mode must reuse the approved Control Center nested settings doctrine where appropriate.

Reusable patterns include:

```text
Folder-based module structure
Fragment authority registration
Icon-only drill-in rows
Native local icons
Token-based left/right navigation wrapper
Stable left navigation with right-panel replacement
Theme-aware rounded grouped surfaces
No hardcoded icons
No cursor overrides
No overlays
```

The Control Center Session pilot is the current reference baseline for nested navigation.

Developer Mode must not create a separate immature navigation system when the approved baseline already exists.

Platform Menu and Developer Mode should both inherit from the same reusable navigation doctrine after primitive extraction.

---

## X. Missing Architecture To Define Before Implementation

Before implementation, the following architecture must be mapped and documented:

```text
Developer topbar fragment ownership
Developer topbar CSS ownership
Developer topbar JS ownership
Developer shell mount location
Developer left sidebar fragment structure
Developer right sidebar fragment structure
Developer command surface fragment structure
Developer runtime state object
Repository selector data source
Branch selector data source
Provider/runtime status data source
Command mode registry
Prompt template registry extension
Debug workflow registry
Review queue registry
Approval gate registry
Fragment authority registration keys
Route behavior from Platform Menu into Developer Mode
Visibility behavior when Developer Mode is active
Exit behavior back to normal platform mode
```

No implementation should begin until the current architecture is scanned and the missing ownership map is confirmed.
----

## XI. Frontend Responsibilities

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

## XII. Backend Runtime Responsibilities

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

## XIII. Security Boundaries

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

## XIV. Developer Mode Activation Model

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

## XV. Provider Routing Model

Developer Mode must support provider routing without binding the platform to one model vendor.

Supported provider categories:

- OpenAI Codex / OpenAI model APIs
- Gemini model APIs
- local or self-hosted model runtimes
- future provider adapters

Provider routing must be abstracted behind a backend interface.

The frontend may display provider options, but it must not contain provider secrets or direct provider execution logic.

---

## XVI. Repository Scope Model

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

## XVII. Implementation Phases

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

Phase 02A — Developer Navigation Architecture

- scan current platform topbar, Platform Menu, developer cockpit, and stage workbench ownership
- define developer-specific top menu fragment structure
- define developer left sidebar fragment structure
- define developer right sidebar fragment structure
- define command surface routing model
- define developer navigation fragment authority keys
- document which public platform navigation items are excluded from Developer Mode
- document which developer actions belong in top menu, sidebars, or command surface

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

## XVIII. Verification Requirements

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

## XIX. Approval Routing

Review order:

1. Website Systems & Development Agent
2. Software Applications Development Agent
3. Debugging & Systems Integrity Agent
4. Legal Operations Agent
5. Founder

Legal review is required before external user exposure, third-party provider execution, GitHub authorization, or any repository mutation automation.

---

## XX. Status

Developer Mode is approved for architecture definition.

Developer Mode is not yet approved for live autonomous repository mutation.

Developer Mode now has a first homepage-routed developer workspace foundation and a backend session-state foundation.

Implemented architecture now includes:

- homepage Developer Mode shell fragment
- developer-specific topbar
- developer left sidebar
- developer right context sidebar
- command surface
- repository panel
- project panel
- provider / agent panel
- runtime panel
- review / approval panel
- settings panel
- backend Developer Mode state route
- backend provider status and configuration route
- backend agent activation route
- backend GitHub OAuth initiation/callback/status/repository discovery route
- backend session persistence for selected project, repository, workspace, provider, and active agent

Developer Mode is still not approved for autonomous repository mutation.

Remaining maturity requirements:

- Supabase profile linkage for canonical long-term developer state persistence
- production GitHub App or OAuth credentials
- secure provider credential vault or server-side environment configuration
- sandbox/worktree runtime
- reviewable patch artifact storage
- test execution approval workflow
- commit and pull request mutation route after approval

---

## XXI. Homepage Developer Workspace Implementation Boundary

The homepage Developer Mode workspace may render and route operational controls.

Homepage Developer Mode frontend may:

- route developer-specific topbar items
- route developer left-sidebar items
- display backend session state
- request GitHub authorization
- request repository discovery
- select active repository
- create project/workspace records
- configure a provider reference without secrets
- activate an agent reference without secrets
- request read-only repository scans
- request locked review, test, commit, and pull request actions

Homepage Developer Mode frontend must not:

- store GitHub tokens
- store provider API keys
- mutate repositories directly
- claim provider execution is live when credentials/runtime are missing
- bypass review/approval gates

Backend session state is transitional and is not the final commercial persistence layer. Canonical commercial persistence must graduate to Supabase profile state or a future company-owned profile/runtime service.
----

## Change Log

- 2026-05-03 — v0.3 Recorded first implemented homepage Developer Mode workspace and backend session-state boundary. Added status language for fragment-based topbar/sidebar/command/panel routing, GitHub OAuth/repository discovery, provider configuration, agent activation, project binding, and remaining Supabase/runtime blockers. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Codex. Agent ID: Codex. Execution Context: Developer Mode implementation pass under `/Users/artan/Documents/Neuroartan/website`.
- 2026-05-03 — v0.2 Expanded Developer Mode architecture to define the missing developer-specific top menu, developer workspace shell, left sidebar, right sidebar, command surface, Codex-equivalent navigation model, Control Center nested settings doctrine reuse requirement, and missing ownership map before implementation. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Website Systems & Development Agent. Agent ID: A-0205-0022. Execution Context: Developer Mode architecture maturity audit under `/Users/artan/Documents/Neuroartan/website`.
- 2026-05-02 — v0.1 Created Developer Mode Architecture Specification to define the governed frontend/backend boundary for Codex-equivalent developer functionality. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Website Systems & Development Agent. Agent ID: A-0205-0022. Execution Context: Developer Mode architecture specification under `/Users/artan/Documents/Neuroartan/website`.

---

## Document Control & Validation

DOCUMENT STATUS: Active Draft  
GSA PROTOCOL STATUS: Pending Review  
GSA APPROVAL: false  
LEGAL REVIEW REQUIRED: true  
CREO REVIEW REQUIRED: true  
VERSION: 0.3

END OF DOCUMENT
