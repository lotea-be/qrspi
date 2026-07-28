# Research — spec-sync-contract

> Stage R of QRSPI. Generated 2026-07-28.
> Ticket is hidden from this stage by design.

## Areas investigated

- Archive & spec-sync flow: how `/qrspi:archive` delegates delta-spec syncing, which subagent type is spawned for sync, and what prompt logic governs the "Sync now / Archive without syncing" choice
- Stage-agent surface & conventions: frontmatter fields and tool lists for all agents in `claude/agents/`, and how agents are registered in `plugin.json`
- Skill surface: layout of `claude/skills/`, which skills are kit-authored vs. OpenSpec-CLI-generated, and discovery/registration mechanism
- Lint gates: structure of `scripts/lint.mjs`, check numbering, and the full implementation of Check 7 (read-contract banner assertion)
- Workflow skill Read Matrix: columns, all stage rows, and whether a "Helper agents" section exists
- Delta-spec template: `openspec-templates/spec-delta.template.md` shape and inline guidance for MODIFIED requirements
- Testing & validation conventions: lint script invocation, `openspec validate` usage, and CI workflow

## File map

### Archive & spec-sync flow

- `claude/commands/archive.md` — `/qrspi:archive` slash command. Frontmatter: `description:`, `agent: build`. Steps: sanity-check for un-ticked `followups.md` boxes (inform, not block), PR-merge hard-stop gate (reads `pr.md`, queries host CLI for state), then delegates to `openspec-archive-change` skill. After the skill returns, the command itself removes the backlog row, stages paths, and asks where the commit should land ("New branch + push" vs. "Commit straight to main"). Depends on: `openspec-archive-change` skill, `openspec/changes/<id>/pr.md`, host CLI (`gh`/`az`/`glab`), `openspec/backlog.md`.
- `claude/skills/openspec-archive-change/SKILL.md` — archive skill. Frontmatter: `generatedBy: "1.4.1"` (OpenSpec-CLI-generated). Steps: list changes, check artifact completion via `openspec status --change "<name>" --json`, check task completion by reading `tasks.md`, assess delta-spec sync state using `artifactPaths.specs.existingOutputPaths` from status JSON, prompt user ("Sync now (recommended)" / "Archive without syncing"), then `mv` the change folder to `archive/YYYY-MM-DD-<name>`. The sync sub-step spawns a subagent using `subagent_type: "general-purpose"` with prompt `"Use Skill tool to invoke openspec-sync-specs for change '<name>'. Delta spec analysis: <summary>"` (via the `Task` tool). The archive-move itself is a plain `mv` bash command, not `git mv` — no git staging happens in this skill.
- `claude/skills/openspec-sync-specs/SKILL.md` — spec-sync skill. Frontmatter: `generatedBy: "1.4.1"` (OpenSpec-CLI-generated). Agent-driven (no programmatic diff): reads each delta spec, reads the corresponding main spec at `openspec/specs/<capability>/spec.md`, and directly edits the main spec. MODIFIED Requirements: partial updates are allowed — a delta need only include the new scenario(s), not a full copy of existing ones. Depends on: `openspec status --json`, `openspec list --json`, Read/Write tools.

### Stage-agent surface & conventions

- `claude/agents/researcher.md` — frontmatter: `name: researcher`, `description:`, `tools: Read, Write, Bash, Glob, Grep, Skill`, `model: sonnet`, `effort: medium`. Carries `> **Read contract**` and `> **Output contract**` banners.
- `claude/agents/questioner.md` — frontmatter: `name: questioner`, `tools: Read, Write, Edit, Bash, Glob, Grep, Skill`, `model: sonnet`, `effort: medium`.
- `claude/agents/designer.md` — frontmatter: `name: designer`, `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`, `model: opus`, `effort: high`.
- `claude/agents/architect.md` — frontmatter: `name: architect`, `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`, `model: sonnet`, `effort: medium`.
- `claude/agents/planner.md` — frontmatter: `name: planner`, `tools: Read, Write, Bash, Glob, Grep, Skill`, `model: sonnet`, `effort: medium`.
- `claude/agents/implementer-low.md` / `implementer-medium.md` / `implementer-high.md` — three effort variants. Each: `name: implementer-<suffix>`, `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`, `model: sonnet`, `effort: <low|medium|high>`. Body is a single step: `Load skill implementer-core and follow its instructions exactly.`
- `claude/agents/reviewer.md` — frontmatter: `name: reviewer`, `tools: Read, Bash, Glob, Grep, Skill`, `model: sonnet`, `effort: medium`. Read-only (no `Write`, `Edit`, or `Agent` tools).

