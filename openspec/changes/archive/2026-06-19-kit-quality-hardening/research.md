# Research — kit-quality-hardening

> Stage R of QRSPI. Generated 2026-06-18.
> Ticket is hidden from this stage by design.

## Areas investigated

1. **CI / automation surface** — GitHub Actions, git hooks, Makefile, test runners, and `-Check` behavior of `sync-copilot.ps1`.
2. **The sync generator** — `sync-copilot.ps1` and `sync-copilot.sh`: structure, functions, `-Check` mode, error handling, and hand-maintained tables.
3. **OpenSpec version references** — every location where `1.4.1` or `@fission-ai/openspec` appears.
4. **Stage command structure** — `claude/commands/*.md` and `opsx/*`: frontmatter and recurring structural blocks.
5. **Agent definitions** — `claude/agents/*.md`: frontmatter `tools:` and `model:`, opening skill-load preamble, actual tool exercise.
6. **Skills inventory** — `claude/skills/*` and `.claude/skills/*`: QRSPI-authored vs OpenSpec-generated, and reference map.
7. **opsx commands and openspec-* skills** — `claude/commands/opsx/*` and `claude/skills/openspec-*`: contents, callers, and how `init.md` treats them.
8. **Governance / packaging surface** — `README.md`, `CLAUDE.md`, `LICENSE`, `.claude-plugin/plugin.json`, install/uninstall scripts.
9. **Artifact templates vs inline skeletons** — `openspec-templates/*.template.md` and skeletons embedded in agents.
10. **openspec/ scaffolding** — `openspec/config.yaml`, `openspec/changes/`, `openspec/specs/`, `openspec/backlog.md`.

---

## File map

### Area 1 — CI / automation surface

- `/workspaces/git/qrspi/.github/` — **does not exist**. No GitHub Actions, no workflow YAML, no Actions CI of any kind.
- `/workspaces/git/qrspi/.git/hooks/` — contains only `*.sample` files (Git defaults). No active hooks installed.
- No `Makefile`, no `package.json`, no test runner config (`jest.config*`, `vitest.config*`) found anywhere in the repo root or subdirectories.
- `/workspaces/git/qrspi/sync-copilot.ps1` (lines 240–251) — the `-Check` path. Behavior:
  - Generates output to a temp directory (`$env:TEMP/copilot-check-<8-char-guid>`).
  - Prints `  DIFF: <rel-path>` (yellow) for every file that is missing or content-differs from committed `copilot/`.
  - Prints `\n-Check: N file(s) differ from committed copilot/.` (cyan).
  - Deletes the temp dir with `Remove-Item … -ErrorAction SilentlyContinue`.
  - **Does not set a non-zero exit code** on drift. `$changed` is counted but never passed to `exit` or `$LASTEXITCODE`. The script exits 0 regardless of drift count.
  - `$ErrorActionPreference = 'Stop'` is set globally, so any unhandled PS error produces exit 1, but drift itself does not.

### Area 2 — The sync generator

- `/workspaces/git/qrspi/sync-copilot.ps1` — PowerShell 7+ (`pwsh`) required. Single source of truth for the `claude/ → copilot/` transform.
- `/workspaces/git/qrspi/sync-copilot.sh` — thin bash wrapper (`exec pwsh -NoProfile -File …`). Normalizes `--check`/`-check`/`-Check` to `-Check`. Fails fast with a human-readable error if `pwsh` is not found.

**Parameters:** `param([switch]$Check)`. No other parameters.

**Global error posture:** `$ErrorActionPreference = 'Stop'`.

**Path setup:**
- `$root` = `$PSScriptRoot` (repo root)
- `$src` = `$root/claude`
- `$dst` = `$root/copilot` (normal run) or `$env:TEMP/copilot-check-<guid>` (`-Check` run)

**Hand-maintained tables (lines 31–47):**
- `$agentFor` — maps command stem → agent name. Lists 9 stage commands explicitly by key: `qrspi-questions`, `qrspi-research`, `qrspi-design`, `qrspi-structure`, `qrspi-worktree`, `qrspi-plan`, `qrspi-implement`, `qrspi-followup`, `qrspi-pr`.
- `$hintFor` — maps command stem → `argument-hint` value. Lists 14 keys: the 9 above, plus `qrspi-stack`, `qrspi-retro`, `qrspi-status`, `opsx-propose`, `opsx-explore`, `opsx-apply`, `opsx-archive`, `opsx-sync`.

