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

- **PR stage reconciliation gates: tasks pass + follow-ups pass (`pr-review-open-tasks-and-followups`).**
  `/qrspi:pr` now runs two reconciliation passes before spawning the reviewer subagent.
  The **tasks pass** reads `tasks.md`, separates un-ticked boxes into regular tasks and
  `(human)` boxes, and presents each one via AskUserQuestion (Finish / Drop / Pause for
  regular tasks; Confirm-done / Drop / Leave-for-now for human boxes). Dropped items are
  annotated `- [x] ~~N.M text~~ (dropped)`; Leave-for-now boxes remain un-ticked as a
  sanctioned exception noted for the reviewer. The **follow-ups pass** reads `followups.md`
  (if present) and presents each un-ticked entry via AskUserQuestion (Fix now / Defer /
  Drop / Promote to backlog idea). Both passes are mode-aware: in Full/Semi-auto mode
  a clean pass (zero open items) is suppressed silently, while open items trigger a
  hard-stop that halts the auto chain; Manual mode always shows the banner including
  the "0 open" variant. If either pass ends early (Finish / Pause / Stop here / Fix now),
  any Drop/Confirm-done edits already made are committed as
  `docs(<id>): reconcile open tasks before PR`. The reviewer agent gains an awareness
  note that a Leave-for-now `(human)` box is a sanctioned open item, not a blocking issue.
  The `workflow` skill Hard-stop section gains a one-line cross-reference to the
  reconciliation-gate hard-stop mechanics. A new lint **Check 8** asserts that
  `claude/commands/pr.md` contains both reconciliation-pass sections with their required
  structural anchors (tasks-pass heading + Finish/Drop/Pause labels; follow-ups-pass
  heading + Fix-now/Defer/Drop/Promote labels).

### Changed

- **Implementer ticks each `tasks.md` checkbox immediately after its task.**
  The QRSPI implementer agent now ticks each checkbox immediately after confirming
  that task's output is correct -- before the next task starts -- so progress is
  visible live and `tasks.md` stays durable if a slice is interrupted. Each tick
  is persisted as its own edit; batching ticks to the end of the slice is
  explicitly prohibited. Commits and human checkpoints remain at slice granularity;
  only the ticking is immediate. The Coding-rules bullet is rewritten as a terse
  pointer to step 4a.

## [0.6.0] - 2026-07-15

### Added

- **Per-agent read-contract banners + narrowed read sets (`tighten-stage-read-boundaries`).**
  Each of the seven QRSPI stage agents (questioner, researcher, designer, architect,
  planner, implementer, reviewer) now carries a `> **Read contract**` banner at the
  top of its agent file declaring exactly which within-change artifacts it is
  permitted to open and which it must never open. Read sets are narrowed to the
  minimum required per stage: questioner reads no change-folder artifact;
  researcher reads none (whole `changes/<id>/` banned); designer reads
  `questions.md` + `research.md` only; architect reads `design.md` (S-path) or
  `proposal.md` + `specs/` (V-path); planner reads `slices.md` only; implementer
  reads `tasks.md` only; reviewer reads the full current-change folder by design.
  A cross-change boundary clause -- "never open another change's process artifacts;
  `spec.md` excepted" -- is added to every agent body. The archived-`questions.md`
  read in the questioner (a cross-change read smuggled in as a template lookup)
  is replaced by a reference to `openspec-templates/questions.template.md`. The
  designer's trigger-honouring step is reworded to source scheduled triggers from
  `openspec/specs/**` base specs only. The `workflow` skill gains a "Read Matrix"
  subsection with an 8-row table (stage, agent, within-change reads, cross-change
  rule) as the single authoritative source of the per-agent contracts. A new
  `scripts/lint.mjs` **Check 7 (`checkReadContracts`)** mechanically enforces
  banner presence and banner-vs-matrix agreement for all 7 agent files on every
  CI run. The `migrations/0.6.0.yaml` manifest is extended with a manual
  migration note for repos with locally overridden agent files.

- **`/qrspi:update` command + `qrspi-update` skill for versioned per-repo
  migration.** Introduces an `openspec/.qrspi-version` marker written by
  `/qrspi:init` (bare SemVer, no `v` prefix) that records the kit version each
  repo's `openspec/` layout was initialized against. A new main-loop
  `/qrspi:update [<target-version>]` command reads the marker, resolves the
  target via auto-detect (installed plugin version) with an explicit-arg
  fallback, walks every `migrations/<version>.yaml` entry in ascending SemVer
  order for `marker < v <= target`, hybrid-applies mechanical `edit-file` steps
  automatically and gates judgment steps via `AskUserQuestion`, then bumps the
  marker and prints a ready-to-run `git commit` command (does not auto-commit).
  Edge cases are handled: already-up-to-date exits cleanly; absent marker offers
  to initialize; downgrade is a hard-stop. A new `migrations/` directory ships
  the kit-side manifest (one YAML per release from `0.6.0` onward); `scripts/
  lint.mjs` gains a presence check (every `## [X.Y.Z]` CHANGELOG section must
  have a matching `migrations/<version>.yaml`) plus schema well-formedness
  validation (`edit-file`-only `action`, `openspec/`-scoped paths, required keys,
  SemVer marker format). The `qrspi-release` skill and CONTRIBUTING release
  checklist now include the manifest-entry step as a precondition. README gains
  `/qrspi:update` in the helpers line and an "Updating your repo" note.
  The `copilot/` tree is regenerated at zero drift. See
  `openspec/changes/versioned-update-command/`.

