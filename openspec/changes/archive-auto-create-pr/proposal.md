# Proposal — archive-auto-create-pr

> Stage S of QRSPI. Generated 2026-08-09.

## Why

`/qrspi:archive`'s "New branch + push" path has always stopped short: it pushed
the archive branch and then printed the PR-create command, leaving the human to
run it manually. This is inconsistent with `/qrspi:pr`, which actually creates
the PR, captures the number and URL from stdout, and reports them. The goal of
this change is to close that gap — `archive` should create the archive PR
automatically (mode-aware, exactly mirroring `/qrspi:pr`'s create step), report
the PR number and URL in the step-6 completion summary, and degrade gracefully
on create failure so the archive commit (already pushed) is never misreported as
having failed.

## What Changes

- `claude/commands/archive.md` step 5 (new-branch sub-path): replace the
  print-only sentences with a mode-aware create gate (Manual AskUserQuestion;
  Full/Semi auto-create), the resolved host-CLI create command (reusing the host
  from step 3, D1), title-only `--body ""` targeting the default branch (D4),
  stdout capture of `#<N>` and URL (D3), and graceful-degrade prose on create
  failure (D5).
- `claude/commands/archive.md` step 6 ("New branch chosen" bullet): replace
  "repeat the suggested PR-create command" with "report the created archive PR
  (`#<N>` + URL)"; add fallback wording for the show-command-first and
  create-failed paths.
- `README.md` archive-flow prose: update if it documents the print-only
  behaviour.

## Capabilities

### New Capabilities

- _none_

### Modified Capabilities

- `archive-workflow`: the "human chooses a new branch" scenario in
  **Requirement: The archive commit target is proposed** changes from
  print-only to auto-create with a mode gate; a new **Requirement:
  Archive PR is auto-created on the new-branch path** is added to capture
  the mode-aware create, stdout capture, and graceful-degrade contract.

## Impact

- Migrations: no
- Breaking changes: no — the "Commit straight to main" path is untouched; the
  Manual run-mode retains a print-only opt-out (D2 "Show me the command first")
- Phases: single slice; no epics
- Affected code / APIs / dependencies: `claude/commands/archive.md` (step 5
  new-branch sub-path, step 6 relay); `README.md` archive-flow prose section;
  no new skills, no new dependencies

## Out of scope

- No centralized host-resolver skill (tracked backlog idea:
  `git-host-and-remote-awareness`).
- No batch-archive anticipation (tracked backlog idea:
  `batch-archive-multiple-changes`).
- No PR-record file for the archive PR (`pr.md` / `archive-pr.md`).
- Steps 2, 3, 4, 4a, 7 and the "Commit straight to main" path are untouched.
