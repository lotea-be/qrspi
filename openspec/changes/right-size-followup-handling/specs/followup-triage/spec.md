# Spec — followup-triage

> New capability introduced by the `right-size-followup-handling` change.
> Upfront triage gate in `/qrspi:followup` that classifies each targeted
> follow-up item, proposes a routing path (P1/P2/P3), requires human
> confirmation, and routes to one of three wired execution paths before the
> implementer is ever spawned.

## ADDED Requirements

### Requirement: Triage gate runs once per invocation before the implementer is spawned

The system MUST insert a triage gate into `/qrspi:followup` that fires after
the Glob preconditions pass (change folder and `pr.md` exist) and before any
implementer subagent is spawned. The gate MUST target the single follow-up item
for this invocation — the named fix, or the next un-ticked entry in
`followups.md` — and MUST NOT attempt to classify or batch the entire
`followups.md` queue. On P2 or P3 routing the implementer MUST NOT be spawned.

#### Scenario: triage fires after preconditions, before implementer
- **GIVEN** `/qrspi:followup <id>` is invoked and the change folder and `pr.md`
  exist
- **WHEN** the orchestrator processes the invocation
- **THEN** the triage gate fires (self-assessment + AskUserQuestion) before the
  implementer subagent is spawned, regardless of which path (P1/P2/P3) is chosen.

#### Scenario: P2 routing does not spawn the implementer
- **GIVEN** the human selects "P2 — addendum" at the triage gate
- **WHEN** the orchestrator processes the triage answer
- **THEN** the implementer subagent is NOT spawned; the orchestrator performs the
  P2 addendum mechanics and ends the turn with a handoff instruction.

#### Scenario: P3 routing does not spawn the implementer
- **GIVEN** the human selects "P3 — defer to backlog idea" at the triage gate
- **WHEN** the orchestrator processes the triage answer
- **THEN** the implementer subagent is NOT spawned; the orchestrator appends the
  backlog row, ticks `followups.md`, and ends the turn.

### Requirement: Agent proposes path from four explicit heuristic signals

The system MUST self-assess the targeted follow-up against four explicit heuristic
signals before presenting the triage question, and MUST include the proposed path
and a one-line rationale in the question text. The four signals are: (1) contract
change — does the fix alter a route, status, DTO, auth, or validation contract
beyond a purely internal change; (2) multi-capability — does it touch more than
one `specs/<capability>/` subdir the change owns; (3) design re-alignment — does
resolving it require revising a `design.md` Dn decision, not merely amending a
delta scenario; (4) new scope — is it not covered by the change's delta spec at
all. The default proposal MUST follow the rubric: P1 when none of signals 2, 3,
or 4 fire; P2 when signal 3 fires or signals 1 and 2 fire together; P3 when
signal 4 fires.

#### Scenario: no strong signals default to P1 proposal
- **GIVEN** the targeted follow-up is an atomic, single-capability, in-scope fix
  that touches no contract and requires no design revision
- **WHEN** the orchestrator self-assesses the four signals
- **THEN** none of signals 2, 3, or 4 fire, and the proposed path in the triage
  question is P1 with a rationale citing the absence of scope or design signals.

#### Scenario: signal 3 (design re-alignment) triggers P2 proposal
- **GIVEN** the targeted follow-up requires revising a `design.md` Dn decision
- **WHEN** the orchestrator self-assesses the four signals
- **THEN** signal 3 fires and the proposed path in the triage question is P2 with
  a rationale citing the need for design re-alignment.

#### Scenario: signal 4 (new scope) triggers P3 proposal
- **GIVEN** the targeted follow-up describes work not covered by the change's
  delta spec — it is genuinely a different change
- **WHEN** the orchestrator self-assesses the four signals
- **THEN** signal 4 fires and the proposed path in the triage question is P3 with
  a rationale citing out-of-scope new work.

### Requirement: Triage AskUserQuestion presents three explicit choices

The system MUST present the triage decision as an `AskUserQuestion` with the
question text identifying the targeted item, naming the proposed path in the
question body (not as a choice), and offering exactly three choices:
"P1 — implement directly (small in-scope fix)",
"P2 — addendum (re-enter QRSPI at an earlier stage)",
"P3 — defer to backlog idea (new scope)".
The gate MUST fire in Full auto, Semi-auto, and Manual run-modes without
exception — it is a never-suppressed gate.

