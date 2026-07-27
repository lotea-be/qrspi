# Research -- researcher-surface-generic

> Stage R of QRSPI. Generated 2026-07-25.
> Ticket is hidden from this stage by design.

## Areas investigated

- QRSPI stage-agent definitions: YAML frontmatter, Read/Output contract banners, skill-loading steps, and fenced artifact skeletons for all seven stage agents under `claude/agents/`.
- Surface-gating skill: full surface taxonomy, section-to-surface mapping, omit/warn rules, "Extending the taxonomy" checklist, and which agent preambles load this skill.
- Stack-cheatsheet `## Repo surface` block: structure of the block in `.claude/skills/qrspi-stack/SKILL.md` and which surfaces this repo declares.
- Stage-command orchestration: how `claude/commands/research.md` derives its areas-of-interest brief and spawns the researcher subagent; shared choreography references.
- Lint checks: Check 3 (heading alignment), Check 7 (read-contract banners), Check 11 (no surface-gated headings in fenced blocks), Check 14 (surface applicability of artifact headings) -- function names, constants, data sources, line numbers.
- Artifact templates: every `*.template.md` in `openspec-templates/`, their canonical heading sets, and whether `research.template.md` exists.

---

## File map

### QRSPI stage-agent definitions

- `claude/agents/researcher.md` -- read-only investigator that maps codebase areas and writes `research.md`.
- `claude/agents/questioner.md` -- turns a feature request into technical questions; writes `questions.md`.
- `claude/agents/designer.md` -- produces `design.md`; the brain-surgery stage.
- `claude/agents/architect.md` -- runs both Structure (S) and Slices (V); writes `proposal.md`, `specs/`, and `slices.md`.
- `claude/agents/planner.md` -- translates `slices.md` into a checkbox `tasks.md`.
- `claude/agents/implementer.md` -- executes one slice at a time; ticks `tasks.md`; also handles post-PR fix mode.
- `claude/agents/reviewer.md` -- drafts PR description and runs final checklist; the only stage that reads the full change folder.

#### Per-agent frontmatter

| Agent | `name` | `tools` | `model` | `effort` |
|---|---|---|---|---|
| researcher | `researcher` | Read, Write, Bash, Glob, Grep, Skill | `sonnet` | `medium` |
| questioner | `questioner` | Read, Write, Edit, Bash, Glob, Grep, Skill | `sonnet` | `medium` |
| designer | `designer` | Read, Write, Edit, Bash, Glob, Grep, Skill, Agent | `opus` | `high` |
| architect | `architect` | Read, Write, Edit, Bash, Glob, Grep, Skill, Agent | `sonnet` | `medium` |
| planner | `planner` | Read, Write, Bash, Glob, Grep, Skill | `sonnet` | `medium` |
| implementer | `implementer` | Read, Write, Edit, Bash, Glob, Grep, Skill, Agent | `opus` | `high` |
| reviewer | `reviewer` | Read, Bash, Glob, Grep, Skill | `sonnet` | `medium` |

#### Per-agent Read contract banners (exact `Reads:` text, as enforced by Check 7)

- `researcher`: `Reads: none (whole changes/<id>/ folder banned).`
- `questioner`: `Reads: backlog + templates (no change-folder artifact).`
- `designer`: `Reads: questions.md, research.md.`
- `architect`: `Reads (S): design.md. Reads (V): proposal.md, specs/.`
- `planner`: `Reads: slices.md.`
- `implementer`: `Reads: tasks.md.`
- `reviewer`: `Reads: full changes/<id>/ folder (by design).`

All seven agents also carry a `> **Output contract**` banner (enforced by Check 12).

#### Per-agent skill-loading (step 1 of each agent's "What to do"; the registry is `scripts/skill-sets.mjs`)

- `researcher`: loads `workflow`, `context-hygiene`, plus the project's stack-cheatsheet skill (Glob-discovered, not in registry).
- `questioner`: loads `workflow`, `repo-surface`, plus the project's stack-cheatsheet skill.
- `designer`: loads `workflow`, `context-hygiene`, `repo-surface`, plus the project's stack-cheatsheet skill.
- `architect`: loads `workflow`, `openspec-workflow`, `vertical-slice`, `repo-surface`, plus the project's stack-cheatsheet skill.
- `planner`: loads `workflow`, `vertical-slice`, `repo-surface`, plus the project's stack-cheatsheet skill.
- `implementer`: loads `workflow`, `vertical-slice`, `context-hygiene`, plus the project's stack-cheatsheet skill.
- `reviewer`: loads `workflow`, `openspec-workflow`, `repo-surface`, plus the project's stack-cheatsheet skill.

