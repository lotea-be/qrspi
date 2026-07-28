# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `unify-implement-paths-on-variants` change.
> Expands Check 7/12 coverage from 7 agents to 9 (adds three implementer
> variant keys, removes the base implementer key); adds Check 15 sub-check (e)
> asserting the base agent is absent from plugin.json; adds standalone Check 16
> asserting followup.md never spawns the bare implementer base stem.

## MODIFIED Requirements

### Requirement: Lint job validates agent read-contract banners via Check 7
The CI `lint` job MUST include a Check 7 (`checkReadContracts`) that parses
each of the nine spawnable QRSPI agent files — the six stage agents
(`claude/agents/researcher.md`, `questioner.md`, `designer.md`, `architect.md`,
`planner.md`, `reviewer.md`) plus the three implementer effort-variant agents
(`implementer-low.md`, `implementer-medium.md`, `implementer-high.md`) — for
their read-contract banner's `Reads:` field and asserts it equals the agent's
expected row in the approved read-matrix. The `READ_CONTRACT_EXPECTED` map MUST
NOT contain an `implementer` key (the base agent is deleted); it MUST contain
three keys `implementer-low`, `implementer-medium`, `implementer-high`, each
with expected value `Reads: tasks.md.` (identical to the value the former
`implementer` key carried). The check MUST handle the architect's two-mode
contract (stage S: `design.md` only; stage V: `proposal.md + specs/`) and MUST
special-case the reviewer as "full change-folder by design." The check MUST NOT
flag `/qrspi:update`, `qrspi-update`, or any non-stage-agent file. Check 7
MUST be registered in `scripts/lint.mjs` after Check 6 using the same
dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 7: ...')` label in `main()`).

#### Scenario: all nine agent files carry matching read-contract banners
- **WHEN** the six stage agents and the three implementer variant agents all
  carry read-contract banners whose `Reads:` fields match the approved
  read-matrix rows and `node scripts/lint.mjs` is run
- **THEN** Check 7 reports `OK` and exits 0.

#### Scenario: variant banner Reads field matches tasks.md expectation
- **WHEN** `claude/agents/implementer-medium.md` carries a read-contract banner
  with `Reads: tasks.md.` and `node scripts/lint.mjs` is run
- **THEN** Check 7 reports `OK` for that variant because the field matches the
  `implementer-medium` entry in `READ_CONTRACT_EXPECTED`.

#### Scenario: base implementer key absent from READ_CONTRACT_EXPECTED
- **WHEN** `claude/agents/implementer.md` has been deleted and
  `READ_CONTRACT_EXPECTED` no longer contains an `implementer` key, and
  `node scripts/lint.mjs` is run
- **THEN** Check 7 does NOT attempt to open or check `implementer.md` and
  reports `OK` for the nine-agent set.

#### Scenario: banner missing from a variant file is caught
- **WHEN** one of the three variant agent files lacks a read-contract banner
  entirely and `node scripts/lint.mjs` is run
- **THEN** Check 7 reports a missing-banner violation for that variant and
  exits non-zero.

### Requirement: Lint job asserts output-contract banner presence on all nine agents via Check 12
The CI `lint` job MUST include a Check 12 (`checkOutputContracts`) that reads
each of the nine spawnable QRSPI agent files — the six stage agents
(`claude/agents/researcher.md`, `questioner.md`, `designer.md`, `architect.md`,
`planner.md`, `reviewer.md`) plus the three implementer effort-variant agents
(`implementer-low.md`, `implementer-medium.md`, `implementer-high.md`) — and
asserts that each file contains at least one line matching the pattern
`/^>\s*\*\*Output contract\*\*/`. The check MUST report a violation for any
agent file that lacks the banner and MUST exit non-zero. The agent set iterated
by Check 12 MUST be derived from the same `READ_CONTRACT_EXPECTED` map as Check
7 (so both checks stay in sync when the map changes). Check 12 MUST be
registered in `scripts/lint.mjs` after Check 11 using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 12: ...')` label in `main()`).

#### Scenario: all nine agents carry the output-contract banner
- **WHEN** every stage agent and every implementer variant agent file contains a
  line beginning with `> **Output contract**` and `node scripts/lint.mjs` is run
- **THEN** Check 12 reports `OK` and does not contribute a non-zero exit.

#### Scenario: output-contract banner removed from a variant is caught
- **WHEN** a contributor edits `claude/agents/implementer-low.md` and deletes
  the `> **Output contract**` line, and `node scripts/lint.mjs` is run
- **THEN** Check 12 reports a violation for `implementer-low.md` and
  `node scripts/lint.mjs` exits non-zero.

