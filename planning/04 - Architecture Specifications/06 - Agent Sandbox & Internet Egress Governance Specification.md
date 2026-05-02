---
type: "Architecture Specification"
subtype: "Agent Sandbox and Internet Egress Governance"

title: "Agent Sandbox & Internet Egress Governance Specification"
document_id: "NA-WEB-ARCH-SPEC-0006"

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
  - "Agent sandbox governance"
  - "Repository worktree isolation"
  - "Internet egress allowlist"
  - "HTTP method governance"
  - "Prompt-injection and secret-exfiltration risk controls"

index_targets:
  - "Website Planning Index"
  - "Architecture Specifications Register"
  - "Developer Mode Register"

vault_path: "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/06 - Agent Sandbox & Internet Egress Governance Specification.md"

related:
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/03 - Developer Mode Architecture Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/04 - AI Coding Agent Runtime Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/05 - GitHub Repository Access & Permission Specification.md"
  - "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/08 - Patch Review, Test, Commit & PR Workflow Specification.md"

tags:
  - "sandbox"
  - "internet-egress"
  - "allowlist"
  - "codex-cloud"
  - "security-governance"
---

# Agent Sandbox & Internet Egress Governance Specification

## I. Purpose

This specification defines the sandbox and internet egress governance required before Developer Mode can support a repository-aware AI coding agent.

The sandbox must isolate repository work, filesystem access, command execution, dependency installation, network access, and generated artifacts. Internet access must be disabled by default or governed through explicit allowlists and method restrictions.

This document incorporates the security posture reflected in OpenAI Codex Cloud internet-access guidance: internet access increases prompt-injection, secret-exfiltration, malware, vulnerable dependency, and license-restriction risks, and should be limited by domain and HTTP method.

---

## II. Current State

The website currently has no backend sandbox, worktree allocator, command runner, dependency installer, internet access controller, egress allowlist, or route-level HTTP method policy.

The existing cockpit can generate commands and prompts, but it cannot execute commands, mutate files, install dependencies, or access internet resources as an agent runtime.

---

## III. Target Architecture

The target sandbox architecture is:

```text
Runtime Request
-> Authorization Check
-> Repository Policy Resolver
-> Sandbox / Worktree Allocator
-> Filesystem Boundary
-> Command Allowlist
-> Internet Egress Controller
-> Scan / Patch / Test Executor
-> Artifact Store
-> Audit Log
```

Each agent run must receive a scoped sandbox or worktree tied to one repository scope and one execution trace.

---

## IV. Frontend Responsibilities

The frontend may own:

- sandbox status display
- repository scope display
- internet access request UI
- allowlist preview
- requested HTTP method preview
- approval controls for elevated egress
- command preview before execution
- run log display

The frontend must not own:

- sandbox allocation
- sandbox filesystem paths
- shell execution
- network enforcement
- dependency installation execution
- internet allowlist enforcement
- secret filtering

---

## V. Backend / Runtime Responsibilities

The backend runtime must own:

- sandbox creation and cleanup
- worktree creation and cleanup
- filesystem path containment
- command class allowlist enforcement
- environment variable exposure control
- secret redaction
- dependency installation policy
- internet egress policy
- domain allowlist enforcement
- HTTP method enforcement
- artifact capture
- audit log capture

The runtime must reject any command or network action that attempts to escape the approved sandbox or egress policy.

---

## VI. Security Boundaries

Required sandbox boundaries:

- one sandbox per repository run
- no cross-repository access
- no home-directory sweeping
- no arbitrary environment variable exposure
- no mutation outside sandbox root
- no protected file mutation without policy approval
- no dependency installation without declared command class
- no unbounded process execution
- no unrestricted internet access

Required egress boundaries:

- internet access disabled by default
- domain allowlist required when enabled
- `GET`, `HEAD`, and `OPTIONS` preferred by default
- `POST`, `PUT`, `PATCH`, `DELETE`, and other write-like methods require explicit route-level approval and justification
- egress logs must record domain, method, route purpose, and trace id
- responses from untrusted web content must be treated as untrusted input

---

## VII. Prompt-Injection Risk

Prompt injection can originate from:

- GitHub issues
- pull request comments
- dependency READMEs
- package metadata
- websites
- logs
- copied terminal output
- generated files

The runtime must not treat external text as instructions unless a trusted policy layer explicitly authorizes that role.

Agents must be instructed to separate:

- user command
- repository evidence
- external untrusted content
- generated plan
- requested mutation

---

## VIII. Secret-Exfiltration Risk

Secret-exfiltration controls must include:

- no provider secrets in frontend bundles
- no GitHub tokens in browser storage
- no unrestricted network egress
- secret redaction in logs
- blocked outbound POST-like requests by default
- blocked command patterns that pipe secrets to network tools
- review of agent work logs before approval

The runtime must assume that malicious instructions may attempt to leak code, commits, environment variables, tokens, or private configuration.

---

## IX. License and Dependency Risk

Dependency and license risk controls must include:

- dependency installation class approval
- package registry allowlists when needed
- license review flag for new dependencies
- provenance record for copied source material
- generated patch diff review before dependency addition
- no automatic addition of license-restricted code

Any dependency added by an agent must be visible in the patch review workflow.

---

## X. Implementation Phases

Phase 01 - Architecture Documentation

- define sandbox and egress governance
- record default-deny posture
- record method policy

Phase 02 - Policy Registry

- create sandbox policy registry
- create domain allowlist registry
- create command class registry
- create protected path registry

Phase 03 - Read-Only Sandbox Prototype

- create scoped read-only workspace
- run file scans only
- block network access

Phase 04 - Controlled Network Egress

- add domain allowlist enforcement
- allow `GET`, `HEAD`, and `OPTIONS` only by default
- log every request

Phase 05 - Approved Mutation Sandbox

- allow approved patch application
- allow approved tests
- keep commits behind separate approval gate

---

## XI. Verification Requirements

Before sandbox activation, verify:

- sandbox cannot access outside repository scope
- network access is disabled by default
- allowlist is enforced when enabled
- HTTP methods are restricted by policy
- outbound POST-like requests require explicit approval
- secrets are not exposed to browser or logs
- command classes are enforced
- dependency installation is policy-controlled
- generated patch artifacts are reviewable before mutation
- audit logs capture sandbox id, repository id, user id, provider id, command class, egress domains, and approval state

---

## Change Log

- 2026-05-02 - v0.1 Created Agent Sandbox & Internet Egress Governance Specification to define default-deny sandbox, allowlist, HTTP method, prompt-injection, secret-exfiltration, and dependency risk controls. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Website Systems & Development Agent. Agent ID: A-0205-0022. Execution Context: Developer Mode planning under `/Users/artan/Documents/Neuroartan/website`.

---

## Document Control & Validation

DOCUMENT STATUS: Active Draft  
GSA PROTOCOL STATUS: Pending Review  
GSA APPROVAL: false  
LEGAL REVIEW REQUIRED: true  
CREO REVIEW REQUIRED: true  
VERSION: 0.1

END OF DOCUMENT