**Helper functions:**
- `Split-Front([string]$text)` — splits YAML frontmatter from body by `---` boundaries.
- `Get-Field([string]$front, [string]$name)` — regex-extracts a named field from frontmatter YAML.
- `Map-Tools([string]$toolLine)` — maps Claude tool names to VS Code Copilot tool ids. Base set always includes `search/codebase`, `search`, `vscode/askQuestions`. Adds `edit/editFiles` if the source lists `Write` or `Edit`; `execute/runInTerminal` + `execute/getTerminalOutput` if `Bash` or `PowerShell`; `web/fetch` if `WebFetch` or `WebSearch`. Returns comma-joined unique list.
- `Rewrite-All([string]$b)` — ordered text-replacement pass applied to every generated file (body after frontmatter assembly). Rewrites (in order): `$ARGUMENTS → ${input}`; `~/.claude → ~/.copilot`; path references (`.claude/skills/…`, `.claude/commands/…`, `.claude/agents/…`, `.claude/` generic); agent filename prefix (`copilot-`); skill-loading verbs (`Load skill X` → `Consult the **X** instructions …`); shell-injection lines; `@file:` includes; `AskUserQuestion` → `vscode/askQuestions`; subagent delegation verbs; `/qrspi:<cmd>` → `/qrspi-<cmd>`.
- `LRep([string]$text, [string]$old, [string]$new)` — literal string replace (not regex), LF-normalized.
- `Apply-Fixups([string]$rel, [string]$b)` — per-output-path semantic fixups. Two entries currently: `prompts/qrspi-implement.prompt.md` (model-selection advisory text) and `prompts/qrspi-init.prompt.md` (Claude → Copilot noun swaps, sweep command rewrite, empty-`.github/` removal guard).
- `Write-Out($rel, $text)` — applies `Apply-Fixups` then `Set-Content` (UTF-8, no newline terminator before PS adds one).

**Generation flow (lines 180–251):**
1. Drop `$dst` (`Remove-Item -Recurse -Force -ErrorAction SilentlyContinue`) — no guard on `$src` existence before this.
2. Create `$dst/agents`, `$dst/prompts`, `$dst/instructions`.
3. **Agents**: iterate `claude/agents/*.md`, assemble frontmatter with `Map-Tools` and optional `> Recommended model:` note for opus-annotated agents, apply `Rewrite-All`, write to `copilot/agents/copilot-<stem>.agent.md`.
4. **Commands → Prompts**: iterate `claude/commands/*.md` (excluding `qrspi-sync-copilot`), adding `qrspi-` prefix to stem; iterate `claude/commands/opsx/*.md` with `opsx-` prefix. Uses `Emit-Prompt` (assembles frontmatter with `argument-hint`, `agent`, optional `tools` for generic-agent prompts that use `AskUserQuestion`, applies `Rewrite-All`).
5. **Skills → Instructions**: iterate `claude/skills/*/` (excluding `qrspi-sync-copilot`), read `SKILL.md`, silently skip if `SKILL.md` absent (no warning), apply `Rewrite-All`, write to `copilot/instructions/<name>.instructions.md`.
6. Print summary: `Generated -> <dst>: agents=N prompts=N instructions=N`.
7. If `-Check`: compare temp dir against `copilot/`, print diffs, print count, delete temp dir (cleanup is inline, no `try/finally`).

### Area 3 — OpenSpec version references

Every occurrence of `1.4.1` or `@fission-ai/openspec` in the repo:

