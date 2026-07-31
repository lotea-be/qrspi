# Research — standardize-backlog-format

> Stage R of QRSPI. Generated 2026-07-29.
> Ticket is hidden from this stage by design.

## Areas investigated
- Backlog file structure: Current shape of `openspec/backlog.md` — section groupings, heading grammar, status tokens, body fields, wikilinks, and prose blocks.
- Lint check conventions: How `scripts/lint.mjs` structures and registers checks, how many exist, the next free number, pass/fail mechanics, and inline self-tests; specific coverage of Check 3 (heading alignment) and Check 14 (surface applicability).
- Template surface: Which `*.template.md` files exist under `openspec-templates/`, their internal structure, and how Check 3 associates them with agent skeletons.
- Init seeding path: How `/qrspi:init` (`claude/commands/init.md`) scaffolds a consumer repo and its relationship to `openspec-templates/`.
- Backlog-mutating commands, agents, and workflow skill: Which commands/agents write or flip rows in `openspec/backlog.md`; where the `workflow` skill documents backlog-row grammar and atomicity.
- Migration manifest structure: Schema of `migrations/*.yaml`, the action types they use, the fields each action carries, and how `/qrspi:update` (and `qrspi-update` skill) applies them.

## File map

### Backlog file structure

- `openspec/backlog.md` — The single backlog file for this repo. 1,250 lines. Contains the full idea/proposed/in-progress/merged inventory of candidate changes.

**Section groupings and their order (top to bottom):**

1. `## In progress` — currently contains `_None._`
2. `---` (horizontal rule separator after each `##` section)
3. `## Proposed` — contains rows currently being worked through QRSPI stages
4. `---`
5. `## Ideas` — bulk of the file; preceded by a prose preamble block explaining the P1/P2/P3 band convention

**Per-row heading grammar:**

The canonical heading form used in `## Proposed` and `## Ideas`:

```
### <id> — `<status> (<note>)` · **P<band>**
```

- Level-3 heading (`###`)
- Kebab-case id
- `—` (em-dash, U+2014) separator
- Backtick-wrapped status token with a parenthetical note: `` `proposed (change folder created 2026-07-29)` ``
- ` · ` separator (space, middle-dot, space)
- `**P1**` / `**P2**` / `**P3**` priority band in bold

The separator between id and status-token uses `—` (U+2014 em-dash); the workflow skill's "Backlog atomicity" section uses `--` (double hyphen) in its prose example. This is a discrepancy between the live file and the workflow skill's `### <id> -- \`<status> (<note>)\`` grammar excerpt.

**Distinct status tokens that appear in the file:**

- `` `idea` `` — in `## Ideas`, bare (no parenthetical note in most cases)
- `` `proposed (<note>)` `` — in `## Proposed`, parenthetical carries a stage milestone note
- `` `in-progress (<note>)` `` — in `## In progress`, would carry a PR reference
- `` `merged` `` — (documented in workflow skill; not currently present in live file, but rows are removed on archive rather than being marked merged)
- `` `bundled into <other-id> (<date>)` `` — **non-standard** status token used for several rows in `## Ideas` when a row was subsumed by another change (e.g. `reset-and-resume-between-boundaries`, `orchestrator-context-budget-gate`, `assert-openspec-version-pin-coupling`, `dedicated-spec-sync-agent`, `sync-modified-delta-scenario-loss`)

**Deviating rows (non-standard patterns):**

Several rows in `## Ideas` use a blockquote stanza directly after the `###` heading to record a "Bundled into" note, before the `**Why:**` body:

```markdown
### reset-and-resume-between-boundaries — `bundled into orchestrator-context-budget (proposed 2026-07-28)` · **P2**

> **Bundled into `orchestrator-context-budget`** (proposed 2026-07-28) with
> [[orchestrator-context-budget-gate]] — see the `## Proposed` entry above.

