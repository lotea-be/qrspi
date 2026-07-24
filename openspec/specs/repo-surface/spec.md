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
The `repo-surface` skill MUST define exactly five named surfaces — `data-store`,
`http-api`, `ui`, `auth`, `typed-nullable` — as the closed vocabulary of repo
surface flags. Adding a sixth surface MUST require an explicit edit to the skill
file.

#### Scenario: taxonomy enumerated in the skill body
- **WHEN** the `repo-surface` skill body is read
- **THEN** all five surface names (`data-store`, `http-api`, `ui`, `auth`,
  `typed-nullable`) appear as defined entries with their gated sections or
  checklist items listed.

### Requirement: repo-surface skill maps each surface to its gated sections and checklist items
The skill MUST document the mapping from each surface to the sections and
checklist items it gates, covering at minimum: `data-store` gates Data model,
Indexing & query performance, Migrations & data, the "No raw SQL" checklist item,
`## Data model changes`, the migration-generation task, and the PR `## Migrations`
section; `http-api` gates API / API surface and the "endpoints use authorization
policies" checklist item; `ui` gates UI, Front-end state, and `## UI surface`;
`auth` gates Auth & authorization, `## Authorization`, and the auth-policy
checklist item; `typed-nullable` gates the "No nullable suppression" checklist
item.

#### Scenario: data-store mapping listed in skill body
- **WHEN** the skill body is read
- **THEN** the `data-store` entry lists Data model, Migrations, and the "No raw
  SQL" checklist item as its gated sections.

#### Scenario: typed-nullable mapping listed in skill body
- **WHEN** the skill body is read
- **THEN** the `typed-nullable` entry lists the nullable-suppression checklist
  item as its sole gated item.

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
