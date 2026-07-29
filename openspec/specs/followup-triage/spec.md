# followup-triage Specification

## Purpose
Upfront triage gate in `/qrspi:followup` that classifies each targeted
follow-up item, proposes a routing path (P1/P2/P3), requires human
confirmation, and routes to one of three wired execution paths before the
implementer is ever spawned.

## Requirements
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
- **GIVEN** the human selects "P2 — amend this change in place" at the triage gate
- **WHEN** the orchestrator processes the triage answer
- **THEN** the implementer subagent is NOT spawned; the orchestrator amends the
  parent change in place (design.md/delta specs, plus a new slice group) and
  offers to run `/qrspi:implement <id>`.

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
"P2 — amend this change in place (extend the open PR)",
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
  "P2 — amend this change in place (extend the open PR)",
  "P3 — defer to backlog idea (new scope)".

#### Scenario: triage gate fires in Full auto mode
- **GIVEN** Full auto mode is active and `/qrspi:followup <id>` is running
- **WHEN** the preconditions pass and the orchestrator reaches the triage gate
- **THEN** the `AskUserQuestion` is presented to the human — it is NOT
  auto-advanced or skipped.

#### Scenario: human override changes the routing path
- **GIVEN** the orchestrator proposed P1 but the human selects "P2 — amend this
  change in place"
- **WHEN** the orchestrator processes the answer
- **THEN** the P2 in-place amendment mechanics execute; the P1 implementer spawn
  does NOT occur.

### Requirement: P1 path is identical to today's implementer flow
On P1, the system MUST spawn the appropriate `qrspi:implementer-<effort>`
effort-variant subagent in FIX MODE, selecting the variant from the optional
inline `(compute: effort=<low|medium|high>)` token in the follow-up description
using the same mapping as the normal slice path (`low` → `qrspi:implementer-low`,
`medium` → `qrspi:implementer-medium`, `high` → `qrspi:implementer-high`). When
the `effort=` token is absent, the system MUST default to
`qrspi:implementer-medium`. The `model:` threading is unchanged: the orchestrator
still passes the parsed `model=` value (or the `sonnet` default) as the explicit
`model:` parameter on the Agent tool call. The P1 path MUST NOT spawn the bare
`qrspi:implementer` base agent (which is deleted). The P1 path MUST NOT add any
new annotation to the `followups.md` entry; the existing `-- fixed in <short-sha>`
tick at completion remains the sole record. The triage adds no new steps or side
effects to P1 beyond the gate itself.

#### Scenario: P1 chosen with no effort token defaults to implementer-medium
- **WHEN** the human selects "P1 -- implement directly" at the triage gate and
  the follow-up description contains no `(compute: effort=…)` token
- **THEN** the `qrspi:implementer-medium` subagent is spawned in FIX MODE with
  `model: sonnet` on the Agent call.

#### Scenario: P1 chosen with explicit effort=high spawns implementer-high
- **WHEN** the human selects "P1 -- implement directly" and the follow-up
  description contains `(compute: effort=high)`
- **THEN** the `qrspi:implementer-high` subagent is spawned in FIX MODE.

#### Scenario: P1 chosen with explicit effort=low spawns implementer-low
- **WHEN** the human selects "P1 -- implement directly" and the follow-up
  description contains `(compute: effort=low)`
- **THEN** the `qrspi:implementer-low` subagent is spawned in FIX MODE.

#### Scenario: bare qrspi:implementer is never spawned on the P1 path
- **WHEN** `/qrspi:followup <id>` is invoked in FIX MODE (P1) under any
  effort setting
- **THEN** the Agent tool call targets `qrspi:implementer-low`,
  `qrspi:implementer-medium`, or `qrspi:implementer-high` — never the bare
  `qrspi:implementer` stem.

#### Scenario: model: threading is unchanged on P1
- **WHEN** a follow-up description contains `(compute: model=opus effort=high)`
  and the human selects P1
- **THEN** `qrspi:implementer-high` is spawned with `model: opus` on the Agent
  call, identical to the existing model-threading behaviour.

### Requirement: P2 amends the parent change in place

On P2, the system MUST amend the parent change in place — it MUST NOT create a
separate change folder. The mechanics mirror `implement.md`'s "Adding scope after
stage I has started" flow: the orchestrator edits the affected `design.md` `Dn`
decision and/or the change's delta `specs/**` in place (adding or adjusting the
requirement + scenarios), then adds a new `## N.` vertical-slice group to
`slices.md` AND a matching `## N.` group to `tasks.md`, each carrying a
`**Model:**` annotation. The amendment MUST stay on the parent change's current
branch and extend the open PR — the system MUST NOT create a new branch and MUST
NOT open a separate PR. The orchestrator MUST NOT re-run `/qrspi:design` (or any
stage command) on the parent, since that would overwrite the approved artifact;
it MAY spawn a `qrspi:designer` subagent only to draft a design-level edit. The
orchestrator MUST NOT spawn the implementer to triage a P2 follow-up.

#### Scenario: design re-alignment follow-up adds a slice to the parent
- **GIVEN** P2 is chosen for a follow-up that requires revising a `design.md` Dn
  decision
