# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `standardize-backlog-format` change.
> Adds Check 22 (`checkBacklogSchema`) and fixes the Check-10 label collision
> (`checkBudgetGateEmbed` / `checkTriagePaths` both carry the "Check 10" label).

## ADDED Requirements

### Requirement: Lint job validates backlog schema via Check 22

The system MUST include a Check 22 (`checkBacklogSchema`) registered in
`scripts/lint.mjs` after Check 21, using the same dependency-free ESM pattern
(async function pushing to `errors[]`, `process.stdout.write('Check 22: ...')`
label in `main()`). Check 22 MUST pass silently when `openspec/backlog.md` is
absent, and MUST hard-fail (push to `errors[]`, exit non-zero) on any of six
assertions when the file is present: (1) the three `## ` section headings
`## In progress`, `## Proposed`, and `## Ideas` are all present; (2) at least
one line between the `## Ideas` heading and its first `### ` row contains all
three tokens `P1`, `P2`, and `P3`; (3) every `### ` line matches the frozen
regex `^### (?<id>[a-z0-9]+(?:-[a-z0-9]+)*) — \`(?<status>[^\`]+)\` · \*\*P(?<band>[123])\*\*$`
(em-dash U+2014, middle-dot U+00B7); (4) the leading keyword inside the
backtick status field is one of `{idea, proposed, in-progress, merged, bundled}`;
(5) each row whose status leading keyword is `idea` or `proposed` contains both
`**Why:**` and `**Shape:**` in its body — `bundled`/`merged` rows are exempt,
`in-progress` rows are checked only for grammar and enum; (6) the file
`openspec-templates/backlog.template.md` exists (existence-only; no content
scan). Check 22 MUST carry an inline self-test fixture (well-formed row; malformed
heading; missing Shape on standalone row; exempt bundled row) that runs before
file I/O.

#### Scenario: compliant backlog passes all six assertions

- **WHEN** `openspec/backlog.md` is present and satisfies all six assertions
  and `node scripts/lint.mjs` is run
- **THEN** Check 22 reports `OK` and does not contribute to a non-zero exit.

#### Scenario: absent backlog causes Check 22 to skip silently

- **WHEN** `openspec/backlog.md` does not exist and `node scripts/lint.mjs` is run
- **THEN** Check 22 does not push any violation and exits 0 for that check.

#### Scenario: malformed heading fails assertion 3

- **WHEN** `openspec/backlog.md` contains a `### ` line with a double-hyphen
  separator instead of an em-dash, and `node scripts/lint.mjs` is run
- **THEN** Check 22 pushes a grammar violation for that heading and exits non-zero.

#### Scenario: unrecognized status keyword fails assertion 4

- **WHEN** `openspec/backlog.md` contains a row whose status leading keyword is
  `wip` (not in the enum), and `node scripts/lint.mjs` is run
- **THEN** Check 22 pushes an enum violation and exits non-zero.

#### Scenario: standalone idea row missing Shape fails assertion 5

- **WHEN** `openspec/backlog.md` has a standalone `idea` row missing `**Shape:**`
  and `node scripts/lint.mjs` is run
- **THEN** Check 22 pushes a body-field violation and exits non-zero.

#### Scenario: bundled row without Why/Shape passes assertion 5 (exempt)

- **WHEN** `openspec/backlog.md` has a `bundled` row with only a blockquote
  pointer note and no `**Why:**` or `**Shape:**` field, and `node scripts/lint.mjs`
  is run
- **THEN** Check 22 does NOT flag the bundled row for a body-field violation.

#### Scenario: missing template file fails assertion 6

- **WHEN** `openspec-templates/backlog.template.md` does not exist and
  `node scripts/lint.mjs` is run (and `openspec/backlog.md` is present)
- **THEN** Check 22 pushes a template-existence violation and exits non-zero.

#### Scenario: inline self-test catches a broken Check 22 detector

- **WHEN** Check 22's inline self-test runs at the top of `checkBacklogSchema`
- **THEN** all four fixture assertions (well-formed pass; malformed heading fires;
  missing Shape fires; exempt bundled does not fire) behave as specified; if any
  self-test assertion fails, a self-test error is pushed to the errors array.

### Requirement: Check-10 label collision between checkBudgetGateEmbed and checkTriagePaths MUST be resolved

The system MUST resolve the pre-existing label collision where both
`checkBudgetGateEmbed` and `checkTriagePaths` carry the "Check 10" label in
`scripts/lint.mjs`. The collision MUST be fixed by assigning each check a unique
number: `checkBudgetGateEmbed` retains "Check 10" (it was the first registered
under that label and is the canonical Check 10 per the `checkBudgetGateEmbed`
requirement in the base spec); `checkTriagePaths` MUST be renumbered to the next
available slot so that no two checks share a label. Every `process.stdout.write`
label string in `main()`, every downstream check-number reference in the README
Check-list, and the README Check count MUST be updated to reflect the renumbered
label. The collision fix MUST be sequenced as a separate mechanical renumber slice
(distinct from the new Check 22 slice) so the two concerns are reviewable
independently.

#### Scenario: no two checks share a label after the fix

- **WHEN** `node scripts/lint.mjs` is run after this change ships
- **THEN** every `process.stdout.write` Check-label line in `main()` carries a
  unique label; no two checks share the same "Check N" string.

#### Scenario: README Check-list reflects the renumbered label

- **WHEN** `README.md` is read after this change ships
- **THEN** the Check-list entry for `checkTriagePaths` uses the renumbered label,
  and the Check count is consistent with the total number of registered checks
  (including Check 22).

#### Scenario: checkTriagePaths still fires on the same condition

- **WHEN** `claude/commands/followup.md` is missing the P2 choice label and
  `node scripts/lint.mjs` is run
- **THEN** the renumbered `checkTriagePaths` still reports a violation (same
  assertion logic, only the label number changed).
