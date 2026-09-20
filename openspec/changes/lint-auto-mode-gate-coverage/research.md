# Research — lint-auto-mode-gate-coverage

> Stage R of QRSPI. Generated 2026-09-20.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Lint check architecture — `scripts/lint.mjs`**: how individual checks are defined, numbered, and registered; execution order; the top-of-file comment block that enumerates checks; violation reporting vs. `OK:` lines; shared top-of-file constants that enumerate command files.
- **Embed-presence check pattern**: how existing embed-presence checks (Check 9 version-check-embed, Check 10 budget-gate-embed) detect a required substring across a set of command files.
- **Inline self-test pattern in lint checks**: which checks carry inline self-tests, where they run relative to file I/O, and the exact convention/shape.
- **Stage command files — `claude/commands/*.md`**: common structure of a stage command; early skill-load steps; run-mode establishment; numbered step that loads the choreography/workflow skill; tail "Choreography" paragraph.
- **Choreography / run-mode source skill**: where the run-mode procedure and stage-choreography instructions live; how command bodies reference it; any existing lint check that detects choreography references.
- **Lint invocation in CI and migration-manifest conventions**: how `scripts/lint.mjs` is invoked in CI; structure/location of migration manifest files.

## File map

### Lint check architecture

- `scripts/lint.mjs` — CI quality gate; 4697 lines; runs Checks 1–25 (plus sub-checks 2b and 10b) in a single `main()` call; collects all errors before exiting; exits 0 on full pass, 1 on any violation. Depends only on Node.js built-ins (`node:fs`, `node:path`, `node:url`). Imports `SKILL_SET_EXPECTED` and `COMMAND_SKILL_SET_EXPECTED` from `./skill-sets.mjs` (Check 2b).
- `scripts/skill-sets.mjs` — single source of truth for the per-stage and per-command skill-set registries; exports `SKILL_SET_EXPECTED` (9 stage-agent entries) and `COMMAND_SKILL_SET_EXPECTED` (3 command entries: `idea`, `pr`, `archive`).

**Check enumeration in the top-of-file comment block** (lines 6–200 of `scripts/lint.mjs`):

| Check | Label | Function |
|-------|-------|----------|
| 1 | PIN AGREEMENT | `checkPinAgreement` |
| 2 | FRONTMATTER / NAME | `checkFrontmatter` |
| 2b | SKILL-SET REGISTRY | `checkSkillSets` |
| 3 | HEADING ALIGNMENT | `checkHeadingAlignment` |
| 4 | README COMMAND COVERAGE | `checkReadmeCoverage` |
| 5 | GATE-TOOL / EXECUTOR AGREEMENT | `checkGateExecutor` |
| 6 | MIGRATION MANIFEST PRESENCE + SCHEMA + MARKER FORMAT | `checkMigrationManifests` |
| 7 | READ-CONTRACT BANNER AGREEMENT | `checkReadContracts` |
| 8 | PR RECONCILIATION PASSES STRUCTURE | `checkPrReconciliationPasses` |
| 9 | VERSION-CHECK EMBED | `checkVersionCheckEmbed` |
| 10 (budget-gate-embed) | BUDGET-GATE EMBED | `checkBudgetGateEmbed` |
| 10b | TRIAGE PATH ANCHORS | `checkTriagePaths` |
| 11 | NO SURFACE-GATED SKELETON HEADINGS IN FENCED BLOCKS | `checkNoCrudSkeletonHeadings` |
| 12 | OUTPUT-CONTRACT BANNER PRESENCE | `checkOutputContracts` |
| 13 | COMPUTE ANNOTATION VALUE-VALIDATION | `checkComputeAnnotations` |
| 14 | SURFACE APPLICABILITY OF ARTIFACT HEADINGS | `checkSurfaceApplicability` |
| 15 | IMPLEMENTER VARIANT AGENT DRIFT GATE | `checkVariantAgents` |
| 16 | FOLLOWUP BARE-STEM GUARD | `checkFollowupStem` |
| 17 | HELPER AGENT READ-CONTRACT BANNER AGREEMENT | `checkHelperAgentReadContracts` |
| 18 | MODIFIED SCENARIO COUNT GUARD | `checkModifiedScenarioCounts` |
| 19 | AUTHORITATIVE SYNC DELEGATOR | `checkAuthoritativeSyncDelegator` |
| 20 | REQUIREMENT FIRST-LINE MUST/SHALL GUARD | `checkRequirementFirstLineModal` |
| 21 | FORMAT-RULES PARITY GUARD | `checkFormatRulesParity` |
| 22 | BACKLOG SCHEMA GUARD | `checkBacklogSchema` |
| 23 | BACKLOG WIKILINK RESOLUTION | `checkBacklogWikilinks` |
| 24 | RESEARCHER GATE-INSTRUCTION PRESENCE | `checkResearcherGateInstruction` |
| 25 | CHANGELOG TASK EMISSION IN KIT-TOUCHING CHANGE FOLDERS | `checkChangelogTaskEmission` |

