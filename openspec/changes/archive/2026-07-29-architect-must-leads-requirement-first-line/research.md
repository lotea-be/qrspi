# Research — architect-must-leads-requirement-first-line

> Stage R of QRSPI. Generated 2026-07-28.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Architect agent file**: section structure, delta-spec requirement skeleton, "Format rules" block, quick-reference table (including `Body` row), read-contract banner, two-mode routing (Structure vs. Slices), and placement of free-text prose guidance relative to the skeleton.
- **Spec-delta template**: section structure, requirement skeleton/examples, "Format rules" section, MUST/SHALL and `When ...` clause usage, sibling templates with requirement-body guidance.
- **Lint script**: all 19 checks and their numbering/error-message conventions, inline self-test patterns, any check that already parses delta spec files per-requirement, handling of base specs.
- **OpenSpec strict validation & CI**: exact invocations of `openspec validate` (including `--strict` / `--all`), where invoked, pinned version, and what `--strict` enforces about requirement-body first lines.
- **Requirement-body conventions in existing specs**: observable pattern of first body line, MUST/SHALL usage, `When ...` clause usage, scenario block structure, variance across delta and base specs.

## File map

### Architect agent file

- `claude/agents/architect.md` — QRSPI stage S (Structure) and V (Slices) subagent. Writes `proposal.md`, `specs/`, and `slices.md`. Exports no functions; consumed by slash commands `qrspi:structure` and `qrspi:slices` via the Claude Code plugin agent system.

  **Frontmatter**: `name: architect`, `model: sonnet`, `effort: medium`.

  **Read-contract banner** (line 16):
  > **Read contract** — Reads (S): design.md. Reads (V): proposal.md, specs/. Never opens: questions.md, research.md (at S); no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).

  **Output-contract banner** (line 18):
  > **Output contract** — Returns (S): `openspec/changes/<id>/proposal.md` + `specs/` + capabilities list + next stage. Returns (V): `openspec/changes/<id>/slices.md` + slice count + next stage. No inline file bodies or diffs.

  **Top-level section structure** (body, after frontmatter):
  1. Recommended model rationale block (blockquote)
  2. Read-contract banner (blockquote)
  3. Output-contract banner (blockquote)
  4. `## Cross-change read boundary` — prose prohibition on opening other changes' process artifacts.
  5. `## Precondition` — approval-gate definition.
  6. `## Stage routing` — gate: S writes proposal + specs; V writes slices.md only.
  7. `## What to do -- Structure (S)` — numbered steps 1-4.
  8. (Within step 3) Inline fenced skeleton for `proposal.md`.
  9. (Within step 4) Two inline fenced skeletons for delta specs (new-capability and delta-against-existing forms).
  10. Quick-reference table.
  11. Format rules block (prose paragraph, then five bullet points).
  12. Post-validate instruction paragraph.
  13. `## What to do -- Slices (V)` — prerequisite gate + instructions + inline slices.md skeleton.
  14. `## What you must NOT do` — prohibitions.
  15. `## Before returning -- divergence self-check` — hard-stop condition 4 application.
  16. `## Final message format` — S-only and V-only formats.

  **Placement of free-text prose guidance relative to skeletons**: all prose guidance (format rules, verbatim-match rule, MUST/SHALL rule, scenario requirements) appears AFTER the skeletons, as a "Format rules" section. The skeletons precede the rules they must comply with.

  **Quick-reference table** (lines 166-172):

  | Element | ADDED | MODIFIED | REMOVED |
  |---|---|---|---|
  | Section header | `## ADDED Requirements` | `## MODIFIED Requirements` | `## REMOVED Requirements` |
  | Requirement title | new, free-form | **verbatim** from base spec | **verbatim** from base spec |
  | Body | **first line** has MUST/SHALL | **full** replacement text, **first line** has MUST/SHALL | one line: why removed |
  | `#### Scenario:` block | ≥1 required | ≥1 required | none |

  The `Body` row carries the phrase "**first line** has MUST/SHALL" in the ADDED and MODIFIED columns. No explicit wording about what the first line must NOT start with (e.g., no `When ...` prohibition).

  **Format rules block** (lines 174-196): five bullet points. The relevant one (lines 189-192):
  > The **first line** of every requirement body MUST contain `MUST` or `SHALL`. OpenSpec reads the requirement's *first physical line* as its statement, so a `MUST`/`SHALL` that wraps onto the second line does NOT count — keep it on line one (write `The skill MUST …`, not `When X …, the\nskill MUST …`).

  This is the only location in the file where the MUST/SHALL-on-first-line rule is stated as a Format rule. It includes a single negative example (`When X …`) embedded inline in the prose.

  **Two-mode routing**: the file distinguishes S and V in `## Stage routing` (lines 40-45) and then in separate `## What to do -- Structure (S)` and `## What to do -- Slices (V)` sections. The format rules and quick-reference table appear only in the S section (step 4, after the spec skeletons), not in the V section.

