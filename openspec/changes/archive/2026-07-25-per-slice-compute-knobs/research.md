# Research — per-slice-compute-knobs

> Stage R of QRSPI. Generated 2026-07-24.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Per-slice model annotation:** Where `**Model:**` lives in `slices.md`/`tasks.md`, its exact syntax, how the architect writes it and how it propagates to the planner and down to the implement command.
- **Implementer model handling:** How `claude/agents/implementer.md` and `claude/commands/implement.md` read the annotation, invoke the Agent tool with `model:`, and halt when the annotation is missing or the running model differs.
- **Stage delegation compute parameters:** Which compute-related parameters (model, effort, thinking budget) stage command files currently pass — or omit — when spawning subagents via the Agent tool.
- **Agent frontmatter:** Frontmatter fields in `claude/agents/*.md` files today — specifically which compute-related fields are present and which are absent.
- **Lint checks over slices/tasks/agents:** Structure of `scripts/lint.mjs`, the check-numbering convention, how a check is added, and the highest existing check number.
- **Post-PR fix flow:** How `claude/commands/followup.md` and `claude/skills/postpr-fix/SKILL.md` handle model selection, and whether the per-slice `**Model:**` annotation is referenced in fix mode.
- **Reference docs:** Whether `qrspi-stack`, `context-hygiene`, or `workflow` document per-slice or per-stage compute/model selection today.

---

## File map

### Per-slice model annotation

- `claude/agents/architect.md` — Writes `slices.md` (stage V). Lines 261–277 (inside the `## Slices` skeleton) contain the canonical `**Model:** sonnet|opus` bullet. Line 270 contains the exact example bullet: `- **Model:** sonnet|opus — <one-line rationale, e.g. "boilerplate entity + endpoint mirroring an existing one" or "first real-time hub; non-obvious connection lifecycle">`. Lines 272–277 state: "Model annotation is mandatory per slice. Pick `sonnet` or `opus` using the 'Per-slice model selection' heuristic in skill `vertical-slice`. When in doubt, prefer `sonnet`. ... The annotation propagates into `tasks.md` (P stage) and is consumed by `/qrspi:implement` to choose the implementer subagent's model." Depends on: `vertical-slice` skill for heuristic, `tasks.md` template for shape.

- `claude/commands/slices.md` — Orchestrator for stage V. No frontmatter `model:` field. Spawns `architect` subagent via Agent tool (`subagent_type: qrspi:architect`) with no explicit compute parameters. Artifact committed: `openspec/changes/<id>/slices.md`. Does not mention the `**Model:**` annotation itself — the annotation authoring is entirely inside the architect agent.

- `claude/skills/vertical-slice/SKILL.md` — Defines the "Per-slice model selection" heuristic (lines 88–124). Canonical decision rule: choose `sonnet` for structured/templated slices (entity mirroring, endpoint groups, DTOs, test templates, wiring); choose `opus` for first-of-kind patterns, non-obvious auth, performance-critical code, concurrency, business rules with edge cases, or complex UI interaction. "When in doubt, prefer `sonnet`." The implementer can escalate mid-slice by re-invoking `/qrspi:implement <id>` with an override. Does NOT define any other compute parameters (effort, thinking budget).

- `openspec-templates/tasks.template.md` — Canonical template for `tasks.md`. Line 23: `**Model:** sonnet|opus — <rationale carried verbatim from slices.md>`. Lines 59–63: "Carry the `**Model:**` annotation from each `slices.md` slice into the matching group header **verbatim** — do not re-derive it." The template confirms the annotation is a bare line in the slice header block, not a checkbox item or a metadata field.

**Exact current syntax of the annotation:**

In `slices.md` (inside a `### Slice N — <name>` block, as a bullet after the M/F/D/T bullets):
```
- **Model:** sonnet|opus — <one-line rationale>
```

In `tasks.md` (directly under the `## N. <slice name>` heading, before the checkbox items):
```
**Model:** sonnet|opus — <rationale carried verbatim from slices.md>
```

The two syntaxes differ in one structural detail: in `slices.md` the annotation is a bullet (`-` prefix); in `tasks.md` it is a bare bold line with no list prefix.

### Implementer model handling

