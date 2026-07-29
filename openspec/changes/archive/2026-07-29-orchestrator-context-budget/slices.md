# Slices — orchestrator-context-budget

> Stage V of QRSPI. Generated 2026-07-28.
> Vertical slices, not horizontal layers.

## Overview

This change adds a lightweight in-session context-budget gate across the QRSPI kit.
There is no data-store, HTTP API, or UI surface: every deliverable is observable
either by running `node scripts/lint.mjs` (lint-gate surface) or by launching a
live `--plugin-dir` session and crossing an event threshold (slash-command and
skill surfaces).

Three slices map cleanly onto three independently demoable gate behaviours:

1. **Gate fires on the stage path** -- the `context-budget-gate` skill ships and
   is embedded in all 8 stage commands; a human in a `--plugin-dir` session can
   observe the nudge and soft-gate appearing at the correct thresholds.
2. **Boundary resets** -- `archive.md` gains its step-7 reset offer and
   `followup.md` enforces the once-per-invocation nudge rule; both behaviours are
   independently demoable with short targeted sessions.
3. **Docs + guardrail** -- `context-hygiene` and `workflow` skill prose is updated,
   and the new `BUDGET_GATE_COMMAND_STEMS` lint check is wired into
   `scripts/lint.mjs`; demo is `node scripts/lint.mjs` passing, then failing when
   an embed is dropped.

All three slices carry `(human)` dogfood checkpoints for the runtime nudge and gate
behaviours that `node scripts/lint.mjs` cannot reach. The `(D<n>)` tags throughout
this file reference design decisions from `design.md` and are required -- this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 -- Gate fires on the stage path

**Deliverable.** A human running `claude --plugin-dir /workspaces/git/qrspi` can
trigger any of the 8 stage commands repeatedly until the stage-event counter
crosses 8, observe the one-line nudge advisory appear, continue to 12, and observe
the never-suppressed soft-gate AskUserQuestion. The skill's per-level fire-once
flags ensure the nudge does not repeat after it has fired, and "Reset now" prints
the resume one-liner and ends the turn. The `archive.md` and `followup.md` embeds
are deliberately absent from this slice -- they ship in Slice 2.

- Skill: create `claude/skills/context-budget-gate/SKILL.md` with YAML frontmatter,
  in-context counter logic, dual-trigger evaluation (counter OR self-assessment),
  nudge at 8 (print advisory + set flag, no AskUserQuestion), soft gate at 12
  (AskUserQuestion "Reset now" / "Continue anyway", never suppressed, "Reset now"
  prints resume one-liner and ends turn), per-level fire-once session flags (D1,
  D3, D5, D6, D7, D8)
- Command: insert the `context-budget-gate` load line after `qrspi-version-check`
  and before run-mode establishment in exactly 8 files: `questions.md`,
  `research.md`, `design.md`, `structure.md`, `slices.md`, `plan.md`,
  `implement.md`, `pr.md` (D2, D4)
- Skill: add a third bullet to the "Never-suppressed gates" list in
  `claude/skills/workflow/SKILL.md` naming the context-budget soft gate and noting
  it fires in all run-modes with "Reset now" ending the turn (D9)
- T (Tests): run `node scripts/lint.mjs` -- the Slice 3 lint check does not exist
  yet, so this is a smoke pass only; manually verify the embed position in one
  command file (e.g. `plan.md`)
- **Compute:** effort=medium -- new skill with non-trivial branching logic (dual
  trigger, two thresholds, two session flags, run-mode-agnostic soft gate);
  8-command embed is mechanical but the position rule is load-bearing (D4)
- Checkpoint `(human)`: in a fresh `claude --plugin-dir /workspaces/git/qrspi`
  session, invoke any stage command 8 times; confirm the one-line nudge advisory
  appears exactly once and the stage proceeds without an AskUserQuestion. Then
  invoke 4 more times (total 12); confirm the soft-gate AskUserQuestion appears.
  Select "Reset now"; confirm the resume one-liner (`/qrspi:<stage> <id>`) is
  printed and the turn ends. Start a new session and confirm no flags are carried
  over (counter starts at 1).

### Slice 2 -- Boundary resets

