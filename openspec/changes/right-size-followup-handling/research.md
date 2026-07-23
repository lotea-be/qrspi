# Research — right-size-followup-handling

> Stage R of QRSPI. Generated 2026-07-23.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Post-PR fix loop mechanics:** `claude/commands/followup.md` and `claude/skills/postpr-fix/SKILL.md` — end-to-end flow, subagent invocation, fix checklist, model selection, per-invocation constraint.
- **`followups.md` artifact lifecycle:** How `followups.md` is seeded, checkbox/annotation format, item-ticking, archival invariant — traced across `claude/commands/pr.md`, `claude/skills/postpr-fix/SKILL.md`, `claude/commands/archive.md`.
- **Backlog conventions:** `openspec/backlog.md` structure, status vocabulary, section grouping, priority bands, row format, and the "Promote to backlog idea" flow in `claude/commands/pr.md`.
- **Change-folder & change-id conventions:** `openspec/changes/<id>/` layout, kebab-case verb-first rule, bootstrapping in `claude/commands/questions.md`, and archived precedents under `openspec/changes/archive/`.
- **Run-mode gate mechanics:** Full / Semi / Manual procedure and the never-suppressed gates enumeration in `claude/skills/workflow/SKILL.md`.
- **Stage-command → subagent delegation & pipeline re-entry:** How `claude/commands/*.md` orchestrators spawn subagents via the Agent tool, `subagent_type` naming, next-stage handoff pattern, and per-stage read-contract table.
- **Copilot sync surface:** `sync-copilot.mjs`, the `agentFor` mapping table, which copilot artifacts mirror the followup command and postpr-fix skill, and known fidelity gaps.
- **Lint structural checks:** `scripts/lint.mjs` — enumeration of all nine checks and how a new check is typically added.

---

## File map

### Post-PR fix loop mechanics

- `claude/commands/followup.md` — Main-loop orchestrator for the post-PR fix loop. Parses `$ARGUMENTS` (change id + optional specific fix description). Runs three Glob-based precondition checks. Defaults implementer model to sonnet; escalates to opus for design-level or multi-file fixes. Spawns `qrspi:implementer` via Agent tool in FIX MODE. Issues one mandatory `AskUserQuestion` gate before committing. Enforces one-follow-up-per-invocation constraint explicitly in its final sentence. Exports no QRSPI artifact itself; commit is `fix(<id>): <summary>`.
- `claude/skills/postpr-fix/SKILL.md` — Loaded by the implementer subagent when in FIX MODE. Defines what counts as a post-PR fix vs. new scope. Enumerates the two sources of fixes (reviewer open issues, retro code flags). Provides the seven-step fix checklist. Defines `followups.md` format. Provides the final message format the implementer must return. Defines three guardrails for when to stop rather than fix.

### `followups.md` artifact lifecycle

- `claude/commands/pr.md` — Seeds `followups.md`. After the reviewer subagent runs, if reviewer's "Open issues found" count > 0, the orchestrator writes `openspec/changes/<id>/followups.md` using the format from skill `postpr-fix`. If reviewer found zero open issues, the file is not created. Also runs the "Follow-ups pass" (reconciliation gate) before spawning the reviewer: reads any existing `followups.md` and, for each `- [ ]` line, presents four choices: Fix now / Defer / Drop / Promote to backlog idea. Drop changes `- [ ]` to `- [x] <text> (dropped -- no longer needed)`. Promote appends a row to `openspec/backlog.md` under `## Ideas` and changes entry to `- [x] <text> (promoted to backlog)`. Defer leaves the entry un-ticked. The `followups.md` path is staged in the PR-stage commit: `git add openspec/changes/<id>/pr.md openspec/backlog.md openspec/changes/<id>/followups.md`.
- `claude/skills/postpr-fix/SKILL.md` — Governs item ticking: step 4 of the fix checklist ticks the resolved box in `followups.md` (and any matching `tasks.md` box). Annotation format for a resolved item is `- [x] **<title>.** ... (source: ...) — fixed in <short-sha>`. The file header says "every box should be ticked before archival."
- `claude/commands/archive.md` — Step 2 performs an inform-only (non-blocking) sanity check: if `openspec/changes/<id>/followups.md` exists with un-ticked `- [ ]` boxes, the command surfaces that those post-PR follow-ups should be resolved before archiving. This is explicitly "inform, don't hard-block."

