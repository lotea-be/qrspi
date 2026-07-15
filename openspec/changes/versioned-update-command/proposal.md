# Proposal — versioned-update-command

> Stage S of QRSPI. Generated 2026-07-15.

## Why

Today no consuming repo knows which QRSPI kit version its `openspec/` layout and
workflow assumptions correspond to. When the kit changes behaviour — for example,
the sibling `tighten-stage-read-boundaries` change narrows per-stage file-read
access — a consumer has no signal that they need to adapt, and no tool to walk
them through the adaptation. This change delivers the full versioning mechanism:
a one-line marker written into each consuming repo at init time, a new
`/qrspi:update` command + skill that reads the marker, walks each intervening
release's migration manifest entry, auto-applies mechanical steps, gates judgment
steps, and bumps the marker, plus a CI-enforced requirement that every release
ships a manifest entry.

## What Changes

- New file `openspec/.qrspi-version` (plain-text, bare SemVer) written into
  consuming repos by `/qrspi:init` and bumped by `/qrspi:update`.
- New shipped command `claude/commands/update.md` — the `/qrspi:update` command,
  main-loop-resident (no `agent:` frontmatter), hybrid model: auto-applies
  `automated` steps, gates `manual` steps via AskUserQuestion.
- New shipped skill `claude/skills/qrspi-update/SKILL.md` — carries the manifest
  schema contract, SemVer-ordered walk algorithm, automated/manual dispatch, and
  edge-case handling.
- New kit-side directory `migrations/` with one structured YAML file per release
  (`migrations/<version>.yaml`), starting at the version shipping this feature; a
  "no consumer action" stub is valid.
- New `scripts/lint.mjs` check: asserts every released version has a matching
  `migrations/<version>.yaml`, validates schema well-formedness (required keys,
  `edit-file`-only `action` vocabulary, `openspec/`-scoped paths), and validates
  the marker SemVer format where present.
- Updated `claude/commands/init.md` — new step writes the marker at the current
  version after the `openspec/config.yaml` sentinel write.
- Updated release documentation: CONTRIBUTING.md release checklist + version-bump
  checklist, `qrspi-release` dev-tooling skill preconditions, CHANGELOG
  `[Unreleased]`.
- Updated README: helpers line entry for `/qrspi:update` + an "Updating your repo"
  note.
- Regenerated `copilot/prompts/qrspi-update.prompt.md` via `node sync-copilot.mjs`
  for zero-drift.

## Capabilities

### New Capabilities

- `kit-versioning`: Version marker lifecycle in consuming repos plus the
  `/qrspi:update` walk command, backing skill, and migration manifest schema —
  creates `specs/kit-versioning/spec.md`.

### Modified Capabilities

- `ci-quality-gates`: New lint check for migration-manifest presence, schema
  well-formedness, and marker SemVer format — needs a delta spec.
- `kit-governance`: Release checklist gains a mandatory manifest-entry step, and
  CONTRIBUTING.md documents it — needs a delta spec.
- `qrspi-command-surface`: `/qrspi:update` is a new shipped hybrid command with
  main-loop residence — needs a delta spec.

## Impact

- Migrations: no data migration in consuming repos (the marker file is new; repos
  without one are handled by the no-marker edge case defined in D5).
- Breaking changes: none for consuming repos. The manifest starts at the version
  shipping this feature (no retroactive entries for 0.1.0–0.5.0 per PQ6).
- Phases: single phase; no epic split required. `tighten-stage-read-boundaries`
  may only merge after this change ships (dependency per PQ7).
- Affected code / APIs / dependencies: `claude/commands/update.md`,
  `claude/commands/init.md`, `claude/skills/qrspi-update/SKILL.md`,
  `scripts/lint.mjs`, `migrations/` (new directory), `CONTRIBUTING.md`,
  `README.md`, `CHANGELOG.md`, `.claude/skills/qrspi-release/SKILL.md`,
  `copilot/prompts/qrspi-update.prompt.md` (generated).

## Out of scope

- The read-boundary narrowing behaviour itself (`tighten-stage-read-boundaries`).
- Retroactive manifest entries for versions 0.1.0–0.5.0 (PQ6: none).
- Reverse / downgrade migrations (D5: hard-stop only).
- A Copilot-specific interactive update mechanism (`reassess-copilot-port`); the
  shipped command still regenerates a Copilot prompt for zero-drift.
- A general test harness for the kit (D7: none introduced).
- Expanding the automated action vocabulary beyond `edit-file` (OQ3: closed).
