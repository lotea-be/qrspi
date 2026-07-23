# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `session-version-check-and-update-prompt` change.
> Adds a new lint check (Check 9) asserting the `qrspi-version-check` embed line
> is present inline in all nine command bodies, and modifies the validate-job
> requirement to record that CI runs strict `openspec validate --all`.

## ADDED Requirements

### Requirement: Lint job asserts version-check embed in all nine command bodies via Check 9
The CI `lint` job MUST include a Check 9 (`checkVersionCheckEmbed`) that reads
each of the nine QRSPI command files (`claude/commands/status.md`,
`questions.md`, `research.md`, `design.md`, `structure.md`, `slices.md`,
`plan.md`, `implement.md`, `pr.md`) and asserts that each body contains an
inline reference to skill `qrspi-version-check` on a "follow skill" or "Load
skill" line. The list of nine command stems MUST be hardcoded in the check (as
Check 7's seven-agent map is hardcoded), so that a future command added without
the embed fails lint rather than being silently excluded. The check MUST require
the **inline** form (the command file names `qrspi-version-check` directly on
its own load line); transitive-only embedding is not sufficient and MUST be
flagged as a violation. Check 9 MUST be registered in `scripts/lint.mjs` after
Check 8 using the same dependency-free ESM pattern (async function pushing to
`errors[]`, `process.stdout.write('Check 9: ...')` label in `main()`).

#### Scenario: all nine command bodies carry the embed — check passes
- **WHEN** every file in the nine-command set contains an inline `qrspi-version-check`
  load reference and `node scripts/lint.mjs` is run
- **THEN** Check 9 reports `OK` and does not contribute a non-zero exit.

#### Scenario: one command body drops the embed — check fails
- **WHEN** a contributor edits `claude/commands/plan.md` and removes the
  `qrspi-version-check` load line, and `node scripts/lint.mjs` is run
- **THEN** Check 9 reports a violation naming `plan.md` and `node scripts/lint.mjs`
  exits non-zero.

#### Scenario: new command added without the embed — check fails
- **WHEN** a contributor adds a new stage command file to `claude/commands/` that
  is in the hardcoded nine-command set but omits the `qrspi-version-check` load
  line, and `node scripts/lint.mjs` is run
- **THEN** Check 9 reports a violation for the new command file and exits non-zero.

#### Scenario: transitive-only reference does not satisfy the check
- **WHEN** a command body does not name `qrspi-version-check` directly but
  reaches the check via another skill, and `node scripts/lint.mjs` is run
- **THEN** Check 9 reports a violation for that command, because the inline
  form is required.

## MODIFIED Requirements

### Requirement: Validate job runs openspec validate on the reference example
The CI `validate` job MUST run `npx @fission-ai/openspec@<pin> validate --all`
(strict) on `ubuntu-latest`, validating every base spec under `openspec/specs/`
and every active change under `openspec/changes/` — including the hand-authored
reference example — and failing the job if any item reports an error. Because
`--all` runs strict, it enforces rules the non-strict `openspec validate <id>`
skips (notably that each requirement's **first line** contains `MUST`/`SHALL`);
authoring stages therefore validate locally with `openspec validate <id>
--strict` to match this gate rather than discovering violations only in CI.

#### Scenario: all specs and active changes pass strict validation
- **WHEN** the validate CI job runs and every base spec and active change (the
  reference example included) is well-formed under strict rules
- **THEN** `openspec validate --all` exits 0 and the job passes.

#### Scenario: a spec violates the strict format
- **WHEN** any base spec or active change violates the spec-delta format — e.g.
  a `## MODIFIED` requirement title does not match a base requirement, or a
  requirement's first line lacks `MUST`/`SHALL` under strict validation
- **THEN** `openspec validate --all` exits non-zero and the job fails.
