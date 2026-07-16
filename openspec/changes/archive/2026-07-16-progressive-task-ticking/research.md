# Research — progressive-task-ticking

> Stage R of QRSPI. Generated 2026-07-16.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Implementer agent prompt structure**: Full map of `claude/agents/implementer.md` — sections, numbered steps, and every mention of `tasks.md` checkboxes.
- **tasks.md artifact conventions**: Canonical shape from `openspec-templates/tasks.template.md`, references from other agents, and how the format is documented.
- **Implementer per-slice checkpoint and commit granularity**: How the slice checkpoint, block-signal contract, and per-slice commit step are defined in both `claude/agents/implementer.md` and `claude/commands/implement.md`.
- **Copilot artifact generation**: How `sync-copilot.mjs` maps `claude/agents/implementer.md` to `copilot/agents/copilot-implementer.agent.md`, the rewrite rules applied, and the per-file fixup for the implement prompt.
- **Kit lint checks**: All seven checks in `scripts/lint.mjs` and how a new text-presence assertion would fit in.
- **Backlog and in-flight changes touching the implementer**: Backlog rows whose scope references `implementer.md`, FIX MODE, or per-slice model selection.

---

## File map

### Area 1 — Implementer agent prompt structure

- `/workspaces/git/qrspi/claude/agents/implementer.md` — The QRSPI stage-I agent. Frontmatter: `name: implementer`, `description: ...`, `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`, `model: opus`. Contains all slice machinery, coding rules, divergence self-check gate, fix-mode section, and the per-slice final-message template.

**Complete section inventory:**

| Section (heading) | Line(s) | Purpose |
|---|---|---|
| _(no heading — preamble)_ | 1–6 | YAML frontmatter (name, description, tools, model) |
| _(blockquote)_ Recommended model | 8–16 | Per-slice model annotation rationale; default opus |
| _(blockquote)_ Read contract banner | 17 | Machine-readable read scope: `Reads: tasks.md. Never opens: design.md, slices.md, proposal.md, specs/, questions.md, research.md` |
| `## Precondition` | 19–25 | tasks.md existence gate; trivial-change exception |
| `## Cross-change read boundary` | 27–31 | Forbids all other-change process artifacts; spec.md exception |
| `## What to do` | 33–62 | Numbered steps 1–5 (see detail below) |
| `## Coding rules` | 64–80 | Stack-agnostic rules including the ticking rule |
| `## When you get stuck` | 82–97 | Delegation targets for domain/API/UI questions; design-conflict hard-stop |
| `## ASCII-only in commit messages and PR text` | 99–106 | Character encoding rules for commits |
| `## What you must NOT do` | 108–121 | Prohibitions including tick-faking and (human) tasks |
| `## Before completing a slice — divergence self-check (hard-stop condition 4)` | 125–140 | Self-check rubric before emitting slice final message |
| `## Fix mode (post-PR) — invoked by /qrspi:followup` | 142–161 | POST-PR FIX MODE description; waives slice machinery |
| `## Final message format (per slice)` | 163–202 | Template for per-slice completion message and post-final-slice message |

**Numbered steps in `## What to do`:**

1. Load skills `workflow`, `vertical-slice`, `context-hygiene`, plus stack-cheatsheet if present.
2. Read `openspec/changes/<id>/tasks.md`.
3. Check the current slice's `**Model:**` annotation. Locate the next un-ticked slice; the header carries `**Model:** sonnet|opus — <rationale>`. If not on the annotated model, stop and tell the orchestrator. Do not silently proceed on the wrong model.
4. **Implement exactly one slice at a time**, in order:
   - **4a.** "For each task in the slice, do the work and tick the box."
   - **4b.** Run the slice's tests locally and fix until green.
   - **4c.** Run the project's lint/format and build commands. Report the result.
   - **4d.** Stop at the slice checkpoint. Print a status message and wait for human go-ahead.
