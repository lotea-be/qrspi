# Spec — archive-workflow

> Delta against `openspec/specs/archive-workflow/spec.md` for the
> `spec-sync-contract` change. Adds a command-owned sync step (step 4a) that
> spawns `spec-syncer` before the generated skill's folder-move, removes the
> happy-path sync prompt, and retains a narrow escape-hatch prompt.

## ADDED Requirements

### Requirement: archive step 4a spawns spec-syncer before the folder move
`/qrspi:archive` MUST, when delta specs are present under
`openspec/changes/<id>/specs/**/spec.md`, spawn `spec-syncer`
(`subagent_type: qrspi:spec-syncer`) with the change id as a new step 4a —
before delegating to the `openspec-archive-change` skill for the folder move.
The sync MUST run by default with no "Sync now / Archive without syncing"
prompt. After spec-syncer returns a `synced` signal, the command MUST proceed
to step 4b (folder move) without re-running sync. If no delta specs exist, the
command MUST skip step 4a entirely.

#### Scenario: delta specs present — sync runs before folder move
- **GIVEN** a change with at least one file under
  `openspec/changes/<id>/specs/**/spec.md`
- **WHEN** `/qrspi:archive <id>` reaches step 4a
- **THEN** the command spawns `spec-syncer` with `subagent_type:
  qrspi:spec-syncer`, waits for the `synced` result, then proceeds to the
  folder move — with no prompt asking the human whether to sync.

#### Scenario: no delta specs — step 4a skipped
- **GIVEN** a change folder with no files matching
  `openspec/changes/<id>/specs/**/spec.md`
- **WHEN** `/qrspi:archive <id>` runs
- **THEN** step 4a is skipped and the command proceeds directly to step 4b
  (folder move via the generated skill).

### Requirement: count-drop hard-stop surfaces the blocked requirement for human confirmation
`/qrspi:archive` MUST hard-stop when spec-syncer returns a
`blocked-on-count-drop` signal, surfacing the blocked requirement and its
pre/post counts to the human via AskUserQuestion and offering two choices:
confirm the intentional reduction (which re-spawns spec-syncer with the
"confirmed count-drop OK" flag for that requirement) or abort the archive. The
command MUST NOT proceed with the folder move while any count-drop block is
unresolved.

#### Scenario: human confirms count-drop — spec-syncer is re-spawned
- **GIVEN** spec-syncer returned `blocked-on-count-drop` naming requirement
  `Foo` with counts `3 -> 2`
- **WHEN** the human confirms the reduction is intentional
- **THEN** the command re-spawns spec-syncer from scratch, passing a
  "confirmed count-drop OK: Foo" flag, and proceeds to the folder move only
  after spec-syncer returns `synced`.

#### Scenario: human aborts on count-drop — archive halted
- **GIVEN** spec-syncer returned `blocked-on-count-drop`
- **WHEN** the human chooses to abort
- **THEN** the command halts without running the folder move; the change folder
  and base specs remain unchanged.

### Requirement: escape-hatch prompt offered only for malformed or abandoned deltas
`/qrspi:archive` MUST surface the failure description to the human and offer an
escape-hatch choice when spec-syncer returns an `escape-hatch` signal (delta is
malformed or fails `openspec validate <id> --strict`): archive without syncing,
or abort to fix the delta. This prompt MUST only appear in response to the
`escape-hatch` signal — it MUST NOT appear on the happy path (a `synced`
result) or on a `blocked-on-count-drop` result (which uses the count-drop
confirmation flow instead).

#### Scenario: escape-hatch signal from malformed delta offers archive-without-syncing
- **GIVEN** spec-syncer returned an `escape-hatch` signal describing a
  validation error
- **WHEN** `/qrspi:archive <id>` surfaces the error
- **THEN** the command asks the human: "Archive without syncing (escape hatch)?
  or Abort to fix the delta?" and does NOT proceed to the folder move until the
  human makes a choice.

#### Scenario: synced result — no escape-hatch prompt shown
- **GIVEN** spec-syncer returned a `synced` signal
- **WHEN** `/qrspi:archive <id>` receives the result
- **THEN** no escape-hatch prompt appears; the command proceeds directly to
  step 4b.

### Requirement: generated skill's own sync spawn is bypassed after step 4a
After step 4a pre-syncs the delta specs, `/qrspi:archive` MUST NOT allow the
`openspec-archive-change` skill to run a second sync. The command MUST instruct
the operator not to accept the skill's "Sync anyway" option if the skill raises
a sync prompt post-4a, and MUST hard-decline any such prompt. No second
`spec-syncer` or `general-purpose` sync spawn MUST occur.

#### Scenario: skill raises sync prompt after 4a — command hard-declines
- **GIVEN** step 4a has completed with a `synced` result
- **WHEN** the `openspec-archive-change` skill raises a sync-assessment prompt
  (offering "Sync now" or "Sync anyway")
- **THEN** the command declines the sync option and proceeds with the folder
  move only, so the main spec is not merged twice.

#### Scenario: skill finds already-synced branch and skips sync
- **GIVEN** step 4a has merged the delta specs into `openspec/specs/**`
- **WHEN** the `openspec-archive-change` skill runs its sync assessment
- **THEN** the skill's status logic detects the main spec already matches and
  presents its "already-synced" branch rather than offering a re-sync; the
  command proceeds with the folder move.

## MODIFIED Requirements

### Requirement: Successful archive removes the backlog row atomically with the folder move
`/qrspi:archive` MUST remove the change's row from `openspec/backlog.md` and
commit that removal in the same commit as the archived folder move, once the
`openspec-archive-change` skill's folder move succeeds and the PR was verified
merged — this MUST be a new explicit `git commit` step (the archive flow's
first), since the generated skill performs only a filesystem `mv` with no
commit of its own. The commit MUST stage explicit paths only (the new
`openspec/changes/archive/YYYY-MM-DD-<id>/` tree, the deletion of the old
`openspec/changes/<id>/` path, and `openspec/backlog.md`) and MUST NEVER use a
repo-wide `git add -A`. The commit message MUST be `chore(<id>): archive change
+ remove backlog row`. On any non-zero git exit code, `/qrspi:archive` MUST
hard-stop and surface the git error verbatim rather than leaving the archive
move uncommitted and unexplained. The *target* of this commit is proposed to the
human per the next requirement, not fixed to the current branch. The staged paths
MUST include the synced `openspec/specs/<capability>/spec.md` files updated by
step 4a, so the sync and the archive move land in the same atomic commit.

#### Scenario: archive succeeds and commits atomically
- **GIVEN** the PR-merge gate confirmed `merged`, step 4a synced the delta
  specs, and the `openspec-archive-change` skill moved the folder to
  `openspec/changes/archive/2026-07-10-<id>/`
- **WHEN** `/qrspi:archive <id>` runs its post-skill commit step
- **THEN** it removes the `<id>` row from `openspec/backlog.md`, stages the
  archived tree, the old-path deletion, the synced base spec files, and
  `openspec/backlog.md`, and creates one commit with message
  `chore(<id>): archive change + remove backlog row` — never a separate commit
  for the backlog edit and never `git add -A`.

#### Scenario: commit fails
- **GIVEN** the folder move succeeded and the backlog row was edited locally
- **WHEN** the `git commit` (or the subsequent `git push`) returns a non-zero
  exit code
- **THEN** `/qrspi:archive` hard-stops and surfaces the git error output
  verbatim, rather than silently leaving the working tree in a moved-but-
  uncommitted state.
