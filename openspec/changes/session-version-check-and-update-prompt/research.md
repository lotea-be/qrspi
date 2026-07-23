# Research — session-version-check-and-update-prompt

> Stage R of QRSPI. Generated 2026-07-23.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Kit version & version marker plumbing** — How the kit's version is stored and read: `plugin.json`, `openspec/.qrspi-version`, `/qrspi:init`, `migrations/` directory.
- **The `/qrspi:update` command and `qrspi-update` skill** — Version-detection mechanism, SemVer comparison logic, migration-walk algorithm, edge-case handling, target-version resolution.
- **Stage command & status command structure** — `status.md` and the eight stage commands: frontmatter, run-location, AskUserQuestion usage, preamble pattern.
- **Run-mode / session-held context mechanism** — How Full/Semi/Manual run-mode is established, recorded, and carried across auto-chained stage re-entries.
- **Skill loading & plugin manifest** — `plugin.json` skill/agent declarations, `claude/skills/` vs `.claude/skills/` distinction, auto-load vs named-load, which skills stage agents load.
- **Lint & copilot-sync infrastructure** — `scripts/lint.mjs` checks (all 8), `sync-copilot.mjs` mapping table, rewrite rules, per-file fixups.

---

## File map

### Area 1 — Kit version & version marker plumbing

- `.claude-plugin/plugin.json` — Plugin manifest consumed by the Claude Code marketplace. Declares the kit's `version` (currently `"0.7.0"`), `name`, `description`, `commands` path (`./claude/commands`), `agents` (array of 7 explicit paths), and `skills` path (`./claude/skills`). The `version` field is the sole canonical version number for the installed kit. No other file in the kit duplicates this value except the migration manifests (each `migrations/<v>.yaml` carries a matching `version` field) and informational prose in `CHANGELOG.md`.

- `openspec/config.yaml` — Sentinel file written by `/qrspi:init`. Contains `schema: spec-driven` and `openspec_version: 1.4.1`. QRSPI uses its presence as the "is-initialized?" check (Glob `openspec/config.yaml`). Not present in the kit repo's own `openspec/` (the kit repo does not self-initialize).

- `openspec/.qrspi-version` — One-line bare SemVer marker (e.g. `0.7.0`), no `v` prefix, no YAML key. Written by `/qrspi:init` (step b-ter) after `openspec/config.yaml`. Read by `/qrspi:update` to obtain the current version `A`. Bumped to target version `B` by the update walk tail. **Not present in the kit repo's own `openspec/` directory** — this marker lives in consumer repos only.

- `claude/commands/init.md` — Bootstrap command (`agent: build`). Contains the authoritative step-by-step for writing `openspec/.qrspi-version`. Step b-ter reads `.claude-plugin/plugin.json` to obtain the version string, then writes `openspec/.qrspi-version` with that bare string using the Write tool. The marker is staged with the rest of `openspec/` in the single `git add openspec/` commit (step 4). Re-init path (step 1) does not explicitly mention the marker; the spec (kit-versioning spec) says this is a stage-I implementation decision.

- `migrations/` — Directory at repo root. Contains one YAML file per kit release from `0.6.0` onward. Current contents:
  - `migrations/0.6.0.yaml` — stub: `automated: []`, `manual:` one item (re-align local stage-agent overrides to new read contracts). `summary`: introduces the marker and `/qrspi:update`, no structural `openspec/` changes required.
  - `migrations/0.7.0.yaml` — stub: `automated: []`, `manual:` two items (re-apply PR reconciliation pass to overridden `pr.md`; re-align implementer to per-task ticking). `summary`: adds two pre-PR reconciliation passes and per-task ticking.

  Filename convention: `<bare-semver>.yaml`, where `<bare-semver>` must match the `version` field inside the file. The `MIGRATION_FLOOR` constant hardcoded in `scripts/lint.mjs` is `"0.6.0"` — every CHANGELOG `## [X.Y.Z]` section at or above this floor must have a matching file.

### Area 2 — The `/qrspi:update` command and `qrspi-update` skill

