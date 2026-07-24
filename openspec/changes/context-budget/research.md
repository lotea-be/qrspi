# Research — context-budget

> Stage R of QRSPI. Generated 2026-07-24.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Per-stage skill loads:** Which skills each command and agent loads today, including the `<repo>-stack` cheatsheet.
- **Per-stage read footprint:** Read Matrix in `claude/skills/workflow/SKILL.md` and the `> **Read contract**` banners in each agent, plus `@file` auto-injection references in command bodies.
- **Agent output / final-message sections:** Shape, boundedness, and "next command" line in each agent's `## Final message format`.
- **Lint checks:** All 11 numbered checks in `scripts/lint.mjs`, with detail on Check 7 (`checkReadContracts`) and Check 2 (`checkFrontmatter` / `checkSkillRefs`).
- **context-hygiene skill:** Numeric thresholds, firewall/subagent guidance, and which agents/commands reference it.
- **Instrumentation precedent:** Any existing token/context logging; full inventory of `scripts/`.
- **Release / changelog / plugin-vs-consumer boundary:** CHANGELOG conventions, migration file structure, plugin.json versioning rules, and what ships to consumers vs. stays in the kit repo.

---

## File map

### Per-stage skill loads

#### Commands (`claude/commands/`)

| Command file | Skills loaded by the command (pre-spawn) | Spawned agent | `<repo>-stack` loaded by command? |
|---|---|---|---|
| `questions.md` | `workflow`, `openspec-workflow` (step 4 — listed inline); `qrspi-version-check` (step 1) | `questioner` | No — but instructs agent to load stack cheatsheet |
| `research.md` | `qrspi-version-check` (step 1), `workflow` (run-mode, implicit) | `researcher` | No |
| `design.md` | `qrspi-version-check` (step 1), `workflow` (run-mode, implicit) | `designer` | No |
| `structure.md` | `qrspi-version-check` (step 1), `workflow` (run-mode, implicit) | `architect` | No |
| `slices.md` | `qrspi-version-check` (step 1), `workflow` (run-mode, implicit) | `architect` | No |
| `plan.md` | `qrspi-version-check` (step 1), `workflow` (run-mode, implicit) | `planner` | No |
| `implement.md` | `qrspi-version-check` (step 1), `workflow` (run-mode, implicit); `vertical-slice` + stack-cheatsheet if scope amendment | `implementer` | Only during scope-amendment path |
| `pr.md` | `qrspi-version-check` (step 1), `workflow` (run-mode, implicit) | `reviewer` | No |
| `status.md` | `qrspi-version-check` (step 1) | none (main-loop only) | No |
| `followup.md` | none listed (no version-check embed; no `agent:` frontmatter) | `implementer` (P1 path) | No |
| `update.md` | `qrspi-update` (step 1, before any other work) | none (main-loop only) | No |
| `init.md` | none | none (`agent: build`) | No |
| `stack.md` | none | none (`agent: build`) | No |
| `archive.md` | `openspec-archive-change` (via agent) | none (`agent: build`) | Yes — reads stack cheatsheet for PR-status CLI |
| `retro.md` | `retrospective`, `workflow`, `openspec-workflow` | none (main-loop) | No |

Notes:
- `questions.md` calls `workflow` and `openspec-workflow` in the body (step 4) before spawning; the other stage commands reference `workflow` only through the choreography pattern (implicitly) or load nothing themselves.
- `followup.md` has no `agent:` frontmatter and no version-check embed (the lint Check 9 scope is the nine stage commands, not followup).
- The `@requirements.md`, `@tech-stack.md`, `@openspec/backlog.md` signals appear in `questions.md` and `design.md` bodies as auto-injection references (see below).

#### Agents (`claude/agents/`)

| Agent | Skills loaded | `<repo>-stack` loaded? |
|---|---|---|
| `researcher.md` | `workflow`, `openspec-workflow`, plus stack cheatsheet if defined | Yes (conditional) |
| `questioner.md` | `workflow`, `openspec-workflow`, `repo-surface`, plus stack cheatsheet if defined | Yes (conditional) |
| `designer.md` | `workflow`, `openspec-workflow`, `context-hygiene`, `repo-surface`, plus stack cheatsheet if defined | Yes (conditional) |
| `architect.md` | `workflow`, `openspec-workflow`, `vertical-slice`, `repo-surface`, plus stack cheatsheet if defined | Yes (conditional) |
| `planner.md` | `workflow`, `openspec-workflow`, `vertical-slice`, `repo-surface`, plus stack cheatsheet if defined | Yes (conditional) |
| `implementer.md` | `workflow`, `vertical-slice`, `context-hygiene`, plus stack cheatsheet if defined; also `postpr-fix` in FIX MODE | Yes (conditional) |
| `reviewer.md` | `workflow`, `openspec-workflow`, `repo-surface`, plus stack cheatsheet if defined | Yes (conditional) |