**Why:** ...
```

The status token here extends beyond the four-token enum: it encodes bundle provenance as a free-form note. This is the only current use of this shape.

**Body-field conventions:**

The standard body immediately under a row heading consists of:

- `**Why:**` — one or more paragraphs explaining motivation (the only required body field for `idea` rows; used in every row)
- `**Shape:**` — present in some rows (e.g. `spec-anchored-code-comments`, `idea-capture-command`) to describe the expected implementation approach
- Prose paragraphs with no field prefix — used for elaboration in longer rows

No `**Priority:**`, `**Status:**`, or `**Next QRSPI command:**` body lines appear. The status and band both live entirely in the heading.

**`[[wikilink]]` cross-reference usage:**

`[[wikilink]]` format is used throughout `## Ideas` to cross-reference other backlog row ids. Examples: `[[backlog-prioritization]]`, `[[standardize-backlog-format]]`, `[[bump-openspec-pin]]`. These are inline prose references only — there is no link-resolution mechanism in the file itself; they are convention-only.

One row (`rename-qrspi-to-qrnchi`) references a sub-file: `[openspec/backlog/rename-qrspi-to-qrnchi.md](backlog/rename-qrspi-to-qrnchi.md)` — a markdown link to a separate file under `openspec/backlog/`. This appears to be the only row that externalises detail into a sub-file.

**Narrative prose blocks:**

- The `## Ideas` section is preceded by a 7-line prose preamble defining P1/P2/P3 bands.
- A large `> **▶ Next up:**` blockquote (approximately lines 69–148) provides a road-to-1.0 narrative sequencing the runway items. It is part of the `## Ideas` section body, above the first `### ` idea row.
- Several rows contain HTML comments: `<!-- unify-implement-paths-on-variants moved to ## Proposed (2026-07-27) -->` (used to note rows that were promoted out of `## Ideas`).

---

### Lint check conventions

- `scripts/lint.mjs` — CI quality gate. Exits 0 on pass, 1 on any failure. Uses Node.js built-ins only (`node:fs`, `node:path`, `node:url`). 3,422 lines.

**Check registration:** Checks run sequentially via `await` calls inside `main()`. All errors are accumulated in a single `errors` array; the script collects all violations before exiting (not fail-fast). The call order in `main()` is the canonical check order.

**How a Check reads repo files:** All file reads use `readFileOr()` (returns fallback on error), `listFiles()`, `listDirs()`, and `walkMd()` — pure Node.js `fs.promises` calls. Never shells out. Glob/walk logic is internal. Checks locate files by constructing absolute paths from `root` (derived from `import.meta.url`).

**Pass vs. fail signal:** Each check function pushes strings into `errors[]` on violation, writes `  OK: ...` to stdout on pass. The `main()` function exits 0 when `errors.length === 0`, exits 1 otherwise, printing all collected violation strings.

**Inline self-tests:** Several checks carry in-memory fixture tests that run before any file I/O. If a fixture test fails, an error is pushed to `errors[]` (same array), causing CI to red immediately regardless of actual repo content. Self-tests are present in: Check 1 (config-coupling extractor, 3 fixtures), Check 13 (compute annotation grammar, 4 fixtures), Check 14 (surface scanner: 1 positive + 1 fence-skip fixture), Check 15 (step-1 skill extractor, 2 fixtures + base-agent absence), Check 17 (banner extractor: 1 no-banner fixture), Check 21 (sentinel extractor: 3 fixtures).

**Complete check list and numbering (as registered in `main()`):**

