---
name: research
---

# Research — reassess-openspec-dependency

> Stage R of QRSPI. Generated 2026-07-29.
> Ticket is hidden from this stage by design.

## Areas investigated

- OpenSpec CLI invocation sites: every place the kit shells out to `npx @fission-ai/openspec@...`, with subcommand, flags, and context.
- What `openspec validate` enforces vs. `scripts/lint.mjs`: boundary between CLI-enforced and lint-enforced structural invariants.
- The OpenSpec version pin: every file hardcoding a version string and the Check 1 logic that asserts agreement.
- The two generated skills: frontmatter, CLI calls, step sequence, and overlap with kit-owned `archive.md` / `spec-syncer.md`.
- The `openspec-workflow` skill + folder-layout references: what it documents and where the folder layout is described elsewhere.
- `openspec/` path-prefix hardcoding: count and grouped inventory of distinct sites that hardcode the prefix.
- Migration-manifest schema: lint checks, closed vocabulary, path constraints, and current manifest files.
- CI job layout: jobs, what each runs, and their separation.

---

## File map

### Area 1 — OpenSpec CLI invocation sites

- `claude/commands/init.md` — bootstraps OpenSpec in a consumer repo. Contains four pinned CLI invocations:
  - line 22: `npx @fission-ai/openspec@1.4.1 update` — "already initialized" path, refreshes agent guidance.
  - line 28: `npx @fission-ai/openspec@1.4.1 init --tools none` — repair path when skeleton is corrupted.
  - line 41: `npx @fission-ai/openspec@1.4.1 init --tools none` — "not initialized" path, creates `openspec/` skeleton.
  - (The description field at line 2 also names `npx @fission-ai/openspec init` without a pin.)
  - All four are `agent: build` context (interactive session, not CI).
  - Flags used: `--tools none` (suppresses CLI-native opsx tooling). No `--strict`, `--all`, `--change`, `--json`.

- `claude/skills/openspec-workflow/SKILL.md` — quick-reference skill for folder layout and CLI. Lines 48–49 contain:
  - `npx @fission-ai/openspec@latest init`
  - `npx @fission-ai/openspec@latest update`
  - Both use `@latest`, not a pinned version. These are documentation prose inside a skill, not executed Bash calls.

- `claude/agents/spec-syncer.md` — the `spec-syncer` helper agent. Line 163 (Procedure step 3) says: "Run `openspec validate <id> --strict` via Bash." This is an agent Bash call (not `npx`-prefixed). The agent carries `Bash` in its `tools:` frontmatter. No `--all` flag here — per-change `--strict` only.