- `claude/agents/implementer.md` — Frontmatter declares `model: opus` (line 6), which is the default when no override is passed by the orchestrator. Lines 41–49 describe how the implementer checks the annotation: "**Check the current slice's `**Model:**` annotation.** Locate the next un-ticked slice in tasks.md. The slice header carries a line of the form `**Model:** sonnet|opus — <rationale>`. If you are not running on the annotated model, stop and tell the orchestrator (or the human) that this slice was scoped for `<annotated>` and either: re-invoke `/qrspi:implement <id>` so the slash command can pick the right model, or confirm with the human that overriding the annotation is intentional. Do not silently proceed on the wrong model." This is a self-check by the implementer subagent after it is already running — the subagent compares what model it *is* running on against what the annotation says, then halts if they differ.

- `claude/commands/implement.md` — Orchestrator for stage I. Lines 28–33: "**Pick the implementer's model from the next un-ticked slice.** Read `openspec/changes/$ARGUMENTS/tasks.md` and locate the first slice header (`## N. ...`) whose tasks are not all ticked. The line directly under that header reads `**Model:** sonnet|opus — <rationale>`. That annotation is the architect's call; honor it. Invoke the implementer subagent via the Agent tool with `model: <annotated>` so the subagent runs on the right model for this slice's complexity." Line 35: "If a slice is missing the annotation, stop and tell the user the slices/tasks file needs to be fixed ... Do not silently default — silent defaults hide planning gaps." Lines 83–88 (Full/Semi auto loop, step 3): "Read the next un-ticked slice's `**Model:**` annotation from `tasks.md`. Honor it: invoke the implementer subagent via the Agent tool with `model: <annotated>` for the next slice. Auto mode does NOT bypass per-slice model selection -- the annotation is the architect's call."

**Mechanism:** The orchestrator (`implement.md`) reads `tasks.md`, parses the `**Model:**` line from the next un-ticked slice header, then passes `model: <value>` to the Agent tool call. The implementer subagent additionally performs a self-check (step 3 in its `## What to do` section) and stops if it detects a mismatch. There is no enforcement of `effort` or `thinking_budget` at any point in this flow.

### Stage delegation compute parameters

Across all stage command files (`claude/commands/*.md`), the Agent tool invocation always specifies `subagent_type` and no other compute parameter, except for `implement.md` which additionally passes `model:`.

| Command | Subagent type | `model:` passed? | `effort:` passed? | `thinking_budget:` passed? |
|---|---|---|---|---|
| `questions.md` | `qrspi:questioner` | No | No | No |
| `research.md` | `qrspi:researcher` | No | No | No |
| `design.md` | `qrspi:designer` | No | No | No |
| `structure.md` | `qrspi:architect` | No | No | No |
| `slices.md` | `qrspi:architect` | No | No | No |
| `plan.md` | `qrspi:planner` | No | No | No |
| `implement.md` | `qrspi:implementer` | **Yes** — read from `tasks.md` `**Model:**` annotation | No | No |
| `pr.md` | `qrspi:reviewer` | No | No | No |
| `followup.md` | `qrspi:implementer` | No (prose only — "default sonnet", "use opus when...") | No | No |

`implement.md` is the sole stage command that currently passes a compute parameter (`model:`) on the Agent tool invocation, and it derives that value at runtime from the `tasks.md` annotation. No stage command passes `effort:` or a thinking/reasoning budget parameter.

`followup.md` documents a model preference in prose (lines 193–195: "Default the implementer to **sonnet** ... Use **opus** only when the fix touches design-level logic or spans several files; say so when you invoke") but does NOT pass `model:` on the Agent tool call. The model guidance is instructional only; the actual Agent invocation omits the parameter.

### Agent frontmatter

All seven `claude/agents/*.md` files share a common frontmatter structure. Fields observed:

| Agent | `name:` | `description:` | `tools:` | `model:` |
|---|---|---|---|---|
| `researcher.md` | `researcher` | present | `Read, Write, Bash, Glob, Grep, Skill` | `sonnet` |
| `questioner.md` | `questioner` | present | `Read, Write, Edit, Bash, Glob, Grep, Skill` | `sonnet` |
| `designer.md` | `designer` | present | `Read, Write, Edit, Bash, Glob, Grep, Skill, Agent` | `opus` |
| `architect.md` | `architect` | present | `Read, Write, Edit, Bash, Glob, Grep, Skill, Agent` | `sonnet` |
| `planner.md` | `planner` | present | `Read, Write, Bash, Glob, Grep, Skill` | `sonnet` |
| `implementer.md` | `implementer` | present | `Read, Write, Edit, Bash, Glob, Grep, Skill, Agent` | `opus` |
| `reviewer.md` | `reviewer` | present | `Read, Bash, Glob, Grep, Skill` | `sonnet` |

