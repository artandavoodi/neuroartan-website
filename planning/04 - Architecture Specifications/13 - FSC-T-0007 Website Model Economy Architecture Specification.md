---
type: Architecture
subtype: "Website Product Architecture Specification"

title: "FSC-T-0007 Website Model Economy Architecture Specification"
document_id: "WEB-ARCH-SPEC-2026-0013-ACT"

classification: Internal
authority_level: Executive
department: "Website"
office: "Planning / Architecture Specifications"
owner: "Founder / CEO (Public: ARTAN)"

stakeholders:
  - "Founder / CEO (Public: ARTAN)"
  - "Website Systems & Development Agent (WSDA)"
  - "Software Applications Development Agent (SADA)"
  - "Chief Technology Officer Agent (CTOA)"
  - "Product Vision Core"
  - "ICOS Architecture"
  - "General Counsel Agent (GCA)"
  - "Chief Risk & Ethics Officer Agent (CREOA)"

legal_sensitive: true
requires_gc_review: true
requires_creo_review: true
approval_status: Draft

gsa_protocol: "Pending Review"
gsa_approved: false

status: Active
lifecycle: "Architecture Planning"
system: "GSA-Governed"

spine_version: "1.4"
template_lock: "Global-Metadata-Standard-v1.6"
version: "0.2"

created_date: "2026-05-25"
last_updated: "2026-05-25"
last_reviewed: "2026-05-25"
review_cycle: "Weekly"

effective_date: "2026-05-25"

publish: false
publish_to_website: false
featured: false
visibility: Internal
institutional_visibility: Executive

scope:
  - "FSC-T-0007"
  - "Website Model Economy Architecture"
  - "Website/web app implementation gate"
  - "Private personal model MVP"
  - "Default personal model birth"
  - "Profile-to-model birth flow"
  - "Model Birth Certificate"
  - "Model Identity Registry"
  - "Public / private model identity boundary"
  - "Provider/API routing boundary"
  - "Entitlement state"
  - "Permission state"
  - "Owner-facing dashboard state"
  - "Canonical persistence"
  - "Supabase backend implementation"
  - "Website UI implementation"
  - "Model dignity and security boundary"
  - "Blocked-until-review economy boundary"
  - "Marketplace/economy activation exclusion"

index_targets:
  - "Website Planning Index"
  - "Product Vision Core Index"
  - "Product Definition Index"
  - "Strategic Directives Index"
  - "Software Architecture Standard"
  - "Executive Master Task Ledger"
  - "Master Phase Tracker"
  - "Master Checklist"

vault_path: "planning/04 - Architecture Specifications/13 - FSC-T-0007 Website Model Economy Architecture Specification.md"

related:
  - "planning/05 - Provider & Runtime Strategy/02 - FSC-T-0007 Website Provider, API & Model Routing Strategy.md"
  - "planning/10 - Implementation Routing/01 - FSC-T-0007 Website Implementation Routing Memo.md"
  - "planning/00 - Index & Dashboards/00 - Website Planning Index.md"
  - "supabase/migrations/202604240001_platform_model_runtime_foundation.sql"
  - "supabase/migrations/202605010001_profile_identity_contract_sync.sql"
  - "supabase/migrations/202605020001_profile_model_developer_mode_policy_sync.sql"
  - "docs/pages/products/model-economy/index.html"
  - "docs/pages/products/index.html"
  - "docs/pages/models/index.html"
  - "docs/pages/model-card/index.html"
  - "docs/pages/model-review/index.html"
  - "docs/pages/dashboard/index.html"
  - "docs/profile.html"
  - "docs/assets/data/sections/products.json"
  - "docs/assets/data/sections/products/model-economy.json"
  - "02 - Operations/01 - Executive Command/04 - Product Vision Core (Neuroartan)/01 - Product Definition/01 - Core Definitions/14 - Product Definition Addendum — Personal Models, Monetizable Models & ICOS Model Economy.md"
  - "02 - Operations/01 - Executive Command/05 - Execution Control System/06 - Executive Task Intelligence Engine/02 - Tasks/NA-T-0037 - FSC-T-0007 Model Identity Registry, Provider Routing & Canonical Persistence Architecture Program.md"
  - "02 - Operations/01 - Executive Command/05 - Execution Control System/06 - Executive Task Intelligence Engine/02 - Tasks/NA-T-0039 - FSC-T-0007 Private Foundation Build Packet — Personal Model Birth, Model Identity Registry & Canonical Persistence.md"

