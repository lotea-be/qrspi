---
description: QRSPI stage V. Delegates to the architect subagent to write slices.md (vertical slices, not horizontal layers).
argument-hint: <change-id>
agent: copilot-architect
---

You are running QRSPI stage **V (Slices)** for the current project.

Change id: ${input}

Precondition (canonical *precondition check* in skill `qrspi-workflow`,
"Stage choreography"): the input artifacts are
`openspec/changes/<id>/proposal.md` and at least one
`openspec/changes/<id>/specs/*/spec.md` (Glob both patterns); on failure
point the user at `/qrspi-structure`.

Otherwise spawn the `architect` subagent via the **Agent tool**
(`subagent_type: qrspi:architect`) for the bounded artifact write. Tell it
to produce `openspec/changes/<id>/slices.md` with 3–5 vertical slices
following skill `vertical-slice` (each slice: mock-API → frontend → real
DB → tests, with a checkpoint at the end). Tell it to return the file path
plus a 5-bullet summary. The orchestrator (this main-loop context) does not
inline the architect's full conversation — only the returned summary is used
here.

Return only what the architect's "Final message format" specifies.

Before committing, update `openspec/backlog.md`: change the change's
row `Next QRSPI command:` line to `/qrspi-plan <id>`. This edit lands in
the same commit as the artifact (backlog atomicity, see skill
`qrspi-workflow`).

**Choreography (see skill `qrspi-workflow`, "Stage choreography").** Follow
the canonical *commit step* and *next-stage handoff* there, with these
stage variables:
- Artifact: `openspec/changes/<id>/slices.md` + `openspec/backlog.md`.
- Commit message: `docs(<id>): add slices.md (QRSPI stage V)`
- Git add line: `git add openspec/changes/<id>/slices.md openspec/backlog.md`
- Next-stage command: `/qrspi-plan <id>` — invoke it as its own stage in
  the main loop (re-enter the slash command so its body runs on the
  orchestrator; do NOT spawn it as a subagent).
