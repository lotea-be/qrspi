# ci-quality-gates Specification

## Purpose
TBD - created by archiving change kit-quality-hardening. Update Purpose after archive.
## Requirements
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

### Requirement: Lint job checks gate-tool / executor agreement
The CI `lint` job MUST include a Check 5 (`checkGateExecutor`) that maintains
a hardcoded `MAIN_LOOP_ONLY` set (at minimum `{'AskUserQuestion'}`) and, for
each `claude/commands/*.md`, flags a violation if the command's frontmatter
declares a non-builtin `agent:` AND the command's body **reaches** a tool in
`MAIN_LOOP_ONLY`. A body reaches such a tool either **directly** (the tool name
appears in the body text) or **transitively** (the body references the
`workflow` "Stage choreography" procedures — commit step / next-stage
handoff / approval gate — which invoke a main-loop-only tool on the command's
behalf). Builtins (`build`, `agent`) MUST be excluded from the check. Check 5
MUST be registered in `scripts/lint.mjs` after Check 4 using the same
dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 5: ...')` label in `main()`).

#### Scenario: stage command carries gate-trapping agent: pairing (inline tool)
- **WHEN** a `claude/commands/*.md` file declares `agent: questioner` (a
  non-builtin) AND its body references `AskUserQuestion`, and the lint job runs
- **THEN** Check 5 reports a violation and `node scripts/lint.mjs` exits
  non-zero.

#### Scenario: stage command traps gates transitively via the skill
- **WHEN** a `claude/commands/*.md` file declares `agent: researcher` (a
  non-builtin) AND its body does NOT name `AskUserQuestion` directly but
  references the `workflow` "Stage choreography" commit step / next-stage
  handoff (which invoke `AskUserQuestion`), and the lint job runs
- **THEN** Check 5 reports a violation, because the body transitively reaches a
  main-loop-only tool that would be trapped in the subagent.

#### Scenario: stage commands after fix pass Check 5
- **WHEN** the nine stage commands have had `agent:` and the fork directive
  removed (per this change) and the lint job runs
- **THEN** Check 5 finds no command with both a non-builtin `agent:` and a
  body reference to a main-loop-only tool, and reports `OK`.

#### Scenario: helper commands with builtin agent: are not flagged
- **WHEN** `archive.md`, `init.md`, or `stack.md` declare `agent: build`
  and the lint job runs
- **THEN** Check 5 does not flag them, because `build` is in the
  `BUILTIN_AGENTS` exclusion set.

#### Scenario: no-agent commands pass Check 5
- **WHEN** `retro.md` and `status.md` (which carry no `agent:` field) are
  evaluated by Check 5
- **THEN** Check 5 does not flag them, because the check only applies to
  commands with a non-builtin `agent:` declaration.

#### Scenario: future command re-adds gate-trapping pattern is caught
- **GIVEN** a contributor adds a new command with `agent: planner` in
  frontmatter and an `AskUserQuestion` call in the body
- **WHEN** `node scripts/lint.mjs` runs in CI
- **THEN** Check 5 flags the new command as a violation, preventing the
  gate-trapping bug from recurring silently.

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

### Requirement: Lint job validates agent read-contract banners via Check 7
The CI `lint` job MUST include a Check 7 (`checkReadContracts`) that parses
each of the seven QRSPI stage agent files (`claude/agents/researcher.md`,
`questioner.md`, `designer.md`, `architect.md`, `planner.md`,
`implementer.md`, `reviewer.md`) for their read-contract banner's `Reads:`
field and asserts it equals the agent's expected row in the approved read-matrix.
This is a banner-keyed POSITIVE check (not a free-prose forbidden-token scan):
it extracts the `Reads:` value from the terse banner block and compares it
against a hardcoded expected value per agent. The check MUST handle the
architect's two-mode contract (stage S: `design.md` only; stage V:
`proposal.md + specs/`) and MUST special-case the reviewer as "full
change-folder by design." The check MUST NOT flag `/qrspi:update`,
`qrspi-update`, or any non-stage-agent file. Check 7 MUST be registered in
`scripts/lint.mjs` after Check 6 using the same dependency-free ESM pattern
(async function pushing to `errors[]`, `process.stdout.write('Check 7: ...')`)
label in `main()`).

