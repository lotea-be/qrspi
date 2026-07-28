# kit-governance Specification

## Purpose
TBD - created by archiving change kit-quality-hardening. Update Purpose after archive.
## Requirements
### Requirement: plugin.json version is the sole kit-version authority
The `plugin.json` `version` field MUST be the single source of truth for the
kit version. No separate `VERSION` file or `openspecVersion` key SHALL be
introduced. The kit follows 0.x pre-1.0 semver convention: breaking changes
and new features bump the minor component (0.X.0); fixes, prompt-text changes,
and documentation-only changes bump the patch component (0.0.X). Version 1.0.0
is deferred until the kit is declared stable.

#### Scenario: this change increments the minor version
- **WHEN** `kit-quality-hardening` ships (opsx removal + generator interface
  change, both breaking/new-feature)
- **THEN** `plugin.json` `version` is updated to `0.2.0`.

#### Scenario: a future prompt-text fix ships
- **WHEN** a change updates agent wording with no behavioral or interface change
- **THEN** `plugin.json` `version` is incremented at the patch position only
  (e.g. `0.2.0` → `0.2.1`).

### Requirement: OpenSpec pin bump requires a plugin version bump
The system MUST document and enforce (via `CONTRIBUTING.md`) the coupling rule:
an OpenSpec CLI pin bump (e.g. `1.4.1` → `1.5.0`) is a kit change and MUST be
accompanied by a `plugin.json` version bump — minor if the CLI minor version
moved, patch if only the CLI patch version moved. The inverse is not true: a
plugin version bump does not force an OpenSpec pin reassessment.

#### Scenario: OpenSpec minor pin bump
- **WHEN** the OpenSpec CLI pin is updated from `1.4.1` to `1.5.0`
- **THEN** `plugin.json` version is also incremented at the minor position as
  part of the same commit.

#### Scenario: plugin bump without pin change
- **WHEN** a change bumps `plugin.json` from `0.2.0` to `0.3.0` for unrelated
  reasons
- **THEN** the OpenSpec pin is not required to change.

### Requirement: CONTRIBUTING.md documents contributor workflow
The system MUST provide a `CONTRIBUTING.md` at the repo root containing: the
semver discipline table (what triggers patch vs. minor), the version-bump
checklist (including the pin-coupling rule), and a note that contributor prose
drift on command stubs is a convention-only boundary documented here.

#### Scenario: contributor checks bump requirements
- **WHEN** a contributor adds a new feature to the kit
- **THEN** `CONTRIBUTING.md` tells them which version component to increment
  and whether the OpenSpec pin must be reassessed.

### Requirement: CHANGELOG.md follows Keep-a-Changelog format
The system MUST provide a `CHANGELOG.md` at the repo root in Keep-a-Changelog
format with an `## [Unreleased]` section and an `## [0.1.0]` historical entry.
The opsx removal in this change MUST be documented under the appropriate version
section as a migration note for existing installs.

#### Scenario: first-time reader finds migration notes
- **WHEN** a user with a prior `0.1.0` install reads `CHANGELOG.md`
- **THEN** they find a note in the `0.2.0` section explaining that
  `opsx-*.prompt.md` and `openspec-{propose,explore,apply-change}.instructions.md`
  files have been removed and that re-running the install script will clean them up.

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

### Requirement: migrations/0.10.0.yaml carries a manual note for followup.md overriders
The system MUST append one `manual` note to the existing
`migrations/0.10.0.yaml` file describing the action required by consumers who
have locally overridden `claude/commands/followup.md`. The note MUST advise
those consumers to re-apply their customisations onto the new variant-routing
logic (FIX MODE now spawns `qrspi:implementer-<effort>`, defaulting to
`qrspi:implementer-medium`, instead of the bare `qrspi:implementer`). The note
MUST mirror the structure of the existing `implement.md` override note in
`0.10.0.yaml`. No new migration manifest file is created (this change ships in
the same 0.10.0 line). No version bump is made in `plugin.json` (version
changes only at release per CLAUDE.md). The change is recorded under
`CHANGELOG.md`'s `## [Unreleased]` section.

#### Scenario: 0.10.0.yaml contains the followup.md manual note after the change ships
- **WHEN** `migrations/0.10.0.yaml` is read after the change ships
- **THEN** the `manual` list contains an entry advising consumers who overrode
  `followup.md` to update their customisation to target a variant subagent
  (e.g. `qrspi:implementer-medium`) instead of the deleted base `qrspi:implementer`.

#### Scenario: no new manifest file and no version bump
- **WHEN** the repository is read after the change ships
- **THEN** no new `migrations/<other-version>.yaml` file is present for this
  change, and `plugin.json` `version` is unchanged from its pre-change value.

#### Scenario: change is recorded under CHANGELOG [Unreleased]
- **WHEN** `CHANGELOG.md` is read after the change ships
- **THEN** the `## [Unreleased]` section contains an entry describing the
  unification of implementer dispatch paths onto effort-variants, the deletion
  of the base implementer agent, and the cwd-note addition to eleven commands.

### Requirement: README sync reflects the nine-agent banner set and updated lint-check descriptions
The system MUST update `README.md` in the same change that delivers this delta,
per the CLAUDE.md contract. Required edits: (1) any prose or table that
describes Check 7 or Check 12 as covering "seven stage agents" MUST be updated
to describe the nine-agent set (six stage agents plus the three implementer
effort-variant agents); (2) any agent inventory, count, or list that includes
the base `implementer.md` as a separate entry MUST remove it; (3) the Check 15
description MUST be updated to include the new sub-check (e) (base absent from
`plugin.json`) and to note that the three variants now carry Read/Output
contract banners; (4) a new Check 16 entry MUST be added to the README
describing `checkFollowupStem`. The README MUST remain consistent with the live
source surface after this change.

#### Scenario: README Check 7/12 description references nine agents not seven
- **WHEN** `README.md` is read after the change ships
- **THEN** the Check 7 and Check 12 descriptions reference nine agents (six
  stage agents plus three implementer variants) and do not say "seven stage
  agents."

#### Scenario: README agent inventory omits base implementer
- **WHEN** `README.md` is read after the change ships
- **THEN** no line lists `implementer.md` (the base agent) as a current shipped
  agent file; only the three variant files (`implementer-low`, `implementer-medium`,
  `implementer-high`) appear in any agent inventory.

#### Scenario: README Check 15 description includes sub-check (e) and variant-banner note
- **WHEN** the Check 15 section in `README.md` is read
- **THEN** it mentions sub-check (e) (asserting the base agent is absent from
  `plugin.json`) and notes that the three variants now carry Read/Output contract
  banners.

#### Scenario: README documents Check 16
- **WHEN** `README.md` is read after the change ships
- **THEN** a Check 16 entry exists describing `checkFollowupStem` and its
  purpose (asserting `followup.md` never spawns the bare `qrspi:implementer`
  base stem).

