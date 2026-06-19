# Research — reconcile-plan-worktree-order

> Stage R of QRSPI. Generated 2026-06-19.
> Ticket is hidden from this stage by design.

## Areas investigated

- Stage command surface: every `claude/commands/*.md` — frontmatter, preconditions, commit lines, next-stage declarations.
- Stage agents: every `claude/agents/*.md` — tools, model, preconditions enforced, artifacts written.
- Workflow skills: `claude/skills/qrspi-workflow/SKILL.md`, `vertical-slice/SKILL.md`, `context-hygiene/SKILL.md` — how stage order, groupings, and the "vertical slice" decomposition are described.
- Artifact templates: `openspec-templates/*` — which artifacts have a template and which do not.
- Stage documentation surface: `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `openspec/backlog.md` — all stage-list, stage-order, and stage-count statements.
- Copilot mirror + sync: `sync-copilot.mjs`, `copilot/prompts/*`, `copilot/agents/*`, `scripts/lint.mjs` — mapping rules and command-surface assertions.
- Existing change folders: `openspec/changes/example-greeting/` and `openspec/changes/kit-quality-hardening/` — artifact footprint.

---

## File map

### Area 1 — Stage command surface

All 14 files under `claude/commands/`:

- `claude/commands/questions.md` — stage Q orchestrator. `description: QRSPI stage Q. Delegates to the questioner subagent...` `agent: questioner` `subtask: true`. Precondition: checks `openspec/` exists (not Glob-based; inline prose "If `openspec/` does not exist, tell the user to run `/qrspi:init`"). Lists in-flight changes via Glob patterns. Commit message: `docs(<id>): add questions.md (QRSPI stage Q)`. `git add openspec/changes/<id>/questions.md openspec/backlog.md`. Next-stage command: `/qrspi:research <id>`.

- `claude/commands/research.md` — stage R orchestrator. `description: QRSPI stage R. Delegates to the researcher subagent (read-only). The change ticket is hidden from this stage by design...` `agent: researcher` `subtask: true`. No explicit precondition check beyond "extract change id and areas of interest". Commit message: `docs(<id>): add research.md (QRSPI stage R)`. `git add openspec/changes/<id>/research.md`. Next-stage command: `/qrspi:design <id>`.

- `claude/commands/design.md` — stage D orchestrator. `description: QRSPI stage D. Delegates to the designer subagent to produce design.md (~200 lines). HUMAN REVIEW IS REQUIRED before stage S.` `agent: designer` `subtask: true`. Precondition: verifies `openspec/changes/<id>/questions.md` and `research.md` exist (inline prose, not Glob). Commit message: `docs(<id>): add design.md (QRSPI stage D)`. `git add openspec/changes/<id>/design.md`. No declared `Next-stage command:` line (next stage is triggered via the final confirmation AskUserQuestion, pointing at `/qrspi:structure <id>`).

- `claude/commands/structure.md` — stage S orchestrator. `description: QRSPI stage S. Delegates to the architect subagent to write proposal.md and specs/. Requires that the human has approved design.md.` `agent: architect` `subtask: true`. Precondition: Glob `openspec/changes/<id>/design.md` plus approval gate via AskUserQuestion. Commit message: `docs(<id>): add proposal.md and specs (QRSPI stage S)`. `git add openspec/changes/<id>/proposal.md openspec/changes/<id>/specs/ openspec/backlog.md`. Next-stage command: `/qrspi:worktree <id>`.

- `claude/commands/worktree.md` — stage W orchestrator. `description: QRSPI stage W. Delegates to the architect subagent to write worktree.md (vertical slices, not horizontal layers).` `agent: architect` `subtask: true`. Precondition: Glob `openspec/changes/<id>/proposal.md` AND at least one `openspec/changes/<id>/specs/*/spec.md`; on failure point at `/qrspi:structure`. Commit message: `docs(<id>): add worktree.md (QRSPI stage W)`. `git add openspec/changes/<id>/worktree.md openspec/backlog.md`. Next-stage command: `/qrspi:plan <id>`.

- `claude/commands/plan.md` — stage P orchestrator. `description: QRSPI stage P. Delegates to the planner subagent (read-only on code) to turn worktree.md into a checkbox tasks.md.` `agent: planner` `subtask: true`. Precondition: input artifact is `openspec/changes/<id>/worktree.md`; on failure point at `/qrspi:worktree`. Commit message: `docs(<id>): add tasks.md (QRSPI stage P)`. `git add openspec/changes/<id>/tasks.md openspec/backlog.md`. Next-stage command: `/qrspi:implement <id>`.

- `claude/commands/implement.md` — stage I orchestrator. `description: QRSPI stage I. Delegates to the implementer subagent to write code one vertical slice at a time, ticking tasks.md as it goes. Stops at each slice checkpoint for human verification.` `agent: implementer` `subtask: true`. Precondition: `openspec/changes/<id>/tasks.md`; on failure point at `/qrspi:plan`. Per-slice commit message: `feat(<id>): implement slice N — <slice title>`. `git add openspec/changes/<id>/tasks.md openspec/backlog.md <files-modified-in-this-slice>`. No single declared `Next-stage command:` variable line; the implementer agent's final message ends with `Next stage: /qrspi:pr <id>`.

- `claude/commands/pr.md` — stage PR orchestrator. `description: QRSPI stage PR. Delegates to the reviewer subagent (read-only) to draft the pull request description...` `agent: reviewer` `subtask: true`. Precondition: Glob `openspec/changes/$ARGUMENTS/tasks.md` + Bash `git status --short` (clean tree). Commit message: `docs(<id>): record PR #<N> link`. `git add openspec/changes/<id>/pr.md openspec/backlog.md openspec/changes/<id>/followups.md`. No next-stage command declared (post-PR is archive, not a numbered stage).