#### Scenario: triage question includes the proposed path and rationale
- **GIVEN** the orchestrator has self-assessed the follow-up and determined P2 is
  the proposed path
- **WHEN** the AskUserQuestion is presented
- **THEN** the question text contains the follow-up's short title, names "P2" as
  the proposed path with a one-line rationale, and offers the three choice labels
  "P1 — implement directly (small in-scope fix)",
  "P2 — addendum (re-enter QRSPI at an earlier stage)",
  "P3 — defer to backlog idea (new scope)".

#### Scenario: triage gate fires in Full auto mode
- **GIVEN** Full auto mode is active and `/qrspi:followup <id>` is running
- **WHEN** the preconditions pass and the orchestrator reaches the triage gate
- **THEN** the `AskUserQuestion` is presented to the human — it is NOT
  auto-advanced or skipped.

#### Scenario: human override changes the routing path
- **GIVEN** the orchestrator proposed P1 but the human selects "P2 — addendum"
- **WHEN** the orchestrator processes the answer
- **THEN** the P2 addendum mechanics execute; the P1 implementer spawn does NOT occur.

### Requirement: P1 path is identical to today's implementer flow

On P1, the system MUST spawn the `qrspi:implementer` subagent in FIX MODE using
the existing model selection logic (sonnet default, opus for design-level or
multi-file fixes). The P1 path MUST NOT add any new annotation to the
`followups.md` entry; the existing `— fixed in <short-sha>` tick at completion
remains the sole record. The triage adds no new steps or side effects to P1
beyond the gate itself.

#### Scenario: P1 chosen — implementer spawned with no extra annotation
- **GIVEN** the human selects "P1 — implement directly" at the triage gate
- **WHEN** the orchestrator processes the answer
- **THEN** the `qrspi:implementer` subagent is spawned in FIX MODE and the
  `followups.md` entry receives no additional annotation beyond the standard
  `— fixed in <short-sha>` tick written at the end of the fix.

### Requirement: P2 path creates a flat sibling addendum change folder

On P2, the system MUST create a new change folder
`openspec/changes/<original-id>-addendum-N/` where N is the next integer
after the highest existing addendum number for this parent (determined by
Globbing `openspec/changes/<original-id>-addendum-*/`). The folder MUST be a
flat sibling of the parent change folder — not a subdirectory of it. If no
addendum folder exists yet, N is 1. The orchestrator MUST create the empty
sibling folder before the handoff instruction so that the entry-stage command
finds a valid `openspec/changes/<addendum-id>/` path on disk.

#### Scenario: first addendum creates the -addendum-1 folder
- **GIVEN** P2 is chosen and no `<original-id>-addendum-*` folder exists
- **WHEN** the orchestrator processes the P2 path
- **THEN** it creates `openspec/changes/<original-id>-addendum-1/` as a flat
  sibling of the parent change folder, with N=1.

#### Scenario: second addendum increments to -addendum-2
- **GIVEN** P2 is chosen and `<original-id>-addendum-1/` already exists
- **WHEN** the orchestrator Globs existing addendum folders and takes max+1
- **THEN** it creates `openspec/changes/<original-id>-addendum-2/`.

### Requirement: P2 path asks the human for entry stage and branch

On P2, the system MUST ask the human to select the addendum's entry stage
(valid values: Q, R, D, S, V, P, I) via `AskUserQuestion`. The agent MUST
suggest an entry stage in the question text based on the heuristic signals (e.g.
"needs fresh investigation → R"; "touches a delta scenario → D") but MUST NOT
pre-select it — the human picks explicitly. The system MUST then ask the human
to confirm the branch the addendum lands on, with a default steer: D/S/V/P/I
entry stages steer toward the same PR branch as the parent; Q/R entry stages
steer toward a new branch `features/<original-id>-addendum-N`. The human MUST
be able to override either steer.

#### Scenario: Q entry stage steers toward a new branch
- **GIVEN** the human picks Q as the entry stage for an addendum
- **WHEN** the orchestrator presents the branch AskUserQuestion
- **THEN** the default steer is a new branch
  `features/<original-id>-addendum-N`, because Q entry implies divergent scope.

#### Scenario: D entry stage steers toward the same PR branch
- **GIVEN** the human picks D as the entry stage for an addendum
- **WHEN** the orchestrator presents the branch AskUserQuestion
- **THEN** the default steer is the same PR branch as the parent change, because
  D entry means the design is mostly settled and work extends the existing PR.

