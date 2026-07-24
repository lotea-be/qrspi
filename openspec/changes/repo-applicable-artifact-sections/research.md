# Research — repo-applicable-artifact-sections

> Stage R of QRSPI. Generated 2026-07-24.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Artifact-producing stage-agent prompts**: Section/heading skeletons, checklist/area menus, and prose-vs-skeleton sourcing in `claude/agents/questioner.md`, `designer.md`, `architect.md`, `planner.md`, `reviewer.md`.
- **OpenSpec artifact templates**: Canonical headings, fixed section menus, and "not applicable" handling in `openspec-templates/*.template.md`.
- **Guidance skills**: Concrete vocabulary, slice examples, and researcher description in `claude/skills/vertical-slice/SKILL.md` and `claude/skills/workflow/SKILL.md`.
- **Stack-cheatsheet mechanism**: `/qrspi:stack` command/skill, generated SKILL.md structure/fields, and whether a stack cheatsheet skill exists for this repo.
- **Where the stack cheatsheet is loaded today**: Every load reference across the five agent files and the stage command files under `claude/commands/`.
- **Lint script**: `scripts/lint.mjs` — existing checks, what each asserts, how they are numbered/named, whether any check inspects agent file or template section/heading content.
- **Test / CI surface**: CI workflows, lint invocation, exit-code checking, dogfood/test harness conventions.

---

## File map

### Artifact-producing stage-agent prompts

- `/workspaces/git/qrspi/claude/agents/questioner.md` — Q-stage subagent; generates `questions.md`. Model: sonnet.
- `/workspaces/git/qrspi/claude/agents/designer.md` — D-stage subagent; generates `design.md`. Model: opus.
- `/workspaces/git/qrspi/claude/agents/architect.md` — S and V stages; generates `proposal.md`, `specs/`, and `slices.md`. Model: sonnet.
- `/workspaces/git/qrspi/claude/agents/planner.md` — P-stage subagent; generates `tasks.md`. Model: sonnet.
- `/workspaces/git/qrspi/claude/agents/reviewer.md` — PR-stage subagent; drafts PR description, runs final checklist. Model: sonnet.

**questioner.md** — output skeleton (inline, in "What to write" section):

```markdown
## Data model
## Indexing & query performance
## API
## UI
## Front-end state
## Auth & authorization
## Migrations & data
## Testing
## Sequencing & scope
## Open product questions (for the human)
- [ ] **PQ1 — <topic>:** <question>? Options: (a) ..., (b) ..., (c) ...
```

The questioner's step 6 carries a prose area-menu (the 10-item bullet list of areas: Data model, Indexing & query performance, API surface, UI, State, Migrations & seed data, Auth & authorization, Performance, Testing, Sequencing & scope, Open product questions) in its body. The inline skeleton is separated from this area-menu — the area-menu is prose instructing what to cover; the skeleton is the structural output shape. The agent is told: "Use this skeleton as a starting point but split, rename, or add sections when the change's shape demands it." Step 6 explicitly notes that for non-CRUD changes, Data model / Indexing / API / Migrations / State sections are "usually *Not applicable* — keep the heading and say so explicitly so stage S doesn't re-litigate." No "not applicable" guidance is present in the inline skeleton itself; that guidance lives only in the prose steps.

**designer.md** — output skeleton (inline, in "Design content (~200 lines)" section):

```markdown
## Context
## Goals / Non-Goals
## Decisions
  D1 — <decision name> (Q.., PQ..)
  D2 — ...
## Data model changes
## API surface
## UI surface
## Authorization
## Vertical slices (preview)
## Risks / Trade-offs
## Open questions for the human
- [ ] ...
```

The designer's skeleton carries both "required" and "optional" sections. The four canonical OpenSpec headers (`## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`) are declared required: "The four canonical headers are required; the detail sections are flexible." The detail sections (`## Data model changes`, `## API surface`, `## UI surface`, `## Authorization`, `## Vertical slices (preview)`) are presented inline in the skeleton but labelled "allowed extras" in the template file. The skeleton does not carry any explicit "not applicable" handling; the design agent may fold those sections into numbered decisions or omit them when they are irrelevant. There is no prose instruction to write "*Not applicable.*" for unused detail sections — the designer is told to fold content into decisions or use the dedicated sections "whichever reads tighter."

