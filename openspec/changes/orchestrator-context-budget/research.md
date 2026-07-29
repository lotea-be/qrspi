# Research -- orchestrator-context-budget

> Stage R of QRSPI. Generated 2026-07-28.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Stage-command preamble & step ordering**: Opening steps, numbering conventions, and completion/handoff wording across all stage commands plus `archive.md` and `followup.md`.
- **Session-scoped check precedent -- `qrspi-version-check`**: Mechanism for the once-per-session behavior, inputs, silence discipline, and AskUserQuestion gate shape.
- **`context-hygiene` skill -- current content**: Percentage thresholds, subagent framing, operational checklist, and mechanism-backing section.
- **`workflow` skill -- run-mode & never-suppressed gates**: Run-mode establishment procedure, never-suppressed gate enumeration, stage-choreography commit/handoff procedures, and disposable-session prose.
- **State-reading mechanisms (feasibility map)**: Every mechanism by which commands/skills read runtime state, with a specific search for any live context-window or token-usage signal.
- **Lint gate coverage over commands & skills**: All 19 checks in `scripts/lint.mjs`, specifically which parse step structure, skill-set membership, read-contract banners, and README coupling.
- **`/qrspi:status` & the resume/next-command surface**: Stage detection algorithm and next-command recommendation logic.
- **Repo surface & conventions**: Declared surfaces and authoring conventions that govern command/skill edits.

## File map

### Stage-command preamble & step ordering

- `claude/commands/questions.md` -- Stage Q. Steps 1-7. Step 1: silent version check; step 2: run-mode. Unnumbered "Otherwise:" block contains stage-specific work (branch creation, subagent spawn, interactive PQ loop). Ends: `Return the agent's "Final message format" followed by: Next stage: /qrspi:research <id>` then canonical choreography block with artifact, commit-message, and next-stage variables.
- `claude/commands/research.md` -- Stage R. Steps 1-2 (version check + run-mode). Then unnumbered block describing the ticket-hiding extraction, subagent spawn. Ends: `Return only what the researcher's "Final message format" specifies.` followed by canonical choreography variables.
- `claude/commands/design.md` -- Stage D. Steps 1-2 (version check + run-mode). Then unnumbered block with subagent spawn and a six-item numbered interactive review sequence (open questions, decision-by-decision, final confirmation, capture deferred work, commit step, next-stage handoff). The commit step and handoff are embedded inline as steps 5 and 6 (not deferred to a choreography block reference alone) but do reference `skill workflow`.
- `claude/commands/structure.md` -- Stage S. Steps 1-2 (version check + run-mode). Precondition and approval gate as unnumbered prose. Ends with canonical choreography block referencing `skill workflow`.
- `claude/commands/slices.md` -- Stage V. Steps 1-2 (version check + run-mode). Precondition as unnumbered prose. Ends with canonical choreography block.
- `claude/commands/plan.md` -- Stage P. Steps 1-2 (version check + run-mode). Precondition as unnumbered prose. Ends with canonical choreography block.
- `claude/commands/implement.md` -- Stage I. Steps 1-2 (version check + run-mode). Precondition check, then inline implementer-variant resolution block, then a long per-slice loop section with mode-aware branches, per-slice commit step, and backlog update. Contains a `## Adding scope after stage I has started` sub-section. Ends: `Return only what the implementer's "Final message format" specifies.`
- `claude/commands/pr.md` -- Stage PR. Steps 1-2 (version check + run-mode). Precondition (two-part: file + clean-tree). `## Tasks pass` and `## Follow-ups pass` reconciliation sections. Subagent spawn. PR-create step. Record-the-PR-link step. Seed-followups step. Final commit block. Ends: reviewer's "Final message format" plus follow-up count note.
- `claude/commands/archive.md` -- Not a stage; no version-check step 1; no run-mode step 2. Six numbered steps. No "return Final message format" pattern. Final output is a relay of the archive skill's completion summary (step 6). Has `agent: build` frontmatter.
- `claude/commands/followup.md` -- Post-PR fix loop; no version-check step; no run-mode step. Preconditions as Glob-based unnumbered checks. Triage gate (AskUserQuestion, never suppressed). P1/P2/P3 dispatch blocks. Each path ends with a "next-follow-up offer" AskUserQuestion. One-follow-up-per-invocation default. No "8 stages" choreography block.

