# Slices — lint-auto-mode-gate-coverage

> Stage V of QRSPI. Generated 2026-09-20.
> Vertical slices, not horizontal layers.

## Overview

This change adds a single additive lint check (Check 26) to `scripts/lint.mjs`.
There is no UI, no API, no data store, and no multi-capability scope: one file
is edited, one function is added, one constant block is extended, and one
CHANGELOG entry is written. Forcing this into 3–5 slices would introduce
artificial horizontal layers where none exist in the problem.

The natural decomposition is a single end-to-end vertical slice: the function,
its constants, its self-test, its registration in `main()`, the enumeration
comment update, and the CHANGELOG entry all ship together and are immediately
verifiable by running `node scripts/lint.mjs`. The slice is demoable the moment
it is written: the check reports its OK line on a clean repo and fails with a
`[choreography-embed]` violation when a choreography line is temporarily removed.

The `(D<n>)` tags embedded throughout this file are required — this `slices.md`
dogfoods the rule it describes.

## Slices

### Slice 1 — Choreography-embed check, end to end

Add the `stage-choreography` skill-load guard to `scripts/lint.mjs` as Check 26,
complete with constants, self-test, `main()` registration, enumeration comment,
and CHANGELOG entry. At the end of this slice `node scripts/lint.mjs` exits 0
and prints the Check 26 OK line on the current repo; temporarily removing the
choreography embed line from any one of the 8 command files causes Check 26 to
fire and the script to exit non-zero. There are no subsequent slices — this change
has a single vertical path.

- M (Mock API): no mock service stub needed — `scripts/lint.mjs` is a standalone
  Node.js script with no external service layer; the function reads command files
  directly. (D1, D2)
- F (Frontend): no UI surface — the user-visible output is the terminal line
  `Check 26: OK: all 8 stage command(s) contain the stage-choreography embed line`
  printed by `main()`. (D1)
- D (DB): no data-store entity or migration — the check is file I/O only. (D1)
- T (Tests): inline self-test (present-fixture passes, absent-fixture fires)
  run before file I/O, following the Check 24 pattern; CI integration verified by
  running `node scripts/lint.mjs` and by a drop-the-line spot-check. (D3, D4)
- **Compute:** effort=low model=haiku — single-file edit, zero design reasoning,
  pattern mirrors two existing adjacent checks (Checks 9/10 for version-check and
  budget-gate embeds) with fully specified constant names, substring, and self-test
  shape.
- Checkpoint:
  1. Run `node scripts/lint.mjs` — must exit 0 and print `Check 26: OK: all 8 stage command(s) contain the stage-choreography embed line`.
  2. Temporarily remove or comment out the `Load skill \`stage-choreography\`` line from `claude/commands/plan.md`, run `node scripts/lint.mjs` again — must print a `[choreography-embed] claude/commands/plan.md: missing inline stage-choreography embed line` violation and exit non-zero.
  3. Restore `plan.md` and confirm `node scripts/lint.mjs` exits 0 again.
  4. Confirm Checks 1–25 labels are unchanged in the output.
