# Research — tighten-stage-read-boundaries

> Stage R of QRSPI. Generated 2026-07-15.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Per-agent input/read instructions**: What each `claude/agents/*.md` currently says it reads as inputs, verbatim.
- **Per-agent tool grants (frontmatter)**: The `tools:` line in each agent's frontmatter and whether path-level read restrictions exist.
- **Stage command → agent input passing**: How each `claude/commands/*.md` names and hands artifact paths to its subagent.
- **`scripts/lint.mjs` check structure**: All 6 checks — what they assert, how each function is shaped, how errors are collected, how the per-check status line is printed.
- **Workflow skill structure**: Section layout of `claude/skills/workflow/SKILL.md`, where per-stage input tables would fit, existing tables/matrices.
- **Migration manifest + release-gate surface**: `migrations/0.6.0.yaml` schema, lint Check 6 enforcement, CONTRIBUTING.md release checklist, `qrspi-release` skill preconditions.
- **sync-copilot propagation**: How `sync-copilot.mjs` maps `claude/agents/*.md` and `claude/commands/*.md` into `copilot/`, the `--check` drift gate.
- **Template + convention surface**: `openspec-templates/` — per-stage input notes, `(D<n>)` back-reference convention, model annotation convention.

---

## File map

### Area 1: Per-agent input/read instructions

#### `claude/agents/researcher.md`

**Inputs section (verbatim):**

```
## Inputs you will receive

1. A change id.
2. A list of codebase areas / capabilities to investigate — each a heading
   plus a one-line factual scope statement naming existing files/conventions
   to map. This is the orchestrator's curated, ticket-free brief; it is all
   you need to know what to research.

You do NOT receive the feature description, and you must NOT open
`openspec/changes/<id>/questions.md` (or any other ticket-bearing artifact in
the change folder) to "get more context" — its first line is the change
summary, so reading it would defeat the ticket-hiding premise of this stage.
If the areas of interest are too thin to act on, stop and ask the orchestrator
to widen them; do not go hunting in the ticket.
```

What the agent is instructed to read in "What to do":
- Load skills `workflow`, `openspec-workflow`, plus the project's stack-cheatsheet skill.
- For each area, locate files using Glob/Grep.
- No instruction to read any `openspec/changes/<id>/` artifact.

Explicit prohibition: must NOT open `openspec/changes/<id>/questions.md` or "any other ticket-bearing artifact in the change folder".

#### `claude/agents/questioner.md`

**Inputs section (verbatim):**

```
## Inputs you will receive

1. A change id in kebab-case (e.g. `add-question-voting`).
2. A short prose description of the change.
3. Optionally, links to relevant sections of `requirements.md`.
```

What the agent is instructed to read ("What to do" step 3–5):
- Read `requirements.md` and `tech-stack.md`.
- Read `openspec/backlog.md` (step 4).
- Skim the most recent archived `questions.md` (Glob `openspec/changes/archive/*`) as a fully-worked example (step 5).

No prohibition on reading `openspec/changes/<id>/` (the folder may not yet exist).

#### `claude/agents/designer.md`

**Inputs section (verbatim):**

```
## Inputs you will receive

1. A change id.
2. The change description (the ticket — now visible again).
3. Implicit inputs: `questions.md` and `research.md` from earlier stages.
```

What the agent is instructed to read ("What to do" step 2):
- "Read `openspec/changes/<id>/questions.md` and `research.md` end to end."
- Step 5 also permits reading "the relevant expert's definition file directly" for domain knowledge.
- Step 4 refers to archived designs for conditional-trigger checks ("Read the relevant project / archived design").

No instruction to read `openspec/changes/archive/` in general; only "a prior / archived design" if it records a scheduled trigger (step 6).

#### `claude/agents/architect.md`

Serves both Stage S (Structure) and Stage V (Slices) via stage routing.

**Stage S — What to do, step 2 (verbatim):**
```
2. Read `openspec/changes/<id>/questions.md`, `research.md`, and
   `design.md` in order. `design.md` is the source of truth for
   technical decisions; the other two anchor the spec scenarios in
   the technical-question record and the codebase factual map (so
   requirements cite real existing precedents in the codebase — existing
   endpoints, configurations, and conventions).
```