**Highest check number: 25.** (Sub-checks: 2b, 10b. Check numbers skip no integers but 10b re-uses the "10" label prefix.)

**Violation reporting pattern**: each check receives the shared `errors` array (passed by reference). Violations are pushed as `errors.push('[<tag>] <message>')`. On pass, `process.stdout.write('  OK: ...\n')`. The `main()` function reports all collected errors at the end.

**Key shared top-of-file constants that enumerate command files**:

```js
// Lines ~2001-2011
const VERSION_CHECK_COMMAND_STEMS = [
  'status', 'questions', 'research', 'design',
  'structure', 'slices', 'plan', 'implement', 'pr',
];

// Lines ~2068-2081
const BUDGET_GATE_COMMAND_STEMS = [
  // 8 stage commands
  'questions', 'research', 'design', 'structure',
  'slices', 'plan', 'implement', 'pr',
  // 2 boundary commands
  'archive', 'followup',
];
```

Both are hardcoded for regression safety; dynamic discovery is deliberately not used.

### Embed-presence check pattern

**Check 9 — version-check embed (`checkVersionCheckEmbed`):**

- Stems scanned: `VERSION_CHECK_COMMAND_STEMS` (9 files: `status`, `questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`).
- Detection substring (exact): `'Load skill \`qrspi-version-check\` and follow its instructions exactly.'`
- Method: collapse all whitespace (including newlines) to a single space before calling `.includes()` — so the sentence is matchable even when wrapped across two source lines.
- Violation message label: `[version-check-embed]`
- Pass message: `  OK: all ${VERSION_CHECK_COMMAND_STEMS.length} stage command(s) contain the qrspi-version-check embed line`

**Check 10 — budget-gate embed (`checkBudgetGateEmbed`):**

- Stems scanned: `BUDGET_GATE_COMMAND_STEMS` (10 files: 8 stage commands + `archive` + `followup`). Excluded (must NOT be in the constant): `status`, `update`, `retro`.
- Detection substring (exact): `'Load skill \`context-budget-gate\` and follow its instructions exactly.'`
- Method: identical to Check 9 — whitespace-collapsed `.includes()`.
- Violation message label: `[budget-gate-embed]`
- Pass message: `  OK: all ${BUDGET_GATE_COMMAND_STEMS.length} command(s) contain the context-budget-gate embed line`

**Pattern shared by both checks**: read file, collapse `text.replace(/\s+/g, ' ')`, then `collapsed.includes(EMBED_LINE)`. No regex, no line-by-line loop. If the file is not found, a `[...-embed] ${rel}: file not found` violation is pushed rather than throwing.

### Inline self-test pattern in lint checks

Most checks carry an **inline self-test** that runs to completion *before* any real file I/O. Self-tests:

- Use in-memory synthetic fixture strings assembled from fragments (never from live files).
- Push errors into the shared `errors` array with the prefix `SELF-TEST FAILED:` when a fixture does not behave as expected.
- Emit an `  OK: <self-test> — ... all pass` line when every fixture passes (so a silent self-test is distinguishable from one that never ran).
- A failing self-test pushes errors and either returns early (`return 1`) to block real-file scanning, or sets a `selfTestFailed` flag and returns 1 before file I/O.

**Checks with inline self-tests** (confirmed): 1 (pin sweep; config-coupling), 6 (migration schema positive-path), 13 (compute annotation), 14 (surface applicability), 15 (variant agent; base-agent absence), 17 (banner-absent fixture), 21 (format-rules parity), 22 (backlog schema), 23 (backlog wikilink), 24 (researcher gate-instruction), 25 (changelog task emission).

**Checks without inline self-tests** (structural presence checks): 2, 2b, 3, 4, 5, 7, 8, 9, 10, 10b, 11, 12, 16, 18, 19, 20.

**Self-test position relative to file I/O**: always *before* file I/O. The pattern is: self-test block → early return on failure → real file scan.

### Stage command files — `claude/commands/*.md`

**Files present**:
`archive.md`, `design.md`, `followup.md`, `idea.md`, `implement.md`, `init.md`, `plan.md`, `pr.md`, `questions.md`, `research.md`, `retro.md`, `slices.md`, `stack.md`, `status.md`, `structure.md`, `update.md`

**Common structure of stage command files** (eight stage commands: `questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`):

Every stage command body begins with the same three numbered steps:

1. **Step 1 — version check (silently):**
   ```
   Load skill `qrspi-version-check` and follow its instructions exactly.
   ```
   With silence-discipline note: "do not announce or narrate this step." Explicitly "before the run-mode establishment and before any other work."

2. **Step 2 — context budget gate:**
   ```
   Load skill `context-budget-gate` and follow its instructions exactly.
   ```

3. **Step 3 — stage choreography (run-mode establishment):**
   ```
   Load skill `stage-choreography` and follow its instructions exactly -- it carries the canonical main-loop procedures this command runs (run-mode, precondition check, commit step, next-stage handoff). Read or establish the run-mode by following its **Run-mode** procedure before doing any other work.
   ```

**Tail "Choreography" paragraph** (all stage commands except `design`, which inlines its commit step):

```
**Choreography (see skill `stage-choreography`, "Stage choreography").** Follow
the canonical *commit step* and *next-stage handoff* there, with these
stage variables:
- Artifact: openspec/changes/<id>/...
- Commit message: ...
- Git add line: ...
- Next-stage command: /qrspi:<next> <id>
```

**`design.md`** does not use the tail Choreography paragraph. It inlines step 5 ("Commit step (mandatory): … follow the canonical *commit step* in skill `stage-choreography`") and step 6 ("Next-stage handoff:") directly in its body after the decision-review steps.

**`status.md`** carries the version-check step (step 1) but no budget-gate embed, no stage-choreography step, and no Choreography tail — it does not run a subagent.

**`questions.md`** carries all three early skill-load steps plus loads additional skills inline (`workflow`, `openspec-workflow`, `git-host-workflow`, `backlog-writer`) for its branch-creation and deferred-work steps.

### Choreography / run-mode source skill

- `claude/skills/stage-choreography/SKILL.md` — the authoritative source for the four canonical main-loop procedures (run-mode establishment, precondition check, commit step, next-stage handoff) and the hard-stop procedure, backlog atomicity, and stage-specific gate notes. Audience: orchestrator only (frontmatter: `audience: orchestrator`). Not to be loaded in stage subagents.
- `claude/skills/workflow/SKILL.md` — companion skill; contains the stage model, Read Matrix, divergence rubric. Used by stage subagents and the orchestrator for stage sequencing.

**How command bodies reference the choreography skill:**

All stage commands (except `status`) load `stage-choreography` in step 3 with the canonical phrase:
```
Load skill `stage-choreography` and follow its instructions exactly
```

The tail Choreography paragraph uses the reference string:
```
**Choreography (see skill `stage-choreography`, "Stage choreography").**
```

