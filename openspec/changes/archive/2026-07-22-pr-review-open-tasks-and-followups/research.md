# Research — pr-review-open-tasks-and-followups

> Stage R of QRSPI. Generated 2026-07-16.
> Ticket is hidden from this stage by design.

## Areas investigated

- **PR stage command**: `claude/commands/pr.md` — end-to-end step sequence, preconditions, subagent spawn, PR-create, pr.md + backlog recording, followups.md seeding, commit step
- **Reviewer subagent**: `claude/agents/reviewer.md` — read contract, checklist steps, tasks.md verification, open-issues reporting, followups.md seeding
- **tasks.md format and conventions**: `openspec-templates/tasks.template.md` plus nine archived examples
- **followups.md format and lifecycle**: `claude/skills/postpr-fix/SKILL.md` plus two archived followups.md files
- **followup command**: `claude/commands/followup.md` — flow and FIX MODE delegation
- **Run-mode and gate procedures**: `claude/skills/workflow/SKILL.md` — Full/Semi/Manual establishment, never-suppressed gates, hard-stop procedure, commit step, next-stage handoff, stage-specific notes
- **AskUserQuestion gate conventions**: how existing stage commands and the workflow skill use AskUserQuestion at gates
- **Copilot sync mapping**: `sync-copilot.mjs` and `copilot/` tree — how pr.md and reviewer.md map to copilot counterparts, AskUserQuestion handling
- **Lint checks**: `scripts/lint.mjs` — seven checks enumerated
- **README, CHANGELOG, backlog conventions**: PR-stage row, helpers list, `[Unreleased]` convention, backlog row shape

---

## File map

### PR stage command

- `claude/commands/pr.md` — main-loop orchestrator for the PR stage; 109 lines. No `agent:` frontmatter (runs on the main-loop orchestrator, not a subagent). Imports run-mode from skill `workflow`. Depends on: `claude/agents/reviewer.md`, `claude/skills/workflow/SKILL.md`, `claude/skills/postpr-fix/SKILL.md`.

### Reviewer subagent

- `claude/agents/reviewer.md` — the `reviewer` agent (name: `reviewer`, model: `sonnet`). Tools: `Read, Bash, Glob, Grep, Skill`. Reads the full current change folder by design (the sole "read everything" stage). Depends on: `claude/skills/workflow/SKILL.md`, `claude/skills/openspec-workflow/SKILL.md`.

### tasks.md template

- `openspec-templates/tasks.template.md` — canonical shape definition for tasks.md artifacts. 66 lines. Not read by any agent at runtime (agents carry the shape inline); serves as the lint Check 3 heading-alignment source for the planner.

### postpr-fix skill

- `claude/skills/postpr-fix/SKILL.md` — 150 lines. Defines the followups.md format and the fix checklist. Audience: `implementer, orchestrator`. Defines the `fix(<id>): <summary>` commit convention, the "DELTA only" spec-sync rule, and the "final message format (per fix)".

### followup command

- `claude/commands/followup.md` — 60 lines. Main-loop orchestrator for post-PR fix loop. No `agent:` frontmatter (main-loop). Delegates to the implementer subagent via Agent tool in FIX MODE. Depends on: `claude/skills/postpr-fix/SKILL.md`, `claude/agents/implementer.md`.

### Workflow skill

- `claude/skills/workflow/SKILL.md` — authoritative home for all canonical QRSPI stage choreography. Contains: Run-mode (Full/Semi/Manual) procedure, Never-suppressed gates list, Hard-stop procedure (four conditions), Precondition check, Commit step, Next-stage handoff, Backlog atomicity, Stage-specific gate notes (I per-slice, PR-create auto-advance), and the Read Matrix.

### Lint script

- `scripts/lint.mjs` — 1089 lines. Node.js script, no npm dependencies. Runs seven checks (details below).

### Copilot sync

- `sync-copilot.mjs` — 417 lines. Wipes and rebuilds `copilot/` from `claude/` deterministically. Contains `agentFor` table mapping stage command stems to agent names, `hintFor` table mapping stems to argument hints, `rewriteAll()` body transform, `applyFixups()` per-file semantic fixups, `mapTools()` tool-name translator.
- `copilot/prompts/qrspi-pr.prompt.md` — generated from `claude/commands/pr.md`. Carries `agent: copilot-reviewer`.
- `copilot/agents/copilot-reviewer.agent.md` — generated from `claude/agents/reviewer.md`. Tools: `search/codebase, search, vscode/askQuestions, execute/runInTerminal, execute/getTerminalOutput`.

