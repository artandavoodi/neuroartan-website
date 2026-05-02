---
type: Architecture
subtype: "Website Modular Architecture Doctrine"

title: "Website Modular Architecture Doctrine"
document_id: "NA-WSDA-ARCH-DOC-0002"

classification: Internal
authority_level: Departmental
department: "02 - Operations"
office: "Website Systems & Development / Planning / 04 - Architecture Specifications"
owner: "Website Systems & Development Agent (WSDA)"

stakeholders:
  - "Founder / CEO (Public: ARTAN)"
  - "Website Systems & Development Agent (WSDA)"
  - "Software Applications Development Agent (SADA)"
  - "Debugging & Systems Integrity Agent (DSIA)"
  - "Codex / Local Development Agents"
  - "Future Website Execution Agents"

legal_sensitive: false
requires_gc_review: false
requires_creo_review: false
approval_status: Draft

gsa_protocol: "Pending Founder Validation"
gsa_approved: false

status: Active
lifecycle: "Architecture Doctrine"
system: "Website-Governed"

spine_version: "1.4"
template_lock: "Global-Metadata-Standard-v1.6"
version: "1.1"

created_date: "2026-05-02"
last_updated: "2026-05-02"
last_reviewed: "2026-05-02"
review_cycle: "Continuous"

effective_date: "2026-05-02"

publish: false
publish_to_website: false
featured: false
visibility: Internal
institutional_visibility: Departmental

scope:
  - "Website CSS Modular Architecture"
  - "Website JavaScript Modular Architecture"
  - "Fragment Authority Structure"
  - "Importer Governance"
  - "Page and Domain Ownership Boundaries"
  - "Agent Structural Compliance"
  - "Developer Mode Runtime Boundary"

index_targets:
  - "Website Planning Index"
  - "Architecture Specifications Index"
  - "Website Systems & Development Continuity"

vault_path: "planning/04 - Architecture Specifications/02 - Website Modular Architecture Doctrine.md"

related:
  - "planning/04 - Architecture Specifications/01 - AI Development Cockpit Architecture Specification.md"
  - "planning/04 - Architecture Specifications/03 - Developer Mode Architecture Specification.md"
  - "planning/04 - Architecture Specifications/04 - AI Coding Agent Runtime Specification.md"
  - "planning/04 - Architecture Specifications/05 - GitHub Repository Access & Permission Specification.md"
  - "planning/04 - Architecture Specifications/06 - Agent Sandbox & Internet Egress Governance Specification.md"
  - "planning/04 - Architecture Specifications/07 - Voice-to-Agent Command Pipeline Specification.md"
  - "planning/04 - Architecture Specifications/08 - Patch Review, Test, Commit & PR Workflow Specification.md"
  - "04 - Infrastructure/06 - Platform Infrastructure/01 - Standards & Governance/03 - Templates/00 - Standards/00 - Global Document Metadata Standard.md"

tags:
  - "website"
  - "architecture"
  - "modularity"
  - "orchestrator"
  - "doctrine"
  - "developer-mode"
  - "runtime-boundary"
---

## I. Document Purpose

This doctrine defines the mandatory modular architecture for the Neuroartan website system. It preserves the CSS, JavaScript, fragment, collection, page, runtime, and importer structure established through the recent architecture normalization work.

All human operators, Codex agents, ChatGPT agents, local agents, offline agents, and external development assistants must follow this doctrine before creating, moving, importing, renaming, deleting, or restructuring website files.

## II. Doctrine Status

**Status:** Active architectural doctrine  
**Layer:** Website  
**Scope:** CSS, JavaScript, fragments, collections, page systems, runtime authorities, and agent execution behavior  
**Authority:** Website Systems & Development Architecture  
**Purpose:** Preserve modular website architecture, importer normalization, namespace discipline, and ownership clarity.

This doctrine is binding for all future website work unless an explicit architecture migration is approved.

## III. Core Architectural Principle

