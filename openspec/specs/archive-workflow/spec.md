# archive-workflow Specification

## Purpose
TBD - created by archiving change archive-requires-merged-pr. Update Purpose after archive.
## Requirements
### Requirement: PR-merge gate blocks archival unless the linked PR is verified merged
`/qrspi:archive` MUST query the linked PR's live status via the host git CLI
and MUST hard-block delegation to the `openspec-archive-change` skill unless
that status is `merged`. The gate MUST always fetch and print the PR's number,
state, and URL first, and only then decide — a human MUST see the evidence for
the block before it is applied. The block MUST be unconditional and uniform
across every non-merged state (`open`, closed-unmerged): there is no override
and no per-state softening. This gate step runs as new step 3 in
`claude/commands/archive.md`, ordered after the existing inform-only
`followups.md` check (step 2) and before the skill delegation (renumbered step
4), so the followups warning remains visible even when the PR gate later
blocks. "Merged" is defined per host: GitHub `state == MERGED` (state alone is
authoritative — a squash-merge still reports `MERGED`); Azure DevOps
`status == completed`; GitLab `state == merged`.

#### Scenario: PR is still open
- **GIVEN** a change whose `pr.md` records PR #12
- **WHEN** `/qrspi:archive <id>` runs and the host CLI reports PR #12's state
  as `open`
