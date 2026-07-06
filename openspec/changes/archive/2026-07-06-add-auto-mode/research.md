# Research — add-auto-mode

> Stage R of QRSPI. Generated 2026-06-29.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Stage command structure & human-interaction points:** every `claude/commands/*.md` file — frontmatter fields, delegation mechanism, and all AskUserQuestion call-sites.
- **Shared choreography in `claude/skills/qrspi-workflow/SKILL.md`:** the "Stage choreography (canonical procedures)" section — precondition check, approval gate, commit step, and next-stage handoff.
- **Subagent orchestration & context-firewall model:** `claude/skills/context-hygiene/SKILL.md`; the seven agent definitions in `claude/agents/*.md` and their `tools:` lines.
- **Implement stage per-slice mechanism:** `claude/commands/implement.md`; `claude/skills/vertical-slice/SKILL.md` model annotation and iteration rules.
- **Backlog conventions & deferred-work capture:** `openspec/backlog.md` format; "Capturing deferred work" / "offer, never auto-append" rules in the workflow skill.
- **Copilot port & sync mechanism:** `sync-copilot.mjs`; `.claude/skills/qrspi-sync-copilot/SKILL.md`.
- **Lint/verification surface:** `scripts/lint.mjs` checks; `.github/workflows/ci.yml` and `release.yml`.
- **README & docs surface:** `README.md` — eight-stages table, command list, two-tool table, human-gate prose.

---

## File map

### Area 1 — Stage command structure & human-interaction points

`claude/commands/questions.md` — Stage Q entrypoint. No frontmatter `agent:` field (runs on the main-loop orchestrator). Spawns `questioner` via the Agent tool (`subagent_type: qrspi:questioner`). AskUserQuestion call-sites: (a) one-at-a-time for each "Open product questions" entry (step 6, mandatory interactive step); plus the canonical commit step and next-stage handoff AskUserQuestion calls inherited via the `workflow` choreography reference.

`claude/commands/research.md` — Stage R entrypoint. No `agent:` in frontmatter. Spawns `researcher` via Agent tool. No additional AskUserQuestion beyond the canonical commit step and next-stage handoff.

`claude/commands/design.md` — Stage D entrypoint. No `agent:` in frontmatter. Spawns `designer` via Agent tool. AskUserQuestion call-sites: (a) each "Open questions for the human" item from `design.md` one-at-a-time; (b) each numbered decision D1, D2, … one per call (batched up to 4/call); (c) a final "All decisions reviewed. Ready to proceed to Structure?" confirmation; (d) each candidate separable future change offered for backlog capture ("Add as idea / Skip"). Then canonical commit step and next-stage handoff.

`claude/commands/structure.md` — Stage S entrypoint. No `agent:` in frontmatter. Has an approval gate beyond the file gate: AskUserQuestion "Have you reviewed and approved design.md?" with choices `["Yes, design is approved", "No — I still need to review it"]`. Spawns `architect` via Agent tool. Then each out-of-scope candidate offered via AskUserQuestion (backlog capture). Then canonical commit step and next-stage handoff.

`claude/commands/slices.md` — Stage V entrypoint. No `agent:` in frontmatter. Spawns `architect` via Agent tool. No additional AskUserQuestion beyond canonical commit step and next-stage handoff.

`claude/commands/plan.md` — Stage P entrypoint. No `agent:` in frontmatter. Spawns `planner` via Agent tool. No additional AskUserQuestion beyond canonical commit step and next-stage handoff.

`claude/commands/implement.md` — Stage I entrypoint. No `agent:` in frontmatter. Reads `tasks.md` to find next un-ticked slice and its `**Model:**` annotation; invokes implementer via Agent tool with `model: <annotated>`. Per-slice AskUserQuestion call-sites: (a) at each slice checkpoint: "Slice N is complete and tests pass. Continue with Slice N+1?" with choices `["Yes, continue…", "Stop here — I want to review first"]`; (b) before each slice commit: "Commit Slice N changes to the feature branch?" with choices `["Yes — commit and push", "No — I'll commit later"]`. Then canonical next-stage handoff only at the final slice (not between slices).

`claude/commands/pr.md` — Stage PR entrypoint. No `agent:` in frontmatter. Has a two-part precondition: Glob for `tasks.md` existence, then Bash `git status --short` for clean tree. Spawns `reviewer` via Agent tool. AskUserQuestion call-site: "The PR description is ready. Would you like me to create the PR now, or do you want to review the description first?" with choices `["Create the PR now", "Show me the description first — I'll create it manually"]`. Then commit step (if PR was created).