Stack cheatsheet discovery pattern used by all agents: Glob `.claude/skills/*/SKILL.md`.

All agents load the stack cheatsheet conditionally ("if it defines one") — no hard failure if absent.

---

### Per-stage read footprint

#### Read Matrix (`claude/skills/workflow/SKILL.md`)

The workflow skill carries the single authoritative Read Matrix table:

| Stage | Agent | Reads (within-change) | Cross-change |
|---|---|---|---|
| R | researcher | *none* — whole `changes/<id>/` folder banned | spec.md only |
| Q | questioner | backlog + templates (no change-folder artifact) | spec.md only |
| D | designer | `questions.md`, `research.md` | spec.md only |
| S | architect | `design.md` | spec.md only |
| V | architect | `proposal.md`, `specs/` | spec.md only |
| P | planner | `slices.md` | spec.md only |
| I | implementer | `tasks.md` | spec.md only |
| PR | reviewer | full `changes/<id>/` folder (by design) | spec.md only |

Two special rows:
- **Architect** has a two-mode contract: at S reads `design.md` only; at V reads `proposal.md` + `specs/` only. Never reopens `questions.md`/`research.md` once past D.
- **Reviewer** is the only "read everything" agent, by design.

Cross-change rule: no agent may open another change's process artifacts (`questions.md`, `research.md`, `design.md`, `proposal.md`, `slices.md`, `tasks.md`, `pr.md`, `followups.md`) in-flight or archived. `spec.md` files under `openspec/specs/**` and delta `specs/**/spec.md` inside other changes are the sole cross-change exception.

#### `> **Read contract**` banners in agent files

Each agent carries a single banner line of the form:

```
> **Read contract** — Reads: <set>. Never opens: <deny>; no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).
```

Exact current `Reads:` fields (as validated by lint Check 7 `READ_CONTRACT_EXPECTED` map):

| Agent | Reads: field |
|---|---|
| researcher | `none (whole changes/<id>/ folder banned).` |
| questioner | `backlog + templates (no change-folder artifact).` |
| designer | `questions.md, research.md.` |
| architect | `(S): design.md. Reads (V): proposal.md, specs/.` |
| planner | `slices.md.` |
| implementer | `tasks.md.` |
| reviewer | `full changes/<id>/ folder (by design).` |

#### `@file` auto-injection in command bodies

- `questions.md` body contains: `@requirements.md`, `@tech-stack.md`, `@openspec/backlog.md`
- `design.md` body contains: `@requirements.md`, `@tech-stack.md`
- `retro.md` body contains: `@openspec/changes/$ARGUMENTS`, `@openspec/backlog.md`
- No other stage commands carry `@file` auto-injections.

These `@file` directives cause the named files to be injected into the orchestrator's context window at command invocation time (not at subagent spawn time).

---

### Agent output / final-message sections

| Agent | Section heading | Shape | Bounded? | "Next stage:" line? | Distinct "output contract" section? |
|---|---|---|---|---|---|
| `researcher` | `## Final message format` | 4 fixed lines: `Wrote:`, `Files surveyed:`, `Tables surveyed:`, `Open gaps:`, `Next stage:` | Yes — tight, 5 lines max | Yes — `Next stage: /qrspi:design <id>` | No |
| `questioner` | `## Final message format` | 4 fixed lines: `Wrote:`, `Question count:`, `Product questions answered:`, `Next stage:` | Yes — tight, 4 lines | Yes — `Next stage: /qrspi:research <id>` | No |
| `designer` | `## Final message format` | 3 lines + warning block: `Wrote:`, `Design decisions called out:`, `Open questions for the human:`, then `⚠ HUMAN REVIEW REQUIRED` banner | Yes — 4-line body | No — human review required before next stage | No |
| `architect` | `## Final message format` (with two sub-headings: `### S-only` and `### V-only`) | S-only: 5 lines (`Wrote:`, `Capabilities touched:`, `Open questions surfaced:`, `Next stage:`). V-only: 3 lines (`Wrote:`, `Slices:`, `Next stage:`) | Yes — tight | Yes — S has `Next stage: /qrspi:slices <id>`; V has `Next stage: /qrspi:plan <id>` | No |
| `planner` | `## Final message format` | 4 fixed lines: `Wrote:`, `Slices:`, `Tasks:`, `Next stage:` | Yes — tight | Yes — `Next stage: /qrspi:implement <id>` | No |
| `implementer` | `## Final message format (per slice)` | Per-slice: 8+ sections including `Slice N — name: COMPLETE`, `Tasks ticked:`, `Files created/modified:`, `Tests passing:`, `Build + lint:`, `Deviations from the slice plan:`, `Points to review:`, `Checkpoint to verify:`, `Ready for /qrspi:implement`. After final slice: 2-line coda `All slices complete...` + `Next stage: /qrspi:pr <id>` | Structured but unbounded (Files list can grow) | Yes — on final slice only | No |
| `reviewer` | `## Final message format` | Multi-section: `PR description drafted.`, `Open issues found: <N>`, numbered issue list, `Relevant file paths:` (markdown links), `Suggested PR-create command:` | Structured, open-ended (issue list + file list variable length) | No — PR create is the final step, reviewer does not next-stage | No |