**Plugin registration** (`/.claude-plugin/plugin.json`): agents registered as an explicit array (`"agents": [...]`), NOT by directory discovery. Current entries: questioner, researcher, designer, architect, planner, implementer-low, implementer-medium, implementer-high, reviewer. Skills registered via `"skills": "./claude/skills"` (directory discovery). Commands registered via `"commands": "./claude/commands"`.

**Least-privilege tool pattern:** reviewer is the most restricted (no Write/Edit/Agent). Implementer variants lack AskUserQuestion (which is main-loop-only). The `Agent` tool is present in designer, architect, and implementer variants; absent in questioner, researcher, planner, and reviewer.

### Skill surface

- `claude/skills/` contains twelve subdirectories (each with a `SKILL.md`): `context-hygiene`, `implementer-core`, `openspec-archive-change`, `openspec-sync-specs`, `openspec-workflow`, `postpr-fix`, `qrspi-update`, `qrspi-version-check`, `repo-surface`, `retrospective`, `vertical-slice`, `workflow`.
- **Kit-authored skills** (no `generatedBy:` in frontmatter): `context-hygiene`, `implementer-core`, `openspec-workflow`, `postpr-fix`, `qrspi-update`, `qrspi-version-check`, `repo-surface`, `retrospective`, `vertical-slice`, `workflow`.
- **OpenSpec-CLI-generated skills** (carry `generatedBy: "1.4.1"` in frontmatter under `metadata:`): `openspec-archive-change`, `openspec-sync-specs`. Both have `license: MIT` and `compatibility: Requires openspec CLI.`
- **Discovery:** skills directory (`./claude/skills`) is declared in `plugin.json` via `"skills": "./claude/skills"`. Each subdirectory is auto-registered as a kit skill; no per-skill plugin.json edit is required. Project-scoped skills live under `.claude/skills/` (not shipped in the plugin).

### Lint gates

- `scripts/lint.mjs` — 2391-line Node.js ESM script. No npm dependencies; uses only `node:fs`, `node:path`, `node:url`. Checks 1–16 plus Check 2b, all collected before exit.

**Checks summary:**
| Check | Name | Description |
|-------|------|-------------|
| 1 | Pin agreement | All `@fission-ai/openspec@<ver>` / `openspec_version:` occurrences must agree; excludes `generatedBy:` lines in `claude/skills/openspec-*/` and the entire `openspec/changes/` subtree |
| 2 | Frontmatter / name | Agents, commands, and skills require valid frontmatter; `agent:` references resolve; `model:` and `effort:` values validated; `Load skill X` references resolve to real skill dirs |
| 2b | Skill-set registry | Each stage agent's step-1 `Load skills` line matches `SKILL_SET_EXPECTED` in `scripts/skill-sets.mjs` |
| 3 | Heading alignment | Canonical template headings must appear in the corresponding agent's inline skeleton |
| 4 | README command coverage | Bidirectional: every `claude/commands/<stem>.md` documented in README; every `/qrspi:<token>` in README resolves |
| 5 | Gate-tool / executor agreement | Commands with non-builtin `agent:` must not reach `AskUserQuestion` directly or transitively via workflow choreography |
| 6 | Migration manifest | Presence + schema + marker format for `migrations/*.yaml` and `openspec/.qrspi-version` |
| 7 | Read-contract banner | Each stage agent's banner `Reads:` field must equal the agent's row in `READ_CONTRACT_EXPECTED` |
| 8 | PR reconciliation structure | `claude/commands/pr.md` must contain task-pass and follow-ups-pass section headings and choice labels |
| 9 | Version-check embed | Nine stage command files must each contain `Load skill \`qrspi-version-check\` and follow its instructions exactly.` |
| 10 | Triage path anchors | `claude/commands/followup.md` must contain P1/P2/P3 anchor strings |
| 11 | No surface-gated skeleton headings in fences | Twenty-two surface-gated headings must not appear as literal lines inside fenced code blocks in artifact-producing agent files |
| 12 | Output-contract banner presence | Each of the seven stage agents must carry a `> **Output contract**` banner line |
| 13 | Compute annotation value-validation | `**Compute:**` lines in committed `slices.md`/`tasks.md` must have valid `effort=` (required) and `model=` (optional-if-present) tokens |
| 14 | Surface applicability | Change artifact headings must not belong to absent surfaces (reads `## Repo surface` block from `.claude/skills/qrspi-stack/SKILL.md`) |
| 15 | Implementer variant drift gate | Exactly three `implementer-*.md` variants; step-1 loads only `implementer-core`; effort matches stem; plugin.json registration; base `implementer.md` absent |
| 16 | Followup bare-stem guard | `claude/commands/followup.md` must not reference bare `qrspi:implementer` without variant suffix |

