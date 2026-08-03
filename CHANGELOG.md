# Changelog

All notable changes to the QRSPI kit are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows 0.x pre-1.0 semver: breaking changes and new features bump
the minor component; fixes, prompt-text edits, and docs-only changes bump the
patch component. Version 1.0.0 is deferred until the kit is declared stable.

The `plugin.json` `version` field is the single source of truth for the current
kit version.

---

## [Unreleased]

### Added

- **Backlog schema freeze (`standardize-backlog-format`).** Freezes the
  `openspec/backlog.md` heading grammar (`### <id> -- \`<status>\` . **P<n>**`
  with real em-dash U+2014 and middle-dot U+00B7), status enum (`idea`,
  `proposed`, `in-progress`, `merged`, `bundled`), body-field rule
  (`**Why:**` + `**Shape:**` required on standalone `idea`/`proposed` rows),
  three-section presence (`## In progress`, `## Proposed`, `## Ideas`), and
  P-band preamble under `## Ideas`. Ships: (1) `openspec-templates/backlog.template.md`
  -- the canonical, self-documenting template that `/qrspi:init` seeds verbatim;
  (2) lint Check 22 (`checkBacklogSchema`) with a six-assertion set and an
  inline self-test fixture covering all four row-class cases; (3) a Check 3
  drift guard that byte-compares the inline template copy in `init.md` against
  the template file; (4) corrected `workflow` skill prose and fenced row
  examples in `followup.md`, `pr.md`, `design.md`, `structure.md`, `slices.md`;
  (5) the kit's own `openspec/backlog.md` backfilled with substantive
  `**Shape:**` lines on all ~51 formerly-missing standalone rows; (6) a fix for
  the Check-10 label collision (`checkTriagePaths` renumbered); and (7)
  migration `0.13.0.yaml` that inserts the legend comment into existing consumer
  backlogs (additive-only, no row rewrites) with manual steps for section-heading
  and preamble additions. Consumers with no `openspec/backlog.md` are directed to
  `/qrspi:init`; consumers with one gain the legend comment automatically on
  `/qrspi:update`. This change requires a version bump at release (the migration
  ships a non-empty `automated:` list for the first time in kit history).

- **Idea-capture command and shared backlog-writer skill (`backlog-schema-finish`, Slice 3).**
  Adds `/qrspi:idea` -- a main-loop (no `agent:` frontmatter) command that drives an
  interactive interview (derive slug, dedup by intent, P-band AskUserQuestion, one-sentence
  Shape) and delegates row construction and staging to a new shared `backlog-writer` skill.
  The skill owns the canonical Check-22-valid `idea`-row append procedure (dedup, P-band
  proposal, row construction referencing the frozen grammar in
  `openspec-templates/backlog.template.md`, and staging) so future consumers (questioner,
  designer, architect, followup) can delegate to it rather than duplicating inline grammar.
  `scripts/skill-sets.mjs` gains a `COMMAND_SKILL_SET_EXPECTED` export for command-scoped
  skill registries; Check 2 (`checkFrontmatter`) is extended to resolve skill refs in
  command bodies (not agents only); Check 2b (`checkSkillSets`) is extended to validate
  the command skill-set registry. No version-check or budget-gate embed added to
  `/qrspi:idea` per design (it is a non-stage, non-chaining helper).

- **Command-level append sites migrated to backlog-writer (`backlog-schema-finish`, Slice 5).**
  Removes the inline frozen-grammar construction block from the three orchestrator-level
  append sites -- `claude/commands/design.md` step 4 ("Capture deferred work"),
  `claude/commands/structure.md` capture step, and `claude/commands/pr.md` "Promote to
  backlog idea" path -- replacing each with a delegation to `Load skill backlog-writer` and
  its append procedure. The surrounding offer/dedup/skip prose (design.md, structure.md) and
  the `followups.md` tick + commit orchestration (pr.md) are preserved unchanged.
  `claude/commands/slices.md`'s referential grammar copy is trimmed to a one-line pointer to
  `openspec-templates/backlog.template.md` and Check 22 (stage V does not append, so no
  delegation call is added). `backlog-writer` is now the single non-template location where
  the row grammar is expressed.

- **Replayable, fault-tolerant migration dispatcher (`backlog-schema-finish`, Slice 1).**
  `migrations/0.13.0.yaml`'s legend-insert step gains two optional fields --
  `skip_if_contains` (content-idempotency guard: skip the insert when the anchor region
  already contains the marker text, so a re-run does not duplicate the legend) and
  `anchor_missing: warn-and-skip` (graceful degradation: emit a one-line warning and
  continue the walk instead of hard-failing when the anchor heading has been renamed or
  removed). `claude/skills/qrspi-update/SKILL.md` documents the dispatcher semantics for
  both fields, and lint Check 6 is extended to validate them against their closed
  value-domain with a positive-path inline self-test fixture.

- **Dangling backlog wikilinks fail CI (`backlog-schema-finish`, Slice 2).** New lint
  Check 23 (`checkBacklogWikilinks`) resolves every bare `[[slug]]` cross-reference in
  `openspec/backlog.md` against the live row IDs and the date-stripped
  `openspec/changes/archive/` folder slugs, failing CI (naming the offending slug) on any
  dangling reference; code-spanned meta-tokens are exempt. A pure `resolveWikilinks`
  helper backs the check, with an inline self-test covering live-row hit, archive-folder
  hit, code-span must-not-fire, and bare-dangling must-fire. Five pre-existing bare
  dangling links in the kit's own backlog are demoted to back-ticked plain text so CI
  passes immediately.

- **Agent- and Q-stage append sites migrated to backlog-writer (`backlog-schema-finish`, Slices 4 & 6).**
  Completes the migration begun in Slices 3 and 5: the three stage agents
  (`claude/agents/questioner.md`, `designer.md`, `architect.md`) and the
  `claude/commands/followup.md` P3 promote path now load `backlog-writer` and delegate
  row construction rather than carrying inline deferred-work-capture grammar (Slice 4).
  `claude/commands/questions.md` gains a "Capture deferred work" step that offers each
  candidate separable change via `AskUserQuestion` at the orchestrator level, and the
  questioner agent's step 9 is trimmed to surface candidates in its returned summary
  instead of issuing the offer itself (the subagent cannot reach `AskUserQuestion`);
  Slice 6. `scripts/skill-sets.mjs` registers `backlog-writer` for the questioner,
  designer, and architect skill sets. With these two slices, every backlog-append site
  across the kit delegates to the single shared `backlog-writer` skill -- the D11
  guarantee that no inline row-construction grammar copy survives outside the skill and
  the frozen template.