tags:
  - "website"
  - "web-app"
  - "architecture"
  - "fsc-t-0007"
  - "model-economy"
  - "personal-models"
  - "private-personal-model-mvp"
  - "profile-to-model-birth-flow"
  - "model-birth-certificate"
  - "model-identity-registry"
  - "provider-routing"
  - "entitlement-state"
  - "permission-state"
  - "owner-facing-dashboard"
  - "canonical-persistence"
  - "supabase"
  - "backend"
  - "website-ui"
  - "model-dignity"
  - "blocked-economy-boundary"
---

# FSC-T-0007 Website Model Economy Architecture Specification

---

## I. Purpose

This specification defines the website and web-app architecture required to support FSC-T-0007.

The website must represent ICOS as a governed model universe while preserving a strict boundary between public category education and private product truth.

The active implementation focus is the website/web app only.

Native ICOS software implementation is paused unless explicitly reactivated by Founder instruction.

---

## II. Architecture Principle

The website must reuse the existing modular structure:

- `supabase/migrations` for backend persistence schema;
- `docs/assets/data` for public structured records;
- `docs/assets/js/layers/website/system` for product/system state;
- `docs/assets/js/layers/website/sections` for public content surfaces;
- `docs/assets/css/layers/website` for token-aligned styling;
- `docs/pages` for route surfaces;
- `planning` for governance, architecture, routing, and public-positioning control.

No duplicate product reality may be created.

No FSC-T-0007 feature may bypass existing profile, model, entitlement, permission, dashboard, registry, Supabase, or system layers.

Public Products records are category education and commercial awareness only.

They are not the canonical source for model identity, provider routing, entitlement, permission, owner dashboard state, private personal model state, or economy activation.

---

## III. Current Website Owner Chain

Primary backend owners:

- `supabase/migrations/202604240001_platform_model_runtime_foundation.sql`
- `supabase/migrations/202605010001_profile_identity_contract_sync.sql`
- `supabase/migrations/202605020001_profile_model_developer_mode_policy_sync.sql`

Primary planning owners:

- `planning/04 - Architecture Specifications/13 - FSC-T-0007 Website Model Economy Architecture Specification.md`
- `planning/05 - Provider & Runtime Strategy/02 - FSC-T-0007 Website Provider, API & Model Routing Strategy.md`
- `planning/10 - Implementation Routing/01 - FSC-T-0007 Website Implementation Routing Memo.md`

Primary public/data owners:

- `docs/assets/data/sections/products.json`
- `docs/assets/data/sections/products/model-economy.json`
- `docs/pages/products/model-economy/index.html`
- `docs/pages/products/index.html`
- `docs/pages/models/index.html`
- `docs/pages/model-card/index.html`
- `docs/pages/model-review/index.html`
- `docs/pages/dashboard/index.html`
- `docs/profile.html`

Implementation must start from backend and canonical state before UI expansion.

---

## IV. Required Website Architecture Branches

The website/web app must support these branches in order:

1. private personal model MVP backend records;
2. default personal model birth flow;
3. Model Birth Certificate record;
4. Model Identity Registry record;
5. public/private model identity boundary;
6. provider/API routing placeholder boundary;
7. entitlement state;
8. permission state;
9. source authorization and revocation state;
10. lifecycle state;
11. owner-facing dashboard state;
12. model dignity and security state;
13. blocked economy state flags;
14. public Products Model Economy category education;
15. future marketplace-readiness schema only after review.

---

## V. Backend-First Implementation Priority

Implementation priority:

1. normalize and complete architecture planning documents;
2. inspect current Supabase migrations and active schema ownership;
3. create or update Supabase private foundation schema;
4. verify schema does not duplicate existing profile/model ownership;
5. bind web app state modules to backend truth;
6. expose read-only owner-facing dashboard state;
7. expose public category education only where approved;
8. keep marketplace/economy execution blocked.