The website must operate through a clear modular chain:

```text
root entry → root orchestrator → domain orchestrator → local module orchestrator → leaf modules
```

No active runtime file should remain loosely attached to the architecture when its domain already uses folders and orchestrators.

Every active folder that contains executable or styled modules must have a clear import authority.

## IV. CSS Architecture Doctrine

### A. Root CSS Import Chain

The canonical CSS flow is:

```text
core.css
→ website/00-orchestrator/00-website-all.css
→ domain-level 00-*-all.css importers
→ local section/page/module importers
→ leaf CSS files
```

The root website CSS orchestrator must import only domain-level authorities, including:

```text
components
collections
home
layout
pages
publication
sections
```

The root website CSS orchestrator must not directly import individual page files when a page orchestrator exists.

### B. Page CSS Structure

Page CSS must use this pattern:

```text
pages/
  00-orchestrator/
    00-pages-all.css
  about/
    00-about-all.css
    about.css
    featured-functions/
      00-about-featured-functions-all.css
      about-featured-functions.css
  404/
    404.css
```

The page orchestrator imports page-level importers. A page-level importer imports the page shell and its page-owned modules.

### C. Layout Boundary

The `layout` layer is reserved for shared layout primitives.

Page-specific files must not remain inside `layout`.

Forbidden placement:

```text
layout/about.css
layout/publication.css
layout/collections.css
```

Correct placement:

```text
pages/about/about.css
publication/publication.css
collections/collections.css
```

### D. Collections and Publication Boundary

Collections and publication are sovereign website domains.

They must be imported through their own domain importers:

```text
collections/00-collections-all.css
publication/00-publication-all.css
```

Those domain importers must import their local leaf files and must not remain empty when the domain is active.

## V. JavaScript Architecture Doctrine

### A. Root JavaScript Import Chain

The canonical JavaScript flow is:

```text
core.js
→ website/00-orchestrator/website-all.js
→ domain-level 00-*-all.js importers
→ local module importers
→ leaf modules
```

The root website JavaScript orchestrator must import only major domain authorities.

Canonical domain authorities include:

```text
components
home
sections
system
model-creation
pages
ui
motion
profile
```

### B. Page JavaScript Structure

Page JavaScript must be organized through page folders:

```text
pages/
  00-orchestrator/
    00-pages-all.js
  about/
    00-about-all.js
    about.js
    featured-functions/
      00-about-featured-functions-all.js
      about-featured-functions.js
      about-featured-functions-shader.js
  404/
    00-404-all.js
    404.js
```

The pages orchestrator imports page authorities only. It must not import unrelated sovereign systems.

### C. Profile System Boundary

Profile is a dedicated sovereign website system, not a page folder.

Profile files must live under:

```text
profile/
```

Profile page bridges must live under:

```text
profile/page/
```

Profile private and public system logic must live under:

```text
profile/private/
profile/public/
```

The root profile importer owns profile architecture:

```text
profile/00-profile-all.js
```

The pages orchestrator must not import profile modules directly unless a future page-specific profile presentation layer is explicitly approved.

### D. System Layer Boundary

The system layer must not contain loose root files except its root orchestrator:

```text
system/00-system-all.js
```

System domains must live in folders:

```text
system/account/
system/auth/
system/config/
system/model/
system/profile/
system/feed/
system/awareness/
system/ia/
```

Each active system domain must have its own orchestrator:

```text
00-*-all.js
```

The root system importer must route only to subdomain orchestrators.

## VI. Fragment Authority Doctrine

Fragments are runtime-mounted interface surfaces. They must be registered through fragment authorities and must not rely on hidden, obsolete, or migrated Home ownership.

A fragment must follow this chain:

```text
fragment file
→ fragment authority registry
→ page mount
→ page-owned JS/CSS module
```

When a fragment migrates from one page domain to another, all of the following must be migrated together:

```text
fragment path
mount data-include value
fragment authority registry
CSS ownership
JS ownership
class/data namespace
collection or data references
```

