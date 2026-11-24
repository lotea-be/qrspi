# Design — lint-auto-mode-gate-coverage

> Stage D of QRSPI. Generated 2026-09-20.
> **Implementation is BLOCKED until a human approves this file.**

## Context

`add-auto-mode` introduced a shared run-mode / stage-choreography wiring that
every stage command must reference in its step-3 block (`Load skill
\`stage-choreography\` and follow its instructions exactly ...`). This block is
what threads run-mode establishment, the precondition check, the commit step,
and the next-stage handoff into each command. It is currently unguarded: a
command that silently drops the step-3 choreography load compiles fine, passes
every existing check, and is only discovered broken at runtime (a stage that
never establishes run-mode, never auto-advances). `scripts/lint.mjs` already
has this exact shape of guard for two sibling embeds — Check 9
(`checkVersionCheckEmbed`) and Check 10 (`checkBudgetGateEmbed`) — each a flat
whitespace-collapsed `.includes()` scan over a hardcoded stem list.

**Desired end state:** a new Check 26 (`checkChoreographyEmbed`) that mirrors
Checks 9/10 in shape, asserting the `stage-choreography` skill-load line is
present in every choreography-carrying stage command, carrying an inline
self-test (per PQ4), and registered as the last check in `main()` so no
existing check renumbers. Pure lint-tightening, kit-internal, no migration
manifest (PQ5).

## Goals / Non-Goals

**Goals:**
- Add Check 26: a pure embed-presence scan for the `stage-choreography`
  skill-load line across the choreography-carrying stage commands.
- Mirror Checks 9/10 exactly: hardcoded stem constant, whitespace-collapse +
  `.includes()`, `[<tag>] <rel>: missing ...` violation shape, single `OK:`
  pass line.
- Carry an inline self-test (present-fixture passes, absent-fixture fires),
  run before file I/O, matching the Check 24 shape.
- Update the top-of-file check-enumeration comment block for Check 26.

**Non-Goals:**
- Per-gate auto-branch wiring assertions (`Full or Semi auto`, per-slice /
  PR-create auto-advance) — deferred to backlog idea
  `lint-per-gate-auto-branch-wiring` per PQ2/PQ3. Out of scope.
- Asserting the tail `**Choreography (...)**` paragraph or the "Run-mode
  establishment" sentence as a second embed line — PQ2 chose the skill-load
  sentence ONLY.
- Covering `archive`/`followup` — PQ1 chose the stage-command scope, not the
  budget-gate scope.
- A migration manifest — PQ5.
- Any README change — a lint check is not a `/qrspi:*` command; the README
  command table (Check 4) is not affected. (See D5.)

## Decisions

### D1 — Scope is the 8 *choreography-carrying* stage commands, NOT the 9 `VERSION_CHECK_COMMAND_STEMS` verbatim (resolves a conflict in PQ1)

PQ1 answered "the 9 stems in `VERSION_CHECK_COMMAND_STEMS`." **Taken literally
that is wrong and would guarantee a false-positive violation.** I verified the
corpus: `VERSION_CHECK_COMMAND_STEMS` = `status, questions, research, design,
structure, slices, plan, implement, pr` (9), but **`status.md` carries zero
`stage-choreography` references** — it runs no subagent, has no run-mode, and
is deliberately excluded from `BUDGET_GATE_COMMAND_STEMS` for the same reason.
Scanning `status.md` for the choreography embed would fail on a correctly-wired
repo.

The set that actually carries the step-3 choreography block is the **8 stage
commands** `questions, research, design, structure, slices, plan, implement,
pr` — i.e. `VERSION_CHECK_COMMAND_STEMS` minus `status`, which is identical to
`BUDGET_GATE_COMMAND_STEMS` minus `archive` and `followup`.

**Chosen:** introduce a new dedicated constant
`CHOREOGRAPHY_EMBED_COMMAND_STEMS` holding exactly those 8 stems, hardcoded for
regression safety (the same rationale the other two constants cite). Do NOT
reuse `VERSION_CHECK_COMMAND_STEMS`.

