# Spec — backlog-schema

> New capability introduced by the `standardize-backlog-format` change.
> Defines the frozen, machine-checkable schema for `openspec/backlog.md`:
> canonical template, lint enforcement (Check 22), init seeding behaviour,
> skill prose corrections, fenced command-body examples, and migration manifest.

## ADDED Requirements

### Requirement: Backlog heading grammar is frozen to the canonical regex

The system MUST enforce that every `### ` heading line in `openspec/backlog.md`
matches the frozen grammar: `### <id> — \`<status>\` · **P<n>**` where `—` is
a real em-dash (U+2014), ` · ` is space + middle-dot (U+00B7) + space, and the
band token is bold `**P1**`, `**P2**`, or `**P3**`. Any `### ` line that does
not match this pattern MUST cause Check 22 to push a violation and exit non-zero.

#### Scenario: well-formed heading passes Check 22

- **WHEN** `openspec/backlog.md` contains a heading `### foo-bar — \`idea\` · **P2**`
  (real em-dash, middle-dot)
- **THEN** Check 22 reports no grammar violation for that heading.

#### Scenario: double-hyphen heading is rejected

- **WHEN** `openspec/backlog.md` contains a heading `### foo-bar -- \`idea\` · **P2**`
  (double hyphen instead of em-dash)
- **THEN** Check 22 pushes a grammar violation for that heading and exits non-zero.

#### Scenario: missing band token is rejected

- **WHEN** `openspec/backlog.md` contains a heading `### foo-bar — \`idea\``
  (no ` · **P<n>**` suffix)
- **THEN** Check 22 pushes a grammar violation for that heading and exits non-zero.

#### Scenario: inline self-test fixture (malformed heading) confirms detector fires

- **WHEN** Check 22's inline self-test runs a synthetic malformed heading through
  the grammar checker
- **THEN** the detector fires on the fixture; if it fails to fire, a Check 22
  self-test error is pushed to the errors array.

### Requirement: Status keyword MUST be from the approved enum

The system MUST parse the leading keyword inside the backtick status field of
each `### ` heading in `openspec/backlog.md` and MUST require it to be one of
`{idea, proposed, in-progress, merged, bundled}`. Any leading keyword not in
this set MUST cause Check 22 to push a violation and exit non-zero. Text after
the leading keyword (a space followed by free text) is unchecked.

#### Scenario: valid keyword passes enum check

- **WHEN** `openspec/backlog.md` contains a heading whose status field begins
  with `in-progress` (e.g. `\`in-progress (branch: features/foo)\``)
- **THEN** Check 22 reports no enum violation for that heading.

#### Scenario: unrecognized keyword is rejected

- **WHEN** `openspec/backlog.md` contains a heading whose status field begins
  with `wip` (not in the approved enum)
- **THEN** Check 22 pushes an enum violation for that heading and exits non-zero.

#### Scenario: bundled tail text does not cause a false enum failure

- **WHEN** `openspec/backlog.md` contains a heading whose status is
  `\`bundled into some-change (2026-01-15)\``
- **THEN** Check 22 extracts the keyword `bundled` (valid), ignores the tail,
  and reports no enum violation.

### Requirement: Standalone rows MUST carry both Why and Shape body fields

The system MUST verify that each row in `openspec/backlog.md` whose status
leading keyword is `idea` or `proposed` (a standalone row) contains both a
`**Why:**` line and a `**Shape:**` line in the row body (between its `### `
heading and the next `### ` heading, `## ` heading, or end of file). A standalone
row missing either field MUST cause Check 22 to push a violation and exit non-zero.
Rows whose status leading keyword is `bundled` or `merged` are exempt from this
check. Rows whose status leading keyword is `in-progress` are checked only for
grammar and enum conformance, not for Why/Shape presence.

#### Scenario: standalone idea row with both fields passes

- **WHEN** a standalone `idea` row in `openspec/backlog.md` has both `**Why:**`
  and `**Shape:**` lines in its body
- **THEN** Check 22 reports no body-field violation for that row.

#### Scenario: standalone idea row missing Shape is rejected

- **WHEN** a standalone `idea` row in `openspec/backlog.md` has `**Why:**` but
  lacks any `**Shape:**` line in its body
- **THEN** Check 22 pushes a body-field violation naming the row id and exits
  non-zero.

#### Scenario: bundled row without Why or Shape passes (exempt class)

- **WHEN** a `bundled` row in `openspec/backlog.md` carries only a `>` blockquote
  pointer note and has no `**Why:**` or `**Shape:**` line
