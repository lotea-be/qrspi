# Research — emit-changelog-task-and-pr-triage

> Stage R of QRSPI. Generated 2026-09-19.
> Ticket is hidden from this stage by design.

## Areas investigated

- Planner agent & plan command: how `planner.md` translates `slices.md` into `tasks.md`; cross-cutting task emission; divergence self-check wording; how `plan.md` orchestrates the delegation.
- Tasks artifact shape & `(human)` checkpoint convention: canonical `tasks.md` header grammar, group/item numbering, `(human)` tag placement and PR-stage treatment.
- PR-stage command: end-to-end `pr.md` — follow-up seeding, draft-vs-ready PR-create, backlog link recording.
- Post-PR fix & choreography skills: `postpr-fix` fix-vs-new-scope rubric; commit-step wording in `stage-choreography`.
- Git-host / PR-create vendor resolution: `git-host-workflow` skill vendor lookup table and draft-ness.
- Lint gate structure: `scripts/lint.mjs` Checks 1–24 names, tasks.md/CHANGELOG scan helpers, how a new check is registered.
- CHANGELOG convention & where it is mandated: `CLAUDE.md` rule, `CHANGELOG.md` current structure, `## [Unreleased]` convention.
- Migration manifest / consumer update: `migrations/` contents, schema consumed by `qrspi-update`, step kinds, versioning rule.

---

## File map

### Area 1 — Planner agent & plan command

- `claude/agents/planner.md` — Stage-P subagent. Reads `slices.md` only (Read contract banner). Writes `openspec/changes/<id>/tasks.md`. Tools: Read, Write, Bash, Glob, Grep, Skill. Model: sonnet. Effort: medium.
  - **Translation logic.** For each slice bullet in `slices.md`, produces one `## N. <slice name>` group. The `**Compute:**` annotation is carried verbatim (dash-bullet → bare-bold paragraph form). `(D<n>)` back-references on slice bullets are forwarded to the matching task lines. Surface-gated task lines (data-store / http-api / ui) are emitted conditionally per `repo-surface` skill.
  - **Cross-cutting / housekeeping tasks.** No explicit mechanism for cross-cutting tasks not derived from a slice. An optional `## N. Quality gate` / `## N. Final verification` group is permitted at the end as a numbered group (documented in `tasks.template.md`).
  - **Divergence self-check.** The planner self-checks its output against the divergence rubric in skill `workflow` ("Divergence rubric — hard-stop condition 4") before returning. If the task list invents work that changes or drops a decision or delta requirement, it must NOT commit and must surface the divergence. Immaterial elaboration (granularity, ordering, wording) is NOT a divergence.
  - **Blocked signal.** If a `slices.md` entry is missing the `**Compute:**` annotation, the planner stops and tells the user the slices file must be fixed before the plan can be written. If a slices entry is ambiguous, an "Open questions" section is added at the top of `tasks.md` and the planner stops.
  - **Loads.** `workflow`, `vertical-slice`, `repo-surface`, plus the project's stack-cheatsheet skill.
  - **Final message format.** `Wrote: openspec/changes/<id>/tasks.md`, slice count, total task count, next-stage line.

- `claude/commands/plan.md` — Stage-P orchestrator command. No `agent:` frontmatter (main-loop). Takes `$ARGUMENTS` as change id.
  - **Step 1.** Loads `qrspi-version-check` (silent).
  - **Step 2.** Loads `context-budget-gate`.
  - **Step 3.** Loads `stage-choreography`, establishes run-mode.
  - **Precondition.** Glob `openspec/changes/<id>/slices.md`; on failure points user at `/qrspi:slices`.
  - **Delegation.** Spawns `planner` subagent via Agent tool (`subagent_type: qrspi:planner`, `model: sonnet`). Passes change id; requests file path + 5-bullet summary.
  - **Backlog note.** Plan does not flip the backlog row status; the row stays as Q left it until the Implement stage's final slice.
  - **Commit message.** `docs(<id>): add tasks.md (QRSPI stage P)`
  - **Git add.** `git add openspec/changes/<id>/tasks.md`
  - **Next-stage.** `/qrspi:implement <id>`

