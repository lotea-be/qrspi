# Spec — kit-governance

> Delta against `openspec/specs/kit-governance/spec.md` for the
> `versioned-update-command` change. Extends the release checklist in
> CONTRIBUTING.md to require a migration manifest entry for every release, and
> adds that requirement to the `qrspi-release` dev-tooling skill's preconditions.

## ADDED Requirements

### Requirement: Every release ships a migration manifest entry
The system MUST require that every kit release, without exception, includes a
`migrations/<version>.yaml` file whose `version` field matches the release
version. A release with no consumer impact MUST ship a stub with empty
`automated` and `manual` lists and a `summary` stating no consumer action is
required. This requirement is enforced mechanically by the `scripts/lint.mjs`
migration-presence check (which runs on every PR and in `release.yml`) and MUST
NOT rely on the release author's judgment about consumer impact.

#### Scenario: PR for a patch-only release includes a stub
- **WHEN** a contributor opens a PR that bumps `plugin.json` to a patch version
  with no consumer-facing change
- **THEN** the PR also includes a `migrations/<new-version>.yaml` stub (with
  empty lists and an appropriate `summary`), and the CI lint check passes.

#### Scenario: PR missing a manifest entry fails lint
- **WHEN** a contributor opens a PR that bumps `plugin.json` to a new version
  but does not include a corresponding `migrations/<new-version>.yaml` file
- **THEN** the CI lint job fails, blocking the PR from merging.

### Requirement: CONTRIBUTING.md release checklist includes the manifest entry step
The `CONTRIBUTING.md` version-bump checklist MUST include a step requiring the
release author to write (or verify) the `migrations/<version>.yaml` file before
cutting the release. The step MUST appear alongside the existing `CHANGELOG.md`
roll step so that both artifacts are treated as release prerequisites.

#### Scenario: contributor follows the release checklist
- **WHEN** a contributor reads the "To cut a release" or "Version-bump checklist"
  section of `CONTRIBUTING.md`
- **THEN** they find a step that explicitly requires writing
  `migrations/<version>.yaml` before tagging.

### Requirement: qrspi-release skill preconditions include manifest entry presence
The `.claude/skills/qrspi-release/SKILL.md` preconditions list MUST include a
hard-stop check that `migrations/<target-version>.yaml` exists before proceeding
with the release flow. If the file is absent, the skill MUST surface an explicit
error and halt, matching the hard-stop discipline applied to other release
prerequisites (clean tree, `[Unreleased]` having real content, etc.).

#### Scenario: release skill halts when manifest entry is missing
- **WHEN** a contributor invokes `/qrspi-release` with a target version for which
  no `migrations/<version>.yaml` exists
- **THEN** the skill reports the missing manifest entry as a hard-stop and does
  not proceed to bump `plugin.json` or roll the CHANGELOG.

#### Scenario: release skill proceeds when manifest entry is present
- **WHEN** `migrations/<target-version>.yaml` exists and is schema-valid
- **THEN** the manifest-presence precondition passes and the release flow
  continues to the next gate.
