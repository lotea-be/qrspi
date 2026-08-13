# Spec — researcher-surface-gating

> Delta against `openspec/specs/researcher-surface-gating/spec.md` for the `researcher-apply-surface-gate` change.
> Adds an explicit gate-instruction sentence to the researcher's step 1 so the agent suppresses absent-surface inventory headings at stage R.

## MODIFIED Requirements

### Requirement: Researcher emits inventory sections only for declared-present surfaces
The system MUST gate each research.md inventory section on the corresponding
surface declared in the repo's `## Repo surface` block; a section MUST NOT be
emitted when its controlling surface is absent from that block. The researcher's
`## What to do` step 1 MUST contain the explicit gate-instruction sentence:
"Apply the surface-gate rule per the `repo-surface` skill: emit each inventory
section only when its surface is present, omitting absent-surface headings
entirely." This sentence MUST appear inside step 1, immediately following the
existing sentence stating that `repo-surface` defines which inventory sections
to emit — not as a new numbered step.

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

#### Scenario: gate-instruction sentence is present in step 1 of researcher.md
- **WHEN** `claude/agents/researcher.md` is read and its `## What to do` step 1
  is located
- **THEN** step 1 contains the phrase "surface-gate rule per the `repo-surface`
  skill" within the step body, confirming the operative gate instruction is
  present — and the sentence appears inside step 1, not as a separate numbered step.