Every agent file declares exactly: `name:`, `description:`, `tools:`, and `model:`. No agent carries `effort:`, `thinking_budget:`, or any other compute parameter in frontmatter.

The `model:` field is present in all seven. Lint Check 2 (`checkFrontmatter` in `scripts/lint.mjs`, lines 349–355) enforces that `model:` values must be aliases (`opus`/`sonnet`/`haiku`), not pinned model ids. The valid aliases set is `new Set(['opus', 'sonnet', 'haiku'])`.

The implementer's frontmatter `model: opus` sets the default when the orchestrator does NOT pass `model:` on the Agent tool call. When `implement.md` passes `model: sonnet` for a sonnet-annotated slice, that override takes precedence over the frontmatter default.

### Lint checks over slices/tasks/agents

- `scripts/lint.mjs` — Node.js script; no npm dependencies (uses only `node:fs`, `node:path`, `node:url`). Imports one external module: `./skill-sets.mjs` (the `SKILL_SET_EXPECTED` registry). Collects all errors before exit; exits 0 or 1.

**Current check inventory (12 numbered checks):**

The header comment (lines 5–73) enumerates Checks 1–12. The `main()` function (lines 1534–1589) runs them in this order:

1. **Pin agreement** (`checkPinAgreement`) — OpenSpec version pin consistency.
2. **Frontmatter / name resolution** (`checkFrontmatter`) — Required fields, `agent:` resolution, `model:` aliases, `Load skill` references.
2b. **Skill-set registry** (`checkSkillSets`) — Each stage agent's `Load skills` step-1 line matches `SKILL_SET_EXPECTED` in `scripts/skill-sets.mjs`.
3. **Heading alignment** (`checkHeadingAlignment`) — Canonical section headings from templates appear in agent bodies.
4. **README command coverage** (`checkReadmeCoverage`) — Bidirectional: commands ↔ README.
5. **Gate-tool / executor agreement** (`checkGateExecutor`) — Commands with non-builtin `agent:` must not reach `AskUserQuestion`.
6. **Migration manifest presence + schema + marker format** (`checkMigrationManifests`).
7. **Read-contract banner agreement** (`checkReadContracts`) — `READ_CONTRACT_EXPECTED` map asserts each agent's `> **Read contract**` `Reads:` field.
8. **PR reconciliation passes structure** (`checkPrReconciliationPasses`) — Structural anchors in `pr.md`.
9. **Version-check embed** (`checkVersionCheckEmbed`) — Nine stage commands carry the `qrspi-version-check` load line.
10. **Triage path anchors** (`checkTriagePaths`) — P1/P2/P3 choice-label prefixes in `followup.md`.
11. **No CRUD skeleton headings in fenced blocks** (`checkNoCrudSkeletonHeadings`) — Five agent files must not hard-code the twelve CRUD headings inside fenced blocks.
12. **Output-contract banner presence** (`checkOutputContracts`) — Seven stage agents carry `> **Output contract**` banner.

**Highest existing check number: 12.** Check 2b (`checkSkillSets`) is registered after Check 2 in `main()` but is labeled "2b" in the stdout header, not "3" — it was inserted without renumbering later checks.

**Pattern for adding a new check:**

1. Define `async function check<Name>(errors)` that pushes strings to `errors[]` and writes an `OK:` line to stdout on success. Returns violation count (integer).
2. Add `process.stdout.write('\nCheck N: <description>\n')` followed by `await check<Name>(errors)` in `main()` in order.
3. Update the header comment block (lines 5–73) to enumerate the new check with its number and description.
4. If the check validates a fixed set of agent stems or command stems, that set is declared as a `const` array or keyed object adjacent to the function (following the pattern of `READ_CONTRACT_EXPECTED`, `SKILL_SET_EXPECTED`, `CRUD_CHECK_AGENTS`, `VERSION_CHECK_COMMAND_STEMS`).

No check currently parses the `**Model:**` annotation inside `slices.md` or `tasks.md` for format validity or presence. No check asserts that the `model:` value on the Agent tool call in `implement.md` matches the annotation, nor that the annotation is present in every slice of a `slices.md` file.