### Spec-delta template

- `openspec-templates/spec-delta.template.md` — canonical source of truth for how the architect writes delta spec files. Not read by the architect agent at runtime (the agent carries an inline copy of the same skeletons); this file is used for Check 3 heading-alignment linting and as documentation.

  **Top-level structure**:
  1. File preamble (prose, 7 lines) — declares this as the single source of truth, names `openspec validate <id>` and `openspec-sync-specs`.
  2. `## New capability` — fenced skeleton for a new-capability spec.
  3. `## Delta against an existing capability` — fenced skeleton for a delta spec.
  4. `## Format rules (enforced by \`openspec validate <id> --strict\`)` — prose rules.

  **Requirement skeleton in "New capability" section** (lines 22-28):
  ```
  ### Requirement: <name>
  The system MUST ...
  ```
  First body line example: `The system MUST ...` — the `MUST` keyword leads directly on the first line, beginning with "The system".

  **Requirement skeleton in "Delta against existing capability" section** (lines 48-50 for ADDED, lines 56-60 for MODIFIED):
  ```
  ### Requirement: <new requirement name>
  The system MUST ...
  ```
  MODIFIED section comment (lines 57-61) states MODIFIED = **wholesale replacement**: sync REPLACES the requirement wholesale; every scenario must be listed. First body line of MODIFIED is also `The system MUST ...` (same skeleton text as ADDED).

  **Format rules section** (lines 74-100): prose rule for first-line MUST/SHALL (lines 91-94):
  > The **first line** of every requirement body MUST contain `MUST` or `SHALL`. OpenSpec reads the requirement's *first physical line* as its statement, so a `MUST`/`SHALL` that wraps onto the second line does NOT count — keep it on line one (write `The skill MUST …`, not `When X …, the\nskill MUST …`).

  This wording is identical to the architect's Format rules block — the two surfaces are in sync. The negative example (`When X …`) is present here too.

  **`When ...` / `WHEN` clauses in scenario blocks**: Scenario blocks use `- **WHEN** ...` and `- **THEN** ...` bullets. These appear only inside `#### Scenario:` blocks, never as the opening of a `### Requirement:` body.

  **Sibling templates with requirement-body guidance**:
  - `openspec-templates/design.template.md` — no requirement-body guidance; covers design decisions (D1...Dn format).
  - `openspec-templates/proposal.template.md` — no requirement-body guidance; covers Why/What Changes/Capabilities/Impact.
  - `openspec-templates/questions.template.md` — no requirement-body guidance.
  - `openspec-templates/tasks.template.md` — no requirement-body guidance; covers Compute annotations.
  - `openspec-templates/research.template.md` — no requirement-body guidance.

  Only `spec-delta.template.md` carries requirement-body guidance.

### Lint script