Key observation: no agent has a section labelled "output contract" distinct from "Final message format". The implementer's per-slice format is the most verbose, with 8 required sections, several of which are declared non-optional ("use `none` if there really are none").

---

### Lint checks (`scripts/lint.mjs`)

All 11 checks run in order; errors are collected before exit (not fail-fast). Exits 0 (pass) or 1 (any violation). No npm dependencies — Node.js built-ins only.

| Check | Function | One-line description |
|---|---|---|
| 1 | `checkPinAgreement` | Every hand-maintained OpenSpec version pin (`@fission-ai/openspec@X.Y.Z` or `openspec_version: X.Y.Z`) must agree on a single version across all files. Excludes `generatedBy:` lines in `claude/skills/openspec-*/` and the entire `openspec/changes/` subtree. |
| 2 | `checkFrontmatter` | Every agent must have `name:` + `description:`; every command must have `description:`; every skill must have `name:` + `description:`; `agent:` references must resolve to `claude/agents/<name>.md`; `model:` must use aliases only (`opus`, `sonnet`, `haiku`). Includes `checkSkillRefs` sub-check. |
| 3 | `checkHeadingAlignment` | The canonical section headings from each `openspec-templates/*.template.md` must also appear in the matching agent file's inline skeleton. Hard-coded expected-headings map per template (see `TEMPLATE_CANONICAL_HEADINGS`). `tasks.template.md` has no fixed headings (dynamic format — skipped). |
| 4 | `checkReadmeCoverage` | Bidirectional: every `claude/commands/<stem>.md` must appear in README.md as `/qrspi:<stem>`; every `/qrspi:<token>` in README.md must resolve to `claude/commands/<token>.md`. |
| 5 | `checkGateExecutor` | No command with a non-builtin `agent:` frontmatter may reach `AskUserQuestion` directly (inline) or transitively via workflow choreography references (`workflow` skill + choreography marker strings). |
| 6 | `checkMigrationManifests` | Three sub-checks: (a) presence — every CHANGELOG `## [X.Y.Z]` at or above floor `0.6.0` must have `migrations/<version>.yaml`; (b) schema — each manifest must have keys `version`, `summary`, `automated`, `manual`; `automated[].action` must be `edit-file`; `automated[].path` must start with `openspec/`; (c) marker format — `openspec/.qrspi-version` (if present) must be bare SemVer. |
| 7 | `checkReadContracts` | Each of the seven stage agents must carry a parseable `> **Read contract** — Reads: ... Never opens: ...` banner whose `Reads:` field exactly equals the value in `READ_CONTRACT_EXPECTED` (after whitespace normalisation). Banner-keyed positive check only; `Never opens:` list is ignored. |
| 8 | `checkPrReconciliationPasses` | `claude/commands/pr.md` must contain the tasks-pass heading (`## Tasks pass`), the follow-ups-pass heading (`## Follow-ups pass`), and all required choice-label anchor strings (`Finish it now`, `Drop -- no longer needed`, `Pause --`, `Fix now`, `Defer --`, `Promote to backlog`). |
| 9 | `checkVersionCheckEmbed` | The nine stage command files (`status`, `questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`) must each contain the exact string `Load skill \`qrspi-version-check\` and follow its instructions exactly.` (whitespace-collapsed). |
| 10 | `checkTriagePaths` | `claude/commands/followup.md` must contain the three triage choice-label anchors: `P1 — implement directly`, `P2 — amend this change in place`, `P3 — defer`. |
| 11 | `checkNoCrudSkeletonHeadings` | The twelve CRUD/web-app headings (`## Data model`, `## API`, `## UI`, etc.) must NOT appear as literal heading lines inside fenced code blocks in the five artifact-producing agent files (`questioner`, `designer`, `architect`, `planner`, `reviewer`). Disjoint with Check 3: Check 3 requires surface-independent headings present anywhere; Check 11 requires CRUD headings absent from fenced blocks. |

