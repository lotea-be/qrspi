# Slices — context-budget

> Stage V of QRSPI. Generated 2026-07-24.
> Vertical slices, not horizontal layers.

## Overview

This change has no data-store, HTTP-API, or browser-UI surface. A "vertical
slice" here means a self-contained unit that edits the relevant kit sources
AND lands its own passing CI gate — so each slice is demoable by running
`node scripts/lint.mjs` and/or the new script from a `--plugin-dir` session.

The four slices follow the four phases in the proposal, each independently
lint-green and mergeable on its own:

1. Input trims and the skill-set registry — the mechanical input-reduction
   commitment, enforced by a new lint check from the moment it lands.
2. Output-contract banners — a parallel, additive enforcement layer for
   agent output surfaces; no dependency on slice 1.
3. Footprint script — a standalone visibility tool; depends on the
   `SKILL_SET_EXPECTED` registry produced in slice 1 (shared constant or
   import), so it lands after slice 1 but is otherwise independent of
   slice 2.
4. context-hygiene pointer, README, and CHANGELOG — pure documentation;
   must land last so it can reference the two new checks and the new
   script by their final names.

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Input trims + skill-set registry & lint allowlist

**Deliverable.** `scripts/lint.mjs` gains a `SKILL_SET_EXPECTED` constant and
a new `checkSkillSets` assertion (registered in `main()` after Check 2 but
before Check 3). Four agent files have `openspec-workflow` removed from their
`Load skills` line; `claude/agents/researcher.md` gains `context-hygiene` on
the same line. After this slice `node scripts/lint.mjs` is green; manually
adding a stray skill load to any agent file causes `checkSkillSets` to report
the violation and exit non-zero. The context-hygiene skill-load on the
researcher is observable in a `--plugin-dir` session but the `(human)` check
is deferred to the PR stage (no new command behaviour changes in this slice).

- S (Scripts/kit source): add `SKILL_SET_EXPECTED` registry constant to `scripts/lint.mjs` (D2, D5)
- S (Scripts/kit source): add `checkSkillSets` function and register it in `main()` after Check 2 (D5, D6)
- A (Agent files): remove `openspec-workflow` from `Load skills` in `claude/agents/researcher.md`, `questioner.md`, `designer.md`, `planner.md` (D1)
- A (Agent files): add `context-hygiene` to `Load skills` in `claude/agents/researcher.md` (D3)
- T (Tests/CI): `node scripts/lint.mjs` exits 0 with the trimmed agents; mutating one agent to add a stray load exits non-zero (D5)
- **(human) Checkpoint:** run `node scripts/lint.mjs` in the repo — confirm it exits 0 and reports no `checkSkillSets` errors. Then manually add `openspec-workflow` to `claude/agents/planner.md`, re-run lint, and confirm a non-zero exit with a message naming the stray skill. Revert before continuing.
- **Model:** sonnet — mechanical trim of four load lines + a new lint check that mirrors the existing `READ_CONTRACT_EXPECTED` / `checkReadContracts` pattern; no novel architectural reasoning required.
- Checkpoint: `node scripts/lint.mjs` passes end-to-end; the stray-load mutation test (above) fails the check.

### Slice 2 — Output-contract banners + Check 12

**Deliverable.** All seven stage agent files (`researcher`, `questioner`,
`designer`, `architect`, `planner`, `implementer`, `reviewer`) carry a
`> **Output contract**` banner block — with a cap sentence for `implementer`
and `reviewer`, and a prose formalisation for the other five. `scripts/lint.mjs`
gains Check 12 (`checkOutputContracts`) registered in `main()` after Check 11.
After this slice `node scripts/lint.mjs` is green; removing any banner causes
Check 12 to exit non-zero naming the offending file. This slice is independent
of slice 1 (no shared constant is needed) and could ship in either order, but
is listed second so the registry from slice 1 exists before the footprint
script references it.

