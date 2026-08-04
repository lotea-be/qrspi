# Research — backlog-schema-finish

> Stage R of QRSPI. Generated 2026-07-31.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Slash-command structure & README doc-sync** — How `claude/commands/*.md` are structured (frontmatter, preamble steps), and how Check 4 in `scripts/lint.mjs` enforces bidirectional coverage between commands and `README.md`.
- **Skill files & registration** — How `claude/skills/*/SKILL.md` are organized, registered via `scripts/skill-sets.mjs`, and enforced by Check 2b; with detailed mapping of `qrspi-update`'s migration-manifest schema and `edit-file` dispatcher prose.
- **Lint harness structure** — `scripts/lint.mjs`: check numbering and layout, inline self-test pattern, current highest check, and the full body of Check 22 (`checkBacklogSchema`).
- **Migration manifest format** — `migrations/*.yaml` schema; the `0.13.0.yaml` manifest in full; how Check 6 validates manifests; how `/qrspi:update` dispatches an `edit-file` step end-to-end.
- **Backlog grammar & wikilink conventions** — `openspec/backlog.md` and `openspec-templates/backlog.template.md`: frozen row grammar, sections, bands, body rules; plus a complete census of `[[wikilink]]` usage with resolution classification.

## File map

### Area 1 — Slash-command structure & README doc-sync

- `claude/commands/research.md` — QRSPI stage R orchestration. No `agent:` key; runs on the main loop. Frontmatter: `description:` only. Preamble: (1) load `qrspi-version-check`, (2) load `context-budget-gate`, (3) establish run-mode from skill `workflow`. Spawns `qrspi:researcher` subagent via Agent tool with `model: sonnet`.
- `claude/commands/questions.md` — QRSPI stage Q orchestration. No `agent:` key. Same three-step preamble as research.md. Artifact: `openspec/changes/<id>/questions.md`. Commit message: `docs(<id>): add questions.md (QRSPI stage Q)`.
- `claude/commands/design.md` — QRSPI stage D orchestration. No `agent:` key. Same three-step preamble. Spawns `qrspi:designer` with `model: opus`. Artifact: `openspec/changes/<id>/design.md`.
- `claude/commands/structure.md` — QRSPI stage S orchestration. No `agent:` key. Same three-step preamble. Has approval gate beyond file-presence check. Spawns `qrspi:architect` with `model: sonnet`.
- `claude/commands/implement.md` — QRSPI stage I orchestration. No `agent:` key. Same three-step preamble. Reads `**Compute:** effort=<low|medium|high> model=<alias>` from the next un-ticked slice in `tasks.md` and maps `effort=` to the plugin-namespaced subagent variant (`qrspi:implementer-low/medium/high`).
- `claude/commands/archive.md` — QRSPI archive command. Has `agent: build` in frontmatter (routes through a build-mode agent). No version-check or budget-gate preamble. Contains `qrspi:spec-syncer` (enforced by Check 19). 5-step archive flow with PR-merge gate (hard-stop), spec-syncer delegation, folder move, backlog row removal, and commit-target question.
- `claude/commands/init.md` — Per-repo onboarding. `agent: build`. No stage preamble. Seeds `openspec/backlog.md` from an inline template copy between `<!-- backlog-template:begin -->` and `<!-- backlog-template:end -->` sentinels (Check 3 drift-guards against `openspec-templates/backlog.template.md`).
- `claude/commands/stack.md` — Stack-cheatsheet bootstrapper. `agent: build`. No stage preamble.
- `claude/commands/update.md` — Migration walk command. No `agent:` key (main-loop-only because it gates with AskUserQuestion). No stage preamble. Delegates all logic to skill `qrspi-update`. Handles optional `<target-version>` argument.
- `claude/commands/status.md` — Stage-map printer. No `agent:` key. Has version-check preamble (step 1) but no budget-gate. No run-mode establishment.
- `claude/commands/plan.md`, `claude/commands/slices.md`, `claude/commands/pr.md`, `claude/commands/followup.md`, `claude/commands/retro.md` — Remaining stage/helper commands. All stage-scoped ones (`plan`, `slices`, `pr`, `followup`) have the same three-step preamble (version-check + budget-gate + run-mode). `retro.md` lacks the budget-gate embed (the ten budget-gate commands are explicitly enumerated in Check 10; `status`, `update`, `retro` are the three excluded).