**Detail — Check 7 `READ_CONTRACT_EXPECTED` map** (the exact expected `Reads:` strings):

```js
{
  researcher:  'Reads: none (whole changes/<id>/ folder banned).',
  questioner:  'Reads: backlog + templates (no change-folder artifact).',
  designer:    'Reads: questions.md, research.md.',
  architect:   'Reads (S): design.md. Reads (V): proposal.md, specs/.',
  planner:     'Reads: slices.md.',
  implementer: 'Reads: tasks.md.',
  reviewer:    'Reads: full changes/<id>/ folder (by design).',
}
```

Extraction: the check parses the banner line, splits on `—` (em-dash), takes everything after the first `—` up to `Never opens:`, and normalises whitespace. String equality, case-sensitive.

**Detail — Check 2 `checkSkillRefs`**: scans body text for `Load skill(s)` lines; extracts backtick-wrapped names from those lines; also matches `load the \`X\` skill` pattern. Checks each extracted name exists as `claude/skills/<name>/` directory. Built-in agents `build` and `agent` are exempt from `agent:` resolution. `MODEL_ALIASES` = `{'opus', 'sonnet', 'haiku'}`. `BUILTIN_AGENTS` = `{'build', 'agent'}`.

---

### context-hygiene skill (`claude/skills/context-hygiene/SKILL.md`)

**Numeric thresholds:**
- Target: < 40% context window utilization at any given moment.
- Hard reset trigger: 60% — start a new session.

**Firewall/subagent guidance** (key quotes):
- "A subagent is a separate context window that does a bounded job and returns a condensed result. The orchestrator never sees the subagent's full conversation — only the final message."
- "Always invoke each QRSPI stage's bounded artifact write as a subagent via the Agent tool."
- "Tell the subagent exactly what to return in its final message (e.g., 'Return the path of the file you wrote and a 5-bullet summary'). Anything more is wasted tokens."
- "Use read-only subagents (researcher, planner, reviewer) for fact-gathering."
- "Prefer many small subagents over one mega-subagent."

**Operational checklist** (self-check items, not programmatic):
- Before session: know the stage, confirm change folder exists, close unrelated tabs.
- During session: past 40% → offload; past 60% → stop, new session.
- When delegating: one job, one return value; hidden inputs stay hidden; specify return format.

**Who references context-hygiene today:**

| File | Reference type |
|---|---|
| `claude/agents/designer.md` | Agent step 1: `Load skills … \`context-hygiene\` …` |
| `claude/agents/implementer.md` | Agent step 1: `Load skills … \`context-hygiene\` …` |
| `claude/skills/retrospective/SKILL.md` | Notes it should be loaded: `\`context-hygiene\` — keeps the retrospective conversation lean.` |
| `claude/skills/postpr-fix/SKILL.md` | Notes it should be loaded: `\`context-hygiene\` — keep the fix conversation lean…` |
| `claude/skills/workflow/SKILL.md` | Workflow section ("Each stage's bounded artifact write is delegated to a subagent via the Agent tool, so the orchestrator's context stays clean. See skill \`context-hygiene\`.") |

Agents NOT loading context-hygiene: researcher, questioner, architect, planner, reviewer. Command files do not load context-hygiene directly.

---

### Instrumentation precedent

**No agent or command currently logs, measures, or emits a context-percentage or token-count metric at stage entry.** The thresholds in context-hygiene (40%/60%) are stated as self-guidance rules in prose, not as programmatic checks. No code or prompt currently reads or reports context utilization.

**`scripts/` inventory** (complete, one file):

| File | Purpose |
|---|---|
| `scripts/lint.mjs` | CI quality gate. Runs 11 checks against the kit's own files (pin agreement, frontmatter, heading alignment, README coverage, gate-tool agreement, migration manifests, read-contract banners, PR reconciliation structure, version-check embed, triage path anchors, no CRUD skeleton headings). No npm dependencies. Exits 0/1. ~1,428 lines. |