- **THEN** Check 22 does NOT flag a body-field violation for that row, because
  `bundled` rows are exempt from the Why/Shape requirement.

#### Scenario: inline self-test fixture (missing Shape) confirms detector fires

- **WHEN** Check 22's inline self-test runs a synthetic standalone `idea` row
  missing `**Shape:**` through the body-field checker
- **THEN** the detector fires on the fixture; if it fails to fire, a Check 22
  self-test error is pushed to the errors array.

#### Scenario: inline self-test fixture (exempt bundled row) confirms no false positive

- **WHEN** Check 22's inline self-test runs a synthetic `bundled` row with only
  a blockquote pointer note through the body-field checker
- **THEN** the detector does NOT fire; if it fires on the exempt class, a Check 22
  self-test error is pushed to the errors array.

### Requirement: Backlog MUST have three section headings in the canonical set

The system MUST verify that `openspec/backlog.md` contains all three of the
following `## ` section headings: `## In progress`, `## Proposed`, and
`## Ideas`. If any of the three is absent, Check 22 MUST push a violation and
exit non-zero. Section order is not asserted.

#### Scenario: all three sections present passes

- **WHEN** `openspec/backlog.md` contains `## In progress`, `## Proposed`,
  and `## Ideas` headings (in any order)
- **THEN** Check 22 reports no section-presence violation.

#### Scenario: missing section heading is caught

- **WHEN** `openspec/backlog.md` is missing the `## Proposed` heading
- **THEN** Check 22 pushes a section-presence violation naming the missing heading
  and exits non-zero.

### Requirement: Ideas section MUST carry the P-band preamble

The system MUST verify that at least one line between the `## Ideas` heading and
its first `### ` row in `openspec/backlog.md` contains all three of the tokens
`P1`, `P2`, and `P3`. If no such line exists, Check 22 MUST push a violation and
exit non-zero. The check is a presence-only match (any line containing all three
tokens passes); it does not assert exact preamble wording.

#### Scenario: P-band preamble present passes

- **WHEN** the `## Ideas` section in `openspec/backlog.md` has a preamble line
  containing `P1`, `P2`, and `P3` before the first `### ` row
- **THEN** Check 22 reports no preamble-presence violation.

#### Scenario: missing preamble is caught

- **WHEN** the `## Ideas` section in `openspec/backlog.md` has no line containing
  all three of `P1`, `P2`, `P3` before its first `### ` row
- **THEN** Check 22 pushes a preamble-presence violation and exits non-zero.

### Requirement: Check 22 MUST pass silently when openspec/backlog.md is absent

The system MUST configure Check 22 so that when `openspec/backlog.md` does not
exist, the check reports no error and exits 0 for that check. A consumer or kit
instance without a backlog file MUST NOT be blocked by Check 22.

#### Scenario: absent backlog file causes Check 22 to skip silently

- **WHEN** `openspec/backlog.md` does not exist in the repo and `node scripts/lint.mjs`
  is run
- **THEN** Check 22 does not push any violation and does not contribute to a
  non-zero exit.

### Requirement: Check 22 MUST assert the backlog template file exists

The system MUST include as a sixth assertion in Check 22 a cheap existence check
that `openspec-templates/backlog.template.md` is present. If the file does not
exist, Check 22 MUST push a violation and exit non-zero. Check 22 MUST NOT scan
the template's content — the assertion is existence-only.

#### Scenario: template file present passes the existence assertion

- **WHEN** `openspec-templates/backlog.template.md` exists and `node scripts/lint.mjs`
  is run
- **THEN** Check 22's template-existence assertion reports no violation.

#### Scenario: missing template file is caught

- **WHEN** `openspec-templates/backlog.template.md` has been deleted and
  `node scripts/lint.mjs` is run
- **THEN** Check 22 pushes a template-existence violation and exits non-zero.

### Requirement: Check 22 MUST carry an inline self-test covering all four classifier cases

The system MUST implement Check 22 with an inline in-memory self-test that runs
before any file I/O and exercises four synthetic fixtures: (a) a well-formed
standalone `idea` row with `**Why:**` and `**Shape:**` — MUST pass; (b) a heading
with a wrong separator (double-hyphen or missing band) — MUST fire the grammar
detector; (c) a standalone `idea` row missing `**Shape:**` — MUST fire the
body-field detector; (d) a `bundled into <id> (<date>)` row with only a `>`
blockquote pointer note — MUST NOT fire (guards the exempt class). If any
self-test assertion fails, Check 22 MUST push a self-test error to `errors[]`
and the check MUST return early.

#### Scenario: self-test all four fixtures pass — check proceeds to file I/O