| Label in main() | Function | Next integer |
|---|---|---|
| Check 1 | `checkPinAgreement` | — |
| Check 2 | `checkFrontmatter` | — |
| Check 2b | `checkSkillSets` | — |
| Check 3 | `checkHeadingAlignment` | — |
| Check 4 | `checkReadmeCoverage` | — |
| Check 5 | `checkGateExecutor` | — |
| Check 6 | `checkMigrationManifests` | — |
| Check 7 | `checkReadContracts` | — |
| Check 8 | `checkPrReconciliationPasses` | — |
| Check 9 | `checkVersionCheckEmbed` | — |
| Check 10 (budget-gate-embed) | `checkBudgetGateEmbed` | — |
| Check 10 | `checkTriagePaths` | — |
| Check 11 | `checkNoCrudSkeletonHeadings` | — |
| Check 12 | `checkOutputContracts` | — |
| Check 13 | `checkComputeAnnotations` | — |
| Check 14 | `checkSurfaceApplicability` | — |
| Check 15 | `checkVariantAgents` | — |
| Check 16 | `checkFollowupStem` | — |
| Check 17 | `checkHelperAgentReadContracts` | — |
| Check 18 | `checkModifiedScenarioCounts` | — |
| Check 19 | `checkAuthoritativeSyncDelegator` | — |
| Check 20 | `checkRequirementFirstLineModal` | — |
| Check 21 | `checkFormatRulesParity` | — |

**Next free integer:** 22. Note: "Check 10" is used twice (once labelled "budget-gate-embed" and once unlabelled for `checkTriagePaths`). This is a numbering collision in the current source. "Check 2b" (`checkSkillSets`) is a sub-check of Check 2.

**Check 3 (heading alignment):**

`checkHeadingAlignment` maps each `openspec-templates/*.template.md` filename to an agent stem and a fixed list of canonical headings. For each pair, it reads the agent body (after stripping frontmatter) and asserts every canonical heading appears as a literal substring. It does NOT scan inside fenced code blocks — it scans the full body. Canonical headings per template:

