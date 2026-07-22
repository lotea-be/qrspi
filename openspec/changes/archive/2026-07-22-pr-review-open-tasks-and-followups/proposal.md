# Proposal — pr-review-open-tasks-and-followups

> Stage S of QRSPI. Generated 2026-07-16.

## Why

Today the QRSPI PR stage moves straight from the precondition check to the
reviewer subagent, silently carrying any un-ticked `tasks.md` boxes or
un-resolved `followups.md` entries into the PR. The reviewer then flags those
as "Open issues" at the end, but it can't resolve them — the gate comes too
late. This change inserts a **pre-PR reconciliation gate** between the
precondition check and the reviewer spawn, giving the human an explicit
per-item decision (Finish / Drop / Pause for tasks; Fix now / Defer / Drop /
Promote-to-backlog for follow-ups) before the reviewer ever sees the change.
The end state: by the time the reviewer runs, every open item has an explicit
decision, `tasks.md` reads all-ticked (dropped items self-document), and the
reviewer's independent safety-net check remains intact.

## What Changes

- `claude/commands/pr.md` gains two reconciliation passes (tasks pass, then
  follow-ups pass) between the precondition check and the reviewer spawn,
  including per-item AskUserQuestion prompts, count banners, Drop annotation
  logic, and early-exit commit handling.
- The `workflow` skill's "Hard-stop procedure" gains a one-line
  cross-reference noting the conditional hard-stop at the reconciliation gate
  (full mechanics live in `pr.md`).
- `claude/agents/reviewer.md` gains a one-line awareness note: a
  pre-reconciliation gate now runs upstream, and a `(human)` box left via
  "Leave-for-now" is a sanctioned open box — not a blocking "Open issue".
- `scripts/lint.mjs` gains Check 8: a structural assertion that
  `claude/commands/pr.md` still carries both reconciliation passes.
- `node sync-copilot.mjs` is re-run so `copilot/prompts/qrspi-pr.prompt.md`
  reflects the new passes.
- `CHANGELOG.md` `## [Unreleased]` entry.

## Capabilities

### New Capabilities

- `qrspi-pr-reconciliation`: The pre-PR reconciliation gate — tasks pass
  (Finish / Drop / Pause, with `(human)`-tag distinct path) and follow-ups
  pass (Fix now / Defer / Drop / Promote-to-backlog), mode-aware
  suppress/hard-stop behavior, count banner, Drop annotations, early-exit
  commit — creates `specs/qrspi-pr-reconciliation/spec.md`.

### Modified Capabilities

- `qrspi-run-mode`: Extended with the conditional hard-stop that fires when
  the reconciliation gate finds open items in Full/Semi-auto mode — a new
  pattern (clean→suppress, dirty→hard-stop) distinct from the existing
  failure-based hard-stop set — needs a delta spec. (D5, OQ2)
- `ci-quality-gates`: Extended with lint Check 8 asserting both reconciliation
  passes are present in `pr.md` — needs a delta spec. (D8-bis, OQ3)

## Impact

- Migrations: no schema migration; the only on-disk format change is the
  Drop annotation (`- [x] ~~text~~ (dropped)`) and Promote annotation written
  into existing `tasks.md` and `followups.md` files.
- Breaking changes: no API or format breaking changes; existing `tasks.md` and
  `followups.md` files are read-compatible.
- Phases: Slice 1 — tasks pass end-to-end (D2, D3, D7); Slice 2 — follow-ups
  pass end-to-end (D4, D6, D7); Slice 3 — auto-mode wiring + workflow-skill
  cross-reference note + lint Check 8 + reviewer awareness note + Copilot sync
  + docs (D1, D5, D8, D8-bis, OQ2, OQ3).
- Affected code / APIs / dependencies: `claude/commands/pr.md`,
  `claude/agents/reviewer.md`, `claude/skills/workflow/SKILL.md`,
  `scripts/lint.mjs`, `sync-copilot.mjs` (verification only),
  `copilot/prompts/qrspi-pr.prompt.md` (generated), `CHANGELOG.md`.

## Out of scope

- **`right-size-followup-handling`**: three-way routing of a "Fix now"
  follow-up (implement directly / addendum / defer). This change only asks the
  human for a decision; it does not change how `/qrspi:followup` routes the
  fix internally.
- **`standardize-recurring-ops-scripts`**: a shared Node helper for open-item
  enumeration. The orchestrator reads `tasks.md`/`followups.md` inline; the
  helper is a separate future change.
- Changing the reviewer subagent's checklist beyond the one-line awareness
  note (the reviewer's independent ticked-box verification is kept as-is).
- Changing the `followups.md` or `tasks.md` on-disk format (Drop annotations
  stay within existing markdown checkbox grammar).
- A `pr.md`-shape validator separate from Check 8.