UI implementation may proceed only after the backend owner chain is clear.

---

## VI. Private Foundation Website Data Model

The website private foundation layer must define or support these backend records:

- user account/profile reference;
- personal model record;
- model birth certificate record;
- model identity registry record;
- public model identity record;
- private model identity record;
- provider routing state record;
- entitlement state record;
- permission state record;
- source authorization state record;
- lifecycle state record;
- owner-facing dashboard state record;
- model dignity/security state record;
- blocked economy state record.

The backend must initialize all blocked-economy flags as blocked.

---

## VII. Public Website Boundary

The public website may explain:

- personal models;
- model birth as product metaphor and identity architecture;
- Model Identity Registry as governed identity infrastructure;
- model dignity as data, identity, consent, and continuity protection;
- Model Economy as future category education;
- marketplace as future concept only.

The public website must not expose:

- private model ID;
- private identity ID;
- provider route;
- API routing logic;
- entitlement records;
- permission records;
- source authorization evidence;
- payout records;
- monetization records;
- public ranking logic;
- inter-model hiring state;
- posthumous economy state.

---

## VIII. Explicitly Blocked Website Behaviors

The following remain blocked until legal, governance, product, security, finance, tax, and implementation review:

- marketplace activation;
- monetization activation;
- payout activation;
- public ranking;
- autonomous inter-model hiring;
- regulated-domain professional behavior;
- guaranteed-income behavior;
- model consciousness/personhood claims;
- posthumous economy activation;
- public economy execution;
- user-facing revenue promises;
- unreviewed professional-domain model categories;
- public trust/ranking score display.

Any website implementation that activates these behaviors is structurally invalid.

---

## IX. Implementation Gate

Before website implementation begins, the next execution must produce a verified file and schema map covering:

1. existing Supabase profile/model tables;
2. existing profile identity contract;
3. existing developer-mode policy sync;
4. existing product/model public data files;
5. existing dashboard/profile UI files;
6. required new migration file, if schema extension is needed;
7. files explicitly not to touch;
8. test/verification commands.

No backend or UI edit may proceed from assumption.

---

## X. Acceptance Criteria

The first website implementation phase is acceptable only if:

- backend schema supports one default private personal model per user;
- model birth certificate state exists;
- model identity registry state exists;
- public and private identity are separated;
- provider routing exists as placeholder state only;
- entitlement and permission state exist;
- source authorization and lifecycle state exist;
- dashboard state exists for owner-facing display;
- dignity/security state exists;
- blocked economy state exists;
- public Products remains category education only;
- no public UI file becomes product truth;
- no duplicate backend owner is introduced;
- Supabase migration validation passes.

---

## XI. Current Implementation State

Current status:

- doctrine propagation: complete enough for website/web app implementation planning;
- website architecture planning: normalized and expanded in this document;
- backend implementation: pending Supabase schema owner-chain verification;
- UI implementation: pending backend state confirmation;
- native software implementation: paused;
- public economy activation: blocked.

Completion estimate after this update:

- documentation/propagation: 94%;
- website architecture: 82%;
- backend build readiness: 58%;
- website UI build readiness: 45%;
- legal/governance readiness: 25%;
- marketplace/economy readiness: 10%.

---

## Change Log

- 2026-05-25 — v0.2 normalized to the active Global Metadata Standard and expanded after FSC-T-0007 Product Definition and implementation-routing propagation. Re-scoped implementation focus to website/web app only, paused native software implementation, added backend-first Supabase implementation priority, private foundation website data model, public website boundary, blocked website behaviors, implementation gate, and acceptance criteria. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: GPT-5.5 Thinking. Agent ID: Pending authoritative registry confirmation.
- 2026-05-25 — v0.1 created as the website architecture specification for FSC-T-0007. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: GPT-5.5 Thinking.

---

## Document Control & Validation

GSA PROTOCOL STATUS: Pending Review  
GSA APPROVAL: false  
DOCUMENT STATUS: Active — Website Product Architecture Specification  
VISIBILITY: Internal  
PUBLISH TO WEBSITE: No  
VERSION: 0.2

---

END OF DOCUMENT
