# git-host-workflow Specification

## Purpose
TBD - created by archiving change git-host-and-remote-awareness. Update Purpose after archive.
## Requirements
### Requirement: Shared skill centralizes vendor, remote, and branch-slot resolution
The kit MUST ship a procedure skill `claude/skills/git-host-workflow/SKILL.md`
that codifies, as numbered steps for a calling main-loop command to follow:
(1) a live remote-presence check, (2) vendor→CLI resolution plus a
vendor→CLI/PR-create/PR-status lookup table, (3) branch-slot resolution, and
(4) the no-remote local-only menu and merge-back procedure. The skill MUST
contain no `AskUserQuestion` call and no direct git/host-CLI invocation
itself — every such call MUST remain in the calling main-loop command body.
Both `claude/commands/pr.md` and `claude/commands/archive.md` MUST load this
skill instead of each re-deriving vendor or branch-name logic inline.

#### Scenario: skill contains no AskUserQuestion or bare git invocation
- **WHEN** `claude/skills/git-host-workflow/SKILL.md` is read
- **THEN** the file contains no `AskUserQuestion` tool call and no fenced
  shell-injection git/host-CLI command — only step-by-step derivation
  procedure text for a calling command to execute.

#### Scenario: pr.md and archive.md both load the skill
- **WHEN** `claude/commands/pr.md` and `claude/commands/archive.md` are read
- **THEN** each contains a `Load skill git-host-workflow` reference and
  follows its resolution procedure instead of embedding its own inline
  vendor-detection or branch-naming logic.

### Requirement: Vendor resolution is cheatsheet-override-first, else live-derived
The skill MUST resolve the git-host vendor in this order: if the project
stack-cheatsheet's `## PR & git workflow` block has a `Git host` field set,
that value MUST be used; otherwise the vendor MUST be live-derived from repo
signals at runtime (a GitHub remote or `.github/` directory selects `gh`;
`azure-pipelines.yml` selects `az repos`; `.gitlab-ci.yml` selects `glab`;
absent all three signals, default to `gh`). The cheatsheet field is a human
override, never a required cache — live derivation MUST run whenever the
field is unset.

#### Scenario: cheatsheet Git host field overrides live derivation
- **GIVEN** a stack-cheatsheet `## PR & git workflow` block with
  `Git host: GitLab`
- **WHEN** the skill resolves the vendor
- **THEN** it selects `glab` without re-deriving from repo signals, even if
  the repo also has a GitHub remote.

#### Scenario: no override — live-derive from repo signals
- **GIVEN** a stack-cheatsheet with no `Git host` field set
- **WHEN** the skill resolves the vendor and the repo has `azure-pipelines.yml`
- **THEN** it selects `az repos`.

#### Scenario: no signals match — default to gh
- **GIVEN** a repo with no `Git host` field, no GitHub remote/`.github/`, no
  `azure-pipelines.yml`, and no `.gitlab-ci.yml`
- **WHEN** the skill resolves the vendor
- **THEN** it defaults to `gh`.

### Requirement: Vendor coverage spans GitHub, Azure DevOps, and GitLab
The skill's vendor→CLI/PR-create/PR-status lookup table MUST cover exactly
three vendors: GitHub (`gh`), Azure DevOps (`az repos`), and GitLab (`glab`)
— the three vendors detected by the pre-existing `archive-workflow` host
inference. GitLab coverage MUST NOT regress relative to the pre-change
`archive.md` inline detector. Bitbucket MUST NOT be added to the table (out
of scope, deferred to the backlog).

#### Scenario: GitLab resolves to glab, not a stop
- **GIVEN** a repo whose only host signal is `.gitlab-ci.yml`
- **WHEN** the skill resolves the vendor and CLI
- **THEN** it selects `glab` and proceeds with the GitLab PR-create/PR-status
  commands from the lookup table — it does NOT hard-stop or treat GitLab as
  unsupported.

#### Scenario: Bitbucket is absent from the lookup table
- **WHEN** the skill's vendor→CLI lookup table is read
- **THEN** it lists exactly `gh`, `az repos`, and `glab` — no Bitbucket entry
  is present.

### Requirement: Remote presence is checked live and gates every push site
The skill MUST define a live `git remote` check (a Bash-tool call at
runtime, not literal shell-injection syntax in the skill body) as the
remote-presence signal — never a cached cheatsheet field, since presence can
change between sessions. This check MUST gate every git-push site: the
unconditional `git push -u origin <branch>` in `questions.md` step 2, and
the PR-create / archive-push sites in `pr.md` and `archive.md`. The
no-remote **consequence differs by the kind of push site**: at the
**branch-creation push site** (`questions.md` step 2), where no change work
exists yet, a no-remote result MUST simply skip the push, record that the
run is local-only, and continue — it MUST NOT present the disposition menu.
At the **completion push sites** (`pr.md` PR-create, `archive.md` step 5
archive-push), where the change's work exists and is ready to land, a
no-remote result MUST route the site to the no-remote menu. A no-remote
result MUST be treated as a condition distinct from `archive-workflow`'s
existing "no linked PR" bailout — no-remote replaces the remote-requiring
menu entirely rather than graying individual options out.

