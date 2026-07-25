# compute-selection Specification

## Purpose
Unified `**Compute:**` annotation grammar for per-slice model selection and
per-stage effort configuration, replacing the former `**Model:**` annotation.
Introduced by the `per-slice-compute-knobs` change.

## Requirements

### Requirement: Compute annotation grammar uses key=value tokens with model= required
The system MUST represent per-slice compute intent as a single `**Compute:**`
line using space-separated `key=value` tokens: `model=<alias>` (required) and
`effort=<low|medium|high>` (optional), followed by an optional `— <rationale>`
tail. No `thinking=` field is included in the grammar. The `model=` alias set
is `{sonnet, opus}`. An omitted `effort=` token means "inherit from the agent's
frontmatter default"; it MUST NOT be expressed as a sentinel like
`effort=default`.

#### Scenario: well-formed Compute line in slices.md
- **WHEN** the architect writes `- **Compute:** model=sonnet effort=medium — boilerplate entity` in a `### Slice N` block of `slices.md`
- **THEN** the line is a valid `**Compute:**` annotation: `model=` is present and uses a known alias, `effort=` is present and uses a known value.

#### Scenario: model= required, effort= optional
- **WHEN** the architect writes `- **Compute:** model=opus — first real-time hub` (no `effort=`) in `slices.md`
- **THEN** the annotation is valid; the absent `effort=` token means the implementer inherits the agent's frontmatter `effort:` default.

#### Scenario: thinking= field is not part of the grammar
- **WHEN** any QRSPI artifact, skill, or command is read
- **THEN** no `thinking=` token appears in any `**Compute:**` line or in the grammar description, because thinking is not controllable per subagent.

### Requirement: Two structural forms of the Compute line are kept and documented
The system MUST keep two structural forms of the `**Compute:**` line and MUST
document both forms in the templates and in the `vertical-slice` skill: a `-`
list bullet in `slices.md` (`- **Compute:** model=… effort=… — …`) and a bare
bold line in `tasks.md` (no `-` prefix: `**Compute:** model=… effort=… — …`).
The distinction is dictated by each file's shape and MUST NOT be unified.

#### Scenario: slices.md uses the dash-bullet form
- **WHEN** `openspec/changes/<id>/slices.md` is read after the change ships
- **THEN** the compute annotation inside each `### Slice N` block appears as a `-` list bullet starting with `- **Compute:**`.

#### Scenario: tasks.md uses the bare bold form
- **WHEN** `openspec/changes/<id>/tasks.md` is read after the change ships
- **THEN** the compute annotation under each `## N.` slice group appears as a bare bold line starting with `**Compute:**` (no leading `-`).

#### Scenario: vertical-slice skill documents both forms
- **WHEN** `claude/skills/vertical-slice/SKILL.md` is read
- **THEN** the "Per-slice model selection" heading (or its replacement) documents the `**Compute:**` grammar and explicitly names both the `-` bullet form for `slices.md` and the bare bold form for `tasks.md`.

### Requirement: All seven agent frontmatter files carry an effort: field
The system MUST add an `effort:` frontmatter key to each of the seven QRSPI
stage agent files (`claude/agents/researcher.md`, `questioner.md`,
`designer.md`, `architect.md`, `planner.md`, `implementer.md`, `reviewer.md`).
The value MUST be `high` for opus-default agents (designer, implementer) and
`medium` for sonnet-default agents (questioner, researcher, architect, planner,
reviewer). No `budget:` or `thinking:` frontmatter field is added.

#### Scenario: designer agent carries effort: high
- **WHEN** `claude/agents/designer.md` frontmatter is read
- **THEN** it contains `effort: high` (the designer is an opus-default stage).

#### Scenario: architect agent carries effort: medium
- **WHEN** `claude/agents/architect.md` frontmatter is read
- **THEN** it contains `effort: medium` (the architect is a sonnet-default stage).

#### Scenario: no thinking or budget frontmatter field is added
- **WHEN** any of the seven stage agent files is read after the change ships
- **THEN** none of the agent frontmatter sections contains a `thinking:` or `budget:` key.

