# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `git-host-and-remote-awareness` change.
> Documents that the command-level skill-set registry
> (`COMMAND_SKILL_SET_EXPECTED`) covers the `pr` and `archive` command stems'
> `git-host-workflow` load, mirroring the existing `idea` precedent.

## ADDED Requirements

### Requirement: Command skill-set registry covers pr and archive git-host-workflow loads
`scripts/skill-sets.mjs` MUST register `pr: ['git-host-workflow']` and
`archive: ['git-host-workflow']` in `COMMAND_SKILL_SET_EXPECTED`. The
`checkSkillSets` lint check (the same check that validates the `idea`
command's `backlog-writer` load) MUST assert that `claude/commands/pr.md`
and `claude/commands/archive.md` each contain a `Load skill git-host-workflow`
reference, reporting a `[skill-sets]` violation and exiting non-zero when
either command's body is missing the reference or the registry entry is
undeclared. No new Check function is introduced — this extends the existing
command-registry comparison introduced for the `idea` command.

#### Scenario: pr.md and archive.md both load git-host-workflow — check passes
- **WHEN** `claude/commands/pr.md` and `claude/commands/archive.md` each
  contain a `Load skill git-host-workflow` reference and
  `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports no `[skill-sets]` violation for either
  command stem.

#### Scenario: pr.md drops the skill load — check fails
- **WHEN** a contributor removes the `git-host-workflow` load reference from
  `claude/commands/pr.md` and `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports a `[skill-sets]` violation naming
  `claude/commands/pr.md` and a missing `git-host-workflow` skill, and
  `node scripts/lint.mjs` exits non-zero.

#### Scenario: archive.md drops the skill load — check fails
- **WHEN** a contributor removes the `git-host-workflow` load reference from
  `claude/commands/archive.md` and `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports a `[skill-sets]` violation naming
  `claude/commands/archive.md` and a missing `git-host-workflow` skill, and
  `node scripts/lint.mjs` exits non-zero.

#### Scenario: registry mirrors the idea command's precedent
- **WHEN** `scripts/skill-sets.mjs`'s `COMMAND_SKILL_SET_EXPECTED` map is
  read after this change ships
- **THEN** it contains three keys — `idea` (`['backlog-writer']`), `pr`
  (`['git-host-workflow']`), and `archive` (`['git-host-workflow']`) — using
  the identical registry shape and comparison logic for all three.