5. Never start slice N+1 before slice N's checkpoint is acknowledged.

**All mentions of `tasks.md` checkboxes (verbatim short quotes with location):**

| Location | Verbatim text |
|---|---|
| Frontmatter `description:` field | "ticks tasks.md as it goes" |
| Recommended-model blockquote (line 13) | "the next un-ticked slice's annotation" |
| Step 3 (line 40) | "un-ticked slice in tasks.md" |
| Step 4a (line 50) | "For each task in the slice, do the work and **tick the box**." |
| Coding rules bullet (line 77) | "**Tick the boxes** in `tasks.md` as you complete them. The commit message references the change id." |
| What you must NOT do (line 112) | "only tick task checkboxes" (in "do not modify `design.md`, `proposal.md`, or `tasks.md` *structure* — only tick task checkboxes") |
| What you must NOT do (line 115) | "do not tick the task as if it passed" (in the checkpoint-assertion mismatch rule) |
| What you must NOT do (line 120) | "Leave their boxes unticked and list them at the final checkpoint" (for `(human)` tasks) |
| Fix mode (line 156) | "Tick the `followups.md` box (and any matching `tasks.md` box)." |
| Final message format (line 167) | "Tasks ticked: <list of numbers>" |

There is no instruction specifying *when within a task* the tick must land — the language in step 4a is "do the work and tick the box" (implying coupled), but there is no explicit "tick immediately after the task, before moving to the next task" or "do not batch ticks to slice end" constraint anywhere in the file.

---

### Area 2 — tasks.md artifact conventions

- `/workspaces/git/qrspi/openspec-templates/tasks.template.md` — Canonical shape specification for `tasks.md`. Defines required format, annotation rules, and `(D<n>)` tag convention.

**Canonical shape (from template):**

```
# Tasks — <change-id>

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. <slice name>

**Model:** sonnet|opus — <rationale carried verbatim from slices.md>

- [ ] 1.1 <task> (D1, D2)
- [ ] 1.2 <task> (D6)
...

## 2. <slice name>

**Model:** sonnet|opus — <rationale>

- [ ] 2.1 ...
```

**Format rules (from template):**
- Group headings MUST be `## N. <slice name>` with numeric `N` — no `Slice`, `A/B/C`, or other prefix.
- Checkbox ids MUST be `N.M`, matching their group number.
- `**Model:**` annotation carried verbatim from `slices.md` — do not re-derive.
- `(D<n>)` tags appended where a task implements a numbered `design.md` decision; sourced from `slices.md` tags (not derived from `design.md`).
- `(human)` prefix for tasks the implementer cannot perform itself.
- Optional `## N. Quality gate` / `## N. Final verification` group at the end is permitted.

**How other agents reference tasks.md:**

- `claude/agents/planner.md` — Writes `tasks.md`. Reads only `slices.md`; carries `**Model:**` annotations verbatim; carries `(D<n>)` tags forward from `slices.md`. Step 3 inline skeleton matches the template shape exactly.
- `claude/agents/implementer.md` — Reads `tasks.md` (sole change-folder read). Ticks boxes as work is done.
- `claude/commands/implement.md` — Orchestrator reads tasks.md to find the next un-ticked slice and its `**Model:**` annotation before invoking the implementer subagent.

**Archived example available at (spec.md only read):**
The `tighten-stage-read-boundaries` delta spec at `openspec/changes/archive/2026-07-15-tighten-stage-read-boundaries/specs/qrspi-read-contracts/spec.md` references the tasks.md `(D<n>)` tag convention and confirms the planner reads `slices.md` only.

---

### Area 3 — Implementer per-slice checkpoint and commit granularity

**In `claude/agents/implementer.md`:**

- Step 4d (line 59–61): "Stop at the slice checkpoint. Print a status message describing what to verify and wait for human go-ahead before starting the next slice."
- Step 5 (line 62): "Never start slice N+1 before slice N's checkpoint is acknowledged."
- `## Before completing a slice — divergence self-check` (lines 125–140): Before emitting the slice's final message, self-check against the divergence rubric. "do NOT proceed silently and do NOT commit the slice" on a material divergence.

