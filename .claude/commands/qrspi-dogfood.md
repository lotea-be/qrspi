---
description: Produce a concrete dogfood runbook for an in-flight QRSPI change so its runtime behaviour can be verified in a real session before the PR stage. Reads the change's `(human)` tasks and turns each into a fixture → command → expected-observation row. Local repo dev-tooling — not shipped in the plugin.
---

Build a **dogfood runbook** for the QRSPI change whose id is `$ARGUMENTS`, so the
human can verify its runtime behaviour in a live session and earn genuine
Confirm-done ticks at the PR reconciliation gate instead of Leave-for-now.

Load skill `qrspi-dogfood` first — it carries the mechanism (`claude
--plugin-dir`), the fixture guidance, and the gotchas. This command is the
per-change application of it.

Do not shell out to inspect the repo — use the **Glob** and **Read** tools
(they have no permission requirements and work on every platform).

Steps:

1. **Resolve the change.** Use the **Glob** tool with pattern
   `openspec/changes/$ARGUMENTS/tasks.md`. If it returns nothing, tell the user
   the change has no `tasks.md` yet (run the QRSPI flow through stage P first)
   and stop.

2. **Extract the runtime checks.** Read `openspec/changes/$ARGUMENTS/tasks.md`
   and collect every task line containing the `(human)` tag — these are the
   runtime observations that only a live session can make. Note each task's
   parent `## N. <slice>` heading for context.

3. **Ground the expectations.** Read `openspec/changes/$ARGUMENTS/design.md` and
   any `openspec/changes/$ARGUMENTS/specs/**/spec.md` so each expected
   observation is checked against the **approved contract**, not a guess. (Use
   the **Glob** tool with pattern `openspec/changes/$ARGUMENTS/specs/**/spec.md`
   to find the delta specs.)

4. **One-time setup (print once).** Scaffold a throwaway consumer repo in the
   session scratchpad (never inside this repository) and give the human the
   one-time launch context: a **fresh** `claude --plugin-dir` session pointed at
   this repo root, with the reminder that the current session runs the cached
   release (confirm via `/plugin`).

5. **Run the interactive per-check loop** (per skill `qrspi-dogfood`, "Iterate
   one check at a time"). Do **not** dump the whole table. For each `(human)`
   check, in order, do exactly one cycle and stop for the human:
   - **Provision** the scratch fixture to this check's exact state yourself
     (marker value, marker present/absent, config-dir state) — do not make the
     human hand-edit fixture state.
   - **Give the exact terminal commands** for this check (copy-pasteable,
     including any per-check env prefix such as `CLAUDE_CONFIG_DIR=…`), and note
     whether a fresh session is needed.
   - **Say what to run in Claude and the precise expected observation** (exact
     choices / silence / one-line notice / once-vs-per-stage), grounded in the
     design + delta specs from step 3.
   - **Ask via AskUserQuestion whether the actual result matches**
     (`Matches / Doesn't match — I'll describe`). Wait for the answer.
   - **Record:** on *Matches*, tick that box in `tasks.md`. On *Doesn't match*,
     capture the human's description as a finding — fix the slice (still stage I)
     or add to `followups.md`; never tick an unobserved box.
   - **Advance** to the next check.

You cannot drive the interactive `--plugin-dir` session yourself — the human runs
each command in their separate terminal and reports back; your job is to
provision, instruct one check at a time, ask, and record.