**architect.md** — two embedded output skeletons for the two stages it handles:

*S-mode — proposal.md skeleton:*

```markdown
## Why
## What Changes
## Capabilities
  ### New Capabilities
  - `<name>`: <brief description> — creates `specs/<name>/spec.md`.
  ### Modified Capabilities
  - `<existing-name>`: <what requirement changes> — needs a delta spec.
## Impact
  - Migrations: <yes/no, summary>
  - Breaking changes: <yes/no, summary>
  - Phases: <phase 1/2/3>, <epic numbers>
  - Affected code / APIs / dependencies: <list>
```

Rule: "Keep both `### New Capabilities` and `### Modified Capabilities` headings even when one list is empty (write `- _none_`)."

*S-mode — spec-delta skeletons (two variants, new vs. delta):*

New capability: `## ADDED Requirements` only.
Delta: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements` (only sections needed).

*V-mode — slices.md skeleton:*

```markdown
## Overview
  3–8 lines orienting the reader...
  The `(D<n>)` tags embedded throughout this file are required...
## Slices
  ### Slice 1 — <name>
    One paragraph (the "Deliverable")...
    - M (Mock API): ...
    - F (Frontend): ...
    - D (DB): ...
    - T (Tests): ...
    - **Model:** sonnet|opus — <rationale>
    - Checkpoint: ...
  ### Slice 2 — ...
```

The architect skeleton does not contain any "not applicable" instruction. The proposal template does have QRSPI-extras sections (`## Out of scope`, `## Vertical slices (preview)`) that are optional — described as "may follow `## Impact`, never replace a canonical section."

**planner.md** — output skeleton (inline, in "What to do" section):

```markdown
## 1. <slice name>
**Model:** sonnet|opus — <rationale carried verbatim from slices.md>
- [ ] 1.1 Add the data-model entity and configuration (D1, D2)
- [ ] 1.2 Generate the data-store migration (D6)
- [ ] 1.3 Add service method or API endpoint hitting the real data store (D10)
- [ ] 1.4 Wire the page/component to call the service (D11)
- [ ] 1.5 Add the input validator for the request (D9)
- [ ] 1.6 Unit/integration test: covers happy path + 1 error case
- [ ] 1.7 e2e: <scenario>
- [ ] 1.8 Checkpoint: <how the human verifies the slice>
## 2. <slice name>
```

The planner has no prose area-menu — its input is `slices.md` and its job is mechanical translation. No "not applicable" handling is specified; the task ordering is driven entirely by the slices' M/F/D bullets. The "(human)" task prefix convention is defined in the template file but not in the agent body's inline skeleton — only the `tasks.template.md` defines it.

**reviewer.md** — the reviewer does not write a structured artifact from an inline skeleton in the same sense as the other agents; it produces a PR description from a fixed PR description template:

```markdown
## Summary
## QRSPI artifacts
## What changed
## Migrations
## Tests
## Out of scope
## Reviewer checklist
- [ ] Design.md still matches what was built
- [ ] No raw SQL in feature code
- [ ] No nullable suppression (`!`) without justification comment
- [ ] All new endpoints use authorization policies where appropriate
- [ ] Migration is reversible
```

The reviewer has a fixed `## Reviewer checklist` with five items. No "not applicable" handling is described for the PR template sections. The reviewer does carry a prose verification checklist (tasks ticked, CLAUDE.md rules held — CHANGELOG `[Unreleased]` entry, README updated) but these are not in the inline PR description template; they are in the agent's "What to do" steps.

**Prose area-menu vs. output skeleton — distinction per agent:**

| Agent | Prose area-menu (what to cover) | Output skeleton (what to emit) |
|---|---|---|
| questioner | 10-item bullet list in step 6; also the `## Open product questions` interactive pass | Inline skeleton in "What to write" |
| designer | Step instructions (data model / API / UI / auth / slices preview / risks) | Inline skeleton in "Design content (~200 lines)" |
| architect (S) | Bullet list of spec format rules | Two inline skeletons (proposal, spec-delta) |
| architect (V) | Prose rules (vertical/no-horizontal, slice count) | Inline slices.md skeleton |
| planner | None — `slices.md` drives everything | Inline tasks.md skeleton |
| reviewer | Steps 3–5 (git status, tasks, CLAUDE.md rules) | Inline PR description template |