`claude/commands/init.md` — Helper. Has `agent: build` in frontmatter (runs inline on a builtin agent, not a QRSPI subagent). AskUserQuestion call-site: "OpenSpec is initialized. This repo has no stack cheatsheet yet — …Set it up now?" with choices `["Yes — run /qrspi:stack now", "No — I'll do it later"]`. No canonical choreography commit/handoff (init has its own commit path).

`claude/commands/stack.md` — Helper. Has `agent: build`. AskUserQuestion call-site: interview to fill gaps the stack detection cannot answer (step 3). No canonical choreography.

`claude/commands/status.md` — Helper. No `agent:` field. No AskUserQuestion calls. Read-only: derives stage from existing artifacts via Glob, prints the stage map.

`claude/commands/retro.md` — Helper. No `agent:` field. Loads `retrospective` skill. AskUserQuestion call-sites: (a) each "Proposed edits" row offered for apply/defer/skip (step 5); (b) commit confirmation. Commit uses explicit paths: `retrospective.md` + each edited prompt/skill/template file.

`claude/commands/followup.md` — Helper (post-PR fix loop). No `agent:` field. Spawns `implementer` via Agent tool in FIX MODE. AskUserQuestion call-site: "Fix for '<short title>' is implemented and green. Commit it to the PR branch?" with choices `["Yes — commit and push", "Yes — commit, I'll push later", "No — let me review first"]`.

`claude/commands/archive.md` — Helper. Has `agent: build`. No AskUserQuestion. Delegates to `openspec-archive-change` skill. Informs (does not hard-block) if `followups.md` has un-ticked boxes.

**Frontmatter summary across all 14 commands:**

| File | `description:` | `agent:` | `model:` |
|---|---|---|---|
| questions.md | yes | — | — |
| research.md | yes | — | — |
| design.md | yes | — | — |
| structure.md | yes | — | — |
| slices.md | yes | — | — |
| plan.md | yes | — | — |
| implement.md | yes | — | — |
| pr.md | yes | — | — |
| init.md | yes | `build` | — |
| stack.md | yes | `build` | — |
| status.md | yes | — | — |
| retro.md | yes | — | — |
| followup.md | yes | — | — |
| archive.md | yes | `build` | — |

No command carries a `model:` field; model selection for subagents happens inside the command body (passed to Agent tool), not in frontmatter.

---

### Area 2 — Shared choreography in `claude/skills/workflow/SKILL.md`

Source file: `claude/skills/workflow/SKILL.md` (also available as the `qrspi-workflow` skill in the plugin cache). The `claude/skills/workflow/SKILL.md` file is the authoritative source; the plugin-cache copy at `/home/vscode/.claude/plugins/cache/lotea-agents/qrspi/0.4.1/claude/skills/qrspi-workflow` is the installed variant.

**Section: "Stage choreography (canonical procedures)"** — defines four shared invariant procedures that every stage command references via "follow the canonical … in skill `workflow`":

#### Precondition check (Glob-based)
- Tool used: **Glob tool** (explicitly not shell/Bash — "Glob has no permission requirements and works on every platform").
- Pattern: the stage's input artifact path(s).
- On failure: refuse and tell user to run the named prior stage.
- Extra approval gate (only S and, optionally, other stages): runs via AskUserQuestion before subagent invocation.

#### Commit step (mandatory)
- Tool used: **AskUserQuestion** tool.
- Question template: "Commit <the stage's artifact(s) and any backlog edit> to the feature branch?"
- Choices: `["Yes -- commit and push", "No -- I'll commit later"]`.
- If yes, git commands:
  ```
  git add <explicit artifact path(s)> [openspec/backlog.md]
  git commit -m "<the stage's commit message>"
  git push
  ```
- **Never use `git add -A`** — explicit staging only.
- If no: skip commit, proceed to handoff.

#### Next-stage handoff (mandatory)
- Tool used: **AskUserQuestion** tool.
- Question template: "Stage <X> is complete. Continue to stage <Y> now, or stop here?"
- Choices: `["Continue to /qrspi:<next> <id>", "Stop here -- I'll resume later"]`.
- If Continue: **re-enter the slash command** (do NOT spawn next stage as subagent — preserves gates and Research ticket-hiding).
- If Stop: print `Next stage: /qrspi:<next> <id>` and end turn.