The registry in `scripts/skill-sets.mjs` (`SKILL_SET_EXPECTED`) encodes the expected sets (excluding the `-stack` suffix cheatsheet name). Check 2b asserts these sets match.

#### researcher.md -- fenced `research.md` skeleton (headings in order)

Inside the fenced block under "What to write" (lines 73-101 of `researcher.md`):

1. `# Research -- <change-id>`
2. `> Stage R ...` (blockquote preamble -- not a heading)
3. `## Areas investigated`
4. `## File map`
5. (sub-heading `### <area>` -- dynamic)
6. `## Public API surface`
7. `## Data model`
8. `## Implicit contracts and conventions`
9. `## Open gaps`

These are the only headings present in the researcher's inline skeleton. Note that `## Data model` and `## Public API surface` appear in the skeleton as fixed heading lines -- they are not gated by a surface-gate comment inside the fenced block.

#### researcher.md -- `## What to do` step 1 (skill loading instruction)

> "1. Load skills `workflow`, `context-hygiene`, plus the project's stack-cheatsheet skill if it defines one."

The stack-cheatsheet is found via Glob (pattern `.claude/skills/*/SKILL.md`). `repo-surface` is NOT in the researcher's step-1 load (unlike questioner, designer, planner, reviewer, architect). This is confirmed by `skill-sets.mjs`: researcher's registry entry is `['context-hygiene', 'workflow']`.

#### researcher.md -- `tools:` line

```
tools: Read, Write, Bash, Glob, Grep, Skill
```

`Agent` is NOT listed in the researcher's `tools:` (unlike designer, architect, implementer).

---

### Surface-gating skill

- `claude/skills/repo-surface/SKILL.md` -- single authority for which QRSPI artifact sections are emitted for a given repo.

#### Full surface taxonomy (11 named surfaces, closed vocabulary)

| Surface | Meaning |
|---|---|
| `data-store` | Database, ORM, SQL layer, or any persistent data store |
| `http-api` | HTTP API (REST, GraphQL, gRPC, etc.) exposed or consumed |
| `ui` | User interface (web, native, TUI, or similar) |
| `auth` | Authentication, authorization, sessions, or identity management |
| `typed-nullable` | Typed language where nullable-suppression operators can mask null-safety violations |
| `slash-command` | Claude Code slash commands (`claude/commands/*.md`) |
| `stage-agent` | QRSPI stage subagents (`claude/agents/*.md`) |
| `skill` | Kit skills (`claude/skills/*/`) or project-scoped skills (`.claude/skills/*/`) |
| `lint-gate` | Lint/CI gate script that enforces structural invariants |
| `template` | OpenSpec artifact templates (`openspec-templates/*.template.md`) |
| `migration-manifest` | Per-version migration manifests (`migrations/*.yaml`) |

The vocabulary is described as "closed by construction": a surface exists only to gate a cluster of sections the agents actually emit.

#### Section-to-surface mapping (expressed as per-surface subsections, each listing gated sections by artifact)

Each subsection is a `### <surface> gates` block that enumerates gated section names and the artifact type (questions.md / design.md / tasks.md / PR checklists). Surfaces and their gated sections:

- `data-store`: `## Data model`, `## Indexing & query performance`, `## Migrations & data` (questions.md); `## Data model changes` (design.md); migration-generation task (tasks.md); `## Migrations` (PR); "No raw SQL" checklist item (PR).
- `http-api`: `## API` (questions.md); `## API surface` (design.md); "endpoints use authorization policies" checklist item (PR).
- `ui`: `## UI`, `## Front-end state` (questions.md); `## UI surface` (design.md).
- `auth`: `## Auth & authorization` (questions.md); `## Authorization` (design.md); "auth-policy applied" checklist item (PR).
- `typed-nullable`: "No nullable suppression" checklist item (PR). No section heading.
- `slash-command`: `## Slash-command surface` (questions.md); `## Command changes` (design.md).
- `stage-agent`: `## Stage-agent surface` (questions.md); `## Agent changes` (design.md).
- `skill`: `## Skill surface` (questions.md); `## Skill changes` (design.md).
- `lint-gate`: `## Lint-gate surface` (questions.md); `## Lint changes` (design.md).
- `template`: `## Template surface` (questions.md and design.md).
- `migration-manifest`: `## Migration manifest` (questions.md and design.md).

