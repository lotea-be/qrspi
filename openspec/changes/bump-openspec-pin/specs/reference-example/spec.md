# Spec — reference-example

> Delta against `openspec/specs/reference-example/spec.md` for the
> `bump-openspec-pin` change.
> Updates the quoted CI validate command string to match Check 1's ci-yml
> invocation, which now carries an explicit `--strict` flag (D6).

## MODIFIED Requirements

### Requirement: CI validates the full spec surface
CI MUST run `openspec validate --all --strict`, validating every spec under
`openspec/specs/` together with any active change, and MUST exit 0. CI MUST
NOT depend on a fictional change being kept artificially active to have
something to validate.

#### Scenario: CI runs validate against the real specs
- **WHEN** the CI validate job runs `npx @fission-ai/openspec@<pin> validate
  --all --strict`
- **THEN** every spec under `openspec/specs/` (and any active change) is
  checked, and the job exits 0.

#### Scenario: malformed spec is caught in CI
- **WHEN** an edit introduces a spec-delta violation (e.g., a `## MODIFIED`
  requirement title that does not match a base requirement) into any spec
- **THEN** the CI validate job fails, surfacing the regression before merge.
