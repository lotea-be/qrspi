# qrspi-run-mode Specification

## Purpose
TBD - created by archiving change add-auto-mode. Update Purpose after archive.
## Requirements
### Requirement: Ternary mode prompt at every fresh stage invocation
The orchestrator MUST present a dedicated AskUserQuestion at the top of any
stage invocation in which no run-mode is already held in the orchestrator's
conversational context (i.e., the stage was not auto-chained from a prior stage
in this session). The prompt MUST offer exactly three choices: "Full auto —
chain Q→PR, pause only at Q, D, backlog offers, hard-stops"; "Semi-auto —
auto-advance within-stage gates, pause at each stage boundary"; "Manual — pause
at every gate (today's behaviour)". The prompt text MUST document that pressing
Esc or using the standard stop interrupt aborts a running auto chain.

#### Scenario: first stage in a new session shows the mode prompt
- **WHEN** a user invokes any `/qrspi:*` stage command in a session where no
  run-mode has been established
- **THEN** the orchestrator asks the ternary mode AskUserQuestion before running
  the precondition check or any other stage work, and records the chosen mode in
  its conversational context.

#### Scenario: mid-chain stage does not re-ask the mode
- **WHEN** the orchestrator auto-chains from one stage to the next (Full or Semi
  auto mode is held in the current session context)
- **THEN** the mode prompt is NOT shown; the held mode is silently reused for the
  new stage.

#### Scenario: resumed standalone stage re-asks the mode
- **WHEN** a user starts a fresh session (e.g., after a context reset or `/clear`)
  and manually invokes a mid-flow stage such as `/qrspi:slices <id>`
- **THEN** the mode prompt appears at the top of that stage because no run-mode
  is held in the new session context, and the user can re-pick Full auto to
  continue the chain from that stage.

### Requirement: Fresh-vs-mid-chain determined by in-process context only
The orchestrator MUST determine whether a stage invocation is fresh (show the
mode prompt) or mid-chain (inherit the held mode) exclusively from its
conversational context — no disk file, no frontmatter field, no command-line
flag, and no environment variable SHALL be read or written to carry the mode
across stages. A mid-flow new session (crash, `/clear`, new terminal) MUST
result in re-asking the mode prompt; there is no auto-resume-as-auto behaviour.

#### Scenario: no disk artifact written for the mode choice
- **WHEN** a user selects Full auto and a full Q→PR chain runs to completion
- **THEN** no mode file, marker file, config entry, or backlog field containing
  the mode choice exists in the repository after the run.

#### Scenario: no --mode flag on re-entered stage commands
- **WHEN** the Full auto orchestrator auto-invokes the next stage command after
  a successful stage
- **THEN** the invocation is `/qrspi:<next> <id>` with no `--mode` or `--auto`
  suffix; the held context is the only carrier.

### Requirement: Full auto chains Q→PR pausing only at sanctioned gates
In Full auto mode the orchestrator MUST auto-advance all suppressible gates and
chain every stage from Q through PR without pausing, except at the following
sanctioned pauses: (1) the Q open-product-questions pass (interactive per PQ);
(2) the D design review (all open-questions, decision-by-decision approval, and
final "Ready to proceed?" confirmation); (3) every backlog-capture offer in Q, D,
and S (the "offer, never auto-append" rule applies in all modes); (4) any hard-stop
condition (see Requirement: Hard-stop set). The auto-chain sequence SHALL be
Q → R → D → S → V → P → I → PR.

#### Scenario: Full auto flows Q→R without pausing at commit or handoff
- **GIVEN** a user starts `/qrspi:questions <id>` and picks Full auto
- **WHEN** the Q stage completes and the questioner subagent returns its artifact
- **THEN** the orchestrator auto-commits (stage explicit paths, commit with the
  stage's exact message, push) and auto-chains to `/qrspi:research <id>` without
  asking the human either question.

#### Scenario: Full auto pauses at D review
- **GIVEN** Full auto mode is active and Research has completed
- **WHEN** the orchestrator auto-chains into `/qrspi:design <id>`
- **THEN** the designer subagent completes `design.md`, and the orchestrator
  presents the full interactive D review (open-questions pass + decision-by-
  decision approval + final "Ready to proceed to Structure?" confirmation) —
  these prompts are NOT suppressed.

#### Scenario: Full auto auto-clears S's design-approval gate after in-chain D review
- **GIVEN** Full auto mode is active and the human approved `design.md` at the D
  pause earlier in the same session
- **WHEN** the orchestrator auto-chains into `/qrspi:structure <id>`
- **THEN** the "Have you reviewed and approved design.md?" AskUserQuestion is NOT
  asked; the orchestrator treats S's approval gate as satisfied because the human
  approved at the D pause in this chain.

#### Scenario: Standalone structure with Full auto re-asks the approval gate
- **GIVEN** a user starts a fresh session and picks Full auto at `/qrspi:structure <id>`
- **WHEN** the precondition check passes
- **THEN** the orchestrator asks the design-approval gate as usual, because there
  is no in-chain D review to inherit in this session.

### Requirement: Semi-auto pauses at stage boundaries, auto-advances within-stage gates
In Semi-auto mode the orchestrator MUST auto-advance within-stage gates
(commit step) exactly as Full auto does, but MUST present the next-stage handoff
AskUserQuestion at every stage boundary. All sanctioned pauses (Q open-questions,
D review, backlog-capture offers, hard-stops) apply identically to Semi-auto and
Full auto.

#### Scenario: Semi-auto auto-commits but pauses at handoff
- **GIVEN** Semi-auto mode is active and the Q questioner subagent has returned
- **WHEN** the orchestrator processes the commit step
- **THEN** it auto-commits and auto-pushes (no AskUserQuestion for the commit)
  but DOES ask "Stage Q is complete. Continue to stage R now, or stop here?" before
  auto-chaining to the next stage.

#### Scenario: Semi-auto and Full auto both pause at D review
- **GIVEN** either Semi-auto or Full auto mode is active
- **WHEN** the orchestrator reaches the D design review
- **THEN** the full interactive D review runs (not suppressed in either mode).

### Requirement: Manual mode is today's behaviour, unchanged
In Manual mode the orchestrator MUST behave exactly as it did before this change:
every gate (commit step, next-stage handoff, approval gate, per-slice checkpoint,
PR-create) fires as an AskUserQuestion. No gate is suppressed and no auto-chain
occurs.

#### Scenario: Manual mode commit gate fires
- **GIVEN** Manual mode is active and a stage subagent has returned
- **WHEN** the commit step runs
- **THEN** the orchestrator asks "Commit <artifacts> to the feature branch?" and
  waits for a Yes or No answer before proceeding.

### Requirement: Auto commit step uses explicit-path git add and identical commit message
The orchestrator MUST, when auto-advancing the commit step in Full or Semi-auto mode,
stage only the explicit artifact paths the stage names (never `git add -A`), commit
with the stage's exact commit-message string (identical to Manual; no `[auto]` suffix
or other decoration), and push immediately after the commit. A commit or push failure
MUST trigger a hard-stop.

#### Scenario: auto-commit stages only named paths
- **GIVEN** Full auto mode is active and stage R has completed
- **WHEN** the orchestrator auto-runs the commit step
- **THEN** it runs `git add openspec/changes/<id>/research.md` (and
  `openspec/backlog.md` if the backlog was edited), `git commit -m "docs(<id>):
  add research.md (QRSPI stage R)"`, and `git push` — never `git add -A`.

#### Scenario: auto-commit message is identical to manual
- **WHEN** any stage auto-commits in Full or Semi-auto mode
- **THEN** the commit message is the stage's standard message string with no
  `[auto]`, `[skip-ci]`, or any other auto-mode decoration.

### Requirement: Implement auto-advances all slice checkpoints preserving per-slice model
In Full or Semi-auto mode the Implement stage orchestrator MUST run all slices
straight through without asking the per-slice human checkpoint AskUserQuestion or
the per-slice commit AskUserQuestion. It MUST still read each slice's `**Model:**
sonnet|opus` annotation and re-invoke the implementer subagent on the annotated
model for each slice. It MUST auto-commit each slice using the stage's exact
per-slice commit-message string and push immediately after. A hard-stop (subagent
error/block) MUST abort the slice run; it MUST NOT silently downgrade to Manual.

#### Scenario: Full auto Implement runs all slices without checkpoints
- **GIVEN** Full auto mode is active and `/qrspi:implement <id>` is running
- **WHEN** the implementer subagent completes Slice 1 successfully
- **THEN** the orchestrator auto-commits Slice 1, does NOT ask "Continue with
  Slice 2?", and immediately invokes the Slice 2 implementer on the annotated
  model for that slice.

#### Scenario: per-slice model re-invocation preserved in auto mode
- **GIVEN** Full auto mode is active and Slice 2 is annotated `**Model:** opus`
  while Slice 1 was `sonnet`
- **WHEN** the Slice 1 implementer returns and the orchestrator auto-advances
- **THEN** the Slice 2 implementer is invoked with `model: opus`, not `sonnet`.

### Requirement: PR-create is auto-executed in Full and Semi-auto mode
In Full or Semi-auto mode the orchestrator MUST auto-execute the PR-create step
(the `gh pr create` call) without asking "Create the PR now or show me the
description first?". The human code review itself is NEVER suppressed.

#### Scenario: Full auto PR stage auto-creates the PR
- **GIVEN** Full auto mode is active and the reviewer subagent has returned the
  PR description
- **WHEN** the orchestrator processes the PR-create step
- **THEN** it runs `gh pr create` with the prepared title and body without asking
  the human first, and records the PR URL in `openspec/changes/<id>/pr.md`.

### Requirement: Hard-stop set halts the auto chain regardless of mode
The orchestrator MUST pause and surface a human-readable error for any of the
following hard-stop conditions, in every mode including Full and Semi-auto:
(1) a failing precondition check (required artifact absent — the stage refuses);
(2) a `git commit` or `git push` failure, including a dirty or conflicted working
tree or a rejected remote push; (3) a stage subagent returning an error or
signalling it is blocked; (4) (execution stages S→V→P→I) the subagent's output
materially diverges from the approved `design.md` or spec. A hard-stop MUST NOT
silently downgrade the remainder of the run to Manual; it MUST surface the
condition and ask the human how to proceed.

#### Scenario: git push failure hard-stops the chain
- **GIVEN** Full auto mode is active and the Q stage has committed
- **WHEN** `git push` returns a non-zero exit code (e.g. remote rejects the push)
- **THEN** the orchestrator stops the chain, reports the git error to the human,
  and does NOT auto-advance to stage R.

#### Scenario: subagent error hard-stops the chain
- **GIVEN** Full auto mode is active and the Implement stage is running
- **WHEN** the implementer subagent returns an error or signals it is blocked
  (e.g. due to failing lint, typecheck, or tests at a slice boundary)
- **THEN** the orchestrator stops the chain, surfaces the subagent's error
  message, and asks the human how to proceed — it does NOT auto-commit that
  slice or continue to the next.

#### Scenario: execution-stage divergence from approved design hard-stops the chain
- **GIVEN** Full auto mode is active and an execution stage (S, V, P, or I) is
  running
- **WHEN** the stage subagent self-checks its output against the divergence
  rubric and finds it materially diverges from the approved `design.md` or delta
  spec (e.g. it would introduce a capability, dependency, or observable-contract
  change not present in the approved design, or drop a recorded decision)
- **THEN** the subagent surfaces the specific divergence and returns blocked
  instead of committing, and the orchestrator treats it as hard-stop condition
  (4) — it stops the chain and asks the human how to proceed, and does NOT
  auto-advance.

#### Scenario: hard-stop does not permanently downgrade mode
- **GIVEN** Full auto mode is active and a hard-stop fires at stage P
- **WHEN** the human resolves the blocking condition and explicitly resumes
- **THEN** the mode used going forward is whatever the human picks at that
  fresh resume (re-ask), not a forced Manual downgrade.

### Requirement: Ticket-blind Research invariant and context firewall unchanged
Auto-chaining MUST NOT alter how stages are invoked: the orchestrator MUST still
re-enter `/qrspi:research <id>` as its own slash command on the main loop (never
inlining the researcher or passing it the ticket), and every stage MUST still
spawn its subagent via the Agent tool for the bounded write. Full auto
re-entering Research immediately (with no human click) is behaviourally identical
to a human clicking "Continue" instantly; the researcher STILL starts fresh and
ticket-blind. This invariant is non-negotiable.

#### Scenario: Full auto Research invocation is ticket-blind
- **GIVEN** Full auto mode is active and stage Q has completed
- **WHEN** the orchestrator auto-chains into `/qrspi:research <id>`
- **THEN** the research slash command body runs on the main-loop orchestrator,
  the researcher subagent is spawned via the Agent tool without the ticket
  (`questions.md`) being passed, and the researcher produces `research.md`
  from its own codebase investigation — exactly as in Manual mode.

#### Scenario: auto-chain does not inline a stage subagent
- **WHEN** the orchestrator auto-chains from any stage X to stage Y
- **THEN** it invokes `/qrspi:<Y> <id>` as a slash command (running stage Y's
  full gate logic on the main loop), not by spawning stage Y's subagent directly
  via the Agent tool.

### Requirement: PR reconciliation gate fires conditional hard-stop in auto modes
The system MUST treat the PR-stage reconciliation gate as a conditional
hard-stop in Full and Semi-auto modes: when a pass finds zero open items
(tasks: every box ticked or absent; follow-ups: file absent, prose-only, or
all-ticked) the pass MUST be suppressed silently with no AskUserQuestion; when
a pass finds one or more open items the system MUST fire a hard-stop — surface
the open-item count, present the review gate via AskUserQuestion, and NOT
auto-advance past the open items. This conditional hard-stop is distinct from
the four failure/divergence hard-stop conditions in the `workflow` skill's
"Hard-stop procedure" (which concern artifacts, git, subagent errors, and
design divergence); the full reconciliation-gate mechanics live in
`claude/commands/pr.md`, and the `workflow` skill's hard-stop section carries
a one-line cross-reference to them.

#### Scenario: clean tasks pass is silent in Full auto
- **GIVEN** Full auto mode is active and `/qrspi:pr <id>` is running
- **WHEN** `tasks.md` has no un-ticked boxes
- **THEN** the tasks pass emits no AskUserQuestion and no banner, and the
  orchestrator proceeds silently to the follow-ups pass.

#### Scenario: dirty tasks pass fires a hard-stop in Full auto
- **GIVEN** Full auto mode is active and `/qrspi:pr <id>` is running
- **WHEN** `tasks.md` has at least one un-ticked box
- **THEN** the orchestrator fires a hard-stop: it shows the count banner,
  presents the per-item reconciliation gate via AskUserQuestion, and does NOT
  auto-advance to the reviewer spawn.

#### Scenario: clean follow-ups pass is silent in Semi-auto
- **GIVEN** Semi-auto mode is active and the tasks pass has completed cleanly
- **WHEN** `followups.md` is absent or has no un-ticked entries
- **THEN** the follow-ups pass is suppressed silently and the orchestrator
  proceeds to the reviewer spawn.

#### Scenario: dirty follow-ups pass fires a hard-stop in Semi-auto
- **GIVEN** Semi-auto mode is active
- **WHEN** `followups.md` has at least one un-ticked entry
- **THEN** the orchestrator fires a hard-stop: shows the banner, presents the
  per-item review gate, and does NOT auto-advance.

#### Scenario: both passes always run in Manual mode
- **GIVEN** Manual mode is active and both `tasks.md` and `followups.md` are
  fully ticked
- **WHEN** `/qrspi:pr <id>` runs
- **THEN** the orchestrator shows a "0 open — nothing to resolve" message for
  each pass rather than suppressing them silently.

#### Scenario: hard-stop does not permanently downgrade mode
- **GIVEN** Full auto mode is active and the reconciliation gate hard-stops
  due to open tasks
- **WHEN** the human resolves the items and resumes
- **THEN** the mode used going forward is whatever the human picks at that
  fresh resume, not a forced Manual downgrade.

