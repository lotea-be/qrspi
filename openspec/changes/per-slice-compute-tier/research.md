# Research — per-slice-compute-tier

> Stage R of QRSPI. Generated 2026-07-27.
> Ticket is hidden from this stage by design.

## Areas investigated
- Compute-annotation parse + subagent spawn path: how `implement.md` reads `**Compute:**` lines and passes model/effort to the Agent tool spawn.
- Agent/Task tool model & effort parameters: whether per-invocation `model` override and per-invocation `effort` exist on the Agent tool.
- Implementer agent file: frontmatter, body structure, skills loaded, fix-mode section, final-message-format, divergence self-check.
- Lint checks over agent files and compute vocabulary: Check 13 (`checkComputeAnnotations`), `COMPUTE_MODELS`, `COMPUTE_EFFORTS`, `MODEL_ALIASES`, Check 2b (`checkSkillSets`), Check 2 (`checkFrontmatter`), Check 7 (`checkReadContracts`), Check 12 (`checkOutputContracts`), Check 11 (`checkNoCrudSkeletonHeadings`), Check 14 (`checkSurfaceApplicability`).
- Skill structure + reference validation: `claude/skills/*/SKILL.md` frontmatter fields and `checkSkillRefs` validation.
- Compute grammar + heuristic docs: where the `**Compute:**` grammar lives in templates and the model-selection heuristic in `vertical-slice`.

## File map

### Compute-annotation parse + subagent spawn path
- `claude/commands/implement.md` — main-loop orchestrator for stage I. Exports no agent: frontmatter; runs directly on the main loop. Depends on: `workflow` skill (canonical commit step / next-stage handoff / run-mode), `vertical-slice` skill (scope-amendment path), the project's stack-cheatsheet skill.

  Spawn logic (lines 27-47):
  - Reads `openspec/changes/$ARGUMENTS/tasks.md` to locate the first slice header (`## N. ...`) whose checkboxes are not all ticked.
  - Reads the `**Compute:** model=<alias> effort=<...>` line directly under that header.
  - Parses the `model=` token from that line and passes it to the Agent tool as `model: <parsed alias>`.
  - `effort=` is explicitly documented as NOT passed per-invocation: "the Task tool has no per-invocation effort param."
  - The `effort=` token is described as documenting intent, honored via the implementer agent's static frontmatter `effort:` key.
  - Guard on missing `**Compute:**` or missing `model=`: stops with an error telling the user the slices/tasks file needs to be fixed. Does not silently default.
  - In Full/Semi auto mode the same parse-and-spawn loop repeats for each subsequent slice (lines 92-101).

### Agent/Task tool model & effort parameters
- `claude/commands/implement.md` (lines 38-42, 98-100) — documents the current state of the Agent tool parameters:
  - `model:` — IS passed per-invocation on the Agent tool spawn call. Syntax: `model: <alias>`.
  - `effort:` — is NOT a per-invocation parameter on the Agent tool. The file states "the Task tool has no per-invocation effort param." Effort is a per-stage static frontmatter value on the agent file itself.
  - Thinking: "not shipped (no per-subagent thinking control)" — explicitly noted in the file.

### Implementer agent file
- `claude/agents/implementer.md` — QRSPI stage I subagent. Writes code, ticks tasks.md checkboxes, runs checks at slice boundaries.

  **Frontmatter:**
  - `name: implementer`
  - `description: QRSPI stage I. Writes the code, the tests, and ticks tasks.md as it goes. Works one vertical slice at a time. Stops at each slice checkpoint for human verification.`
  - `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`
  - `model: opus`
  - `effort: high`

  **Read contract banner:** `Reads: tasks.md. Never opens: design.md, slices.md, proposal.md, specs/, questions.md, research.md; no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).`

  **Output contract banner:** `Returns: per-slice status block (files modified, tests passing, build status, deviations, checkpoint). No inline file bodies or diffs. Per-slice: one-line bullets only, no file bodies or diffs.`

  **Body structure:**
  1. Recommended-model note (blockquote): states opus is default; per-slice `model=` token from tasks.md overrides via the spawn-time `model:` parameter; agent does not self-check the running model.
  2. Read contract + Output contract banners.
  3. Precondition: `openspec/changes/<id>/tasks.md` existence check; trivial-change exception.
  4. Cross-change read boundary: explicit prohibition on other changes' process artifacts.
  5. What to do (step list): load skills, read tasks.md, implement one slice at a time (tick boxes immediately, run tests, run lint/build, stop at checkpoint).
  6. Coding rules: match surrounding conventions, validate inputs, test every behavior, tick immediately.
  7. When you get stuck: delegations to project's domain/API/UI expert subagents; confused-about-design hard-stop protocol.
  8. ASCII-only rule for commit messages and PR text.
  9. What you must NOT do: list of prohibitions (no spec edits, no structure-edits to design.md/proposal.md/tasks.md except ticking boxes, no human-tagged tasks, no secrets, no cross-boundary reads, no push without approval).
  10. Divergence self-check (hard-stop condition 4): self-assess slice output before emitting final message; surface divergences; do not commit diverged slice.
  11. Fix mode (post-PR): activated by `POST-PR FIX MODE` task signal; skips slice machinery; loads `postpr-fix` skill; resolves one follow-up; uses "Final message format (per fix)".
  12. Final message format (per slice): structured block with Slice N — name: COMPLETE, Tasks ticked, Files created/modified (with markdown links), Tests passing, Build + lint, Deviations, Points to review, Checkpoint to verify, continuation prompt. After final slice: "All slices complete" + next-stage pointer.

  **Skills loaded (step 1):** `workflow`, `vertical-slice`, `context-hygiene`, plus the project's stack-cheatsheet skill.
  - `SKILL_SET_EXPECTED['implementer']` in `scripts/skill-sets.mjs`: `['context-hygiene', 'vertical-slice', 'workflow']` (stack-cheatsheet excluded from registry by convention).