#### Backlog atomicity
- When a stage's state change has a matching `backlog.md` edit, that edit lands in the same commit — never a separate follow-up.
- Stage that has already had its subagent perform the backlog edit (e.g. questioner flips status): the orchestrator **verifies** rather than re-edits (re-editing a file the subagent just wrote fails with "file modified since read" error).

**How stage commands reference these procedures:**
Each stage command file carries only its stage-specific variables (artifact filenames, commit message string, precondition artifact + prior-stage name, agent to invoke, next-stage command) and delegates the procedure wording to the skill via the phrase "follow the canonical *commit step* / *next-stage handoff* / *precondition check* in skill `workflow`". The skill body is the authoritative wording.

---

### Area 3 — Subagent orchestration & context-firewall model

Source: `claude/skills/context-hygiene/SKILL.md`.

**Key numbers:** target < 40% context window utilization; hard reset at 60%.

**Context-firewall framing:** a subagent is "a separate context window that does a bounded job and returns a condensed result." The orchestrator never sees the subagent's full conversation — only the final message. This is what makes long QRSPI flows possible.

**AskUserQuestion availability:** the skill explicitly states "AskUserQuestion is unavailable inside a subagent and must be called by the main-loop orchestrator." The orchestrator owns all human dialogue (commit gate, next-stage handoff, approval gate) and the next-stage invocation; the subagent does only the bounded artifact write.

**Ticket-hiding enforcement mechanism:** The `researcher` agent's system prompt (`claude/agents/researcher.md`) explicitly states the researcher must NOT open `questions.md` (or any other ticket-bearing artifact in the change folder). The orchestrator (`claude/commands/research.md`) is instructed not to pass the feature description to the researcher — only the change id and areas of interest. This is enforced by convention (instruction text), not by a mechanical tool-restriction: the researcher has `Read` in its `tools:` list. The `openspec/backlog.md` identifies this as an open idea: `enforce-research-ticket-hiding`.

**The seven subagents and their `tools:` lines:**

| Agent file | `name:` | `model:` | `tools:` |
|---|---|---|---|
| `claude/agents/questioner.md` | `questioner` | `sonnet` | `Read, Write, Edit, Bash, Glob, Grep, Skill` |
| `claude/agents/researcher.md` | `researcher` | `sonnet` | `Read, Write, Bash, Glob, Grep, Skill` |
| `claude/agents/designer.md` | `designer` | `opus` | `Read, Write, Edit, Bash, Glob, Grep, Skill, Agent` |
| `claude/agents/architect.md` | `architect` | `sonnet` | `Read, Write, Edit, Bash, Glob, Grep, Skill, Agent` |
| `claude/agents/planner.md` | `planner` | `sonnet` | `Read, Write, Bash, Glob, Grep, Skill` |
| `claude/agents/implementer.md` | `implementer` | `opus` | `Read, Write, Edit, Bash, Glob, Grep, Skill, Agent` |
| `claude/agents/reviewer.md` | `reviewer` | `sonnet` | `Read, Bash, Glob, Grep, Skill` |

Observation: researcher and reviewer are **read-only on code** (no `Write`, `Edit`). Researcher has `Write` to produce `research.md` (its own artifact). Reviewer has no `Write` or `Edit` — it is strictly read-only, outputting its draft as a final message only.

**Re-entering slash commands per stage:** the `context-hygiene` skill states "invoke each QRSPI stage's bounded artifact write as a subagent via the Agent tool" and "do not inline the stage prompt into the orchestrator's conversation." The next-stage handoff in the choreography section requires re-entering the slash command so its body runs on the orchestrator — NOT spawning the next stage as a subagent, which would bypass its gates.

---

### Area 4 — Implement stage per-slice mechanism

Source: `claude/commands/implement.md` and `claude/agents/implementer.md`, with model-selection rules in `claude/skills/vertical-slice/SKILL.md`.

**Per-slice iteration in `implement.md`:**
1. Reads `tasks.md`; finds the first slice header (`## N. ...`) whose tasks are not all ticked.
2. Reads the `**Model:** sonnet|opus — <rationale>` line directly under that header (written by the architect at stage V, carried verbatim by the planner at stage P).
3. Invokes the `implementer` subagent via the Agent tool with `model: <annotated>`. If the annotation is missing, stops and tells the user to fix `slices.md`/`tasks.md` — no silent default.
4. The implementer works the tasks in the slice in order, ticking checkboxes, running tests, then stops at the slice checkpoint.