- `.github/workflows/ci.yml` — CI `validate` job (line 31):
  - `npx --yes @fission-ai/openspec@1.4.1 validate --all`
  - Pinned to `1.4.1`. Flags: `--all` (validates all specs and active changes). No `--strict` flag (the `--all` form implies strict per `openspec-workflow` skill's note: "CI runs the strict `openspec validate --all`").

- `claude/skills/openspec-archive-change/SKILL.md` — generated skill. Uses bare `openspec` (not `npx`):
  - Step 1: `openspec list --json`
  - Step 2: `openspec status --change "<name>" --json`
  - All are interactive session Bash calls inside a skill. Flags: `--json`, `--change`.

- `claude/skills/openspec-sync-specs/SKILL.md` — generated skill. Uses bare `openspec` (not `npx`):
  - Step 2: `openspec status --change "<name>" --json`
  - Step 1: `openspec list --json`
  - All are interactive session Bash calls. Flags: `--json`, `--change`.

No invocations of `openspec validate` with `--strict` (non-`--all` form) appear in any kit command or skill — that form is only called by the `spec-syncer` agent at Bash level. No `openspec init` or `openspec update` outside `init.md` and `openspec-workflow/SKILL.md`.

**Summary table:**

| File | Subcommand | Flags | Form | Context |
|------|-----------|-------|------|---------|
| `claude/commands/init.md` line 22 | `update` | none | `npx @fission-ai/openspec@1.4.1` | interactive session |
| `claude/commands/init.md` line 28 | `init` | `--tools none` | `npx @fission-ai/openspec@1.4.1` | interactive session |
| `claude/commands/init.md` line 41 | `init` | `--tools none` | `npx @fission-ai/openspec@1.4.1` | interactive session |
| `claude/skills/openspec-workflow/SKILL.md` line 48 | `init` | none | `npx @fission-ai/openspec@latest` | documentation prose |
| `claude/skills/openspec-workflow/SKILL.md` line 49 | `update` | none | `npx @fission-ai/openspec@latest` | documentation prose |
| `claude/agents/spec-syncer.md` (Procedure step 3) | `validate` | `--strict` | bare `openspec` (Bash tool) | agent Bash call |
| `.github/workflows/ci.yml` line 31 | `validate` | `--all` | `npx --yes @fission-ai/openspec@1.4.1` | CI job |
| `claude/skills/openspec-archive-change/SKILL.md` steps 1–2 | `list`, `status` | `--json`, `--change` | bare `openspec` | interactive session skill |
| `claude/skills/openspec-sync-specs/SKILL.md` steps 1–2 | `list`, `status` | `--json`, `--change` | bare `openspec` | interactive session skill |

---

### Area 2 — What `openspec validate` enforces vs. `scripts/lint.mjs`

**`scripts/lint.mjs` checks (Checks 1–21):**

| Check | Function | What it enforces |
|-------|----------|-----------------|
| 1 | `checkPinAgreement` | Every `@fission-ai/openspec@<version>` and `openspec_version: <version>` occurrence in hand-maintained files must agree on one version string. |
| 2 | `checkFrontmatter` | YAML frontmatter fields (`name:`, `description:`, `agent:`, `model:`, `effort:`) are present and valid in all agents, commands, and skills. Agent references resolve; model is an alias. |
| 2b | `checkSkillSets` | Each stage agent's step-1 "Load skills" line matches the approved per-stage registry in `scripts/skill-sets.mjs`. |
| 3 | `checkHeadingAlignment` | Canonical template section headings appear in the matching agent file. |
| 4 | `checkReadmeCoverage` | Every `claude/commands/<stem>.md` is documented in README.md as `/qrspi:<stem>`, and every `/qrspi:<token>` in README resolves to a real file. |
| 5 | `checkGateExecutor` | No command with a non-builtin `agent:` reaches `AskUserQuestion` directly or transitively. |
| 6 | `checkMigrationManifests` | Every CHANGELOG `## [X.Y.Z]` at or above the `0.6.0` floor has a migration manifest; each manifest is schema-valid; `openspec/.qrspi-version` (if present) is bare SemVer. |
| 7 | `checkReadContracts` | Each of the nine stage-agent `> **Read contract**` banners has a `Reads:` field equal to its row in the read matrix. |
| 8 | `checkPrReconciliationPasses` | `claude/commands/pr.md` carries the tasks-pass and follow-ups-pass section headings and their required choice labels. |
| 9 | `checkVersionCheckEmbed` | Nine stage command files each contain the `qrspi-version-check` skill-load line. |
| 10 (budget-gate-embed) | `checkBudgetGateEmbed` | Ten command files (8 stage + archive + followup) each contain the `context-budget-gate` skill-load line. |
| 10 | `checkTriagePaths` | `claude/commands/followup.md` contains all three triage choice-label prefixes (P1/P2/P3). |
| 11 | `checkNoCrudSkeletonHeadings` | Twenty-two surface-gated heading strings do not appear as literal lines inside fenced blocks in six artifact-producing agent files. |
| 12 | `checkOutputContracts` | Each of the nine stage agents carries a `> **Output contract**` banner line. |
| 13 | `checkComputeAnnotations` | Every `**Compute:**` line in committed `slices.md`/`tasks.md` files has a valid `effort=` token (required) and, if present, a valid `model=` token. |
| 14 | `checkSurfaceApplicability` | No active change artifact contains a heading for an absent surface (cross-checked against `.claude/skills/qrspi-stack/SKILL.md`). |
| 15 | `checkVariantAgents` | Implementer variants (`implementer-low/medium/high`) exactly match `IMPLEMENTER_VARIANTS`; each loads only `implementer-core`; each `effort:` field matches its stem suffix; each is registered in `plugin.json`. |
| 16 | `checkFollowupStem` | `claude/commands/followup.md` contains no bare `qrspi:implementer` without a variant suffix. |
| 17 | `checkHelperAgentReadContracts` | The `spec-syncer` agent's `> **Read contract**` banner `Reads:` field matches the helper-agent read-matrix entry. |
| 18 | `checkModifiedScenarioCounts` | No delta spec under `openspec/changes/*/specs/**/spec.md` reduces the `#### Scenario:` count of a MODIFIED requirement relative to its base in `openspec/specs/**`. |
| 19 | `checkAuthoritativeSyncDelegator` | `claude/commands/archive.md` contains `qrspi:spec-syncer`; no kit command/agent has `subagent_type: general-purpose` within 15 lines of a sync-context string. |
| 20 | `checkRequirementFirstLineModal` | Every requirement's first non-blank body line in delta specs (ADDED/MODIFIED sections) and base specs contains `MUST` or `SHALL` (case-sensitive). |
| 21 | `checkFormatRulesParity` | The `<!-- must-leads:begin -->` / `<!-- must-leads:end -->` sentinel blocks in `claude/agents/architect.md` and `openspec-templates/spec-delta.template.md` are byte-identical. |

**Checks 20 and 21 concern spec-delta format directly** (the `## ADDED/MODIFIED/REMOVED Requirements`, `### Requirement:`, `#### Scenario:` structure, and the MUST/SHALL first-line rule).

**What `openspec validate <id> --strict` / `--all` does (inferred from skill prose, not from CLI source):**

The `openspec-workflow` skill (line 84) states: "`openspec validate <id> --strict` enforces the spec-delta shape fully — use the `--strict` flag (plain `openspec validate <id>` skips the MUST/SHALL requirement check, and CI runs the strict `openspec validate --all`)."

The `spec-syncer` agent (Procedure step 3) states: "Run `openspec validate <id> --strict` via Bash. If it fails in a way that would corrupt the base spec (malformed delta, broken block structure), do NOT edit any base spec — return the `escape-hatch` signal."

**Boundary today:** `scripts/lint.mjs` enforces: pin agreement (Check 1), kit-structural invariants (Checks 2–19), MUST/SHALL first-line rule on delta + base specs (Check 20), format-rules parity (Check 21), and the scenario count guard (Check 18). The OpenSpec CLI `validate` enforces: spec-delta block structure (`## ADDED/MODIFIED/REMOVED Requirements`, `### Requirement:`, `#### Scenario:` grammar) and — with `--strict` — the MUST/SHALL first-line rule. Check 20 in lint.mjs duplicates the MUST/SHALL check the CLI performs under `--strict`, creating overlap. Check 18 (scenario count guard) is a QRSPI-specific rule not provided by the CLI.

---

### Area 3 — The OpenSpec version pin

**Every file containing a pinned version string (excluding `openspec/changes/` subtree):**

| File | Line(s) | Version string | Form |
|------|---------|----------------|------|
| `claude/commands/init.md` | 22, 28, 41 | `1.4.1` | `npx @fission-ai/openspec@1.4.1` |
| `claude/commands/init.md` | 82 | `1.4.1` | `openspec_version: 1.4.1` (inline YAML written to `openspec/config.yaml`) |
| `openspec/config.yaml` | 10 | `1.4.1` | `openspec_version: 1.4.1` |
| `README.md` | 166 | `1.4.1` | `npx @fission-ai/openspec@1.4.1` (prose, Requirements section) |
| `README.md` | 245 | `1.4.1` | `npx @fission-ai/openspec@1.4.1 init --tools none` (prose, Consuming section) |
| `README.md` | 309 | `1.4.1` | prose mention of `openspec_version:` field in `openspec/config.yaml` |
| `.github/workflows/ci.yml` | 31 | `1.4.1` | `npx --yes @fission-ai/openspec@1.4.1 validate --all` |
| `CONTRIBUTING.md` | 114, 120 | `1.4.1` | `npx --yes @fission-ai/openspec@1.4.1 validate --all` |
| `CHANGELOG.md` | 643 | `1.4.1` | prose reference in a historical entry |

Note: `claude/skills/openspec-workflow/SKILL.md` uses `@latest` (not pinned) — these lines are excluded from Check 1 only because the generated-skill exclusion applies to `claude/skills/openspec-*/` directories with a `generatedBy:` line; this skill has a `source:` field but no `generatedBy:`, so it is **not** in a generated-skill directory. Whether Check 1 scans it depends on whether `openspec-workflow` is under a path `startsWith('openspec-')` in `claude/skills/` — it is (`claude/skills/openspec-workflow/`). Check 1's `generatedBySkills` set is constructed from dirs starting with `openspec-` inside `claude/skills/`. The `@latest` lines are skipped only if those lines contain `generatedBy:` — they do not; they contain `source:`. So `@latest` is scanned but does not match the pinRe pattern (which requires a SemVer `\d+\.\d+\.\d+`). No violation because `@latest` is not captured by the regex.

**Check 1 (`checkPinAgreement`) mechanics:**

- Pattern: `/(?:@fission-ai\/openspec@|openspec_version:\s*)(\d+\.\d+\.\d+)/g`
- Scanned dirs: `claude/`, `openspec/` (excluding `openspec/changes/`), `openspec-templates/`; plus root-level files.
- File extensions: `.md`, `.yaml`, `.yml`, `.json`, `.mjs`, `.ps1`, `.sh`.
- Exclusions: (a) any file under `openspec/changes/`; (b) any line containing `generatedBy:` in files under `claude/skills/openspec-*/`.
- Assertion: all captured version strings must be identical. Fails if zero occurrences found or if multiple distinct versions found.
- **Does NOT scan `.github/workflows/ci.yml`** — the `.github/` directory is not in the scanned list (only `claude/`, `openspec/`, `openspec-templates/`, and root files). This means the CI YAML's pin is not checked by Check 1.

---

### Area 4 — The two generated skills

**`claude/skills/openspec-archive-change/SKILL.md`:**
- Frontmatter: `name: openspec-archive-change`, `description: Archive a completed change...`, `license: MIT`, `compatibility: Requires openspec CLI.`, `metadata.author: openspec`, `metadata.version: "1.0"`, `metadata.generatedBy: "1.4.1"`.
- No `source:` field.
- CLI calls (bare `openspec`, not `npx`):
  - Step 1: `openspec list --json` (get available changes, user selects)
  - Step 2: `openspec status --change "<name>" --json` (check artifact completion)
- Step sequence: (1) prompt for change if omitted, (2) check artifact completion status via `openspec status --json`, (3) check task completion by reading `tasks.md`, (4) assess delta spec sync state via `artifactPaths.specs.existingOutputPaths` from status JSON, (5) perform folder move via `mkdir -p` + `mv`, (6) display summary.
- The sync step (step 4) spawns a `general-purpose` subagent via `Task tool` to call `openspec-sync-specs` skill.

**`claude/skills/openspec-sync-specs/SKILL.md`:**
- Frontmatter: `name: openspec-sync-specs`, `description: Sync delta specs from a change to main specs...`, `license: MIT`, `compatibility: Requires openspec CLI.`, `metadata.author: openspec`, `metadata.version: "1.0"`, `metadata.generatedBy: "1.4.1"`.
- No `source:` field.
- CLI calls (bare `openspec`, not `npx`):
  - Step 1: `openspec list --json`
  - Step 2: `openspec status --change "<name>" --json` (resolves `artifactPaths.specs.existingOutputPaths`)
- Step sequence: (1) prompt for change, (2) resolve change context via `openspec status --json`, (3) find delta specs from `artifactPaths.specs.existingOutputPaths`, (4) for each delta spec apply ADDED/MODIFIED/REMOVED/RENAMED changes to main spec via intelligent agent-driven merging, (5) show summary.
- Merge rule: "Intelligent Merging" — partial updates, delta represents intent not wholesale replacement; preserves base scenarios not mentioned in delta.

**Kit-owned `claude/commands/archive.md`:**
- Fully re-implements the archive flow as QRSPI-specific logic. Key differences from the generated `openspec-archive-change` skill:
  - PR-merge gate (step 3): reads `pr.md`, queries `gh pr view` (or host equivalent), hard-blocks unless PR is in `merged` state. **Not present in generated skill.**
  - Delta spec sync (step 4a): spawns `spec-syncer` agent (`subagent_type: qrspi:spec-syncer`) with the authoritative wholesale-replacement contract. Routes on three signals: `synced`, `blocked-on-count-drop`, `escape-hatch`. **Contradicts the generated skill's intelligent/partial-merge rule.**
  - After spec sync, delegates step 4 (folder move only) to `openspec-archive-change` skill — reuses only the folder-move and artifact-check steps.
  - Adds: git staging/commit, backlog row removal (`openspec/backlog.md`), commit-target question (new branch vs. main), follow-ups unresolved check (step 2).
  - `archive.md` explicitly instructs to "hard-decline" the generated skill's sync prompt after step 4a has already synced.

**Overlap vs. gap (generated skill vs. kit archive.md):**
- Overlap: artifact-completion check (step 2 of generated skill = step 4 of `archive.md`), task-completion check (step 3 of generated skill = part of step 4), folder move (step 5 of generated skill = step 4 in `archive.md`).
- Gap (kit adds, generated skill lacks): PR-merge gate, authoritative wholesale-replacement delta merge, `spec-syncer` agent routing, git commit, backlog removal, new-session offer.
- Conflict: the generated `openspec-sync-specs` skill's merge rule (partial/intelligent) directly contradicts `spec-syncer`'s authoritative rule (wholesale replacement). `archive.md` explicitly forbids loading `openspec-sync-specs`.

**Kit-owned `claude/agents/spec-syncer.md`:**
- Tools: `Read, Write, Edit, Bash, Glob, Skill`.
- Explicitly forbids loading the generated `openspec-sync-specs` skill.
- Uses bare `openspec validate <id> --strict` (no `npx`) via Bash tool.
- Authoritative MODIFIED = wholesale-replacement contract (contradicts generated `openspec-sync-specs`).

---

### Area 5 — The `openspec-workflow` skill + folder-layout references

**`claude/skills/openspec-workflow/SKILL.md`:**
- Documents: folder layout tree (`openspec/config.yaml`, `openspec/templates/`, `openspec/changes/<change-id>/`, `openspec/changes/archive/`, `openspec/specs/`), CLI quick-reference (`@latest init`, `@latest update`), stage-to-artifact mapping table, canonical artifact shapes table, what happens after a change merges.
- Notes that `openspec/templates/` appears in the layout tree but states in the "Canonical artifact shapes" section: "The canonical templates ship with the QRSPI kit — they travel bundled with the plugin (and live in the kit's own `openspec-templates/`)." Consuming repos do not get a per-repo template copy.
- CLI quick-reference uses `@latest` (not pinned), contrasting with the pinned invocations everywhere else.

**Other locations describing the `openspec/` folder layout or CLI:**

| File | What it covers |
|------|---------------|
| `claude/commands/init.md` | The `openspec/config.yaml` sentinel, `openspec/changes/`, `openspec/specs/`, `openspec/.qrspi-version`; `init --tools none` behavior; removal of `.claude/commands/opsx` and `.claude/skills/openspec-*`. |
| `claude/commands/status.md` | Checks for `openspec/` existence, uses Glob on `openspec/changes/*`. |
| `claude/commands/archive.md` | `openspec/changes/<id>/`, `openspec/changes/archive/`, `openspec/specs/`, `openspec/backlog.md`. |
| `claude/agents/spec-syncer.md` | `openspec/changes/<id>/specs/**/spec.md`, `openspec/specs/<capability>/spec.md`. |
| `claude/agents/architect.md` | `openspec/specs/<capability>/spec.md` (base spec path for new capabilities). |
| `claude/skills/qrspi-version-check/SKILL.md` | `openspec/.qrspi-version`, `openspec/` existence check. |
| `claude/skills/qrspi-update/SKILL.md` | `openspec/.qrspi-version`, `openspec/`-scoped paths for migration steps. |
| `openspec-templates/` (all files) | Reference `openspec/changes/<id>/` and `openspec/specs/<capability>/spec.md` in comments/preambles. |
| `README.md` | Folder layout prose; references `openspec/changes/<id>/`, `openspec/specs/`, `openspec/.qrspi-version`, `openspec/config.yaml`. |
| `.claude/skills/qrspi-stack/SKILL.md` | Project layout tree shows `openspec/` and `openspec-templates/`. |

---

### Area 6 — `openspec/` path-prefix hardcoding (centralization gauge)

Grepping for literal `openspec/` across `claude/**`, `scripts/lint.mjs`, `.github/**`, `openspec-templates/**`, `migrations/**`:

**Total distinct files with `openspec/` occurrences: 44** (kit source only, excluding README, config.yaml, CLAUDE.md, CONTRIBUTING.md, CHANGELOG.md).

**Grouped by directory/file-type:**

| Group | File count | Total occurrences |
|-------|-----------|-------------------|
| `claude/commands/*.md` (12 files) | 12 | ~152 occurrences |
| `claude/agents/*.md` (7 files) | 7 | ~58 occurrences |
| `claude/skills/**/SKILL.md` (7 files) | 7 | ~68 occurrences |
| `scripts/lint.mjs` | 1 | 32 occurrences |
| `openspec-templates/*.template.md` (6 files) | 6 | ~15 occurrences |
| `migrations/*.yaml` (8 files) | 8 | ~9 occurrences |
| `.github/workflows/ci.yml` | 0 (no `openspec/` literal; only CLI invocation) | 0 |

The prefix `openspec/` is scattered across all 44 kit source files with no centralized constant or configuration variable. In `scripts/lint.mjs` specifically, hardcoded path segments include:
- `path.join(root, 'openspec', 'changes')` (lines driving Check 6, 13, 14, 18, 20)
- `path.join(root, 'openspec', 'specs')` (line 2764, driving Check 18/20 base-spec scan)
- `path.join(root, 'openspec', 'changes', 'archive')` (exclusion pattern for Check 14)
- `changesDir` and `baseSpecsDir` variables defined inline per-function (not a module-level constant)
- `.startsWith('openspec/')` string literal in migration path validation (line 1043)
- `'openspec/specs'` as a SYNC_CONTEXT_STRING (line 2764)
- `path.join(root, 'openspec')` in Check 1's `isUnderChanges` exclusion

---

## Slash-command surface

**Slash commands referencing OpenSpec CLI:**

- `claude/commands/init.md` — Exports `/qrspi:init`. Calls `npx @fission-ai/openspec@1.4.1 init --tools none` and `npx @fission-ai/openspec@1.4.1 update`. `agent: build`.
- `claude/commands/archive.md` — Exports `/qrspi:archive`. Delegates spec-sync to `spec-syncer` agent and folder-move to `openspec-archive-change` skill. Invokes no CLI directly; CLI calls are inside the generated skill. `agent: build`.
- `claude/commands/status.md` — Exports `/qrspi:status`. Uses Glob on `openspec/` paths; no CLI call. Main-loop (no `agent:` field).
- `claude/commands/update.md` — Exports `/qrspi:update`. Reads `openspec/.qrspi-version`; no CLI call (delegates to `qrspi-update` skill). Main-loop.

All other stage commands (`questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`, `followup`) reference `openspec/changes/<id>/` paths for artifact reads/writes but make no CLI calls.

---

## Stage-agent surface

**Stage agents with OpenSpec CLI dependency:**

- `claude/agents/spec-syncer.md` — Calls bare `openspec validate <id> --strict` via Bash. This is the only stage/helper agent that directly invokes the CLI.
- All other stage agents (researcher, questioner, designer, architect, planner, implementer-*, reviewer) reference `openspec/changes/<id>/` paths in their read/write contracts but do not call the CLI.

---

## Skill surface

**Skills containing or referencing CLI calls:**

- `claude/skills/openspec-archive-change/SKILL.md` — Generated. Calls bare `openspec list --json`, `openspec status --json`. `generatedBy: "1.4.1"`.
- `claude/skills/openspec-sync-specs/SKILL.md` — Generated. Calls bare `openspec list --json`, `openspec status --json`. `generatedBy: "1.4.1"`.
- `claude/skills/openspec-workflow/SKILL.md` — Kit-authored. Documents `npx @fission-ai/openspec@latest init` and `npx @fission-ai/openspec@latest update` as prose examples (not executed calls). Has `source:` frontmatter, not `generatedBy:`.

---

## Lint-gate surface

### Area 7 — Migration-manifest schema

**Check 6 (`checkMigrationManifests`) — three sub-checks:**

**(a) PRESENCE:** The floor version is a hardcoded constant `MIGRATION_FLOOR = '0.6.0'` (not derived from filesystem contents). Every CHANGELOG `## [X.Y.Z]` at or above `0.6.0` must have a `migrations/<version>.yaml`. The floor manifest `0.6.0.yaml` must always exist.

**(b) SCHEMA:** Each `migrations/*.yaml` must have:
- Required top-level keys: `version`, `summary`, `automated`, `manual`.
- `automated[].action` must equal `'edit-file'` exactly (closed vocabulary — only value allowed).
- `automated[].path` must start with `'openspec/'` (exact string, line 1043: `!step.path.startsWith('openspec/')`).
- `version` field must match the filename stem.

**(c) MARKER FORMAT:** If `openspec/.qrspi-version` exists, its content (after trimming trailing newline) must match `/^\d+\.\d+\.\d+$/` (bare SemVer, no `v` prefix, no other content).

**Current `migrations/*.yaml` files present (8 total):**

| File | Version | Automated steps | Manual steps |
|------|---------|----------------|-------------|
| `0.6.0.yaml` | `0.6.0` | 0 | 2 |
| `0.7.0.yaml` | `0.7.0` | 0 | 2 |
| `0.8.0.yaml` | `0.8.0` | 0 | 1 |
| `0.9.0.yaml` | `0.9.0` | 0 | 1 |
| `0.10.0.yaml` | `0.10.0` | 0 | 3 |
| `0.10.1.yaml` | `0.10.1` | 0 | 1 |
| `0.11.0.yaml` | `0.11.0` | 0 | 0 (empty `manual: []`) |
| `0.12.0.yaml` | `0.12.0` | 0 | 1 |

All eight current manifests have `automated: []` (empty). No manifest has ever used an `automated[].action: edit-file` step in practice. The `automated[].path` constraint (`must start with 'openspec/'`) has therefore never been exercised by a real manifest.

---

### Area 8 — CI job layout

**`.github/workflows/ci.yml`:** Two jobs, both triggered on `pull_request` (to `main`), `push` (to `main`), and `workflow_dispatch`.

| Job | Name | Node | Step(s) | What it covers |
|-----|------|------|---------|----------------|
| `lint` | `lint` | 20 | `node scripts/lint.mjs` | Checks 1–21: pin agreement, frontmatter, heading alignment, README coverage, gate-tool agreement, migration manifests, read contracts, PR structure, version-check embeds, budget-gate embeds, triage anchors, surface-gated headings, output contracts, compute annotations, surface applicability, variant agents, followup stem guard, helper read contracts, scenario count guard, sync delegator, MUST/SHALL first-line, format-rules parity. |
| `validate` | `openspec validate` | 20 | `npx --yes @fission-ai/openspec@1.4.1 validate --all` | Validates all `openspec/specs/**` base specs and all active `openspec/changes/*/` delta specs against the OpenSpec spec-delta grammar. |

The two jobs are **separate** (different job entries, not sequential steps in one job). They run in parallel on the same trigger. There is no `drift` job present in the current `ci.yml` (historical CONTRIBUTING.md references a `drift` job from `sync-copilot.mjs --check`, but no such file or job is in the current repo). The `copilot/` directory and `sync-copilot.mjs` do not exist in the current state.

---

## Notable discrepancies

- The `openspec-workflow` skill uses `@latest` in its CLI quick-reference (lines 48–49), while all executable invocations elsewhere use the pinned `@1.4.1`. Check 1 does not flag this because `@latest` does not match the SemVer capture group in the pin regex.
- Check 1 does NOT scan `.github/workflows/ci.yml` (the `.github/` directory is absent from Check 1's scan list). The CI YAML pin is therefore not asserted in sync with the hand-maintained pins by the lint gate.
- The `openspec-workflow` skill's folder layout tree includes `openspec/templates/` as a directory, but `init.md` (lines 107–111) explicitly states per-repo templates are no longer seeded — the kit ships them. The layout tree in the skill is therefore stale on that one entry.
- `changesDir`, `baseSpecsDir`, and the `'openspec/'` prefix in `scripts/lint.mjs` are defined as inline literals per function, not as a single module-level constant. There are at least 5 distinct places in `lint.mjs` where `path.join(root, 'openspec', ...)` is re-constructed.
- The generated `openspec-archive-change` skill's step 4 uses a `general-purpose` subagent to call `openspec-sync-specs`, which carries a conflicting merge rule (partial/intelligent). `claude/commands/archive.md` explicitly instructs the agent to reject the generated skill's sync prompt after step 4a has already run via `spec-syncer`. The two sync paths (generated vs. kit-owned) run conflicting contracts and `archive.md` must suppress the generated one each time.

---

## Implicit contracts and conventions

- All pinned `npx @fission-ai/openspec@<version>` invocations in executable contexts (agent Bash calls, CLI commands, CI steps) agree on `1.4.1` today.
- The `openspec/` directory name is the fixed workspace root for all QRSPI consumers. No variable or environment override exists for it in kit source.
- `openspec/config.yaml` is QRSPI's "is-initialized" sentinel — not the actual CLI's sentinel (the CLI skips writing config in `--tools none` mode, so `init.md` writes it manually).
- `openspec/.qrspi-version` is QRSPI's own version marker, written at init time and updated by `/qrspi:update`. The CLI has no awareness of this file.
- The generated skills (`openspec-archive-change`, `openspec-sync-specs`) are in `claude/skills/openspec-*/` directories with `generatedBy: "1.4.1"` frontmatter. Check 1 excludes their `generatedBy:` lines from the pin scan.
- The kit treats the generated skills as blackboxes: `archive.md` calls `openspec-archive-change` only for the folder-move step and actively suppresses the skill's own sync assessment post step 4a. `spec-syncer` explicitly forbids loading `openspec-sync-specs`.
- Migration manifests use only `manual:` steps in all 8 current files — the `automated: edit-file` mechanism exists in schema and lint but has never been exercised by a real manifest entry.
- The lint script scans `openspec/changes/` (active changes) but excludes `openspec/changes/archive/` from Checks 14, 20, and the artifact-level scans.

---

## Open gaps

- [ ] Could not determine what `openspec validate --all` does precisely beyond the skill prose ("enforces the spec-delta shape fully" with `--strict`). No CLI source is present in this repo; the exact validation rules enforced by the CLI (beyond MUST/SHALL and block structure) are not documented in any kit file.
- [ ] Could not confirm whether bare `openspec validate <id> --strict` in `spec-syncer.md` resolves correctly in the agent's runtime environment — no confirmation that `openspec` is on PATH or available via npx resolution when the agent runs.
- [ ] `cli.yml` does not include `.github/` in Check 1's scan. Whether this is intentional (treating CI YAML as a non-hand-maintained file) or an oversight is not stated in any comment.
- [ ] The `openspec-workflow` skill's folder layout tree lists `openspec/templates/` but `init.md` says per-repo templates are no longer seeded. Whether the template directory is ever present in consumer repos or is purely stale prose in the skill is unclear without consumer-repo inspection.
- [ ] The `qrspi-update` skill (`claude/skills/qrspi-update/SKILL.md`) is referenced by `claude/commands/update.md` but was not surveyed in depth for additional CLI invocations. Preliminary grep shows it references `openspec/.qrspi-version` and `openspec/`-scoped paths but no `npx @fission-ai/openspec` invocations.
