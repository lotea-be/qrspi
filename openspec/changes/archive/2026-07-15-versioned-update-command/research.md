# Research — versioned-update-command

> Stage R of QRSPI. Generated 2026-07-15.
> Ticket is hidden from this stage by design.

## Areas investigated

1. **Repo initialization scaffolding** — `claude/commands/init.md`: exact steps, files written under `openspec/`, shape/contents of sentinel file, and which `openspec/` files are hand- vs. tool-created.
2. **Plugin version declaration** — `plugin.json` `version` field, every location the version string is referenced or pinned, and how the marketplace pins the source.
3. **Release automation** — `.github/workflows/release.yml`, `CHANGELOG.md` section structure, `CONTRIBUTING.md` release procedure, and `.claude/skills/qrspi-release/SKILL.md` steps.
4. **Shipped command + skill authoring conventions** — structure of `claude/commands/*.md` and `claude/skills/<name>/SKILL.md` files, mapping into `copilot/` via `sync-copilot.mjs`, and which artifacts ship to consumers vs. stay in `.claude/` dev-tooling.
5. **Lint surface** — `scripts/lint.mjs` checks (what each asserts and how structured).
6. **README surface** — sections enumerating commands, install/update flow, repo-layout tree, and two-tool mapping.
7. **Install/update mechanics** — `install.sh` / `install.ps1` scripts and the documented update path for consumers.
8. **Existing scripts + testing conventions** — what lives under `scripts/`, `sync-copilot.mjs` at repo root, and any test harness.

---

## File map

### Area 1 — Repo initialization scaffolding

- `/workspaces/git/qrspi/claude/commands/init.md` — the `/qrspi:init` command. Frontmatter: `description:`, `agent: build`. Body defines two mutually exclusive paths (already-initialized vs. not) plus shared postconditions (steps 3–5). Depends on: Glob tool for the `openspec/config.yaml` sentinel check, `npx` for the OpenSpec CLI, Write tool for the sentinel file, Bash tool for the cleanup and commit steps. Exports nothing; side-effects only.

- `/workspaces/git/qrspi/openspec/config.yaml` — the QRSPI sentinel file that `init` writes. Two fields: `schema: spec-driven` and `openspec_version: 1.4.1`. OpenSpec reads only `schema`/`context`/`rules`; `openspec_version` is informational and QRSPI-only. This file does NOT exist in consuming repos until `/qrspi:init` is run.

### Area 2 — Plugin version declaration

- `/workspaces/git/qrspi/.claude-plugin/plugin.json` — the authoritative version carrier. Fields: `name`, `description`, `version` (currently `"0.5.0"`, SemVer string), `author`, `homepage`, `commands`, `agents` (array of paths), `skills`. `version` is the single source of truth per CONTRIBUTING.md.

- **All hand-maintained locations where the OpenSpec CLI pin (`1.4.1`) appears** (collected by lint Check 1):
  - `claude/commands/init.md` — four occurrences: three `@fission-ai/openspec@1.4.1` CLI invocations + one inline `openspec_version: 1.4.1` in the YAML snippet the command writes.
  - `README.md` — two prose occurrences of `@fission-ai/openspec@1.4.1` (Requirements section + Consuming section).
  - `openspec/config.yaml` — `openspec_version: 1.4.1`.
  - `.github/workflows/ci.yml` — `npx --yes @fission-ai/openspec@1.4.1 validate --all`.
  - `claude/skills/openspec-workflow/SKILL.md` — uses `@latest` (not pinned), so excluded from pin-agreement scope.

- **Marketplace pin**: `lotea-be/ai-agent-marketplace` (a separate repo) holds a `source` field pointing to a release tag `vX.Y.Z`. This is the only thing consumers see; bumping the marketplace ref is the last manual step in a release and is performed outside this repo.

- **`plugin.json` version pin locations** (where the version number itself appears): only in `.claude-plugin/plugin.json`. The README and CONTRIBUTING.md describe where to bump it but do not hard-code the current value. The CI release job derives the version from the tag and asserts it matches `plugin.json`.