| File | Kind | Context |
|------|------|---------|
| `/workspaces/git/qrspi/openspec/config.yaml` line 10 | Hand-maintained | `openspec_version: 1.4.1` — informational sentinel written by `/qrspi:init`. |
| `/workspaces/git/qrspi/claude/commands/init.md` lines 22, 28, 41, 47, 81 | Hand-maintained | Five `npx @fission-ai/openspec@1.4.1` invocations plus one `openspec_version: 1.4.1` inline YAML. |
| `/workspaces/git/qrspi/README.md` lines 85, 229, 293, 295, 309 | Hand-maintained | Two `@fission-ai/openspec@1.4.1` prose references; one "pinned (currently `1.4.1`)" statement claiming only "two coupled places" (but there are more); one version bump example using `$ver`. |
| `/workspaces/git/qrspi/.claude/settings.local.json` lines 33–35 | Hand-maintained | Three `Bash(npx @fission-ai/openspec@1.4.1 …)` allow-list entries in project permissions. |
| `/workspaces/git/qrspi/claude/skills/openspec-apply-change/SKILL.md` line 9 | Generated (OpenSpec CLI) | `generatedBy: "1.4.1"` in metadata block. |
| `/workspaces/git/qrspi/claude/skills/openspec-archive-change/SKILL.md` line 9 | Generated (OpenSpec CLI) | `generatedBy: "1.4.1"` in metadata block. |
| `/workspaces/git/qrspi/claude/skills/openspec-explore/SKILL.md` line 9 | Generated (OpenSpec CLI) | `generatedBy: "1.4.1"` in metadata block. |
| `/workspaces/git/qrspi/claude/skills/openspec-propose/SKILL.md` line 9 | Generated (OpenSpec CLI) | `generatedBy: "1.4.1"` in metadata block. |
| `/workspaces/git/qrspi/claude/skills/openspec-sync-specs/SKILL.md` line 9 | Generated (OpenSpec CLI) | `generatedBy: "1.4.1"` in metadata block. |
| `/workspaces/git/qrspi/claude/skills/openspec-workflow/SKILL.md` lines 48–49 | Hand-maintained (QRSPI-authored skill) | Uses `@latest`, not pinned: `npx @fission-ai/openspec@latest init` and `update`. |
| `/workspaces/git/qrspi/openspec/backlog.md` line 23 | Human-authored | Prose reference to `1.4.1` count discrepancy. |
| `/workspaces/git/qrspi/copilot/prompts/qrspi-init.prompt.md` | Generated (`copilot/`) | Mirrors `init.md`; same pinned references — propagated by sync. |
| `/workspaces/git/qrspi/copilot/instructions/openspec-workflow.instructions.md` | Generated (`copilot/`) | Mirrors `openspec-workflow/SKILL.md`; uses `@latest`. |

**README's "two coupled places" claim** (line 293) is inaccurate: there are at minimum 5 hand-maintained locations (`init.md` ×5, `README.md`, `config.yaml`, `settings.local.json` ×3). The README also references `claude/commands/qrspi:init.md` (old filename) rather than `claude/commands/init.md` (current name after the plugin-prefix drop, commit `af29540`).

### Area 4 — Stage command structure

**`claude/commands/` contains 14 files:** `archive.md`, `design.md`, `followup.md`, `implement.md`, `init.md`, `plan.md`, `pr.md`, `questions.md`, `research.md`, `retro.md`, `stack.md`, `status.md`, `structure.md`, `worktree.md`. Plus `opsx/` subdirectory with 5 files.

**Frontmatter patterns:**

| Command | `agent:` | `subtask:` |
|---------|----------|------------|
| `questions.md` | `qrspi-questioner` | `true` |
| `research.md` | `qrspi-researcher` | `true` |
| `design.md` | `qrspi-designer` | `true` |
| `structure.md` | `qrspi-architect` | `true` |
| `worktree.md` | `qrspi-architect` | `true` |
| `plan.md` | `qrspi-planner` | `true` |
| `implement.md` | `qrspi-implementer` | `true` |
| `followup.md` | `qrspi-implementer` | `true` |
| `pr.md` | `qrspi-reviewer` | `true` |
| `archive.md` | `build` | — |
| `init.md` | `build` | — |
| `stack.md` | `build` | — |
| `retro.md` | `build` | — |
| `status.md` | (none) | — |

The `opsx/*.md` files carry OpenSpec-style frontmatter (`name:`, `description:`, `category:`, `tags:`) rather than the QRSPI `agent:`/`subtask:` pattern.

**Recurring structural blocks (9 stage commands, `questions.md` through `pr.md`):**

Every stage command that delegates to a subagent repeats three structural blocks:

1. **Precondition / Glob check** — typically "if `openspec/` does not exist, tell the user to run `/qrspi:init` first and stop." Some stages add per-artifact checks (e.g. `structure.md` checks `design.md` exists and is approved, `worktree.md` checks `proposal.md`).