**Shared preamble pattern (8 stage commands only -- Q, R, D, S, V, P, I, PR):**
- Item 1 (numbered): `**Session version check -- run silently.** Load skill qrspi-version-check and follow its instructions exactly.` Exact text: "This is the first step -- before the run-mode establishment and before any other work."
- Item 2 (numbered): `Read or establish the run-mode by following the **Run-mode** procedure in skill workflow before doing any other work.`

`archive.md` and `followup.md` have neither step.

`status.md` has step 1 (version check) but no step 2 (run-mode); its step 1 note says "before the onboarding check and before any other work" (different suffix than the stage commands).

**Completion handoff wording (stage commands):**
- Q: explicit `Return … followed by: Next stage: /qrspi:research <id>`, then choreography variables.
- R, S, V, P: `Return only what the [agent]'s "Final message format" specifies.` then choreography variables.
- D: inline steps 5 (commit) and 6 (handoff), no separate choreography block.
- I: `Return only what the implementer's "Final message format" specifies.` (no separate choreography block; per-slice loop body owns the commit/handoff logic inline).
- PR: `Return only what the reviewer's "Final message format" specifies, then note how many follow-ups were queued.`

### Session-scoped check precedent -- `qrspi-version-check`

- `claude/skills/qrspi-version-check/SKILL.md` -- Skill loaded at step 1 of every stage command (and status.md). Exports no functions; purely instructional markdown.

**Inputs and mechanism:**
- Input A: file `openspec/.qrspi-version` -- read with the Read or Glob tool. Must be bare SemVer.
- Input B: `<CLAUDE_CONFIG_DIR>/plugins/installed_plugins.json` -- read with the Read tool. JSON shape `{ "plugins": { "qrspi@*": [ { "version": "X.Y.Z" } ] } }`. Select highest SemVer when multiple entries exist.
- `CLAUDE_CONFIG_DIR` env var resolved first; defaults to `~/.claude`.

**Session flag mechanism:**
- Flag name: "in-context `version-checked this session`" (prose label; no disk file, no temp marker).
- Storage: orchestrator conversational context -- same mechanism as the run-mode flag.
- Lost on `/clear` or new session (correct behavior; re-checks on fresh start).
- Step 1 of the skill: if flag already held, return immediately (no reads, no output).
- Step 5: flag is set in every path that reaches step 4 (up-to-date, behind-continue, downgrade, unreadable-B). Not set on the behind-update-now path (context handed to `/qrspi:update`).

**Silence discipline:**
- Completely silent on: already-checked, up-to-date, `openspec/` absent, and no-marker-delegate paths.
- Speaks on three paths: behind (AskUserQuestion), downgrade (one-line warning), unreadable-B / config missing (one-line notice).

**AskUserQuestion gate shape (behind path):**
- Question: names both A and B and the delta. Example: `This repo is on QRSPI <A>; installed kit is <B> (<delta> version(s) behind). Update now?`
- Choices (exactly two, in order):
  - `Run /qrspi:update now`
  - `Continue on the current version`

**Execution order (five steps):**
1. Session-flag guard (early-exit if flag held)
2. Read B (installed plugin version)
3. Read A (repo marker)
4. SemVer compare and branch
5. Set session flag

**SemVer compare:** numeric-tuple ordering, NOT lexicographic (`0.10.0 > 0.9.0` must be true).

### `context-hygiene` skill -- current content

- `claude/skills/context-hygiene/SKILL.md` -- Instructional skill; no exports. Loaded by researcher and designer agents (per `skill-sets.mjs`); the skill's frontmatter `description` says to load it "when planning a multi-stage workflow, starting a long session, or deciding whether to delegate work to a subagent."

**Exact threshold sentences:**
- `## The numbers` section: "**Target: < 40% context window utilization** at any given moment."
- "**Hard reset trigger: 60%.** Start a new session."
- Operational checklist: "Am I past 40%? → finish the current step, then offload to a subagent or persist to disk." and "Am I past 60%? → stop. Persist state. New session."

**Subagent framing heading:** `## Subagents are context firewalls, not personas`
- "a subagent is a **separate context window** that does a bounded job and returns a condensed result. The orchestrator never sees the subagent's full conversation -- only the final message."

