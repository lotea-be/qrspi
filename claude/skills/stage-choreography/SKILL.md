---
name: stage-choreography
description: The canonical main-loop procedures every QRSPI stage command runs -- run-mode establishment, precondition/approval check, commit step, next-stage handoff -- plus the hard-stop procedure, backlog atomicity, and the stage-specific gate notes. Orchestrator-only; load it in a /qrspi:* command body, never in a stage subagent. The stage model, Read Matrix, and divergence rubric live in the companion skill workflow.
metadata:
  audience: orchestrator
---

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
this skill for the procedure itself. When you read "follow the canonical
*commit step* / *next-stage handoff* / *precondition check* in
`stage-choreography`", this is what is meant.

These procedures are **orchestrator-only**. Load this skill from a `/qrspi:*`
command body running on the main loop; never load it inside a stage subagent,
which is spawned for one bounded artifact write and cannot reach
`AskUserQuestion` at all. The stage model, the Read Matrix, and the divergence
rubric that the subagents *do* need live in the companion skill `workflow`.

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
  **AskUserQuestion** tool:
  - question: "Run mode for this QRSPI flow?"
  - choices:
    - "Full auto — chain Q→PR, pause only at Q, D, backlog offers, hard-stops"
    - "Semi-auto — auto-advance within-stage gates, pause at each stage boundary"
    - "Manual — pause at every gate (today’s behaviour)"
  - Note in the question text: “Press Esc / stop at any time to interrupt a
    running auto chain.” (There is no `/qrspi:stop` command — Esc/stop is
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
via AskUserQuestion at every gate, as described in each procedure).

**Never-suppressed gates (all modes).** The following gates are NEVER
suppressed in Full auto, Semi-auto, or Manual:

- **The D review** (open-questions pass + decision-by-decision approval +
  final "Ready to proceed?" confirmation) is a sanctioned pause. It is NOT
  suppressed in any mode. Full auto pauses here and the human completes the
  review before the chain continues.
- **Backlog-capture offers** in Q, D, and S are NEVER suppressed in any
  mode. The "offer, never auto-append" rule (AskUserQuestion per item, one at
  a time) holds regardless of mode. These remain interactive AskUserQuestion
  calls. "Full auto pauses only at Q and D" is shorthand; the backlog-capture
  offers in Q, D, and S are the deliberate additional exception.
- **The context-budget soft gate** (skill `context-budget-gate`) fires in all
  run-modes without exception when the stage-event counter reaches 12 or the
  orchestrator's qualitative self-assessment indicates heavy context load. On
  "Reset now" the skill prints the resume one-liner and **ends the turn**
  without auto-advancing to any next stage. On "Continue in this session" the
  gate sets its once-only flag and proceeds; it does not re-fire in this
  session.
- **The no-remote merge-back confirmation** (the `git-host-workflow` skill's
  Step D human-confirmed `git merge` back into the default branch) is NEVER
  auto-advanced, even in Full auto. It remains an AskUserQuestion the calling
  command presents and waits on (see "No-remote gating (push-based
  auto-advance)" below).

### Hard-stop procedure

A hard-stop halts the auto chain immediately, regardless of mode. The
orchestrator MUST surface the condition via a human-readable message and ask
the human how to proceed using the **AskUserQuestion** tool. It MUST NOT
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
   A **no-remote** repo (the `git-host-workflow` skill's Step A
   remote-presence check reports no configured remote) is NOT a git-push
   failure: the push-based auto-advance is *gated* by the no-remote local
   flow (see "No-remote gating (push-based auto-advance)" below), not failed.
   Only an actual non-zero git exit is a hard-stop under this condition.
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

The PR reconciliation gate (tasks pass + follow-ups pass in `claude/commands/pr.md`) also triggers a hard-stop in Full/Semi-auto mode when open items are found -- see that file for the full mechanics; it does not add a fifth condition, but is a conditional application of condition (3).

**What to do on a hard-stop:** stop the chain, surface the condition clearly,
and ask the human via AskUserQuestion. Present the error detail and offer a
path forward (e.g. "Fix the conflict and resume" or "Abort the chain"). Do
not commit, do not auto-advance, and do not downgrade the mode.


**Divergence rubric (hard-stop condition 4).** Condition (4) is the one
hard-stop only the subagent can recognise, so its criteria live with the
subagents: see "Divergence rubric (hard-stop condition 4)" in skill
`workflow`. The execution-stage subagent (S, V, P, or I) self-checks against
that rubric before returning and signals error/blocked on a material
divergence; the orchestrator acts on that signal exactly as it does on any
other condition (3)/(4) hard-stop.

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
before invoking the subagent — the file existing is not the same as the
human having approved it. The branch taken for Structure's approval gate
depends on the held run-mode:

**S approval gate (run-mode-aware):**