- **WHEN** the orchestrator processes the P2 path
- **THEN** it edits the affected `design.md` decision and/or delta `specs/**` in
  place and adds a matching `## N.` slice group to both `slices.md` and
  `tasks.md`, with no separate change folder created.

#### Scenario: P2 amendment stays on the parent branch and PR
- **GIVEN** P2 processing edits the approved artifacts and adds the slice group
- **WHEN** the orchestrator commits the amendment
- **THEN** it stays on the parent change's current branch — no `git checkout -b`
  and no new PR — so the amendment's commits extend the open PR.

#### Scenario: P2 does not re-run the stage command or spawn the implementer to triage
- **GIVEN** the human selects P2 at the triage gate
- **WHEN** the orchestrator amends the parent change in place
- **THEN** it does NOT re-run `/qrspi:design` (or any stage command) and does NOT
  spawn the implementer to perform the triage; it edits the approved artifacts
  directly.

### Requirement: P2 is only available while the parent PR is open

The system MUST route a follow-up to P2 only when the parent PR is still open —
there must be an open PR for the in-place amendment to extend. When the parent PR has
already merged, or the work would otherwise require its own branch or PR (e.g.
divergent, question- or research-shaped scope), the system MUST propose P3
(defer to backlog) instead of P2. A backlog idea created this way SHOULD relate
back to the parent change.

#### Scenario: merged parent PR routes re-alignment to P3
- **GIVEN** a follow-up that needs design re-alignment but the parent PR has
  already merged
- **WHEN** the triage gate proposes a path
- **THEN** it proposes P3 (defer to backlog), because there is no open PR for a
  P2 in-place amendment to extend.

### Requirement: least-friction end-of-turn offers

The system MUST offer the obvious next action as an `AskUserQuestion` rather than
merely printing a command for the human to copy. After a P2 amendment, the system
MUST offer to run `/qrspi:implement <id>` now (choices: run now, or not now); on
"run now" it re-enters `/qrspi:implement <id>` as a slash command in the main
loop rather than spawning the implementer directly. After any path (P1, P2, or
P3) completes its disposition, if one or more un-ticked (`- [ ]`) entries remain
in `followups.md`, the system MUST offer to handle the next follow-up (choices:
handle next, or stop); on "handle next" it re-enters `/qrspi:followup <id>`. The
system MUST NOT merely print a command for these next actions.

#### Scenario: after P2 the system offers to implement now
- **GIVEN** a P2 amendment has added slice N and committed
- **WHEN** the disposition completes
- **THEN** the system presents an `AskUserQuestion` offering to run
  `/qrspi:implement <id>` now (not merely a printed command); accepting re-enters
  `/qrspi:implement <id>` in the main loop.

#### Scenario: after any path the system offers the next follow-up
- **GIVEN** a P1, P2, or P3 disposition has completed and un-ticked follow-up
  entries remain in `followups.md`
- **WHEN** the orchestrator reaches the end of the turn
- **THEN** it presents an `AskUserQuestion` offering to handle the next follow-up
  (not merely a printed command); accepting re-enters `/qrspi:followup <id>`.

#### Scenario: no remaining follow-ups skips the next-follow-up offer
- **GIVEN** a disposition has completed and no un-ticked entries remain in
  `followups.md`
- **WHEN** the orchestrator reaches the end of the turn
- **THEN** it skips the next-follow-up offer and ends the turn.

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
`- [ ]` to `- [x]` and appending a parenthetical note (ASCII `--`):
- P2: `(re-aligned in place -- slice N)`
- P3: `(deferred to backlog — <slug>)`

The tick MUST be written in the same commit as the other P2/P3 side effects (P2:
the in-place artifact edits + new slice group; P3: backlog row). A P1 fix MUST
NOT receive this annotation; the standard `— fixed in <short-sha>` tick is P1's
sole record.

#### Scenario: P2 followups.md entry ticked with in-place note
- **GIVEN** P2 processing has amended the parent change in place, adding slice N
- **WHEN** the orchestrator ticks the `followups.md` entry
- **THEN** the entry reads `- [x] <original text> (re-aligned in place -- slice N)`.

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
  directly, P2 amend this change in place, P3 defer to backlog), so the contributor
  understands the full post-PR flow without reading `followup.md`.

### Requirement: Context-budget nudge fires at most once per followup invocation
The system MUST enforce that when `/qrspi:followup <id>` embeds the
`context-budget-gate` skill, any context-budget nudge that fires during that
invocation fires exactly once for the entire invocation -- regardless of how many
follow-up items are processed in that session. The skill MUST NOT re-evaluate the
nudge trigger between individual follow-up items within a single `/qrspi:followup`
call.

#### Scenario: multi-item invocation fires the nudge at most once
- **WHEN** `/qrspi:followup <id>` processes multiple follow-up items in one
  invocation and the nudge threshold is crossed during that session
- **THEN** the nudge advisory notice appears at most once; it does NOT re-fire
  between follow-up items within the same invocation.

#### Scenario: nudge already fired on a prior command does not re-fire in followup
- **WHEN** the nudge-level session flag was set during an earlier stage command
  and `/qrspi:followup <id>` is then invoked
- **THEN** the followup invocation finds the nudge-level flag already held and
  produces no advisory notice.
