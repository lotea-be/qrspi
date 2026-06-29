---
description: The eight-stage QRSPI workflow (Questions, Research, Design, Structure, Slices, Plan, Implement, PR) used on top of OpenSpec. Load this when you need to know what stage you are in, what the next stage is, or why a stage exists.
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

> **Acronym lineage note.** QRSPI / "Crispy" is a lineage label from the RPI
> ancestry; Design, Slices, and PR sit outside the five acronym letters
> (Q-R-S-P-I). The kit intentionally orders **Slices (V) before Plan (P)** --
> slices-then-tasks is the natural data flow (Plan needs the slices as input)
> and is an intentional divergence from the RPI blog's Plan-before-Work-Tree
> ordering.

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
   a time (vscode/askQuestions: *Add as idea / Skip*). The human decides per
   item; a skipped item is dropped, not re-asked.
2. **Dedup first.** Skip any candidate already covered by an existing
   backlog row — match on intent, not exact wording.
3. **Minimal row.** An accepted item is one `idea` row with a one-line
   *Why*. Do not pre-fill a *Likely shape* the human hasn't scoped.
4. **Same commit.** Added rows land in the same commit as the stage's
   artifact, per the atomic-commit rule above.

R and V do not capture: R is ticket-blind (it cannot judge what is in or
out of scope), and V's cut slices are almost always the same change
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

**V — Slices.** Takes the proposal and cuts it into vertical slices. Each
slice maps to a testable unit of work. Artifact:
`openspec/changes/<id>/slices.md`.

**I — Implement.** Write code. Tick tasks in `tasks.md` as you go.

**PR — Pull Request.** Human reviews the code. No exceptions. Because Design
and Structure were already aligned, this review is fast and contains few
surprises. `/qrspi-pr` records the PR link in `openspec/changes/<id>/pr.md`
and seeds `followups.md` with any open issues the reviewer found.

## After PR — the fix loop

QRSPI ends at PR, but small follow-ups always surface afterwards: the
reviewer's "Open issues" list and code-level retrospective flags. These are
tracked as checkboxes in `openspec/changes/<id>/followups.md` and resolved
with `/qrspi-followup <id>` — a loop that hangs off the PR stage, not a ninth
stage. Each fix keeps code, tests, and the change's **delta** spec in sync,
ticks the follow-up, and commits `fix(<id>): ...` on the PR branch. See
skill `postpr-fix`. The change is ready to archive only when
`followups.md` has no un-ticked boxes.

## Rules of the road

- One change at a time. Never run two QRSPI flows in the same session.
- Each stage's bounded artifact write is delegated to a subagent via the
  Agent tool, so the orchestrator's context stays clean. See skill
  `context-hygiene`.
- Hide the ticket during Research. This is the most important rule.
- Vertical slices in Structure, not horizontal layers. See skill
  `vertical-slice`.
- "Looks plausible" is the failure mode. Plans that read well do not
  necessarily build well. Verification must go deeper than reading.

## When you can skip stages

Trivial changes (typo, lint fix, dependency bump under a patch version)
can skip directly to `/qrspi-implement` with an inline one-paragraph plan.
Anything that touches the data model, an API surface, or auth must go
through the full flow.

## Stage choreography (canonical procedures)

Every QRSPI stage command shares the same four invariant procedures. The
**main-loop orchestrator** runs all four procedures (precondition/approval
check, delegate the write, commit step, next-stage handoff); the stage
subagent is spawned via the Agent tool only for the bounded artifact write
and returns a condensed result — the orchestrator never sees the subagent's
full conversation. The authoritative wording lives here; a stage command
keeps only the stage-specific *variables* (its artifact filename(s), its
exact commit-message string, the precondition artifact + the prior stage to
point at, the agent it invokes, and the next-stage command) and references
this section for the procedure itself. When you read "follow the canonical
*commit step* / *next-stage handoff* / *precondition check* in
`workflow`", this is what is meant.

### Run-mode (Full / Semi / Manual)

**Establishing the run-mode.** At the top of a fresh stage invocation,
before the precondition check, the main-loop orchestrator reads or
establishes the run-mode for this flow:

- **If you already hold a run-mode established earlier in this orchestrator
  context** (i.e. this stage was auto-chained from a prior stage in the same
  session), skip the prompt and reuse it. No disk state is read or written;
  the mode lives entirely in the orchestrator’s conversational context.
