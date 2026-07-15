# qrspi-read-contracts Specification

## Purpose
TBD - created by archiving change tighten-stage-read-boundaries. Update Purpose after archive.
## Requirements
### Requirement: Per-stage read-matrix is the authoritative read contract
The system MUST define and enforce a read-matrix table specifying the exact set
of change-folder artifacts each of the seven QRSPI stage agents is permitted to
open. This matrix MUST be the sole authoritative declaration of per-agent read
scope and MUST be documented in `claude/skills/workflow/SKILL.md` in a
"Read Matrix" subsection near "The eight stages". The approved matrix rows are:
R (researcher) reads none; Q (questioner) reads backlog and templates, no
change-folder artifact; D (designer) reads `questions.md` and `research.md`;
S (architect) reads `design.md` only; V (architect) reads `proposal.md` and
`specs/`; P (planner) reads `slices.md` only; I (implementer) reads `tasks.md`
only; PR (reviewer) reads the full `changes/<id>/` folder by design.

#### Scenario: read-matrix table appears in workflow skill
- **WHEN** `claude/skills/workflow/SKILL.md` is read
- **THEN** it contains a "Read Matrix" table or subsection listing each of the
  seven stage agents and their permitted within-change reads, matching the
  approved matrix (R=none, Q=backlog+templates, D=questions+research,
  S=design.md, V=proposal+specs, P=slices.md, I=tasks.md, PR=full folder).

#### Scenario: architect two-mode contract is captured
- **WHEN** the read-matrix entry for the architect is read
- **THEN** it shows two rows or a two-mode notation distinguishing stage S
  (`design.md` only) from stage V (`proposal.md` + `specs/`).

#### Scenario: reviewer full-folder access is documented as intentional
- **WHEN** the read-matrix entry for the reviewer is read
- **THEN** it explicitly notes that the full-folder read is intentional (the
  reviewer is the final gate and needs the complete picture).

### Requirement: Every stage agent carries a uniform read-contract banner
Every QRSPI stage agent file MUST carry a terse, machine-readable read-contract
banner near the top of the file — all seven of them (researcher, questioner,
designer, architect, planner, implementer, reviewer). The banner MUST use the
fixed "Read contract" shape, and its `Reads:` field MUST match the agent's row
in the approved read-matrix exactly. The fixed shape is:

```
> **Read contract** — Reads: <set>. Never opens: <deny>; no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).
```

#### Scenario: architect banner shows two-mode Reads field
- **WHEN** `claude/agents/architect.md` is opened
- **THEN** the read-contract banner near the top of the file has a `Reads:`
  field that lists `design.md` for stage S and `proposal.md + specs/` for
  stage V, or an equivalent two-mode notation.

#### Scenario: reviewer banner documents full-folder as intentional
- **WHEN** `claude/agents/reviewer.md` is opened
- **THEN** the read-contract banner's `Reads:` field states the full
  `changes/<id>/` folder and notes this is intentional ("full change-folder
  by design") rather than implying oversight.

#### Scenario: researcher banner reflects whole-folder ban
- **WHEN** `claude/agents/researcher.md` is opened
- **THEN** the read-contract banner's `Reads:` field states "none (whole
  `changes/<id>/` folder banned)" or equivalent, and the `Never opens:` field
  covers the entire change folder.

### Requirement: Architect reads `design.md` only at stage S
`claude/agents/architect.md` stage-S step MUST instruct the architect to read
only `openspec/changes/<id>/design.md`. The agent MUST NOT name `questions.md`
or `research.md` in its stage-S read instruction. The "Open questions surfaced"
field in the S-only final message MUST be worded as "any assumption not answered
by `design.md` alone" — not as "not answered by `design.md`, `questions.md`, or
`research.md`".

#### Scenario: architect stage-S step does not name forbidden artifacts
- **WHEN** `claude/agents/architect.md` stage-S "What to do" step 2 is read
- **THEN** it lists only `design.md` as the artifact to read, and does not
  name `questions.md` or `research.md`.

#### Scenario: S-final-message Open-questions field is reworded
- **WHEN** the architect's S-only final message template in `architect.md` is read
- **THEN** the "Open questions surfaced" field description says "not answered by
  `design.md` alone" (or equivalent), not "not answered by `design.md`,
  `questions.md`, or `research.md`".

### Requirement: Planner reads `slices.md` only
`claude/agents/planner.md` MUST instruct the planner to read only
`openspec/changes/<id>/slices.md`. The planner MUST NOT name `design.md`,
`proposal.md`, or `specs/` in its read instruction. D-number back-references
are carried forward from `(D<n>)` tags embedded by the architect in `slices.md`
— the planner never opens `design.md`.

#### Scenario: planner step 2 lists only slices.md
- **WHEN** `claude/agents/planner.md` "What to do" step 2 is read
- **THEN** it says to read `slices.md` and does not mention `design.md`,
  `proposal.md`, or `specs/`.

#### Scenario: planner inputs section is consistent
- **WHEN** the planner's `## Inputs` section is read
- **THEN** it lists `slices.md` as the sole implicit input and does not list
  `proposal.md`, `specs/`, or `design.md`.

### Requirement: Implementer reads `tasks.md` only; conflict triggers hard-stop
`claude/agents/implementer.md` MUST instruct the implementer to read only
`openspec/changes/<id>/tasks.md`. The implementer MUST NOT open `design.md` at
any point during implementation — not proactively and not at the divergence
self-check step. If a slice decision appears to conflict with a design decision
(identified via a `(D<n>)` tag in `tasks.md`), the implementer MUST hard-stop
and ask the human rather than opening `design.md` to verify.