2. **Commit step (mandatory).** Representative example from `research.md` (lines 39–48):

   ```
   **Commit step (mandatory):** After `research.md` is written, use
   the **AskUserQuestion** tool to ask:
     question: "Commit research.md to the feature branch?"
     choices: ["Yes — commit and push", "No — I'll commit later"]
   If yes, run:
   ```
   git add openspec/changes/<id>/research.md
   git commit -m "docs(<id>): add research.md (QRSPI stage R)"
   git push
   ```
   ```

   The same block (different filenames and commit messages) is repeated verbatim in all 9 stage commands that produce an artifact (`questions.md`, `research.md`, `design.md`, `structure.md`, `plan.md`). The `worktree.md` and `implement.md` commands delegate commit duty to the subagent. `pr.md` has its own PR-creation variant.

3. **Next-stage handoff (mandatory).** Representative example from `research.md` (lines 50–56):

   ```
   **Next-stage handoff (mandatory):** After the commit step, use the
   **AskUserQuestion** tool to ask whether to keep going:
     question: "Stage R (Research) is complete. Continue to stage D (Design) now, or stop here?"
     choices: ["Continue to /qrspi:design <id>", "Stop here — I'll resume later"]
   If they choose **Continue**, invoke `/qrspi:design <id>` now — run it as its own
   stage. If they choose **Stop**, print `Next stage: /qrspi:design <id>` and end
   your turn.
   ```

   This exact pattern appears in `questions.md`, `research.md`, `design.md`, `structure.md`, `plan.md`, `worktree.md`, `pr.md` — all 7 artifact-producing non-implement stages. The specific stage names, artifact filenames, and next-command differ; the AskUserQuestion + invoke/stop pattern is identical.

### Area 5 — Agent definitions

All 7 agents live in `/workspaces/git/qrspi/claude/agents/`:

| Agent file | `tools:` | `model:` |
|-----------|----------|---------|
| `qrspi-questioner.md` | Read, Write, Edit, Bash, Glob, Grep, Skill | sonnet |
| `qrspi-researcher.md` | Read, Write, Edit, Bash, Glob, Grep, Skill | sonnet |
| `qrspi-designer.md` | Read, Write, Edit, Bash, Glob, Grep, Skill, Agent | opus |
| `qrspi-architect.md` | Read, Write, Edit, Bash, Glob, Grep, Skill, Agent | sonnet |
| `qrspi-planner.md` | Read, Write, Edit, Bash, Glob, Grep, Skill | sonnet |
| `qrspi-reviewer.md` | Read, Bash, Glob, Grep, Skill | sonnet |
| `qrspi-implementer.md` | Read, Write, Edit, Bash, Glob, Grep, Skill, Agent | opus |

**Opening "Load skills" preamble variants (quoted from body):**

- `qrspi-researcher.md` (line 40): `Load skills \`qrspi-workflow\`, \`openspec-workflow\`, plus the project's stack-cheatsheet skill if it defines one.`
- `qrspi-questioner.md` (line 26): `Load skills \`qrspi-workflow\` and \`openspec-workflow\` if you have not already done so.`
- `qrspi-designer.md` (line 26): `Load skills \`qrspi-workflow\`, \`openspec-workflow\`, \`context-hygiene\`, plus the project's stack-cheatsheet skill if it defines one.`
- `qrspi-architect.md` (line 37): `Load skills \`qrspi-workflow\`, \`openspec-workflow\`, \`vertical-slice\`, plus the project's stack-cheatsheet skill if it defines one.`
- `qrspi-planner.md` (line 25): `Load skills \`qrspi-workflow\`, \`openspec-workflow\`, \`vertical-slice\`.`
- `qrspi-reviewer.md` (line 20): `Load skills \`qrspi-workflow\`, \`openspec-workflow\`, plus the project's stack-cheatsheet skill if it defines one.`
- `qrspi-implementer.md` (line 27): `Load skills \`qrspi-workflow\`, \`vertical-slice\`, \`context-hygiene\`, plus the project's stack-cheatsheet skill if it defines one.`

**Actual tool exercise vs. granted tools:**