**Highest check number:** 16 (Check 2b is a sub-check of Check 2, not a new sequence number; it runs between Checks 2 and 3).

**Check 7 implementation detail (`checkReadContracts`):**
- Scope: iterates over the keys of `READ_CONTRACT_EXPECTED` — a hard-coded map with nine entries: `researcher`, `questioner`, `designer`, `architect`, `planner`, `implementer-low`, `implementer-medium`, `implementer-high`, `reviewer`.
- For each stem, reads `claude/agents/<stem>.md`, strips frontmatter, and calls `extractReadsField(body)`.
- `extractReadsField`: finds the banner line matching `/^>\s*\*\*Read contract\*\*/`, splits on the em-dash (`—`) character, takes the substring before `Never opens:`, and normalizes whitespace.
- Asserts the normalized extracted string equals the normalized `READ_CONTRACT_EXPECTED[stem]` value.
- Two-mode architect handled transparently: `READ_CONTRACT_EXPECTED.architect` is `'Reads (S): design.md. Reads (V): proposal.md, specs/.'` — the same `extractReadsField` logic captures the entire two-mode string from `Reads (S):` up to `Never opens:`.
- Reviewer handled by the literal string `'Reads: full changes/<id>/ folder (by design).'`.
- Note: Check 7 covers `implementer-low`, `implementer-medium`, `implementer-high` as distinct keys. Each must have a `Read contract` banner identical to `'Reads: tasks.md.'`.

### Workflow skill Read Matrix

Located in `claude/skills/workflow/SKILL.md` under `### Read Matrix — what each stage may open` (line 118).

**Columns:** Stage | Agent | Reads (within-change) | Cross-change

**Stage rows (8 rows, one per stage):**

| Stage | Agent | Reads (within-change) | Cross-change |
|-------|-------|-----------------------|--------------|
| R | researcher | *none* — the whole `changes/<id>/` folder is banned | spec.md only |
| Q | questioner | backlog + templates (no change-folder artifact) | spec.md only |
| D | designer | `questions.md`, `research.md` | spec.md only |
| S | architect | `design.md` | spec.md only |
| V | architect | `proposal.md`, `specs/` | spec.md only |
| P | planner | `slices.md` | spec.md only |
| I | implementer | `tasks.md` | spec.md only |
| PR | reviewer | full `changes/<id>/` folder (by design) | spec.md only |

**No "Helper agents" section exists.** The table contains only the eight QRSPI stage rows. Explanatory prose for the two special cases (architect two-mode, reviewer full-folder) appears immediately below the table as plain paragraphs. There is no separate heading or sub-table for helper agents.

**Cross-change boundary rule:** documented in its own sub-heading `#### Cross-change boundary (the \`spec.md\` exception)` immediately after the two special-case notes. States that process artifacts are off-limits across changes; `spec.md` (base and delta) is the sole exception and may be read across changes.

### Delta-spec template

- `openspec-templates/spec-delta.template.md` — single source of truth for how the architect writes `openspec/changes/<id>/specs/<capability>/spec.md`. Approximately 99 lines.

**Structure:**
- Preamble prose: identifies itself as the canonical template, states that both `architect` agents point here, and that `openspec validate <id>` and `openspec-sync-specs` both depend on this format.
- `## New capability` section: skeleton for when no base spec exists; all requirements under `## ADDED Requirements`.
- `## Delta against an existing capability` section: skeleton for when a base spec exists; three operation sections as needed.

**Inline MODIFIED requirement guidance:** the template body text for `## MODIFIED Requirements` contains this inline comment on the requirement body slot:

```
<the FULL replacement text for the requirement — sync overwrites the base
 requirement, it does not append. Repeat every scenario it should still have.>
```

This is the only inline comment about MODIFIED authoring in the template. The guidance means that MODIFIED carries the entire new state of the requirement — it is a full overwrite, not a patch. The `openspec-sync-specs` skill's own description of MODIFIED handling is different: it states "partial updates" are possible ("To add a scenario, just include that scenario under MODIFIED — don't copy existing scenarios"). This is a **discrepancy** between the template's guidance (`FULL replacement text`) and the sync-skill's stated behavior (partial/intelligent merging).

**Format rules block:** the template documents the five validation rules enforced by `openspec validate <id> --strict`: exact section header strings; verbatim requirement title for MODIFIED/REMOVED; full body text for MODIFIED; MUST/SHALL on first line of requirement body; at least one scenario block under ADDED/MODIFIED.

### Testing & validation conventions

- `scripts/lint.mjs` — invoked as `node scripts/lint.mjs`; no npm dependencies; uses Node.js built-ins only. Exits 0 on pass, 1 on failure.
- `openspec validate` — invoked via `npx @fission-ai/openspec@1.4.1 validate --all` in CI (strict by default for `--all`). Local per-change validation uses `openspec validate <id> --strict` (non-strict `openspec validate <id>` skips the MUST/SHALL check). CI runs the strict form.
- `scripts/skill-sets.mjs` — shared ESM module (pure data, no imports). Exports `SKILL_SET_EXPECTED`. Imported by `scripts/lint.mjs` (Check 2b) and `scripts/context-footprint.mjs`.
- `scripts/context-footprint.mjs` — report-only script; always exits 0; prints per-stage token estimates. Not a lint gate.
- `.github/workflows/ci.yml` — two jobs, both triggered on PR to `main` and push to `main`:
  - `lint` job: `node 20`, runs `node scripts/lint.mjs`
  - `validate` job: `node 20`, runs `npx --yes @fission-ai/openspec@1.4.1 validate --all`
- No unit test framework; correctness is verified entirely by the lint script and openspec validate. No watch mode.

## Slash-command surface

- `claude/commands/archive.md` — `/qrspi:archive`. `agent: build`. Performs the PR-merge gate and commit orchestration that the `openspec-archive-change` skill does not handle. Described fully above.

## Stage-agent surface

All nine agent files surveyed above. Key structural invariants:
- Every stage agent carries both `> **Read contract**` and `> **Output contract**` banners (enforced by Checks 7 and 12).
- All agents use model aliases (`sonnet`/`opus`/`haiku`), never pinned model IDs.
- Every agent carries an `effort:` frontmatter field (`low`/`medium`/`high`).
- Implementer variants delegate entirely to `implementer-core` skill (one-line body).
- `Agent` tool is present in designer, architect, implementer variants; absent in questioner, researcher, planner, reviewer.
- `AskUserQuestion` is explicitly a main-loop-only tool; no agent body may reference it (Check 5).

## Skill surface

- `openspec-archive-change` and `openspec-sync-specs` are the only two skills with `generatedBy:` metadata marking them as OpenSpec-CLI-generated. The comment in `archive.md` states: "do not hand-edit that skill — it is regenerated from the OpenSpec CLI."
- All other ten skills under `claude/skills/` are kit-authored (hand-maintained).
- Check 1 (pin agreement) excludes `generatedBy:` lines in `claude/skills/openspec-*/` from the version-pin scan.

## Lint-gate surface

See the Lint gates section above for full check inventory. Additional structural notes:
- `READ_CONTRACT_EXPECTED` (in `lint.mjs`) is the machine-readable mirror of the Read Matrix table in `workflow/SKILL.md`. These two are currently kept in sync by convention, not by automated generation — Check 7 asserts banners match `READ_CONTRACT_EXPECTED`, but nothing automatically verifies that `READ_CONTRACT_EXPECTED` matches the workflow skill table.
- `SKILL_SET_EXPECTED` (in `skill-sets.mjs`) is an analogous machine-readable mirror; Check 2b asserts agents match it.
- Both maps are maintained manually; drift between a map and its prose source in a skill would not be caught by any existing check.

## Template surface

