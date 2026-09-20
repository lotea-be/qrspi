# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the `lint-auto-mode-gate-coverage` change.
> Adds Check 26 (`checkChoreographyEmbed`): a new requirement asserting the `stage-choreography`
> skill-load line is present in all 8 choreography-carrying stage commands.

## ADDED Requirements

### Requirement: Lint job asserts stage-choreography embed in all 8 stage command bodies via Check 26
The CI `lint` job MUST include a Check 26 (`checkChoreographyEmbed`) registered
in `scripts/lint.mjs` after `checkChangelogTaskEmission` (Check 25), using the
same dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 26: ...')` label in `main()`). The check MUST read
each of the 8 choreography-carrying stage command files — `claude/commands/questions.md`,
`research.md`, `design.md`, `structure.md`, `slices.md`, `plan.md`, `implement.md`,
`pr.md` — and assert that each body contains the inline substring
`Load skill \`stage-choreography\` and follow its instructions exactly`
(no trailing period). The list of 8 command stems MUST be hardcoded in a constant
named `CHOREOGRAPHY_EMBED_COMMAND_STEMS` (NOT reusing `VERSION_CHECK_COMMAND_STEMS`,
which includes `status` and would produce a guaranteed false-positive; NOT reusing
`BUDGET_GATE_COMMAND_STEMS`, which includes `archive` and `followup`). The detection
MUST use whitespace-collapse (`text.replace(/\s+/g, ' ')`) then `.includes()` on the
collapsed text, because the embed line wraps mid-sentence in every command file.
The detection substring is stored in a constant named `CHOREOGRAPHY_EMBED_LINE`.
Check 26 MUST carry an inline self-test (a present-fixture that passes and an
absent-fixture that fires) run before file I/O, following the Check 24 self-test
pattern. If any self-test assertion fails, a `[choreography-embed] SELF-TEST FAILED: ...`
error MUST be pushed to `errors[]` and the function MUST return before any file I/O.
A violation MUST be reported as `[choreography-embed] claude/commands/<stem>.md: missing
inline stage-choreography embed line (expected to find: "...")`. The pass line MUST read
`OK: all N stage command(s) contain the stage-choreography embed line`.
The top-of-file check-enumeration comment block in `scripts/lint.mjs` MUST be updated
to include the Check 26 entry. The `CHOREOGRAPHY_EMBED_COMMAND_STEMS` constant
MUST carry a comment noting that `status`, `archive`, `followup`, `update`, and
`retro` are deliberately excluded.

#### Scenario: all 8 command bodies carry the embed — Check 26 passes
- **WHEN** every file in the 8-command choreography set contains an inline
  `Load skill \`stage-choreography\` and follow its instructions exactly`
  substring (after whitespace-collapse) and `node scripts/lint.mjs` is run
- **THEN** Check 26 reports `OK: all 8 stage command(s) contain the stage-choreography embed line`
  and does not contribute a non-zero exit.

#### Scenario: one command body drops the embed — Check 26 fails
- **WHEN** a contributor edits `claude/commands/plan.md` and removes the
  `stage-choreography` skill-load line, and `node scripts/lint.mjs` is run
- **THEN** Check 26 reports a `[choreography-embed]` violation naming `plan.md`
  and `node scripts/lint.mjs` exits non-zero.

#### Scenario: status.md is not in CHOREOGRAPHY_EMBED_COMMAND_STEMS — no false positive
- **WHEN** `claude/commands/status.md` carries no `stage-choreography` skill-load
  line (it runs no subagent, has no run-mode) and `node scripts/lint.mjs` is run
- **THEN** Check 26 does not evaluate `status.md` and reports no violation for it,
  because `status` is deliberately excluded from `CHOREOGRAPHY_EMBED_COMMAND_STEMS`.

#### Scenario: line-wrapped embed is detected correctly via whitespace-collapse
- **WHEN** `claude/commands/questions.md` contains the choreography skill-load
  sentence split across two source lines (as all 8 commands do), and
  `node scripts/lint.mjs` is run
- **THEN** Check 26 collapses whitespace before the `.includes()` check and
  correctly detects the embed, reporting no violation.

#### Scenario: self-test absent-fixture fires before file I/O
- **WHEN** Check 26's inline self-test runs a synthetic command body that contains
  the version-check and budget-gate embed lines but NOT the choreography embed line
- **THEN** the detector fires on the absent-fixture; if it fails to fire, a
  `[choreography-embed] SELF-TEST FAILED` error is pushed to `errors[]` and the
  function returns early before any file I/O.

#### Scenario: self-test present-fixture passes before file I/O
- **WHEN** Check 26's inline self-test runs a synthetic command body that contains
  the choreography embed line (with line-wrapping, to exercise the collapse path)
- **THEN** the detector passes the present-fixture; if it fires on the
  present-fixture, a `[choreography-embed] SELF-TEST FAILED` error is pushed to
  `errors[]` and the function returns early.

#### Scenario: Check 26 does not renumber any existing check
- **WHEN** `node scripts/lint.mjs` is run after this change ships
- **THEN** Checks 1-25 retain their existing label strings, and the new
  `process.stdout.write('Check 26: ...')` banner is the sole addition to
  `main()`; no existing check output label changes.
