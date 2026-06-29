---
description: QRSPI stage I. Delegates to the implementer subagent to write code one vertical slice at a time, ticking tasks.md as it goes. Stops at each slice checkpoint for human verification.
argument-hint: <change-id>
agent: copilot-implementer
---

You are running QRSPI stage **I (Implement)** for the current project.

Change id: ${input}

Read or establish the run-mode by following the **Run-mode** procedure in
skill `workflow` before doing any other work.

Precondition (canonical *precondition check* in skill `workflow`,
"Stage choreography"): the input artifact is
`openspec/changes/<id>/tasks.md`; on failure point the user at
`/qrspi-plan`. **This stage has a trivial exception to the precondition:**
if the change is non-trivial and `tasks.md` is missing, refuse as usual;
but if the user explicitly says this is a typo / lint / single-line fix,
allow it and require the user to state the inline plan in one paragraph
before any edits.

**Check the next un-ticked slice's recommended model.** Read
`openspec/changes/${input}/tasks.md` and locate the first slice header
(`## N. ...`) whose tasks are not all ticked. The line directly
under that header reads `**Model:** sonnet|opus — <rationale>`. That
annotation is the architect's call.

> Copilot has no per-slice model auto-selection. If the slice is annotated
> `opus` (deep reasoning), tell the user to pick a strong reasoning model in
> the model picker before continuing; for `sonnet`, the default is fine. Then
> proceed with the implementation below.

If a slice is missing the annotation, stop and tell the user the
slices/tasks file needs to be fixed (the architect at stage V (Slices) is
required to write it). Do not silently default — silent defaults
hide planning gaps.

The implementer will:

1. Pick up the next un-ticked slice in `tasks.md`.
2. Work the tasks in order, ticking boxes.
3. Run lint, typecheck, and tests at the slice boundary.
4. Stop at the slice checkpoint and wait for human go-ahead.

**Implementer block-signal contract (mandatory, all modes).** The implementer
MUST return an error or blocked signal -- and MUST NOT commit the slice --
when lint, typecheck, tests, or `openspec validate` fail at a slice boundary.
This is what makes the orchestrator's hard-stop condition (3) ("subagent
returns error or blocked") cover the red-build case in auto mode. In Manual
mode this is equally required: do not commit a broken slice even if the human
would later be asked. Surface the failure details in the return message and
mark the slice as blocked, leaving the working tree uncommitted.

**Per-slice loop (mode-aware -- follow the I per-slice auto-advance rule in
skill `workflow`).** After the implementer subagent returns for Slice N:

**If mode is Full or Semi auto:**

1. Inspect the implementer's return message. If it signals error or blocked
   (see "Implementer block-signal contract" above), trigger a hard-stop:
   surface the error to the human and do NOT commit the slice or advance
   to Slice N+1 (see the "Hard-stop procedure" in skill `workflow`).
2. If successful, auto-commit the slice (explicit paths, stage commit
   message, push -- per the canonical "Commit step" in skill `workflow`):
   - First update `openspec/backlog.md` (same rules as Manual below).
   - Then run:
     ```
     git add openspec/changes/<id>/tasks.md openspec/backlog.md <files-modified-in-this-slice>
     git commit -m "feat(<id>): implement slice N — <slice title>"
     git push
     ```
3. Read the next un-ticked slice's `**Model:**` annotation from `tasks.md`.
   Honor it: continue as the implementer via the Agent tool with
   `model: <annotated>` for the next slice. Auto mode does NOT bypass
   per-slice model selection -- the annotation is the architect's call.
4. Repeat until all slices are done.
5. After the final slice is committed, proceed to the next-stage handoff
   (PR stage) per the "Next-stage handoff" in skill `workflow`.

**If mode is Manual:**

Use the per-slice checkpoint and per-slice commit vscode/askQuestions gates as
described below. Only proceed to the next slice after explicit confirmation.

**Interactive checkpoint (Manual only):** At each slice checkpoint, use the
#tool:vscode/askQuestions to ask the human whether to continue. Example:
  question: "Slice 1 (Project skeleton) is complete and tests pass. Should I continue with Slice 2?"
  choices: ["Yes, continue with Slice 2", "Stop here — I want to review first"]
Only proceed to the next slice after explicit confirmation.

**Per-slice commit step:** After each slice checkpoint passes (and, in Manual,
after the human confirms), update `openspec/backlog.md`:
- On the **final** slice, change the change's row `Status:` line to
  `in-progress (Q, R, D, S, V, P, I complete)` and the
  `Next QRSPI command:` line to `/qrspi-pr <id>`.
- On **intermediate** slices, leave `Status:` alone and update the
  `Next QRSPI command:` line to reflect that slice N+1 is in flight
  (e.g. `/qrspi-implement <id>` is still the correct next call).

The backlog edit lands in the same commit as the slice (backlog
atomicity, see skill `workflow`).

In Manual mode, use the #tool:vscode/askQuestions to ask before committing:
  question: "Commit Slice N changes to the feature branch?"
  choices: ["Yes — commit and push", "No — I'll commit later"]

Then run (if committing):
```
git add openspec/changes/<id>/tasks.md openspec/backlog.md <files-modified-in-this-slice>
git commit -m "feat(<id>): implement slice N — <slice title>"
git push
```
Stage the implementer-modified files explicitly -- the implementer's
final message lists them under "Files created/modified". As the canonical
*commit step* in skill `workflow` requires, never use `git add -A`;
it can sweep up secrets, scratch files, or unrelated working-tree changes.

Re-running `/qrspi-implement <id>` resumes at the next un-ticked slice.

## Adding scope after stage I has started

If, mid-implementation, the human asks for functionality that is **not in
`tasks.md`** (e.g. something the change's spec lists under *Out of Scope*),
that is a **scope amendment** — not a `/qrspi-followup` (which is post-PR only and
only resolves work already in scope), and not silent improvisation that skips
the design artifacts. Handle it like this:

1. **Amend the design artifacts** to bring the work in scope: edit
   `proposal.md` and the change's delta `specs/**` (move the item out of the
   *Out of Scope* list; add the requirement + scenarios that describe it).
2. **Consult the **vertical-slice** instructions (`vertical-slice.instructions.md`) plus the project's stack-cheatsheet skill (if any)**, then add a new
   vertical group `## N.` to `tasks.md` **and** a matching slice to
   `slices.md`, each carrying a `**Model:**` annotation. Loading the
   convention skills is what the architect (W) and planner (P) normally do
   before writing task specs — do not skip it, or the new slice will
   contradict documented conventions (e.g. the project's chosen component
   library and iconography over alternatives).
3. **Commit** as `docs(<id>): amend scope — add Slice N ...`, carrying the
   matching `openspec/backlog.md` edit (status / next-command) atomically.
4. **Then run `/qrspi-implement <id>`** to implement the new slice through the
   normal slice / checkpoint / commit machinery.

Return only what the implementer's "Final message format" specifies.