#### Omit mechanic

"Omit" means: skip both the heading and its body. No "Not applicable" stanza; no commented-out heading; no empty block. The heading simply does not appear.

#### Surface-inference priority

1. **Rule A (authoritative)**: If the stack cheatsheet has a `## Repo surface` block, it is the authoritative allowlist. A listed surface is present; an unlisted surface is absent. Prose mentions elsewhere do not count.
2. **Rule B (fallback)**: If the cheatsheet is prose-only (no `## Repo surface` block), infer each surface by LLM judgment from prose.
3. **Rule C (no cheatsheet)**: Emit the full section menu plus a visible warning block.

#### "Extending the taxonomy" checklist (6 sites that must all change together)

1. **This mapping row** -- add `### <surface> gates` subsection and a new row in the taxonomy table.
2. **Agent skeleton gate comment** -- add a `<!-- SURFACE-GATED: <surface> surface. -->` conditional comment (NOT a literal heading line) in the `<!-- Surface-gated sections -->` block of `claude/agents/questioner.md` and `claude/agents/designer.md`.
3. **Template gate comment** -- add the matching gate comment to `openspec-templates/questions.template.md` and `openspec-templates/design.template.md`.
4. **Check 11 denylist entry** -- add each new gated heading string to `SURFACE_GATED_DENYLIST_HEADINGS` in `scripts/lint.mjs`.
5. **Check 14 heading map** -- add the `<heading> -> <surface>` mapping entry to `SURFACE_GATED_HEADINGS` in `scripts/lint.mjs`.
6. **`qrspi-stack` `## Repo surface` block** -- if the new surface applies to this repo, add it to `.claude/skills/qrspi-stack/SKILL.md`.

**Self-collision caveat for `template` surface:** `## Template surface` is both a valid section heading AND a Check 11 denylist entry. The rule is: express new `template`-surface skeleton content only as a gate comment inside fenced blocks, never as a bare `## Template surface` heading line.

#### Which agents load `repo-surface` today

questioner (step 1), designer (step 1), architect (step 1 -- Structure), planner (step 1), reviewer (step 1).

`researcher` does NOT load `repo-surface`. `implementer` does NOT load `repo-surface`.

---

### Stack-cheatsheet `## Repo surface` block

- `.claude/skills/qrspi-stack/SKILL.md` -- project-scoped stack cheatsheet for this repo.

The `## Repo surface` block appears at the bottom of the file as a bullet list under that heading. The block has no prose -- just a flat list of surface names, one per bullet:

```
## Repo surface

- slash-command
- stage-agent
- skill
- lint-gate
- template
- migration-manifest
```

Six surfaces are declared present. Five surfaces are implicitly absent (omitted from the list): `data-store`, `http-api`, `ui`, `auth`, `typed-nullable`.

Check 14's `parseRepoSurfaceBlock` function reads this exact block from `.claude/skills/qrspi-stack/SKILL.md` (hardcoded path in lint.mjs line 1891).

---

### Stage-command orchestration

- `claude/commands/research.md` -- the R-stage orchestrator command. Not an agent-backed command (no `agent:` in frontmatter); runs in the main loop.

#### How the R-stage command derives its areas-of-interest brief

The command body (after the version-check and run-mode steps) instructs the orchestrator:

1. Parse `$ARGUMENTS`: extract the change id (first token) and any explicit areas of interest.
2. If only a change id was provided (no explicit areas), read `openspec/changes/<id>/questions.md` and **derive areas from the question headings** -- not from speculative content in the questions themselves.
3. For each area, form a heading PLUS a one-line factual scope statement naming existing files/conventions.
4. The scope statement may name existing precedents but must NOT state what the change should do.

The orchestrator explicitly must NOT pass the feature description or any opinion about what the change should do to the researcher.

#### How the command spawns the researcher subagent

```
Spawn the `researcher` subagent via the Agent tool
(`subagent_type: qrspi:researcher`, `model: sonnet`)
with only two inputs: the change id and the areas of interest.
```

The researcher returns the file path plus a 5-bullet summary. The orchestrator does not inline the researcher's full conversation -- only the returned summary is used.

#### Shared choreography references

The command references the `workflow` skill's "Stage choreography" section for:
- **Commit step**: `docs(<id>): add research.md (QRSPI stage R)` with `git add openspec/changes/<id>/research.md`.
- **Next-stage handoff**: `/qrspi:design <id>` -- invoked as its own slash command in the main loop (NOT spawned as a subagent).

