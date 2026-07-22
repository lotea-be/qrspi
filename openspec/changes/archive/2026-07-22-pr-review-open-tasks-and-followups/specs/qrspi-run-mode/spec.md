# Spec — qrspi-run-mode

> Delta against `openspec/specs/qrspi-run-mode/spec.md` for the
> `pr-review-open-tasks-and-followups` change.
> Adds the conditional hard-stop at the PR reconciliation gate: clean passes
> are suppressed silently in Full/Semi-auto; dirty passes fire a hard-stop
> rather than auto-advancing.

## ADDED Requirements

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