And inline mid-body references use:
```
canonical *commit step* / *next-stage handoff* / *precondition check* in skill `stage-choreography`
```

**Check 5 — Gate-tool / executor agreement (`checkGateExecutor`)** is the existing lint check that detects choreography references. It uses:

```js
const CHOREOGRAPHY_SKILLS = ['`stage-choreography`', '`workflow`'];
const CHOREOGRAPHY_MARKERS = ['Stage choreography', 'commit step', 'next-stage handoff'];
```

The check fires a violation when a command with a non-builtin `agent:` frontmatter field transitively reaches `AskUserQuestion` via either a direct reference or via the combination of a `CHOREOGRAPHY_SKILLS` mention AND a `CHOREOGRAPHY_MARKERS` mention (Check 5 uses this as a proxy for the choreography procedures reaching the gate tool). This is the only existing lint check that parses choreography reference strings.

**No existing check** verifies that a stage command's step 3 specifically references `stage-choreography` (rather than the older `workflow` skill). Check 5 accepts either `'`stage-choreography`'` or `'`workflow`'` as a choreography skill match.

**`COMMAND_SKILL_SET_EXPECTED` in `scripts/skill-sets.mjs`** registers `stage-choreography` as a required skill for `pr` and `archive` commands, validated by Check 2b. The eight primary stage commands (`questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`) are not individually listed in `COMMAND_SKILL_SET_EXPECTED` — only `idea`, `pr`, and `archive` have entries there. Stage commands' skill loads are validated by Check 2 (frontmatter skill-ref resolution) but not by the registry-equality check of Check 2b.

### Lint invocation in CI and migration-manifest conventions

**CI invocation** (`.github/workflows/ci.yml`):
- Job `lint`: `node scripts/lint.mjs` — no flags; single step; runs on `ubuntu-latest` with Node.js 20.
- Job `validate`: `npx --yes @fission-ai/openspec@1.9.0 validate --all --strict` — separate job.
- Trigger: `pull_request` targeting `main`, `push` to `main`, `workflow_dispatch`.

**Migration manifest files** (`migrations/`):
- Present files: `0.6.0.yaml`, `0.7.0.yaml`, `0.8.0.yaml`, `0.9.0.yaml`, `0.10.0.yaml`, `0.10.1.yaml`, `0.11.0.yaml`, `0.12.0.yaml`, `0.13.0.yaml`, `0.14.0.yaml` — 10 manifests total.
- Floor version: `0.6.0` (hardcoded constant `MIGRATION_FLOOR` in `scripts/lint.mjs`; the floor manifest itself is required to always exist).
- Schema (required keys): `version`, `summary`, `automated`, `manual`.
- `automated[]` item shape: `action` (must be `'edit-file'`), `path` (must start with `'openspec/'`), `description`; optional fields: `skip_if_contains` (non-empty string), `anchor_missing` (must be `'warn-and-skip'`).
- `manual[]` item shape: free-form description strings (no structural constraint beyond being a list).
- `version` field must match the filename stem exactly.
- Marker file `openspec/.qrspi-version` (optional): if present, must contain bare SemVer (`X.Y.Z`, no `v` prefix).

## Slash-command surface

