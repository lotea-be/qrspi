# Slices — reassess-openspec-dependency

> Stage V of QRSPI. Generated 2026-07-29.
> Vertical slices, not horizontal layers.

## Overview

This change is a two-phase decision spike. Phase 1 produces the verdict of
record (keep `@fission-ai/openspec` as an external dependency) — the primary
deliverable is the approved `design.md` + `proposal.md` artifacts themselves,
which any future change can cite when sequencing the 1.0 cut. Phase 2 ships
the single code output the spike warranted: an extended `checkPinAgreement`
assertion in `scripts/lint.mjs` plus its inline self-test.

Two well-formed vertical slices match this two-phase shape exactly. Adding a
third slice to reach the canonical 3–5 count would require inventing scope not
present in the approved design; this file documents that reasoning here rather
than padding the slice list.

This is a dev-tooling repo (a Claude Code plugin kit), not a web app. There is
no Mock-API / Frontend / DB layering. A "demoable slice" here means a human
can confirm the verdict is the one they want to cite (Slice 1) or run
`node scripts/lint.mjs` and see both the new guard fire correctly and all
existing checks continue to pass (Slice 2).

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Verdict of record (keep)

The QRSPI process artifacts (`design.md`, `proposal.md`, delta
`specs/ci-quality-gates/spec.md`) collectively constitute the approved keep
verdict. A human reviewer can read `design.md` sections D1–D6 and confirm
the rationale is sound and matches what they want to cite when sequencing 1.0
work. No code is written in this slice; the deliverable is the written,
committed record that closes the PQ1/PQ2 gap.

- M: no mock needed — this slice is a human-confirmation of the process
  artifact produced at stages S, not a code path (D1)
- F: not applicable — no UI surface in this repo
- D: not applicable — no data-store surface in this repo
- T: not applicable — the delta spec was validated by `openspec validate
  reassess-openspec-dependency --strict` at stage S; no additional test
  artefact is introduced by this slice (D6 self-test belongs to Slice 2)
- **Compute:** effort=low model=sonnet — no-code human-confirmation slice; the
  verdict is already written and validated
- Checkpoint: `(human)` — open
  `openspec/changes/reassess-openspec-dependency/design.md` and confirm that
  decisions D1 (keep verdict), D2 (two failure legs), and D3 (config assertion
  goes inside existing Check 1, not a new check number) are the decisions you
  want on record before implementation of Slice 2 begins.

### Slice 2 — Pin-coupling guard, end-to-end

Extend `scripts/lint.mjs` Check 1 (`checkPinAgreement`) with the new
config-coupling assertion and its inline self-test in one cut. When this slice
is complete: (a) `node scripts/lint.mjs` on the real repo stays fully green
(all existing checks pass, no new check number introduced); (b) the new
self-test exercises the absent-config fixture, the present-but-wrong-value
fixture, and the agrees fixture — the self-test failures surface as pushed
errors so CI catches regressions automatically. The delta spec's six scenarios
(pin-mismatch, generatedBy exclusion, config absent, config wrong, config
agrees, zero-pin branch unchanged) are all covered by this single file edit.

- M: no mock needed — the assertion reads `openspec/config.yaml` directly;
  pattern mirrors the existing pin-string scan already in Check 1, and the
  response contract is fully settled by the delta spec (D2, D3)
- F: not applicable — no UI surface in this repo
- D: not applicable — no data-store surface in this repo
- T: inline self-test inside `checkPinAgreement`, covering absent-config
  (failure leg 1), present-but-not-equal (failure leg 2), and agrees (green
  case), in the style of the Check 14/15 self-tests already present in the
  file; self-test failures are pushed as errors (D6)
- **Compute:** effort=medium model=sonnet — single-file edit with clear design
  reasoning already settled; mirrors existing self-test pattern but requires
  understanding the `checkPinAgreement` control flow to place the new assertion
  correctly after the cross-occurrence agreement check (D2, D3, D6)
- Checkpoint: run `node scripts/lint.mjs` in the repo root. Expected: all
  checks report green (including Check 1) and the run exits 0. Then temporarily
  remove `openspec_version` from `openspec/config.yaml` and re-run: Check 1
  must exit non-zero and name the config-absent failure. Restore the field and
  set it to a wrong version (e.g. `"1.3.0"`), re-run: Check 1 must exit
  non-zero and name the config-mismatch failure. Restore to the correct value;
  final run must be green.