### Area 2 — Tasks artifact shape & `(human)` checkpoint convention

- `openspec-templates/tasks.template.md` — Canonical shape for `tasks.md`. Single source of truth for the Plan stage.
  - **Header.** `# Tasks — <change-id>` then `> Stage P of QRSPI. Tick boxes as you implement. Order matters.`
  - **Group heading grammar.** `## N. <slice name>` with a numeric `N` (1, 2, 3 …). No `Slice`, `A/B/C`, or other prefix allowed.
  - **Item grammar.** `- [ ] N.M <task text>` where `N.M` matches the group number; numbered consecutively within the group.
  - **`**Compute:**` placement.** Immediately after the group heading, bare-bold paragraph form. Carries `effort=<low|medium|high>` (required) and `model=<alias>` (optional, defaults to sonnet). Carried verbatim from `slices.md`; never re-derived.
  - **`(D<n>)` back-references.** Appended to individual task lines where the task implements a named design decision. Source is `slices.md`, not `design.md`. Multiple decisions: `(D<n>, D<m>)`. Omitted for scaffolding/migration tasks with no decision.
  - **`(human)` tag.** Added as a prefix after the id: `- [ ] N.M (human) <task text>`. Used for any task the implementer cannot perform itself — interactive verification, manual dogfood run, anything needing a UI or session the subagent cannot reach.
  - **Implementer behavior on `(human)` tasks.** The implementer leaves `(human)` boxes unticked and surfaces them at the final checkpoint as human-run verification pending. They do NOT block agent-executable tasks.
  - **PR-stage behavior on `(human)` tasks.** The PR command's tasks pass separates un-ticked items into "Regular tasks" and "Human tasks" (`(human)` tag present). Human-task loop presents each with: `Confirm-done / Drop / Leave-for-now` choices. A `Leave-for-now` box may remain open at PR time (sanctioned exception) and is noted by the reviewer as an expected open item, not a blocking issue.
  - **Ticked/dropped annotation.** Regular tasks dropped during tasks pass: `- [x] ~~N.M <text>~~ (dropped)`. Human tasks confirmed: `- [x] N.M <text>` (no annotation). Human tasks dropped: `- [x] ~~N.M <text>~~ (dropped)`.
  - **Optional quality gate group.** A `## N. Quality gate` / `## N. Final verification` trailing group is permitted; it is still a numbered group.

  Observed patterns in archived `tasks.md` files:
  - `(human)` tasks appear at checkpoint positions (end of slices or at specific verification steps) for dogfood runs, `AskUserQuestion` gate verification, lint checks, and PR stage observations.
  - `(human)` tasks are frequently verified via static walkthrough annotations in the ticked form (e.g. `— *Verified via static walkthrough*`) when true live runtime is not feasible, particularly for changes affecting the QRSPI kit itself.
  - No lint check validates the `(human)` tag content or its position; it is a prose convention enforced by the template and agent instructions only.

### Area 3 — PR-stage command

