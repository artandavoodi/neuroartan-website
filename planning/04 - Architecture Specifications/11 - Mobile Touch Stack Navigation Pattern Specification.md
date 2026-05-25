---
type: Specification
subtype: "Mobile Interaction Pattern"

title: "Mobile Touch Stack Navigation Pattern Specification"
document_id: "WEB-ARCH-SPEC-2026-0011"
classification: "Internal"
authority_level: "Website Architecture"
department: "Infrastructure"
office: "Website Systems & Development"
owner: "Website Systems & Development Agent"
stakeholders:
  - "Founder"
  - "Website Systems & Development Agent"
  - "Design Execution Agent"
legal_sensitive: false
requires_gc_review: false
requires_creo_review: false
approval_status: "Draft"
gsa_protocol: false
gsa_approved: false
status: "Active"
lifecycle: "Reusable Pattern"
system: "Neuroartan Website"
spine_version: "1.0"
template_lock: true
version: "1.0.0"
created_date: "2026-05-25"
last_updated: "2026-05-25"
last_reviewed: "2026-05-25"
review_cycle: "Quarterly"
effective_date: "2026-05-25"
publish: false
publish_to_website: false
featured: false
visibility: "Internal"
institutional_visibility: "Internal"
scope:
  - "Mobile Navigation"
  - "Touch Interaction"
  - "Website Architecture"
index_targets:
  - "Website Architecture Specifications"
  - "Mobile Interaction Patterns"
vault_path: "/Users/artan/Documents/Neuroartan/website/planning/04 - Architecture Specifications/11 - Mobile Touch Stack Navigation Pattern Specification.md"
related:
  - "docs/assets/js/layers/website/home/platform-menu/home-platform-shell.js"
  - "docs/assets/css/layers/website/home/platform-menu/home-platform-shell.css"
  - "docs/assets/fragments/layers/website/home/platform-menu/home-platform-shell.html"
tags:
  - "website"
  - "mobile"
  - "navigation"
  - "touch-guard"
  - "interaction-pattern"
---

# Mobile Touch Stack Navigation Pattern Specification

---

## I. Purpose

This document defines the reusable mobile touch-stack navigation pattern created for the Neuroartan website.

The pattern exists to make complex mobile web navigation behave like a native mobile application: one visible level at a time, one intentional touch at a time, no touch-through activation, and no accidental multi-level navigation.

---

## II. Problem

On mobile browsers, a tap can trigger a visible layer change while the same touch cycle is still completing.

If the next layer appears under the same finger position, the browser can activate the newly revealed item immediately.

This creates touch-through behavior.

Example sequence:

1. The user taps `Settings`.
2. The settings subnavigation appears.
3. A subnavigation item such as `Privacy` appears under the same finger coordinate.
4. The same touch cycle activates it unintentionally.

This is unacceptable for native-feeling mobile web navigation.

---

## III. Production Principle

A mobile navigation action must advance only one level per touch.

The newly revealed layer must not receive pointer interaction until the first touch cycle is complete.

The system must not rely on spacing, z-index tricks, animation delay, invisible overlays, or layout hacks to prevent accidental activation.

The correct solution is state-based navigation plus a short touch-cycle lock.

---

## IV. Architecture

The pattern uses three coordinated layers.

### 1. State Layer

The runtime tracks the active mobile navigation level.

Canonical levels:

```text
root
subnav
content
```

### 2. DOM State Attribute

The runtime writes the current level to the shell root.

Example:

```html
data-home-platform-mobile-level="root"
data-home-platform-mobile-level="subnav"
data-home-platform-mobile-level="content"
```

### 3. Touch Guard

The runtime temporarily locks interaction after a level change.

It adds:

```html
data-home-platform-touch-locked
```

It removes that attribute after a short controlled delay.

---

## V. Interaction Model

### Root Level

The user sees the main navigation list.

Selecting a main item advances to the subnavigation level.

### Subnavigation Level

The user sees only the selected section’s subnavigation.

Selecting a subnavigation item advances to the content level.

### Content Level

The user sees only the selected destination content.

The back button returns to the previous level.

---

## VI. Touch Guard Rule

