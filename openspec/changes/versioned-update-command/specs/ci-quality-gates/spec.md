# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `versioned-update-command` change. Adds a new lint check that asserts every
> released version has a `migrations/<version>.yaml` manifest entry, validates
> its schema well-formedness, and validates the consuming-repo marker SemVer
> format where present.

## ADDED Requirements

### Requirement: Lint job checks migration manifest presence and schema
The CI `lint` job MUST include a check that, for every `## [X.Y.Z]` section in
`CHANGELOG.md` (i.e. every historically released version), a corresponding
`migrations/<version>.yaml` file exists in the kit. The check MUST also validate
schema well-formedness of every `migrations/*.yaml` file: required fields
(`version`, `summary`, `automated`, `manual`) must be present; every item in
`automated` must have `action: edit-file` and no other action value; every
`automated` item's `path` field must start with `openspec/`. The check MUST
validate, where `openspec/.qrspi-version` exists in the repo being linted, that
its contents match a bare SemVer regex (no `v` prefix, no key). The check MUST
be implemented in `scripts/lint.mjs` using the same dependency-free ESM pattern
(async function, errors pushed to `errors[]`, labelled `process.stdout.write`
line in `main()`). Because `release.yml` already runs `node scripts/lint.mjs`,
this check is enforced both on every PR and at every tag push without a separate
`release.yml` assertion.

#### Scenario: release version missing a manifest entry
- **WHEN** `CHANGELOG.md` contains a `## [0.7.0]` section but
  `migrations/0.7.0.yaml` does not exist, and the lint job runs
- **THEN** the lint check reports the missing entry and `node scripts/lint.mjs`
  exits non-zero.

#### Scenario: every released version has a manifest entry
- **WHEN** every version section in `CHANGELOG.md` has a corresponding
  `migrations/<version>.yaml` and all files are schema-well-formed
- **THEN** the lint check passes and does not contribute to a non-zero exit.

#### Scenario: automated step with disallowed action is caught
- **WHEN** a `migrations/<version>.yaml` file contains an `automated` step with
  `action: run-command` (not `edit-file`) and the lint job runs
- **THEN** the lint check reports the schema violation and exits non-zero.

#### Scenario: automated step with non-openspec path is caught
- **WHEN** a `migrations/<version>.yaml` file contains an `automated` step whose
  `path` does not start with `openspec/` and the lint job runs
- **THEN** the lint check reports the path scope violation and exits non-zero.

#### Scenario: marker file with malformed SemVer is caught
- **WHEN** `openspec/.qrspi-version` exists and contains `v0.6.0` (with a `v`
  prefix) or any non-SemVer string, and the lint job runs
- **THEN** the lint check reports the format violation and exits non-zero.

#### Scenario: valid stub for a no-action release passes
- **WHEN** `migrations/0.6.0.yaml` exists with `version: 0.6.0`, a `summary`
  string, `automated: []`, and `manual: []`
- **THEN** the lint check treats this as a valid stub and does not flag it.