- `claude/commands/pr.md` — Stage-PR orchestrator command. No `agent:` frontmatter (main-loop). Takes `$ARGUMENTS` as change id.
  - **Precondition (two parts).** (1) Glob `openspec/changes/<id>/tasks.md`; on failure tells user to start from `/qrspi:questions`. (2) `git status --short` confirms working tree is clean (or remaining changes are inside the change folder).

  **Tasks pass (reconciliation gate).** Reads `tasks.md` and enumerates `- [ ]` lines. Separates into regular tasks (R count) and human tasks (H count, contain `(human)` tag). M = R + H total.
  - **Full/Semi-auto, M = 0:** suppressed silently.
  - **Full/Semi-auto, M > 0:** hard-stop; banner displayed; per-item gate.
  - **Manual:** always displays banner including "0 open" variant.
  - **Regular-task loop.** AskUserQuestion per task: `Finish it now / Drop -- no longer needed / Pause -- let me check the code first`. Finish → redirects to `/qrspi:implement` then re-run pr; Drop → annotates `- [x] ~~N.M <text>~~ (dropped)`; Pause → early-exit commit + end turn.
  - **Human-task loop.** AskUserQuestion: `Confirm-done / Drop / Leave-for-now`. Confirm-done ticks box; Drop → `- [x] ~~<text>~~ (dropped)`; Leave-for-now leaves un-ticked.
  - **Early-exit commit.** `git add openspec/changes/<id>/tasks.md && git commit -m "docs(<id>): reconcile open tasks before PR"` — only if `tasks.md` was actually edited.

  **Follow-ups pass (reconciliation gate).** Glob `openspec/changes/<id>/followups.md`. If absent or no `- [ ]` lines: clean, proceed. If F > 0 un-ticked entries:
  - **Full/Semi-auto, F = 0:** suppressed silently.
  - **Full/Semi-auto, F > 0:** hard-stop.
  - **Manual:** always shows banner.
  - **Follow-up loop.** AskUserQuestion: `Fix now -- run /qrspi:followup / Defer -- keep in followups.md / Drop -- no longer needed / Promote to backlog idea`. Fix now → commit prior edits → end turn; Defer → leave un-ticked; Drop → `- [x] <text> (dropped -- no longer needed)`; Promote → loads `backlog-writer` skill, appends idea row to `openspec/backlog.md`, ticks `followups.md` entry `(promoted to backlog)`.

  **Reviewer subagent.** Spawned via Agent tool (`subagent_type: qrspi:reviewer`, `model: sonnet`). Reads full change folder, runs build + lint/format + test, drafts PR description, lists unresolved checklist items. Does NOT create the PR itself.

  **PR-create step (mode-aware).** Remote-presence gate via `git-host-workflow` Step A first.
  - No remote → Step D no-remote menu (local branch / patch file / commit-to-current). No PR creation. PR-link recording is skipped.
  - Remote present → resolve PR-create command via `git-host-workflow` Step B vendor resolution.
  - **Full/Semi-auto:** `gh pr create` (or vendor equivalent) runs directly without asking.
  - **Manual:** AskUserQuestion: `Create the PR now / Show me the description first`.
  - No `--draft` flag is mentioned in `pr.md` or in the `git-host-workflow` lookup table row for GitHub. The lookup table entry for `gh pr create` does NOT include `--draft`. Draft-ness is not surfaced as a variable the caller controls.

  **Record the PR link (two places).**
  1. `openspec/changes/<id>/pr.md` — written with `# Pull request -- <id>`, `PR: #<N>`, `URL: <url>`, `Title:`, `Source branch:`, `Target branch:`, `Created:`.
  2. `openspec/backlog.md` — heading note updated from `in-progress (Q, R, D, S, V, P, I complete)` to `in-progress (draft PR #<N> open)`. Row stays under `## In progress`; no separate `Status:` line.

  **Seed the follow-up queue.** If reviewer found open issues > 0, writes `openspec/changes/<id>/followups.md` with format defined in `postpr-fix` skill (see Area 4). Format: `- [ ] **<title>.** <explanation; file:line; suggested fix.> (source: PR review)`. If zero open issues, file is NOT created.

  **Commit.**
  ```
  git add openspec/changes/<id>/pr.md openspec/backlog.md openspec/changes/<id>/followups.md
  git commit -m "docs(<id>): record PR #<N> link"
  git push
  ```
  `followups.md` omitted from `git add` if not created. Skip if user chose "Show me the description first."

### Area 4 — Post-PR fix & choreography skills

