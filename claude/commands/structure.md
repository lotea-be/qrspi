---
description: QRSPI stage S. Delegates to the architect subagent to write proposal.md and specs/. Requires that the human has approved design.md.
---

You are running QRSPI stage **S (Structure)** for the current project.

Change id: $ARGUMENTS

Precondition (canonical *precondition check* in skill `workflow`,
"Stage choreography"): the input artifact is
`openspec/changes/<id>/design.md`; on failure point the user at
`/qrspi:design`. **This stage also has an approval gate beyond the file
gate** — design must be human-approved, not merely present. If the user has
not explicitly confirmed approval, use the **AskUserQuestion** tool to ask:
"Have you reviewed and approved design.md for this change?" with choices
["Yes, design is approved", "No — I still need to review it"]. Only proceed
on explicit approval; if they say no, remind them to review and stop.

Otherwise spawn the `architect` subagent via the **Agent tool**
(`subagent_type: qrspi:architect`) for the bounded artifact write. Tell it
to produce:
- `openspec/changes/<id>/proposal.md`
- `openspec/changes/<id>/specs/<capability>/spec.md` per touched capability

Tell it to return the paths of files it created/modified plus a 5-bullet
summary. The orchestrator (this main-loop context) does not inline the
architect's full conversation — only the returned summary is used here.

**Backlog update (mandatory before the commit):** Add or update the
change's row in `openspec/backlog.md` so its `Next QRSPI command:` line
points at `/qrspi:slices <id>`. Earlier stages do not seed this line,
so on the first S run you are *adding* it, not editing an existing one —
don't assume you mis-read the row if it's absent. This edit lands in the
same commit as the artifact (backlog atomicity, see skill
`workflow`). If the row's `Status:` line is still `idea` or
`proposed`, do not touch it here; status transitions are a separate concern.

**Capture deferred work (before the commit):** Read `proposal.md`'s
"Out of scope" section (and any out-of-scope items the design's Non-Goals
carried forward). For each candidate *separable future change*, offer it
to the human one at a time (AskUserQuestion: *Add as idea / Skip*) and add
each accepted one as an `idea` row with a one-line *Why* in
`openspec/backlog.md`. Follow the "Capturing deferred work" rules in skill
`workflow` (offer-never-auto-append, dedup against existing rows,
minimal row); do not promote in-change follow-ups. Skip silently if there
is nothing out of scope worth promoting. Any rows added here are staged
with the same commit.

**Choreography (see skill `workflow`, "Stage choreography").** Follow
the canonical *commit step* and *next-stage handoff* there, with these
stage variables:
- Artifact: `openspec/changes/<id>/proposal.md` + `openspec/changes/<id>/specs/`
  + `openspec/backlog.md`.
- Commit message: `docs(<id>): add proposal.md and specs (QRSPI stage S)`
- Git add line: `git add openspec/changes/<id>/proposal.md openspec/changes/<id>/specs/ openspec/backlog.md`
- Next-stage command: `/qrspi:slices <id>` — invoke it as its own stage in
  the main loop (re-enter the slash command so its body runs on the
  orchestrator; do NOT spawn it as a subagent).