- **THEN** the command prints PR #12's number, state (`open`), and URL, then
  hard-stops with a message naming the next step ("merge PR #12, then re-run
  `/qrspi:archive <id>`"), and does NOT delegate to the `openspec-archive-change`
  skill.

#### Scenario: PR was closed without merging
- **GIVEN** a change whose `pr.md` records a PR that was closed unmerged
- **WHEN** `/qrspi:archive <id>` runs and the host CLI reports the PR's state
  as closed-unmerged (GitHub `CLOSED`, Azure `abandoned`, or GitLab `closed`)
- **THEN** the command surfaces the state and hard-stops exactly as it does
  for an open PR — there is no softer path for a deliberately-abandoned change.

#### Scenario: PR is merged
- **GIVEN** a change whose `pr.md` records PR #12
- **WHEN** `/qrspi:archive <id>` runs and the host CLI reports PR #12's state
  as merged (GitHub `MERGED`, Azure `completed`, or GitLab `merged`)
- **THEN** the command prints the confirmed state and proceeds to delegate to
  the `openspec-archive-change` skill without asking for further confirmation.

### Requirement: Missing `pr.md` hard-blocks archival
`/qrspi:archive` MUST hard-block delegation to the `openspec-archive-change`
skill when `openspec/changes/<id>/pr.md` does not exist, and MUST tell the
user to record the PR via `/qrspi:pr` first. The gate MUST NOT re-derive a PR
number by searching the host for a branch match, and MUST NOT prompt the user
for an ad-hoc PR number to check for this run only. When `pr.md` exists but no
PR number can be extracted from it (tolerating drift: a `#<N>` token on the
`- **PR:** #<N>` line, or, failing that, a number parsed from a `URL:` /
`PR link:` line), the gate MUST show what was found in `pr.md` and hard-stop
asking the human to fix it — the same "never silently skip" posture as an
unreadable CLI response.

#### Scenario: pr.md absent
- **GIVEN** a change folder with no `pr.md` file
- **WHEN** `/qrspi:archive <id>` runs
- **THEN** the command hard-blocks before running any PR-status query and
  tells the user to run `/qrspi:pr <id>` first, without delegating to the
  `openspec-archive-change` skill.

#### Scenario: pr.md present but no PR number extractable
- **GIVEN** a `pr.md` whose PR reference line has drifted into a shape with no
  parseable `#<N>` token and no parseable URL-derived number
- **WHEN** `/qrspi:archive <id>` runs
- **THEN** the command shows the human what it found in `pr.md`, hard-stops,
  and asks the human to fix `pr.md` rather than guessing a PR number.

### Requirement: Host CLI and status-query command are resolved host-agnostically
The PR-merge gate MUST resolve the host CLI and the exact status-query
command by delegating to the shared `git-host-workflow` skill's vendor
resolution procedure (cheatsheet `Git host` override wins, else live-derive
from repo signals: a GitHub remote or `.github/` directory selects `gh`;
`azure-pipelines.yml` selects `az repos`; `.gitlab-ci.yml` selects `glab`;
default `gh` when signals are ambiguous or absent). This mirrors how `pr.md`
already generalizes PR *creation* across hosts, and preserves GitLab
coverage — no regression from the pre-change three-way inference. The query
MUST be invoked as a Bash-tool call at runtime, not as literal
shell-injection syntax in the command body.

#### Scenario: stack-cheatsheet documents the status-query line
- **GIVEN** a project stack-cheatsheet whose `## PR & git workflow` section
  sets `Git host: Azure DevOps`
- **WHEN** the gate runs
- **THEN** it uses `az repos` per the skill's override-first resolution,
  without re-deriving from repo signals.

#### Scenario: no stack-cheatsheet exists
- **GIVEN** a repo with no project-scope stack-cheatsheet skill
- **WHEN** the gate runs
- **THEN** the skill infers the host CLI from repo signals (GitHub
  remote/`.github/` → `gh`; `azure-pipelines.yml` → `az repos`;
  `.gitlab-ci.yml` → `glab`), defaulting to `gh` if none of the signals
  match.

#### Scenario: GitLab signal resolves to glab via the shared skill
- **GIVEN** a repo whose only host signal is `.gitlab-ci.yml`
- **WHEN** the gate runs
- **THEN** the skill resolves the vendor to `glab` and the gate proceeds
  using GitLab's PR-status-query command — GitLab coverage is preserved
  exactly as before this change.

### Requirement: CLI unavailable or unauthenticated hard-stops with actionable guidance
`/qrspi:archive` MUST hard-stop with an actionable message when the resolved
host CLI is not installed, or when the status query fails on an authentication
error — the message MUST name the specific fix (e.g. "run `gh auth login`,
then re-run `/qrspi:archive <id>`"). The check MUST NEVER be silently skipped —
a skip would defeat the purpose of the gate. This hard-stop MUST be worded distinctly
from the non-merged-state hard-stop (Requirement: PR-merge gate blocks
archival...) so the human can tell "the query failed" apart from "the query
succeeded and the PR isn't merged."

#### Scenario: host CLI not authenticated
- **GIVEN** the resolved host CLI is installed but not logged in
- **WHEN** `/qrspi:archive <id>` runs the status query and it fails on an
  auth error
- **THEN** the command hard-stops with a message naming the CLI and the
  auth-fix command (e.g. `gh auth login`), and does NOT proceed to the skill
  delegation or silently treat the PR as unverified-but-mergeable.

#### Scenario: host CLI not installed
- **GIVEN** the resolved host CLI binary is not present on the system
- **WHEN** `/qrspi:archive <id>` runs
- **THEN** the command hard-stops naming the missing CLI and instructing the
  human to install/authenticate it before re-running.

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

### Requirement: The archive commit target is proposed — a new branch or straight to main
`/qrspi:archive` MUST propose the archive commit's target to the human
rather than silently committing to the current branch. This is because it
runs after the PR has merged (the human is typically on `main`) and the
archive syncs the change's delta specs into `openspec/specs/` — a
reviewable content change. After staging the archive changes and before
committing, and after the `git-host-workflow` no-remote check (see
**Requirement: Archive push site is gated by the shared no-remote check**),
it MUST offer two options when a remote is present, defaulting to the
new-branch path:
- **New branch + push (open a PR)** — the default: create a branch named per
  the `git-host-workflow` skill's `archive` branch-naming slot (default
  `chore/archive-<id>`, overridable via the cheatsheet's `Branch naming`
  sub-block) off the current HEAD, commit the staged archive changes there,
  `git push -u`, and then run the auto-create PR gate defined in
  **Requirement: Archive PR is auto-created on the new-branch path**.
- **Commit straight to main** — commit and push on the current branch; no PR
  is created on this path.

Both paths MUST use the identical staged paths, commit message
(`chore(<id>): archive change + remove backlog row`), and non-zero-git-exit
hard-stop defined in the **Requirement: Successful archive removes the
backlog row atomically with the folder move**. The branch name MUST be
resolved via the skill's `archive` slot — not prompted, except when the
cheatsheet lacks the slot entirely, in which case the skill's prompt-once +
write-back fallback applies. The proposal MUST always be shown — it is a
genuine target decision, not a suppressible confirmation.

#### Scenario: human chooses a new branch
- **GIVEN** a merged-PR change whose folder was moved and backlog row
  removed, with the archive changes staged on the current branch (e.g.
  `main`), and a remote is configured
- **WHEN** `/qrspi:archive <id>` proposes the commit target and the human
  chooses the new-branch option
- **THEN** the command creates a branch named per the skill's `archive` slot
  (default `chore/archive-<id>`) off the current HEAD, commits the staged
  changes there with `chore(<id>): archive change + remove backlog row`,
  pushes with `-u`, and proceeds to the auto-create PR gate (not printing the
  create command as the sole next step).

#### Scenario: human chooses to commit straight to main
- **GIVEN** the same staged archive changes
- **WHEN** the human chooses "commit straight to main"
- **THEN** the command commits the staged changes on the current branch and
  pushes, exactly as the atomic-commit requirement describes, without
  creating a new branch or opening a PR.

#### Scenario: cheatsheet overrides the archive slot default
- **GIVEN** a `Branch naming` sub-block with `archive: release/archive-<id>`
- **WHEN** `/qrspi:archive <id>` resolves the new-branch name for change
  `add-widget`
- **THEN** the branch is named `release/archive-add-widget`, not
  `chore/archive-add-widget`.

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

### Requirement: Archive PR is auto-created on the new-branch path
`/qrspi:archive` MUST, after a successful `git push -u origin chore/archive-<id>`,
run a mode-aware PR-create gate using the host CLI already resolved in step 3
(no re-detection) and with the archive commit message as the title only
(`chore(<id>): archive change + remove backlog row`), an empty body, and the
repo's default branch (from the stack-cheatsheet `## PR & git workflow` block)
as the target — mirroring the PR-create step in `/qrspi:pr`. In Full or Semi
auto mode the gate MUST skip the AskUserQuestion and run the create command
directly. In Manual mode the gate MUST present an AskUserQuestion with question
"The archive branch is pushed. Create the archive PR now, or show the command
first?" and choices `["Create the PR now", "Show me the command first -- I'll
create it manually"]`; on "Create the PR now" the command MUST run the create
command; on "Show me the command first" the command MUST print the resolved
create command and NOT run it. When the create command succeeds, the command
MUST capture the PR number and URL from the command's stdout and report them in
the step-6 completion summary. When the create command fails (non-zero exit),
the command MUST NOT hard-stop; it MUST instead print the resolved create
command for manual use and note in the step-6 summary that the branch was pushed
but the PR was not auto-created.

#### Scenario: Full auto mode — PR created without prompt
- **GIVEN** Full auto mode is active and the archive branch has been pushed
  successfully
- **WHEN** `/qrspi:archive <id>` reaches the PR-create gate on the new-branch
  path
- **THEN** the command runs the host PR-create command directly without
  presenting an AskUserQuestion, captures the PR number and URL from stdout,
  and reports them in step 6 (`#<N>` and URL).

#### Scenario: Manual mode — human chooses Create the PR now
- **GIVEN** Manual mode is active and the archive branch has been pushed
  successfully
- **WHEN** `/qrspi:archive <id>` reaches the PR-create gate and the human
  selects "Create the PR now"
- **THEN** the command runs the host PR-create command, captures the PR number
  and URL from stdout, and reports them in the step-6 completion summary.

#### Scenario: Manual mode — human chooses Show me the command first
- **GIVEN** Manual mode is active and the archive branch has been pushed
  successfully
- **WHEN** the human selects "Show me the command first -- I'll create it
  manually"
- **THEN** the command prints the resolved host PR-create command (title,
  empty body, default-branch target) and does NOT run it; step 6 reports
  that the branch was pushed and the PR was not auto-created, and prints the
  command for reference.

#### Scenario: PR-create command fails — graceful degrade
- **GIVEN** the archive branch was pushed successfully and the PR-create gate
  ran the create command (Full/Semi auto or Manual "Create now")
- **WHEN** the host PR-create command returns a non-zero exit code
- **THEN** the command does NOT hard-stop; it prints the resolved create
  command for manual use, and step 6 reports "branch pushed, PR not
  auto-created" — the archive commit itself is presented as having succeeded.

### Requirement: Archive push site is gated by the shared no-remote check
`/qrspi:archive` MUST run the `git-host-workflow` skill's live remote-presence
check before attempting the new-branch push in **Requirement: The archive
commit target is proposed — a new branch or straight to main**. When no
remote is configured, the command MUST NOT offer the "new branch + push"
option; it MUST instead present the "commit straight to main" option
alongside the skill's no-remote local menu (local branch / patch /
commit-to-current) and its human-confirmed merge-back, in place of the push
path. This is distinct from the pre-existing "no linked PR" hard-block,
which still applies to a with-remote change that was never PR'd.

