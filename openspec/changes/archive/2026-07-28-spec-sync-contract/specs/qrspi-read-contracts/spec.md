# Spec — qrspi-read-contracts

> Delta against `openspec/specs/qrspi-read-contracts/spec.md` for the
> `spec-sync-contract` change. Adds a "Helper agents" subsection to the workflow
> Read Matrix with a `spec-syncer` row documenting its read contract.

## ADDED Requirements

### Requirement: Read Matrix includes a Helper agents subsection with a spec-syncer row
The workflow Read Matrix in `claude/skills/workflow/SKILL.md` MUST include a
"Helper agents" subsection, separate from the stage-agent rows, that documents
the read contract for each non-stage helper agent. The initial subsection MUST
contain a `spec-syncer` row stating: Reads (within-change): `specs/**` (delta);
Reads (cross-change): `openspec/specs/**` (main specs, via the spec.md
exception); opens no process artifacts (questions.md, research.md, design.md,
proposal.md, slices.md, tasks.md, pr.md, followups.md).

#### Scenario: Helper agents subsection appears in the Read Matrix
- **WHEN** `claude/skills/workflow/SKILL.md` is read
- **THEN** the Read Matrix table or its surrounding prose contains a "Helper
  agents" subsection listing `spec-syncer` with its approved within-change and
  cross-change read scope.

#### Scenario: spec-syncer row documents no-process-artifacts constraint
- **WHEN** the `spec-syncer` row in the Helper agents subsection is read
- **THEN** it explicitly states that spec-syncer opens no process artifacts
  (or lists the process artifacts it must not open), distinguishing it from
  the reviewer row which opens the full change folder by design.
