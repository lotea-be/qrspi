# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `tighten-stage-read-boundaries` change.
> Adds Check 7 (banner-keyed read-contract positive check) to the CI lint job.

## ADDED Requirements

### Requirement: Lint job validates agent read-contract banners via Check 7
The CI `lint` job MUST include a Check 7 (`checkReadContracts`) that parses
each of the seven QRSPI stage agent files (`claude/agents/researcher.md`,
`questioner.md`, `designer.md`, `architect.md`, `planner.md`,
`implementer.md`, `reviewer.md`) for their read-contract banner's `Reads:`
field and asserts it equals the agent's expected row in the approved read-matrix.
This is a banner-keyed POSITIVE check (not a free-prose forbidden-token scan):
it extracts the `Reads:` value from the terse banner block and compares it
against a hardcoded expected value per agent. The check MUST handle the
architect's two-mode contract (stage S: `design.md` only; stage V:
`proposal.md + specs/`) and MUST special-case the reviewer as "full
change-folder by design." The check MUST NOT flag `/qrspi:update`,
`qrspi-update`, or any non-stage-agent file. Check 7 MUST be registered in
`scripts/lint.mjs` after Check 6 using the same dependency-free ESM pattern
(async function pushing to `errors[]`, `process.stdout.write('Check 7: ...')`)
label in `main()`).

#### Scenario: agent banner Reads field matches matrix row
- **WHEN** all seven stage agent files carry read-contract banners whose
  `Reads:` fields match the approved read-matrix rows and `node scripts/lint.mjs`
  is run
- **THEN** Check 7 reports `OK` and exits 0.

#### Scenario: architect banner with wrong Reads field is caught
- **WHEN** `claude/agents/architect.md`'s read-contract banner has a `Reads:`
  field that names `questions.md` (forbidden at both S and V) and
  `node scripts/lint.mjs` is run
- **THEN** Check 7 reports a violation for the architect agent and exits
  non-zero.

#### Scenario: banner missing from an agent file is caught
- **WHEN** one of the seven agent files lacks a read-contract banner entirely
  and `node scripts/lint.mjs` is run
- **THEN** Check 7 reports a missing-banner violation for that agent and
  exits non-zero.

#### Scenario: update command and skill are not flagged by Check 7
- **WHEN** `claude/commands/update.md` and `claude/skills/qrspi-update/SKILL.md`
  do not carry read-contract banners and `node scripts/lint.mjs` is run
- **THEN** Check 7 does not flag either file, because they are not Q→PR stage
  agents.
