# Slices — kit-surface-dogfooding

> Stage V of QRSPI. Generated 2026-07-25.
> Vertical slices, not horizontal layers.

## Overview

This change is entirely within kit tooling: Markdown skill/agent/template files
and one Node script (`scripts/lint.mjs`). There is no web-app UI or data store.
The "demoable increment" per slice is `node scripts/lint.mjs` running green with
the new gate active (or a concrete file diff the human can read and verify), plus
at least one human-observable dogfood observation where the changed agent skeleton
causes a live QRSPI session to emit or suppress a gated section.

The four-slice shape mirrors the approved design's preview exactly:
(1) taxonomy + mapping + skeletons, (2) kit stack declaration, (3) denylist rename
+ growth, (4) Check 14 + self-test + README. Slices 1-2 are prerequisites for
slice 4 (Check 14 reads the `## Repo surface` block that slice 2 writes, and
scans artifacts whose headings the taxonomy from slice 1 defines). Slice 3 is
independent of slices 1-2 and can be implemented in any order, but is placed
before slice 4 because Check 14's header comment references the Check 11
constant rename.

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Taxonomy + mapping + skeletons

Add the six kit surfaces to the `repo-surface` skill, wire them into the
questioner and designer agent skeletons and the two templates. At the end of
this slice a future kit questions.md or design.md can legitimately carry a
`## Skill changes` or `## Command changes` section because the skeletons now
emit those headings when the relevant surface is declared present. The slice
does NOT yet declare any surface present for the kit (that is slice 2), so
the human cannot observe a live agent emitting a new section yet — the
demoable end-state is a readable skill diff showing the mapping rows and the
`## Extending the taxonomy` checklist.

- M: no mock stub needed — this slice edits Markdown files only; there is no
  runtime service layer. Pattern: extend an existing mapping table following
  the established row format. (D1, D3)
- F (skill body): add six surface rows to `claude/skills/repo-surface/SKILL.md`
  — section-to-surface mapping entries for `slash-command`, `stage-agent`,
  `skill`, `lint-gate`, `template`, `migration-manifest` — and append the
  `## Extending the taxonomy` checklist (D1, D3)
- F (agent skeletons): add gated section placeholders to
  `claude/agents/questioner.md` and `claude/agents/designer.md` as conditional
  gate comments (not literal headings, to satisfy Check 11) (D3)
- F (templates): add matching gated section placeholders to
  `openspec-templates/questions.template.md` and
  `openspec-templates/design.template.md` (D3, OQ3)
- T (static): `node scripts/lint.mjs` runs green (Check 11 in particular must
  not flag any of the newly added skeleton gate comments as literal headings)
- **Compute:** model=sonnet effort=medium — extends an existing mapping table and
  two skeleton files; the self-collision caveat for `## Template surface` (a
  present heading that is also a denylist entry) requires careful conditional
  phrasing but is otherwise mechanical Markdown authoring
- Checkpoint: read `claude/skills/repo-surface/SKILL.md` and confirm all six
  new surface rows appear with their gated section names listed, and the
  `## Extending the taxonomy` section is present. Run `node scripts/lint.mjs`
  and confirm it exits 0. (human) Optionally launch `claude --plugin-dir
  /workspaces/git/qrspi` and run `/qrspi:questions` on a toy kit change that
  touches a `skill` surface — verify the questioner skeleton does NOT yet
  emit `## Skill surface` (the surface is not declared present until slice 2).

### Slice 2 — Declare kit present surfaces

Rewrite the `qrspi-stack` `## Repo surface` block from `_No present surfaces._`
to list all six kit surfaces. After this slice the kit's own stack-cheatsheet
dogfoods `repo-surface`, and Check 14 (once it exists in slice 4) will have a
parseable present-surface list to read. This slice is a single targeted edit to
one file; it is independently demoable by reading the file and confirming the
block changed.

- M: no mock stub needed — single Markdown file edit; no service layer. (D7)
- F (stack cheatsheet): rewrite the `## Repo surface` block in
  `.claude/skills/qrspi-stack/SKILL.md` to list the six kit surfaces as bullet
  lines: `slash-command`, `stage-agent`, `skill`, `lint-gate`, `template`,
  `migration-manifest` (D7)
- D: no data-store surface present for the kit — no DB entity or migration
- T (static): `node scripts/lint.mjs` exits 0 (no new check yet, but existing
  checks must still pass)
- **Compute:** model=sonnet effort=low — a single targeted Markdown block rewrite
  following the established bullet format; no logic involved
- Checkpoint: read `.claude/skills/qrspi-stack/SKILL.md` and confirm the
  `## Repo surface` block contains six bullet lines (no `_No present surfaces._`
  sentinel). Run `node scripts/lint.mjs` and confirm exit 0. (human) Launch
  `claude --plugin-dir /workspaces/git/qrspi`, run any QRSPI stage command on a
  kit change, and confirm the agent skeleton now has the six kit surfaces
  available to gate on (observable if the questioner emits a kit-specific section
  for a surface that is now declared present).