- **OpenSpec version-pin coupling guard (`reassess-openspec-dependency`).**
  Records the formal verdict to **keep** the `@fission-ai/openspec` CLI
  dependency for 1.0 (its residual value — spec-delta grammar validation —
  outweighs the vendor cost before the 1.0 cut; the workspace-root rename is
  deferred as a soft want), and ships the coupling guard co-decided with it:
  lint Check 1 (`checkPinAgreement`) now asserts that `openspec/config.yaml`
  carries an `openspec_version` field equal to the agreed pin. This closes the
  silent-drift gap where a repo scaffolded at an older CLI version went
  unnoticed. Two failure legs (config key absent; present-but-mismatched),
  covered by an inline three-fixture self-test in the Check 14/15 style. No new
  check number and no new dependencies.

## [0.12.0] - 2026-07-29

### Added

- **In-session orchestrator context-budget gate (`orchestrator-context-budget`).**
  Bounds the QRSPI orchestrator's own context growth *across stages within one
  session* — the accumulation subagent firewalling does not bound (a real
  consumer hit 98% context at the D review of its second change). A new
  `context-budget-gate` skill tracks an in-context stage-event counter and fires
  a one-line advisory **nudge at 8 events** and a **never-suppressed soft-gate
  AskUserQuestion at 12** (dual-trigger: counter OR the orchestrator's own
  qualitative self-assessment), embedded after `qrspi-version-check` in the 10
  long-session commands (8 stage commands + `archive` + `followup`). `archive.md`
  gains a step-7 "start a fresh session for the next change?" reset offer; the
  `workflow` skill's never-suppressed-gates list and the `context-hygiene` skill
  (new "Marathon anti-pattern" subsection, accurate cross-stage vocabulary) are
  updated; and a new `checkBudgetGateEmbed` lint check asserts the embed across
  all 10 commands. Research confirmed no live context-% signal is available to
  command bodies, so the gate is a structural counter rather than a live gauge.
  The reset instructions now explicitly name `/clear` as the lightweight
  in-place reset the human runs before re-entering the next stage command.

## [0.11.0] - 2026-07-29

### Added

- **Architect authoring guidance + lint guards for the requirement first-line
  `MUST`/`SHALL` rule.** OpenSpec `validate --strict` (which CI runs as
  `validate --all`) reads only a requirement body's **first physical line** for
  `MUST`/`SHALL`, so a body that opens with a `When …` clause and wraps the modal
  onto line 2 passes non-strict lint but hard-stops the Implement stage at CI's
  strict gate — far from its cause. `claude/agents/architect.md` now carries a
  bolded `**Warning —**` immediately before the delta-spec skeleton plus a
  permitted/forbidden counter-example (mirrored byte-identically into
  `openspec-templates/spec-delta.template.md`), and `scripts/lint.mjs` gains
  **Check 20** (`checkRequirementFirstLineModal` — flags any requirement whose
  first non-blank body line lacks `MUST`/`SHALL`, scanning both delta specs and
  base specs) and **Check 21** (`checkFormatRulesParity` — asserts the two
  mirrored Format-rules blocks stay byte-identical via `<!-- must-leads -->`
  sentinels). The gotcha now fails at S-commit, not mid-implement.

## [0.10.1] - 2026-07-28

### Fixed

- **`spec-syncer` can now create a new capability's base spec (grant `Write`).**
  v0.10.0's least-privilege `spec-syncer` deliberately withheld `Write`, on the
  assumption that a brand-new capability's base spec would be "materialized by
  the archive folder move." That assumption was wrong: `/qrspi:archive` step 4
  takes **only** the folder move from the `openspec-archive-change` skill and
  hard-declines its native sync, so the `spec-syncer` was the sole writer of
  `openspec/specs/**` — and, holding no `Write`, it could not create the base
  spec file for a change that adds a new capability. The result was silent
  data loss: a new capability's `## ADDED Requirements` were never written to
  the main specs. The agent now holds `Write`, scoped to creating a new
  capability's `openspec/specs/<capability>/spec.md`; existing capabilities
  are still edited in place with `Edit`, and the count-drop hard-stop is
  unchanged.

## [0.10.0] - 2026-07-28

### Added

