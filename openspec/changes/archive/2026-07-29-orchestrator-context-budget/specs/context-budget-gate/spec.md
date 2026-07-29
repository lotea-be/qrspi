# Spec — context-budget-gate

> New capability introduced by the `orchestrator-context-budget` change.
> An in-session counter and self-assessment gate that warns the orchestrator
> to reset context before quality degrades across long QRSPI sessions.

## ADDED Requirements

### Requirement: Skill ships as a named-loadable kit skill
The system MUST ship `claude/skills/context-budget-gate/SKILL.md` in the
`claude/skills/` directory (not `.claude/skills/`) so that it is available to
consumers as a named-loaded skill, auto-registered via the plugin, requiring no
`plugin.json` edit.

#### Scenario: skill is loadable by consumers after install
- **WHEN** a consumer invokes any of the 10 gate-scoped QRSPI commands and the
  command body loads skill `context-budget-gate`
- **THEN** `claude/skills/context-budget-gate/SKILL.md` is found, loaded, and
  its instructions are followed by the orchestrator.

#### Scenario: skill is not under the dev-tooling directory
- **WHEN** the kit's `claude/skills/` directory is inspected
- **THEN** `context-budget-gate/SKILL.md` is present in `claude/skills/` and
  NOT in `.claude/skills/`.

### Requirement: Gate is embedded in exactly 10 command files after the version check
The system MUST embed a load line for skill `context-budget-gate` in each of the
10 gate-scoped command files (`claude/commands/questions.md`, `research.md`,
`design.md`, `structure.md`, `slices.md`, `plan.md`, `implement.md`, `pr.md`,
`followup.md`, `archive.md`), positioned after the `qrspi-version-check` load
and before run-mode establishment. The three excluded commands (`status.md`,
`update.md`, `retro.md`) MUST NOT carry this embed.

#### Scenario: a gate-scoped command carries the embed in the correct position
- **WHEN** any of the 10 stage-and-followup command files is read after the
  change ships
- **THEN** an inline load line for skill `context-budget-gate` appears after the
  `qrspi-version-check` load and before the run-mode AskUserQuestion.

#### Scenario: archive.md carries the embed in the correct position
- **WHEN** `claude/commands/archive.md` is read after the change ships
- **THEN** the inline load line for skill `context-budget-gate` appears after
  the `qrspi-version-check` load and before any run-mode or precondition step.

#### Scenario: excluded commands do not carry the embed
- **WHEN** `claude/commands/status.md`, `update.md`, and `retro.md` are read
- **THEN** none of these files contains a load line for skill
  `context-budget-gate`.

### Requirement: In-context stage-event counter is incremented once per invocation
The skill MUST instruct each embedding command to increment an in-context
stage-event counter by 1 at the start of the invocation, after the session-flag
guard. The counter MUST be held entirely in the orchestrator's conversational
context with no disk file, no temp marker, and no config entry. If no counter is
held (first invocation of the session), the skill MUST initialise it to 1.

#### Scenario: counter starts at 1 on the first invocation
- **WHEN** a user starts a fresh session and invokes any gate-scoped command
  for the first time
- **THEN** the counter is initialised to 1; no prior value exists in context.

#### Scenario: counter increments on each subsequent invocation
- **WHEN** the orchestrator has already processed N gate-scoped command
  invocations in this session and a new one begins
- **THEN** the counter value becomes N + 1 before any threshold comparison.

#### Scenario: no disk artifact written for the counter
- **WHEN** a full Q through PR auto-chain runs to completion
- **THEN** no file, marker, or config entry containing the counter value exists
  in the repository after the run.

### Requirement: Dual-trigger gate fires on counter threshold OR qualitative self-assessment
The skill MUST instruct the orchestrator to evaluate two independent triggers after
each counter increment: (1) whether the counter has crossed a configured threshold,
and (2) whether the orchestrator's own qualitative self-assessment of its context
window indicates accumulation beyond comfortable operation. The gate MUST fire
when EITHER trigger fires, whichever crosses first.

#### Scenario: counter threshold fires before qualitative assessment
- **WHEN** the stage-event counter reaches the nudge threshold (8) and the
  orchestrator has not self-assessed any degradation
- **THEN** the nudge fires because the counter threshold was crossed first.

#### Scenario: qualitative self-assessment fires before counter threshold
- **WHEN** the stage-event counter is below 8 but the orchestrator assesses
  that its context window is heavily loaded with accumulated stage artifacts
- **THEN** the nudge fires because the qualitative trigger crossed first,
  regardless of the counter value.

### Requirement: Nudge fires once per session at or above 8 stage-events
The skill MUST define a nudge threshold of 8 stage-events. When the gate fires
at the nudge level (counter >= 8 or qualitative assessment), the skill MUST
print a one-line advisory notice suggesting a context reset, set a nudge-level
session flag, and proceed with the stage. The nudge MUST NOT issue an
AskUserQuestion. The nudge-level session flag MUST suppress the nudge on all
subsequent invocations in the same session.

#### Scenario: nudge fires once at 8 events and is then suppressed
- **WHEN** the stage-event counter reaches 8 and the nudge-level flag is not
  yet held
- **THEN** the skill prints a one-line advisory notice and sets the nudge-level
  session flag; the stage proceeds normally.

#### Scenario: nudge does not re-fire after the flag is set
- **WHEN** the nudge-level session flag is already held and a subsequent
  invocation reaches the nudge threshold
- **THEN** no advisory notice is printed; the stage proceeds silently.

#### Scenario: nudge produces no AskUserQuestion
- **WHEN** the nudge fires (counter at threshold, flag not yet held)
- **THEN** the orchestrator does NOT issue an AskUserQuestion; the stage
  continues without any user interaction for the nudge.