### Requirement: Implement command threads per-slice model= from tasks.md and drops the self-halt
The system MUST update `claude/commands/implement.md` so that, for each
slice, it reads the `model=` value from the next un-ticked slice's `**Compute:**`
line in `tasks.md` and passes it as the per-invocation `model` parameter on the
Agent tool call. The implementer self-halt (a check where the implementer
verifies the running model and halts on mismatch) MUST be removed; the
orchestrator's spawn-time gate is the sole enforcement point.

#### Scenario: implement reads model= from the Compute line
- **WHEN** `claude/commands/implement.md` is running and the next un-ticked slice in `tasks.md` has `**Compute:** model=opus — first real-time hub`
- **THEN** the implementer subagent is spawned with `model: opus` on the Agent call.

#### Scenario: self-halt is absent from the implementer
- **WHEN** `claude/agents/implementer.md` is read after the change ships
- **THEN** no instruction asks the implementer to check its running model and halt on mismatch; the spawn-time `model:` parameter is the sole gate.

#### Scenario: implement command notes that effort is per-stage, not per-slice
- **WHEN** `claude/commands/implement.md` is read
- **THEN** the prose or a comment notes that the `effort=` token on the `**Compute:**` line documents per-stage intent and is honored via the implementer agent's frontmatter `effort:`, not as a per-invocation parameter (no such parameter exists on the Agent tool).

### Requirement: Every non-implement stage command threads its agent's frontmatter model: on the Agent call
The system MUST update each of the seven non-implement stage commands
(`claude/commands/questions.md`, `research.md`, `design.md`, `structure.md`,
`slices.md`, `plan.md`, `pr.md`) so that each command passes its agent's
frontmatter `model:` value explicitly as the `model` parameter on the Agent
tool call. Effort is enforced by the agent frontmatter `effort:` field itself
(set in the requirement above) and is not passed as a per-invocation parameter.

#### Scenario: structure command threads frontmatter model on Agent call
- **WHEN** `claude/commands/structure.md` is read
- **THEN** the Agent tool call that spawns the architect subagent includes an explicit `model:` parameter sourced from the architect agent's frontmatter `model:` value.

#### Scenario: all seven non-implement commands are updated
- **WHEN** each of the seven non-implement stage command files is read after the change ships
- **THEN** each Agent tool call targeting a QRSPI stage subagent includes an explicit `model:` parameter; no non-implement stage command spawns its agent without a `model:` parameter.

### Requirement: followup.md supports an optional inline (compute: …) spec and wires an explicit default model
The system MUST update `claude/commands/followup.md` so that: (a) the
orchestrator parses an optional inline `(compute: model=… effort=…)` token from
the follow-up description, using the same `key=value` grammar as D1, and when
present threads the parsed `model=` value as the per-invocation `model`
parameter on the FIX MODE Agent call; and (b) when the inline spec is absent,
the orchestrator passes an explicit `model: sonnet` on the FIX MODE Agent call
as the wired default, so prose and wiring agree. The `thinking=` field MUST NOT
appear in the `(compute: …)` grammar.

#### Scenario: inline (compute: model=opus) overrides the default
- **WHEN** a follow-up description contains `(compute: model=opus)` and `/qrspi:followup <id>` is invoked
- **THEN** the FIX MODE implementer subagent is spawned with `model: opus` on the Agent call.

#### Scenario: absent inline spec uses explicit sonnet default
- **WHEN** a follow-up description contains no `(compute: …)` token and `/qrspi:followup <id>` is invoked in FIX MODE
- **THEN** the FIX MODE implementer subagent is spawned with `model: sonnet` on the Agent call (not inheriting the frontmatter `model: opus`).

#### Scenario: (compute: model=opus effort=high) with effort token is parsed
- **WHEN** a follow-up description contains `(compute: model=opus effort=high)`
- **THEN** the orchestrator threads `model: opus` on the Agent call; the `effort=high` token is noted but honored only via the implementer's frontmatter (no per-invocation effort parameter exists).

#### Scenario: prose and wiring now agree on the FIX MODE default
- **WHEN** `claude/commands/followup.md` is read after the change ships
- **THEN** both the prose description of the FIX MODE default ("default sonnet") and the Agent call's `model:` parameter both resolve to `sonnet`, eliminating the prior mismatch where frontmatter `model: opus` won.