- `questions.template.md` → `questioner`: `## Testing`, `## Sequencing & scope`, `## Open product questions (for the human)`
- `design.template.md` → `designer`: `## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`
- `proposal.template.md` → `architect`: `## Why`, `## What Changes`, `## Capabilities`, `## Impact`
- `tasks.template.md` → `planner`: _(empty — dynamic format; check is skipped)_
- `research.template.md` → `researcher`: `## Areas investigated`, `## File map`, `## Notable discrepancies`, `## Implicit contracts and conventions`, `## Open gaps`
- `spec-delta.template.md` → `architect`: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`

The `TEMPLATE_CANONICAL_HEADINGS` constant is the authoritative source. Adding a new template requires adding an entry here. The `tasks.template.md` entry is declared but has an empty heading list; it is skipped with `SKIP` output.

**Check 14 (surface applicability):**

`checkSurfaceApplicability` scans every `*.md` under `openspec/changes/**` (excluding `/archive/` paths), outside fenced code blocks, for heading lines belonging to absent surfaces. Sources the present-surface set from `.claude/skills/qrspi-stack/SKILL.md`'s `## Repo surface` block via `parseRepoSurfaceBlock()`. The heading-to-surface map is `SURFACE_GATED_HEADINGS` (10 surfaces mapped to 2–5 headings each; `typed-nullable` has no heading entries). Fails loudly if the `## Repo surface` block is absent or yields no bullets. Carries an inline self-test asserting the scanner fires on `## Data model` in a synthetic fixture and skips it inside a fenced block. Disjoint scope from Check 11: Check 14 scans outside fences in change artifacts; Check 11 scans inside fences in agent source files.

---

### Template surface

- `openspec-templates/questions.template.md` — Canonical template for `questions.md`. Contains: (a) a `<!-- ... -->` "How to use" comment block at the top with authoring instructions; (b) surface-gated sections expressed as `<!-- SURFACE-GATED: <surface> surface. Omit ... -->` gate comments (not as literal headings); (c) literal section headings for surface-independent sections (`## Testing`, `## Sequencing & scope`, `## Open product questions (for the human)`). Does NOT contain a `<!-- how-to-use -->` named tag — the comment is anonymous.

- `openspec-templates/design.template.md` — Canonical template for `design.md`. Structure: introductory prose (not a comment block), then a fenced `markdown` block containing the full skeleton, followed by a `## Format rules` section. Surface-gated sections inside the fenced block are represented as a gate-comment block (`<!-- Surface-gated ... -->`), not as literal headings. The skeleton in the fenced block includes literal headings for the four canonical OpenSpec headers.

- `openspec-templates/proposal.template.md` — Canonical template for `proposal.md`. Structure: introductory prose, then a fenced `markdown` block with the skeleton, then a `## Format rules` section. No surface-gate comment blocks — capability format is fixed.

- `openspec-templates/tasks.template.md` — Canonical template for `tasks.md`. Structure: introductory prose, then a fenced `markdown` block with the skeleton (dynamic `## N. <slice name>` heading form), then a `## Format rules` section. Contains a `<!-- Surface-gated task lines: ... -->` comment inside the fenced skeleton describing which task categories to include/omit per surface, but no literal surface-gated heading lines.

- `openspec-templates/research.template.md` — Canonical template for `research.md`. Bare skeleton (no fenced `markdown` block wrapper — the content IS the skeleton directly). Contains an anonymous `<!-- ... -->` "How to use" comment at the top. Five always-emitted heading lines are literal: `## Areas investigated`, `## File map`, `## Notable discrepancies`, `## Implicit contracts and conventions`, `## Open gaps`. Surface-driven inventory sections are described in the comment but do NOT appear as headings in the template — they are injected dynamically by the researcher at write time.

- `openspec-templates/spec-delta.template.md` — Canonical template for delta specs. Contains: introductory prose, then two named sections ("New capability" and "Modified capability") each with a fenced `markdown` block skeleton, then a `## Format rules` section. Carries `<!-- must-leads:begin -->` / `<!-- must-leads:end -->` sentinel comments wrapping the MUST/SHALL format-rules block (kept in sync with `claude/agents/architect.md` via Check 21).

**How Check 3 associates templates with agents:** Statically via `TEMPLATE_CANONICAL_HEADINGS` dict in `lint.mjs`. Each key is the template filename; the `agent` field names the agent stem. Check 3 reads the agent body (not the template body) and asserts each canonical heading appears in it. There is no runtime link between template files and agent files beyond this static mapping.

**No `backlog.template.md` exists in `openspec-templates/`.** There is no template for `openspec/backlog.md`.

---

### Init seeding path

- `claude/commands/init.md` — `/qrspi:init` command. `agent: build`. Does NOT read from `openspec-templates/` and does NOT seed any files from it into the consumer repo.

**Detection:** Uses Glob on `openspec/config.yaml` as the single sentinel for "is initialized."

**Two mutually exclusive paths:**
- Already initialized: runs `npx @fission-ai/openspec@1.4.1 update`, verifies `openspec/changes/` and `openspec/specs/` exist.
- Not initialized: runs `npx @fission-ai/openspec@1.4.1 init --tools none`, then writes `openspec/config.yaml` (sentinel + `openspec_version: 1.4.1`) and `openspec/.qrspi-version` (bare SemVer from `plugin.json`) using the Write tool directly.

**Template seeding:** Explicitly not done. Step d states: "No per-repo template seeding (shared shape). Earlier versions copied the canonical templates into this repo's `openspec/templates/`. They are no longer copied." The kit ships templates in `openspec-templates/`; stage agents carry shapes inline. A consuming repo gets no template copies.

**Backlog seeding:** The init command does NOT create `openspec/backlog.md` or seed it. There is no step for it.

**Step 3 (unconditional):** Strips any project-scope OpenSpec Claude tooling (`.claude/commands/opsx/`, `.claude/skills/openspec-*/`).

**Step 4:** Stages only `openspec/` with `git add openspec/`; commits with message `chore(openspec): initialize OpenSpec scaffolding + QRSPI templates`.

**Step 5:** Offers to run `/qrspi:stack` if no stack-cheatsheet skill exists; uses AskUserQuestion.

---

### Backlog-mutating commands, agents, and the workflow skill

**Workflow skill (`claude/skills/workflow/SKILL.md`):**

The "Backlog atomicity" section (lines 525–544 of the skill content) is the authoritative definition of backlog-row grammar:

> A backlog row is a single heading with a backticked status -- `### <id> -- \`<status> (<note>)\`` -- grouped under a `##` section per status (`## Proposed`, `## In progress`, `## Ideas`, ...). There is no separate `Status:` or `Next QRSPI command:` body line: the status word, its free-text parenthetical note, and the row's section grouping all live in that one heading.

