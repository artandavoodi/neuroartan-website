# WEBSITE WORKSPACE RULES

## Scope
Applies only to `/website` repository.

---

## Ownership & Boundaries
- Do not override global systems (menu, footer, country overlay, tokens).
- Preserve homepage baseline behavior; remove conflicting local overrides.
- Fix from canonical source only (no overlays).

---

## Structure Discipline
- Respect file ownership (CSS/JS/HTML separation).
- No duplicate styles across files.
- Keep header comments and sectioning intact.

---

## Editing Rules
- Scan before edit.
- Edit only the targeted file.
- One change per step.
- Maintain identical spacing, tokens, and values when asked for “same”.

---

## Rendering Rules
- Use existing shells/templates.
- Do not hardcode content that should come from Vault sync.
- Preserve RTL/LTR exceptions for global chrome.

---

## Verification
- Provide a test/verification step for each change.
- If unverified, state it explicitly.

---

## Forbidden
- No overlay fixes
- No guessing paths or owners
- No multi-file edits without confirmation
- No breaking global systems

---

## Output Mode
- Action only
- Next step only
- Exact file path or command