### Requirement: Soft gate fires once per session at or above 12 stage-events and is never suppressed by run-mode
The skill MUST define a soft-gate threshold of 12 stage-events. When the gate
fires at the soft-gate level (counter >= 12 or qualitative assessment), the skill
MUST issue an AskUserQuestion presenting a "Reset now" and "Continue anyway"
choice, set a soft-gate-level session flag on "Continue anyway", and proceed
without blocking if the human chooses to continue. The soft gate MUST fire in
Full auto, Semi-auto, and Manual run-modes without exception. On "Reset now" the
skill MUST print the self-contained resume path and end the turn without
auto-advancing to any next stage.

#### Scenario: soft gate fires in Full auto mode without suppression
- **WHEN** Full auto mode is active, the stage-event counter reaches 12, and
  the soft-gate flag is not yet held
- **THEN** the soft gate fires as an AskUserQuestion ("Reset now" / "Continue
  anyway"); it is NOT auto-advanced or skipped.

#### Scenario: soft gate fires in Manual mode
- **WHEN** Manual mode is active and the stage-event counter reaches 12
- **THEN** the soft gate fires as an AskUserQuestion identical to the Full auto
  case; the user must choose before the stage proceeds.

#### Scenario: Reset now ends the turn with a resume path
- **WHEN** the human selects "Reset now" at the soft-gate AskUserQuestion
- **THEN** the skill prints the self-contained resume one-liner naming `/clear`
  first (e.g. "Run `/clear`, then `/qrspi:<next-stage> <id>`") and ends the
  turn without auto-advancing to any next stage.

#### Scenario: Continue anyway sets the soft-gate flag and proceeds
- **WHEN** the human selects "Continue anyway" at the soft-gate AskUserQuestion
- **THEN** the skill sets the soft-gate-level session flag and the stage
  proceeds normally; no further soft-gate prompt appears in this session.

#### Scenario: soft gate does not re-fire after the flag is set
- **WHEN** the soft-gate session flag is already held and a subsequent
  invocation reaches the soft-gate threshold
- **THEN** no AskUserQuestion is issued; the stage proceeds silently.

### Requirement: The soft gate joins the workflow skill's Never-suppressed gates list
The system MUST update `claude/skills/workflow/SKILL.md`'s "Never-suppressed
gates" list to include the context-budget soft gate, with a note that it fires in
all run-modes and that "Reset now" prints the resume path and ends the turn
without auto-advancing.

#### Scenario: workflow skill lists the soft gate as never-suppressed
- **WHEN** a contributor reads the "Never-suppressed gates" section of
  `claude/skills/workflow/SKILL.md`
- **THEN** the context-budget soft gate is listed alongside the D review and
  backlog-capture offers, with a note that it cannot be suppressed in any
  run-mode.

### Requirement: Resume one-liner is self-contained and names /clear then the next stage
The skill MUST construct the reset resume one-liner to lead with `/clear` (the
lightweight in-place reset the human runs) followed by `/qrspi:<next-stage> <id>`
where `<next-stage>` is the stage the user was about to run and `<id>` is the
current change id. The one-liner MUST be sufficient for the user to reset and
resume without any additional context. An optional note that `/qrspi:status <id>`
is available for orientation MAY follow.

#### Scenario: reset one-liner for a mid-flow stage is actionable
- **WHEN** the soft gate fires during `/qrspi:implement my-change` and the user
  selects "Reset now"
- **THEN** the printed resume path names `/clear` first and then
  `/qrspi:implement my-change` (or the next slice equivalent), sufficient to
  reset in place and continue.

### Requirement: context-hygiene skill gains a Marathon anti-pattern subsection
The system MUST add a `## Marathon anti-pattern` subsection to
`claude/skills/context-hygiene/SKILL.md`. The subsection MUST use the vocabulary
"cross-stage within one session" (not "cross-change") and MUST include a 4th
mechanism bullet describing the context-budget-gate as one of the mechanisms
the kit uses to combat marathon sessions.

#### Scenario: context-hygiene skill contains the Marathon anti-pattern subsection
- **WHEN** `claude/skills/context-hygiene/SKILL.md` is read
- **THEN** a `## Marathon anti-pattern` (or equivalent subsection heading) is
  present, uses cross-stage-within-one-session framing, and contains at least
  4 mechanism bullets with the context-budget-gate listed among them.

### Requirement: Followup nudge fires once per invocation, not per item
The skill MUST instruct the orchestrator that when `/qrspi:followup` is the
embedding command, the context-budget nudge (if triggered) fires once per
invocation of `/qrspi:followup`, not once per follow-up item processed in that
invocation.

#### Scenario: multi-item followup session fires the nudge at most once
- **WHEN** `/qrspi:followup <id>` processes multiple follow-up items in one
  invocation and the nudge threshold is crossed
- **THEN** the nudge notice appears at most once for that invocation, not once
  per follow-up item.

### Requirement: Session flag guards prevent re-checking within a chained session
The skill MUST instruct each embedding command to check for the nudge-level and
soft-gate-level session flags before evaluating any threshold. If the applicable
flag is already held, the gate MUST return immediately without printing any notice
or issuing any AskUserQuestion. The flags MUST be held in the orchestrator's
conversational context only.

#### Scenario: second invocation after nudge fires proceeds silently
- **WHEN** the nudge fired on the 8th invocation and the nudge-level flag is
  now held, and a 9th invocation begins (counter < 12)
- **THEN** no advisory notice is printed; the stage proceeds without any nudge
  output.

#### Scenario: fresh session re-evaluates all thresholds
- **WHEN** a user starts a new session (after `/clear` or a new terminal) and
  invokes a gate-scoped command
- **THEN** no flags are held and the counter starts at 1; both thresholds are
  evaluated fresh.