**Per-slice human checkpoint (implement.md, mandatory):**
AskUserQuestion: "Slice N (title) is complete and tests pass. Should I continue with Slice N+1?" — choices `["Yes, continue with Slice N+1", "Stop here — I want to review first"]`. Only proceeds on explicit confirmation.

**Per-slice commit (implement.md, mandatory):**
AskUserQuestion: "Commit Slice N changes to the feature branch?" — choices `["Yes — commit and push", "No — I'll commit later"]`. If yes:
- On **final** slice: updates `backlog.md` Status to `in-progress (Q, R, D, S, V, P, I complete)` and `Next QRSPI command:` to `/qrspi:pr <id>`.
- On **intermediate** slices: leaves Status alone, updates `Next QRSPI command:` to reflect slice N+1 in flight.
- Git commands: `git add openspec/changes/<id>/tasks.md openspec/backlog.md <files-modified-in-this-slice>` then `git commit -m "feat(<id>): implement slice N — <slice title>"` then `git push`.
- The implementer's final message lists files under "Files created/modified" — those are staged explicitly, never via `git add -A`.

**Model annotation in `vertical-slice/SKILL.md`:**
The `**Model:** sonnet|opus` annotation per slice is mandatory (written by architect at slices stage). Rules for choosing:
- `sonnet`: structured and templated (new entity mirroring existing, endpoint pattern, DTOs, mechanical refactors).
- `opus`: deep reasoning (first-of-kind pattern, non-obvious authorization, performance-critical, concurrency, complex UI interaction).
- When in doubt, prefer `sonnet`; implementer can escalate to `opus` by re-invoking.

**Resumption:** re-running `/qrspi:implement <id>` picks up at the next un-ticked slice (the command re-reads `tasks.md` to find the first slice not fully ticked).

**Scope amendment during I:** if the human asks for out-of-scope functionality mid-implementation, `implement.md` prescribes: (1) amend `proposal.md` + delta specs; (2) add new `## N.` group to `tasks.md` + matching slice to `slices.md` (each with `**Model:**` annotation, loaded with `vertical-slice` skill); (3) commit as `docs(<id>): amend scope — add Slice N...`; (4) run `/qrspi:implement <id>` to implement via normal machinery.

**`implementer.md` model override check:** the implementer agent itself also checks its own model at step 3 — if not running on the annotated model, stops and tells the orchestrator to re-invoke or confirm an override. This is the agent's own self-check, separate from the command's invocation logic.

---

### Area 5 — Backlog conventions & deferred-work capture

Source: `openspec/backlog.md` (the live backlog file) and `claude/skills/workflow/SKILL.md` sections "Before Q — the backlog" and "Capturing deferred work".

**Backlog file format (`openspec/backlog.md`):**
- Header section explaining the file's purpose and status values.
- Sections: `## Proposed`, `## Ideas` (and implicitly `## In-Progress`, `## Merged` as statuses).
- Each entry:
  ```
  ### <change-id> — `<status>`
  **Why:** <one-line rationale>
  **Likely shape:** <brief description of expected form>
  ```
- Status values: `idea` / `proposed (change folder created YYYY-MM-DD)` / `in-progress (Q, R, D, S, V, P, I complete)` / `in-progress (… PR #N open — <url>)` / `merged`.
- The `Next QRSPI command:` line appears in backlog entries; it is added by stage S and updated by V, P, I, and PR.
- Completed/archived rows are removed from the backlog; the `openspec/changes/archive/` folder is the source of truth for completed work.

**Backlog atomicity rule:** every `backlog.md` edit lands in the same commit as the state change it reflects — never a separate follow-up commit.

**Capturing deferred work — which stages capture:**
- **Q, D, S** capture separable future changes.
- **R and V do not capture:** R is ticket-blind (cannot judge scope); V's cut slices are almost always in-change concerns.

**The four capture rules (offer, never auto-append):**
1. **Offer, never auto-append.** Present each candidate to the human one at a time via AskUserQuestion ("Add as idea / Skip"). The human decides per item; a skipped item is dropped, not re-asked.
2. **Dedup first.** Skip any candidate already covered by an existing backlog row (match on intent, not exact wording).
3. **Minimal row.** An accepted item is one `idea` row with a one-line *Why*. Do not pre-fill a *Likely shape* the human hasn't scoped.
4. **Same commit.** Added rows land in the same commit as the stage's artifact (backlog atomicity).

