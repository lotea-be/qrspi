# Proposal — architect-must-leads-requirement-first-line

> Stage S of QRSPI. Generated 2026-07-29.

## Why

OpenSpec `validate --strict` (which CI runs as `validate --all`) reads only the
**first physical line** of a requirement body when checking for `MUST`/`SHALL`.
An architect that opens a requirement body with a `When …` clause and lets `MUST`
fall to line 2 produces a delta that passes non-strict local validation but
hard-stops the Implement stage at CI's strict gate — far from where the body
was authored. This change surfaces the rule visibly at authoring time (D1, D2),
enforces it mechanically at S-commit via a new lint guard (D3–D8), and adds a
parity guard to prevent the two hand-synced copies of the Format-rules guidance
from drifting apart (D9 / OQ2). It also fixes a stale check-inventory range in
the `qrspi-stack` cheatsheet (OQ3).

## What Changes

- `claude/agents/architect.md` — add a bolded `**Warning —**` prose paragraph
  immediately before the "New capability" delta-spec skeleton (D1); mirror the D2
  permitted/forbidden counter-example into the existing Format-rules bullet,
  wrapped in sentinel comments `<!-- must-leads:begin/end -->` (D2, D9).
- `openspec-templates/spec-delta.template.md` — add the D2 permitted/forbidden
  counter-example to the Format-rules section, wrapped in matching sentinel
  comments (D2, D9).
- `scripts/lint.mjs` — add Check 20 (`checkRequirementFirstLineModal`) scanning
  delta specs (ADDED+MODIFIED, skip REMOVED) and base specs (`## Requirements`),
  flagging any requirement whose first non-blank body line lacks `MUST`/`SHALL`;
  add Check 21 (`checkFormatRulesParity`) asserting the sentinel-delimited
  Format-rules bullet is byte-identical between `architect.md` and
  `spec-delta.template.md`; update the check-inventory header comment to list
  Checks 20–21 (D3–D9).
- `.claude/skills/qrspi-stack/SKILL.md` — fix the stale "Checks 1–14" range
  to "Checks 1–21" (OQ3).

## Capabilities

### New Capabilities

- _none_

### Modified Capabilities

- `ci-quality-gates`: Add two new lint checks (Check 20: requirement first-line
  MUST/SHALL guard; Check 21: Format-rules parity guard between `architect.md`
  and `spec-delta.template.md`) and document the authoring-guidance preconditions
  that the checks enforce — needs a delta spec.

## Impact

- Migrations: no — changed files are kit source delivered by plugin update; no
  consumer-workspace file changes (PQ5). A no-action stub manifest may be added at
  release time if the CHANGELOG entry meets the Check 6 floor.
- Breaking changes: no — the new lint checks only reject spec bodies that were
  already rejected by `openspec validate --strict`; no previously-passing CI run
  is made to fail (except on trees with pre-existing violations, which were already
  broken at CI).
- Phases: single phase; no epic split.
- Affected code / APIs / dependencies: `scripts/lint.mjs` (Checks 20–21 added,
  header updated), `claude/agents/architect.md` (D1 warning + D2 counter-example
  + sentinels), `openspec-templates/spec-delta.template.md` (D2 counter-example +
  sentinels), `.claude/skills/qrspi-stack/SKILL.md` (OQ3 stale range fix).

## Out of scope

- Adding a MUST-leads note to the `spec-syncer` agent (Q5 / Non-Goal in design):
  the syncer merges already-validated deltas and authors no new requirement bodies.
  Could be a separable future change if the syncer ever starts authoring bodies.
- Extracting a shared `parseRequirements(text, sectionPredicate)` helper from
  Check 18's inner scanner (D5): deferred for when a third requirement-body check
  lands; potential future backlog item.
- Enumerating a denylist of forbidden openers (`When`, `If`, `For each`) — the
  positive-invariant approach (D6) supersedes this and is more future-proof.
