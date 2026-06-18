# Tasks — kit-quality-hardening

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Node generator + drift gate

**Model:** opus — first-of-kind Node.js port requiring faithful replication of the PowerShell transform contract (frontmatter rewriting, tool-name mapping, path normalization, agent/instruction file generation); also implements the union-of-trees deleted-file detection, which is non-obvious concurrency logic in the generator's check mode

- [x] 1.1 Create `sync-copilot.mjs`: implement the full `claude/ → copilot/` transform contract, carrying over all frontmatter-rewriting, tool-name mapping, and path-normalization rules from `sync-copilot.ps1` (D1)
- [x] 1.2 Add source guard to `sync-copilot.mjs`: validate that `claude/agents/`, `claude/commands/`, and `claude/skills/` exist and are non-empty before wiping `copilot/`; abort with a clear message on failure (D1)
- [x] 1.3 Add `--check` mode to `sync-copilot.mjs`: generate into a temp dir, run a union-of-trees comparison (committed `copilot/` ∪ freshly generated tree), emit per-line diff output, and call `process.exit(1)` on any drift including deleted files; wrap in try/finally to clean the temp dir (D1)
- [x] 1.4 Add missing-`SKILL.md` warning to `sync-copilot.mjs`: warn to stderr and increment a counter that forces a non-zero exit after the full run completes (D1)
- [x] 1.5 Regenerate `copilot/` by running `node sync-copilot.mjs`; commit the full result (D1)
- [x] 1.6 Delete `sync-copilot.ps1` and `sync-copilot.sh`
- [x] 1.7 Update `CLAUDE.md`: replace all `sync-copilot.ps1` / `sync-copilot.sh` references with `sync-copilot.mjs`
- [x] 1.8 Create `.github/workflows/ci.yml`: add the `drift` job (`node sync-copilot.mjs --check`); stub `lint` and `validate` jobs as `echo "TODO"` so CI stays green while the workflow file is live (D2)
- [x] 1.9 Checkpoint: (1) `node sync-copilot.mjs` runs without errors on a clean clone; (2) `node sync-copilot.mjs --check` exits 0 on the committed `copilot/`; (3) introducing a one-line change to any `copilot/` file and re-running `--check` exits 1 with per-line diff output; (4) removing a `claude/commands/` source file and running `--check` exits 1; (5) CI drift job passes on the branch

---

## 2. opsx removal, end to end

**Model:** sonnet — mechanical file deletions and targeted search-and-remove in generator tables, install scripts, and prose; no novel logic

- [ ] 2.1 Delete `claude/commands/opsx/propose.md`, `explore.md`, `apply.md`, `archive.md`, and `sync.md` (D9)
- [ ] 2.2 Delete `claude/skills/openspec-propose/`, `claude/skills/openspec-explore/`, and `claude/skills/openspec-apply-change/` directories (D9)
- [ ] 2.3 Remove all opsx entries from `sync-copilot.mjs` command-mapping and hint tables (the Node equivalents of `$agentFor`/`$hintFor`) (D9)
- [ ] 2.4 Regenerate `copilot/` by running `node sync-copilot.mjs`; confirm no `opsx-*.prompt.md` or `openspec-{propose,explore,apply-change}.instructions.md` files appear in the output
- [ ] 2.5 Add self-heal sweep to `install.ps1`: explicitly delete all 8 stale Copilot files (`opsx-{propose,explore,apply,archive,sync}.prompt.md` + `openspec-{propose,explore,apply-change}.instructions.md`) from `~/.copilot/` before copying new artifacts (D9)
- [ ] 2.6 Add self-heal sweep to `install.sh`: same 8-file deletion sweep as 2.5 (D9)
- [ ] 2.7 Update `plugin.json`: bump `version` to `0.2.0` and update description to drop the "opsx-* OpenSpec helpers" claim (D7, D9)
- [ ] 2.8 Update `README.md`: remove all opsx command references (D9)
- [ ] 2.9 Update `claude/commands/init.md`: remove any opsx command references (D9)
- [ ] 2.10 Checkpoint: (1) `node sync-copilot.mjs` produces no `copilot/prompts/opsx-*.prompt.md` files; (2) `node sync-copilot.mjs` produces no `copilot/instructions/openspec-propose.instructions.md`, `openspec-explore.instructions.md`, or `openspec-apply-change.instructions.md`; (3) `node sync-copilot.mjs --check` exits 0 on the newly regenerated tree; (4) the self-heal section is visible in both `install.ps1` and `install.sh`; (5) `plugin.json` shows `"version": "0.2.0"`

---

## 3. pin lint + frontmatter/name/heading lints

