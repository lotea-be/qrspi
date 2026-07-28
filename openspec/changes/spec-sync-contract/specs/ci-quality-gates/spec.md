# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `spec-sync-contract` change. Adds Check 17 (helper-agent banner validation),
> Check 18 (MODIFIED scenario-count-drop static guard), and Check 19
> (authoritative-sync-delegator assertion).

## ADDED Requirements

### Requirement: Lint job validates helper-agent read-contract banners via Check 17
The CI `lint` job MUST include a Check 17 (`checkHelperAgentReadContracts`)
registered in `scripts/lint.mjs` after Check 16, using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 17: ...')` label in `main()`). Check 17 MUST
maintain a separate hardcoded `HELPER_READ_CONTRACT_EXPECTED` map — distinct from
the `READ_CONTRACT_EXPECTED` map used by Check 7, which is scoped to the nine
spawnable stage agents — and assert that each non-stage helper agent file listed
in that map carries a `> **Read contract**` banner whose `Reads:` field matches
the map entry. The initial map MUST contain exactly one key: `spec-syncer`, with
expected value matching the spec-syncer's approved read contract
(`specs/** (delta) and openspec/specs/** (main)`). Check 17 MUST NOT widen Check
7's nine-agent scope. Check 17 MUST carry an inline in-memory self-test following
Check 15's inline self-test pattern — it MUST run the banner-detection logic
against a synthetic in-memory fixture, assert the detector fires on a missing
banner, and push a Check 17 error to the errors array if the self-test fails.

#### Scenario: spec-syncer carries a matching banner — Check 17 passes
- **WHEN** `claude/agents/spec-syncer.md` carries a `> **Read contract**` banner
  whose `Reads:` field matches the `HELPER_READ_CONTRACT_EXPECTED` entry for
  `spec-syncer` and `node scripts/lint.mjs` is run
- **THEN** Check 17 reports `OK` and does not contribute a non-zero exit.

#### Scenario: banner missing from spec-syncer is caught
- **WHEN** `claude/agents/spec-syncer.md` lacks a `> **Read contract**` banner
  entirely and `node scripts/lint.mjs` is run
- **THEN** Check 17 reports a missing-banner violation for `spec-syncer` and
  exits non-zero.

#### Scenario: Check 17 does not flag stage agents
- **WHEN** Check 17 runs and `claude/agents/architect.md` is present with its
  read-contract banner
- **THEN** Check 17 does not evaluate `architect.md` (it is not in
  `HELPER_READ_CONTRACT_EXPECTED`) and does not flag it.

#### Scenario: inline self-test catches a broken Check 17 detector
- **WHEN** Check 17's inline self-test runs against a synthetic fixture string
  simulating a missing banner
- **THEN** the detector fires; if it fails to fire, a Check 17 error is pushed
  to the errors array so CI reports the regression.

### Requirement: Lint job guards against MODIFIED scenario-count reduction via Check 18
The CI `lint` job MUST include a Check 18 (`checkModifiedScenarioCounts`)
registered in `scripts/lint.mjs` after Check 17, using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 18: ...')` label in `main()`). For each delta spec
file at `openspec/changes/*/specs/**/spec.md`, Check 18 MUST parse every
`### Requirement:` block under `## MODIFIED Requirements`, count the number of
`#### Scenario:` blocks in the delta for that requirement, locate the
corresponding `### Requirement:` block in `openspec/specs/<capability>/spec.md`
(using the requirement title as the lookup key), count its scenarios, and flag a
violation if the delta count is lower than the base count. If the base capability
spec does not yet exist under `openspec/specs/**` (a new capability with no base
spec), the check MUST skip that requirement rather than flagging it. Check 18
MUST exit non-zero on any scenario-count reduction found.

#### Scenario: delta MODIFIED block with fewer scenarios is flagged
- **GIVEN** `openspec/specs/foo/spec.md` has requirement `Bar` with 3 scenarios,
  and a delta at `openspec/changes/some-change/specs/foo/spec.md` has a
  `## MODIFIED Requirements` block for `Bar` with only 2 scenarios
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 18 reports a violation naming the change, the requirement
  `Bar`, and the counts `3 -> 2`, and exits non-zero.

#### Scenario: delta MODIFIED block with equal scenario count passes
- **GIVEN** `openspec/specs/foo/spec.md` has requirement `Bar` with 2 scenarios
  and the delta has a `## MODIFIED` block for `Bar` with 2 scenarios
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 18 reports no violation for that requirement.

#### Scenario: delta against a new (not-yet-created) base capability is skipped
- **GIVEN** a delta spec under `openspec/changes/some-change/specs/new-cap/spec.md`
  where `openspec/specs/new-cap/spec.md` does not exist
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 18 skips the MODIFIED blocks in that delta rather than
  flagging them, because there is no base spec to compare against.

#### Scenario: ADDED requirements are not evaluated by Check 18
- **GIVEN** a delta spec with requirements only under `## ADDED Requirements`
  and none under `## MODIFIED Requirements`
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 18 reports no violation, because the check applies only to
  `## MODIFIED Requirements` blocks.

### Requirement: Lint job asserts archive.md is the authoritative sync delegator via Check 19
The CI `lint` job MUST include a Check 19 (`checkAuthoritativeSyncDelegator`)
registered in `scripts/lint.mjs` after Check 18, using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 19: ...')` label in `main()`). Check 19 MUST
assert two static invariants: (a) `claude/commands/archive.md` contains a
reference to `qrspi:spec-syncer` (confirming it is the sync delegator); and (b)
no kit-owned file under `claude/commands/` or `claude/agents/` contains a
`subagent_type: general-purpose` spawn whose surrounding context indicates it is
performing delta-spec sync (detected by proximity to the string `sync` within
a span of lines). A violation of either invariant MUST cause Check 19 to report
an error and exit non-zero. This check guards against a future OpenSpec CLI
regeneration re-adding a `general-purpose` sync spawn in a kit-owned file.

#### Scenario: archive.md references qrspi:spec-syncer — sub-check (a) passes
- **WHEN** `claude/commands/archive.md` contains the string `qrspi:spec-syncer`
  and `node scripts/lint.mjs` is run
- **THEN** Check 19 sub-check (a) reports no violation.

#### Scenario: archive.md missing qrspi:spec-syncer reference is caught
- **WHEN** `claude/commands/archive.md` does not contain `qrspi:spec-syncer`
  and `node scripts/lint.mjs` is run
- **THEN** Check 19 sub-check (a) reports a violation ("archive.md must
  reference qrspi:spec-syncer as the sync delegator") and exits non-zero.

#### Scenario: general-purpose sync spawn re-added to a kit file is caught
- **GIVEN** a future CLI regeneration edits a kit-owned command or agent file
  to add `subagent_type: general-purpose` near a sync context
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 19 sub-check (b) flags the file and the violating line, and
  exits non-zero, preventing the ownership regression from merging silently.

#### Scenario: general-purpose in a non-sync context is not flagged
- **GIVEN** a kit-owned file contains `subagent_type: general-purpose` for a
  non-sync task (e.g., a research step) with no `sync`-related context nearby
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 19 does not flag that occurrence, because sub-check (b)
  requires both the `general-purpose` string and a sync-context indicator in
  proximity.