When the mobile stack level changes, the shell enters a short locked state.

During this state, the visible stack layers temporarily reject pointer interaction:

```css
.home-platform-shell[data-home-platform-touch-locked] .home-platform-shell__rail,
.home-platform-shell[data-home-platform-touch-locked] .home-platform-shell__subrail,
.home-platform-shell[data-home-platform-touch-locked] .home-platform-shell__content{
  pointer-events:none;
}
```

This prevents the newly revealed level from receiving the same touch.

---

## VII. JavaScript Pattern

The shell state should include:

```js
mobileStackLevel: 'root',
mobileTouchLockTimer: null
```

The mobile media query defines the mobile-only scope:

```js
const HOME_PLATFORM_MOBILE_QUERY = window.matchMedia('(max-width: 760px)');
const HOME_PLATFORM_MOBILE_TOUCH_LOCK_MS = 180;
```

When the stack level changes, the runtime should:

1. Compare the previous level with the next level.
2. Update `mobileStackLevel`.
3. Write the new level to the shell root.
4. Lock touch interaction if the level changed.
5. Unlock interaction after the guard duration.

---

## VIII. Required Helper Functions

The reusable pattern requires the following helper categories:

```js
normalizeMobileStackLevel(level)
syncMobileStackLevel(level)
setMobileStackLevel(level)
resetMobileStackLevel()
advanceMobileStackLevel(level)
navigateMobileBack()
setMobileTouchLock(isLocked)
clearMobileTouchLock()
lockMobileTouchCycle()
isMobileTouchLocked()
```

These helpers should remain local to the owning runtime unless the pattern is promoted into a shared website utility layer.

---

## IX. CSS Pattern

The mobile shell should show one stack level at a time:

```css
.shell[data-mobile-level="root"] .shell__rail,
.shell[data-mobile-level="subnav"] .shell__subrail,
.shell[data-mobile-level="content"] .shell__content{
  opacity:1;
  visibility:visible;
  pointer-events:auto;
}
```

Inactive levels should remain unavailable:

```css
.shell__rail,
.shell__subrail,
.shell__content{
  opacity:0;
  visibility:hidden;
  pointer-events:none;
}
```

The touch lock temporarily disables interaction across visible stack layers after transitions.

---

## X. Back Button Rule

The mobile back button should be visible only when the active level is not `root`.

It should be hidden on desktop and tablet unless the mobile stack pattern is explicitly active.

Back behavior:

```text
content → subnav
subnav → root
root → no action
```

---

## XI. Implementation Reference

Current implementation reference:

```text
docs/assets/js/layers/website/home/platform-menu/home-platform-shell.js
docs/assets/css/layers/website/home/platform-menu/home-platform-shell.css
docs/assets/fragments/layers/website/home/platform-menu/home-platform-shell.html
```

---

## XII. Reuse Guidance

Use this pattern for any mobile web interface where:

- navigation has multiple levels,
- the next level appears under the user’s finger,
- accidental touch-through is possible,
- the intended experience is native-app-like,
- only one navigation action should occur per touch.

Do not solve this with spacing, z-index, animation delay, or invisible overlays.

The correct solution is state-based navigation plus a short touch-cycle lock.

---

## XIII. Production Standard

A compliant implementation must satisfy:

- mobile-only behavior unless explicitly scoped wider,
- one visible stack level at a time,
- one navigation advance per touch,
- no touch-through activation,
- no desktop behavior change,
- no duplicate navigation systems,
- no overlay hacks,
- no layout-based workaround,
- reusable state and attribute pattern,
- theme-aware controls,
- clear back-navigation behavior.

---

## XIV. Current Status

Implemented as an achieved production pattern in the Home Platform Shell mobile menu.

Status: Active reusable website interaction pattern.

---

## Change Log

| Version | Date | Change | Owner |
|---|---|---|---|
| 1.0.0 | 2026-05-25 | Created reusable mobile touch-stack navigation pattern specification. | Website Systems & Development Agent |

---

## Document Control & Validation

This document records an achieved website interaction pattern and may be reused as a production reference for future mobile navigation systems.

Validation status: Active implementation reference.

---

END OF DOCUMENT