- `scripts/lint.mjs` — 2829-line Node.js ESM script. Single entry point (`main()`), no npm dependencies (uses `node:fs`, `node:path`, `node:url`). Exits 0 on pass, 1 on failure. All errors are collected into an `errors[]` array before exit.

  **Check numbering and error-message formatting conventions**:
  - Each check is a named `async function checkXxx(errors)` that pushes strings to `errors[]` and calls `process.stdout.write('  OK: ...\n')` on success.
  - `main()` calls each check with a `process.stdout.write('\nCheck N: <label>\n')` header line immediately before the call.
  - Error strings begin with a bracketed label: `[pin]`, `[frontmatter]`, `[read-contract]`, etc. A tab/newline indented secondary detail line follows for multi-line errors (e.g. `expected: ...` / `actual: ...`).
  - Check 2b (`checkSkillSets`) and the helper-agent check (`checkHelperAgentReadContracts`) are registered as unnumbered siblings (2b and 17 respectively) but follow the same pattern.

  **Inline self-test pattern**: Checks 13, 14, 15, 17 each carry an in-memory self-test block at the top of the function. The self-test constructs synthetic fixture strings, runs the detector function, and pushes a `SELF-TEST FAILED: ...` error to the `errors[]` array if the detector misfires. This pattern makes a broken detector fail CI immediately rather than silently passing.

  **Checks that parse delta spec files per-requirement**:
  - **Check 18** (`checkModifiedScenarioCounts`, lines 2461-2648): walks all `openspec/changes/*/specs/**/spec.md` files (including archive paths), finds `## MODIFIED Requirements` sections, parses each `### Requirement: <title>` block within, counts its `#### Scenario:` lines, locates the same requirement by verbatim title in `openspec/specs/<capability>/spec.md`, counts scenarios there, and flags any delta-count < base-count. Does NOT check requirement body first lines.
  - No existing check parses the text content of requirement bodies (i.e., the lines between `### Requirement:` and the first `#### Scenario:`).

  **How base specs are (or are not) parsed**: Base specs under `openspec/specs/**/spec.md` are accessed only by Check 18 (to look up scenario counts for MODIFIED requirements). No check scans their requirement bodies for MUST/SHALL compliance; that is delegated to `openspec validate --all` (see CI section below).

  **Complete check inventory** (Checks 1-19):
  1. `checkPinAgreement` — all OpenSpec version-pin occurrences agree.
  2. `checkFrontmatter` — agent/command/skill frontmatter fields; model alias; effort value; skill-ref resolution.
  2b. `checkSkillSets` — each stage agent's step-1 skill set matches the `SKILL_SET_EXPECTED` registry.
  3. `checkHeadingAlignment` — canonical headings from each `openspec-templates/*.template.md` present in the corresponding agent inline skeleton.
  4. `checkReadmeCoverage` — bidirectional: every command documented in README; every README `/qrspi:*` resolves.
  5. `checkGateExecutor` — no command with a non-builtin `agent:` reaches `AskUserQuestion` directly or transitively.
  6. `checkMigrationManifests` — migration manifest presence, schema, and marker format.
  7. `checkReadContracts` — each stage agent's `Reads:` banner field equals the approved read-matrix row.
  8. `checkPrReconciliationPasses` — `pr.md` contains both reconciliation-gate sections with required choice labels.
  9. `checkVersionCheckEmbed` — nine stage commands contain the inline `qrspi-version-check` embed line.
  10. `checkTriagePaths` — `followup.md` contains all three triage choice-label prefixes (P1/P2/P3).
  11. `checkNoCrudSkeletonHeadings` — twenty-two surface-gated headings absent from fenced blocks in six agent files.
  12. `checkOutputContracts` — each stage agent carries a `> **Output contract**` banner.
  13. `checkComputeAnnotations` — `**Compute:**` line value-validation in `slices.md` / `tasks.md`.
  14. `checkSurfaceApplicability` — no absent-surface headings in `openspec/changes/**` artifacts (outside archive).
  15. `checkVariantAgents` — implementer variant fleet: exact set, step-1 skill load, effort match, plugin.json registration, base-agent absence.
  16. `checkFollowupStem` — `followup.md` contains no bare `qrspi:implementer` (without variant suffix).
  17. `checkHelperAgentReadContracts` — helper agent `Reads:` banners match `HELPER_READ_CONTRACT_EXPECTED`.
  18. `checkModifiedScenarioCounts` — MODIFIED requirements in delta specs have >= scenario count of base spec counterparts.
  19. `checkAuthoritativeSyncDelegator` — `archive.md` references `qrspi:spec-syncer`; no kit file has `general-purpose` spawn near sync context.

### OpenSpec strict validation & CI

- `.github/workflows/ci.yml` — two parallel jobs, no `needs:` dependency between them, both on `ubuntu-latest`.

  **`lint` job**: runs `node scripts/lint.mjs`. No OpenSpec CLI invocation.

  **`validate` job**: runs `npx --yes @fission-ai/openspec@1.4.1 validate --all`. This is the exact invocation — pinned to version `1.4.1`, `--all` flag.

  **`--all` flag behavior**: per the `ci-quality-gates` base spec (Requirement "Validate job runs openspec validate on the reference example"), `--all` runs strict validation on every base spec under `openspec/specs/` AND every active change under `openspec/changes/`. The base spec states: "Because `--all` runs strict, it enforces rules the non-strict `openspec validate <id>` skips (notably that each requirement's **first line** contains `MUST`/`SHALL`)."

  **`--strict` flag**: per the architect agent's Format rules block and the spec-delta template, `openspec validate <id> --strict` enforces the MUST/SHALL-on-first-line rule. Plain `openspec validate <id>` (no `--strict`) does NOT check this rule. `--all` implies strict.

  **Where `--strict` is documented as required**: the architect agent instructs (after the spec skeletons): "After writing all spec files, run `openspec validate <id> --strict` (the `--strict` flag is required — plain `openspec validate <id>` skips the MUST/SHALL check and will pass specs that CI's strict `validate --all` later rejects)". The spec-delta template carries an identical instruction (line 99).

  **Pinned OpenSpec version**: `1.4.1`. This version pin appears in `ci.yml`, the spec-delta template prose, and README (Check 1 asserts all occurrences agree).

  **No `--strict` invocation in `lint.mjs`**: the lint script does not call the OpenSpec CLI at all. The MUST/SHALL check is entirely delegated to the CI `validate` job (or to `openspec validate <id> --strict` run locally by the architect subagent after writing specs).

