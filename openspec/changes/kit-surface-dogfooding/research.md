# Research — kit-surface-dogfooding

> Stage R of QRSPI. Generated 2026-07-25.
> Ticket is hidden from this stage by design.

## Areas investigated

- **repo-surface skill**: Surface taxonomy, section-to-surface mapping table, inference rules (A/B/C), omit mechanics, and "extend the taxonomy" prose.
- **qrspi-stack `## Repo surface` block**: Authoritative per-repo surface allowlist sentinel in `.claude/skills/qrspi-stack/SKILL.md`.
- **Artifact-producing agent skeletons**: questioner, designer, architect, planner — fenced skeleton blocks, `<!-- Surface-gated sections -->` comment format, Read/Output contract banners, frontmatter.
- **OpenSpec templates**: `questions.template.md`, `design.template.md`, `proposal.template.md`, `tasks.template.md` — canonical headings, surface-gate annotations.
- **`scripts/lint.mjs` checks**: All 13 numbered checks (+ Check 2b), with deep focus on Checks 3, 11, 12, 13 and shared constants.
- **Migration manifests & release flow**: `migrations/*.yaml` schema, release skill, version/CHANGELOG coupling.
- **Kit surface inventory**: Commands, agents, kit skills, project skills, templates, lint gate, migration manifests — file counts and path conventions.

---

## File map

### Area 1 — repo-surface skill

- `claude/skills/repo-surface/SKILL.md` — Single authority for which QRSPI artifact sections are emitted per repo. Every artifact-producing agent loads it. Depends on: the project's stack-cheatsheet skill (to read the `## Repo surface` block). Exports: surface taxonomy (closed vocabulary of 5 surfaces), section-to-surface mapping table, omit mechanic, surface-inference rules (A/B/C), always-emitted section list.

### Area 2 — qrspi-stack `## Repo surface` block

- `.claude/skills/qrspi-stack/SKILL.md` — Project-scoped stack cheatsheet for the qrspi repo itself. Not shipped in the plugin. Contains `## Repo surface` as its last section (after `## Gotchas / house rules`). Declares this repo has no present surfaces.

### Area 3 — artifact-producing agent skeletons

- `claude/agents/questioner.md` — Stage Q. Writes `questions.md`. Frontmatter: `model: sonnet`, `effort: medium`. Read contract: `Reads: backlog + templates (no change-folder artifact)`. Output contract present. Loads skills: `workflow`, `repo-surface` (plus optional stack cheatsheet). Contains a fenced skeleton for `questions.md` with `<!-- Surface-gated sections -->` comment. Does NOT load `context-hygiene`.
- `claude/agents/designer.md` — Stage D. Writes `design.md`. Frontmatter: `model: opus`, `effort: high`. Read contract: `Reads: questions.md, research.md`. Output contract present. Loads skills: `workflow`, `context-hygiene`, `repo-surface` (plus optional stack cheatsheet). Contains a fenced skeleton for `design.md` with `<!-- Surface-gated detail sections -->` comment. Tools include `Agent`.
- `claude/agents/architect.md` — Stages S and V. Writes `proposal.md`, `specs/*.md`, and `slices.md`. Frontmatter: `model: sonnet`, `effort: medium`. Read contract (two-mode): `Reads (S): design.md. Reads (V): proposal.md, specs/`. Output contract present. Loads skills: `workflow`, `openspec-workflow`, `vertical-slice`, `repo-surface` (plus optional stack cheatsheet). Contains fenced skeletons for `proposal.md`, new-capability spec, delta spec, and `slices.md`. The `proposal.md` skeleton carries an `<!-- Surface-gated: emit the Migrations line only when the data-store surface is present -->` comment. The `slices.md` skeleton uses a dash-bullet `**Compute:** model=<alias> effort=<low|medium|high>` annotation form. Tools include `Agent`.
- `claude/agents/planner.md` — Stage P. Writes `tasks.md`. Frontmatter: `model: sonnet`, `effort: medium`. Read contract: `Reads: slices.md`. Output contract present. Loads skills: `workflow`, `vertical-slice`, `repo-surface` (plus optional stack cheatsheet). Contains a fenced skeleton for `tasks.md` with `<!-- Surface-gated task lines -->` comment. Does NOT load `context-hygiene` or `openspec-workflow`.

### Area 4 — OpenSpec templates

