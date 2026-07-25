# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the `kit-surface-dogfooding` change.
> Renames `CRUD_DENYLIST_HEADINGS` to `SURFACE_GATED_DENYLIST_HEADINGS`, grows
> the Check 11 denylist from 12 to 22 entries, updates Check 11 comments, and
> adds new Check 14 (`checkSurfaceApplicability`) with an inline self-test.

## MODIFIED Requirements

### Requirement: Lint job forbids CRUD headings inside fenced skeleton blocks via Check 11
The CI `lint` job MUST include a Check 11 (`checkNoCrudSkeletonHeadings`) that
scans fenced code blocks in each of the five artifact-producing agent files
(`claude/agents/questioner.md`, `designer.md`, `architect.md`, `planner.md`,
`reviewer.md`) and asserts that none of the following surface-gated heading lines
appear as a heading line inside those blocks: `## Data model`,
`## Indexing & query performance`, `## API`, `## UI`, `## Front-end state`,
`## Auth & authorization`, `## Migrations & data`, `## Data model changes`,
`## API surface`, `## UI surface`, `## Authorization`, `## Migrations`,
`## Slash-command surface`, `## Command changes`, `## Stage-agent surface`,
`## Agent changes`, `## Skill surface`, `## Skill changes`,
`## Lint-gate surface`, `## Lint changes`, `## Template surface`,
`## Migration manifest`. The check MUST match on lines beginning with the
heading marker to avoid false positives on prose mentions outside fenced
blocks. The denylist MUST be stored in a constant named
`SURFACE_GATED_DENYLIST_HEADINGS` (not `CRUD_DENYLIST_HEADINGS`). Check 11
MUST carry a header comment stating two disjoint-scope invariants: (a) Check 3
requires surface-independent headings to be present anywhere in the body; Check
11 requires surface-gated headings to be absent from fenced blocks; no heading
is simultaneously required-present and forbidden. (b) Check 11 scans agent
SOURCE fenced skeletons for a hardcoded gated heading; Check 14 scans committed
ARTIFACT bodies outside fences for an emitted heading whose surface is absent;
the scopes are disjoint (source vs. output; inside-fence vs. outside-fence) so
the checks never fire on the same line. Check 11 MUST be registered in
`scripts/lint.mjs` using the same dependency-free ESM pattern (async function
pushing to `errors[]`, `process.stdout.write('Check 11: ...')` label in
`main()`).

#### Scenario: fenced skeleton in questioner.md contains no surface-gated headings
- **WHEN** `claude/agents/questioner.md` has all surface-gated skeleton headings
  expressed as conditional placeholder comments and `node scripts/lint.mjs` is run
- **THEN** Check 11 reports `OK` for that file and does not contribute a
  non-zero exit.

#### Scenario: re-introduced surface-gated heading inside a fence is caught
- **WHEN** a contributor re-introduces `## Skill changes` as a literal heading
  line inside a fenced skeleton block of one of the five agent files and
  `node scripts/lint.mjs` is run
- **THEN** Check 11 reports a violation naming the file and the offending
  heading, and `node scripts/lint.mjs` exits non-zero.

#### Scenario: prose mention of a surface-gated heading outside a fence is not flagged
- **WHEN** the body of an agent file contains a prose reference to `## Data model`
  outside any fenced block and `node scripts/lint.mjs` is run
- **THEN** Check 11 does not flag that mention, because the check is scoped
  to lines inside fenced blocks only.

#### Scenario: Check 11 does not conflict with Check 3
- **WHEN** `node scripts/lint.mjs` runs after this change ships
- **THEN** Check 3 passes (surface-independent headings `## Testing`,
  `## Sequencing & scope`, `## Open product questions` are present in the
  questioner body) AND Check 11 passes (no surface-gated headings appear inside
  fenced blocks), because the two checks cover disjoint heading sets and
  disjoint scopes.

#### Scenario: Check 11 and Check 14 cover disjoint scopes
- **WHEN** `node scripts/lint.mjs` runs
- **THEN** Check 11 examines agent source files (inside fenced blocks) and Check
  14 examines artifact markdown files (outside fenced blocks); neither check can
  fire on the same line as the other.