#### `followups.md` format (from skill `postpr-fix`)

```markdown
# Follow-ups — <id>

> Post-PR fix queue. Each box is a code-level issue raised after the PR was
> opened (reviewer "Open issues" or a retrospective code flag). Resolve with
> `/qrspi:followup <id>`. This file is archived with the change; every box should
> be ticked before archival.

- [ ] **<short title>.** <what's wrong; `file:line`; suggested fix.> (source: PR review | retro <stage>)
- [x] **<resolved title>.** ... (source: ...) — fixed in <short-sha>
```

### Backlog conventions

- `openspec/backlog.md` — Single file at the root of `openspec/`. Contains four ordered sections (`## In progress`, `## Proposed`, `## Ideas`, and an implicit `## Merged` — though archived rows are deleted, not moved to Merged).

**Section grouping (as currently structured in `openspec/backlog.md`):**
- `## In progress` — changes that are active in the QRSPI pipeline.
- `## Proposed` — changes with a folder created, awaiting or in early QRSPI stages.
- `## Ideas` — candidate changes not yet initiated. The preamble states "Listed in priority order (highest first)."

**Row format:** Single `###` heading: `### <id> — \`<status> (<note>)\` · **P<N>**` followed immediately by a `**Why:**` paragraph and optionally a `**Likely shape (after Q):**` paragraph. No separate `Status:` or `Next QRSPI command:` body line.

**Status vocabulary:** `idea` / `proposed` / `in-progress` / `merged` (as named in the `workflow` skill). In practice the backlog currently uses backtick-wrapped notes on the heading line rather than bare status words — e.g. `` `proposed (change folder created 2026-07-23)` ``.

**Priority bands:** `P1` = correctness/safety of the live workflow or highly visible defect; `P2` = high-value enhancements, larger or lightly dependent; `P3` = strategic bets or items sequenced behind another change. Priority is the suffix on the heading line: `· **P1**` / `· **P2**` / `· **P3**`.

**Atomic-commit rule (from `claude/skills/workflow/SKILL.md`):** "Always commit the backlog edit in the same commit as the state change it reflects — never as a separate follow-up." Stages Q (idea→proposed), final I slice (proposed→in-progress), and PR (note update) flip status; Q/D/S may additionally add new `idea` rows. Archive removes the row atomically with the folder move.

**"Promote to backlog idea" flow** (in `claude/commands/pr.md`, follow-ups pass): The orchestrator appends one new idea row to `openspec/backlog.md` under `## Ideas`, matching the file's existing format (level-3 heading with kebab-slug + status label + priority band, followed by a `**Why:**` paragraph). It uses `idea` as the status and `P3` as the default priority band; derives the slug from the follow-up title. Then changes the `followups.md` entry from `- [ ]` to `- [x] <text> (promoted to backlog)`. Both edits are staged for the final commit.

### Change-folder & change-id conventions

- `openspec/changes/<id>/` — One folder per in-flight change. Contents in order of creation: `questions.md` (Q), `research.md` (R), `design.md` (D), `proposal.md` + `specs/<capability>/spec.md` (S), `slices.md` (V), `tasks.md` (P), then `pr.md` and `followups.md` (PR stage). The `specs/` subdirectory holds delta specs per capability.
- `openspec/changes/archive/` — Archived changes land here with format `YYYY-MM-DD-<id>/`.

