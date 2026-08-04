# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the `backlog-schema-finish` change.
> Extends Check 6 with optional idempotency-field validation and a positive-path self-test; adds new Check 23 for bare wikilink resolution in openspec/backlog.md.

## MODIFIED Requirements

### Requirement: Lint job checks migration manifest presence and schema
The system MUST include a check (Check 6) in `scripts/lint.mjs` that, for every
`## [X.Y.Z]` section in `CHANGELOG.md`, asserts a corresponding
`migrations/<version>.yaml` file exists. The check MUST validate schema
well-formedness of every `migrations/*.yaml` file: required fields (`version`,
`summary`, `automated`, `manual`) must be present; every item in `automated` must
have `action: edit-file` and no other action value; every `automated` item's
`path` field must start with `openspec/`. The check MUST also validate, where
`openspec/.qrspi-version` exists in the repo being linted, that its contents
match a bare SemVer regex (no `v` prefix, no key). The check MUST additionally
validate two optional fields on `automated` steps when present: `skip_if_contains`,
when present, MUST be a non-empty string (an empty string is a schema violation);
`anchor_missing`, when present, MUST equal the closed literal `warn-and-skip` (any
other value is a schema violation). Both fields are optional; their absence on a
step MUST NOT cause a Check 6 error. Check 6 MUST carry a positive-path self-test
fixture: a synthetic manifest step carrying both `skip_if_contains` (non-empty)
and `anchor_missing: warn-and-skip` MUST pass schema validation; if the self-test
fails to pass, a Check 6 self-test error MUST be pushed to `errors[]` so CI
reports the regression. The check MUST be implemented in `scripts/lint.mjs` using
the same dependency-free ESM pattern (async function, errors pushed to `errors[]`,
labelled `process.stdout.write` line in `main()`).

#### Scenario: release version missing a manifest entry
- **WHEN** `CHANGELOG.md` contains a `## [0.7.0]` section but
  `migrations/0.7.0.yaml` does not exist, and the lint job runs
- **THEN** the lint check reports the missing entry and `node scripts/lint.mjs`
  exits non-zero.

#### Scenario: every released version has a manifest entry
- **WHEN** every version section in `CHANGELOG.md` has a corresponding
  `migrations/<version>.yaml` and all files are schema-well-formed
- **THEN** the lint check passes and does not contribute to a non-zero exit.

#### Scenario: automated step with disallowed action is caught
- **WHEN** a `migrations/<version>.yaml` file contains an `automated` step with
  `action: run-command` (not `edit-file`) and the lint job runs
- **THEN** the lint check reports the schema violation and exits non-zero.

#### Scenario: automated step with non-openspec path is caught
- **WHEN** a `migrations/<version>.yaml` file contains an `automated` step whose
  `path` does not start with `openspec/` and the lint job runs
- **THEN** the lint check reports the path scope violation and exits non-zero.

#### Scenario: marker file with malformed SemVer is caught
- **WHEN** `openspec/.qrspi-version` exists and contains `v0.6.0` (with a `v`
  prefix) or any non-SemVer string, and the lint job runs
- **THEN** the lint check reports the format violation and exits non-zero.

#### Scenario: valid stub for a no-action release passes
- **WHEN** `migrations/0.6.0.yaml` exists with `version: 0.6.0`, a `summary`
  string, `automated: []`, and `manual: []`
- **THEN** the lint check treats this as a valid stub and does not flag it.

#### Scenario: skip_if_contains with non-empty string value passes Check 6
- **WHEN** a `migrations/*.yaml` step carries `skip_if_contains: "some unique marker"`
  and `node scripts/lint.mjs` is run
- **THEN** Check 6 accepts the field and reports no schema violation.

#### Scenario: skip_if_contains with empty string value fails Check 6
- **WHEN** a `migrations/*.yaml` step carries `skip_if_contains: ""` and
  `node scripts/lint.mjs` is run
- **THEN** Check 6 pushes a schema violation for the empty-string value and exits
  non-zero.

#### Scenario: anchor_missing: warn-and-skip passes Check 6
- **WHEN** a `migrations/*.yaml` step carries `anchor_missing: warn-and-skip` and
  `node scripts/lint.mjs` is run
- **THEN** Check 6 accepts the field and reports no schema violation.

#### Scenario: anchor_missing with unrecognized value fails Check 6
- **WHEN** a `migrations/*.yaml` step carries `anchor_missing: skip` (not the
  closed literal `warn-and-skip`) and `node scripts/lint.mjs` is run
- **THEN** Check 6 pushes a schema violation naming the disallowed value and exits
  non-zero.

#### Scenario: step omitting both optional fields passes Check 6 unchanged
- **WHEN** a `migrations/*.yaml` step carries only `action`, `path`, and other
  existing required fields but no `skip_if_contains` or `anchor_missing`, and
  `node scripts/lint.mjs` is run
