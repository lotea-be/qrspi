# Proposal — add-auto-mode

> Stage S of QRSPI. Generated 2026-06-29.

## Why

Every QRSPI stage pauses at ~20 human prompts per change. A human who trusts
the flow still clicks through commit gates, handoffs, S's design-approval gate,
per-slice Implement checkpoints, and PR-create — even when they would answer the
same way every time. This change adds a **ternary run-mode** (Full auto / Semi-auto
/ Manual) to the workflow skill's Stage choreography, letting a trusted flow run
Q→PR with pauses only where real human judgement is required: the Q product-question
pass, the D design review, the backlog-capture offers, and a precise set of hard-stops.

## What Changes

- `claude/skills/workflow/SKILL.md` — new **"Run-mode (Full / Semi / Manual)"**
  subsection in Stage choreography. Defines: (i) the ternary mode prompt asked at
  every fresh stage invocation; (ii) the fresh-vs-mid-chain inheritance rule; (iii)
  mode-aware auto-branch clauses folded into each of the four existing canonical
  procedure subsections (precondition check, commit step, next-stage handoff,
  backlog atomicity).
- All 8 stage command bodies (`questions`, `research`, `design`, `structure`,
  `slices`, `plan`, `implement`, `pr`) — one new reference line each pointing to
  the run-mode procedure (alongside the existing choreography reference). No gate
  logic is duplicated in command bodies.
- `README.md` — a short "Run modes" paragraph in the stage-overview section; gate
  prose updated to note which gates are conditionally suppressed.
- `copilot/` — regenerated via `node sync-copilot.mjs`; every command-body change
  flows through. Acceptance: `node sync-copilot.mjs --check` exits 0.
- `openspec/backlog.md` — the `add-auto-mode` row transitions from `proposed` to
  `in-progress` as each stage completes.

## Capabilities

### New Capabilities

- `qrspi-run-mode`: Ternary run-mode (Full auto / Semi-auto / Manual) for the
  QRSPI orchestrator — creates `specs/qrspi-run-mode/spec.md`.

### Modified Capabilities

- `qrspi-command-surface`: The four canonical choreography procedures gain
  mode-aware auto-branch clauses; the implementer's subagent contract gains a
  mandatory block-signal clause for failing builds at slice boundaries — needs a
  delta spec.

## Impact

- Migrations: none. No disk artifact; no new file written to `openspec/changes/<id>/`.
- Breaking changes: none. The same 14 `/qrspi:*` commands, same arguments, same
  commit-message strings. Manual mode is today's behaviour, unchanged. The only
  new user-visible element is the ternary mode prompt at the top of a fresh stage.
- Phases: single phase, no epic split.
- Affected code / APIs / dependencies:
  - `claude/skills/workflow/SKILL.md` (single source of truth for mode logic)
  - `claude/commands/questions.md`, `research.md`, `design.md`, `structure.md`,
    `slices.md`, `plan.md`, `implement.md`, `pr.md` (one reference line each)
  - `README.md`
  - `copilot/` (regenerated; never hand-edited per CLAUDE.md)
- Out of scope: `claude/commands/followup.md` (post-PR fix loop, not a stage in
  the Q→PR chain); `scripts/lint.mjs` (no new check; structural guard offered to
  backlog as `lint-auto-mode-gate-coverage`); `openspec-templates/` (no artifact
  shape changes).
- Acceptance signals: Manual mode behaviour is identical to today; Full auto
  chains Q→R→D-pause (→S→V→P→I→PR after D approval) with no commit/handoff
  prompts; `node sync-copilot.mjs --check` exits 0; `node scripts/lint.mjs` green;
  `npx @fission-ai/openspec@1.4.1 validate add-auto-mode` passes.
