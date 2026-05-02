---
type: "Architecture Specification"
subtype: "GitHub Repository Access & Permission"

title: "GitHub Repository Access & Permission Specification"
document_id: "NA-WEB-ARCH-SPEC-0005"

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
lifecycle: "Repository Access Architecture Definition"
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
  - "GitHub repository authorization"
  - "Repository permission model"
  - "GitHub App and OAuth boundary"
  - "Branch and path protection"
  - "Commit and pull request attribution"

index_targets:
  - "Website Planning Index"
  - "Architecture Specifications Register"
  - "GitHub Repository Access Register"

vault_path: "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/05 - GitHub Repository Access & Permission Specification.md"

related:
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/03 - Developer Mode Architecture Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/04 - AI Coding Agent Runtime Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/06 - Agent Sandbox & Internet Egress Governance Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/08 - Patch Review, Test, Commit & PR Workflow Specification.md"

tags:
  - "github-access"
  - "repository-permissions"
  - "github-app"
  - "oauth-boundary"
  - "protected-branches"
  - "developer-mode"
---

# GitHub Repository Access & Permission Specification

## I. Purpose

This specification defines the GitHub repository access and permission architecture for the Neuroartan Developer Mode and AI Coding Agent runtime.

The purpose is to allow repository-aware development while preserving strict permission boundaries, protected branch controls, explicit approval gates, commit attribution, and legal/security review requirements.

Repository access must be scoped, auditable, reversible, and never exposed directly through frontend browser code.

---

## II. Current State

The website currently contains development cockpit registry concepts for repository scope and workflow selection.

The current system does not yet contain:

- GitHub App installation flow
- GitHub OAuth authorization flow
- repository permission resolver
- branch protection awareness
- protected path registry
- repository clone credential boundary
- commit execution service
- pull request execution service
- repository mutation approval gate
- GitHub audit event ledger

The current cockpit may help generate commands and commit messages, but it does not yet hold secure repository execution authority.

---

## III. Target Access Model

The target GitHub access model is:

```text
Developer Mode User
→ Authenticated Platform Session
→ Repository Scope Selector
→ GitHub App / OAuth Authorization
→ Repository Permission Resolver
→ Branch & Path Protection Check
→ Runtime Worktree Authorization
→ Patch Review Approval
→ Commit / Pull Request Execution
→ GitHub Audit Record
```

The browser selects and approves.

The runtime authorizes and executes.

---

## IV-A. Frontend Responsibilities

The frontend may own repository selection UI, branch selection display, permission status display, protected path warnings, commit message drafting, pull request title/body drafting, and approval controls.

The frontend must not own GitHub App private keys, OAuth client secrets, access tokens, refresh tokens, direct GitHub write calls, repository clone operations, direct commit creation, or direct pull request creation.

---

## IV-B. Backend / Runtime Responsibilities

The backend runtime must own GitHub App installation validation, OAuth token exchange when approved, repository permission resolution, token storage integration, repository allowlist enforcement, branch policy enforcement, protected path enforcement, clone/fetch operations, branch creation, commit creation, pull request creation, attribution, and audit logging.

---

## IV-C. Security Boundaries

GitHub access must remain repository-scoped, backend-held, approval-gated, and auditable. Browser code must never receive GitHub secrets, clone credentials, direct write capability, or mutation authority.

---

## IV. GitHub Authorization Boundary

GitHub access should be implemented through one of two approved patterns.

### Preferred Pattern — GitHub App

A GitHub App should be preferred for production repository access because it supports scoped installation permissions per repository.

Required GitHub App properties:

- repository-scoped installation
- least-privilege permissions
- read access by default
- write access only where required
- pull request creation permission only after approval
- no broad personal account token exposure
- revocable installation
- auditable execution identity

### Secondary Pattern — OAuth

OAuth may be used for developer identity and account association.

OAuth must not become an unrestricted repository mutation token.

OAuth use requires legal and security review before production activation.

---

## V. Repository Scope Registry

Each repository must be registered before runtime access.

Required repository registry fields:

- repository ID
- repository name
- GitHub owner
- GitHub URL
- sovereign layer
- visibility status
- allowed branches
- protected branches
- protected paths
- default execution mode
- write permission status
- pull request permission status
- required approval level
- responsible agent
- legal sensitivity level

Unregistered repositories must remain inaccessible to the runtime.

---

## VI. Permission Levels

Repository access must be layered.

### Level 01 — Read Metadata

Allows:

- repository identity reading
- branch list reading
- file tree reading
- issue and pull request metadata reading where approved

### Level 02 — Read Content

Allows:

- file content reading
- dependency manifest reading
- import graph analysis
- documentation scan

### Level 03 — Propose Patch

Allows:

- generate diffs inside sandbox
- create patch preview
- create implementation plan