**Frontmatter taxonomy:**

| Key present | Commands |
|-------------|----------|
| `description:` only (main-loop) | questions, research, design, structure, slices, plan, implement, pr, status, update, followup, retro |
| `description:` + `agent: build` | archive, init, stack |

**Version-check preamble (`Load skill \`qrspi-version-check\``):** present in 9 stage commands (questions, research, design, structure, slices, plan, implement, pr, status). Enforced by Check 9 (`checkVersionCheckEmbed`), which asserts the exact string `Load skill \`qrspi-version-check\` and follow its instructions exactly.` in each.

**Budget-gate preamble (`Load skill \`context-budget-gate\``):** present in 10 commands (8 stage commands + archive + followup). Enforced by Check 10 (`checkBudgetGateEmbed`). `status`, `update`, `retro` are excluded.

**Check 4 — README command coverage (bidirectional):**

- **Forward direction:** for every `claude/commands/<stem>.md`, the string `/qrspi:<stem>` must appear in `README.md`. Enforced by `checkReadmeCoverage()`, which reads `commandFiles` via `listFiles(claude/commands, .md)` and checks `readme.includes('/qrspi:${stem}')`.
- **Reverse direction:** for every `/qrspi:<token>` match found in `README.md` (regex `/\/qrspi:([a-z][a-z-]*)/g`), a corresponding `claude/commands/<token>.md` must exist. Bare `/qrspi` (no colon) is ignored.
- Both directions report violations as `[readme]` errors; the check exits non-zero when violations > 0.
- **Scope:** mechanically covers command file names only. Prose drift (agent names, install flow, OpenSpec pin, layout tree) is governed by CLAUDE.md and the `/qrspi-readme-audit` skill, not Check 4.

### Area 2 — Skill files & registration

- `claude/skills/*/SKILL.md` — Kit-shipped skills. Each has YAML frontmatter with at minimum `name:` and `description:`. Some add `metadata:` (with `audience: orchestrator`) or `metadata: source:`. No `agent:` or `model:` key (skills are not subagents). Auto-registered by the plugin — no `plugin.json` edit required for a new `claude/skills/<name>/` directory.
- `scripts/skill-sets.mjs` — Shared registry (`SKILL_SET_EXPECTED`) mapping each stage-agent stem to its allowed unconditional skill list. Imported by both `scripts/lint.mjs` (Check 2b) and `scripts/context-footprint.mjs`. The `<repo>-stack` cheatsheet name is explicitly excluded from the registry (it is Glob-discovered per repo, neither required nor forbidden). Current registry:

  | Agent stem | Allowed skills (sorted) |
  |------------|-------------------------|
  | `researcher` | `context-hygiene`, `repo-surface`, `workflow` |
  | `questioner` | `repo-surface`, `workflow` |
  | `designer` | `context-hygiene`, `repo-surface`, `workflow` |
  | `architect` | `openspec-workflow`, `repo-surface`, `vertical-slice`, `workflow` |
  | `planner` | `repo-surface`, `vertical-slice`, `workflow` |
  | `implementer-low` | `implementer-core` |
  | `implementer-medium` | `implementer-core` |
  | `implementer-high` | `implementer-core` |
  | `reviewer` | `openspec-workflow`, `repo-surface`, `workflow` |

- `scripts/lint.mjs` Check 2b (`checkSkillSets`) — Harvests backtick-wrapped skill names from each stage agent's numbered step-1 "Load skills" line (including continuation lines). Filters out names ending in `-stack`. Asserts the remaining sorted set equals `SKILL_SET_EXPECTED[stem]`. Reports `unexpected:` and `missing:` skill names on mismatch.

**`qrspi-update` skill** (`claude/skills/qrspi-update/SKILL.md`):

Frontmatter: `name: qrspi-update`, `description: ...`, `metadata: { audience: orchestrator }`. Loaded exclusively by `claude/commands/update.md`.

**Migration-manifest schema contract** (documented in the skill, enforced by Check 6):