There is no per-task commit step — all commits are per-slice, not per-task. No "commit immediately after ticking each box" language exists.

**In `claude/commands/implement.md` — block-signal / "do not commit a red slice" contract:**

Lines 44–50 contain the definitive block-signal wording:

> **Implementer block-signal contract (mandatory, all modes).** The implementer MUST return an error or blocked signal -- and MUST NOT commit the slice -- when any check the repo runs (lint, typecheck, tests, `openspec validate`) fails at a slice boundary. This is what makes the orchestrator's hard-stop condition (3) ("subagent returns error or blocked") cover the red-build case in auto mode. In Manual mode this is equally required: do not commit a broken slice even if the human would later be asked. Surface the failure details in the return message and mark the slice as blocked, leaving the working tree uncommitted.

This wording lives in `claude/commands/implement.md` (lines 44–50), under the heading "**Implementer block-signal contract (mandatory, all modes).**"

**Per-slice commit step (from `claude/commands/implement.md`, lines 98–127):**

- After each slice checkpoint passes, the orchestrator (not the implementer subagent) commits: `git add openspec/changes/<id>/tasks.md [openspec/backlog.md] <files-modified-in-this-slice>` followed by `git commit -m "feat(<id>): implement slice N — <slice title>"`.
- On the **final** slice only: update `openspec/backlog.md` and include it in the commit.
- On **intermediate** slices: do not touch `openspec/backlog.md`.
- The commit granularity is one commit per slice, not one commit per task.

**Auto vs. Manual mode branching:**
In Full/Semi auto mode, the orchestrator auto-commits after a successful slice. In Manual mode, an AskUserQuestion gate fires: "Commit Slice N changes to the feature branch?" before committing.

---

### Area 4 — Copilot artifact generation

- `/workspaces/git/qrspi/sync-copilot.mjs` — The deterministic `claude/ -> copilot/` generator. Drops and recreates all of `copilot/` every run.
- `/workspaces/git/qrspi/copilot/agents/copilot-implementer.agent.md` — The generated Copilot counterpart to `claude/agents/implementer.md`.

**Mapping mechanics (`sync-copilot.mjs`):**

The script applies transforms in this order:

1. **`splitFront()`** — Strips YAML frontmatter from the source file.
2. **`rewriteAll()`** — Applies all generic body rewrites:
   - `$ARGUMENTS` → `${input}`
   - `~/. claude` / `$HOME/.claude` path refs → `~/.copilot` / `$HOME/.copilot`
   - `.claude/<kind>/<name>` paths → `.github/<kind>/<name>` equivalent
   - `.github/agents/<name>.agent.md` → `.github/agents/copilot-<name>.agent.md`
   - `Load skill \`X\`` → `Consult the **X** instructions (\`X.instructions.md\`)`
   - `Load skills` → `Consult the instructions for`
   - `AskUserQuestion` references → `vscode/askQuestions` tool references
   - `invoke the <role> subagent` → `continue as the <role>` (softens delegation verb)
   - `/qrspi:<cmd>` → `/qrspi-<cmd>` (namespace rewrite for Copilot prompts)
3. **`applyFixups()`** — Per-file semantic fixups applied after `rewriteAll()`. The implement-specific fixups (keyed on `prompts/qrspi-implement.prompt.md`, not the agent file) replace the per-slice model auto-selection text with a Copilot-specific advisory instructing the user to pick a model in the model picker.

**Agent frontmatter rebuild for `copilot-implementer.agent.md`:**
- `tools:` is derived via `mapTools()` from the source's `tools:` field: maps `Write|Edit` → `edit/editFiles`, `Bash|PowerShell` → terminal tools, always includes `search/codebase, search, vscode/askQuestions`.
- `model: opus` in the source triggers an extra blockquote note: `> Recommended model: a strong reasoning model (this stage runs on Opus under Claude Code).`
- The agent file is output as `copilot/agents/copilot-implementer.agent.md` (prefixed with `copilot-`).

