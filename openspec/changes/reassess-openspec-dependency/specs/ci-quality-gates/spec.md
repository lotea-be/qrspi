# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the `reassess-openspec-dependency` change.
> Extends the "Lint job validates pin agreement" requirement so that Check 1
> also asserts `openspec/config.yaml`'s `openspec_version` is present and
> equals the agreed pin, with an inline self-test covering both failure legs
> and the green case (D2, D3, D6).

## MODIFIED Requirements

### Requirement: Lint job validates pin agreement
The CI `lint` job MUST assert that every hand-maintained occurrence of the
OpenSpec version pin (excluding `generatedBy:` lines in OpenSpec-generated skill
files) agrees, AND MUST assert that `openspec/config.yaml` contributed an
`openspec_version` value that equals the agreed pin V, failing if either the
config value is absent or it differs from V. The job MUST fail if any pin
occurrence diverges from the others.

#### Scenario: pin mismatch introduced
- **WHEN** a contributor updates the pin in one location but not all others and
  the lint job runs
- **THEN** the lint job reports the mismatched occurrence(s) and exits non-zero.

#### Scenario: generatedBy lines excluded from pin lint
- **WHEN** the lint job runs and `generatedBy: "1.4.1"` appears in
  OpenSpec-generated skill files
- **THEN** those occurrences are not counted as hand-maintained pin sites and
  do not cause lint failures.

#### Scenario: config openspec_version absent is caught
- **WHEN** `openspec/config.yaml` does not contain an `openspec_version` field
  and the lint job runs
- **THEN** Check 1 reports that `openspec/config.yaml` contributed no pin value
  and exits non-zero.

#### Scenario: config openspec_version present but wrong is caught
- **WHEN** `openspec/config.yaml` contains `openspec_version: "1.3.0"` but all
  other hand-maintained pin sites agree on `"1.4.1"`, and the lint job runs
- **THEN** Check 1 reports that `openspec/config.yaml`'s `openspec_version` does
  not equal the agreed pin and exits non-zero.

#### Scenario: config openspec_version agrees with agreed pin
- **WHEN** `openspec/config.yaml` contains `openspec_version: "1.4.1"` and all
  other hand-maintained pin sites also agree on `"1.4.1"`, and the lint job runs
- **THEN** Check 1 passes both the cross-occurrence agreement check and the
  config-coupling assertion, and does not contribute a non-zero exit.

#### Scenario: inline self-test covers both failure legs and green case
- **WHEN** Check 1's inline self-test runs as part of `node scripts/lint.mjs`
- **THEN** the self-test exercises a fixture where config `openspec_version` is
  absent (failure leg 1), a fixture where it is present but does not equal the
  agreed pin (failure leg 2), and a fixture where it agrees (green case); all
  three assertions must fire correctly, and any self-test failure is pushed as an
  error so CI reports the regression.

#### Scenario: zero-pin branch behavior unchanged
- **WHEN** no hand-maintained pin occurrences are found during the Check 1 scan
- **THEN** Check 1 errors on zero pin occurrences exactly as before; the
  config-coupling assertion is not reached (it requires an agreed pin V to compare
  against).
