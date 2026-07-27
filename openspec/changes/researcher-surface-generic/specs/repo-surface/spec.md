# Spec — repo-surface

> Delta against `openspec/specs/repo-surface/spec.md` for the
> `researcher-surface-generic` change. Extends the section-to-surface mapping
> with `(in research.md)` tagged lines and adds a 7th site to the taxonomy
> extension checklist.

## MODIFIED Requirements

### Requirement: repo-surface skill maps each surface to its gated sections and checklist items
The skill MUST document the mapping from each surface to the sections and
checklist items it gates, covering at minimum: `data-store` gates Data model,
Indexing & query performance, Migrations & data, the "No raw SQL" checklist
item, `## Data model changes`, the migration-generation task, and the PR
`## Migrations` section; `http-api` gates API / API surface and the "endpoints
use authorization policies" checklist item; `ui` gates UI, Front-end state, and
`## UI surface`; `auth` gates Auth & authorization, `## Authorization`, and the
auth-policy checklist item; `typed-nullable` gates the "No nullable suppression"
checklist item; `slash-command` gates `## Slash-command surface` (questions.md),
`## Command changes` (design.md), **and `## Slash-command surface` (research.md)**;
`stage-agent` gates `## Stage-agent surface` (questions.md), `## Agent changes`
(design.md), **and `## Stage-agent surface` (research.md)**; `skill` gates
`## Skill surface` (questions.md), `## Skill changes` (design.md), **and
`## Skill surface` (research.md)**; `lint-gate` gates `## Lint-gate surface`
(questions.md), `## Lint changes` (design.md), **and `## Lint-gate surface`
(research.md)**; `template` gates `## Template surface` (both questions.md and
design.md) **and `## Template surface` (research.md)**; `migration-manifest`
gates `## Migration manifest` (both questions.md and design.md) **and
`## Migration manifest` (research.md)**. For every surface that has an inventory
section, the mapping entry in the skill MUST include a tagged line of the form
`- Section \`## <heading>\` (in research.md)` under the corresponding
`### <surface> gates` subsection.

#### Scenario: data-store mapping listed in skill body
- **WHEN** the skill body is read
- **THEN** the `data-store` entry lists Data model, Migrations, and the "No raw
  SQL" checklist item as its gated sections.

#### Scenario: typed-nullable mapping listed in skill body
- **WHEN** the skill body is read
- **THEN** the `typed-nullable` entry lists the nullable-suppression checklist
  item as its sole gated item.

#### Scenario: kit surface mapping listed in skill body
- **WHEN** the skill body is read
- **THEN** the `slash-command` entry lists `## Slash-command surface` and
  `## Command changes` (in questions.md / design.md respectively) plus
  `## Slash-command surface` (in research.md); the `skill` entry lists
  `## Skill surface` and `## Skill changes` plus `## Skill surface` (in
  research.md); the `lint-gate` entry lists `## Lint-gate surface` and
  `## Lint changes` plus `## Lint-gate surface` (in research.md); the `template`
  entry lists `## Template surface` (for both questions.md and design.md) plus
  `## Template surface` (in research.md); and the `migration-manifest` entry
  lists `## Migration manifest` (for both questions.md and design.md) plus
  `## Migration manifest` (in research.md).

#### Scenario: research.md inventory heading is documented per surface
- **WHEN** the skill body's `### slash-command gates` subsection is read
- **THEN** a tagged line `- Section \`## Slash-command surface\` (in research.md)`
  is present, confirming the research.md inventory heading is documented.

### Requirement: repo-surface skill includes an Extending the taxonomy checklist
The skill MUST include an `## Extending the taxonomy` section that lists the
exact steps required to add a new surface to the taxonomy: (1) add the surface
name and its gated section(s) to the section-to-surface mapping table in this
skill, including the `(in research.md)` tagged line for the research.md inventory
heading; (2) add the gated section(s) to the relevant agent skeleton(s) and
template(s) (questioner skeleton and `questions.template.md` for questions-stage
sections; designer skeleton and `design.template.md` for design-stage sections;
**researcher skeleton gate comment in `claude/agents/researcher.md`** for the
research.md inventory heading); (3) add every new gated heading to the
`SURFACE_GATED_DENYLIST_HEADINGS` set in `scripts/lint.mjs` (Check 11) so
skeletons cannot hard-code it; (4) add every new gated heading to the
`SURFACE_GATED_HEADINGS` map in `scripts/lint.mjs` (Check 14) so live artifacts
are scanned against it; (5) if the surface is present for this repo, add it to
the `## Repo surface` block in the repo's stack-cheatsheet. The checklist MUST
note that `## Template surface` is a present kit heading AND a Check 11 denylist
entry, so skeletons must express it as a conditional gate comment, never a
literal heading line inside a fenced block. **The checklist MUST contain exactly
seven sites: the five listed above plus (6) verify Check 11 still covers all
agent skeletons for the new heading, and (7) confirm the researcher skeleton gate
comment and the `(in research.md)` mapping line are consistent.**

#### Scenario: checklist is present and complete
- **WHEN** the `repo-surface` skill body is read
- **THEN** it contains an `## Extending the taxonomy` section listing at minimum
  the seven required edit sites: the skill mapping (with research.md line), the
  agent skeletons and templates (including the researcher skeleton gate comment),
  the Check 11 denylist, the Check 14 map, the stack-cheatsheet block, and the
  two researcher-specific cross-checks.

#### Scenario: self-collision caveat is documented
- **WHEN** the `## Extending the taxonomy` section is read
- **THEN** it includes a note that `## Template surface` (a present kit surface
  heading) must appear in skeletons only as a conditional gate comment, not as a
  literal heading inside a fenced block, because the Check 11 denylist forbids
  literal gated headings inside fences.

#### Scenario: 7th site explicitly names the researcher skeleton gate comment
- **WHEN** the `## Extending the taxonomy` section is read
- **THEN** it explicitly names `claude/agents/researcher.md` as a skeleton that
  must have its gate comment updated when a new surface is added, alongside the
  questioner and designer skeletons.