- `claude/skills/postpr-fix/SKILL.md` — Audience: implementer + orchestrator. Defines post-PR fix behavior.
  - **Fix vs. new scope.** A fix resolves something already-in-scope that does not work as specified. Net-new or previously-out-of-scope functionality is NOT a fix, even after the PR is open. If a follow-up turns out to be new scope, routing is to a scope amendment or a separate change — never a `followups.md` checkbox.
  - **Triage rubric (ownership in `workflow` skill).** The triage lives in `claude/commands/followup.md` and the `workflow` skill's "After PR" section. Three paths: P1 (implement directly — in-scope fix), P2 (amend change in place — open PR, design re-alignment needed), P3 (defer to backlog — new scope or PR already merged). The postpr-fix skill covers P1 behavior specifically.
  - **Fix checklist.** Read context (design.md, proposal.md, specs/, tasks.md, pr.md, followups.md). Make code + test change. Sync delta spec only (never base specs). Tick `followups.md` box and any matching `tasks.md` box. Run lint/tests. Commit: `fix(<id>): <summary>` with explicit staged paths.
  - **`followups.md` item format.** `- [ ] **<short title>.** <what's wrong; file:line; suggested fix.> (source: PR review | retro <stage>)`. Resolved items: `- [x] **<title>.** ... — fixed in <short-sha>`.
  - **Backlog.** A post-PR fix does NOT change the backlog status line.
  - **PR-description drift.** If the fix changed an observable contract, the PR body may be stale — noted in final message; the implementer does not edit the PR.

- `claude/skills/stage-choreography/SKILL.md` — Audience: orchestrator only. The authoritative location for the canonical commit step wording.
  - **Commit step (canonical wording).** Runs after the stage's artifact is written.
    - Full/Semi-auto: `git add <explicit paths> [openspec/backlog.md]` then `git commit -m "<stage's exact commit-message string>"` then `git push`. Never `git add -A`. No `[auto]` suffix on the commit message.
    - Manual: AskUserQuestion `Commit <artifact(s)> to the feature branch?` / `Yes -- commit and push` / `No -- I'll commit later`. If yes, same `git add` + commit + push.
    - On any non-zero git exit: hard-stop (condition 2).
  - This skill is also the single location for: run-mode establishment, precondition check (Glob-based), next-stage handoff, hard-stop procedure, backlog atomicity, stage-specific gate notes (I per-slice auto-advance, no-remote gating, PR-create auto-advance).

### Area 5 — Git-host / PR-create vendor resolution

- `claude/skills/git-host-workflow/SKILL.md` — Pure derivation text; no tool calls itself.
  - **Step A — Remote-presence check.** `git remote` via Bash. Non-empty = remote present. Presence MUST be re-checked live at each push site; never cached.
  - **Step B — Vendor resolution (priority order).** (1) Stack-cheatsheet `## PR & git workflow` / `Git host:` line wins. (2) Live-derive: `.github/` directory or GitHub remote URL → GitHub; `azure-pipelines.yml` → Azure DevOps; `.gitlab-ci.yml` → GitLab. (3) Default: GitHub.
  - **Vendor lookup table.**

    | Vendor       | CLI        | PR-create command                                                                                  |
    |--------------|------------|-----------------------------------------------------------------------------------------------------|
    | GitHub       | `gh`       | `gh pr create --title <title> --body <body> --base <target> --head <source>`                       |
    | Azure DevOps | `az repos` | `az repos pr create --title <title> --description <body> --target-branch <target> --source-branch <source>` |
    | GitLab       | `glab`     | `glab mr create --title <title> --description <body> --target-branch <target> --source-branch <source>` |

  - **Draft flag.** The lookup table for `gh pr create` does NOT include `--draft`. No draft-ness variable is surfaced to the caller from this skill or from `pr.md`. Whether a PR is created as draft is not currently knowable to (or controlled by) the caller via this mechanism.
  - **Step C — Branch-slot resolution.** Two slots: `feature` (default `features/<id>`) and `archive` (default `chore/archive-<id>`). Override via cheatsheet `## PR & git workflow` / `Branch naming` sub-block. This cheatsheet also lives in `qrspi-stack` for this repo.
  - **Step D — No-remote local-only menu.** Three choices: local branch / patch file / commit-to-current. Merge-back into default branch is offered and human-confirmed; never auto-performed.

### Area 6 — Lint gate structure