### Slice 3 — Rename + denylist growth (Check 11)

Rename `CRUD_DENYLIST_HEADINGS` to `SURFACE_GATED_DENYLIST_HEADINGS` in
`scripts/lint.mjs`, add the 10 new surface-gated headings (growing the denylist
from 12 to 22 entries), update the Check 11 comment block to reference
"surface-gated headings" and state both disjoint-scope invariants (a and b), and
update any inline references to the old constant name. At the end of this slice
`node scripts/lint.mjs` is green and a hardcoded kit heading inside a skeleton
fence (e.g. `## Skill changes` as a literal heading line) now fails Check 11.

- M: no mock stub needed — mechanical rename + list extension in one Node file;
  the existing test fixtures already exercise this path. (D5)
- F (lint script): rename the constant, extend the array with 10 new entries,
  rewrite the Check 11 header comment block (D4, D5, D6)
- D: no data-store change
- T (static + inline): `node scripts/lint.mjs` exits 0. Manually insert a
  literal `## Skill changes` heading into a skeleton fence in a local copy of
  `claude/agents/questioner.md`, run `node scripts/lint.mjs`, confirm Check 11
  fires and exits non-zero; revert. (D4)
- **Compute:** model=sonnet effort=low — mechanical rename, array extension, and
  comment rewrite; no new algorithmic logic; mirrors established Check 11 pattern
- Checkpoint: run `node scripts/lint.mjs` and confirm exit 0 with Check 11
  reporting OK. Confirm the constant is named `SURFACE_GATED_DENYLIST_HEADINGS`
  (grep the file). (human) Temporarily add `## Skill changes` as a bare heading
  line inside a fenced skeleton block in `claude/agents/questioner.md`, run
  `node scripts/lint.mjs`, confirm Check 11 reports a violation and exits
  non-zero; revert the file.

### Slice 4 — Check 14 + self-test + README

Add Check 14 (`checkSurfaceApplicability`) to `scripts/lint.mjs`: parse the
`## Repo surface` block from `qrspi-stack`, compute the absent-surface heading
set, scan all `*.md` under `openspec/changes/**` excluding `archive/` paths,
skip fenced lines, and emit `[surface-applicability]` errors for any hit. Include
the inline in-memory self-test (a synthetic fixture with a known absent-surface
heading). Update the scripts header comment (checks 1-14). Update `README.md`
with surface taxonomy and lint-check documentation. At the end of this slice
`node scripts/lint.mjs` runs Check 14 green against the real repo, and a planted
absent-surface heading in a live change artifact fails Check 14. This is the most
logic-heavy slice: fence tracking, path filtering, block parsing, and the
self-test assertion.

- M: no mock stub needed — the `## Repo surface` block (from slice 2) is the
  real data source; no separate mock layer required. (D6, D8)
- F (lint script): implement `checkSurfaceApplicability` — block parser, absent-
  surface set computation via hardcoded `SURFACE_GATED_HEADINGS` map, `walkMd`
  scan with `/archive/` path filter, fence-aware line scanner, `[surface-
  applicability]` error push; add inline self-test; register as Check 14 after
  Check 13; update header comment to list checks 1-14 (D6, D7, D8, OQ2)
- F (README): add surface taxonomy section and Check 14 documentation to
  `README.md`; run `/qrspi-readme-audit` to catch any remaining drift (D9)
- D: no data-store change
- T (static + inline self-test + manual plant):
  - `node scripts/lint.mjs` exits 0 (Check 14 green against real repo)
  - Inline self-test within Check 14 must pass (asserts detector fires on fixture)
  - (human) Plant `## Data model` as a bare heading in a scratch file under
    `openspec/changes/kit-surface-dogfooding/` (a non-archive path), run
    `node scripts/lint.mjs`, confirm Check 14 reports a `[surface-applicability]`
    error naming the file, line, heading, and `data-store` surface, exits non-zero;
    delete the scratch file, rerun, confirm exit 0
  - (human) Temporarily remove the `## Repo surface` heading from
    `.claude/skills/qrspi-stack/SKILL.md`, run `node scripts/lint.mjs`, confirm
    Check 14 fails loudly (not silently); revert
- **Compute:** model=sonnet effort=high — first-of-kind lint gate with block parser,
  path filter, fence tracker, hardcoded heading map, and inline self-test;
  non-trivial logic relative to prior checks but still templated Node/ESM; sonnet
  is sufficient given the established Check 11 fence-tracking pattern to mirror
- Checkpoint: `node scripts/lint.mjs` exits 0 and reports `Check 14: OK`. Confirm
  the inline self-test did not push an error. (human) Run the two manual plant
  tests above. Read `README.md` and confirm the surface taxonomy and Check 14 are
  documented.
