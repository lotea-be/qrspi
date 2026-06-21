# Slices — verify-stage-gate-execution

> Stage V of QRSPI. Generated 2026-06-20.
> Vertical slices, not horizontal layers.

## Overview

This change fixes a bug where nine QRSPI stage commands routed their entire body
(including AskUserQuestion gates) into subagent contexts that cannot reach that
tool. The fix has three independently-verifiable steps: first ship a standing lint
guard (Check 5) that proves the bug class is detectable by RED-flagging the nine
broken commands before any fix lands; then perform the core conversion of all nine
commands to the canonical orchestrator body shape (dropping `agent:`/`subtask:`
frontmatter and adopting the D2 delegation pattern) and update the two skill files
(`qrspi-workflow` choreography attribution, `context-hygiene` firewall wording),
driving Check 5 to GREEN; finally regenerate the Copilot artifacts from the updated
`claude/` sources and update the README delegation line.

The "mock API / frontend / DB" scaffold from the vertical-slice skill does not map
literally — there is no API, UI, or database here. The spirit is preserved: each
slice ends in a concrete, runnable checkpoint signal and leaves the repo in a
coherent, independently-verifiable state. The nine command bodies are split across
two slices (Slice 2: simpler Q/R/D/S/V/P commands; Slice 3: the three commands
with documented deviations — `implement`, `design`, `pr`) so each split is
small enough to review atomically.

## Slices

### Slice 1 — Lint guard (Check 5)

Add `checkGateExecutor` to `scripts/lint.mjs` as Check 5, registered after Check 4.
The function reads every `claude/commands/*.md`, parses frontmatter for a non-builtin
`agent:` field, and scans the body for any tool name in `MAIN_LOOP_ONLY =
{'AskUserQuestion'}`. A match is a violation pushed to `errors[]`; otherwise an
`OK:` line is printed. Builtins (`build`, `agent`) are excluded. At the end of this
slice `node scripts/lint.mjs` exits non-zero with nine violations (one per stage
command), proving Check 5 catches the exact bug class before the fix lands —
the kit analogue of a red test.

- M: no mock layer — the lint script is a pure text/AST analysis tool with no
  service contract to stub.
- F: new `checkGateExecutor(errors)` async function and `main()` registration in
  `scripts/lint.mjs`. Hardcoded `MAIN_LOOP_ONLY = new Set(['AskUserQuestion'])`.
  Exclude `BUILTIN_AGENTS = {'build', 'agent'}` (already present in the script).
- D: no data-store change. The only file written is `scripts/lint.mjs`.
- T: run `node scripts/lint.mjs` and confirm it exits 1 with exactly 9 Check 5
  violations — one for each of the nine stage commands. Also confirm helper
  commands (`archive`, `init`, `stack`, `retro`, `status`) produce no Check 5
  violation. Manual inspection is the test; an automated test file is out of scope
  for this kit (no test framework present — the lint script IS the test harness).
- **Model:** sonnet — mechanical pattern: parse frontmatter key, grep body for
  tool name, push to errors array. Mirrors the existing `checkFrontmatter` pattern
  already in `scripts/lint.mjs`.
- Checkpoint: `node scripts/lint.mjs` exits 1 and prints exactly 9 Check 5
  violations (one per stage command). Helper commands produce no Check 5 line.
  All existing Check 1–4 results are unchanged.

### Slice 2 — Core conversion: six simpler stage commands + skill edits

Convert six stage commands (`questions`, `research`, `structure`, `slices`, `plan`,
`followup`) to the canonical orchestrator shape (D1/D2/D3): drop `agent:` and
`subtask:` from frontmatter; restructure the body to (1) Glob precondition,
(2) spawn stage subagent via Agent tool for the bounded artifact write, (3)
interactive review where applicable, (4) AskUserQuestion commit gate with explicit
`git add/commit/push`, (5) AskUserQuestion next-stage handoff that re-enters the
next `/qrspi:*` command in the main loop. Also edit `qrspi-workflow` SKILL.md
(D4: reattribute all four procedures to the main-loop orchestrator; replace
"fresh subtask/subagent" handoff wording) and `context-hygiene` SKILL.md (D5:
add clarifying sentence, standardise "Task tool" → "Agent tool"). These six
commands share the pure canonical pattern with no documented deviations — they
are the straight application of the D2 shape.

- M: no mock layer — these are document edits, not service stubs.
- F: six command files (`claude/commands/questions.md`, `research.md`,
  `structure.md`, `slices.md`, `plan.md`, `followup.md`); two skill files
  (`claude/skills/qrspi-workflow/SKILL.md`,
  `claude/skills/context-hygiene/SKILL.md`).
