---
name: qrspi-workflow
description: The eight-stage QRSPI workflow (Questions, Research, Design, Structure, Plan, Worktree, Implement, PR) used on top of OpenSpec. Load this when you need to know what stage you are in, what the next stage is, or why a stage exists.
metadata:
  source: https://alexlavaee.me/blog/from-rpi-to-qrspi/
  audience: all-agents
---

## What QRSPI is

QRSPI is the successor to Dex Horthy's RPI (Research → Plan → Implement). It
fixes three failure modes RPI exhibited at scale:

1. **Instruction budget overflow.** Mega-prompts silently drop deep
   instructions. QRSPI restructures into smaller stages so each stage has a
   shorter prompt.
2. **Magic-word dependency.** Workflows that only work when the user types
   exactly the right phrase are broken. Each QRSPI stage produces the right
   behavior by default.
3. **The plan-reading illusion.** Plans read well but build poorly. QRSPI
   front-loads alignment (Q + R + D) before any code planning happens.

## Before Q — the backlog

QRSPI starts at Q, but candidate changes are tracked beforehand in
`openspec/backlog.md`. It is a flat list of `idea` / `proposed` /
`in-progress` / `merged` rows with a one-line *Why*. Consult it when
deciding what to propose next, and update the matching row whenever a
change is proposed, merged, or archived (remove archived rows — the
`openspec/changes/archive/` folder is the source of truth for completed
work). The backlog is not a stage and produces no QRSPI artifact; it just
feeds Q.

**Always commit the backlog edit in the same commit as the state change
it reflects** — never as a separate follow-up. If you're proposing a
change folder, archiving one, or merging a PR, the matching `backlog.md`
edit goes in that same commit. This keeps the backlog atomic with the
truth it describes.

### Capturing deferred work

As the alignment stages run, they surface work that is deliberately *not*
part of the current change — a Non-Goal, an "out of scope" item, a scope
answer that pushes something to "later". There are two kinds, handled
differently:

- **In-change follow-ups** (a gap *this* PR will leave: a reviewer open
  issue, "mocked now, real impl in a later slice") belong in the change's
  `followups.md`, **not** the backlog. See "After PR — the fix loop".
