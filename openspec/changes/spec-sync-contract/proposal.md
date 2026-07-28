# Proposal — spec-sync-contract

> Stage S of QRSPI. Generated 2026-07-28.

## Why

The archive-time delta-spec sync silently loses scenarios when a `## MODIFIED
Requirements` block omits unchanged scenarios. The root cause is twofold: the
generated `openspec-sync-specs` skill instructs the agent to *preserve* scenarios
not mentioned in the delta — directly contradicting the wholesale-replacement
semantics the delta template requires — and the sync is delegated to an
unconstrained `general-purpose` agent that the kit cannot give a read contract or
the corrected merge rule. This change installs a kit-owned `spec-syncer` agent
carrying the authoritative MODIFIED = wholesale-replacement contract, makes
`/qrspi:archive` the single sync delegator, and adds two independent guard layers
(runtime hard-stop + kit-only CI check) to prevent silent scenario loss.

## What Changes

- Add `claude/agents/spec-syncer.md` — a least-privilege helper agent (Tools:
  Read, Edit, Bash, Glob, Skill) carrying the corrected delta-merge contract:
  MODIFIED = wholesale replacement of the base requirement body and entire
  scenario list; count-drop hard-stop on any MODIFIED scenario reduction.
- Register `spec-syncer` in `plugin.json`'s `agents` array.
- Rewire `claude/commands/archive.md`: insert new step 4a that spawns
  `spec-syncer` before the generated skill's folder-move; the generated skill's
  own sync spawn is bypassed (already-synced branch), never additive.
- Remove the "Sync now / Archive without syncing" happy-path prompt; retain a
  narrow escape-hatch prompt for malformed/abandoned deltas.
- Strengthen the MODIFIED comment in `openspec-templates/spec-delta.template.md`.
- Add a "Helper agents" subsection to the workflow Read Matrix with a
  `spec-syncer` row; add Check 17 for non-stage helper-agent banners.
- Add two new kit-only `scripts/lint.mjs` checks: Check 18 (MODIFIED
  scenario-count-drop guard) and Check 19 (authoritative-delegator assertion).

## Capabilities

### New Capabilities

- `spec-syncer`: Kit-owned least-privilege helper agent that owns the
  delta-merge contract and the scenario-count-drop hard-stop — creates
  `specs/spec-syncer/spec.md`.

### Modified Capabilities

- `archive-workflow`: New step 4a spawns `spec-syncer` before the folder move;
  happy-path sync prompt removed; escape-hatch prompt retained — needs a delta
  spec.
- `ci-quality-gates`: Three new lint checks: Check 17 (helper-agent banner),
  Check 18 (MODIFIED count-drop), Check 19 (authoritative-delegator) — needs a
  delta spec.
- `qrspi-read-contracts`: "Helper agents" subsection added to the Read Matrix
  with `spec-syncer` row and read contract — needs a delta spec.

## Impact

- Breaking changes: no — consumers pick up the corrected sync behaviour via
  the normal plugin update; no API surface change.
- Phases: single phase; slices 1-3 deliver the full contract.
- Affected code / APIs / dependencies: `claude/agents/spec-syncer.md` (new),
  `claude/commands/archive.md` (step 4a added; happy-path prompt removed),
  `plugin.json` (agents array), `openspec-templates/spec-delta.template.md`
  (MODIFIED comment strengthened), `claude/skills/workflow/SKILL.md` (Read
  Matrix extended), `scripts/lint.mjs` (Checks 17, 18, 19 added).
