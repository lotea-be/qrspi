# Research — verify-stage-gate-execution

> Stage R of QRSPI. Generated 2026-06-20.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Command→executor wiring**: `agent:` and `subtask:` frontmatter across all `claude/commands/*.md` files.
- **Subagent toolsets**: `tools:` line in each `claude/agents/*.md`; presence/absence of `AskUserQuestion`, `Agent`, and `Glob`.
- **Stage choreography mechanics**: "Stage choreography" section of `claude/skills/qrspi-workflow/SKILL.md`; four canonical procedures and tool invocations.
- **Context-firewall / executor model**: `claude/skills/context-hygiene/SKILL.md`; Task tool framing, orchestrator-vs-subagent split.
- **Lint surface**: `scripts/lint.mjs`; existing checks, structure, registration pattern.
- **Copilot sync mapping**: `sync-copilot.mjs`; how `agent:` frontmatter is mapped into `copilot/`; what `--check` verifies.
- **README executor/delegation description**: `README.md`; delegation prose and two-tool mapping table.

---

## File map

### Command→executor wiring

- `/workspaces/git/qrspi/claude/commands/questions.md` — Stage Q. Frontmatter: `agent: questioner`, `subtask: true`. Invokes questioner subagent. Next stage: `/qrspi:research <id>`.
- `/workspaces/git/qrspi/claude/commands/research.md` — Stage R. Frontmatter: `agent: researcher`, `subtask: true`. Invokes researcher subagent. Next stage: `/qrspi:design <id>`.
- `/workspaces/git/qrspi/claude/commands/design.md` — Stage D. Frontmatter: `agent: designer`, `subtask: true`. Invokes designer subagent. Next stage: `/qrspi:structure <id>`.
- `/workspaces/git/qrspi/claude/commands/structure.md` — Stage S. Frontmatter: `agent: architect`, `subtask: true`. Invokes architect subagent. Next stage: `/qrspi:slices <id>`.
- `/workspaces/git/qrspi/claude/commands/slices.md` — Stage V. Frontmatter: `agent: architect`, `subtask: true`. Invokes architect subagent. Next stage: `/qrspi:plan <id>`.
- `/workspaces/git/qrspi/claude/commands/plan.md` — Stage P. Frontmatter: `agent: planner`, `subtask: true`. Invokes planner subagent. Next stage: `/qrspi:implement <id>`.
- `/workspaces/git/qrspi/claude/commands/implement.md` — Stage I. Frontmatter: `agent: implementer`, `subtask: true`. Invokes implementer subagent via Agent tool (model-annotated). Next stage: `/qrspi:pr <id>`.
- `/workspaces/git/qrspi/claude/commands/pr.md` — Stage PR. Frontmatter: `agent: reviewer`, `subtask: true`. Invokes reviewer subagent. Ends with archive instruction.
- `/workspaces/git/qrspi/claude/commands/followup.md` — Post-PR fix loop. Frontmatter: `agent: implementer`, `subtask: true`. Invokes implementer in FIX MODE.
- `/workspaces/git/qrspi/claude/commands/archive.md` — Archive helper. Frontmatter: `agent: build`. No `subtask:` field. Delegates to `openspec-archive-change` skill.
- `/workspaces/git/qrspi/claude/commands/init.md` — Bootstrap helper. Frontmatter: `agent: build`. No `subtask:` field. No agent delegation to a QRSPI subagent.
- `/workspaces/git/qrspi/claude/commands/stack.md` — Stack helper. Frontmatter: `agent: build`. No `subtask:` field. No agent delegation to a QRSPI subagent.
- `/workspaces/git/qrspi/claude/commands/retro.md` — Retrospective helper. Frontmatter: `description:` only. No `agent:` field. No `subtask:` field.
- `/workspaces/git/qrspi/claude/commands/status.md` — Status helper. Frontmatter: `description:` only. No `agent:` field. No `subtask:` field.

**Summary table — command frontmatter:**

| Command file | `agent:` value | `subtask:` |
|---|---|---|
| `questions.md` | `questioner` | `true` |
| `research.md` | `researcher` | `true` |
| `design.md` | `designer` | `true` |
| `structure.md` | `architect` | `true` |
| `slices.md` | `architect` | `true` |
| `plan.md` | `planner` | `true` |
| `implement.md` | `implementer` | `true` |
| `pr.md` | `reviewer` | `true` |
| `followup.md` | `implementer` | `true` |
| `archive.md` | `build` | (absent) |
| `init.md` | `build` | (absent) |
| `stack.md` | `build` | (absent) |
| `retro.md` | (absent) | (absent) |
| `status.md` | (absent) | (absent) |