- **Kit-owned `spec-syncer` agent + hardened archive-time spec sync
  (`spec-sync-contract`).** Fixes a silent data-loss bug: the archive-time
  delta→main spec sync (previously delegated to a catch-all `general-purpose`
  subagent hard-coded in the generated `openspec-archive-change` skill) could
  silently drop scenarios when a `## MODIFIED Requirements` block omitted
  carried-forward scenarios — OpenSpec MODIFIED semantics replace a requirement
  wholesale. Bundles two backlog ideas (`sync-modified-delta-scenario-loss` P2 +
  `dedicated-spec-sync-agent` P3). Stands up a least-privilege `spec-syncer`
  helper agent (Read/Edit/Bash/Glob/Skill) owning the authoritative MODIFIED =
  wholesale-replacement contract with a **count-drop hard-stop** on any scenario
  reduction (human confirms → re-spawn with a confirmed-ok flag), and makes the
  kit-owned `/qrspi:archive` the sole sync delegator via a new command-owned step
  4a (happy-path sync prompt removed; escape-hatch prompt retained; generated
  skill's post-sync prompt bypassed). Strengthens the delta-spec template's
  MODIFIED comment, adds a "Helper agents" row to the workflow Read Matrix, and
  adds three kit-only `scripts/lint.mjs` checks — **Check 17**
  (`checkHelperAgentReadContracts`), **Check 18** (`checkModifiedScenarioCounts`),
  **Check 19** (`checkAuthoritativeSyncDelegator`). The lint checks are
  kit-internal (they do **not** ship in the plugin); consumer repos are protected
  by the runtime `spec-syncer` guard.

- **Per-slice compute tier: orthogonal `effort=`/`model=` grammar + effort-variant
  agents (`per-slice-compute-tier`).** The `**Compute:**` annotation grammar
  becomes two orthogonal tokens -- `effort=<low|medium|high>` is now **required**
  and selects which implementer variant `/qrspi:implement` spawns
  (`implementer-low` / `implementer-medium` / `implementer-high`, each carrying
  the matching static `effort:` frontmatter), while `model=<haiku|sonnet|opus>`
  is now **optional** and defaults to `sonnet` (passed per-spawn as the Agent
  tool `model:` override). This makes per-slice *effort* enforceable at spawn
  time (not just per-stage) and reaches all nine `model x effort` combinations.
  `haiku` is promoted to a first-class `**Compute:** model=` value with its own
  `vertical-slice` heuristic band. The shared implementer body lives once in a
  new `implementer-core` skill that the base `implementer.md` and all three
  variants load; a new lint **Check 15** (`checkVariantAgents`) guards the
  variant fleet from drift (coverage, core-only load, effort-matches-stem), and
  **Check 13** swaps to enforce the new required/optional grammar. Breaking
  grammar change -- consumers are migrated via `migrations/0.10.0.yaml` (effort
  now required; a `model=`-only line must add an `effort=` token).

- **The QRSPI researcher (stage R) is now surface-aware
  (`researcher-surface-generic`).** The researcher agent loads the `repo-surface`
  skill and gates its factual-inventory sections on the repo's declared surfaces,
  exactly like the proposal-producing agents — omitting a section for any absent
  surface instead of hardcoding a web-app skeleton (`## Public API surface`,
  `## Data model`). Its fenced skeleton moves to the gate-comment convention and
  gains a standing `## Notable discrepancies` heading (a factual home for code
  evidence of a declared-absent surface). Ships a spine-only
  `research.template.md` guarded by Check 3, extends Check 11's
  `CRUD_CHECK_AGENTS` to cover the researcher skeleton, adds `repo-surface` to the
  researcher's skill set, and documents each surface's `research.md` inventory
  heading (`(in research.md)` mapping lines) plus a 7th `## Extending the
  taxonomy` checklist site. Completes surface-gating across all
  artifact-producing agents and retires the temporary `## Data
  model`→`## Data structures` band-aid pattern.
- **Six kit surfaces + the kit dogfoods `repo-surface` on itself
  (`kit-surface-dogfooding`).** The surface taxonomy gains six kit-specific
  surfaces — `slash-command`, `stage-agent`, `skill`, `template`, `lint-gate`,
  `migration-manifest` — each with its gated section(s), a section-to-surface
  mapping row in the `repo-surface` skill, and gate-comment placeholders in the
  questioner/designer skeletons and the questions/design templates. The kit's own
  `qrspi-stack` `## Repo surface` block now declares all six present (previously
  `_No present surfaces._`), so kit QRSPI artifacts finally emit kit-specific
  sections. Adds an `## Extending the taxonomy` checklist to the `repo-surface`
  skill documenting the required edit sites for a new surface.
- **Lint Check 14 — surface applicability of artifact headings.** Parses the
  kit's `qrspi-stack` `## Repo surface` block and asserts committed
  `openspec/changes/**` artifacts (excluding `archive/`) carry no section for an
  *absent* surface — validating emitted OUTPUT against the declared surface, which
  Check 11's source-side denylist cannot do. Fails loudly if the `## Repo surface`
  block is absent or unparseable; carries an inline self-test so a broken detector
  reddens CI. Scoped to the kit's own artifacts (consumer-repo enforcement remains
  out of scope).

### Changed

- **`/qrspi:implement` resolves the implementer variant + model from the slice
  (`per-slice-compute-tier`).** The command now maps the required `effort=` token
  to a variant `subagent_type` (`implementer-low` / `implementer-medium` /
  `implementer-high`) and passes the optional `model=` (default `sonnet`) as the
  Agent `model:` parameter, at both the main spawn site and the Full/Semi-auto
  per-slice loop. The old missing-`model=` hard-stop becomes a missing-`effort=`
  hard-stop. **Check 13** swaps to enforce the new grammar (`effort=` required,
  `model=` optional).
- **Lint constant `CRUD_DENYLIST_HEADINGS` renamed to
  `SURFACE_GATED_DENYLIST_HEADINGS`** and grown from 12 to 22 entries (the 10 new
  kit-surface headings); the Check 11 comment block is regeneralized from "CRUD" to
  "surface-gated" and now states both disjoint-scope invariants (vs Check 3 and vs
  Check 14).

### Added (unify-implement-paths-on-variants)

- **Implementer-dispatch unification (`unify-implement-paths-on-variants`).** All
  paths that spawn an implementer -- `/qrspi:implement` (trivial inline-plan branch),
  `/qrspi:followup` (FIX MODE), and the three effort-variant agents themselves -- now
  consistently spawn a named variant (`qrspi:implementer-low`, `qrspi:implementer-medium`,
  or `qrspi:implementer-high`) rather than the deleted base agent `qrspi:implementer`.
  `/qrspi:followup` defaults to `qrspi:implementer-medium` when no inline `(compute:
  effort=...)` spec is present; the `effort=` token in the inline spec maps to the
  matching variant. The trivial inline-plan branch of `/qrspi:implement` explicitly
  spawns `qrspi:implementer-medium` with `model: sonnet`.

- **Base `implementer.md` agent deleted.** `claude/agents/implementer.md` is removed;
  `plugin.json` `agents` array now lists nine paths (six stage agents plus three
  effort-variant implementer agents). The shared body lives in the `implementer-core`
  skill loaded by each variant. Check 7 (`checkReadContracts`) and Check 12
  (`checkOutputContracts`) now cover nine agents instead of seven.

- **Lint Check 15 sub-check (e): base-agent absent from `plugin.json`.**
  `checkVariantAgents` (Check 15) gains sub-check (e): asserts
  `./claude/agents/implementer.md` is absent from the `agents` array in
  `.claude-plugin/plugin.json`. An inline self-test fires on a synthetic fixture
  containing the base path, so a regression reddens CI immediately.

- **Lint Check 16 (`checkFollowupStem`): no bare `qrspi:implementer` in
  `followup.md`.** Asserts `claude/commands/followup.md` contains no bare
  occurrence of `qrspi:implementer` (without a `-low`/`-medium`/`-high` suffix).
  Uses regex `/qrspi:implementer(?!-)/` so variant stems do not match. Ensures
  the command always spawns a named variant, never the deleted base agent.