---

### OpenSpec artifact templates

- `/workspaces/git/qrspi/openspec-templates/questions.template.md` — canonical template for `questions.md`.
- `/workspaces/git/qrspi/openspec-templates/design.template.md` — canonical template for `design.md`.
- `/workspaces/git/qrspi/openspec-templates/proposal.template.md` — canonical template for `proposal.md`.
- `/workspaces/git/qrspi/openspec-templates/tasks.template.md` — canonical template for `tasks.md`.
- `/workspaces/git/qrspi/openspec-templates/spec-delta.template.md` — canonical template for `specs/<capability>/spec.md`.

**questions.template.md:**

Canonical headings (10 sections):
`## Data model`, `## Indexing & query performance`, `## API`, `## UI`, `## Front-end state`, `## Auth & authorization`, `## Migrations & data`, `## Testing`, `## Sequencing & scope`, `## Open product questions (for the human)`.

"Not applicable" handling — exact quote from the template comment:
> "For sections that don't apply, keep the heading and write `*Not applicable.*` plus a one-line rationale — do NOT silently drop them, so stage S doesn't re-litigate whether they were considered. Only omit a heading that could not apply to any change."

The `## Open product questions` section carries a fixed entry shape:
```
- [ ] **PQ1 — <topic>:** <question>? Options:
  (a) <option> (Recommended) — <one-line rationale>,
  (b) <option> — <trade-off>,
  (c) <option> — <trade-off>.
```

The template comment also carries a "Worked example" pointer: "read the most recent archived `questions.md` under `openspec/changes/archive/<date>-<id>/questions.md` before drafting."

**design.template.md:**

Canonical headings (4 required by OpenSpec): `## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`.

Optional QRSPI detail sections (labelled "OPTIONAL QRSPI detail sections — keep the ones that sharpen the design"): `## Data model changes`, `## API surface`, `## UI surface`, `## Authorization`, `## Vertical slices (preview)`.

Format rules from the template:
> "The four canonical headers MUST be present and spelled exactly: `## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`."
> "`## Decisions` is mandatory and is the whole point of the stage — never omit it or 'agree with yourself'; name both options when there is a real trade-off."

No "not applicable" instruction exists for design.md sections in the template. Optional detail sections are simply marked "OPTIONAL."

**proposal.template.md:**

Canonical headings (4 required): `## Why`, `## What Changes`, `## Capabilities`, `## Impact`.
Under `## Capabilities`: `### New Capabilities` and `### Modified Capabilities` (both required even when empty — write `- _none_`).

Optional QRSPI extras (allowed after `## Impact`): `## Out of scope`, `## Vertical slices (preview)`.

Format rules — exact quote:
> "The four canonical headers MUST be exactly `## Why`, `## What Changes`, `## Capabilities`, `## Impact`, in that order. Note the capital `C` in `## What Changes`."

No "not applicable" instruction exists for proposal.md sections.

**tasks.template.md:**

No fixed canonical section headings — the `## N. <slice name>` format is dynamic per slice. Format rules:
- Group headings MUST be `## N. <slice name>` with a numeric `N`.
- Checkbox ids MUST be `N.M` matching their group number.
- `**Model:**` annotation must be carried verbatim from `slices.md`.
- `(D<n>)` tags must be carried forward from `slices.md` into task lines.
- `(human)` prefix for tasks the implementer cannot perform — exact quote: "Prefix a task the implementer **cannot perform itself** (an interactive or manual verification, a human-run dogfood, anything needing a UI or session the subagent can't reach) with a leading `(human)` tag after the id: `- [ ] 1.8 (human) Manually verify the AskUserQuestion gate fires`."
- An optional `## N. Quality gate` / `## N. Final verification` group at the end is allowed.

No "not applicable" instruction for tasks.md; it is always populated from slices.

**spec-delta.template.md:**

Operation headers: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`.
"Include only the sections you need" — no "not applicable" instruction; unused operation sections are simply omitted.

Explicit prohibition (exact quote): "Do NOT invent `## Requirements (delta)`, `## Purpose`, `## Out of scope`, or `## Open questions` sections in a spec file — that context belongs in `proposal.md` / `design.md`, not the spec."