**Deviation from claude source in the generated file:**
None — `applyFixups` has no fixup keyed to `agents/copilot-implementer.agent.md` (only `prompts/qrspi-implement.prompt.md` and `prompts/qrspi-init.prompt.md` have per-file fixups). The copilot agent body is purely the result of `rewriteAll()` plus frontmatter rebuild, with no semantic alteration.

**`--check` mode:**
`node sync-copilot.mjs --check` regenerates the tree to a temp directory, diffs it against the committed `copilot/` tree file by file, prints any `ADDED / DELETED / DIFF` entries with line-by-line positional diffs, and exits with code 1 if any file differs or if any skill SKILL.md is missing. The CI uses this mode to assert zero drift.

---

### Area 5 — Kit lint checks

- `/workspaces/git/qrspi/scripts/lint.mjs` — The CI quality gate. Runs all checks and exits 0 if all pass, 1 if any fail. Uses only Node.js built-ins.

**Seven checks (in order):**

| Check | Function | Mechanism |
|---|---|---|
| 1. Pin agreement | `checkPinAgreement` | Scans all `*.md/.yaml/.yml/.json/.mjs/.ps1/.sh` in `claude/`, `copilot/`, `openspec/` (minus `changes/`), `openspec-templates/`, and root files. Finds all `@fission-ai/openspec@<version>` and `openspec_version: <version>` occurrences. Asserts all occurrences agree on one version string. Excludes `generatedBy:` lines in `claude/skills/openspec-*/`. |
| 2. Frontmatter/name | `checkFrontmatter` | For agents: requires `name:` and `description:` frontmatter, validates `model:` as alias only (not pinned id), validates `Load skill X` backtick-wrapped names resolve to a real `claude/skills/<X>/` directory. For commands: requires `description:`, validates `agent:` resolves if non-builtin. For skills: requires `name:` and `description:`. |
| 3. Heading alignment | `checkHeadingAlignment` | For each template in `openspec-templates/`, checks the corresponding agent body contains all canonical headings declared in `TEMPLATE_CANONICAL_HEADINGS`. tasks.template.md is skipped (dynamic headings, empty list). |
| 4. README command coverage | `checkReadmeCoverage` | Forward: every `claude/commands/<stem>.md` must appear in README.md as `/qrspi:<stem>`. Reverse: every `/qrspi:<token>` in README.md must resolve to a real `claude/commands/<token>.md`. |
| 5. Gate-tool/executor agreement | `checkGateExecutor` | For commands with a non-builtin `agent:`, checks whether the body (directly or transitively via the `workflow` skill's choreography) references `AskUserQuestion`. Flags any command that routes an `AskUserQuestion` call into a subagent where it is unreachable. |
| 6. Migration manifest | `checkMigrationManifests` | (a) Presence: every CHANGELOG `## [X.Y.Z]` at/above the `0.6.0` floor must have `migrations/<version>.yaml`. (b) Schema: each manifest must have `version`, `summary`, `automated`, `manual`; `automated[].action` must be `edit-file`; `automated[].path` must start with `openspec/`. (c) Marker format: `openspec/.qrspi-version` (if present) must be bare SemVer `X.Y.Z`. |
| 7. Read-contract banner | `checkReadContracts` | For each of the seven stage agents, parses the `> **Read contract** — Reads: ... Never opens: ...` banner, extracts the `Reads:` field, and asserts it equals the expected string from the hardcoded `READ_CONTRACT_EXPECTED` map (derived from the approved read matrix). The two-mode architect contract (`Reads (S): design.md. Reads (V): proposal.md, specs/.`) and the reviewer full-folder case are special-cased. Scope: strictly the seven stage agents — never `/qrspi:update` or command files. |

**How a new text-presence assertion would be added:**

The pattern established by every existing check is: (1) add a named `async function check<X>(errors)` that pushes to `errors[]`, (2) call it from `main()` with a `process.stdout.write` header line, (3) return a violation count (or `void` if errors-array push is sufficient). A text-presence assertion (e.g. "implementer body must contain phrase Y") would follow the same shape: read the agent file with `readFileOr`, parse with `splitFront`, assert `body.includes(phrase)`, and push to `errors` if absent.

---

### Area 6 — Backlog and in-flight changes touching the implementer

**In-flight change folders (under `openspec/changes/`):**
- `progressive-task-ticking/` — Contains only `questions.md` at time of research. (This is the current change; its other artifacts do not yet exist.)

**Archive folders (under `openspec/changes/archive/`):**
Seven archived changes: `2026-06-19-example-greeting`, `2026-06-19-kit-quality-hardening`, `2026-06-19-reconcile-plan-worktree-order`, `2026-06-21-verify-stage-gate-execution`, `2026-07-06-add-auto-mode`, `2026-07-15-archive-requires-merged-pr`, `2026-07-15-tighten-stage-read-boundaries`, `2026-07-15-versioned-update-command`. Their process artifacts are off-limits; only spec.md was read.

**Backlog rows referencing `implementer.md`, FIX MODE, or per-slice model selection:**

From `openspec/backlog.md`:

| Row id | Priority | Reference scope |
|---|---|---|
| `progressive-task-ticking` | P2 (`proposed`) | Explicitly references `claude/agents/implementer.md` step 4a and the "Tick the boxes as you complete them" coding rule. Scope stated as "touches `implementer.md` (+ regenerated `copilot/`)" |
| `simplify-per-slice-model-selection` | P3 (`idea`) | References the per-slice `**Model:**` annotation mechanism in the implementer. Argues it is fragile and "breaks on Copilot". Does not directly name `implementer.md` but targets the same annotation the implementer reads. |
| `configurable-effort-and-thinking` | P3 (`idea`) | References per-slice model (the `**Model:**` annotation) and argues effort/thinking should ride the same mechanism. Explicitly tells the reader to "weigh against [[simplify-per-slice-model-selection]]". |
| `right-size-followup-handling` | P2 (`idea`) | References the FIX MODE path ("the `postpr-fix` skill has a single hard-coded path — delegate to the implementer in FIX MODE"). Targets `claude/commands/followup.md` and the `postpr-fix` skill rather than `implementer.md` directly, but the FIX MODE section inside `implementer.md` is the implementation target. |
| `agentFor-frontmatter-crosscheck` | P3 (`idea`) | References `sync-copilot.mjs`'s hardcoded `agentFor` table and the stage commands' subagent declarations, including the implementer's. Non-goal of `verify-stage-gate-execution`. Notes the framing shifts after that change lands. Does not edit `implementer.md` itself. |

No other in-flight change folder (besides `progressive-task-ticking`) exists under `openspec/changes/`.

---

## Public API surface

No HTTP endpoints. The relevant public surfaces are:

- `claude/agents/implementer.md` — Agent definition consumed by Claude Code (via the plugin) and mirrored to `copilot/agents/copilot-implementer.agent.md`.
- `claude/commands/implement.md` — Slash command `/qrspi:implement <id>` consumed by the main-loop orchestrator.
- `openspec-templates/tasks.template.md` — Canonical shape specification for `tasks.md` artifacts.

---

## Data model

- **`tasks.md`** — Artifact shape: `## N. <slice name>` groups, `**Model:** sonnet|opus — <rationale>` annotation per group, `- [ ] N.M <task body> (D<n>)` checkbox items. Produced by the planner, consumed (read only) by the implementer and the implement command.
- **`tasks.md` checkbox state** — Two states: `- [ ]` (open) and `- [x]` (ticked). The implementer is the sole agent allowed to change `- [ ]` to `- [x]`. The command finds the "next un-ticked slice" by scanning for a slice group whose tasks are not all ticked.
- **`(human)` prefix** — A task-level tag indicating the implementer cannot perform the task. These boxes are left unticked by the implementer and surfaced at the final checkpoint.
- **`**Model:**` annotation** — Per-slice metadata embedded in the slice group header, carried verbatim from `slices.md` by the planner. The implement command reads it before invoking the implementer subagent.

---

## Implicit contracts and conventions

1. **Ticking is coupled to the work, not batched to slice end — stated but not enforced.** Step 4a says "do the work and tick the box" in one breath, and the Coding rules say "Tick the boxes as you complete them." The Final message format has a `Tasks ticked: <list>` field, but there is no explicit statement that each tick must be persisted as a discrete edit before moving to the next task. The constraint is expressed as intent, not as a sequencing gate.

2. **The slice is the atomic unit for commits and checkpoints.** The block-signal contract (in `implement.md`) and the per-slice commit step both operate at slice granularity. There is no per-task commit or per-task checkpoint anywhere in either file.

3. **The orchestrator commits; the implementer subagent does not.** The implementer returns a final message with files modified; the orchestrator stages and commits those files. The implementer agent itself does not run `git commit`.

4. **`tasks.md` structure is frozen during implementation.** The implementer may only tick checkboxes in `tasks.md`, never edit its structure. The planner is the sole author.

5. **`(human)` tasks are explicitly non-blocking.** An implementer encountering a `(human)`-prefixed task leaves it unticked, does not block on it, and surfaces it at the final checkpoint.

6. **Model annotation is the architect's call.** The implementer self-halts if not on the annotated model and asks to be re-invoked. Auto mode does not bypass this.

7. **Divergence self-check is a pre-emit gate, not a task-level gate.** The implementer runs the divergence check once, before emitting the slice's final message — not after each task.

8. **FIX MODE completely waives the slice machinery.** No `**Model:**` annotation check, no per-slice checkpoint, no `tasks.md` precondition. The `postpr-fix` skill governs instead.

9. **`sync-copilot.mjs` is the only mechanism for copilot/ changes.** Editing `copilot/` directly is explicitly forbidden by `CLAUDE.md`. Any change to `implementer.md` must be followed by `node sync-copilot.mjs` to regenerate `copilot/agents/copilot-implementer.agent.md`. The CI `--check` mode enforces zero drift.

10. **Lint Check 7 (`checkReadContracts`) asserts the implementer's read-contract banner.** The expected value is `'Reads: tasks.md.'`. Any edit to the banner in `implementer.md` that changes the `Reads:` field will break Check 7 unless `READ_CONTRACT_EXPECTED.implementer` in `scripts/lint.mjs` is updated in the same change.

---

## Open gaps

- [ ] No example `tasks.md` artifact from a real (archived) change was read — the cross-change process-artifact boundary forbids reading archived `tasks.md` files. The template shape is well-specified, but no real-world instance was observed.
- [ ] The precise mechanism by which the final-message `Tasks ticked: <list of numbers>` field is populated is not enforced structurally — it is possible for the implementer to fill that field without having actually persisted incremental ticks during the slice. No lint check validates this.
- [ ] The `agentFor` table in `sync-copilot.mjs` (line 37: `'qrspi-implement': 'implementer'`) and the `claude/commands/implement.md` body-declared delegation are parallel representations with no cross-check. Backlog item `agentFor-frontmatter-crosscheck` tracks this as a known gap.
- [ ] The Copilot implement prompt (`copilot/prompts/qrspi-implement.prompt.md`) has a semantic fixup in `applyFixups` that replaces model-auto-selection text with a manual user-picker advisory — the exact output of that fixup was not read; only the source rule in `sync-copilot.mjs` (lines 172–185) was confirmed.