**In-change follow-ups vs. separable future changes:**
- In-change (a gap this PR will leave) → `followups.md`, not the backlog.
- Separable future change (genuinely a different change) → `idea` row in `backlog.md`.

---

### Area 6 — Copilot port & sync mechanism

Source: `sync-copilot.mjs` (repo root) and `.claude/skills/qrspi-sync-copilot/SKILL.md`.

**`sync-copilot.mjs` — architecture:**
- Entry: `main()` validates source dirs (`claude/agents`, `claude/commands`, `claude/skills`) are non-empty, then calls `runGenerate()` or `runCheck()` based on `--check` flag.
- `generate(dst)`: drops and recreates the output tree; three passes — agents, commands→prompts, skills→instructions.

**`agentFor` table (line 34–39):**
```javascript
const agentFor = {
  'qrspi-questions': 'questioner',
  'qrspi-research': 'researcher',
  'qrspi-design': 'designer',
  'qrspi-structure': 'architect',
  'qrspi-slices': 'architect',
  'qrspi-plan': 'planner',
  'qrspi-implement': 'implementer',
  'qrspi-followup': 'implementer',
  'qrspi-pr': 'reviewer',
};
```
Commands not in this table (init, stack, status, retro, archive, status) receive `agent: agent` (builtin generic agent). The `qrspi-sync-copilot` command is **excluded** from the output entirely (line 288: `if (base === 'qrspi-sync-copilot') continue;`).

**`hintFor` table (line 40–48):** `argument-hint` values per command stem.

**`mapTools(toolLine)` function (line 99–105):** maps Claude `tools:` frontmatter to Copilot tool ids. Base set always included: `search/codebase`, `search`, `vscode/askQuestions`. Write/Edit → `edit/editFiles`. Bash/PowerShell → `execute/runInTerminal`, `execute/getTerminalOutput`. WebFetch/WebSearch → `web/fetch`. Result de-duplicated.

**`rewriteAll(input)` function (line 109–161):** ordered text rewrites applied to every file. Key rewrites:
- `$ARGUMENTS` → `${input}`.
- `~/.claude` / `$HOME/.claude` → `~/.copilot` / `$HOME/.copilot`.
- "restart Claude Code" → "reload the VS Code window".
- `.claude/skills/<x>/SKILL.md` → `.github/instructions/<x>.instructions.md`.
- `.claude/commands/<x>.md` → `.github/prompts/<x>.prompt.md`.
- `.claude/agents/<x>.md` → `.github/agents/<x>.agent.md`.
- `.github/agents/<x>.agent.md` → `.github/agents/copilot-<x>.agent.md` (namespace, with negative lookahead to avoid `copilot-copilot-`).
- "Load skill `X`" → "Consult the **X** instructions (`X.instructions.md`)".
- "load the `X` skill" → "consult the **X** instructions".
- "Load skills" (bare) → "Consult the instructions for".
- `!`-prefixed shell-injection lines → "Run `<shell>` and use the result."
- `@path` → `#file:path`.
- `**AskUserQuestion** tool` / `**AskUserQuestion tool**` → `#tool:vscode/askQuestions`.
- Bare `AskUserQuestion` → `vscode/askQuestions`.
- "invoke the X subagent" → "continue as the X".
- `/qrspi:<cmd>` → `/qrspi-<cmd>`.

**`applyFixups(rel, input)` function (line 170–209):** per-output-file literal replacements. Currently two entries:
1. `prompts/qrspi-implement.prompt.md`: rewrites the per-slice model selection prose to note Copilot has no auto-selection; tells user to pick model in model picker.
2. `prompts/qrspi-init.prompt.md`: rewrites the `opsx` sweep to use Copilot-appropriate removal commands.

**`--check` mode (`runCheck()`):** generates to a temp dir, diffs against committed `copilot/` (union of both trees), reports ADDED / DELETED / DIFF with a positional line diff. Exits 1 if any file differs or any skill SKILL.md was missing. Used by CI.

**Output tree structure (`copilot/`):** 7 agent files (`copilot-<role>.agent.md`), 13 prompt files (`qrspi-<stem>.prompt.md`; all commands except `qrspi-sync-copilot`), 8 instruction files (one per skill dir except `qrspi-sync-copilot`).

