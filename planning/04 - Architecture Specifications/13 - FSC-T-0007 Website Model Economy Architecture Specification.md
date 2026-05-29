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
version: "0.4"

created_date: "2026-05-25"
last_updated: "2026-05-29"
last_reviewed: "2026-05-29"
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
  - "One-profile / one-canonical-personal-model birth"
  - "Profile-to-model birth flow"
  - "Private-only Thought Bank boundary"
  - "Separate Posts expression and publishing boundary"
  - "Model Birth Certificate"
  - "Model Identity Registry"
  - "Public / private model identity boundary"
  - "Provider/API routing boundary"
  - "Entitlement state without additional personal-model slots"
  - "Permission state"
  - "Owner-facing dashboard state"
  - "Canonical persistence"
  - "Supabase backend implementation"
  - "Website UI implementation"
  - "Model dignity and security boundary"
  - "Blocked-until-review economy boundary"
  - "Marketplace/economy activation exclusion"
  - "No paid multi-model personal expansion"
  - "Device Integrity and Abuse Prevention boundary"
  - "Impersonation Prevention boundary"
  - "Model Identity Anti-Abuse boundary"
  - "Account and Profile Creation Risk boundary"
  - "Model Creation Enforcement boundary"
  - "Restriction, Review, and Appeal boundary"
  - "Privacy Notice Addendum boundary for device integrity signals"

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
  - "04 - Infrastructure/06 - Platform Infrastructure/01 - Standards & Governance/05 - Policies/01 - Device Integrity & Abuse Prevention Standard.md"
  - "04 - Infrastructure/06 - Platform Infrastructure/01 - Standards & Governance/05 - Policies/02 - Impersonation Prevention Policy.md"
  - "04 - Infrastructure/06 - Platform Infrastructure/01 - Standards & Governance/05 - Policies/03 - Model Identity Anti-Abuse Policy.md"
  - "04 - Infrastructure/06 - Platform Infrastructure/01 - Standards & Governance/05 - Policies/04 - Device Risk Registry Architecture.md"
  - "04 - Infrastructure/06 - Platform Infrastructure/01 - Standards & Governance/05 - Policies/05 - Account & Profile Creation Risk Protocol.md"
  - "04 - Infrastructure/06 - Platform Infrastructure/01 - Standards & Governance/05 - Policies/06 - Model Creation Enforcement Protocol.md"
  - "04 - Infrastructure/06 - Platform Infrastructure/01 - Standards & Governance/05 - Policies/07 - Restriction, Review & Appeal Procedure.md"
  - "04 - Infrastructure/06 - Platform Infrastructure/01 - Standards & Governance/05 - Policies/08 - Privacy Notice Addendum — Device Integrity Signals.md"

tags:
  - "website"
  - "web-app"
  - "architecture"
  - "fsc-t-0007"
  - "model-economy"
  - "personal-models"
  - "private-personal-model-mvp"
  - "profile-to-model-birth-flow"
  - "one-profile-one-model"
  - "canonical-personal-model"
  - "thought-bank"
  - "separate-posts-layer"
  - "no-personal-model-slots"
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
  - "device-integrity"
  - "impersonation-prevention"
  - "model-identity-anti-abuse"
  - "account-profile-risk"
  - "model-creation-enforcement"
  - "restriction-review-appeal"
  - "privacy-notice-device-integrity"

---

# FSC-T-0007 Website Model Economy Architecture Specification

---

## I. Purpose

This specification defines the website and web-app architecture required to support FSC-T-0007.

The website must represent ICOS as a governed model universe while preserving a strict boundary between public category education and private product truth.

Founder-confirmed doctrine as of 2026-05-29:

- each profile gives birth to one canonical personal model only;
- paid subscription tiers must not create additional canonical personal models;
- Thoughts are private-only cognitive substrate / Thought Bank;
- Posts are the expression, publishing, and public/private communication layer;
- future model economy, marketplace, hiring, ranking, payouts, and inter-model hiring remain blocked until review.

Device-integrity and anti-abuse doctrine as of 2026-05-29:

- website implementation must not activate device-integrity enforcement without legal, governance, privacy, and security review;
- raw physical device serial-number collection is prohibited as the enforcement method;
- device integrity signals must not be used for advertising, marketing, behavioral personalization, public reputation scoring, or unrelated tracking;
- privacy-preserving device integrity may support only fraud prevention, impersonation defense, duplicate-abuse detection, one-profile / one-canonical-personal-model enforcement, and model-integrity protection;
- severe restrictions require step-up verification, manual review where required, appeal, retention limits, and approved user notice language.

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
2. one-profile / one-canonical-personal-model birth flow;
3. Model Birth Certificate record;
4. Model Identity Registry record;
5. device integrity and abuse prevention boundary state;
6. impersonation prevention boundary state;
7. model identity anti-abuse boundary state;
8. account and profile creation risk boundary state;
9. model creation enforcement boundary state;
10. restriction, review, and appeal boundary state;
11. privacy notice addendum boundary for device integrity signals;
12. public/private model identity boundary;
13. provider/API routing placeholder boundary;
14. entitlement state without additional personal-model slots;
15. permission state;
16. source authorization and revocation state;
17. lifecycle state;
18. owner-facing dashboard state;
19. private-only Thought Bank boundary state;
20. separate Posts expression and publishing boundary state;
21. model dignity and security state;
22. blocked economy state flags;
23. public Products Model Economy category education;
24. future marketplace-readiness schema only after review.

---

## V. Backend-First Implementation Priority

Implementation priority:

1. normalize and complete architecture planning documents;
2. inspect current Supabase migrations and active schema ownership;
3. create or update Supabase private foundation schema;
4. verify schema does not duplicate existing profile/model ownership;
5. verify schema does not introduce raw physical device serial-number collection;
6. verify device-integrity placeholders are privacy-preserving, security-only, and enforcement-blocked pending review;
7. verify account/profile/model creation risk states remain reviewable and appeal-aware;
8. bind web app state modules to backend truth;
9. expose read-only owner-facing dashboard state;
10. expose public category education only where approved;
11. keep marketplace/economy execution blocked.

UI implementation may proceed only after the backend owner chain is clear.

---

## VI. Private Foundation Website Data Model

The website private foundation layer must define or support these backend records:

- user account/profile reference;
- canonical personal model record;
- model birth certificate record;
- model identity registry record;
- device integrity and abuse prevention boundary state record;
- impersonation prevention boundary state record;
- model identity anti-abuse boundary state record;
- account and profile creation risk boundary state record;
- model creation enforcement boundary state record;
- restriction, review, and appeal boundary state record;
- privacy notice addendum boundary state record;
- public model identity record;
- private model identity record;
- provider routing state record;
- entitlement state record without additional personal-model slots;
- permission state record;
- source authorization state record;
- lifecycle state record;
- owner-facing dashboard state record;
- private Thought Bank boundary state record;
- separate Posts expression and publishing boundary state record;
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

The public website may also explain, only after legal/governance review, that Neuroartan uses privacy-preserving security signals to protect account integrity, prevent impersonation, reduce abuse, and enforce one-profile / one-canonical-personal-model governance.

The public website must also preserve that:

- Thoughts are not public routes;
- private Thought Bank entries must not appear on public profile surfaces;
- Posts are the public/private expression and publishing layer;
- one profile / one canonical personal model is the governing product rule;
- paid tiers expand depth, memory, voice, analytics, studio, publishing, verification, and continuity controls, not additional personal-model slots.

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
- posthumous economy state;
- additional personal-model slot state;
- public Thought Bank entries;
- private thoughts as public social content.
- raw physical device serial-number collection claims;
- automatic permanent device-ban claims;
- device-based public reputation scoring;
- device-signal use for advertising, marketing, behavioral personalization, or unrelated tracking;
- internal device-risk records, private device hashes, risk reason codes, or impersonation-review evidence.

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
- public trust/ranking score display;
- paid additional personal-model slots;
- bot-factory model creation;
- public Thought routes;
- Thought Bank exposure on public profile surfaces;
- private thoughts entering feed or marketplace surfaces without deliberate Post creation.
- raw physical device serial-number collection;
- advertising, marketing, behavioral personalization, public reputation scoring, or unrelated tracking use of device integrity signals;
- automatic permanent device bans without review;
- production device-integrity enforcement before legal/governance/privacy/security review;
- public exposure of internal device-risk records, private device hashes, risk reason codes, or impersonation-review evidence.

Any website implementation that activates these behaviors is structurally invalid.

---

## IX. Implementation Gate

Before website implementation begins, the next execution must produce a verified file and schema map covering:

1. existing Supabase profile/model tables;
2. existing profile identity contract;
3. existing developer-mode policy sync;
4. existing product/model public data files;
5. existing dashboard/profile UI files;
5A. existing Thought Bank/private thoughts owner files;
5B. existing Posts/feed/publishing owner files;
5C. existing account/profile creation risk owner files;
5D. existing model creation enforcement owner files;
5E. existing device integrity / anti-abuse owner files, if any;
5F. required privacy notice placement and review state;
6. required new migration file, if schema extension is needed;
7. files explicitly not to touch;
8. test/verification commands.

No backend or UI edit may proceed from assumption.

---

