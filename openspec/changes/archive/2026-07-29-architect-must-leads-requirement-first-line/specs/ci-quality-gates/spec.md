# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `architect-must-leads-requirement-first-line` change.
> Adds Check 20 (requirement first-line MUST/SHALL guard) and Check 21
> (Format-rules parity guard between architect.md and spec-delta.template.md).

## ADDED Requirements

### Requirement: Lint job guards against first-line-modal violation in requirement bodies via Check 20
The CI `lint` job MUST include a Check 20 (`checkRequirementFirstLineModal`)
registered in `scripts/lint.mjs` after Check 19, using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 20: ...')` label in `main()`). Check 20 MUST scan
two file classes: delta specs at `openspec/changes/*/specs/**/spec.md` (excluding
any path containing `/archive/`) and base specs at `openspec/specs/**/spec.md`.
For delta files, the check MUST scan `### Requirement:` blocks under
`## ADDED Requirements` and `## MODIFIED Requirements` and MUST skip
`## REMOVED Requirements` entirely — a REMOVED body is a one-line "why removed"
rationale, not a MUST statement. For base files, the check MUST scan
`### Requirement:` blocks under `## Requirements`. For every scanned requirement,
the check MUST locate the first non-blank line of the requirement body (the first
non-blank line after the `### Requirement:` heading, up to the first
`#### Scenario:` or next `###`/`##` boundary). If that first non-blank body line
contains neither `MUST` nor `SHALL` (case-sensitive), the check MUST push a
`[must-leads]` error. If the requirement body is empty (the heading is immediately
followed by `#### Scenario:` or the next heading with no intervening non-blank
lines), the check MUST skip it without flagging — empty-body detection is a
separate concern the OpenSpec CLI owns. Check 20 MUST carry an inline in-memory
self-test covering: a passing body whose first line is `The system MUST …`; a
failing body whose first line is `When X …` with `MUST` on line 2; a `## REMOVED`
block that MUST be skipped; a base-spec-shaped fixture under `## Requirements`
with a violating body that MUST be flagged; and a fence-skip guard asserting that
a `### Requirement:` line inside a fenced code block is not treated as a real
requirement. If any self-test assertion fails the check MUST push
`[must-leads] SELF-TEST FAILED: …` and return early. Check 20 MUST report every
violating requirement in a file without short-circuiting on the first hit.

#### Scenario: ADDED requirement body leading with MUST passes Check 20
- **WHEN** a delta spec's `## ADDED Requirements` block contains a requirement
  whose first non-blank body line begins `The system MUST …` and
  `node scripts/lint.mjs` is run
- **THEN** Check 20 does not flag that requirement and does not contribute a
  non-zero exit for it.

#### Scenario: ADDED requirement body leading with When fails Check 20
- **WHEN** a delta spec's `## ADDED Requirements` block contains a requirement
  whose first line is `When the token is expired,` with `the system MUST …` on
  line 2, and `node scripts/lint.mjs` is run
- **THEN** Check 20 pushes a `[must-leads]` error naming the file, the
  requirement title, and the offending first line, and `node scripts/lint.mjs`
  exits non-zero.

#### Scenario: REMOVED requirement body is skipped by Check 20
- **WHEN** a delta spec contains a `## REMOVED Requirements` block whose
  requirement body is a one-line rationale with no modal keyword, and
  `node scripts/lint.mjs` is run
- **THEN** Check 20 does not flag that requirement, because `## REMOVED` blocks
  are excluded from scanning.

#### Scenario: base spec requirement body leading with When fails Check 20
- **WHEN** `openspec/specs/<capability>/spec.md` contains a requirement under
  `## Requirements` whose first non-blank body line lacks `MUST` or `SHALL`, and
  `node scripts/lint.mjs` is run
- **THEN** Check 20 pushes a `[must-leads]` error for the base spec requirement
  and exits non-zero.

#### Scenario: archived delta spec is excluded from Check 20
- **WHEN** `openspec/changes/archive/YYYY-MM-DD-old-change/specs/cap/spec.md`
  contains a requirement body whose first line lacks `MUST`/`SHALL`, and
  `node scripts/lint.mjs` is run
