# Proposal — session-version-check-and-update-prompt

> Stage S of QRSPI. Generated 2026-07-23.

## Why

QRSPI-initialized consumer repos carry a one-line marker
`openspec/.qrspi-version` recording the kit version the repo was last aligned
with, but nothing today tells a user their repo is behind the installed kit. A
user only discovers a gap if they think to run `/qrspi:update` proactively.
This change adds a **session-start version check** at every QRSPI entry point
(the nine command bodies: `status` + the eight stage commands) so that a
behind-repo surfaces a human-gated offer to update before any side-effecting
work begins. The check is DRY (one new shipped skill, named-loaded by each
command), in-context only (no disk state), and degrades gracefully when either
version value is unavailable.

## What Changes

- New shipped skill `claude/skills/qrspi-version-check/SKILL.md` containing all
  check logic: read kit version B, read marker A, numeric-tuple SemVer compare,
  branch on up-to-date / behind / downgrade / no-marker / unreadable-B, hold the
  in-context session flag.
- Nine command bodies each gain one preamble line (the `qrspi-version-check`
  skill load), positioned first — before run-mode establishment, before
  precondition Glob, before every side effect.
- `scripts/lint.mjs` gains a new check (Check 9) asserting the inline
  `qrspi-version-check` embed is present in all nine command bodies.
- `README.md` gains a `qrspi-version-check` entry in the skills list.
- `node sync-copilot.mjs` is run to regenerate
  `copilot/instructions/qrspi-version-check.instructions.md` and the nine
  updated command prompts.

## Capabilities

### New Capabilities

- `session-version-check`: Compares the repo's `openspec/.qrspi-version` marker
  (A) against the installed kit's `.claude-plugin/plugin.json` version (B), branches
  on the comparison result, and provides the in-context once-per-session
  suppression flag — creates `specs/session-version-check/spec.md`.

### Modified Capabilities

- `ci-quality-gates`: Adds a new lint check (Check 9) asserting the
  `qrspi-version-check` embed line is present in each of the nine command bodies —
  needs a delta spec.
- `qrspi-command-surface`: Each of the nine stage-and-status command bodies gains
  a first-step version-check preamble line; README gains the new skill entry —
  needs a delta spec.

## Impact

- Migrations: no consumer-repo `openspec/` layout change; a `migrations/<next>.yaml`
  stub is authored when this ships in a release (per lint Check 6 floor rule). Not
  part of this change's implementation work.
- Breaking changes: none. The check never blocks a stage and never mutates consumer
  repo state. Accepting the behind-offer re-enters the human-gated `/qrspi:update`.
- Phases: single phase (all four slices are in one PR).
- Affected code / APIs / dependencies: `claude/skills/` (new file),
  `claude/commands/` (nine files modified), `scripts/lint.mjs` (new check),
  `README.md` (skills list), `copilot/` (regenerated via sync).

## Out of scope

- Network / marketplace "latest version" lookup (PQ1 settles: local-only).
- Disk-based session marker / temp file (PQ3 rejects this option).
- Auto-resume of the interrupted stage after `/qrspi:update` (PQ7: re-invoke
  fresh).
- Reverse / downgrade migration (downgrade is warn-only; `/qrspi:update` retains
  its own downgrade hard-stop).
- Mechanical assertion of `config.yaml` `openspec_version` vs kit version
  coupling (existing open gap, unrelated).
- Per-skill opt-in list in `plugin.json` (skills are auto-registered from
  `claude/skills/`; no edit needed).