**Operational checklist headings:** `## Operational checklist` -- three sub-lists: "Before starting a session", "During a session", "When delegating to a subagent."

**Mechanism section heading:** `## Mechanism backing the 40%/60% principle` -- names three backing mechanisms:
1. `checkSkillSets` (Check 2b in `scripts/lint.mjs`) -- asserts each stage agent's Load-skills line matches the approved per-stage registry (`scripts/skill-sets.mjs`).
2. `checkOutputContracts` (Check 12 in `scripts/lint.mjs`) -- asserts every stage agent carries a `> **Output contract**` banner.
3. `scripts/context-footprint.mjs` -- report-only (always exits 0); prints per-stage table (agent + declared skills) with line count, byte count, and rough token estimate (bytes / 4 heuristic).

Note: the "40%/60%" thresholds are principles stated in prose -- there is no runtime mechanism reading live context-window utilization. The "mechanism" section names lint checks and a static-analysis script, not a live signal.

### `workflow` skill -- run-mode & never-suppressed gates

- `claude/skills/workflow/SKILL.md` (installed at `/home/vscode/.claude/plugins/cache/lotea-agents/qrspi/0.10.0/claude/skills/workflow`) -- canonical authority on stage choreography.

**Run-mode establishment procedure:**
- Three modes: `Full auto`, `Semi-auto`, `Manual`.
- If run-mode already held in this orchestrator context (auto-chained from a prior stage in same session): skip prompt, reuse it. No disk state read or written.
- If no run-mode held: ask via AskUserQuestion. Question: `"Run mode for this QRSPI flow?"`. Three choices:
  - `"Full auto -- chain Q->PR, pause only at Q, D, backlog offers, hard-stops"`
  - `"Semi-auto -- auto-advance within-stage gates, pause at each stage boundary"`
  - `"Manual -- pause at every gate (today's behaviour)"`
  - Note in question: `"Press Esc / stop at any time to interrupt a running auto chain."`
- Run-mode stored in context; re-asked only in a context with no held mode.

**Never-suppressed gates (all modes) -- exact enumeration:**
1. The D review (open-questions pass + decision-by-decision approval + final "Ready to proceed?" confirmation) -- a sanctioned pause in ALL modes including Full auto.
2. Backlog-capture offers in Q, D, and S -- always interactive AskUserQuestion calls, never suppressed in any mode.

**Stage-choreography procedures:**
- Precondition check: Glob-based; never shell out.
- Commit step: in Full/Semi auto -- `git add <explicit paths>; git commit -m "<exact message>"; git push` without asking. In Manual -- AskUserQuestion first. Never `git add -A`.
- Next-stage handoff: Full auto -- re-enter slash command immediately (never subagent). Semi-auto -- one AskUserQuestion at stage boundary. Manual -- AskUserQuestion then re-enter or print next-stage command.

**Disposable-session / change-folder-as-truth prose (from workflow):**
- "The orchestrator's context stays clean. See skill context-hygiene."
- On run-mode re-establishment: "A mid-chain new session re-asks and the human re-picks -- this is correct behaviour, not a bug (no disk state is ever written)."
- Resuming in a fresh session: mode is re-asked; the change folder on disk is the truth.

### State-reading mechanisms (feasibility map)

**Mechanisms that currently read runtime state:**

1. **`qrspi-version-check`** -- reads `openspec/.qrspi-version` (Read/Glob tool) and `<CLAUDE_CONFIG_DIR>/plugins/installed_plugins.json` (Read tool). Both are static files. Tool: Read. Timing: once per session at stage-command preamble step 1.

2. **run-mode flag** -- stored in orchestrator conversational context; no file read. Read by each stage command at step 2 via prose check ("do you already hold a run-mode"). Pure in-context state; no harness API.

3. **`/qrspi:status`** -- reads `openspec/changes/**/*` via Glob; infers stage from artifact presence/absence. No dynamic harness signal.

4. **`/qrspi:pr`** -- reads `openspec/changes/<id>/tasks.md` for un-ticked `- [ ]` lines; reads `followups.md` for un-ticked entries; runs `git status --short` via Bash tool for clean-tree check. These are file-content and git-state reads, not context-window signals.

5. **`/qrspi:archive`** -- reads `openspec/changes/<id>/pr.md` for PR number; runs `gh pr view <N> --json state` via Bash tool. Runtime state about the PR, not about context window.

