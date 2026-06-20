# Icon Governance

Prevents duplicate icon copy artifacts across `/Users/artan/Documents/Neuroartan`.

Forbidden SVG artifacts:
- `name 2.svg`
- `name (2).svg`
- `name copy.svg`
- `name-copy.svg`

Repair:
`node tools/icon-governance/repair-icon-duplicates.mjs`

Guard:
`node tools/icon-governance/guard-icons.mjs`

Policy:
Identical duplicate copy artifacts are deleted directly. No `.icon-quarantine` folder is created.