- `claude/commands/update.md` — Main-loop command (no `agent:` frontmatter, by deliberate design). Accepts an optional `$ARGUMENTS` as `<target-version>`. On invocation, instructs the orchestrator to load skill `qrspi-update` first and then follow its logic. Enumerates six high-level steps: (1) read marker, (2) resolve target, (3) handle edge cases, (4) print plan preview, (5) apply phase, (6) bump marker + stage + print commit command. Explicit constraint: does not auto-commit. Does not use shell-injection (`!`-backtick); reads with Read/Glob tools only. Edits only `openspec/`-scoped paths in automated steps.

- `claude/skills/qrspi-update/SKILL.md` — Shipped skill (in `claude/skills/`, not `.claude/skills/`). Authoritative home of all walk logic:

  **Version resolution (two strategies, priority order):**
  1. Explicit argument (`$ARGUMENTS`) — validated against bare SemVer regex. Always portable.
  2. Auto-detect (primary when no argument) — reads `.claude-plugin/plugin.json` `version` field from the installed plugin, or takes the highest `migrations/<v>.yaml` stem. Flagged as **UNVERIFIED (OQ1 — auto-detect portability)**: no portable primitive exists for a command body to discover its own install directory (cache path encodes version; multiple versions can coexist). If auto-detect is unreliable, falls back to asking the human.

  **SemVer comparison algorithm:** Parse each version string as a `(major, minor, patch)` integer tuple. Compare left-to-right numerically. This is load-bearing: lexical string sort places `0.10.0` before `0.9.0` (wrong); numeric tuple comparison gives `0.9.0 < 0.10.0` (correct). Used for both the walk ordering and the edge-case comparisons.

  **Edge cases (checked before walking):**
  - Already up to date (marker == target): report and exit, walk nothing.
  - No marker present: do NOT assume `0.0.0`. Tell the human, then AskUserQuestion: initialize marker to target version (skip walk) OR supply actual current version (then walk). This gate is deliberately on the main loop.
  - Downgrade (marker > target): hard-stop. No reverse migrations.

  **Walk algorithm:**
  1. Glob `migrations/*.yaml`. Each filename stem is a bare SemVer `v`.
  2. Filter: `A < v <= B` (strictly above marker, up to and including target).
  3. Sort numerically ascending (not string-lexicographic).
  4. Process each `migrations/<v>.yaml` fully (automated then manual) before the next.

  **Plan preview:** Before applying, print each version in the walk list with its `summary` and counts of `automated` / `manual` steps.

  **Apply phase — automated steps (`edit-file` dispatcher):**
  - Guard: `action` must be `edit-file`; `path` must start with `openspec/`; no shell execution. Any violation is a hard-stop.
  - Read target file → apply deterministic edit (one of: `find`+`replace`, `find_all`+`replace`, `insert_after`+`content`, `insert_before`+`content`, `append`+`content`, `prepend`+`content`, `overwrite`+`content`) → write result → print one-line confirmation.

  **Apply phase — manual steps:** AskUserQuestion per step ("Done — continue" / "Stop here"). Stop halts walk without bumping marker; warn about idempotency of automated steps on re-run.

  **Tail (after ALL steps for ALL versions):**
  - Write target version `B` to `openspec/.qrspi-version` (Write tool).
  - Stage with `git add openspec/.qrspi-version [<auto-edited paths>...]`.
  - Print `git commit -m "chore: apply qrspi-update migrations to v<B>"` as a fenced block. Do NOT auto-commit (OQ5 / D5).

  **Critical invariant:** partial/aborted walk must NOT bump the marker.

### Area 3 — Stage command & status command structure

All nine stage commands plus `status.md` live in `claude/commands/`. All are markdown files with YAML frontmatter.

**Frontmatter pattern across stage commands:** Every stage command carries `description:` but NO `agent:` field paired with a non-builtin agent. This is enforced by lint Check 5 (`checkGateExecutor`) and mandated by the `qrspi-command-surface` spec ("Stage commands run on the main-loop orchestrator"). The commands run their bodies in the main-loop orchestrator and delegate bounded artifact writes to subagents via the Agent tool inline.