Canonical example:

```text
about-featured-functions
```

The namespace must be represented consistently across:

```text
fragment file
about page mount
CSS classes
JS data selectors
events
i18n keys
runtime registry
```

## VII. Namespace Doctrine

A module namespace must match its sovereign owner.

If a module belongs to About, it must not retain Home namespace unless it is intentionally consuming shared Home design tokens through an approved transitional alias layer.

Correct examples:

```text
about-featured-functions
about-featured-functions.js
about-featured-functions.css
about-featured-functions:rendered
about_featured_functions_section_title
```

Incorrect examples after migration:

```text
home-featured-functions
home-featured-functions.js
home-featured-functions.css
home-featured-functions:rendered
home_featured_functions_section_title
```

Shared token inheritance is allowed only when explicit aliases exist.

Approved transitional alias pattern:

```text
--layout-about-featured-functions-* → --layout-home-featured-functions-*
```

This pattern preserves visual behavior while ownership is correctly scoped.

## VIII. Importer Doctrine

Every folder that contains multiple active runtime modules should use an importer file.

Importer names must follow this pattern:

```text
00-<scope>-all.css
00-<scope>-all.js
```

Examples:

```text
00-about-all.css
00-about-all.js
00-profile-all.js
00-system-all.js
00-model-creation-all.js
```

Importer files must:

1. Import only files that exist.
2. Avoid duplicate imports.
3. Avoid direct leaf imports from unrelated domains.
4. Preserve authority order.
5. Include clear structural header comments.
6. Be verified after every move or rename.

## IX. Movement and Migration Protocol

Before any file or folder move, the operator or agent must scan:

```text
source folder
target folder
current importer
root importer
all references to the file name, class namespace, data attributes, events, and i18n keys
```

After migration, the operator or agent must verify:

```text
no broken CSS imports
no broken JS imports
no old namespace residue
no duplicate ownership
no empty active importers
no active orphan files unless intentionally disconnected as migrated-owner notices
```

A migrated-owner notice is acceptable only when a file is intentionally left disconnected to preserve history or avoid unsafe deletion.

## X. No Overlay Rule

Structural issues must not be fixed by overlays.

Forbidden approaches:

```text
adding compensating imports instead of moving ownership
adding duplicate style rules instead of removing old ownership
patching behavior from a second controller
leaving obsolete files imported
keeping page-specific files in shared layout folders
```

Required approach:

```text
scan → identify owner → move ownership → update importer → normalize namespace → verify graph
```

## XI. Verification Commands

After CSS structural work, run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path('docs/assets/css/layers/website')
broken = []

for file in sorted(root.rglob('*.css')):
    text = file.read_text(errors='ignore')
    for match in re.finditer(r"@import\s+url\(['\"]([^'\"]+)['\"]\)", text):
        target = match.group(1)
        if target.startswith(('http://', 'https://', '/')):
            continue
        resolved = (file.parent / target).resolve()
        if not resolved.exists():
            broken.append((str(file), target))

print('NO BROKEN CSS IMPORTS' if not broken else '\n'.join(f'BROKEN {f} -> {t}' for f, t in broken))
PY
```

After JavaScript structural work, run:

```bash
python3 - <<'PY'
from pathlib import Path
import re

roots = [Path('docs/assets/js/layers/website'), Path('docs/assets/js/core')]
broken = []

for root in roots:
    for file in sorted(root.rglob('*.js')):
        text = file.read_text(errors='ignore')
        for pattern in [
            r"import\s+['\"]([^'\"]+)['\"]",
            r"import\s+[^'\"]+?\s+from\s+['\"]([^'\"]+)['\"]",
            r"import\(['\"]([^'\"]+)['\"]\)",
            r"export\s+[^'\"]+?\s+from\s+['\"]([^'\"]+)['\"]",
            r"export\s+\*\s+from\s+['\"]([^'\"]+)['\"]",
        ]:
            for match in re.finditer(pattern, text):
                target = match.group(1)
                if target.startswith(('http://', 'https://', '/')):
                    continue
                resolved = (file.parent / target).resolve()
                if not resolved.exists():
                    broken.append((str(file), target))