### Area 3 — Release automation

- `/workspaces/git/qrspi/.github/workflows/release.yml` — triggers on `push: tags: ['v*']`. Steps in order:
  1. Checkout + Node 20 setup.
  2. Derive `version` from tag (`${GITHUB_REF_NAME#v}`).
  3. Assert tag matches `plugin.json` `version` (`node -p "require('./.claude-plugin/plugin.json').version"`).
  4. Extract `## [X.Y.Z]` section from `CHANGELOG.md` into `release-notes.md` (Node inline script; exits 1 if section missing).
  5. Re-check drift: `node sync-copilot.mjs --check`.
  6. Re-check lint: `node scripts/lint.mjs`.
  7. Publish GitHub Release: `gh release create "$GITHUB_REF_NAME" --title ... --notes-file release-notes.md`.

- `/workspaces/git/qrspi/CHANGELOG.md` — follows Keep a Changelog format. Sections: `## [Unreleased]` (top, always present), then `## [X.Y.Z] - YYYY-MM-DD` in reverse-chronological order. Currently: `[Unreleased]` has content (the `archive-requires-merged-pr` feature), then `[0.5.0] - 2026-07-08`, `[0.4.1]`, `[0.4.0]`, `[0.3.0]`, `[0.2.0]`, `[0.1.0]`. Subsections: `### Added`, `### Changed`, `### Fixed`, `### Removed`. The release.yml extracts the text under `## [X.Y.Z]` verbatim as release notes.

- `/workspaces/git/qrspi/CONTRIBUTING.md` — "Releases (tag-based)" section defines the six-step release procedure: (1) choose version, (2) bump `plugin.json`, (3) roll CHANGELOG Unreleased→versioned section, (4) run lint + drift checks, (5) commit then tag+push, (6) update marketplace ref. "Version-bump checklist" gives a checklist including the pin-coupling rule (OpenSpec CLI pin change requires a matching `plugin.json` bump). Three CI gates documented: `drift` (`node sync-copilot.mjs --check`), `lint` (`node scripts/lint.mjs`), `validate` (`npx --yes @fission-ai/openspec@1.4.1 validate --all`).

- `/workspaces/git/qrspi/.claude/skills/qrspi-release/SKILL.md` — dev-tooling skill (`.claude/`, not shipped in plugin). Preconditions (hard-stops): on `main`, clean tree, in sync with origin; `[Unreleased]` has real content; version is valid and forward; tag is free; lint + drift gates are green. Steps: (1) determine version (AskUserQuestion if not passed), (2) bump `plugin.json`, (3) roll CHANGELOG, (4) re-verify gates, (5) show diff + commit (`git add .claude-plugin/plugin.json CHANGELOG.md`), (6) tag-and-push gate (mandatory AskUserQuestion), (7) remind about external marketplace step.

### Area 4 — Shipped command + skill authoring conventions

**Command file structure (`claude/commands/*.md`):**
- YAML frontmatter between `---` delimiters. Required fields: `description:` (string). Optional: `agent:` (resolves to `claude/agents/<name>.md` or a builtin like `build`, `agent`). Stage commands have no `agent:` field — they run on the main-loop orchestrator. Some carry `model:` (must be alias `opus`/`sonnet`/`haiku`, never a pinned id per lint Check 2).
- Body: prose instructions. Stage commands reference `workflow` skill for choreography; they carry only stage-specific variables (artifact path, commit message, git add line, next-stage command).
- Conventions: no shell-injection (`!`-backtick), no `$ARGUMENTS` used for sensitive data, Glob not shell for file checks. Argument placeholder is `$ARGUMENTS` (rewritten to `${input}` in Copilot output).

**Skill file structure (`claude/skills/<name>/SKILL.md`):**
- YAML frontmatter. Required fields: `name:` and `description:`. Optional: `metadata:` block.
- Body: prose reference content. Model-invoked on demand.
- Skills are in `claude/skills/` (shipped to consumers via plugin) or `.claude/skills/` (dev-tooling, NOT shipped).

