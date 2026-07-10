# Slices — archive-requires-merged-pr

> Stage V of QRSPI. Generated 2026-07-10.
> Vertical slices, not horizontal layers.

## Overview

This is a kit/workflow-tooling change: there is no mock-API → frontend →
real-DB axis, no compiled test suite, and no runtime app to boot. The
"vertical slice" analogue here is **one coherent, user-observable behavior of
the `/qrspi:archive` command, shipped whole** — command-markdown edit(s) +
any skill/template edit + the mandatory `sync-copilot.mjs` regeneration +
a dogfood walk that stands in for automated tests (D10: no new lint check).
Each slice is independently demoable by actually running `/qrspi:archive`
against a real change folder.

Because `/qrspi:archive` is a shipped plugin command, "run the app" means
dev-installing this in-progress copy first: `claude --plugin-dir
/workspaces/git/qrspi` (then `/reload-plugins` after any edit), per the
`vertical-slice` skill's guidance on self-hosted plugin changes — otherwise
the checkpoint silently exercises the last-released `archive.md`, not the one
being edited.

Two slices exactly match the design's preview (design.md "Vertical slices
(preview)") — the block path is the higher-risk, higher-value half (it is the
change's entire reason to exist: never archive an unmerged PR), so it comes
first and is fully demoable on its own (a hard-stop *is* the observable
behavior). The merge path builds on it and is demoable independently once the
gate exists. Both fit the 3–5 slice band without padding — a third slice
would only split D1–D6 or D7–D9 further with no added reviewability.

All slices default to `sonnet`: every decision (gate ordering, message
wording, host-inference fallback, commit staging) is already pinned down in
design.md D1–D9 — this is templated instruction-following against an
existing hard-stop pattern the `workflow` skill already documents, not
first-of-kind reasoning.

## Slices

### Slice 1 — Block path: the PR-merge gate refuses to archive

A human runs `/qrspi:archive <id>` against a change whose PR has not merged
(open, closed-unmerged, missing `pr.md`, or CLI unavailable/unauthenticated)
and sees the command surface the PR's real state and then hard-stop with an
actionable message — it never reaches the `openspec-archive-change` skill
delegation. This slice does not yet touch the successful-archive path: a
change with a genuinely merged PR still archives via today's unconditional
behavior until Slice 2 lands the commit step (the gate itself is
non-blocking for the merged case — it prints and proceeds — so this is a
safe, additive first cut).

- M (n/a — no mock layer; this is markdown-only tooling): the gate's logic
  lives directly in `claude/commands/archive.md` as new step 3 (D1), inserted
  after the existing inform-only `followups.md` check (step 2) and before
  the skill delegation (renumbered step 4). Covers, per design:
  - D2: read `openspec/changes/<id>/pr.md`, extract the PR number tolerating
    field drift (`#<N>` token, else a `URL:`/`PR link:`-derived number);
    missing `pr.md` or an unextractable number hard-blocks naming `/qrspi:pr`.
  - D3: resolve host CLI + status-query command from the stack-cheatsheet's
    `## PR & git workflow` section when present; else infer from repo
    signals (`.github/`/GitHub remote → `gh`; `azure-pipelines.yml` →
    `az repos`; `.gitlab-ci.yml` → `glab`; default `gh`).
  - D4: per-host "merged" definition (GitHub `state == MERGED`; Azure
    `status == completed`; GitLab `state == merged`), invoked via the Bash
    tool at runtime (not literal shell-injection syntax).
  - D5: always print PR number/state/URL first, then hard-stop
    unconditionally on any non-merged state (open and closed-unmerged worded
    identically, no override).
  - D6: CLI missing/unauthenticated is a distinct, actionable hard-stop
    (e.g. "run `gh auth login`, then re-run"), worded differently from D5's
    non-merged hard-stop, never a silent skip.
- F (n/a — no UI; the "surface" is `archive.md`'s stdout hard-stop text,
  which the scenarios above fully specify): none.
- D (n/a — no data store; the only "data" read is `pr.md` and the
  stack-cheatsheet, both filesystem reads via Read/Glob): also land the D8
  docs-only template line in `claude/commands/stack.md`'s
  `## PR & git workflow` section (a parallel PR-status-query line next to the
  existing PR-create line) so freshly generated cheatsheets document both.