No helper scripts for context measurement, token counting, telemetry, or stage timing exist in `scripts/`. The only script is the lint gate.

---

### Release / changelog / plugin-vs-consumer boundary

#### CHANGELOG.md structure

- Follows Keep a Changelog format.
- `## [Unreleased]` section accumulates unreleased changes under `### Added`, `### Changed`, `### Removed` subsections.
- Released versions appear as `## [X.Y.Z] - YYYY-MM-DD` sections.
- Current released version: `0.8.0` (2026-07-24).
- CLAUDE.md rule: all feature work records changes under `## [Unreleased]`; no version bump in feature PRs.

#### Migration manifest structure (`migrations/<version>.yaml`)

Required top-level keys: `version`, `summary`, `automated`, `manual`.

- `version`: bare SemVer matching filename stem.
- `summary`: free-text string or block scalar.
- `automated`: list of `{action, path, description}` items; `action` must be `edit-file`; `path` must start with `openspec/`. Can be `[]`.
- `manual`: list of freeform description strings. Can be `[]`.

Present files: `0.6.0.yaml`, `0.7.0.yaml`, `0.8.0.yaml`. Floor is pinned at `0.6.0` (hardcoded constant in lint.mjs, not derived from directory contents — prevents fail-open if floor manifest is deleted).

Example (`0.8.0.yaml`): `automated: []`, `manual` has one human-action item. No `openspec/` path edits were automated in v0.8.0.

#### `plugin.json` versioning rules

Location: `.claude-plugin/plugin.json` (not at repo root; note the `.claude-plugin/` prefix). Fields: `name`, `description`, `version`, `author`, `homepage`, `commands`, `agents` (explicit list of 7 agent paths), `skills`.

CLAUDE.md rule: version field changes only at release, never in feature work. Merging to `main` does not release; consumers install from tagged releases. The marketplace entry (`lotea-be/ai-agent-marketplace`) pins the `source` to a release tag.

#### Plugin-vs-consumer boundary

**Ships inside the plugin (available to all consumers):**
- `claude/commands/` — all slash commands
- `claude/agents/` — seven stage subagents
- `claude/skills/` — kit-shipped skills (auto-registered via `skills: ./claude/skills` in plugin.json)
- `openspec-templates/` — canonical artifact templates (bundled with plugin; NOT copied into consuming repos by `/qrspi:init`)

