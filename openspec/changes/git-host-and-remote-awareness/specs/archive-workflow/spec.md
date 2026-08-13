# Spec — archive-workflow

> Delta against `openspec/specs/archive-workflow/spec.md` for the
> `git-host-and-remote-awareness` change.
> Host resolution and archive branch naming now delegate to the shared
> `git-host-workflow` skill; a no-remote gate is added ahead of the archive
> push site.

## ADDED Requirements

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

## MODIFIED Requirements

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