- **If you hold no run-mode** (fresh invocation — new session, standalone
  call, or any session without a prior mode set), ask using the
  #tool:vscode/askQuestions:
  - question: "Run mode for this QRSPI flow?"
  - choices:
    - "Full auto — chain Q→PR, pause only at Q, D, backlog offers, hard-stops"
    - "Semi-auto — auto-advance within-stage gates, pause at each stage boundary"
    - "Manual — pause at every gate (today’s behaviour)"
  - Note in the question text: “Press Esc / stop at any time to interrupt a
    running auto chain.” (There is no `/qrspi-stop` command — Esc/stop is
    the only abort path.)

Record the chosen mode in context for the remainder of this session. The
mode is re-asked only when a stage runs in a context with no held mode (a
brand-new session, after a `/clear`, or when the human resumes a flow
manually). A mid-chain new session re-asks and the human re-picks — this is
correct behaviour, not a bug (no disk state is ever written).

**Mode-aware clause.** The four canonical procedures below each carry a
run-mode branch. The commit step and next-stage handoff auto-branches are
defined in this section (see "Commit step" and "Next-stage handoff" below).
The S approval gate, I per-slice checkpoints, and PR-create auto-branches
are defined in their respective sections ("Precondition check", the I
per-slice note in "Stage-specific gate notes", and "PR-create auto-advance"
below). In every procedure, if mode is Manual behave exactly as today (ask
via vscode/askQuestions at every gate, as described in each procedure).

**Never-suppressed gates (all modes).** The following gates are NEVER
suppressed in Full auto, Semi-auto, or Manual:

- **The D review** (open-questions pass + decision-by-decision approval +
  final "Ready to proceed?" confirmation) is a sanctioned pause. It is NOT
  suppressed in any mode. Full auto pauses here and the human completes the
  review before the chain continues.
- **Backlog-capture offers** in Q, D, and S are NEVER suppressed in any
  mode. The "offer, never auto-append" rule (vscode/askQuestions per item, one at
  a time) holds regardless of mode. These remain interactive vscode/askQuestions
  calls. "Full auto pauses only at Q and D" is shorthand; the backlog-capture
  offers in Q, D, and S are the deliberate additional exception.

### Hard-stop procedure

A hard-stop halts the auto chain immediately, regardless of mode. The
orchestrator MUST surface the condition via a human-readable message and ask
the human how to proceed using the #tool:vscode/askQuestions. It MUST NOT
auto-advance after a hard-stop, and it MUST NOT silently downgrade the rest
of the run to Manual (the human decides at the pause whether to resume or
change mode).

**The four hard-stop conditions (exact enumeration):**

1. **Failing precondition check.** A required input artifact is absent -- the
   stage has nothing to advance to. The stage refuses and surfaces which
   artifact is missing and which prior stage to run first.
2. **`git commit` or `git push` failure.** Any non-zero git exit code during
   the auto-commit step -- a dirty or conflicted working tree, a rejected
   remote push, or any other git error. Surface the git error output verbatim.
3. **Subagent returning error or signalling it is blocked.** The stage
   subagent's final message indicates failure, an unresolved blocker, or an
   explicit "blocked" signal. Note: `openspec validate` failure, lint/typecheck
   failure, test failure, and `gh pr create` failure are NOT standalone
   hard-stops -- they surface via this condition (the subagent's
   error/block-signal contract). The implementer in particular MUST return
   error/blocked and MUST NOT commit when lint, typecheck, or tests fail at a
   slice boundary (OQ2 binding resolution, D6).
4. **Execution-stage output materially diverging from the approved
   `design.md` or spec.** Applies to execution stages S->V->P->I. "Materially
   diverges" means the subagent's output changes an observable contract, drops
   a required behavior, or introduces a design element not present in the
   approved `design.md`. This is a semantic judgement -- the subagent must
   self-assess and signal it; the orchestrator acts on that signal.

**What to do on a hard-stop:** stop the chain, surface the condition clearly,
and ask the human via vscode/askQuestions. Present the error detail and offer a
path forward (e.g. "Fix the conflict and resume" or "Abort the chain"). Do
not commit, do not auto-advance, and do not downgrade the mode.

### Precondition check (Glob-based)

Before invoking a stage's subagent, confirm the stage's input artifact(s)
exist. **Use the Glob tool**, not a shell command — Glob has no permission
requirements and works on every platform (a shelled `ls` is rejected by the
permission checker on Windows/PowerShell). Glob the precondition path(s) the
stage names. If Glob returns nothing, refuse and tell the user to run the
named prior stage first (e.g. "run `/qrspi-plan` first"). Only proceed when
every required artifact is present.