#### Scenario: no-remote repo skips the new-branch-push option
- **GIVEN** a repo with no configured git remote and a merged-PR-gate-passed
  change ready to archive
- **WHEN** `/qrspi:archive <id>` reaches the commit-target proposal step
- **THEN** it does not offer "new branch + push (open a PR)"; it offers
  "commit straight to main" and the no-remote local menu instead.

#### Scenario: remote-present repo behaves unchanged
- **GIVEN** a repo with a configured `origin` remote
- **WHEN** `/qrspi:archive <id>` reaches the commit-target proposal step
- **THEN** both options ("new branch + push" and "commit straight to main")
  are offered exactly as before this change.

### Requirement: The PR-merge gate is skipped for a local-only (no-remote) change
Before the PR-merge gate reads `pr.md`, `/qrspi:archive` MUST run the
`git-host-workflow` skill's live remote-presence check. When no remote is
configured, the change is local-only — no PR exists to verify (the no-remote
`/qrspi:pr` flow records no `pr.md`) — so the command MUST skip the PR-merge
gate entirely (it MUST NOT hard-stop on a missing `pr.md`) and proceed to the
delta-spec sync and folder move, archiving via the commit-straight-to-main /
no-remote local path. When a remote IS present, the PR-merge gate applies
unchanged, including the "no linked PR" hard-block for a with-remote change
that was never PR'd. The two conditions are distinct: no-remote skips the
gate; with-remote-but-no-PR hard-blocks.

#### Scenario: no-remote change skips the PR-merge gate
- **GIVEN** a repo with no configured git remote and a change taken through
  the local-only flow (no `pr.md` recorded)
- **WHEN** `/qrspi:archive <id>` runs
- **THEN** it detects no remote, skips the PR-merge gate (no hard-stop on the
  missing `pr.md`), and proceeds to sync the delta specs and move the folder,
  committing the archive straight to the default branch with no push.

#### Scenario: with-remote change with no PR still hits the no-linked-PR block
- **GIVEN** a repo with a configured remote but no `pr.md`
- **WHEN** `/qrspi:archive <id>` runs
- **THEN** it hits the existing "no linked PR" hard-block — the no-remote
  skip does NOT apply because a remote is present.

