---
description: QRSPI stage S. Delegates to the architect subagent to write proposal.md and specs/. Requires that the human has approved design.md.
---

You are running QRSPI stage **S (Structure)** for the current project.

Change id: $ARGUMENTS

1. **Session version check — run silently.** Load skill `qrspi-version-check` and follow its
   instructions exactly. Follow its
   Silence discipline: do not announce or narrate this step, and print nothing
   unless the check itself must prompt or warn. This is the first step -- before the run-mode
   establishment and before any other work.

2. **Context budget gate.** Load skill `context-budget-gate` and follow its instructions exactly.

3. **Stage choreography.** Load skill `stage-choreography` and follow its
   instructions exactly -- it carries the canonical main-loop procedures this
   command runs (run-mode, precondition check, commit step, next-stage
   handoff). Read or establish the run-mode by following its **Run-mode**
   procedure before doing any other work.

Precondition (canonical *precondition check* in skill `stage-choreography`,
"Stage choreography"): the input artifact is
`openspec/changes/<id>/design.md`; on failure point the user at
`/qrspi:design`.

> Resolve `openspec/changes/<id>/…` against the **current working repo root** (the consumer's CWD), not the plugin install directory — the change folder lives in the repo you are running the command in.

**This stage also has an approval gate beyond the file
gate** — design must be human-approved, not merely present. If the user has
not explicitly confirmed approval, use the **AskUserQuestion** tool to ask:
"Have you reviewed and approved design.md for this change?" with choices
["Yes, design is approved", "No — I still need to review it"]. Only proceed
on explicit approval; if they say no, remind them to review and stop.

Otherwise spawn the `architect` subagent via the **Agent tool**
(`subagent_type: qrspi:architect`, `model: sonnet` — matching the architect
agent's frontmatter `model:`) for the bounded artifact write. Tell it
to produce:
- `openspec/changes/<id>/proposal.md`
- `openspec/changes/<id>/specs/<capability>/spec.md` per touched capability

Tell it to return the paths of files it created/modified plus a 5-bullet
summary. The orchestrator (this main-loop context) does not inline the
architect's full conversation — only the returned summary is used here.

**Verify the stage-Q marker is gone.** The architect subagent now deletes
`openspec/changes/<id>/.openspec.yaml` (the `schema: spec-driven` /
`skip_specs: true` marker seeded by `/qrspi:questions`) itself, before its
own strict validate — the CLI rejects a change carrying both the marker and
`specs/`. Once the architect returns, use Glob to confirm the marker file no
longer exists; if it is still present (the architect failed to remove it),
delete it now. Either way, stage the deletion so it lands in this same
stage-S commit alongside `proposal.md`/`specs/` (see the `git add` line
below).

**Backlog (status unchanged):** The change's row in `openspec/backlog.md`
already exists as `### <id> — \`proposed (...)\`` from stage Q. Structure
does not flip its status or move it between `##` section groupings — that
transition happens at the Implement stage's final slice (see skill
`stage-choreography`, "Backlog atomicity"). Verify the row is present; do not edit
its heading here.

**Capture deferred work (before the commit):** Read `proposal.md`'s
"Out of scope" section (and any out-of-scope items the design's Non-Goals
carried forward). For each candidate *separable future change*, offer it
to the human one at a time (AskUserQuestion: *Add as idea / Skip*). For
each accepted one, load skill `backlog-writer` and follow its append
procedure to add the row to `openspec/backlog.md`. The `backlog-writer`
procedure handles dedup, slug derivation, P-band proposal, Shape
collection, row construction using the frozen grammar, and staging.

Follow the "Capturing deferred work" rules in skill `workflow`
(offer-never-auto-append, dedup against existing rows, minimal row); do
not promote in-change follow-ups. Skip silently if there is nothing out of
scope worth promoting. Any rows added here are staged with the same commit.

**Choreography (see skill `stage-choreography`, "Stage choreography").** Follow
the canonical *commit step* and *next-stage handoff* there, with these
stage variables:
- Artifact: `openspec/changes/<id>/proposal.md` + `openspec/changes/<id>/specs/`
  + `openspec/backlog.md` (plus the deletion of
  `openspec/changes/<id>/.openspec.yaml`).
- Commit message: `docs(<id>): add proposal.md and specs (QRSPI stage S)`
- Git add line: `git add openspec/changes/<id>/proposal.md openspec/changes/<id>/specs/ openspec/backlog.md` —
  then stage the marker's removal with
  `git add openspec/changes/<id>/.openspec.yaml` (captures the delete) so it
  lands in the same commit.
- Next-stage command: `/qrspi:slices <id>` — invoke it as its own stage in
  the main loop (re-enter the slash command so its body runs on the
  orchestrator; do NOT spawn it as a subagent).