- `claude/commands/archive.md` — post-merge cleanup. `agent: build` (no `subtask:`). No stage number. Delegates to `openspec-archive-change` skill.

- `claude/commands/followup.md` — post-PR fix loop. `agent: implementer` `subtask: true`. Not a numbered stage. Precondition: Glob `openspec/changes/<id>/` and `openspec/changes/<id>/pr.md`.

- `claude/commands/init.md` — per-repo bootstrap. `agent: build`. No stage number.

- `claude/commands/retro.md` — retrospective. No `agent:` or `subtask:` in frontmatter. No stage number.

- `claude/commands/stack.md` — stack cheatsheet bootstrap. `agent: build`. No stage number.

- `claude/commands/status.md` — stage map printer. No `agent:` or `subtask:`. No stage number.

**Next-stage handoff chain (as declared by `Next-stage command:` lines):**

```
Q  →  R  (questions.md line 78)
R  →  D  (research.md line 45)
D  →  S  (design.md: via AskUserQuestion final confirmation, line 106–111)
S  →  W  (structure.md line 58)
W  →  P  (worktree.md line 34)
P  →  I  (plan.md line 33)
I  →  PR (implementer agent final message line 163; implement.md line 54)
```

The `status.md` command's artifact-to-stage inference table (lines 29–38) encodes the same S→W→P→I chain using artifact presence:

```
proposal.md + specs/  →  W (/qrspi:worktree)
worktree.md           →  P (/qrspi:plan)
tasks.md              →  I (/qrspi:implement)
```

### Area 2 — Stage agents

All 7 files under `claude/agents/`:

- `claude/agents/questioner.md` — `name: questioner` `model: sonnet` `tools: Read, Write, Edit, Bash, Glob, Grep, Skill`. Writes `openspec/changes/<id>/questions.md`. Carries inline question-section skeleton. Uses `AskUserQuestion` by reference in its body text (line 83, 95) but `AskUserQuestion` is NOT in `tools:`. Precondition enforced inline: confirms `openspec/changes/<id>/` exists and creates if missing.

- `claude/agents/researcher.md` — `name: researcher` `model: sonnet` `tools: Read, Write, Bash, Glob, Grep, Skill`. Writes `openspec/changes/<id>/research.md`. No `AskUserQuestion` or `Agent` tool. Ticket is explicitly hidden. Precondition: does not open questions.md.