Note: the skill's prose example uses `--` (two hyphens) as the separator between id and status token, while the live `backlog.md` file uses `—` (em-dash). See Notable discrepancies.

The workflow skill also specifies which stages flip status:
- **Q** (`idea` → `proposed`): the questioner agent performs this flip (step 9 of the questioner); `questions.md` command verifies rather than re-edits.
- **Implement (final slice)** (`proposed` → `in-progress`, row moves from `## Proposed` to `## In progress`): the `implement.md` command performs this.
- **PR**: updates the note to the open-PR reference (`in-progress (draft PR #<N> open)`).
- **Archive**: removes the row entirely (the archived folder is the source of truth).

**Commands that write or flip rows:**

| Command | Backlog operation |
|---|---|
| `claude/commands/questions.md` | Verifies the questioner's `idea` → `proposed` flip; stages `openspec/backlog.md` in same commit |
| `claude/commands/implement.md` | Final slice only: flips `proposed` → `in-progress`, moves row to `## In progress`; intermediate slices do not touch backlog |
| `claude/commands/pr.md` | Updates the `## In progress` row's note from stages-complete to `in-progress (draft PR #<N> open)` |
| `claude/commands/archive.md` | Removes the row from `openspec/backlog.md` entirely |
| `claude/commands/followup.md` | P3 path: appends a new `idea` row under `## Ideas` with `idea` status and `· **P3**` band; derives kebab-slug from follow-up title |
| `claude/commands/pr.md` (follow-ups pass) | "Promote to backlog idea": appends new `idea` row under `## Ideas`, format mirrors follow-up P3 path |
| `claude/commands/design.md` | May add new `idea` rows via "Capturing deferred work"; no status flip of the current change row |
| `claude/commands/structure.md` | Same: may add new `idea` rows; no status flip of the current row |
| `claude/commands/slices.md` | May add new `idea` rows; no status flip |

**Agents:**

The `questioner` agent (`claude/agents/questioner.md`) is the only stage agent that directly edits `openspec/backlog.md` (its step 9 flips `idea` → `proposed`). No other stage agent edits the backlog directly — backlog edits by other stages are performed by the orchestrator (the `questions.md` command body for verification; `implement.md`, `pr.md`, `archive.md`, `followup.md` for the respective operations).

**Row format specified in `followup.md` for new idea rows (P3 path):**

```markdown
### <slug> -- `idea` · **P3**

**Why:** <one-sentence reason ...>
```

Note: this template uses `--` (double hyphen), consistent with the workflow skill's prose but inconsistent with the live `backlog.md` em-dash convention.

**Row format specified in `pr.md` for "Promote to backlog idea":**

> append one new idea row to `openspec/backlog.md` under the `## Ideas` section, matching the file's existing format (level-3 heading with kebab-slug + status label + priority band, followed by a `**Why:**` paragraph). Use `idea` as the status and `P3` as the default priority band.

This description is prose-only with no literal example — it defers to "the file's existing format."

---

### Migration manifest structure

- `migrations/0.6.0.yaml` through `migrations/0.12.0.yaml` — 8 manifest files. Floor version is `0.6.0` (hardcoded `MIGRATION_FLOOR` constant in `lint.mjs`).

**Top-level schema (all manifests):**

```yaml
version: <X.Y.Z>       # bare SemVer, must match filename stem
summary: >              # one-line or folded-block description for plan preview
  ...
automated: []           # list of automated edit-file steps (empty in most cases)
manual:                 # list of human instruction strings
  - >-
    ...
```

**Required top-level keys:** `version`, `summary`, `automated`, `manual`. All four required; any missing key fails Check 6 schema validation.

**Automated step schema (under `automated:`):**

```yaml
- description: Human-readable label shown in plan preview / confirmation.
  action: edit-file     # ONLY allowed value; any other fails Check 6
  path: openspec/...    # MUST start with "openspec/"; other paths fail Check 6
```

