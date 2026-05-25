# Global Layout Rail Baseline Specification

## Document Identity

- Document ID: NA-WEB-ARCH-012
- Owner layer: Website CSS core layout tokens
- Canonical token file: `docs/assets/css/core/01-tokens/layout.tokens.css`
- Status: Active baseline

## Purpose

This specification defines the required global rail, gutter, and inline spacing baseline for Neuroartan website layouts. All page shells, navigation rails, institutional menus, overlays, profile shells, footer rails, and mobile stack surfaces must consume these tokens instead of hardcoded local spacing.

## Baseline Tokens

Desktop and normal view:

- Left and right page edge gutter: `var(--site-shell-inline-padding)`
- Desktop rail width: `var(--site-rail-width)`
- Chrome rail width: `var(--chrome-rail-width)`
- Footer rail width: `var(--footer-rail-width)`
- Menu rail width: `var(--menu-rail-width)`

Mobile view:

- Left and right page edge gutter: `var(--site-shell-inline-padding-mobile)`
- Mobile rail width: `var(--site-rail-width-mobile)`
- Mobile chrome rail width: `var(--chrome-rail-width-mobile)`
- Mobile footer rail width: `var(--footer-rail-width-mobile)`
- Mobile menu rail width: `var(--menu-rail-width-mobile)`

## Ownership Rules

1. Edge spacing must be owned by global layout tokens.
2. Local files may reference global rail tokens, but must not recreate equivalent gutter math.
3. Components that sit on the page edge must use rail width tokens and `margin-inline:auto`.
4. Full-screen overlays must use the same mobile inline token for mobile padding.
5. Mobile stack systems must separate outer edge inset from inner item padding to avoid double gutters.
6. Text input, select, password, and textarea fields must consume global field primitives unless a component has a documented reason to own a special control.

## Prohibited Patterns

- Hardcoded edge values such as `16px`, `24px`, `3.2rem`, or `1.25rem` in local page files.
- Local `calc(100vw - (...))` gutter math when a rail token exists.
- Page-specific overrides that compensate for a rail mismatch.
- Applying both outer mobile rail padding and inner item padding as the same edge gutter.
- Resizable textareas in production-facing account/profile surfaces.

## Implementation Pattern

Use rail tokens for wrappers:

```css
.surface__rail{
  width:var(--site-rail-width);
  margin-inline:auto;
}

@media (max-width:768px){
  .surface__rail{
    width:var(--site-rail-width-mobile);
  }
}
```

Use mobile edge tokens for overlay padding:

```css
@media (max-width:768px){
  .surface-overlay{
    padding-inline:var(--site-shell-inline-padding-mobile);
  }
}
```

Use account field primitives for profile/account fields:

```css
.surface-field{
  min-height:var(--account-field-height);
  padding-inline:var(--account-field-padding-x);
  border-radius:var(--account-field-radius);
}
```

## Verification Checklist

- Desktop left/right rail spacing resolves from `--site-shell-inline-padding`.
- Mobile left/right rail spacing resolves from `--site-shell-inline-padding-mobile`.
- Institutional menu, institutional links, footer, topbar, profile shell, and public profile shell use rail tokens.
- Mobile overlays do not use desktop `--site-gutter` for edge padding.
- Profile tab content spacing is owned by `profile-workspace.css`.
- Account/profile fields use global field tokens.
- Textareas are not user-resizable unless explicitly documented.
