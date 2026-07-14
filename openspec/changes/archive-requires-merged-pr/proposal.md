# Proposal — archive-requires-merged-pr

> Stage S of QRSPI. Generated 2026-07-10.

## Why

`/qrspi:archive` today moves a completed change's folder under
`openspec/changes/archive/` unconditionally — it never verifies the linked PR
actually merged, so a change whose PR is still open (or was closed unmerged)
can be archived prematurely, folding its delta specs into `openspec/specs/` as
"current truth" before the code ever landed. It also never touches
`openspec/backlog.md`: the completed row is meant to disappear on archive, but
nothing removes it, so it lingers as stale clutter. This change closes both
gaps: a host-agnostic PR-merge gate that hard-blocks archival unless the
recorded PR is live-verified `merged`, and an explicit commit step that removes
the backlog row atomically with the archive move (design.md D1–D9).

## What Changes

- Insert a new PR-merge-gate step into `claude/commands/archive.md`, ordered
  after the existing inform-only `followups.md` check and before delegation to
  the generated `openspec-archive-change` skill (D1).
- The gate reads the PR number from `openspec/changes/<id>/pr.md` (drift-
  tolerant: `- **PR:** #<N>` line, falling back to a URL-parsed number);
  missing `pr.md` hard-blocks with instructions to run `/qrspi:pr` first (D2).
- The gate resolves the host CLI and status-query command from the project's
  stack-cheatsheet `## PR & git workflow` section when present, falling back
  to repo-signal inference (`.github/`/GitHub remote → `gh`;
  `azure-pipelines.yml` → `az repos`; `.gitlab-ci.yml` → `glab`; default `gh`)
  when absent (D3).
- "Merged" is defined per host (GitHub `state == MERGED`; Azure DevOps
  `status == completed`; GitLab `state == merged`) (D4).
- The gate always fetches and prints the PR's number/state/URL first, then
  hard-stops unconditionally on any non-merged state — uniform across open and
  closed-unmerged, no override (D5).
- CLI missing or unauthenticated is a distinct, actionable hard-stop (e.g. "run
  `gh auth login`, then re-run"), never a silent skip (D6).
- Introduce the archive flow's first-ever explicit `git commit` step: after the
  generated skill's `mv` succeeds, remove the change's `openspec/backlog.md`
  row and commit it atomically with the folder move
  (`chore(<id>): archive change + remove backlog row`), staging explicit paths
  only — never `git add -A` (D7).
- Add a parallel PR-status-query line to `claude/commands/stack.md`'s
  `## PR & git workflow` section template, next to the existing PR-create line
  (docs-only, no retrofit of existing cheatsheets) (D8).
- Update the `workflow` skill's "Before Q — the backlog" wording to name
  `/qrspi:archive` as the command that performs the row removal, atomically
  with the folder move (D9).
- Propose the archive commit's target instead of committing silently on the
  current branch: after staging the archive changes, `/qrspi:archive` asks
  whether to land them on a new `chore/archive-<id>` branch (default, then
  suggests the PR-create command) or straight to `main`. Motivated by the
  archive syncing delta specs into `openspec/specs/` — a reviewable content
  change — while running post-merge on `main` (D11, scope amendment).
- Regenerate `copilot/prompts/qrspi-archive.prompt.md` via
  `node sync-copilot.mjs` and confirm `--check` passes.

## Capabilities

### New Capabilities
- `archive-workflow`: the PR-merge gate, its surface/hard-stop behaviors, and
  the atomic backlog-row-removal-plus-commit step that `/qrspi:archive`
  performs — creates `specs/archive-workflow/spec.md`. No base spec exists yet
  for per-command archive behavior (`qrspi-command-surface` covers command
  *existence and routing*, not this command's runtime gate logic), so this is
  a new capability rather than a delta against an existing one.

### Modified Capabilities
- _none_

## Impact

- Migrations: no.
- Breaking changes: no new hard failure mode for already-merged changes; a
  change whose PR is still open now correctly fails to archive where it
  previously succeeded — this is the intended fix, not a regression.
- Phases: kit/workflow-tooling change, single phase (no phased rollout);
  Structure previews three vertical slices (Slices stage will detail): Slice 1 —
  block path (gate refuses unmerged/missing-`pr.md`/unauthenticated CLI, plus
  the `stack.md` template line); Slice 2 — merge path (archive proceeds,
  backlog row removed, atomic commit, `workflow` wording); Slice 3 —
  commit-target proposal (branch-or-main after archive, D11 scope amendment).
- Affected code / APIs / dependencies:
  - `claude/commands/archive.md` (the gate + the new commit step)
  - `claude/commands/stack.md` (D8 template line)
  - `claude/skills/workflow/SKILL.md` (D9 wording)
  - `copilot/prompts/qrspi-archive.prompt.md` (regenerated via
    `node sync-copilot.mjs`; must pass `--check`)
  - `openspec/backlog.md` (this change's own row already `proposed`; the
    row-*removal* behavior added here is `/qrspi:archive`'s new runtime
    behavior on other changes, not an edit to this repo's backlog row)
  - README.md (no stage/command additions; confirmed no stale prose to fix —
    D10/Q18)
  - No app data model, HTTP/RPC API, or UI — this is a kit-tooling change; the
    "API" is the host git CLI's PR-query invoked via the Bash tool at runtime.

## Out of scope

Carried forward verbatim from design.md's Non-Goals — each is a separate,
already-tracked backlog item, not folded into this change:

- No shared Node ops-helper for the PR-merge check (`standardize-recurring-ops-scripts`
  owns eventual extraction; PQ5).
- No reprioritization-offer seam in the archive step (`backlog-prioritization`
  wires itself in later, with no anticipatory hook required now; PQ8).
- No pre-PR open-tasks/followups review pass at the PR stage
  (`pr-review-open-tasks-and-followups`; Q25).
- No fix for `pr.md`'s stale-PR gap (a closed-then-reopened PR still points at
  the stale PR; the gate correctly reports "not merged" for it — out of scope,
  Q5).
- No enforcement/validation of `pr.md`'s six-field canonical shape (documented
  drift exists across archived examples; not addressed by this change).

## Vertical slices (preview)

See design.md's "Vertical slices (preview)" — the Slices (V) stage will detail
the full M/F/D/T breakdown per slice, honoring the three-slice shape above.