### Post-PR fix flow

- `claude/commands/followup.md` — Orchestrator for the post-PR fix loop. Does not carry a `model:` frontmatter field. Lines 193–195 state the model preference in prose only: "Default the implementer to **sonnet** -- post-PR follow-ups are typically small and contained. Use **opus** only when the fix touches design-level logic or spans several files; say so when you invoke." The actual Agent tool call (lines 196–206) does NOT pass `model:`. The implementer is spawned in FIX MODE; fix mode explicitly waives the per-slice `**Model:**` annotation machinery: lines 146–149 in `implementer.md` say "There is no slice to pick up, no `**Model:**` annotation to honor, no per-slice checkpoint, and the `tasks.md` precondition is waived." The triage gate (P1/P2/P3, lines 27–192) does not reference model selection. P2 (amend in place, lines 77–131) adds a new slice group to `slices.md` and `tasks.md` and requires a `**Model:**` annotation on each (line 99: "each carrying a `**Model:**` annotation"), but the annotation authoring is delegated to the orchestrator or the loaded `vertical-slice` skill — no mechanic enforces it.

- `claude/skills/postpr-fix/SKILL.md` — Does not mention per-slice model selection or compute parameters. The fix checklist (7 steps) has no model-selection step. The "How this skill relates to others" section does not mention `vertical-slice`. No reference to `**Model:**` annotation.

### Reference docs

- `claude/skills/vertical-slice/SKILL.md` — Documents "Per-slice model selection" (the `sonnet`/`opus` heuristic, lines 88–124). This is the canonical reference for the heuristic. Does NOT mention `effort`, `thinking_budget`, or any other compute parameter.

- `claude/skills/context-hygiene/SKILL.md` — Documents the 40%/60% context-window targets, the subagent-as-context-firewall principle, and three lint/tooling mechanisms that back the targets (`checkSkillSets`, `checkOutputContracts`, `context-footprint.mjs`). Does NOT mention per-slice model selection, `effort`, `thinking_budget`, or any compute parameters beyond the subagent delegation pattern.

- `claude/skills/workflow/SKILL.md` — One explicit reference to per-slice model annotation (under "Stage-specific gate notes", "I per-slice auto-advance"): "The per-slice model annotation (`**Model:** sonnet|opus`) is read for every slice and honored -- auto mode does NOT bypass per-slice model selection." No mention of `effort` or `thinking_budget`. The run-mode section (Full/Semi/Manual) does not mention compute parameters. The commit step and handoff procedures have no compute-parameter content.

- `claude/skills/qrspi-stack/SKILL.md` — Does not exist in this repository. The `claude/skills/` directory contains: `context-hygiene`, `openspec-archive-change`, `openspec-sync-specs`, `openspec-workflow`, `postpr-fix`, `qrspi-update`, `qrspi-version-check`, `repo-surface`, `retrospective`, `vertical-slice`, `workflow`. No `qrspi-stack` skill is present.

- `scripts/skill-sets.mjs` — Defines `SKILL_SET_EXPECTED`: the approved skill load for each stage agent. `implementer` is `['context-hygiene', 'vertical-slice', 'workflow']`. `architect` is `['openspec-workflow', 'repo-surface', 'vertical-slice', 'workflow']`. The `vertical-slice` skill (which defines the model heuristic) is required for both architect and implementer. It is absent from `planner`'s set — the planner carries the annotation forward verbatim and does not re-derive it, so loading the heuristic skill is unnecessary.

---

## Public API surface

This is a prompt-engineering / docs repo. The public surface relevant to these areas:

- `/qrspi:slices <id>` — writes `slices.md` with per-slice `**Model:**` annotation. Spawns `architect` subagent; no compute parameter on the Agent call.
- `/qrspi:plan <id>` — writes `tasks.md` carrying `**Model:**` verbatim from `slices.md`. Spawns `planner` subagent; no compute parameter.
- `/qrspi:implement <id>` — reads `**Model:**` from `tasks.md`; passes `model: <value>` on the Agent tool call to the implementer. The sole stage command with a runtime-derived compute parameter.
- `/qrspi:followup <id>` — spawns implementer in FIX MODE; prose says "default sonnet / use opus when..."; does NOT pass `model:` on the Agent tool call.

---

## Data model