The value `build` is a built-in Claude Code agent (not a `claude/agents/*.md` file). `lint.mjs` treats `build` and `agent` as `BUILTIN_AGENTS` that require no file resolution.

### Subagent toolsets

- `/workspaces/git/qrspi/claude/agents/questioner.md` — Stage Q writer. `tools: Read, Write, Edit, Bash, Glob, Grep, Skill`. Model: `sonnet`.
- `/workspaces/git/qrspi/claude/agents/researcher.md` — Stage R writer (read-only). `tools: Read, Write, Bash, Glob, Grep, Skill`. Model: `sonnet`.
- `/workspaces/git/qrspi/claude/agents/designer.md` — Stage D writer. `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`. Model: `opus`.
- `/workspaces/git/qrspi/claude/agents/architect.md` — Stages S and V writer. `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`. Model: `sonnet`.
- `/workspaces/git/qrspi/claude/agents/planner.md` — Stage P writer (read-only on code). `tools: Read, Write, Bash, Glob, Grep, Skill`. Model: `sonnet`.
- `/workspaces/git/qrspi/claude/agents/implementer.md` — Stages I and followup writer. `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`. Model: `opus`.
- `/workspaces/git/qrspi/claude/agents/reviewer.md` — Stage PR reviewer (read-only). `tools: Read, Bash, Glob, Grep, Skill`. Model: `sonnet`.

**Tool presence summary:**

| Agent | `AskUserQuestion` | `Agent` | `Glob` |
|---|---|---|---|
| questioner | not listed | not listed | listed |
| researcher | not listed | not listed | listed |
| designer | not listed | listed | listed |
| architect | not listed | listed | listed |
| planner | not listed | not listed | listed |
| implementer | not listed | listed | listed |
| reviewer | not listed | not listed | listed |

`AskUserQuestion` does not appear in any agent's `tools:` line. `Agent` appears only in `designer`, `architect`, and `implementer`. All seven agents have `Glob`.

Note: `AskUserQuestion` is invoked by the orchestrator/command layer (referenced extensively in `*.md` command bodies), not by the subagents themselves — the command body instructs the orchestrator to use it before/after delegating to the subagent.

### Stage choreography mechanics

Source: `/workspaces/git/qrspi/claude/skills/qrspi-workflow/SKILL.md` — "Stage choreography (canonical procedures)" section.

**Four canonical procedures:**

1. **Precondition check (Glob-based)**
   - Tool invoked: `Glob` (explicitly named, not a shell command).
   - Logic: Glob the input artifact path(s). If Glob returns nothing, refuse and tell the user to run the named prior stage. If an approval gate is also required (e.g. Structure requires human-approved `design.md`), run an `AskUserQuestion` call here before invoking the subagent.

2. **Approval gate** (subset of precondition check, present in Structure only)
   - Tool invoked: `AskUserQuestion`.
   - Applied when a file existing is not the same as the human having approved it. The gate is embedded inside the precondition check step, not a separate step.

3. **Commit step (mandatory)**
   - Tool invoked: `AskUserQuestion` — question "Commit ... to the feature branch?", choices `["Yes -- commit and push", "No -- I'll commit later"]`.
   - On "Yes": `git add <explicit paths>`, `git commit -m "<stage message>"`, `git push`. Explicit paths only — never `git add -A`.
   - `openspec/backlog.md` is staged in the same commit when a backlog edit accompanies the artifact (backlog atomicity rule).

4. **Next-stage handoff (mandatory)**
   - Tool invoked: `AskUserQuestion` — question "Stage X is complete. Continue to stage Y now, or stop here?", choices `["Continue to /qrspi:<next> <id>", "Stop here -- I'll resume later"]`.
   - On "Continue": invoke the next-stage command as its own stage (a fresh subtask/subagent, not inline in the current conversation).
   - On "Stop": print `Next stage: /qrspi:<next> <id>` and end turn.

**How individual commands reference this section:**

All nine stage commands (`questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`, `followup`) include a `**Choreography (see skill \`qrspi-workflow\`, "Stage choreography").**` block with stage-specific variables. The body of each command supplies: artifact path(s), commit message string, git add line, and next-stage command name.