- **CWD note added to eleven command files.** Each of the eleven change-folder-resolving
  commands (`questions`, `research`, `design`, `structure`, `slices`, `plan`,
  `implement`, `pr`, `followup`, `archive`, `retro`) now carries a blockquote note
  adjacent to its Glob/precondition line reminding the agent that
  `openspec/changes/<id>/...` resolves against the consumer's CWD (the repo being
  worked on), not the plugin install directory.

- **Migration manifest `migrations/0.10.0.yaml` extended.** A new `manual` entry
  advises consumers who locally overrode `followup.md` to re-apply their
  customizations onto the new variant-routing logic (`qrspi:implementer-medium`
  default instead of bare `qrspi:implementer`).

## [0.9.0] - 2026-07-25

### Added

- **Per-slice compute annotations (`**Compute:**` grammar, replacing `**Model:**`).**
  The per-slice `**Model:** sonnet|opus -- <rationale>` annotation is replaced by
  `**Compute:** model=<alias> effort=<low|medium|high> -- <rationale>`. The
  `model=` token is required and per-slice-enforced (passed as the per-invocation
  `model:` parameter on the Agent call). The `effort=` token is optional; when
  absent, the implementing agent's frontmatter `effort:` (per-stage default) takes
  effect. Both structural forms are preserved: a dash-bullet in `slices.md`
  (`- **Compute:** model=sonnet effort=medium -- ...`) and a bare bold line in
  `tasks.md` (`**Compute:** model=sonnet effort=medium -- ...`). The annotated
  `slices.md` skeleton in `claude/agents/architect.md`, the `vertical-slice` skill's
  "Per-slice model selection" section, the planner carry-forward rule, and
  `openspec-templates/tasks.template.md` are all updated to the new grammar.
  Consumers with in-flight `slices.md`/`tasks.md` files using the old `**Model:**`
  form must rewrite them -- see the 0.9.0 migration manifest.

- **`effort:` frontmatter on all seven stage agents.** Every
  `claude/agents/*.md` now carries an `effort:` frontmatter key declaring its
  default compute effort level (`low`, `medium`, or `high` -- the kit surface;
  `xhigh`/`max` are rejected by lint). Opus stages (designer, implementer) default
  to `effort: high`; sonnet stages (questioner, researcher, architect, planner,
  reviewer) default to `effort: medium`. The `effort:` value is enforced by the
  Claude Code agent frontmatter mechanism (per-stage, not per-slice -- there is no
  per-invocation effort parameter on the Agent tool). Lint Check 2 is extended to
  require and validate the new field on every agent file.

- **Lint Check 13 (`checkComputeAnnotations`): value-validate `**Compute:**`
  annotations.** A new lint check in `scripts/lint.mjs` (Check 13) scans every
  `**Compute:**` line in committed `openspec/changes/**/slices.md` and `**/tasks.md`
  files and flags: a missing or empty `model=` token; a `model=` value not in
  `{sonnet, opus}`; and an `effort=` value (if present) not in `{low, medium, high}`.
  This is value-validation only -- it does NOT assert a `**Compute:**` line is
  present on every slice. With the implementer self-halt dropped, Check 13 is the
  only static gate catching a malformed annotation before implement hits it at
  runtime. Tolerates both the dash-bullet (`slices.md`) and bare bold (`tasks.md`)
  structural forms.

- **Stage-command model threading on every Agent call.** Every QRSPI stage command
  (`questions`, `research`, `design`, `structure`, `slices`, `plan`, `pr`) now
  passes an explicit `model:` parameter on its Agent call, sourced from that agent's
  frontmatter `model:` value. Previously only `implement` threaded a model. The
  `implement` command is updated to parse the `model=` token from the next un-ticked
  `**Compute:**` line in `tasks.md` and pass it per-invocation. The implementer
  agent's self-halt-on-model-mismatch instruction is removed -- the orchestrator's
  spawn-time `model:` parameter is the sole gate. A prose note in
  `claude/commands/implement.md` explains that `effort=` documents per-stage intent
  and is honored via the implementer agent's frontmatter `effort:`, not as a
  per-invocation parameter.

- **FIX MODE inline compute spec and prose/wiring fix in `followup.md`.** The FIX
  MODE path in `/qrspi:followup` gains an optional inline compute spec parsed from
  the follow-up description: `(compute: model=... effort=...)`. When present, the
  orchestrator threads `model:` per-invocation on the implementer Agent call; when
  absent, the default applies. Separately, a prose/wiring mismatch is fixed: the
  `followup.md` prose said "default sonnet" but the Agent call omitted `model:`,
  so the implementer's frontmatter `model: opus` silently won. The FIX MODE default
  is now explicit and wired -- the orchestrator passes `model: sonnet` unless an
  inline `(compute: model=X)` spec overrides it. Prose and wiring now agree.

- **Migration manifest `migrations/0.9.0.yaml`.** A new migration manifest
  documents the `**Model:** -> **Compute:**` grammar change for consumer repos with
  in-flight changes. `automated: []` (no safe blind edit exists for arbitrary change
  folders); the `manual:` step instructs users to rewrite any `**Model:** X -- R`
  line in in-flight `slices.md`/`tasks.md` to `**Compute:** model=X -- R` (effort
  omitted means inherit). See the 0.9.0 manifest for the exact wording.

- **Per-stage skill-set lint (`checkSkillSets`, Check 2b).** A new lint check
  in `scripts/lint.mjs` asserts each of the seven stage agents' `Load skills`
  line matches an approved per-stage registry (`SKILL_SET_EXPECTED` in the new
  shared module `scripts/skill-sets.mjs`). Stray or missing skill loads cause a
  non-zero exit naming the offending agent and the unexpected/missing skills.
  Four agents are trimmed: `openspec-workflow` removed from researcher,
  questioner, designer, and planner (not needed per their read contracts);
  `context-hygiene` added to researcher. The registry is exported from
  `scripts/skill-sets.mjs` so `scripts/context-footprint.mjs` (below) can reuse
  it without drift. Registered as Check 2b (immediately after Check 2 frontmatter
  validation).