### Lint checks — data structures and `main()` registration
- `scripts/lint.mjs` — CI quality gate (Checks 1-14). Node.js built-ins only. Exits 0 on pass, 1 on failure.
- `scripts/skill-sets.mjs` — shared module imported by `lint.mjs` and `context-footprint.mjs`; exports `SKILL_SET_EXPECTED`.

  **`COMPUTE_MODELS`** (line 343): `['sonnet', 'opus']` — two-element array; deliberately excludes `haiku` (comment: "annotation vocabulary is deliberately {sonnet, opus} until a per-slice haiku heuristic exists"). Separate from `MODEL_ALIASES`.

  **`COMPUTE_EFFORTS`** (line 337): `['low', 'medium', 'high']` — three-element array; excludes `xhigh`/`max` ("deliberate subset the kit surfaces").

  **`MODEL_ALIASES`** (line 333): `Set(['opus', 'sonnet', 'haiku'])` — used exclusively by Check 2 (`checkFrontmatter`) for agent/command frontmatter `model:` field validation. NOT used by Check 13; Check 13 uses `COMPUTE_MODELS` instead.

  **Check 2 — `checkFrontmatter`** (line 348): scans `claude/agents/*.md`, `claude/commands/**/*.md`, `claude/skills/*/SKILL.md`.
  - Agents: requires `name:` and `description:`. Validates `model:` against `MODEL_ALIASES` (plus PINNED_MODEL_RE rejection). Validates `effort:` as required and must be in `COMPUTE_EFFORTS`. Calls `checkSkillRefs` on body.
  - Commands: requires `description:`. Validates `agent:` resolves to a known agent file (excluding BUILTIN_AGENTS). Validates `model:` against `MODEL_ALIASES`.
  - Skills: requires `name:` and `description:`.
  - `BUILTIN_AGENTS = Set(['build', 'agent'])`.
  - `PINNED_MODEL_RE = /\d{8}|claude-\d/i` — rejects pinned model IDs.

  **Check 2b — `checkSkillSets`** (line 1067): harvests backtick-wrapped skill names from numbered-step "Load skills" lines in each of the seven stage agent bodies. Filters out names ending in `-stack` (repo stack-cheatsheet is per-repo, excluded). Compares sorted remaining set against `SKILL_SET_EXPECTED[stem]`. Reports added and missing names. Registered in `main()` at line 1993 as "Check 2b".

  **Check 7 — `checkReadContracts`** (line 1192): keyed off `READ_CONTRACT_EXPECTED` map (line 1154). Seven entries: researcher, questioner, designer, architect, planner, implementer, reviewer. Parses the `> **Read contract**` banner line from each agent body; extracts the substring between the em-dash separator and `Never opens:`. Asserts exact equality (after whitespace normalisation) to the expected value. Architect carries two-mode `Reads (S): ... Reads (V): ...` contract; reviewer uses "full changes/<id>/ folder (by design)". Scope strictly the seven stage agents.
  - `READ_CONTRACT_EXPECTED['implementer']` = `'Reads: tasks.md.'`

  **Check 12 — `checkOutputContracts`** (line 1571): presence-only check. Regex `/^>\s*\*\*Output contract\*\*/` must match at least one line in each of the seven stage agents' bodies (after stripping frontmatter). Same scope as Check 7.

  **Check 11 — `checkNoCrudSkeletonHeadings`** (line 1473): scans INSIDE fenced blocks in the six agent files listed in `CRUD_CHECK_AGENTS = ['questioner', 'designer', 'architect', 'planner', 'researcher', 'reviewer']`. Note: `implementer` is NOT in this list. Checks for surface-gated headings in `SURFACE_GATED_DENYLIST_HEADINGS` (22 entries covering data-store, http-api, ui, auth, and kit surfaces). Fence-tracking mirrors Check 14's approach. Registered in `main()` after Check 10.

  **Check 13 — `checkComputeAnnotations`** (line 1632): walks `openspec/changes/**/slices.md` and `**/tasks.md` (excludes `claude/skills/**` and `openspec-templates/**` — placeholder examples there are never scanned). Regex `^\s*(?:-\s+)?\*\*Compute:\*\*(.*)$` anchors at line start; tolerates the dash-bullet form (slices.md) and bare bold form (tasks.md). Extracts `model=` and `effort=` key=value tokens from the remainder. Validates:
  - `model=` is REQUIRED and non-empty; value must be in `COMPUTE_MODELS`.
  - `effort=` is OPTIONAL; if present value must be in `COMPUTE_EFFORTS`.
  - This is VALUE-VALIDATION only — does NOT assert a `**Compute:**` line is present on every slice.

  **Check 14 — `checkSurfaceApplicability`** (line 1878): reads `.claude/skills/qrspi-stack/SKILL.md`, parses `## Repo surface` bullet list to determine present surfaces. Derives absent-surface set. Scans `openspec/changes/**/*.md` (excluding `/archive/` paths) for headings outside fenced blocks that belong to absent surfaces (keyed off `SURFACE_GATED_HEADINGS` map, 10 surfaces). Includes inline self-test that asserts `## Data model` is detected in a synthetic fixture. Fails loudly if the `## Repo surface` block is absent or malformed.

