# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `bump-openspec-pin` change.
> Reworks Check 1's pin-agreement scan (narration/config exclusions,
> `.github/`/`.claude/` coverage, `@latest` absence sub-guard) and adds the
> explicit `--strict` flag to CI's `validate` invocation.

## MODIFIED Requirements

### Requirement: Lint job validates pin agreement
The CI `lint` job MUST assert that every hand-maintained occurrence of the
OpenSpec version pin agrees, scanning `claude/`, `.claude/`, `.github/`, and
the other hand-maintained kit-source locations (including `README.md` and
`CONTRIBUTING.md`), while EXCLUDING from that general scan: `generatedBy:`
lines in OpenSpec-generated skill files; narrative surfaces (`CHANGELOG.md`
and `openspec/backlog.md`), which cite the pin as history rather than
maintain it as a live declaration; and `openspec/config.yaml`, which is
validated separately by a dedicated coupling assertion rather than folded
into the general agreement count. The job MUST assert that
`openspec/config.yaml` contributed an `openspec_version` value that equals
the agreed pin V, failing if either the config value is absent or it differs
from V. The job MUST fail if any pin occurrence diverges from the others.
The job MUST additionally scan the same hand-maintained file set for any
`@fission-ai/openspec@latest` occurrence and fail if any is found, so an
un-pinned reference cannot silently reappear once every current `@latest`
site has been hard-pinned.

#### Scenario: pin mismatch introduced
- **WHEN** a contributor updates the pin in one location but not all others and
  the lint job runs
- **THEN** the lint job reports the mismatched occurrence(s) and exits non-zero.

#### Scenario: generatedBy lines excluded from pin lint
- **WHEN** the lint job runs and `generatedBy: "1.9.0"` appears in
  OpenSpec-generated skill files
- **THEN** those occurrences are not counted as hand-maintained pin sites and
  do not cause lint failures.

#### Scenario: narrative surfaces excluded from pin lint
- **WHEN** `CHANGELOG.md` records a past release's `validate` invocation at an
  older pin value, or `openspec/backlog.md` narrates the current pin state in
  prose, and the lint job runs
- **THEN** neither occurrence is counted toward the general agreement scan,
  and neither can cause a "distinct versions" failure regardless of its value.

#### Scenario: config.yaml excluded from the general sweep
- **WHEN** the lint job runs its general pin-agreement scan
- **THEN** `openspec/config.yaml` does not contribute an entry to the general
  `found` set; its `openspec_version` value is read and checked only by the
  dedicated config-coupling assertion described below.

#### Scenario: config openspec_version absent is caught
- **WHEN** `openspec/config.yaml` does not contain an `openspec_version` field
  and the lint job runs
- **THEN** Check 1 reports that `openspec/config.yaml` contributed no pin value
  and exits non-zero.

#### Scenario: config openspec_version present but wrong is caught
- **WHEN** `openspec/config.yaml` contains `openspec_version: "1.3.0"` but all
  other hand-maintained pin sites agree on `"1.9.0"`, and the lint job runs
- **THEN** Check 1 reports that `openspec/config.yaml`'s `openspec_version`
  does not equal the agreed pin — via the dedicated coupling assertion, not a
  "distinct versions" report — and exits non-zero.

#### Scenario: config openspec_version agrees with agreed pin
- **WHEN** `openspec/config.yaml` contains `openspec_version: "1.9.0"` and all
  other hand-maintained pin sites also agree on `"1.9.0"`, and the lint job runs
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

#### Scenario: .github/ directory is scanned
- **WHEN** `.github/workflows/ci.yml` contains a hand-maintained
  `@fission-ai/openspec@<version>` occurrence and the lint job runs
- **THEN** Check 1 includes that occurrence in its general agreement scan, so
  a CI-only pin drift is caught.

#### Scenario: .claude/ directory is scanned
- **WHEN** `.claude/skills/qrspi-dogfood/SKILL.md` contains a hand-maintained
  `@fission-ai/openspec@<version>` occurrence and the lint job runs
- **THEN** Check 1 includes that occurrence in its general agreement scan.

#### Scenario: stray @latest reference is caught
- **WHEN** any file in the scanned hand-maintained set contains
  `@fission-ai/openspec@latest` and the lint job runs
- **THEN** Check 1 reports the `@latest` occurrence(s) as a violation and
  exits non-zero, independent of whether the general agreement scan otherwise
  passes.

### Requirement: Validate job runs openspec validate on the reference example
The CI `validate` job MUST run `npx @fission-ai/openspec@<pin> validate --all
--strict` on `ubuntu-latest`, validating every base spec under
`openspec/specs/` and every active change under `openspec/changes/` —
including the hand-authored reference example — and failing the job if any
item reports an error. The explicit `--strict` flag enforces rules the
non-strict `openspec validate <id>` skips (notably that each requirement's
**first line** contains `MUST`/`SHALL`); authoring stages therefore validate
locally with `openspec validate <id> --strict` to match this gate exactly
rather than discovering violations only in CI.

#### Scenario: all specs and active changes pass strict validation
- **WHEN** the validate CI job runs and every base spec and active change (the
  reference example included) is well-formed under strict rules
- **THEN** `openspec validate --all --strict` exits 0 and the job passes.

#### Scenario: a spec violates the strict format
- **WHEN** any base spec or active change violates the spec-delta format — e.g.
  a `## MODIFIED` requirement title does not match a base requirement, or a
  requirement's first line lacks `MUST`/`SHALL` under strict validation
- **THEN** `openspec validate --all --strict` exits non-zero and the job fails.

#### Scenario: ci.yml carries the explicit --strict flag
- **WHEN** `.github/workflows/ci.yml` is inspected after this change ships
- **THEN** its `validate` job step invokes `npx --yes @fission-ai/openspec@1.9.0
  validate --all --strict`, naming the flag explicitly rather than relying on
  an implicit "`--all` runs strict" behaviour.
