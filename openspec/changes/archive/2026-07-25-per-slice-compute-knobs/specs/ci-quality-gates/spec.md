# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `per-slice-compute-knobs` change. Adds Check 13 (`checkComputeAnnotations`)
> for value-validating `**Compute:**` annotations in committed slices.md and
> tasks.md files, and extends Check 2 to validate the new `effort:` frontmatter
> field on all seven agent files.

## ADDED Requirements

### Requirement: Lint job validates Compute annotation values via Check 13
The CI `lint` job MUST include a Check 13 (`checkComputeAnnotations`) that
parses every `**Compute:**` line in `openspec/changes/**/slices.md` and
`**/tasks.md` and flags: a `model=` value not in `{sonnet, opus}`; an `effort=`
value that is present but not in `{low, medium, high}`; and a missing or empty
`model=` token. Check 13 MUST tolerate both structural forms of the line (the
`-` bullet form in `slices.md` and the bare bold form in `tasks.md`) by matching
on the `**Compute:**` token rather than the line prefix. Check 13 MUST perform
value-validation only — it MUST NOT assert the presence of a `**Compute:**`
line on every slice, nor validate that a model value matches any heuristic. Check
13 MUST be registered in `scripts/lint.mjs` after Check 12 using the same
dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 13: ...')` label in `main()`). The header comment
block in `scripts/lint.mjs` MUST be updated to list checks 1–13.

#### Scenario: unknown model alias is flagged by Check 13
- **WHEN** `openspec/changes/<id>/slices.md` contains `- **Compute:** model=haiku — small task` and `node scripts/lint.mjs` is run
- **THEN** Check 13 reports a violation because `haiku` is not in `{sonnet, opus}` and `node scripts/lint.mjs` exits non-zero.

#### Scenario: invalid effort value is flagged by Check 13
- **WHEN** `openspec/changes/<id>/tasks.md` contains `**Compute:** model=sonnet effort=medium-high — rationale` and `node scripts/lint.mjs` is run
- **THEN** Check 13 reports a violation because `medium-high` is not in `{low, medium, high}` and exits non-zero.

#### Scenario: missing model= token is flagged by Check 13
- **WHEN** `openspec/changes/<id>/slices.md` contains `- **Compute:** effort=medium — rationale` (no `model=` token) and `node scripts/lint.mjs` is run
- **THEN** Check 13 reports a violation because `model=` is required and exits non-zero.

#### Scenario: valid Compute line in dash-bullet form passes Check 13
- **WHEN** `openspec/changes/<id>/slices.md` contains `- **Compute:** model=sonnet effort=low — boilerplate entity` and `node scripts/lint.mjs` is run
- **THEN** Check 13 passes for that line and does not contribute a non-zero exit.

#### Scenario: valid Compute line in bare-bold form passes Check 13
- **WHEN** `openspec/changes/<id>/tasks.md` contains `**Compute:** model=opus — first real-time hub` (no effort=) and `node scripts/lint.mjs` is run
- **THEN** Check 13 passes for that line (effort= is optional and its absence is valid).

#### Scenario: Check 13 does not assert presence of Compute on every slice
- **WHEN** `openspec/changes/<id>/slices.md` has a `### Slice N` block with no `**Compute:**` line and `node scripts/lint.mjs` is run
- **THEN** Check 13 does NOT report a violation for the absence, because Check 13 is value-validation only.

## MODIFIED Requirements

### Requirement: Lint job validates frontmatter and name resolution
The CI `lint` job MUST verify that every agent file has `name:` and
`description:` frontmatter fields, every command file has a `description:`
field, every skill `SKILL.md` has `name:` and `description:` fields, every
`agent:` reference in a command file resolves to an actual agent file or
built-in name, every `model:` field uses an alias (`opus`, `sonnet`, `haiku`)
and not a pinned model id, every `Load skill X` reference in an agent body
resolves to a real `claude/skills/<X>/SKILL.md`, and every `effort:` field in
an agent frontmatter uses a value from `{low, medium, high}` (rejecting
`xhigh` and `max` to keep the kit surface small).

#### Scenario: dangling skill reference
- **WHEN** an agent body contains `Load skill missing-skill` and no
  `claude/skills/missing-skill/SKILL.md` exists, and the lint job runs
- **THEN** the lint job reports the unresolved reference and exits non-zero.

#### Scenario: model alias used correctly
- **WHEN** all agent `model:` frontmatter fields use aliases (`opus`, `sonnet`,
  or `haiku`) and the lint job runs
- **THEN** the lint job passes the model-alias check.

#### Scenario: valid effort value passes Check 2
- **WHEN** an agent file carries `effort: high` in its frontmatter and `node scripts/lint.mjs` is run
- **THEN** Check 2 passes the effort-value check for that agent.

#### Scenario: invalid effort value fails Check 2
- **WHEN** an agent file carries `effort: xhigh` in its frontmatter and `node scripts/lint.mjs` is run
- **THEN** Check 2 reports a violation because `xhigh` is not in `{low, medium, high}` and exits non-zero.

#### Scenario: missing effort field fails Check 2
- **WHEN** an agent file is missing the `effort:` frontmatter key after the change ships and `node scripts/lint.mjs` is run
- **THEN** Check 2 reports a violation because all seven stage agents are required to carry `effort:`.
