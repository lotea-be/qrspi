# Spec — kit-governance

> Delta against `openspec/specs/kit-governance/spec.md` for the
> `unify-implement-paths-on-variants` change.
> Adds a manual note to migrations/0.10.0.yaml for consumers who locally
> overrode followup.md; requires README and CHANGELOG sync per the CLAUDE.md
> contract covering agent-inventory and lint-check description changes.

## ADDED Requirements

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
