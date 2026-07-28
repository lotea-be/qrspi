# compute-selection Specification

## Purpose
Unified `**Compute:**` annotation grammar for per-slice model selection and
per-stage effort configuration, replacing the former `**Model:**` annotation.
Introduced by the `per-slice-compute-knobs` change.
## Requirements
### Requirement: Compute annotation grammar uses key=value tokens with model= required
The system MUST represent per-slice compute intent as a single `**Compute:**`
line using space-separated `key=value` tokens: `effort=<low|medium|high>`
(required) and `model=<alias>` (optional, defaults to `sonnet` when omitted),
followed by an optional `— <rationale>` tail. No `thinking=` field and no
`profile=` field are included in the grammar. The `model=` alias set is
`{haiku, sonnet, opus}`. An absent `effort=` token MUST be treated as an
error by the orchestrator (hard-stop); an absent `model=` token defaults to
`sonnet`. The `effort=` and `model=` tokens are orthogonal — any combination
of the three effort levels and three model aliases is valid; no coupling
between effort and model is imposed by the grammar.

#### Scenario: well-formed Compute line with both tokens
- **WHEN** the architect writes `- **Compute:** effort=medium model=sonnet — boilerplate entity` in a `### Slice N` block of `slices.md`
- **THEN** the line is a valid `**Compute:**` annotation: `effort=` is present and uses a known value, `model=` is present and uses a known alias.

#### Scenario: effort= required, model= optional (model defaults to sonnet)
- **WHEN** the architect writes `- **Compute:** effort=low — mechanical rename` (no `model=`) in `slices.md`
- **THEN** the annotation is valid; the absent `model=` token means the orchestrator defaults to `sonnet` at spawn time.

#### Scenario: effort= absent causes hard-stop
- **WHEN** the orchestrator reads a `**Compute:**` line that contains `model=opus` but no `effort=` token while running `/qrspi:implement`
- **THEN** the orchestrator issues a hard-stop (does not spawn an implementer subagent) and reports that `effort=` is required.

#### Scenario: haiku is a valid model= alias
- **WHEN** the architect writes `- **Compute:** effort=low model=haiku — version-string bump across N files` in `slices.md`
- **THEN** the annotation is valid; `haiku` is a recognized alias in the allowed model set `{haiku, sonnet, opus}`.

#### Scenario: all nine effort x model combinations are independently reachable
- **WHEN** an author writes any combination of `effort=<low|medium|high>` and `model=<haiku|sonnet|opus>` on a `**Compute:**` line
- **THEN** the annotation is valid; the grammar imposes no coupling between effort level and model alias.

#### Scenario: thinking= and profile= fields are not part of the grammar
- **WHEN** any QRSPI artifact, skill, or command is read after the change ships
- **THEN** no `thinking=` or `profile=` token appears in any `**Compute:**` line or in the grammar description.

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
_normal_ slice, it reads both the `effort=` value (required; hard-stop if
absent from a slice's `**Compute:**` line) and the `model=` value (optional;
defaults to `sonnet`) from the next un-ticked slice's `**Compute:**` line in
`tasks.md`, maps the effort value to a `subagent_type` (`low` →
`implementer-low`, `medium` → `implementer-medium`, `high` →
`implementer-high`), and spawns that variant via the Agent tool with the
resolved `model:` parameter. For the _trivial / inline-plan_ path (no
`tasks.md`, user supplies a one-paragraph inline plan), the command MUST
explicitly spawn `qrspi:implementer-medium` with `model: sonnet` — this path
MUST NOT fall through to any base `qrspi:implementer` agent (which is deleted).
The missing-`effort=` hard-stop applies only to the normal slice path (a slice
with no `effort=` token is a planning gap); the trivial inline-plan path is
frictionless and carries no `effort=` requirement. Both the main spawn site and
the auto-mode loop site in `implement.md` MUST be updated. The implementer
self-halt MUST remain removed; the orchestrator's spawn-time gate is the sole
enforcement point.

#### Scenario: trivial inline-plan path spawns implementer-medium with sonnet
- **WHEN** `/qrspi:implement <id>` is invoked with no `tasks.md` and the user
  provides a one-paragraph inline plan
- **THEN** `qrspi:implementer-medium` is spawned with `model: sonnet` on the
  Agent call, without requiring an `effort=` token.

#### Scenario: trivial path does not hard-stop on absent effort=
- **WHEN** `/qrspi:implement <id>` is running on the trivial inline-plan path
  (no `tasks.md`)
- **THEN** the orchestrator does NOT issue a hard-stop for a missing `effort=`
  token; the hard-stop applies only to normal-slice `**Compute:**` lines in
  `tasks.md`.

#### Scenario: implement reads effort= to select the variant agent (normal path unchanged)
- **WHEN** `claude/commands/implement.md` is running and the next un-ticked
  slice in `tasks.md` has `**Compute:** effort=low model=haiku -- version bump`
- **THEN** the implementer subagent `implementer-low` is spawned with
  `model: haiku` on the Agent call.