- `claude/agents/designer.md` — `name: designer` `model: opus` `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`. Writes `openspec/changes/<id>/design.md`. Carries inline design skeleton. References `AskUserQuestion` in body (line 83) but NOT in `tools:`.

- `claude/agents/architect.md` — `name: architect` `model: sonnet` `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`. Dual-stage agent: writes `proposal.md` + `specs/` (stage S) OR `worktree.md` (stage W), controlled by stage routing in body (line 29–31). Carries inline skeletons for proposal, spec-delta (new and delta forms), and worktree. `AskUserQuestion` not in tools. Uses `Agent` tool (available but no specific use noted in body text for S or W stages).

- `claude/agents/planner.md` — `name: planner` `model: sonnet` `tools: Read, Write, Bash, Glob, Grep, Skill`. Writes `openspec/changes/<id>/tasks.md`. Reads `design.md` and `worktree.md`. No `AskUserQuestion` or `Agent` tool. Precondition: `worktree.md` must exist (enforced by command, repeated in body via "Inputs" section).

- `claude/agents/implementer.md` — `name: implementer` `model: opus` `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`. Writes code and ticks `tasks.md`. Has FIX MODE (post-PR) via skill `qrspi-postpr-fix`. `AskUserQuestion` referenced in body but not in `tools:`. Has per-slice model override mechanism; /qrspi:implement reads slice annotation and re-invokes with correct model.

- `claude/agents/reviewer.md` — `name: reviewer` `model: sonnet` `tools: Read, Bash, Glob, Grep, Skill`. Read-only. Does NOT have `Write`, `Edit`, or `Agent` tools. Writes nothing — drafts PR description only, returned in final message.

**Agents writing `worktree.md`:** `architect` (stage W).
**Agents writing `tasks.md`:** `planner` (stage P).
**Agents with `AskUserQuestion` tool:** None. The tool is referenced in body text for questioner, designer, and implementer but is absent from all agents' `tools:` fields. The command files are where `AskUserQuestion` is invoked (via the canonical choreography).
**Agents with `Agent` tool:** `designer`, `architect`, `implementer`.

### Area 3 — Workflow skills

- `claude/skills/qrspi-workflow/SKILL.md` — `name: qrspi-workflow`. `description: The eight-stage QRSPI workflow (Questions, Research, Design, Structure, Plan, Worktree, Implement, PR)...` (line 3).

  Stage list and grouping (lines 70–109):
  - `### Alignment phases (5)` (line 72): **Q, R, D, S, P** — in that order.
  - `### Execution phases (3)` (line 97): **W, I, PR** — in that order.

  This places P (Plan) in the alignment group and W (Worktree) in the execution group, with W first among the execution phases.

  Line 21 (inline prose, not a list): "QRSPI front-loads alignment (Q + R + D) before any code planning happens." — only names 3 of the 5 alignment stages.

- `claude/skills/vertical-slice/SKILL.md` — `name: vertical-slice`. No stage ordering stated. Describes the M/F/D/T slice pattern. Specifies per-slice model selection heuristic (`sonnet` vs `opus`). Referenced by architect (S and W), planner (P), and implementer (I).

- `claude/skills/context-hygiene/SKILL.md` — `name: context-hygiene`. Contains at line 71: "This is why QRSPI splits alignment **(Q, R, D, S, P)** into five stages instead of compressing them into one 'plan' step." Labels alignment as Q, R, D, S, P — P is the last alignment stage. W is not mentioned in alignment grouping here.

**Canonical stage-order lines (verbatim):**

| Source | Location | Text |
|--------|----------|------|
| `claude/skills/qrspi-workflow/SKILL.md` line 3 | frontmatter `description:` | `"Questions, Research, Design, Structure, Plan, Worktree, Implement, PR"` |
| `claude/skills/qrspi-workflow/SKILL.md` lines 72–109 | `## The eight stages` body | Alignment (5): Q, R, D, S, P — then Execution (3): W, I, PR |
| `claude/skills/context-hygiene/SKILL.md` line 71 | inline prose | `"QRSPI splits alignment (Q, R, D, S, P) into five stages"` |
| `claude/commands/structure.md` line 58 | Next-stage command | `/qrspi:worktree <id>` |
| `claude/commands/worktree.md` line 34 | Next-stage command | `/qrspi:plan <id>` |