**Rejected — reuse `VERSION_CHECK_COMMAND_STEMS` (literal PQ1):** produces a
guaranteed `status.md` false positive; reddens CI on a correct repo. This is
the crux the human should confirm — PQ1's *intent* (stage commands, tightest
scope, mirror Check 9) is honoured; its literal stem-count is corrected.

**Rejected — reuse `BUDGET_GATE_COMMAND_STEMS`:** that set includes
`archive`+`followup`, which PQ1 explicitly excluded, and would widen scope
beyond "stage commands."

I read the design ticket's PQ1 recommendation as "stage commands, mirroring
Check 9's *intent*"; the literal 9-stem list is the one place codebase reality
diverges from the resolved answer, so it is surfaced as OQ1 for a one-click
human confirmation.

### D2 — Detection substring: the skill-load sentence, ending at `exactly` (no trailing period)

The live line reads (wrapped across two source lines):
`Load skill \`stage-choreography\` and follow its instructions exactly -- it
carries the canonical main-loop procedures ...`. Unlike the version-check line
(which ends `... instructions exactly.` with a period), this sentence
**continues** with `-- it carries ...`, so there is no period after `exactly`.

**Chosen:** the constant `CHOREOGRAPHY_EMBED_LINE =
'Load skill \`stage-choreography\` and follow its instructions exactly'` (no
trailing period, no trailing `--`). This is the maximal prefix that is
byte-stable across all 8 files and does not depend on the continuation clause
wording. Match via whitespace-collapse (`text.replace(/\s+/g, ' ')`) then
`.includes()` — mandatory here because the line wraps mid-sentence in every
file, exactly the case Checks 9/10 collapse for.

**Rejected — include the trailing period** (copy the Check 9 form literally):
the `stage-choreography` line has no period after `exactly`; a period would
never match and every file would falsely violate.

**Rejected — include the `-- it carries the canonical main-loop procedures`
continuation:** longer substring, more brittle to future prose edits, no
detection benefit over the prefix.

### D3 — Inline self-test, run before file I/O (PQ4), mirroring Check 24

Two in-memory fixtures via a pure `hasChoreographyEmbed(collapsed)` helper:
(a) a present-fixture (wrapped across lines, whitespace-collapsed) that MUST
pass; (b) an absent-fixture (a command body with version-check + budget-gate
but no choreography line) that MUST fire. On self-test failure, push a
`[choreography-embed] SELF-TEST FAILED: ...` error and `return 1` before any
real file read — the established convention (Check 24, `selfTestFailed`
flag / early return). The self-test proves the *detector* works even if the
live corpus happens to be all-green.

**Rejected — no self-test (Checks 9/10 form):** PQ4 chose (a) explicitly;
newer checks all carry one, and a silent-but-broken detector is the failure
mode the self-test defends against.

### D4 — Registration: append as Check 26 at the end of `main()`; do not renumber

Check 25 is currently the last registered check; `main()` calls run in
declaration order. Append `checkChoreographyEmbed` after `checkChangelogTaskEmission`
with its own `process.stdout.write('\nCheck 26: ...\n')` banner, and add the
Check 26 row to the top-of-file enumeration comment block. This touches no
existing check number (Check 6 asserts nothing about lint check ordering).

**Rejected — insert near Checks 9/10 for thematic clustering:** would renumber
10b→ and every check after it, a large diff with regression risk across the
comment block, `main()`, and every `[tag]`/OK string, for cosmetic gain. The
embed-presence trio being 9, 10, 26 (non-adjacent) is acceptable — the comment
block documents the grouping.

### D5 — Error-message tag: `[choreography-embed]`; no README/skill-cheatsheet edit

Tag `[choreography-embed]` — parallel to `[version-check-embed]` and
`[budget-gate-embed]`, immediately legible in a CI failure and consistent with
the sibling checks' naming. Violation shape mirrors Check 9:
`[choreography-embed] claude/commands/<stem>.md: missing inline
stage-choreography embed line (expected to find: "...")`. Pass line:
`OK: all N stage command(s) contain the stage-choreography embed line`.