All "data" is markdown. Relevant shapes:

- `slices.md` `### Slice N — <name>` block: contains `M`, `F`, `D`, `T` bullets plus `- **Model:** sonnet|opus — <rationale>` bullet (as a list item, with `-` prefix) and a `- Checkpoint:` bullet.
- `tasks.md` `## N. <slice name>` block: contains `**Model:** sonnet|opus — <rationale>` as a bare bold line (no `-` prefix), directly under the group heading, before the `- [ ]` checkbox items.
- Agent frontmatter: `name:`, `description:`, `tools:`, `model:` — four fields; `model:` is always an alias (`sonnet`/`opus`).

---

## Implicit contracts and conventions

1. **`**Model:**` annotation is mandatory per slice.** The architect agent (`architect.md` line 272: "Model annotation is mandatory per slice") and the `vertical-slice` skill (lines 88–91) state this. The implement orchestrator (`implement.md` line 35) hard-stops if the annotation is missing rather than defaulting silently.

2. **Annotation propagates verbatim: slices.md → tasks.md.** The planner is explicitly forbidden from re-deriving the model choice (`planner.md` line 116: "No re-deriving the `**Model:**` annotation"). The `tasks.template.md` (line 59) says "verbatim." If the slices file is missing the annotation, the planner stops (planner.md line 97).

3. **Two different syntaxes for the same annotation.** In `slices.md` it is a bullet (`- **Model:**`); in `tasks.md` it is a bare bold line (`**Model:**`). The `tasks.template.md` shows the bare form explicitly. This syntactic difference is undocumented as a deliberate design choice — it appears to be an incidental consequence of `tasks.md` using `- [ ]` checkbox items as its primary structure, making a bare bold line the natural choice for a slice-header annotation that is not a task.

4. **Implementer self-check is a runtime guard, not a build gate.** The implementer's step 3 self-check (model mismatch → stop) fires only after the subagent is already running. There is no pre-invocation lint or static check that verifies the `**Model:**` annotation is present and well-formed in a given `tasks.md`.

5. **`followup.md` prose model preference is not wired to the Agent call.** The prose says "default sonnet, opus when..." but the Agent tool invocation omits `model:`, leaving the actual model to whatever the implementer agent's frontmatter default (`opus`) resolves to — which contradicts the prose preference of `sonnet`. This is a factual inconsistency between the command's stated intent and its actual invocation.

6. **No `effort:` or `thinking_budget:` anywhere in the current system.** These parameters exist in the Claude Agent tool API but are not used by any stage command or mentioned in any skill or agent file in the kit.

7. **Check 2b (`checkSkillSets`) asserts the `Load skills` step-1 set for each agent, but does NOT assert what the orchestrator passes on the Agent tool call.** The `model:` override that `implement.md` passes at runtime is not validated by any existing lint check.

8. **Auto mode explicitly preserves per-slice model selection.** The `workflow` skill ("I per-slice auto-advance" note) and `implement.md` (lines 83–88) both state that auto mode does NOT bypass the annotation — the model is re-read from `tasks.md` for every slice even in Full auto.

---

## Open gaps

- [ ] The exact text of the Agent tool call invocation in `implement.md` was read (lines 28–33), but the precise SDK parameter name for model override (`model:` vs. `subagent_model:` or another field) was inferred from the command prose rather than confirmed against the Claude Agent SDK documentation. The command uses the prose phrase "with `model: <annotated>`" — the actual parameter name as accepted by the Claude Code Agent tool was not independently verified.
- [ ] `claude/agents/designer.md` and `claude/agents/reviewer.md` bodies were only partially read (frontmatter and first few lines). Their full bodies were not surveyed; any compute-related mentions they may contain beyond frontmatter are unconfirmed.
- [ ] `scripts/context-footprint.mjs` was referenced in `context-hygiene/SKILL.md` but not read. Its exact per-stage token estimates and whether it reports model-related metadata is unconfirmed.
- [ ] No existing `slices.md` with `**Model:** opus` annotation was observed in the archive (all confirmed examples used `sonnet`). Whether `opus` annotations have ever appeared and propagated correctly through the full implement loop is unconfirmed from primary source.
- [ ] The `claude/commands/plan.md` file body was not fully read (only the grep for `subagent_type` was checked). Whether `plan.md` contains any additional instructions about the annotation beyond what `planner.md` already states is unconfirmed.