### Area 4 — Artifact templates

`openspec-templates/` contains exactly 5 files:

| Template file | Artifact it governs | Agent that writes the artifact |
|--------------|---------------------|-------------------------------|
| `questions.template.md` | `questions.md` | `questioner` |
| `design.template.md` | `design.md` | `designer` |
| `proposal.template.md` | `proposal.md` | `architect` |
| `tasks.template.md` | `tasks.md` | `planner` |
| `spec-delta.template.md` | `specs/<cap>/spec.md` | `architect` |

**No `worktree.template.md` exists.** The `openspec-workflow` skill explicitly notes this at its artifact table row for worktree (line 82): `"worktree.md" | QRSPI-only (\`## Slice N — …\`); maps onto \`tasks.md\` numbered groups | —` (the template column is a dash). The inline worktree skeleton lives only inside `claude/agents/architect.md` (lines 207–228).

The `tasks.template.md` has a template file; `worktree.md` does not. The `questions.template.md` is the one template that does carry a per-repo copy hint in its body (line 22–23: "Update this template when those conventions evolve; do not let individual `questions.md` files drift from it") but the QRSPI kit's `init` command no longer seeds per-repo copies (init.md line 93–97).

### Area 5 — Stage documentation surface

**README.md (`/workspaces/git/qrspi/README.md`)**

Stage table (lines 26–35): numbered 1–8, columns `#, Stage, Command, Artifact, Notes`:

```
| 1 | Questions  | /qrspi:questions | questions.md         |
| 2 | Research   | /qrspi:research  | research.md          |
| 3 | Design     | /qrspi:design    | design.md            | HUMAN APPROVAL REQUIRED before stage 4 |
| 4 | Structure  | /qrspi:structure | proposal.md + specs/ |
| 5 | Worktree   | /qrspi:worktree  | worktree.md          | Vertical slices, not horizontal layers. |
| 6 | Plan       | /qrspi:plan      | tasks.md             | Canonical numbered task list. |
| 7 | Implement  | /qrspi:implement | code + tests         |
| 8 | PR         | /qrspi:pr        | PR description       |
```

Order in this table: Q(1), R(2), D(3), S(4), **W(5), P(6)**, I(7), PR(8).

Helpers line (lines 37–40): `/qrspi` (print stage map), `/qrspi:init`, `/qrspi:stack`, `/qrspi:followup`, `/qrspi:archive`, `/qrspi:retro`.

Line 6: "QRSPI breaks a feature from vague request to merged PR into **eight** reviewable stages".

Consuming-in-another-repo command block (lines 247–258): lists stages in order `questions, research, design, structure, worktree, plan, implement, pr, archive` — i.e. W before P.

**CLAUDE.md (`/workspaces/git/qrspi/CLAUDE.md`)**

Line 60: "the eight stages + command list, repo layout, requirements..." — mentions "eight stages" but does not enumerate them. Does not state stage order itself.

**CONTRIBUTING.md (`/workspaces/git/qrspi/CONTRIBUTING.md`)**

Does not enumerate the stage list or stage count. Refers to "eight QRSPI stage commands" (line 107) by listing the 8 command files: `questions.md`, `research.md`, `design.md`, `structure.md`, `plan.md`, `worktree.md`, `implement.md`, `pr.md`. Order in that line: S, P, W listed as `plan.md`, `worktree.md` — i.e. plan before worktree in the file list. The prose at line 107 names them as: "questions…pr.md", implying alphabetical listing.

**`openspec/backlog.md` header (lines 1–4):**

```
# Backlog

Candidate changes for this repo, tracked before they enter the QRSPI flow
(Q → R → D → S → P → W → I → PR).
```

Line 4 states order: Q → R → D → S → **P → W** → I → PR. This differs from the README table (which has W=5, P=6) and from the command next-stage chain (which implements S→W→P→I).

**qrspi-workflow/SKILL.md (`description:` field, line 3):**

`"Questions, Research, Design, Structure, Plan, Worktree, Implement, PR"`

Order: Q, R, D, S, **P, W**, I, PR — P before W.

