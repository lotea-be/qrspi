# Proposal — context-budget

> Stage S of QRSPI. Generated 2026-07-24.

## Why

The QRSPI kit's per-stage context surface is unbounded in practice: six of
seven stage agents silently load `openspec-workflow` even though only two of
them ever touch a spec/proposal artifact; `context-hygiene` covers only two
agents despite three stages doing the heaviest reads; and no machine check
confirms that each agent's declared skill set matches what it actually loads.
On the output side, five agents already return tight payloads but there is
no mechanical anchor to keep the two unbounded ones (implementer, reviewer)
from drifting. This change tightens the input surface (trim skill loads,
declare + lint the allowed set), formalises the output surface (add an
`> **Output contract**` banner to every agent plus a new lint check), adds a
static footprint estimator, and extends `context-hygiene` with a pointer to
the new enforcement so the 40% principle is no longer unbacked prose.

## What Changes

- **Skill-load trims** — remove `openspec-workflow` from researcher,
  questioner, designer, and planner (four agents that never touch a
  spec/proposal artifact); add `context-hygiene` to researcher (it was
  already on designer and implementer).
- **`SKILL_SET_EXPECTED` registry** in `scripts/lint.mjs` — a stem→array
  map declaring each agent's exact unconditional skill set, mirroring the
  existing `READ_CONTRACT_EXPECTED` shape.
- **Skill-set lint assertion** — extend Check 2 (`checkSkillRefs`) or add
  a sibling `checkSkillSets` that harvests each agent's `Load skills` line
  and asserts set equality against the registry, excluding the conditional
  `<repo>-stack` cheatsheet from the comparison.
- **`> **Output contract**` banners** — add one banner per agent (seven
  total); for implementer and reviewer add a cap sentence bounding payload
  size; for the other five, formalise the already-tight format in prose.
- **Check 12 (`checkOutputContracts`)** — new lint check asserting each of
  the seven stage agents has a line matching `/^>\s*\*\*Output contract\*\*/`.
- **`scripts/context-footprint.mjs`** — new Node script (no deps) summing
  per-stage byte/line/rough-token estimates from the declared skill sets;
  prints a table to stdout; exits 0 always.
- **`context-hygiene` enforcement pointer** — a one-line addition pointing
  to the new lint checks + footprint script so the 40%/60% numbers are backed
  by mechanism.
- **README + CHANGELOG** — document the two new checks and the new script
  under `## [Unreleased]`; no `plugin.json` version bump in this change.

## Capabilities

### New Capabilities

- `kit-context-budget`: Static per-stage context-footprint estimator
  (`scripts/context-footprint.mjs`) with its own observable contract
  (table output, exit 0) — creates `specs/kit-context-budget/spec.md`.

### Modified Capabilities

- `ci-quality-gates`: Gains two new lint checks — a skill-set allowlist
  assertion (extension of Check 2 / new `checkSkillSets`) and Check 12
  (`checkOutputContracts`) — needs a delta spec.

## Impact

- Migrations: no — kit-only file changes; no consumer migration manifest
  required (PQ6: kit-only files do not ship to consumers).
- Breaking changes: no — no command-level, API, or output-behaviour change;
  lint is additive (new checks can only fail on newly non-conformant files,
  not on the current conformant ones once the agent files are updated in
  the same change).
- Phases: 4 slices (see Vertical slices below).
- Affected code / APIs / dependencies:
  - `scripts/lint.mjs` — add `SKILL_SET_EXPECTED`, extend Check 2, add Check 12
  - `scripts/context-footprint.mjs` — new file, Node built-ins only
  - `claude/agents/researcher.md`, `questioner.md`, `designer.md`,
    `architect.md`, `planner.md`, `implementer.md`, `reviewer.md` —
    skill-load trims (four agents) + output-contract banner (all seven)
  - `claude/skills/context-hygiene/SKILL.md` — enforcement pointer
  - `README.md`, `CHANGELOG.md` — documentation update

## Vertical slices (preview)

Each slice is demoable end-to-end by running `node scripts/lint.mjs` (or
the footprint script for Slice 3):

- **Slice 1 — Input trims + skill-set registry & lint (D1, D2, D5, D6):**
  add `SKILL_SET_EXPECTED`, extend Check 2 to assert the allowlist, remove
  `openspec-workflow` from the four agents; add `context-hygiene` to
  researcher. Demoable: lint passes; deliberately adding a stray skill load
  causes Check 2 / `checkSkillSets` to fail.
- **Slice 2 — Output-contract banners + Check 12 (D4):** add the
  `> **Output contract**` banner to all seven agents (including the cap
  sentence for implementer and reviewer), add Check 12. Demoable: removing
  a banner fails Check 12.
- **Slice 3 — Footprint script (D7):** add
  `scripts/context-footprint.mjs`. Demoable: running
  `node scripts/context-footprint.mjs` prints the per-stage table.
- **Slice 4 — context-hygiene pointer + README + CHANGELOG (D3, PQ6):**
  add the enforcement pointer to `context-hygiene`, update README and
  CHANGELOG. Demoable: README lint (Check 4) passes.

## Out of scope

- Live/runtime context-% telemetry (Claude Code does not expose it to agents).
- Content-level output-contract linting (max-line-count parsing) — existence-
  only per PQ3; content-lint is a backlog candidate.
- A runtime read-set guard asserting an agent only *reads* its Read-Matrix row
  (overlaps `enforce-research-ticket-hiding` Q41 — leave to that item).
- Rewriting the implementer/reviewer verbose formats into a lossy shape (D4:
  add a banner + cap sentence, not a redesign).
- `plugin.json` version bump (CLAUDE.md: no bump in feature work; record
  under `## [Unreleased]` only).