- **`/qrspi:archive` now gates on a merged PR and keeps the backlog in sync.**
  Archival previously moved a change folder under `archive/` unconditionally —
  never verifying the linked PR merged, and never touching `openspec/backlog.md`.
  `/qrspi:archive` now, before delegating to the generated
  `openspec-archive-change` skill, reads the change's `pr.md`, queries the linked
  PR's live status via the host git CLI (`gh` / `az repos` / `glab`, resolved
  from the stack-cheatsheet's `## PR & git workflow` section or inferred from repo
  signals), surfaces the PR number/state/URL, and **hard-blocks** unless the PR is
  `merged` — uniformly for open and closed-unmerged, with distinct hard-stops for
  a missing `pr.md` and an unavailable/unauthenticated CLI. On a successful
  archive it **removes the change's backlog row** and commits it atomically with
  the folder move (the archive flow's first-ever explicit commit step), and
  **proposes the commit target** — a new `chore/archive-<id>` branch (default,
  with a PR-create suggestion) or straight to `main`, since the archive syncs
  delta specs into `openspec/specs/` while typically running post-merge on `main`.
  Adds a parallel PR-status-query line to the `stack.md` cheatsheet template and
  names `/qrspi:archive` as the row-removal owner in the `workflow` skill.
  Claude-only; the `copilot/` tree is regenerated at zero drift. See
  `openspec/changes/archive-requires-merged-pr/`.

## [0.5.0] - 2026-07-08

### Added

- **Ternary run-mode (Full auto / Semi-auto / Manual).** A run-mode prompt now
  appears at the top of a fresh QRSPI stage invocation. **Full auto** chains
  `Q → R → D → S → V → P → I → PR` unattended, auto-advancing the commit step
  (commit + push), the next-stage handoff, Structure's design-approval gate, the
  per-slice Implement checkpoints (per-slice model re-invocation preserved), and
  PR-create — pausing only at the Q product-question pass, the D design review,
  the Q/D/S backlog-capture offers, and a fixed set of hard-stops (failing
  precondition, git commit/push failure, a subagent error/block, or
  implementation diverging from the approved design). **Semi-auto** additionally
  pauses at every stage boundary; **Manual** is the prior every-gate behaviour.
  The mode is held in the orchestrator's context for the life of the chain with
  **no disk persistence** (re-asked on a fresh session); Esc/stop aborts a
  running chain. Implemented as a "Run-mode" procedure in the `workflow` skill
  referenced by all eight stage commands, plus per-procedure auto-branches; the
  implementer's contract now requires returning *blocked* (not committing) on a
  failing lint/typecheck/test so a red slice cannot be auto-pushed. Claude-only;
  the `copilot/` tree is regenerated at zero drift. See
  `openspec/changes/add-auto-mode/`.

### Changed

- **Dropped the `qrspi-` prefix from the three remaining skill names**
  (`qrspi-workflow` → `workflow`, `qrspi-postpr-fix` → `postpr-fix`,
  `qrspi-retrospective` → `retrospective`). As with the earlier subagent-prefix
  drop (v0.3.0), the plugin namespace already prefixes skills, so these were
  stuttering as `qrspi:qrspi-workflow`; they are now the clean `qrspi:workflow`
  and match their unprefixed siblings (`context-hygiene`, `vertical-slice`,
  `openspec-workflow`). Skill directories, frontmatter, every internal reference
  across the seven agents and the stage commands, the live
  `qrspi-command-surface` spec, `CONTRIBUTING.md`, and the generated `copilot/`
  instructions were updated. Lint Check 5's choreography probe now matches the
  backtick-wrapped `` `workflow` `` skill reference. The `.claude/` dev-tooling
  commands (`qrspi-sync-copilot`, `qrspi-readme-audit`) keep their prefix — they
  are not plugin-namespaced, so the prefix is their only scope.

  **Migration:** if you reference these skills by name in your own prompts or
  tooling, update `qrspi-workflow` → `workflow`, `qrspi-postpr-fix` →
  `postpr-fix`, `qrspi-retrospective` → `retrospective` (Claude), and the
  corresponding `copilot/instructions/*.instructions.md` filenames.

---

## [0.4.1] - 2026-06-21

### Fixed

- **Stage gate execution.** All nine QRSPI stage commands (`questions`,
  `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`,
  `followup`) now run on the main-loop orchestrator instead of being routed
  into a subagent by `agent:`/`subtask:` frontmatter. That routing had made the
  AskUserQuestion commit/handoff/approval gates dead under the real
  plugin-invocation path, because a subagent cannot reach AskUserQuestion. Each
  command now delegates only the bounded artifact write to its stage subagent
  via the Agent tool, and the next-stage handoff re-enters the next command in
  the main loop (not a subagent spawn).
- **Retrospective skill mirror references.** `qrspi-retrospective` no longer
  points contributors at a nonexistent `.github/` mirror and
  `./scripts/sync-agent-defs.ps1`; it now names the real `copilot/` mirror,
  regenerated with `node sync-copilot.mjs` (verified by `--check`). Surfaced
  by the `verify-stage-gate-execution` stage-I retrospective.

### Added

- **Lint Check 5 (gate-tool / executor agreement).** A standing
  [`scripts/lint.mjs`](scripts/lint.mjs) guard flags any command that declares a
  non-builtin `agent:` while its body reaches a main-loop-only gate tool
  (`AskUserQuestion`) -- either named inline or invoked transitively via the
  `qrspi-workflow` choreography -- preventing the gate-trapping bug class from
  recurring silently.

---

## [0.4.0] - 2026-06-19

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

### Added

- **README freshness tooling** (recorded retroactively). A CI lint check
  (`scripts/lint.mjs` Check 4) asserting every shipped `/qrspi:*` command is
  documented in the README and vice-versa; a CLAUDE.md "Keep the README current"
  rule; and a `/qrspi-readme-audit` dev command + skill that diffs the README
  against the source surface.

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
