# Spec — kit-governance

> New capability introduced by the `kit-quality-hardening` change. Defines
> the versioning authority, contributor documentation, changelog format, and
> the coupling rule between the plugin version and the OpenSpec pin.

## ADDED Requirements

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
semver discipline table (what triggers patch vs. minor), the sync workflow
(edit `claude/`, run `node sync-copilot.mjs`, commit both `claude/` and
`copilot/`), the version-bump checklist (including the pin-coupling rule), and
a note that contributor prose drift on command stubs is a convention-only
boundary documented here.

#### Scenario: contributor checks bump requirements
- **WHEN** a contributor adds a new feature to the kit
- **THEN** `CONTRIBUTING.md` tells them which version component to increment
  and whether the OpenSpec pin must be reassessed.

#### Scenario: contributor performs a sync
- **WHEN** a contributor edits a `claude/` source file
- **THEN** `CONTRIBUTING.md` describes running `node sync-copilot.mjs` and
  committing both the source and generated changes together.

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