## X. Acceptance Criteria

The first website implementation phase is acceptable only if:

- backend schema supports one canonical personal model per profile;
- model birth certificate state exists;
- model identity registry state exists;
- device integrity and abuse prevention boundary state exists as review-blocked placeholder state where needed;
- impersonation prevention boundary state exists;
- model identity anti-abuse boundary state exists;
- account/profile/model creation risk state exists where needed;
- restriction, review, and appeal state exists for severe enforcement paths;
- privacy notice addendum review state exists before any device-integrity public language or enforcement;
- public and private identity are separated;
- provider routing exists as placeholder state only;
- entitlement and permission state exist;
- entitlement state blocks additional personal-model slots;
- private Thought Bank boundary state exists;
- separate Posts expression and publishing boundary state exists;
- source authorization and lifecycle state exist;
- dashboard state exists for owner-facing display;
- dignity/security state exists;
- blocked economy state exists;
- public Products remains category education only;
- no public UI file becomes product truth;
- no duplicate backend owner is introduced;
- no public Thought route is introduced;
- no paid multi-model personal expansion is introduced;
- no raw physical device serial-number collection is introduced;
- no advertising, marketing, behavioral personalization, public reputation scoring, or unrelated tracking use of device integrity signals is introduced;
- no automatic permanent device ban behavior is introduced;
- no production device-integrity enforcement is introduced before legal/governance/privacy/security review;
- no internal device-risk records, private device hashes, risk reason codes, or impersonation-review evidence are exposed publicly;
- Supabase migration validation passes.

---

## XI. Current Implementation State

Current status:

- doctrine propagation: updated for one-profile / one-canonical-personal-model, private-only Thought Bank, separate Posts layer, blocked future economy planning, and privacy-preserving device integrity / anti-abuse governance;
- website architecture planning: normalized and expanded in this document;
- backend implementation: pending Supabase schema owner-chain verification;
- UI implementation: pending backend state confirmation;
- native software implementation: paused;
- public economy activation: blocked.
- device integrity enforcement: doctrine-ready, implementation-blocked pending legal/governance/privacy/security review;
- raw physical device serial-number collection: prohibited;
- advertising/tracking/personalization use of device integrity signals: prohibited.

Completion estimate after this update:

- documentation/propagation: 96%;
- website architecture: 82%;
- backend build readiness: 58%;
- website UI build readiness: 45%;
- legal/governance readiness: 25%;
- device-integrity / anti-abuse readiness: 35%;
- marketplace/economy readiness: 10%.

---

## Change Log

- 2026-05-29 — v0.4 Device integrity and anti-abuse doctrine propagated into the website model economy architecture specification. Added Device Integrity and Abuse Prevention, Impersonation Prevention, Model Identity Anti-Abuse, Account/Profile Creation Risk, Model Creation Enforcement, Restriction Review & Appeal, and Privacy Notice Addendum boundaries to website architecture branches, private foundation data model, public website boundary, blocked behaviors, implementation gate, and acceptance criteria. Prohibited raw physical device serial-number collection, advertising/tracking/personalization/public-reputation use of device integrity signals, automatic permanent device bans without review, public exposure of internal device-risk records, and production enforcement before legal/governance/privacy/security review. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: GPT-5.5 Thinking. Agent ID: Pending authoritative registry confirmation.
- 2026-05-29 — v0.3 Founder-confirmed strategic architecture decision propagated. Updated website architecture to one-profile / one-canonical-personal-model birth, blocked paid additional personal-model slots, added private-only Thought Bank boundary and separate Posts expression/publishing boundary, and reaffirmed future economy, marketplace, ranking, payouts, inter-model hiring, public Thought routes, and bot-factory model creation as blocked. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: GPT-5.5 Thinking. Agent ID: Pending authoritative registry confirmation.
- 2026-05-25 — v0.2 normalized to the active Global Metadata Standard and expanded after FSC-T-0007 Product Definition and implementation-routing propagation. Re-scoped implementation focus to website/web app only, paused native software implementation, added backend-first Supabase implementation priority, private foundation website data model, public website boundary, blocked website behaviors, implementation gate, and acceptance criteria. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: GPT-5.5 Thinking. Agent ID: Pending authoritative registry confirmation.
- 2026-05-25 — v0.1 created as the website architecture specification for FSC-T-0007. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: GPT-5.5 Thinking.

---

## Document Control & Validation

GSA PROTOCOL STATUS: Pending Review  
GSA APPROVAL: false  
DOCUMENT STATUS: Active — Website Product Architecture Specification  
VISIBILITY: Internal  
PUBLISH TO WEBSITE: No  
VERSION: 0.4

---

END OF DOCUMENT
