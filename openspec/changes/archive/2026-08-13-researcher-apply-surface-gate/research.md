# Research — researcher-apply-surface-gate

> Stage R of QRSPI. Generated 2026-08-13.
> Ticket is hidden from this stage by design.

## Areas investigated

- Artifact-producing stage agents: step structure, skill loads, section skeletons, and section-emission governance in `claude/agents/questioner.md`, `claude/agents/designer.md`, `claude/agents/architect.md`, and `claude/agents/researcher.md`.
- Surface-gate skill: omit mechanic, taxonomy, heading map, and which agents reference it, from `claude/skills/repo-surface/SKILL.md`.
- Lint checks for surfaces and skill sets: `checkSurfaceApplicability` (Check 14), `checkSkillSets` (Check 2b) in `scripts/lint.mjs`, and `scripts/skill-sets.mjs`.
- Read-contract / prose-assertion lint precedent: Check 7 (`checkReadContracts`) as existing model for statically asserting agent prose matches a required string.
- Templates: `openspec-templates/research.template.md` and other `openspec-templates/*.template.md` files, specifically surface-gate comment blocks and section skeletons.
- Migration manifest mechanism: `migrations/*.yaml` files and how `/qrspi:update` (via `claude/skills/qrspi-update/SKILL.md`) consumes them.

## File map

### Artifact-producing stage agents