### README / CHANGELOG / backlog

- `README.md` — stage table row for PR stage, helpers line listing `/qrspi:followup`, version/release conventions from CLAUDE.md.
- `CHANGELOG.md` — current `## [Unreleased]` entry documents progressive-task-ticking; latest tagged release is `0.6.0`.
- `openspec/backlog.md` — flat list with `idea/proposed/in-progress/merged` rows; each row is a `### <id> -- \`<status> (<note>)\`` heading under a `## <Status>` section.

---

## Public API surface (stage commands relevant to these areas)

- `/qrspi:pr <id>` (`claude/commands/pr.md`) — runs on main-loop orchestrator; spawns reviewer subagent, creates PR, writes pr.md and updates backlog, optionally seeds followups.md, commits.
- `/qrspi:followup <id>` (`claude/commands/followup.md`) — runs on main-loop orchestrator; spawns implementer in FIX MODE for one follow-up at a time; interactive commit gate before committing.

---

## PR stage command: complete step sequence

The current `claude/commands/pr.md` performs these steps, in order, all on the main-loop orchestrator:

1. **Run-mode establishment.** "Read or establish the run-mode by following the Run-mode procedure in skill `workflow` before doing any other work."

2. **Precondition check — two parts.**
   - Part 1 (file gate): Glob `openspec/changes/$ARGUMENTS/tasks.md`. If absent, refuse and tell user to start from `/qrspi:questions`.
   - Part 2 (clean-tree gate, unique to PR): `git status --short` via Bash tool. The comment notes git status is not on the default allow-list, and brace+quote shapes are blocked by the harness's obfuscation guard.
   - The precondition wording about `tasks.md` verbatim: "Precondition: all boxes in `openspec/changes/<id>/tasks.md` are ticked, and the working tree is clean (no uncommitted changes outside of the change folder updates)."
   - NOTE: the file gate only checks the file **exists**; it does NOT verify that all boxes are ticked. The ticked-boxes check is performed by the reviewer subagent (step 4 in reviewer.md), not by the command precondition.

3. **Spawn reviewer subagent** via Agent tool (`subagent_type: qrspi:reviewer`). The reviewer reads the full change folder, runs build/lint/test, drafts a PR description, and lists unresolved checklist items. The reviewer does NOT create the PR.

4. **PR-create step (mode-aware).** After the reviewer returns:
   - Full or Semi auto: skip the question, run PR-create command directly.
   - Manual: AskUserQuestion — "The PR description is ready. Would you like me to create the PR now, or do you want to review the description first?" Choices: ["Create the PR now", "Show me the description first — I'll create it manually"]. Only run PR-create if human chose "Create the PR now".
   - PR-create uses the host CLI (e.g. `gh pr create`), capturing PR number and web URL.

5. **Record PR link — mandatory (two locations).**
   - `openspec/changes/<id>/pr.md`: six-field canonical format — PR number, URL, Title, Source branch, Target branch, Created date.
   - `openspec/backlog.md`: update heading backtick note from `in-progress (Q, R, D, S, V, P, I complete)` to `in-progress (draft PR #<N> open)`.

6. **Seed follow-up queue (conditional).** If reviewer's "Open issues found" count > 0, write `openspec/changes/<id>/followups.md` using the postpr-fix skill's format. If zero open issues, do NOT create the file.

7. **Commit step.** Explicit paths only, never `git add -A`. The example in the file:
   ```
   git add openspec/changes/<id>/pr.md openspec/backlog.md openspec/changes/<id>/followups.md
   git commit -m "docs(<id>): record PR #<N> link"
   git push
   ```
   Omit `followups.md` from `git add` if not created. Skip entirely if human chose "Show me the description first".

8. **Return format.** "Return only what the reviewer's 'Final message format' specifies, then note how many follow-ups were queued."

---

## Reviewer subagent: complete step sequence

The current `claude/agents/reviewer.md` defines:

**Read contract banner:** `> **Read contract** — Reads: full changes/<id>/ folder (by design). Never opens: no restriction within the current change; no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).`

