# Slices — architect-must-leads-requirement-first-line

> Stage V of QRSPI. Generated 2026-07-29.
> Vertical slices, not horizontal layers.

## Overview

This change has no UI, API, or data-store surface. Every slice ends in an
observable `node scripts/lint.mjs` outcome (or a human-readable rendered
guidance change), which is the kit-internal equivalent of "demoing in the
browser." The three slices follow the natural causal order: first plant the
authoring guidance that defines the rule (Slice 1), then add the lint check
that enforces the rule against spec bodies (Slice 2), then add the lint check
that keeps the two copies of that guidance in sync (Slice 3). Each slice is
independently verifiable: after Slice 1, a reader can inspect the rendered
prose; after Slice 2, the check fires on a violating fixture; after Slice 3,
the full suite is green and drift turns it red.

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Authoring guidance: Warning paragraph + counter-example + sentinels

Deliverable: A reader opening `claude/agents/architect.md` sees a bolded
`**Warning —**` paragraph immediately before the "New capability" skeleton,
and both `architect.md` and `openspec-templates/spec-delta.template.md`
contain the permitted/forbidden counter-example bullet wrapped in
`<!-- must-leads:begin -->` / `<!-- must-leads:end -->` sentinel comments.
No lint logic changes in this slice; the only observable gate is that
`node scripts/lint.mjs` continues to pass (Check 3 heading alignment and
all existing checks are unaffected by the prose additions).

- M: no mock service stub needed — this is a pure prose/template edit with no
  service layer (D1, D2)
- F: `claude/agents/architect.md` — add the `**Warning —**` paragraph before
  the "New capability" skeleton and wrap the existing Format-rules MUST/SHALL
  bullet with `<!-- must-leads:begin/end -->` sentinels (D1, D2, D9)
- F: `openspec-templates/spec-delta.template.md` — add the matching
  permitted/forbidden counter-example bullet and wrap it with
  `<!-- must-leads:begin/end -->` sentinels (D2, D9)
- D: n/a — no data-store surface in this repo
- T: run `node scripts/lint.mjs` on the modified tree; confirm all existing
  checks pass (the two files changed are not currently scanned by any lint
  check for content parity — Check 21 does not exist yet, so no new failure
  is expected)
- **Compute:** effort=low — mechanical prose insertion into two files, no
  logic, no cross-file coordination beyond placing identical sentinel-delimited
  blocks
- Checkpoint: `node scripts/lint.mjs` exits 0 on the working tree after the
  edits; open `claude/agents/architect.md` in a viewer and confirm the
  `**Warning —**` paragraph is visible immediately before the "New capability"
  skeleton, and that the sentinel comments appear around the counter-example
  bullet

### Slice 2 — Check 20: `checkRequirementFirstLineModal` + inline self-test

Deliverable: Running `node scripts/lint.mjs` on the repo emits a `Check 20:`
line. On the clean tree (no violations) the check reports OK. Pointing it at a
synthetic violating fixture (a requirement whose first line is `When X …` with
`MUST` on line 2) causes the check to push a `[must-leads]` error and exit
non-zero. The inline self-test embedded in the function covers all five fixture
cases from the spec: passing body, failing body, REMOVED skip, base-spec
violating body, and fence-skip guard. No changes to `architect.md` or
`spec-delta.template.md` in this slice.

- M: n/a — the "API" here is the lint CLI; no mock layer applies (D3, D4)
- F: n/a — no UI surface
- D: `scripts/lint.mjs` — add `async function checkRequirementFirstLineModal()`
  after Check 19; implement the two-glob scanner (delta specs excluding
  `/archive/`, base specs), the ADDED/MODIFIED inclusion and REMOVED exclusion
  logic, the first-non-blank-body-line extraction, the `[must-leads]` error
  push, fence-block suppression, and empty-body skip; embed the five-fixture
  inline self-test; register `await checkRequirementFirstLineModal()` in
  `main()` with a `process.stdout.write('Check 20: ...')` label; update the
  check-inventory header comment in `lint.mjs` to list Check 20 (D3, D4, D5,
  D6, D7, D8)
- T: `node scripts/lint.mjs` exits 0 on the clean tree (no pre-existing
  violations); the inline self-test within Check 20 passes (no
  `[must-leads] SELF-TEST FAILED` line in stdout); manually introduce a
  violating requirement body in a scratch delta-spec file, run lint, confirm
  `[must-leads]` error appears and exit code is non-zero; remove the scratch
  file
- **Compute:** effort=medium — new lint function with multi-glob scanning,
  section-boundary parsing, fence-block suppression, and five-fixture self-test;
  well-defined spec but non-trivial parsing logic
- Checkpoint: `node scripts/lint.mjs` exits 0 on the clean working tree and
  prints `Check 20: OK`; the self-test passes inline (no SELF-TEST FAILED in
  output); a one-off test with a deliberately bad requirement body confirms the
  error path fires correctly

### Slice 3 — Check 21: `checkFormatRulesParity` + inline self-test + stale cheatsheet fix

Deliverable: Running `node scripts/lint.mjs` emits a `Check 21:` line. On
the clean tree (sentinel blocks byte-identical after Slice 1), the check
reports OK. Editing the counter-example in one file without mirroring it
causes the check to push a `[format-rules-parity]` error and exit non-zero.
The stale "Checks 1–14" range in `.claude/skills/qrspi-stack/SKILL.md` is
corrected to "Checks 1–21". The full suite (`node scripts/lint.mjs`) is
green end-to-end on the updated tree.

- M: n/a — the "API" here is the lint CLI; no mock layer applies (D3, D9)
- F: n/a — no UI surface
- D: `scripts/lint.mjs` — add `async function checkFormatRulesParity()` after
  Check 20; implement sentinel extraction from both `claude/agents/architect.md`
  and `openspec-templates/spec-delta.template.md`; assert byte-identity;
  push `[format-rules-parity]` errors for missing-anchor and drift cases;
  embed the three-fixture inline self-test (match, drift, missing-anchor);
  register `await checkFormatRulesParity()` in `main()` with a
  `process.stdout.write('Check 21: ...')` label; update the check-inventory
  header comment to list Check 21 (D9, OQ2)
- D: `.claude/skills/qrspi-stack/SKILL.md` — replace the stale "Checks 1–14"
  range with "Checks 1–21" (OQ3)
- T: `node scripts/lint.mjs` exits 0 on the clean tree and prints both
  `Check 20: OK` and `Check 21: OK`; the Check 21 inline self-test passes (no
  SELF-TEST FAILED in output); manually drift the sentinel block in one file,
  run lint, confirm `[format-rules-parity]` error appears and exit code is
  non-zero; restore the file
- **Compute:** effort=medium — new lint function with sentinel extraction,
  byte-identity assertion, three-fixture self-test, plus the one-line cheatsheet
  fix; similar complexity to Slice 2 but simpler parsing (two-file string
  comparison rather than multi-glob section scanning)
- Checkpoint: `node scripts/lint.mjs` exits 0 on the clean working tree and
  prints `Check 20: OK` and `Check 21: OK`; deliberately drift the sentinel
  block in one file and confirm the check pushes `[format-rules-parity]` and
  exits non-zero; restore the file and confirm the suite returns to green;
  open `.claude/skills/qrspi-stack/SKILL.md` and confirm the range now reads
  "Checks 1–21"