- **Output-contract banners + Check 12 (`checkOutputContracts`).** A new lint
  check in `scripts/lint.mjs` (Check 12) asserts each of the seven stage agents
  carries a `> **Output contract**` banner line. The banner documents what the
  subagent must return in its final message so the orchestrator's context stays
  lean; implementer and reviewer banners additionally carry a cap sentence. This
  is a presence-only check (banner text is human-authored). Mirrors the scope and
  pattern of Check 7 (`checkReadContracts`).

- **`scripts/context-footprint.mjs` -- per-stage context footprint reporter.**
  A report-only Node ESM script (always exits 0) that prints a table with one row
  per stage agent: agent stem, skill count, total lines, total bytes, and a rough
  token estimate (`Math.round(bytes / 4)`). The skill list is sourced from the
  shared `scripts/skill-sets.mjs` module (single source of truth with Check 2b).
  Useful for spotting context-budget creep before it becomes a lint failure. Run
  from the repo root: `node scripts/context-footprint.mjs`.

- **Repo-surface-aware artifact sections (`repo-applicable-artifact-sections`).**
  Every artifact-producing QRSPI agent (questioner, designer, architect, planner,
  reviewer) now omits CRUD/web-app sections -- Data model, API, UI, Auth &
  authorization, Migrations, and their variants -- instead of writing "Not
  applicable" stanzas when those surfaces are absent from the repo under analysis.
  A new shared skill `repo-surface` defines the closed five-surface taxonomy
  (`data-store`, `http-api`, `ui`, `auth`, `typed-nullable`), the section-to-surface
  mapping, the omit mechanic (no heading, no body, no "Not applicable"), and the
  inference rule (explicit `## Repo surface` block in the stack cheatsheet takes
  priority; prose inference fires as fallback; full menu + warning when inference
  is ambiguous). The kit's own project-scoped stack cheatsheet
  (`.claude/skills/qrspi-stack/SKILL.md`) carries an explicit `## Repo surface`
  block declaring all five surfaces absent, so QRSPI's own artifact runs produce
  clean outputs with no CRUD stanzas. The `/qrspi:stack` cheatsheet template is
  extended with a `## Repo surface` section so all newly generated cheatsheets
  include it going forward. Lint Check 3's required questioner heading set shrinks
  from ten to three (the seven CRUD headings are no longer statically required).
  A new lint Check 11 (`checkNoCrudSkeletonHeadings`) enforces the inverse: the
  twelve CRUD headings must not appear as literal heading lines inside fenced
  skeleton blocks in any of the five agent files, guarding against future
  regressions. Check 11 carries a disjoint-set invariant comment (Check 3 requires
  surface-independent headings present anywhere; Check 11 requires CRUD headings
  absent from fences -- disjoint heading sets and disjoint scopes). The
  `vertical-slice` skill gains a note pointing readers to `repo-surface` to identify
  which slice steps apply to their repo; the `workflow` skill's skip-stage rule
  gains a parenthetical clarifying that "data model, API, auth" are web-app examples
  and directing non-web repos to the stack cheatsheet's `## Repo surface` block.

## [0.8.0] - 2026-07-24

### Added

- **Triage gate for post-PR follow-ups (`right-size-followup-handling`).** `/qrspi:followup` now runs a never-suppressed triage gate before spawning the implementer, routing each follow-up to one of three paths: P1 (implement directly -- today's path), P2 (amend this change in place -- edit the approved `design.md`/delta specs and add a `## N.` slice to `slices.md`+`tasks.md`, extending the same open PR, then offer `/qrspi:implement`), or P3 (defer -- append an `idea` row to `openspec/backlog.md`). The agent proposes a path from a four-signal heuristic rubric; the human confirms or overrides. The `workflow` skill's "After PR" section is updated to summarise the three paths. Adds lint Check 10 (`checkTriagePaths`) asserting the P1/P2/P3 choice-label anchors in `claude/commands/followup.md`.

- **Session-start version check (`session-version-check-and-update-prompt`).**
  A new shipped skill `qrspi-version-check`, loaded as the first step of
  `/qrspi:status` and all eight stage commands, compares the repo's
  `openspec/.qrspi-version` marker against the installed kit version — read
  portably from Claude Code's `installed_plugins.json` registry (under
  `$CLAUDE_CONFIG_DIR`), never from a CWD-relative `plugin.json` — and, when the
  repo is behind, offers to run `/qrspi:update` (a human-gated prompt, never a
  silent migration). Up-to-date is silent, a downgrade warns once, and an
  unreadable version degrades to a warn-and-proceed notice; the check is
  suppressed to once per session via an in-context flag. Adds lint Check 9
  (`checkVersionCheckEmbed`) asserting the embed in all nine command bodies and
  a README skills-list entry.
- **`/qrspi-dogfood` dev-tooling** (under `.claude/`, not shipped to consumers):
  provisions a throwaway consumer fixture and walks an in-flight change's
  `(human)` verification tasks one at a time against a live `--plugin-dir`
  session, so runtime behaviour is observed before the PR stage.

### Changed

- **Local spec validation now matches CI's strict gate.** The architect (stage S)
  and implementer (slice boundary) now run `openspec validate <id> --strict`, and
  the spec-delta guidance is corrected: a requirement's **first line** (not merely
  its first *sentence*) must contain `MUST`/`SHALL`, because OpenSpec's strict
  parser reads the first physical line as the requirement statement. Plain
  `openspec validate <id>` skips this rule, so a spec could pass locally yet fail
  CI's `openspec validate --all` (strict); aligning the local gate closes that gap.

### Removed

- **Dropped GitHub Copilot support entirely.** QRSPI is now Claude Code-only.
  Removed the generated `copilot/` artifact tree, the `sync-copilot.mjs`
  generator, the `install.{sh,ps1}` / `uninstall.{sh,ps1}` Copilot install
  scripts, the `qrspi-sync-copilot` dev command + skill, and the CI/release
  `drift` gate that verified `copilot/` was in sync with `claude/`. `claude/`
  is now the sole source of truth; the kit installs only as a Claude Code
  plugin via the marketplace. README, CONTRIBUTING, CLAUDE.md, and the base
  specs (`qrspi-command-surface`, `ci-quality-gates`, `kit-governance`;
  `copilot-sync` removed) were updated to drop the two-tool framing. Existing
  Copilot users can delete `~/.copilot/` by hand; no migration is provided.

