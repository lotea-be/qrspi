# Tasks — kit-surface-dogfooding

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Taxonomy + mapping + skeletons

**Compute:** model=sonnet effort=medium — extends an existing mapping table and two skeleton files; the self-collision caveat for `## Template surface` (a present heading that is also a denylist entry) requires careful conditional phrasing but is otherwise mechanical Markdown authoring

- [ ] 1.1 Add six surface rows (`slash-command`, `stage-agent`, `skill`, `lint-gate`, `template`, `migration-manifest`) to the section-to-surface mapping table in `claude/skills/repo-surface/SKILL.md`, and append the `## Extending the taxonomy` checklist (D1, D3)
- [ ] 1.2 Add gated section placeholders (as conditional gate comments, not literal headings) for the six new surfaces to `claude/agents/questioner.md` (D3)
- [ ] 1.3 Add matching gated section placeholders to `claude/agents/designer.md` (D3)
- [ ] 1.4 Add matching gated section placeholders to `openspec-templates/questions.template.md` and `openspec-templates/design.template.md` (D3, OQ3)
- [ ] 1.5 Run `node scripts/lint.mjs` and confirm it exits 0 (Check 11 must not flag the newly added skeleton gate comments as literal headings)
- [ ] 1.6 (human) Optionally launch `claude --plugin-dir /workspaces/git/qrspi` and run `/qrspi:questions` on a toy kit change touching a `skill` surface — verify the questioner does NOT yet emit `## Skill surface` (the surface is not declared present until slice 2)
- [ ] 1.7 Checkpoint: read `claude/skills/repo-surface/SKILL.md` and confirm all six new surface rows appear with their gated section names listed, the `## Extending the taxonomy` section is present, and `node scripts/lint.mjs` exits 0

## 2. Declare kit present surfaces

**Compute:** model=sonnet effort=low — a single targeted Markdown block rewrite following the established bullet format; no logic involved

- [ ] 2.1 Rewrite the `## Repo surface` block in `.claude/skills/qrspi-stack/SKILL.md` from `_No present surfaces._` to list the six kit surfaces as bullet lines: `slash-command`, `stage-agent`, `skill`, `lint-gate`, `template`, `migration-manifest` (D7)
- [ ] 2.2 Run `node scripts/lint.mjs` and confirm it exits 0
- [ ] 2.3 (human) Launch `claude --plugin-dir /workspaces/git/qrspi`, run any QRSPI stage command on a kit change, and confirm the agent skeleton now has the six kit surfaces available to gate on (observable if the questioner emits a kit-specific section for a surface declared present)
- [ ] 2.4 Checkpoint: read `.claude/skills/qrspi-stack/SKILL.md` and confirm the `## Repo surface` block contains six bullet lines (no `_No present surfaces._` sentinel), and `node scripts/lint.mjs` exits 0

## 3. Rename + denylist growth (Check 11)

**Compute:** model=sonnet effort=low — mechanical rename, array extension, and comment rewrite; no new algorithmic logic; mirrors established Check 11 pattern

- [ ] 3.1 Rename `CRUD_DENYLIST_HEADINGS` to `SURFACE_GATED_DENYLIST_HEADINGS` in `scripts/lint.mjs` and update all inline references to the old constant name (D4, D5)
- [ ] 3.2 Extend the denylist array with the 10 new surface-gated headings (growing from 12 to 22 entries) and rewrite the Check 11 header comment block to reference "surface-gated headings" and state both disjoint-scope invariants (a and b) (D4, D5, D6)
- [ ] 3.3 Run `node scripts/lint.mjs` and confirm it exits 0 with Check 11 reporting OK; confirm the constant is named `SURFACE_GATED_DENYLIST_HEADINGS` (grep the file)
- [ ] 3.4 (human) Temporarily add `## Skill changes` as a bare heading line inside a fenced skeleton block in `claude/agents/questioner.md`, run `node scripts/lint.mjs`, confirm Check 11 reports a violation and exits non-zero; revert the file (D4)
- [ ] 3.5 Checkpoint: `node scripts/lint.mjs` exits 0 with Check 11 OK; constant name confirmed by grep; human negative-case test passed and reverted

## 4. Check 14 + self-test + README

**Compute:** model=sonnet effort=high — first-of-kind lint gate with block parser, path filter, fence tracker, hardcoded heading map, and inline self-test; non-trivial logic relative to prior checks but still templated Node/ESM; sonnet is sufficient given the established Check 11 fence-tracking pattern to mirror

- [ ] 4.1 Implement `checkSurfaceApplicability` in `scripts/lint.mjs`: block parser for the `## Repo surface` block from `qrspi-stack`, absent-surface set computation via hardcoded `SURFACE_GATED_HEADINGS` map, `walkMd` scan with `/archive/` path filter, fence-aware line scanner, and `[surface-applicability]` error push (D6, D7, D8, OQ2)
- [ ] 4.2 Add the inline in-memory self-test within `checkSurfaceApplicability` (a synthetic fixture with a known absent-surface heading that asserts the detector fires) (D6, D8)
- [ ] 4.3 Register `checkSurfaceApplicability` as Check 14 after Check 13, and update the scripts header comment to list checks 1-14 (D6)
- [ ] 4.4 Add surface taxonomy section and Check 14 documentation to `README.md`; run `/qrspi-readme-audit` to catch any remaining drift (D9)
- [ ] 4.5 Run `node scripts/lint.mjs` and confirm it exits 0 with Check 14 reporting OK and the inline self-test not pushing an error
- [ ] 4.6 (human) Plant `## Data model` as a bare heading in a scratch file under `openspec/changes/kit-surface-dogfooding/` (a non-archive path), run `node scripts/lint.mjs`, confirm Check 14 reports a `[surface-applicability]` error naming the file, line, heading, and `data-store` surface, and exits non-zero; delete the scratch file, rerun, confirm exit 0
- [ ] 4.7 (human) Temporarily remove the `## Repo surface` heading from `.claude/skills/qrspi-stack/SKILL.md`, run `node scripts/lint.mjs`, confirm Check 14 fails loudly (not silently); revert
- [ ] 4.8 Checkpoint: `node scripts/lint.mjs` exits 0 and reports `Check 14: OK`; inline self-test clean; both human plant tests passed and reverted; `README.md` documents surface taxonomy and Check 14
