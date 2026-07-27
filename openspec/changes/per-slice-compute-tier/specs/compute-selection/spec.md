# Spec — compute-selection

> Delta against `openspec/specs/compute-selection/spec.md` for the
> `per-slice-compute-tier` change. Makes `effort=` required and `model=`
> optional (default sonnet); adds `haiku` to the allowed model set; updates
> `implement.md` resolution to select a variant agent by effort; adds the
> haiku heuristic and orthogonal grammar docs to `vertical-slice`.

## MODIFIED Requirements

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

### Requirement: Implement command threads per-slice model= from tasks.md and drops the self-halt
The system MUST update `claude/commands/implement.md` so that, for each slice,
it reads both the `effort=` value (required; hard-stop if absent) and the
`model=` value (optional; defaults to `sonnet`) from the next un-ticked
slice's `**Compute:**` line in `tasks.md`, maps the effort value to a
`subagent_type` (`low` → `implementer-low`, `medium` → `implementer-medium`,
`high` → `implementer-high`), and spawns that variant via the Agent tool with
the resolved `model:` parameter. Both the main spawn site and the auto-mode
loop site in `implement.md` MUST be updated. The implementer self-halt MUST
remain removed; the orchestrator's spawn-time gate is the sole enforcement
point.

#### Scenario: implement reads effort= to select the variant agent
- **WHEN** `claude/commands/implement.md` is running and the next un-ticked slice in `tasks.md` has `**Compute:** effort=low model=haiku — version bump`
- **THEN** the implementer subagent `implementer-low` is spawned with `model: haiku` on the Agent call.

#### Scenario: implement defaults model to sonnet when model= is absent
- **WHEN** the next un-ticked slice's `**Compute:**` line is `effort=high` with no `model=` token
- **THEN** `implementer-high` is spawned with `model: sonnet` on the Agent call.

#### Scenario: missing effort= token triggers hard-stop in implement.md
- **WHEN** `claude/commands/implement.md` is running and the next un-ticked slice's `**Compute:**` line contains no `effort=` token
- **THEN** the orchestrator issues a hard-stop and does not spawn any implementer subagent.

#### Scenario: auto-mode loop in implement.md also resolves effort= and model= correctly
- **WHEN** `/qrspi:implement` runs in Full or Semi auto mode and advances to a second slice whose annotation is `effort=medium`
- **THEN** the auto-mode loop resolves the variant to `implementer-medium` and the model to `sonnet` (the default), and spawns accordingly.

## ADDED Requirements

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