---

### Guidance skills

- `/workspaces/git/qrspi/claude/skills/vertical-slice/SKILL.md` — "How to decompose a change into vertical slices (mock service → UI → real DB) rather than horizontal layers." Loaded during the Slices (V) stage.
- `/workspaces/git/qrspi/claude/skills/workflow/SKILL.md` — The eight-stage QRSPI workflow, canonical stage choreography, read matrix, hard-stop procedure, run-mode management.

**vertical-slice/SKILL.md — concrete vocabulary and examples:**

The skill defines the four-step slice structure (M/F/D/T):
1. Mock API: service method or API endpoint returning hard-coded data.
2. Frontend: page or component consuming the service.
3. Real DB: replace mock with real query; add entity/migration if needed.
4. Tests: unit test, component test, e2e test.

Worked example (quoted section heading: "## Example: 'ask a question'"):
```
Slice 1 — Read path: list of questions
  M: QuestionService.ListAsync() returns 3 hard-coded questions
  F: /questions page renders them with MudDataGrid
  D: EF Core entity `Question`, seed 3 rows, replace mock
  T: xUnit for ListAsync(), Playwright list page renders
Slice 2 — Write path: create a question
  M: QuestionService.CreateAsync(request) echoes input
  F: /questions/new form with MudTextField + textarea + Markdig preview
  D: insert into Questions table, return id
  T: xUnit CreateAsync() validation, Playwright happy path
Slice 3 — Read path: question detail
  M: QuestionService.GetByIdAsync(id) returns hard-coded detail
  F: /questions/{id} renders title, body (sanitized Markdig), author, votes
  D: EF Core query joining Question + User
  T: xUnit GetByIdAsync() not-found, Playwright happy path
```

The skill notes the .NET/Blazor framing of the example: "Illustrative only — shown in a .NET/Blazor stack (EF Core, MudBlazor, xUnit, Playwright). Substitute your own stack's equivalents from the project's stack-cheatsheet; the **shape** (M/F/D/T per slice) is what transfers."

Per-slice model selection heuristic is defined in this skill (`sonnet` vs. `opus`). Anti-patterns: "Let's just get the schema right first.", "Mock data is throwaway work.", "We'll write tests at the end."

Researcher's job as described in the skill: the researcher is not described in `vertical-slice/SKILL.md` — that skill covers Slices (V) only.

**workflow/SKILL.md — relevant descriptions of the researcher's job:**

> "**R — Research.** Gather objective facts about the current codebase. **The ticket is hidden from this stage.** The agent traces logic, lists endpoints, maps the data model, and produces a factual record — no recommendations, no opinions about the change. Artifact: `openspec/changes/<id>/research.md`."

The researcher row in the Read Matrix: "Reads (within-change): *none* — the whole `changes/<id>/` folder is banned. Cross-change: spec.md only."

The "full-pipeline trigger" sentence in `workflow/SKILL.md` is the backlog row convention: a change moves from `idea` → `proposed` → `in-progress` → (merged). The workflow skill also carries the "Capturing deferred work" rules and the run-mode establishment procedure. No explicit "full-pipeline trigger" term is used — the relevant concept is the backlog status lifecycle.

---

### Stack-cheatsheet mechanism

**Command file:**
- `/workspaces/git/qrspi/claude/commands/stack.md` — description: "Bootstrap (or refresh) this repo's stack-cheatsheet skill — the project-scope skill every QRSPI stage loads for tech-stack and convention context. Detects the stack from the repo's manifests, then interviews to fill gaps. Re-runnable." `agent: build` (runs on main loop, not a subagent). No corresponding skill file in `claude/skills/` — the skill it bootstraps is per-repo and lives in `.claude/skills/<repo>-stack/`.

**No `claude/skills/*-stack/` directory exists in this repo.** There is no kit-level stack cheatsheet skill under `claude/skills/`.

**Generated SKILL.md structure** (as specified in the command body, step 4):

Frontmatter:
```yaml
name: <repo>-stack
description: Stack cheatsheet for <repo> — languages, runtime versions, frameworks, key libraries, project layout, testing, and coding conventions. This is the QRSPI stack-cheatsheet skill for this repo; load it whenever you need the project's tech stack or conventions.
```

