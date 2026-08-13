# Proposal — git-host-and-remote-awareness

> Stage S of QRSPI. Generated 2026-08-13.

## Why

Git-host/vendor detection and PR mechanics are duplicated and asymmetric
across the kit: `archive.md` carries the sole inline multi-signal host
detector while `pr.md` carries none, branch naming is split between a
cheatsheet-derived feature slot and a hardcoded archive slot, and every
`git push` site assumes `origin` exists and is writable — a remoteless repo
fails hard with no local-only path. This change centralizes host/vendor
resolution and branch naming into one shared skill both `pr.md` and
`archive.md` load, and gives remoteless repos a first-class local-only flow.

## What Changes

- Add a new kit skill `git-host-workflow` that codifies (1) live remote-
  presence checking, (2) vendor→CLI resolution (cheatsheet override wins,
  else live-derive from repo signals), (3) branch-slot resolution
  (`feature`/`archive` named slots), and (4) the no-remote local-only menu +
  human-confirmed merge-back procedure.
- Extend the stack-cheatsheet `## PR & git workflow` block with a
  **Branch naming** sub-block (named `feature`/`archive` slots) as the
  per-repo data source the skill reads.
- `pr.md` and `archive.md` load the shared skill instead of re-deriving
  vendor/branch logic inline or duplicating CLI examples.
- `questions.md` step 2 and every other push site (`pr`, `archive`) gate on
  a live `git remote` check; a remoteless repo gets a local-branch / patch /
  commit-to-current menu ending in a human-confirmed local merge-back,
  instead of failing at the first `git push`.
- Coverage stays at GitHub (`gh`), Azure DevOps (`az repos`), and GitLab
  (`glab`) — the three vendors `archive.md` already detects today; no
  regression. Only Bitbucket remains deferred (backlog).
- A legacy cheatsheet missing a new field (archive slot / no-remote
  posture) is handled by a runtime prompt-once + write-back, backed by a
  `manual` migration step.
- Register `pr` and `archive` in `scripts/skill-sets.mjs`
  `COMMAND_SKILL_SET_EXPECTED` so lint (`checkSkillSets`) asserts both
  commands load `git-host-workflow`.

## Capabilities

### New Capabilities
- `git-host-workflow`: the shared how-to-derive procedure for remote
  presence, vendor→CLI resolution, branch-slot resolution, and the
  no-remote local flow — creates `specs/git-host-workflow/spec.md`.

### Modified Capabilities
- `archive-workflow`: host resolution now delegates to the shared skill
  (GitLab coverage preserved, no regression); the archive branch name is
  resolved via the skill's archive slot instead of being hardcoded; a
  no-remote gate is added ahead of the archive push site.
- `qrspi-run-mode`: the PR-create auto-advance requirement generalizes from
  a hardcoded `gh pr create` to the host command resolved via
  `git-host-workflow`; a new requirement covers no-remote gating of
  push-based auto-advance in Full/Semi-auto mode.
- `ci-quality-gates`: the command-level skill-set registry
  (`COMMAND_SKILL_SET_EXPECTED`) is documented as covering the `pr` and
  `archive` stems' `git-host-workflow` load, mirroring the existing `idea`
  precedent.

## Impact

- Migrations: yes — one `manual` step in `migrations/0.14.0.yaml` describing
  the new Branch-naming sub-block / no-remote posture and instructing the
  human to re-run `/qrspi:stack` or hand-add the field; no `automated` step
  (the `## PR & git workflow` block is free-form prose with no reliable
  `edit-file` anchor).
- Breaking changes: no — existing GitHub/Azure/GitLab repos resolve to the
  same CLIs as before; the change is additive (no-remote flow, branch
  slots) plus a refactor of where the logic lives.
- Phases: Slice 1 (centralized resolver, with-remote path), Slice 2
  (no-remote local flow), Slice 3 (legacy-cheatsheet fallback + migration).
- Affected code / APIs / dependencies: `claude/skills/git-host-workflow/SKILL.md`
  (new), `claude/commands/pr.md`, `claude/commands/archive.md`,
  `claude/commands/questions.md`, `claude/commands/stack.md`,
  `scripts/skill-sets.mjs`, `.claude/skills/qrspi-stack/SKILL.md`,
  `migrations/0.14.0.yaml`, `README.md` (if it documents host/PR behaviour).

## Out of scope

- **Bitbucket vendor support** — deferred to backlog idea
  `bitbucket-pr-vendor-support` (P3); no current support to preserve.
- **Node PR-ops helper scripts** — porting the vendor table to
  `scripts/*.mjs` is deferred to `standardize-recurring-ops-scripts` (P2);
  the vendor table is kept simple/tabular in the skill so that later port is
  mechanical.

## Vertical slices preview

- **Slice 1 — Centralized resolver, with-remote path.** New skill +
  registry entries; `pr.md`/`archive.md`/`questions.md` resolve vendor and
  branch slots through it. Demoable on a GitHub repo (unchanged end-to-end
  behavior) plus Azure/GitLab resolving to their CLIs.
- **Slice 2 — No-remote local-only flow.** Remote check gates the pushes;
  local menu + human-confirmed merge-back. Demoable in a remoteless scratch
  repo.
- **Slice 3 — Legacy-cheatsheet fallback + migration.** Prompt-once/write-
  back for a missing slot; the `manual` migration step. Demoable against a
  pre-change cheatsheet and `/qrspi:update`.