**Common preamble (present in every stage command body):**
1. "Read or establish the run-mode by following the **Run-mode** procedure in skill `workflow` before doing any other work."
2. A precondition check (Glob-based, never shell) for the required input artifact.
3. Spawn the relevant subagent via the Agent tool (`subagent_type: qrspi:<agent>`).
4. Follow the canonical commit step and next-stage handoff from skill `workflow`.

**Exceptions/notes per command:**

| Command | `agent:` frontmatter | AskUserQuestion in body? | Notes |
|---|---|---|---|
| `questions.md` | none | Yes — direct, for PQ answers (step 6) | Spawns `questioner` subagent; then orchestrator asks PQ answers inline |
| `research.md` | none | No | Spawns `researcher` subagent; orchestrator only relays result |
| `design.md` | none | Yes — OQ review, decision-by-decision, final confirmation, backlog offers (steps 1–4) | Design's mandatory review loop is entirely on the main loop |
| `structure.md` | none | Yes — approval gate (if no in-chain D approval) and backlog offers | Uses S approval gate logic from workflow skill |
| `slices.md` | none | No | Spawns architect subagent; relays result |
| `plan.md` | none | No | Spawns planner subagent; relays result |
| `implement.md` | none | Yes (Manual mode) — per-slice checkpoint and per-slice commit gates | Full/Semi auto suppresses these via per-slice auto-advance rule |
| `pr.md` | none | Yes — tasks pass loop, follow-ups pass loop, PR-create gate (Manual), seeding followups.md | Contains the two reconciliation pass sections; mode-aware throughout |
| `update.md` | none | Yes (via skill) — manual step gates, no-marker gate | Explicit design decision: must be main loop because AskUserQuestion needed |

**`status.md`:** No `agent:` frontmatter. Runs entirely on main loop. No subagent spawned. Globs `openspec/changes/**/*` to discover in-flight changes; infers next stage from artifact presence; prints the eight-stage map; Greps for un-ticked boxes; no AskUserQuestion in body. Checks `.claude/skills/*-stack/SKILL.md` for stack-cheatsheet presence.

### Area 4 — Run-mode / session-held context mechanism

Defined in `claude/skills/workflow/SKILL.md` (the canonical source), mirrored by the `openspec/specs/qrspi-run-mode/spec.md`.

**Establishing run-mode (three-way branch):**
- If a run-mode is already held in the orchestrator's conversational context from an earlier stage in the same session: silently reuse it. No disk read, no AskUserQuestion.
- If no run-mode is held (fresh session, after `/clear`, or any session without a prior mode): ask via AskUserQuestion with three choices:
  - "Full auto — chain Q→PR, pause only at Q, D, backlog offers, hard-stops"
  - "Semi-auto — auto-advance within-stage gates, pause at each stage boundary"
  - "Manual — pause at every gate (today's behaviour)"
  Note in question text: "Press Esc / stop at any time to interrupt a running auto chain."

**Storage mechanism:** Conversational context only. No disk state (no file, no frontmatter field, no env var, no command-line flag). The spec (`qrspi-run-mode`) explicitly prohibits any disk write: "no disk file, no frontmatter field, no command-line flag, and no environment variable SHALL be read or written to carry the mode across stages." A mid-flow new session (crash, `/clear`, new terminal) causes the mode prompt to re-appear — this is correct, not a bug.

**Precedent for session-held context:** The run-mode is the only currently documented value held purely in conversational context across stage re-entries. The S approval gate also uses in-chain context (if the D review happened in this session, the S gate is satisfied without asking again), but that is an implicit boolean in the orchestrator's context, not a named variable.

**Never-suppressed gates in all modes:**
- The D review (OQ pass + decision-by-decision + final confirmation).
- Backlog-capture offers in Q, D, and S (one AskUserQuestion per item).

### Area 5 — Skill loading & plugin manifest

**`plugin.json` structure:**
```json
{
  "name": "qrspi",
  "version": "0.7.0",
  "commands": "./claude/commands",
  "agents": [
    "./claude/agents/questioner.md",
    "./claude/agents/researcher.md",
    "./claude/agents/designer.md",
    "./claude/agents/architect.md",
    "./claude/agents/planner.md",
    "./claude/agents/implementer.md",
    "./claude/agents/reviewer.md"
  ],
  "skills": "./claude/skills"
}
```
`agents` is an explicit array of 7 paths. `skills` is a directory path — all subdirectories under `claude/skills/` with a `SKILL.md` file are auto-registered as skills by the plugin. There is no per-skill opt-in list.

