---
description: QRSPI stage P. Delegates to the planner subagent (read-only on code) to turn slices.md into a checkbox tasks.md.
---

You are running QRSPI stage **P (Plan)** for the current project.

Change id: $ARGUMENTS

1. **Session version check — run silently.** **Skip this step if a QRSPI version check already ran earlier in this session** (its in-context flag is set) -- loading the skill again costs tokens on every later turn. Otherwise: Load skill `qrspi-version-check` and follow its
   instructions exactly. Follow its
   Silence discipline: do not announce or narrate this step, and print nothing
   unless the check itself must prompt or warn. This is the first step -- before the run-mode
   establishment and before any other work.

2. **Context budget gate.** If the `context-budget-gate` instructions are still in your context from an earlier command this session (not lost to a context summary), follow them from there (step 2 still increments the counter) instead of loading the skill again. Otherwise: Load skill `context-budget-gate` and follow its instructions exactly.

3. **Stage choreography.** If the `stage-choreography` instructions are still in your context from an earlier command this session (not lost to a context summary), follow them from there instead of loading the skill again. Otherwise: Load skill `stage-choreography` and follow its
   instructions exactly -- it carries the canonical main-loop procedures this
   command runs (run-mode, precondition check, commit step, next-stage
   handoff). Read or establish the run-mode by following its **Run-mode**
   procedure before doing any other work.

Precondition (canonical *precondition check* in skill `stage-choreography`,
"Stage choreography"): the input artifact is
`openspec/changes/<id>/slices.md`; on failure point the user at
`/qrspi:slices`. Use the **Glob** tool to verify the artifact exists — do
not shell out.

> Resolve `openspec/changes/<id>/…` against the **current working repo root** (the consumer's CWD), not the plugin install directory — the change folder lives in the repo you are running the command in.

Spawn the `planner` subagent via the **Agent tool** (`subagent_type:
qrspi:planner`, `model: sonnet` — matching the planner agent's frontmatter
`model:`) for the bounded artifact write. Pass the change id. Tell
it to write `openspec/changes/<id>/tasks.md` and return the file path
plus a 5-bullet summary. The orchestrator (this main-loop context) does
not inline the planner's full conversation — only the returned summary is
used here. Because design and structure are already aligned, this stage
should be quick and mechanical.

**Backlog:** Plan does not change the row's status or section grouping --
`openspec/backlog.md` has no `Next QRSPI command:` line to update (see
skill `stage-choreography`, "Backlog atomicity"); the row stays as stage Q left it
until the Implement stage's final slice flips it. No backlog edit is
needed here.

**Choreography (see skill `stage-choreography`, "Stage choreography").** Follow
the canonical *commit step* and *next-stage handoff* there, with these
stage variables:
- Artifact: `openspec/changes/<id>/tasks.md`.
- Commit message: `docs(<id>): add tasks.md (QRSPI stage P)`
- Git add line: `git add openspec/changes/<id>/tasks.md`
- Next-stage command: `/qrspi:implement <id>` — invoke it as its own stage
  in the main loop (re-enter the slash command so its body runs on the
  orchestrator; do NOT spawn it as a subagent).
