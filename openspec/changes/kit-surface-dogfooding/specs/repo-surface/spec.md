# Spec — repo-surface

> Delta against `openspec/specs/repo-surface/spec.md` for the `kit-surface-dogfooding` change.
> Extends the closed surface taxonomy from 5 to 11 surfaces (5 web + 6 kit),
> adds mapping rows and gated section names for each kit surface, updates the
> surface-inference rule to cover kit surfaces, and adds an
> `## Extending the taxonomy` checklist to the skill.

## MODIFIED Requirements

### Requirement: repo-surface skill defines a closed surface taxonomy
The skill MUST define exactly eleven named surfaces — `data-store`, `http-api`,
`ui`, `auth`, `typed-nullable`, `slash-command`, `stage-agent`, `skill`,
`lint-gate`, `template`, `migration-manifest` — as the closed vocabulary of repo
surface flags. Adding a twelfth surface MUST require an explicit edit to the
skill file.

#### Scenario: all eleven surfaces enumerated in the skill body
- **WHEN** the `repo-surface` skill body is read
- **THEN** all eleven surface names (`data-store`, `http-api`, `ui`, `auth`,
  `typed-nullable`, `slash-command`, `stage-agent`, `skill`, `lint-gate`,
  `template`, `migration-manifest`) appear as defined entries with their gated
  sections listed.

### Requirement: repo-surface skill maps each surface to its gated sections and checklist items
The skill MUST document the mapping from each surface to the sections and
checklist items it gates, covering at minimum: `data-store` gates Data model,
Indexing & query performance, Migrations & data, the "No raw SQL" checklist
item, `## Data model changes`, the migration-generation task, and the PR
`## Migrations` section; `http-api` gates API / API surface and the "endpoints
use authorization policies" checklist item; `ui` gates UI, Front-end state, and
`## UI surface`; `auth` gates Auth & authorization, `## Authorization`, and the
auth-policy checklist item; `typed-nullable` gates the "No nullable suppression"
checklist item; `slash-command` gates `## Slash-command surface` (questions.md)
and `## Command changes` (design.md); `stage-agent` gates `## Stage-agent
surface` (questions.md) and `## Agent changes` (design.md); `skill` gates
`## Skill surface` (questions.md) and `## Skill changes` (design.md);
`lint-gate` gates `## Lint-gate surface` (questions.md) and `## Lint changes`
(design.md); `template` gates `## Template surface` (both questions.md and
design.md); `migration-manifest` gates `## Migration manifest` (both
questions.md and design.md).

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
  `## Command changes`; the `skill` entry lists `## Skill surface` and
  `## Skill changes`; the `lint-gate` entry lists `## Lint-gate surface` and
  `## Lint changes`; the `template` entry lists `## Template surface`; and
  the `migration-manifest` entry lists `## Migration manifest`.

## ADDED Requirements

### Requirement: repo-surface skill includes an Extending the taxonomy checklist
The skill MUST include an `## Extending the taxonomy` section that lists the
exact steps required to add a new surface to the taxonomy: (1) add the surface
name and its gated section(s) to the section-to-surface mapping table in this
skill; (2) add the gated section(s) to the relevant agent skeleton(s) and
template(s) (questioner skeleton and `questions.template.md` for questions-stage
sections; designer skeleton and `design.template.md` for design-stage sections);
(3) add every new gated heading to the `SURFACE_GATED_DENYLIST_HEADINGS` set in
`scripts/lint.mjs` (Check 11) so skeletons cannot hard-code it; (4) add every
new gated heading to the `SURFACE_GATED_HEADINGS` map in `scripts/lint.mjs`
(Check 14) so live artifacts are scanned against it; (5) if the surface is
present for this repo, add it to the `## Repo surface` block in the repo's
stack-cheatsheet. The checklist MUST note that `## Template surface` is a
present kit heading AND a Check 11 denylist entry, so skeletons must express it
as a conditional gate comment, never a literal heading line inside a fenced
block.

#### Scenario: checklist is present and complete
- **WHEN** the `repo-surface` skill body is read
- **THEN** it contains an `## Extending the taxonomy` section listing at minimum
  the five required edit sites: the skill mapping, the agent skeletons and
  templates, the Check 11 denylist, the Check 14 map, and the stack-cheatsheet
  block.

#### Scenario: self-collision caveat is documented
- **WHEN** the `## Extending the taxonomy` section is read
- **THEN** it includes a note that `## Template surface` (a present kit surface
  heading) must appear in skeletons only as a conditional gate comment, not as a
  literal heading inside a fenced block, because the Check 11 denylist forbids
  literal gated headings inside fences.