- **WHEN** Check 22's self-test runs at the top of `checkBacklogSchema` and all
  four synthetic fixtures behave as specified
- **THEN** the self-test pushes no errors and Check 22 proceeds to read
  `openspec/backlog.md`.

#### Scenario: self-test regression is caught before file I/O

- **WHEN** a code change breaks the exempt-class detector so fixture (d) fires
  a false positive, and `node scripts/lint.mjs` is run
- **THEN** Check 22 pushes a self-test error and returns early; no file I/O
  is performed and the regression is reported to CI.

### Requirement: The backlog template MUST satisfy Check 22's assertions when seeded

The system MUST ship `openspec-templates/backlog.template.md` with content such
that a file produced by seeding it verbatim (i.e. copying it to
`openspec/backlog.md`) satisfies all five content assertions in Check 22 out of
the box. Specifically the template MUST contain: the three `## ` section headings;
a P-band preamble under `## Ideas` mentioning P1, P2, and P3; at least one sample
standalone `idea` row carrying both `**Why:**` and `**Shape:**`; and at least one
sample `bundled` row with a `>` pointer note.

#### Scenario: freshly seeded backlog passes Check 22

- **WHEN** `/qrspi:init` seeds `openspec/backlog.md` from the template on a
  fresh repo and `node scripts/lint.mjs` is run
- **THEN** Check 22 passes all five content assertions on the newly seeded file.

#### Scenario: template carries the legend comment

- **WHEN** `openspec-templates/backlog.template.md` is read
- **THEN** the file opens with a `<!-- ... -->` legend comment documenting the
  heading grammar, the status enum, the separator characters, and the
  standalone-vs-exempt body rule.

### Requirement: Check 3 MUST declare backlog.template.md with an empty headings list

The system MUST add a `TEMPLATE_CANONICAL_HEADINGS` entry for
`backlog.template.md` with `headings: []` (an empty array), so that the Check 3
"every template is declared in the map" invariant remains satisfied without
inventing a bogus agent mapping. An empty list MUST cause Check 3 to skip the
heading-alignment assertion for that template (the same behaviour already used for
`tasks.template.md`).

#### Scenario: backlog.template.md declared in the map does not cause Check 3 to error

- **WHEN** `openspec-templates/backlog.template.md` exists and `node scripts/lint.mjs`
  is run
- **THEN** Check 3 finds the entry in `TEMPLATE_CANONICAL_HEADINGS` with an empty
  headings list, skips the agent-alignment assertion for that file, and reports
  no violation.

#### Scenario: undeclared template would fail Check 3

- **WHEN** a new `openspec-templates/*.template.md` file is added without a
  corresponding `TEMPLATE_CANONICAL_HEADINGS` entry and `node scripts/lint.mjs`
  is run
- **THEN** Check 3 reports the undeclared template as a violation, preserving the
  "every template is declared" invariant.

### Requirement: /qrspi:init MUST seed openspec/backlog.md from the template when absent

The system MUST update `claude/commands/init.md` so that, during the
initialization flow, after writing `openspec/config.yaml`, the command seeds
`openspec/backlog.md` from `openspec-templates/backlog.template.md` only if
`openspec/backlog.md` is absent. The absence check MUST use the Glob tool (no
shell-out). If `openspec/backlog.md` already exists the seeding step MUST be
skipped silently. The seeded file MUST be staged in the existing `git add openspec/`
commit step — no separate commit is introduced.

#### Scenario: init on a fresh repo seeds the backlog

- **WHEN** `/qrspi:init` runs on a repo where `openspec/backlog.md` does not exist
- **THEN** `openspec/backlog.md` is created from the template content and staged
  in the `openspec/` commit alongside `openspec/config.yaml`.

#### Scenario: init on an already-initialized repo skips seeding

- **WHEN** `/qrspi:init` runs on a repo where `openspec/backlog.md` already exists
- **THEN** the seeding step is skipped silently and the existing file is unchanged.

#### Scenario: seeded backlog passes Check 22 immediately after init

- **WHEN** a user runs `/qrspi:init` and then immediately runs `node scripts/lint.mjs`
- **THEN** Check 22 finds the freshly seeded `openspec/backlog.md` satisfies all
  five content assertions and reports no violation.

### Requirement: workflow skill backlog atomicity prose MUST use the frozen em-dash grammar