## [0.7.0] - 2026-07-22

### Added

- **PR stage reconciliation gates: tasks pass + follow-ups pass (`pr-review-open-tasks-and-followups`).**
  `/qrspi:pr` now runs two reconciliation passes before spawning the reviewer subagent.
  The **tasks pass** reads `tasks.md`, separates un-ticked boxes into regular tasks and
  `(human)` boxes, and presents each one via AskUserQuestion (Finish / Drop / Pause for
  regular tasks; Confirm-done / Drop / Leave-for-now for human boxes). Dropped items are
  annotated `- [x] ~~N.M text~~ (dropped)`; Leave-for-now boxes remain un-ticked as a
  sanctioned exception noted for the reviewer. The **follow-ups pass** reads `followups.md`
  (if present) and presents each un-ticked entry via AskUserQuestion (Fix now / Defer /
  Drop / Promote to backlog idea). Both passes are mode-aware: in Full/Semi-auto mode
  a clean pass (zero open items) is suppressed silently, while open items trigger a
  hard-stop that halts the auto chain; Manual mode always shows the banner including
  the "0 open" variant. If either pass ends early (Finish / Pause / Stop here / Fix now),
  any Drop/Confirm-done edits already made are committed as
  `docs(<id>): reconcile open tasks before PR`. The reviewer agent gains an awareness
  note that a Leave-for-now `(human)` box is a sanctioned open item, not a blocking issue.
  The `workflow` skill Hard-stop section gains a one-line cross-reference to the
  reconciliation-gate hard-stop mechanics. A new lint **Check 8** asserts that
  `claude/commands/pr.md` contains both reconciliation-pass sections with their required
  structural anchors (tasks-pass heading + Finish/Drop/Pause labels; follow-ups-pass
  heading + Fix-now/Defer/Drop/Promote labels).

### Changed

- **Implementer ticks each `tasks.md` checkbox immediately after its task.**
  The QRSPI implementer agent now ticks each checkbox immediately after confirming
  that task's output is correct -- before the next task starts -- so progress is
  visible live and `tasks.md` stays durable if a slice is interrupted. Each tick
  is persisted as its own edit; batching ticks to the end of the slice is
  explicitly prohibited. Commits and human checkpoints remain at slice granularity;
  only the ticking is immediate. The Coding-rules bullet is rewritten as a terse
  pointer to step 4a.

## [0.6.0] - 2026-07-15

### Added

- **Per-agent read-contract banners + narrowed read sets (`tighten-stage-read-boundaries`).**
  Each of the seven QRSPI stage agents (questioner, researcher, designer, architect,
  planner, implementer, reviewer) now carries a `> **Read contract**` banner at the
  top of its agent file declaring exactly which within-change artifacts it is
  permitted to open and which it must never open. Read sets are narrowed to the
  minimum required per stage: questioner reads no change-folder artifact;
  researcher reads none (whole `changes/<id>/` banned); designer reads
  `questions.md` + `research.md` only; architect reads `design.md` (S-path) or
  `proposal.md` + `specs/` (V-path); planner reads `slices.md` only; implementer
  reads `tasks.md` only; reviewer reads the full current-change folder by design.
  A cross-change boundary clause -- "never open another change's process artifacts;
  `spec.md` excepted" -- is added to every agent body. The archived-`questions.md`
  read in the questioner (a cross-change read smuggled in as a template lookup)
  is replaced by a reference to `openspec-templates/questions.template.md`. The
  designer's trigger-honouring step is reworded to source scheduled triggers from
  `openspec/specs/**` base specs only. The `workflow` skill gains a "Read Matrix"
  subsection with an 8-row table (stage, agent, within-change reads, cross-change
  rule) as the single authoritative source of the per-agent contracts. A new
  `scripts/lint.mjs` **Check 7 (`checkReadContracts`)** mechanically enforces
  banner presence and banner-vs-matrix agreement for all 7 agent files on every
  CI run. The `migrations/0.6.0.yaml` manifest is extended with a manual
  migration note for repos with locally overridden agent files.

- **`/qrspi:update` command + `qrspi-update` skill for versioned per-repo
  migration.** Introduces an `openspec/.qrspi-version` marker written by
  `/qrspi:init` (bare SemVer, no `v` prefix) that records the kit version each
  repo's `openspec/` layout was initialized against. A new main-loop
  `/qrspi:update [<target-version>]` command reads the marker, resolves the
  target via auto-detect (installed plugin version) with an explicit-arg
  fallback, walks every `migrations/<version>.yaml` entry in ascending SemVer
  order for `marker < v <= target`, hybrid-applies mechanical `edit-file` steps
  automatically and gates judgment steps via `AskUserQuestion`, then bumps the
  marker and prints a ready-to-run `git commit` command (does not auto-commit).
  Edge cases are handled: already-up-to-date exits cleanly; absent marker offers
  to initialize; downgrade is a hard-stop. A new `migrations/` directory ships
  the kit-side manifest (one YAML per release from `0.6.0` onward); `scripts/
  lint.mjs` gains a presence check (every `## [X.Y.Z]` CHANGELOG section must
  have a matching `migrations/<version>.yaml`) plus schema well-formedness
  validation (`edit-file`-only `action`, `openspec/`-scoped paths, required keys,
  SemVer marker format). The `qrspi-release` skill and CONTRIBUTING release
  checklist now include the manifest-entry step as a precondition. README gains
  `/qrspi:update` in the helpers line and an "Updating your repo" note.
  The `copilot/` tree is regenerated at zero drift. See
  `openspec/changes/versioned-update-command/`.

