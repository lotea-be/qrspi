# Changelog

All notable changes to the QRSPI kit are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows 0.x pre-1.0 semver: breaking changes and new features bump
the minor component; fixes, prompt-text edits, and docs-only changes bump the
patch component. Version 1.0.0 is deferred until the kit is declared stable.

The `plugin.json` `version` field is the single source of truth for the current
kit version.

---

## [Unreleased]

### Added

- **Tag-based release process.** A release is now cut by pushing a `vX.Y.Z` tag,
  not by merging a PR. The new [`release.yml`](.github/workflows/release.yml)
  workflow runs on the tag: it re-checks lint + sync drift, asserts the tag
  matches `plugin.json` `version` and that a matching `CHANGELOG.md` section
  exists, then publishes a GitHub Release. Feature PRs no longer bump `version`
  — they record changes here under `[Unreleased]`, and `main` may sit ahead of
  the latest release. See CONTRIBUTING "Releases (tag-based)" and the CLAUDE.md
  "Don't bump the version in feature work" rule. Consumers install from tags;
  the marketplace pins the qrspi `source` to a release tag.

### Changed

- **Renamed the Worktree stage to Slices** (stage code `W` -> `V`, command
  `/qrspi:worktree` -> `/qrspi:slices`, artifact `worktree.md` -> `slices.md`).
  The old name collided with git worktrees (a real Claude Code feature) and was
  never part of the QRSPI acronym. All sources now agree on the
  `S -> Slices -> P` order, and a QRSPI / "Crispy" acronym-lineage note was added
  to the `qrspi-workflow` skill and the README. The kit stays **eight stages**.
  Historical change folders keep their `worktree.md` with a pre-rename
  annotation (not rewritten).

  **Migration:** use `/qrspi:slices <id>` instead of `/qrspi:worktree <id>`. New
  change folders write `slices.md`; existing `worktree.md` files are unaffected.

- **Retired the `example-greeting` CI fixture.** The CI validate job now runs
  `openspec validate --all` against the real `openspec/specs/` surface (populated
  by archiving the first merged changes) instead of a permanently-active
  fictional change. `example-greeting` is archived as a worked reference under
  `openspec/changes/archive/`, and the `reference-example` spec no longer mandates
  an active fixture. Removes the long-standing smell of a fake change kept alive
  only to give CI something to validate.

---

## [0.3.0] - 2026-06-18

### Changed

- **Dropped the `qrspi-` prefix from the seven subagent names** (`qrspi-questioner`
  → `questioner`, etc.). In Claude Code the plugin namespace already prefixes
  agents, so they were stuttering as `qrspi:qrspi-questioner`; they are now the
  clean `qrspi:questioner`. This matches the earlier command-prefix drop. The
  generated Copilot agents are correspondingly renamed `copilot-qrspi-<x>.agent.md`
  → `copilot-<x>.agent.md`.

  **Migration:** if you reference a QRSPI agent by name (e.g. in your own prompts
  or tooling), update `qrspi-<role>` → `<role>` (Claude) and
  `copilot-qrspi-<role>` → `copilot-<role>` (Copilot). Reinstalling the Copilot
  kit replaces the agent files; the Claude plugin updates via the marketplace.

---

## [0.2.0] - 2026-06-18

### Added

- **Node.js generator** (`sync-copilot.mjs`) replacing the PowerShell script
  (`sync-copilot.ps1`) and bash wrapper (`sync-copilot.sh`). The new generator
  includes correct exit codes, deleted-file detection (union-of-trees comparison
  in `--check` mode), a source guard that aborts before wiping `copilot/` if
  any source directory is missing, `try/finally` temp-dir cleanup, and a
  missing-`SKILL.md` warning that exits non-zero.
- **GitHub Actions CI** (`.github/workflows/ci.yml`) with three parallel jobs:
  - `drift` -- `node sync-copilot.mjs --check`
  - `lint` -- `node scripts/lint.mjs` (pin agreement, frontmatter validity,
    heading-level skeleton check)
  - `validate` -- `npx --yes @fission-ai/openspec@1.4.1 validate example-greeting`
- **Lint script** (`scripts/lint.mjs`): pin-drift assertion, frontmatter/name
  lint, heading-level skeleton check against `openspec-templates/*.template.md`.
- **Reference example** (`openspec/changes/example-greeting/`):
  a hand-authored minimal fictional change with the full QRSPI artifact set,
  valid for `openspec validate example-greeting`. Kept as an active fixture (not
  archived) because `openspec validate` only resolves active changes.
- **`CONTRIBUTING.md`**: semver discipline table, sync workflow, version-bump
  checklist (including the pin-coupling rule), and convention-only stub note.
- **`CHANGELOG.md`**: this file.
- Canonical choreography sections (commit step, next-stage handoff,
  precondition, backlog-atomicity) added to `claude/skills/qrspi-workflow/SKILL.md`.

### Changed

- `plugin.json` version bumped to `0.2.0`; description updated to drop the
  "opsx-* OpenSpec helpers" claim.
- All eight QRSPI stage command files thinned to stubs referencing
  `qrspi-workflow` for invariant choreography.
- `Edit` removed from `qrspi-researcher` and `qrspi-planner` agent frontmatter
  (least-privilege tightening). `qrspi-questioner` retains `Edit` because it
  edits the backlog row in place.
- `README.md`: corrected the false "two coupled places" pin claim, fixed the
  stale `claude/commands/qrspi:init.md` path (now `init.md`), and rewrote the
  pin-bump procedure to use `node sync-copilot.mjs`.
- `CLAUDE.md`: replaced `sync-copilot.ps1` / `sync-copilot.sh` references with
  `sync-copilot.mjs`.
- Install scripts (`install.ps1`, `install.sh`): added self-heal sweep (see
  "Removed -- Migration note" below).

### Removed

- `sync-copilot.ps1` and `sync-copilot.sh` -- superseded by `sync-copilot.mjs`.
- Five opsx command files: `claude/commands/opsx/propose.md`, `explore.md`,
  `apply.md`, `archive.md`, `sync.md`.
- Three orphaned OpenSpec-generated skills: `claude/skills/openspec-propose/`,
  `claude/skills/openspec-explore/`, `claude/skills/openspec-apply-change/`.

#### Migration note for existing 0.1.0 installs

If you installed the kit at version 0.1.0, your `~/.copilot/` directory may
contain stale files that no longer exist in the kit:

- `opsx-propose.prompt.md`
- `opsx-explore.prompt.md`
- `opsx-apply.prompt.md`
- `opsx-archive.prompt.md`
- `opsx-sync.prompt.md`
- `openspec-propose.instructions.md`
- `openspec-explore.instructions.md`
- `openspec-apply-change.instructions.md`

**Re-running the install script** (`install.ps1` on Windows / `install.sh` on
macOS/Linux) will automatically remove all eight stale files before copying the
new artifacts. No manual cleanup is required.

---

## [0.1.0] - 2026-01-15

### Added

- Initial QRSPI kit release.
- Claude Code slash commands for all eight QRSPI stages (Q, R, D, S, P, W,
  I, PR) plus `init`, `status`, `followup`, `retro`, and `archive`.
- Copilot prompt equivalents for all commands, generated by `sync-copilot.ps1`.
- OpenSpec integration: `openspec/` scaffold, `openspec-*` skill files
  auto-generated by the CLI.
- opsx command surface (`opsx-propose`, `opsx-explore`, `opsx-apply`,
  `opsx-archive`, `opsx-sync`) for experimental OpenSpec workflow.
- `install.ps1` (Windows) and `install.sh` (macOS/Linux) installers.
- `plugin.json` with version `0.1.0`.
