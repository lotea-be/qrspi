# Slices — bump-openspec-pin

> Stage V of QRSPI. Generated 2026-08-14.
> Vertical slices, not horizontal layers.

## Overview

This repo has no data-store/http-api/ui surfaces (see the stack cheatsheet's
`## Repo surface`: slash-command, stage-agent, skill, lint-gate, template,
migration-manifest). Each slice below is still an independently
demoable/verifiable end-to-end path through those surfaces — a lint-gate
change you can run against a fixture, a slash-command lifecycle you can
exercise in a live session, a pin flip you can validate — not a horizontal
layer. Ordering is **fixed by the approved design (Q16)** and restated
verbatim from `proposal.md`'s "Vertical slices (preview)": Check 1 must be
bump-ready before the pin flips, the marker lifecycle must land before the
pin flips (or every in-flight change folder briefly fails `validate --all`),
and the pin flip must land before the migration-manifest / consumer-upgrade
slice (which assumes `1.9.0` is already the shipped pin). No commit is ever
transiently red. The `(D<n>)` tags below are required — this `slices.md`
dogfoods the rule it describes.

## Slices

### Slice 1 — Check 1 is bump-ready while the pin still reads 1.4.1

**Deliverable:** `scripts/lint.mjs`'s Check 1 (`checkPinAgreement`) is
reworked in place — narration-surface and `openspec/config.yaml` exclusions,
a dedicated config-coupling assertion, `.github/`/`.claude/` added to the
scanned directory set, and a new `@fission-ai/openspec@latest` absence
sub-guard — while every hand-maintained pin site still reads `1.4.1`. Running
`node scripts/lint.mjs` on the unmodified repo passes end-to-end with the new
Check 1 logic exercising all of its branches via its own inline self-test.
This is a deliberate gap: the pin itself does not move yet (that's Slice 3),
so a human reviewing this slice sees the *guard* working before the *change
it guards* exists.

- Lint-gate: rework `checkPinAgreement` to exclude `CHANGELOG.md` and
  `openspec/backlog.md` from the general agreement scan, exclude
  `openspec/config.yaml` from the general sweep and instead assert its
  `openspec_version` against the agreed pin via a dedicated coupling check,
  extend the scanned directory set to include `.github/` and `.claude/`, and
  add the `@fission-ai/openspec@latest` absence sub-guard (D2, D3, D4)
- Lint-gate: inline self-test fixtures covering config-absent (failure leg
  1), config-present-but-wrong (failure leg 2), config-agrees (green case),
  the zero-pin-occurrences branch (unchanged behavior), `.github/`- and
  `.claude/`-sourced pin occurrences, and a stray `@latest` occurrence (D2,
  D3, D4)
- Tests: `node scripts/lint.mjs` run locally against the current,
  unmodified-pin repo tree — all checks including the reworked Check 1 must
  pass
- **Compute:** model=opus effort=high — rewrites lint control flow with new
  exclusion predicates, a new dedicated coupling assertion, and a new
  `@latest` sub-guard; getting the self-test fixtures to actually exercise
  every branch (not just the happy path) is the hardest reasoning in this
  change.
- Checkpoint: run `node scripts/lint.mjs` at the repo root; it exits 0 and
  the Check 1 self-test output shows all new fixture branches passing, with
  every hand-maintained pin site still reading `1.4.1`.

### Slice 2 — A QRSPI change stays CI-green from stage Q

**Deliverable:** `claude/commands/questions.md` now seeds
`openspec/changes/<id>/.openspec.yaml` (`schema: spec-driven`,
`skip_specs: true`) when it creates the change folder, and
`claude/commands/structure.md` deletes that marker after the architect
subagent writes `specs/`, staging the deletion alongside `proposal.md` and
`specs/` in the same stage-S commit. A change folder that exists between
stage Q and stage S (e.g. only `questions.md` present) now passes
`openspec validate --all` instead of failing on a missing `specs/`
directory. This is a deliberate gap: the pin is still `1.4.1` at the end of
this slice (Slice 3 flips it), so this slice's demoable surface is the
marker lifecycle itself, exercised against the current pin.

- Slash-command: `claude/commands/questions.md` step 3 seeds
  `.openspec.yaml` and adds it to the step's `git add` line (D1)
- Slash-command: `claude/commands/structure.md` deletes
  `openspec/changes/<id>/.openspec.yaml` after `specs/` is written and adds
  the deletion to its `git add` line so it lands in the stage-S commit (D1)
- Tests: none in `scripts/lint.mjs` (this lifecycle is command prose, not a
  static-checkable artifact) — verification is the runtime checkpoint below
- (human) Runtime-verification checkpoint: dev-install this working tree as
  the plugin (`claude --plugin-dir /workspaces/git/qrspi`), run
  `/qrspi:questions <throwaway-id>` against a disposable fixture change, and
  confirm `openspec/changes/<throwaway-id>/.openspec.yaml` exists containing
  `schema: spec-driven` / `skip_specs: true` and that
  `openspec validate <throwaway-id>` (at the still-`1.4.1` pin) passes with
  only `questions.md` + the marker present; then run `/qrspi:structure
  <throwaway-id>` through to `specs/` being written and confirm the marker
  file is gone and the deletion is staged in the same commit as
  `proposal.md`/`specs/`. Per this repo's CLAUDE.md, this is a live-session
  observation no static check can make — do not tick this box on a
  self-report.
- **Compute:** model=sonnet effort=medium — two coordinated command-prose
  edits with a clear seed/delete contract already fully specified in the
  delta spec; the reasoning load is in getting the `git add` staging lines
  and step ordering exactly right, not in novel design.
- Checkpoint: the `(human)` task above is observed and ticked Confirm-done
  before this slice is considered complete.

### Slice 3 — The pin reads 1.9.0 everywhere and both gates stay green

**Deliverable:** every hand-maintained `@fission-ai/openspec@<version>` site
(`claude/commands/init.md`, README, `CONTRIBUTING.md`, `.github/workflows/
ci.yml`, `claude/skills/openspec-workflow/SKILL.md`,
`.claude/skills/qrspi-dogfood/SKILL.md`) and `openspec/config.yaml`'s
`openspec_version` now read `1.9.0`; CI's `validate` invocation carries the
explicit `--strict` flag; the `ci-quality-gates` and `reference-example` base
specs (via this change's delta specs) no longer claim `--all` alone runs
strict; README's "Updating the pinned OpenSpec version" section is corrected
and gains a copy-pasteable CI `validate` job snippet; `CONTRIBUTING.md`'s
pin-coupling rule is clarified to name the release-cut commit. Running
`node scripts/lint.mjs` and `openspec validate --all --strict` both pass
against the fully-bumped tree — this is the slice where the change's
headline goal (the pin move itself) becomes true, made safe only because
Slices 1 and 2 already landed the guards it depends on.

- Lint-gate / kit-source: flip every hand-maintained pin site and
  `openspec/config.yaml` to `1.9.0` (D6)
- Lint-gate: add `--strict` to `.github/workflows/ci.yml`'s `validate` step
  invocation (D6)
- Template/doc: correct README's pin-update enumeration, add the
  copy-pasteable CI `validate` snippet as a new Check-1-scanned pin site,
  and clarify `CONTRIBUTING.md`'s pin-coupling language to the release-cut
  commit (D9)
- Tests: `node scripts/lint.mjs` (Check 1 agreement + `@latest`-absence +
  config-coupling, all now exercised against the real `1.9.0` tree) and
  `openspec validate --all --strict` (base specs + reference example + this
  change's own delta specs)
- **Compute:** model=sonnet effort=medium — wide surface area (many files)
  but each edit is a mechanical string replacement or a doc correction
  already fully dictated by the delta specs; no new control-flow reasoning.
- Checkpoint: `node scripts/lint.mjs` exits 0, `openspec validate --all
  --strict` exits 0, and `grep -rn "1\.4\.1"` across the hand-maintained
  pin-site set (excluding `CHANGELOG.md` history and the migration manifest's
  `find:` string) returns nothing.

### Slice 4 — A consumer on the previous release upgrades cleanly

**Deliverable:** `migrations/0.14.0.yaml` gains the pin-bump automated
`edit-file` step (`openspec/config.yaml`, `1.4.1` → `1.9.0`, idempotent via
`skip_if_contains`) and the two manual steps (update the consumer's own CI
`validate` invocation to `@1.9.0 ... --all --strict`; backfill the
`.openspec.yaml` marker into any of the consumer's own change folders
currently between stage Q and stage S), with the manifest's `summary`
extended to describe the pin bump. `CHANGELOG.md` gains an `## [Unreleased]`
entry. A consumer running `/qrspi:update` from the previous release walks
through the automated config edit, is gated by `AskUserQuestion` on both
manual steps, and ends on the `1.9.0` pin with a passing local
`openspec validate --all --strict`.

- Migration-manifest: extend `migrations/0.14.0.yaml`'s `automated` list
  with the `edit-file` pin-bump step and its `manual` list with the two
  consumer-facing steps; extend `summary` (D7)
- Kit-source: add the `## [Unreleased]` `CHANGELOG.md` entry recording the
  pin bump family, per this repo's CLAUDE.md versioning rule (no
  `plugin.json` bump in feature work)
- Tests: `node scripts/lint.mjs` Check 6 (migration-manifest schema:
  `version`/`summary`/`automated`/`manual` present, `edit-file` action only,
  `openspec/`-scoped `path`, non-empty `skip_if_contains`)
- (human) Runtime-verification checkpoint: dev-install this working tree as
  the plugin (`claude --plugin-dir /workspaces/git/qrspi`) against a
  throwaway consumer fixture (outside this repo, per CLAUDE.md) whose
  `openspec/.qrspi-version` marker and `openspec/config.yaml` are pinned to
  the pre-bump release; run `/qrspi:update` and confirm: the automated step
  rewrites `openspec/config.yaml` to `openspec_version: 1.9.0` without
  prompting, the walk stops at an `AskUserQuestion` gate for each of the two
  manual steps (CI-invocation update, marker backfill) with wording matching
  the manifest text, and after confirming both, the fixture's
  `openspec/.qrspi-version` marker is bumped and the printed `git commit`
  command is ready to run. Per this repo's CLAUDE.md, this is a live-session
  observation no static check can make — do not tick this box on a
  self-report.
- **Compute:** model=sonnet effort=low — mechanical manifest-YAML extension
  and a CHANGELOG line, both following an established, already-populated
  template in the same file.
- Checkpoint: the `(human)` task above is observed and ticked Confirm-done;
  `node scripts/lint.mjs` Check 6 passes against the extended manifest.