```yaml
version: X.Y.Z          # bare SemVer, equals filename stem
summary: >              # always present, even for a no-action stub
  ...
automated:              # always a list; may be []
  - description: ...
    action: edit-file   # CLOSED vocabulary; only value allowed
    path: openspec/...  # MUST start with openspec/
    # one edit-field pair (exactly one per step)
manual:                 # always a list; may be []
  - description: ...
```

**`edit-file` dispatcher** (section 4.1 of the skill):

1. Guard: `action` must be `edit-file`; `path` must start with `openspec/`; no shell commands. Hard-stop on any violation.
2. Read the target file at `path` using the Read tool.
3. Apply exactly one of these edit patterns (exactly one pattern key per step; multiple keys is a malformed step -- hard-stop):
   - `find` + `replace`: replace the first exact occurrence of `find` with `replace`; hard-stop if `find` is absent.
   - `find_all` + `replace`: replace ALL occurrences of `find_all` with `replace`.
   - `insert_after` + `content`: insert `content` immediately after the first occurrence of `insert_after`; **hard-stop if `insert_after` is absent** (no fallback path).
   - `insert_before` + `content`: insert `content` before the first occurrence of `insert_before`; hard-stop if absent.
   - `append` + `content`: append `content` at the end of the file; no anchor required.
   - `prepend` + `content`: prepend `content` at the beginning.
   - `overwrite` + `content`: overwrite the entire file with `content`.
4. Write the result using Write or Edit tool.
5. Print a one-line confirmation (step description + file path). No confirmation prompt -- automated.

**No idempotency guard exists.** The skill carries no `skip_if_contains`, `skip_if_present`, or equivalent field. The `insert_after` dispatcher does not check whether `content` is already present before inserting. The only idempotency protection is the marker: if the marker was already bumped, the walk does not re-run. If the walk is interrupted after an automated step runs but before the marker bumps, a re-run replays the automated step without any skip-if-present check.

**Absent-anchor handling for `insert_after`:** when the `insert_after` string does not appear in the target file, the dispatcher **hard-stops and reports** the condition. There is no fallback path (no degradation to a manual step, no anchor-search relaxation). This means a consumer whose `openspec/backlog.md` title line does not exactly match the `insert_after` value will hit a hard-stop at update time.

### Area 3 — Lint harness structure

- `scripts/lint.mjs` — Single CI quality-gate script. Uses Node.js built-ins only (`node:fs`, `node:path`, `node:url`). No npm dependencies. Entry point: `async function main()`. Exits 0 on all checks passing, 1 on any violation. Collects all errors into a shared `errors[]` array before exiting (does not short-circuit on first failure).

**Check numbering and layout:** Checks are numbered 1, 2, 2b, 3, 4, 5, 6, 7, 8, 9, 10 (budget-gate-embed), 10b (triage path anchors), 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22. Current highest check: **22**. The `main()` function calls each check function in order; each is a top-level `async function checkXxx(errors)` returning a violation count.

**Inline self-test fixture pattern:** Several checks carry inline self-test fixtures that run before any file I/O. The naming pattern uses `_stA`, `_stB`, `_stC`, `_stD`-style variables holding synthetic fixture strings. Fixtures are exercised against the check's internal detector functions; on any fixture failure the check pushes a `SELF-TEST FAILED:` error and returns early (prevents file I/O from running a broken detector). This pattern is used in Check 14 (surface applicability), Check 15 (implementer variant drift), Check 21 (format-rules parity), and Check 22 (backlog schema).

**Check 22 (`checkBacklogSchema`)** — `async function checkBacklogSchema(errors)`:

*Self-test (four fixtures, run before file I/O):*
- Fixture `_stA`: well-formed standalone `idea` row with `**Why:**` and `**Shape:**` — must pass all detectors.
- Fixture `_stB`: malformed heading (double-hyphen `--`, missing P-band) — grammar detector must fire.
- Fixture `_stC`: standalone `idea` row missing `**Shape:**` — body-field detector must fire.
- Fixture `_stD`: `bundled` row with only a `>` blockquote pointer — must NOT fire (exempt class).

*Early exit:* if `openspec/backlog.md` is absent, prints `OK: openspec/backlog.md absent -- Check 22 skipped` and returns 0.

