---
description: QRSPI stage I. Delegates to the implementer subagent to write code one vertical slice at a time, ticking tasks.md as it goes. Stops at each slice checkpoint for human verification.
---

You are running QRSPI stage **I (Implement)** for the current project.

Change id: $ARGUMENTS

1. **Session version check — run silently.** Load skill `qrspi-version-check` and follow its
   instructions exactly. Follow its
   Silence discipline: do not announce or narrate this step, and print nothing
   unless the check itself must prompt or warn. This is the first step -- before the run-mode
   establishment and before any other work.

2. **Context budget gate.** Load skill `context-budget-gate` and follow its instructions exactly.

3. Read or establish the run-mode by following the **Run-mode** procedure in
   skill `workflow` before doing any other work.

Precondition (canonical *precondition check* in skill `workflow`,
"Stage choreography"): the input artifact is
`openspec/changes/<id>/tasks.md`; on failure point the user at
`/qrspi:plan`. **This stage has a trivial exception to the precondition:**
if the change is non-trivial and `tasks.md` is missing, refuse as usual;
but if the user explicitly says this is a typo / lint / single-line fix,
allow it and require the user to state the inline plan in one paragraph
before any edits.

> Resolve `openspec/changes/<id>/…` against the **current working repo root** (the consumer's CWD), not the plugin install directory — the change folder lives in the repo you are running the command in.

**Trivial inline-plan path (no `tasks.md`).** When the trivial exception
applies and the user has stated the inline plan, spawn `qrspi:implementer-medium`
with `model: sonnet` explicitly -- do NOT fall through to the variant-resolution
block below (which requires a `**Compute:**` line and would hard-stop on a
missing `effort=` token). Write the inline plan as the first thing you do
(per the Implement stage precondition note), then invoke the Agent tool with:

- `subagent_type: qrspi:implementer-medium`
- `model: sonnet`

Tell the implementer it is in **trivial / inline-plan mode** (no `tasks.md`,
no slice checkpoints), provide the inline plan text, and ask it to apply the
single-file fix, run lint, and return the canonical Final message format.

**Resolve the implementer variant + model from the next un-ticked slice.**
Read `openspec/changes/$ARGUMENTS/tasks.md` and locate the first slice header
(`## N. ...`) whose tasks are not all ticked. The line directly
under that header reads `**Compute:** effort=<low|medium|high> model=<alias> — <rationale>`.
Parse the two **orthogonal** tokens from that `**Compute:**` line:

- `effort=` is **required**. Map it to the implementer variant to spawn
  (its plugin-namespaced `subagent_type`): `low` → `qrspi:implementer-low`,
  `medium` → `qrspi:implementer-medium`, `high` → `qrspi:implementer-high` (the
  `qrspi:` prefix is required — registered agents are namespaced by the plugin,
  and the variant files must be listed in `.claude-plugin/plugin.json`'s `agents`
  array to be spawnable). Each variant carries the
  matching static `effort:` frontmatter — this is how per-slice effort is
  enforced at spawn time (the Agent tool has no per-invocation effort param).
- `model=` is **optional**, defaulting to `sonnet` when omitted. Allowed
  aliases: `haiku`, `sonnet`, `opus`. It is passed per-spawn as the Agent
  tool's `model:` parameter (which takes precedence over the variant's
  frontmatter `model:`).

Invoke the resolved variant subagent via the Agent tool with
`subagent_type: qrspi:implementer-<effort>` and `model: <parsed alias or sonnet>` so the
subagent runs on the right effort *and* the right model for this slice.
Thinking is not shipped (no per-subagent thinking control).

**Missing-`effort=` hard-stop.** If a slice is missing the `**Compute:**`
line or its `effort=` token, **stop** — surface the condition and tell the
user the slices/tasks file needs to be fixed (the architect at stage V
(Slices) is required to write it). Do NOT spawn any implementer, and do not
silently default the effort — silent defaults hide planning gaps. An absent
`model=` is fine (it defaults to `sonnet`); only a missing `effort=` triggers
the hard-stop.

The implementer will:

1. Pick up the next un-ticked slice in `tasks.md`.
2. Work the tasks in order, ticking boxes.
3. Run the project's available checks at the slice boundary — lint,
   typecheck, and tests where the repo has them (plus `openspec validate <id>
   --strict` — matching CI's strict `validate --all`) — and the slice checkpoint.
   A repo with no test suite is not a missing gate; run the checks that exist.
4. Stop at the slice checkpoint and wait for human go-ahead.

**Implementer block-signal contract (mandatory, all modes).** The implementer
MUST return an error or blocked signal -- and MUST NOT commit the slice --
when any check the repo runs (lint, typecheck, tests, `openspec validate`)
fails at a slice boundary.
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
   - On the **final** slice only, first update `openspec/backlog.md` (same
     rule as Manual below); intermediate slices do not touch it.
   - Then run (final slice):
     ```
     git add openspec/changes/<id>/tasks.md openspec/backlog.md <files-modified-in-this-slice>
     git commit -m "feat(<id>): implement slice N — <slice title>"
     git push
     ```
     or, on an intermediate slice (no backlog edit):
     ```
     git add openspec/changes/<id>/tasks.md <files-modified-in-this-slice>
     git commit -m "feat(<id>): implement slice N — <slice title>"
     git push
     ```
3. Read the next un-ticked slice's `**Compute:**` line from `tasks.md` and
   resolve it exactly as the main spawn site above: map the **required**
   `effort=` token to the plugin-namespaced variant `subagent_type`
   (`low`→`qrspi:implementer-low`, `medium`→`qrspi:implementer-medium`,
   `high`→`qrspi:implementer-high`) and pass the
   **optional** `model=` token (default `sonnet`) as the Agent tool's
   `model:` parameter. Invoke that variant for the next slice. Auto mode does
   NOT bypass per-slice variant/model selection -- the annotation is the
   architect's call. If the next slice is missing its `effort=` token, this is
   the missing-`effort=` hard-stop (see the main spawn site above): halt the
   chain, spawn no implementer, and surface the condition per the "Hard-stop
   procedure" in skill `workflow`.
4. Repeat until all slices are done.
5. After the final slice is committed, proceed to the next-stage handoff
   (PR stage) per the "Next-stage handoff" in skill `workflow`.

**If mode is Manual:**

Use the per-slice checkpoint and per-slice commit AskUserQuestion gates as
described below. Only proceed to the next slice after explicit confirmation.

**Interactive checkpoint (Manual only):** At each slice checkpoint, use the
**AskUserQuestion** tool to ask the human whether to continue. Example:
  question: "Slice 1 (Project skeleton) is complete and tests pass. Should I continue with Slice 2?"
  choices: ["Yes, continue with Slice 2", "Stop here — I want to review first"]
Only proceed to the next slice after explicit confirmation.

**Per-slice commit step:** After each slice checkpoint passes (and, in Manual,
after the human confirms):
- On the **final** slice, update `openspec/backlog.md`: change the row's
  heading backtick from `### <id> — \`proposed (...)\`` to
  `### <id> — \`in-progress (Q, R, D, S, V, P, I complete)\`` and move the
  row from `## Proposed` to `## In progress` (see skill `workflow`,
  "Backlog atomicity").
- On **intermediate** slices, do not touch `openspec/backlog.md` at all --
  there is no `Next QRSPI command:` line to update, and the row's status
  stays `proposed` until the final slice above.

When the backlog is edited (final slice only), that edit lands in the
same commit as the slice (backlog atomicity, see skill `workflow`).

In Manual mode, use the **AskUserQuestion** tool to ask before committing:
  question: "Commit Slice N changes to the feature branch?"
  choices: ["Yes — commit and push", "No — I'll commit later"]

Then run (if committing; include `openspec/backlog.md` only on the final
slice, per the per-slice commit step above):
```
git add openspec/changes/<id>/tasks.md [openspec/backlog.md] <files-modified-in-this-slice>
git commit -m "feat(<id>): implement slice N — <slice title>"
git push
```
Stage the implementer-modified files explicitly -- the implementer's
final message lists them under "Files created/modified". As the canonical
*commit step* in skill `workflow` requires, never use `git add -A`;
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
   `slices.md`, each carrying a `**Compute:**` annotation. Loading the
   convention skills is what the architect (W) and planner (P) normally do
   before writing task specs — do not skip it, or the new slice will
   contradict documented conventions (e.g. the project's chosen component
   library and iconography over alternatives).
3. **Commit** as `docs(<id>): amend scope — add Slice N ...`, carrying any
   matching `openspec/backlog.md` heading edit atomically (only if the
   amendment itself changes the row's status or note).
4. **Then run `/qrspi:implement <id>`** to implement the new slice through the
   normal slice / checkpoint / commit machinery.

Return only what the implementer's "Final message format" specifies.