## ADDED Requirements

### Requirement: Lint job validates surface applicability of live artifacts via Check 14
The CI `lint` job MUST include a Check 14 (`checkSurfaceApplicability`) that:
(1) reads `.claude/skills/qrspi-stack/SKILL.md`, locates the `## Repo surface`
block, and parses the present-surface list (bullet lines = present surfaces;
the `_No present surfaces._` sentinel = empty set); (2) fails loudly with a
`[surface-applicability]` error if the `## Repo surface` heading is absent OR
if the block yields neither the sentinel nor a parseable bullet list — it MUST
NOT treat absence as "no surfaces" or silently skip the check; (3) uses an
inline-hardcoded `SURFACE_GATED_HEADINGS` map (surface name → array of its
gated heading strings) to compute the absent-surface heading set (union of
headings for all taxonomy surfaces NOT in the present-set); (4) scans every
`*.md` file under `openspec/changes/**` excluding any path containing
`/archive/`, using the existing `walkMd` helper and a path filter; (5) for each
scanned file, skips heading lines inside fenced code blocks (reusing Check 11's
fence-tracking logic) and flags any non-fenced line that equals an absent-surface
heading; (6) on any hit, pushes a `[surface-applicability]` error naming the
file path, line number, the heading found, and the absent surface it belongs to.
Check 14 MUST include an inline in-memory self-test that runs the detection logic
against a synthetic in-memory fixture string containing a known absent-surface
heading, asserts the detector fires, and pushes a `[surface-applicability]` error
to the errors array if the self-test fails to detect the violation. Check 14 MUST
be registered in `scripts/lint.mjs` after Check 13 using the same
dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 14: ...')` label in `main()`). The header comment
block in `scripts/lint.mjs` MUST be updated to list checks 1-14.

#### Scenario: kit with all six surfaces present has no absent-surface heading violations
- **WHEN** the `## Repo surface` block in `qrspi-stack` lists all six kit
  surfaces and no file under `openspec/changes/**` (outside archive) contains a
  web-app surface heading such as `## Data model` or `## API surface`, and
  `node scripts/lint.mjs` is run
- **THEN** Check 14 reports `OK` and does not contribute a non-zero exit.

#### Scenario: an artifact containing an absent-surface heading is flagged
- **WHEN** a file under `openspec/changes/**` (outside archive) contains a line
  `## Data model` and `data-store` is not in the kit's present-surface set, and
  `node scripts/lint.mjs` is run
- **THEN** Check 14 reports a `[surface-applicability]` error naming the file,
  line number, heading, and the `data-store` surface, and exits non-zero.

#### Scenario: fenced heading inside a change artifact is not flagged
- **WHEN** a change artifact contains `## Data model` inside a fenced code block
  as an illustrative example and `node scripts/lint.mjs` is run
- **THEN** Check 14 does not flag the fenced occurrence, because the fence
  tracker skips heading lines inside fenced blocks.

#### Scenario: files under archive are excluded from scanning
- **WHEN** `openspec/changes/archive/YYYY-MM-DD-some-change/design.md` contains
  an absent-surface heading and `node scripts/lint.mjs` is run
- **THEN** Check 14 does not flag the archived file, because the scanner
  excludes paths containing `/archive/`.

#### Scenario: absent Repo surface block causes Check 14 to fail loudly
- **WHEN** `.claude/skills/qrspi-stack/SKILL.md` does not contain a
  `## Repo surface` heading and `node scripts/lint.mjs` is run
- **THEN** Check 14 pushes a `[surface-applicability]` error stating that the
  `## Repo surface` block is required and exits non-zero; it does NOT silently
  treat absence as "no surfaces present".

#### Scenario: inline self-test catches a broken detector
- **WHEN** Check 14's detection logic is invoked and the inline self-test runs
  against a synthetic fixture string containing a known absent-surface heading
- **THEN** the detector fires on the fixture heading; if it fails to fire, a
  `[surface-applicability]` error is pushed to the errors array so CI reports
  the regression.
