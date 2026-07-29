# Spec — archive-workflow

> Delta against `openspec/specs/archive-workflow/spec.md` for the
> `orchestrator-context-budget` change.
> Adds a step-7 reset offer after a successful archive so the human can start
> a fresh session for the next change with low friction.

## ADDED Requirements

### Requirement: archive.md offers a new-session reset after a successful archive
`/qrspi:archive` MUST present a new step-7 AskUserQuestion after a successful
archive (folder moved, backlog row removed, commit pushed), asking "Start a new
session for the next change?" with choices: "Yes -- print resume path and end
turn" and "No -- stay in this session". On "Yes" the command MUST print
`/clear` (the lightweight in-place reset) followed by `/qrspi:status` as the
suggested starting point, then end the turn without auto-advancing. On "No"
the command ends the turn normally. The offer MUST always be shown after a
successful archive -- it is not suppressible in any run-mode.

#### Scenario: human selects Yes -- resume path printed and turn ends
- **GIVEN** a change has been successfully archived (commit pushed)
- **WHEN** `/qrspi:archive <id>` reaches step 7 and the human selects
  "Yes -- print resume path and end turn"
- **THEN** the command prints `/clear` then `/qrspi:status` (the fresh-session
  starting point) and ends the turn without invoking any further command or
  auto-advancing.

#### Scenario: human selects No -- turn ends normally
- **GIVEN** a change has been successfully archived
- **WHEN** the human selects "No -- stay in this session" at step 7
- **THEN** the command ends the turn without printing a resume path or taking
  any further action.

#### Scenario: reset offer fires in all run-modes
- **GIVEN** Full auto mode is active
- **WHEN** `/qrspi:archive <id>` reaches step 7 after a successful archive
- **THEN** the AskUserQuestion is presented regardless of run-mode -- it is
  NOT auto-advanced or suppressed.