The command also loads `workflow` and `openspec-workflow` skills (step 4 of the questions.md command; the research.md command references the workflow skill's choreography directly).

---

### Lint checks

All checks are in `scripts/lint.mjs` (single file, 2031 lines, Node.js built-ins only).

#### Check 3 (`checkHeadingAlignment`, lines 562-598)

- **What it asserts**: canonical section headings declared in `TEMPLATE_CANONICAL_HEADINGS` (lines 508-560) must appear anywhere in the corresponding agent's body.
- **Data source**: `TEMPLATE_CANONICAL_HEADINGS` object mapping template filename -> `{ agent, headings[] }`.
- **Template -> agent -> required headings**:
  - `questions.template.md` -> `questioner` -> `['## Testing', '## Sequencing & scope', '## Open product questions (for the human)']`
  - `design.template.md` -> `designer` -> `['## Context', '## Goals / Non-Goals', '## Decisions', '## Risks / Trade-offs']`
  - `proposal.template.md` -> `architect` -> `['## Why', '## What Changes', '## Capabilities', '## Impact']`
  - `tasks.template.md` -> `planner` -> `[]` (dynamic format; SKIP)
  - `spec-delta.template.md` -> `architect` -> `['## ADDED Requirements', '## MODIFIED Requirements', '## REMOVED Requirements']`
- **Disjoint-set invariant**: Check 3 covers surface-INDEPENDENT headings (present check); Check 11 covers surface-GATED headings (absence-from-fences check). No heading is simultaneously required-present (Check 3) and forbidden-in-fences (Check 11).
- **Note**: `researcher.md` has no corresponding template (no `research.template.md` exists). Check 3 does not cover the researcher agent.

#### Check 7 (`checkReadContracts`, lines 1176-1216)

- **What it asserts**: the `Reads:` field in each agent's `> **Read contract**` banner must exactly equal the expected value from `READ_CONTRACT_EXPECTED` (lines 1138-1146).
- **Scope**: strictly the seven stage agents named as keys in `READ_CONTRACT_EXPECTED`.
- **Researcher's expected string** (line 1139): `'Reads: none (whole changes/<id>/ folder banned).'`
- **Extraction**: `extractReadsField` parses the banner by splitting on the em-dash (`—`) character, then taking the substring before `Never opens:`. Whitespace is normalized before comparison.
- **Special cases**: architect uses two-mode syntax (`Reads (S):` / `Reads (V):`); reviewer uses "full ... folder (by design)" string.

#### Check 11 (`checkNoCrudSkeletonHeadings`, lines 1456-1538)

- **What it asserts**: none of the 22 surface-gated heading strings in `SURFACE_GATED_DENYLIST_HEADINGS` appear as literal heading lines inside fenced code blocks in the 5 artifact-producing agents.
- **Agent constant** `CRUD_CHECK_AGENTS` (lines 1448-1454): `['questioner', 'designer', 'architect', 'planner', 'reviewer']`. Note: `researcher` and `implementer` are NOT in this list.
- **`SURFACE_GATED_DENYLIST_HEADINGS`** (lines 1421-1446): a Set of 22 strings:
  - Data-store/CRUD group (original 12): `## Data model`, `## Indexing & query performance`, `## API`, `## UI`, `## Front-end state`, `## Auth & authorization`, `## Migrations & data`, `## Data model changes`, `## API surface`, `## UI surface`, `## Authorization`, `## Migrations`
  - Kit surfaces (10 added in kit-surface-dogfooding): `## Slash-command surface`, `## Command changes`, `## Stage-agent surface`, `## Agent changes`, `## Skill surface`, `## Skill changes`, `## Lint-gate surface`, `## Lint changes`, `## Template surface`, `## Migration manifest`
- **Match rule**: a line inside a fence is a violation if `trimmed === denied` OR `trimmed.startsWith(denied + ' ')` OR `trimmed.startsWith(denied + '\t')`. Prevents `## APIs` from matching `## API`.
- **Scope**: agent SOURCE files only, inside ` ``` ` or `~~~` fenced blocks.

#### Check 14 (`checkSurfaceApplicability`, lines 1861-1960)

- **What it asserts**: no heading line in any committed change artifact belongs to an absent surface.
- **Data source**: `SURFACE_GATED_HEADINGS` (lines 1719-1763) -- a map from surface name to array of section headings it gates.
- **`SURFACE_GATED_HEADINGS`** (full content):
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
  - (`typed-nullable` omitted -- no heading, only PR checklist items)
- **File glob**: walks all `*.md` under `openspec/changes/` using `walkMd`, then **filters out** any path containing `path.sep + 'archive' + path.sep` (line 1932). Archive paths are excluded.
- **Surface source**: reads `.claude/skills/qrspi-stack/SKILL.md` (hardcoded path, line 1891), extracts the `## Repo surface` block via `parseRepoSurfaceBlock`. Fail-loud if block is absent or malformed.
- **Inline self-test** (lines 1862-1887): a synthetic fixture containing `## Data model` is run through `scanAbsentHeadings` before the real scan. If the detector does not fire, an error is pushed immediately (CI reddens). A second self-test verifies the fence-skip logic does not flag headings inside fenced blocks.
- **Scope**: OUTSIDE fenced blocks in committed change artifact `.md` files. Disjoint with Check 11 (which scans INSIDE fenced blocks in agent source files).

#### Check 2b (`checkSkillSets`, lines 1051-1131)

- **What it asserts**: each stage agent's step-1 "Load skills" line (excluding `-stack`-suffixed names) matches the registry in `SKILL_SET_EXPECTED` from `scripts/skill-sets.mjs`.
- **Harvest logic**: scans body lines matching `/^\s*\d+\.\s[^\n]*Load skills?\s/i` (numbered step lines with "Load skill(s)"); gathers backtick-wrapped names; excludes names ending in `-stack`.

---

### Artifact templates

Five `*.template.md` files in `openspec-templates/`:

| File | Canonical `##` headings (Check 3 required set) | Maps to agent |
|---|---|---|
| `questions.template.md` | `## Testing`, `## Sequencing & scope`, `## Open product questions (for the human)` | `questioner` |
| `design.template.md` | `## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs` | `designer` |
| `proposal.template.md` | `## Why`, `## What Changes`, `## Capabilities`, `## Impact` | `architect` |
| `tasks.template.md` | none (dynamic `## N. <name>` format; Check 3 skips) | `planner` |
| `spec-delta.template.md` | `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements` | `architect` |

**No `research.template.md` exists.** The researcher's inline skeleton (in `researcher.md` lines 73-101) is the sole source of the `research.md` shape. Check 3 does not cover `research.md` because there is no corresponding template and no entry in `TEMPLATE_CANONICAL_HEADINGS` for the researcher.

**Template-to-agent relationship per Check 3**: the lint check asserts that each template's canonical headings also appear inside the agent's file body (not necessarily in a fenced block -- full-body scan). The inline agent skeleton must therefore reproduce the canonical headings so they survive the body scan.

**Surface-gated sections in templates**: `questions.template.md` and `design.template.md` carry `<!-- SURFACE-GATED: <surface> surface. ... -->` comment blocks (not literal heading lines) for all 11 surfaces. The surface-gated heading lines themselves (`## Data model`, etc.) do appear as literal lines in the templates but they are NOT inside fenced code blocks -- this is consistent with Check 11 which only prohibits them inside fenced blocks in agent source files.

<!-- Absent surfaces (http-api, data-store, ui, auth, typed-nullable) are
     omitted here per this change's own PQ1 decision (omit sections for
     surfaces the repo does not declare). Their absence is recorded factually
     in ## Repo surface and ## Implicit contracts and conventions #6. This
     pre-applies the generic-researcher rule so the branch stays Check-14-clean
     until stage I makes the researcher agent itself surface-gated. -->

