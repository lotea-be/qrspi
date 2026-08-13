# Spec — archive-workflow

> Delta against `openspec/specs/archive-workflow/spec.md` for the
> `archive-auto-create-pr` change. Replaces the new-branch scenario in the
> commit-target requirement (print-only -> auto-create with mode gate) and adds
> the PR-create contract as a new requirement.

## MODIFIED Requirements

### Requirement: The archive commit target is proposed — a new branch or straight to main
`/qrspi:archive` MUST propose the archive commit's target to the human rather
than silently committing to the current branch. This is because it runs after
the PR has merged (the human is typically on `main`) and the archive syncs the
change's delta specs into `openspec/specs/` — a reviewable content change. After
staging the archive changes and before committing, it MUST offer two options,
defaulting to the new-branch path:
- **New branch + push (open a PR)** — the default: create a `chore/archive-<id>`
  branch off the current HEAD, commit the staged archive changes there, `git
  push -u`, and then run the auto-create PR gate defined in **Requirement:
  Archive PR is auto-created on the new-branch path**.
- **Commit straight to main** — commit and push on the current branch; no PR
  is created on this path.

Both paths MUST use the identical staged paths, commit message
(`chore(<id>): archive change + remove backlog row`), and non-zero-git-exit
hard-stop defined in the **Requirement: Successful archive removes the backlog
row atomically with the folder move**. The branch name MUST be
`chore/archive-<id>` (not prompted). The proposal MUST always be shown — it is a
genuine target decision, not a suppressible confirmation.

#### Scenario: human chooses a new branch
- **GIVEN** a merged-PR change whose folder was moved and backlog row removed,
  with the archive changes staged on the current branch (e.g. `main`)
- **WHEN** `/qrspi:archive <id>` proposes the commit target and the human
  chooses the new-branch option
- **THEN** the command creates `chore/archive-<id>` off the current HEAD,
  commits the staged changes there with `chore(<id>): archive change + remove
  backlog row`, pushes with `-u`, and proceeds to the auto-create PR gate
  (not printing the create command as the sole next step).

#### Scenario: human chooses to commit straight to main
- **GIVEN** the same staged archive changes
- **WHEN** the human chooses "commit straight to main"
- **THEN** the command commits the staged changes on the current branch and
  pushes, exactly as the atomic-commit requirement describes, without creating a
  new branch or opening a PR.

## ADDED Requirements

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