- S (Scripts/kit source): add `checkOutputContracts` function and register it in `main()` as Check 12 (D4)
- A (Agent files): add `> **Output contract**` banner to all seven agent files; add cap sentence to `implementer.md` and `reviewer.md` (D4)
- T (Tests/CI): `node scripts/lint.mjs` exits 0 with all seven banners present; removing one banner exits non-zero (D4)
- **(human) Checkpoint:** run `node scripts/lint.mjs` — confirm Check 12 passes. Then remove the `> **Output contract**` line from `claude/agents/implementer.md`, re-run, and confirm a non-zero exit naming `implementer.md`. Revert before continuing.
- **Model:** sonnet — banner insertion is templated (same text to seven files); `checkOutputContracts` is a pattern-match check mirroring Check 7 (`checkReadContracts`); no deep reasoning required.
- Checkpoint: `node scripts/lint.mjs` exits 0; the banner-removal mutation test (above) fails Check 12.

### Slice 3 — Footprint script

**Deliverable.** `scripts/context-footprint.mjs` is added as a standalone
Node ESM script (no third-party deps). It imports (or re-declares) the same
`SKILL_SET_EXPECTED` map from slice 1 so the two sources never drift, reads
each agent file and its declared skill files, and prints a seven-row table to
stdout with columns: agent stem, skill count, total lines, total bytes, rough
tokens (`Math.round(bytes / 4)`). The script always exits 0. After this slice
`node scripts/context-footprint.mjs` prints the table and exits without error.

- S (Scripts/kit source): add `scripts/context-footprint.mjs` (Node built-ins only; reuses or imports `SKILL_SET_EXPECTED` from `scripts/lint.mjs` or a shared module) (D7)
- S (Scripts/kit source): implement table output covering seven rows × five required columns (D7)
- S (Scripts/kit source): unconditional `process.exit(0)` — no ceiling gate (D7)
- T (Tests/CI): `node scripts/context-footprint.mjs` runs to completion with exit code 0 and prints exactly seven data rows
- **(human) Checkpoint:** run `node scripts/context-footprint.mjs` from the repo root — confirm it prints a table with seven rows (one per stage) and exits 0. Spot-check that the token column is present and numeric.
- **Model:** sonnet — a report-only script with no decision logic; file-reading + arithmetic + table formatting, all in Node built-ins; pattern similar to existing `scripts/*.mjs` files.
- Checkpoint: `node scripts/context-footprint.mjs` prints the seven-row table and exits 0.

### Slice 4 — context-hygiene pointer + README + CHANGELOG

**Deliverable.** `claude/skills/context-hygiene/SKILL.md` gains a one-line
enforcement pointer naming the two new lint checks (the skill-set check from
slice 1 and Check 12 from slice 2) and the footprint script from slice 3, so
the 40%/60% heuristic is backed by a concrete mechanism reference. `README.md`
is updated to document `checkSkillSets` and Check 12 in the helpers/checks
surface and the footprint script in the scripts table. `CHANGELOG.md` gains
entries under `## [Unreleased]` for all three additions. After this slice
`node scripts/lint.mjs` passes Check 4 (README command coverage). No
`plugin.json` version bump.

- D (Docs): add enforcement pointer to `claude/skills/context-hygiene/SKILL.md` (D3, PQ6)
- D (Docs): update `README.md` — document the two new checks and `scripts/context-footprint.mjs` (PQ6; CLAUDE.md "keep README current" rule)
- D (Docs): add `## [Unreleased]` entries to `CHANGELOG.md` for `checkSkillSets`, Check 12, and `scripts/context-footprint.mjs` (PQ6)
- T (Tests/CI): `node scripts/lint.mjs` exits 0 with Check 4 (README coverage) passing (PQ6)
- **Model:** sonnet — pure documentation edits; no algorithmic reasoning; all three files have a settled structure and the additions are one-liner or bullet-list inserts.
- Checkpoint: `node scripts/lint.mjs` exits 0 with Check 4 passing; the README contains entries for `checkSkillSets`, Check 12, and `context-footprint.mjs`.
