# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `right-size-followup-handling` change. Adds Check 10 to pin the three triage
> choice-label anchors in `claude/commands/followup.md`, mirroring how Check 8
> pins the PR reconciliation passes.

## ADDED Requirements

### Requirement: Lint job asserts triage choice labels present in followup.md via Check 10

The CI `lint` job MUST include a Check 10 (`checkTriagePaths`) that reads
`claude/commands/followup.md` and asserts the file contains all three triage
choice-label prefixes: `"P1 — implement directly`, `"P2 — addendum`, and
`"P3 — defer`. A missing label MUST cause the check to report a violation and
exit non-zero. Check 10 MUST be registered in `scripts/lint.mjs` after Check 9
using the same dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 10: ...')` label in `main()`).

#### Scenario: followup.md carrying all three choice labels passes Check 10
- **WHEN** `claude/commands/followup.md` contains the strings
  `"P1 — implement directly`, `"P2 — addendum`, and `"P3 — defer`, and
  `node scripts/lint.mjs` is run
- **THEN** Check 10 reports `OK` and does not contribute a non-zero exit.

#### Scenario: a triage choice label removed from followup.md is caught
- **WHEN** a contributor edits `claude/commands/followup.md` and removes the
  P2 choice label (e.g., deletes the `"P2 — addendum` line), and
  `node scripts/lint.mjs` is run
- **THEN** Check 10 reports a violation naming the missing anchor and
  `node scripts/lint.mjs` exits non-zero.

#### Scenario: wording change to a choice label is caught by Check 10
- **WHEN** a contributor renames the P3 choice to `"P3 — backlog` (changing the
  anchor prefix) in `claude/commands/followup.md`, and `node scripts/lint.mjs`
  is run
- **THEN** Check 10 reports a violation because `"P3 — defer` is no longer
  present, preventing a silent path rename.
