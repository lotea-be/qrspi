# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `repo-applicable-artifact-sections` change. Shrinks Check 3's required
> questioner heading set (10→3) and adds Check 11
> (`checkNoCrudSkeletonHeadings`).

## ADDED Requirements

### Requirement: Lint job forbids CRUD headings inside fenced skeleton blocks via Check 11
The CI `lint` job MUST include a Check 11 (`checkNoCrudSkeletonHeadings`) that
scans fenced code blocks in each of the five artifact-producing agent files
(`claude/agents/questioner.md`, `designer.md`, `architect.md`, `planner.md`,
`reviewer.md`) and asserts that none of the following CRUD heading lines appear
as a heading line inside those blocks: `## Data model`, `## Indexing & query
performance`, `## API`, `## UI`, `## Front-end state`, `## Auth & authorization`,
`## Migrations & data`, `## Data model changes`, `## API surface`, `## UI
surface`, `## Authorization`, `## Migrations`. The check MUST match on lines
beginning with the heading marker to avoid false positives on prose mentions of
these headings outside fenced blocks. Check 11 MUST be registered in
`scripts/lint.mjs` after Check 10 using the same dependency-free ESM pattern
(async function pushing to `errors[]`, `process.stdout.write('Check 11: ...')`
label in `main()`). Check 11 MUST carry a header comment stating the
disjoint-set invariant: Check 3 requires surface-independent headings to be
present anywhere in the body; Check 11 requires CRUD headings to be absent
from fenced blocks; no heading is simultaneously required-present and forbidden.

#### Scenario: fenced skeleton in questioner.md contains no CRUD headings
- **WHEN** `claude/agents/questioner.md` has had its CRUD skeleton headings
  replaced by a conditional placeholder and `node scripts/lint.mjs` is run
- **THEN** Check 11 reports `OK` for that file and does not contribute a
  non-zero exit.

#### Scenario: re-introduced CRUD heading inside a fence is caught
- **WHEN** a contributor re-introduces `## Migrations` as a literal heading line
  inside a fenced skeleton block of one of the five agent files and
  `node scripts/lint.mjs` is run
- **THEN** Check 11 reports a violation naming the file and the offending
  heading, and `node scripts/lint.mjs` exits non-zero.

#### Scenario: prose mention of a CRUD heading outside a fence is not flagged
- **WHEN** the body of an agent file contains a prose reference to `## Data model`
  outside any fenced block and `node scripts/lint.mjs` is run
- **THEN** Check 11 does not flag that mention, because the check is scoped
  to lines inside fenced blocks only.

#### Scenario: Check 11 does not conflict with Check 3
- **WHEN** `node scripts/lint.mjs` runs after this change ships
- **THEN** Check 3 passes (surface-independent headings `## Testing`,
  `## Sequencing & scope`, `## Open product questions` are present in the
  questioner body) AND Check 11 passes (no CRUD headings appear inside fenced
  blocks), because the two checks cover disjoint heading sets and disjoint scopes.

## MODIFIED Requirements

### Requirement: Lint job checks skeleton heading alignment
The CI `lint` job MUST verify that the canonical section headings from each
`openspec-templates/*.template.md` file also appear in the corresponding inline
skeleton embedded in the relevant agent file, failing if any canonical heading
is absent from the agent's inline skeleton. For the questioner agent and its
`questions.template.md`, the canonical heading set MUST be the three
surface-independent headings only: `## Testing`, `## Sequencing & scope`, and
`## Open product questions (for the human)`. The seven CRUD headings previously
in the questioner's required set (`## Data model`, `## Indexing & query
performance`, `## API`, `## UI`, `## Front-end state`, `## Auth & authorization`,
`## Migrations & data`) MUST NOT be in the canonical required set; their
presence or absence in a skeleton is governed by the `repo-surface` filter and
guarded against hard-coding by Check 11. The designer, architect, and planner
canonical heading sets are unchanged (surface-independent headers only).

#### Scenario: inline skeleton missing a canonical heading
- **WHEN** a canonical heading such as `## ADDED Requirements` appears in
  `openspec-templates/spec-delta.template.md` but is absent from the inline
  skeleton in `qrspi-architect.md`, and the lint job runs
- **THEN** the lint job reports the missing heading and exits non-zero.

#### Scenario: questioner skeleton missing Testing heading is caught
- **WHEN** `## Testing` is absent from the questioner's inline skeleton and
  `node scripts/lint.mjs` is run
- **THEN** Check 3 reports a violation because `## Testing` is in the
  surface-independent required set.

#### Scenario: questioner skeleton lacking a CRUD heading does not trigger Check 3
- **WHEN** the questioner's inline skeleton contains no `## Data model` heading
  because it has been replaced by a conditional placeholder, and
  `node scripts/lint.mjs` is run
- **THEN** Check 3 does NOT report a violation for the missing CRUD heading,
  because `## Data model` is no longer in the questioner's required set.
