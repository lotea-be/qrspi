---
description: QRSPI stage S. Delegates to the qrspi-architect subagent to write proposal.md and specs/. Requires that the human has approved design.md.
agent: qrspi-architect
subtask: true
---

You are running QRSPI stage **S (Structure)** for the current project.

Change id: $ARGUMENTS

Precondition: `openspec/changes/<id>/design.md` exists. The human must
have approved it. If the user has not explicitly confirmed approval, use
the **AskUserQuestion** tool to ask: "Have you reviewed and approved design.md for
this change?" with choices ["Yes, design is approved", "No — I still need
to review it"]. Only proceed on explicit approval; if they say no, remind
them to review and stop.

Verify the file exists with the **Glob** tool (pattern
`openspec/changes/<id>/design.md`) — do not shell out.

If it is missing, refuse and tell the user to run `/qrspi:design` first.

Otherwise invoke the architect subagent to produce:
- `openspec/changes/<id>/proposal.md`
- `openspec/changes/<id>/specs/<capability>/spec.md` per touched capability

After this command completes, the natural next step is
`/qrspi:worktree <id>` (still in the architect subagent), then
`/qrspi:plan <id>`.

Return only what the architect's "Final message format" specifies.

**Backlog update (mandatory before the commit):** Add or update the
change's row in `openspec/backlog.md` so its `Next QRSPI command:` line
points at `/qrspi:worktree <id>`. Earlier stages do not seed this line,
so on the first S run you are *adding* it, not editing an existing one —
don't assume you mis-read the row if it's absent. The house rule (in the
project's contributor-guidance file, if it defines one) is that backlog
edits commit atomically with the state change they reflect — never as a
follow-up commit. If the row's `Status:` line is still `idea` or `proposed`, do
not touch it here; status transitions are a separate concern.

**Capture deferred work (before the commit):** Read `proposal.md`'s
"Out of scope" section (and any out-of-scope items the design's Non-Goals
carried forward). For each candidate *separable future change*, offer it
to the human one at a time (AskUserQuestion: *Add as idea / Skip*) and add
each accepted one as an `idea` row with a one-line *Why* in
`openspec/backlog.md`. Follow the "Capturing deferred work" rules in skill
`qrspi-workflow` (offer-never-auto-append, dedup against existing rows,
minimal row); do not promote in-change follow-ups. Skip silently if there
is nothing out of scope worth promoting. Any rows added here are staged
with the same commit below.

**Commit step (mandatory):** After `proposal.md`, `specs/`, and
`backlog.md` are written, use the **AskUserQuestion** tool to ask:
  question: "Commit proposal.md, specs, and the backlog update to the feature branch?"
  choices: ["Yes — commit and push", "No — I'll commit later"]
If yes, run:
```
git add openspec/changes/<id>/proposal.md openspec/changes/<id>/specs/ openspec/backlog.md
git commit -m "docs(<id>): add proposal.md and specs (QRSPI stage S)"
git push
```

**Next-stage handoff (mandatory):** After the commit step, use the
**AskUserQuestion** tool to ask whether to keep going:
  question: "Stage S (Structure) is complete. Continue to stage W (Worktree) now, or stop here?"
  choices: ["Continue to /qrspi:worktree <id>", "Stop here — I'll resume later"]
If they choose **Continue**, invoke `/qrspi:worktree <id>` now — run it as its
own stage. If they choose **Stop**, print `Next stage: /qrspi:worktree <id>` and
end your turn.