**`sync-copilot.mjs` mapping tables:**

The `agentFor` table (hardcoded in sync-copilot.mjs) maps Copilot prompt stem → agent:
```
qrspi-questions → questioner     qrspi-research → researcher
qrspi-design → designer          qrspi-structure → architect
qrspi-slices → architect         qrspi-plan → planner
qrspi-implement → implementer    qrspi-followup → implementer
qrspi-pr → reviewer
```

The `hintFor` table maps Copilot prompt stem → `argument-hint:` value (e.g. `<change-id>`).

**Transformation rules (applied in `rewriteAll`):**
- `$ARGUMENTS` → `${input}`
- `~/.claude` path refs → `~/.copilot`
- `.claude/skills/<x>/SKILL.md` → `.github/instructions/<x>.instructions.md`
- `.claude/commands/<x>.md` → `.github/prompts/<x>.prompt.md`
- Agent files prefixed: `.github/agents/<x>.agent.md` → `.github/agents/copilot-<x>.agent.md`
- `Load skill \`X\`` → `Consult the **X** instructions (\`X.instructions.md\`)`
- `AskUserQuestion` → `vscode/askQuestions` (Copilot's equivalent)
- `/qrspi:<cmd>` → `/qrspi-<cmd>` (namespace flattening)
- Claude command file stems have `qrspi-` prefix added for Copilot output filenames (e.g., `init.md` → `prompts/qrspi-init.prompt.md`).

**Shipped vs. dev-tooling:**
- `claude/commands/*.md` → shipped to consumers as plugin commands (namespaced `/qrspi:*`)
- `claude/skills/*/SKILL.md` → shipped to consumers as plugin skills
- `claude/agents/*.md` → shipped to consumers as plugin subagents
- `.claude/commands/*.md` → project-scope dev-tooling for THIS repo only (e.g., `qrspi-sync-copilot.md`, `qrspi-release.md`, `qrspi-readme-audit.md`); NOT shipped
- `.claude/skills/*/SKILL.md` → project-scope dev-tooling for THIS repo only; NOT shipped

**`sync-copilot.mjs` exclusions**: `claude/commands/qrspi-sync-copilot` (if it existed there) and `claude/skills/qrspi-sync-copilot` are explicitly skipped. The `qrspi-sync-copilot` skill lives in `.claude/skills/` anyway.

### Area 5 — Lint surface

File: `/workspaces/git/qrspi/scripts/lint.mjs` — Node.js ES module, zero npm dependencies, exits 0 on all pass / 1 on any violation.

**Check 1 — PIN AGREEMENT**: Scans all `.md/.yaml/.yml/.json/.mjs/.ps1/.sh` files in `claude/`, `copilot/`, `openspec/` (excluding `openspec/changes/` subtree), `openspec-templates/`, and root-level files. Collects all occurrences matching `@fission-ai/openspec@<version>` or `openspec_version: <version>`. Skips `generatedBy:` lines in `claude/skills/openspec-*/` dirs. Asserts all found versions are identical. Fails if zero occurrences found (cannot assert agreement) or if multiple distinct versions found.

**Check 2 — FRONTMATTER / NAME**: For each `claude/agents/*.md`: requires `name:` and `description:`; validates `model:` is alias not pinned id; validates `Load skill X` backtick references resolve to `claude/skills/<X>/`. For each `claude/commands/**/*.md`: requires `description:`; if `agent:` is present and not a builtin, asserts `claude/agents/<agent>.md` exists; validates `model:` alias. For each `claude/skills/<dir>/SKILL.md`: requires `name:` and `description:`. Builtins: `build`, `agent` (do not resolve to agent files).

**Check 3 — HEADING ALIGNMENT**: For each of 5 template→agent mappings, asserts the agent file body contains all canonical section headings declared for that template. Mappings: `questions.template.md→questioner` (10 headings), `design.template.md→designer` (4 headings), `proposal.template.md→architect` (4 headings), `tasks.template.md→planner` (0 — skipped, dynamic format), `spec-delta.template.md→architect` (3 headings).

**Check 4 — README COMMAND COVERAGE**: Forward check — every `claude/commands/<stem>.md` must appear as `/qrspi:<stem>` in `README.md`. Reverse check — every `/qrspi:<token>` in README must resolve to `claude/commands/<token>.md`. Regex: `/\/qrspi:([a-z][a-z-]*)/g`. Bare `/qrspi` (no colon) is ignored.

**Check 5 — GATE-TOOL / EXECUTOR AGREEMENT**: For each command with a non-builtin `agent:`, checks whether the body reaches `AskUserQuestion` (a main-loop-only tool) directly or transitively (via referencing the `` `workflow` `` skill AND one of the choreography marker phrases: `Stage choreography`, `commit step`, `next-stage handoff`). Flags a violation if a subagent-routed command would trap a main-loop-only gate.

### Area 6 — README surface

File: `/workspaces/git/qrspi/README.md`

**Sections that enumerate commands:**
- "The eight stages" — table with columns `#`, `Stage`, `Command` (`/qrspi:<stage> <id>`), `Artifact`, `Notes`. Rows 1–8.
- Helpers line (inline, below the table): lists `/qrspi` (bare), `/qrspi:init`, `/qrspi:stack`, `/qrspi:followup <id>`, `/qrspi:archive <id>`, `/qrspi:retro <id> <stage>`.
- "Consuming in another repo" section — inline code block listing all 9 consuming-flow commands (`questions` through `archive`).

**Install/update flow section** (heading: "Install"):
- Claude Code subsection: marketplace add + `plugin install` commands. Update path: `plugin marketplace update lotea-agents` then `plugin install qrspi@lotea-agents`. Note about auto-update setting. Mentions `/reload-plugins`.
- Copilot subsection: `install.ps1` and `install.sh` usage. VS Code settings patch behavior.
- Verify and Uninstall subsections.

**Repo-layout tree** (heading: "Repository layout"): shows `claude/`, `copilot/`, `openspec-templates/`, `sync-copilot.mjs`, `install.ps1 / install.sh`, `uninstall.ps1 / uninstall.sh`, `.claude/` (dev-tooling annotation), `README.md`. Does NOT show `scripts/` or `.github/` in the tree.

**Two-tool mapping table** (heading: "Two tools (Claude + Copilot)"): maps `claude/agents/<x>.md` → `copilot/agents/<x>.agent.md`, `claude/commands/<x>.md` → `copilot/prompts/<x>.prompt.md`, `claude/skills/<x>/SKILL.md` → `copilot/instructions/<x>.instructions.md`. Installs-to column shows `~/.copilot/` paths.

**"Updating the pinned OpenSpec version" subsection**: explicitly names the three hand-maintained pin locations: `claude/commands/init.md`, `README.md`, and `openspec/config.yaml`. States `copilot/prompts/qrspi-init.prompt.md` is generated and must not be hand-edited. Procedure: update all `@fission-ai/openspec@<version>` occurrences, run `node sync-copilot.mjs`, commit both source and generated changes.

### Area 7 — Install/update mechanics

**`/workspaces/git/qrspi/install.sh`** (Bash, Linux/macOS):
- Copies `copilot/agents/` → `~/.copilot/agents/`, `copilot/instructions/` → `~/.copilot/instructions/`, `copilot/prompts/` → `~/.copilot/prompts/`. Merge-copy (`cp -R`), overwrites same-named files, leaves other files alone.
- Self-heal sweep: explicitly deletes 8 named stale files from `~/.copilot/` that were shipped by v0.1.0 but no longer exist.
- Offers to patch VS Code user `settings.json` (text-patch, backs up first).

**`/workspaces/git/qrspi/install.ps1`** (PowerShell, cross-platform): equivalent behavior.

**Update path for consumers (Claude Code)**: documented in README as two commands: `plugin marketplace update lotea-agents` (refresh catalog), then `plugin install qrspi@lotea-agents` (pull new version). The marketplace entry's `source` ref must first be bumped to the new release tag by the kit maintainer.

**Update path for consumers (Copilot)**: re-run `install.sh` / `install.ps1` from a fresh clone or pull of the kit repo.

**No `openspec/` update mechanism for consumers**: `/qrspi:init`'s Step 1 handles the "already initialized" case by running `npx @fission-ai/openspec@1.4.1 update`, but there is currently no kit-level command that bumps a per-consuming-repo version marker or runs migration steps when the kit itself changes.

### Area 8 — Existing scripts + testing conventions

**`/workspaces/git/qrspi/scripts/lint.mjs`** — only file under `scripts/`. Node.js ES module. No test harness. No npm dependencies. Zero non-builtin imports (`node:fs`, `node:path`, `node:url`). Runs as `node scripts/lint.mjs`. CI: runs in `lint` job of `.github/workflows/ci.yml`.

**`/workspaces/git/qrspi/sync-copilot.mjs`** — repo-root level. Node.js ES module. No npm dependencies. Two modes: generate (`node sync-copilot.mjs`) and check (`node sync-copilot.mjs --check`). Check mode generates to a temp dir and diffs against committed `copilot/`. CI: runs in `drift` job.

**No test harness**: no `package.json`, no `node_modules`, no test runner, no test files. The only automated verification is CI (3 jobs: drift, lint, validate).

**Node-not-shell convention (CLAUDE.md)**: command and skill markdown files must not use shell-injection (`!`-backtick) or bash redirects. Scripts under `scripts/` use Node.js built-ins only. The `.github/workflows/*.yml` files use standard `run:` steps with bash for simple one-liners.

**CI jobs** (`.github/workflows/ci.yml`, triggers: PR to main + push to main + workflow_dispatch):
1. `drift` — `node sync-copilot.mjs --check`
2. `lint` — `node scripts/lint.mjs`
3. `validate` — `npx --yes @fission-ai/openspec@1.4.1 validate --all`

---

## Public API surface

- `/qrspi:init` — bootstrap `openspec/` in a consuming repo. Writes `openspec/config.yaml` (sentinel) + directory skeleton via OpenSpec CLI. Strips project-scope opsx tooling. Commits `openspec/`. Optional: chains to `/qrspi:stack`.
- `/qrspi:questions <id>` through `/qrspi:pr <id>` — eight QRSPI stages. Each writes one artifact under `openspec/changes/<id>/`.
- `/qrspi:archive <id>` — moves change folder to `openspec/changes/archive/YYYY-MM-DD-<id>/`, syncs delta specs, removes backlog row.
- `/qrspi:followup <id>` — post-PR fix loop.
- `/qrspi:retro <id> <stage>` — retrospective.
- `/qrspi:stack` — bootstrap per-repo stack-cheatsheet skill.
- `/qrspi:status` — print stage map.
- Dev-tooling only (not shipped): `/qrspi-release`, `/qrspi-sync-copilot`, `/qrspi-readme-audit`.

---

## Data model

**`openspec/config.yaml`** (per consuming repo, written by `/qrspi:init`):
```yaml
schema: spec-driven
openspec_version: 1.4.1   # informational; QRSPI-only field
```

**`.claude-plugin/plugin.json`** (kit repo):
```json
{
  "name": "qrspi",
  "version": "0.5.0",       // SemVer; single source of truth
  "commands": "./claude/commands",
  "agents": ["./claude/agents/<name>.md", ...],
  "skills": "./claude/skills"
}
```

**`CHANGELOG.md`** section structure:
```
## [Unreleased]
### Added / Changed / Fixed / Removed

## [X.Y.Z] - YYYY-MM-DD
### Added / Changed / Fixed / Removed
```

**`openspec/backlog.md`** row structure:
```
### <id> — `<status> (<note>)` · **P<N>**
```
Status values: `idea`, `proposed`, `in-progress`, `merged`. Grouped under `## Proposed`, `## In progress`, `## Ideas`.

---

## Implicit contracts and conventions

1. **`openspec/config.yaml` is the sole init sentinel.** `/qrspi:init` uses Glob on this path exclusively. Absence means uninitialized; presence means initialized (run `update` not `init`). No other file serves this role.

2. **`plugin.json` `version` is bumped only at release time**, never in feature PRs. Feature PRs record changes under `## [Unreleased]` only. CLAUDE.md and CONTRIBUTING.md both enforce this rule explicitly.

3. **OpenSpec CLI version is pinned across four hand-maintained locations** (`init.md` ×4 occurrences, `README.md` ×2, `openspec/config.yaml` ×1, `ci.yml` ×1). Lint Check 1 asserts agreement. `openspec-workflow/SKILL.md` uses `@latest` and is excluded from the pin check scope.

4. **`copilot/` is fully generated, never hand-edited.** `sync-copilot.mjs` wipes and recreates it. CI drift job enforces zero divergence. `claude/` and `copilot/` changes must land in the same commit.

5. **Stage commands run on the main-loop orchestrator** (no `agent:` frontmatter on stage commands). The bounded artifact write is delegated to a subagent via the Agent tool; gates (`AskUserQuestion`) stay on the orchestrator. Enforced by lint Check 5.

6. **All `Load skill X` references in agent bodies must resolve** to `claude/skills/<X>/SKILL.md`. Enforced by lint Check 2's `checkSkillRefs`.

7. **Model aliases only** (`opus`/`sonnet`/`haiku`) in `model:` frontmatter fields — never pinned version IDs. Enforced by lint Check 2.

8. **Every shipped command must be documented in README, and every `/qrspi:*` in README must resolve to a command file.** Enforced by lint Check 4 (both directions).

9. **Release is tag-driven**: pushing `vX.Y.Z` tag triggers `release.yml`. Merging to `main` does not release. The tag, `plugin.json` `version`, and `CHANGELOG.md [X.Y.Z]` section must all agree (asserted by `release.yml` steps 3–4).

10. **No per-repo template copies.** Templates live in `openspec-templates/` (kit repo only), travel with the plugin, and are not seeded into consuming repos. Stage agents carry the artifact shapes inline.

11. **`sync-copilot.mjs` `agentFor` table** is a hardcoded parallel representation of which stage command delegates to which agent. It is NOT cross-checked against the command bodies at CI time (open gap surfaced in backlog as `agentFor-frontmatter-crosscheck`).

12. **Commit atomicity rule**: a stage's artifact commit must include any concurrent `openspec/backlog.md` edit in the same commit. Never split them.

---

## Open gaps

- [ ] No existing mechanism in the kit for a consuming repo to know which kit version it is running on. `openspec/config.yaml` records the OpenSpec CLI version (`openspec_version`) but has no field for the QRSPI kit version itself.
- [ ] `/qrspi:init`'s Step 1 (`npx openspec update`) refreshes OpenSpec agent guidance on re-init, but there is no analogous step that would run per-consuming-repo migration or validation when the kit version changes.
- [ ] The `agentFor` table in `sync-copilot.mjs` is not lint-validated against command bodies (acknowledged in backlog as `agentFor-frontmatter-crosscheck`, P3).
- [ ] `scripts/lint.mjs` does NOT check whether `plugin.json` `version` and the latest dated `CHANGELOG.md` section agree (that check only runs in `release.yml`, which requires a tag push to trigger).
- [ ] No automated check validates that `openspec/config.yaml`'s `openspec_version` field agrees with the pin occurrences in `init.md` and `ci.yml` (it is a file-level occurrence, included in lint Check 1's scan, but the `openspec_version:` key itself does not have a semantic validator beyond the regex match).
- [ ] The update path for consuming repos (Claude Code) requires the maintainer to bump the marketplace `source` ref in `lotea-be/ai-agent-marketplace` (a separate repo, not automated by any script in this repo).
- [ ] `scripts/lint.mjs` is the only file under `scripts/`; there is no test harness and no runner for unit or integration tests of the kit's own behavior.
