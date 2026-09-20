# Proposal — lint-auto-mode-gate-coverage

> Stage S of QRSPI. Generated 2026-09-20.

## Why

The `add-auto-mode` change wired run-mode and stage-choreography into every
stage command via a step-3 block that loads `stage-choreography` and follows
its instructions exactly. This wiring is what threads run-mode establishment,
the precondition check, the commit step, and the next-stage handoff into each
command. A command that silently drops this choreography load passes every
existing check and only breaks at runtime — a stage that never establishes
run-mode or never auto-advances. `scripts/lint.mjs` already guards two
sibling embed lines (Checks 9 and 10) with this exact pattern: hardcoded stem
constant, whitespace-collapse + `.includes()`, inline self-test. Check 26
closes the gap by extending that guard to the `stage-choreography` skill-load
line across all 8 choreography-carrying stage commands.

## What Changes

- New constant `CHOREOGRAPHY_EMBED_COMMAND_STEMS` (8 stems: `questions`,
  `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`)
  placed beside the sibling `VERSION_CHECK_COMMAND_STEMS` and
  `BUDGET_GATE_COMMAND_STEMS` constants with the same "hardcoded for
  regression safety" comment. `status`, `archive`, `followup`, `update`,
  and `retro` are deliberately excluded.
- New constant `CHOREOGRAPHY_EMBED_LINE` holding the detection substring
  `'Load skill \`stage-choreography\` and follow its instructions exactly'`
  (no trailing period — the live sentence continues with `-- it carries ...`).
- New function `checkChoreographyEmbed(errors)` with an inline self-test
  (present-fixture passes, absent-fixture fires) run before file I/O, then a
  per-stem whitespace-collapse `.includes()` scan with `[choreography-embed]`
  violation reporting and a single OK pass line.
- `checkChoreographyEmbed` registered as **Check 26** appended at the end of
  `main()`, after `checkChangelogTaskEmission` (Check 25). No existing check
  is renumbered.
- Top-of-file check-enumeration comment block updated to list Check 26.
- `CHANGELOG.md` `## [Unreleased]` entry added for this change.

## Capabilities

### New Capabilities

- _none_

### Modified Capabilities

- `ci-quality-gates`: adds a new Check 26 (`checkChoreographyEmbed`)
  requirement asserting the `stage-choreography` skill-load line is present
  in all 8 choreography-carrying stage commands — needs a delta spec.

## Impact

- Breaking changes: none — a purely additive lint check; passes on a
  correctly-wired repo.
- Phases: single phase (phase 1), single vertical slice.
- Affected code / APIs / dependencies: `scripts/lint.mjs` only — no command,
  agent, skill, template, or migration file is changed by this check itself.

## Out of scope

Per-gate auto-branch wiring assertions (`Full or Semi auto`, per-slice /
PR-create auto-advance) are deferred to the backlog idea
`lint-per-gate-auto-branch-wiring` (D decision, Non-Goal). This change covers
only the skill-load embed line, not any choreography-body content assertions.