Exceptions / deviations from the pure canonical pattern:
- `design.md` deviates: its next-stage handoff re-uses the human's answer to the "Final confirmation" question (step 3 of its interactive review) rather than asking a separate AskUserQuestion. If they chose "Yes", it invokes `/qrspi:structure`; if "No / manual edit", it prints the banner.
- `implement.md` deviates: it has two AskUserQuestion calls per slice (one checkpoint gate "continue with Slice N?" and one commit question), rather than the single commit-step question. It also uses the Agent tool with `model: <annotated>` to select the implementer's model per slice.
- `pr.md` deviates: its precondition has two parts (Glob for file gate + Bash `git status --short` for clean-tree gate). The commit step is invoked unconditionally after PR creation, not via AskUserQuestion.

**Tools invoked per procedure (from the skill's authoritative text):**
- Precondition check → `Glob`
- Approval gate → `AskUserQuestion`
- Commit step → `AskUserQuestion` (then Bash git commands)
- Next-stage handoff → `AskUserQuestion`

### Context-firewall / executor model

Source: `/workspaces/git/qrspi/claude/skills/context-hygiene/SKILL.md`

**Operative lines (quoted):**

Heading: "Subagents are context firewalls, not personas"

> "Correct framing: a subagent is a **separate context window** that does a bounded job and returns a condensed result. The orchestrator never sees the subagent's full conversation — only the final message."

> "Always invoke each QRSPI stage as a subagent via the Task tool. Do not inline the stage prompt into the orchestrator's conversation."

> "Tell the subagent **exactly** what to return in its final message (e.g., 'Return the path of the file you wrote and a 5-bullet summary'). Anything more is wasted tokens."

> "Use **read-only** subagents (researcher, planner, reviewer) for fact-gathering. They cannot accidentally drift into edits."

The skill uses the term "Task tool" for stage invocation. The `implement.md` command body uses the term "Agent tool" (`subagent via the Agent tool with \`model: <annotated>\``). These are the same underlying Claude tool capability; the skill was written using the earlier "Task" terminology.

**Orchestrator-vs-subagent split:** The orchestrator (the slash command context) handles: precondition checks, AskUserQuestion calls, git commits, and next-stage handoff decisions. The subagent handles: all file reading, writing, and domain reasoning to produce the artifact.

**Context budget numbers:**
- Target: < 40% context window utilization.
- Hard reset trigger: 60% — start a new session.

### Lint surface

Source: `/workspaces/git/qrspi/scripts/lint.mjs`

**Structure:** Single Node.js ESM script (~600 lines), no npm dependencies. Collects all errors into an `errors` array, then reports and exits. Exits 0 on pass, 1 on any violation.

**Four checks, run in declaration order:**

1. **Check 1: Pin agreement** (`checkPinAgreement`)
   - Scans `claude/`, `copilot/`, `openspec/` (excluding `openspec/changes/`), `openspec-templates/`, and root-level files for `@fission-ai/openspec@<version>` and `openspec_version: <version>`.
   - Asserts all found occurrences agree on the same version string. Reports mismatch if multiple distinct versions found.
   - Excludes: `generatedBy:` lines in `claude/skills/openspec-*/` directories; the entire `openspec/changes/` subtree.
   - Pattern (regex): `/@fission-ai\/openspec@|openspec_version:\s*)(\d+\.\d+\.\d+)/`.

2. **Check 2: Frontmatter / name resolution** (`checkFrontmatter`)
   - **Agents** (`claude/agents/*.md`): requires `name:` and `description:` fields; checks `model:` is an alias (`opus`/`sonnet`/`haiku`), not a pinned id; checks `Load skill X` body references resolve to existing `claude/skills/<X>/` directories.
   - **Commands** (`claude/commands/**/*.md`): requires `description:`; if `agent:` is present and not in `BUILTIN_AGENTS = {'build', 'agent'}`, asserts `claude/agents/<agent>.md` exists; checks `model:` alias validity.
   - **Skills** (`claude/skills/<dir>/SKILL.md`): requires `name:` and `description:`.
   - Skill reference resolution: extracted via `checkSkillRefs()` — matches backtick-wrapped names after `Load skill(s)` and `load the \`X\` skill` patterns. Only backtick-wrapped names are validated.

3. **Check 3: Heading alignment** (`checkHeadingAlignment`)
   - Asserts that canonical section headings from each `openspec-templates/*.template.md` appear in the body of the agent that writes that artifact.
   - Mapping hardcoded in `TEMPLATE_CANONICAL_HEADINGS`:
     - `questions.template.md` → `questioner` agent: 10 headings (e.g. `## Data model`, `## Open product questions (for the human)`).
     - `design.template.md` → `designer` agent: 4 headings (`## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`).
     - `proposal.template.md` → `architect` agent: 4 headings (`## Why`, `## What Changes`, `## Capabilities`, `## Impact`).
     - `tasks.template.md` → `planner` agent: 0 headings (dynamic format; check skipped).
     - `spec-delta.template.md` → `architect` agent: 3 headings (`## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`).

4. **Check 4: README command coverage** (`checkReadmeCoverage`)
   - Forward: every `claude/commands/<stem>.md` file must appear as `/qrspi:<stem>` in `README.md`.
   - Reverse: every `/qrspi:<token>` in `README.md` must resolve to `claude/commands/<token>.md`.
   - Regex for README extraction: `/\/qrspi:([a-z][a-z-]*)/g`.

**How a new check is registered:** Add an `async function check<Name>(errors)` function that pushes to `errors[]` on violations and writes an `OK:` line to stdout on pass. Then add a call to it in `main()` with a `process.stdout.write('Check N: ...\n')` label before the call. The `errors` array is passed by reference and accumulated across all checks before the single `process.exit()`.

### Copilot sync mapping

Source: `/workspaces/git/qrspi/sync-copilot.mjs`

**Generation logic for commands → prompts:**

Each `claude/commands/<stem>.md` is transformed to `copilot/prompts/qrspi-<stem>.prompt.md` (the `qrspi-` prefix is re-added because the Claude plugin namespace is dropped in Copilot). The exception: `qrspi-sync-copilot` is skipped (`if (base === 'qrspi-sync-copilot') continue`).

The generated prompt frontmatter is built as:
```
description: <from command's description: field>
argument-hint: <from hintFor[stem] if present>
agent: copilot-<agentFor[stem]>   OR   agent: agent   (if stem not in agentFor)
tools: [...]   (only added for generic `agent: agent` prompts that use AskUserQuestion)
```

**`agentFor` table (hardcoded in script):**

| Command stem | Mapped Copilot agent |
|---|---|
| `qrspi-questions` | `copilot-questioner` |
| `qrspi-research` | `copilot-researcher` |
| `qrspi-design` | `copilot-designer` |
| `qrspi-structure` | `copilot-architect` |
| `qrspi-slices` | `copilot-architect` |
| `qrspi-plan` | `copilot-planner` |
| `qrspi-implement` | `copilot-implementer` |
| `qrspi-followup` | `copilot-implementer` |
| `qrspi-pr` | `copilot-reviewer` |

Commands NOT in `agentFor` (get `agent: agent`): `qrspi-archive`, `qrspi-init`, `qrspi-stack`, `qrspi-retro`, `qrspi-status`.

The script does NOT read the `agent:` field from the source command's frontmatter when building the generated prompt. It uses the hardcoded `agentFor` lookup table keyed by the command stem. The source command's `agent:` field is not consumed in the mapping.

**`node sync-copilot.mjs --check` verifies:**
- Regenerates to a temp directory.
- Diffs the union of `copilot/` (committed) and the temp tree.
- Reports: ADDED (would be generated, not in `copilot/`), DELETED (in `copilot/`, no longer generated), DIFF (content differs).
- Exits non-zero if any files differ OR if any `claude/skills/<dir>/SKILL.md` was missing.

**Generated file types:**
- `copilot/agents/copilot-<base>.agent.md` — from `claude/agents/<base>.md` (all agents, no skip).
- `copilot/prompts/qrspi-<stem>.prompt.md` — from `claude/commands/<stem>.md` (minus `qrspi-sync-copilot`).
- `copilot/instructions/<dirName>.instructions.md` — from `claude/skills/<dirName>/SKILL.md` (minus `qrspi-sync-copilot`).

**Body rewrites applied (via `rewriteAll`):**
- `$ARGUMENTS` → `${input}`
- `/qrspi:<cmd>` → `/qrspi-<cmd>` (colon to dash for Copilot namespace)
- `AskUserQuestion` → `vscode/askQuestions` (tool mapping)
- `invoke the <X> subagent` → `continue as the <X>`
- `Load skill \`X\`` → `Consult the **X** instructions (\`X.instructions.md\`)`
- `.claude/` paths rewritten to `.github/` paths
- `agent: .github/agents/<x>.agent.md` prefixed with `copilot-`

**Key gap:** The `agentFor` table in `sync-copilot.mjs` is maintained separately from the `agent:` frontmatter in `claude/commands/*.md`. They describe the same mapping but are independent — a change to one does not automatically update the other.

### README executor/delegation description

Source: `/workspaces/git/qrspi/README.md`

**Two-tool mapping table (lines 186–190):**

```
| Claude Code (`claude/…`) | GitHub Copilot (`copilot/…`) | Installs to |
|---|---|---|
| `agents/<x>.md` (subagents) | `agents/<x>.agent.md` (custom agents) | `~/.copilot/agents/` |
| `commands/<x>.md` (`/qrspi:*`) | `prompts/<x>.prompt.md` (slash prompts) | `~/.copilot/prompts/` |
| `skills/<x>/SKILL.md` (model-invoked) | `instructions/<x>.instructions.md` (referenced on demand) | `~/.copilot/instructions/` |
```

**Delegation assertion (lines 192–193):**

> "A Copilot prompt carries an `agent:` field, so `/qrspi:questions` runs inside the `questioner` agent — mirroring how the Claude command delegates to its subagent."

**Stage table (lines 28–35):** Lists all eight stages with command name and artifact, but does not name the subagent each command delegates to. Delegation is described at a pattern level only, not per-command.

**Fidelity gaps noted in README (lines 219–225):**
- Per-slice model selection: Claude picks automatically; Copilot requires manual model-picker selection.
- Subagent orchestration: "Deep delegation becomes a single `agent:` per prompt plus human-driven agent switches."
- Skill auto-loading: instruction files are referenced on demand, not auto-loaded.

---

## Public API surface

No HTTP endpoints. The public surface is the set of slash commands:

| Command | Frontmatter `agent:` | `subtask:` | Artifact written |
|---|---|---|---|
| `/qrspi:questions <id>` | `questioner` | true | `openspec/changes/<id>/questions.md` |
| `/qrspi:research <id>` | `researcher` | true | `openspec/changes/<id>/research.md` |
| `/qrspi:design <id>` | `designer` | true | `openspec/changes/<id>/design.md` |
| `/qrspi:structure <id>` | `architect` | true | `openspec/changes/<id>/proposal.md` + `specs/` |
| `/qrspi:slices <id>` | `architect` | true | `openspec/changes/<id>/slices.md` |
| `/qrspi:plan <id>` | `planner` | true | `openspec/changes/<id>/tasks.md` |
| `/qrspi:implement <id>` | `implementer` | true | code + tests; ticks `tasks.md` |
| `/qrspi:pr <id>` | `reviewer` | true | PR description + `pr.md` + optional `followups.md` |
| `/qrspi:followup <id>` | `implementer` | true | fixes code; ticks `followups.md` |
| `/qrspi:archive <id>` | `build` | (absent) | archives change folder |
| `/qrspi:init` | `build` | (absent) | `openspec/` scaffold |
| `/qrspi:stack` | `build` | (absent) | `.claude/skills/<repo>-stack/SKILL.md` |
| `/qrspi:retro <id> <stage>` | (absent) | (absent) | `openspec/changes/<id>/retrospective.md` |
| `/qrspi:status` | (absent) | (absent) | prints stage map, no artifact |

---

## Data model

No database tables. The data model is the OpenSpec filesystem:

- `openspec/config.yaml` — QRSPI init sentinel; `schema:` and `openspec_version:` fields.
- `openspec/backlog.md` — flat list of change rows; columns: `Status:`, `Next QRSPI command:`.
- `openspec/changes/<id>/questions.md` — stage Q artifact.
- `openspec/changes/<id>/research.md` — stage R artifact.
- `openspec/changes/<id>/design.md` — stage D artifact; gated on human approval before stage S.
- `openspec/changes/<id>/proposal.md` — stage S artifact.
- `openspec/changes/<id>/specs/<capability>/spec.md` — stage S artifact (delta spec).
- `openspec/changes/<id>/slices.md` — stage V artifact; each slice carries a `**Model:** sonnet|opus` annotation.
- `openspec/changes/<id>/tasks.md` — stage P artifact; checkbox format `- [ ]`/`- [x]`.
- `openspec/changes/<id>/pr.md` — stage PR artifact; PR number and URL.
- `openspec/changes/<id>/followups.md` — optional; post-PR fix queue.
- `openspec/changes/archive/<YYYY-MM-DD-id>/` — archived change folders.
- `openspec/specs/<capability>/spec.md` — current accepted specs.

---

## Implicit contracts and conventions

1. **Glob over shell for file checks.** All precondition checks and file discovery in commands use the `Glob` tool, never shell (`ls`, etc.). This is enforced by a CLAUDE.md rule and documented in `qrspi-workflow` SKILL.md.

2. **`subtask: true` on all QRSPI-agent stage commands.** The nine stage commands (`questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`, `followup`) all carry `subtask: true`. The four helper commands (`archive`, `init`, `stack`, `retro`, `status`) do not — `retro` and `status` have no `agent:` at all; `archive`, `init`, `stack` use the built-in `build` agent.

3. **`agent:` in command frontmatter is the executor declaration.** The Claude Code harness reads this field to route the command to the named agent. The `sync-copilot.mjs` script does NOT read this field from source; it uses a separate hardcoded `agentFor` lookup table. These two mappings are maintained independently and must agree.

4. **`AskUserQuestion` is an orchestrator-layer tool, not a subagent tool.** It appears in command bodies (invoked by the command/orchestrator context) but is absent from all agent `tools:` lines. The `qrspi-workflow` skill's choreography section specifies `AskUserQuestion` for the commit step and next-stage handoff.

5. **Backlog atomicity.** Every stage whose state change touches `openspec/backlog.md` must include that edit in the same commit as the stage's artifact. The `git add` line in each command is explicit and includes `openspec/backlog.md` when required.

6. **Never `git add -A`.** Enforced by `qrspi-workflow` skill, `implement.md`, `pr.md`, and `followup.md`. Every commit stages only explicitly-named paths.

7. **Model aliases only in frontmatter.** `lint.mjs` check 2 rejects pinned model ids. Valid values: `opus`, `sonnet`, `haiku`.

8. **Skill references must resolve.** `lint.mjs` check 2 validates that backtick-wrapped names following `Load skill(s)` patterns in agent bodies exist as `claude/skills/<name>/` directories.

9. **README coverage is mechanically enforced.** `lint.mjs` check 4 enforces bidirectional coverage: every `claude/commands/*.md` file must appear as `/qrspi:<stem>` in README, and every `/qrspi:<token>` in README must resolve to a command file.

10. **Context-hygiene: Task tool framing.** `context-hygiene` SKILL.md uses the term "Task tool" for stage invocation; `implement.md` uses "Agent tool" for per-slice model selection. Both refer to the same Claude subagent invocation mechanism; the terminology is inconsistent between the skill and the command.

11. **The `agentFor` table in `sync-copilot.mjs` is the Copilot delegation source of truth.** It maps nine command stems to `copilot-<role>` agents. Five commands not in `agentFor` get `agent: agent` (the Copilot generic agent). This table has no automated consistency check against the `agent:` fields in `claude/commands/*.md`.

---

## Open gaps

- [ ] The relationship between `subtask: true` in command frontmatter and the Claude Code harness's actual dispatch behavior is not documented in any file in this repo. It is unclear what `subtask: true` causes the harness to do differently vs. a command without it — and whether absence of `subtask:` on helper commands (`archive`, `init`, `stack`) is intentional or an omission.
- [ ] `AskUserQuestion` is absent from all agent `tools:` lines, but the command bodies instruct the orchestrator to use it. Whether this is architecturally correct (orchestrator-only tool) or a gap (some subagents should also have it) is not documented explicitly — only `context-hygiene` implies the orchestrator/subagent split.
- [ ] The `agentFor` table in `sync-copilot.mjs` and the `agent:` frontmatter in command files are parallel representations of the same mapping with no automated cross-check. No lint check currently validates their agreement.
- [ ] `retro.md` and `status.md` have no `agent:` field. It is not clear whether this is intentional (they run in the orchestrator context directly, not as delegated subagents) or whether they are expected to carry one. The lint check does not require `agent:` on commands.
- [ ] The lint script (check 2) validates `agent:` resolves to `claude/agents/*.md`, but does not validate `subtask:` presence/absence on stage vs. helper commands.
