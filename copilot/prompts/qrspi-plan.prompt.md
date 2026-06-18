---
description: QRSPI stage P. Delegates to the planner subagent (read-only on code) to turn worktree.md into a checkbox tasks.md.
argument-hint: <change-id>
agent: copilot-planner
---

You are running QRSPI stage **P (Plan)** for the current project.

Change id: ${input}

Precondition (canonical *precondition check* in skill `qrspi-workflow`,
"Stage choreography"): the input artifact is
`openspec/changes/<id>/worktree.md`; on failure point the user at
`/qrspi-worktree`.

Otherwise continue as the planner to write
`openspec/changes/<id>/tasks.md`. Because design and structure are
already aligned, this stage should be quick and mechanical.

Return only what the planner's "Final message format" specifies.

**Before committing, update `openspec/backlog.md`:** change the change's
row `Next QRSPI command:` line to `/qrspi-implement <id>`. This edit lands
in the same commit as the artifact (backlog atomicity, see skill
`qrspi-workflow`).

**Choreography (see skill `qrspi-workflow`, "Stage choreography").** Follow
the canonical *commit step* and *next-stage handoff* there, with these
stage variables:
- Artifact: `openspec/changes/<id>/tasks.md` + `openspec/backlog.md`.
- Commit message: `docs(<id>): add tasks.md (QRSPI stage P)`
- Git add line: `git add openspec/changes/<id>/tasks.md openspec/backlog.md`
- Next-stage command: `/qrspi-implement <id>` — invoke it as its own stage.
