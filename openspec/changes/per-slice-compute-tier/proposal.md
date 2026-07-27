# Proposal — per-slice-compute-tier

> Stage S of QRSPI. Generated 2026-07-27.

## Why

`per-slice-compute-knobs` (merged 2026-07-25) made `model=` selectable
per-slice at spawn time but left effort as a static, per-stage-agent
knob — there was no per-invocation effort parameter on the Agent tool.
This change recovers per-slice effort by introducing three thin
effort-variant implementer agents (`implementer-low/medium/high.md`)
whose bodies live in a shared `implementer-core` skill, then updates
`/qrspi:implement` to resolve both tokens from each slice's `**Compute:**`
line. Alongside this, `haiku` is promoted from a lint alias to a
first-class `model=` value with a documented "purely mechanical" heuristic,
and a new lint Check 15 prevents the variant fleet from drifting. All nine
`model × effort` combinations become independently reachable.

## What Changes

- New `claude/skills/implementer-core/SKILL.md` — the shared body for all
  implementer agents; replaces the inline body currently in `implementer.md`.
- New `claude/agents/implementer-low.md`, `implementer-medium.md`,
  `implementer-high.md` — thin shells; each loads `implementer-core` as step 1
  and carries its own `effort:` frontmatter field.
- Modified `claude/agents/implementer.md` — body refactored to load
  `implementer-core`; read/output-contract banners stay; `SKILL_SET_EXPECTED`
  registry entry gains `implementer-core`.
- Modified `claude/commands/implement.md` — resolution logic updated at two
  edit sites (main spawn + auto-mode loop): parse `effort=` (now required;
  hard-stop if absent) + `model=` (optional, default sonnet); map effort to
  `subagent_type`; spawn with `model:`.
- Modified `scripts/lint.mjs` — two edits: (a) `COMPUTE_MODELS` gains `haiku`;
  adjacent comment updated. (b) New `checkVariantAgents` (Check 15) added after
  Check 14, with inline self-test.
- Modified `claude/skills/vertical-slice/SKILL.md` — `### Choosing model=sonnet
  vs model=opus` section retitled and extended with a `model=haiku` band and
  haiku tie-break rule; annotation grammar updated to orthogonal form.
- Modified `openspec-templates/slices.template.md` and `tasks.template.md` —
  grammar comment updated to orthogonal form (`effort=` required, `model=`
  optional / default sonnet; no `profile=`).
- New `migrations/<version>.yaml` — documents the breaking grammar swap
  (effort now required, model now optional/default sonnet).

## Capabilities

### New Capabilities
- `implementer-variants`: Three effort-variant implementer agents and the shared
  `implementer-core` skill that backs all four implementer files — creates
  `specs/implementer-variants/spec.md`.

### Modified Capabilities
- `compute-selection`: Grammar becomes orthogonal (`effort=` required,
  `model=` optional/default sonnet); `haiku` added to the allowed model set;
  `implement.md` resolution updated to match; `vertical-slice` docs and template
  grammar comments updated — needs a delta spec.
- `ci-quality-gates`: Check 13 `COMPUTE_MODELS` gains `haiku` (and the
  "missing model=" violation flips to "missing effort="); new Check 15
  `checkVariantAgents` added — needs a delta spec.

## Impact

- Breaking changes: yes — `effort=` is now required in every `**Compute:**` line
  (previously optional); `model=` is now optional (previously required). Consumer
  repos whose annotations carry only `model=` (no `effort=`) will fail Check 13
  validation after upgrading. Carried by a `migrations/<version>.yaml` entry
  consumed by `/qrspi:update`.
- Phases: phase 1 (haiku + vertical-slice docs), phase 2 (implementer-core +
  base implementer refactor), phase 3 (variant agents + Check 15), phase 4
  (implement.md resolution + grammar + migration).
- Affected code / APIs / dependencies: `claude/agents/implementer.md` (body
  refactor + registry); three new agent files; `claude/skills/implementer-core/`;
  `claude/commands/implement.md` (two edit sites); `scripts/lint.mjs` (Check 13
  constant + Check 15); `claude/skills/vertical-slice/SKILL.md`; two
  `openspec-templates/` files; one new `migrations/<version>.yaml`.