### Requirement-body conventions in existing specs

Sampled files: three delta specs under `openspec/changes/orchestrator-context-budget/specs/` and base specs `openspec/specs/ci-quality-gates/spec.md`, `openspec/specs/reference-example/spec.md`, `openspec/specs/kit-governance/spec.md`, `openspec/specs/qrspi-read-contracts/spec.md`.

**Observable pattern — base specs** (`openspec/specs/**/spec.md`):

Base specs use `## Requirements` (not `## ADDED Requirements`) as the section header — this is the base-spec format, not the delta format. Each `### Requirement: <name>` body opens with a MUST or SHALL on the first physical line, with a subject + verb pattern. Observed examples:

- `The system MUST provide a .github/workflows/ci.yml ...`
- `The CI \`lint\` job MUST assert that every hand-maintained occurrence ...`
- `The \`plugin.json\` \`version\` field MUST be the single source of truth ...`
- `The system MUST define and enforce a read-matrix table ...`
- `Every QRSPI stage agent file MUST carry a terse, machine-readable ...`
- `The system MUST provide a hand-authored fictional change ...`
- `CI MUST run \`openspec validate --all\` ...`

No base-spec requirement body opens with a `When ...` or conditional clause. All sampled first lines begin with either "The system MUST", "The CI `lint` job MUST", "The `plugin.json` ... MUST", "Every ... MUST", or "CI MUST". Pattern: subject phrase followed immediately by MUST or SHALL.

**Observable pattern — delta specs (ADDED requirements)**:

Observed examples from `openspec/changes/orchestrator-context-budget/`:

- `The CI \`lint\` job MUST include a \`checkBudgetGateEmbed\` check ...` (ci-quality-gates delta)
- `The system MUST ship \`claude/skills/context-budget-gate/SKILL.md\` ...` (context-budget-gate, Requirement 1)
- `The system MUST embed a load line for skill \`context-budget-gate\` ...` (Requirement 2)
- `The skill MUST instruct each embedding command to increment ...` (Requirement 3)
- `The skill MUST instruct the orchestrator to evaluate two independent triggers ...` (Requirement 4)
- `The skill MUST define a nudge threshold of 8 stage-events ...` (Requirement 5)
- `The skill MUST define a soft-gate threshold of 12 stage-events ...` (Requirement 6)
- `The system MUST update \`claude/skills/workflow/SKILL.md\`'s ...` (Requirement 7)
- `The skill MUST construct the reset resume one-liner ...` (Requirement 8)
- `The system MUST add a \`## Marathon anti-pattern\` subsection ...` (Requirement 9)
- `The skill MUST instruct the orchestrator that when \`/qrspi:followup\` ...` (Requirement 10)
- `The skill MUST instruct each embedding command to check for the nudge-level ...` (Requirement 11)
- `The system MUST enforce that when \`/qrspi:followup <id>\` embeds the ...` (followup-triage delta)

All ADDED requirement bodies in the sampled delta specs open with a subject noun phrase immediately followed by `MUST` on the first physical line. No requirement first line begins with `When`, a conditional clause, or any other construction that defers `MUST`/`SHALL` to the second or later line.

**Observable pattern — Scenario blocks**: scenario bodies always use `- **WHEN** ...` / `- **THEN** ...` bullets (with optional `- **GIVEN** ...` / `- **AND** ...`). The `WHEN` keyword is confined to scenario blocks; it never appears in requirement-body first lines.

**Variance noted**: None observed in the sampled material. The pattern is uniform across all sampled base and delta specs: first physical line of requirement body = subject + `MUST`/`SHALL` (no `When ...`, no deferred modal).

## Slash-command surface

No slash commands are directly authored in the areas of interest. The architect is a subagent (`claude/agents/architect.md`) invoked by `claude/commands/structure.md` and `claude/commands/slices.md`, not a command itself.

## Stage-agent surface

- `claude/agents/architect.md` — as fully mapped above.
- Dependency: loads skills `workflow`, `openspec-workflow`, `vertical-slice`, `repo-surface`, and the project's stack-cheatsheet skill (at S); loads `workflow`, `vertical-slice`, `repo-surface`, and stack-cheatsheet (at V).
- The Format rules block (including the MUST/SHALL first-line rule) lives inside the `## What to do -- Structure (S)` section, step 4, after both spec skeletons and the quick-reference table.

