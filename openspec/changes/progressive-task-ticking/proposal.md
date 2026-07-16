# Proposal — progressive-task-ticking

> Stage S of QRSPI. Generated 2026-07-16.

## Why

The QRSPI implementer agent currently ticks `tasks.md` checkboxes in one batch
right before the slice's final message, rather than after each individual task. The
root cause is that the existing instruction is stated as *intent* ("tick the boxes
as you complete them") rather than as a *sequencing gate*, leaving the model free
to rationalize batch-ticking as compliant. This change rewrites the two instruction
sites in `claude/agents/implementer.md` so each checkbox is ticked immediately
after its task is confirmed correct and before the next task begins — making
progress observable live in the IDE and keeping `tasks.md` durable across
mid-slice interruptions.

## What Changes

- `claude/agents/implementer.md` step 4a is rewritten to be a full immediate-ticking
  instruction (immediacy anchor, rationale, premature-ticking guard, commit/tick
  disambiguation sentence) — D1.
- `claude/agents/implementer.md` Coding-rules ticking line is rewritten into a terse
  pointer to step 4a while preserving its "commit message references the change id"
  clause — D2.
- `copilot/agents/copilot-implementer.agent.md` is regenerated via `node
  sync-copilot.mjs` to keep the Copilot mirror in sync — D6.
- `CHANGELOG.md` receives an `[Unreleased]` entry for this change — D5.

## Capabilities

### New Capabilities

- _none_

### Modified Capabilities

- `qrspi-command-surface`: The implementer's per-task checkbox ticking behavior
  becomes a sequencing gate — each tick MUST land immediately after its task is
  confirmed, before the next task starts, persisted as its own edit. Commits and
  human checkpoints remain at slice granularity. Needs a delta spec.

## Impact

- Migrations: no — prompt-text-only change, no `openspec/` path action required for
  `/qrspi:update`.
- Breaking changes: no — the observable behavior change is the implementer ticking
  more frequently; slice-granularity commits and human checkpoints are unchanged.
- Phases: single phase (one slice end-to-end).
- Affected code / APIs / dependencies: `claude/agents/implementer.md` (two edit
  sites); `copilot/agents/copilot-implementer.agent.md` (regenerated, not
  hand-edited); `CHANGELOG.md` ([Unreleased] entry). No other file is touched.

## Out of scope

- **Per-task git commits.** Commits stay at slice granularity. This is a permanent
  design boundary enforced by the block-signal contract (committing a half-built
  slice is forbidden).
- **Per-task human checkpoints.** The slice remains the atomic reviewable and
  verifiable unit; no per-task AskUserQuestion is added.
- **Orchestrator / command / skill changes.** No edit to
  `claude/commands/implement.md`, the `workflow` skill, or any other file. The
  behavior lives entirely in `implementer.md`.
- **A new lint check for the ticking keyphrase.** Code review of the diff is the
  accepted acceptance bar (OQ1 resolved as D4: no lint check). A text-presence
  check does not verify the behavior it guards and freezes an exact keyphrase.
- **A migration manifest in this PR.** No consumer-repo migration step is needed;
  the `[Unreleased]` CHANGELOG entry is sufficient. A manifest is authored when a
  release is cut, not in the feature PR.