**Change-id rule (from `claude/skills/openspec-workflow/SKILL.md`):** "`<change-id>` is kebab-case and starts with a verb: `add-question-voting`, `switch-to-azure-ad`, `seed-dummy-users`."

**Bootstrapping:** `claude/commands/questions.md` step 3 creates `openspec/changes/<id>/` if it does not already exist. The branch is named `features/<id>` by default (from the stack-cheatsheet, or that default if unspecified).

**Archived precedents** (from `ls openspec/changes/archive/`):
```
2026-06-19-example-greeting
2026-06-19-kit-quality-hardening
2026-06-19-reconcile-plan-worktree-order
2026-06-21-verify-stage-gate-execution
2026-07-06-add-auto-mode
2026-07-15-archive-requires-merged-pr
2026-07-15-tighten-stage-read-boundaries
2026-07-15-versioned-update-command
2026-07-16-progressive-task-ticking
2026-07-22-pr-review-open-tasks-and-followups
2026-07-23-session-version-check-and-update-prompt
```
All archived ids are kebab-case verb-first (or noun-phrase for the example). No suffix-named sibling ids exist (no `<id>-v2` or `<id>-addendum` pattern is present in the archive).

Currently one in-flight change folder: `openspec/changes/right-size-followup-handling/` (contains only `questions.md` at research time).

### Run-mode gate mechanics

Source: `claude/skills/workflow/SKILL.md`, section "Run-mode (Full / Semi / Manual)" and "Never-suppressed gates".

**Exact wording of the never-suppressed gates enumeration:**

> **Never-suppressed gates (all modes).** The following gates are NEVER suppressed in Full auto, Semi-auto, or Manual:
>
> - **The D review** (open-questions pass + decision-by-decision approval + final "Ready to proceed?" confirmation) is a sanctioned pause. It is NOT suppressed in any mode. Full auto pauses here and the human completes the review before the chain continues.
> - **Backlog-capture offers** in Q, D, and S are NEVER suppressed in any mode. The "offer, never auto-append" rule (AskUserQuestion per item, one at a time) holds regardless of mode. These remain interactive AskUserQuestion calls. "Full auto pauses only at Q and D" is shorthand; the backlog-capture offers in Q, D, and S are the deliberate additional exception.

**Run-mode establishment:** At the top of a fresh stage invocation, the orchestrator uses AskUserQuestion with three choices:
- "Full auto — chain Q→PR, pause only at Q, D, backlog offers, hard-stops"
- "Semi-auto — auto-advance within-stage gates, pause at each stage boundary"
- "Manual — pause at every gate (today's behaviour)"

In Full auto, after the commit step, the orchestrator re-enters `/qrspi:<next> <id>` immediately as a slash command. In Semi-auto, it first asks one AskUserQuestion at the stage boundary. In Manual, it always asks.

**Hard-stop procedure:** Four enumerated conditions — (1) failing precondition check, (2) `git commit` or `git push` non-zero exit, (3) subagent returning error or blocked signal, (4) execution-stage output materially diverging from approved `design.md` or spec. The PR reconciliation gate (tasks pass + follow-ups pass in `pr.md`) triggers a hard-stop in Full/Semi-auto when open items are found — framed as a conditional application of condition (3).

### Stage-command → subagent delegation & pipeline re-entry

**General pattern** (from `claude/skills/workflow/SKILL.md` "Stage choreography"):

Each QRSPI stage command (`claude/commands/*.md`) runs on the main loop as an orchestrator. It:
1. Runs the precondition check (Glob-based).
2. Spawns the stage's subagent via the **Agent tool** with `subagent_type: qrspi:<role>` (e.g. `qrspi:researcher`, `qrspi:implementer`).
3. Runs the commit step (explicit `git add` + `git commit` + `git push`).
4. Runs the next-stage handoff: re-enters `/qrspi:<next> <id>` as a slash command on the main loop.