### Skill structure + reference validation
- `claude/skills/*/SKILL.md` — kit-shipped skills; each directory auto-registers.
- `claude/skills/<name>/SKILL.md` frontmatter fields: `name:` (required, checked by Check 2), `description:` (required, checked by Check 2). No `model:`, `effort:`, or `tools:` in skills.
- No `Load skill` convention in skills themselves — skills are referenced from agent/command body prose.

  **`checkSkillRefs`** (line 456): helper called from `checkFrontmatter`. Finds all "Load skill / Load skills" prose lines in an agent or command body; extracts backtick-wrapped names from those lines (also matches "load the `X` skill" pattern). For each name found, checks `knownSkills.has(name)` where `knownSkills` is a Set of directory names under `claude/skills/`. Reports a violation if the name resolves to no directory. Only backtick-wrapped names are matched ("to avoid picking up English conjunctions").

### Compute grammar + heuristic docs
- `openspec-templates/tasks.template.md` — canonical template for tasks.md. Documents:
  - `**Compute:** model=<alias> effort=<low|medium|high> — <rationale>` as the required annotation grammar (bare bold paragraph form, under each `## N.` group heading).
  - Annotation is carried verbatim from slices.md (dash-bullet form converted to bare bold form — strip leading `- `).
  - Surface-gated task line categories documented in an HTML comment block inside the fenced example.
  - Template does NOT have a corresponding `slices.template.md` file; no such file exists in `openspec-templates/`.

- `claude/skills/vertical-slice/SKILL.md` — "Per-slice compute selection" section (lines 89-148). Frontmatter: `name: vertical-slice`, `description: How to decompose a change into vertical slices...`. Documents:
  - Annotation grammar: `model=` required (`sonnet`|`opus`; no `haiku`), `effort=` optional (`low`|`medium`|`high`). States effort "is not a per-invocation parameter" — honored via implementer frontmatter `effort:`.
  - Two structural forms: dash-bullet in slices.md, bare bold paragraph in tasks.md.
  - Architect writes dash-bullet form; planner carries it forward as bare bold (strips leading `- `).
  - `model=sonnet` heuristic: structured/templated slices (new entity mirroring existing, new endpoint mirroring existing pattern, DTOs, validators, wiring, tests from templates, renames, mechanical refactors).
  - `model=opus` heuristic: deep-reasoning slices (first-of-kind patterns, non-obvious authorization, performance-critical code, concurrency/transactional integrity, business rules with subtle invariants, UI with substantive interaction complexity).
  - "When in doubt, prefer `model=sonnet`."

## Slash-command surface
- `claude/commands/implement.md` — `/qrspi:implement` command. No `agent:` frontmatter (main-loop command). References `workflow` and `vertical-slice` skills for choreography and scope-amendment path.

## Stage-agent surface
- `claude/agents/implementer.md` — stage I agent. `model: opus`, `effort: high` static frontmatter. Per-slice spawn-time `model:` override from parsed `**Compute:**` annotation is the sole runtime gate.
- `claude/agents/researcher.md` — stage R agent. `model: sonnet`, `effort: medium`.