6. **`scripts/context-footprint.mjs`** -- reads agent and skill files from disk; computes a static token estimate (file bytes / 4). This is a static report on file sizes, not a live context-window measurement.

**What does NOT exist -- confirmed by grep:**
- No command, skill, or script in `claude/**` or `scripts/**` reads a live or dynamic harness signal about context-window utilization, token counts in the current conversation, message counts, session size, or similar.
- The 40%/60% thresholds in `context-hygiene` are **prose targets only**; no code or runtime mechanism measures them.
- No MCP tool call, no harness API, no environment variable carries a live context-window percentage. The thresholds rely entirely on the agent's self-assessment of its conversational context.

### Lint gate coverage over commands & skills

- `scripts/lint.mjs` -- CI quality gate. 19 checks, all errors collected before exit; exits 0 on pass, 1 on failure. Uses Node.js built-ins only.
- `scripts/skill-sets.mjs` -- exported `SKILL_SET_EXPECTED` map; single source of truth for agent skill-set registry, shared between lint.mjs (Check 2b) and context-footprint.mjs.
- `scripts/context-footprint.mjs` -- visibility report; always exits 0; reads agents + declared skills from disk; computes line/byte/rough-token table. Not a gate.

**Check-by-check summary:**

| # | Name | What it asserts |
|---|------|-----------------|
| 1 | PIN AGREEMENT | All `@fission-ai/openspec@<ver>` and `openspec_version:` occurrences in hand-maintained files agree on one version. Excludes `generatedBy:` lines and `openspec/changes/` subtree. |
| 2 | FRONTMATTER / NAME | Every agent carries `name:`, `description:`, `model:` alias, `effort:` value. Every command carries `description:`, optional `agent:` resolves. Every skill carries `name:`, `description:`. Backtick-wrapped skill references in body resolve to real `claude/skills/<X>/` dirs. |
| 2b | SKILL-SET REGISTRY (checkSkillSets) | Each stage agent's step-1 "Load skills" line -- after filtering `-stack` names -- exactly matches `SKILL_SET_EXPECTED[stem]`. Stray or missing skills fail CI. |
| 3 | HEADING ALIGNMENT | Canonical section headings from each `openspec-templates/*.template.md` appear in the corresponding agent's inline skeleton. Surface-independent headings only (e.g. `## Areas investigated` in researcher). |
| 4 | README COMMAND COVERAGE | Every `claude/commands/<stem>.md` is documented as `/qrspi:<stem>` in README.md (forward). Every `/qrspi:<token>` in README.md resolves to an existing command file (reverse). |
| 5 | GATE-TOOL / EXECUTOR AGREEMENT | No command with a non-builtin `agent:` frontmatter references `AskUserQuestion` (directly or transitively via workflow choreography phrases). |
| 6 | MIGRATION MANIFEST PRESENCE + SCHEMA + MARKER FORMAT | (a) Every CHANGELOG `## [X.Y.Z]` at or above floor `0.6.0` has `migrations/<ver>.yaml`; (b) Each manifest has required keys, `edit-file` action, `openspec/`-scoped paths; (c) `openspec/.qrspi-version` is bare SemVer if present. |
| 7 | READ-CONTRACT BANNER AGREEMENT | Each of the nine stage-agent files (researcher, questioner, designer, architect, planner, implementer-low/-medium/-high, reviewer) carries a `> **Read contract** -- Reads: ...` banner whose `Reads:` field equals the expected value from `READ_CONTRACT_EXPECTED`. Architect handled as two-mode (S/V); reviewer as "full folder by design". |
| 8 | PR RECONCILIATION PASSES STRUCTURE | `claude/commands/pr.md` contains `## Tasks pass` and `## Follow-ups pass` headings plus required choice-label strings. |
| 9 | VERSION-CHECK EMBED | Nine stage command files (status, questions, research, design, structure, slices, plan, implement, pr) each contain: `Load skill \`qrspi-version-check\` and follow its instructions exactly.` (whitespace-collapsed check). |
| 10 | TRIAGE PATH ANCHORS | `claude/commands/followup.md` contains the three choice-label prefixes: `P1 -- implement directly`, `P2 -- amend this change in place`, `P3 -- defer`. |
| 11 | NO SURFACE-GATED SKELETON HEADINGS IN FENCED BLOCKS | 22 surface-gated heading strings must NOT appear as literal heading lines inside fenced code blocks in questioner, designer, architect, planner, researcher, reviewer agent files. `SURFACE_GATED_DENYLIST_HEADINGS` is the authoritative set. |
| 12 | OUTPUT-CONTRACT BANNER PRESENCE | Each of the nine stage agents carries a `> **Output contract**` banner line (presence-only, not content-checked). Same scope as Check 7. |
| 13 | COMPUTE ANNOTATION VALUE-VALIDATION | Every `**Compute:**` line in committed `slices.md`/`tasks.md` files has valid `effort=` (required: low/medium/high) and valid `model=` if present (sonnet/opus/haiku). Scoped to `openspec/changes/` only, not skills/templates. |
| 14 | SURFACE APPLICABILITY OF ARTIFACT HEADINGS | Scans every `*.md` under `openspec/changes/` (excluding `/archive/`); flags any heading belonging to an absent surface (derived from `.claude/skills/qrspi-stack/SKILL.md` `## Repo surface` block). Includes inline self-test. |
| 15 | IMPLEMENTER VARIANT AGENT DRIFT GATE | The set of `claude/agents/implementer-*.md` stems equals `IMPLEMENTER_VARIANTS`; each variant's step-1 loads only `implementer-core`; each variant's `effort:` matches its stem suffix; base `implementer.md` is absent from `plugin.json`. |
| 16 | FOLLOWUP BARE-STEM GUARD | `claude/commands/followup.md` contains no bare `qrspi:implementer` (without variant suffix). Uses regex `/qrspi:implementer(?!-)/`. |
| 17 | HELPER AGENT READ-CONTRACT BANNER AGREEMENT | Helper agents (initial: `spec-syncer`) carry a `> **Read contract**` banner whose `Reads:` field matches `HELPER_READ_CONTRACT_EXPECTED`. Separate scope from Check 7. Includes inline self-test. |
| 18 | MODIFIED SCENARIO COUNT GUARD | Delta specs under `openspec/changes/*/specs/**/spec.md` -- counts `#### Scenario:` blocks per MODIFIED requirement; flags any reduction vs the base spec count. |
| 19 | AUTHORITATIVE SYNC DELEGATOR | `claude/commands/archive.md` contains `qrspi:spec-syncer`; no kit-owned file in `claude/commands/` or `claude/agents/` contains `subagent_type: general-purpose` near a sync-context string. |

