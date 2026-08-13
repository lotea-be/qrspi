# Slices — researcher-apply-surface-gate

> Stage V of QRSPI. Generated 2026-08-13.
> Vertical slices, not horizontal layers.

## Overview

This is a pure kit/tooling change across three small, coupled artifacts:
`claude/agents/researcher.md` (prose), `scripts/lint.mjs` (a new static
check), and `openspec-templates/research.template.md` (template comments).
There is no web-app stack — no mock APIs, no frontend, no DB. The vertical
axis here is: ship the artifact → assert it statically → verify end-to-end
behaviour in a live session.

Three slices match the three touched capabilities exactly. Each slice ends in
a verifiable deliverable: a readable file edit, a passing `node
scripts/lint.mjs` run, and a live researcher session that suppresses absent
surfaces. The slices are ordered so that slice 2's lint check can assert
slice 1's prose edit, and slice 3 completes the template consistency gap
independently. All three are purely mechanical edits with no design reasoning
at implementation time.

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Add gate-instruction sentence to researcher.md

Add the single operative sentence to `## What to do` step 1 of
`claude/agents/researcher.md`: "Apply the surface-gate rule per the
`repo-surface` skill: emit each inventory section only when its surface is
present, omitting absent-surface headings entirely." The sentence is inserted
immediately after the existing sentence that states `repo-surface` defines
which inventory sections to emit. This slice is the root change; the lint
check in slice 2 guards it against regression. (D1)

- M: no mock layer needed — this is a prose-only edit to a markdown agent
  file; the "contract" is the sentence wording itself, already pinned in the
  spec (D2).
- F: `claude/agents/researcher.md` — insert the gate-instruction sentence
  into step 1 at the specified position. (D1)
- D: no data-store surface present; no migration.
- T: manual read of the edited file confirms: (a) the sentence appears in
  step 1, (b) it follows the existing `repo-surface` sentence, (c) it is not
  a new numbered step. (D1)
- **Compute:** effort=low model=haiku — single-sentence insertion at a pinned
  position in one markdown file; zero branching logic, zero cross-file
  coordination.
- Checkpoint: `grep -n "surface-gate rule per the" claude/agents/researcher.md`
  returns a match inside step 1. Human confirms the surrounding step context
  looks correct.

### Slice 2 — Add Check 24 to lint.mjs

Add `checkResearcherGateInstruction` (Check 24) to `scripts/lint.mjs` after
Check 23, following the existing dependency-free ESM pattern. The check reads
`claude/agents/researcher.md`, locates step 1 of `## What to do`, and asserts
the stable substring `surface-gate rule per the \`repo-surface\` skill` is
present. It carries an inline in-memory self-test: a fixture containing the
phrase passes; a fixture omitting it fails; a self-test regression pushes a
`[researcher-gate-instruction] SELF-TEST FAILED` error. Check 24 registers a
non-zero exit when the phrase is absent. Running `node scripts/lint.mjs` with
the slice-1 edit in place produces all-OK output for Check 24. (D6)

- M: no mock layer needed — the check runs against the real file written in
  slice 1; no stub data is required. (D6)
- F: `scripts/lint.mjs` — add the `checkResearcherGateInstruction` function
  and wire it into `main()` after Check 23. (D6)
- D: no data-store surface present; no migration.
- T: `node scripts/lint.mjs` passes with zero errors after slice 1+2 edits
  are applied. A temporary removal of the gate-instruction sentence (then
  restored) confirms Check 24 exits non-zero. (D6)
- **Compute:** effort=medium model=sonnet — a new lint check function with
  inline self-test logic (two fixture branches + error-push branching); small
  but has more structure than a one-liner edit.
- Checkpoint: `node scripts/lint.mjs` exits 0 and prints `Check 24: OK`.
  (human) Temporarily delete the gate-instruction sentence from
  `researcher.md`, re-run `node scripts/lint.mjs`, confirm Check 24 reports
  a violation and exits non-zero, then restore the sentence.

### Slice 3 — Add SURFACE-GATED comments to research.template.md

Add `<!-- SURFACE-GATED: <surface> surface. Omit the heading and body
entirely when <surface> is absent from ## Repo surface. -->` comments to each
surface-gated inventory section position in
`openspec-templates/research.template.md`, matching the convention already
used in `openspec-templates/questions.template.md`. No heading lines are
added; comments are for human-facing legibility only. The five spine headings
and title/blockquote remain unchanged. (D7)

- M: no mock layer needed — this is a template comment edit; the pattern to
  follow is already visible in `questions.template.md`. (D7)
- F: `openspec-templates/research.template.md` — insert
  `<!-- SURFACE-GATED: … -->` comments at each surface-gated inventory
  section position. (D7)
- D: no data-store surface present; no migration.
- T: `node scripts/lint.mjs` continues to pass (Check 14 and the template
  denylist checks must not regress). Manual diff against
  `questions.template.md` confirms comment format is consistent. (D7)
- **Compute:** effort=low model=haiku — comment insertion only; pattern is
  fully determined by the adjacent `questions.template.md` file; zero
  branching logic.
- Checkpoint: `grep "SURFACE-GATED" openspec-templates/research.template.md`
  returns at least one match per surface-gated section. `node scripts/lint.mjs`
  exits 0. (human) Open both template files side-by-side and confirm
  `SURFACE-GATED` comment wording is consistent between the two templates.
