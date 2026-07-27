# researcher-surface-gating Specification

## Purpose
The stage-R researcher agent gates its `research.md` inventory sections on the
repo's declared surfaces, mirroring the five proposal agents' surface behaviour,
while staying ticket-blind. The researcher loads `repo-surface` and the stack
cheatsheet to determine which inventory headings to emit, reuses the same gated
heading strings the proposal agents use, and expresses those headings in its
fenced skeleton as a gate-comment block.

## Requirements
### Requirement: Researcher loads repo-surface and the stack cheatsheet
The system MUST load the `repo-surface` skill and Glob-discover the repo's
stack-cheatsheet skill before writing any inventory sections in `research.md`,
so that the set of present surfaces is known before any heading is emitted.

#### Scenario: researcher preamble documents the skill loads
- **WHEN** `claude/agents/researcher.md` is read
- **THEN** the preamble contains a prose line stating that the researcher loads
  `repo-surface` and the stack cheatsheet to determine which inventory sections
  to emit.

#### Scenario: researcher skill set includes repo-surface
- **WHEN** `claude/agents/researcher.md` is read
- **THEN** the step 1 "Load skills" line includes `repo-surface` alongside
  `context-hygiene` and `workflow`.

### Requirement: Researcher emits inventory sections only for declared-present surfaces
The system MUST gate each research.md inventory section on the corresponding
surface declared in the repo's `## Repo surface` block; a section MUST NOT be
emitted when its controlling surface is absent from that block.

#### Scenario: absent surface produces no inventory heading in research.md
- **WHEN** the researcher writes `research.md` for a repo whose `## Repo surface`
  block does not list `data-store`
- **THEN** the `## Data model` heading does not appear anywhere in `research.md`
  (no heading, no "Not applicable", no empty block).

#### Scenario: present surface produces an inventory heading in research.md
- **WHEN** the researcher writes `research.md` for a repo whose `## Repo surface`
  block lists `skill`
- **THEN** the `## Skill surface` heading appears in `research.md` with factual
  inventory content.

#### Scenario: kit repo with six surfaces emits six inventory headings
- **WHEN** the researcher writes `research.md` for the QRSPI kit repo (surfaces:
  slash-command, stage-agent, skill, lint-gate, template, migration-manifest)
- **THEN** `research.md` contains `## Slash-command surface`, `## Stage-agent surface`,
  `## Skill surface`, `## Lint-gate surface`, `## Template surface`, and
  `## Migration manifest`, and does NOT contain `## Data model` or `## API surface`.

### Requirement: Researcher inventory headings reuse the same gated heading strings as proposal agents
The system MUST use the same surface-gated heading string for each surface in
`research.md` as the questioner and designer use in their artifacts (e.g.
`## Data model` for data-store, `## API surface` for http-api), with no separate
inventory-heading namespace.

#### Scenario: http-api inventory heading matches proposal heading
- **WHEN** the researcher writes `research.md` for a repo with `http-api` present
- **THEN** the heading emitted is `## API surface`, NOT `## Public API surface`
  or `## Current API surface`.

#### Scenario: data-store inventory heading matches proposal heading
- **WHEN** the researcher writes `research.md` for a repo with `data-store` present
- **THEN** the heading emitted is `## Data model`, the same string the designer
  uses in `design.md`.

### Requirement: Researcher fenced skeleton uses gate-comment convention for surface-gated headings
The system MUST express all surface-gated inventory headings in the researcher's
fenced skeleton as a `<!-- Surface-gated inventory sections: ... -->` comment
block, and MUST NOT include any literal surface-gated heading line inside the
fenced block.

#### Scenario: fenced skeleton contains no literal surface-gated heading lines
- **WHEN** `claude/agents/researcher.md` is read and its fenced skeleton block
  is located
- **THEN** none of the strings in `SURFACE_GATED_DENYLIST_HEADINGS` (as defined
  by Check 11) appear as heading lines inside that fenced block.

#### Scenario: gate comment lists the surface-to-heading mapping
- **WHEN** the fenced skeleton block in `claude/agents/researcher.md` is read
- **THEN** a `<!-- Surface-gated inventory sections: ... -->` comment block is
  present and lists the surface-to-heading mappings for the researcher.

### Requirement: Researcher emits a standing Notable discrepancies heading when code evidence of absent surfaces is found
The system MUST emit a `## Notable discrepancies` heading in `research.md` when
the researcher finds code evidence of a surface that is declared absent in the
repo's `## Repo surface` block; the note MUST be factual (no recommendation to
run `/qrspi:stack`).

#### Scenario: absent-surface code evidence goes to Notable discrepancies
- **WHEN** the researcher finds a file that resembles a data-model entity in a
  repo where `data-store` is declared absent
- **THEN** a `## Notable discrepancies` note records the finding factually, with
  no recommendation or call to action.

#### Scenario: Notable discrepancies heading is always emitted
- **WHEN** the researcher writes `research.md` and no discrepancies are found
- **THEN** `## Notable discrepancies` is still present in `research.md` with
  body text "None."

### Requirement: Researcher skill-set registry is updated to include repo-surface
The system MUST declare `['context-hygiene','repo-surface','workflow']` as the
expected skill set for the `researcher` agent in `scripts/skill-sets.mjs`
`SKILL_SET_EXPECTED`, so that Check 2b enforces the skill load.

#### Scenario: SKILL_SET_EXPECTED.researcher matches the updated set
- **WHEN** `scripts/skill-sets.mjs` is read
- **THEN** the `researcher` entry lists `['context-hygiene','repo-surface','workflow']`
  (or the equivalent set in sorted order).

#### Scenario: Check 2b fails if repo-surface is missing from the agent
- **WHEN** `claude/agents/researcher.md` loads only `context-hygiene` and `workflow`
  (omitting `repo-surface`) and `node scripts/lint.mjs` is run
- **THEN** Check 2b reports a mismatch for `researcher.md` and exits non-zero.

### Requirement: Researcher read-contract banner and Check 7 string remain unchanged
The system MUST NOT modify the researcher's `Reads:` banner field or Check 7's
hardcoded researcher string; loading `repo-surface` and the stack cheatsheet via
the Skill tool does not constitute a change-folder file read.

#### Scenario: researcher banner Reads field is unchanged after the change ships
- **WHEN** `claude/agents/researcher.md` is read after this change ships
- **THEN** the `Reads:` field in the read-contract banner still states
  "none (whole `changes/<id>/` folder banned)" (or equivalent), unchanged.

#### Scenario: Check 7 still passes for the researcher
- **WHEN** `node scripts/lint.mjs` is run after this change ships
- **THEN** Check 7 passes for `researcher.md` with no banner-mismatch violation.