- `openspec-templates/questions.template.md` — Canonical template for `questions.md`. No frontmatter. Sections: `## Data model` (data-store gated), `## Indexing & query performance` (data-store gated), `## API` (http-api gated), `## UI` (ui gated), `## Front-end state` (ui gated), `## Auth & authorization` (auth gated), `## Migrations & data` (data-store gated), `## Testing` (always), `## Sequencing & scope` (always), `## Open product questions (for the human)` (always). Surface-gate annotations are inline `<!-- SURFACE-GATED: <surface> surface. Omit this section entirely … -->` HTML comments immediately preceding each gated section heading. The PQ convention (`**PQ1 — <topic>:**`) is illustrated in the product-questions block.
- `openspec-templates/design.template.md` — Canonical skeleton for `design.md`. No frontmatter. Required canonical headers (cannot be renamed/dropped): `## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`. Surface-gated extras inside the fenced body (between `## Decisions` and `## Risks / Trade-offs`): `## Data model changes` (data-store), `## API surface` (http-api), `## UI surface` (ui), `## Authorization` (auth). Also includes `## Vertical slices (preview)` and `## Open questions for the human` (always). Format rules state the four canonical headers must be spelled exactly.
- `openspec-templates/proposal.template.md` — Canonical skeleton for `proposal.md`. No frontmatter. Required canonical headers (exact spelling, in order): `## Why`, `## What Changes`, `## Capabilities` (with required sub-headers `### New Capabilities` and `### Modified Capabilities`), `## Impact`. Surface-gate: `Migrations:` line under `## Impact` is emitted only when `data-store` is present. Optional QRSPI extras after `## Impact`: `## Out of scope`, `## Vertical slices (preview)`. Format rules enforce capital `C` in `## What Changes` and kebab-case capability ids.
- `openspec-templates/tasks.template.md` — Canonical skeleton for `tasks.md`. No frontmatter. Required shape: numbered groups `## N. <slice name>` with `- [ ] N.M` checkbox items. No fixed canonical section headings (dynamic per slice — Check 3 skips it). Per-group `**Compute:** model=<alias> effort=<low|medium|high>` annotation (bare bold form). Surface-gated task-line categories inline: `data-store` → entity+config task + migration-generation task; `http-api` → service/endpoint task + validator task; `ui` → page/component wiring task. Trailing `(D<n>)` design-decision back-reference convention. `(human)` prefix convention for human-only tasks.
- `openspec-templates/spec-delta.template.md` — Canonical for `specs/<capability>/spec.md`. Two variants (new capability, delta). Three canonical operation headers: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`. Enforced by `openspec validate <id> --strict`. MUST/SHALL first-line rule. WHEN/THEN scenario blocks required on ADDED/MODIFIED.

### Area 5 — `scripts/lint.mjs`

- `scripts/lint.mjs` — CI quality gate. Uses Node.js built-ins only (`node:fs`, `node:path`, `node:url`). Exits 0 on pass, 1 on failure. Collects all errors before exit. Imports one external module: `scripts/skill-sets.mjs` (`SKILL_SET_EXPECTED`).
- `scripts/skill-sets.mjs` — Shared single source of truth for the per-stage skill-set registry. No imports. Exports `SKILL_SET_EXPECTED` map (7 stage agents → array of required kit skill names).
- `scripts/context-footprint.mjs` — Report-only script (always exits 0). Imports `SKILL_SET_EXPECTED` from `scripts/skill-sets.mjs`. Not a lint gate; used for token/size reporting.

### Area 6 — Migration manifests & release flow

- `migrations/0.6.0.yaml`, `migrations/0.7.0.yaml`, `migrations/0.8.0.yaml`, `migrations/0.9.0.yaml` — 4 manifests present. All have `automated: []` (no automated edit-file steps in any current manifest). Manual steps only.
- `.claude/skills/qrspi-release/SKILL.md` — Release procedure skill (not shipped in plugin). Documents tag-based release flow.

### Area 7 — Kit surface inventory

- `claude/commands/` — 15 `.md` files: `archive.md`, `design.md`, `followup.md`, `implement.md`, `init.md`, `plan.md`, `pr.md`, `questions.md`, `research.md`, `retro.md`, `slices.md`, `stack.md`, `status.md`, `structure.md`, `update.md`.
- `claude/agents/` — 7 `.md` files: `questioner.md`, `researcher.md`, `designer.md`, `architect.md`, `planner.md`, `implementer.md`, `reviewer.md`.
- `claude/skills/` — 11 skill directories (each with `SKILL.md`): `context-hygiene`, `openspec-archive-change`, `openspec-sync-specs`, `openspec-workflow`, `postpr-fix`, `qrspi-update`, `qrspi-version-check`, `repo-surface`, `retrospective`, `vertical-slice`, `workflow`.
- `.claude/skills/` — 3 project-scoped skill directories: `qrspi-dogfood`, `qrspi-release`, `qrspi-stack`.
- `openspec-templates/` — 5 `.template.md` files: `design.template.md`, `proposal.template.md`, `questions.template.md`, `spec-delta.template.md`, `tasks.template.md`.
- `scripts/lint.mjs` — Single lint gate file. `scripts/skill-sets.mjs` — shared data module. `scripts/context-footprint.mjs` — report-only module.
- `migrations/` — 4 `.yaml` files: `0.6.0.yaml`, `0.7.0.yaml`, `0.8.0.yaml`, `0.9.0.yaml`.
- `.claude-plugin/plugin.json` — Plugin manifest. Current version: `0.9.0`. Declares commands path (`./claude/commands`), 7 agent paths, and skills path (`./claude/skills`).
- `openspec/.qrspi-version` — Contains `0.9.0` (bare SemVer marker, no `v` prefix).

---

## Public API surface

This kit has no HTTP API. Its public surface is the set of slash commands registered via `plugin.json`:

- `/qrspi:archive` — archive a completed change (calls openspec-archive-change skill)
- `/qrspi:design` — stage D, delegates to `designer` agent
- `/qrspi:followup` — post-PR fix loop with P1/P2/P3 triage gate
- `/qrspi:implement` — stage I, delegates to `implementer` agent
- `/qrspi:init` — initialize a new OpenSpec workspace
- `/qrspi:plan` — stage P, delegates to `planner` agent
- `/qrspi:pr` — stage PR, delegates to `reviewer` agent; includes tasks pass + follow-ups pass reconciliation gate
- `/qrspi:questions` — stage Q, delegates to `questioner` agent
- `/qrspi:research` — stage R, delegates to `researcher` agent
- `/qrspi:retro` — retrospective command
- `/qrspi:slices` — stage V, delegates to `architect` agent (slices mode)
- `/qrspi:stack` — generates stack cheatsheet
- `/qrspi:status` — prints QRSPI stage map
- `/qrspi:structure` — stage S, delegates to `architect` agent (structure mode)
- `/qrspi:update` — installs migration manifests for consumer repos

Project-scoped dev-tooling commands (not in plugin, under `.claude/commands/`): `/qrspi-dogfood`, `/qrspi-release`, `/qrspi-readme-audit`, and others.

---

## Data model

The kit's "data model" is its file taxonomy and convention map:

**Surface taxonomy (5 closed surfaces, defined in `repo-surface` SKILL.md):**
- `data-store` — database / ORM / SQL / persistent store
- `http-api` — HTTP API (REST/GraphQL/gRPC)
- `ui` — user interface (web/native/TUI)
- `auth` — authentication / authorization / sessions / identity
- `typed-nullable` — typed language with nullable-suppression operators

**Section-to-surface mapping (canonical in `repo-surface` SKILL.md):**

| Surface | Gated sections |
|---------|---------------|
| `data-store` | `## Data model` (Q), `## Indexing & query performance` (Q), `## Migrations & data` (Q), `## Data model changes` (D), Migration-generation task (P), `## Migrations` (PR), "No raw SQL" checklist item (PR) |
| `http-api` | `## API` (Q), `## API surface` (D), "endpoints use authorization policies" checklist item (PR) |
| `ui` | `## UI` (Q), `## Front-end state` (Q), `## UI surface` (D) |
| `auth` | `## Auth & authorization` (Q), `## Authorization` (D), "auth-policy applied" checklist item (PR) |
| `typed-nullable` | "No nullable suppression" checklist item (PR) |