**Manual step schema (under `manual:`):**

```yaml
- >-
  Prose instruction for the human to perform manually...
```

**Current `automated:` usage:** All 8 current manifests have `automated: []` (empty). No manifest currently uses a non-empty `automated:` list. The `edit-file` action type exists in the schema and is enforced by Check 6, but has never been exercised in a shipped manifest.

**How `/qrspi:update` applies them (`claude/skills/qrspi-update/SKILL.md`):**

1. Reads `openspec/.qrspi-version` marker (source version A).
2. Resolves target version B (auto-detect from plugin cache or explicit argument).
3. For each version V where A < V ≤ B in ascending SemVer order: applies all `automated` steps (immediately, no prompt), then gates each `manual` step via AskUserQuestion.
4. `edit-file` dispatch: reads the target file, applies one of several edit patterns (prepend, append, replace-line, etc. — documented in skill but not in manifest schema). The `description` field is shown as a one-line confirmation; `path` must be `openspec/`-scoped.
5. After all versions processed: bumps `openspec/.qrspi-version` to B, stages changed files, prints a ready-to-run `git commit` command (does not auto-commit).

**Scope constraint:** Automated steps are confined to `openspec/`-scoped paths. Manual steps may instruct humans to act outside `openspec/`, but the command itself never auto-edits outside `openspec/`.

## Slash-command surface

- `claude/commands/init.md` — `/qrspi:init`. `agent: build`. Scaffolds OpenSpec. Does not create `openspec/backlog.md` or seed from `openspec-templates/`. See "Init seeding path" above.
- `claude/commands/questions.md` — `/qrspi:questions`. Delegates to `questioner` agent; verifies backlog `idea`→`proposed` flip; stages `openspec/backlog.md` in same commit.
- `claude/commands/research.md` — `/qrspi:research`. Delegates to `researcher` agent; does not touch backlog.
- `claude/commands/design.md` — `/qrspi:design`. Delegates to `designer` agent; may capture deferred-work `idea` rows.
- `claude/commands/structure.md` — `/qrspi:structure`. Delegates to `architect` agent; may capture deferred-work `idea` rows.
- `claude/commands/slices.md` — `/qrspi:slices`. Delegates to `architect` agent (V mode); may capture deferred-work `idea` rows.
- `claude/commands/plan.md` — `/qrspi:plan`. Delegates to `planner` agent; no backlog edits.
- `claude/commands/implement.md` — `/qrspi:implement`. Orchestrator-driven per-slice loop; final-slice only: flips row to `in-progress`, moves to `## In progress`.
- `claude/commands/pr.md` — `/qrspi:pr`. Updates backlog note with PR number; follow-ups pass can promote to new `idea` rows.
- `claude/commands/archive.md` — `/qrspi:archive`. Removes row from backlog entirely.
- `claude/commands/followup.md` — `/qrspi:followup`. P3 path appends new `idea` row under `## Ideas`.
- `claude/commands/update.md` — `/qrspi:update`. Reads `qrspi-update` skill; no backlog interaction.

## Stage-agent surface

- `claude/agents/questioner.md` — The only stage agent that directly edits `openspec/backlog.md` (flips `idea` → `proposed` at step 9 of its body). All other backlog edits are orchestrator-driven (commands, not subagents).
- `claude/agents/researcher.md` — Reads no change-folder artifacts; whole `changes/<id>/` folder banned. Produces `research.md`.
- `claude/agents/designer.md` — Reads `questions.md`, `research.md`; may surface deferred-work candidates (offered by orchestrator, not auto-appended by agent).
- `claude/agents/architect.md` — Dual mode (S/V); reads `design.md` at S, `proposal.md`+`specs/` at V; may surface deferred-work candidates at S mode.
- `claude/agents/planner.md` — Reads `slices.md`; no backlog interaction.
- `claude/agents/implementer-{low,medium,high}.md` — Three effort-tier variants; each loads only `implementer-core`; no backlog interaction.
- `claude/agents/reviewer.md` — Reads full change folder; no backlog interaction.
- `claude/agents/spec-syncer.md` — Helper agent for archive sync; reads only `specs/**` and `openspec/specs/**`; no backlog interaction.

