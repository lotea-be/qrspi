---
description: QRSPI stage P. Delegates to the planner subagent (read-only on code) to turn slices.md into a checkbox tasks.md.
---

You are running QRSPI stage **P (Plan)** for the current project.

Change id: $ARGUMENTS

Precondition (canonical *precondition check* in skill `workflow`,
"Stage choreography"): the input artifact is
`openspec/changes/<id>/slices.md`; on failure point the user at
`/qrspi:slices`. Use the **Glob** tool to verify the artifact exists — do
not shell out.

Spawn the `planner` subagent via the **Agent tool** (`subagent_type:
qrspi:planner`) for the bounded artifact write. Pass the change id. Tell
it to write `openspec/changes/<id>/tasks.md` and return the file path
plus a 5-bullet summary. The orchestrator (this main-loop context) does
not inline the planner's full conversation — only the returned summary is
used here. Because design and structure are already aligned, this stage
should be quick and mechanical.

**Before committing, update `openspec/backlog.md`:** change the change's
row `Next QRSPI command:` line to `/qrspi:implement <id>`. This edit lands
in the same commit as the artifact (backlog atomicity, see skill
`workflow`).

**Choreography (see skill `workflow`, "Stage choreography").** Follow
the canonical *commit step* and *next-stage handoff* there, with these
stage variables:
- Artifact: `openspec/changes/<id>/tasks.md` + `openspec/backlog.md`.
- Commit message: `docs(<id>): add tasks.md (QRSPI stage P)`
- Git add line: `git add openspec/changes/<id>/tasks.md openspec/backlog.md`
- Next-stage command: `/qrspi:implement <id>` — invoke it as its own stage
  in the main loop (re-enter the slash command so its body runs on the
  orchestrator; do NOT spawn it as a subagent).