- **THEN** Check 6 reports no schema violation for the absent optional fields.

#### Scenario: positive-path self-test for both new optional fields passes
- **WHEN** Check 6's inline self-test runs a synthetic step carrying
  `skip_if_contains: "marker"` and `anchor_missing: warn-and-skip` through the
  schema validator
- **THEN** the validator accepts the step; if it rejects it, a Check 6 self-test
  error is pushed to `errors[]` so CI reports the regression.

## ADDED Requirements

### Requirement: Lint job resolves bare wikilinks in openspec/backlog.md via Check 23
The system MUST include a Check 23 (`checkBacklogWikilinks`) registered in
`scripts/lint.mjs` after Check 22, using the same dependency-free ESM pattern
(async function pushing to `errors[]`, `process.stdout.write('Check 23: ...')`
label in `main()`). Check 23 MUST collect every bare (non-code-span) `[[slug]]`
occurrence in `openspec/backlog.md` — excluding any `[[…]]` inside backtick code
spans or fenced blocks — and MUST assert that each resolved slug either (a) matches
a live `### <slug>` row id in the file or (b) matches the date-stripped name of an
archived change folder under `openspec/changes/archive/<YYYY-MM-DD>-<slug>/`. An
archive-folder resolution MUST pass silently even if the live row for that slug is
gone. A slug whose text does not match kebab-case grammar (`[a-z0-9]+(?:-[a-z0-9]+)*`)
MUST be treated as non-resolving illustrative text and is excluded from resolution
(but such slugs are also excluded by the code-span rule in practice). Check 23 MUST
pass silently when `openspec/backlog.md` is absent. Check 23 MUST be factored as a
pure resolver `resolveWikilinks(text, liveRowIds, archiveSlugs)` that accepts the
archive-slug list as a parameter, so the inline self-test can inject a canned
in-memory corpus with a synthetic archive-slug list and exercise all four cases —
live-row hit, archive-folder hit (date-stripped), code-spanned meta-token (MUST
NOT fire), and bare dangling slug (MUST fire) — with no file I/O. The file-I/O
path MUST read `openspec/changes/archive/` via the existing `fs.readdir` pattern
and live row ids from `openspec/backlog.md`, then call the same resolver. Check 23
MUST exit non-zero when any bare wikilink does not resolve.

#### Scenario: bare wikilink matching a live row passes
- **WHEN** `openspec/backlog.md` contains the bare text `[[some-idea]]` and also
  contains a `### some-idea` heading row, and `node scripts/lint.mjs` is run
- **THEN** Check 23 resolves the wikilink to the live row and reports no violation.

#### Scenario: bare wikilink matching a date-stripped archive folder passes silently
- **WHEN** `openspec/backlog.md` contains the bare text `[[old-change]]` and no
  live `### old-change` row exists, but
  `openspec/changes/archive/2026-01-15-old-change/` exists, and
  `node scripts/lint.mjs` is run
- **THEN** Check 23 strips the date prefix, matches the folder name to the slug,
  and reports no violation.

#### Scenario: code-spanned wikilink is not flagged
- **WHEN** `openspec/backlog.md` contains `` `[[wikilink]]` `` (inside backticks)
  and there is no live or archived `wikilink` row, and `node scripts/lint.mjs`
  is run
- **THEN** Check 23 does not flag the code-spanned occurrence; it is documentation
  of the syntax, not a live link.

#### Scenario: bare dangling wikilink fails Check 23
- **WHEN** `openspec/backlog.md` contains the bare text `[[does-not-exist]]` and
  no live `### does-not-exist` row and no archive folder `*-does-not-exist/`
  exist, and `node scripts/lint.mjs` is run
- **THEN** Check 23 pushes a violation naming the unresolved slug and exits
  non-zero.

#### Scenario: absent backlog causes Check 23 to skip silently
- **WHEN** `openspec/backlog.md` does not exist and `node scripts/lint.mjs` is run
- **THEN** Check 23 does not push any violation and does not contribute to a
  non-zero exit.

#### Scenario: inline self-test covers all four resolution cases
- **WHEN** Check 23's inline self-test runs the resolver with a canned corpus and
  an injected synthetic archive-slug list
- **THEN** the resolver correctly passes the live-row hit, passes the archive-folder
  hit, does not fire on the code-spanned meta-token, and fires on the bare dangling
  slug; if any assertion fails, a Check 23 self-test error is pushed to `errors[]`.

#### Scenario: kit's own backlog passes Check 23 after the D6 cleanup
- **WHEN** the five pre-existing dangling bare links in this repo's
  `openspec/backlog.md` have been demoted to back-ticked plain text and
  `node scripts/lint.mjs` is run
- **THEN** Check 23 finds no bare dangling wikilinks and reports `OK`.