- `qrspi-researcher.md` — granted `Write, Edit, Bash`. Body only directs "Write `research.md`" (Write tool). No Edit calls specified in body. Bash not instructed in body (no shell commands to run for research). Edit is surplus.
- `qrspi-questioner.md` — granted `Write, Edit, Bash`. Body directs "Write `questions.md`". Has `git checkout -b`, `git push` Bash commands via the orchestrating command, not the agent body. Edit is surplus.
- `qrspi-planner.md` — granted `Write, Edit, Bash`. Body directs "Write `tasks.md`". Edit is surplus; Bash not mentioned in body.
- `qrspi-reviewer.md` — granted `Read, Bash, Glob, Grep, Skill` (no Write/Edit). Body references `git status`, `git log` Bash calls (verification only). Lean toolset; Write is correctly absent.
- `qrspi-designer.md` — granted `Agent`. Body references reading "project expert subagent's file" but does not instruct invoking the Agent tool. Agent grant appears unused in the body instructions.
- `qrspi-architect.md` — granted `Agent`. Body references the `Agent` tool implicitly via "run `openspec validate <id>`" (Bash, not Agent). No explicit `Agent tool` invocation instructed in body.
- `qrspi-implementer.md` — granted `Agent`. Body does not explicitly invoke the Agent tool; it instructs the implementer to stop and ask the human about the model mismatch rather than re-delegating. Agent grant appears unused in the body instructions.

### Area 6 — Skills inventory

**`claude/skills/` (11 directories, QRSPI-installed):**

| Skill | Author | `generatedBy` field |
|-------|--------|-------------------|
| `context-hygiene` | QRSPI-authored | none |
| `openspec-apply-change` | OpenSpec CLI | `"1.4.1"` |
| `openspec-archive-change` | OpenSpec CLI | `"1.4.1"` |
| `openspec-explore` | OpenSpec CLI | `"1.4.1"` |
| `openspec-propose` | OpenSpec CLI | `"1.4.1"` |
| `openspec-sync-specs` | OpenSpec CLI | `"1.4.1"` |
| `openspec-workflow` | QRSPI-authored | none |
| `qrspi-postpr-fix` | QRSPI-authored | none |
| `qrspi-retrospective` | QRSPI-authored | none |
| `qrspi-workflow` | QRSPI-authored | none |
| `vertical-slice` | QRSPI-authored | none |

**`.claude/skills/` (project-scope, dev-only, 1 directory):**

| Skill | Author | Purpose |
|-------|--------|---------|
| `qrspi-sync-copilot` | QRSPI-authored | Copilot sync spec + review checklist. Only useful in this kit repo; excluded from `copilot/` generation by `sync-copilot.ps1`. |

**Reference map — which files load which openspec-* skills by name:**

| Skill | Referenced by |
|-------|--------------|
| `openspec-workflow` | All 7 agents; `questions.md`, `retro.md`, `archive.md`; `openspec-explore/SKILL.md`, `openspec-sync-specs/SKILL.md`, `openspec-archive-change/SKILL.md`, `openspec-apply-change/SKILL.md`, `openspec-propose/SKILL.md`, `qrspi-postpr-fix/SKILL.md`, `qrspi-retrospective/SKILL.md` |
| `openspec-archive-change` | `archive.md` (delegates to it), `qrspi-postpr-fix/SKILL.md` |
| `openspec-sync-specs` | `opsx/archive.md` (Task tool invocation), `openspec-archive-change/SKILL.md` |
| `openspec-apply-change` | `openspec-apply-change/SKILL.md` internal only |
| `openspec-explore` | `openspec-explore/SKILL.md` internal only |
| `openspec-propose` | `openspec-propose/SKILL.md` internal only |

### Area 7 — opsx commands and openspec-* skills

**`claude/commands/opsx/` (5 files):**

| File | Description | Frontmatter style |
|------|-------------|------------------|
| `apply.md` | Implement tasks from an OpenSpec change | OpenSpec-style (`name`, `category`, `tags`) |
| `archive.md` | Archive a completed change | OpenSpec-style |
| `explore.md` | Enter explore mode | OpenSpec-style |
| `propose.md` | Propose a change with all artifacts in one step | OpenSpec-style |
| `sync.md` | Sync delta specs to main specs | OpenSpec-style |

Note: `opsx/archive.md` is 165 lines and invokes the Task tool with `subagent_type: "general-purpose"` to delegate to `openspec-sync-specs`. This is the only confirmed exercise of a "subagent" pattern within the opsx commands.

**What references the opsx commands:**
- `sync-copilot.ps1` iterates `claude/commands/opsx/*.md` and generates `copilot/prompts/opsx-*.prompt.md` for each.
- `$hintFor` table in `sync-copilot.ps1` has entries for `opsx-propose`, `opsx-explore`, `opsx-apply`, `opsx-archive`, `opsx-sync`.
- No QRSPI stage agent or command explicitly calls an `opsx:*` command by name.