**Known fidelity gaps (documented in SKILL.md and README.md):**
1. Per-slice model selection: becomes advisory prose, not automatic.
2. Subagent orchestration: one `agent:` per prompt; deeper delegation becomes human-driven agent switch.
3. Skill auto-loading: instruction files are soft references, not auto-applied.
4. Shell injection / file includes: degrade to written steps.
5. Next-stage handoffs: Claude chains automatically; Copilot asks via `vscode/askQuestions` and the human runs the next prompt.

---

### Area 7 — Lint/verification surface

Source: `scripts/lint.mjs` and `.github/workflows/ci.yml`, `.github/workflows/release.yml`.

**`scripts/lint.mjs` — five checks:**

**Check 1: Pin agreement.**
Scans all hand-maintained files (not `openspec/changes/` subtree, not `generatedBy:` lines in openspec-generated skill files) for occurrences of `@fission-ai/openspec@<version>` and `openspec_version: <version>`. Asserts all found occurrences agree on the same version string. Exits with error if zero occurrences found or if multiple distinct versions appear. Scans: `claude/`, `copilot/`, `openspec/` (excluding `openspec/changes/`), `openspec-templates/`, root-level `*.md|yaml|yml|json|mjs|ps1|sh`.

**Check 2: Frontmatter / name resolution.**
- Agents: require `name:` and `description:`. `model:` if present must be an alias (`opus`/`sonnet`/`haiku`), not a pinned id (detected by date segment or `claude-<digit>`). Also checks all `Load skill \`X\`` and `load the \`X\` skill` references in body resolve to a real `claude/skills/<X>/` directory.
- Commands: require `description:`. `agent:` if present must resolve to a real `claude/agents/<agent>.md` or be a builtin (`build`, `agent`). `model:` if present must be an alias.
- Skills: require `name:` and `description:` in frontmatter.

**Check 3: Heading alignment.**
Maps each `openspec-templates/*.template.md` to the agent that writes it, then checks the canonical section headings declared in the template appear in the agent's body. Template → agent mapping:
- `questions.template.md` → `questioner` — 10 headings checked.
- `design.template.md` → `designer` — 4 headings: `## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`.
- `proposal.template.md` → `architect` — 4 headings: `## Why`, `## What Changes`, `## Capabilities`, `## Impact`.
- `tasks.template.md` → `planner` — 0 headings (dynamic format, skipped with SKIP note).
- `spec-delta.template.md` → `architect` — 3 headings: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`.

**Check 4: README command coverage.**
- Forward: every `claude/commands/<stem>.md` must be mentioned as `/qrspi:<stem>` in `README.md`.
- Reverse: every `/qrspi:<token>` in `README.md` must resolve to a `claude/commands/<token>.md`.
- Regex: `/\/qrspi:([a-z][a-z-]*)/g` — bare `/qrspi` (no colon) is not matched.

**Check 5: Gate-tool / executor agreement.**
Checks that no command with a non-builtin `agent:` frontmatter field reaches `AskUserQuestion` either directly (inline body text) or transitively (body contains backtick-wrapped `` `workflow` `` plus one of the choreography markers: `Stage choreography`, `commit step`, `next-stage handoff`). These tools are "main-loop-only" — unavailable inside a subagent. `BUILTIN_AGENTS = {'build', 'agent'}` are exempt.

**CI invocation (`ci.yml`):** three jobs on PR/push-to-main/workflow_dispatch:
1. `drift` job: runs `node sync-copilot.mjs --check` (copilot/ drift gate).
2. `lint` job: runs `node scripts/lint.mjs` (all 5 checks).
3. `validate` job: runs `npx --yes @fission-ai/openspec@1.4.1 validate --all`.

**Release invocation (`release.yml`):** tag-driven (pushes matching `v*`). Jobs: (1) tag matches `plugin.json` version assertion; (2) CHANGELOG.md has a section for the version; (3) re-runs `node sync-copilot.mjs --check`; (4) re-runs `node scripts/lint.mjs`; (5) publishes GitHub Release.

---

### Area 8 — README & docs surface

Source: `README.md`.

**Eight-stages table (lines 26–36):** markdown table with columns `#`, `Stage`, `Command`, `Artifact`, `Notes`. Lists all 8 stages plus a note on Q, R, D, S, V, P, I, PR. D stage note: "⛔ HUMAN APPROVAL REQUIRED before stage 4."