**Check 9 scope detail:** Hard-coded `VERSION_CHECK_COMMAND_STEMS` = `['status', 'questions', 'research', 'design', 'structure', 'slices', 'plan', 'implement', 'pr']`. The exact embed line the check matches (whitespace-collapsed): `Load skill \`qrspi-version-check\` and follow its instructions exactly.`

**Check 7 `READ_CONTRACT_EXPECTED` map (exact values checked):**
```
researcher:       'Reads: none (whole changes/<id>/ folder banned).'
questioner:       'Reads: backlog + templates (no change-folder artifact).'
designer:         'Reads: questions.md, research.md.'
architect:        'Reads (S): design.md. Reads (V): proposal.md, specs/.'
planner:          'Reads: slices.md.'
implementer-low:  'Reads: tasks.md.'
implementer-medium:'Reads: tasks.md.'
implementer-high: 'Reads: tasks.md.'
reviewer:         'Reads: full changes/<id>/ folder (by design).'
```

### `/qrspi:status` & the resume/next-command surface

- `claude/commands/status.md` -- No subagent spawn; runs entirely in orchestrator. No run-mode step. Has version-check step 1. No `agent:` frontmatter.

**Stage detection algorithm:**
- Globs `openspec/changes/**/*`.
- For each in-flight folder, infers next stage from highest artifact present (lookup table):
  - No artifacts -> Q (`/qrspi:questions <id>`)
  - `questions.md` -> R (`/qrspi:research <id>`)
  - `research.md` -> D (`/qrspi:design <id>`)
  - `design.md` -> S (`/qrspi:structure <id>`)
  - `proposal.md` + `specs/` -> V (`/qrspi:slices <id>`)
  - `slices.md` -> P (`/qrspi:plan <id>`)
  - `tasks.md` (incomplete) -> I (`/qrspi:implement <id>`)
  - `tasks.md` (all ticked) -> PR (`/qrspi:pr <id>`)
  - `pr.md` -> resolve followups then `/qrspi:archive <id>` after merge