### Requirement: P2 path hands off to the human, does not auto-run the addendum pipeline

On P2, after the folder is created and the branch is established, the system
MUST end the turn by instructing the human to run
`/qrspi:<chosen-entry-stage> <addendum-id>` — it MUST NOT auto-invoke the
entry-stage command itself. This preserves the re-entered stage's own gates
(including the ticket-blind Research invariant when the entry stage is R) and
keeps the followup orchestrator from bypassing run-mode establishment.

#### Scenario: P2 turn ends with a handoff instruction
- **GIVEN** the human selected P2 with entry stage R and a new branch
- **WHEN** the orchestrator has created the sibling folder and established the branch
- **THEN** the orchestrator's turn ends with an instruction to run
  `/qrspi:research <addendum-id>`, not by invoking the researcher subagent directly.

### Requirement: P3 path appends one idea row to the backlog and ticks followups.md

On P3, the system MUST append one `idea` row to `openspec/backlog.md` under
`## Ideas`, using the kebab-slug derived from the follow-up title, the status
backtick ``idea`` and priority `· **P3**`, followed by a `**Why:**` paragraph
drawn from the follow-up content. The orchestrator MUST write the row itself (not
merely instruct the human to add it). Both the backlog row and the `followups.md`
tick MUST be staged in the same commit per the backlog atomicity rule.

#### Scenario: P3 path appends an idea row to the backlog
- **GIVEN** the human selects "P3 — defer to backlog idea" at the triage gate
- **WHEN** the orchestrator processes the P3 path
- **THEN** one new `idea` row (with `· **P3**` priority and a `**Why:**`
  paragraph) appears under `## Ideas` in `openspec/backlog.md`, using a
  kebab-slug derived from the follow-up title.

#### Scenario: P3 commit is atomic — backlog row and tick staged together
- **GIVEN** P3 processing is complete (backlog row written, followups.md ticked)
- **WHEN** the orchestrator stages and commits
- **THEN** both `openspec/backlog.md` and
  `openspec/changes/<id>/followups.md` are staged in the same commit.

### Requirement: P2 and P3 tick followups.md with a disposition note

On P2 or P3, the system MUST tick the targeted `followups.md` entry by changing
`- [ ]` to `- [x]` and appending a parenthetical note:
- P2: `(routed to addendum <addendum-id>)`
- P3: `(deferred to backlog — <slug>)`

The tick MUST be written in the same commit as the other P2/P3 side effects (P2:
folder creation; P3: backlog row). A P1 fix MUST NOT receive this annotation; the
standard `— fixed in <short-sha>` tick is P1's sole record.

#### Scenario: P2 followups.md entry ticked with addendum note
- **GIVEN** P2 processing has created the addendum folder `<id>-addendum-1`
- **WHEN** the orchestrator ticks the `followups.md` entry
- **THEN** the entry reads `- [x] <original text> (routed to addendum <id>-addendum-1)`.

#### Scenario: P3 followups.md entry ticked with backlog note
- **GIVEN** P3 processing has appended the backlog row with slug `<slug>`
- **WHEN** the orchestrator ticks the `followups.md` entry
- **THEN** the entry reads `- [x] <original text> (deferred to backlog — <slug>)`.

#### Scenario: P1 followups.md entry is not annotated by the triage gate
- **GIVEN** the human selects P1 at the triage gate
- **WHEN** the orchestrator hands off to the implementer
- **THEN** the `followups.md` entry remains un-ticked (as before the triage); the
  implementer's standard `— fixed in <short-sha>` tick is the sole record.

### Requirement: workflow skill "After PR — the fix loop" section summarises the triage

The system MUST update `claude/skills/workflow/SKILL.md`'s "After PR — the fix
loop" section to summarise the triage gate and the three routing paths (P1/P2/P3)
so that a stage-command author reading `workflow` gets the full picture of the
post-PR flow. The summary MUST be accurate with respect to the triage gate
mechanics defined in the other requirements of this capability.

#### Scenario: workflow skill accurately reflects the three-path model
- **WHEN** a contributor reads `claude/skills/workflow/SKILL.md`'s
  "After PR — the fix loop" section
- **THEN** the section describes the triage gate and its three paths (P1 implement
  directly, P2 addendum, P3 defer to backlog), so the contributor understands the
  full post-PR flow without reading `followup.md`.