**`claude/skills/` vs `.claude/skills/` distinction:**
- `claude/skills/` — shipped to consumers via the plugin. Contains 9 skills: `context-hygiene`, `openspec-archive-change`, `openspec-sync-specs`, `openspec-workflow`, `postpr-fix`, `qrspi-update`, `retrospective`, `vertical-slice`, `workflow`. All shipped and consumable by stage agents.
- `.claude/skills/` — dev-tooling only, not shipped. Contains 2 skills: `qrspi-release` and `qrspi-sync-copilot`. These are project-scope and invisible to kit consumers.

**Auto-load vs named-load:** Skills are NOT auto-loaded by the plugin. They must be explicitly loaded in agent/command bodies via "Load skill `<name>`" or "Load skills `a`, `b`" phrases. Lint Check 2 (`checkFrontmatter`) resolves all backtick-wrapped skill names on "Load skill(s)" lines and verifies they resolve to `claude/skills/<name>/SKILL.md`.

**Skills loaded by stage agents (from agent bodies):**
- `researcher.md` — loads `workflow`, `openspec-workflow`.
- `questioner.md` — loads `workflow`, `openspec-workflow`.
- `designer.md` — (body truncated in read, but D stage loads workflow, openspec-workflow per D's input sources).
- `architect.md` — loads `workflow`, `openspec-workflow`, `vertical-slice`.
- `planner.md` — loads `workflow`, `openspec-workflow` (referenced in agent body conventions).
- `implementer.md` — loads `workflow`, `openspec-workflow`, `vertical-slice`.
- `reviewer.md` — loads `workflow`, `openspec-workflow`, `postpr-fix`.

**Skills loaded by stage commands (from command bodies):**
- Every stage command body contains "skill `workflow`" and "skill `openspec-workflow`" references (via the canonical preamble and choreography cross-reference). The update command loads `qrspi-update`.

### Area 6 — Lint & copilot-sync infrastructure

**`scripts/lint.mjs`** — Node.js script, no npm dependencies. Runs 8 numbered checks (exits 0 on all pass, 1 on any violation):

1. **PIN AGREEMENT** — Scans all `.md/.yaml/.yml/.json/.mjs/.ps1/.sh` files (excluding `openspec/changes/` subtree and `generatedBy:` lines in `claude/skills/openspec-*/`) for `@fission-ai/openspec@<version>` and `openspec_version: <version>` patterns. Asserts all occurrences agree on a single version. No fixed expected version — just agreement. Fails if no occurrences found at all.

2. **FRONTMATTER / NAME** — Agents: require `name:` and `description:` fields; `model:` must be an alias (`opus`/`sonnet`/`haiku`), not a pinned id; skill `Load` references in body must resolve. Commands: require `description:`; `agent:` must resolve to a known agent name or a builtin (`build`, `agent`); `model:` alias check. Skills: require `name:` and `description:`.

3. **HEADING ALIGNMENT** — Maps each `openspec-templates/*.template.md` to its writing agent; asserts that the canonical headings for that template appear in the agent's body. Mapping: `questions.template.md`→`questioner`, `design.template.md`→`designer`, `proposal.template.md`→`architect`, `tasks.template.md`→`planner` (no headings to check — dynamic format), `spec-delta.template.md`→`architect`.

4. **README COMMAND COVERAGE** — Forward: every `claude/commands/<stem>.md` is documented in `README.md` as `/qrspi:<stem>`. Reverse: every `/qrspi:<token>` in `README.md` resolves to `claude/commands/<token>.md`. Regex: `/\/qrspi:([a-z][a-z-]*)/g` on README content.

5. **GATE-TOOL / EXECUTOR AGREEMENT** — For each command with a non-builtin `agent:` field, checks whether the body reaches `AskUserQuestion` directly or transitively (via both `` `workflow` `` skill reference AND choreography marker phrases: `Stage choreography`, `commit step`, `next-stage handoff`). If yes, violation — gate tool is main-loop-only and cannot reach a subagent context.

6. **MIGRATION MANIFEST PRESENCE + SCHEMA + MARKER FORMAT** — (a) Presence: `MIGRATION_FLOOR = "0.6.0"` is hardcoded; the floor manifest must exist; every CHANGELOG `## [X.Y.Z]` section at/above the floor must have `migrations/<version>.yaml`. (b) Schema: each manifest must have `version`, `summary`, `automated`, `manual`; `version` must match filename stem; `automated[].action` must be `edit-file`; `automated[].path` must start with `openspec/`. (c) Marker format: if `openspec/.qrspi-version` exists, its content (trimmed) must match bare SemVer regex `^\d+\.\d+\.\d+$`.

7. **READ-CONTRACT BANNER AGREEMENT** — Each of the 7 stage agents must carry a `> **Read contract** — Reads: ... Never opens: ...` banner. The `Reads:` field is extracted (between em-dash and `Never opens:`) and asserted equal to the expected value hardcoded in the checker (derived from the Read Matrix in `workflow` skill). Expected values:
   - `researcher`: `Reads: none (whole changes/<id>/ folder banned).`
   - `questioner`: `Reads: backlog + templates (no change-folder artifact).`
   - `designer`: `Reads: questions.md, research.md.`
   - `architect`: `Reads (S): design.md. Reads (V): proposal.md, specs/.`
   - `planner`: `Reads: slices.md.`
   - `implementer`: `Reads: tasks.md.`
   - `reviewer`: `Reads: full changes/<id>/ folder (by design).`
   Scoped strictly to 7 stage agents; never flags `update.md` or `qrspi-update` skill.

8. **PR RECONCILIATION PASSES STRUCTURE** — Asserts `claude/commands/pr.md` contains structural anchors for both passes: tasks pass (`## Tasks pass`, `Finish it now`, `Drop -- no longer needed`, `Pause --`) and follow-ups pass (`## Follow-ups pass`, `Fix now`, `Defer --`, `Promote to backlog`).

**`sync-copilot.mjs`** — Node.js script, no npm dependencies. Two modes: generate (wipes and recreates `copilot/`) and `--check` (generates to a temp dir, diffs against committed `copilot/`).

**`agentFor` table** (command stem → copilot agent name):
```
qrspi-questions → questioner    qrspi-research → researcher
qrspi-design → designer         qrspi-structure → architect
qrspi-slices → architect        qrspi-plan → planner
qrspi-implement → implementer   qrspi-followup → implementer
qrspi-pr → reviewer
```
Commands not in this table (e.g. `qrspi-init`, `qrspi-update`, `qrspi-status`, `qrspi-stack`, `qrspi-archive`, `qrspi-retro`) map to the generic Copilot `agent` built-in.

**Output structure:** `copilot/agents/copilot-<stem>.agent.md`, `copilot/prompts/qrspi-<stem>.prompt.md`, `copilot/instructions/<skill-dir>.instructions.md`. The `qrspi-sync-copilot` skill and command are skipped from generation (`if (base === 'qrspi-sync-copilot') continue`).

**Frontmatter rewrites (agents):** Extracts `description:`, `tools:` (via `mapTools`: maps Claude tool names to Copilot namespaced ids), and `model:` (adds `> Recommended model: ...` note if `opus`). Output format: `---\ndescription: ...\ntools: [...]\n---`.

**Frontmatter rewrites (prompts):** Adds `description:`, optionally `argument-hint:` (from `hintFor` table), `agent: copilot-<role>` or `agent: agent`. Generic-agent prompts that use `AskUserQuestion` get an explicit `tools:` superset.

**Body rewrites (`rewriteAll`):** Applied to the full assembled file text. Key transforms:
- `$ARGUMENTS` → `${input}` (case-insensitive)
- `~/.claude` → `~/.copilot` and `.claude/` → `.github/`
- `.claude/agents/<X>.md` → `.github/agents/copilot-<X>.agent.md` (with copilot- namespace prefix added, idempotent)
- `Load skill \`X\`` → `Consult the **X** instructions (\`X.instructions.md\`)`
- `AskUserQuestion` → `vscode/askQuestions` (Copilot's structured-question tool)
- `/qrspi:<cmd>` → `/qrspi-<cmd>` (colon form → dash form for Copilot prompt naming)
- Shell-injection `!`backtick → `Run ... and use the result.`
- `@<path>` → `#file:<path>`

**Per-file fixups (`applyFixups`):** Applied after `rewriteAll`, keyed by output relative path. Currently two fixups: `prompts/qrspi-implement.prompt.md` (rewords per-slice model selection for Copilot's lack of `model:` override) and `prompts/qrspi-init.prompt.md` (adjusts PowerShell commands for Copilot's `.github/` layout differences).

**What a new `claude/` file requires of the sync:**
- A new agent in `claude/agents/` → automatically picked up; requires `name:`, `description:`, `tools:` frontmatter.
- A new command in `claude/commands/` → automatically picked up; gets `qrspi-` prefix on output prompt filename. If it delegates to a stage agent, it must appear in the `agentFor` table to route to the right copilot agent (otherwise maps to generic `agent`). If it uses `AskUserQuestion` and maps to generic `agent`, it gets the `promptToolset`.
- A new skill in `claude/skills/` → automatically picked up; requires `name:`, `description:` in frontmatter.
- Any new `claude/` file that references a skill name must also add that skill to `agentFor`/`hintFor` if applicable, or the copilot prompt will point at the generic agent.

---

## Public API surface

The kit ships no HTTP endpoints. Its "public API surface" is the set of slash commands and skill names exposed to consumers.

**Slash commands (via `plugin.json` `commands: ./claude/commands`):**
- `/qrspi:archive`, `/qrspi:design`, `/qrspi:followup`, `/qrspi:implement`, `/qrspi:init`, `/qrspi:plan`, `/qrspi:pr`, `/qrspi:questions`, `/qrspi:research`, `/qrspi:retro`, `/qrspi:slices`, `/qrspi:stack`, `/qrspi:status`, `/qrspi:structure`, `/qrspi:update`

**Skills (via `plugin.json` `skills: ./claude/skills`):**
- `context-hygiene`, `openspec-archive-change`, `openspec-sync-specs`, `openspec-workflow`, `postpr-fix`, `qrspi-update`, `retrospective`, `vertical-slice`, `workflow`

**Stage agents (spawnable via Agent tool, `subagent_type: qrspi:<name>`):**
- `questioner`, `researcher`, `designer`, `architect`, `planner`, `implementer`, `reviewer`

---

## Data model

- `plugin.json` fields: `name` (string), `description` (string), `version` (bare SemVer string), `author.name` (string), `homepage` (URL string), `commands` (relative path to directory), `agents` (array of relative paths to `.md` files), `skills` (relative path to directory).

- `openspec/.qrspi-version` (in consumer repos): one line, bare SemVer (e.g. `0.7.0`), no `v` prefix, no YAML, no trailing non-newline characters.

- Migration manifest (`migrations/<v>.yaml`): `version` (bare SemVer, must equal filename stem), `summary` (scalar string or block scalar, always present), `automated` (list, may be empty), `manual` (list, may be empty). Automated item fields: `description`, `action` (`edit-file` only), `path` (must start with `openspec/`), plus exactly one of the edit pattern fields (`find`+`replace`, `find_all`+`replace`, `insert_after`+`content`, `insert_before`+`content`, `append`+`content`, `prepend`+`content`, `overwrite`+`content`). Manual item fields: `description`.

- `openspec/config.yaml`: `schema` (`spec-driven`), `openspec_version` (informational, OpenSpec CLI ignores it).

- Run-mode (in-session): ternary value `Full` / `Semi` / `Manual`. No on-disk representation.

---

## Implicit contracts and conventions

1. **Version marker is consumer-only.** The kit repo itself does NOT have `openspec/.qrspi-version`. The marker exists only in repos that have run `/qrspi:init`.

2. **`plugin.json` version is the kit's single truth.** `/qrspi:init` reads it (step b-ter) to write the consumer's marker. The auto-detect path of `/qrspi:update` attempts to read it from the installed plugin location.

3. **Migration floor is a hardcoded constant in lint.** `MIGRATION_FLOOR = "0.6.0"` in `lint.mjs` is not derived from the `migrations/` directory contents — changing it requires editing the lint script. Versions below the floor are pre-feature and exempt from the presence check.

4. **Every stage command runs in the main loop (no `agent:` frontmatter).** Enforced by lint Check 5. This is what makes AskUserQuestion gates and the Agent tool reachable from stage commands.

5. **Run-mode is session-context only — never written to disk.** Enforced by the `qrspi-run-mode` spec. No `--mode` flag, no marker file, no frontmatter field.

6. **Auto-detect portability is explicitly marked UNVERIFIED (OQ1).** The `qrspi-update` skill text contains a "Stage-I watch-item" note that auto-detect assumes readable plugin install files, which is not portable across machines/OSes. The explicit `<target-version>` argument is the guaranteed-portable fallback.

7. **SemVer ordering is always numeric tuple, never lexicographic.** The walk algorithm and the lint script both use integer-tuple comparison. This is explicitly load-bearing (the skill notes `0.10.0` vs `0.9.0` as the canonical counterexample).

8. **`copilot/` is fully generated — never hand-edited.** Enforced by `CLAUDE.md`. `sync-copilot.mjs` drops and recreates the whole tree on each run. CI runs `node sync-copilot.mjs --check` to detect drift.

9. **Commands in `agentFor` table produce agent-prefixed Copilot prompts; others use generic `agent`.** Commands not in the table (including `update`, `init`, `status`, `stack`, `retro`, `archive`) get `agent: agent` in the generated Copilot prompt.

10. **Skill `Load` references in agent bodies are lint-checked.** Only backtick-wrapped names on "Load skill(s)" lines are checked (to avoid matching English prose). Resolution: `claude/skills/<name>/SKILL.md` must exist.

11. **The `update.md` command and `qrspi-update` skill are explicitly out-of-scope for lint Check 7.** The check's expected-map keys are the 7 stage agents only; the skill note and the lint comment both state this explicitly.

12. **Migration marker bump is atomic with walk completion.** A partial or aborted walk MUST NOT bump `openspec/.qrspi-version`. This is explicitly stated in both the skill and the spec.

---

## Open gaps

- [ ] **Auto-detect read path not verified end-to-end.** The skill documents it as best-effort (OQ1). The exact mechanism by which the running command discovers the plugin's own install path across OSes/machines is not demonstrated in any file. There is no known-portable implementation of this.
- [ ] **`openspec/config.yaml` `openspec_version` vs plugin `version` coupling.** `init.md` tells the human to "keep `openspec_version` in sync with the pinned version run in step b" (the OpenSpec CLI pin), but lint Check 1 only checks the OpenSpec CLI version pin — it does not assert that `openspec_version` in `config.yaml` matches the kit's own version. These are two different version numbers; the relationship is not mechanically enforced.
- [ ] **Re-init path for the marker is left open.** `init.md` step 1 (already initialized) runs `npx openspec update` but does not explicitly handle whether to update or preserve `openspec/.qrspi-version`. The `kit-versioning` spec says "the design leaves this open per D1's 're-init' note." What `/qrspi:update` should do in this case (marker present but possibly stale after re-init) is unresolved in current files.
- [ ] **`openspec/.qrspi-version` staging in init step 4.** Step 4 of `init.md` uses `git add openspec/` which would include `.qrspi-version`. However, `openspec/` may not be a git-tracked directory yet (it was just created). The interaction between `git add openspec/` and the newly-written marker file is not verified in the current documentation.
- [ ] **Session context carrier for run-mode is the orchestrator's LLM context window.** There is no explicit mechanism documented for how the mode survives a context compaction or a very long session. The spec states "mid-flow new session re-asks and the human re-picks — this is correct behaviour, not a bug", but the boundary between "same session" and "new session" within a single conversation is not defined.
- [ ] **`designer.md` agent body was only partially read** (first 30 lines). The full list of skills loaded by the designer agent in its body was not confirmed from the file; the research above reflects the expected skills from the D stage command body.
