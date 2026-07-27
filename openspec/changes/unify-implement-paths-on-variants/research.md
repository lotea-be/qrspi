# Research -- unify-implement-paths-on-variants

> Stage R of QRSPI. Generated 2026-07-27.
> Ticket is hidden from this stage by design.

## Areas investigated

- **Implementer dispatch in the implement command** -- how `claude/commands/implement.md` reads and parses `**Compute:**` annotations and selects an implementer variant subagent.
- **Implementer agent files** -- frontmatter (model, effort), body/skill-load lines, and the shared `implementer-core` skill across `implementer.md` and three variant agents.
- **Post-PR fix path** -- how `claude/commands/followup.md` and `claude/skills/postpr-fix/SKILL.md` spawn an implementer in FIX MODE.
- **Agent registry & skill-sets** -- `agents` array in `.claude-plugin/plugin.json` and `scripts/skill-sets.mjs` constants.
- **Lint checks** -- Check 2b (skill-sets), Check 7 (read-contract banners), Check 12 (output-contract banners), Check 15 (implementer variant invariant) in `scripts/lint.mjs`.
- **Command -> change-folder path resolution** -- how stage commands address `openspec/changes/<id>/` in preconditions across all `claude/commands/*.md`.
- **Migration manifest** -- structure and schema of `migrations/0.10.0.yaml`.

## File map

### Implementer dispatch in the implement command

- `claude/commands/implement.md` -- main-loop orchestrator for QRSPI stage I. No `agent:` or `model:` frontmatter (it is a main-loop command). Reads `openspec/changes/<id>/tasks.md` directly.

### Implementer agent files

- `claude/agents/implementer.md` -- base implementer agent. Frontmatter: `name: implementer`, `model: opus`, `effort: high`. Loads skills: `implementer-core`, `workflow`, `vertical-slice`, `context-hygiene`, plus the project's stack-cheatsheet skill. Carries `> **Read contract**` and `> **Output contract**` banners.
- `claude/agents/implementer-low.md` -- low-effort variant. Frontmatter: `name: implementer-low`, `model: sonnet`, `effort: low`. Body: a single numbered step (`1. Load skill \`implementer-core\` and follow its instructions exactly.`). No Read/Output contract banners.
- `claude/agents/implementer-medium.md` -- medium-effort variant. Frontmatter: `name: implementer-medium`, `model: sonnet`, `effort: medium`. Body: same single step as `implementer-low.md`. No Read/Output contract banners.
- `claude/agents/implementer-high.md` -- high-effort variant. Frontmatter: `name: implementer-high`, `model: sonnet`, `effort: high`. Body: same single step as `implementer-low.md`. No Read/Output contract banners. Note: frontmatter `model: sonnet`, whereas base `implementer.md` has `model: opus`.
- `claude/skills/implementer-core/SKILL.md` -- shared implementer body. Carries all preconditions, coding rules, stuck-handling, slice-mode logic, Fix-mode (post-PR) logic, and final message format. Does NOT carry Read/Output contract banners (it is a skill, not an agent).

### Post-PR fix path

- `claude/commands/followup.md` -- main-loop orchestrator for the post-PR fix loop. No `agent:` frontmatter. Spawns `implementer` (base, not a variant) via `subagent_type: qrspi:implementer`.
- `claude/skills/postpr-fix/SKILL.md` -- checklist for the implementer when in FIX MODE. Loaded by `implementer-core`'s Fix-mode section.

### Agent registry & skill-sets

- `.claude-plugin/plugin.json` -- `agents` array lists ten paths explicitly: `questioner.md`, `researcher.md`, `designer.md`, `architect.md`, `planner.md`, `implementer.md`, `implementer-low.md`, `implementer-medium.md`, `implementer-high.md`, `reviewer.md`. Skills auto-register from `./claude/skills` directory (no per-skill declaration needed).
- `scripts/skill-sets.mjs` -- exports `SKILL_SET_EXPECTED` (seven-entry object keyed by agent stem). The `implementer` entry is `['context-hygiene', 'implementer-core', 'vertical-slice', 'workflow']`. No `IMPLEMENTER_VARIANTS` constant is defined in this file. `IMPLEMENTER_VARIANTS` is defined only in `scripts/lint.mjs`.

### Lint checks

- `scripts/lint.mjs` -- CI quality gate, Checks 1-15.

### Command -> change-folder path resolution

- `claude/commands/questions.md`, `research.md`, `design.md`, `structure.md`, `slices.md`, `plan.md`, `implement.md`, `pr.md`, `followup.md`, `archive.md`, `status.md` -- all stage commands.

