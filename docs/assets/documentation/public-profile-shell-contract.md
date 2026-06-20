# Public Profile Shell Contract

## Purpose

The public profile is an owner-approved social surface. It reuses the platform Profile shell and must never create a separate navigation, rail, tab, or responsive system.

## Composition

`profile-public-shell` mounts one shared Profile workspace:

1. `profile-private-sidebar`
2. `profile-public-workspace`
3. `profile-private-right-toolbar`
4. `sidebar-icon-overlay` for phone and tablet rail visibility

The public header is mounted inside `profile-public-workspace`, before the sticky tab mount. It belongs to the central scroll stream and is not a fixed, card-like shell layer. It is visible only on Posts; Model and Highlights own their own content surfaces.

## Registered Public Tabs

The shared renderer in `profile-private-hero.js` owns the tabs. Public profile tabs are registered in `PROFILE_CONTEXT_TAB_GROUPS.publicProfile`:

| Tab | Navigation section | Registered panel |
| --- | --- | --- |
| Posts | `posts` | `profile-public-posts` |
| Model | `model-management` | `profile-public-model` |
| Highlights | `highlights` | `profile-public-highlights` |

Do not hardcode public tab buttons or bind a second tab event handler. The shared renderer creates the buttons and the shared workspace binding calls the profile navigation store.

## Public Data Boundary

- Posts are rendered through the existing feed renderer, filtered by the viewed profile's canonical profile id or username.
- Model is limited to public development and interaction state. It must not mount `model-management`, preference controls, source data, memory, or other owner-private model surfaces.
- Highlights are owner-selected public material. Until a highlights data source is available, the registered panel may show only its empty state.
- The public right toolbar renders no owner actions. The rail itself remains mounted so the shared desktop and mobile shell stays structurally identical.

## Visual Baseline

- Public headers are plain profile content, never generic cards.
- Do not add card borders, card radii, generic hover surfaces, masks, or compensating wrappers unless an explicit product requirement calls for them.
- The tab band uses the same shared tab classes and tokens as Profile, Feed, and Model, spans the full central workspace boundary, and is sticky inside the content stream.
- Sidebars, toolbars, and phone/tablet sidebar switches come from the shared owners. Do not create public-specific replacements.
- List separators appear only between adjacent content items. Never render a separator before the first item or after the last item.

## Required Owners

- Public shell: `docs/assets/fragments/layers/website/profile/public/profile-shell.html`
- Public workspace: `docs/assets/fragments/layers/website/profile/public/workspace/profile-workspace.html`
- Public state bridge: `docs/assets/js/layers/website/profile/public/sections/profile-sections.js`
- Shared tabs: `docs/assets/js/layers/website/profile/private/hero/profile-private-hero.js`
- Shared layout: `docs/assets/css/layers/website/profile/private/workspace/profile-workspace.css`
- Fragment registry: `docs/assets/js/core/01-foundation/fragment-authorities.js` and `docs/assets/js/core/03-runtime/global-layout-injection.js`

## Extension Rule

To add a public profile panel, create a registered fragment in `profile/public`, add it to both fragment registries, register one tab in the shared public tab group, and bind only public-safe runtime data in `profile-sections.js`. Do not modify private panel ownership or duplicate shared shell behavior.