*Six assertions (all hard-fail via `errors.push`):*

1. **Section headings:** the strings `## In progress`, `## Proposed`, `## Ideas` must each appear as a standalone line.
2. **P-band preamble:** between the `## Ideas` heading line and the first `### ` row (or next `## ` heading), at least one line must include all three of `P1`, `P2`, `P3`.
3. **Grammar:** every `### ` heading must match the frozen regex:
   `^### (?<id>[a-z0-9]+(?:-[a-z0-9]+)*) — \`(?<status>[^`]+)\` · \*\*P(?<band>[123])\*\*$`
   Non-ASCII characters are the em-dash (`—`, U+2014) and middle-dot (`·`, U+00B7).
4. **Status keyword enum:** the leading keyword of the `status` capture group must be in `{idea, proposed, in-progress, merged, bundled}`. The keyword is `status.split(' ')[0]`, so the rest of the status field is free text.
5. **Body fields on standalone rows:** rows with keyword `idea` or `proposed` must contain both `**Why:**` (matched as `/^\*\*Why[^\n]*:\*\*/m`, accepting parenthetical qualifiers) and `**Shape:**` (matched as `/^\*\*Shape:\*\*/m`). Rows with keyword `bundled`, `merged`, or `in-progress` are exempt from this check.
6. **Template existence:** `openspec-templates/backlog.template.md` must exist (existence-only; no content scan).

*Row parser:* `function parseRows(text)` splits on lines starting with `### `, captures `id`, `status`, `keyword`, `band`, `headingLine`, `bodyLines[]`, `valid` per row. A heading that fails the grammar regex is captured with `valid: false`; enum/body checks are skipped for invalid rows.

*Filesystem-dependent assertions:* assertion 6 reads `openspec-templates/backlog.template.md` via `readFileOr`. No other filesystem access. The check does **not** read `openspec/changes/archive/` folder names.

### Area 4 — Migration manifest format

- `migrations/0.6.0.yaml` — Floor manifest. `automated: []`, one manual step (re-align overridden stage-agent files to new read contracts).
- `migrations/0.12.0.yaml` — `automated: []`, one manual step for locally-overridden gate-scoped files.
- `migrations/0.13.0.yaml` — The first migration with a non-empty `automated:` list. One automated step:

  ```yaml
  - description: >-
      Insert the backlog schema legend comment after the title line of
      openspec/backlog.md. [...]
    action: edit-file
    path: openspec/backlog.md
    insert_after: "# Backlog\n"
    content: "\n<!--\n  Backlog schema legend [...]\n-->\n"
  ```

  The `insert_after` anchor is the exact string `"# Backlog\n"` (the title line plus a newline). Four manual steps covering: adding missing section headings, adding P-band preamble, adding `**Why:**`/`**Shape:**` body fields to standalone rows, and seeding from the template if no backlog exists.

**Check 6 (`checkMigrationManifests`)** validates three sub-checks:

- **(a) Presence:** every CHANGELOG `## [X.Y.Z]` section at or above the floor `0.6.0` must have a corresponding `migrations/<version>.yaml`. The floor `0.6.0` must always exist (hard-coded constant, not derived from the directory, to prevent fail-open).
- **(b) Schema:** each manifest must parse with `version`, `summary`, `automated`, `manual` present; `version` must match the filename stem; every `automated[i].action` must be `'edit-file'`; every `automated[i].path` must start with `'openspec/'`. Uses a minimal dependency-free YAML extractor (`parseManifestYaml`).
- **(c) Marker format:** `openspec/.qrspi-version` (if present) must contain a bare SemVer string (`X.Y.Z`, no `v` prefix).

**End-to-end `edit-file` dispatch** for `migrations/0.13.0.yaml`'s `insert_after` step:

1. `/qrspi:update` loads skill `qrspi-update`.
2. Walk resolves version A (from marker) and B (target); builds ordered walk list ascending by SemVer (numeric tuple comparison, not string sort).
3. For `0.13.0`'s automated step: guard passes (action `edit-file`, path starts with `openspec/`).
4. Read `openspec/backlog.md` via Read tool.
5. Find first occurrence of `"# Backlog\n"` in the file content. If absent: **hard-stop** — no anchor-fallback, no degradation to manual.
6. Insert the legend comment block immediately after that anchor.
7. Write the result via Write or Edit tool.
8. Print one-line confirmation.
9. After all steps for all versions: bump marker, stage with explicit `git add`, print `git commit` command for the human (does not auto-commit).