**openspec-workflow/SKILL.md (stage-to-artifact table, lines 61–68):**

```
| Q — Questions | ...
| R — Research  | ...
| D — Design    | ...
| S — Structure | ...
| P — Plan      | changes/<id>/tasks.md    | planner
| W — Worktree  | changes/<id>/worktree.md | architect
| I — Implement | ...
| PR — Review   | ...
```

Order: Q, R, D, S, **P, W**, I, PR — P before W.

**Disagreements across documents (stage ordering W vs P):**

| Document | Location | Stated order |
|----------|----------|--------------|
| `README.md` stage table | lines 32–33 | **W(5), P(6)** |
| `README.md` consuming-in-another-repo block | lines 251–256 | **W before P** |
| `openspec/backlog.md` header | line 4 | **P → W** |
| `claude/skills/qrspi-workflow/SKILL.md` frontmatter `description:` | line 3 | **P, W** (P before W) |
| `claude/skills/qrspi-workflow/SKILL.md` `## The eight stages` body | lines 72–109 | **P in Alignment(5), W in Execution(3)** — so P before W conceptually |
| `claude/skills/openspec-workflow/SKILL.md` stage table | lines 61–68 | **P before W** |
| `claude/skills/context-hygiene/SKILL.md` line 71 | prose | alignment is `(Q, R, D, S, P)` — P is last alignment; W is first execution |
| Command next-stage chain | structure→worktree→plan | **W before P** |
| `status.md` artifact inference table | lines 34–35 | `proposal+specs → W`, `worktree.md → P` — **W before P** |

