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

4. **Emit the runbook.** Print, in this order:
   - The one-time setup line: launch a **fresh** session with
     `claude --plugin-dir` pointed at this repo root, and the reminder that the
     current session runs the cached release (confirm via `/plugin`).
   - The throwaway fixtures the change needs (scratch consumer repo, marker
     values, plugin-file states) — created outside this repo.
   - A table with one row per `(human)` task: **task id · fixture state ·
     command to run · expected observation** (map the task text + the grounding
     from step 3 into a precise, watchable expectation).
   - A closing note: tick each `(human)` box in `tasks.md` only on an **observed**
     pass; a misbehaving check is pre-PR signal — fix the slice (still stage I)
     or record it in `followups.md`, never a silent tick.

5. **Offer to help run it.** Ask the user (via **AskUserQuestion**) whether they
   want you to scaffold the scratch fixtures now (into the session scratchpad, not
   this repo) or just keep the printed runbook. Do not create any fixture files
   inside this repository.

Keep the output a runbook the human can execute in a separate terminal — you
cannot drive an interactive `--plugin-dir` session from here.
