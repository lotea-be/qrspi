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
The PR-merge gate MUST resolve the host CLI and the exact status-query command
from the project's stack-cheatsheet `## PR & git workflow` section when that
section documents a status-query line, mirroring how `pr.md` already
generalizes PR *creation* across hosts. When no stack-cheatsheet exists, or an
existing one lacks a status-query line, the gate MUST infer the host from repo
signals — a GitHub remote or `.github/` directory selects `gh`;
`azure-pipelines.yml` selects `az repos`; `.gitlab-ci.yml` selects `glab` — and
MUST default to `gh` when signals are ambiguous or absent. The query MUST be
invoked as a Bash-tool call at runtime, not as literal shell-injection syntax
in the command body.

#### Scenario: stack-cheatsheet documents the status-query line
- **GIVEN** a project stack-cheatsheet whose `## PR & git workflow` section
  includes both the PR-create line and the PR-status-query line
- **WHEN** the gate runs
- **THEN** it uses the documented status-query command and host CLI rather
  than falling back to repo-signal inference.

#### Scenario: no stack-cheatsheet exists
- **GIVEN** a repo with no project-scope stack-cheatsheet skill
- **WHEN** the gate runs
- **THEN** it infers the host CLI from repo signals (GitHub remote/`.github/`
  → `gh`; `azure-pipelines.yml` → `az repos`; `.gitlab-ci.yml` → `glab`),
  defaulting to `gh` if none of the signals match.

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
commit of its own. The commit MUST stage explicit paths only
(the new `openspec/changes/archive/YYYY-MM-DD-<id>/` tree, the deletion of the
old `openspec/changes/<id>/` path, and `openspec/backlog.md`) and MUST NEVER
use a repo-wide `git add -A`. The commit message MUST be
`chore(<id>): archive change + remove backlog row`. On any non-zero git exit
code, `/qrspi:archive` MUST hard-stop and surface the git error verbatim
rather than leaving the archive move uncommitted and unexplained. The *target*
of this commit is proposed to the human per the next requirement, not fixed to
the current branch.

#### Scenario: archive succeeds and commits atomically
- **GIVEN** the PR-merge gate confirmed `merged` and the `openspec-archive-change`
  skill moved the folder to `openspec/changes/archive/2026-07-10-<id>/`
- **WHEN** `/qrspi:archive <id>` runs its post-skill commit step
- **THEN** it removes the `<id>` row from `openspec/backlog.md`, stages the
  archived tree, the old-path deletion, and `openspec/backlog.md`, and creates
  one commit with message `chore(<id>): archive change + remove backlog row` —
  never a separate commit for the backlog edit and never `git add -A`.

#### Scenario: commit fails
- **GIVEN** the folder move succeeded and the backlog row was edited locally
- **WHEN** the `git commit` (or the subsequent `git push`) returns a non-zero
  exit code
- **THEN** `/qrspi:archive` hard-stops and surfaces the git error output
  verbatim, rather than silently leaving the working tree in a moved-but-
  uncommitted state.

### Requirement: The archive commit target is proposed — a new branch or straight to main
`/qrspi:archive` MUST propose the archive commit's target to the human rather
than silently committing to the current branch. This is because it runs after
the PR has merged (the human is typically on `main`) and the archive syncs the
change's delta specs into `openspec/specs/` — a reviewable content change. After
staging the archive changes and before committing, it MUST offer two options,
defaulting to the new-branch path:
- **New branch + push (open a PR)** — the default: create a `chore/archive-<id>`
  branch off the current HEAD, commit the staged archive changes there, `git
  push -u`, and surface the host PR-create command as the suggested next step.
- **Commit straight to main** — commit and push on the current branch.

Both paths MUST use the identical staged paths, commit message
(`chore(<id>): archive change + remove backlog row`), and non-zero-git-exit
hard-stop defined in the previous requirement. The branch name MUST be
`chore/archive-<id>` (not prompted). The proposal MUST always be shown — it is a
genuine target decision, not a suppressible confirmation.

#### Scenario: human chooses a new branch
- **GIVEN** a merged-PR change whose folder was moved and backlog row removed,
  with the archive changes staged on the current branch (e.g. `main`)
- **WHEN** `/qrspi:archive <id>` proposes the commit target and the human
  chooses the new-branch option
- **THEN** the command creates `chore/archive-<id>` off the current HEAD,
  commits the staged changes there with `chore(<id>): archive change + remove
  backlog row`, pushes with `-u`, and prints the host PR-create command as the
  next step.

#### Scenario: human chooses to commit straight to main
- **GIVEN** the same staged archive changes
- **WHEN** the human chooses "commit straight to main"
- **THEN** the command commits the staged changes on the current branch and
  pushes, exactly as the atomic-commit requirement describes, without creating a
  new branch.

