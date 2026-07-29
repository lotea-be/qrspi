# Slices — standardize-backlog-format

> Stage V of QRSPI. Generated 2026-07-29.
> Vertical slices, not horizontal layers.

## Overview

This change has no web UI or HTTP API — it is a kit-tooling change. "Demoable"
means a specific `node scripts/lint.mjs` invocation passes green, a
`/qrspi:init` run in a throwaway fixture produces a lint-clean backlog, or a
`/qrspi:update` run applies the migration to a consumer fixture. Each slice
ends in one of those verifiable outcomes before the next slice starts.

The five slices are ordered to keep CI green at every slice boundary:

1. Renumber the Check-10 collision — reviewable independently from the new check
   (D1 design decision).
2. Add Check 22 + backfill the kit's own backlog + create `backlog.template.md`
   — these three must co-land so CI never observes a reddened state. Check 22's
   sixth assertion (template-file existence) requires the template to be present
   in the same commit; the backfill must also land here per the hard ordering
   constraint (design Risks + PQ-Q38).
3. Wire the init seed path and Check 3 mapping — once the template exists
   (slice 2), `/qrspi:init` can Glob for it and seed from it; Check 3 needs a
   declared entry for the new template file.
4. Correct drifted prose and add fenced row examples — writer command bodies
   and the workflow skill gain the frozen em-dash grammar so future rows are
   authored lint-clean.
5. Ship the migration manifest and CHANGELOG — the maiden `automated` edit-file
   step delivers the legend comment to existing consumer repos.

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Check-10 label collision fix

Renumber the duplicate "Check 10" label (`checkTriagePaths`) to the next free
slot, re-sequence any downstream labels as needed, and update every
check-number reference and the README Check-list/count. At the end of this
slice `node scripts/lint.mjs` runs green with unique labels on every check,
and the README Check-list is consistent with what the script emits. This slice
deliberately does NOT touch Check 22 or any backlog content — keeping it
isolated makes the diff reviewable in minutes.

- M: no mock service — this is a label rename in `scripts/lint.mjs` and README
  prose; no new logic.
- F: n/a — no UI surface.
- D: n/a — no data-store surface.
- T: `node scripts/lint.mjs` must exit 0 with no duplicate-label output; spot-
  check `README.md` Check-list for the renumbered entry. (D1)
- **Compute:** effort=low model=sonnet — mechanical label renumber with no
  logic change; purely find-and-replace across two files.
- Checkpoint: run `node scripts/lint.mjs` in the repo root; all checks report
  `OK`, no two lines emit the same "Check N" label. Read the README Check-list
  and confirm the renumbered entry and count match. (D1)

### Slice 2 — Check 22 + kit backlog backfill + backlog template

This is the largest and most constrained slice. It lands three things in the
same commit: (a) `checkBacklogSchema` registered as Check 22 in `scripts/lint.mjs`
with all six assertions and the four-fixture inline self-test; (b) the kit's own
`openspec/backlog.md` backfilled with `**Shape:**` on all ~51 standalone
`idea`/`proposed` rows that currently lack it; (c)
`openspec-templates/backlog.template.md` authored to satisfy Check 22 out of
the box (three section headings, P-band preamble, sample rows with Why+Shape,
sample bundled row with pointer note, legend comment). Check 22's sixth
assertion (template-file existence) requires the template to be present; the
backfill must co-land with the check so CI never observes a reddened state.

At the end of this slice `node scripts/lint.mjs` passes green end-to-end,
including the new Check 22 on the kit's own backlog.

- M: no mock — Check 22 is a new lint function with an inline self-test; the
  self-test is the fixture, not a separate mock layer. (D4)
- F: n/a — no UI surface.
- D: n/a — no data-store surface; `backlog.md` is a Markdown file, not a DB
  entity.
- T: `node scripts/lint.mjs` exits 0 on the real repo (Check 22 green);
  Check 22 self-test passes before file I/O; manually verify one formerly-
  missing Shape row is present and well-formed in `openspec/backlog.md`. (D2,
  D3, D4, D6)
- **Compute:** effort=high model=opus — authoring real `**Shape:**` text for
  ~51 backlog rows is genuine content work, not mechanical; the regex with
  non-ASCII code points (em-dash U+2014, middle-dot U+00B7) and the row-
  classification logic (D3, D6) require careful reasoning; the inline self-test
  covers four distinct classifier cases (D4).
- Checkpoint: run `node scripts/lint.mjs`; all checks (1–22) report `OK` with
  exit 0. Spot-check five formerly-missing `**Shape:**` rows in
  `openspec/backlog.md` to confirm they carry substantive (non-TBD) Shape text.
  Confirm `openspec-templates/backlog.template.md` is present. (D1, D2, D3, D4,
  D6, D7)

### Slice 3 — Init seed path + Check 3 empty-headings mapping

Add the `/qrspi:init` seed step (`claude/commands/init.md`): after writing
`openspec/config.yaml`, Glob for `openspec/backlog.md`; if absent, copy the
template content to `openspec/backlog.md` and stage it in the existing
`git add openspec/` step. Add a `TEMPLATE_CANONICAL_HEADINGS` entry for
`backlog.template.md` with `headings: []` in `scripts/lint.mjs` (Check 3) so
the "every template is declared" invariant stays satisfied.