---

## Implicit contracts and conventions

1. **Read contract is machine-enforced**: Check 7 (`checkReadContracts`) parses the exact `Reads:` field from each agent's banner and asserts equality against `READ_CONTRACT_EXPECTED`. A banner-text edit that does not also update the constant fails CI.

2. **Skill-set is machine-enforced**: Check 2b (`checkSkillSets`) asserts the step-1 skill load list matches `SKILL_SET_EXPECTED` in `scripts/skill-sets.mjs`. Any skill added to or removed from an agent's step-1 load must also update that file.

3. **Researcher does not load `repo-surface`**: the researcher's registry entry is `['context-hygiene', 'workflow']`. The `repo-surface` skill is loaded by questioner, designer, architect (S+V), planner, and reviewer -- but not researcher or implementer. Check 2b enforces this.

4. **Researcher has no `Agent` tool**: the researcher's `tools:` frontmatter is `Read, Write, Bash, Glob, Grep, Skill`. It cannot spawn sub-subagents.

5. **researcher has no corresponding template**: there is no `openspec-templates/research.template.md`. The inline skeleton in `researcher.md` is the sole source of truth for the `research.md` shape. Check 3 does not cover the researcher.

6. **researcher's inline skeleton includes `## Data model` and `## Public API surface` as fixed headings**: these two headings appear as literal lines inside the fenced skeleton in `researcher.md`. They are NOT currently in `SURFACE_GATED_DENYLIST_HEADINGS` (Check 11 only scans `CRUD_CHECK_AGENTS = ['questioner', 'designer', 'architect', 'planner', 'reviewer']`; `researcher` is excluded from that list). Check 14 does NOT scan agent source files -- it scans `openspec/changes/` artifact files. So neither Check 11 nor Check 14 currently enforces surface-gating on the researcher's skeleton headings.