**Stage V prerequisite (verbatim):**
```
**Prerequisite gate.** Slices (V) reads `proposal.md` and `specs/` but never writes
them. Before doing anything, confirm `openspec/changes/<id>/proposal.md` and
at least one `openspec/changes/<id>/specs/<capability>/spec.md` exist (use
Glob). If either is missing, **stop and tell the human to run
`/qrspi:structure <id>` first`** — do NOT create the proposal or specs yourself
```

For Slices (V): reads `proposal.md` and `specs/` from the change folder. Does NOT re-read `questions.md`, `research.md`, or `design.md` in the V path.

Also reads base specs at `openspec/specs/<capability>/spec.md` for delta validation.

#### `claude/agents/planner.md`

**Inputs section (verbatim):**

```
## Inputs

1. The change id.
2. Implicit inputs: `proposal.md`, `specs/`, `slices.md`.
```

What the agent is instructed to read ("What to do" step 2):
- "Read `design.md` and `slices.md`."
- Note: `design.md` is cited for D-number back-references; `slices.md` is the task-generation source.
- `proposal.md` and `specs/` listed in the Inputs section but the "What to do" step mentions only `design.md` and `slices.md` — slight inconsistency (see Open gaps).

No instruction to read `questions.md` or `research.md`.

#### `claude/agents/implementer.md`

**Precondition (verbatim):**
```
`openspec/changes/<id>/tasks.md` exists. If not, refuse and tell the user
to run `/qrspi:plan <id>` first.
```

What the agent is instructed to read ("What to do" step 2):
- "Read `openspec/changes/<id>/tasks.md`."
- Step 3: reads the next un-ticked slice's `**Model:**` annotation from `tasks.md`.

No instruction to read `questions.md`, `research.md`, `design.md`, `proposal.md`, `specs/`, or `slices.md`. The implementer also reads the project's stack-cheatsheet skill.

In Fix mode (post-PR): reads `openspec/changes/<id>/followups.md` and may edit `openspec/changes/<id>/specs/**` (delta spec only, not base spec).

#### `claude/agents/reviewer.md`

**What to do, step 2 (verbatim):**
```
2. Read the full `openspec/changes/<id>/` folder.
```

This is the broadest read scope: the reviewer reads the entire change folder (`questions.md`, `research.md`, `design.md`, `proposal.md`, `specs/`, `slices.md`, `tasks.md`) plus runs git commands and build/lint/test commands. No prohibition on any file within `openspec/changes/<id>/`.

No instruction to read `openspec/changes/archive/` or `openspec/specs/`.

---

### Area 2: Per-agent tool grants (frontmatter)

| Agent | `tools:` line | Write/Edit? | Bash? | Agent? |
|---|---|---|---|---|
| `researcher` | `Read, Write, Bash, Glob, Grep, Skill` | Write (research.md) | Yes | No |
| `questioner` | `Read, Write, Edit, Bash, Glob, Grep, Skill` | Write + Edit | Yes | No |
| `designer` | `Read, Write, Edit, Bash, Glob, Grep, Skill, Agent` | Write + Edit | Yes | Yes |
| `architect` | `Read, Write, Edit, Bash, Glob, Grep, Skill, Agent` | Write + Edit | Yes | Yes |
| `planner` | `Read, Write, Bash, Glob, Grep, Skill` | Write (tasks.md) | Yes | No |
| `implementer` | `Read, Write, Edit, Bash, Glob, Grep, Skill, Agent` | Write + Edit | Yes | Yes |
| `reviewer` | `Read, Bash, Glob, Grep, Skill` | No Write/Edit | Yes | No |

**No per-path read restriction mechanism exists at the tool level.** The `tools:` frontmatter grants tool classes, not path-scoped permissions. The only per-path read boundary is enforced by prose instruction (the researcher's explicit prohibition on `openspec/changes/<id>/questions.md` and "any other ticket-bearing artifact in the change folder").

The `model:` field per agent: `researcher` = sonnet, `questioner` = sonnet, `designer` = opus, `architect` = sonnet, `planner` = sonnet, `implementer` = opus, `reviewer` = sonnet.

---

### Area 3: Stage command → agent input passing

#### `claude/commands/research.md`

The command does NOT pass `questions.md` to the researcher subagent. Verbatim:

```
**Critical**: do NOT pass the feature description or any opinion about
what the change should do to the researcher. The researcher works
without the ticket on purpose. From `$ARGUMENTS`, extract only:

1. The change id (first token).
2. The list of "areas of interest" — codebase areas to investigate
   (e.g. "questions table, vote logic, user role checks"). If the
   user only gave you a change id, read
   `openspec/changes/<id>/questions.md` and derive areas from the
   question headings — not from any speculation in the questions
   themselves.
```

The orchestrator reads `questions.md` to derive area headings but passes only the change id and area list to the subagent. The question content (change summary on line 1, ticket speculation) must not be forwarded.

Spawns: `researcher` (`subagent_type: qrspi:researcher`).

#### `claude/commands/design.md`

Inputs passed to the designer subagent (verbatim):
```
Inputs:

1. The change id (first token of `$ARGUMENTS`).
2. The change description (the rest of `$ARGUMENTS`) — now visible
   again, after being hidden during Research.
3. Implicit: `openspec/changes/<id>/questions.md` and `research.md`.
```

The command verifies both files exist (Glob precondition) then passes the change id plus "instructions to produce `openspec/changes/<id>/design.md`". The `questions.md` and `research.md` are described as "Implicit" — they are not passed as text by the orchestrator; the designer reads them directly. The command body also includes `@requirements.md` and `@tech-stack.md` as repository signals.

Spawns: `designer` (`subagent_type: qrspi:designer`).

#### `claude/commands/structure.md`

Tells the architect to produce `proposal.md` and `specs/`. The precondition artifact is `openspec/changes/<id>/design.md`. The command does NOT enumerate which prior artifacts the architect should read; that is entirely governed by the architect agent's "What to do" section. The orchestrator verifies `design.md` exists and is approved before spawning.

Spawns: `architect` (`subagent_type: qrspi:architect`).

#### `claude/commands/slices.md`

Precondition artifacts: `openspec/changes/<id>/proposal.md` and at least one `openspec/changes/<id>/specs/*/spec.md`. Tells the architect to produce `slices.md`. No enumeration of which prior files the architect should read — governed by architect agent.

Spawns: `architect` (`subagent_type: qrspi:architect`).

#### `claude/commands/plan.md`

Precondition artifact: `openspec/changes/<id>/slices.md`. Passes the change id. No enumeration of which prior files the planner should read.

Spawns: `planner` (`subagent_type: qrspi:planner`).

#### `claude/commands/implement.md`

Precondition artifact: `openspec/changes/<id>/tasks.md`. The command itself reads `tasks.md` to pick the next un-ticked slice's `**Model:**` annotation before spawning the implementer with that model. The subagent is told to pick up the next un-ticked slice from `tasks.md`. No enumeration of prior artifacts.

Spawns: `implementer` (`subagent_type: qrspi:implementer`, model from annotation).

#### `claude/commands/pr.md`

Precondition: all boxes in `tasks.md` ticked + clean working tree. Tells the reviewer to "read the full `openspec/changes/<id>/` folder" and run build/lint/tests.

Spawns: `reviewer` (`subagent_type: qrspi:reviewer`).

#### `claude/commands/questions.md`

Passes the change id and short description to the questioner. Repository signals included inline: `@requirements.md`, `@tech-stack.md`, `@openspec/backlog.md`. The most recent archived `questions.md` is read by the questioner itself (not by the orchestrator).

Spawns: `questioner` (`subagent_type: qrspi:questioner`).

---

### Area 4: `scripts/lint.mjs` check structure

The script uses a flat `errors` array collected before `process.exit`. Each check function is `async function check<Name>(errors)` and pushes error strings directly onto `errors`. Status lines are emitted with `process.stdout.write(` calls. The `main()` function calls each check in order, then prints the collected errors at the end.

**Pattern for a new check:**

```js
async function checkFoo(errors) {
  // ... detection logic
  if (violation) {
    errors.push(`[label] file:line: description`);
    // return violations count or push multiple
  }
  if (noViolations) {
    process.stdout.write(`  OK: summary of what passed\n`);
  }
  return violationCount; // or just push + return
}
```

In `main()`:
```js
process.stdout.write('\nCheck N: <label>\n');
await checkFoo(errors);
```

Final block:
```js
if (errors.length === 0) {
  process.stdout.write('All checks passed.\n');
  process.exit(0);
} else {
  process.stdout.write(`${errors.length} violation(s) found:\n`);
  for (const e of errors) { process.stdout.write(`  ${e}\n`); }
  process.exit(1);
}
```

#### Check 1: Pin agreement (`checkPinAgreement`)

Scans all hand-maintained `.md/.yaml/.yml/.json/.mjs/.ps1/.sh` files in `claude/`, `copilot/`, `openspec/` (excluding `openspec/changes/`), `openspec-templates/`, and root-level files. Extracts `@fission-ai/openspec@<version>` and `openspec_version: <version>` patterns. Excludes `generatedBy:` lines in `claude/skills/openspec-*/` directories. Asserts all found versions agree (not a fixed version — any consistent value passes). Error label: `[pin]`.

#### Check 2: Frontmatter / name resolution (`checkFrontmatter`)

Checks agents (`claude/agents/*.md`): require `name:` and `description:` in frontmatter, `model:` must be an alias (opus/sonnet/haiku), skill refs in body must resolve to `claude/skills/<X>/SKILL.md`. Checks commands (`claude/commands/**/*.md`): require `description:`, `agent:` must resolve to a known agent or be a builtin (`build`, `agent`), `model:` alias check. Checks skills (`claude/skills/*/SKILL.md`): require `name:` and `description:`. Error label: `[frontmatter]`.

Skill resolution: `checkSkillRefs()` matches backtick-wrapped names on "Load skill(s)" lines and "load the `X` skill" patterns. Only backtick-wrapped names are checked.

#### Check 3: Heading alignment (`checkHeadingAlignment`)

For each template→agent mapping in `TEMPLATE_CANONICAL_HEADINGS`, checks that the canonical section headings from the template appear in the agent's body. Mappings:
- `questions.template.md` → `questioner` (10 headings)
- `design.template.md` → `designer` (4 headings: `## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`)
- `proposal.template.md` → `architect` (4 headings: `## Why`, `## What Changes`, `## Capabilities`, `## Impact`)
- `tasks.template.md` → `planner` (0 headings — dynamic format, skipped with `SKIP:`)
- `spec-delta.template.md` → `architect` (3 headings: `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`)

Error label: `[heading]`. OK line: `  OK: <template> -> <agent> (<N> heading(s))`.

#### Check 4: README command coverage (`checkReadmeCoverage`)

Bidirectional:
- Forward: every `claude/commands/<stem>.md` must appear as `/qrspi:<stem>` in `README.md`.
- Reverse: every `/qrspi:<token>` in `README.md` must resolve to `claude/commands/<token>.md`.

Only checks `claude/commands/*.md` (top-level), not recursive. Error label: `[readme]`.

#### Check 5: Gate-tool / executor agreement (`checkGateExecutor`)

For every command file with a non-builtin `agent:` frontmatter field, checks whether the command body reaches a main-loop-only tool (`AskUserQuestion`) directly (body contains the string) or transitively (body contains backtick-wrapped `` `workflow` `` AND at least one of `Stage choreography`, `commit step`, `next-stage handoff`). If reached, reports a violation. Error label: `[gate]`.

`MAIN_LOOP_ONLY = new Set(['AskUserQuestion'])`.

Builtin agents that are exempt: `build`, `agent`.

#### Check 6: Migration manifest presence + schema + marker format (`checkMigrationManifests`)

Three sub-checks under label `[migration]`:

**(a) Presence:** Floor constant is `MIGRATION_FLOOR = '0.6.0'` (hard-coded, not derived from directory contents). The floor manifest (`migrations/0.6.0.yaml`) must always exist. Every `## [X.Y.Z]` section in `CHANGELOG.md` at or above the floor must have a matching `migrations/<version>.yaml`.

**(b) Schema:** Each `migrations/*.yaml` must have: `version`, `summary`, `automated`, `manual`. `version` must match filename stem. `automated[].action` must be `'edit-file'` only. `automated[].path` must start with `'openspec/'`. Uses a custom YAML parser (`parseManifestYaml`) — no npm dependencies.

**(c) Marker format:** If `openspec/.qrspi-version` exists, its content must be bare SemVer (`X.Y.Z`, no `v` prefix, no trailing content).

OK line: `  OK: <N> migration manifest(s) present and schema-valid[, marker format valid|, no marker file (skipped)]`.

---

### Area 5: Workflow skill structure (`claude/skills/workflow/SKILL.md`)

**Top-level sections:**

1. `## What QRSPI is` — Three failure modes + acronym lineage note.
2. `## Before Q — the backlog` — Backlog conventions, `### Capturing deferred work` sub-section.
3. `## The eight stages` — `### Alignment phases (5)` and `### Execution phases (3)` sub-sections. Each stage described in one paragraph with artifact path. No table.
4. `## After PR — the fix loop`
5. `## Rules of the road`
6. `## When you can skip stages`
7. `## Stage choreography (canonical procedures)` — Contains:
   - `### Run-mode (Full / Semi / Manual)` with two sub-sections: "Establishing the run-mode" and "Never-suppressed gates".
   - `### Hard-stop procedure` with "Divergence rubric (hard-stop condition 4)" prose.
   - `### Precondition check (Glob-based)`
   - `### Commit step (mandatory)`
   - `### Next-stage handoff (mandatory)`
   - `### Backlog atomicity`
   - `### Stage-specific gate notes`

**Existing tables / matrices:** None. The eight stages are described as paragraphs in `## The eight stages`, not as a table. There is no per-stage reference table mapping stage → inputs, artifacts, or tool grants. The "Stage choreography" section provides canonical prose procedures that all stages reference, but the stage-specific variables (artifact path, commit message, precondition artifact, next-stage command) live in the individual command files.

**Natural fit for a per-stage input table:** The gap between `## The eight stages` (artifact names only) and `## Stage choreography` (canonical procedures) has no structural home for a "stage X reads artifacts A, B, C" matrix. The closest existing structure is `## The eight stages` which names the output artifact for each stage but not the input artifacts.

---

### Area 6: Migration manifest + release-gate surface

#### `migrations/0.6.0.yaml` (complete file)

```yaml
version: 0.6.0
summary: >
  Introduces the openspec/.qrspi-version marker and the /qrspi:update command.
  No structural changes to openspec/ are required for existing repos. After
  updating the plugin, run /qrspi:update (or manually write 0.6.0 to
  openspec/.qrspi-version) to initialize the marker.
automated: []
manual: []
```

**Schema observed:** `version` (string matching filename stem), `summary` (block scalar `>` or inline string), `automated` (list or empty `[]`), `manual` (list or empty `[]`). An item in `automated` carries `action`, `path`, `description`. `action` must be `'edit-file'`. `path` must start with `'openspec/'`.

#### Lint Check 6 enforcement

- Floor constant `MIGRATION_FLOOR = '0.6.0'` is hard-coded in `checkMigrationManifests()` — explicitly NOT derived from directory contents to prevent fail-open if the floor manifest is deleted.
- On every PR, the check requires `migrations/<version>.yaml` for every `## [X.Y.Z]` CHANGELOG section at or above the floor.
- Schema validation uses a custom dependency-free YAML parser.

#### CONTRIBUTING.md release checklist (relevant step, verbatim)

```
3. Write `migrations/<version>.yaml` for the new version (a "no consumer action"
   stub is valid — `automated` and `manual` lists may be empty). The lint gate
   checks presence on every PR, so this step must be done before pushing.
```

#### `.claude/skills/qrspi-release/SKILL.md` precondition 4 (verbatim)

```
4. **Migration manifest entry exists.** `migrations/<X.Y.Z>.yaml` must exist in
   the kit repo (use the Read tool to check the path). A stub with empty
   `automated` and `manual` lists is valid — but the file must be present. If it
   is absent, halt and instruct the human to write `migrations/<X.Y.Z>.yaml`
   before re-running. (The lint gate also catches this on every PR, but this
   hard-stop ensures the release skill never commits without the entry.)
```

The release skill has 6 preconditions total; precondition 4 is the migration manifest hard-stop. The skill is local dev-tooling under `.claude/` and is not shipped in the plugin.

---

### Area 7: sync-copilot propagation

`sync-copilot.mjs` maps `claude/` → `copilot/` via the `generate()` function. Three output subdirectories: `copilot/agents/`, `copilot/prompts/`, `copilot/instructions/`.

#### Agent mapping (`claude/agents/*.md` → `copilot/agents/`)

For each `claude/agents/<name>.md`, generates `copilot/agents/copilot-<name>.agent.md`. Frontmatter is rewritten: `description:` is carried, `tools:` is remapped via `mapTools()` (Claude tool names → VS Code namespaced tool ids), a model note is prepended for opus-annotated agents. The body passes through `rewriteAll()` (path rewrites, skill-load rewrites, AskUserQuestion rewrites, subagent-verb softening).

Current agent → copilot output:
- `researcher.md` → `copilot-researcher.agent.md`
- `questioner.md` → `copilot-questioner.agent.md`
- `designer.md` → `copilot-designer.agent.md`
- `architect.md` → `copilot-architect.agent.md`
- `planner.md` → `copilot-planner.agent.md`
- `implementer.md` → `copilot-implementer.agent.md`
- `reviewer.md` → `copilot-reviewer.agent.md`

#### Command mapping (`claude/commands/*.md` → `copilot/prompts/`)

For each `claude/commands/<stem>.md` (excluding `qrspi-sync-copilot`), generates `copilot/prompts/qrspi-<stem>.prompt.md`. The `qrspi-` prefix is re-added (commands dropped it; Copilot prompts are un-namespaced). Agent reference is rewritten: the `agentFor` table maps `qrspi-<stem>` → a `copilot-<role>` agent name (so `qrspi:researcher` → `copilot-researcher`).

`agentFor` table:
```js
const agentFor = {
  'qrspi-questions': 'questioner', 'qrspi-research': 'researcher',
  'qrspi-design': 'designer', 'qrspi-structure': 'architect',
  'qrspi-slices': 'architect', 'qrspi-plan': 'planner',
  'qrspi-implement': 'implementer', 'qrspi-followup': 'implementer',
  'qrspi-pr': 'reviewer',
};
```

Commands not in `agentFor` get `agent: agent` (Copilot's generic agent): `qrspi-archive`, `qrspi-init`, `qrspi-retro`, `qrspi-stack`, `qrspi-status`, `qrspi-update`.

#### Skill mapping (`claude/skills/*/SKILL.md` → `copilot/instructions/`)

For each `claude/skills/<dirName>/SKILL.md` (excluding `qrspi-sync-copilot` directory), generates `copilot/instructions/<dirName>.instructions.md`. The `--check` mode regenerates to a temp directory and diffs against committed `copilot/`; any difference (added, deleted, changed file) is reported and exits non-zero.

#### Body rewrite rules (`rewriteAll`)

Key rewrites affecting agent/command content:
- `$ARGUMENTS` → `${input}`
- `Load skill \`X\`` → `Consult the **X** instructions (\`X.instructions.md\`)`
- `AskUserQuestion` → `vscode/askQuestions`
- `/qrspi:<cmd>` → `/qrspi-<cmd>`
- `invoke the <role> subagent` → `continue as the <role>`
- `.claude/` path references → `.github/` path references
- `@path` references → `#file:path` references

Per-file fixups (`applyFixups`) override generic rules for specific files (`qrspi-implement.prompt.md`, `qrspi-init.prompt.md`).

---

### Area 8: Template + convention surface (`openspec-templates/`)

#### `openspec-templates/questions.template.md`

- Contains the canonical section headers used by Check 3.
- No per-stage input note. Has a preamble comment block explaining conventions (section split/rename rules, `Not applicable` pattern, question numbering).
- `PQ<N> — <topic>:` prefix convention for product questions is defined in the template's "Open product questions" section.
- No `(D<n>)` back-reference convention here (that is tasks only).

#### `openspec-templates/design.template.md`

- Defines the four canonical headers (`## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`) and optional QRSPI extras.
- Decision numbering convention `### D1 — <decision name> (Q.., PQ..)` is shown as an example inline in the skeleton (`### D1 — <decision name> (Q.., PQ..)`).
- No per-stage input note.

#### `openspec-templates/tasks.template.md`

- Defines `**Model:** sonnet|opus — <rationale>` per-slice annotation convention. This is the source of the model annotation that propagates from `slices.md` → `tasks.md` → `implement` command.
- Defines `(D<n>)` back-reference convention for tasks: "Append `(D<n>)` (or `(D<n>, D<m>)`) where a task implements a numbered `design.md` decision."
- Note: the template references `worktree.md` in two places (`**Model:** sonnet|opus — <rationale carried verbatim from worktree.md>` and "`slices.md`" is referenced in agent body but template says `worktree.md`) — this is a stale label in the template (see Open gaps).
- Defines `(human)` task prefix for tasks the implementer cannot perform itself.
- No per-stage input note beyond the preamble sentence "Single source of truth for how the QRSPI **Plan** stage writes `openspec/changes/<id>/tasks.md`."

#### `openspec-templates/proposal.template.md`

- Defines four canonical headers `## Why`, `## What Changes`, `## Capabilities`, `## Impact`.
- Optional sections `## Out of scope` and `## Vertical slices (preview)` documented in the template but not canonical.
- No `(D<n>)` convention; no per-stage input note.

#### `openspec-templates/spec-delta.template.md`

- Defines `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements` canonical headers.
- No `(D<n>)` convention; no per-stage input note.

---

## Public API surface

No HTTP endpoints — this is a kit of agent/command/skill markdown files plus Node.js scripts. The "public API surface" is the command/agent/skill interface:

- `/qrspi:questions <id> <description>` — Q stage command
- `/qrspi:research <id> [areas]` — R stage command (ticket-blind)
- `/qrspi:design <id> <description>` — D stage command
- `/qrspi:structure <id>` — S stage command
- `/qrspi:slices <id>` — V stage command
- `/qrspi:plan <id>` — P stage command
- `/qrspi:implement <id>` — I stage command
- `/qrspi:pr <id>` — PR stage command
- `/qrspi:archive`, `/qrspi:followup`, `/qrspi:init`, `/qrspi:retro`, `/qrspi:stack`, `/qrspi:status`, `/qrspi:update` — utility commands

---

## Data model

No database. The data model is the QRSPI change folder artifact sequence:

```
openspec/changes/<id>/
  questions.md    (Q)
  research.md     (R)
  design.md       (D)
  proposal.md     (S)
  specs/<cap>/spec.md  (S)
  slices.md       (V)
  tasks.md        (P)
  [pr.md]         (PR)
  [followups.md]  (PR / followup)
openspec/changes/archive/YYYY-MM-DD-<id>/  (archived)
openspec/specs/<cap>/spec.md               (merged base specs)
openspec/backlog.md                        (cross-change)
migrations/<version>.yaml                  (release gate)
openspec/.qrspi-version                    (marker, optional)
```

---

## Implicit contracts and conventions

1. **Ticket-hiding invariant (researcher):** The researcher must receive only the change id and areas of interest — never the feature description. The research command reads `questions.md` to derive area headings but passes only the headings (not the content) to the subagent. This is enforced by prose instruction only; no tool-level path restriction exists.

2. **Explicit prohibition vs. prose convention:** The researcher's prohibition on reading `openspec/changes/<id>/questions.md` is the only explicit file-level read prohibition in any agent. All other agents' read scopes are defined by positive instruction ("read X"), not by prohibition.

3. **Implicit read scope widening:** Several agents are told to read "implicit inputs" without explicit instruction to do so from the command. The designer reads `questions.md` and `research.md` per its agent body, not because the design command passes their text. The architect reads `questions.md`, `research.md`, and `design.md` per its agent body for S, but only `proposal.md` and `specs/` for V. The planner reads `design.md` and `slices.md` per its agent body despite the command only passing the change id.

4. **Read scope is not enforced by commands:** Commands verify artifact existence (Glob precondition check) but do not enumerate which files the spawned subagent may or may not read. The subagent's effective read scope is entirely governed by the agent file's prose instructions and the unrestricted `Read` tool grant.

5. **Reviewer reads everything:** The reviewer's instruction "Read the full `openspec/changes/<id>/` folder" is the broadest read contract. No files within the change folder are excluded.

6. **`(D<n>)` back-reference convention:** Defined in `tasks.template.md` and repeated in `planner.md`. Tasks cite numbered decisions from `design.md`. Referenced in `slices.md` only transitively (slices feed tasks). Not present in `proposal.md`, `design.md`, `questions.md`, or `spec` files.

7. **Model annotation propagation chain:** `slices.md` (architect, V) → `tasks.md` (planner, P, verbatim carry) → read by implement command before spawning implementer subagent. Three agents in the chain; the annotation is a hard constraint at stage I.

8. **Skill resolution in Check 2:** Only backtick-wrapped names after "Load skill(s)" or "load the `X` skill" patterns are checked. Bare references like `Load workflow skill` would not be caught.

9. **Copilot propagation is one-way and destructive:** `sync-copilot.mjs` drops and recreates `copilot/` entirely on every run. No merge or partial update. The `--check` mode uses a union diff (committed vs. generated) so deleted-but-not-regenerated files are flagged.

10. **`worktree.md` stale label in `tasks.template.md`:** The tasks template uses `worktree.md` as the source label for the `**Model:**` annotation (e.g., "rationale carried verbatim from `worktree.md`") in two places. The actual file is `slices.md`. This stale label is inconsistent with `planner.md`, which correctly says "Carry the `**Model:**` annotation from each `slices.md` slice."

11. **Researcher has `Write` tool grant despite read-only description:** The `researcher.md` frontmatter lists `Write` in tools (needed to write `research.md`). The agent description says "Read-only investigator" — "read-only" here means read-only on the codebase, not read-only overall. No tool-level distinction exists between "write research.md" and "write any file."

12. **Check 5 transitive detection:** The `reachesMainLoopOnlyTool` function in `lint.mjs` detects `AskUserQuestion` usage both inline and transitively via the `workflow` skill (by checking for `` `workflow` `` + choreography markers). This covers the case where a command delegates to the workflow for commit/handoff steps that invoke `AskUserQuestion`.

---

## Open gaps

- [ ] The researcher's prohibition names `questions.md` and adds "or any other ticket-bearing artifact in the change folder" — but the scope of "ticket-bearing" is not formally defined. It is ambiguous whether `design.md` (which also references the change summary) would be considered ticket-bearing if it existed at research time.
- [ ] `planner.md` "Inputs" section lists `proposal.md` and `specs/` as implicit inputs, but the "What to do" step 2 says only "Read `design.md` and `slices.md`." It is unclear whether the planner is expected to read `proposal.md` and `specs/` or not.
- [ ] `tasks.template.md` uses `worktree.md` (stale label) in two places where the current file name is `slices.md`. This inconsistency exists between the template and the agent/command files but is not caught by any lint check.
- [ ] No per-stage input table or matrix exists in `claude/skills/workflow/SKILL.md`. The workflow skill describes output artifacts per stage but not the input artifacts each stage reads. A reader must cross-reference each agent file individually to reconstruct the full input → output map.
- [ ] The read/write scope of `researcher` is enforced only by prose. There is no tool-level or path-level mechanism preventing the researcher from reading `questions.md` if the prohibition instruction is not followed.
- [ ] The `questioner` agent's step 5 says to "skim the most recent archived `questions.md` (use the **Glob** tool with pattern `openspec/changes/archive/*`)". This is a read of a file in `openspec/changes/archive/` — the only agent with an explicit instruction to read from the archive directory. Its scope (one file from archive, not the full archive) is specified by prose only.
- [ ] The designer's step 6 references "Read the relevant project / archived design" for conditional-trigger checking but does not specify which archived design to read or how to identify it — left to the agent's judgment.