**Steps:**
1. Load skills `workflow`, `openspec-workflow`, plus project's stack-cheatsheet skill if present.
2. Read the full `openspec/changes/<id>/` folder.
3. Run verification commands: `git status` (clean?), `git log <base>..HEAD --oneline` (commits reference change id?), project's build + lint/format + test commands (green?).
4. **Verify each box in `tasks.md` is ticked. Flag any that are not.** This is the actual ticked-boxes check; the command's precondition only checks file existence.
5. Verify CLAUDE.md "keep current" rules: `## [Unreleased]` entry in `CHANGELOG.md` describes the change, README updated if applicable. Flag a missing `[Unreleased]` or stale README as a **blocking** gap.
6. Draft the PR description.

**How it seeds followups.md / reports open issues:** The reviewer returns a "Final message format" that begins with "Open issues found: <N>" and lists each issue with a short title and one-paragraph explanation (file/line, suggested action). The `/qrspi:pr` command (not the reviewer itself) writes these into followups.md. The reviewer does NOT write followups.md.

**Draft vs. ready PR rule:** Default to a draft PR when the "Open issues" list is non-empty; create a ready (non-draft) PR only when open issues is zero.

**What the reviewer must NOT do:** No edits to code, tests, or specs. No PR creation. No claims of approval ("drafted" / "ready for human review", never "approved").

---

## tasks.md format and conventions

**Canonical shape (from `openspec-templates/tasks.template.md`):**
```
# Tasks — <change-id>

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## N. <slice name>

**Model:** sonnet|opus — <rationale carried verbatim from slices.md>

- [ ] N.M <task description> (D<n>)
- [x] N.M <completed task>
```

**Format rules (from template):**
- Group headings: `## N. <slice name>` — numeric N (1, 2, 3...), no "Slice" prefix, no A/B/C prefix.
- Checkbox ids: `N.M` matching group number (group 2 → `2.1`, `2.2`, ...), consecutive within group.
- `**Model:** sonnet|opus — <rationale>` annotation in each group header, carried verbatim from slices.md.
- `(D<n>)` or `(D<n>, D<m>)` tags where a task implements a numbered design.md decision.
- `(human)` tag prefix for tasks the implementer cannot perform itself: `- [ ] 1.8 (human) Manually verify...`. Implementer leaves `(human)` boxes unticked and surfaces them at final checkpoint.
- Optional `## N. Quality gate` / `## N. Final verification` group at the end is allowed.
- Lint Check 3 (heading alignment): tasks.template.md maps to the `planner` agent, but headings list is empty (dynamic format — no fixed canonical headings to check).

**Real-world variation observed in archived examples:**

- `2026-07-06-add-auto-mode/tasks.md`: All nine real archived examples follow the `## N. <name>` + `**Model:**` + `- [x]`/`- [ ]` shape. `(human)` tags in use: e.g. `- [x] 1.3 (human) Verify...`, `- [x] 1.4 (human) Checkpoint:`. All boxes are ticked in all fully-archived examples except the most recent (`progressive-task-ticking`), which has one un-ticked `(human)` box: `- [ ] 1.6 (human) Code-review checkpoint:`.
- `2026-07-15-archive-requires-merged-pr/tasks.md`: Includes a scope-amendment group (`## 4.`) added mid-implementation with a prose note `> Scope amendment (2026-07-13), added after the Slice 1/2 dogfood — implements D11.`
- `2026-06-19-kit-quality-hardening/tasks.md`: Uses a `## 6. Quality gate / Final verification` terminal group.
- Slice headings use natural English names (e.g. "Run-mode prompt + Manual no-op end-to-end", "Block path: the PR-merge gate refuses to archive"), not slice numbers in the heading text.
- All checkbox lines end with a `(D<n>)` or similar citation where a design decision applies; pure scaffolding/checkpoint tasks may omit citations.
- Checkpoint tasks (often `N.M (human) Checkpoint:`) appear at the end of each slice group.

---

## followups.md format and lifecycle