Always-emitted sections (surface-independent, per `repo-surface` SKILL.md):
- In `questions.md`: `## Testing`, `## Sequencing & scope`, `## Open product questions (for the human)`
- In all OpenSpec artifacts: `## Context`, `## Why`, `## What Changes`, `## Capabilities`, `## Impact`, `## Decisions`, `## Risks / Trade-offs`, `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`

**Migration manifest schema (`migrations/*.yaml`):**
- Required top-level keys: `version` (must match filename stem), `summary` (string or block scalar), `automated` (list or `[]`), `manual` (list or `[]`)
- `automated[].action` must be `edit-file` (only allowed value)
- `automated[].path` must start with `openspec/`
- Floor version: `0.6.0` (hard-coded in lint; must always have a manifest)
- `openspec/.qrspi-version` marker: bare SemVer `X.Y.Z`, no `v` prefix

---

## Implicit contracts and conventions

**Surface-gate omit mechanic.** "Omit" means the heading AND its body are absent — no "Not applicable" placeholder, no commented-out heading. This is enforced by Check 11 (fenced skeleton headings in agent files) and stated in `repo-surface` SKILL.md's omit mechanic section.

**Taxonomy is closed by construction.** A surface exists only to gate a cluster of sections the agents actually emit. Adding a surface requires simultaneously adding the section it gates (in both the mapping and agent skeletons/templates). This is documented as "extend the taxonomy" prose in `repo-surface` SKILL.md lines 22--25.

