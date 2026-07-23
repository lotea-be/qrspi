# Slices — session-version-check-and-update-prompt

> Stage V of QRSPI. Generated 2026-07-23.
> Vertical slices, not horizontal layers.

## Overview

This change adds a session-start version check at every QRSPI entry point. The
four slices each deliver a demoable, end-to-end increment rather than a
horizontal layer (e.g. "write the skill body, then wire all nine commands, then
add lint"). The progression is: one working path end-to-end (Slice 1), the
update handoff path wired through (Slice 2), the remaining eight stage commands
covered (Slice 3), and the mechanical enforcement layer (lint + README + sync,
Slice 4). Each slice can be demo-verified with a dev-install of the in-repo
copy (`claude --plugin-dir <repo>`) so the command under test loads from the
branch rather than the published release.

The `(D<n>)` tags embedded throughout this file are required — this `slices.md`
dogfoods the rule it describes.

## Slices

### Slice 1 — Skill authored and wired into `/qrspi:status` end-to-end

**Deliverable.** A developer can dev-install the in-repo copy, run
`/qrspi:status` against a behind-repo (with a deliberately stale
`openspec/.qrspi-version`), and see the two-choice AskUserQuestion naming both
version strings. Running against an up-to-date repo produces no version output
at all. Running against a repo with a rolled-back plugin (A > B) prints a
one-line warning and continues. The remaining eight stage commands are not yet
touched; this slice produces one demoable path.

- M: no mock stub needed — the skill reads two local files (`openspec/.qrspi-version`
  and `.claude-plugin/plugin.json`); both already exist in a dev install and the
  response contract is fully settled in the spec (D2, D3).
- F: author `claude/skills/qrspi-version-check/SKILL.md` — the complete skill
  body: session-flag guard, read B from `.claude-plugin/plugin.json`, read A
  from `openspec/.qrspi-version`, numeric-tuple SemVer compare, and four branches
  (up-to-date silent, behind AskUserQuestion, downgrade warn, unreadable-B warn).
  Wire the inline load line as the first step of `claude/commands/status.md`,
  before the onboarding check. (D1, D4, D5, D6, D7, D8)
- D: no data-store changes. The in-context session flag is held in the
  orchestrator's conversational context — no disk artifact, no temp file. (D9)
- T: manual checkpoint (see below). Automated lint coverage for the skill arrives
  in Slice 4.
- **Model:** sonnet — well-defined branching logic with a settled contract; the
  four branches and their exact text are specified in the spec, so the task is
  authoring-to-spec rather than novel reasoning.
- Checkpoint: (1) `claude --plugin-dir /workspaces/git/qrspi` to dev-install.
  (2) In a repo with `openspec/.qrspi-version` = `0.6.0` and installed plugin
  at `0.7.0`, run `/qrspi:status`. Verify the AskUserQuestion names both versions
  and offers exactly `["Run /qrspi:update now", "Continue on the current version"]`.
  (3) In the same repo with matching versions, run `/qrspi:status`. Verify no
  version output appears. (4) In a rolled-back repo (A `0.7.0`, B `0.6.0`), verify
  a one-line warning prints and the command continues. (5) Confirm the skill file
  lives in `claude/skills/` (not `.claude/skills/`).

### Slice 2 — Behind-offer wires through to `/qrspi:update`; no-marker and unreadable-B paths covered

**Deliverable.** A developer can walk the full "behind → user selects Run now →
`/qrspi:update` re-enters on the main loop" path and verify it lands in the
update command (not a subagent spawn). They can also verify the no-marker
delegation (when `openspec/.qrspi-version` is absent but `openspec/` exists,
the skill hands off to `/qrspi:update`'s own no-marker gate rather than
inventing a parallel prompt) and the unreadable-B graceful degradation (when
`.claude-plugin/plugin.json` is missing, a notice prints and the command
proceeds without blocking).

- M: no additional stub needed — both wiring paths (`/qrspi:update` re-entry
  and no-marker delegation) are described exactly in the spec; all test variants
  use the existing installed files plus deliberate file manipulations in a scratch
  repo. (D5, D6)
- F: update `claude/skills/qrspi-version-check/SKILL.md` to make the "Run now"
  branch explicit about re-entering `/qrspi:update` as a slash command on the
  main loop (not a subagent). Confirm the no-marker branch text is clear: the
  skill hands off to `/qrspi:update`'s no-marker gate without a second competing
  prompt. Confirm the unreadable-B text sets the session flag and returns. (D5,
  D6, D10)
- D: no data-store changes.
- T: manual checkpoint (see below).
- **Model:** sonnet — refinements to an already-authored skill file; the
  wiring text is precisely specified in the spec and requires no novel reasoning.
- Checkpoint: (1) Dev-install as in Slice 1. (2) Behind-repo scenario: select
  "Run /qrspi:update now" and confirm `/qrspi:update` enters (main-loop re-entry,
  not spawned as a subagent). (3) Remove `openspec/.qrspi-version` from a scratch
  repo (keep `openspec/` present), run `/qrspi:status`, confirm the skill's
  no-marker branch fires and sends you to `/qrspi:update`'s own gate — not a
  second competing AskUserQuestion from the skill itself. (4) Rename
  `.claude-plugin/plugin.json` temporarily, run `/qrspi:status`, confirm a
  one-line notice prints and the command continues normally (no AskUserQuestion).

### Slice 3 — Embed added to all eight stage commands; in-context session suppression verified in a chain

**Deliverable.** All nine QRSPI entry points (status + eight stages) carry the
version-check preamble as their first step. A developer can run a Q→PR auto-chain
on a behind-repo and observe that the version prompt appears exactly once (at Q)
and is silently suppressed for every subsequent stage in the same session.

- M: no mock needed — this slice is entirely authoring the inline embed line into
  eight more command files; the skill body from Slice 1 is already the source of
  truth. (D1)
- F: add the `qrspi-version-check` inline load line as the first step of each of
  `claude/commands/questions.md`, `research.md`, `design.md`, `structure.md`,
  `slices.md`, `plan.md`, `implement.md`, and `pr.md`, positioned before the
  run-mode AskUserQuestion in each. The skill's session-flag guard text must
  already instruct each embedding command to check for the held flag before
  running any logic — confirm this is present in the skill body from Slice 1;
  amend if needed. (D1, D8)
- D: no data-store changes.
- T: manual checkpoint (see below). Mechanical embed assertion arrives in Slice 4.
- **Model:** sonnet — mechanical repetition of one embed line across eight files;
  no novel decisions, all positions are specified in the spec.
- Checkpoint: (1) Dev-install as before. (2) Open each of the nine command files
  and confirm the `qrspi-version-check` load line is the first substantive instruction
  in the command body (before run-mode prompt). (3) Start a fresh session, run a
  Q→R→D auto-chain against a behind-repo. Verify the version AskUserQuestion appears
  once (at Q) and that the R and D stage entries produce no second version prompt.
  (4) Start a new session and run a standalone `/qrspi:design <id>`. Verify the
  version check fires (no held flag in the new session).

### Slice 4 — Lint Check 9 added; README entry; `sync-copilot.mjs` run

**Deliverable.** Running `node scripts/lint.mjs` now includes a Check 9
(`checkVersionCheckEmbed`) that passes when all nine command bodies carry the
inline embed and fails with a named violation when any one is missing. The
README lists `qrspi-version-check` in the skills section. `node sync-copilot.mjs`
generates `copilot/instructions/qrspi-version-check.instructions.md` and the
nine updated command prompts; `node sync-copilot.mjs --check` exits 0 (zero
drift).

- M: no mock needed — this slice is deterministic authoring-and-running of existing
  scripts. (D11)
- F: (a) add `checkVersionCheckEmbed` to `scripts/lint.mjs` after Check 8, hardcoding
  the nine-command stem list, asserting the inline form. (b) Add `qrspi-version-check`
  to the skills list in `README.md` with a one-line description. (c) Run
  `node sync-copilot.mjs` to regenerate `copilot/` and commit the output alongside
  the source changes. (D11, D12)
- D: no data-store changes.
- T: (a) run `node scripts/lint.mjs` — Check 9 must report `OK`. (b) Temporarily
  remove the embed from one command body, re-run lint — Check 9 must name the
  violation and exit non-zero. Restore. (c) Run `node sync-copilot.mjs --check`
  — must exit 0. (D11)
- **Model:** sonnet — mechanical addition of a new check following the existing
  pattern (Check 8 is the template); no algorithmic complexity, no novel reasoning.
- Checkpoint: (1) Run `node scripts/lint.mjs` — all checks including Check 9 pass.
  (2) Delete the embed line from `claude/commands/plan.md`, re-run lint — confirm
  Check 9 names `plan.md` and exits non-zero. Restore the line. (3) Run
  `node sync-copilot.mjs --check` — exits 0 (zero drift). (4) Confirm
  `copilot/instructions/qrspi-version-check.instructions.md` exists. (5) Confirm
  `README.md` lists `qrspi-version-check` in the skills section.