- **Separable future changes** (genuinely a *different* change: "rate-limit
  the new endpoint", "migrate the old callers") become a new `idea` row in
  `openspec/backlog.md`.

Stages **Q, D, and S** capture the second kind, under these rules:

1. **Offer, never auto-append.** Present each candidate to the human one at
   a time (AskUserQuestion: *Add as idea / Skip*). The human decides per
   item; a skipped item is dropped, not re-asked.
2. **Dedup first.** Skip any candidate already covered by an existing
   backlog row — match on intent, not exact wording.
3. **Minimal row.** An accepted item is one `idea` row with a one-line
   *Why*. Do not pre-fill a *Likely shape* the human hasn't scoped.
4. **Same commit.** Added rows land in the same commit as the stage's
   artifact, per the atomic-commit rule above.

R and W do not capture: R is ticket-blind (it cannot judge what is in or
out of scope), and W's cut slices are almost always the same change
deferred to a later slice — an in-change concern, not a new backlog item.

## The eight stages

### Alignment phases (5)

**Q — Questions.** Identify what the agent does not know. Generate targeted
technical questions that force the model to touch the relevant parts of the
codebase. Artifact: `openspec/changes/<id>/questions.md`.

**R — Research.** Gather objective facts about the current codebase. **The
ticket is hidden from this stage.** The agent traces logic, lists endpoints,
maps the data model, and produces a factual record — no recommendations, no
opinions about the change. Artifact: `openspec/changes/<id>/research.md`.

**D — Design.** The agent brain-dumps its understanding into ~200 lines of
markdown: current state, desired end state, design decisions. **The human
reviews this and may rewrite it.** This is "brain surgery" — the place to
correct architectural assumptions before any code is planned. Artifact:
`openspec/changes/<id>/design.md`. **Never proceed to S without human review.**

**S — Structure.** The "C header file" of the change. Signatures, new types,
high-level phases, and the vertical slices that will be built. Artifact:
`openspec/changes/<id>/proposal.md` plus `openspec/changes/<id>/specs/`.

**P — Plan.** Tactical task list. Because D and S are already aligned, this
should only be spot-checked, not deeply reviewed. Artifact:
`openspec/changes/<id>/tasks.md`.

### Execution phases (3)

**W — Worktree.** Organize tasks into a hierarchy of vertical slices. Each
branch maps to a testable unit of work. Artifact:
`openspec/changes/<id>/worktree.md`.

**I — Implement.** Write code. Tick tasks in `tasks.md` as you go.

**PR — Pull Request.** Human reviews the code. No exceptions. Because Design
and Structure were already aligned, this review is fast and contains few
surprises. `/qrspi:pr` records the PR link in `openspec/changes/<id>/pr.md`
and seeds `followups.md` with any open issues the reviewer found.

## After PR — the fix loop

QRSPI ends at PR, but small follow-ups always surface afterwards: the
reviewer's "Open issues" list and code-level retrospective flags. These are
tracked as checkboxes in `openspec/changes/<id>/followups.md` and resolved
with `/qrspi:followup <id>` — a loop that hangs off the PR stage, not a ninth
stage. Each fix keeps code, tests, and the change's **delta** spec in sync,
ticks the follow-up, and commits `fix(<id>): ...` on the PR branch. See
skill `qrspi-postpr-fix`. The change is ready to archive only when
`followups.md` has no un-ticked boxes.

## Rules of the road

- One change at a time. Never run two QRSPI flows in the same session.
- Each stage runs as a subagent (Task tool) so the orchestrator's context
  stays clean. See skill `context-hygiene`.
- Hide the ticket during Research. This is the most important rule.
- Vertical slices in Structure, not horizontal layers. See skill
  `vertical-slice`.
- "Looks plausible" is the failure mode. Plans that read well do not
  necessarily build well. Verification must go deeper than reading.

## When you can skip stages

Trivial changes (typo, lint fix, dependency bump under a patch version)
can skip directly to `/qrspi:implement` with an inline one-paragraph plan.
Anything that touches the data model, an API surface, or auth must go
through the full flow.

## Stage choreography (canonical procedures)

Every QRSPI stage command shares the same four invariant procedures. The
authoritative wording lives here; a stage command keeps only the
stage-specific *variables* (its artifact filename(s), its exact
commit-message string, the precondition artifact + the prior stage to point
at, the agent it invokes, and the next-stage command) and references this
section for the procedure itself. When you read "follow the canonical
*commit step* / *next-stage handoff* / *precondition check* in
`qrspi-workflow`", this is what is meant.

### Precondition check (Glob-based)

Before invoking a stage's subagent, confirm the stage's input artifact(s)
exist. **Use the Glob tool**, not a shell command — Glob has no permission
requirements and works on every platform (a shelled `ls` is rejected by the
permission checker on Windows/PowerShell). Glob the precondition path(s) the
stage names. If Glob returns nothing, refuse and tell the user to run the
named prior stage first (e.g. "run `/qrspi:plan` first"). Only proceed when
every required artifact is present.

A stage that has an *approval* gate in addition to a file gate (e.g.
Structure requires a human-approved `design.md`) runs that gate here too,
via AskUserQuestion, before invoking the subagent — the file existing is not
the same as the human having approved it.

### Commit step (mandatory)

After the stage's artifact is written (and any backlog edit is staged, see
below), ask the human before committing:

- Use the **AskUserQuestion** tool:
  - question: "Commit <the stage's artifact(s) and any backlog edit> to the feature branch?"
  - choices: ["Yes -- commit and push", "No -- I'll commit later"]
- If yes, stage the **explicit paths** the stage names, commit with the
  stage's exact commit-message string, and push:
  ```
  git add <explicit artifact path(s)> [openspec/backlog.md]
  git commit -m "<the stage's commit message>"
  git push
  ```
- **Never use `git add -A`.** It can sweep up secrets, scratch files, or
  unrelated working-tree changes. Stage only the paths the stage produced
  (the subagent's final message lists the files it created/modified).
- If the human chose "No", skip the commit and continue to the handoff.

### Next-stage handoff (mandatory)

After the commit step, ask the human whether to keep going:

- Use the **AskUserQuestion** tool:
  - question: "Stage <X> is complete. Continue to stage <Y> now, or stop here?"
  - choices: ["Continue to /qrspi:<next> <id>", "Stop here -- I'll resume later"]
- If they choose **Continue**, invoke the next-stage command now, as its own
  stage (a fresh subtask, so each stage keeps a clean context window -- and
  so Research in particular stays blind to the ticket per its design).
- If they choose **Stop**, print `Next stage: /qrspi:<next> <id>` and end
  your turn.

### Backlog atomicity

When a stage's state change has a matching `openspec/backlog.md` edit (a
status transition, or the `Next QRSPI command:` line moving to the next
stage), that backlog edit lands in the **same commit** as the stage's
artifact -- never as a separate follow-up commit. Stage `openspec/backlog.md`
alongside the artifact in the commit step above. This is the same
atomic-commit rule stated under "Before Q -- the backlog"; it applies to
every stage that touches the backlog row. A stage whose subagent already
performed the backlog edit (e.g. the questioner's status flip) verifies the
row rather than re-editing it -- re-editing a file the subagent just wrote
fails with a "file modified since read" error.
