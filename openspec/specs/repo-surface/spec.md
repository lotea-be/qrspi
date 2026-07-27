# repo-surface Specification

## Purpose
The kit-shipped shared skill (`claude/skills/repo-surface/SKILL.md`) that owns
the closed surface taxonomy, the section→surface mapping, and the omit/warn rules
used by all five artifact-producing QRSPI agents to decide which surface-gated
sections to emit.

## Requirements
### Requirement: repo-surface skill ships as a kit-level skill
The system MUST ship `claude/skills/repo-surface/SKILL.md` as a plugin-level
skill (under `claude/skills/`, not `.claude/skills/`) so that it is available to
all consumer repos without any per-repo setup.

#### Scenario: skill file is present after install
- **WHEN** a consumer installs the QRSPI kit plugin
- **THEN** `claude/skills/repo-surface/SKILL.md` is present and resolvable by
  lint Check 2's skill-reference validation.

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
checklist item; `slash-command` gates `## Slash-command surface` (questions.md),
`## Command changes` (design.md), and `## Slash-command surface` (research.md);
`stage-agent` gates `## Stage-agent surface` (questions.md), `## Agent changes`
(design.md), and `## Stage-agent surface` (research.md); `skill` gates
`## Skill surface` (questions.md), `## Skill changes` (design.md), and
`## Skill surface` (research.md); `lint-gate` gates `## Lint-gate surface`
(questions.md), `## Lint changes` (design.md), and `## Lint-gate surface`
(research.md); `template` gates `## Template surface` (both questions.md and
design.md) and `## Template surface` (research.md); `migration-manifest`
gates `## Migration manifest` (both questions.md and design.md) and
`## Migration manifest` (research.md). For every surface that has an inventory
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

### Requirement: repo-surface skill defines surface-independent sections that are always emitted
The skill MUST identify the sections that are NOT gated by any surface and MUST
be emitted in all agent artifacts regardless of repo surface: at minimum
`## Testing`, `## Sequencing & scope`, `## Open product questions`, and the four
canonical OpenSpec headers (`## Context`, `## Why`, `## What Changes`,
`## Capabilities`, `## Impact`, `## Decisions`, `## Risks / Trade-offs`,
`## ADDED/MODIFIED/REMOVED Requirements`).

#### Scenario: always-emitted sections listed in skill body
- **WHEN** the skill body is read
- **THEN** it contains an explicit list of surface-independent sections that
  agents MUST always emit, regardless of what the cheatsheet reports.

### Requirement: repo-surface skill specifies the surface-inference rule from the stack cheatsheet
The skill MUST document that an agent loading it SHALL read the project's
stack-cheatsheet skill (if present) and determine each surface flag using the
following rules: (a) if the cheatsheet contains an explicit `## Repo surface`
block, that block is the authoritative allowlist of PRESENT surfaces — a surface
listed is present, a surface not listed is absent, and prose inference is NOT
performed (deterministic path, D3-C); (b) otherwise, infer each flag by LLM
judgment from the cheatsheet prose — absence of any mention of a surface means
that surface is absent (silence = absent, D3-B); (c) if no cheatsheet is loaded,
emit the full section menu plus a visible warning directing the user to run
`/qrspi:stack`.

#### Scenario: explicit block is an authoritative allowlist
- **WHEN** the loaded cheatsheet contains a `## Repo surface` block listing only
  `data-store` and `http-api` (a present-only allowlist)
- **THEN** the agent treats `data-store` and `http-api` as present and every
  unlisted surface (`ui`, `auth`, `typed-nullable`) as absent, without performing
  prose inference — a deterministic result.

#### Scenario: empty allowlist means all surfaces absent
- **WHEN** the loaded cheatsheet contains a `## Repo surface` block that lists no
  present surfaces (e.g. `_No present surfaces._`)
- **THEN** the agent treats all five surfaces as absent and omits every
  surface-gated section, without performing prose inference.

#### Scenario: prose inference fires when no block is present
- **WHEN** the loaded cheatsheet is prose-only with no mention of a database,
  ORM, SQL, or migration tooling
- **THEN** the agent infers `data-store: absent` and omits data-store-gated
  sections from the artifact.

#### Scenario: no cheatsheet produces warning and full menu
- **WHEN** no stack-cheatsheet skill is loaded
- **THEN** the agent emits all sections (the full menu) and includes a visible
  warning in the artifact directing the user to run `/qrspi:stack`.

### Requirement: repo-surface skill specifies the omit mechanic
The skill MUST state that "omit a section" means the agent skips emitting both
the heading and its body — no heading, no "Not applicable" stanza, no empty
block. The artifact produced for a surface-absent repo MUST contain no trace of
the omitted section.

#### Scenario: omitted section leaves no trace
- **WHEN** an agent generates an artifact for a repo where `data-store` is absent
- **THEN** neither `## Data model` nor any "Not applicable" text appears anywhere
  in the artifact for that section.

#### Scenario: present section is emitted normally
- **WHEN** an agent generates an artifact for a repo where `http-api` is present
- **THEN** the `## API surface` (or equivalent) section is emitted with its
  content as usual.

### Requirement: repo-surface skill includes an Extending the taxonomy checklist
The skill MUST include an `## Extending the taxonomy` section that lists the
exact steps required to add a new surface to the taxonomy: (1) add the surface
name and its gated section(s) to the section-to-surface mapping table in this
skill, including the `(in research.md)` tagged line for the research.md inventory
heading; (2) add the gated section(s) to the relevant agent skeleton(s) and
template(s) (questioner skeleton and `questions.template.md` for questions-stage
sections; designer skeleton and `design.template.md` for design-stage sections;
researcher skeleton gate comment in `claude/agents/researcher.md` for the
research.md inventory heading); (3) add every new gated heading to the
`SURFACE_GATED_DENYLIST_HEADINGS` set in `scripts/lint.mjs` (Check 11) so
skeletons cannot hard-code it; (4) add every new gated heading to the
`SURFACE_GATED_HEADINGS` map in `scripts/lint.mjs` (Check 14) so live artifacts
are scanned against it; (5) if the surface is present for this repo, add it to
the `## Repo surface` block in the repo's stack-cheatsheet. The checklist MUST
note that `## Template surface` is a present kit heading AND a Check 11 denylist
entry, so skeletons must express it as a conditional gate comment, never a
literal heading line inside a fenced block. The checklist MUST contain exactly
seven sites: the five listed above plus (6) verify Check 11 still covers all
agent skeletons for the new heading, and (7) confirm the researcher skeleton gate
comment and the `(in research.md)` mapping line are consistent.

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