- **THEN** Check 20 does not flag the archived delta, because paths containing
  `/archive/` are excluded from the delta glob.

#### Scenario: requirement with empty body (heading followed immediately by Scenario) is skipped
- **WHEN** a delta spec contains a requirement block where `### Requirement: Foo`
  is immediately followed by `#### Scenario:` with no intervening non-blank body
  line, and `node scripts/lint.mjs` is run
- **THEN** Check 20 skips that requirement without flagging it; empty-body
  detection is a separate CLI concern.

#### Scenario: Requirement heading inside a fenced block is not evaluated
- **WHEN** a spec file contains a `### Requirement:` line inside a fenced code
  block (e.g., an example in the spec prose) and `node scripts/lint.mjs` is run
- **THEN** Check 20 does not treat that fenced line as a real requirement and
  does not evaluate it.

#### Scenario: inline self-test catches a broken Check 20 detector
- **WHEN** Check 20's inline self-test runs at the top of the check function
- **THEN** each fixture assertion fires correctly; if any assertion fails a
  `[must-leads] SELF-TEST FAILED` error is pushed so CI reports the regression.

### Requirement: Lint job asserts Format-rules bullet parity between architect.md and spec-delta.template.md via Check 21
The CI `lint` job MUST include a Check 21 (`checkFormatRulesParity`) registered
in `scripts/lint.mjs` after Check 20, using the same dependency-free ESM pattern
(async function pushing to `errors[]`,
`process.stdout.write('Check 21: ...')` label in `main()`). Check 21 MUST
extract the text delimited by `<!-- must-leads:begin -->` and
`<!-- must-leads:end -->` sentinel comments from both
`claude/agents/architect.md` and `openspec-templates/spec-delta.template.md`,
and assert the two extracted blocks are byte-identical. If either sentinel pair
is missing from either file, the check MUST push a `[format-rules-parity]`
error stating which file is missing its anchors and exit non-zero — the check
MUST NOT silently pass when an anchor is absent. If the two extracted blocks
differ, the check MUST push a `[format-rules-parity]` error indicating the two
files differ and exit non-zero. Check 21 MUST carry an inline in-memory self-test
covering: a matching pair (MUST pass); a drifted pair (MUST fail); and a
missing-anchor case (MUST fail). If any self-test assertion fails the check MUST
push `[format-rules-parity] SELF-TEST FAILED: …` and return early.

#### Scenario: matching sentinel blocks pass Check 21
- **WHEN** the `<!-- must-leads:begin/end -->` blocks in `architect.md` and
  `spec-delta.template.md` contain byte-identical text and `node scripts/lint.mjs`
  is run
- **THEN** Check 21 reports `OK` and does not contribute a non-zero exit.

#### Scenario: drifted sentinel blocks fail Check 21
- **WHEN** the Format-rules counter-example bullet is edited in `architect.md`
  but not mirrored into `spec-delta.template.md` (or vice versa), and
  `node scripts/lint.mjs` is run
- **THEN** Check 21 pushes a `[format-rules-parity]` error stating the two files
  differ and exits non-zero.

#### Scenario: missing sentinel in architect.md fails Check 21
- **WHEN** the `<!-- must-leads:begin -->` or `<!-- must-leads:end -->` comment
  is deleted from `claude/agents/architect.md` and `node scripts/lint.mjs` is run
- **THEN** Check 21 pushes a `[format-rules-parity]` error stating that
  `architect.md` is missing its sentinel anchors and exits non-zero.

#### Scenario: missing sentinel in spec-delta.template.md fails Check 21
- **WHEN** the `<!-- must-leads:begin -->` or `<!-- must-leads:end -->` comment
  is deleted from `openspec-templates/spec-delta.template.md` and
  `node scripts/lint.mjs` is run
- **THEN** Check 21 pushes a `[format-rules-parity]` error stating that
  `spec-delta.template.md` is missing its sentinel anchors and exits non-zero.

#### Scenario: inline self-test catches a broken Check 21 detector
- **WHEN** Check 21's inline self-test runs at the top of the check function
- **THEN** all three assertions (match, drift, missing-anchor) fire correctly;
  if any fails a `[format-rules-parity] SELF-TEST FAILED` error is pushed so CI
  reports the regression.