- T (dogfood walk, standing in for automated tests per D10 — no new lint
  check is added): after dev-installing and reloading,
  1. Regenerate Copilot: `node sync-copilot.mjs`, then `node
     sync-copilot.mjs --check` must exit 0 (confirms
     `copilot/prompts/qrspi-archive.prompt.md` picked up the new step).
  2. Run `/qrspi:archive <id>` against a change whose `pr.md` is absent →
     confirm hard-block naming `/qrspi:pr`, no skill delegation.
  3. Run it against a change whose `pr.md` records an open PR → confirm the
     command prints number/state/URL, then hard-stops with the "merge PR
     #<N>, then re-run" wording.
  4. Simulate a closed-unmerged PR (or point at a real one if available) →
     confirm the same hard-stop shape as step 3, no softer path.
  5. Simulate CLI-unauthenticated (e.g. `gh auth logout` in a disposable
     shell, or temporarily rename the CLI) → confirm the distinct D6 wording
     naming `gh auth login`, and that it reads differently from step 3/4's
     message.
- **Model:** sonnet — the entire branch structure, wording, and per-host
  logic is pinned down verbatim in design.md D1–D6 and D8; this is
  templated hard-stop authoring against a pattern (`workflow` skill's
  hard-stop procedure) the kit already documents elsewhere, not a novel
  design decision.
- Checkpoint: all 5 dogfood steps above pass, plus `sync-copilot.mjs --check`
  exits 0. A human reviewing the transcript can confirm each hard-stop's
  wording matches design.md D2/D5/D6 verbatim (or close enough to be
  unambiguous) and that no path reached the `openspec-archive-change` skill.

### Slice 2 — Merge path: archive proceeds, backlog row disappears, one atomic commit

Building on Slice 1's gate, a human merges a change's PR and re-runs
`/qrspi:archive <id>`: the gate now prints `merged` and proceeds silently to
the unchanged generated skill (which still does the filesystem `mv`), and
`archive.md` then runs its first-ever explicit commit step — removing the
change's row from `openspec/backlog.md` and committing it atomically with
the archived folder move. This is the slice that makes the change's second
goal (backlog hygiene) visibly true end-to-end.

- M (n/a): the new post-skill commit step lives in `claude/commands/archive.md`
  as a new step after the (unchanged, never-hand-edited)
  `openspec-archive-change` skill delegation succeeds. Covers D7 exactly:
  - Remove the `<id>` row from `openspec/backlog.md`.
  - Stage explicit paths only — the new
    `openspec/changes/archive/YYYY-MM-DD-<id>/` tree, the old-path deletion,
    and `openspec/backlog.md` — never `git add -A`.
  - Commit message `chore(<id>): archive change + remove backlog row`.
  - On any non-zero `git` exit (commit or push), hard-stop and surface the
    git error verbatim rather than leaving the tree moved-but-uncommitted.
- F (n/a): none — the observable surface is the resulting git log/diff and
  the backlog file's content, both directly inspectable by the human.
- D (n/a): the "data" touched is `openspec/backlog.md` (row removal) and the
  archived folder tree itself (already moved by the untouched skill); also
  land the D9 wording edit in `claude/skills/workflow/SKILL.md`'s "Before
  Q — the backlog" section, naming `/qrspi:archive` as the row-removal owner.
- T (dogfood walk):
  1. Regenerate Copilot again: `node sync-copilot.mjs` then `--check` (exit 0).
  2. Pick (or set up) a change with a genuinely merged PR — design.md D10/Q23
     notes the `example-greeting` reference change already has one and can
     double as the happy path.
  3. Run `/qrspi:archive <id>` → confirm the gate prints `merged` and
     proceeds without asking for confirmation; confirm the folder lands
     under `openspec/changes/archive/YYYY-MM-DD-<id>/`.
  4. Confirm `openspec/backlog.md` no longer contains the `<id>` row.
  5. Run `git log -1 --stat` → confirm exactly one commit
     `chore(<id>): archive change + remove backlog row` containing the
     archived tree, the old-path deletion, and the backlog edit together —
     no separate commit for the backlog row.
  6. Read the edited `claude/skills/workflow/SKILL.md` passage to confirm it
     now names `/qrspi:archive` as the row-removal owner (D9), and spot-check
     the regenerated `copilot/skills/workflow.md` (or equivalent synced
     path) picked up the wording via the sync, not a hand-edit.
- **Model:** sonnet — D7's commit-staging mechanics and D9's one-sentence
  wording edit are both fully specified; the only care point (plain `mv`
  staging, per design's risk note) is a mechanical `git add` detail already
  called out verbatim in D7, not a judgment call.
- Checkpoint: one commit lands with the exact message and file set D7
  specifies, the backlog row is gone, the archived folder exists at the
  dated path, `sync-copilot.mjs --check` exits 0, and the `workflow` skill
  wording reads as D9 describes.
