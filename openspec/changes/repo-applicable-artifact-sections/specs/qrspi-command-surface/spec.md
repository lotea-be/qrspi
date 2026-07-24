# Spec — qrspi-command-surface

> Delta against `openspec/specs/qrspi-command-surface/spec.md` for the
> `repo-applicable-artifact-sections` change. Adds repo-surface load steps to
> the five artifact-producing agents, replaces CRUD skeleton headings with
> conditional placeholders, retires the "Not applicable" convention, updates the
> four templates to surface-gated headings, and adds light Part B illustrative
> notes to two skills.

## ADDED Requirements

### Requirement: Five artifact-producing agents load the repo-surface skill
The five artifact-producing agent files (`claude/agents/questioner.md`,
`designer.md`, `architect.md`, `planner.md`, `reviewer.md`) MUST each load skill
`repo-surface` as part of their startup preamble. Additionally, `questioner.md`
and `planner.md` MUST also load the project's stack-cheatsheet skill (if one
exists for the repo) as part of that same preamble step, since they do not
currently load it. The designer, architect, and reviewer already load the
stack-cheatsheet and gain only the `repo-surface` load.

#### Scenario: questioner startup loads both skills
- **WHEN** `claude/agents/questioner.md` body is read
- **THEN** the preamble contains a step that loads skill `repo-surface` and a
  step that loads the project's stack-cheatsheet skill if one is defined for
  the repo.

#### Scenario: reviewer startup loads repo-surface only
- **WHEN** `claude/agents/reviewer.md` body is read
- **THEN** the preamble contains a step that loads skill `repo-surface`, and the
  existing stack-cheatsheet load step is retained unchanged.

#### Scenario: lint Check 2 passes for all new load references
- **WHEN** `node scripts/lint.mjs` is run after the load steps are added
- **THEN** Check 2 resolves `Load skill repo-surface` to
  `claude/skills/repo-surface/SKILL.md` for all five agent files and reports
  no dangling skill references.

### Requirement: Fenced skeletons in the five agents replace CRUD headings with a conditional placeholder
The fenced skeleton blocks (```` ```markdown ```` or bare ```` ``` ````) embedded
in each of the five artifact-producing agent files MUST NOT contain any of the
twelve CRUD heading lines from the Check 11 denylist as literal heading lines.
Instead, each skeleton MUST use a single conditional placeholder (e.g. an HTML
comment) with a prose instruction above or within the fence directing the agent
to emit only those surface-gated sections whose surface is present per the
`repo-surface` mapping. Always-emitted headings (`## Testing`,
`## Sequencing & scope`, `## Open product questions`, and the four canonical
OpenSpec headers) MUST remain as literal headings in the skeleton.

#### Scenario: questioner skeleton passes Check 11 after update
- **WHEN** `claude/agents/questioner.md`'s fenced skeleton is inspected
- **THEN** no CRUD heading from the denylist appears as a literal heading line
  inside the fence, and the skeleton contains a conditional placeholder with a
  reference to the `repo-surface` mapping.

#### Scenario: always-emitted headings remain in skeleton
- **WHEN** the questioner's updated fenced skeleton is read
- **THEN** `## Testing`, `## Sequencing & scope`, and `## Open product questions
  (for the human)` are still present as literal headings.

### Requirement: The five agents retire the "Not applicable" convention for surface-absent sections
The agent bodies and template prose MUST reword any instruction that previously
said "keep the heading and write *Not applicable.*" (or similar) for
surface-absent sections to instead say: emit a section only when its surface is
present and it carries content for this change; otherwise omit it entirely (no
heading, no stanza). No agent or template file in the kit SHALL contain an active
instruction to write "Not applicable" under a CRUD heading.

#### Scenario: questioner body contains no N/A instruction
- **WHEN** `claude/agents/questioner.md` is searched for the string
  "Not applicable"
- **THEN** no active instruction to write that phrase under a surface-gated
  heading is found (historical references in comments or non-normative prose
  are permissible only if they describe the OLD convention, not the new one).

#### Scenario: designer body contains no N/A instruction
- **WHEN** `claude/agents/designer.md` is searched for the phrase "Not applicable"
- **THEN** no active instruction to write that phrase under a CRUD heading is
  found in the current normative prose.

### Requirement: The four template files demote CRUD headings to surface-gated
The four `openspec-templates/*.template.md` files MUST be updated to mark the
seven CRUD headings as surface-gated (with a comment tag or equivalent) and to
retire any instruction that says to write "Not applicable" under those headings.
Specifically: `questions.template.md`'s explicit N/A instruction MUST be
replaced with the PQ2 rule (emit when surface is present; omit entirely
otherwise); `design.template.md`'s OPTIONAL labels on the four detail sections
MUST be tightened to "surface-gated (omit when the surface is absent)";
`proposal.template.md` and `tasks.template.md` MUST have the Migrations
impact-line and migration-task note flagged as surface-gated. Always-present
headings MUST remain unchanged in all four templates.

#### Scenario: questions.template.md carries no N/A instruction
- **WHEN** `openspec-templates/questions.template.md` is read
- **THEN** any former "Not applicable" instruction under a CRUD heading has been
  replaced by a comment indicating the section is surface-gated and should be
  omitted entirely when the surface is absent.

#### Scenario: design.template.md labels detail sections as surface-gated
- **WHEN** `openspec-templates/design.template.md` is read
- **THEN** the four detail sections (`## Data model changes`, `## API surface`,
  `## UI surface`, `## Authorization`) are labelled "surface-gated (omit when
  the surface is absent)" rather than "OPTIONAL".

#### Scenario: proposal.template.md Migrations line is flagged as surface-gated
- **WHEN** `openspec-templates/proposal.template.md` is read
- **THEN** the Migrations impact line inside `## Impact` carries a surface-gated
  comment indicating it should be omitted when the `data-store` surface is absent.

### Requirement: vertical-slice and workflow skills carry illustrative-framing notes for non-web repos
The `claude/skills/vertical-slice/SKILL.md` MUST contain a note (one line)
pointing at `repo-surface` for which slice shapes apply to the repo being worked
on. The `claude/skills/workflow/SKILL.md` MUST contain a parenthetical note on
its "data model, API surface, or auth" sentence clarifying that those are web-app
examples and that for other repos, applicable surfaces are read from the stack
cheatsheet.

#### Scenario: vertical-slice skill carries the illustrative note
- **WHEN** `claude/skills/vertical-slice/SKILL.md` is read
- **THEN** it contains a note (approximately one line) directing readers to the
  `repo-surface` skill for determining which slice shapes apply to their repo.

#### Scenario: workflow skill carries the parenthetical on durable-contract surfaces
- **WHEN** `claude/skills/workflow/SKILL.md` is read
- **THEN** the sentence about changes that touch "the data model, an API surface,
  or auth" includes a parenthetical stating these are web-app examples and that
  a docs/plugin repo's durable-contract surfaces are its commands, skills, and
  lint rules.
