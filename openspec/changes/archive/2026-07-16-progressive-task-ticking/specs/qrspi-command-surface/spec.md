# Spec — qrspi-command-surface

> Delta against `openspec/specs/qrspi-command-surface/spec.md` for the
> `progressive-task-ticking` change. Adds an immediate per-task ticking
> requirement to the implementer's execution protocol.

## ADDED Requirements

### Requirement: Implementer ticks each task checkbox immediately after confirmation
The implementer MUST tick each `tasks.md` checkbox immediately after confirming
that task's output is correct and before starting the next task. Each tick MUST
be persisted as its own edit to `tasks.md` — ticks MUST NOT be batched to the
end of the slice. Commits and human checkpoints remain at slice granularity and
are unaffected by the per-task ticking cadence.

#### Scenario: single task ticked before next task begins
- **GIVEN** the implementer is working through a slice with multiple tasks
- **WHEN** it confirms a task's output is correct
- **THEN** it immediately ticks that task's checkbox in `tasks.md` (as its own
  edit) before writing any code or making any tool call for the next task.

#### Scenario: interrupted slice preserves completed-task state
- **GIVEN** the implementer has confirmed and ticked tasks 1 and 2 of a
  three-task slice, then the session is interrupted before task 3 completes
- **WHEN** a human inspects `tasks.md` after the interruption
- **THEN** tasks 1 and 2 are already ticked in `tasks.md`, reflecting the
  durable incremental state at every completed task boundary.

#### Scenario: premature ticking is prohibited
- **GIVEN** the implementer has written code for a task but has not yet
  confirmed the output is correct
- **WHEN** the implementer evaluates whether to tick the task's checkbox
- **THEN** it does NOT tick the checkbox until it has confirmed the output is
  correct — the guard "once you have confirmed that task's output is correct"
  applies before each tick.

#### Scenario: commits remain at slice granularity despite per-task ticks
- **GIVEN** the implementer ticks checkboxes after each task within a slice
- **WHEN** the slice reaches its checkpoint
- **THEN** the git commit is issued once at the slice boundary, not after each
  individual task tick — ticking is immediate; committing stays at slice
  granularity.