**Canonical format (from `claude/skills/postpr-fix/SKILL.md`):**
```markdown
# Follow-ups — <id>

> Post-PR fix queue. Each box is a code-level issue raised after the PR was
> opened (reviewer "Open issues" or a retrospective code flag). Resolve with
> `/qrspi:followup <id>`. This file is archived with the change; every box should
> be ticked before archival.

- [ ] **<short title>.** <what's wrong; `file:line`; suggested fix.> (source: PR review | retro <stage>)
- [x] **<resolved title>.** ... (source: ...) — fixed in <short-sha>
```

**When created:** Written by `/qrspi:pr` (the command, not the reviewer subagent) only when the reviewer's "Open issues found" count > 0. If zero open issues, the file is NOT created.

**When absent:** Legitimately absent when the reviewer found zero open issues, OR when the change predates the followups.md convention. The `followup.md` command treats an absent file as acceptable if the user names a specific fix (the implementer creates it and adds the item before resolving).

**"Ready to archive only when no un-ticked boxes" rule:** Stated in the postpr-fix skill: "every box should be ticked before archival." Also referenced in the workflow skill: "The change is ready to archive only when `followups.md` has no un-ticked boxes." The `/qrspi:followup` command's implementer checks if the fix empties followups.md (all boxes ticked) and says so.

**Archived examples:**
- `2026-06-19-reconcile-plan-worktree-order/followups.md`: File exists but has NO checkbox items — the body is prose saying "No open follow-ups. The reviewer found 0 open issues; the three deferred items are captured under 'Out of scope' in proposal.md..." This diverges from the canonical format (file should not be created if reviewer found 0 open issues, per current pr.md). This predates the current convention.
- `2026-07-06-add-auto-mode/followups.md`: Four items, all ticked `[x]`. Items include inline prose explanations, fixed-commit references, and links. Format conforms to the canonical shape.
- Six other archived changes (`kit-quality-hardening`, `example-greeting`, `verify-stage-gate-execution`, `tighten-stage-read-boundaries`, `versioned-update-command`, `progressive-task-ticking`) have no `followups.md` at all, consistent with the "zero open issues → no file" rule.

**The pr.md format in practice (archived examples show two variants):**
- `kit-quality-hardening/pr.md` and `archive-requires-merged-pr/pr.md`: six-field format — `# Pull request -- <id>`, then `PR:`, `URL:`, `Title:`, `Source branch:`, `Target branch:`, `Created:`.
- `add-auto-mode/pr.md`: different shape — `# PR — <id>`, PR as URL (not `#N`), `Title:`, `Base/Head:`, `Stage PR completed:`, plus extended sections (`## Final checklist`, `## Why draft`, `## Open follow-ups`). This is the format drift that `validate-pr-md-shape` backlog item flags.

---

## followup command flow

`claude/commands/followup.md` (60 lines):

**Preconditions (Glob-based, no shell):**
1. `openspec/changes/<id>/` exists.
2. `openspec/changes/<id>/pr.md` exists (PR is open). If absent, points user at `/qrspi:implement <id>`.
3. `openspec/changes/<id>/followups.md` — if present, holds the queue. If absent and user named a specific fix, implementer creates it.

**Model:** Default implementer to sonnet. Use opus only for design-level logic spanning several files.

**Delegation:** Spawns implementer subagent via Agent tool in FIX MODE with explicit instruction: "You are in POST-PR FIX MODE, not slice mode. Load skill `postpr-fix` and follow its checklist. Ignore the per-slice `tasks.md` / checkpoint machinery. Resolve exactly one follow-up: <description or 'next un-ticked item in followups.md'>."

**Interactive step (mandatory — not mode-suppressed):** Before committing, uses AskUserQuestion:
- question: "Fix for '<short title>' is implemented and green. Commit it to the PR branch?"
- choices: ["Yes — commit and push", "Yes — commit, I'll push later", "No — let me review first"]

**Commit:** Stage touched files explicitly (code + tests + delta spec + followups.md + any ticked tasks.md), never `git add -A`. Commit message: `fix(<id>): <summary>`. Push only if user approved pushing.

**One follow-up per invocation.** Re-running `/qrspi:followup <id>` picks up next un-ticked item.

---

## Run-mode and gate procedures (workflow skill)

### Run-mode establishment

