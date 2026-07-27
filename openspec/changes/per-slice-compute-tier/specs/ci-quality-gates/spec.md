# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `per-slice-compute-tier` change. Adds `haiku` to the Check 13 allowed
> model set; flips the required/optional roles of `effort=` and `model=`;
> and adds Check 15 `checkVariantAgents` for variant-fleet drift prevention.

## MODIFIED Requirements

### Requirement: Lint job validates Compute annotation values via Check 13
The CI `lint` job MUST include a Check 13 (`checkComputeAnnotations`) that
parses every `**Compute:**` line in `openspec/changes/**/slices.md` and
`**/tasks.md` and flags: a `model=` value not in `{haiku, sonnet, opus}`; an
`effort=` value that is present but not in `{low, medium, high}`; and a
missing or empty `effort=` token (effort is now required — a `**Compute:**`
line with no `effort=` token MUST be flagged as a violation). Check 13 MUST
tolerate both structural forms of the line (the `-` bullet form in `slices.md`
and the bare bold form in `tasks.md`) by matching on the `**Compute:**` token
rather than the line prefix. Check 13 MUST perform value-validation only — it
MUST NOT assert the presence of a `**Compute:**` line on every slice, nor
validate that a model value matches any heuristic. The `COMPUTE_MODELS`
constant in `scripts/lint.mjs` MUST be updated to `['sonnet', 'opus', 'haiku']`
and its adjacent comment MUST be updated to reflect that a haiku heuristic now
exists. Check 13 MUST be registered in `scripts/lint.mjs` after Check 12 using
the same dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 13: ...')` label in `main()`).

#### Scenario: haiku is now a valid model alias under Check 13
- **WHEN** `openspec/changes/<id>/slices.md` contains `- **Compute:** effort=low model=haiku — mechanical rename` and `node scripts/lint.mjs` is run
- **THEN** Check 13 passes for that line; `haiku` is in the `{haiku, sonnet, opus}` allowed set and does not cause a violation.

#### Scenario: missing effort= token is flagged by Check 13
- **WHEN** `openspec/changes/<id>/slices.md` contains `- **Compute:** model=sonnet — first real-time hub` (no `effort=` token) and `node scripts/lint.mjs` is run
- **THEN** Check 13 reports a violation because `effort=` is now required on every `**Compute:**` line, and `node scripts/lint.mjs` exits non-zero.

#### Scenario: valid Compute line with all tokens passes Check 13
- **WHEN** `openspec/changes/<id>/slices.md` contains `- **Compute:** effort=medium model=sonnet — boilerplate entity` and `node scripts/lint.mjs` is run
- **THEN** Check 13 passes for that line and does not contribute a non-zero exit.

#### Scenario: valid Compute line with effort= only (model= omitted) passes Check 13
- **WHEN** `openspec/changes/<id>/tasks.md` contains `**Compute:** effort=high — first-of-kind pattern` (no `model=`) and `node scripts/lint.mjs` is run
- **THEN** Check 13 passes for that line; an absent `model=` token is valid (it defaults to sonnet at runtime) and does not cause a violation.

#### Scenario: unknown model alias is flagged by Check 13
- **WHEN** `openspec/changes/<id>/slices.md` contains `- **Compute:** effort=low model=gemini — small task` and `node scripts/lint.mjs` is run
- **THEN** Check 13 reports a violation because `gemini` is not in `{haiku, sonnet, opus}` and `node scripts/lint.mjs` exits non-zero.

#### Scenario: invalid effort value is flagged by Check 13
- **WHEN** `openspec/changes/<id>/tasks.md` contains `**Compute:** effort=medium-high model=sonnet — rationale` and `node scripts/lint.mjs` is run
- **THEN** Check 13 reports a violation because `medium-high` is not in `{low, medium, high}` and exits non-zero.

#### Scenario: Check 13 does not assert presence of Compute on every slice
- **WHEN** `openspec/changes/<id>/slices.md` has a `### Slice N` block with no `**Compute:**` line and `node scripts/lint.mjs` is run
- **THEN** Check 13 does NOT report a violation for the absence, because Check 13 is value-validation only.

## ADDED Requirements

### Requirement: Lint job validates implementer variant fleet coverage and consistency via Check 15
The CI `lint` job MUST include a Check 15 (`checkVariantAgents`) registered in
`scripts/lint.mjs` after Check 14, using the same dependency-free ESM pattern
(async function pushing to `errors[]`, `process.stdout.write('Check 15: ...')`
label in `main()`). Check 15 MUST assert all three drift-prevention invariants:
(a) Coverage: the set of `claude/agents/implementer-*.md` stems exactly equals
the registry constant `IMPLEMENTER_VARIANTS = ['implementer-low',
'implementer-medium', 'implementer-high']` — any missing or stray variant
MUST be flagged; (b) Core load: each variant's step-1 "Load skills" line (as
harvested by the Check 2b harvest logic) loads only `implementer-core` —
the allowed set is exactly `{implementer-core}`, and any other unconditional
skill on that line MUST be flagged; (c) Content-matches-name: each variant's
frontmatter `effort:` value MUST match its stem suffix (`implementer-low` →
`effort: low`, etc.) — a mismatch MUST be flagged. Check 15 MUST carry an
inline in-memory self-test that runs the detection logic against a synthetic
fixture and asserts the detector fires; if it fails, a Check 15 error is pushed
to the errors array so CI reports the regression.

#### Scenario: all three variants present with correct stems pass Check 15 coverage
- **WHEN** `claude/agents/implementer-low.md`, `implementer-medium.md`, and `implementer-high.md` exist and no other `implementer-*.md` file is present, and `node scripts/lint.mjs` is run
- **THEN** Check 15 reports `OK` for the coverage assertion and does not contribute a non-zero exit.

#### Scenario: stray variant file is caught by Check 15 coverage
- **WHEN** a contributor adds `claude/agents/implementer-xhigh.md` alongside the three approved variants and `node scripts/lint.mjs` is run
- **THEN** Check 15 reports a coverage violation because `implementer-xhigh` is not in `IMPLEMENTER_VARIANTS`, and `node scripts/lint.mjs` exits non-zero.

#### Scenario: missing variant file is caught by Check 15 coverage
- **WHEN** `claude/agents/implementer-medium.md` is deleted and `node scripts/lint.mjs` is run
- **THEN** Check 15 reports a coverage violation because `implementer-medium` is in `IMPLEMENTER_VARIANTS` but has no corresponding file, and `node scripts/lint.mjs` exits non-zero.

#### Scenario: variant loading an extra skill beyond implementer-core is caught by Check 15
- **WHEN** `claude/agents/implementer-low.md` step-1 line lists both `implementer-core` and `workflow` and `node scripts/lint.mjs` is run
- **THEN** Check 15 reports a core-load violation because the allowed set is exactly `{implementer-core}` and `workflow` is not permitted, and exits non-zero.

#### Scenario: variant whose effort frontmatter mismatches its stem is caught by Check 15
- **WHEN** `claude/agents/implementer-high.md` frontmatter contains `effort: low` (wrong value for the `-high` stem) and `node scripts/lint.mjs` is run
- **THEN** Check 15 reports a content-matches-name violation and `node scripts/lint.mjs` exits non-zero.

#### Scenario: inline self-test catches a broken Check 15 detector
- **WHEN** Check 15's detection logic is invoked and the inline self-test runs against a synthetic fixture
- **THEN** the detector fires on the fixture violation; if it fails to fire, a Check 15 error is pushed to the errors array so CI reports the regression.