## Skill surface

- `claude/skills/workflow/SKILL.md` — Documents backlog-row grammar in "Backlog atomicity" section; specifies status-flip ownership per stage; defines "Capturing deferred work" rules for Q/D/S.
- `claude/skills/qrspi-update/SKILL.md` — Drives `/qrspi:update`; contains full migration-manifest schema contract and hybrid apply-phase algorithm.
- `claude/skills/repo-surface/SKILL.md` — Owns surface taxonomy and section-to-surface mapping; dictates which sections are emitted in research.md per surface.

## Lint-gate surface

- `scripts/lint.mjs` — 3,422-line CI quality gate. 21 named checks (with one number collision at "10"). Checks 1–21 registered. Next free integer: 22. Exits 0 on all-pass, 1 on any violation. Uses only Node.js built-ins.

**Check 3 (heading alignment):** Maps 6 template files to agent skeletons; asserts each agent body contains all canonical headings for that template. `tasks.template.md` mapping is declared but the heading list is empty (skipped). `research.template.md` canonical headings: 5 always-emitted spine headings.

**Check 14 (surface applicability):** Scans `openspec/changes/**` (excluding `/archive/`), outside fenced blocks, for headings belonging to absent surfaces. Sources present-surface set from `.claude/skills/qrspi-stack/SKILL.md` `## Repo surface` block. Fails loudly if block absent/malformed. Carries inline self-test.

**No check currently validates `openspec/backlog.md`**: no check asserts row heading grammar, status enum, section groupings, or presence of `**Why:**` field in the live backlog file.

## Template surface

- `openspec-templates/questions.template.md` — Questions template. Anonymous how-to comment block; surface-gated sections via gate comments; always-emitted sections as literal headings. No `backlog.md` shape.
- `openspec-templates/design.template.md` — Design template. Prose preamble + fenced skeleton + `## Format rules`. Gate comments inside fenced block.
- `openspec-templates/proposal.template.md` — Proposal template. Prose preamble + fenced skeleton + `## Format rules`.
- `openspec-templates/tasks.template.md` — Tasks template. Prose preamble + fenced skeleton + `## Format rules`. Surface-gated task lines described in comment, not as headings.
- `openspec-templates/research.template.md` — Research template. Direct skeleton (no fenced wrapper); anonymous how-to comment at top; 5 always-emitted literal headings; surface-driven sections described in comment only.
- `openspec-templates/spec-delta.template.md` — Spec-delta template. Two named sections with fenced skeletons + `## Format rules`; carries `<!-- must-leads:begin/end -->` sentinels (Check 21).

**No `backlog.template.md` exists.** `openspec-templates/` has exactly 6 files. There is no template for `openspec/backlog.md`.

## Migration manifest

- `migrations/0.6.0.yaml` through `migrations/0.12.0.yaml` — 8 YAML manifests. Schema: `version`, `summary`, `automated`, `manual`. Only action type: `edit-file`. All current manifests have `automated: []` — no `edit-file` step has been exercised in any shipped manifest. Manual steps are human-instruction strings. Enforced by Check 6 (`checkMigrationManifests`). Applied in ascending SemVer order by `/qrspi:update` via `qrspi-update` skill.

## Notable discrepancies

- **Separator mismatch (em-dash vs. double-hyphen):** The live `openspec/backlog.md` file uses `—` (U+2014 em-dash) between the id and the backtick-status in every `###` heading (e.g. `### standardize-backlog-format — \`proposed ...\``). The workflow skill's "Backlog atomicity" canonical-grammar example uses `--` (double hyphen): `` `### <id> -- \`<status> (<note>)\`` ``. The `followup.md` P3 row template also uses `--`. This is an inconsistency between the normative grammar (skill) and the actual file; any future lint check must decide which form to require.

