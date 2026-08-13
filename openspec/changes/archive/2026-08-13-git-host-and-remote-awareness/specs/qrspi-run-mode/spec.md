# Spec — qrspi-run-mode

> Delta against `openspec/specs/qrspi-run-mode/spec.md` for the
> `git-host-and-remote-awareness` change.
> Generalizes the PR-create auto-advance step to a host-agnostic command
> resolved via the shared `git-host-workflow` skill, and adds no-remote
> gating for push-based auto-advance.

## ADDED Requirements

### Requirement: No-remote gating applies to push-based auto-advance in Full and Semi-auto mode
The orchestrator MUST, in Full or Semi-auto mode and before any push-based
auto-advance step (the Questions-stage branch push, the Implement-stage
per-slice push, or the PR-create step), run the `git-host-workflow` skill's
live remote-presence check. When no remote is configured, the orchestrator
MUST NOT treat the absent push as a `git push` hard-stop failure; it MUST
instead auto-follow the skill's no-remote local flow (local branch / patch /
commit-to-current, whichever the flow's default non-interactive choice is
for that push site) and continue the chain, recording that the run is
local-only. The merge-back confirmation offered by the no-remote flow
remains a human-confirmed step and is NEVER auto-advanced, even in Full
auto mode.

#### Scenario: Full auto mode on a remoteless repo does not hard-stop
- **GIVEN** Full auto mode is active and the working repo has no configured
  git remote
- **WHEN** the orchestrator reaches the Questions-stage branch-push step
- **THEN** it runs the skill's remote-presence check, detects no remote, and
  follows the no-remote local flow instead of attempting `git push` or
  raising a git-push hard-stop.

#### Scenario: merge-back confirmation is never auto-advanced
- **GIVEN** Full auto mode is active and a no-remote local flow reaches the
  merge-back step
- **WHEN** the orchestrator would otherwise auto-advance
- **THEN** it still presents the human-confirmed merge-back `AskUserQuestion`
  and waits for a response — this gate is never suppressed by run-mode.

## MODIFIED Requirements

### Requirement: PR-create is auto-executed in Full and Semi-auto mode
In Full or Semi-auto mode the orchestrator MUST auto-execute the PR-create
step — the host PR-create command resolved via the `git-host-workflow`
skill's vendor resolution (e.g. `gh pr create`, `az repos pr create`, or
`glab mr create`, depending on the resolved vendor) — without asking "Create
the PR now or show me the description first?". The human code review itself
is NEVER suppressed. Before running the PR-create command, the orchestrator
MUST run the skill's live remote-presence check; on no-remote it MUST follow
the no-remote local flow instead of attempting PR creation.

#### Scenario: Full auto PR stage auto-creates the PR
- **GIVEN** Full auto mode is active, a remote is configured, and the
  reviewer subagent has returned the PR description
- **WHEN** the orchestrator processes the PR-create step
- **THEN** it runs the resolved host PR-create command with the prepared
  title and body without asking the human first, and records the PR URL in
  `openspec/changes/<id>/pr.md`.

#### Scenario: Full auto PR stage resolves the correct command on GitLab
- **GIVEN** Full auto mode is active and the `git-host-workflow` skill
  resolves the vendor to GitLab (`glab`)
- **WHEN** the orchestrator processes the PR-create step
- **THEN** it runs the GitLab PR-create command from the skill's lookup
  table, not a hardcoded `gh pr create` call.
