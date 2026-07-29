# Proposal — orchestrator-context-budget

> Stage S of QRSPI. Generated 2026-07-28.

## Why

Long QRSPI sessions that chain many stages in one conversation accumulate
context that degrades instruction-following and eventually causes the
orchestrator to miss gates or produce shallow output. The `context-hygiene`
skill documents this risk but provides no in-session enforcement. This change
adds a lightweight, in-context counter-and-self-assessment gate (`context-budget-gate`)
that prompts the human to reset before quality degrades — mirroring the
`qrspi-version-check` pattern and embedding the same way across all 11 affected
commands. The gate is never suppressed and never nagging: it fires once per
threshold per session, and its soft-gate reset offer surfaces a ready-to-copy
resume path so restarting is low-friction.

## What Changes

- New shared skill `claude/skills/context-budget-gate/SKILL.md` (mirrors
  `qrspi-version-check` in structure), loaded by all 10 gate-scoped commands.
- Gate insertion point: after the silent version check, before run-mode
  establishment, in all 10 command files (8 stages + archive + followup).
- In-context stage-event counter incremented per invocation (no disk state);
  dual-trigger: counter threshold OR orchestrator qualitative self-assessment.
- Nudge fires once at 8 events (session flag suppresses re-nag); soft gate
  fires once at 12 events (never-suppressed across all run-modes).
- Soft gate `workflow` skill entry: joins the "Never-suppressed gates" list;
  "Reset now" prints the resume path and ends the turn without auto-advancing.
- `archive.md` gains a new step-7 AskUserQuestion ("Start a new session for
  the next change?"); "Yes" prints the resume path and ends the turn.
- `followup.md` nudge fires once per invocation, not per item.
- `context-hygiene` skill gains a `## Marathon anti-pattern` subsection with
  updated vocabulary and a 4th mechanism bullet.
- New lint Check `BUDGET_GATE_COMMAND_STEMS` asserts the embed line across
  the 10 commands (mirrors Check 9).

## Capabilities

### New Capabilities
- `context-budget-gate`: In-session counter and self-assessment gate that
  fires a nudge at 8 stage-events and a never-suppressed soft gate at 12,
  with per-level fire-once behaviour, a self-contained resume path on reset,
  and embedding across all 10 scoped commands -- creates
  `specs/context-budget-gate/spec.md`.

### Modified Capabilities
- `ci-quality-gates`: Adds a new lint check (`BUDGET_GATE_COMMAND_STEMS`)
  that asserts the `context-budget-gate` embed line is present in all 10
  scoped command files (mirrors Check 9's `qrspi-version-check` pattern) --
  needs a delta spec.
- `archive-workflow`: Adds step-7 reset offer after a successful archive;
  "Yes, start new session" prints the resume path and ends the turn without
  auto-advancing -- needs a delta spec.
- `followup-triage`: Context nudge fires once per `/qrspi:followup`
  invocation, not once per follow-up item -- needs a delta spec.

## Impact

- Breaking changes: no -- gate is advisory (nudge) or soft (gate with user
  choice); never a hard block on forward progress.
- Phases: phase 1 (single change, no epics).
- Affected code / APIs / dependencies: `claude/skills/context-budget-gate/`
  (new), `claude/commands/` (10 files), `claude/skills/context-hygiene/`,
  `claude/skills/workflow/`, `scripts/lint.mjs`, `README.md`.

## Out of scope

- Hard blocking: the gate never prevents forward progress; it can only prompt
  a reset. A hard context-ceiling enforcement gate is explicitly a Non-Goal.
- Disk-persisted counter: the counter lives entirely in conversational context;
  no file, config, or env-var storage is introduced.
- Status/update/retro commands: these three commands are excluded from the
  embed scope by design (D11).
- Configurable thresholds: the nudge (8) and soft-gate (12) thresholds are
  not user-configurable in this change.
- Multi-session counter persistence: context resets when the session ends;
  there is no cross-session carry-over.
- Auto-clearing the context: the gate surfaces a reset offer; it never
  auto-invokes `/clear` on the user's behalf.