Summary: the actual execution chain (as declared in command `Next-stage command:` lines and status.md's inference table) runs **S → W → P → I**. The `qrspi-workflow` skill description field, the `openspec-workflow` skill table, the `backlog.md` header, and `context-hygiene` prose all state or imply **P before W**. The README stage table and the consuming-in-another-repo command sequence agree with the actual chain (W before P).

### Area 6 — Copilot mirror + sync

**`sync-copilot.mjs`** — deterministic claude/ → copilot/ generator (Node.js ESM, no npm deps).

Mapping rules:

| Source | Output | Transform |
|--------|--------|-----------|
| `claude/agents/<x>.md` | `copilot/agents/copilot-<x>.agent.md` | frontmatter: `description:`, `tools: [<mapped>]`; body: `rewriteAll()` |
| `claude/commands/<x>.md` | `copilot/prompts/qrspi-<x>.prompt.md` | frontmatter: `description:`, `argument-hint:`, `agent: copilot-<role> | agent`; body: `rewriteAll()` |
| `claude/skills/<x>/SKILL.md` | `copilot/instructions/<x>.instructions.md` | frontmatter: `description:`; body: `rewriteAll()` |

The `agentFor` table (lines 34–40) maps prompt stems to agent names: `qrspi-worktree → architect`, `qrspi-plan → planner`, `qrspi-structure → architect`. The output agent field is prefixed `copilot-` automatically.

`qrspi-sync-copilot` command in `claude/commands/` is excluded from generation (line 286: `if (base === 'qrspi-sync-copilot') continue`). Similarly `qrspi-sync-copilot` skill dir is excluded (line 296).

**Tool mapping** (`mapTools`, lines 99–105): maps `Write|Edit` → `edit/editFiles`; `Bash|PowerShell` → `execute/runInTerminal` + `execute/getTerminalOutput`; always includes `search/codebase`, `search`, `vscode/askQuestions`.

**Body rewrites** (`rewriteAll`, lines 109–161): $ARGUMENTS → ${input}; .claude/ paths → .github/; skill load refs → instruction references; AskUserQuestion → `vscode/askQuestions`; `/qrspi:<cmd>` → `/qrspi-<cmd>`; "invoke the X subagent" → "continue as the X".

**Per-file fixups** (`applyFixups`, lines 170–208): two specific files get literal-string overrides — `prompts/qrspi-implement.prompt.md` (model annotation degraded to advisory note) and `prompts/qrspi-init.prompt.md` (Copilot-specific cleanup instructions).

**`scripts/lint.mjs`** — 4 checks:

- Check 1 (Pin agreement): all `@fission-ai/openspec@<version>` and `openspec_version: <version>` occurrences must agree. Excludes `openspec/changes/` subtree. Does NOT assert a fixed version, only agreement.
- Check 2 (Frontmatter/name): agents require `name:` and `description:`; commands require `description:` and `agent:` must resolve to a real `claude/agents/<x>.md` (or be `build`/`agent`); skills require `name:` and `description:`; `model:` must use aliases not pinned ids; `Load skill X` references must resolve to `claude/skills/<X>/`.
- Check 3 (Heading alignment): canonical section headings from each `openspec-templates/*.template.md` must appear in the corresponding agent's body. `tasks.template.md` is skipped (`headings: []`). `spec-delta.template.md` and `proposal.template.md` both map to `architect`.
- Check 4 (README command coverage): every `claude/commands/<stem>.md` must appear as `/qrspi:<stem>` in `README.md` (forward check); every `/qrspi:<token>` in README must resolve to an existing command file (reverse check). Uses regex `/\/qrspi:([a-z][a-z-]*)/g`.

**Copilot outputs surveyed:**

- `copilot/prompts/`: 14 `.prompt.md` files (one per command, excluding `qrspi-sync-copilot`; naming is `qrspi-<stem>.prompt.md`).
- `copilot/agents/`: 7 `.agent.md` files (`copilot-<role>.agent.md`).
- `copilot/instructions/`: generated from `claude/skills/` (7 skills excluding `qrspi-sync-copilot`).

Confirmed: `copilot/prompts/qrspi-worktree.prompt.md` has `agent: copilot-architect`; `copilot/prompts/qrspi-plan.prompt.md` has `agent: copilot-planner`; `copilot/prompts/qrspi-structure.prompt.md` has `agent: copilot-architect`.

### Area 7 — Existing change folders

**`openspec/changes/example-greeting/`** — 7 artifacts:

```
design.md
proposal.md
questions.md
research.md
specs/greeting/spec.md
tasks.md
worktree.md
```

Contains both `worktree.md` and `tasks.md`. No `pr.md`, no `followups.md`.

**`openspec/changes/kit-quality-hardening/`** — 12 artifacts:

```
design.md
pr.md
proposal.md
questions.md
research.md
specs/ci-quality-gates/spec.md
specs/copilot-sync/spec.md
specs/kit-governance/spec.md
specs/qrspi-command-surface/spec.md
specs/reference-example/spec.md
tasks.md
worktree.md
```

Contains both `worktree.md` and `tasks.md`, plus `pr.md`. No `followups.md`.

---

## Public API surface

Commands shipped (14 total, as `claude/commands/<stem>.md`):

| Command | Stage # | `agent:` | `subtask:` |
|---------|---------|----------|------------|
| `/qrspi:questions` | Q (1) | `questioner` | `true` |
| `/qrspi:research`  | R (2) | `researcher` | `true` |
| `/qrspi:design`    | D (3) | `designer`   | `true` |
| `/qrspi:structure` | S (4) | `architect`  | `true` |
| `/qrspi:worktree`  | W (5 per README) | `architect` | `true` |
| `/qrspi:plan`      | P (6 per README) | `planner`   | `true` |
| `/qrspi:implement` | I (7) | `implementer` | `true` |
| `/qrspi:pr`        | PR (8) | `reviewer`  | `true` |
| `/qrspi:archive`   | post-PR | `build`  | — |
| `/qrspi:followup`  | post-PR | `implementer` | `true` |
| `/qrspi:init`      | onboarding | `build` | — |
| `/qrspi:retro`     | optional | — | — |
| `/qrspi:stack`     | onboarding | `build` | — |
| `/qrspi:status`    | helper | — | — |

---

## Data model

Artifact files per change folder (as produced by the current 8-stage flow):

| Artifact | Stage | Written by agent | Template exists |
|----------|-------|-----------------|----------------|
| `questions.md` | Q | questioner | yes |
| `research.md` | R | researcher | no |
| `design.md` | D | designer | yes |
| `proposal.md` | S | architect | yes |
| `specs/<cap>/spec.md` | S | architect | yes (spec-delta) |
| `worktree.md` | W | architect | no |
| `tasks.md` | P | planner | yes |
| `pr.md` | PR | command (not agent) | no |
| `followups.md` | post-PR | command | no |
| `retrospective.md` | optional | retro command | no |

---

## Implicit contracts and conventions

1. **Dual-agent for S and W.** Both `structure.md` and `worktree.md` commands set `agent: architect`. The architect agent body has explicit `## Stage routing` (line 29–31): "When invoked via `/qrspi:structure`, stop after writing `proposal.md` and `specs/`... When invoked via `/qrspi:worktree`, write only `worktree.md`."

2. **`planner` reads `worktree.md` as its primary input.** The plan command (line 14) and planner agent body (Inputs section, line 22) both list `worktree.md` as the precondition artifact. The planner carries the `**Model:**` annotation from `worktree.md` slices verbatim into `tasks.md`.

3. **`worktree.md` carries per-slice `**Model:** sonnet|opus` annotations.** These annotations flow through W → tasks.md (P stage) → `/qrspi:implement` (which reads the annotation to pick the implementer's model). The implement command (line 27–32) states: if a slice is missing the annotation, stop and tell the user the worktree/tasks file needs to be fixed.

4. **Glob-based precondition check is the canonical pattern.** `qrspi-workflow` SKILL.md "Stage choreography" section mandates Glob for precondition checks; the PR command is the only stage that supplements Glob with Bash (`git status --short`).

5. **Backlog atomicity.** Every stage commit that changes the change status or next-command pointer in `openspec/backlog.md` must land in the same commit as the stage's artifact.

6. **Never `git add -A`.** All commit step lines in stage commands use explicit path lists.

7. **No `AskUserQuestion` in agent tools lists.** The tool appears in agent body text as a reference to be used by the orchestrating command, not the subagent. The canonical choreography (AskUserQuestion for commit/handoff) runs in the command context, not the agent context.

8. **Lint Check 4 bi-directional README enforcement.** Every shipped command stem must appear as `/qrspi:<stem>` in README, and every `/qrspi:<token>` in README must resolve to an existing command file. This makes README and command surface mutually coupled.

9. **`worktree.md` has no OpenSpec template file.** The shape is inline-only in `architect.md`. `tasks.md` does have `openspec-templates/tasks.template.md`. Lint Check 3 (heading alignment) only checks templates that have `headings: [...]` entries; `tasks.template.md` has `headings: []` (skipped) and there is no `worktree.template.md` entry in the lint's `TEMPLATE_CANONICAL_HEADINGS` map.

10. **Design command's next-stage declaration.** Unlike Q, R, S, W, P which each have an explicit `Next-stage command:` variable block in the choreography section, the design command does not have one. Its next-stage trigger is the AskUserQuestion final confirmation (lines 106–111): if the human chooses "Yes — proceed to /qrspi:structure", the command itself invokes structure. This means the design command's "next stage" is not independently discoverable from the choreography variable block — it is embedded in the interactive step logic.

---

## Open gaps

- [ ] The `research.md` artifact does not have a template in `openspec-templates/` (no `research.template.md`). Whether this is intentional (the researcher carries the inline skeleton) or a gap is not stated in the kit documentation.
- [ ] The `retro.md` command (`claude/commands/retro.md`) has no `agent:` or `subtask:` frontmatter field — it is unclear whether it runs as a bare command or is expected to use a subagent. The body references `qrspi-retrospective` skill but no named agent.
- [ ] The `AskUserQuestion` tool is referenced in agent body text for questioner and designer but is absent from those agents' `tools:` lists. Whether this is intentional (the tool runs in the command context, not the subagent context) or an oversight is not explicitly documented in any single place — the closest explanation is in `context-hygiene` (subagents as context firewalls) and the canonical choreography in `qrspi-workflow`.
- [ ] The `context-hygiene` skill (line 71) labels alignment as `(Q, R, D, S, P)` and execution implicitly as `(W, I, PR)`, but neither this skill nor `qrspi-workflow` explicitly states what W is between P and I in the execution sequence — the rationale for P being "alignment" and W being "execution" is not spelled out in the documentation.