### Migration manifest

- `migrations/0.10.0.yaml` -- migration manifest for the `0.10.0` grammar swap.

## Public API surface

(This repo has no HTTP API. The public surface is the set of slash commands and spawnable subagent types.)

**Slash commands (claude/commands/):**
- `/qrspi:implement <id>` -- reads `openspec/changes/<id>/tasks.md`, parses the next un-ticked slice's `**Compute:**` line, spawns an implementer variant subagent.
- `/qrspi:followup <id>` -- runs the post-PR fix loop; spawns `qrspi:implementer` (base) in FIX MODE.

**Spawnable subagent types (via Agent tool):**
- `qrspi:implementer` -- base implementer (opus, effort high). Used by `/qrspi:followup`.
- `qrspi:implementer-low` -- low-effort variant (sonnet, effort low). Used by `/qrspi:implement` when `effort=low`.
- `qrspi:implementer-medium` -- medium-effort variant (sonnet, effort medium). Used by `/qrspi:implement` when `effort=medium`.
- `qrspi:implementer-high` -- high-effort variant (sonnet, effort high). Used by `/qrspi:implement` when `effort=high`.

## Data model

**`**Compute:**` annotation grammar (as of 0.10.0):**
- `effort=` -- REQUIRED. Values: `low`, `medium`, `high`. Selects the implementer variant subagent.
- `model=` -- OPTIONAL. Defaults to `sonnet` when absent. Values: `sonnet`, `opus`, `haiku`. Passed as Agent tool `model:` parameter, overriding the variant's frontmatter `model:`.
- Structural forms: dash-bullet (`- **Compute:** ...`) in `slices.md`; bare bold (`**Compute:** ...`) in `tasks.md`.
- Token order is free (effort= or model= may come first).

**Implementer variant dispatch table:**

| `effort=` token | `subagent_type`           | Variant frontmatter `model:` | Variant frontmatter `effort:` |
|-----------------|---------------------------|------------------------------|-------------------------------|
| `low`           | `qrspi:implementer-low`   | `sonnet`                     | `low`                         |
| `medium`        | `qrspi:implementer-medium`| `sonnet`                     | `medium`                      |
| `high`          | `qrspi:implementer-high`  | `sonnet`                     | `high`                        |

**FIX MODE dispatch (followup.md):**

| Condition                         | `subagent_type`       | `model:` passed  |
|-----------------------------------|-----------------------|------------------|
| No inline `(compute: model=…)`    | `qrspi:implementer`   | `sonnet` (explicit) |
| Inline `(compute: model=X)`       | `qrspi:implementer`   | `X` (parsed)    |

Note: `effort=` from an inline `(compute: …)` spec in `followup.md` is NOT passed as a per-invocation parameter (no per-invocation effort param on the Agent tool). The implementer's frontmatter `effort: high` applies by default for fix mode.

**Migration manifest schema (from `migrations/*.yaml`):**

Required top-level keys: `version`, `summary`, `automated`, `manual`.
- `version` -- bare SemVer string matching the filename stem.
- `summary` -- string or YAML block scalar (`>`).
- `automated` -- list of objects with `action` (must be `edit-file`), `path` (must start with `openspec/`), `description`.
- `manual` -- list of string items (step descriptions for the human to perform).
- An empty list is written as `[]`.

## Implicit contracts and conventions

1. **`effort=` is required in annotations; `model=` is optional.** `implement.md` hard-stops when `effort=` is absent from a slice's `**Compute:**` line. An absent `model=` silently defaults to `sonnet`.

2. **Variant subagent namespacing requires `qrspi:` prefix.** The implement command uses `qrspi:implementer-<effort>` -- the `qrspi:` prefix is mandatory because agents are namespaced by the plugin name. An unregistered agent path cannot be spawned.

3. **Variants must be listed in `plugin.json` `agents` array explicitly.** Skills auto-register from the `skills:` directory, but agents are an explicit array. A variant file existing in `claude/agents/` is NOT sufficient for it to be spawnable -- it must also appear in `.claude-plugin/plugin.json`.

4. **Variants delegate entirely to `implementer-core`.** Each variant's body is a single numbered step loading only `implementer-core`. Check 15 (variant drift gate) asserts this: it flags any variant that loads a skill other than `implementer-core` in its step-1 line.

5. **Read/Output contract banners are on the base `implementer.md` only, not on variants.** Check 7 (read-contract) and Check 12 (output-contract) both scope to exactly the seven stage agents named in `READ_CONTRACT_EXPECTED`: researcher, questioner, designer, architect, planner, implementer, reviewer. The three variants (`implementer-low.md`, `implementer-medium.md`, `implementer-high.md`) are NOT in this set and carry no banners. The variants are also outside `SKILL_SET_EXPECTED` in `skill-sets.mjs` (Check 2b does not check them).