The mode is established at the top of a fresh stage invocation, before the precondition check. Three paths:
- **Held mode (same session, chained):** Reuse without prompting. Mode lives entirely in conversational context — no disk state.
- **No held mode (fresh invocation):** AskUserQuestion with:
  - question: "Run mode for this QRSPI flow?"
  - choices: "Full auto — chain Q→PR, pause only at Q, D, backlog offers, hard-stops" / "Semi-auto — auto-advance within-stage gates, pause at each stage boundary" / "Manual — pause at every gate (today's behaviour)"
  - Note: "Press Esc / stop at any time to interrupt a running auto chain."

### Never-suppressed gates (all modes)

1. **D review** (open-questions pass + decision-by-decision approval + final "Ready to proceed?" confirmation) — never suppressed in any mode.
2. **Backlog-capture offers** in Q, D, and S — remain interactive AskUserQuestion calls in all modes.

### Hard-stop procedure (four conditions)

A hard-stop halts the auto chain immediately and MUST surface via AskUserQuestion. MUST NOT auto-advance or silently downgrade to Manual.

1. **Failing precondition check** — required input artifact absent.
2. **`git commit` or `git push` failure** — any non-zero git exit code. Surface git error output verbatim.
3. **Subagent returning error or signalling blocked** — failure, unresolved blocker, or explicit "blocked" signal. Note: `openspec validate` failure, lint/typecheck/test failure, and `gh pr create` failure surface via this condition (not as standalone hard-stops).
4. **Execution-stage output materially diverging from approved `design.md` or spec** — applies to S, V, P, I. Defined by a rubric (a)-(d): changes/drops a design decision, introduces uncapproved capability/API/data-model/dependency, contradicts a Non-Goal or approved OQ/PQ answer, alters an observable contract beyond what design describes. Immaterial elaboration is NOT a divergence.

### Stage-specific gate notes

- **I per-slice auto-advance (Full/Semi auto):** Both per-slice checkpoint and per-slice commit step are auto-advanced. Per-slice model annotation is still honored (not bypassed by auto mode).
- **PR-create auto-advance (Full/Semi auto):** "Create the PR now?" question is suppressed — `gh pr create` runs directly. Human code review is NEVER automated; only the create-prompt is auto-advanced.

### Commit step (mode-aware)

**Full or Semi auto:** Stage explicit artifact paths, commit with exact message string (no `[auto]` suffix), push. On any non-zero git exit → hard-stop. Never `git add -A`.

**Manual:** AskUserQuestion — "Commit <artifacts> to the feature branch?" choices: ["Yes -- commit and push", "No -- I'll commit later"]. On yes, stage explicit paths and commit. If "No", skip and continue to handoff.

### Next-stage handoff (mode-aware)

**Full auto:** Do not ask. Re-enter `/qrspi:<next> <id>` immediately as a slash command on the main loop.

**Semi-auto:** AskUserQuestion — "Stage <X> complete. Continue to <Y>, or stop here?" choices: ["Continue to /qrspi:<next> <id>", "Stop here -- I'll resume later"]. On Continue, re-enter as slash command.

**Manual:** AskUserQuestion — same two-choice question. On Continue, invoke next-stage command in main loop (never as subagent).

---

## AskUserQuestion gate conventions