A stage that has an *approval* gate in addition to a file gate (e.g.
Structure requires a human-approved `design.md`) runs that gate here too,
before invoking the subagent — the file existing is not the same as the
human having approved it. The branch taken for Structure's approval gate
depends on the held run-mode:

**S approval gate (run-mode-aware):**

- **If a run-mode is held and the human approved `design.md` at the D pause
  earlier in this same chain** (i.e. this is an auto-chained re-entry and
  the D review happened in this session), treat the approval gate as
  satisfied — do not ask. The in-chain D approval is the evidence that the
  human has reviewed and approved the design.
- **If no in-chain D approval exists** (standalone `/qrspi-structure` call,
  a fresh session where the mode was just re-asked, or any invocation where
  D was not run in this session), ask the approval gate as usual via
  vscode/askQuestions before invoking the subagent.

### Commit step (mandatory)

After the stage's artifact is written (and any backlog edit is staged, see
below), commit the result. The branch taken depends on the held run-mode:

**If mode is Full or Semi auto:**

Stage the explicit artifact paths and push without asking the human:

```
git add <explicit artifact path(s)> [openspec/backlog.md]
git commit -m "<the stage's exact commit-message string>"
git push
```

Rules that apply in Full and Semi auto:

- **Never use `git add -A`.** Stage only the explicit paths the stage
  produced (the subagent's final message lists the files it
  created/modified). This is identical to the Manual step.
- **No `[auto]` suffix or any other decoration** on the commit message. The
  message is identical to what Manual produces (PQ17).
- **On any non-zero git exit code** -- dirty or conflicted working tree,
  rejected push, or any other git error -- this is a **hard-stop** (see
  "Hard-stop procedure" above): surface the error output verbatim and ask
  the human how to proceed. Do NOT auto-advance to the next stage.

**If mode is Manual:**

Ask the human before committing:

- Use the #tool:vscode/askQuestions:
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

After the commit step, hand off to the next stage. The branch taken depends
on the held run-mode:

**If mode is Full auto:**

Do not ask. Re-enter `/qrspi:<next> <id>` immediately as a slash command on
the main loop. The held run-mode carries automatically because the next stage
runs in the same orchestrator context and already holds the mode (D2 /
inheritance rule above). Re-entry is always the slash command -- never spawn
the next stage as a subagent (that would bypass its gates and break the
ticket-blind Research invariant, D7).

**If mode is Semi-auto:**

Ask one vscode/askQuestions at this stage boundary -- this is the ONLY behavioural
difference between Full auto and Semi-auto:

- Use the #tool:vscode/askQuestions:
  - question: "Stage <X> complete. Continue to <Y>, or stop here?"
  - choices: ["Continue to /qrspi:<next> <id>", "Stop here -- I'll resume later"]
- If they choose **Continue**, re-enter `/qrspi:<next> <id>` as a slash
  command on the main loop (same rules as Full auto above).
- If they choose **Stop**, print `Next stage: /qrspi:<next> <id>` and end
  your turn.

**If mode is Manual:**

Ask the human whether to keep going:

- Use the #tool:vscode/askQuestions:
  - question: "Stage <X> is complete. Continue to stage <Y> now, or stop here?"
  - choices: ["Continue to /qrspi:<next> <id>", "Stop here -- I'll resume later"]
- If they choose **Continue**, invoke the next-stage command now so it runs
  as its own stage in the main loop (re-enter the slash command so its body
  runs on the orchestrator, keeping each stage's context window clean -- and
  so Research in particular stays blind to the ticket per its design). Do
  NOT spawn the next stage as a subagent -- that would bypass its gates.
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

### Stage-specific gate notes

These notes layer on top of the four canonical procedures above. Each note
applies only to the stage named.

**I per-slice auto-advance (Implement stage, Full/Semi auto).** The Implement
stage command body carries the per-slice checkpoint and per-slice commit step.
In Full or Semi auto mode both of those per-slice gates are auto-advanced
(no vscode/askQuestions is issued between slices). The per-slice model annotation
(`**Model:** sonnet|opus`) is read for every slice and honored -- auto mode
does NOT bypass per-slice model selection.

**PR-create auto-advance (PR stage, Full/Semi auto).** After the reviewer
subagent returns the PR description, the "Create the PR now, or show the
description first?" question is suppressed in Full or Semi auto mode: the
orchestrator runs `gh pr create` directly without asking. The human code
review of the PR itself is NEVER automated -- only the create prompt is
auto-advanced. In Manual mode ask as usual via vscode/askQuestions before
creating the PR.
