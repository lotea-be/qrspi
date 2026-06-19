# Spec — ci-quality-gates

> New capability introduced by the `kit-quality-hardening` change. Defines the
> GitHub Actions CI workflow that mechanically enforces sync correctness, version
> pin agreement, frontmatter validity, skeleton heading alignment, and spec
> validation on every PR and post-merge push.

## ADDED Requirements

### Requirement: CI workflow file exists and triggers correctly
The system MUST provide a `.github/workflows/ci.yml` GitHub Actions workflow
that triggers on `pull_request` targeting `main`, `push` to `main` (post-merge
drift detection), and `workflow_dispatch` (manual re-check).

#### Scenario: PR opened against main
- **WHEN** a pull request is opened or updated targeting the `main` branch
- **THEN** the CI workflow runs all three parallel jobs automatically.

#### Scenario: direct push to main
- **WHEN** a commit is pushed directly to `main`
- **THEN** the CI workflow runs all three parallel jobs to detect post-merge drift.

### Requirement: Drift job fails on sync divergence
The CI workflow MUST include a `drift` job that runs `node sync-copilot.mjs --check`
on `ubuntu-latest` and fails the check if the committed `copilot/` tree diverges
from what `sync-copilot.mjs` would generate.

#### Scenario: copilot/ is out of sync with claude/
- **WHEN** the drift CI job runs and `node sync-copilot.mjs --check` exits non-zero
- **THEN** the drift job fails with a non-zero exit code, blocking the PR.

#### Scenario: copilot/ is in sync
- **WHEN** the drift CI job runs and `node sync-copilot.mjs --check` exits 0
- **THEN** the drift job passes.

### Requirement: Lint job validates pin agreement
The CI `lint` job MUST assert that every hand-maintained occurrence of the
OpenSpec version pin (excluding `generatedBy:` lines in OpenSpec-generated skill
files) agrees, and MUST fail if any occurrence diverges from the others.

#### Scenario: pin mismatch introduced
- **WHEN** a contributor updates the pin in one location but not all others and
  the lint job runs
- **THEN** the lint job reports the mismatched occurrence(s) and exits non-zero.

#### Scenario: generatedBy lines excluded from pin lint
- **WHEN** the lint job runs and `generatedBy: "1.4.1"` appears in
  OpenSpec-generated skill files
- **THEN** those occurrences are not counted as hand-maintained pin sites and
  do not cause lint failures.

### Requirement: Lint job validates frontmatter and name resolution
The CI `lint` job MUST verify that every agent file has `name:` and
`description:` frontmatter fields, every command file has a `description:`
field, every skill `SKILL.md` has `name:` and `description:` fields, every
`agent:` reference in a command file resolves to an actual agent file or
built-in name, every `model:` field uses an alias (`opus`, `sonnet`, `haiku`)
and not a pinned model id, and every `Load skill X` reference in an agent body
resolves to a real `claude/skills/<X>/SKILL.md`.

#### Scenario: dangling skill reference
- **WHEN** an agent body contains `Load skill missing-skill` and no
  `claude/skills/missing-skill/SKILL.md` exists, and the lint job runs
- **THEN** the lint job reports the unresolved reference and exits non-zero.

#### Scenario: model alias used correctly
- **WHEN** all agent `model:` frontmatter fields use aliases (`opus`, `sonnet`,
  or `haiku`) and the lint job runs
- **THEN** the lint job passes the model-alias check.

### Requirement: Lint job checks skeleton heading alignment
The CI `lint` job MUST verify that the canonical section headings from each
`openspec-templates/*.template.md` file also appear in the corresponding inline
skeleton embedded in the relevant agent file, failing if any canonical heading
is absent from the agent's inline skeleton.

#### Scenario: inline skeleton missing a canonical heading
- **WHEN** a canonical heading such as `## ADDED Requirements` appears in
  `openspec-templates/spec-delta.template.md` but is absent from the inline
  skeleton in `qrspi-architect.md`, and the lint job runs
- **THEN** the lint job reports the missing heading and exits non-zero.

### Requirement: Validate job runs openspec validate on the reference example
The CI `validate` job MUST run `npx @fission-ai/openspec@<pin> validate` against
the reference example change on `ubuntu-latest`, failing the job if validation
reports any error.

#### Scenario: reference example passes validation
- **WHEN** the validate CI job runs against the hand-authored reference example
- **THEN** `openspec validate` exits 0 and the job passes.

#### Scenario: reference example has a malformed spec
- **WHEN** a spec file in the reference example violates the spec-delta format
  (e.g., a `## MODIFIED` requirement title does not match a base requirement)
  and the validate job runs
- **THEN** `openspec validate` exits non-zero and the job fails.

### Requirement: CI jobs run in parallel on ubuntu-latest
The three CI jobs (`drift`, `lint`, `validate`) MUST run in parallel (no
`needs:` dependency between them) on the `ubuntu-latest` runner. No OS matrix
is required.

#### Scenario: lint failure does not mask drift failure
- **WHEN** both the lint and drift jobs fail in the same CI run
- **THEN** both failures are reported independently and visible in the GitHub
  Actions summary.