**`init.md` Step 3 treatment of project-scope opsx/openspec-* tooling (lines 100–121):**

Step 3 runs unconditionally after both init and update paths. It removes:
- `.claude/commands/opsx/` directory (entire directory, recursive)
- `.claude/skills/openspec-*/` directories (glob pattern, all matching)

PowerShell: `Remove-Item -Recurse -Force .claude/commands/opsx -ErrorAction SilentlyContinue` + `Get-ChildItem .claude/skills -Filter 'openspec-*' -Directory … | Remove-Item -Recurse -Force`
POSIX: `rm -rf .claude/commands/opsx; rm -rf .claude/skills/openspec-*`

If `.claude/` is empty afterward, it removes that too. The rationale stated in `init.md`: the opsx/openspec-* tooling belongs in **user scope only** (shipped with the kit), not per-repo. The OpenSpec CLI may write it at project scope during `init`; this sweep removes strays.

### Area 8 — Governance / packaging surface

- `/workspaces/git/qrspi/README.md` — 344 lines. Covers: eight stages table, repo layout, requirements, install (Claude plugin + Copilot script), uninstall, two-tools explanation, sync workflow, fidelity gaps, consuming in another repo, developing further, contributor conventions, relationship to OpenSpec.
- `/workspaces/git/qrspi/CLAUDE.md` — Project instructions. Three rules: never hand-edit `copilot/` (sync instead); never shell out in slash commands (use Glob tool); never write `!`-backtick literally in command/skill markdown.
- `/workspaces/git/qrspi/LICENSE` — exists (not read; governance surface only).
- **No `CONTRIBUTING.md`.** No `CHANGELOG.md`.
- `/workspaces/git/qrspi/.claude-plugin/plugin.json`:
  - `version: "0.1.0"` — the single version field for the Claude Code plugin.
  - `commands: "./claude/commands"` — directory glob (picks up all `.md` files).
  - `agents:` — explicit list of 7 agent paths (not a glob).
  - `skills: "./claude/skills"` — directory glob.
  - Does not list `.claude/skills/qrspi-sync-copilot` (it is in project scope `.claude/`, not `claude/`).

**Install scripts (`install.ps1` / `install.sh`):**
- Target: `~/.copilot/{agents,instructions,prompts}`.
- Method: `Copy-Tree` / `cp -R` — overwrites same-named files, leaves others intact.
- Source trees copied: `copilot/agents`, `copilot/instructions`, `copilot/prompts`.
- Offers to patch VS Code `settings.json` (`chat.promptFilesLocations`, `chat.agentFilesLocations`, `chat.instructionsFilesLocations`). Backs up settings.json before editing; edits as text (not JSON round-trip) to preserve comments.

**Uninstall scripts (`uninstall.ps1` / `uninstall.sh`):**
- Walk the repo's `copilot/{agents,instructions,prompts}` source trees.
- Remove only the matching file at `~/.copilot/<subdir>/<filename>` — no other files touched.
- Prune empty directories after removal.
- Support `-DryRun` / `--dry-run` (list only) and `-Yes` / `--yes` (skip confirmation).
- Do **not** touch VS Code `settings.json` on uninstall.

### Area 9 — Artifact templates vs inline skeletons

**`openspec-templates/` (5 files):**

| Template | Purpose |
|----------|---------|
| `design.template.md` | Documents canonical design shape; contains the full template skeleton in a fenced code block. |
| `proposal.template.md` | Documents canonical proposal shape; contains the template skeleton in a fenced code block. |
| `questions.template.md` | Documents canonical questions shape; contains the template skeleton and usage conventions. |
| `spec-delta.template.md` | Documents the spec-delta shape enforced by `openspec validate`. |
| `tasks.template.md` | Documents the canonical tasks shape. |

**Runtime usage:** The template files are **documentation-only**. No agent reads them at runtime via Read or Glob tool. The agent bodies carry inline skeletons directly:

