---
description: QRSPI stage P. Delegates to the qrspi-planner subagent (read-only on code) to turn worktree.md into a checkbox tasks.md.
agent: qrspi-planner
subtask: true
---

You are running QRSPI stage **P (Plan)** for the current project.

Change id: $ARGUMENTS

Precondition: `openspec/changes/<id>/worktree.md` exists.

Verify it exists with the **Glob** tool (pattern
`openspec/changes/<id>/worktree.md`) — do not shell out.

If missing, refuse and tell the user to run `/qrspi:worktree` first.

Otherwise invoke the planner subagent to write
`openspec/changes/<id>/tasks.md`. Because design and structure are
already aligned, this stage should be quick and mechanical.

Return only what the planner's "Final message format" specifies.

**Before committing, update `openspec/backlog.md`:** change the change's
row `Next QRSPI command:` line to `/qrspi:implement <id>`. The house rule
(in the project's contributor-guidance file, if it defines one) is that
backlog edits commit atomically with the state change they reflect.

**Commit step (mandatory):** After `tasks.md` is written, use the **AskUserQuestion** tool
to ask:
  question: "Commit tasks.md to the feature branch?"
  choices: ["Yes — commit and push", "No — I'll commit later"]
If yes, run:
```
git add openspec/changes/<id>/tasks.md openspec/backlog.md
git commit -m "docs(<id>): add tasks.md (QRSPI stage P)"
git push
```

**Next-stage handoff (mandatory):** After the commit step, use the
**AskUserQuestion** tool to ask whether to keep going:
  question: "Stage P (Plan) is complete. Continue to stage I (Implement) now, or stop here?"
  choices: ["Continue to /qrspi:implement <id>", "Stop here — I'll resume later"]
If they choose **Continue**, invoke `/qrspi:implement <id>` now — run it as its
own stage. If they choose **Stop**, print `Next stage: /qrspi:implement <id>`
and end your turn.