## Skill surface

No skill files are part of the areas of interest. The Format rules are embedded directly in the architect agent and the spec-delta template, not in a dedicated skill.

## Lint-gate surface

- `scripts/lint.mjs` — as fully mapped in the "Lint script" area above.
- Dependency: imports `SKILL_SET_EXPECTED` from `./skill-sets.mjs` (shared module; not otherwise referenced by the areas of interest).
- No existing check validates requirement-body first lines. That validation is delegated entirely to `openspec validate --all` (CI `validate` job, strict mode).

## Template surface

- `openspec-templates/spec-delta.template.md` — as fully mapped above. Contains the Format rules section including the MUST/SHALL first-line rule, with a negative example identical to the architect agent's Format rules block.
- No other sibling template carries requirement-body guidance.

## Migration manifest

Not applicable to the areas of interest.

## Notable discrepancies

- The quick-reference table in `architect.md` (Body row) says "**first line** has MUST/SHALL" for ADDED and MODIFIED, but does not state what the first line must NOT begin with. The Format rules block then provides the negative example (`When X …`), but only inline within a larger prose sentence. The table and the rules block are separated by the prose introducing the rules; a reader scanning the table alone may not immediately find the prohibition.
- The Format rules text is identical in `architect.md` and `spec-delta.template.md` (same wording, including the negative example). This is currently maintained by hand (no lint check asserts their equivalence), creating a potential drift risk if one is updated without the other.
- No lint check (Checks 1-19) validates the requirement body first line for MUST/SHALL compliance. This enforcement is entirely delegated to `openspec validate --all` in the CI `validate` job. There is no local/static lint-script equivalent.
- The `openspec validate <id> --strict` invocation is instructed to the architect subagent at runtime (it runs the CLI after writing specs), but the instruction lives inside the fenced skeleton prose in `architect.md`, not in a testable lint-gate invariant.

## Implicit contracts and conventions

- **MUST/SHALL on first physical line is an OpenSpec CLI contract**, not a kit-side invariant. The kit documents it in two places (architect agent and spec-delta template) and enforces it via CI's `openspec validate --all`. The lint script does not enforce it.
- **Error-message format convention**: `[<label>] <file>:<line>: <message>` for line-level violations; `[<label>] <file>: <message>` for file-level violations. Self-test errors use `[<label>] SELF-TEST FAILED: ...`.
- **Inline self-test pattern**: introduced in Checks 13, 14, 15, 17. Each self-test is at the top of its check function, before any I/O. If the detector misfires, an error is pushed to `errors[]` and (in some checks) the function returns early with `return 1` to avoid false-negative scan results from a broken detector.
- **`## MODIFIED` REMOVED both require verbatim title match**: the lint script (Check 18) enforces scenario-count non-reduction for MODIFIED requirements, but title matching is delegated to `openspec validate`.
- **Skeletons in architect precede rules**: the Format rules block always follows the skeletons it governs. This ordering is consistent between the agent and the template.
- **`When X …` negative example is the only guidance on prohibited first-line forms**: no list of prohibited patterns exists beyond the single inline example in the prose rule.
- **Template skeletons use `The system MUST ...` as the canonical placeholder**: both the new-capability and delta skeletons use this form. All sampled specs follow this pattern.
- **`openspec validate --all` is the sole enforcement gate for first-line MUST/SHALL**: no fallback exists if the CLI is not run (e.g., if the architect subagent skips the local validate step).

## Open gaps

- [ ] Could not determine what `openspec validate --all` reports verbatim when a requirement body opens with `When X …` — the exact error message text from the CLI is not present in any file in this repo. This would be needed to understand what the CI `validate` job surfaces to contributors.
- [ ] Could not confirm whether OpenSpec v1.4.1 `--strict` / `--all` enforces the MUST/SHALL rule on base spec requirement bodies (under `## Requirements`) in addition to delta spec bodies (under `## ADDED` / `## MODIFIED`). The kit documentation refers to this rule in the context of delta specs; base specs use `## Requirements` (not the delta operation headers).
- [ ] The negative example in the Format rules (`When X …, the\nskill MUST …`) is the only stated prohibited form. It is unclear whether other non-MUST-leading forms (e.g., `If X, the system MUST …` or `For each Y, the system MUST …`) are also prohibited by the OpenSpec CLI, or only the WHEN/conditional-clause form.
- [ ] No check in `scripts/lint.mjs` asserts that the Format rules block in `architect.md` and `spec-delta.template.md` are identical. A drift between these two surfaces is not currently detectable by CI.
