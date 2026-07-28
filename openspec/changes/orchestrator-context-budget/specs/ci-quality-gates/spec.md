# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `orchestrator-context-budget` change.
> Adds a new lint check that asserts the `context-budget-gate` embed line is
> present in all 11 gate-scoped command files (mirrors Check 9).

## ADDED Requirements

### Requirement: Lint job asserts context-budget-gate embed in 11 command bodies via BUDGET_GATE_COMMAND_STEMS
The CI `lint` job MUST include a `checkBudgetGateEmbed` check (registered in
`scripts/lint.mjs` after Check 9, following the same dependency-free ESM pattern
with an `async` function pushing to `errors[]` and a labelled
`process.stdout.write` line in `main()`) that reads each of the 11 gate-scoped
QRSPI command files (`claude/commands/questions.md`, `research.md`, `design.md`,
`structure.md`, `slices.md`, `plan.md`, `implement.md`, `pr.md`, `followup.md`,
`archive.md`) and asserts that each body contains an inline load reference to
skill `context-budget-gate`. The list of 11 command stems MUST be hardcoded in a
constant named `BUDGET_GATE_COMMAND_STEMS` so that a future command added without
the embed fails lint rather than being silently excluded. The three excluded
commands (`status.md`, `update.md`, `retro.md`) MUST NOT be in the constant.
The check MUST require the inline form (the command file names
`context-budget-gate` directly on its own load line); transitive-only embedding
MUST be flagged as a violation.

#### Scenario: all 11 command bodies carry the embed -- check passes
- **WHEN** every file in the 11-command set contains an inline `context-budget-gate`
  load reference and `node scripts/lint.mjs` is run
- **THEN** `checkBudgetGateEmbed` reports `OK` and does not contribute a
  non-zero exit.

#### Scenario: one command body drops the embed -- check fails
- **WHEN** a contributor edits `claude/commands/plan.md` and removes the
  `context-budget-gate` load line, and `node scripts/lint.mjs` is run
- **THEN** `checkBudgetGateEmbed` reports a violation naming `plan.md` and
  `node scripts/lint.mjs` exits non-zero.

#### Scenario: new gate-scoped command added without the embed -- check fails
- **WHEN** a contributor adds a new command file that is in `BUDGET_GATE_COMMAND_STEMS`
  but omits the `context-budget-gate` load line, and `node scripts/lint.mjs` is run
- **THEN** `checkBudgetGateEmbed` reports a violation for the new command file
  and exits non-zero.

#### Scenario: excluded command does not need the embed -- check does not flag it
- **WHEN** `claude/commands/status.md` carries no `context-budget-gate` load
  line and `node scripts/lint.mjs` is run
- **THEN** `checkBudgetGateEmbed` does not flag `status.md`, because it is not
  in `BUDGET_GATE_COMMAND_STEMS`.

#### Scenario: transitive-only reference does not satisfy the check
- **WHEN** a command body does not name `context-budget-gate` directly but
  reaches the gate via another skill, and `node scripts/lint.mjs` is run
- **THEN** `checkBudgetGateEmbed` reports a violation for that command, because
  the inline form is required.
