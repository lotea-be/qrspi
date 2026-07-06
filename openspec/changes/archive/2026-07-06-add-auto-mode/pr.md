# PR — add-auto-mode

- **PR:** https://github.com/lotea-be/qrspi/pull/13 (**draft**)
- **Title:** add-auto-mode: ternary run-mode (Full auto / Semi-auto / Manual)
- **Base:** `main` ← **Head:** `features/add-auto-mode`
- **Stage PR completed:** 2026-06-29

## Final checklist (reviewer, all green)

- `tasks.md`: 18/18 boxes ticked (4 slices).
- `node scripts/lint.mjs`: PASS (all 5 checks).
- `node sync-copilot.mjs --check`: PASS (0 files differ — zero drift).
- `npx @fission-ai/openspec@1.4.1 validate add-auto-mode`: PASS.
- Working tree clean; explicit-path commits (no `git add -A`).
- README updated ("Run modes" section + D-row note); `plugin.json` version NOT bumped.
- CHANGELOG `[Unreleased]` entry added (resolved in-change).

## Why draft

Auto mode has been **static-verified only** — the slice live-runtime dogfood
(checkpoints 1.4 / 2.5 / 2.6 / 3.5) could not run because the installed plugin
serves the tagged release, not this branch. Tracked as the first item in
[`followups.md`](followups.md); flip to ready-for-review once a prerelease/dev-install
exercises a real Full-auto chain.

## Open follow-ups

See [`followups.md`](followups.md) — 4 items (live-runtime dogfood, implement.md↔backlog
status-line drift, "materially diverges" rubric, `lint-auto-mode-gate-coverage` priority).