**Deliverable.** Two targeted runtime behaviours ship. First, a human archiving a
change sees a new step-7 AskUserQuestion ("Start a new session for the next
change?") and selecting "Yes" prints `/qrspi:status` and ends the turn. Second,
a human running `/qrspi:followup <id>` across multiple items in one invocation
sees the nudge advisory at most once for the whole call -- not once per item. The
stage-command gate from Slice 1 is already live; this slice adds the two boundary
commands and their specific embed behaviour.

- Command: insert the `context-budget-gate` load line after `qrspi-version-check`
  in `claude/commands/archive.md` (D2, D4)
- Command: add step-7 AskUserQuestion ("Start a new session for the next change?"
  / "Yes -- print resume path and end turn" / "No -- stay in this session") after
  the successful-archive block in `claude/commands/archive.md`; "Yes" prints
  `/qrspi:status` and ends turn without auto-advancing; offer is never suppressed
  by run-mode (D10)
- Command: insert the `context-budget-gate` load line after `qrspi-version-check`
  in `claude/commands/followup.md` (D2, D4)
- Skill: verify that `claude/skills/context-budget-gate/SKILL.md` already instructs
  the once-per-invocation rule for `/qrspi:followup` (carried from Slice 1 via D8;
  no additional skill edit needed if the rule is already there)
- T (Tests): run `node scripts/lint.mjs` smoke pass; manually verify step-7 prose
  and embed positions in `archive.md` and `followup.md`
- **Compute:** effort=low -- two command-file edits against established patterns;
  the archive step-7 wording mirrors the soft-gate "Reset now" pattern already
  shipped in Slice 1 (D10)
- Checkpoint `(human)`: in a fresh `claude --plugin-dir /workspaces/git/qrspi`
  session, archive a throwaway fixture change; confirm the step-7 AskUserQuestion
  appears after the commit and selecting "Yes" prints `/qrspi:status` and ends the
  turn. Then in a separate session invoke `/qrspi:followup` on a change with
  2+ follow-up items after having crossed the nudge threshold (8 prior events);
  confirm the nudge fires at most once during that invocation.

### Slice 3 -- Docs + guardrail

**Deliverable.** Running `node scripts/lint.mjs` passes cleanly with a new check
visible in the output. Dropping the `context-budget-gate` embed from any of the 11
command files causes lint to exit non-zero and name the offending file. The
`context-hygiene` skill now contains a `## Marathon anti-pattern` subsection with
correct "cross-stage within one session" vocabulary and 4+ mechanism bullets. A
contributor reading `workflow` already has the soft gate listed under
"Never-suppressed gates" (shipped in Slice 1), so no further workflow edit is
needed here.

- Lint: add `checkBudgetGateEmbed` to `scripts/lint.mjs` after Check 9, using the
  same async-function-pushing-to-errors pattern; hardcode `BUDGET_GATE_COMMAND_STEMS`
  as the 11-command constant; assert inline form (not transitive-only); flag missing
  embeds by file name; excluded commands (`status.md`, `update.md`, `retro.md`)
  must not be in the constant (D12, D13)
- Skill: add `## Marathon anti-pattern` subsection to
  `claude/skills/context-hygiene/SKILL.md` with "cross-stage within one session"
  vocabulary and a 4th mechanism bullet naming the `context-budget-gate` (D14)
- T (Tests): run `node scripts/lint.mjs` -- must pass with all 11 embeds present;
  then temporarily remove the embed from one command file, run again, confirm the
  check fails and names the file; restore the embed
- **Compute:** effort=medium -- the lint check is new logic (file-read loop,
  constant definition, inline-form assertion, excluded-commands guard); the
  context-hygiene prose edit is light but the vocabulary constraint (cross-stage
  not cross-change) requires care
- Checkpoint: `node scripts/lint.mjs` exits 0. Manually remove the
  `context-budget-gate` load line from `claude/commands/plan.md` and rerun;
  confirm `checkBudgetGateEmbed` reports a violation naming `plan.md` and exits
  non-zero. Restore the line and confirm the check passes again.

## Slice 4 — Reset instruction names `/clear` (post-PR P2 amendment)

Refine the reset UX so the "Reset now" (soft gate) and archive-step-7 "Yes"
branches direct the human to run `/clear` (the lightweight in-place reset) before
`/qrspi:<next> <id>`, per D12 — auto-invoking `/clear` was verified infeasible
(slash commands are user-initiated; a model-emitted `/clear` is inert). Text-only
observable change; the branches still print-and-end-the-turn.

- Skill: update the `context-budget-gate` resume one-liner (Step 4 "Reset now"
  branch) to name `/clear` then `/qrspi:<next> <id>` (D8, D12)
- Command: update `archive.md` step-7 "Yes" branch resume line to name `/clear`
  then the next command (D9, D12)
- Spec: update the resume-path wording in `specs/context-budget-gate/spec.md` and
  `specs/archive-workflow/spec.md` to mention `/clear` (D12)
- Docs: refresh the CHANGELOG `[Unreleased]` entry to mention the `/clear`-named reset
- **Compute:** effort=low -- text-only prose refinement across a skill, a command,
  two delta specs, and the changelog; no logic change
- Checkpoint: `node scripts/lint.mjs` exits 0 and `openspec validate
  orchestrator-context-budget --strict` passes; the resume one-liner and the
  archive step-7 "Yes" branch both name `/clear`.
