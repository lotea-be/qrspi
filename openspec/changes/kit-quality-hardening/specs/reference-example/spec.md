# Spec — reference-example

> New capability introduced by the `kit-quality-hardening` change. Defines the
> hand-authored minimal fictional change (`example-greeting`) that serves as both
> end-to-end documentation for a complete QRSPI flow and the `openspec validate`
> CI fixture.

## ADDED Requirements

### Requirement: Reference example provided as an active fixture with full artifact set
The system MUST provide a hand-authored fictional change under
`openspec/changes/example-greeting/` containing at minimum: `questions.md`,
`research.md`, `design.md`, `proposal.md`, `specs/<capability>/spec.md`,
`tasks.md`, and `worktree.md`. The example MUST use realistic but fictional
content so it reads as a genuine completed change. It lives in the ACTIVE
`openspec/changes/` set (not `archive/`) because `openspec validate <id>` only
resolves active changes; an archived example could not serve as the validate
fixture. The folder name is deliberately non-dated and fixture-named so it is not
mistaken for in-flight work.

#### Scenario: reader uses example as documentation
- **WHEN** a contributor unfamiliar with QRSPI reads the reference example
- **THEN** they can trace a complete change from questions through worktree,
  observing the canonical artifact format for each stage.

#### Scenario: example appears as an intentional fixture in the change list
- **WHEN** `openspec list` is run
- **THEN** `example-greeting` appears as an active change, and `CONTRIBUTING.md`
  documents it as a permanent validate fixture (not an in-flight change to be
  implemented or archived).

### Requirement: Reference example passes openspec validate
All spec files in the reference example MUST conform to the canonical OpenSpec
spec-delta format enforced by `openspec validate`, such that running
`openspec validate <example-id>` exits 0 without errors.

#### Scenario: CI runs validate against the example
- **WHEN** the CI validate job runs `npx @fission-ai/openspec@<pin> validate example-greeting`
- **THEN** `openspec validate` exits 0, confirming the example's spec files are
  well-formed.

#### Scenario: malformed spec is caught in CI
- **WHEN** an edit introduces a spec-delta violation (e.g., a `## MODIFIED`
  requirement title that does not match a base requirement) into the reference
  example
- **THEN** the CI validate job fails, surfacing the regression before merge.
