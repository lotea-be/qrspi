# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `emit-changelog-task-and-pr-triage` change. Adds Check 25
> `checkChangelogTaskEmission` — a mechanical backstop asserting that every
> active kit-touching change folder's `tasks.md` carries a CHANGELOG task line.

## ADDED Requirements

### Requirement: Lint job asserts CHANGELOG task presence in kit-touching change folders via Check 25
The system MUST include a Check 25 (`checkChangelogTaskEmission`) registered in
`scripts/lint.mjs` after `checkResearcherGateInstruction` (Check 24), using the
same dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 25: ...')` label in `main()`). Check 25 MUST walk
every active change folder under `openspec/changes/**`, excluding any path
containing `/archive/`, and for each folder determine whether it is kit-touching
by scanning the folder's own `tasks.md` AND its `specs/**` files for any mention
of `claude/`, `openspec-templates/`, or `scripts/`. For each folder judged
kit-touching, Check 25 MUST assert that the folder's `tasks.md` contains at least
one checkbox line (a line containing `- [ ]` or `- [x]`) that also contains the
substring `CHANGELOG` (case-sensitive). A kit-touching folder whose `tasks.md`
lacks any such line MUST cause Check 25 to push an error and exit non-zero. Check
25 MUST carry an inline in-memory self-test (the Check 13 convention): a synthetic
fixture exercising both the kit-touching detection and the CHANGELOG-presence
assertion MUST be included; if the self-test fails, a Check 25 self-test error
MUST be pushed to `errors[]` so CI reports the regression. Check 25 MUST update
the `// 25.` header-block comment in `scripts/lint.mjs`. The check-count
references in `README.md`, `.claude/skills/qrspi-stack/SKILL.md` (`## Build,
lint & test commands`), and `CHANGELOG.md` MUST be updated to reflect 25 checks.

#### Scenario: kit-touching change with CHANGELOG task passes Check 25
- **WHEN** an active change folder's `tasks.md` contains
  `- [ ] 4.1 Add a \`## [Unreleased]\` entry to \`CHANGELOG.md\` describing this change.`
  and the folder's files mention `claude/`
- **THEN** Check 25 reports `OK` for that folder and does not contribute a
  non-zero exit.

#### Scenario: kit-touching change missing CHANGELOG task fails Check 25
- **WHEN** an active change folder's `tasks.md` and `specs/**` mention `claude/`
  but `tasks.md` contains no checkbox line with the substring `CHANGELOG`
- **THEN** Check 25 pushes an error naming the change folder and `node
  scripts/lint.mjs` exits non-zero.

#### Scenario: non-kit-touching change not flagged by Check 25
- **WHEN** an active change folder's `tasks.md` and `specs/**` contain no
  mention of `claude/`, `openspec-templates/`, or `scripts/`
- **THEN** Check 25 does not assert CHANGELOG task presence for that folder
  and reports no violation.

#### Scenario: ticked CHANGELOG task also satisfies Check 25
- **WHEN** a kit-touching change folder's `tasks.md` contains
  `- [x] 4.1 Add a \`## [Unreleased]\` entry to \`CHANGELOG.md\` describing this change.`
  (already ticked)
- **THEN** Check 25 reports `OK`, because the check asserts task presence, not
  doneness.

#### Scenario: archived change folders excluded from Check 25 scan
- **WHEN** an archived change folder under `openspec/changes/archive/` lacks a
  CHANGELOG task line in its `tasks.md`
- **THEN** Check 25 does not scan or flag the archived folder, because the
  scanner excludes paths containing `/archive/`.

#### Scenario: inline self-test catches a broken Check 25 detector
- **WHEN** Check 25's inline self-test runs as part of `node scripts/lint.mjs`
- **THEN** the synthetic fixture exercises kit-touching detection and CHANGELOG
  presence assertion; if either sub-test fails, a Check 25 self-test error is
  pushed to `errors[]` so CI reports the regression.