**Command list/table:**
- The eight-stages table is the primary command surface.
- A "Helpers" prose line (line 39–43) lists: `/qrspi` (print stage map), `/qrspi:init`, `/qrspi:stack`, `/qrspi:followup <id>`, `/qrspi:archive <id>`, `/qrspi:retro <id> <stage>`.
- **No `/qrspi:status` appears in the helpers line** (it is the same as the bare `/qrspi` reference — the `status.md` command is the stage-map printer). The lint Check 4 enforces that every `claude/commands/<stem>.md` appears as `/qrspi:<stem>` in the README.

**Two-tool mapping table (lines 186–193):**
```
| Claude Code (claude/…)          | GitHub Copilot (copilot/…)        | Installs to          |
| agents/<x>.md (subagents)       | agents/<x>.agent.md (custom agents) | ~/.copilot/agents/  |
| commands/<x>.md (/qrspi:*)      | prompts/<x>.prompt.md (slash prompts) | ~/.copilot/prompts/ |
| skills/<x>/SKILL.md (model-inv) | instructions/<x>.instructions.md  | ~/.copilot/instructions/ |
```

**Human gates described in README:**
- D stage note in the table: "The 'brain surgery' stage. ⛔ HUMAN APPROVAL REQUIRED before stage 4."
- "A human approval gate sits at the Design stage, so the expensive thinking is reviewed before any code is written." (line 7).
- Under "Two tools": "A Copilot prompt carries an `agent:` field so the whole prompt runs in that agent; the Claude command instead runs in the main loop and spawns its subagent (via the Agent tool) only for the bounded artifact write, keeping the human gates on the orchestrator."

**"Running inside an agent" explanation:** the README explains the structural difference — Claude runs in the main loop and spawns subagents for bounded writes; Copilot runs the whole prompt inside one agent. This is the key architectural distinction between the two tool implementations.

**Copilot fidelity gaps section (lines 219–228):** lists the 4 documented gaps: per-slice model selection, subagent orchestration, skill auto-loading, shell injection/file includes.

---

## Public API surface (command invocations)

- `/qrspi:questions <change-id> [description]` — writes `openspec/changes/<id>/questions.md`
- `/qrspi:research <change-id>` — writes `openspec/changes/<id>/research.md`
- `/qrspi:design <change-id>` — writes `openspec/changes/<id>/design.md`
- `/qrspi:structure <change-id>` — writes `openspec/changes/<id>/proposal.md` + `specs/`
- `/qrspi:slices <change-id>` — writes `openspec/changes/<id>/slices.md`
- `/qrspi:plan <change-id>` — writes `openspec/changes/<id>/tasks.md`
- `/qrspi:implement <change-id>` — writes code, ticks `tasks.md`, commits per slice
- `/qrspi:pr <change-id>` — writes `openspec/changes/<id>/pr.md`, optionally creates PR
- `/qrspi:init [ignored]` — bootstraps `openspec/` with the OpenSpec CLI
- `/qrspi:stack [hint]` — writes `.claude/skills/<repo>-stack/SKILL.md`
- `/qrspi:status [change-id]` — prints stage map and in-flight change status
- `/qrspi:retro <change-id> <stage>` — writes `openspec/changes/<id>/retrospective.md`
- `/qrspi:followup <change-id>` — resolves one post-PR follow-up, ticks `followups.md`
- `/qrspi:archive <change-id>` — moves folder to `openspec/changes/archive/YYYY-MM-DD-<id>/`

---

## Data model

**Per-change folder (`openspec/changes/<id>/`):**

| File | Stage that writes it | Notes |
|---|---|---|
| `questions.md` | Q (questioner) | Technical questions + product-question answers |
| `research.md` | R (researcher) | Ticket-blind factual map |
| `design.md` | D (designer) | ~200-line design decisions; gated by human approval |
| `proposal.md` | S (architect) | OpenSpec canonical proposal shape |
| `specs/<cap>/spec.md` | S (architect) | OpenSpec delta spec; validated by `openspec validate` |
| `slices.md` | V (architect) | 3–5 vertical slices with `**Model:**` annotations |
| `tasks.md` | P (planner) | Numbered checkbox groups; carries `**Model:**` verbatim |
| `pr.md` | PR (orchestrator) | PR link record (persists through archive) |
| `followups.md` | PR (orchestrator, conditional) | Post-PR fix queue; only if reviewer found open issues |
| `retrospective.md` | retro helper | Per-stage retrospective sections; accumulates |