AskUserQuestion is a **main-loop-only** tool (defined in lint Check 5's `MAIN_LOOP_ONLY` set). Commands with a non-builtin `agent:` frontmatter cannot reach it. All nine QRSPI stage commands have NO `agent:` frontmatter (they run on the main-loop orchestrator and delegate only artifact writes to subagents via Agent tool).

Concrete precedents:

- **Run-mode establishment:** AskUserQuestion at top of every stage command (via workflow skill reference).
- **PR-create gate (Manual mode):** AskUserQuestion in `pr.md` — "The PR description is ready. Would you like me to create the PR now, or do you want to review the description first?"
- **Commit step (Manual mode):** AskUserQuestion in workflow skill commit step — "Commit <artifacts> to the feature branch?" with Yes/No.
- **Next-stage handoff (Manual and Semi-auto):** AskUserQuestion in workflow skill — "Stage <X> complete. Continue to <Y>, or stop here?"
- **followup command commit gate (all modes — not suppressed):** AskUserQuestion in `followup.md` — "Fix for '<short title>' is implemented and green. Commit it to the PR branch?" This gate is always interactive regardless of run-mode.
- **Backlog-capture offers (all modes — never suppressed):** AskUserQuestion per item, one at a time, in Q/D/S.
- **Structure approval gate (Manual or no in-chain D approval):** AskUserQuestion in workflow skill precondition check.

---

## Copilot sync mapping

### `agentFor` table (in sync-copilot.mjs)

```js
const agentFor = {
  'qrspi-questions': 'questioner',  'qrspi-research': 'researcher',
  'qrspi-design': 'designer',       'qrspi-structure': 'architect',
  'qrspi-slices': 'architect',      'qrspi-plan': 'planner',
  'qrspi-implement': 'implementer', 'qrspi-followup': 'implementer',
  'qrspi-pr': 'reviewer',
};
```

`claude/commands/pr.md` → `agentFor['qrspi-pr'] = 'reviewer'` → generated as `agent: copilot-reviewer` in the prompt.

### Path rewrites for pr.md → qrspi-pr.prompt.md

- `$ARGUMENTS` → `${input}`
- `/qrspi:<cmd>` → `/qrspi-<cmd>` (colon form to dash form)
- `AskUserQuestion tool` (various forms) → `#tool:vscode/askQuestions`
- `AskUserQuestion` bare → `vscode/askQuestions`
- Skill load instructions → `Consult the instructions for...`
- `.claude/` path refs → `.github/` path refs
- Agent delegation verbs softened (`invoke the ... subagent` → `continue as the ...`)

### AskUserQuestion in Copilot

`sync-copilot.mjs` maps AskUserQuestion to `vscode/askQuestions` (Copilot's structured-question tool). The mapping is done in `rewriteAll()` with several patterns:
- `**AskUserQuestion** tool` or `**AskUserQuestion tool**` → `#tool:vscode/askQuestions`
- `per **AskUserQuestion** call` → `per vscode/askQuestions call`
- `1-decision-per-**AskUserQuestion**` → `1-decision-per-vscode/askQuestions`
- bare `AskUserQuestion` → `vscode/askQuestions`

The tool is granted on agent files via `mapTools()` which always includes `askTool = 'vscode/askQuestions'` in the base tool set.

### Reviewer agent mapping

`claude/agents/reviewer.md` → `copilot/agents/copilot-reviewer.agent.md`.
- Tools: `[search/codebase, search, vscode/askQuestions, execute/runInTerminal, execute/getTerminalOutput]` (reviewer has Bash → `execute/runInTerminal, execute/getTerminalOutput`; has Write/Edit? No — tools frontmatter is `Read, Bash, Glob, Grep, Skill` → mapped without `edit/editFiles`).
- No `model:` note in the generated agent (no `opus` annotation for sonnet agents).
- The `note` added by `generate()` for opus agents is absent (sonnet agents get no extra note).
- The body contains `Consult the instructions for workflow, openspec-workflow, ...` instead of `Load skills workflow, openspec-workflow, ...`.

### Key fidelity gap

In Copilot, the `qrspi-pr.prompt.md` carries `agent: copilot-reviewer`, which means the ENTIRE command body (including the main-loop orchestration — run-mode establishment, precondition checks, PR-create step, pr.md writing, backlog update, followups.md creation, commit step) runs inside the copilot-reviewer agent rather than on the main-loop orchestrator. This is the architectural fidelity gap noted in the README "Copilot fidelity gaps": "Subagent orchestration. Deep delegation becomes a single `agent:` per prompt plus human-driven agent switches." The AskUserQuestion → vscode/askQuestions mapping exists, but the boundary between orchestrator and reviewer subagent is collapsed.

---

## Lint checks (scripts/lint.mjs)

**Check 1: PIN AGREEMENT.** Scans all hand-maintained files in `claude/`, `copilot/`, `openspec/` (excluding `openspec/changes/` subtree), `openspec-templates/`, and root-level files for occurrences of `@fission-ai/openspec@<version>` and `openspec_version: <version>`. Excludes `generatedBy:` lines in `openspec-generated` skills. Asserts all found occurrences agree on one version string.

**Check 2: FRONTMATTER / NAME.** Every agent must have `name:` and `description:`. Every command must have `description:`. Every skill SKILL.md must have `name:` and `description:`. Every `agent:` reference must resolve to a real `claude/agents/<stem>.md`. Every `model:` field must use an alias (opus/sonnet/haiku), not a pinned id. Every `Load skill X` or `load the X skill` backtick-wrapped reference in agent bodies must resolve to a real `claude/skills/<X>/` directory.

**Check 3: HEADING ALIGNMENT.** For each template in `openspec-templates/*.template.md`, canonical section headings must also appear in the corresponding agent file. `tasks.template.md` → `planner` agent, but headings list is empty (dynamic format), so this check is SKIPPED for tasks.template.md. Other templates and their canonical headings:
- `questions.template.md` → `questioner`: 10 headings (Data model, Indexing & query performance, API, UI, Front-end state, Auth & authorization, Migrations & data, Testing, Sequencing & scope, Open product questions)
- `design.template.md` → `designer`: 4 headings (Context, Goals / Non-Goals, Decisions, Risks / Trade-offs)
- `proposal.template.md` → `architect`: 4 headings (Why, What Changes, Capabilities, Impact)
- `spec-delta.template.md` → `architect`: 3 headings (ADDED Requirements, MODIFIED Requirements, REMOVED Requirements)

**Check 4: README COMMAND COVERAGE.** Every `claude/commands/<stem>.md` must be documented as `/qrspi:<stem>` in README.md (forward check). Every `/qrspi:<token>` in README.md must resolve to a real command file (reverse check). Only the colon form is matched. Bare `/qrspi` is not matched.

**Check 5: GATE-TOOL / EXECUTOR AGREEMENT.** For each command with a non-builtin `agent:` frontmatter, checks if the body reaches AskUserQuestion (main-loop-only) directly or transitively via workflow choreography (body mentions `` `workflow` `` skill and choreography markers: "Stage choreography", "commit step", or "next-stage handoff"). Currently all nine QRSPI stage commands have NO `agent:` frontmatter, so no violations can fire for them.

**Check 6: MIGRATION MANIFEST PRESENCE + SCHEMA + MARKER FORMAT.** Three sub-checks: (a) presence — every `## [X.Y.Z]` CHANGELOG section at or above the MIGRATION_FLOOR (`0.6.0`) must have a `migrations/<version>.yaml`; (b) schema — each manifest must have required keys (version, summary, automated, manual), `automated[].action` must be `edit-file` only, `automated[].path` must start with `openspec/`; (c) marker format — `openspec/.qrspi-version` if present must be bare SemVer (X.Y.Z, no v prefix).

**Check 7: READ-CONTRACT BANNER AGREEMENT.** Each of the seven QRSPI stage agents (researcher, questioner, designer, architect, planner, implementer, reviewer) must carry a `> **Read contract** -- Reads: ... Never opens: ...` banner. The `Reads:` field is extracted and compared against the expected value from the read matrix. Expected values (keyed by agent stem):
- `researcher`: `Reads: none (whole changes/<id>/ folder banned).`
- `questioner`: `Reads: backlog + templates (no change-folder artifact).`
- `designer`: `Reads: questions.md, research.md.`
- `architect`: `Reads (S): design.md. Reads (V): proposal.md, specs/.`
- `planner`: `Reads: slices.md.`
- `implementer`: `Reads: tasks.md.`
- `reviewer`: `Reads: full changes/<id>/ folder (by design).`

---

## README, CHANGELOG, backlog conventions

### README — PR stage row and helpers

Stage table row (column-compressed): `| 8 | PR | /qrspi:pr <id> | PR description | Read-only review + final checklist. |`

Helpers line: `/qrspi:followup <id>` (post-PR fix loop) is listed. `/qrspi:archive <id>` is listed. `/qrspi:retro <id> <stage>` is listed.

### CHANGELOG — `[Unreleased]` convention

`CHANGELOG.md` uses Keep-a-Changelog format. Currently has `## [Unreleased]` section with one item (progressive-task-ticking behavior change). Latest tagged release is `## [0.6.0] - 2026-07-15`. CLAUDE.md rule: "In the same change that touches..." the relevant code, add an entry under `## [Unreleased]`. The reviewer subagent checks for this and flags a missing `[Unreleased]` entry as a **blocking** gap.

### Backlog row shape

Row format: `### <change-id> -- \`<status> (<note>)\`` as a heading under the appropriate `## <Status>` section. Example from current backlog:
```
### pr-review-open-tasks-and-followups — `proposed (change folder created 2026-07-16)` · **P1**
```
No separate `Status:` or `Next QRSPI command:` body line. The status word, parenthetical note, and section grouping all live in the heading. The `/qrspi:pr` command changes the heading note from `in-progress (Q, R, D, S, V, P, I complete)` to `in-progress (draft PR #<N> open)`.

### Version-bump and release rules (CLAUDE.md)

- `plugin.json` `version` changes ONLY when cutting a release, never in a feature PR.
- Changes are recorded under `## [Unreleased]` in CHANGELOG.md; `main` may sit ahead of the latest release.
- A release is cut by pushing a `vX.Y.Z` tag; `release.yml` CI asserts the tag matches `plugin.json` `version` and a matching `CHANGELOG.md` section.

---

## Implicit contracts and conventions

1. **Ticked-boxes check is in the reviewer, not the precondition.** `pr.md`'s precondition only Globs for the file; the actual per-box ticked check is step 4 of `reviewer.md`. A file with un-ticked boxes passes the precondition but is flagged by the reviewer.

2. **followups.md is created by the command, not the reviewer.** The reviewer emits "Open issues found: N" in its final message; `/qrspi:pr` reads that count and writes `followups.md` if N > 0.

3. **followup command commit gate is never suppressed by run-mode.** The AskUserQuestion before committing a fix is mandatory regardless of Full/Semi/Manual mode (the workflow skill's run-mode gate suppression applies to stage-level commit steps; the followup command is not a stage).

4. **`git add` must never use `-A`.** Enforced by prose in workflow skill, pr.md, postpr-fix skill, and followup.md. Only explicitly listed paths are staged.

5. **Commit message conventions:** Stage commands use `docs(<id>): <verb> ...` for artifact-only commits; implementation uses conventional commits; follow-up fixes use `fix(<id>): <summary>`.

6. **Draft PR default.** When open issues > 0, PR is created as draft. Only created as ready when open issues = 0.

7. **The pr.md canonical six-field format is enforced only by prose.** No lint or `openspec validate` checks the shape. Archived examples show a divergent format in `add-auto-mode/pr.md` (different field names, extended sections). The `validate-pr-md-shape` backlog item notes this gap.

8. **Never-created followups.md convention has a counter-example.** `reconcile-plan-worktree-order/followups.md` exists with no checkbox items (prose-only body), predating the "If zero open issues, do not create the file" rule.

9. **Copilot port collapses orchestrator/reviewer boundary.** All of `/qrspi:pr`'s main-loop orchestration (precondition, PR-create, writing pr.md, backlog update, followups.md, commit) runs inside the `copilot-reviewer` agent, not a separate orchestrator context.

10. **`agentFor` table and command-body delegation are parallel representations** with no automated cross-check. The `agentFor-frontmatter-crosscheck` backlog item (P3) flags this. After v0.4.1 dropped `agent:` frontmatter from stage commands, the cross-check shifted from frontmatter vs. table to command-body named subagent vs. table.

---

## Open gaps

- [ ] The progressive-task-ticking change (currently `[Unreleased]`) has one un-ticked `(human)` box in tasks.md (`1.6 (human) Code-review checkpoint`). Whether this is considered "complete" for purposes of any current work is not known from the code alone.
- [ ] The `reconcile-plan-worktree-order/followups.md` file predates the "zero issues → no file" rule. Whether this convention was established with that change or before it cannot be determined without reading the change's process artifacts (which are off-limits to this stage).
- [ ] The `add-auto-mode/pr.md` format differs substantially from the canonical six-field format prescribed in the current `pr.md` command. Whether the divergent format was produced by a different version of the command is not determinable from code alone.
- [ ] The precondition wording says "all boxes in tasks.md are ticked" but the Glob check only confirms the file exists — the actual ticked-box verification is delegated to the reviewer subagent. Whether this gap is intentional is not stated in the code.
- [ ] The `followup.md` commit gate (`AskUserQuestion` before committing) is mandatory (the command body states "Interactive step (mandatory)") but the workflow skill's run-mode procedures do not explicitly list the followup commit gate as "never suppressed." It is in practice not suppressed because the followup command is not a QRSPI stage and does not reference the workflow commit-step procedure.
