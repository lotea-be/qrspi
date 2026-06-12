---
description: QRSPI stage W. Delegates to the qrspi-architect subagent to write worktree.md (vertical slices, not horizontal layers).
agent: qrspi-architect
subtask: true
---

You are running QRSPI stage **W (Worktree)** for the current project.

Change id: $ARGUMENTS

Precondition: `openspec/changes/<id>/proposal.md` and at least one
`openspec/changes/<id>/specs/*/spec.md` exist.

Verify they exist with the **Glob** tool (patterns
`openspec/changes/<id>/proposal.md` and
`openspec/changes/<id>/specs/*/spec.md`) — do not shell out.

If missing, refuse and tell the user to run `/qrspi-structure` first.

Otherwise instruct the architect to produce `worktree.md` with 3–5
vertical slices following skill `vertical-slice`. Each slice is
mock-API → frontend → real DB → tests, with a checkpoint at the end.

Return only what the architect's "Final message format" specifies.

Before committing, update `openspec/backlog.md`: change the change's
row `Next QRSPI command:` line to `/qrspi-plan <id>`. The house rule
(in the project's contributor-guidance file, if it defines one) is that
backlog edits commit atomically with the state change they reflect.

**Commit step (mandatory):** After `worktree.md` is written and the
backlog row is updated, use the **AskUserQuestion** tool to ask:
  question: "Commit worktree.md to the feature branch?"
  choices: ["Yes — commit and push", "No — I'll commit later"]
If yes, run:
```
git add openspec/changes/<id>/worktree.md openspec/backlog.md
git commit -m "docs(<id>): add worktree.md (QRSPI stage W)"
git push
```

**Next-stage handoff (mandatory):** After the commit step, use the
**AskUserQuestion** tool to ask whether to keep going:
  question: "Stage W (Worktree) is complete. Continue to stage P (Plan) now, or stop here?"
  choices: ["Continue to /qrspi-plan <id>", "Stop here — I'll resume later"]
If they choose **Continue**, invoke `/qrspi-plan <id>` now — run it as its own
stage. If they choose **Stop**, print `Next stage: /qrspi-plan <id>` and end
your turn.