## Skill surface
- `claude/skills/vertical-slice/SKILL.md` — vertical-slice decomposition skill; owns the `**Compute:**` annotation grammar definition and `sonnet`/`opus` selection heuristic.
- `claude/skills/context-hygiene/SKILL.md` — context-management skill; mechanism described includes Check 2b and Check 12 as enforcement tools.

## Lint-gate surface
- `scripts/lint.mjs` — Check 2 validates agent `effort:` frontmatter against `COMPUTE_EFFORTS`; Check 2 validates agent/command `model:` against `MODEL_ALIASES`; Check 2b validates agent skill-set against `SKILL_SET_EXPECTED`; Check 13 validates `**Compute:**` annotation values against `COMPUTE_MODELS`/`COMPUTE_EFFORTS` in committed slices.md/tasks.md; Check 7 validates read-contract banners; Check 12 asserts output-contract banners present; Check 11 asserts no surface-gated headings in fenced blocks of agent files.
- `scripts/skill-sets.mjs` — exports `SKILL_SET_EXPECTED`; shared by lint.mjs and context-footprint.mjs.

## Template surface
- `openspec-templates/tasks.template.md` — tasks.md canonical template; documents `**Compute:**` annotation grammar (bare bold form, verbatim carry from slices.md).
- No `openspec-templates/slices.template.md` exists in the repo.

## Notable discrepancies
- The `effort=` token in `**Compute:**` lines has asymmetric treatment: it IS validated by Check 13 when present (value must be in `COMPUTE_EFFORTS`), but Check 13 does NOT require it to be present (value-validation only). The `vertical-slice` skill documents it as "optional." However, the `tasks.template.md` example shows `effort=<low|medium|high>` in the grammar string (alongside `model=<alias>`), which could be read as requiring it.
- `CRUD_CHECK_AGENTS` (Check 11) lists six agents — questioner, designer, architect, planner, researcher, reviewer — but excludes `implementer`. This means the implementer agent is not checked for surface-gated headings inside fenced blocks.
- There is no `openspec-templates/slices.template.md` file. The slices.md format (dash-bullet `**Compute:**` form) is defined only in `claude/skills/vertical-slice/SKILL.md` and referenced in `openspec-templates/tasks.template.md`.

## Implicit contracts and conventions
- The `**Compute:**` annotation is the sole gate for per-slice model selection at spawn time. The implement command explicitly forbids silent defaults when the annotation or its `model=` token is missing.
- `COMPUTE_MODELS` (`['sonnet', 'opus']`) and `MODEL_ALIASES` (`Set(['opus', 'sonnet', 'haiku'])`) are deliberately separate data structures: annotations use a restricted two-model vocabulary; agent/command frontmatter allows `haiku` as a third option.
- `effort=` in the `**Compute:**` annotation is described consistently in three places (implement.md, vertical-slice skill, tasks template) as not a per-invocation parameter — it records intent and is realized only through the implementer's static frontmatter `effort: high`.
- The planner's job is to carry the `**Compute:**` annotation verbatim from slices.md into tasks.md, converting from dash-bullet form to bare bold paragraph form. The D-number citations from slices.md are also carried verbatim into task lines.
- Check 13 scope is strictly committed artifacts (`openspec/changes/**/slices.md` and `**/tasks.md`); it never scans skills, commands, agents, or templates. This prevents placeholder example lines (e.g., `model=<alias>`) in those files from triggering false violations.
- The implementer's "recommended model" blockquote documents that the agent does not self-check the running model — it relies entirely on the orchestrator to spawn it with the correct `model:` parameter.
- `checkSkillSets` (Check 2b) harvests only from numbered-step "Load skills" lines, not from bullet items in the body (to avoid counting the fix-mode "Load skill `postpr-fix`" bullet as a required skill load).

## Open gaps
- [ ] No existing `openspec-templates/slices.template.md` — the slices.md format is defined only in `vertical-slice` skill prose and the tasks template's reference to carry annotations verbatim. The exact heading format and full slices.md structure for Check 3 (heading alignment) is not covered by any template-to-agent mapping in `TEMPLATE_CANONICAL_HEADINGS`.
- [ ] The `effort=` optionality discrepancy (Check 13 treats it as optional; tasks template example includes it in the grammar without marking it optional) — whether the intent is to make `effort=` required in annotations is not determinable from current code alone.
- [ ] It is not confirmed from code whether the Agent tool's `model:` parameter, as used in practice, takes precedence over an agent file's frontmatter `model:` field, or whether the two are additive — this is a Claude tool-API behavior not documented in the kit's own files.
- [ ] The `CRUD_CHECK_AGENTS` exclusion of `implementer` from Check 11 appears intentional (the implementer does not produce artifact skeletons), but no comment in the lint script explicitly states the reason for the exclusion.
