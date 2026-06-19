# reference-example Specification

## Purpose
The kit ships a hand-authored, fictional reference change so contributors can see
the full QRSPI artifact set on a realistic example, and so CI has a spec-grammar
gate. The reference example is documentation; the spec-grammar gate validates the
**real** `openspec/specs/` surface (and any active change) via `openspec validate
--all`, so the example need not be an active fixture.

## Requirements
### Requirement: Reference example provided with the full artifact set
The system MUST provide a hand-authored fictional change (`example-greeting`)
containing at minimum: `questions.md`, `research.md`, `design.md`, `proposal.md`,
`specs/<capability>/spec.md`, `tasks.md`, and a slice plan. The example MUST use
realistic but fictional content so it reads as a genuine completed change. It MAY
live under `openspec/changes/archive/` as a worked reference -- it is NOT required
to remain in the active `openspec/changes/` set, because CI validates the real
spec surface (see the next requirement) rather than the example.

#### Scenario: reader uses example as documentation
- **WHEN** a contributor unfamiliar with QRSPI reads the reference example
- **THEN** they can trace a complete change from questions through the slice plan,
  observing the canonical artifact format for each stage.

### Requirement: CI validates the full spec surface
CI MUST run `openspec validate --all`, validating every spec under
`openspec/specs/` together with any active change, and MUST exit 0. CI MUST NOT
depend on a fictional change being kept artificially active to have something to
validate.

#### Scenario: CI runs validate against the real specs
- **WHEN** the CI validate job runs `npx @fission-ai/openspec@<pin> validate --all`
- **THEN** every spec under `openspec/specs/` (and any active change) is checked,
  and the job exits 0.

#### Scenario: malformed spec is caught in CI
- **WHEN** an edit introduces a spec-delta violation (e.g., a `## MODIFIED`
  requirement title that does not match a base requirement) into any spec
- **THEN** the CI validate job fails, surfacing the regression before merge.