**Lives only in this kit repo, NOT shipped:**
- `.claude/` — project-scoped dev-tooling (dogfood, release, readme-audit commands; qrspi-stack and qrspi-release project skills)
- `scripts/lint.mjs` — CI quality gate (runs in the kit repo's own CI, not in consumer repos)
- `migrations/` — migration manifests (consumed by `/qrspi:update` from the installed kit, not copied to consumers)
- `.claude-plugin/plugin.json` — manifest (read by the marketplace/harness, not by consumers directly)
- `CHANGELOG.md`, `CONTRIBUTING.md`, `README.md` — repo documentation

**Consumer-side `openspec/` path:** consumers have `openspec/` in their own repos (created by `/qrspi:init`). Trimming a skill or agent from the plugin does NOT touch any consumer's `openspec/` folder — those are separate filesystems. Migration manifests in `migrations/` instruct consumers to edit their own `openspec/` paths, but only files under `openspec/` (by manifest schema constraint). No plugin file ships into a consumer's `openspec/`.

---

## Public API surface

No HTTP endpoints. The "public surface" is the slash-command set exposed to Claude Code users:

- `/qrspi:init` — bootstrap OpenSpec in a repo
- `/qrspi:stack` — bootstrap/refresh the stack-cheatsheet skill
- `/qrspi:status` — print stage map and recommend next command
- `/qrspi:questions <id>` — stage Q
- `/qrspi:research <id>` — stage R
- `/qrspi:design <id>` — stage D
- `/qrspi:structure <id>` — stage S
- `/qrspi:slices <id>` — stage V
- `/qrspi:plan <id>` — stage P
- `/qrspi:implement <id>` — stage I
- `/qrspi:pr <id>` — stage PR
- `/qrspi:followup <id>` — post-PR fix loop
- `/qrspi:archive <id>` — archive after merge
- `/qrspi:update [version]` — migrate repo to newer kit version
- `/qrspi:retro <id> <stage>` — retrospective

Dev-tooling only (not shipped, `.claude/commands/`):
- `/qrspi-dogfood` — run dogfood verification
- `/qrspi-readme-audit` — README drift audit
- `/qrspi-release` — cut a release

---

## Data model

No database. Key in-memory/disk state structures:

- **Change folder** `openspec/changes/<id>/`: artifact files per stage (questions.md, research.md, design.md, proposal.md, specs/, slices.md, tasks.md, pr.md, followups.md, retrospective.md)
- **`openspec/.qrspi-version`**: bare SemVer string, the consumer repo's kit version marker
- **`openspec/backlog.md`**: flat list of rows, each a level-3 heading `### <id> — \`<status> (<note>)\`` grouped under level-2 status sections
- **`openspec/specs/<capability>/spec.md`**: base specs (current truth after archival)
- **`migrations/<version>.yaml`**: migration manifests with schema `{version, summary, automated[], manual[]}`
- **`.claude-plugin/plugin.json`**: plugin manifest `{name, description, version, author, homepage, commands, agents[], skills}`
- **`~/.claude/plugins/installed_plugins.json`** (consumer environment): JSON shape `{ "plugins": { "qrspi@<marketplace>": [{ "version": "X.Y.Z" }] } }`

---

## Implicit contracts and conventions

1. **Skill-load order is prescribed.** Every agent has an explicit step 1 that loads skills before doing any work. `qrspi-version-check` must be the first step of every stage command.
2. **`AskUserQuestion` is main-loop-only.** No subagent may call it; all gates that need human interaction are orchestrated by the command (main loop), not the agent. Lint Check 5 enforces this for commands with `agent:` frontmatter.
3. **Banners are machine-readable.** The `> **Read contract**` banner uses an exact format — em-dash separator, `Reads:` field, `Never opens:` clause — that lint Check 7 parses programmatically. Banner text must match `READ_CONTRACT_EXPECTED` exactly (whitespace-normalised).
4. **Skill refs must resolve.** Every backtick-wrapped name after `Load skill(s)` or `load the \`X\` skill` in any agent body must correspond to a real `claude/skills/<name>/` directory. Check 2 enforces this.
5. **No `agent:` + choreography in the same command.** A command with non-builtin `agent:` frontmatter routes entirely to a subagent and cannot reach `AskUserQuestion`; commands that need choreography gates run on the main loop with no `agent:` frontmatter (or use `agent: build`/`agent: agent` builtins).
6. **Version bump only at release.** `plugin.json` version changes only when cutting a tagged release; feature PRs always leave it untouched and record changes under `## [Unreleased]`.
7. **No `git add -A` anywhere.** All commit steps explicitly name files to stage. This is stated in both the workflow skill and repeated in individual commands.
8. **Final message is the subagent's only output to the orchestrator.** The orchestrator never sees the subagent's full conversation; the Final message format is the only channel. This is the primary reason for the tight, bounded formats.
9. **Skill discovery via Glob, not shell.** The pattern `.claude/skills/*/SKILL.md` is used by all agents to find the stack-cheatsheet skill. CLAUDE.md prohibits shell-injection in command files.
10. **Divergence self-check before returning.** Agents S (architect at Structure), V (architect at Slices), P (planner), and I (implementer per slice) must self-assess their output against the divergence rubric in workflow before emitting the final message.
11. **`@file` injections happen at command (orchestrator) level, not agent level.** The `@requirements.md`, `@tech-stack.md` directives in `questions.md` and `design.md` inject into the orchestrator context, not into the spawned subagent.

---

## Open gaps

- [ ] Could not determine whether a lint check or agent instruction currently surfaces context-window utilization to the user in any form (confirmed absent in agents and scripts, but no visibility into runtime harness behavior).
- [ ] No information on whether `followup.md` intentionally omits the version-check embed (Check 9 scope is the nine stage commands, not the followup command) — the absence appears deliberate but is not explained in the files read.
- [ ] The `@file` auto-injection mechanism (`@requirements.md`, `@tech-stack.md`, `@openspec/backlog.md`) is documented by usage but no specification of the injection mechanism itself was found in the files read. How these are processed by the harness (size limit, failure mode if file absent) is not recorded in any kit file.
- [ ] The `retrospective` skill (`claude/skills/retrospective/SKILL.md`) was not fully read — its per-stage file table and friction categories were referenced but not mapped in full. The retro command reads it as a dependency.
- [ ] The `repo-surface` skill (`claude/skills/repo-surface/SKILL.md`) was not read — it is loaded by questioner, designer, architect, planner, and reviewer, and controls which artifact sections are emitted. Its full taxonomy and inference rules were not mapped.