### Area 5 — Backlog grammar & wikilink conventions

- `openspec/backlog.md` — The live backlog for this repo (1860 lines as of research date). Contains the three required sections in order: `## In progress` (empty, `_None._`), `## Proposed` (one row: `backlog-schema-finish`), `## Ideas` (many rows).
- `openspec-templates/backlog.template.md` — The canonical template seeded by `/qrspi:init`. Contains an HTML comment block at the top documenting the schema legend. Contains the three required section headings. Has two sample rows: `sample-idea-row` (standalone `idea` with Why+Shape) and `sample-bundled-row` (bundled with blockquote pointer). The template is the authoritative reference for the frozen schema; Check 22 assertion 6 verifies it exists.

**Frozen row grammar** (also documented in the template's HTML comment):

```
### <id> — `<status>` · **P<n>**
```

- `<id>`: kebab-case slug, `[a-z0-9]+(?:-[a-z0-9]+)*`.
- Separator: em-dash (U+2014), surrounded by single spaces. NOT `--`.
- `` `<status>` ``: backtick-wrapped. The leading keyword is what the enum validates; remainder is free text (e.g. a parenthetical note or `into <id> (<date>)`).
- Separator: middle-dot (U+00B7), surrounded by single spaces.
- `**P<n>**`: priority band, bold; `n` is 1, 2, or 3.

**Status keyword enum:** `idea | proposed | in-progress | merged | bundled`

**Required sections** (all three must be present as exact `##`-level lines; order not asserted by Check 22):
- `## In progress`
- `## Proposed`
- `## Ideas`

**P-band preamble:** the `## Ideas` section must carry a line mentioning all three of `P1`, `P2`, `P3` before its first `### ` row.

**Body rules by keyword:**
- `idea` / `proposed` (standalone): MUST carry both `**Why:**` and `**Shape:**` lines. `**Why:**` regex accepts parenthetical qualifiers (`**Why (two payoffs -- ...):**`).
- `bundled` / `merged`: EXEMPT from Why/Shape; carry a `>` blockquote pointer note.
- `in-progress`: grammar + enum only (no body-field check).

**`bundled` status convention (observed in live backlog):** a bundled row heading uses `bundled into <anchor-change-id> (<date>)` as the free-text portion of the status field. The row body is a `>` blockquote pointer to the anchor change's `## Proposed` entry.

**Wikilink convention (`[[<slug>]]`):**

Wikilinks appear as `[[slug]]` (double-bracket syntax) in the body text of `openspec/backlog.md`. They are never in headings. They appear in several contexts:
- The `## Ideas` P-band preamble prose (multiple cross-references to related items and historical notes).
- Row `**Why:**` and `**Shape:**` bodies (cross-references to related or dependent ideas).
- The `## Proposed` row body (bundled items are named as `[[slug]]` in the bundled-into description).
- Blockquote pointer notes of bundled rows (referencing the anchor).

**Census (as of research date):**
- Total occurrences: 178
- Unique target slugs: 65 (including meta-tokens `[[wikilink]]`, `[[wikilinks]]`, `[[<slug>]]`, `[[slug]]`, `[[dangling-idea]]` that are illustrative/non-resolving)

**Resolution classification of the 65 unique targets:**

*Live backlog rows* (slug matches a `### <slug> —` heading in `openspec/backlog.md`): approximately 47 slugs, including: `spec-anchored-code-comments`, `researcher-apply-surface-gate`, `git-host-and-remote-awareness`, `idea-capture-command` (bundled), `backlog-wikilink-resolution-lint` (bundled), `migration-edit-file-idempotency-guard` (bundled), `standardize-recurring-ops-scripts`, `hooks-as-mechanical-guards`, `privacy-gdpr-surface`, `structured-surface-schema`, `extend-surface-taxonomy`, `backlog-prioritization`, `rename-qrspi-to-qrnchi`, `spec-anchored-code-comments`, `bump-openspec-pin`, and others.

*Archived change folders* (`openspec/changes/archive/*-<slug>/` exists): approximately 13 slugs, including: `archive-requires-merged-pr`, `per-slice-compute-tier`, `reassess-openspec-dependency`, `standardize-backlog-format`, `context-budget`, `repo-applicable-artifact-sections`, `session-version-check-and-update-prompt`, `unify-implement-paths-on-variants`, `pr-review-open-tasks-and-followups`.

*Neither live row nor matching archive folder* (unresolved): approximately 5 slugs, including: `configurable-effort-and-thinking`, `haiku-model-tier`, `kit-self-surfaces`, `simplify-per-slice-model-selection`, `dangling-idea`, `slug`, `<slug>`. Note: `configurable-effort-and-thinking`, `haiku-model-tier`, `kit-self-surfaces`, and `simplify-per-slice-model-selection` were absorbed into bundled archive changes (`per-slice-compute-knobs`, `kit-surface-dogfooding`) whose folder name does not match the individual slug.

**No existing lint check resolves wikilinks.** Check 22 parses `### ` headings and validates grammar, enum, and body fields only. It does not collect `[[slug]]` occurrences or assert that they resolve to a live row or archive folder. The check has no knowledge of `openspec/changes/archive/` folder names.

## Slash-command surface

- `claude/commands/*.md` — 15 commands. All carry `description:` in frontmatter. Three (`archive.md`, `init.md`, `stack.md`) additionally carry `agent: build`. No command carries `model:` frontmatter (model selection happens at Agent tool invocation time inside the command body). Commands without `agent:` run on the main loop; commands with `agent: build` route through a build-mode agent (capable of file writes but not AskUserQuestion).
- `README.md` — Canonical documentation source for the command table. Contains the `## Commands` section listing all 8 stage commands plus helpers.

## Stage-agent surface

- `claude/agents/` — Not directly read in this research stage (per read contract), but the skill-sets registry (`scripts/skill-sets.mjs`) references 9 agent stems: `researcher`, `questioner`, `designer`, `architect`, `planner`, `implementer-low`, `implementer-medium`, `implementer-high`, `reviewer`.

## Skill surface

- `claude/skills/` — 13 kit-shipped skills: `context-budget-gate`, `context-hygiene`, `implementer-core`, `openspec-archive-change`, `openspec-sync-specs`, `openspec-workflow`, `postpr-fix`, `qrspi-update`, `qrspi-version-check`, `repo-surface`, `retrospective`, `vertical-slice`, `workflow`.
- `.claude/skills/qrspi-stack/` — Project-scoped stack-cheatsheet skill. Declares surfaces via `## Repo surface` block (authoritative allowlist for surface-gated sections).

## Lint-gate surface

- `scripts/lint.mjs` — 22 checks (numbered 1, 2, 2b, 3–22; with 10 carrying two sub-checks 10/10b). Each is an async function. Inline self-tests run before file I/O for Checks 14, 15, 21, 22. All checks collect errors into a shared array; non-zero exit only at the end.
- `scripts/skill-sets.mjs` — Shared registry module imported by both `scripts/lint.mjs` and `scripts/context-footprint.mjs`.

## Template surface

- `openspec-templates/backlog.template.md` — Canonical template for `openspec/backlog.md`. Contains HTML schema-legend comment, three required section headings, and two sample rows. Check 22 assertion 6 verifies this file exists.
- `openspec-templates/research.template.md`, `questions.template.md`, `design.template.md`, `proposal.template.md`, `tasks.template.md`, `spec-delta.template.md` — Other stage-artifact templates; not directly relevant to Areas 1–5 investigated.

## Migration manifest surface

- `migrations/0.6.0.yaml` through `migrations/0.13.0.yaml` — 9 manifests. `0.13.0.yaml` is the first with a non-empty `automated:` list (one `edit-file`/`insert_after` step targeting `openspec/backlog.md`). All others have `automated: []`.
- `openspec/.qrspi-version` — Marker file (bare SemVer, no `v` prefix). Written by `/qrspi:update` after a completed walk. Read by Check 6 for format validation and by the `qrspi-update` skill as version `A`.

## Notable discrepancies

- The `qrspi-update` skill's `insert_after` dispatcher hard-stops when the anchor is absent, with no fallback path. The `0.13.0.yaml` manifest's anchor is `"# Backlog\n"`, which is only guaranteed to be present in backlogs seeded by `/qrspi:init` from the canonical template. A consumer whose backlog has a different title line would hit this hard-stop.
- The `edit-file` dispatcher has no `skip_if_contains` or equivalent idempotency guard. A walk interrupted after an automated step runs but before the marker bumps will replay the insert on re-run, potentially duplicating content.
- The `check 22` backlog-schema check does not read `openspec/changes/archive/` folder names. Wikilink resolution (checking that `[[slug]]` targets exist as live rows or archive folders) is entirely absent from the lint harness.
- Several wikilink targets (e.g. `configurable-effort-and-thinking`, `haiku-model-tier`, `kit-self-surfaces`, `simplify-per-slice-model-selection`) resolve to neither a live backlog row nor an archive folder whose name ends in the exact slug, because those ideas were absorbed into bundled changes with different folder names. These would fail a strict wikilink-resolution check under the "slug must match archive folder suffix" rule.

## Implicit contracts and conventions

- Every command `description:` frontmatter value must be a single-line string (not block scalar). Required by Check 2 (`checkFrontmatter`).
- Stage commands without `agent:` frontmatter run on the main loop; `AskUserQuestion` is only reachable on the main loop (not inside a subagent). `update.md` lacks `agent:` precisely to preserve AskUserQuestion access for manual-step gates.
- The version-check embed line must be the exact string `Load skill \`qrspi-version-check\` and follow its instructions exactly.` (Check 9 asserts this exact match).
- `automated[].action` is a closed vocabulary: `edit-file` is the only allowed value. Check 6 enforces this; the `qrspi-update` skill documents it.
- Every `automated[].path` must start with `openspec/`. This is enforced by both Check 6 and the `qrspi-update` skill's dispatcher guard.
- The migration floor (`0.6.0`) is a hard-coded constant in Check 6, not derived from the migrations directory, to prevent the "delete the floor manifest to skip the check" fail-open.
- Numeric SemVer tuple comparison (not string sort) is required for the walk order. `0.10.0 > 0.9.0` lexically fails; the skill specifies integer-tuple comparison.
- The backlog heading grammar uses two non-ASCII code points: em-dash U+2014 (`—`) and middle-dot U+00B7 (`·`). These are embedded as literal characters in the regex; the comment in Check 22 notes this is "robust to editor normalization" via Unicode escapes.
- The `bundled` and `merged` keyword rows are exempt from body-field requirements. Classification is by status keyword, not by the presence or absence of a `>` blockquote pointer note.
- The `## Ideas` P-band preamble check (`P1 && P2 && P3` on one line) stops at the first `### ` row or the next non-`Ideas` `## ` heading. It does not require specific wording, only that all three tokens appear.
- Check 22 passes silently (0 violations) when `openspec/backlog.md` is absent. This is documented behavior (`passes SILENTLY when openspec/backlog.md is absent`).

## Open gaps

- [ ] The exact body of `claude/agents/researcher.md` was not read (blocked by the read contract for this stage). The skill-sets registry confirms the researcher's approved skills but the agent's skill-load line phrasing, `> **Read contract**` banner text, and `> **Output contract**` banner were not verified directly.
- [ ] The full body of `openspec/backlog.md` beyond line 837 was not read in full (the file is 1860 lines). The wikilink census used grep-based counting rather than a line-by-line read, so the classification of the final ~1000 lines' wikilinks is based on the grep output rather than confirmed by reading the full file.
- [ ] The exact `insert_after` anchor matching behavior when the file content has CRLF line endings vs LF is not explicitly documented in the skill. The skill says "first occurrence of `insert_after` in the file" but does not specify whether the match is byte-exact or normalized.
- [ ] Whether `claude/commands/idea.md` currently exists was not checked (it is named as a potential new command). A quick check: it is not listed in `claude/commands/` (the glob returned 15 files and `idea.md` was not among them), confirming it does not yet exist.