#### Scenario: agent banner Reads field matches matrix row
- **WHEN** all seven stage agent files carry read-contract banners whose
  `Reads:` fields match the approved read-matrix rows and `node scripts/lint.mjs`
  is run
- **THEN** Check 7 reports `OK` and exits 0.

#### Scenario: architect banner with wrong Reads field is caught
- **WHEN** `claude/agents/architect.md`'s read-contract banner has a `Reads:`
  field that names `questions.md` (forbidden at both S and V) and
  `node scripts/lint.mjs` is run
- **THEN** Check 7 reports a violation for the architect agent and exits
  non-zero.

#### Scenario: banner missing from an agent file is caught
- **WHEN** one of the seven agent files lacks a read-contract banner entirely
  and `node scripts/lint.mjs` is run
- **THEN** Check 7 reports a missing-banner violation for that agent and
  exits non-zero.

#### Scenario: update command and skill are not flagged by Check 7
- **WHEN** `claude/commands/update.md` and `claude/skills/qrspi-update/SKILL.md`
  do not carry read-contract banners and `node scripts/lint.mjs` is run
- **THEN** Check 7 does not flag either file, because they are not Q→PR stage
  agents.

### Requirement: Lint job checks PR reconciliation passes via Check 8
The CI `lint` job MUST include a Check 8 (`checkPrReconciliationPasses`) that
asserts `claude/commands/pr.md` contains both reconciliation passes. The check
MUST match on stable structural anchors — the presence of a "tasks pass" and
a "follow-ups pass" section and the two option-set signatures (`Finish`,
`Drop`, `Pause` for tasks; and the four-option set `Fix now`, `Defer`, `Drop`,
`Promote` for follow-ups) — rather than incidental wording, to remain robust
against prose edits while still catching the accidental deletion of an entire
pass. Check 8 MUST be registered in `scripts/lint.mjs` after Check 7 using
the same dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 8: ...')` label in `main()`).

#### Scenario: pr.md carrying both passes passes Check 8
- **WHEN** `claude/commands/pr.md` contains both a tasks-pass section (with
  Finish / Drop / Pause option anchors) and a follow-ups-pass section (with
  Fix now / Defer / Drop / Promote option anchors) and `node scripts/lint.mjs`
  is run
- **THEN** Check 8 reports `OK` and does not contribute a non-zero exit.

#### Scenario: tasks pass deleted from pr.md is caught by Check 8
- **WHEN** a contributor edits `claude/commands/pr.md` and removes the tasks
  pass section (including its Finish / Drop / Pause option anchors), and the
  lint job runs
- **THEN** Check 8 reports a violation ("tasks pass missing from pr.md") and
  `node scripts/lint.mjs` exits non-zero.

#### Scenario: follow-ups pass deleted from pr.md is caught by Check 8
- **WHEN** a contributor edits `claude/commands/pr.md` and removes the
  follow-ups pass section (including its Fix now / Defer / Drop / Promote
  option anchors), and the lint job runs
- **THEN** Check 8 reports a violation ("follow-ups pass missing from pr.md")
  and `node scripts/lint.mjs` exits non-zero.

#### Scenario: Check 8 uses structural anchors, not exact prose
- **WHEN** a contributor rewrites the prose around the tasks pass (changing
  wording) but keeps the Finish / Drop / Pause option labels and the tasks-pass
  heading, and the lint job runs
- **THEN** Check 8 passes, because it matches on the structural anchors (option
  labels + section heading), not on incidental surrounding prose.