- **`/qrspi:archive` now gates on a merged PR and keeps the backlog in sync.**
  Archival previously moved a change folder under `archive/` unconditionally —
  never verifying the linked PR merged, and never touching `openspec/backlog.md`.
  `/qrspi:archive` now, before delegating to the generated
  `openspec-archive-change` skill, reads the change's `pr.md`, queries the linked
  PR's live status via the host git CLI (`gh` / `az repos` / `glab`, resolved
  from the stack-cheatsheet's `## PR & git workflow` section or inferred from repo
  signals), surfaces the PR number/state/URL, and **hard-blocks** unless the PR is
  `merged` — uniformly for open and closed-unmerged, with distinct hard-stops for
  a missing `pr.md` and an unavailable/unauthenticated CLI. On a successful
  archive it **removes the change's backlog row** and commits it atomically with
  the folder move (the archive flow's first-ever explicit commit step), and
  **proposes the commit target** — a new `chore/archive-<id>` branch (default,
  with a PR-create suggestion) or straight to `main`, since the archive syncs
  delta specs into `openspec/specs/` while typically running post-merge on `main`.
  Adds a parallel PR-status-query line to the `stack.md` cheatsheet template and
  names `/qrspi:archive` as the row-removal owner in the `workflow` skill.
  Claude-only; the `copilot/` tree is regenerated at zero drift. See
  `openspec/changes/archive-requires-merged-pr/`.

## [0.5.0] - 2026-07-08

### Added

- **Ternary run-mode (Full auto / Semi-auto / Manual).** A run-mode prompt now
  appears at the top of a fresh QRSPI stage invocation. **Full auto** chains
  `Q → R → D → S → V → P → I → PR` unattended, auto-advancing the commit step
  (commit + push), the next-stage handoff, Structure's design-approval gate, the
  per-slice Implement checkpoints (per-slice model re-invocation preserved), and
  PR-create — pausing only at the Q product-question pass, the D design review,
  the Q/D/S backlog-capture offers, and a fixed set of hard-stops (failing
  precondition, git commit/push failure, a subagent error/block, or
  implementation diverging from the approved design). **Semi-auto** additionally
  pauses at every stage boundary; **Manual** is the prior every-gate behaviour.
  The mode is held in the orchestrator's context for the life of the chain with
  **no disk persistence** (re-asked on a fresh session); Esc/stop aborts a
  running chain. Implemented as a "Run-mode" procedure in the `workflow` skill
  referenced by all eight stage commands, plus per-procedure auto-branches; the
  implementer's contract now requires returning *blocked* (not committing) on a
  failing lint/typecheck/test so a red slice cannot be auto-pushed. Claude-only;
  the `copilot/` tree is regenerated at zero drift. See
  `openspec/changes/add-auto-mode/`.

### Changed

- **Dropped the `qrspi-` prefix from the three remaining skill names**
  (`qrspi-workflow` → `workflow`, `qrspi-postpr-fix` → `postpr-fix`,
  `qrspi-retrospective` → `retrospective`). As with the earlier subagent-prefix
  drop (v0.3.0), the plugin namespace already prefixes skills, so these were
  stuttering as `qrspi:qrspi-workflow`; they are now the clean `qrspi:workflow`
  and match their unprefixed siblings (`context-hygiene`, `vertical-slice`,
  `openspec-workflow`). Skill directories, frontmatter, every internal reference
  across the seven agents and the stage commands, the live
  `qrspi-command-surface` spec, `CONTRIBUTING.md`, and the generated `copilot/`
  instructions were updated. Lint Check 5's choreography probe now matches the
  backtick-wrapped `` `workflow` `` skill reference. The `.claude/` dev-tooling
  commands (`qrspi-sync-copilot`, `qrspi-readme-audit`) keep their prefix — they
  are not plugin-namespaced, so the prefix is their only scope.

  **Migration:** if you reference these skills by name in your own prompts or
  tooling, update `qrspi-workflow` → `workflow`, `qrspi-postpr-fix` →
  `postpr-fix`, `qrspi-retrospective` → `retrospective` (Claude), and the
  corresponding `copilot/instructions/*.instructions.md` filenames.

---

## [0.4.1] - 2026-06-21

### Fixed

- **Stage gate execution.** All nine QRSPI stage commands (`questions`,
  `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`,
  `followup`) now run on the main-loop orchestrator instead of being routed
  into a subagent by `agent:`/`subtask:` frontmatter. That routing had made the
  AskUserQuestion commit/handoff/approval gates dead under the real
  plugin-invocation path, because a subagent cannot reach AskUserQuestion. Each
  command now delegates only the bounded artifact write to its stage subagent
  via the Agent tool, and the next-stage handoff re-enters the next command in
  the main loop (not a subagent spawn).
- **Retrospective skill mirror references.** `qrspi-retrospective` no longer
  points contributors at a nonexistent `.github/` mirror and
  `./scripts/sync-agent-defs.ps1`; it now names the real `copilot/` mirror,
  regenerated with `node sync-copilot.mjs` (verified by `--check`). Surfaced
  by the `verify-stage-gate-execution` stage-I retrospective.

### Added

- **Lint Check 5 (gate-tool / executor agreement).** A standing
  [`scripts/lint.mjs`](scripts/lint.mjs) guard flags any command that declares a
  non-builtin `agent:` while its body reaches a main-loop-only gate tool
  (`AskUserQuestion`) -- either named inline or invoked transitively via the
  `qrspi-workflow` choreography -- preventing the gate-trapping bug class from
  recurring silently.

---

## [0.4.0] - 2026-06-19

### Added

- **Tag-based release process.** A release is now cut by pushing a `vX.Y.Z` tag,
  not by merging a PR. The new [`release.yml`](.github/workflows/release.yml)
  workflow runs on the tag: it re-checks lint + sync drift, asserts the tag
  matches `plugin.json` `version` and that a matching `CHANGELOG.md` section
  exists, then publishes a GitHub Release. Feature PRs no longer bump `version`
  — they record changes here under `[Unreleased]`, and `main` may sit ahead of
  the latest release. See CONTRIBUTING "Releases (tag-based)" and the CLAUDE.md
  "Don't bump the version in feature work" rule. Consumers install from tags;
  the marketplace pins the qrspi `source` to a release tag.

### Changed

- **Renamed the Worktree stage to Slices** (stage code `W` -> `V`, command
  `/qrspi:worktree` -> `/qrspi:slices`, artifact `worktree.md` -> `slices.md`).
  The old name collided with git worktrees (a real Claude Code feature) and was
  never part of the QRSPI acronym. All sources now agree on the
  `S -> Slices -> P` order, and a QRSPI / "Crispy" acronym-lineage note was added
  to the `qrspi-workflow` skill and the README. The kit stays **eight stages**.
  Historical change folders keep their `worktree.md` with a pre-rename
  annotation (not rewritten).

  **Migration:** use `/qrspi:slices <id>` instead of `/qrspi:worktree <id>`. New
  change folders write `slices.md`; existing `worktree.md` files are unaffected.

- **Retired the `example-greeting` CI fixture.** The CI validate job now runs
  `openspec validate --all` against the real `openspec/specs/` surface (populated
  by archiving the first merged changes) instead of a permanently-active
  fictional change. `example-greeting` is archived as a worked reference under
  `openspec/changes/archive/`, and the `reference-example` spec no longer mandates
  an active fixture. Removes the long-standing smell of a fake change kept alive
  only to give CI something to validate.

---

## [0.3.0] - 2026-06-18

### Added

- **README freshness tooling** (recorded retroactively). A CI lint check
  (`scripts/lint.mjs` Check 4) asserting every shipped `/qrspi:*` command is
  documented in the README and vice-versa; a CLAUDE.md "Keep the README current"
  rule; and a `/qrspi-readme-audit` dev command + skill that diffs the README
  against the source surface.

### Changed

- **Dropped the `qrspi-` prefix from the seven subagent names** (`qrspi-questioner`
  → `questioner`, etc.). In Claude Code the plugin namespace already prefixes
  agents, so they were stuttering as `qrspi:qrspi-questioner`; they are now the
  clean `qrspi:questioner`. This matches the earlier command-prefix drop. The
  generated Copilot agents are correspondingly renamed `copilot-qrspi-<x>.agent.md`
  → `copilot-<x>.agent.md`.

  **Migration:** if you reference a QRSPI agent by name (e.g. in your own prompts
  or tooling), update `qrspi-<role>` → `<role>` (Claude) and
  `copilot-qrspi-<role>` → `copilot-<role>` (Copilot). Reinstalling the Copilot
  kit replaces the agent files; the Claude plugin updates via the marketplace.

---

## [0.2.0] - 2026-06-18

### Added

- **Node.js generator** (`sync-copilot.mjs`) replacing the PowerShell script
  (`sync-copilot.ps1`) and bash wrapper (`sync-copilot.sh`). The new generator
  includes correct exit codes, deleted-file detection (union-of-trees comparison
  in `--check` mode), a source guard that aborts before wiping `copilot/` if
  any source directory is missing, `try/finally` temp-dir cleanup, and a
  missing-`SKILL.md` warning that exits non-zero.
- **GitHub Actions CI** (`.github/workflows/ci.yml`) with three parallel jobs:
  - `drift` -- `node sync-copilot.mjs --check`
  - `lint` -- `node scripts/lint.mjs` (pin agreement, frontmatter validity,
    heading-level skeleton check)
  - `validate` -- `npx --yes @fission-ai/openspec@1.4.1 validate example-greeting`
- **Lint script** (`scripts/lint.mjs`): pin-drift assertion, frontmatter/name
  lint, heading-level skeleton check against `openspec-templates/*.template.md`.
- **Reference example** (`openspec/changes/example-greeting/`):
  a hand-authored minimal fictional change with the full QRSPI artifact set,
  valid for `openspec validate example-greeting`. Kept as an active fixture (not
  archived) because `openspec validate` only resolves active changes.
- **`CONTRIBUTING.md`**: semver discipline table, sync workflow, version-bump
  checklist (including the pin-coupling rule), and convention-only stub note.
- **`CHANGELOG.md`**: this file.
- Canonical choreography sections (commit step, next-stage handoff,
  precondition, backlog-atomicity) added to `claude/skills/qrspi-workflow/SKILL.md`.

### Changed

- `plugin.json` version bumped to `0.2.0`; description updated to drop the
  "opsx-* OpenSpec helpers" claim.
- All eight QRSPI stage command files thinned to stubs referencing
  `qrspi-workflow` for invariant choreography.
- `Edit` removed from `qrspi-researcher` and `qrspi-planner` agent frontmatter
  (least-privilege tightening). `qrspi-questioner` retains `Edit` because it
  edits the backlog row in place.
- `README.md`: corrected the false "two coupled places" pin claim, fixed the
  stale `claude/commands/qrspi:init.md` path (now `init.md`), and rewrote the
  pin-bump procedure to use `node sync-copilot.mjs`.
- `CLAUDE.md`: replaced `sync-copilot.ps1` / `sync-copilot.sh` references with
  `sync-copilot.mjs`.
- Install scripts (`install.ps1`, `install.sh`): added self-heal sweep (see
  "Removed -- Migration note" below).

### Removed

- `sync-copilot.ps1` and `sync-copilot.sh` -- superseded by `sync-copilot.mjs`.
- Five opsx command files: `claude/commands/opsx/propose.md`, `explore.md`,
  `apply.md`, `archive.md`, `sync.md`.
- Three orphaned OpenSpec-generated skills: `claude/skills/openspec-propose/`,
  `claude/skills/openspec-explore/`, `claude/skills/openspec-apply-change/`.

#### Migration note for existing 0.1.0 installs

If you installed the kit at version 0.1.0, your `~/.copilot/` directory may
contain stale files that no longer exist in the kit:

- `opsx-propose.prompt.md`
- `opsx-explore.prompt.md`
- `opsx-apply.prompt.md`
- `opsx-archive.prompt.md`
- `opsx-sync.prompt.md`
- `openspec-propose.instructions.md`
- `openspec-explore.instructions.md`
- `openspec-apply-change.instructions.md`

**Re-running the install script** (`install.ps1` on Windows / `install.sh` on
macOS/Linux) will automatically remove all eight stale files before copying the
new artifacts. No manual cleanup is required.

---

## [0.1.0] - 2026-01-15

### Added

- Initial QRSPI kit release.
- Claude Code slash commands for all eight QRSPI stages (Q, R, D, S, P, W,
  I, PR) plus `init`, `status`, `followup`, `retro`, and `archive`.
- Copilot prompt equivalents for all commands, generated by `sync-copilot.ps1`.
- OpenSpec integration: `openspec/` scaffold, `openspec-*` skill files
  auto-generated by the CLI.
- opsx command surface (`opsx-propose`, `opsx-explore`, `opsx-apply`,
  `opsx-archive`, `opsx-sync`) for experimental OpenSpec workflow.
- `install.ps1` (Windows) and `install.sh` (macOS/Linux) installers.
- `plugin.json` with version `0.1.0`.
