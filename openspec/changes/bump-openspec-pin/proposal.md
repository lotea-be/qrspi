# Proposal — bump-openspec-pin

> Stage S of QRSPI. Generated 2026-08-14.

## Why

The kit pins `@fission-ai/openspec` at `1.4.1` while the CLI has moved on to
`1.9.0` — the pin the public v1.0.0 will freeze on (Tier 1 of the road-to-1.0
runway). Landing on `1.9.0` unconditionally requires absorbing two confirmed
behavioural breaks discovered during design: `validate --all` now resolves
change scope by directory existence, which fails every QRSPI change folder
between stages Q and S; and `ci-quality-gates` currently claims CI validation
is strict when v1.7.0 demoted that guarantee outside the `--strict` flag. This
run also folds in the three bundled backlog rows that touch the same two
surfaces (Check 1's pin-agreement scan and the hand-maintained pin sites), so
the family ships together rather than reopening the same surfaces four times.

## What Changes

- Bump every hand-maintained `@fission-ai/openspec@<version>` site
  (`init.md`, README, CONTRIBUTING.md, CI `ci.yml`, both skills' `@latest`
  refs) and `openspec/config.yaml`'s `openspec_version` to `1.9.0`.
- Seed a transient `openspec/changes/<id>/.openspec.yaml` marker at stage Q
  (`claude/commands/questions.md`) and delete it at stage S
  (`claude/commands/structure.md`), so `validate --all` stays green for a
  change folder that has not yet reached `specs/` (D1).
- Rework lint Check 1 (`checkPinAgreement`): exclude narration surfaces
  (`CHANGELOG.md`, `openspec/backlog.md`) and `openspec/config.yaml` (which
  gets its own dedicated coupling assertion) from the general agreement scan;
  extend the scanned directory set to `.github/` and `.claude/`; add an
  `@fission-ai/openspec@latest` absence sub-guard (D2-D4).
- Add `--strict` to CI's `validate` invocation and correct the
  `ci-quality-gates` and `reference-example` requirements that currently
  claim `--all` alone runs strict (D6).
- Fold the pin-bump migration steps (an automated `config.yaml` edit plus two
  manual consumer-side steps) into the existing unreleased
  `migrations/0.14.0.yaml`, per the human's binding OQ1 answer (D7).
- Correct README's "Updating the pinned OpenSpec version" enumeration and
  publish a copy-pasteable CI `validate` job snippet (itself a new,
  Check-1-scanned pin site) so the consumer-side manual CI step is
  checkable by diff, per the human's binding OQ3 answer; clarify
  `CONTRIBUTING.md`'s pin-coupling rule to say the bump lands at the
  **release** that ships the pin change, not the feature-work commit (D9).

## Capabilities

### New Capabilities
- _none_

### Modified Capabilities
- `ci-quality-gates`: `checkPinAgreement` (Check 1) gains narration/config
  exclusions, the `.github/`/`.claude/` scan, and the `@latest` absence
  sub-guard; the CI `validate` job invocation and its requirement gain the
  explicit `--strict` flag — needs a delta spec.
- `qrspi-command-surface`: `questions.md` and `structure.md` gain the
  `.openspec.yaml` marker seed/delete lifecycle — needs a delta spec.
- `kit-versioning`: `migrations/0.14.0.yaml` gains the pin-bump automated
  step and two manual steps, with its `summary` extended — needs a delta
  spec.
- `reference-example`: the CI validate command string in its requirement and
  scenario is updated to include `--strict` — needs a delta spec.
- `kit-governance`: the pin-coupling requirement is clarified to say the
  `plugin.json` version bump lands at the release-cut commit, not the
  feature-work commit that lands the pin edit — needs a delta spec.

## Impact

- Breaking changes: yes — a QRSPI change folder between stages Q and S would
  fail `validate --all` at the new pin without the `.openspec.yaml` marker
  fix (D1); this change ships the fix in the same run.
- Phases: single phase, four vertical slices (see `slices.md`); Tier 1 of the
  road-to-1.0 runway.
- Affected code / APIs / dependencies: `@fission-ai/openspec` dependency pin
  (`1.4.1` → `1.9.0`); `scripts/lint.mjs` Check 1; `.github/workflows/ci.yml`;
  `claude/commands/questions.md`, `structure.md`, `init.md`;
  `claude/skills/openspec-workflow/SKILL.md`,
  `.claude/skills/qrspi-dogfood/SKILL.md`; `migrations/0.14.0.yaml`;
  `openspec/config.yaml`; `README.md`; `CONTRIBUTING.md`; `CHANGELOG.md`;
  delta specs under `ci-quality-gates`, `qrspi-command-surface`,
  `kit-versioning`, `reference-example`, `kit-governance`.

## Out of scope

- Reconciling lint Check 18 / `spec-syncer`'s scenario-count guards with the
  CLI's 1.8/1.9 "every `####` child is a scenario" counting rule (no
  observed conflict today; design records this as a watch-item, not work).
- Adopting `validate --archived` (opt-in; requires auditing every archived
  change's `tasks.md` boxes first).
- Any generic "lint-directive comment" mechanism for per-line pin
  exemptions.
- Bumping `plugin.json` `version` in this change (moves only at a release
  cut, per CLAUDE.md and the kit-governance clarification above).

## Vertical slices (preview)

Ordering is chosen so no commit is ever transiently red (design Q16):

1. Check 1 is bump-ready, still at `1.4.1` (exclusions, `.github/`/`.claude/`
   scan, `@latest` sub-guard, reachable coupling branch).
2. A QRSPI change stays CI-green from stage Q (marker lifecycle in
   `questions.md` + `structure.md`).
3. The pin reads `1.9.0` everywhere and both gates are green (`--strict`
   added; base-spec deltas; README/CONTRIBUTING fixes).
4. A consumer on the previous release upgrades cleanly (manifest steps +
   CHANGELOG).