Sections defined in the template:
- `## Languages & runtime`
- `## Frameworks & key libraries`
- `## Project layout`
- `## Conventions`
- `## Testing`
- `## Build, lint & test commands`
- `## PR & git workflow`
- `## Dependency policy`
- `## Gotchas / house rules`

**Stack cheatsheet skill for THIS repo:**

Glob pattern `.claude/skills/*-stack/SKILL.md` returns: absent. Glob pattern `claude/skills/*-stack/` also returns: absent. No `qrspi-stack` or similarly named directory exists under either `.claude/skills/` or `claude/skills/`. The `.claude/skills/` directory contains two entries: `qrspi-dogfood/` and `qrspi-release/` — neither is a stack cheatsheet.

---

### Where the stack cheatsheet is loaded today

**In agent files** (exact load lines from each file):

| Agent | Load instruction | Load line (quoted) |
|---|---|---|
| `researcher.md` | Step 1 | `"Load skills `workflow`, `openspec-workflow`, plus the project's stack-cheatsheet skill if it defines one."` |
| `questioner.md` | Step 1 | `"Load skills `workflow` and `openspec-workflow` if you have not already."` — **no stack-cheatsheet reference** |
| `designer.md` | Step 1 | `"Load skills `workflow`, `openspec-workflow`, `context-hygiene`, plus the project's stack-cheatsheet skill if it defines one."` |
| `architect.md` (S) | Step 1 | `"Load skills `workflow`, `openspec-workflow`, `vertical-slice`, plus the project's stack-cheatsheet skill if it defines one."` |
| `planner.md` | Step 1 | `"Load skills `workflow`, `openspec-workflow`, `vertical-slice`."` — **no stack-cheatsheet reference** |
| `reviewer.md` | Step 1 | `"Load skills `workflow`, `openspec-workflow`, plus the project's stack-cheatsheet skill if it defines one."` |
| `implementer.md` | Step 1 | `"Load skill `vertical-slice` plus the project's stack-cheatsheet skill (if any)"` |

Agents that load the stack cheatsheet: **researcher**, **designer**, **architect** (S mode), **reviewer**, **implementer** (5 of 7).
Agents that omit the stack cheatsheet: **questioner** (reads `requirements.md` and `tech-stack.md` instead), **planner** (reads `slices.md` only, explicitly limited).

**In command files** (stage commands under `claude/commands/`):

Stage command files are orchestrator-level; they spawn subagents rather than loading the cheatsheet themselves. References found:

- `claude/commands/stack.md` — defines the mechanism that creates the skill.
- `claude/commands/status.md` — checks whether the stack cheatsheet exists and recommends `/qrspi:stack` if absent: "stack-cheatsheet skill. If not, recommend a one-time `/qrspi:stack`".
- `claude/commands/questions.md` — references the stack-cheatsheet for branch naming convention: "(see its stack-cheatsheet skill; default to `features/<id>` if none is present)".
- `claude/commands/init.md` — after OpenSpec init, checks for an existing stack cheatsheet and prompts via AskUserQuestion to run `/qrspi:stack`.
- `claude/commands/archive.md` — references "project-scope stack-cheatsheet skill (discoverable via Glob pattern...)" and "its stack-cheatsheet — e.g. `gh pr create` or `az repos pr create`".
- `claude/commands/followup.md` — loads `vertical-slice` and "the project's stack-cheatsheet skill (if any)".
- `claude/commands/pr.md` — references "stack-cheatsheet -- e.g. `gh pr create` or `az repos pr create`".
- `claude/commands/implement.md` — "Load skill `vertical-slice` plus the project's stack-cheatsheet skill (if any)".

Stage command files (`research.md`, `design.md`, `structure.md`, `slices.md`, `plan.md`) do not load the stack cheatsheet directly at the orchestrator level — they spawn subagents that handle it.

---

### Lint script

- `/workspaces/git/qrspi/scripts/lint.mjs` — CI quality gate; pure Node.js (no npm dependencies); run via `node scripts/lint.mjs`.

**10 checks, run in order, all errors collected before exit:**

