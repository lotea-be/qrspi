# Spec — qrspi-command-surface

> Delta against `openspec/specs/qrspi-command-surface/spec.md` for the
> `add-auto-mode` change. Tightens the bounded-artifact-write requirement to
> include a mandatory block-signal clause: the implementer subagent MUST return
> error/blocked (and MUST NOT commit) when lint, typecheck, or tests fail at a
> slice boundary, so that the orchestrator's "subagent errors or blocks" hard-stop
> covers the red-build case in auto mode.

## MODIFIED Requirements

### Requirement: Bounded artifact write delegated to stage subagent via Agent tool
Each stage command MUST delegate only the bounded artifact-writing job to its
stage subagent by spawning it via the Agent tool (`subagent_type: qrspi:<agent>`).
The subagent MUST return a condensed result (written paths + short summary). The
orchestrator MUST NOT inline the stage subagent's full prompt into its own body
or expand the subagent's work beyond the artifact write. Additionally, the
implementer subagent MUST return an error or blocked signal — and MUST NOT commit
the slice — when lint, typecheck, or tests fail at a slice boundary; this ensures
the orchestrator's "subagent errors or blocks" hard-stop fires in auto mode rather
than auto-committing a broken slice.

#### Scenario: orchestrator spawns subagent for the write only
- **GIVEN** a user invokes `/qrspi:research <id>`
- **WHEN** the precondition check passes
- **THEN** the orchestrator spawns the `qrspi:researcher` subagent via the Agent
  tool, waits for it to return `research.md` and a summary, and then runs the
  commit gate itself — the subagent is not asked to run the commit gate.

#### Scenario: subagent returns condensed result
- **WHEN** any stage subagent completes its artifact write
- **THEN** its final message contains the path(s) of the file(s) it wrote and
  a short summary (≤ 10 lines), not the full artifact content or gate dialogue.

#### Scenario: implementer signals blocked on a failing build
- **GIVEN** the Implement stage is running (in any mode) and the implementer
  subagent detects that lint, typecheck, or tests fail at a slice boundary
- **WHEN** the implementer reaches the end of that slice's work
- **THEN** it returns an error or blocked signal to the orchestrator and does NOT
  commit the slice — so that in Full or Semi-auto mode the orchestrator's
  hard-stop fires and the chain halts for human intervention.

#### Scenario: implementer does not commit a red slice
- **GIVEN** the implementer finishes coding a slice but `openspec validate` or
  the test suite reports failures
- **WHEN** the implementer would normally emit its "Files created/modified" result
- **THEN** it instead surfaces the failure details in its return message and
  marks the slice as blocked, leaving the working tree uncommitted.
