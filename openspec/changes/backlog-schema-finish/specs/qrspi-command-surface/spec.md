# Spec — qrspi-command-surface

> Delta against `openspec/specs/qrspi-command-surface/spec.md` for the `backlog-schema-finish` change.
> Adds the /qrspi:idea helper command with README documentation, no-embed policy, and skill-set registration.

## ADDED Requirements

### Requirement: /qrspi:idea MUST be a main-loop helper command for idea capture
The system MUST ship `claude/commands/idea.md` as a QRSPI helper command accessible
via `/qrspi:idea`. The command MUST run on the main-loop orchestrator (no `agent:`
frontmatter) so that `AskUserQuestion` gates are reachable for the interview flow.
The command MUST accept an optional free-text seed argument (`/qrspi:idea <one-line
intent>`), then run a short interactive interview: (1) derive/confirm a kebab-case
slug, (2) dedup against existing rows by intent (read `openspec/backlog.md`, show
near-matches, offer proceed/abort), (3) propose a P-band and `## Ideas` placement
via `AskUserQuestion` (always interactive — no positional band argument), (4) prompt
for the one-sentence `**Shape:**` interactively. The command MUST delegate row
construction and staging to the shared `backlog-writer` skill (D11) rather than
embedding the grammar inline. No `**Shape:** TBD` placeholder is allowed; the shape
prompt MUST be interactive so the row is Check-22-valid on capture.

#### Scenario: /qrspi:idea with a seed runs the dedup and interview flow
- **WHEN** a user invokes `/qrspi:idea "add a usage telemetry dashboard"` in a
  repo with `openspec/backlog.md` present
- **THEN** the command reads the backlog, shows near-matches, offers proceed/abort,
  then interactively proposes a P-band via `AskUserQuestion`, prompts for a
  one-sentence shape, and delegates row construction to `backlog-writer`.

#### Scenario: /qrspi:idea without a seed still runs the interview
- **WHEN** a user invokes `/qrspi:idea` with no argument
- **THEN** the command prompts for the intent (no seed), then follows the same
  dedup and interview flow.

#### Scenario: /qrspi:idea produces a Check-22-valid idea row
- **WHEN** the interview completes and the row is staged
- **THEN** the resulting `### <slug> — \`idea\` · **P<n>**` row carries both
  `**Why:**` and `**Shape:**` fields with real em-dash and middle-dot, and
  `node scripts/lint.mjs` (Check 22) reports no violation for the new row.

### Requirement: /qrspi:idea MUST be documented in the README helpers listing
The system MUST add `/qrspi:idea` to the README's existing helpers listing (the
same section or line that documents `status`, `update`, `archive`, `init`, `stack`,
and similar helper commands) in the same change that ships `claude/commands/idea.md`.
The entry MUST satisfy Check 4 (both directions: the command file must exist and
`README.md` must reference it). This update MUST be made in the same commit as the
command file, per the CLAUDE.md rule on README currency.

#### Scenario: README lists /qrspi:idea in the helpers listing
- **WHEN** `README.md` is read after this change ships
- **THEN** `/qrspi:idea` appears in the helpers section with a brief description
  of its purpose (one-command idea capture).

#### Scenario: lint Check 4 passes for /qrspi:idea
- **WHEN** `node scripts/lint.mjs` is run after `claude/commands/idea.md` and
  the README update land
- **THEN** Check 4 reports no undocumented command file and no stale README entry
  for `/qrspi:idea`.

### Requirement: /qrspi:idea MUST NOT carry the version-check or budget-gate embeds
The system MUST ensure that `claude/commands/idea.md` does NOT contain an inline
load of skill `qrspi-version-check` and does NOT contain an inline load of skill
`context-budget-gate`. `/qrspi:idea` is a non-stage, non-chaining helper that does
not open or advance a QRSPI flow; it joins the excluded set for both Check 9 (which
enumerates exactly the nine stage commands) and `checkBudgetGateEmbed` (Check 10,
which enumerates exactly the ten gate-scoped commands). The hardcoded stem lists in
both checks MUST NOT include `idea`, so adding `idea.md` without the embeds MUST
NOT redden either check.

#### Scenario: /qrspi:idea command body carries no version-check embed
- **WHEN** `claude/commands/idea.md` is read
- **THEN** the file contains no load line for skill `qrspi-version-check`.

#### Scenario: Check 9 does not flag the absence of the embed in idea.md
- **WHEN** `node scripts/lint.mjs` runs Check 9 after this change ships
- **THEN** Check 9 does not flag `idea.md` for missing the version-check embed,
  because `idea` is not in the hardcoded nine-command stem set.

#### Scenario: checkBudgetGateEmbed does not flag the absence of the embed in idea.md
- **WHEN** `node scripts/lint.mjs` runs the budget-gate embed check after this
  change ships
- **THEN** the check does not flag `idea.md`, because `idea` is not in
  `BUDGET_GATE_COMMAND_STEMS`.

### Requirement: The Q/D/S deferred-work capture prose and followup P3 path MUST load backlog-writer
The system MUST update the questioner, designer, and architect agent files
(`claude/agents/questioner.md`, `designer.md`, `architect.md`) and
`claude/commands/followup.md` (P3 promote path) so that each loads skill
`backlog-writer` and follows its procedure when appending an idea row, rather than
embedding the grammar inline. The `scripts/skill-sets.mjs` SKILL_SET_EXPECTED map
MUST be updated to include `backlog-writer` in the skill set for each affected
agent. After migration, no agent or command file in the kit MUST embed an inline
copy of the frozen row grammar for the purpose of appending a row; all append sites
MUST delegate to the single `backlog-writer` skill.

#### Scenario: questioner agent loads backlog-writer
- **WHEN** `claude/agents/questioner.md` is read after this change ships
- **THEN** the agent's Load skills line (or equivalent) includes `backlog-writer`,
  and the deferred-work-capture prose references the skill procedure rather than
  embedding the grammar inline.

#### Scenario: designer agent loads backlog-writer
- **WHEN** `claude/agents/designer.md` is read after this change ships
- **THEN** the agent's Load skills line includes `backlog-writer` and the
  deferred-work prose delegates to the skill.

#### Scenario: architect agent loads backlog-writer
- **WHEN** `claude/agents/architect.md` is read after this change ships
- **THEN** the agent's Load skills line includes `backlog-writer` and the
  deferred-work prose delegates to the skill.

#### Scenario: followup P3 path loads backlog-writer
- **WHEN** `claude/commands/followup.md`'s P3 promote path is read after this
  change ships
- **THEN** it loads skill `backlog-writer` and follows its procedure to append
  the idea row, rather than embedding a fenced row example inline.

#### Scenario: Check 2 (checkSkillSets) passes after the skill-set registration update
- **WHEN** `scripts/skill-sets.mjs` has been updated to include `backlog-writer`
  in the expected skill set for the questioner, designer, and architect agents,
  and `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports `OK` for those agents and does not exit
  non-zero for an undeclared or missing skill.