**Model:** sonnet — the lint logic is structured pattern-matching (grep + compare); the heading check is a set-inclusion test; no novel judgment needed once the spec is clear

- [ ] 3.1 Create `scripts/lint.mjs`: implement pin-drift assertion — collect every hand-maintained `1.4.1` occurrence (excluding `generatedBy:` lines in OpenSpec-generated skill files) and exit non-zero if any occurrence disagrees with the others (D3)
- [ ] 3.2 Add frontmatter/name lint to `scripts/lint.mjs`: verify every agent has `name:` and `description:`, every command has `description:`, every skill `SKILL.md` has `name:` and `description:`, every `agent:` reference resolves to an actual agent file, every `model:` field uses an alias (not a pinned model id), and every `Load skill X` reference resolves to a real `claude/skills/<X>/SKILL.md` (D2, D5)
- [ ] 3.3 Add heading-level skeleton check to `scripts/lint.mjs`: verify each canonical section heading from `openspec-templates/*.template.md` also appears in the corresponding inline skeleton in the relevant agent file (D8)
- [ ] 3.4 Replace the stubbed `lint` job in `.github/workflows/ci.yml` with the real implementation: `node scripts/lint.mjs` (D2)
- [ ] 3.5 Update `README.md`: correct the false "two coupled places" claim, fix the stale `claude/commands/qrspi:init.md` path (now `claude/commands/init.md`), and rewrite the pin-bump procedure to use `node sync-copilot.mjs` (D3)
- [ ] 3.6 Update the dev-tooling sync references (scope amendment from slice 1): `.claude/commands/qrspi-sync-copilot.md` and `.claude/skills/qrspi-sync-copilot/SKILL.md` must invoke `node sync-copilot.mjs` / `node sync-copilot.mjs --check` instead of the now-deleted `./sync-copilot.ps1` / `./sync-copilot.sh`. Also fix any remaining `sync-copilot.ps1`/`.sh` mentions in `openspec/backlog.md` prose. Mind CLAUDE.md's exclamation-before-backtick rule. (D1)
- [ ] 3.7 Checkpoint: (1) `node scripts/lint.mjs` exits 0 on the clean branch; (2) manually changing the OpenSpec pin in one file from `1.4.1` to `1.5.0` causes lint to exit 1 and name the mismatched file; (3) adding a `Load skill does-not-exist` line to any agent and running lint exits 1; (4) CI lint job passes on the branch; (5) README no longer says "two coupled places" and the `qrspi:init.md` path is corrected; (6) no live `sync-copilot.ps1`/`.sh` references remain outside the change's own openspec artifacts

---

## 4. choreography DRY + tool-grant audit

**Model:** opus — the DRY refactor requires reading 8 command files and the skill together, judging which text is invariant vs. genuinely stage-specific (the stub/skill split is a judgment call), and writing the canonical sections in `qrspi-workflow` in a way that is both authoritative and readable without each command present; the tool-grant review is mechanical but the refactor reasoning is not

- [ ] 4.1 Add canonical commit-step, next-stage handoff, Glob-based precondition, and backlog-atomicity sections to `claude/skills/qrspi-workflow/SKILL.md` (D4)
- [ ] 4.2 Thin `claude/commands/questions.md` to a stub: keep artifact filename, commit-message template, and next-stage command inline; replace verbatim choreography blocks with a reference to `qrspi-workflow` (D4)
- [ ] 4.3 Thin `claude/commands/research.md` to a stub (same pattern as 4.2) (D4)
- [ ] 4.4 Thin `claude/commands/design.md` to a stub (same pattern as 4.2) (D4)
- [ ] 4.5 Thin `claude/commands/structure.md` to a stub (same pattern as 4.2) (D4)
- [ ] 4.6 Thin `claude/commands/plan.md` to a stub (same pattern as 4.2) (D4)
- [ ] 4.7 Thin `claude/commands/worktree.md` to a stub (same pattern as 4.2) (D4)
- [ ] 4.8 Thin `claude/commands/implement.md` to a stub (same pattern as 4.2) (D4)
- [ ] 4.9 Thin `claude/commands/pr.md` to a stub (same pattern as 4.2) (D4)
- [ ] 4.10 Edit `claude/agents/qrspi-researcher.md` frontmatter: remove `Edit` from `tools:` (D10)
- [ ] 4.11 Edit `claude/agents/qrspi-questioner.md` frontmatter: remove `Edit` from `tools:` (D10)
- [ ] 4.12 Edit `claude/agents/qrspi-planner.md` frontmatter: remove `Edit` from `tools:` (D10)
- [ ] 4.13 Regenerate `copilot/` by running `node sync-copilot.mjs` to propagate tool-grant changes into the Copilot `.agent.md` files (D10)
- [ ] 4.14 Checkpoint: (1) each of the 8 stage command files contains a thin stub (artifact name, commit message, next command) and a `qrspi-workflow` skill reference, not a full verbatim procedure; (2) `claude/skills/qrspi-workflow/SKILL.md` contains the canonical commit-step, handoff, and precondition text; (3) `qrspi-researcher.md`, `qrspi-questioner.md`, and `qrspi-planner.md` frontmatter `tools:` does not include `Edit`; (4) `node sync-copilot.mjs --check` exits 0; (5) CI drift job passes

