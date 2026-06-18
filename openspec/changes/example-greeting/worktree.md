# Worktree -- example-greeting

> Stage W of QRSPI. Generated 2026-06-18.
> Vertical slices, not horizontal layers.

## Overview

This is a single-slice change. The only deliverable is the `greeting` command
source file and its auto-generated Copilot counterpart. There is no data layer,
no API, and no UI beyond the command output. The slice is self-contained: it
ends in a demoable banner visible in a live Claude Code session, and the drift
check confirms the Copilot prompt is in sync.

## Slices

### Slice 1 -- greeting command + Copilot prompt

Add `claude/commands/greeting.md` with a command body that shells out to
`git config user.name`, `git rev-parse --abbrev-ref HEAD`, reads `plugin.json`
for the kit version, and lists `openspec/changes/` entries (excluding `archive/`)
for active change IDs. The command degrades gracefully when any of these sources
is unavailable. Run `node sync-copilot.mjs` to generate
`copilot/prompts/qrspi-greeting.prompt.md`; commit both files atomically.

Files touched:
- `claude/commands/greeting.md` -- new command source
- `copilot/prompts/qrspi-greeting.prompt.md` -- auto-generated; do not hand-edit

- M: no mock layer -- command reads ambient context, no service abstraction needed
- F: n/a
- D: `copilot/` is the output; no database
- T: `node sync-copilot.mjs --check` exits 0; `node scripts/lint.mjs` exits 0
- **Model:** sonnet -- additive command authoring with no novel logic; generator
  handles the Copilot side automatically
- Checkpoint: (1) `claude/commands/greeting.md` exists with `description:`
  frontmatter; (2) `copilot/prompts/qrspi-greeting.prompt.md` exists and is
  consistent with the source (drift check exits 0); (3) invoking
  `/qrspi:greeting` in a live session emits a banner with user name, branch,
  kit version, and active change IDs
