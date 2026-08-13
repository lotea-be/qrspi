# Proposal — researcher-apply-surface-gate

> Stage S of QRSPI. Generated 2026-08-13.

## Why

The researcher agent loads `repo-surface` (so Check 2b passes) and its output
skeleton carries the surface-to-heading mapping as an advisory comment, but
`## What to do` step 1 contains no operative gate instruction. The result is that
the researcher can emit absent-surface inventory headings (e.g. `## Data model`
in a repo without `data-store`). That miss surfaces only at CI time via Check 14
— mid-implementation, far from its stage-R cause. Adding one concise instruction
sentence to step 1 closes the gap at the source, while a new static lint check
(D6) guards the instruction against silent regression, and matching template
comments (D7) close the template/agent consistency gap.

## What Changes

- `claude/agents/researcher.md` step 1 gains one gate-instruction sentence
  pointing at `repo-surface` for surface-gated inventory section suppression.
- `scripts/lint.mjs` gains a new static lint check (Check 24) that asserts the
  gate-instruction phrase is present in the researcher's step 1.
- `openspec-templates/research.template.md` gains per-section
  `<!-- SURFACE-GATED: … -->` comments on its surface-gated inventory sections,
  matching the `questions.template.md` convention.
- No changes to: the researcher's output skeleton, the skill registry
  (`scripts/skill-sets.mjs`), `claude/commands/research.md`, or any migration
  manifest.

## Capabilities

### New Capabilities

- _none_

### Modified Capabilities

- `researcher-surface-gating`: The researcher's `## What to do` step 1 gains an
  explicit gate-instruction sentence directing the agent to apply the surface-gate
  rule per `repo-surface` — needs a delta spec.
- `ci-quality-gates`: A new Check 24 static lint assertion is added that verifies
  the gate-instruction phrase is present in `claude/agents/researcher.md` step 1 —
  needs a delta spec.
- `research-template`: `openspec-templates/research.template.md` gains per-section
  `<!-- SURFACE-GATED: … -->` comments matching the questions template convention —
  needs a delta spec.

## Impact

- Breaking changes: no — prose-only agent edit, CI-only lint addition, and
  template comment additions; no runtime contract change
- Phases: phase 1, single epic
- Affected code / APIs / dependencies: `claude/agents/researcher.md`,
  `scripts/lint.mjs`, `openspec-templates/research.template.md`

## Out of scope

The following items are explicitly out of scope for this change and are tracked
as standalone backlog rows: `git-host-and-remote-awareness` and
`lint-auto-mode-gate-coverage` (the remainder of the Tier 1.6 cluster, per Q24
and Q25 in the design). Do NOT add these to the backlog from this change — they
already exist as backlog rows.
