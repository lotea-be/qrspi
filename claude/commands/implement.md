---
description: QRSPI stage I. Delegates to the implementer subagent to write code one vertical slice at a time, ticking tasks.md as it goes. Stops at each slice checkpoint for human verification.
agent: implementer
subtask: true
---

You are running QRSPI stage **I (Implement)** for the current project.

Change id: $ARGUMENTS

Precondition (canonical *precondition check* in skill `qrspi-workflow`,
"Stage choreography"): the input artifact is
`openspec/changes/<id>/tasks.md`; on failure point the user at
`/qrspi:plan`. **This stage has a trivial exception to the precondition:**
if the change is non-trivial and `tasks.md` is missing, refuse as usual;
but if the user explicitly says this is a typo / lint / single-line fix,
allow it and require the user to state the inline plan in one paragraph
before any edits.

**Pick the implementer's model from the next un-ticked slice.** Read
`openspec/changes/$ARGUMENTS/tasks.md` and locate the first slice header
(`## N. ...`) whose tasks are not all ticked. The line directly
under that header reads `**Model:** sonnet|opus — <rationale>`. That
annotation is the architect's call; honor it. Invoke the implementer
subagent via the Agent tool with `model: <annotated>` so the subagent
runs on the right model for this slice's complexity.

If a slice is missing the annotation, stop and tell the user the
slices/tasks file needs to be fixed (the architect at stage V (Slices) is
required to write it). Do not silently default — silent defaults
hide planning gaps.

The implementer will:

1. Pick up the next un-ticked slice in `tasks.md`.
2. Work the tasks in order, ticking boxes.
3. Run lint, typecheck, and tests at the slice boundary.
4. Stop at the slice checkpoint and wait for human go-ahead.

**Interactive step (mandatory):** At each slice checkpoint, use the **AskUserQuestion** tool
to ask the human whether to continue. Example:
  question: "Slice 1 (Project skeleton) is complete and tests pass. Should I continue with Slice 2?"
  choices: ["Yes, continue with Slice 2", "Stop here — I want to review first"]
Only proceed to the next slice after explicit confirmation.

**Commit step (mandatory):** After each slice checkpoint passes (and
before asking to continue), use the **AskUserQuestion** tool to ask:
  question: "Commit Slice N changes to the feature branch?"
  choices: ["Yes — commit and push", "No — I'll commit later"]

If yes, first update `openspec/backlog.md`:
- On the **final** slice, change the change's row `Status:` line to
  `in-progress (Q, R, D, S, V, P, I complete)` and the
  `Next QRSPI command:` line to `/qrspi:pr <id>`.
- On **intermediate** slices, leave `Status:` alone and update the
  `Next QRSPI command:` line to reflect that slice N+1 is in flight
  (e.g. `/qrspi:implement <id>` is still the correct next call).

The backlog edit lands in the same commit as the slice (backlog
atomicity, see skill `qrspi-workflow`).

Then run:
```
git add openspec/changes/<id>/tasks.md openspec/backlog.md <files-modified-in-this-slice>
git commit -m "feat(<id>): implement slice N — <slice title>"
git push
```
Stage the implementer-modified files explicitly — the implementer's
final message lists them under "Files created/modified". As the canonical
*commit step* in skill `qrspi-workflow` requires, never use `git add -A`;
it can sweep up secrets, scratch files, or unrelated working-tree changes.

Re-running `/qrspi:implement <id>` resumes at the next un-ticked slice.

## Adding scope after stage I has started

If, mid-implementation, the human asks for functionality that is **not in
`tasks.md`** (e.g. something the change's spec lists under *Out of Scope*),
that is a **scope amendment** — not a `/qrspi:followup` (which is post-PR only and
only resolves work already in scope), and not silent improvisation that skips
the design artifacts. Handle it like this:

1. **Amend the design artifacts** to bring the work in scope: edit
   `proposal.md` and the change's delta `specs/**` (move the item out of the
   *Out of Scope* list; add the requirement + scenarios that describe it).
2. **Load skill `vertical-slice` plus the project's stack-cheatsheet skill (if any)**, then add a new
   vertical group `## N.` to `tasks.md` **and** a matching slice to
   `slices.md`, each carrying a `**Model:**` annotation. Loading the
   convention skills is what the architect (W) and planner (P) normally do
   before writing task specs — do not skip it, or the new slice will
   contradict documented conventions (e.g. the project's chosen component
   library and iconography over alternatives).
3. **Commit** as `docs(<id>): amend scope — add Slice N ...`, carrying the
   matching `openspec/backlog.md` edit (status / next-command) atomically.
4. **Then run `/qrspi:implement <id>`** to implement the new slice through the
   normal slice / checkpoint / commit machinery.

Return only what the implementer's "Final message format" specifies.
