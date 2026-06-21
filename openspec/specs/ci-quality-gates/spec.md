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
`qrspi-workflow` "Stage choreography" procedures — commit step / next-stage
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
  references the `qrspi-workflow` "Stage choreography" commit step / next-stage
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