At the end of this slice a fresh `/qrspi:init` in a throwaway consumer fixture
produces a lint-clean `openspec/backlog.md`, and `node scripts/lint.mjs` in
the kit repo still passes green with Check 3 satisfied.

- M: no mock — the seed step copies a file; the observable outcome is the
  seeded file passing Check 22. (D7)
- F: n/a — no UI surface; `/qrspi:init` is a command, not a web page.
- D: n/a — no data-store surface.
- T: `node scripts/lint.mjs` exits 0 in the kit repo (Check 3 still green for
  `backlog.template.md`); `(human)` checkpoint below covers the live init path.
  (D7)
- **Compute:** effort=low model=sonnet — two localized edits (one Glob-and-seed
  block in `init.md`, one map entry in `lint.mjs`); both follow established
  patterns already in the repo.
- Checkpoint (automated): run `node scripts/lint.mjs` in the kit repo; Check 3
  reports `OK` with no "undeclared template" error for `backlog.template.md`.
  (D7)
- Checkpoint (human): in a fresh terminal, run `claude --plugin-dir
  /workspaces/git/qrspi` in a throwaway directory that has no
  `openspec/backlog.md`; run `/qrspi:init`; confirm `openspec/backlog.md` is
  created from the template and that `node scripts/lint.mjs` passes Check 22 on
  the seeded file with no violations. Then run `/qrspi:init` a second time and
  confirm the existing file is not overwritten. (D7)

### Slice 4 — Workflow skill prose + writer command fenced examples

Correct the drifted "Backlog atomicity" prose in
`claude/skills/workflow/SKILL.md`: replace the `--` (double-hyphen) heading
example with the frozen `### <id> — \`<status>\` · **P<n>**` form and add a
one-line pointer to `openspec-templates/backlog.template.md`. Add fenced
canonical row examples (matching the template's sample row verbatim) to the
five command-body write paths: `claude/commands/followup.md` (P3 promote row),
`claude/commands/pr.md` (promote prose), and the deferred-work-append paths in
`claude/commands/design.md`, `claude/commands/structure.md`, and
`claude/commands/slices.md`.

At the end of this slice every writer command body and the workflow skill show
the frozen em-dash grammar, and `node scripts/lint.mjs` still passes green.

- M: no mock — these are prose edits; correctness is verified by reading the
  files and running lint.
- F: n/a — no UI surface.
- D: n/a — no data-store surface.
- T: `node scripts/lint.mjs` exits 0 (no new lint violations introduced by
  prose edits); read `claude/skills/workflow/SKILL.md` "Backlog atomicity"
  section and confirm em-dash grammar and template pointer are present; read
  one writer command body (e.g. `followup.md`) and confirm the fenced example
  uses the real em-dash. (D8, OQ2)
- **Compute:** effort=medium model=sonnet — six files edited, each with a
  localized prose change; the fenced examples must mirror the template verbatim
  (requires reading the template and matching exactly); no new logic.
- Checkpoint: run `node scripts/lint.mjs`; all checks report `OK`. Read
  `claude/skills/workflow/SKILL.md` "Backlog atomicity" and confirm the frozen
  grammar is present. Spot-check `claude/commands/followup.md` and
  `claude/commands/pr.md` for the fenced canonical row examples. (D8, OQ2)

### Slice 5 — Migration manifest + CHANGELOG entry

Author `migrations/<next-version>.yaml` with exactly one `automated`
`edit-file` step (insert the legend comment after the file title line, keyed on
a guaranteed-present anchor) and `manual` steps for conditional/section-
heading/consumer-specific logic. Add a `[Unreleased]` entry to `CHANGELOG.md`
for this change. The manifest is the first in kit history to carry a non-empty
`automated:` list, exercising a previously untested code path — keep the
automated step maximally simple.

At the end of this slice a consumer running `/qrspi:update` on a throwaway
fixture gains the legend comment automatically, and the manual steps guide them
to the template for any structural scaffolding.

- M: no mock — the migration YAML is the artifact; the `(human)` checkpoint
  exercises the real `/qrspi:update` code path.
- F: n/a — no UI surface.
- D: n/a — no data-store surface.
- T: `node scripts/lint.mjs` exits 0 (CHANGELOG and migrations are not linted
  by the kit, but lint must still be green); `(human)` checkpoint below covers
  the live update path. (OQ3)
- **Compute:** effort=medium model=sonnet — the YAML schema and `edit-file`
  dispatcher contract are known from the existing 8 manifests; the main
  reasoning task is keeping the automated step on a guaranteed-present anchor
  and putting conditional logic in `manual` steps (OQ3 decision).
- Checkpoint (automated): run `node scripts/lint.mjs`; all checks report `OK`.
  Read `migrations/<next-version>.yaml` and confirm: exactly one entry in
  `automated:` (the legend-comment insert); the `manual:` steps include
  section-heading guidance and a pointer to `/qrspi:init` for repos with no
  backlog. (OQ3)
- Checkpoint (human): in a fresh terminal, set up a throwaway consumer fixture
  outside this repo (e.g. in the scratchpad) with an existing
  `openspec/backlog.md` that lacks the legend comment; run
  `claude --plugin-dir /workspaces/git/qrspi`; run `/qrspi:update`; confirm
  the automated step inserts the legend comment after the title line without
  altering any existing row content. (OQ3)