**Additional status signals:**
- When `pr.md` exists: surfaces PR URL from the file.
- When `followups.md` exists: Greps for un-ticked `- [ ]` boxes; if any remain, next action is `/qrspi:followup <id>`.
- Task completion detection: Greps `tasks.md` for `- [ ]` vs `- [x]`.
- Prints eight-stage descriptions (from skill `workflow`).
- Mentions optional `/qrspi:retro <id> <stage>` after every stage.
- Ends with: `"What change are you working on, and what stage are you in?"`

### Repo surface & conventions

**Declared surfaces (from `.claude/skills/qrspi-stack/SKILL.md` `## Repo surface` block):**
- `slash-command`
- `stage-agent`
- `skill`
- `lint-gate`
- `template`
- `migration-manifest`

Absent surfaces (not listed): `data-store`, `http-api`, `ui`, `auth`, `typed-nullable`.

**Authoring conventions (from `CLAUDE.md` and `qrspi-stack`):**
- Do NOT use shell injection (exclamation-prefixed backtick spans) in `claude/**` files; instruct use of the Glob tool instead.
- Never place `!` immediately before a backtick in skill/command markdown -- the static scanner parses it as an auto-run directive.
- ASCII-only in commit messages and PR text; `--` for em-dash, `->` for arrows.
- No emoji unless the user explicitly requests it.
- All skill/agent/command files carry YAML frontmatter (`name:`, `description:`); agents additionally carry `> **Read contract**` and `> **Output contract**` banners plus `effort:` frontmatter.
- New `claude/skills/<name>/` directories auto-register; no `plugin.json` edit needed.
- `CLAUDE.md` is the authoritative contributor-guidance file; read before any command/skill/agent edit.
- Do NOT bump `plugin.json` version in feature work; record changes under `## [Unreleased]` in `CHANGELOG.md`.
- Changes are tracked under `openspec/changes/<id>/` following the eight-stage QRSPI workflow.

## Slash-command surface

Nine stage commands: `questions.md`, `research.md`, `design.md`, `structure.md`, `slices.md`, `plan.md`, `implement.md`, `pr.md`. Helper commands: `status.md`, `archive.md`, `followup.md`. Additional commands: `init.md`, `update.md`, `stack.md`, `retro.md`, `structure.md` (already listed).

Common interface pattern: `$ARGUMENTS` interpolated for change id and optional description. All stage commands: YAML frontmatter with `description:`. `archive.md` adds `agent: build`.

Check 9 hard-codes the nine command stems that must carry the version-check embed (`VERSION_CHECK_COMMAND_STEMS`).

Check 4 enforces forward + reverse README coverage for all `claude/commands/*.md` files.

## Stage-agent surface

Nine stage agents in `claude/agents/`: `researcher.md`, `questioner.md`, `designer.md`, `architect.md`, `planner.md`, `implementer-low.md`, `implementer-medium.md`, `implementer-high.md`, `reviewer.md`. Plus helper agent `spec-syncer.md`.

Each agent must have: `name:`, `description:`, `model:` alias, `effort:` value; a `> **Read contract**` banner; a `> **Output contract**` banner.

Skill-set registry (`SKILL_SET_EXPECTED`) maps each stage-agent stem to its approved skill list. Researcher loads: `context-hygiene`, `repo-surface`, `workflow`.

## Skill surface

Kit-shipped skills under `claude/skills/`: `qrspi-version-check`, `context-hygiene`, `repo-surface`, `workflow`, `openspec-workflow`, `vertical-slice`, `implementer-core`, `postpr-fix`, `openspec-archive-change`, `openspec-sync-specs` (generated), plus others. Each must have `name:` and `description:` frontmatter.

Check 2b validates that agent `Load skills` lines reference only skills in the approved registry (filtered by `-stack` suffix). Check 2 validates each backtick-wrapped skill reference resolves to a real directory.

## Lint-gate surface

`scripts/lint.mjs` -- 19 checks, Node.js built-ins only, exits 0/1. `scripts/skill-sets.mjs` -- shared registry. `scripts/context-footprint.mjs` -- report-only, always exits 0.