- **Non-standard status tokens:** Several rows carry status tokens outside the documented four-token enum (`idea` / `proposed` / `in-progress` / `merged`): `bundled into <other-id> (<date>)` is used informally for subsumed rows. These rows remain in `## Ideas` rather than being removed, which is also informal (the workflow skill says to remove archived rows, not subsumed ones).

- **No backlog.md template and no lint check:** Unlike every other QRSPI artifact (`questions.md`, `design.md`, `proposal.md`, `tasks.md`, `research.md`, delta `spec.md`), `openspec/backlog.md` has no corresponding template in `openspec-templates/` and no `scripts/lint.mjs` check validating its structure. The shape is defined only in the `workflow` skill's prose.

- **Init does not seed backlog.md:** `/qrspi:init` does not create `openspec/backlog.md`. Consumer repos must hand-author it. The `questioner` agent reads `openspec/backlog.md` (via `@openspec/backlog.md` in `questions.md`) but the init command provides no seed content for it.

- **`edit-file` action type exists in schema but has never been used:** All 8 shipped migration manifests have `automated: []`. The `edit-file` mechanic is fully specified in the schema and enforced by lint but is untested against real manifests.

- **Duplicate Check 10 numbering:** Two distinct checks are registered under the label "Check 10" in `main()` (one for budget-gate embed labelled "Check 10 (budget-gate-embed)", one unlabelled for triage path anchors). The functions are distinct (`checkBudgetGateEmbed` and `checkTriagePaths`) but share the same human-readable label in the output.

## Implicit contracts and conventions

- Every backlog-mutating command stages `openspec/backlog.md` in the same `git add` call as the stage artifact — never as a separate commit. This "backlog atomicity" rule is stated in the workflow skill and enforced by convention in each command body.
- The `## Ideas` section is ordered by priority/sequence, with narrative blockquotes used to document groupings and runway sequencing. This ordering is maintained by hand.
- `[[wikilink]]` syntax is used throughout `## Ideas` for cross-references; it is a documentation convention only, not a link-resolution mechanism.
- `**Why:**` is the de-facto required body field for every row. `**Shape:**` is optional and used for longer/more complex ideas.
- The `## In progress` and `## Proposed` sections each end with a `---` horizontal rule before the next section.
- Subsumed rows are kept in place in `## Ideas` with a blockquote noting the bundle and a modified status token, rather than being removed.
- All lint checks use only Node.js built-ins; no npm runtime dependencies allowed.
- Check 3 canonical headings and Check 14 SURFACE_GATED_HEADINGS are hardcoded constants, not derived from the template files at runtime. Adding a new template or surface requires editing these constants.
- The `## Repo surface` block in `.claude/skills/qrspi-stack/SKILL.md` is the authoritative surface allowlist; Check 14 fails loudly if it is absent.

## Open gaps

- [ ] Cannot confirm what the `rename-qrspi-to-qrnchi.md` sub-file under `openspec/backlog/` contains without reading it — unclear whether it follows any schema or is entirely free-form prose. (Read contract prohibits opening it as it may be a process artifact; if it is treated as a standalone reference document rather than a process artifact the constraint may not apply, but this is ambiguous.)
- [ ] Could not determine from code alone which exact edit patterns (`prepend`, `append`, `replace-line`, etc.) the `edit-file` dispatcher in `qrspi-update` supports — the full list lives in the `qrspi-update` skill body, which was only partially surveyed. This matters for understanding what a backlog-related `edit-file` migration step could do.
- [ ] The `## Ideas` section preamble block (P1/P2/P3 band definitions + the road-to-1.0 blockquote) lives as free prose with no structural marker. Whether a lint check should treat it as "prose before first `###` row" or flag it as non-row content is not resolved by existing code.
- [ ] No information on whether `openspec/backlog/rename-qrspi-to-qrnchi.md` (referenced by a live backlog row) represents a pattern that other rows might adopt (externalising large idea bodies into sub-files), which would affect any schema design.
