# Spec — qrspi-command-surface

> Delta against `openspec/specs/qrspi-command-surface/spec.md` for the
> `unify-implement-paths-on-variants` change.
> Adds the cwd/change-folder invariant note to all eleven change-folder-resolving
> commands; leaves the four non-resolving commands (init, stack, status, update)
> unchanged.

## ADDED Requirements

### Requirement: All eleven change-folder-resolving commands carry a cwd/change-folder note
The system MUST add a one-line cwd/change-folder invariant note to the body of
each of the eleven QRSPI command files that resolve `openspec/changes/<id>/`:
`claude/commands/questions.md`, `research.md`, `design.md`, `structure.md`,
`slices.md`, `plan.md`, `implement.md`, `pr.md`, `followup.md`, `archive.md`,
and `retro.md`. The note MUST be placed immediately after each file's
Glob/precondition line. The note MUST read (verbatim):

> Resolve `openspec/changes/<id>/…` against the **current working repo root**
> (the consumer's CWD), not the plugin install directory -- the change folder
> lives in the repo you are running the command in.

The four non-resolving commands -- `init.md`, `stack.md`, `status.md`, and
`update.md` -- MUST NOT carry this note (they do not Glob a specific change
folder). The note MUST appear in all eleven files in the same change, not
selectively.

#### Scenario: questions.md carries the cwd note after the precondition line
- **WHEN** `claude/commands/questions.md` is read after the change ships
- **THEN** a line matching the verbatim cwd note appears immediately after the
  Glob/precondition block.

#### Scenario: implement.md carries the cwd note
- **WHEN** `claude/commands/implement.md` is read after the change ships
- **THEN** the cwd/change-folder note is present immediately after the
  Glob/precondition line.

#### Scenario: followup.md carries the cwd note
- **WHEN** `claude/commands/followup.md` is read after the change ships
- **THEN** the cwd/change-folder note is present immediately after the
  Glob/precondition line.

#### Scenario: all eleven files carry the note, none of the four excluded files do
- **WHEN** each of the fifteen QRSPI command files is read after the change ships
- **THEN** the eleven change-folder-resolving commands each contain the verbatim
  cwd note, and the four excluded commands (`init.md`, `stack.md`, `status.md`,
  `update.md`) do NOT contain it.

#### Scenario: note wording matches the approved verbatim text
- **WHEN** any of the eleven command files is read
- **THEN** the note reads exactly: "Resolve `openspec/changes/<id>/…` against
  the **current working repo root** (the consumer's CWD), not the plugin install
  directory -- the change folder lives in the repo you are running the command in."
