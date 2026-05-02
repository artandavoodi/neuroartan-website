---
type: Architecture
subtype: "Design Doctrine"

title: "Control Center Grouped Settings Surface Design Doctrine"
document_id: "WEB-ARCH-DOC-2026-0009-ACT"

classification: Internal
authority_level: Departmental
department: "Website"
office: "Planning / 04 - Architecture Specifications"
owner: "Founder / CEO (Public: ARTAN)"

stakeholders:
  - "Founder / CEO (Public: ARTAN)"
  - "Website Systems & Development Agent (WSDA)"
  - "Design Execution Agent (DXA)"
  - "Debugging & Systems Integrity Agent (DSIA)"
  - "Software Applications Development Agent (SADA)"
  - "Codex / Local Implementation Agents"

legal_sensitive: false
requires_gc_review: false
requires_creo_review: true
approval_status: Approved

gsa_protocol: "Pending Website Propagation"
gsa_approved: false

status: Active
lifecycle: Architecture Locked
system: "Website-Governed"

spine_version: "1.4"
template_lock: "Global-Metadata-Standard-v1.6"
version: "1.0.0"

created_date: "2026-05-03"
last_updated: "2026-05-03"
last_reviewed: "2026-05-03"
review_cycle: "As Needed"

effective_date: "2026-05-03"

publish: false
publish_to_website: false
featured: false
visibility: Internal
institutional_visibility: Departmental

scope:
  - "Control Center Grouped Settings Surface Design System"
  - "Stage Section Reference Implementation"
  - "Apple-Style Grouped Settings Surface Pattern"
  - "Radio List and Toggle Control Ownership"
  - "Interaction Settings Typography and Spacing Tokens"
  - "Website Menu and Settings Surface Propagation"

index_targets:
  - "Website Planning Index"
  - "Architecture Specifications Index"
  - "Implementation Change Log"

vault_path: "planning/04 - Architecture Specifications/09 - Control Center Grouped Settings Surface Design Doctrine.md"

related:
  - "planning/04 - Architecture Specifications/02 - Website Modular Architecture Doctrine.md"
  - "planning/08 - Implementation Change Logs/01 - AI Development Cockpit Implementation Change Log.md"
  - "docs/assets/fragments/layers/website/home/interaction-settings/sections/stage.html"
  - "docs/assets/css/layers/website/home/interaction-settings/interaction-settings-shell.css"
  - "docs/assets/css/core/03-primitives/radio-list.css"
  - "docs/assets/js/core/01-foundation/radio-list.js"
  - "docs/assets/js/layers/website/home/interaction-settings/sections/stage.js"

tags:
  - "website"
  - "control-center"
  - "design-doctrine"
  - "grouped-settings"
  - "stage"
  - "radio-list"
---

## I. Purpose

This doctrine defines the approved grouped settings surface system for the Neuroartan Control Center.

It records the confirmed Stage section as the canonical implementation model for all current and future Control Center sections, menu settings, and comparable grouped configuration interfaces across the website.

This document exists so implementation agents can reproduce the approved structure without reinterpretation, approximation, duplicated ownership, cursor overrides, or visual drift.

---

## II. Approved Source Reference

Canonical approved implementation reference:

```text
/Users/artan/Documents/Neuroartan/website/docs/assets/fragments/layers/website/home/interaction-settings/sections/stage.html
```

Canonical Control Center shell style owner:

```text
/Users/artan/Documents/Neuroartan/website/docs/assets/css/layers/website/home/interaction-settings/interaction-settings-shell.css
```

Canonical reusable radio-list primitive:

```text
/Users/artan/Documents/Neuroartan/website/docs/assets/css/core/03-primitives/radio-list.css
```

Canonical reusable radio-list behavior owner:

```text
/Users/artan/Documents/Neuroartan/website/docs/assets/js/core/01-foundation/radio-list.js
```

Canonical Stage behavior owner:

```text
/Users/artan/Documents/Neuroartan/website/docs/assets/js/layers/website/home/interaction-settings/sections/stage.js
```

---

## III. Design Principle

The approved system follows an Apple-style grouped settings surface model.

Each functional category appears as a titled group with a rounded surface beneath it. Rows live inside the grouped surface. Separators appear only between rows. Individual rows do not use independent card borders, heavy hover effects, active shadows, or decorative state overlays.

The interface must remain quiet, direct, and operational.

---

## IV. Required Group Structure

Every section using this doctrine must follow this hierarchy:

```text
Section Header
Group Title
Grouped Surface
Row
Row Separator
Row
```

The approved Stage structure is:

```text
Stage
Mode
Visibility
Motion
Density
Contrast
Background Depth
```

