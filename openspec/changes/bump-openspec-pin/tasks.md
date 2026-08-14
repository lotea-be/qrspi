# Tasks — bump-openspec-pin

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Check 1 is bump-ready while the pin still reads 1.4.1

**Compute:** model=opus effort=high — rewrites lint control flow with new
exclusion predicates, a new dedicated coupling assertion, and a new
`@latest` sub-guard; getting the self-test fixtures to actually exercise
every branch (not just the happy path) is the hardest reasoning in this
change.

- [x] 1.1 Rework `checkPinAgreement` in `scripts/lint.mjs` to exclude
  `CHANGELOG.md` and `openspec/backlog.md` from the general agreement scan
  (D2, D3, D4)
- [x] 1.2 Exclude `openspec/config.yaml` from the general sweep and instead
  assert its `openspec_version` against the agreed pin via a dedicated
  coupling check (D2, D3, D4)
- [x] 1.3 Extend the scanned directory set to include `.github/` and
  `.claude/` (D2, D3, D4)
- [x] 1.4 Add the `@fission-ai/openspec@latest` absence sub-guard (D2, D3, D4)
- [x] 1.5 Add inline self-test fixtures covering config-absent (failure leg
  1), config-present-but-wrong (failure leg 2), config-agrees (green case),
  the zero-pin-occurrences branch (unchanged behavior), `.github/`- and
  `.claude/`-sourced pin occurrences, and a stray `@latest` occurrence (D2,
  D3, D4)
- [x] 1.6 Test: run `node scripts/lint.mjs` locally against the current,
  unmodified-pin repo tree — all checks including the reworked Check 1 must
  pass
- [x] 1.7 Checkpoint: run `node scripts/lint.mjs` at the repo root; it exits
  0 and the Check 1 self-test output shows all new fixture branches passing,
  with every hand-maintained pin site still reading `1.4.1`.

## 2. A QRSPI change stays CI-green from stage Q

**Compute:** model=sonnet effort=medium — two coordinated command-prose
edits with a clear seed/delete contract already fully specified in the
delta spec; the reasoning load is in getting the `git add` staging lines
and step ordering exactly right, not in novel design.

- [x] 2.1 `claude/commands/questions.md` step 3: seed
  `openspec/changes/<id>/.openspec.yaml` (`schema: spec-driven`,
  `skip_specs: true`) when the change folder is created, and add it to the
  step's `git add` line (D1)
- [x] 2.2 `claude/commands/structure.md`: delete
  `openspec/changes/<id>/.openspec.yaml` after `specs/` is written and add
  the deletion to its `git add` line so it lands in the stage-S commit (D1)
- [x] 2.2a **Found during the slice-2 dogfood run** — move the marker deletion
  from `claude/commands/structure.md` (orchestrator, post-return) into
  `claude/agents/architect.md`, so it happens after `specs/` is written but
  **before** the architect's own `openspec validate <id> --strict`. At the
  1.9.0 pin the CLI hard-fails a change carrying both the marker and `specs/`
  (`skip_specs is set in .openspec.yaml but spec files exist under specs/`),
  and `architect.md` tells the architect to stop without emitting a final
  message on an unresolvable validate error — so stage S would have blocked on
  every change the moment slice 3 flipped the pin. Invisible at 1.4.1, where
  the marker is inert. `structure.md` now verifies removal and still stages the
  deletion; the delta spec and D1's rationale were corrected to match.
- [x] 2.3 Test: none in `scripts/lint.mjs` (this lifecycle is command prose,
  not a static-checkable artifact) — verification is the runtime checkpoint
  below
- [x] 2.4 (human) Runtime-verification checkpoint: dev-install this working
  tree as the plugin (`claude --plugin-dir /workspaces/git/qrspi`), run
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
- [x] 2.5 Checkpoint: the `(human)` task above is observed and ticked
  Confirm-done before this slice is considered complete. **Observed** in a
  `--plugin-dir` fixture session with bare `openspec` shimmed to 1.9.0: stage Q
  seeded the marker in the same commit as `questions.md`; stage S's commit
  carries `D .openspec.yaml` alongside `A proposal.md` / `A specs/…`, and the
  architect's strict validate passed. Counterfactual confirmed — restoring the
  marker into that same post-S tree reproduces the CLI failure.

## 3. The pin reads 1.9.0 everywhere and both gates stay green

**Compute:** model=sonnet effort=medium — wide surface area (many files)
but each edit is a mechanical string replacement or a doc correction
already fully dictated by the delta specs; no new control-flow reasoning.