- `scripts/lint.mjs` — Node.js ESM, no npm dependencies (built-ins only). Exits 0 on pass, 1 on any violation. All errors collected before exit.

  **Check registry (Checks 1–24 plus sub-checks 2b and 10b):**

  | Check | Name / scope |
  |-------|-------------|
  | 1     | `checkPinAgreement` — every hand-maintained OpenSpec version pin must agree. Sweeps `claude/`, `openspec/`, `openspec-templates/`, `.github/`, `.claude/` + root files. Excludes `CHANGELOG.md`, `openspec/backlog.md`, `openspec/config.yaml` (narrative / config-sentinel). Sub-guard: no `@fission-ai/openspec@latest` references. |
  | 2     | `checkFrontmatter` — YAML frontmatter fields, agent references, model aliases, skill ref resolution in agents AND command bodies. |
  | 2b    | `checkSkillSets` — each stage agent's `Load skills` line matches the approved per-stage registry in `scripts/skill-sets.mjs`. |
  | 3     | `checkHeadingAlignment` — canonical section headings from each `openspec-templates/*.template.md` appear in the corresponding agent skeleton. |
  | 4     | `checkReadmeCoverage` — every `claude/commands/<stem>.md` is documented in README as `/qrspi:<stem>` and vice-versa. |
  | 5     | `checkGateToolExecutorAgreement` — no command with a non-builtin `agent:` reaches `AskUserQuestion` directly or transitively via `workflow` or `stage-choreography` markers. |
  | 6     | `checkMigrationManifests` — (a) presence: every `## [X.Y.Z]` CHANGELOG section at/above floor `0.6.0` must have `migrations/<v>.yaml`; floor manifest must always exist. (b) Schema: `version`, `summary`, `automated`, `manual` required; `action: edit-file` only; `path` must start with `openspec/`; optional `skip_if_contains` and `anchor_missing: warn-and-skip` validated. (c) Marker format: `openspec/.qrspi-version` must be bare SemVer. |
  | 7     | `checkReadContracts` — each of the nine stage agents carries a `> **Read contract**` banner; `Reads:` field equals its row in the Read Matrix in `workflow` skill. |
  | 8     | `checkPRReconciliationStructure` — `claude/commands/pr.md` must carry `## Tasks pass` heading plus `Finish`, `Drop`, `Pause` choice-label anchors; `## Follow-ups pass` heading plus `Fix now`, `Defer`, `Drop`, `Promote` labels. |
  | 9     | `checkVersionCheckEmbed` — nine stage command files each contain the `qrspi-version-check` skill load line. |
  | 10 (10b) | `checkBudgetGateEmbed` / `checkTriagePaths` — ten commands carry `context-budget-gate` skill load; `followup.md` contains P1/P2/P3 triage-choice-label anchors. |
  | 11    | `checkNoSurfaceGatedSkeletonHeadings` — twenty-two surface-gated headings must NOT appear as literal heading lines inside fenced blocks in any of the five artifact-producing agent files. |
  | 12    | `checkOutputContracts` — nine stage agents each carry a `> **Output contract**` banner. |
  | 13    | `checkComputeAnnotations` — every `**Compute:**` in committed `openspec/changes/**/slices.md` and `**/tasks.md` must carry valid `effort=` (required) and, if present, valid `model=` token. Value-validation only; not presence-on-every-slice. Scoped strictly to committed change artifacts, never skills or templates. |
  | 14    | Surface applicability of artifact headings — scans `openspec/changes/**` artifacts (excluding `archive/`) for headings from absent surfaces per the stack-cheatsheet `## Repo surface` block. |
  | 15    | `checkVariantAgents` — implementer variant fleet: stem set equals `IMPLEMENTER_VARIANTS`; each variant's step-1 loads only `implementer-core`; `effort:` matches stem; `implementer.md` is absent from `plugin.json`. |
  | 16    | `checkFollowupStem` — `followup.md` contains no bare `qrspi:implementer` (regex `(?!-)`). |
  | 17    | `checkHelperAgentReadContracts` — helper agents' `> **Read contract**` banner `Reads:` field matches a separate `HELPER_READ_CONTRACT_EXPECTED` map. |
  | 18    | `checkModifiedScenarioCounts` — delta specs: `#### Scenario:` count per `MODIFIED` requirement must not be less than base count. |
  | 19    | `checkAuthoritativeSyncDelegator` — `archive.md` contains `qrspi:spec-syncer`; no kit file uses `subagent_type: general-purpose` near a sync-context string. |
  | 20    | `checkRequirementFirstLineModal` — requirement bodies' first non-blank line must contain `MUST` or `SHALL` (case-sensitive). Scans delta specs (ADDED + MODIFIED only) and base specs. |
  | 21    | `checkFormatRulesParity` — extracts blocks delimited by `<!-- must-leads:begin -->` / `<!-- must-leads:end -->` from `claude/agents/architect.md` and `openspec-templates/spec-delta.template.md`; asserts byte-identity (EOL-normalised). |
  | 22    | `checkBacklogSchema` — `openspec/backlog.md` schema: heading grammar (em-dash U+2014, middle-dot U+00B7, bold P-band), status enum, body-field rule, three-section presence, P-band preamble, status-vs-section grouping. |
  | 23    | `checkBacklogWikilinks` — resolves every bare `[[slug]]` in `openspec/backlog.md` against live row IDs and archive folder slugs. |
  | 24    | `checkResearcherGateInstruction` — asserts `researcher.md`'s `## What to do` step 1 carries the surface-gate instruction phrase. |

  **How a new numbered check is registered.** Near the bottom of `lint.mjs` (around line 4428+), the check functions are called in sequence: `await checkPinAgreement(errors)`, `await checkMigrationManifests(errors)`, etc. A new check is added by (a) writing an `async function checkXxx(errors)` function, (b) calling it in sequence at the bottom with `await checkXxx(errors)`, (c) adding a header-block comment (`// NN. DESCRIPTION`) in the file's leading comment block (lines 1–190), and (d) updating any external references to the check count (README, `qrspi-stack` cheatsheet `## Build, lint & test commands` section, `CHANGELOG.md`).

  **tasks.md scanning in lint.** Check 13 (`checkComputeAnnotations`) scans `openspec/changes/**/slices.md` and `**/tasks.md`. The helper `walkMd()` recursively collects `.md` files; a filename filter `base === 'slices.md' || base === 'tasks.md'` restricts the scan. No other check specifically scans `tasks.md` content (beyond Check 8's structural anchor scan of `pr.md`, not `tasks.md`).

  **CHANGELOG scanning in lint.** Check 6 (`checkMigrationManifests`) reads `CHANGELOG.md` with regex `/^##\s+\[(\d+\.\d+\.\d+)\]/gm` to find released `## [X.Y.Z]` sections. Every version at or above the floor `0.6.0` must have a matching `migrations/<v>.yaml`. `CHANGELOG.md` is listed in `PIN_NARRATIVE_SURFACES` and is therefore excluded from the pin-agreement sweep (Check 1).

### Area 7 — CHANGELOG convention & where it is mandated

- `CLAUDE.md` (repo root) — Contains the rule verbatim: "Record the change under `## [Unreleased]`" in `CHANGELOG.md`. Rule name: "Don't bump the version in feature work." States that `plugin.json` `version` changes only when cutting a release, never in a feature PR.

- `CHANGELOG.md` structure:
  - Header: `# Changelog`, format declaration (Keep a Changelog 1.1.0), versioning note (0.x pre-1.0 semver).
  - `## [Unreleased]` section — currently populated with two entries under `### Added` and `### Changed` / `### Fixed`. This is where in-progress work is recorded.
  - Released sections: `## [0.13.0] - 2026-08-13`, `## [0.12.0] - 2026-07-29`, … down to `## [0.1.0] - 2026-01-15`. Each released section is a `## [X.Y.Z] - YYYY-MM-DD` heading, required to have a matching `migrations/<v>.yaml` at or above the floor.
  - Sub-sections within each release: `### Added`, `### Changed`, `### Fixed`, `### Removed`.
  - `plugin.json` `version` is declared the single source of truth for the current kit version.

- No stack-cheatsheet `## Gotchas / house rules` entry explicitly restates the CHANGELOG rule; it is only in `CLAUDE.md` and implicitly in the CONTRIBUTING.md release checklist.

### Area 8 — Migration manifest / consumer update

- `migrations/` directory — ten YAML files (0.6.0 through 0.14.0). Each is `<version>.yaml`.

  **Schema (enforced by Check 6).** Required top-level keys: `version` (bare SemVer, must equal filename stem), `summary` (one-line description), `automated` (list, may be empty), `manual` (list, may be empty).

  **`automated` step sub-fields.** `action: edit-file` (only valid value). `path` (must start with `openspec/`). Edit pattern: exactly one of `find`+`replace`, `find_all`+`replace`, `insert_after`+`content`, `insert_before`+`content`, `append`+`content`, `prepend`+`content`, `overwrite`+`content`. Optional idempotency: `skip_if_contains: "<marker>"` (skip step if file already contains marker) and `anchor_missing: warn-and-skip` (degrade gracefully on missing anchor rather than hard-stopping). Both optional fields are validated by Check 6.

  **`manual` step sub-fields.** Each item is a plain string (a description of what the human must do). Shell commands NEVER appear in `automated`; anything requiring a shell command is a `manual` step.

  **When a migration entry is warranted.** From lint Check 6 and the `qrspi-update` skill: every released `## [X.Y.Z]` CHANGELOG section at or above `0.6.0` must have a matching manifest. A "no consumer action" release ships a stub: non-empty `summary`, `automated: []`, `manual: []`. A change that modifies consumer-visible behavior (e.g., a grammar change in `slices.md`/`tasks.md`, a new required field in artifacts, a change to `openspec/backlog.md` structure, a CLI pin bump) warrants a non-stub entry with automated and/or manual steps.

  **`/qrspi:update` skill (`claude/skills/qrspi-update/SKILL.md`).** Walks `migrations/<v>.yaml` for all `A < v <= B` in ascending numeric SemVer order. Automated steps applied without prompting; manual steps gated via AskUserQuestion. Marker `openspec/.qrspi-version` is bumped only after the LAST step of the LAST version completes successfully. Does NOT auto-commit (prints a ready-to-run `git commit` command). Scope: all edits are `openspec/`-scoped; the command never edits outside `openspec/`.

---

## Slash-command surface

- `claude/commands/plan.md` — `/qrspi:plan` — orchestrates Stage P. No `agent:` frontmatter. Loads: `qrspi-version-check`, `context-budget-gate`, `stage-choreography`. Delegates write to `planner` subagent.
- `claude/commands/pr.md` — `/qrspi:pr` — orchestrates Stage PR. No `agent:` frontmatter. Loads: `qrspi-version-check`, `context-budget-gate`, `stage-choreography`. Delegates write to `reviewer` subagent. Contains tasks pass + follow-ups pass reconciliation gates, PR-create step, PR-link recording, follow-up seeding.

## Stage-agent surface

- `claude/agents/planner.md` — Stage-P subagent. Read contract: `slices.md` only. Output contract: `tasks.md` path + slice count + total task count + next stage.

## Skill surface

- `claude/skills/stage-choreography/SKILL.md` — Orchestrator-only. Canonical commit step wording, run-mode, precondition check, next-stage handoff, hard-stop procedure, backlog atomicity, stage-specific gate notes.
- `claude/skills/postpr-fix/SKILL.md` — Audience: implementer + orchestrator. Post-PR fix rubric (fix vs. new scope), fix checklist, `followups.md` format, guardrails.
- `claude/skills/git-host-workflow/SKILL.md` — Vendor resolution (GitHub/AzDO/GitLab), branch-slot resolution, remote-presence check, no-remote menu.
- `claude/skills/qrspi-update/SKILL.md` — Migration walk algorithm, schema contract, edge cases, apply phase (edit-file dispatcher, manual step gate, marker bump, stage + print-commit tail).

## Lint-gate surface

- `scripts/lint.mjs` — 24 checks (plus 2b, 10b). Key checks touching task artifacts: Check 13 (Compute annotations in slices.md/tasks.md). Key checks touching CHANGELOG: Check 6 (migration manifest presence requires matching CHANGELOG section). New checks added by writing an `async function checkXxx(errors)` and calling it at the bottom of the sequential check chain.

## Template surface

- `openspec-templates/tasks.template.md` — Canonical `tasks.md` shape: numbered groups `## N. <slice name>`, items `- [ ] N.M`, `**Compute:**` paragraph, `(D<n>)` back-refs, `(human)` tag rule. Single source of truth; planner agent and Check 3 are both anchored to it.

## Migration manifest

- `migrations/` — Ten YAML files (0.6.0–0.14.0). Floor: `0.6.0`. Schema: `version`, `summary`, `automated` (edit-file only, openspec/-scoped paths, optional idempotency fields), `manual` (plain strings). Check 6 enforces schema and CHANGELOG coupling. Consumer update driven by `qrspi-update` skill.

---

## Notable discrepancies

- The backlog note in `pr.md` writes the heading note as `in-progress (draft PR #<N> open)` regardless of whether a `--draft` flag was used in the `gh pr create` call — since the lookup table has no `--draft` parameter and PR creation in this kit always creates a non-draft PR, the word "draft" in the note text may be misleading.
- `stage-choreography/SKILL.md` is the authoritative location for the commit step wording, but the `workflow` skill still contains a full duplicate of the same four canonical procedures (run-mode, precondition, commit step, next-stage handoff). The CHANGELOG entry for the split (`## [Unreleased]`) says content was moved verbatim, but both skills currently contain the same text. The authoritative copy is `stage-choreography`.

## Implicit contracts and conventions

- Every `## [X.Y.Z]` CHANGELOG entry at or above `0.6.0` requires a corresponding `migrations/<v>.yaml`; a no-action release ships a stub manifest. This is mechanically enforced by Check 6.
- The `## [Unreleased]` section in `CHANGELOG.md` is the only place feature work records changes during development. This is a CLAUDE.md mandate, not lint-enforced.
- `(human)` tasks are written in `tasks.md` by the planner for anything a subagent cannot verify; they are specifically NOT blocked by the implementer and are handled at PR stage by the tasks pass.
- The commit message for stage P is exactly `docs(<id>): add tasks.md (QRSPI stage P)` — no variation allowed (canonical wording in `plan.md`).
- The backlog heading note at PR time is `in-progress (draft PR #<N> open)` — exact phrasing enforced by `pr.md`.
- Never `git add -A`; always stage explicit artifact paths. Enforced by all four choreography procedures in `stage-choreography`.
- A migration manifest's `automated` steps must target only `openspec/`-scoped paths. Shell-command steps are always `manual`. Check 6 enforces both rules.
- The PR stage does NOT produce a draft PR by default; the `git-host-workflow` lookup table has no `--draft` parameter.

## Open gaps

- [ ] Could not determine: whether any existing migration manifest covers a change to `tasks.md` task content (e.g., adding a new standard task type). No migration in `migrations/` currently edits a `tasks.md` file (all automated paths are `openspec/`-scoped, and `tasks.md` files live under `openspec/changes/<id>/`, which is in scope). Not confirmed whether a new standard task shape in the template would require a migration or only a template + planner agent edit.
- [ ] Could not determine: whether Check 8 (PR reconciliation structure) or any other check validates the wording of the `(human)` tag in `tasks.md` items (e.g., that it appears as a prefix after the id, not inline in the task text). No lint check currently validates `(human)` tag placement or content; it is a prose convention only.
- [ ] Could not determine: whether a change to `CHANGELOG.md` itself (e.g., adding a new sub-section type like `### Deprecated`) would require any code update. The CHANGELOG format appears convention-only and is not schema-validated by lint.
- [ ] Need human input on: the specific "trivial, in-scope, fix-in-stage" definition that the postpr-fix skill uses — the skill names P1 as the "small, atomic, in-scope" path but does not give a line-count or complexity bound; the rubric is the four-signal heuristic in `claude/commands/followup.md` (not read in this stage).