**Backlog entry fields:**
- `<change-id>` (kebab-case, verb-first)
- Status: `idea` / `proposed (change folder created YYYY-MM-DD)` / `in-progress (…)` / `merged`
- `**Why:**` — one-line rationale
- `**Likely shape:**` — brief description
- `Next QRSPI command:` — added by S, updated by V/P/I/PR

---

## Implicit contracts and conventions

1. **AskUserQuestion is main-loop-only.** Every interactive gate — commit prompts, handoff prompts, approval gates, backlog-capture offers — runs on the orchestrator. The subagent cannot call it. Check 5 in lint enforces this mechanically for commands that declare a non-builtin `agent:` frontmatter field.

2. **Explicit git staging, never `git add -A`.** All commit steps across all stages use explicit `git add <path>` forms. Enforced by instruction text; no mechanical check in lint (it is a behavioral rule in the canonical choreography).

3. **`git push` always follows `git commit`.** Every commit step in the canonical choreography and every per-slice commit in Implement includes a `git push`. There is no "commit without pushing" path in the canonical wording (the human's "No" choice skips the commit entirely).

4. **Model aliases only, never pinned ids.** The `model:` frontmatter field in agent files must use `opus`/`sonnet`/`haiku`. Enforced by lint Check 2.

5. **Spec delta validation.** `openspec validate` enforces the `## ADDED/MODIFIED/REMOVED Requirements → ### Requirement → #### Scenario` grammar on spec files. Run in CI and in the architect agent after writing specs.

6. **`**Model:**` annotation is mandatory per slice.** Written by the architect at Slices (V), carried verbatim by the planner at Plan (P), consumed by `/qrspi:implement` to select the implementer model. Missing annotation causes `/qrspi:implement` to stop rather than default silently.

7. **One change at a time.** The workflow skill states this as a rule. No mechanical enforcement — behavioral.

8. **`copilot/` is generated, never hand-edited.** Enforced by the CI `drift` job and the `--check` mode's exit-1 behavior.

9. **`agent:` in command frontmatter routes to a builtin agent (`build`/`agent`), never to a QRSPI subagent.** Stage commands that orchestrate subagents do not declare an `agent:` in their frontmatter — they run on the main loop and spawn subagents via the Agent tool in the body. Only helper commands that run entirely inline (init, stack, archive) carry `agent: build`. Lint Check 5 catches violations.

10. **Commit message convention:** `docs(<id>): add <artifact> (QRSPI stage <letter>)` for stage artifacts; `feat(<id>): implement slice N — <title>` for implementation; `fix(<id>): <summary>` for follow-ups; `chore(qrspi): ...` for init/stack. Conventional Commits, ASCII-only.

11. **Next-stage handoff must re-enter the slash command, not spawn as subagent.** This is what preserves Research's ticket-hiding and all stages' gate logic. Spelled out in both the workflow skill and every stage command.

12. **The researcher must not read `questions.md`.** Enforced by instruction text only (the researcher has `Read` in its tools list and has file-system access). The backlog notes this as a recognized gap (`enforce-research-ticket-hiding` idea row).

---

## Open gaps

- [ ] The `agentFor` table in `sync-copilot.mjs` is a hardcoded parallel representation of the delegation relationship also described in command bodies. There is no automated cross-check between them; the backlog records this as `agentFor-frontmatter-crosscheck` (idea row, deferred from a prior change).
- [ ] `git push` always follows `git commit` in canonical wording, but there is no explicit "push is mandatory" statement separate from the commit step. Whether a "commit but not push" path is intentionally absent or simply unspecified is not documented.
- [ ] The `status.md` command is described in `status.md` as printing the stage map but the README refers to the same functionality as the bare `/qrspi` command. It is unclear whether `/qrspi:status` and the bare `/qrspi` are the same or different invocations — the README helpers line does not list `/qrspi:status`.
- [ ] The `context-hygiene` skill states the 40%/60% thresholds but no command or agent checks context window utilization mechanically. This is a behavioral guideline with no mechanical enforcement.
- [ ] The `followup.md` command uses the implementer in FIX MODE but does not select a per-fix model via annotation (it defaults to `sonnet` with an `opus` escalation rule in the command body, separate from the per-slice annotation mechanism).