6. **`followup.md` always spawns the base `implementer` agent, never a variant.** The base agent has `model: opus` and `effort: high` in its frontmatter. The FIX MODE default overrides the model to `sonnet` via an explicit `model:` Agent-tool parameter; the orchestrator MUST pass this parameter explicitly (it cannot be omitted to let the frontmatter win silently).

7. **The `model:` Agent-tool parameter overrides the variant's frontmatter `model:`.** Both `implement.md` and `followup.md` pass `model:` explicitly on Agent-tool invocations. The per-slice `model=` token (or the followup inline spec) is the source of truth; the variant frontmatter `model:` is the fallback that applies only when no Agent-tool `model:` is given.

8. **Command -> change-folder path resolution is entirely Glob-based.** Every stage command uses the Glob tool (never shell commands) to verify precondition artifacts at paths like `openspec/changes/<id>/tasks.md`. All paths are relative to the consumer repo's CWD. No command currently handles the case where the CWD differs from where `openspec/` lives (e.g., if the command is invoked from a subdirectory or from the plugin-install directory rather than the consumer repo root).

9. **Skill-sets are a single source of truth in `scripts/skill-sets.mjs`.** The `SKILL_SET_EXPECTED` object is imported by both `scripts/lint.mjs` (Check 2b) and `scripts/context-footprint.mjs`. The `implementer` entry lists four skills: `context-hygiene`, `implementer-core`, `vertical-slice`, `workflow`. Variant agents are NOT in this registry.

10. **The `IMPLEMENTER_VARIANTS` constant is defined only in `scripts/lint.mjs`.** It is not imported from `skill-sets.mjs` or any shared module. Its value is `['implementer-low', 'implementer-medium', 'implementer-high']`.

11. **Check 15 has four sub-checks: exact set, step-1 load, effort match, plugin registration.** Sub-check (d) (plugin registration) asserts each variant in `IMPLEMENTER_VARIANTS` appears in `plugin.json`'s `agents` array.

12. **The base `implementer.md` frontmatter has `model: opus`.** The three variants all have `model: sonnet`. When `/qrspi:implement` spawns a variant with an explicit `model:` Agent-tool parameter, that parameter overrides the variant's `sonnet` frontmatter value for the invocation.

13. **Paths in stage commands are always written as `openspec/changes/<id>/...`.** They assume Glob resolution relative to the consumer repo CWD. The `qrspi-version-check` skill explicitly notes that "a real consumer's CWD is their repo, not the kit" when explaining why `installed_plugins.json` is used instead of `plugin.json` for version-B reading.

## Notable discrepancies

- The base `implementer.md` has `model: opus` and `effort: high` in its frontmatter. The `implementer-high.md` variant also has `effort: high` but `model: sonnet`. The base agent is used for FIX MODE (followup path) and receives an explicit `model: sonnet` override from the orchestrator; the variant is used for high-effort slices in stage-I and also receives an explicit `model:` override. The two agents thus share the same `effort: high` frontmatter value but differ on `model:`.

- Check 2 (`checkFrontmatter`) requires every agent to carry both `name:` and `description:` AND an `effort:` frontmatter field (validated against `COMPUTE_EFFORTS`). The three variant agents satisfy this. The seven stage agents also satisfy it.

- `IMPLEMENTER_VARIANTS` in `lint.mjs` is not sourced from `skill-sets.mjs` -- it is a separate hardcoded constant. If a new variant were added, it would need to be registered in three places: `plugin.json`, `scripts/lint.mjs` (`IMPLEMENTER_VARIANTS`), and the matching agent file must be created.

## Open gaps

- [ ] Cannot confirm whether `followup.md`'s explicit `model: sonnet` Agent-tool parameter actually overrides the base `implementer.md`'s `model: opus` frontmatter at runtime (the behavior of the Agent tool when both frontmatter and per-invocation `model:` are specified is documented in `implement.md` prose but not verifiable from static reading alone).
- [ ] Could not determine whether there is any path in the codebase where a variant agent is spawned outside of `implement.md` (e.g. a future or draft command). Only `followup.md` was examined alongside `implement.md` for dispatch logic.
- [ ] No examination of `claude/commands/retro.md` or `claude/commands/archive.md` for any implementer spawn paths (the areas of interest did not request these, but they may be relevant if the fix loop touches them).