| # | Name (from comment) | What it asserts |
|---|---|---|
| 1 | PIN AGREEMENT | Every hand-maintained OpenSpec version pin (`@fission-ai/openspec@X.Y.Z` and `openspec_version: X.Y.Z`) across the whole repo (excluding `openspec/changes/` subtree and `generatedBy:` lines in `openspec-*` skills) must agree on the same version string. Asserts agreement, NOT a fixed count. |
| 2 | FRONTMATTER / NAME | Every agent, command, and skill file must carry required YAML frontmatter fields (`name:`, `description:`). Agent `name:` must be present; command `description:` must be present; skill `name:` and `description:` must be present. `agent:` references in commands must resolve to `claude/agents/<name>.md`. `model:` fields must use aliases only (`opus`/`sonnet`/`haiku`), not pinned ids. `Load skill X` backtick references in agent bodies must resolve to a real `claude/skills/<X>/SKILL.md`. |
| 3 | HEADING ALIGNMENT | The canonical section headings from each `openspec-templates/*.template.md` must appear in the corresponding agent file's inline skeleton. Template-to-agent mapping: `questions.template.md` → `questioner` (10 headings checked); `design.template.md` → `designer` (4 canonical headings checked); `proposal.template.md` → `architect` (4 headings checked); `tasks.template.md` → `planner` (0 headings — dynamic format, skipped with `SKIP` log line); `spec-delta.template.md` → `architect` (3 operation headers checked). The check does substring-inclusion in the agent body (`agentBody.includes(heading)`). |
| 4 | README COMMAND COVERAGE | Bidirectional: every `claude/commands/<stem>.md` is documented in `README.md` as `/qrspi:<stem>`, and every `/qrspi:<token>` in `README.md` resolves to a real command file. |
| 5 | GATE-TOOL / EXECUTOR AGREEMENT | No command with a non-builtin `agent:` may reach `AskUserQuestion` directly (inline) or transitively (body mentions `` `workflow` `` skill AND at least one of `Stage choreography`, `commit step`, `next-stage handoff`). |
| 6 | MIGRATION MANIFEST PRESENCE + SCHEMA + MARKER FORMAT | (a) Every `## [X.Y.Z]` CHANGELOG section at or above the floor version (`0.6.0`) must have a `migrations/<version>.yaml`. The floor manifest itself must always exist. (b) Each `migrations/*.yaml` must have required keys (`version`, `summary`, `automated`, `manual`); `automated[].action` must be `edit-file` only; `automated[].path` must start with `openspec/`. (c) `openspec/.qrspi-version` (if present) must be bare SemVer (no `v` prefix). |
| 7 | READ-CONTRACT BANNER AGREEMENT | Each of the 7 stage agents (`researcher`, `questioner`, `designer`, `architect`, `planner`, `implementer`, `reviewer`) must carry a `> **Read contract** — Reads: ...` banner whose `Reads:` field exactly equals the agent's row in the hardcoded expected map. Architect encodes two-mode (S/V); reviewer uses "full changes/<id>/ folder (by design)". Checks are keyed by agent stem; never fires on command or update files. |
| 8 | PR RECONCILIATION PASSES STRUCTURE | `claude/commands/pr.md` must contain structural anchors: `## Tasks pass`, `## Follow-ups pass`, plus choice labels `Finish it now`, `Drop -- no longer needed`, `Pause --`, `Fix now`, `Defer --`, `Promote to backlog`. |
| 9 | VERSION-CHECK EMBED | The 9 stage command files (`status`, `questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`) must each contain the line: `Load skill \`qrspi-version-check\` and follow its instructions exactly.` Whitespace is collapsed before matching (wrapping is allowed). |
| 10 | TRIAGE PATH ANCHORS | `claude/commands/followup.md` must contain the three triage anchor strings: `P1 — implement directly`, `P2 — amend this change in place`, `P3 — defer`. |

**Exit code:** `process.exit(0)` on all-pass; `process.exit(1)` on any violation. Errors are collected in an array before exit — all violations reported together.

**Check 3 specifically inspects section/heading content of agent files against templates.** The 10 headings from `questions.template.md` are checked against `questioner.md`; the 4 canonical OpenSpec headings from `design.template.md` against `designer.md`; the 4 from `proposal.template.md` and the 3 from `spec-delta.template.md` against `architect.md`; `tasks.template.md` has 0 headings checked (dynamic format — produces `SKIP` output). The check does NOT parse the template's comment sections or optional-section labels — only the hardcoded `TEMPLATE_CANONICAL_HEADINGS` map entries are checked.