- `openspec-templates/spec-delta.template.md` — surveyed above.
- `openspec-templates/design.template.md` — canonical design artifact shape. Four required headers: `## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`. Contains a surface-gate comment block for the optional surface-gated detail sections.
- `openspec-templates/proposal.template.md` — four required headers: `## Why`, `## What Changes`, `## Capabilities`, `## Impact`.
- `openspec-templates/questions.template.md` — three always-emitted surface-independent headers: `## Testing`, `## Sequencing & scope`, `## Open product questions (for the human)`.
- `openspec-templates/research.template.md` — five always-emitted headers: `## Areas investigated`, `## File map`, `## Notable discrepancies`, `## Implicit contracts and conventions`, `## Open gaps`.
- `openspec-templates/tasks.template.md` — dynamic heading format (`## N. <slice name>`); no fixed canonical headings enforced by Check 3.

## Notable discrepancies

- **MODIFIED requirement semantics conflict.** `openspec-templates/spec-delta.template.md` instructs: "FULL replacement text for the requirement — sync overwrites the base requirement, it does not append. Repeat every scenario it should still have." The `openspec-sync-specs` skill states the opposite: "partial updates" are supported — "To add a scenario, just include that scenario under MODIFIED — don't copy existing scenarios." The architect's inline skeleton in `architect.md` matches the template's "full replacement" instruction. The sync skill and the template/architect give contradictory instructions about what a MODIFIED entry contains.
- **Sync spawn uses `general-purpose` subagent, not a named QRSPI agent.** The `openspec-archive-change` skill spawns sync via `Task` tool with `subagent_type: "general-purpose"`. This is the only place in the kit where a `general-purpose` spawn is used; all other agent invocations in the kit use named `subagent_type` values (e.g. `qrspi:researcher`).
- **Check 7 scope covers implementer variants as three separate entries.** `READ_CONTRACT_EXPECTED` has distinct keys for `implementer-low`, `implementer-medium`, `implementer-high`. Each must independently carry the `Reads: tasks.md.` banner, and each is checked separately. This is consistent with the three separate agent files.

## Implicit contracts and conventions

- Skills under `claude/skills/openspec-*/` are treated as generated artifacts: archive.md explicitly forbids hand-editing them and Check 1 excludes their `generatedBy:` lines from pin scanning.
- All agents use the `> **Read contract** — Reads: ... Never opens: ... (spec.md excepted — see workflow skill Read Matrix)` banner format. The "spec.md excepted" pointer is the canonical back-reference — agents do not restate the cross-change rule inline.
- The workflow skill's Read Matrix table is the single authoritative source of per-stage read contracts. Check 7's `READ_CONTRACT_EXPECTED` map is its machine-readable mirror; these two must be kept in sync by convention (no automated check enforces their mutual agreement).
- Agent registration in `plugin.json` is an explicit array, not directory discovery. A new agent file must also be added to the array. Skills, by contrast, are directory-discovered via `"skills": "./claude/skills"`.
- The archive command owns the git operations (staging, committing, pushing) that the `openspec-archive-change` skill deliberately omits. The skill only moves the folder on disk.
- `openspec validate --all` (CI, always strict) and `openspec validate <id> --strict` (local) are the validation tool. Plain `openspec validate <id>` (non-strict) is explicitly warned against as it skips the MUST/SHALL check.

## Open gaps

- [ ] The discrepancy between the template's "full replacement text" instruction and the sync skill's "partial update / intelligent merging" approach for MODIFIED requirements is observed factually. The downstream effect on sync correctness (what happens when the sync skill receives a MODIFIED entry that only includes new scenarios rather than the full requirement) is not fully determinable from static reading alone.
- [ ] The `openspec-sync-specs` skill reads the delta spec file and applies changes by LLM judgment; the exact algorithm for "preserving scenarios/content not mentioned in the delta" in MODIFIED requirements is agent-driven and not deterministic from the source text.
- [ ] It is not confirmed from reading whether `openspec validate --all` (invoked in CI) treats MODIFIED with partial content as valid or as a violation. The `--strict` flag description only mentions the MUST/SHALL rule as the difference between strict and non-strict; further reading of the CLI source would be needed to confirm.
- [ ] The `subagent_type: "general-purpose"` spawn in `openspec-archive-change` has no named equivalent in the stage-agent registry or plugin.json. It is unclear whether this is intentional (a generic spawner that the OpenSpec CLI generates) or a limitation compared to how the kit otherwise spawns agents.