- D: no data-store change.
- T: `node scripts/lint.mjs` — Check 2 (frontmatter resolution) must still pass
  for all six converted commands; Check 5 must now show 0 violations for these
  six (three remain from Slice 3's commands). Confirm the skill files still pass
  Check 2 (name/description fields). Run `node scripts/lint.mjs` and count Check 5
  violations: should drop from 9 to 3.
- **Model:** sonnet — the D2 body shape is a well-defined template; applying it
  to six structurally similar commands is templated, mechanical work. The
  `qrspi-workflow` and `context-hygiene` edits are targeted prose changes with
  clear before/after (D4/D5 in design.md).
- Checkpoint: `node scripts/lint.mjs` exits 1 with exactly 3 Check 5 violations
  (for `design`, `implement`, `pr` — the three deviating commands handled in
  Slice 3). The six converted commands each have `description:` only in frontmatter
  (verified by reading the files). The `qrspi-workflow` skill contains no
  "fresh subtask" or "invoke the next stage as a subagent" phrasing for the
  handoff step. The `context-hygiene` skill uses "Agent tool" (not "Task tool")
  throughout.

### Slice 3 — Core conversion: three deviating stage commands

Convert the remaining three stage commands: `design.md`, `implement.md`, and
`pr.md`. Each has a documented deviation from the pure canonical D2 shape
(design.md: reuses final-confirmation answer for handoff instead of a separate
AskUserQuestion; implement.md: already orchestrator-shaped with per-slice Agent
tool spawn + two AskUserQuestion calls per slice, needs only frontmatter strip;
pr.md: unconditional commit after PR creation, two-part precondition with Bash
`git status --short`). Per design.md D2: these deviations concern which gate fires
when, not who runs it — the executor is now uniformly the orchestrator. Each
command is handled on its own terms, preserving its documented deviation while
dropping `agent:`/`subtask:`.

- M: no mock layer.
- F: three command files (`claude/commands/design.md`, `implement.md`, `pr.md`).
- D: no data-store change.
- T: `node scripts/lint.mjs` — Check 5 must reach 0 violations (all nine stage
  commands converted). All other checks remain green. Verify `implement.md` body
  still references the Agent tool with `model: <annotated>` per-slice annotation
  (existing deviation preserved). Verify `pr.md` body still has its two-part
  precondition (Glob + Bash `git status --short`).
- **Model:** sonnet — `implement.md` is a frontmatter-strip only (the body is
  already orchestrator-shaped per research §Deviations). `design.md` and `pr.md`
  require reading their documented deviations carefully to preserve them, but
  design.md D2 gives explicit before/after guidance for each. No novel reasoning
  required beyond following design.md's documented deviation notes.
- Checkpoint: `node scripts/lint.mjs` exits 0. Check 5 reports `OK` with 0
  violations. All nine stage commands have `description:` only in frontmatter.

### Slice 4 — Docs and Copilot parity

Update README.md line 192 (D8: rewrite the delegation claim to reflect the new
orchestrator model). Then regenerate the `copilot/` tree by running
`node sync-copilot.mjs` (never hand-editing `copilot/` directly, per CLAUDE.md).
The body rewrites from D2/D4/D5 (AskUserQuestion → vscode/askQuestions, "invoke
the `<X>` subagent" → "continue as the `<X>`") propagate automatically through
`rewriteAll` in `sync-copilot.mjs`. Verify zero drift with
`node sync-copilot.mjs --check`.

- M: no mock layer.
- F: `README.md` (line 192 rewrite); `copilot/` tree (regenerated via script,
  never hand-edited).
- D: no data-store change.
- T: `node sync-copilot.mjs --check` exits 0 with zero ADDED/DELETED/DIFF
  lines. `node scripts/lint.mjs` remains green (Check 4: README command coverage
  unaffected by line 192 prose change). Manually confirm README.md line 192
  contains "main loop" and "bounded artifact write" language matching D8's final
  wording.
- **Model:** sonnet — the README edit is a single sentence substitution with the
  exact new wording provided in design.md D8. The Copilot regeneration is a
  script execution with a zero-drift verification check, not reasoning work.
- Checkpoint: `node sync-copilot.mjs --check` exits 0. `node scripts/lint.mjs`
  exits 0. README.md line 192 reads approximately: "A Copilot prompt carries an
  `agent:` field so the whole prompt runs in that agent; the Claude command instead
  runs in the main loop and spawns its subagent (via the Agent tool) only for the
  bounded artifact write, keeping the human gates on the orchestrator."