**Lint invocation:**

- CI: `node scripts/lint.mjs` (no npm wrapper, directly via Node.js 20 in GitHub Actions).
- Release: `node scripts/lint.mjs` is re-run in the release job before the GitHub Release is published.
- No `package.json` exists at the repo root — there is no `npm run lint` script wrapper.

---

### Test / CI surface

- `/workspaces/git/qrspi/.github/workflows/ci.yml` — triggers on PR to `main`, push to `main`, and `workflow_dispatch`. Two jobs:
  - `lint` — runs `node scripts/lint.mjs` on Node.js 20. Label: "Lint (pin agreement + frontmatter + heading alignment)" (label is outdated — the script runs all 10 checks, not just those 3).
  - `validate` — runs `npx --yes @fission-ai/openspec@1.4.1 validate --all` on Node.js 20 (note: pinned version `1.4.1` in CI command, while the kit's `openspec_version:` pin may differ — this is exactly what Check 1 guards against for hand-maintained files; the CI `run:` line itself is not scanned by Check 1 since it's in `.github/workflows/`).

- `/workspaces/git/qrspi/.github/workflows/release.yml` — triggers on push of `v*` tags. Steps: derive version from tag, assert tag matches `plugin.json` version (reads `.claude-plugin/plugin.json` — note the path reference to `.claude-plugin/` but the root `plugin.json` is actually at `scripts/plugin.json` and the root), extract CHANGELOG notes for the version, re-check lint (`node scripts/lint.mjs`), publish GitHub Release via `gh release create`.

