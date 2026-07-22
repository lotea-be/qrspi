# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `pr-review-open-tasks-and-followups` change.
> Adds lint Check 8: a structural assertion that `claude/commands/pr.md`
> still carries both reconciliation passes.

## ADDED Requirements

### Requirement: Lint job checks PR reconciliation passes via Check 8
The CI `lint` job MUST include a Check 8 (`checkPrReconciliationPasses`) that
asserts `claude/commands/pr.md` contains both reconciliation passes. The check
MUST match on stable structural anchors — the presence of a "tasks pass" and
a "follow-ups pass" section and the two option-set signatures (`Finish`,
`Drop`, `Pause` for tasks; and the four-option set `Fix now`, `Defer`, `Drop`,
`Promote` for follow-ups) — rather than incidental wording, to remain robust
against prose edits while still catching the accidental deletion of an entire
pass. Check 8 MUST be registered in `scripts/lint.mjs` after Check 7 using
the same dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 8: ...')` label in `main()`).

#### Scenario: pr.md carrying both passes passes Check 8
- **WHEN** `claude/commands/pr.md` contains both a tasks-pass section (with
  Finish / Drop / Pause option anchors) and a follow-ups-pass section (with
  Fix now / Defer / Drop / Promote option anchors) and `node scripts/lint.mjs`
  is run
- **THEN** Check 8 reports `OK` and does not contribute a non-zero exit.

#### Scenario: tasks pass deleted from pr.md is caught by Check 8
- **WHEN** a contributor edits `claude/commands/pr.md` and removes the tasks
  pass section (including its Finish / Drop / Pause option anchors), and the
  lint job runs
- **THEN** Check 8 reports a violation ("tasks pass missing from pr.md") and
  `node scripts/lint.mjs` exits non-zero.

#### Scenario: follow-ups pass deleted from pr.md is caught by Check 8
- **WHEN** a contributor edits `claude/commands/pr.md` and removes the
  follow-ups pass section (including its Fix now / Defer / Drop / Promote
  option anchors), and the lint job runs
- **THEN** Check 8 reports a violation ("follow-ups pass missing from pr.md")
  and `node scripts/lint.mjs` exits non-zero.

#### Scenario: Check 8 uses structural anchors, not exact prose
- **WHEN** a contributor rewrites the prose around the tasks pass (changing
  wording) but keeps the Finish / Drop / Pause option labels and the tasks-pass
  heading, and the lint job runs
- **THEN** Check 8 passes, because it matches on the structural anchors (option
  labels + section heading), not on incidental surrounding prose.