- `claude/commands/archive.md` — boundary command; carries `context-budget-gate` and `stage-choreography` loads; registered in `COMMAND_SKILL_SET_EXPECTED`.
- `claude/commands/design.md` — stage D; carries all three early skill-load steps; inlines commit/handoff rather than using a tail Choreography paragraph.
- `claude/commands/followup.md` — boundary command; carries `context-budget-gate` embed; contains P1/P2/P3 triage anchors.
- `claude/commands/idea.md` — helper command; loads `backlog-writer`; registered in `COMMAND_SKILL_SET_EXPECTED`.
- `claude/commands/implement.md` — stage I; carries all three early skill-load steps + tail Choreography paragraph.
- `claude/commands/init.md` — bootstrap command; carries the `backlog.template.md` sentinel block; no stage skill-loads.
- `claude/commands/plan.md` — stage P; carries all three early skill-load steps + tail Choreography paragraph.
- `claude/commands/pr.md` — stage PR; carries all three early skill-load steps; registered in `COMMAND_SKILL_SET_EXPECTED` with `stage-choreography`, `git-host-workflow`, `qrspi-version-check`, `context-budget-gate`.
- `claude/commands/questions.md` — stage Q; carries all three early skill-load steps; additionally loads `workflow`, `openspec-workflow`, `git-host-workflow`, `backlog-writer`.
- `claude/commands/research.md` — stage R; carries all three early skill-load steps + tail Choreography paragraph; delegates to `qrspi:researcher` subagent.
- `claude/commands/retro.md` — no budget-gate, no choreography, no version-check; excluded from `BUDGET_GATE_COMMAND_STEMS`.
- `claude/commands/slices.md` — stage V; carries all three early skill-load steps.
- `claude/commands/stack.md` — per-repo stack setup; no stage skill-loads.
- `claude/commands/status.md` — carries version-check (step 1) only; no budget-gate, no choreography, no subagent; excluded from `BUDGET_GATE_COMMAND_STEMS`.
- `claude/commands/structure.md` — stage S; carries all three early skill-load steps + precondition/approval gate.
- `claude/commands/update.md` — kit update command; excluded from `VERSION_CHECK_COMMAND_STEMS` (Check 9 header comment explicitly calls this out).

## Stage-agent surface

- `claude/agents/researcher.md` — researcher subagent; step 1 loads `context-hygiene`, `repo-surface`, `workflow` (plus the per-repo `-stack` cheatsheet); carries the surface-gate instruction phrase `'surface-gate rule per the \`repo-surface\` skill'` in its `## What to do` step 1.
- `claude/agents/questioner.md`, `designer.md`, `architect.md`, `planner.md`, `reviewer.md`, `spec-syncer.md` — the other stage/helper agents; each carries `> **Read contract**` and `> **Output contract**` banners.
- `claude/agents/implementer-low.md`, `implementer-medium.md`, `implementer-high.md` — effort variants; each loads only `implementer-core` in step 1; each carries matching `effort:` frontmatter; registered in `.claude-plugin/plugin.json` `agents` array.

## Skill surface

- `claude/skills/stage-choreography/SKILL.md` — canonical source for the four main-loop procedures; audience: orchestrator; contains run-mode establishment, precondition check, commit step, next-stage handoff, hard-stop procedure, never-suppressed gates, stage-specific gate notes.
- `claude/skills/workflow/SKILL.md` — companion skill; stage model, Read Matrix, divergence rubric; used by both orchestrator and subagents.
- `claude/skills/context-budget-gate/SKILL.md` — runtime structural gate; tracks in-context tool-call counter; nudges at 8, soft-gates at 12; fires in all run-modes.
- `claude/skills/qrspi-version-check/SKILL.md` — version check run silently at top of every stage command.
- `claude/skills/repo-surface/SKILL.md` — surface taxonomy and section filter; loaded by stage agents.
- Other present skills: `backlog-writer`, `context-hygiene`, `git-host-workflow`, `implementer-core`, `openspec-archive-change`, `openspec-sync-specs`, `openspec-workflow`, `postpr-fix`, `qrspi-update`, `retrospective`, `vertical-slice`.

## Lint-gate surface

- `scripts/lint.mjs` — described above. 25 checks (Checks 1–25) plus sub-checks 2b and 10b.
- `scripts/skill-sets.mjs` — shared module; exports `SKILL_SET_EXPECTED` and `COMMAND_SKILL_SET_EXPECTED`.

## Template surface

- `openspec-templates/backlog.template.md` — backlog template; drift-guarded against an inline copy embedded in `claude/commands/init.md` (between `<!-- backlog-template:begin -->` and `<!-- backlog-template:end -->` sentinels).
- `openspec-templates/questions.template.md`, `design.template.md`, `proposal.template.md`, `tasks.template.md`, `research.template.md`, `spec-delta.template.md` — other templates; each maps to a stage agent via `TEMPLATE_CANONICAL_HEADINGS` in `scripts/lint.mjs`.