print('NO BROKEN JS IMPORTS' if not broken else '\n'.join(f'BROKEN {f} -> {t}' for f, t in broken))
PY
```

## XII. Agent Compliance Rules

Any agent working on this website must follow these rules:

1. Scan before structural edits.
2. Never guess a path.
3. Do not create loose files in a folder that uses orchestrators.
4. Do not import leaf files directly from root when a domain orchestrator exists.
5. Do not leave empty active importers.
6. Do not leave obsolete Home ownership on About modules.
7. Do not preserve old class/data/event namespaces after migration unless explicitly approved as a temporary bridge.
8. Run import verification after every structural change.
9. Treat About, Home, Profile, System, UI, Collections, Publication, and Model Creation as sovereign layers.
10. Preserve achieved behavior before visual or structural refinement.

## XIII. Current Canonical Achievements

The following architecture is now canonical:

```text
About CSS lives under pages/about.
About JavaScript lives under pages/about.
About Featured Functions lives under pages/about/featured-functions.
Profile JavaScript lives under profile, not pages.
System JavaScript is organized into config, account, auth, model, profile, feed, awareness, and ia.
Collections and Publication are imported as sovereign CSS domains.
Root CSS and JavaScript importers route through domain orchestrators.
```

This structure must be preserved unless a future explicit architecture migration is approved.

## XIV. Developer Mode Runtime Boundary Doctrine

Developer Mode is a governed website surface that may later command backend AI coding agents, but it must not collapse server-side execution into the website frontend.

The website may own:

```text
Developer Mode UI
Command Composer
Provider Router Display
Repository Scope Selector
Patch Review Display
Approval Controls
Execution Status Display
```

The website frontend must not own:

```text
Provider Secrets
GitHub Tokens
Repository Clone Credentials
Sandbox Filesystem Access
Shell Execution
Internet Egress Enforcement
Patch Application
Commit Execution
Pull Request Execution
```

Any future Developer Mode runtime implementation must preserve this chain:

```text
root orchestrator
→ domain orchestrator
→ page/domain importer
→ local module importer
→ leaf file
→ backend interface contract
→ server-side runtime
```

Frontend files may call approved backend interfaces only. They must not simulate secure runtime behavior with local browser logic.

## XV. Operational Enforcement

This doctrine is an active enforcement reference for future website execution. Agents must use it before performing structural work and must treat any deviation from this importer and ownership architecture as a defect requiring correction.

Any future architecture change must be documented as an approved migration, not applied as an isolated file move or local workaround.

## Change Log

- 2026-05-02 — v1.1 Added Developer Mode runtime boundary doctrine to preserve frontend/backend separation, prohibit frontend secrets, and require server-side ownership for provider, GitHub, sandbox, egress, patch, commit, and pull request execution. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Website Systems & Development Agent (WSDA). Agent ID: A-0205-0022. Execution Date: 2026-05-02. Execution Context: Developer Mode architecture documentation and website modular doctrine update.
- 2026-05-02 — v1.0 Website modular architecture doctrine established and normalized. Doctrine created to preserve CSS, JavaScript, fragment, page, system, profile, collections, publication, and importer architecture after major modular cleanup. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Website Systems & Development Agent (WSDA). Agent ID: A-0205-0022. Execution Date: 2026-05-02. Execution Context: Website modular architecture documentation and global metadata normalization.

---

## Document Control & Validation

GSA PROTOCOL STATUS: Pending Founder Validation  
GSA APPROVAL: false  
DOCUMENT STATUS: Active — Architecture Doctrine  
VISIBILITY: Internal  
PUBLISH TO WEBSITE: No  
VERSION: 1.1

---

END OF DOCUMENT