Each group must represent one clear functional category.

If one category contains two different control types, the controls may appear as subgroups inside that category only when they remain visually separated by the approved subgroup spacing token.

---

## V. Control Type Rules

### A. Radio List

Radio lists are used only when options are mutually exclusive inside one clear group.

Examples:

```text
Mode: Standard / Developer Focus / Minimal / Presentation
Motion intensity: Full / Reduced / Minimal
Density: Comfortable / Compact
Contrast: Standard / Soft / High
Background Depth: Cinematic / Clean / Flat
```

Only one radio item may be active per radio group.

### B. Toggle

Toggles are used only for independent on/off controls.

Examples:

```text
Interactive circle
Footer visibility
Ambient layer
Idle animation
Visual feedback
```

Toggles must not be represented as radio lists.

### C. Static Rows

Static rows must not be used for controls that appear selectable unless there is a real operational selection mechanism.

The prior Stage contrast and Background Depth static rows were rejected because they appeared selectable while exposing no alternative choices.

---

## VI. Interaction Ownership Rule

Only the actual control may own interaction.

For radio lists, the radio control button owns the setting attribute and interaction.

For toggles, the toggle button owns the setting attribute and interaction.

Text, descriptions, row surfaces, empty row areas, and grouped surfaces must not own setting attributes or trigger state changes.

Approved ownership pattern:

```text
Row = visual container
Text = non-interactive content
Description = non-interactive content
Radio button = interactive owner
Toggle button = interactive owner
```

No cursor overrides are permitted to simulate interactivity or non-interactivity.

Cursor behavior must emerge from correct HTML ownership, not CSS cursor manipulation.

---

## VII. Cursor Rule

Do not add cursor override rules to solve interaction ownership.

Forbidden as a fix strategy:

```css
cursor:pointer;
cursor:default;
```

The correct fix is structural:

```text
Use non-interactive row containers
Use real button elements only for the radio control and toggle switch
Place data-home-interaction-setting only on the actual interactive control
```

---

## VIII. Text and Description Rule

Labels and descriptions share one Control Center text ownership layer.

Radio-list text and toggle text must consume the same Control Center typography tokens.

The radio-list primitive must not independently own Control Center typography.

Control Center typography ownership belongs in:

```text
interaction-settings-shell.css
```

The reusable primitive may provide structure, but local product typography must be inherited from the shell owner.

---

## IX. Text Layout Rule

The approved row text pattern is inline label plus description.

Approved visual rhythm:

```text
Label    Description
```

The description must not stack below the label unless a responsive breakpoint explicitly requires it.

The approved spacing token between label and description is:

```css
--home-interaction-settings-control-text-description-gap:var(--spacing-md);
```

---

## X. Period Rule

Control Center descriptions and Stage row descriptions do not end with periods.

Approved:

```text
Balanced depth and feedback for normal use
```

Rejected:

```text
Balanced depth and feedback for normal use.
```

This applies to tab descriptions, row descriptions, and concise platform-facing settings language.

---

## XI. Group Surface Tokens

The grouped settings surface is owned by the Control Center shell.

Approved token layer:

```css
--home-interaction-settings-control-group-gap:var(--spacing-none);
--home-interaction-settings-control-group-padding-top:var(--spacing-xl);
--home-interaction-settings-control-group-title-margin-bottom:var(--spacing-sm);
--home-interaction-settings-control-group-surface-bg:var(--home-interaction-settings-panel-control-bg);
--home-interaction-settings-control-group-surface-border:var(--home-interaction-settings-panel-header-separator);
--home-interaction-settings-control-group-surface-radius:var(--home-interaction-settings-panel-control-radius);
--home-interaction-settings-control-group-row-padding-y:var(--spacing-sm);
--home-interaction-settings-control-group-row-padding-x:var(--spacing-md);
--home-interaction-settings-control-group-row-separator:var(--home-interaction-settings-panel-header-separator);
--home-interaction-settings-control-subgroup-gap:var(--spacing-sm);
```

Group spacing must use these tokens or their canonical successors.

Hardcoded spacing is not permitted.

---

## XII. Section Header Tokens

The approved Stage section header contains an icon and title.

The icon/title header is separated from the content by a thin separator line.

Approved section-level tokens include:

```css
--home-interaction-settings-section-gap:var(--spacing-xl);
--home-interaction-settings-section-padding-bottom:var(--spacing-xl);
--home-interaction-settings-section-icon-size:var(--layout-interaction-settings-section-icon-size-large, calc(var(--home-interaction-settings-panel-icon-size) * 1.75));
--home-interaction-settings-section-icon-gap:var(--home-interaction-settings-panel-nav-item-gap);
--home-interaction-settings-section-header-padding-top:var(--spacing-none);
--home-interaction-settings-section-header-padding-bottom:var(--home-interaction-settings-panel-inner-padding-top);
--home-interaction-settings-section-header-separator:var(--home-interaction-settings-panel-header-separator);
--home-interaction-settings-section-title-color-prominent:var(--home-interaction-settings-panel-nav-hover-color);
```

The header must appear visually centered between its surrounding spatial boundaries.

Symmetrical means same value logic on the relevant sides unless an explicit exception is approved.

---

## XIII. Separator Rule

Separators appear in three approved places only:

```text
Between section header and content
Between rows inside a grouped surface
Between major shell regions such as sidebar and content
```

Separators must not be used as decorative dividers between every micro-element.

Separators must use theme-aware existing separator tokens.

---

## XIV. Reusable Radio List Primitive

The radio-list primitive exists as a global reusable primitive.

CSS owner:

```text
/Users/artan/Documents/Neuroartan/website/docs/assets/css/core/03-primitives/radio-list.css
```

JavaScript owner:

```text
/Users/artan/Documents/Neuroartan/website/docs/assets/js/core/01-foundation/radio-list.js
```

The primitive must provide:

```text
single-select behavior
right-side radio control placement
radio state synchronization
keyboard support on the actual radio control
reusable structure for future settings surfaces
```

The primitive must not own Control Center-specific typography, shell spacing, or section semantics.

---

## XV. Stage Behavior Ownership

Stage setting behavior is owned by:

```text
/Users/artan/Documents/Neuroartan/website/docs/assets/js/layers/website/home/interaction-settings/sections/stage.js
```

Stage behavior must bind to the actual interactive controls only.

Rows must not be treated as controls.

The body-state attributes remain the operational output layer for visual Stage behavior.

---

## XVI. Rejected Patterns

The following patterns are rejected:

```text
Full-row buttons for radio rows
Full-row buttons for toggle rows
Cursor overrides to simulate clickable or non-clickable areas
Hover overlays on rows
Active shadows on setting rows
Independent card borders on each item
Static rows that look selectable but expose no choices
Duplicated typography ownership between primitive and shell
Descriptions appearing and disappearing on hover
Multiple unrelated radio groups inside one visual group without clear group titles
Hardcoded spacing or one-off visual compensation
```

---

## XVII. Required Implementation Pattern for New Sections

When implementing a new Control Center section, agents must follow this sequence:

```text
1. Define clear groups
2. Determine whether each control is radio or toggle
3. Use grouped settings surface wrappers
4. Use row separators only inside grouped surfaces
5. Use right-side controls
6. Keep text and descriptions non-interactive
7. Apply no cursor overrides
8. Remove periods from concise UI descriptions
9. Reuse Control Center shell tokens
10. Verify one active radio item per radio group
```

---

## XVIII. Propagation Requirement

This doctrine must be applied to all future Control Center sections and comparable menu settings surfaces.

The Stage section is the approved reference implementation.

Other sections must not be restyled independently if they are intended to follow this system.

Changes to this system must be made at the shared token or primitive level first, then propagated through compliant section markup.

---

## XIX. Current Approval State

The grouped settings surface system is approved for the Stage section.

Approved elements include:

```text
Stage header with icon
Apple-style grouped surfaces
Group titles
Rounded group containers
Thin row separators
Right-side radio and toggle controls
Inline label and description text
No terminal periods in UI descriptions
Root interaction ownership on actual controls only
Reusable radio-list primitive
Control Center shell text ownership
```

---

## Change Log

- 2026-05-03 — v1.0.0 Initial doctrine created and normalized. Established the Stage section as the canonical grouped settings surface reference for Control Center, menu settings, and comparable website configuration interfaces. Bound the approved grouped surface model, radio-list primitive, toggle ownership, typography ownership, spacing tokens, separator rules, period rule, interaction ownership rule, and no-cursor-override rule into a reusable architecture specification. Operator Name: Artan. Operator Personnel ID: CEO-001-01-01. Agent Name: Website Systems & Development Agent (WSDA). Agent ID: A-0205-0022. Execution Date: 2026-05-03. Execution Context: Control Center Stage section design finalization and global website design-system doctrine creation.

---

## Document Control & Validation

GSA PROTOCOL STATUS: Pending Website Propagation  
GSA APPROVAL: false  
DOCUMENT STATUS: Active — Architecture Locked  
VISIBILITY: Internal  
PUBLISH TO WEBSITE: No  
VERSION: 1.0.0

---

END OF DOCUMENT