No README change: a lint check is not a `/qrspi:*` command, so Check 4 (README
command coverage) does not apply, and CLAUDE.md's "keep the README current"
rule targets commands/agents/skills/install/pin/layout — none of which this
touches. No `qrspi-stack` cheatsheet edit needed (it already documents
`node scripts/lint.mjs` generically, not per-check). This resolves Q22.

## Lint changes

- **New constant `CHOREOGRAPHY_EMBED_COMMAND_STEMS`** (8 stems; D1), placed
  beside `VERSION_CHECK_COMMAND_STEMS` / `BUDGET_GATE_COMMAND_STEMS` with the
  same "hardcoded for regression safety" comment and a note that `status`,
  `archive`, `followup`, `update`, `retro` are deliberately excluded.
- **New constant `CHOREOGRAPHY_EMBED_LINE`** (D2).
- **New function `checkChoreographyEmbed(errors)`** — self-test block (D3) →
  early return on failure → per-stem whitespace-collapse `.includes()` scan
  (D2) → violation push (D5) / single OK line. Structurally a clone of
  `checkVersionCheckEmbed` with the self-test prepended.
- **`main()` registration** as Check 26 (D4) + the top-of-file enumeration
  comment block updated.
- **CHANGELOG `## [Unreleased]`** entry — required by CLAUDE.md for any
  kit-touching change; Check 25 (`checkChangelogTaskEmission`) also expects a
  CHANGELOG task in this change folder's `tasks.md`, so the planner must emit
  one (flag for stage P/S).

## Vertical slices (preview)

This change has effectively one user-facing outcome (a green `node
scripts/lint.mjs` that now also guards the choreography embed). It is a single
thin vertical slice; splitting it would be artificial horizontal layering.

- **Slice 1 — Choreography-embed check, end to end.** Add the two constants +
  `checkChoreographyEmbed` (with inline self-test), register it as Check 26 in
  `main()`, update the enumeration comment block, and add the CHANGELOG entry.
  Demoable: `node scripts/lint.mjs` prints `Check 26: ...` with its OK line and
  exits 0; temporarily deleting the choreography line from one command file
  makes Check 26 fire, confirming the guard is live.

## Risks / Trade-offs

- **PQ1 literal-vs-intent (highest risk, → OQ1).** Shipping the literal 9-stem
  list would red the build via `status.md`. D1 corrects to 8; the human must
  confirm the intent reading. If the human genuinely wants `status` covered,
  the *command* must first gain a choreography block — out of scope here.
- **Substring brittleness.** If a future edit rewords the step-3 sentence
  before `exactly`, Check 26 false-fires. This is the same brittleness Checks
  9/10 already accept as the cost of a flat embed guard; the whitespace-collapse
  handles the only variation seen today (line wrapping).
- **Interaction with Check 5 (`checkGateExecutor`).** Check 5 already reads
  choreography references but accepts either `\`stage-choreography\`` or the
  legacy `\`workflow\`` marker and probes different files; Check 26 is a
  standalone parallel scan with its own constant and does not call Check 5's
  helper (resolves Q8/Q19 — no shared helper, no regression coupling).
- **Non-adjacent check numbers (9, 10, 26).** Cosmetic; accepted per D4 to
  avoid a renumbering diff.

## Open questions for the human

- [x] **OQ1 — confirm the stem set is the 8 choreography-carrying stage
  commands, NOT the literal 9 in `VERSION_CHECK_COMMAND_STEMS`.** PQ1's answer
  said "the 9 stems," but `status.md` carries no `stage-choreography` line, so
  scanning all 9 guarantees a false-positive `status.md` violation. D1 uses the
  8 stems (`VERSION_CHECK_COMMAND_STEMS` minus `status`, ==
  `BUDGET_GATE_COMMAND_STEMS` minus `archive`/`followup`). Approve the 8-stem
  correction, or state the intended handling of `status`.
  **Answer: Approve the 8-stem correction.** Use `questions, research, design,
  structure, slices, plan, implement, pr` via the new
  `CHOREOGRAPHY_EMBED_COMMAND_STEMS` constant. D1 is confirmed.