#### Scenario: missing effort= token triggers hard-stop in implement.md (normal path unchanged)
- **WHEN** `claude/commands/implement.md` is running and the next un-ticked
  slice's `**Compute:**` line contains no `effort=` token (normal slice path)
- **THEN** the orchestrator issues a hard-stop and does not spawn any
  implementer subagent.

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
the follow-up description, using the same `key=value` grammar as the normal
slice path, and when `effort=` is present maps it to a variant subagent_type
(`low` → `qrspi:implementer-low`, `medium` → `qrspi:implementer-medium`,
`high` → `qrspi:implementer-high`); (b) when `effort=` is absent, the
orchestrator defaults to `qrspi:implementer-medium`; (c) when `model=` is
present in the inline spec, the parsed value is threaded as the per-invocation
`model` parameter on the FIX MODE Agent call; (d) when `model=` is absent, the
orchestrator passes an explicit `model: sonnet` on the FIX MODE Agent call as
the wired default, so prose and wiring agree. The `thinking=` field MUST NOT
appear in the `(compute: …)` grammar.

#### Scenario: inline (compute: effort=high model=opus) routes to implementer-high with opus
- **WHEN** a follow-up description contains `(compute: effort=high model=opus)`
  and `/qrspi:followup <id>` is invoked in FIX MODE (P1)
- **THEN** `qrspi:implementer-high` is spawned with `model: opus` on the Agent
  call.

#### Scenario: absent effort= token defaults to implementer-medium
- **WHEN** a follow-up description contains no `effort=` token in its
  `(compute: …)` spec (or has no `(compute: …)` at all) and `/qrspi:followup
  <id>` is invoked in FIX MODE (P1)
- **THEN** `qrspi:implementer-medium` is spawned, regardless of whether `model=`
  was parsed or defaulted.

#### Scenario: absent inline spec uses explicit sonnet default
- **WHEN** a follow-up description contains no `(compute: …)` token and
  `/qrspi:followup <id>` is invoked in FIX MODE (P1)
- **THEN** the FIX MODE implementer variant is spawned with `model: sonnet` on
  the Agent call.

#### Scenario: prose and wiring agree on the FIX MODE defaults
- **WHEN** `claude/commands/followup.md` is read after the change ships
- **THEN** both the prose description of the FIX MODE defaults and the Agent
  call's default `subagent_type` and `model:` parameter resolve to
  `qrspi:implementer-medium` and `sonnet` respectively.

### Requirement: vertical-slice skill documents haiku heuristic and orthogonal grammar
The system MUST update `claude/skills/vertical-slice/SKILL.md` so that: (a) the
existing `### Choosing model=sonnet vs model=opus` section is retitled
`### Choosing model=haiku vs sonnet vs opus` and extended with a `model=haiku`
band describing purely mechanical slices where haiku is appropriate and a
tie-break rule stating "when in doubt between haiku and sonnet, prefer
`sonnet`"; (b) the documented grammar for the `**Compute:**` annotation is
updated to reflect the orthogonal form (`effort=` required, `model=` optional
with default sonnet, allowed model set `{haiku, sonnet, opus}`); (c) no
`profile=` token appears anywhere in the skill prose.

#### Scenario: vertical-slice skill names haiku as a recognized model alias
- **WHEN** `claude/skills/vertical-slice/SKILL.md` is read after the change ships
- **THEN** `haiku` appears in the documented `model=` allowed-value set alongside `sonnet` and `opus`.

#### Scenario: vertical-slice skill describes when to choose haiku
- **WHEN** `claude/skills/vertical-slice/SKILL.md` is read
- **THEN** a heuristic section exists describing purely mechanical slice characteristics appropriate for `model=haiku` (e.g. adding one YAML field to every agent file, bumping a version string, adding one value to a lint constant, search-and-replace renames), and the section includes a tie-break rule preferring `sonnet` over `haiku` when in doubt.

#### Scenario: vertical-slice grammar comment reflects effort= required
- **WHEN** `claude/skills/vertical-slice/SKILL.md` is read
- **THEN** the annotation grammar description states that `effort=` is required and `model=` is optional with a default of `sonnet`.

### Requirement: openspec-templates tasks grammar comment uses the orthogonal form
The system MUST update the `**Compute:**` grammar placeholder or comment in
`openspec-templates/tasks.template.md` to reflect the orthogonal form:
`effort=<low|medium|high>` required, `model=<haiku|sonnet|opus>` optional with
default sonnet, and no `profile=` token. There is no `slices.template.md` in this
repo; the slices `**Compute:**` grammar lives in
`claude/skills/vertical-slice/SKILL.md` (covered by the requirement above).

#### Scenario: tasks.template.md grammar comment uses orthogonal form
- **WHEN** `openspec-templates/tasks.template.md` is read after the change ships
- **THEN** the `**Compute:**` grammar comment or placeholder reflects `effort=` as required and `model=` as optional/default sonnet; no `profile=` token is present.