**Surface inference priority order:**
1. Rule A (authoritative): `## Repo surface` block in the stack cheatsheet is a complete allowlist; unlisted = absent; stray prose does not promote a surface.
2. Rule B (fallback): prose-only cheatsheet → LLM inference per surface independently.
3. Rule C (no cheatsheet): emit full section menu + visible warning at top of artifact.

**This repo's own surface block (Rule A sentinel):** `.claude/skills/qrspi-stack/SKILL.md` ends with `## Repo surface` → `_No present surfaces._`. All surface-gated artifact sections are omitted when this kit processes itself.

**Agent skill-set registry (`scripts/skill-sets.mjs`):**
- `researcher`: `['context-hygiene', 'workflow']`
- `questioner`: `['repo-surface', 'workflow']`
- `designer`: `['context-hygiene', 'repo-surface', 'workflow']`
- `architect`: `['openspec-workflow', 'repo-surface', 'vertical-slice', 'workflow']`
- `planner`: `['repo-surface', 'vertical-slice', 'workflow']`
- `implementer`: `['context-hygiene', 'vertical-slice', 'workflow']`
- `reviewer`: `['openspec-workflow', 'repo-surface', 'workflow']`
- Stack cheatsheet name (ends with `-stack`) is explicitly filtered out of Check 2b — it is neither required nor forbidden.

**TEMPLATE_CANONICAL_HEADINGS (Check 3):**
- `questions.template.md` → questioner: `['## Testing', '## Sequencing & scope', '## Open product questions (for the human)']`
- `design.template.md` → designer: `['## Context', '## Goals / Non-Goals', '## Decisions', '## Risks / Trade-offs']`
- `proposal.template.md` → architect: `['## Why', '## What Changes', '## Capabilities', '## Impact']`
- `tasks.template.md` → planner: `[]` (dynamic headings, check skipped)
- `spec-delta.template.md` → architect: `['## ADDED Requirements', '## MODIFIED Requirements', '## REMOVED Requirements']`

**CRUD_DENYLIST_HEADINGS (Check 11):** 12 surface-gated headings banned from fenced blocks in questioner, designer, architect, planner, reviewer: `## Data model`, `## Indexing & query performance`, `## API`, `## UI`, `## Front-end state`, `## Auth & authorization`, `## Migrations & data`, `## Data model changes`, `## API surface`, `## UI surface`, `## Authorization`, `## Migrations`. Matching is line-anchored: trimmed line must equal the denylist entry or start with it followed by whitespace.

**Disjoint-set invariant (Checks 3 and 11):** Check 3 requires surface-independent headings to be present (anywhere in body). Check 11 requires CRUD headings to be absent (inside fenced blocks). No heading is simultaneously required-present (Check 3) and forbidden-in-fences (Check 11). Different heading sets AND different scopes.

**`**Compute:**` annotation grammar (Checks 2 and 13):**
- Valid `model=` values: `['sonnet', 'opus']` (`COMPUTE_MODELS`)
- Valid `effort=` values: `['low', 'medium', 'high']` (`COMPUTE_EFFORTS`; `xhigh`/`max` rejected)
- `model=` is required on every annotation line; `effort=` is optional but validated if present
- Dash-bullet form in `slices.md`: `- **Compute:** model=<alias> effort=<level> — <rationale>`
- Bare-bold form in `tasks.md`: `**Compute:** model=<alias> effort=<level> — <rationale>`
- Check 13 scopes strictly to `openspec/changes/**/slices.md` and `**/tasks.md`; does NOT scan skills or templates

