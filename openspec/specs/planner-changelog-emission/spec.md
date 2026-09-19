# planner-changelog-emission Specification

## Purpose
TBD - created by archiving change emit-changelog-task-and-pr-triage. Update Purpose after archive.

## Requirements

### Requirement: Planner detects kit-touching changes via slices.md scan
The planner MUST scan `slices.md` for any mention of the path prefixes
`claude/`, `openspec-templates/`, or `scripts/` and classify the change as
kit-touching when any such mention is found.

#### Scenario: kit-touching change detected
- **WHEN** `slices.md` contains a line that includes `claude/agents/planner.md`
- **THEN** the planner classifies the change as kit-touching and proceeds to
  emit the CHANGELOG housekeeping task group.

#### Scenario: non-kit change not detected as kit-touching
- **WHEN** `slices.md` contains no mention of `claude/`, `openspec-templates/`,
  or `scripts/`
- **THEN** the planner classifies the change as non-kit-touching and does NOT
  append a Housekeeping group to `tasks.md`.

#### Scenario: openspec-templates path triggers detection
- **WHEN** `slices.md` contains a line that includes `openspec-templates/tasks.template.md`
- **THEN** the planner classifies the change as kit-touching.

#### Scenario: scripts path triggers detection
- **WHEN** `slices.md` contains a line that includes `scripts/lint.mjs`
- **THEN** the planner classifies the change as kit-touching.

### Requirement: Planner appends a Housekeeping group for kit-touching changes
The planner MUST append a standalone trailing `## N. Housekeeping` group
to `tasks.md` when the change is kit-touching, where N equals the last slice
group number plus one, containing exactly one task item with the verbatim text
`Add a \`## [Unreleased]\` entry to \`CHANGELOG.md\` describing this change.`,
a `**Compute:** model=haiku effort=low` annotation, and no `(D<n>)` back-reference.

#### Scenario: housekeeping group appended after last slice group
- **WHEN** the planner writes `tasks.md` for a kit-touching change with three
  slice groups (## 1, ## 2, ## 3)
- **THEN** `tasks.md` ends with a `## 4. Housekeeping` group containing one
  un-ticked checkbox item with the verbatim CHANGELOG task text, and a
  `**Compute:** model=haiku effort=low` annotation line.

#### Scenario: task text is verbatim and unchanged
- **WHEN** the Housekeeping group is written
- **THEN** the task item reads exactly
  `- [ ] N.1 Add a \`## [Unreleased]\` entry to \`CHANGELOG.md\` describing this change.`
  (where N is the group number) with no additional commentary or D-ref suffix.

#### Scenario: no housekeeping group emitted for non-kit-touching changes
- **WHEN** `slices.md` mentions only `openspec/changes/` paths (no `claude/`,
  `openspec-templates/`, or `scripts/` mention) and the planner writes `tasks.md`
- **THEN** no `## N. Housekeeping` group is appended and `tasks.md` ends after
  the last slice group.

### Requirement: Planner divergence self-check exempts the housekeeping task
The planner's divergence self-check (hard-stop condition 4) MUST treat the
CHANGELOG housekeeping task group as a sanctioned standing output — not as
invented scope — so that the task's absence from `slices.md` does NOT trigger
a divergence hard-stop.

#### Scenario: housekeeping task does not trigger divergence self-check
- **WHEN** the planner appends the Housekeeping group to a kit-touching change's
  `tasks.md` and performs the divergence self-check
- **THEN** the planner does NOT signal hard-stop condition 4 for the Housekeeping
  group, because the group is a sanctioned standing task emitted per the planner's
  own kit-touching rule, not an invented scope addition.

#### Scenario: other invented scope still triggers divergence check
- **WHEN** the planner appends a group that is not the CHANGELOG Housekeeping
  group and that group has no basis in `slices.md`
- **THEN** the planner MUST still flag that group as a divergence under
  hard-stop condition 4.