#### Scenario: remote present — normal push path continues
- **GIVEN** a repo with an `origin` remote configured
- **WHEN** the skill's remote-presence check runs at `questions.md` step 2
- **THEN** it reports remote-present and the calling command proceeds with
  its normal `git push -u origin <branch>` step.

#### Scenario: remote absent at branch creation — skip push and continue local-only
- **GIVEN** a repo with no configured git remote
- **WHEN** the skill's remote-presence check runs at `questions.md` step 2
  (the branch-creation push site, where no change work exists yet)
- **THEN** the calling command skips the push, records the run as local-only,
  and continues — it does NOT present the no-remote disposition menu.

#### Scenario: remote absent at a completion push site — branches to the no-remote menu
- **GIVEN** a repo with no configured git remote
- **WHEN** the skill's remote-presence check runs at a completion push site
  (`pr.md` PR-create or `archive.md` step 5 archive-push, where the change's
  work exists)
- **THEN** the calling command skips the push and branches to the no-remote
  local-only menu instead of attempting `git push`.

#### Scenario: no-remote is distinct from archive's no-linked-PR bailout
- **GIVEN** a change with a configured remote but no `pr.md` recording a
  linked PR
- **WHEN** `/qrspi:archive <id>` runs
- **THEN** it hits the existing "no linked PR" hard-block (unchanged), not
  the no-remote menu — the two conditions never conflate.

### Requirement: No-remote menu offers the full local menu minus push, plus merge-back
The skill's no-remote procedure MUST, when the remote-presence check reports
no remote **at a completion push site** (`pr.md` PR-create or `archive.md`
step 5 archive-push — not at `questions.md` step 2 branch creation, which
skips the push and continues per the gating requirement above),
direct the calling command to offer exactly three choices via
`AskUserQuestion`: (a) local branch only (no push), (b) a patch file (`git
format-patch` or `diff`), (c) commit to the current branch — the full local
menu minus any push-based option. For the local-branch and commit-to-current
paths, the procedure MUST additionally offer a human-confirmed local merge
of the feature branch into the default branch (from the cheatsheet, `main`
default) using a plain `git merge` (not forced fast-forward), never
performed automatically. On a merge conflict, the procedure MUST direct the
calling command to stop and hand the human the conflicted working tree
rather than auto-resolving.

#### Scenario: no-remote menu presented with three non-push options
- **GIVEN** the remote-presence check reports no remote
- **WHEN** the calling command reaches a completion push site (`pr` PR-create
  or `archive` archive-push)
- **THEN** it presents an `AskUserQuestion` with exactly three choices: local
  branch (no push), patch file, and commit-to-current-branch — no push
  option is offered.

#### Scenario: human-confirmed merge-back after local-branch or commit path
- **GIVEN** the human chose the local-branch or commit-to-current path in a
  no-remote repo
- **WHEN** the work is complete
- **THEN** the calling command offers a human-confirmed `git merge` of the
  feature branch into the default branch, and does NOT perform the merge
  without that confirmation.

#### Scenario: merge conflict stops and hands off to the human
- **GIVEN** the human confirmed the local merge-back
- **WHEN** `git merge` reports a conflict
- **THEN** the calling command stops, leaves the conflicted tree as-is, and
  does not attempt automatic conflict resolution.

### Requirement: Branch-slot resolution reads named feature/archive slots
The skill MUST resolve branch names via named slots: `feature` (default
`features/<id>`) and `archive` (default `chore/archive-<id>`), extensible to
further named slots later. Resolution order per slot MUST be: cheatsheet
`## PR & git workflow` → `Branch naming` sub-block value for that slot, else
the slot's default. `claude/commands/questions.md` step 2 MUST read the
`feature` slot; `claude/commands/archive.md` step 5 MUST read the `archive`
slot for the branch name, the PR title, and the PR source-branch argument —
replacing its prior hardcoded `chore/archive-<id>` literal.

#### Scenario: feature slot resolves from cheatsheet override
- **GIVEN** a `Branch naming` sub-block with `feature: feat/<id>`
- **WHEN** `questions.md` step 2 resolves the feature branch name for change
  `add-widget`
- **THEN** it resolves to `feat/add-widget`, not the default
  `features/add-widget`.

#### Scenario: archive slot falls back to its default
- **GIVEN** a `Branch naming` sub-block with no `archive` value set
- **WHEN** `archive.md` step 5 resolves the archive branch name for change
  `add-widget`
- **THEN** it resolves to `chore/archive-add-widget` (the slot default).

### Requirement: Missing branch-naming field prompts once and writes back
The calling command MUST, when the project's stack-cheatsheet lacks a field
the skill needs (an `archive` branch-naming slot value or a no-remote
posture note), prompt the human exactly once via `AskUserQuestion` and offer
to write the supplied answer back into the cheatsheet's `## PR & git
workflow` block, then continue the current run using the supplied value.
This MUST NOT re-prompt on every subsequent step within the same run once
answered.

#### Scenario: legacy cheatsheet missing the archive slot prompts once
- **GIVEN** a cheatsheet with a `## PR & git workflow` block that predates
  the `Branch naming` sub-block
- **WHEN** `archive.md` step 5 needs the `archive` slot value
- **THEN** the command prompts once via `AskUserQuestion`, offers to write
  the answer back into the cheatsheet, and then proceeds using the supplied
  value without prompting again later in the same run.