**Frontmatter conventions (Check 2):**
- Agents: require `name:`, `description:`, `model:` (alias only, not pinned id), `effort:` (one of low/medium/high)
- Commands: require `description:`; `agent:` must resolve to `claude/agents/<stem>.md` (or be a builtin)
- Skills (`claude/skills/**`): require `name:` and `description:`
- Pinned model id pattern: `/\d{8}|claude-\d/i` — rejected if matched

**Read contract banner format (Check 7):** `> **Read contract** — Reads: <set>. Never opens: <deny>; no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).` Parsed by extracting text between em-dash and `Never opens:`. Two-mode form for architect: `Reads (S): design.md. Reads (V): proposal.md, specs/.`

**Output contract banner (Check 12):** Each of the 7 stage agents must have a line matching `/^>\s*\*\*Output contract\*\*/`. Presence-only check.

**Version-check embed (Check 9):** 9 stage commands (`status`, `questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`) must each contain `Load skill \`qrspi-version-check\` and follow its instructions exactly.`

**Release flow:**
- Releases are tag-based (`vX.Y.Z`), not commit-based
- `plugin.json` version is bumped only when cutting a release, not in feature PRs
- Every `## [X.Y.Z]` CHANGELOG section at or above the `0.6.0` floor must have a `migrations/<X.Y.Z>.yaml` (Check 6 presence sub-check)
- `release.yml` asserts tag == `plugin.json` version == matching CHANGELOG section before publishing
- Floor manifest (`0.6.0.yaml`) is a hard-coded constant in lint; deleting it would make the check fail-open — lint guards against this

**Skill discovery convention:** Kit skills auto-register from `claude/skills/<name>/` (no `plugin.json` edit needed). Project-scoped skills live under `.claude/skills/<name>/`. Check 2 scans only `claude/skills/` (kit skills), not `.claude/skills/`.

**`openspec/specs/` base specs inventory:** 16 capability directories currently exist under `openspec/specs/`: `archive-workflow`, `ci-quality-gates`, `compute-selection`, `followup-triage`, `kit-context-budget`, `kit-governance`, `kit-versioning`, `qrspi-command-surface`, `qrspi-pr-reconciliation`, `qrspi-read-contracts`, `qrspi-run-mode`, `qrspi-stack`, `reference-example`, `repo-surface`, `session-version-check`, and one more not enumerated.

---

## Open gaps

- [ ] The `<!-- Surface-gated sections -->` comment format differs between agent skeletons and templates: templates use `<!-- SURFACE-GATED: <surface> surface. Omit this section entirely (no heading, no "Not applicable") when the repo has no <surface> surface. -->` inline before each section, while agent skeletons use a single block comment at the top of the fenced body listing all gated surfaces at once. Whether the two formats are treated as equivalent by any check is not verified — Check 11 only checks headings, not comment format.
- [ ] The `spec-delta.template.md` is referenced in `TEMPLATE_CANONICAL_HEADINGS` (Check 3) as mapping to `architect`, but the template file itself has no YAML frontmatter and no `## Repo surface` gating prose. Verify whether any check validates the template's own structure vs. what architect embeds inline.
- [ ] The `reviewer.md` agent was not read. Check 11 lists it as a CRUD_CHECK_AGENT, and Check 7/12 include it in scope. Its skeleton content (if any surface-gated sections appear) is unverified.
- [ ] The `implementer.md` agent was not read. It is scoped to Checks 7, 12, and skill-sets (but not Check 11, which only covers the 5 artifact-producing agents). Its `**Compute:** model=` consumption logic and `(human)` task handling are unverified from source.
- [ ] The `researcher.md` agent was not read. It does not produce CRUD-heading artifacts (Check 11 excludes it), but its Read contract banner and skill-set are governed by Checks 7 and 2b. Verify it loads exactly `['context-hygiene', 'workflow']`.
- [ ] No `automated` steps exist in any current migration manifest. Whether the `edit-file` action schema (path must start with `openspec/`) has ever been exercised in production is unverifiable from the files read.
- [ ] The `openspec/specs/` directory was listed (16 dirs) but individual `spec.md` files were not read. Whether any existing base spec covers the `repo-surface` capability itself (which has a directory) is unverified.
- [ ] The `.claude/commands/` directory (dev-tooling project-scoped commands) was not inventoried. These are not covered by Check 4 (which only scans `claude/commands/`).
