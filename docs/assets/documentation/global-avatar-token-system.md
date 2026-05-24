# Global Avatar Token System Documentation

## Overview

This document describes the global avatar token system, its implementation, principles, and governance rules for the Neuroartan website.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Token Definitions](#token-definitions)
3. [Implementation](#implementation)
4. [Principles and Rules](#principles-and-rules)
5. [Achievements](#achievements)
6. [Remaining Work](#remaining-work)

---

## System Architecture

### Canonical Token Location

All avatar tokens are defined in the canonical token system:
- **Primary Definition**: `/docs/assets/css/core/01-tokens/control.tokens.css`
- **Control Center Registration**: `/docs/assets/css/core/01-tokens/control-center-completion.tokens.css`

### Token Hierarchy

```
control.tokens.css (canonical source)
    ↓
control-center-completion.tokens.css (registration)
    ↓
profile-private-hero.css (consumption)
    ↓
personalization/index.css (application)
```

---

## Token Definitions

### Avatar Container Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--avatar-size` | `var(--spacing-3xl)` | Width and height of avatar container |
| `--avatar-bg` | `var(--color-primary1)` | Background color for empty avatar |
| `--avatar-border` | `var(--border-color)` | Border color |
| `--avatar-border-width` | `var(--border-width-hairline)` | Border thickness |
| `--avatar-radius` | `var(--radius-pill)` | Border radius (pill shape) |
| `--avatar-layer` | `var(--z-raised)` | Z-index layer |

### Media Action Button Tokens

| Token | Value | Purpose |
|-------|-------|---------|
| `--avatar-media-action-size` | `var(--spacing-lg)` | Width and height of media action button |
| `--avatar-media-action-bg` | `var(--control-surface)` | Background color |
| `--avatar-media-action-bg-hover` | `var(--panel-surface-solid-unified)` | Background color on hover |
| `--avatar-media-action-border` | `var(--control-border-unified)` | Border color |
| `--avatar-media-action-border-hover` | `var(--control-border-hover-unified)` | Border color on hover |
| `--avatar-media-action-radius` | `var(--radius-pill)` | Border radius |
| `--avatar-media-action-layer` | `var(--z-above)` | Z-index layer |
| `--avatar-media-action-position-right` | `0` | Right positioning offset |
| `--avatar-media-action-position-bottom` | `0` | Bottom positioning offset |

### Control Center Registration

All avatar tokens are registered in the control center with the `--cc-` prefix:

```css
--cc-avatar-size:var(--avatar-size);
--cc-avatar-bg:var(--avatar-bg);
--cc-avatar-border:var(--avatar-border);
--cc-avatar-border-width:var(--avatar-border-width);
--cc-avatar-radius:var(--avatar-radius);
--cc-avatar-layer:var(--avatar-layer);
--cc-avatar-media-action-size:var(--avatar-media-action-size);
--cc-avatar-media-action-bg:var(--avatar-media-action-bg);
--cc-avatar-media-action-bg-hover:var(--avatar-media-action-bg-hover);
--cc-avatar-media-action-border:var(--avatar-media-action-border);
--cc-avatar-media-action-border-hover:var(--avatar-media-action-border-hover);
--cc-avatar-media-action-radius:var(--avatar-media-action-radius);
--cc-avatar-media-action-layer:var(--avatar-media-action-layer);
--cc-avatar-media-action-position-right:var(--avatar-media-action-position-right);
--cc-avatar-media-action-position-bottom:var(--avatar-media-action-position-bottom);
```

---

## Implementation

### HTML Structure

The avatar uses the following HTML structure:

```html
<div class="profile-private-hero__avatar-wrap">
  <div class="profile-private-hero__avatar" data-home-platform-avatar aria-hidden="true">
    <img class="profile-private-hero__avatar-image" data-home-platform-avatar-image alt="" aria-hidden="true">
  </div>
  <button class="profile-private-hero__media-action profile-private-hero__media-action--avatar" type="button" data-home-platform-action="change-avatar" aria-label="Change assistant avatar">
    <img class="ui-icon-theme-aware" src="/registry/icons/public/assets/core/media/camera/camera.svg" alt="" aria-hidden="true">
  </button>
  <input class="sr-only" type="file" name="assistant_avatar" accept="image/*" data-home-platform-avatar-input>
</div>
```

### CSS Implementation

#### Avatar Container (profile-private-hero.css)

```css
.profile-private-hero__avatar-wrap{
  position:relative;
  z-index:var(--profile-private-hero-avatar-layer);
  width:var(--profile-private-hero-avatar-size);
  height:var(--profile-private-hero-avatar-size);
  flex:0 0 auto;
  transform-origin:left top;
}

.profile-private-hero__avatar{
  position:relative;
  display:grid;
  place-items:center;
  width:100%;
  height:100%;
  border-radius:var(--control-radius-pill);
  border:var(--border-width-hairline) solid var(--border-color);
  color:var(--text-primary-color);
  overflow:hidden;
  box-sizing:border-box;
  line-height:var(--line-height-ui);
  isolation:isolate;
}
```

#### Media Action Button (profile-private-hero.css)

```css
.profile-private-hero__media-action{
  appearance:none;
  -webkit-appearance:none;
  display:flex;
  align-items:center;
  justify-content:center;
  width:var(--avatar-media-action-size);
  height:var(--avatar-media-action-size);
  padding:0;
  border:1px solid var(--avatar-media-action-border);
  border-radius:var(--avatar-media-action-radius);
  background:var(--avatar-media-action-bg);
  color:var(--text-primary-color);
  line-height:var(--spacing-none);
  cursor:pointer;
  opacity:var(--state-opacity-muted);
  box-sizing:border-box;
  pointer-events:auto;
  transform:none;
  transition:
    opacity var(--interaction-transition-control) var(--interaction-ease-standard),
    color var(--interaction-transition-control) var(--interaction-ease-standard),
    border-color var(--interaction-transition-control) var(--interaction-ease-standard),
    background-color var(--interaction-transition-control) var(--interaction-ease-standard);
}

.profile-private-hero__media-action:hover,
.profile-private-hero__media-action:focus-visible{
  border-color:var(--avatar-media-action-border-hover);
  background:var(--avatar-media-action-bg-hover);
  color:var(--text-primary-color);
  opacity:var(--state-opacity-full);
  outline:none;
  transform:none;
}

.profile-private-hero__media-action--avatar{
  position:absolute;
  right:var(--avatar-media-action-position-right);
  bottom:var(--avatar-media-action-position-bottom);
  z-index:var(--avatar-media-action-layer);
}
```

### Personalization Custom Override

In the personalization settings, a custom background color is applied to the empty avatar:

```css
.profile-private-hero__avatar {
  background: var(--color-primary1);
}
```

This is the only custom override allowed in the personalization context to provide a fallback color for the empty avatar.

---

## Principles and Rules

### Permanent Rule: No Custom CSS, Hacks, or Overrides

**MANDATORY**: Never create custom CSS, hacks, overrides, or workarounds. Everything must use global tokens only.

#### Requirements

- Always use global tokens from the canonical token system (`docs/assets/css/core/01-tokens/`)
- Register tokens in `control-center-completion.tokens.css` for use across the platform
- Never add custom CSS overrides in page-specific files
- Never create hard-coded values
- Never add workarounds or compensating layers
- Never fight correct global behavior with page-specific overrides
- Fix from canonical source only
- If a fix requires custom CSS, the fix is wrong - find the correct global token or create one in the core token system
- This rule applies to all website work - no exceptions

### Token Creation Process

1. **Define in Canonical Source**: Add token to `control.tokens.css`
2. **Register in Control Center**: Add corresponding `--cc-*` token to `control-center-completion.tokens.css`
3. **Consume in Components**: Use the token in component CSS files
4. **No Local Overrides**: Never override with local custom CSS

### Theme Awareness

All avatar tokens are theme-aware through their dependencies:
- Colors use theme-aware tokens (e.g., `--border-color`, `--control-surface`)
- Spacing uses global spacing tokens (e.g., `--spacing-lg`, `--spacing-3xl`)
- Borders use global border tokens (e.g., `--border-width-hairline`)
- Z-index uses global layer tokens (e.g., `--z-raised`, `--z-above`)

---

## Achievements

### Completed Work

1. **Global Token System Established**
   - All avatar tokens defined in `control.tokens.css`
   - All tokens registered in `control-center-completion.tokens.css`
   - Theme-aware implementation using global dependencies

2. **Avatar Implementation**
   - Avatar container with global size, background, border, radius, and layer tokens
   - Media action button with global size, background, border, radius, and positioning tokens
   - Hover states using global interaction tokens
   - Theme-aware opacity and transitions

3. **Profile Private Hero Integration**
   - Updated `profile-private-hero.css` to use global avatar tokens
   - Removed profile-private-hero specific tokens in favor of global tokens
   - Media action button now uses global tokens for all properties

4. **Personalization Settings**
   - Avatar in personalization settings uses profile-private-hero structure
   - Single custom override for primary color background (allowed exception)
   - All other styling uses global tokens

5. **Token Synchronization**
   - All avatar tokens are registered in control center
   - Tokens are available across the platform via `--cc-*` prefix
   - No orphan tokens or unregistered values

---

## Remaining Work

### Documentation

- [ ] Create visual documentation showing avatar states (empty, with image, hover states)
- [ ] Document avatar usage patterns across different contexts
- [ ] Create token migration guide for other components

### Token Expansion

- [ ] Consider adding avatar size variants (sm, md, lg, xl)
- [ ] Consider adding avatar shape variants (circle, square, rounded)
- [ ] Consider adding avatar status tokens (online, offline, busy)

### Component Integration

- [ ] Audit other avatar implementations across the website
- [ ] Migrate any remaining custom avatar CSS to global tokens
- [ ] Ensure all avatar instances use the global token system

### Testing

- [ ] Test avatar across all supported browsers
- [ ] Test avatar in different theme contexts (light, dark)
- [ ] Test avatar with different image aspect ratios
- [ ] Test media action button accessibility

---

## Version History

- **v1.0.0** (2026-05-24): Initial global avatar token system established
