# Proposal — reassess-openspec-dependency

> Stage S of QRSPI. Generated 2026-07-29.

## Why

The kit carried an unverified assumption that the `@fission-ai/openspec` CLI
dependency might need to be vendored before the 1.0 cut. This decision spike
produces a defensible, written keep-vs-vendor verdict grounded in the codebase
evidence gathered at R, and — because the verdict is KEEP — ships the
pin-coupling guard that prevents `openspec/config.yaml`'s `openspec_version`
from silently drifting from the kit's executable pin. The verdict document and
the guard together close the gap PQ1/PQ2 identified: the spike has a concrete,
testable output (D1, D2, D3, D6).

## What Changes

- The approved keep verdict is recorded as the `design.md` + `proposal.md`
  artifacts for this change (the primary deliverable — PQ5).
- `scripts/lint.mjs` Check 1 (`checkPinAgreement`) gains one new assertion:
  after confirming all captured pin strings agree on version V, assert that
  `openspec/config.yaml` contributed a value AND that it equals V. Two failure
  legs: config value absent, and config value present-but-not-equal-to-V (D2,
  D3). Zero-pin branch unchanged (D4).
- An inline self-test for the new assertion is added inside Check 1, covering
  both failure legs plus the green case, in the style of the Check 14/15
  self-tests (D6).
- No new check number is introduced; no npm dependencies are added.
- No changes to commands, agents, skills, or templates (D5).

## Capabilities

### New Capabilities

- _none_

### Modified Capabilities

- `ci-quality-gates`: The "Lint job validates pin agreement" requirement gains a
  second assertion — that `openspec/config.yaml` contributed an `openspec_version`
  value and that it equals the agreed pin V — plus an inline self-test covering
  both failure legs and the green case (D2, D3, D6). Needs a delta spec.

## Impact

- Migrations: no — this change does not bump the OpenSpec pin (stays `1.4.1`),
  so no migration manifest edit is required. A watch-item for future pin bumps:
  the migration manifest for any future pin bump must also edit
  `openspec/config.yaml`'s `openspec_version` or the new guard turns red on
  upgraded consumers (noted in design.md).
- Breaking changes: no — the new assertion fires only when `config.yaml`'s
  `openspec_version` is absent or disagrees with the pin. Repos where it already
  agrees (all correctly scaffolded consumers) see no change.
- Phases: phase 1 (verdict of record); phase 2 (pin-coupling guard + self-test).
- Affected code / APIs / dependencies: `scripts/lint.mjs` (Check 1 body only);
  `openspec/changes/reassess-openspec-dependency/` artifacts.

## Out of scope (Non-Goals, per design.md D5)

- The vendor implementation (own change if verdict had been vendor — D1 corollary).
- Renaming `openspec/` to `qrnchi/` (soft 1.0 want, PQ3 — own change).
- Deleting the two generated skills `openspec-archive-change` and
  `openspec-sync-specs` (separable cleanup — offered to backlog).
- Fixing the `openspec-workflow` `@latest`/stale-layout drift (doc hygiene —
  offered to backlog).
- Adding `.github/ci.yml` to Check 1's scan (pre-existing gap, not silent risk
  because CI itself would fail — offered to backlog, D4).