- **If a run-mode is held and the human approved `design.md` at the D pause
  earlier in this same chain** (i.e. this is an auto-chained re-entry and
  the D review happened in this session), treat the approval gate as
  satisfied — do not ask. The in-chain D approval is the evidence that the
  human has reviewed and approved the design.
- **If no in-chain D approval exists** (standalone `/qrspi:structure` call,
  a fresh session where the mode was just re-asked, or any invocation where
  D was not run in this session), ask the approval gate as usual via
  AskUserQuestion before invoking the subagent.

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

Ask one AskUserQuestion at this stage boundary -- this is the ONLY behavioural
difference between Full auto and Semi-auto:

- Use the **AskUserQuestion** tool:
  - question: "Stage <X> complete. Continue to <Y>, or stop here?"
  - choices: ["Continue to /qrspi:<next> <id>", "Stop here -- I'll resume later"]
- If they choose **Continue**, re-enter `/qrspi:<next> <id>` as a slash
  command on the main loop (same rules as Full auto above).
- If they choose **Stop**, print `Next stage: /qrspi:<next> <id>` and end
  your turn.

**If mode is Manual:**

Ask the human whether to keep going:

- Use the **AskUserQuestion** tool:
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

A backlog row is a single heading with a backticked status, grouped under
a `##` section per status (`## Proposed`, `## In progress`, `## Ideas`,
...). The frozen heading grammar is:

```
### <id> — `<status>` · **P<n>**
```

where `—` is an em-dash (U+2014), `·` is a middle-dot (U+00B7), and
`**P<n>**` is the bold priority band. See
`openspec-templates/backlog.template.md` for the authoritative shape
(legend comment, status enum, body rules, and sample rows).

There is no separate `Status:` or `Next QRSPI command:` body line: the
status word, its free-text parenthetical note, and the row's section
grouping all live in that one heading, and any edit to them is an edit to
that heading.

When a stage's state change has a matching `openspec/backlog.md` edit (a
status transition and/or section-grouping move, or a new `idea` row
captured from deferred work), that backlog edit lands in the **same
commit** as the stage's artifact -- never as a separate follow-up commit.
Stage `openspec/backlog.md` alongside the artifact in the commit step
above. This is the same atomic-commit rule stated under "Before Q -- the
backlog" in skill `workflow`; it applies to every stage that touches the
backlog row. Most
stages do **not** touch the row at all: only Q (`idea` to `proposed`), the
Implement stage's final slice (`proposed` to `in-progress`, moving the row
under `## In progress` with a completed-stages note), and PR (updating the
note to the open-PR reference) flip status; Q, D, and S may additionally
add new `idea` rows via "Capturing deferred work" in skill `workflow`. A stage whose
subagent already performed the backlog edit (e.g. the questioner's status
flip) verifies the row rather than re-editing it -- re-editing a file the
subagent just wrote fails with a "file modified since read" error.

### Stage-specific gate notes

These notes layer on top of the four canonical procedures above. Each note
applies only to the stage named.

**I per-slice auto-advance (Implement stage, Full/Semi auto).** The Implement
stage command body carries the per-slice checkpoint and per-slice commit step.
In Full or Semi auto mode both of those per-slice gates are auto-advanced
(no AskUserQuestion is issued between slices). The per-slice `model=` token of the
compute annotation (`**Compute:** model=sonnet|opus effort=…`) is read for every
slice and honored -- auto mode does NOT bypass per-slice model selection.

**No-remote gating (push-based auto-advance, Full/Semi auto).** Before any
push-based auto-advance step -- the Questions-stage branch push, the
Implement-stage per-slice push, and the PR-create step -- the orchestrator
MUST run the `git-host-workflow` skill's Step A live remote-presence check.
When no remote is configured, the orchestrator MUST NOT treat the absent push
as a `git push` hard-stop (hard-stop condition (2) does not fire on
no-remote); it MUST instead auto-follow the skill's Step D no-remote local
flow -- taking that flow's default non-interactive choice for that push site
(e.g. keep the local branch) -- continue the chain, and record that the run
is local-only. The human-confirmed merge-back that the no-remote flow offers
for the local-branch and commit-to-current paths is NEVER auto-advanced: it
stays an AskUserQuestion the orchestrator presents and waits on, even in Full
auto (see "Never-suppressed gates" above).

**PR-create auto-advance (PR stage, Full/Semi auto).** After the reviewer
subagent returns the PR description, the "Create the PR now, or show the
description first?" question is suppressed in Full or Semi auto mode: the
orchestrator runs the host PR-create command resolved via the
`git-host-workflow` skill's vendor resolution (e.g. `gh pr create`, `az repos
pr create`, or `glab mr create`, depending on the resolved vendor) directly
without asking -- but only after running that skill's Step A remote-presence
check first. On no-remote it follows the no-remote local flow instead of
attempting PR creation (see "No-remote gating (push-based auto-advance)"
above). The human code review of the PR itself is NEVER automated -- only the
create prompt is auto-advanced. In Manual mode ask as usual via
AskUserQuestion before creating the PR.