The handoff is always via slash command re-entry, **never** by spawning the next stage as a subagent. The workflow skill states: "Re-entry is always the slash command — never spawn the next stage as a subagent (that would bypass its gates and break the ticket-blind Research invariant)."

**`subagent_type` naming observed across command files:**
- `qrspi:questioner` (questions.md)
- `qrspi:researcher` (research.md)
- `qrspi:implementer` (followup.md, implement.md)
- `qrspi:reviewer` (pr.md)
- No `subagent_type` at all for archive.md (delegates to a skill, not a named QRSPI subagent) or for commands with `agent: build` frontmatter.

**Per-stage read-contract table** (from `claude/skills/workflow/SKILL.md`, "Read Matrix"):

| Stage | Agent | Reads (within-change) |
|-------|-------|-----------------------|
| R  | researcher  | none — whole `changes/<id>/` folder banned |
| Q  | questioner  | backlog + templates (no change-folder artifact) |
| D  | designer    | `questions.md`, `research.md` |
| S  | architect   | `design.md` |
| V  | architect   | `proposal.md`, `specs/` |
| P  | planner     | `slices.md` |
| I  | implementer | `tasks.md` |
| PR | reviewer    | full `changes/<id>/` folder (by design) |

Cross-change boundary: no agent may read another change's process artifacts (questions.md, research.md, design.md, proposal.md, slices.md, tasks.md, pr.md, followups.md). `spec.md` files are the sole exception.

Lint Check 7 (`checkReadContracts` in `scripts/lint.mjs`) mechanically asserts each stage agent's `> **Read contract**` banner `Reads:` field matches the read matrix.

### Copilot sync surface

- `sync-copilot.mjs` — Drops and recreates `copilot/` entirely each run. Three output directories: `copilot/agents/`, `copilot/prompts/`, `copilot/instructions/`.

**`agentFor` mapping table** (hardcoded in `sync-copilot.mjs`, lines 34–40):
```javascript
const agentFor = {
  'qrspi-questions': 'questioner', 'qrspi-research': 'researcher',
  'qrspi-design': 'designer', 'qrspi-structure': 'architect',
  'qrspi-slices': 'architect', 'qrspi-plan': 'planner',
  'qrspi-implement': 'implementer', 'qrspi-followup': 'implementer',
  'qrspi-pr': 'reviewer',
};
```