### Requirement: Lint job validates implementer variant fleet coverage and consistency via Check 15
The CI `lint` job MUST include a Check 15 (`checkVariantAgents`) registered in
`scripts/lint.mjs` after Check 14, using the same dependency-free ESM pattern
(async function pushing to `errors[]`, `process.stdout.write('Check 15: ...')`
label in `main()`). Check 15 MUST assert all four drift-prevention invariants:
(a) Coverage: the set of `claude/agents/implementer-*.md` stems exactly equals
the registry constant `IMPLEMENTER_VARIANTS = ['implementer-low',
'implementer-medium', 'implementer-high']` — any missing or stray variant MUST
be flagged; (b) Core load: each variant's step-1 "Load skills" line (as
harvested by the Check 2b harvest logic) loads only `implementer-core` — the
allowed set is exactly `{implementer-core}`, and any other unconditional skill
on that line MUST be flagged; (c) Content-matches-name: each variant's
frontmatter `effort:` value MUST match its stem suffix (`implementer-low` →
`effort: low`, etc.) — a mismatch MUST be flagged; (d) Each variant is
registered in `plugin.json` — missing registration MUST be flagged; (e)
**Base absent**: `"./claude/agents/implementer.md"` MUST NOT be present in
`plugin.json`'s `agents` array — if it is found, Check 15 MUST report a
violation and exit non-zero. Check 15 MUST carry an inline in-memory self-test
that runs the detection logic against a synthetic fixture and asserts the
detector fires; if it fails, a Check 15 error is pushed to the errors array so
CI reports the regression.

#### Scenario: base implementer.md absent from plugin.json passes sub-check (e)
- **WHEN** `./claude/agents/implementer.md` does not appear in `plugin.json`'s
  `agents` array and `node scripts/lint.mjs` is run
- **THEN** Check 15 sub-check (e) reports no violation for the base-absent
  assertion.

#### Scenario: base implementer.md re-added to plugin.json is caught by sub-check (e)
- **WHEN** a contributor re-adds `"./claude/agents/implementer.md"` to
  `plugin.json`'s `agents` array and `node scripts/lint.mjs` is run
- **THEN** Check 15 sub-check (e) reports a violation ("base implementer must
  not be registered in plugin.json") and exits non-zero.

#### Scenario: all three variants registered in plugin.json pass sub-check (d)
- **WHEN** `plugin.json` lists all three variant agent paths and `node scripts/lint.mjs`
  is run
- **THEN** Check 15 sub-check (d) reports no violation.

#### Scenario: inline self-test catches a broken Check 15 detector
- **WHEN** Check 15's detection logic is invoked and the inline self-test runs
  against a synthetic fixture
- **THEN** the detector fires on the fixture violation; if it fails to fire, a
  Check 15 error is pushed to the errors array so CI reports the regression.

## ADDED Requirements

### Requirement: Lint job asserts followup.md never spawns the bare implementer base stem via Check 16
The CI `lint` job MUST include a standalone Check 16 (`checkFollowupStem`)
registered in `scripts/lint.mjs` after Check 15, using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 16: ...')` label in `main()`). Check 16 MUST read
`claude/commands/followup.md` and assert that the string `qrspi:implementer`
appears only in variant forms — i.e., is always immediately followed by `-low`,
`-medium`, or `-high`. The check MUST flag any occurrence of `qrspi:implementer`
that is NOT immediately followed by a `-` character (negative-lookahead:
`qrspi:implementer(?!-)`), covering BOTH the fenced `subagent_type:
qrspi:implementer` form in Agent-tool spawn blocks AND any inline prose mention
of `qrspi:implementer` in the command body. A single predicate applied over the
whole file content (not anchored to `subagent_type:` lines only) satisfies this.

#### Scenario: followup.md with only variant spawns passes Check 16
- **WHEN** `claude/commands/followup.md` contains `qrspi:implementer-medium`
  and `qrspi:implementer-low` but no bare `qrspi:implementer` occurrence, and
  `node scripts/lint.mjs` is run
- **THEN** Check 16 reports `OK` and does not contribute a non-zero exit.

#### Scenario: bare base stem in subagent_type: block is caught
- **WHEN** `claude/commands/followup.md` contains a fenced spawn block with
  `subagent_type: qrspi:implementer` (no suffix) and `node scripts/lint.mjs`
  is run
- **THEN** Check 16 reports a violation (bare base stem detected) and exits
  non-zero.

#### Scenario: bare base stem in prose is also caught
- **WHEN** `claude/commands/followup.md` contains an inline prose line such as
  "Spawn the `qrspi:implementer` subagent via the Agent tool" (no suffix) and
  `node scripts/lint.mjs` is run
- **THEN** Check 16 reports a violation for the prose mention, because the
  check scans the whole file and not only `subagent_type:` lines.

#### Scenario: future revert of followup.md to bare base stem is caught
- **WHEN** a contributor edits `claude/commands/followup.md` and reverts the
  FIX MODE spawn to `subagent_type: qrspi:implementer` (without a suffix), and
  `node scripts/lint.mjs` runs in CI
- **THEN** Check 16 flags the revert and prevents the dead-route reintroduction
  from merging silently.
