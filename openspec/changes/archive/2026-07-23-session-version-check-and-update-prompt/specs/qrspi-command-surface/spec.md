# Spec — qrspi-command-surface

> Delta against `openspec/specs/qrspi-command-surface/spec.md` for the
> `session-version-check-and-update-prompt` change.
> Adds a version-check preamble to each of the nine command bodies and a README
> skills-list entry for the new `qrspi-version-check` skill.

## ADDED Requirements

### Requirement: Each of the nine command bodies carries an inline version-check preamble as its first step
Each of the nine QRSPI command files MUST contain an inline load line for skill
`qrspi-version-check` positioned as the **first step** in the command body —
before run-mode establishment, before the precondition Glob, and before any
side-effecting work. The embed MUST name the skill directly (inline form), not
reach it solely via another shared skill or transitive include. The nine files
are `claude/commands/status.md`, `questions.md`, `research.md`, `design.md`,
`structure.md`, `slices.md`, `plan.md`, `implement.md`, and `pr.md`.

#### Scenario: status command carries version-check as first step
- **WHEN** `claude/commands/status.md` is read
- **THEN** the first substantive instruction in the command body is a load line
  for skill `qrspi-version-check`, appearing before the onboarding check, before
  any run-mode prompt, and before any Glob precondition.

#### Scenario: all eight stage commands carry version-check as first step
- **WHEN** any of the eight stage command files (`questions.md`, `research.md`,
  `design.md`, `structure.md`, `slices.md`, `plan.md`, `implement.md`, `pr.md`)
  is read
- **THEN** the first substantive instruction in that command body is a load line
  for skill `qrspi-version-check`, appearing before the run-mode AskUserQuestion
  and before the precondition Glob.

#### Scenario: version-check embed precedes run-mode in questions command
- **GIVEN** a user invokes `/qrspi:questions <id>` in a fresh session
- **WHEN** the command body begins executing
- **THEN** the `qrspi-version-check` skill is loaded and its check runs before
  the run-mode AskUserQuestion appears.

### Requirement: README documents the qrspi-version-check skill
The `README.md` MUST include `qrspi-version-check` in the skills list or
two-tool mapping table so that the skill is discoverable to users and
contributors. This entry MUST be added in the same change as the skill itself,
not deferred to a later PR.

#### Scenario: README lists qrspi-version-check in the skills section
- **WHEN** a reader opens `README.md` and looks at the skills listing
- **THEN** `qrspi-version-check` appears as an entry with a brief description
  of its purpose (session-start version comparison).

#### Scenario: sync generates a Copilot instructions file for the new skill
- **WHEN** `node sync-copilot.mjs` is run after `claude/skills/qrspi-version-check/SKILL.md`
  is added
- **THEN** `copilot/instructions/qrspi-version-check.instructions.md` is generated
  and the drift check (`node sync-copilot.mjs --check`) exits 0.