Keys not in `agentFor` (e.g. `qrspi-stack`, `qrspi-retro`, `qrspi-status`) get `agent: agent` (Copilot's generic built-in).

**Artifacts mirroring `claude/commands/followup.md`:**
- `copilot/prompts/qrspi-followup.prompt.md` — Generated from `claude/commands/followup.md`. Frontmatter: `agent: copilot-implementer`. Contains all the same logic with standard rewrites applied (`$ARGUMENTS` → `${input}`, `/qrspi:` → `/qrspi-`, skill-load phrases rewritten to "Consult the instructions for", `AskUserQuestion` → `#tool:vscode/askQuestions`).

**Artifacts mirroring `claude/skills/postpr-fix/SKILL.md`:**
- `copilot/instructions/postpr-fix.instructions.md` — Generated from `claude/skills/postpr-fix/SKILL.md`. Same rewrites applied.

**Agent files:** `claude/agents/*.md` → `copilot/agents/copilot-<stem>.agent.md`. The implementer maps to `copilot/agents/copilot-implementer.agent.md`.

**Command → prompt mapping:** `claude/commands/<stem>.md` → `copilot/prompts/qrspi-<stem>.prompt.md` (re-adds `qrspi-` prefix since Copilot prompts are unnamespaced). The exception: `claude/commands/qrspi-sync-copilot.md` is explicitly skipped (line 288: `if (base === 'qrspi-sync-copilot') continue`).

**Known fidelity gaps recorded in `sync-copilot.mjs`:**
1. **Per-slice model selection** — the implement command has a per-file fixup (`applyFixups`) that replaces the Agent-tool model-delegation logic with a manual "tell the user to pick a strong reasoning model in the model picker" message, since Copilot has no per-subagent model override.
2. **Delegation verbs** — "invoke the X subagent" is rewritten to "continue as the X" because Copilot prompts run inside an agent context, not as an outer orchestrator.
3. **AskUserQuestion** → `#tool:vscode/askQuestions` (structural tool replacement).
4. **`subagent_type` naming** — `agentFor` and the `copilot-` prefix transform `qrspi:implementer` references to `copilot-implementer`.
5. **`agentFor` vs. command body cross-check** — No automated assertion that `agentFor` entries match the `subagent_type` named in each command body. Noted as an open gap in `openspec/backlog.md` (`agentFor-frontmatter-crosscheck` idea, P3): "sync-copilot.mjs's hardcoded `agentFor` table and the Claude command's declared subagent are parallel representations of the same delegation with no automated cross-check."

### Lint structural checks

- `scripts/lint.mjs` — Node.js script; no npm dependencies. Collects all errors before exit; exits 0 (all pass) or 1 (any violation). Nine checks, run in order:

**Check 1 — Pin agreement** (`checkPinAgreement`): Every occurrence of the OpenSpec version pin (`@fission-ai/openspec@<version>` or `openspec_version: <version>`) across all hand-maintained files must agree on a single version. Excludes `openspec/changes/` subtree and `generatedBy:` lines in `claude/skills/openspec-*/` files. Fails if zero occurrences are found or if multiple distinct versions are found.

**Check 2 — Frontmatter / name resolution** (`checkFrontmatter`): Every agent file must have `name:` and `description:`; every command file must have `description:`; every skill SKILL.md must have `name:` and `description:`. `agent:` references in commands must resolve to `claude/agents/<stem>.md` (builtin values `build` and `agent` are exempt). `model:` fields must use aliases (`opus`/`sonnet`/`haiku`), not pinned model ids. `Load skill` / `load the X skill` backtick references must resolve to a real `claude/skills/<X>/` directory.

**Check 3 — Heading alignment** (`checkHeadingAlignment`): Canonical section headings from each `openspec-templates/*.template.md` must appear in the corresponding agent file. Defined statically: `questions.template.md` → questioner (10 headings); `design.template.md` → designer (4 headings); `proposal.template.md` → architect (4 headings); `tasks.template.md` → planner (no fixed headings — dynamic format, skipped); `spec-delta.template.md` → architect (3 ADDED/MODIFIED/REMOVED headings).

**Check 4 — README command coverage** (`checkReadmeCoverage`): Bidirectional — every `claude/commands/<stem>.md` must appear as `/qrspi:<stem>` in `README.md`, and every `/qrspi:<token>` in `README.md` must resolve to an existing command file.

**Check 5 — Gate-tool / executor agreement** (`checkGateExecutor`): Commands with a non-builtin `agent:` in frontmatter must not reach `AskUserQuestion` (the only main-loop-only tool) directly or transitively (via the workflow choreography — detected by co-presence of backtick-wrapped `` `workflow` `` reference and choreography marker strings `Stage choreography`, `commit step`, `next-stage handoff`).

**Check 6 — Migration manifest presence + schema + marker format** (`checkMigrationManifests`): Three sub-checks: (a) every `CHANGELOG ## [X.Y.Z]` at or above the floor version `0.6.0` must have a `migrations/<version>.yaml`; (b) each manifest must be schema-valid (required keys: `version`, `summary`, `automated`, `manual`; `automated[].action` must be `edit-file`; `automated[].path` must start with `openspec/`); (c) `openspec/.qrspi-version` if present must be bare SemVer `X.Y.Z`.

**Check 7 — Read-contract banner agreement** (`checkReadContracts`): Each of the seven stage agent files must carry a `> **Read contract** — Reads: ... Never opens: ...` banner whose `Reads:` field exactly equals the expected value from the read matrix. Expected values are hardcoded in `READ_CONTRACT_EXPECTED`. The architect's two-mode `Reads (S): design.md. Reads (V): proposal.md, specs/.` form and the reviewer's `Reads: full changes/<id>/ folder (by design).` are handled as special cases.

**Check 8 — PR reconciliation passes structure** (`checkPrReconciliationPasses`): `claude/commands/pr.md` must contain specific structural anchors: `## Tasks pass` heading and choice labels `Finish it now`, `Drop -- no longer needed`, `Pause --`; `## Follow-ups pass` heading and choice labels `Fix now`, `Defer --`, `Promote to backlog`.

**Check 9 — Version-check embed** (`checkVersionCheckEmbed`): The nine stage command files (status, questions, research, design, structure, slices, plan, implement, pr) must each contain the literal line `Load skill \`qrspi-version-check\` and follow its instructions exactly.`

**How a new structural check is added** (inferred from the existing pattern): (1) Add a new `async function check<Name>(errors)` that pushes violation strings to `errors[]` and writes an `OK:` stdout line on success; (2) Add a call to it in `main()` with a `process.stdout.write('Check N: ...\n')` header; (3) Update the file's header comment (lines 6–51) to enumerate the new check. The function accepts the shared `errors` array; it pushes strings for violations and returns the violation count. No test framework — it is a standalone Node script.

---

## Public API surface

This is a prompt-engineering / docs repo. There is no HTTP API. The "public surface" is the set of slash commands a consumer invokes and the skills an agent loads.

**Slash commands (from `claude/commands/`):**
- `/qrspi:followup <id> [description]` — post-PR fix loop; spawns implementer in FIX MODE
- `/qrspi:pr <id>` — PR stage; runs tasks pass, follow-ups pass, spawns reviewer, seeds `followups.md`
- `/qrspi:archive [id]` — archive flow; PR-merge gate + folder move + backlog row removal
- `/qrspi:questions`, `/qrspi:research`, `/qrspi:design`, `/qrspi:structure`, `/qrspi:slices`, `/qrspi:plan`, `/qrspi:implement`, `/qrspi:status`, `/qrspi:stack`, `/qrspi:retro`, `/qrspi:init`, `/qrspi:update`

**Skills loaded by the followup flow:**
- `postpr-fix` — loaded by the implementer subagent when in FIX MODE
- `workflow` — loaded by stage agents for choreography procedures
- `openspec-workflow` — loaded at Q stage for folder layout
- `context-hygiene` — referenced in skill; one follow-up at a time
- `retrospective` — routes code flags into `followups.md` (distinct from `followup.md`)

---

## Data model

All "data" is markdown files. Key artifacts:

- `openspec/changes/<id>/followups.md` — Checkbox list. Created by PR stage (conditionally). Items: `- [ ]` un-resolved; `- [x]` resolved, dropped, or promoted. Annotations: `(source: PR review | retro <stage>)` on creation; `— fixed in <short-sha>` on resolution; `(dropped -- no longer needed)` on drop; `(promoted to backlog)` on promote.
- `openspec/changes/<id>/pr.md` — Six-field markdown record: `PR: #<N>`, `URL:`, `Title:`, `Source branch:`, `Target branch:`, `Created: <YYYY-MM-DD>`. Presence is the gate condition checked by `/qrspi:followup` (precondition 2) and `/qrspi:archive` (hard-stop gate).
- `openspec/backlog.md` — Flat file with `##` section headers and `###` item headings. Each item heading is a single line carrying id, status (backtick-wrapped note), and priority band.

---

## Implicit contracts and conventions

1. **One follow-up per `/qrspi:followup` invocation.** The last sentence of `claude/commands/followup.md` states: "One follow-up per invocation. Re-running `/qrspi:followup <id>` picks up the next un-ticked item." The skill (`postpr-fix`) also says "Do **one follow-up at a time**."

2. **No fix without `pr.md`.** `/qrspi:followup` precondition 2 requires `openspec/changes/<id>/pr.md` to exist; absence routes the user to `/qrspi:implement` instead.

3. **Implementer is reused in two modes.** The same `qrspi:implementer` subagent handles both stage I (slice mode) and the post-PR fix loop (FIX MODE). The invoking command tells it which mode explicitly. The model selection differs: slice mode reads the `**Model:**` annotation; fix mode defaults to sonnet, escalates to opus explicitly.

4. **Delta spec only — never base spec.** The fix checklist step 3 and the `followup.md` orchestrator both state: "sync the DELTA spec (never the base `openspec/specs/**`)." The base spec is only touched at archive time by `/qrspi:archive` via the `openspec-archive-change` skill.

5. **`followups.md` seeded conditionally.** The PR stage creates `followups.md` only if reviewer found open issues (count > 0). If the reviewer found zero issues, no file is created.

6. **Archival inform vs. hard-block.** `/qrspi:archive` step 2 (un-ticked followups) is inform-only; step 3 (PR not merged) is a hard-block. The distinction is explicit in the archive command text.

7. **Commit message convention.** Post-PR fixes use `fix(<id>): <summary>` (Conventional Commits). Stage artifacts use `docs(<id>): add <artifact>` or `docs(<id>): record PR #<N> link`. Archive uses `chore(<id>): archive change + remove backlog row`.

8. **Backlog row is deleted on archive, not moved to `merged`.** The archive command step 5 states: "Edit `openspec/backlog.md` and delete the `<id>` row's heading and body entirely — the row disappears rather than flipping to a `merged` status."

9. **`agentFor` table in `sync-copilot.mjs` is a parallel representation of delegation** with no automated cross-check against command bodies. This is a known gap recorded in `openspec/backlog.md`.

10. **Lint Check 5 (gate-tool / executor)** prevents a command with a non-builtin `agent:` frontmatter from having an `AskUserQuestion` gate — this is why stage commands (which use `AskUserQuestion`) must have no `agent:` frontmatter (they run as main-loop orchestrators, not as subagents). The `followup.md` command has no `agent:` frontmatter, consistent with this rule.

11. **Lint Check 8 asserts follow-ups pass structural anchors.** The follow-ups pass section headings and choice labels (`Fix now`, `Defer --`, `Promote to backlog`) are mechanically checked by the lint. Any rename of these labels would break CI.

---

## Open gaps

- [ ] The `claude/skills/retrospective/SKILL.md` was not read. The skill's exact mechanism for routing code flags into `followups.md` (vs. prompt flags into governing files) was not confirmed from primary source — only its role was described by `postpr-fix/SKILL.md`.
- [ ] The `claude/agents/questioner.md`, `designer.md`, `architect.md`, `planner.md`, and `reviewer.md` files were not opened. Their read-contract banners and inline skeletons are known only from lint's `READ_CONTRACT_EXPECTED` map and the heading-alignment check's `TEMPLATE_CANONICAL_HEADINGS` map.
- [ ] No `openspec/specs/` base spec files exist that are relevant to the followup flow — the capability has no delta spec yet. Confirmed by directory structure.
- [ ] The `claude/skills/context-hygiene/SKILL.md` was not read. Its full "one follow-up at a time" guidance text is unconfirmed beyond the reference in `postpr-fix/SKILL.md`.
- [ ] The `claude/skills/qrspi-version-check/SKILL.md` was not read. Its exact behavior (what it checks, what it does on version mismatch) is unconfirmed beyond its embed requirement in Check 9.
- [ ] Whether `claude/commands/followup.md` currently has any version-check embed line was not confirmed — the file was read but Check 9's list (`VERSION_CHECK_COMMAND_STEMS`) does not include `followup`, so no embed is required or expected for this command.