---

## 5. reference example + validate gate + governance docs

**Model:** sonnet — authoring a reference example is mechanical turn-the-crank work (fill in realistic fictional content following the exact same canonical formats the W stage just used); `CONTRIBUTING.md` and `CHANGELOG.md` are documentation with a clear structure dictated by the spec; no novel judgment

- [ ] 5.1 Create `openspec/changes/archive/2026-06-18-add-greeting/questions.md`: realistic fictional questions for a minimal "add greeting" capability (D6)
- [ ] 5.2 Create `openspec/changes/archive/2026-06-18-add-greeting/research.md`: fictional research findings (D6)
- [ ] 5.3 Create `openspec/changes/archive/2026-06-18-add-greeting/design.md`: fictional design decisions (D6)
- [ ] 5.4 Create `openspec/changes/archive/2026-06-18-add-greeting/proposal.md`: valid OpenSpec proposal shape with `## Why`, `## What Changes`, `## Capabilities`, `## Impact` sections (D6)
- [ ] 5.5 Create `openspec/changes/archive/2026-06-18-add-greeting/specs/greeting/spec.md`: valid spec-delta format so `openspec validate 2026-06-18-add-greeting` passes (D6)
- [ ] 5.6 Create `openspec/changes/archive/2026-06-18-add-greeting/tasks.md`: fictional task list in canonical `## N.` group format (D6)
- [ ] 5.7 Create `openspec/changes/archive/2026-06-18-add-greeting/worktree.md`: fictional worktree with at least one slice (D6)
- [ ] 5.8 Replace the stubbed `validate` job in `.github/workflows/ci.yml` with the real invocation: `npx @fission-ai/openspec@1.4.1 validate 2026-06-18-add-greeting` (D2, D6)
- [ ] 5.9 Create `CONTRIBUTING.md` at the repo root: include the semver discipline table, the sync workflow, the version-bump checklist (including the pin-coupling rule), and a note on convention-only stub drift (D7)
- [ ] 5.10 Create `CHANGELOG.md` at the repo root: Keep-a-Changelog format with `## [Unreleased]`, `## [0.2.0]` (this change — including the opsx removal migration note and the self-heal instruction), and `## [0.1.0]` (D7)
- [ ] 5.11 Checkpoint: (1) `npx @fission-ai/openspec@1.4.1 validate 2026-06-18-add-greeting` exits 0 (run from repo root); (2) `CONTRIBUTING.md` exists at the repo root and contains the sync workflow, semver table, version-bump checklist, and pin-coupling rule; (3) `CHANGELOG.md` exists and contains `## [0.2.0]` with the opsx-removal migration note; (4) CI validate job passes on the branch; (5) all three CI jobs (drift, lint, validate) are green on the PR

---

## 6. Quality gate / Final verification

**Model:** sonnet — mechanical verification of all CI jobs and cross-slice invariants

- [ ] 6.1 Run `node sync-copilot.mjs --check` from the repo root and confirm exit 0 (no uncommitted copilot drift across all five slices combined)
- [ ] 6.2 Run `node scripts/lint.mjs` from the repo root and confirm exit 0 (pin agreement, frontmatter validity, heading-level skeleton alignment)
- [ ] 6.3 Run `npx @fission-ai/openspec@1.4.1 validate 2026-06-18-add-greeting` from the repo root and confirm exit 0
- [ ] 6.4 Confirm `copilot/` contains no `opsx-*.prompt.md` or `openspec-{propose,explore,apply-change}.instructions.md` files
- [ ] 6.5 Confirm all three CI jobs (drift, lint, validate) in `.github/workflows/ci.yml` are non-stub implementations (no `echo "TODO"` remaining)
- [ ] 6.6 Confirm `plugin.json` version is `0.2.0`, `sync-copilot.ps1` and `sync-copilot.sh` are absent from the repo root, and `sync-copilot.mjs` is present and executable