7. **Check 11 only scans 5 of 7 agents**: `researcher` and `implementer` are absent from `CRUD_CHECK_AGENTS`. The check is therefore disjoint from the researcher's skeleton.

8. **Check 14 excludes `/archive/` paths**: files whose path contains the segment `archive` (surrounded by `path.sep`) are excluded from the surface-applicability scan. Active change artifact files are scanned; archived ones are not.

9. **Surface taxonomy is closed**: the skill states the vocabulary is "closed by construction" -- a surface exists only to gate sections the agents emit. An addition requires updating 6 sites simultaneously (see "Extending the taxonomy" checklist).

10. **Template `## Template surface` self-collision rule**: `## Template surface` is both a valid emitted heading and a Check 11 denylist entry. The rule is that inside fenced blocks in agent skeletons, only gate comments are permitted for the `template` surface -- never a bare `## Template surface` heading line.

11. **Gate comment format in skeletons and templates**: surface-gated sections inside fenced blocks in questioner.md and designer.md are expressed as HTML comments of the form `<!-- SURFACE-GATED: <surface> surface. ... -->`. The literal heading (e.g. `## Skill surface`) is never written inside a fenced block.

12. **The research command derives areas from `questions.md` headings**: when no explicit areas are passed, the orchestrator reads `questions.md` question headings (not question text) to derive the areas of interest brief. The researcher never sees the ticket.

13. **`## Repo surface` block is required in the stack cheatsheet**: Check 14 fails loudly if the block is absent or malformed (not warn-and-skip). The self-test fixture uses `## Data model` against the kit's declared absent `data-store` surface.

---

## Open gaps

- [ ] The researcher's inline skeleton contains `## Data model` and `## Public API surface` as fixed heading lines inside the fenced block. Neither Check 11 (which excludes `researcher` from `CRUD_CHECK_AGENTS`) nor Check 14 (which scans change artifacts, not agent source files) currently enforces surface-gating on these headings. Whether this is intentional is not determinable from the code alone.
- [ ] `research.template.md` does not exist. The researcher's skeleton (in `researcher.md`) is therefore not subject to Check 3's heading-alignment enforcement. Whether the absence of a `research.template.md` is intentional (or whether one should exist and be wired into `TEMPLATE_CANONICAL_HEADINGS`) is not stated in any file read.
- [ ] The researcher does not load `repo-surface`. Whether the researcher's skeleton sections should be filtered by surface (and what that would require) is not documented in any existing file.
- [ ] The `questions.template.md` carries `<!-- SURFACE-GATED: slash-command surface. -->`, `<!-- SURFACE-GATED: stage-agent surface. -->`, etc. as comment-only placeholders (no literal heading lines for kit surfaces inside the template's fenced area). The template does NOT emit section headings like `## Slash-command surface` as literal text -- they are expressed only as comments. This is consistent with the Check 11 denylist, but the template is not a fenced block in an agent file, so Check 11 does not apply to it directly.
- [ ] No gap was found in the surface taxonomy coverage between `SURFACE_GATED_DENYLIST_HEADINGS` (Check 11, 22 entries) and `SURFACE_GATED_HEADINGS` (Check 14, per-surface arrays). However, `## Slash-command surface` and `## Stage-agent surface` appear in the denylist but `## Skill surface`, `## Lint-gate surface`, `## Lint changes`, `## Skill changes` also appear there. The mapping appears consistent between the two constants -- no discrepancy detected, but the exact count (22 in denylist vs. 20 entries across Check 14's map) was not independently verified by the researcher and warrants a second check.