The system MUST update the "Backlog atomicity" section of
`claude/skills/workflow/SKILL.md` to replace the drifted `--` (double-hyphen)
heading grammar with the frozen `### <id> — \`<status>\` · **P<n>**` form (real
em-dash, middle-dot, bold band token) and MUST add a one-line pointer to
`openspec-templates/backlog.template.md` as the authoritative shape reference.
The corrected grammar MUST be restated inline in the skill (not replaced by a
bare pointer alone) so every stage agent that loads the skill has the shape
available without opening the template.

#### Scenario: workflow skill shows frozen grammar after the change

- **WHEN** `claude/skills/workflow/SKILL.md` "Backlog atomicity" section is read
- **THEN** the heading example uses the real em-dash and ` · **P<n>**` band token,
  not `--` (double hyphen) and no band.

#### Scenario: workflow skill points to the template as authoritative

- **WHEN** `claude/skills/workflow/SKILL.md` "Backlog atomicity" section is read
- **THEN** a line references `openspec-templates/backlog.template.md` as the
  canonical source for the backlog shape.

### Requirement: Writer command bodies MUST carry fenced canonical row examples

The system MUST add a fenced canonical row example (matching the template's
sample row verbatim) to each of the following command bodies: the P3 promote path
in `claude/commands/followup.md`, the promote prose in `claude/commands/pr.md`,
and the deferred-work-append paths in `claude/commands/design.md`,
`claude/commands/structure.md`, and `claude/commands/slices.md`. Each fenced
example MUST use the frozen em-dash grammar. The template MUST remain the single
source of truth; these command-body examples MUST mirror it.

#### Scenario: followup.md P3 path carries a fenced row example

- **WHEN** `claude/commands/followup.md`'s P3 promote path is read
- **THEN** it contains a fenced code block showing a canonical `### <id> — \`idea\` · **P<n>**` row with `**Why:**` and `**Shape:**` fields using the real em-dash.

#### Scenario: pr.md promote prose carries a fenced row example

- **WHEN** `claude/commands/pr.md`'s promote prose is read
- **THEN** it contains a fenced code block showing a canonical backlog row using
  the frozen em-dash grammar.

#### Scenario: design.md deferred-work path carries a fenced row example

- **WHEN** the deferred-work-append path in `claude/commands/design.md` is read
- **THEN** it contains a fenced canonical row example mirroring the template.

### Requirement: Migration manifest MUST be additive-only and idempotent

The system MUST ship a `migrations/<next-version>.yaml` file for this change
that contains exactly one `automated` `edit-file` step keyed on the backlog
file's title line (a guaranteed-present anchor) to insert the legend comment,
and MUST carry all conditional or consumer-specific actions (section heading
scaffolding, P-band preamble insertion) as `manual` steps. The `automated` step
MUST NOT rewrite any existing row content. The manifest MUST be idempotent: if
the legend comment is already present, re-running the automated step MUST NOT
corrupt the file.

#### Scenario: automated step inserts the legend comment

- **WHEN** a consumer repo has `openspec/backlog.md` without a legend comment,
  and `/qrspi:update` applies the automated step
- **THEN** the legend comment is inserted after the title line without altering
  any existing row content.

#### Scenario: manual steps describe conditional section additions

- **WHEN** the migration manifest is read
- **THEN** the `manual` steps include instructions for adding `## In progress`,
  `## Proposed`, and `## Ideas` sections if absent, and for adding the P-band
  preamble under `## Ideas`, with a pointer to the new template.

#### Scenario: consumers with no backlog are directed to init

- **WHEN** the migration manifest is read
- **THEN** a `manual` step explicitly states that consumers with no
  `openspec/backlog.md` SHOULD run `/qrspi:init` to seed one from the template
  rather than creating it manually.

### Requirement: Kit's own backlog MUST pass Check 22 in the same slice as the check lands

The system MUST ensure that `openspec/backlog.md` in the kit repo satisfies all
six assertions of Check 22 (including `**Shape:**` on all standalone rows) before
or in the same commit that introduces Check 22. Check 22 MUST NOT be committed
in a passing state before the backfill is complete; the backfill and the check
MUST land together so CI never observes a reddened state.

#### Scenario: lint passes green after the backfill-and-check slice is committed

- **WHEN** the slice that adds Check 22 and backfills `openspec/backlog.md` is
  committed and `node scripts/lint.mjs` is run
- **THEN** Check 22 passes on `openspec/backlog.md` with no violations.

#### Scenario: committing the check before the backfill would redden CI

- **GIVEN** the implementer has written Check 22 but has not yet backfilled Shape
  fields on all standalone kit backlog rows
- **WHEN** the implementer evaluates whether to commit the slice
- **THEN** the implementer MUST NOT commit until the backfill is also complete,
  per the same-slice ordering constraint.