- `/workspaces/git/qrspi/.claude/skills/qrspi-dogfood/SKILL.md` — developer-only testing harness for the QRSPI kit itself. Lives under `.claude/` (not `claude/`) — not shipped in the plugin. Mechanism: `claude --plugin-dir /workspaces/git/qrspi` launches a fresh session loading the working-tree plugin instead of the installed release. Human verification tasks in `tasks.md` are exercised one at a time against a throwaway consumer fixture (built outside this repo). The skill defines a full interaction loop: provision fixture, give exact terminal commands, state expected observation, AskUserQuestion (Matches / Doesn't match), record outcome (tick or file `followups.md`).

No automated test runner (no `npm test`, no Jest/Vitest/xUnit) is present for the kit itself. Validation is: (a) static lint via `scripts/lint.mjs`, (b) OpenSpec schema validation via `openspec validate --all`, and (c) human-driven dogfood sessions via the `qrspi-dogfood` skill.

---

## Public API surface

This is a Claude Code plugin kit — no HTTP API surface. The public interface is the set of slash commands:

Stage commands (9): `/qrspi:status`, `/qrspi:questions`, `/qrspi:research`, `/qrspi:design`, `/qrspi:structure`, `/qrspi:slices`, `/qrspi:plan`, `/qrspi:implement`, `/qrspi:pr`.

Helper commands: `/qrspi:stack`, `/qrspi:init`, `/qrspi:archive`, `/qrspi:followup`, `/qrspi:update`, `/qrspi:retro`.

Each command file lives at `claude/commands/<stem>.md`. The `agent:` frontmatter field routes execution to a named subagent or to `build` (main loop).

---

## Data model

The kit's "data model" is its artifact schema. Artifact files and their canonical shapes:

- `questions.md`: 10-section structure, `PQ<N>` checkbox convention.
- `design.md`: 4 required OpenSpec headers + optional QRSPI detail sections.
- `proposal.md`: 4 required OpenSpec headers + both `### New/Modified Capabilities` subheadings.
- `tasks.md`: `## N. <name>` numbered groups, `- [ ] N.M` checkbox items, `**Model:**` annotation, `(D<n>)` tags, `(human)` prefix.
- `slices.md`: `## Overview` + `## Slices` with `### Slice N — <name>` subheadings, M/F/D/T bullets, `**Model:**` annotation, `(D<n>)` tags, Checkpoint line.
- `specs/<cap>/spec.md`: operation headers `## ADDED/MODIFIED/REMOVED Requirements`, `### Requirement:`, `#### Scenario:` with `**WHEN**/**THEN**` bullets.
- `research.md`: `## Areas investigated`, `## File map`, `## Public API surface`, `## Data model`, `## Implicit contracts and conventions`, `## Open gaps`.

---

## Implicit contracts and conventions

1. **Canonical headings are lint-enforced (Check 3).** The 10 questioner headings, 4 designer headings, 4 proposal headings, and 3 spec-delta headers must appear in the corresponding agent body — omitting one causes a lint failure.

2. **"Not applicable" is only specified in the questions template.** Only `questions.template.md` explicitly instructs writers to keep the heading and write `*Not applicable.*` plus a rationale rather than silently dropping it. `design.template.md`, `proposal.template.md`, and `tasks.template.md` carry no equivalent instruction. The questioner agent body mirrors this instruction in step 6 prose but not in the inline skeleton.

3. **The inline skeleton is the runtime source of truth; the template file is an additional reference.** Both agent bodies (questioner, architect, planner) state that the inline skeleton is authoritative — the template is consulted if reachable but is not required. Example from architect: "Generate from the skeleton embedded below — it is the runtime source of truth and mirrors the QRSPI kit's canonical `openspec-templates/proposal.template.md` (the kit ships the shape; there is no per-repo template to read)."

4. **Stack cheatsheet is per-repo project scope (`.claude/skills/<repo>-stack/`)**, not kit scope (`claude/skills/`). The QRSPI kit itself does not ship a stack cheatsheet — no `claude/skills/*-stack/` directory exists. The kit provides only the `/qrspi:stack` command to generate one.

5. **Agent load order convention:** agents that load the stack cheatsheet do so at step 1 alongside `workflow` and `openspec-workflow`. The questioner is the only stage agent that does not load the stack cheatsheet at all (it reads `requirements.md` and `tech-stack.md` instead). The planner is the other omission — its read contract is strictly `slices.md` only.

6. **Check 3 checks only the hardcoded `TEMPLATE_CANONICAL_HEADINGS` map.** It does not dynamically parse template files to discover their headings — the mapping is hardcoded in `lint.mjs`. Adding a new canonical heading to a template file without updating `TEMPLATE_CANONICAL_HEADINGS` would not be caught by Check 3.

7. **The `(human)` task prefix convention** is defined only in `tasks.template.md` and not in the `planner.md` agent body's inline skeleton. The planner agent body does not describe the `(human)` prefix.

8. **QRSPI-extras sections in proposal.md** (`## Out of scope`, `## Vertical slices (preview)`) are permitted by both the template and the architect agent, but neither defines a "not applicable" handling for them — they are simply omitted when not needed.

9. **Version-check embed (Check 9)** is enforced for stage commands only — it is not enforced for helper commands (`stack`, `init`, `archive`, `followup`, `update`, `retro`).

---

## Open gaps

- [ ] The `claude/commands/research.md` orchestrator reads `questions.md` headings when no areas of interest are provided. It is not clear whether the 10-section questions structure (which Check 3 enforces in the questioner) is also expected to be stable enough to be parsed by the research orchestrator — no formal contract between the two is stated.
- [ ] The CI `.github/workflows/ci.yml` job label says "Lint (pin agreement + frontmatter + heading alignment)" but the script runs 10 checks. Whether the label text is significant to any tooling (e.g. required check name in branch-protection rules) is not determinable from source alone.
- [ ] The release workflow references `.claude-plugin/plugin.json` but the root `plugin.json` is at `scripts/plugin.json` and the top-level `plugin.json` — confirming the exact path requires running the release workflow or reading the `scripts/plugin.json` more carefully; the research read contract prevents reading another change's folder, and this is a static file — but I did not read `scripts/plugin.json` in detail.
- [ ] Whether the "not applicable" instruction in `questions.template.md` is expected to be mirrored in the questioner agent's inline skeleton (it currently is not — the skeleton has no `*Not applicable.*` placeholder) is not stated.
- [ ] The `claude/commands/questions.md` references the stack-cheatsheet for branch naming convention but the questioner agent does not load the stack cheatsheet. Whether this is intentional (the orchestrator reads the cheatsheet; the subagent reads `requirements.md`/`tech-stack.md`) could not be confirmed from the agent file alone.