#### Scenario: implementer never opens design.md
- **WHEN** `claude/agents/implementer.md` is read
- **THEN** it instructs the implementer to read only `tasks.md`, and contains
  a clause specifying that a design-decision conflict triggers a hard-stop to
  the human, not a `design.md` read.

#### Scenario: conflict with D-number triggers hard-stop not a read
- **GIVEN** the implementer encounters a slice bullet containing `(D3)` and the
  code it is writing appears to conflict with that decision
- **WHEN** the implementer processes the conflict
- **THEN** it stops and asks the human how to proceed instead of opening
  `design.md` to look up D3.

### Requirement: Researcher bans the whole change folder
`claude/agents/researcher.md` MUST prohibit the researcher from opening any
file under `openspec/changes/<id>/` — not only `questions.md`. The prohibition
MUST be stated clearly as a whole-folder ban, extending the prior single-artifact
ban to cover all change-folder process artifacts.

#### Scenario: researcher whole-folder ban replaces single-file ban
- **WHEN** `claude/agents/researcher.md` is read
- **THEN** the prohibition covers the entire `openspec/changes/<id>/` folder,
  not only `openspec/changes/<id>/questions.md`.

### Requirement: Questioner replaces archived-example read with template reference
`claude/agents/questioner.md` MUST NOT instruct the questioner to skim any
archived `questions.md` from `openspec/changes/archive/` as a worked example.
That step MUST be replaced by a reference to the stable checked-in fixture
`openspec-templates/questions.template.md` and the agent's own inline canonical
shape. If `openspec-templates/` is not reachable in a consuming repo, the inline
shape alone serves as the worked example.

#### Scenario: questioner no longer reads from archive
- **WHEN** `claude/agents/questioner.md` is read
- **THEN** no step instructs the questioner to Glob `openspec/changes/archive/`
  or open any archived `questions.md`.

#### Scenario: questioner references template fixture instead
- **WHEN** `claude/agents/questioner.md` is read
- **THEN** the step that was the archived-example read now references
  `openspec-templates/questions.template.md` and/or the inline canonical shape.

### Requirement: Designer sources scheduled triggers from base specs
`claude/agents/designer.md` step that honours "prior conditional triggers" MUST
instruct the designer to source those triggers from base specs
(`openspec/specs/**`) via the permitted `spec.md` exception — never from another
change's `design.md` or any archived change folder.

#### Scenario: designer trigger step references base specs not archived designs
- **WHEN** `claude/agents/designer.md` step 6 (or equivalent trigger-honouring
  step) is read
- **THEN** it instructs the designer to check for scheduled triggers in
  `openspec/specs/**` base specs, and does not mention reading an archived or
  prior change's `design.md`.

### Requirement: Cross-change read boundary applies to all seven stage agents
Every QRSPI stage agent MUST be prohibited from reading another change's process
artifacts — `questions.md`, `research.md`, `design.md`, `proposal.md`,
`slices.md`, `tasks.md`, `pr.md`, `followups.md` — whether in-flight under
`openspec/changes/<other-id>/` or archived under `openspec/changes/archive/`.
The sole exception is any `spec.md` file: base specs under `openspec/specs/**`
and delta `specs/**/spec.md` in other or archived changes are permitted reads.
This rule MUST be stated once in the workflow skill's Read-Matrix section and
referenced (not repeated in full) from each agent's read-contract banner.

#### Scenario: cross-change process artifacts are forbidden
- **GIVEN** an agent is executing a QRSPI stage for change `foo`
- **WHEN** the agent encounters another change's `design.md` or `tasks.md`
- **THEN** the agent's instructions prohibit opening that file, covering both
  in-flight (`openspec/changes/bar/design.md`) and archived
  (`openspec/changes/archive/YYYY-MM-DD-bar/design.md`) paths.

#### Scenario: spec.md exception permits cross-change spec reads
- **GIVEN** an agent is executing a QRSPI stage for change `foo`
- **WHEN** the agent needs to validate a delta spec against a base spec in
  `openspec/specs/<cap>/spec.md`
- **THEN** the agent's instructions permit that read, as `spec.md` is the
  sole cross-change exception.

#### Scenario: cross-change rule is stated once in the workflow skill
- **WHEN** the workflow skill's Read-Matrix section is read
- **THEN** it contains the full cross-change boundary clause and the
  `spec.md` exception; each agent banner references this location rather
  than repeating the full clause.

### Requirement: Architect embeds `(D<n>)` tags in every `slices.md` bullet
The architect MUST embed design-decision back-references as `(D<n>)` or
`(D<n>, D<m>)` tags in each `slices.md` slice bullet that implements a numbered
`design.md` decision. This is a required output-format rule, not best-effort.
The `(D<n>)` convention MUST be documented in the architect's inline `slices.md`
skeleton and in `openspec-templates/tasks.template.md`. The stale `worktree.md`
label in `tasks.template.md` MUST be corrected to `slices.md` in the same edit.

#### Scenario: architect slices.md contains D-number tags
- **GIVEN** the architect writes `slices.md` for a change whose design has
  numbered decisions (D1, D2, etc.)
- **WHEN** a slice bullet implements one of those decisions
- **THEN** the bullet carries a `(D<n>)` tag (or `(D<n>, D<m>)` for multiple),
  making the traceability self-carrying without opening `design.md`.

#### Scenario: tasks.md inherits D-number tags from slices.md
- **WHEN** the planner converts a `slices.md` slice into `tasks.md` task items
- **THEN** each task item carries the `(D<n>)` tag from its source slice bullet,
  without the planner opening `design.md`.

#### Scenario: tasks.template.md uses slices.md label not worktree.md
- **WHEN** `openspec-templates/tasks.template.md` is read
- **THEN** the `**Model:**` annotation example says "rationale carried verbatim
  from `slices.md`" and no reference to `worktree.md` remains.