- `claude/agents/researcher.md` — stage R subagent. Writes `openspec/changes/<id>/research.md`. `tools: Read, Write, Bash, Glob, Grep, Skill`. `model: sonnet`, `effort: medium`.
  - **Load skills line (step 1):** `workflow`, `context-hygiene`, `repo-surface`, plus the project's stack-cheatsheet skill (Glob-discovered via `.claude/skills/*/SKILL.md`).
  - **Step structure (## What to do):** 5 steps: (1) load skills, (2) locate files per area via Glob/Grep, (3) record path/exports/inputs-outputs/dependencies per file, (4) identify implicit contracts, (5) identify gaps.
  - **Output skeleton (inline in ## What to write fenced block):** carries a `<!-- Surface-gated inventory sections: ... -->` comment block mapping surfaces to headings: `data-store -> ## Data model`, `http-api -> ## API surface`, `ui -> ## UI surface`, `auth -> ## Authorization`, `slash-command -> ## Slash-command surface`, `stage-agent -> ## Stage-agent surface`, `skill -> ## Skill surface`, `lint-gate -> ## Lint-gate surface`, `template -> ## Template surface`, `migration-manifest -> ## Migration manifest`. The comment instructs: "emit each section below only when its controlling surface is present for this repo, per the repo-surface skill mapping. Omit the heading entirely when the surface is absent (no heading, no 'Not applicable' stanza)."
  - **Section-emission governance:** the surface-gate rule is stated only as a prose instruction inside the output skeleton comment. There is no programmatic enforcement in the agent file itself; the comment is advisory. The skeleton also carries non-gated spine headings (`## Areas investigated`, `## File map`, `## Notable discrepancies`, `## Implicit contracts and conventions`, `## Open gaps`) which are always emitted.

- `claude/agents/questioner.md` — stage Q subagent. Writes `openspec/changes/<id>/questions.md`. `tools: Read, Write, Edit, Bash, Glob, Grep, Skill`. `model: sonnet`, `effort: medium`.
  - **Load skills line (step 1):** `workflow`, `repo-surface`, `backlog-writer`, plus the project's stack-cheatsheet skill (Glob-discovered). Note: the step-1 line names `repo-surface` explicitly.
  - **Step structure (## What to do):** 9 steps: (1) load skills, (2) confirm/create change folder, (3) read requirements/tech-stack, (4) read backlog, (5) use canonical question shape, (6) generate 10-60 questions applying surface-gate rule, (7) validate each question is code-answerable, (8) interactive PQ pass with AskUserQuestion, (9) backlog edit and deferred-work list.
  - **Output skeleton (inline in ## What to write fenced block):** carries a `<!-- Surface-gated sections: emit each section below only when its controlling surface is present ... -->` comment block that maps surfaces to headings, covering both CRUD surfaces (`data-store`, `http-api`, `ui`, `auth`) and kit surfaces (`slash-command`, `stage-agent`, `skill`, `lint-gate`, `template`, `migration-manifest`). The skeleton contains no literal surface-gated heading lines inside the fenced block -- they are expressed only as comments.
  - **Section-emission governance (step 6):** explicit prose rule: "Apply the surface-gate rule from the `repo-surface` skill: emit a section only when its controlling surface is present in this repo AND it carries content for this change; otherwise omit it entirely (no heading, no 'Not applicable' stanza)." Also specifies always-emitted sections: Testing, Sequencing & scope, Open product questions.

- `claude/agents/designer.md` — stage D subagent. Writes `openspec/changes/<id>/design.md`. `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`. `model: opus`, `effort: high`.
  - **Load skills line (step 1):** `workflow`, `context-hygiene`, `repo-surface`, `backlog-writer`, plus the project's stack-cheatsheet skill (Glob-discovered).
  - **Step structure (## What to do):** 9 steps: (1) load skills, (2) read questions.md + research.md, (3) stop if critical unanswerable questions, (4) produce design doc, (5) read expert definition files for narrow technical questions, (6) honour prior conditional triggers from base specs, (7) verify framework-generates-by-default claims, (8) default delete semantics to guarded-delete precedent, (9) enumerate inline AND transitive manifestations for static checks.
  - **Output skeleton (## Design content fenced block):** carries a `<!-- Surface-gated detail sections: ... -->` comment inside the fenced block, mapping surfaces to headings: `data-store -> ## Data model changes`, `http-api -> ## API surface`, `ui -> ## UI surface`, `auth -> ## Authorization`, `slash-command -> ## Command changes`, `stage-agent -> ## Agent changes`, `skill -> ## Skill changes`, `lint-gate -> ## Lint changes`, `template -> ## Template surface`, `migration-manifest -> ## Migration manifest`. No literal surface-gated heading lines appear inside the fence; they are expressed only as comments. Four canonical headers are always present: `## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`.
  - **Section-emission governance:** no explicit prose surface-gate rule in the step list; the gate is implied by the repo-surface skill load and the comment block in the skeleton.

- `claude/agents/architect.md` — stages S and V subagent. Writes `openspec/changes/<id>/proposal.md`, `specs/`, and `slices.md`. `tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Agent`. `model: sonnet`, `effort: medium`.
  - **Load skills line (S, step 1):** `workflow`, `openspec-workflow`, `vertical-slice`, `repo-surface`, `backlog-writer`, plus stack-cheatsheet.
  - **Step structure (S):** 4 steps: (1) load skills, (2) read design.md only, (3) write proposal.md, (4) write specs per capability, then run `openspec validate`.
  - **Step structure (V):** prerequisite gate (Glob proposal.md + at least one spec), then write slices.md with mandatory `(D<n>)` tags and per-slice Compute annotation.
  - **Output skeletons:** `proposal.md` skeleton has an inline surface-gate comment only for the `data-store` Migrations line in `## Impact`: `<!-- Surface-gated: emit the Migrations line only when the data-store surface is present ... -->`. The `slices.md` skeleton carries no surface-gate comments. The spec-delta skeletons (`## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`) carry no surface-gate comments.
  - **Section-emission governance:** surface-gate logic applies only to the single Migrations line in proposal.md; no other surface-gated sections appear in architect's output skeletons. The architect has a narrower surface-gate footprint than questioner, designer, and researcher.

**Key difference across the four agents:**
- Questioner and researcher name `repo-surface` in the step-1 `Load skills` line and have explicit surface-gate rules in their step prose or skeleton comments.
- Designer names `repo-surface` in step 1 but does NOT have an explicit surface-gate prose rule in its step list; the gate is implied by the skeleton comment and the skill load.
- Architect names `repo-surface` in step 1 but its output skeletons contain almost no surface-gated sections (only the Migrations line in proposal.md). Neither the proposal nor slices skeleton has the full surface-gated comment block.
- Researcher's skeleton carries the gate comment but its step prose does NOT contain an explicit "apply the surface-gate rule" instruction (unlike questioner's step 6). The gate is communicated only via the skeleton comment and the repo-surface skill load.

## Slash-command surface

- `claude/commands/update.md` — `/qrspi:update` command. No `agent:` frontmatter (runs on main loop). Loads `qrspi-update` skill before any other work. Takes optional `<target-version>` argument. Delegates all migration-walk logic to the `qrspi-update` skill. Does not auto-commit; prints a ready-to-run `git commit` command for the human.

## Stage-agent surface

(Covered in the File map section above -- the four artifact-producing agents and the architect's dual-mode S/V routing are the core stage-agent surface.)

## Skill surface

- `claude/skills/repo-surface/SKILL.md` — single authority for which QRSPI artifact sections are emitted for a given repo. Defines the surface taxonomy, section-to-surface mapping, omit mechanic, surface-inference rules (Rule A/B/C), always-emitted sections, and the taxonomy-extension checklist.
  - **Omit mechanic:** "Omit a section" means skip both the heading AND its body. No "Not applicable" stanza, no commented-out heading. The artifact must contain no trace of the omitted section.
  - **Surface taxonomy (11 surfaces):** `data-store`, `http-api`, `ui`, `auth`, `typed-nullable`, `slash-command`, `stage-agent`, `skill`, `lint-gate`, `template`, `migration-manifest`. Vocabulary is closed: a surface exists only to gate a cluster of sections actually emitted by the agents.
  - **Section-to-surface mapping (research.md gates):**
    - `data-store` -> `## Data model`
    - `http-api` -> `## API surface`
    - `ui` -> `## UI surface`
    - `auth` -> `## Authorization`
    - `slash-command` -> `## Slash-command surface`
    - `stage-agent` -> `## Stage-agent surface`
    - `skill` -> `## Skill surface`
    - `lint-gate` -> `## Lint-gate surface`
    - `template` -> `## Template surface`
    - `migration-manifest` -> `## Migration manifest`
  - **Surface-inference rules (priority order):** Rule A (authoritative `## Repo surface` block in stack-cheatsheet — present surface listed, absent = omitted), Rule B (prose inference fallback when no block), Rule C (full menu + warning when no cheatsheet loaded).
  - **Agents referencing this skill:** questioner (step 1 `Load skills`), designer (step 1 `Load skills`), architect (step 1 `Load skills`), researcher (step 1 `Load skills`), planner (step 1 via `skill-sets.mjs`), reviewer (step 1 via `skill-sets.mjs`). All six are registered in `SKILL_SET_EXPECTED` in `scripts/skill-sets.mjs`.
  - **Taxonomy-extension checklist (from extending section):** adding a new surface requires updating the mapping row here, agent skeleton gate comments in questioner/designer/researcher, template gate comments in questions.template.md/design.template.md, Check 11 denylist entry (`SURFACE_GATED_DENYLIST_HEADINGS`), Check 14 heading map (`SURFACE_GATED_HEADINGS`), the stack-cheatsheet `## Repo surface` block, and the researcher skeleton gate comment specifically.

- `claude/skills/qrspi-update/SKILL.md` — drives `/qrspi:update`. Authoritative source for migration-manifest schema contract, SemVer-ordered walk algorithm, target-version resolution, edge-case handling, and full hybrid apply phase. `metadata.audience: orchestrator`.

## Lint-gate surface

- `scripts/lint.mjs` — CI quality gate (Checks 1-23; exits 0 on pass, 1 on failure). Node.js built-ins only (`node:fs`, `node:path`, `node:url`). Runs via `node scripts/lint.mjs` triggered by `.github/workflows/ci.yml` on pull_request to main, push to main, and workflow_dispatch.

- **Check 2b — `checkSkillSets`** (registered at line ~3978 in the main run block):
  - What it asserts: for each of the nine stage agents listed in `SKILL_SET_EXPECTED` (sourced from `scripts/skill-sets.mjs`), harvests the backtick-wrapped skill names from the numbered-step `Load skills` line, filters out names ending in `-stack` (stack cheatsheet is excluded), then asserts the remaining sorted set equals the expected set.
  - Data structures: `SKILL_SET_EXPECTED` map (imported from `scripts/skill-sets.mjs`) keyed by agent stem. `COMMAND_SKILL_SET_EXPECTED` map for non-stage commands.
  - Extraction logic: matches only numbered-step lines containing `Load skill(s)` (not bullet-list items); joins continuation lines; harvests all backtick-wrapped names from the joined segment.
  - Files scanned: `claude/agents/<stem>.md` for each stem in `SKILL_SET_EXPECTED`; `claude/commands/<stem>.md` for each stem in `COMMAND_SKILL_SET_EXPECTED`.
  - Researcher entry in `SKILL_SET_EXPECTED`: `researcher: ['context-hygiene', 'repo-surface', 'workflow']`.

- **Check 14 — `checkSurfaceApplicability`** (registered at line ~4017 in the main run block):
  - What it asserts: scans every `*.md` under `openspec/changes/**` (excluding `/archive/` paths) and flags any heading line that belongs to an absent surface (a surface not in the stack-cheatsheet's `## Repo surface` block).
  - Data structures: `SURFACE_GATED_HEADINGS` map keyed by surface name, each value an array of heading strings. `typed-nullable` is absent from this map (no section headings, only PR checklist items). Map entries:
    - `data-store`: `['## Data model', '## Indexing & query performance', '## Migrations & data', '## Data model changes', '## Migrations']`
    - `http-api`: `['## API', '## API surface']`
    - `ui`: `['## UI', '## Front-end state', '## UI surface']`
    - `auth`: `['## Auth & authorization', '## Authorization']`
    - `slash-command`: `['## Slash-command surface', '## Command changes']`
    - `stage-agent`: `['## Stage-agent surface', '## Agent changes']`
    - `skill`: `['## Skill surface', '## Skill changes']`
    - `lint-gate`: `['## Lint-gate surface', '## Lint changes']`
    - `template`: `['## Template surface']`
    - `migration-manifest`: `['## Migration manifest']`
  - Source of present-surfaces: reads `.claude/skills/qrspi-stack/SKILL.md`, parses `## Repo surface` block via `parseRepoSurfaceBlock()`. Fails loudly (not warn-and-skip) if block is absent or malformed.
  - Scan mechanic: `scanAbsentHeadings()` walks lines outside fenced blocks only (fence-tracking mirrors Check 11). Flags lines where `trimmed === h || trimmed.startsWith(h + ' ') || trimmed.startsWith(h + '\t')` for any absent heading `h`.
  - Inline self-test: fixture `'# Title\n\nSome prose.\n\n## Data model\n\nContent here.\n'` with `absentHeadings: ['## Data model']` must fire; fence-skip test (heading inside ``` must NOT fire) must pass. If either self-test fails, Check 14 pushes an error and returns immediately.
  - Disjoint scope: Check 11 scans INSIDE fenced blocks in agent source files; Check 14 scans OUTSIDE fenced blocks in change artifacts. They never fire on the same line.

- **Check 7 — `checkReadContracts`** (precedent for prose-assertion lint):
  - What it asserts: each of the nine stage agents (keyed in `READ_CONTRACT_EXPECTED`) carries a `> **Read contract** -- Reads: ... Never opens: ...` banner. Extracts the `Reads:` field (text between `—` and `Never opens:`) via `extractReadsField()`, normalizes whitespace via `normalizeWs()`, and asserts byte-equality against the expected value.
  - Data structures: `READ_CONTRACT_EXPECTED` map keyed by agent stem:
    - `researcher`: `'Reads: none (whole changes/<id>/ folder banned).'`
    - `questioner`: `'Reads: backlog + templates (no change-folder artifact).'`
    - `designer`: `'Reads: questions.md, research.md.'`
    - `architect`: `'Reads (S): design.md. Reads (V): proposal.md, specs/.'`
    - `planner`: `'Reads: slices.md.'`
    - `implementer-low/medium/high`: `'Reads: tasks.md.'`
    - `reviewer`: `'Reads: full changes/<id>/ folder (by design).'`
  - Extraction: `extractReadsField(body)` finds the banner line matching `/^>\s*\*\*Read contract\*\*/`, splits on `—` (em-dash), takes everything before `Never opens:`, and normalizes whitespace.
  - This check is the established precedent: it demonstrates that `scripts/lint.mjs` can statically assert that a specific prose field in an agent file matches a required string, by extracting a delimited substring from a known line pattern and comparing it byte-for-byte (after whitespace normalization) to a hardcoded expected value.

- **Check 11 — `checkNoCrudSkeletonHeadings` (SURFACE_GATED_DENYLIST_HEADINGS)**:
  - What it asserts: none of the 22 surface-gated heading lines appear as literal heading lines INSIDE fenced code blocks in six agent files: questioner, designer, architect, planner, researcher, reviewer.
  - Data structures: `SURFACE_GATED_DENYLIST_HEADINGS` (a `Set`) of 22 headings (12 original CRUD headings + 10 kit surfaces added in kit-surface-dogfooding).
  - Scan mechanic: strips frontmatter, enters fenced blocks on `` ` ``{3,} or `~{3,}` open, exits on matching close marker. Flags any line inside a fence matching a denylist entry (exact or prefix match with trailing space/tab).
  - Note: `CRUD_CHECK_AGENTS` includes `researcher` (line 1904) -- the researcher is checked by this assertion.

- `scripts/skill-sets.mjs` — shared data module imported by `scripts/lint.mjs` (Check 2b) and `scripts/context-footprint.mjs`. Exports two maps:
  - `SKILL_SET_EXPECTED`: per-agent required skill sets (nine agents). Researcher entry: `researcher: ['context-hygiene', 'repo-surface', 'workflow']`.
  - `COMMAND_SKILL_SET_EXPECTED`: per-command required skill sets. Currently contains only `idea: ['backlog-writer']`.
  - The `-stack` cheatsheet skill is explicitly excluded from both maps (Glob-discovered per-repo, neither required nor forbidden).

## Template surface

- `openspec-templates/research.template.md` — canonical template for `research.md`. Five always-emitted spine headings: `## Areas investigated`, `## File map`, `## Notable discrepancies`, `## Implicit contracts and conventions`, `## Open gaps`. Does NOT list surface-driven inventory sections (`## Data model`, `## API surface`, etc.) as literal headings; instead the preamble comment states: "Surface-driven inventory sections... are NOT listed here. They are injected dynamically by the researcher agent at write time based on the surfaces declared in the repo's stack-cheatsheet skill." Contains no `<!-- SURFACE-GATED: ... -->` comment blocks; the gate instruction is in the preamble prose only.

- `openspec-templates/questions.template.md` — canonical template for `questions.md`. Contains explicit `<!-- SURFACE-GATED: <surface> surface. Omit this section entirely ... -->` comments for each surface-gated section. For CRUD surfaces (data-store, http-api, ui, auth), the comment immediately precedes the literal `## <heading>` line. For kit surfaces (slash-command, stage-agent, skill, lint-gate, template, migration-manifest), the comments appear at the end of the template WITHOUT literal heading lines below them -- the headings are omitted from the template body, present only as gate comments.

- `openspec-templates/design.template.md` — canonical template for `design.md`. Contains a fenced `markdown` block with a `<!-- Surface-gated QRSPI detail sections (omit when the surface is absent): ... -->` comment mapping surfaces to headings. Unlike the questions template, the design template DOES include literal surface-gated heading lines (`## Data model changes`, `## API surface`, etc.) inside the fenced block, each followed by a `<!-- surface-gated (omit when the surface is absent) -->` inline comment. This differs from the questions template convention (which uses gate comments without literal headings for kit surfaces). This template is not governed by Check 11 (which scans agent source files, not the templates directory).

- `openspec-templates/proposal.template.md` — template for `proposal.md`. Carries a surface-gate comment only for the Migrations line inside `## Impact`: `<!-- Surface-gated: emit the Migrations line only when the data-store surface is present ... -->`. No section-level surface-gate comments.

- `openspec-templates/spec-delta.template.md` — template for delta spec files. No surface-gate comments; contains only the three operation sections (`## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`).

- `openspec-templates/tasks.template.md` — template for `tasks.md`. No surface-gate comments; contains per-slice task structure.

- `openspec-templates/backlog.template.md` — template for `openspec/backlog.md`. Governed by the Check 3 drift-guard (byte-for-byte comparison between the fenced block in `claude/commands/init.md` between `<!-- backlog-template:begin -->` / `<!-- backlog-template:end -->` sentinels and the template file). No surface-gate comments.

## Migration manifest

- `migrations/*.yaml` — 9 files: `0.6.0.yaml` through `0.13.0.yaml`. Schema (enforced by Check 6): required top-level keys `version` (bare SemVer matching filename stem), `summary` (human-readable), `automated` (list; each item has `action: edit-file` only, `path` must start with `openspec/`), `manual` (list). Optional fields per automated step: `skip_if_contains` (non-empty string, enables content-idempotent replay), `anchor_missing: warn-and-skip` (fault-tolerant degradation). Edit patterns (`action: edit-file`): `find`+`replace`, `find_all`+`replace`, `insert_after`+`content`, `insert_before`+`content`, `append`+`content`, `prepend`+`content`, `overwrite`+`content`.
- `0.12.0.yaml` — no automated steps; one manual step instructing consumers to re-apply customizations if they overrode gate-scoped command files.
- `0.13.0.yaml` — one automated step (insert backlog schema legend comment into `openspec/backlog.md`, with `skip_if_contains` and `anchor_missing: warn-and-skip`); four manual steps for section-heading and row body-field additions.
- Consumption: `/qrspi:update` delegates to `claude/skills/qrspi-update/SKILL.md`. Walk algorithm: reads `openspec/.qrspi-version` (marker = version A), resolves target B, selects manifests where `A < v <= B`, sorts numerically ascending, processes each in order (all automated steps first, then manual gates via AskUserQuestion). Marker bumped only after ALL steps of ALL versions complete. Auto-edits confined to `openspec/`-scoped paths. Human stages and commits manually.

## Notable discrepancies

- The `research.template.md` template has NO `<!-- SURFACE-GATED: ... -->` comment blocks for individual sections. The gate is stated only in the preamble prose ("injected dynamically by the researcher agent"). This differs from `questions.template.md`, which has per-section `<!-- SURFACE-GATED: ... -->` comments.
- The researcher agent skeleton comment names all 10 surface-gated sections with their target headings inline (as a mapping table in the comment). The template does not carry those section headings anywhere in the file body.
- The design template (`design.template.md`) includes literal surface-gated heading lines (`## Data model changes`, `## API surface`, etc.) inside its fenced block, making it inconsistent with the questioner template (which omits literal kit-surface headings) and with Check 11 conventions (which forbid surface-gated headings in agent fenced blocks). However, Check 11 scans `claude/agents/` source files only, not `openspec-templates/`.
- The researcher agent's `## What to do` step prose does NOT contain an explicit "apply the surface-gate rule" statement comparable to questioner's step 6. The researcher's step 1 says to load `repo-surface` (which "defines which inventory sections to emit"), but does not re-state the omit rule inline.
- `checkSurfaceApplicability` (Check 14) scans committed change artifacts under `openspec/changes/` for absent-surface headings. It does NOT scan agent source files or templates.
- The `CRUD_CHECK_AGENTS` list in Check 11 includes `researcher` (in addition to questioner, designer, architect, planner, reviewer).

## Implicit contracts and conventions

- Surface-gate comment format in agent skeletons: `<!-- SURFACE-GATED: <surface> surface. Omit ... -->` inside fenced blocks, never a literal surface-gated heading line inside a fence (enforced by Check 11).
- `SURFACE_GATED_DENYLIST_HEADINGS` and `SURFACE_GATED_HEADINGS` are maintained as separate data structures in `scripts/lint.mjs` and must be kept in sync with the `repo-surface` skill taxonomy when a new surface is added.
- The taxonomy-extension checklist in `claude/skills/repo-surface/SKILL.md` names all sites that must change together: the mapping row, agent skeleton gate comments, template gate comments, Check 11 denylist entry, Check 14 heading map, qrspi-stack `## Repo surface` block, and researcher skeleton gate comment. The checklist explicitly calls out the researcher as a named update site.
- `SKILL_SET_EXPECTED` in `scripts/skill-sets.mjs` is the mechanical floor for skill-load correctness; any change to a step-1 `Load skills` line in an agent file must be reflected here to pass Check 2b.
- `READ_CONTRACT_EXPECTED` in `scripts/lint.mjs` is the mechanical floor for banner correctness; the pattern (extract a delimited substring, normalize whitespace, compare to a hardcoded expected string) is the established precedent for static assertion of agent prose.
- CI triggers: `node scripts/lint.mjs` runs on PR-to-main, push-to-main, and workflow_dispatch (`.github/workflows/ci.yml`). All 23 checks run in a single pass; exits 0 on pass, 1 on any violation.
- Migration manifests are consumer-side delivery; they can only edit `openspec/`-scoped paths. Changes to agent/skill/command files in the kit are delivered by the consumer pulling the updated plugin, not by migration manifests.

## Open gaps

- [ ] The researcher agent's step 1 names `repo-surface` in the `Load skills` line. Check 2b asserts this. However, no lint check verifies that the agent actually applies the surface-gate rule when emitting sections -- the rule enforcement is advisory (skeleton comment only). Whether there is a design intent to add such a check is not determinable from the codebase alone.
- [ ] The `research.template.md` preamble says surface-driven sections are "injected dynamically" but does not carry per-section gate comments. Whether this is the intended final state or whether it is expected to gain per-section `<!-- SURFACE-GATED: ... -->` comments (matching the questions template convention) cannot be determined from the codebase alone.
- [ ] The `CRUD_CHECK_AGENTS` list in Check 11 includes `researcher`, but Check 11's description in the file header says "five artifact-producing agent files (questioner, designer, architect, planner, reviewer)" -- six agents are actually checked. Whether this discrepancy in the comment is intentional or a documentation gap is not determined.