## Migration manifest

- 10 manifest files in `migrations/`: `0.6.0.yaml` through `0.14.0.yaml`.
- Floor: `0.6.0`. Schema: `version`, `summary`, `automated`, `manual`. Validated by Check 6.

## Notable discrepancies

- The `status` command carries the version-check embed (it is in `VERSION_CHECK_COMMAND_STEMS`) but is excluded from `BUDGET_GATE_COMMAND_STEMS` — by design, per the comment in Check 10 ("`status`, `update`, `retro` must not appear in the constant").
- `COMMAND_SKILL_SET_EXPECTED` in `scripts/skill-sets.mjs` has entries for only 3 command stems (`idea`, `pr`, `archive`). The eight primary stage commands are NOT in this registry, so their `stage-choreography` load is not subject to the registry-equality check of Check 2b. Check 2 (frontmatter skill-ref resolution) still verifies that any skill named in a Load line resolves to a real directory, but does not assert the exact set.
- Check 5 (`checkGateExecutor`) recognizes both `` `stage-choreography` `` and `` `workflow` `` as choreography-skill markers. The legacy `workflow` skill is kept as a recognized marker for backwards compatibility even though `stage-choreography` is the current canonical carrier.

## Implicit contracts and conventions

- **All errors collected before exit**: `main()` accumulates all errors into a single `errors` array; `process.exit(1)` is called only at the very end if `errors.length > 0`. Checks do not short-circuit the run on first failure.
- **Inline self-tests run before file I/O**: every check that carries a self-test runs it first; a broken detector exits before touching the repo.
- **Whitespace-collapse before embed detection**: both Check 9 and Check 10 collapse all whitespace to single spaces before calling `.includes()`. This is the established pattern for embed-string matching.
- **Hardcoded stem lists over dynamic discovery**: `VERSION_CHECK_COMMAND_STEMS` and `BUDGET_GATE_COMMAND_STEMS` are static arrays, not dynamically derived from the filesystem. New commands must be manually added.
- **`OK:` line convention**: every check that passes emits at least one `process.stdout.write('  OK: ...\n')` line. A self-test emits its own OK line separately from the real-scan OK line.
- **Stage command early-steps pattern**: steps 1, 2, 3 are identical across all eight stage commands — version-check, budget-gate, stage-choreography — in that exact order. They appear before any stage-specific logic.
- **Run-mode lives in conversational context only**: no disk state is ever written for run-mode. It is re-asked when no held mode exists in the current session.
- **`stage-choreography` audience restriction**: the skill's frontmatter carries `audience: orchestrator`; it must not be loaded inside stage subagents.
- **Check 5 transitive detection**: the gate-executor check (`checkGateExecutor`) uses a two-signal heuristic — a choreography-skill backtick reference plus a choreography-marker phrase — to detect transitive reach of `AskUserQuestion`. This is described as a "low-false-positive signal without requiring a full skill parse."

## Open gaps

- [ ] The researcher agent (`claude/agents/researcher.md`) body was not fully read beyond the confirmed gate-instruction phrase location (line 54). The exact structure of steps 2–5 of `## What to do` is not mapped.
- [ ] The exact body of `claude/commands/slices.md`, `claude/commands/archive.md`, and `claude/commands/pr.md` were not read in full — only the three early steps confirmed present via grep. Their tail Choreography paragraph text and any stage-specific deviations from the standard pattern are unconfirmed.
- [ ] The `scripts/context-footprint.mjs` script was not read. Its relationship to `skill-sets.mjs` is described in `context-hygiene` skill prose but its file content was not examined.
- [ ] The `COMMAND_SKILL_SET_EXPECTED` registry has only 3 entries. Whether a future check is intended to also cover the remaining stage commands' `stage-choreography` loads is not determinable from the current codebase alone.
