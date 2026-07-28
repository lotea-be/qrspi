# Proposal — unify-implement-paths-on-variants

> Stage S of QRSPI. Generated 2026-07-27.

## Why

When `per-slice-compute-tier` shipped effort-variant dispatch, every _normal_
`/qrspi:implement` slice path began routing through `qrspi:implementer-<effort>`
variants. Two paths were left behind: `/qrspi:followup` (FIX MODE) still spawned
the base `qrspi:implementer`, and `/qrspi:implement`'s trivial inline-plan branch
had no explicit dispatch at all. The base `claude/agents/implementer.md` became a
dead route for the normal flow yet remained load-bearing as the anchor for three
lint responsibilities (Check 7 read-contract banner, Check 12 output-contract
banner, `SKILL_SET_EXPECTED` skill-set entry). This change eliminates the
asymmetry: every implementer spawn — normal slice, FIX MODE, and the trivial
inline-plan path — routes through an effort-variant; the base agent is deleted and
its responsibilities are redistributed cleanly. A bundled rider adds the
cwd/change-folder invariant note to all eleven change-folder-resolving commands,
rounding out the road-to-1.0 command-surface cleanup.

## What Changes

- `claude/commands/followup.md` — FIX MODE spawn rewired from bare
  `qrspi:implementer` to `qrspi:implementer-<effort>` (default `medium`);
  `effort=` token parsed from the optional inline `(compute: …)` spec.
- `claude/commands/implement.md` — trivial / no-`tasks.md` inline-plan path
  made explicit: spawn `qrspi:implementer-medium` with `model: sonnet`.
- `claude/agents/implementer.md` — **deleted**; removed from `plugin.json`
  `agents` array (10 → 9 agent paths).
- `claude/agents/implementer-{low,medium,high}.md` — gain full Read/Output
  contract banners (verbatim match required by Check 7/12).
- `claude/skills/implementer-core/SKILL.md` — `description:` updated to drop
  the `implementer.md` mention.
- `scripts/lint.mjs` — `READ_CONTRACT_EXPECTED` and `SKILL_SET_EXPECTED` maps
  updated: `implementer` key removed, three variant keys added; Check 15 gains
  sub-check (e) asserting `implementer.md` absent from `plugin.json`; new
  Check 16 asserts `followup.md` never spawns the bare base stem.
- `claude/commands/{questions,research,design,structure,slices,plan,implement,pr,followup,archive,retro}.md`
  — one-line cwd/change-folder note added after each file's Glob/precondition
  line (all eleven change-folder-resolving commands).
- `migrations/0.10.0.yaml` — one `manual` note appended for consumers who have
  locally overridden `followup.md`.
- `README.md` — Check 7/12 descriptions updated (6 stage agents + 3 variants,
  not "seven stage agents"); Check 15 description gains sub-check (e) and the
  note that variants now carry banners; base-implementer inventory removed;
  `CHANGELOG.md` gains a `## [Unreleased]` entry.

## Capabilities

### New Capabilities

- _none_

### Modified Capabilities

- `ci-quality-gates`: Check 7/12 `READ_CONTRACT_EXPECTED` scope expands from 7
  to 9 agents (remove `implementer`, add three variants); Check 15 gains
  sub-check (e) (base absent from `plugin.json`); new standalone Check 16
  (`followup.md` never spawns bare base stem) — needs a delta spec.
- `implementer-variants`: Base `implementer.md` deleted and its
  responsibilities (Read/Output banners, skill-set entry) relocated to the
  three variants; `implementer-core` description updated — needs a delta spec.
- `followup-triage`: P1 path FIX MODE spawn rewired from `qrspi:implementer`
  to `qrspi:implementer-<effort>`, default `medium` — needs a delta spec.
- `compute-selection`: Trivial inline-plan path made explicit
  (`implementer-medium`); `followup.md` effort-routing for the FIX MODE
  `(compute: effort=…)` token formalised — needs a delta spec.
- `qrspi-command-surface`: cwd/change-folder invariant note added to all eleven
  change-folder-resolving commands — needs a delta spec.
- `kit-governance`: One `manual` note appended to `migrations/0.10.0.yaml`;
  `README.md` and `CHANGELOG.md` synced per CLAUDE.md contract — needs a delta
  spec.

## Impact

- Breaking changes: no consumer-visible API or command surface change; the
  base `qrspi:implementer` subagent is removed from the plugin registry (kit
  authors who spawned it by name in custom commands will need to target a
  variant).
- Phases: Slice 1 (FIX MODE + trivial path routing), Slice 2 (delete base +
  relocate responsibilities), Slice 3 (tighten guards: Check 15(e) + Check 16),
  Slice 4 (cwd note rider + docs sync).
- Affected code / APIs / dependencies: `claude/commands/followup.md`,
  `claude/commands/implement.md`, `claude/agents/implementer.md` (deleted),
  `claude/agents/implementer-{low,medium,high}.md`, `plugin.json`,
  `scripts/lint.mjs`, `claude/skills/implementer-core/SKILL.md`,
  `claude/commands/{questions,research,design,structure,slices,plan,pr,archive,retro}.md`,
  `migrations/0.10.0.yaml`, `README.md`, `CHANGELOG.md`.

## Out of Scope

The following backlog items are explicitly deferred and MUST NOT be implemented
in this change:

- `richer-effort-vocab-and-thinking` — adding new effort tiers (`xhigh`,
  `max`) or a `thinking=` token. `IMPLEMENTER_VARIANTS` remains `{low, medium,
  high}`.
- `compute-escalation-on-failure` — automatic re-spawn at a higher effort tier
  when a slice fails. This change is its prerequisite (FIX MODE must use
  variants first) but implements none of the escalation logic.