Does not allow commit or pull request creation.

### Level 04 — Create Pull Request

Allows after approval:

- create branch
- apply reviewed patch
- commit changes
- open pull request

### Level 05 — Direct Commit

Restricted.

Direct commit may only be permitted for explicitly approved internal branches and must not target protected production branches.

---

## VII. Protected Branch Controls

Protected branch controls must prevent unsafe mutation.

Required branch protections:

- no direct commit to production branch by default
- no direct commit to public deployment branch without approval
- pull request required for production-impacting changes
- test result required before merge
- manual founder approval for critical layers
- rollback plan required for high-risk changes

Protected branches must be resolved before mutation.

---

## VIII. Protected Path Controls

Protected path controls must prevent unauthorized edits to sensitive areas.

Protected path categories include:

- legal pages
- privacy and cookie systems
- authentication systems
- payment or billing systems
- provider secret references
- GitHub authorization logic
- deployment configuration
- global orchestrators
- homepage stage animation systems
- finalized About page systems
- governed planning documents

Protected path mutation must require elevated approval.

---

## IX. Commit Attribution

Every commit generated through the runtime must be attributable.

Required attribution fields:

- operator name
- operator personnel ID
- platform user ID if available
- agent name
- agent ID
- model provider
- model name
- execution ID
- source command
- approval timestamp

Commit messages should reference the execution ID when available.

---

## X. Pull Request Requirements

Pull requests created by the runtime must include:

- summary
- changed files
- implementation rationale
- test commands run
- test results
- risk level
- rollback notes
- approval record
- related planning document or task
- execution ID

Pull requests must not conceal model-generated changes.

---

## XI. Secret Handling

GitHub credentials must never be stored in frontend code.

Required secret controls:

- server-side storage only
- encrypted secret storage
- limited runtime access
- no logging of token values
- no prompt exposure of secrets
- automatic redaction in logs
- token revocation support
- separate development and production credentials

Any credential exposure must trigger incident review.

---

## XII. Runtime Access Flow

Runtime repository access should follow this flow:

1. user enables Developer Mode
2. user selects repository
3. runtime validates repository registration
4. runtime validates authorization scope
5. runtime validates branch and path controls
6. runtime creates isolated worktree or clone
7. runtime performs approved scan
8. runtime produces plan and patch proposal
9. user reviews patch
10. user approves mutation
11. runtime applies patch in sandbox
12. runtime runs approved tests
13. user approves commit or pull request
14. runtime creates branch, commit, and pull request
15. runtime records audit event

---

## XIII. Legal and Security Review

GitHub repository access is legally and operationally sensitive.

Review is required before:

- enabling GitHub App installation
- enabling OAuth authorization
- enabling write access
- enabling pull request creation
- enabling automated test execution
- enabling internet access during repository work
- enabling access to private repositories
- enabling third-party model access to repository context

Legal Operations Agent review is required before production exposure.

---

## XIV. Verification Requirements

Verification must confirm:

- no GitHub secrets in frontend
- repository access is registered and scoped
- unregistered repositories are blocked
- protected branches cannot be directly mutated
- protected paths require elevated approval
- pull request creation requires approval
- direct commit is restricted
- audit record is generated
- token values are redacted from logs
- provider prompts do not include secrets
- private repository context is routed only through approved providers

---

## XV. Implementation Phases

Phase 01 — Registry Definition

- define repository registry schema
- define branch protection schema
- define protected path schema
- define approval level schema

Phase 02 — Authorization Boundary

- evaluate GitHub App as preferred access model
- define OAuth identity use if required
- define secret storage boundary

Phase 03 — Read-Only Repository Access

- allow registered repository scan
- allow branch and file tree read
- prohibit mutation

Phase 04 — Pull Request Flow

- create branch after approval
- apply reviewed patch
- run tests
- create pull request

Phase 05 — Governance Hardening

- enforce protected paths
- enforce branch policy
- attach audit records
- route legal-sensitive changes to review

---

## XVI. Status

GitHub repository access is not yet implemented.

Current authorized work is registry architecture, permission definition, runtime boundary design, and legal/security review preparation.

---

## Change Log

- 2026-05-02 — v0.1 Created GitHub Repository Access & Permission Specification to define scoped repository authorization for Developer Mode and AI Coding Agent runtime execution. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Website Systems & Development Agent. Agent ID: A-0205-0022. Execution Context: GitHub repository access architecture specification under `/Users/artan/Documents/Neuroartan/website`.

---

## Document Control & Validation

DOCUMENT STATUS: Active Draft  
GSA PROTOCOL STATUS: Pending Review  
GSA APPROVAL: false  
LEGAL REVIEW REQUIRED: true  
CREO REVIEW REQUIRED: true  
VERSION: 0.1

END OF DOCUMENT