- [x] 3.1 Flip every hand-maintained pin site (`claude/commands/init.md`,
  README, `CONTRIBUTING.md`, `.github/workflows/ci.yml`,
  `claude/skills/openspec-workflow/SKILL.md`,
  `.claude/skills/qrspi-dogfood/SKILL.md`) and `openspec/config.yaml`'s
  `openspec_version` to `1.9.0` (D6)
- [x] 3.1a **Blocker from slice 1** — in the same edit that hard-pins the two
  `@latest` refs, empty the `PIN_LATEST_GRANDFATHERED` ledger in
  `scripts/lint.mjs`. Slice 1's guard reports a ledger entry whose file no
  longer contains `@latest` as STALE and fails lint, so removing the refs
  without emptying the map reddens CI. This coupling is deliberate (the
  ledger is self-cleaning) but was discovered during slice 1, not planned.
- [x] 3.2 Add `--strict` to `.github/workflows/ci.yml`'s `validate` step
  invocation (D6)
- [x] 3.3 Correct README's "Updating the pinned OpenSpec version" section's
  pin-update enumeration and add the copy-pasteable CI `validate` snippet as
  a new Check-1-scanned pin site (D9). **From slice 1:** the enumeration
  currently names only three sites (`init.md`, README, `openspec/config.yaml`)
  while the guarded set is now **six** — also `CONTRIBUTING.md`,
  `.github/workflows/ci.yml`, and the two skills. List all six, or the next
  bump misses one and red-lines Check 1.
- [x] 3.4 Update the `ci-quality-gates` and `reference-example` base specs
  (via this change's delta specs) so they no longer claim `--all` alone
  runs strict, and clarify `CONTRIBUTING.md`'s pin-coupling rule to name the
  release-cut commit (D9). **From slice 1:** also correct
  `ci-quality-gates`' wording that `openspec/config.yaml` "**contributed** an
  `openspec_version` value" to the sweep — after task 1.2 it is excluded from
  the sweep and validated separately against the agreed pin. All four
  observable legs are unchanged, so this is wording drift, not behaviour
  drift, but the spec should describe the code that now exists.
- [x] 3.5 Test: run `node scripts/lint.mjs` (Check 1 agreement +
  `@latest`-absence + config-coupling, all now exercised against the real
  `1.9.0` tree)
- [x] 3.6 Test: run `openspec validate --all --strict` (base specs +
  reference example + this change's own delta specs)
- [x] 3.7 Checkpoint: `node scripts/lint.mjs` exits 0, `openspec validate
  --all --strict` exits 0, and `grep -rn "1\.4\.1"` across the
  hand-maintained pin-site set (excluding `CHANGELOG.md` history and the
  migration manifest's `find:` string) returns nothing.

## 4. A consumer on the previous release upgrades cleanly

**Compute:** model=sonnet effort=low — mechanical manifest-YAML extension
and a CHANGELOG line, both following an established, already-populated
template in the same file.

- [ ] 4.1 Extend `migrations/0.14.0.yaml`'s `automated` list with the
  pin-bump `edit-file` step (`openspec/config.yaml`, `1.4.1` → `1.9.0`,
  idempotent via `skip_if_contains`) (D7)
- [ ] 4.2 Extend `migrations/0.14.0.yaml`'s `manual` list with the two
  consumer-facing steps: update the consumer's own CI `validate` invocation
  to `@1.9.0 ... --all --strict`; backfill the `.openspec.yaml` marker into
  any of the consumer's own change folders currently between stage Q and
  stage S (D7)
- [ ] 4.3 Extend `migrations/0.14.0.yaml`'s `summary` to describe the pin
  bump (D7)
- [ ] 4.4 Add a `## [Unreleased]` `CHANGELOG.md` entry recording the pin
  bump family, per this repo's CLAUDE.md versioning rule (no `plugin.json`
  bump in feature work)
- [ ] 4.5 Test: run `node scripts/lint.mjs` Check 6 (migration-manifest
  schema: `version`/`summary`/`automated`/`manual` present, `edit-file`
  action only, `openspec/`-scoped `path`, non-empty `skip_if_contains`)
- [ ] 4.6 (human) Runtime-verification checkpoint: dev-install this working
  tree as the plugin (`claude --plugin-dir /workspaces/git/qrspi`) against a
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
- [ ] 4.7 Checkpoint: the `(human)` task above is observed and ticked
  Confirm-done; `node scripts/lint.mjs` Check 6 passes against the extended
  manifest.
