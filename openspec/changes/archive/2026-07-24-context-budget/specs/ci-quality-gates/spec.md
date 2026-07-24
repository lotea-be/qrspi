# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the `context-budget` change.
> Adds two new lint checks: a per-agent skill-set allowlist assertion (Check 2 extension /
> `checkSkillSets`) and Check 12 (`checkOutputContracts`).

## ADDED Requirements

### Requirement: Lint job asserts each agent loads exactly its declared skill set via checkSkillSets
The CI `lint` job MUST include a `checkSkillSets` check (extension of Check 2 or
a sibling registered after Check 2) that maintains a hardcoded `SKILL_SET_EXPECTED`
map (agent stem → array of unconditional kit skill names, mirroring the existing
`READ_CONTRACT_EXPECTED` shape) and, for each of the seven stage agent files
(`claude/agents/researcher.md`, `questioner.md`, `designer.md`, `architect.md`,
`planner.md`, `implementer.md`, `reviewer.md`), harvests the skill names from the
agent's `Load skills` line and asserts that the harvested set (after filtering out
the conditional `<repo>-stack` cheatsheet, which is Glob-discovered and therefore
excluded from the registry) equals the declared set for that agent stem. The check
MUST report added skills (present in the agent but absent from the registry) and
missing skills (present in the registry but absent from the agent) separately, and
MUST exit non-zero on any mismatch.

#### Scenario: all seven agents match their registry entries
- **WHEN** every stage agent's `Load skills` line names exactly the skills in
  `SKILL_SET_EXPECTED` for its stem (after the conditional stack-cheatsheet is
  excluded) and `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports `OK` and does not contribute a non-zero exit.

#### Scenario: agent loads a skill not in its registry entry
- **WHEN** a contributor adds `Load skill openspec-workflow` to `claude/agents/planner.md`
  (not in the planner's `SKILL_SET_EXPECTED` entry) and `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports the added-but-undeclared skill for `planner.md`
  and `node scripts/lint.mjs` exits non-zero.

#### Scenario: agent drops a skill that is in its registry entry
- **WHEN** a contributor removes `context-hygiene` from `claude/agents/researcher.md`
  (which is in the researcher's `SKILL_SET_EXPECTED` entry) and
  `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports the missing-but-declared skill for `researcher.md`
  and `node scripts/lint.mjs` exits non-zero.

#### Scenario: conditional stack-cheatsheet is excluded from the comparison
- **WHEN** a stage agent's body contains a conditional Glob-based load of a
  `<repo>-stack` cheatsheet alongside its declared unconditional skills, and
  `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` does not flag the cheatsheet name as an undeclared
  skill, because the filter strips it before the set-equality compare.

### Requirement: Lint job asserts output-contract banner presence on all seven agents via Check 12
The CI `lint` job MUST include a Check 12 (`checkOutputContracts`) that reads each
of the seven QRSPI stage agent files (`claude/agents/researcher.md`, `questioner.md`,
`designer.md`, `architect.md`, `planner.md`, `implementer.md`, `reviewer.md`) and
asserts that each file contains at least one line matching the pattern
`/^>\s*\*\*Output contract\*\*/`. The check MUST report a violation for any agent
file that lacks the banner and MUST exit non-zero. Check 12 MUST be registered in
`scripts/lint.mjs` after Check 11 using the same dependency-free ESM pattern
(async function pushing to `errors[]`, `process.stdout.write('Check 12: ...')`
label in `main()`).

#### Scenario: all seven agents carry the output-contract banner
- **WHEN** every stage agent file contains a line beginning with
  `> **Output contract**` and `node scripts/lint.mjs` is run
- **THEN** Check 12 reports `OK` and does not contribute a non-zero exit.

#### Scenario: output-contract banner removed from an agent is caught
- **WHEN** a contributor edits `claude/agents/implementer.md` and deletes the
  `> **Output contract**` line, and `node scripts/lint.mjs` is run
- **THEN** Check 12 reports a violation for `implementer.md` and
  `node scripts/lint.mjs` exits non-zero.

#### Scenario: banner with wrong formatting does not satisfy Check 12
- **WHEN** an agent file contains `**Output contract**:` (leading `>` absent)
  instead of `> **Output contract**` and `node scripts/lint.mjs` is run
- **THEN** Check 12 reports a violation for that agent, because the line does
  not match `/^>\s*\*\*Output contract\*\*/`.