- `qrspi-designer.md` — carries the full `design.md` skeleton inline (lines 86+). Notes that it mirrors `openspec-templates/design.template.md` but does not read the file.
- `qrspi-architect.md` — carries the full `proposal.md` skeleton inline (lines 53+) and the `spec-delta` format rules. Notes it mirrors `openspec-templates/proposal.template.md` and `openspec-templates/spec-delta.template.md`.
- `qrspi-planner.md` — references `openspec-templates/tasks.template.md` and embeds the skeleton.
- `qrspi-questioner.md` — embeds the full `questions.md` skeleton.
- `qrspi-researcher.md` — embeds the `research.md` skeleton.

The `openspec-workflow` skill documents the template-to-artifact mapping table but also does not read the files at runtime. The `qrspi-retrospective` skill references `openspec-templates/` as a target for edits during retros.

There are currently **three copies** of each canonical shape: (1) `openspec-templates/*.template.md`, (2) inline in the relevant agent body, (3) the `openspec-workflow` skill table (headers only). No automated check that these are consistent.

### Area 10 — openspec/ scaffolding

- `/workspaces/git/qrspi/openspec/config.yaml` — 10 lines. Fields: `schema: spec-driven`, `openspec_version: 1.4.1`. Written by `/qrspi:init` (not the OpenSpec CLI, which skips config in `--tools none` mode). The file is the "is-initialized" sentinel for QRSPI; OpenSpec reads only `schema`, `context`, and `rules`.
- `/workspaces/git/qrspi/openspec/changes/` — contains `archive/` (empty) and `kit-quality-hardening/` (contains only `questions.md`).
- `/workspaces/git/qrspi/openspec/changes/archive/` — empty directory. No archived changes yet.
- `/workspaces/git/qrspi/openspec/specs/` — empty directory. No merged specs yet.
- `/workspaces/git/qrspi/openspec/backlog.md` — 57 lines. Header describes `idea`/`proposed`/`in-progress`/`merged` status values. Currently one entry: `kit-quality-hardening` at `proposed (change folder created 2026-06-18)`.

**`openspec validate` wiring:** Called as bare `openspec validate <id>` (not `npx @fission-ai/openspec@…`) in `qrspi-architect.md` line 175. Requires `openspec` to be globally installed or on PATH, or for `npx` to resolve it. No allow-list entry in `settings.local.json` for `openspec validate`.

**Archiving wiring:** `archive.md` delegates to `openspec-archive-change` skill. The skill performs: artifact/task completion check, delta-spec sync assessment, `archive/YYYY-MM-DD-<id>/` folder move. `openspec validate` is not called during the archive flow (the skill does not reference it).

---

## Public API surface

This is a kit repo, not a web service. The "public surface" is the command set.

**Claude Code (plugin-namespaced):**

| Command | Agent | Artifact written |
|---------|-------|-----------------|
| `/qrspi:questions <id>` | qrspi-questioner | `openspec/changes/<id>/questions.md` |
| `/qrspi:research <id>` | qrspi-researcher | `openspec/changes/<id>/research.md` |
| `/qrspi:design <id>` | qrspi-designer | `openspec/changes/<id>/design.md` |
| `/qrspi:structure <id>` | qrspi-architect | `openspec/changes/<id>/proposal.md` + `specs/` |
| `/qrspi:worktree <id>` | qrspi-architect | `openspec/changes/<id>/worktree.md` |
| `/qrspi:plan <id>` | qrspi-planner | `openspec/changes/<id>/tasks.md` |
| `/qrspi:implement <id>` | qrspi-implementer | code + ticks `tasks.md` |
| `/qrspi:pr <id>` | qrspi-reviewer | PR description draft |
| `/qrspi:archive <id>` | build | moves change to `archive/` |
| `/qrspi:followup <id>` | qrspi-implementer | post-PR fix + ticks `followups.md` |
| `/qrspi:init` | build | `openspec/` scaffolding |
| `/qrspi:stack` | build | `.claude/skills/<repo>-stack/SKILL.md` |
| `/qrspi:status` | (none) | status report (no file) |
| `/qrspi:retro <id> <stage>` | build | edits to kit source files |
| `/qrspi-sync-copilot` (project-scope) | build | regenerates `copilot/` |
| `/opsx:propose`, `/opsx:explore`, `/opsx:apply`, `/opsx:archive`, `/opsx:sync` | (OpenSpec-generated, no agent field) | OpenSpec artifacts |

---

## Data model

No database. The "data model" is the OpenSpec folder structure:

```
openspec/
  config.yaml               # sentinel: schema + openspec_version
  backlog.md                # flat list of ideas/proposed/in-progress/merged rows
  changes/<id>/
    questions.md            # Q artifact
    research.md             # R artifact
    design.md               # D artifact
    proposal.md             # S artifact
    specs/<cap>/spec.md     # S artifact (delta specs, openspec-validate-enforced)
    tasks.md                # P artifact
    worktree.md             # W artifact
    followups.md            # post-PR fix tracker
    pr.md                   # PR link record (written by /qrspi:pr)
  changes/archive/
    YYYY-MM-DD-<id>/        # archived change folders
  specs/<cap>/spec.md       # merged/current specs
```

The canonical artifact shapes (headers enforced by agents/skills, spec-delta grammar enforced by `openspec validate`) are documented in `openspec-templates/`.

---

## Implicit contracts and conventions

1. **`copilot/` is generated, never hand-edited.** Enforced by convention, CLAUDE.md, and a comment in the script. Currently no CI gate enforces it automatically (`-Check` exits 0 on drift).

2. **`$ErrorActionPreference = 'Stop'` in all PowerShell scripts** (`sync-copilot.ps1`, `install.ps1`, `uninstall.ps1`) — unhandled errors abort with non-zero exit.

3. **Model aliases only** — agent `model:` fields use `opus`/`sonnet`/`haiku`, never pinned version ids. Enforced by README convention section; no lint check.

4. **Stack-agnostic language** — agents reference "the project's stack-cheatsheet skill, if any" descriptively, never by a stack-specific name. Convention only.

5. **Commit message pattern** — `docs(<id>): add <artifact>.md (QRSPI stage <X>)` for stage artifacts; `chore(openspec): initialize OpenSpec scaffolding + QRSPI templates` for init. Specified inline in each command; no git hook enforces it.

6. **Backlog atomicity** — backlog edits must land in the same commit as the state change they describe. Convention; not enforced mechanically.

7. **Glob, not shell** — command files must use the Glob tool rather than `ls`/shell-injection to check for files. Enforced by CLAUDE.md's static-scanner rule, which rejects bash redirects on Windows.

8. **`qrspi-sync-copilot` excluded from sync and plugin payload** — the sync script hard-codes `Where-Object { $_.Name -ne 'qrspi-sync-copilot' }` for both commands and skills; the skill lives in `.claude/skills/` not `claude/skills/`, so it is outside the plugin's `"skills": "./claude/skills"` glob.

9. **`openspec validate <id>`** is called as a bare command (no `npx` prefix) in the architect agent body. This assumes `openspec` is on PATH, which is not guaranteed in all environments.

10. **`plugin.json` agents list** — agents are listed individually (not globbed). Any new agent file requires a manual addition to `plugin.json`.

11. **The `-Check` mode does not fail the process on drift** — it prints a human-readable count and exits 0 in all cases, making it unsuitable as a CI gate without a wrapper that checks the output text.

---

## Open gaps

- [ ] The `-Check` path comparison uses `Compare-Object … -Property Name` but only checks file-by-file content for files present in `$dst`. It does not detect files present in `copilot/` but **absent** from the freshly generated output (renames/deletions are not caught by the inner `ForEach-Object` loop; the outer `$diff` is computed but never used).
- [ ] `openspec validate <id>` is called bare (not `npx @fission-ai/openspec@1.4.1 validate`) in the architect agent. Whether this command resolves correctly depends on runtime environment; no confirmation from codebase reading.
- [ ] The `.claude/settings.local.json` allow-list contains entries specific to the dev environment (`PowerShell(& "$env:TEMP\gen-copilot*.ps1")`, etc.) — unclear whether these are commited intentionally or represent leftover dev noise.
- [ ] No confirmation of whether the `plugin.json` `commands: "./claude/commands"` glob includes `opsx/` subdirectory commands, or only the top-level `*.md` files.
- [ ] `qrspi-researcher.md`, `qrspi-questioner.md`, `qrspi-planner.md` all list `Edit` in `tools:` but the body never directs an Edit call — could not confirm from reading alone whether Edit is exercised in practice vs. Write-then-done.
- [ ] `qrspi-designer.md`, `qrspi-architect.md`, `qrspi-implementer.md` all list `Agent` in `tools:` but no explicit Agent tool invocation is found in body text — the intent may be to support expert-subagent delegation the designer/architect can invoke ad-hoc (human-directed), not scripted.