CI runs `node scripts/lint.mjs`. No watch mode. No separate build step.

## Template surface

`openspec-templates/`: `questions.template.md`, `design.template.md`, `proposal.template.md`, `tasks.template.md`, `spec-delta.template.md`, `research.template.md`. Check 3 enforces heading alignment between each template's canonical headings and the corresponding agent's inline skeleton.

## Migration manifest

`migrations/` -- per-version YAML manifests. Floor at `0.6.0` (hardcoded in lint.mjs). Check 6 asserts presence for all CHANGELOG `## [X.Y.Z]` sections at or above floor, schema validity, and marker format. `openspec/.qrspi-version` is the repo marker file; must be bare SemVer if present.

## Notable discrepancies

- The `context-hygiene` skill's `## Mechanism backing the 40%/60% principle` section names Check 2b as "`checkSkillSets` (Check 2b)" -- this label is not visible in the lint.mjs inline comment header, which labels it as "Check N (skill-sets)" before the `checkSkillSets` function. The function name `checkSkillSets` is correct; "Check 2b" refers to its position as a sub-check of Check 2.
- `archive.md` has `agent: build` frontmatter. Check 5 (GATE-TOOL / EXECUTOR AGREEMENT) would normally flag a non-builtin `agent:` that reaches AskUserQuestion, but `build` is listed in `BUILTIN_AGENTS` (alongside `agent`), so it is exempt.
- `status.md` carries the version-check step (step 1) but NOT a run-mode step. It is included in Check 9's `VERSION_CHECK_COMMAND_STEMS` list. It does not follow the two-item preamble convention of the eight stage commands.
- `followup.md` and `archive.md` are NOT in Check 9's `VERSION_CHECK_COMMAND_STEMS` -- they are exempt from the version-check embed requirement.

## Implicit contracts and conventions

- **Step ordering is lint-enforced at Check 9.** The exact sentence `Load skill \`qrspi-version-check\` and follow its instructions exactly.` must appear (whitespace-collapsed) in each of the nine command files. Any new command added to that list must include it.
- **Session flag mechanism is purely conversational.** Both the version-check flag and the run-mode live in the orchestrator's conversational context with no disk backing. They are re-established on every new session. This is the "disposable orchestrator context" design.
- **Run-mode is never written to disk.** The workflow skill explicitly states: "Record the chosen mode in context for the remainder of this session." This is the single statement of the design; there is no file-backed run-mode.
- **All stage commands follow two-step preamble before any work.** This is structural convention; Check 9 enforces only step 1. Step 2 is not lint-checked.
- **`archive.md` and `followup.md` are structurally distinct from stage commands.** Neither has run-mode or version-check steps; neither follows the "Return Final message format" pattern; neither uses the canonical four-procedure choreography.
- **No live harness signal exists for context-window state.** The 40%/60% thresholds in `context-hygiene` are backed by static lint checks (Check 2b, Check 12) and a static file-size reporter (`context-footprint.mjs`), not by a live context-window API.
- **Check 9 is hard-coded to nine command stems.** Adding a new stage command requires updating `VERSION_CHECK_COMMAND_STEMS` in `lint.mjs` or it will not be required to carry the embed.
- **The `SKILL_SET_EXPECTED` registry is the single source of truth** for which skills each stage agent loads (Check 2b and `context-footprint.mjs` both import it). Changes to agent skill loads require updating `skill-sets.mjs`.
- **Backlog atomicity: no disk state tracks stage transitions mid-flow.** The only state persisted to disk is the OpenSpec change-folder artifacts and the backlog row. Stage hand-offs within a chained session use only conversational context.

## Open gaps

- [ ] Could not determine: which specific files in `claude/agents/` carry the skill-set load for researcher (the exact wording of step 1 in the researcher agent was not read -- only `skill-sets.mjs` was consulted for the skill list). The researcher agent file itself was not read.
- [ ] Could not determine: whether any command or skill files introduced after `0.10.0` (the installed release) exist in the working tree that were not in the files read -- the working tree matches the last commit per git status (clean).
- [ ] Need human input on: whether the `context-hygiene` skill's operational checklist ("Am I past 40%?") is intended to be read literally as a self-check the orchestrator performs, or as documentation of the principle (no mechanism enforces it at runtime).
