# Proposal — tighten-stage-read-boundaries

> Stage S of QRSPI. Generated 2026-07-15.

## Why

QRSPI's seven Q→PR stage agents share an unrestricted `Read` tool grant but
have no enforced read boundaries. Today the architect opens `questions.md`,
`research.md`, and `design.md` at stage S when only `design.md` is needed; the
planner opens `design.md` when only `slices.md` is needed; the questioner skims
an archived `questions.md` from another change folder; and the designer honours
triggers recorded in a prior change's `design.md` — a cross-change read. These
redundant reads burn tokens, blur stage responsibilities, and create a risk of
context contamination between flows. The goal is to tighten every agent to its
minimum approved read set (the read-matrix from D's Data model section), make
the D-number traceability chain self-carrying so Plan and Implement never touch
`design.md`, document the matrix centrally and per-agent as a machine-readable
banner, and back the prose boundary with a new lint check (Check 7). A
`migrations/<version>.yaml` entry is also required by the release gate (lint
Check 6) that shipped with `versioned-update-command`.

## What Changes

- All seven stage-agent files (`claude/agents/*.md`) receive tightened read
  prose, an explicit cross-change boundary clause, and a uniform read-contract
  banner at the top of the file.
- The architect's stage-S read list drops `questions.md` and `research.md`;
  the S "Open questions surfaced" final-message field is reworded.
- The architect's `slices.md` output shape gains a required `(D<n>)` tag-embed
  rule so D-numbers are self-carried from V → tasks.md → implementer without
  any downstream `design.md` read.
- `openspec-templates/tasks.template.md` has the stale `worktree.md` label
  fixed to `slices.md` and gains the `(D<n>)` embed note aligned with V.
- The planner's read list becomes `slices.md` only; `design.md`, `proposal.md`,
  and `specs/` are removed from its input list.
- The implementer's read list remains `tasks.md` only; a new hard-stop clause
  covers the case where a slice conflicts with a design decision (stop-and-ask,
  not a `design.md` read).
- The researcher's change-folder ban widens from `questions.md` alone to the
  whole `openspec/changes/<id>/` folder.
- The questioner drops its archived-example read (cross-change, now forbidden)
  and references `openspec-templates/questions.template.md` and its inline shape
  instead.
- The designer's trigger-source is relocated from archived `design.md` reads to
  base specs (`openspec/specs/**` via the permitted `spec.md` exception).
- `claude/skills/workflow/SKILL.md` gains a Read-Matrix table near "The eight
  stages" section documenting the per-agent read set and the cross-change
  boundary / `spec.md` exception as the single source of truth.
- `scripts/lint.mjs` gains Check 7: a banner-keyed positive check that parses
  each agent banner's `Reads:` field and asserts it equals the expected matrix
  row for that agent.
- A new `migrations/<version>.yaml` entry ships (empty `automated`, one `manual`
  note about realigning locally-overridden agent files).
- `CHANGELOG.md` `## [Unreleased]` entry added.
- `copilot/` is regenerated via `node sync-copilot.mjs` — never hand-edited.

## Capabilities

### New Capabilities

- `qrspi-read-contracts`: Per-stage read-matrix contract and cross-change
  boundary for the seven QRSPI stage agents — creates
  `specs/qrspi-read-contracts/spec.md`.

### Modified Capabilities

- `ci-quality-gates`: New lint Check 7 (banner-keyed read-contract
  string-search) added to the CI lint job — needs a delta spec.

## Impact

- Migrations: yes — `migrations/<version>.yaml` ships with this change
  (empty `automated`, one `manual` note for repos with locally-overridden
  stage-agent files). Required by lint Check 6.
- Breaking changes: no functional breaking changes for users. Consuming repos
  that have locally overridden any stage-agent file must re-align to the new
  read contracts (covered by the migration manual note).
- Phases: single phase; no multi-epic breakdown needed. All five design slices
  (within-change narrowing + banners, D-number self-carry, cross-change
  boundary + trigger relocation, documentation + lint gate, migration +
  changelog) are in-scope and sequential.
- Affected code / APIs / dependencies: `claude/agents/*.md` (all 7),
  `claude/skills/workflow/SKILL.md`, `openspec-templates/tasks.template.md`,
  `scripts/lint.mjs`, `migrations/<version>.yaml`, `CHANGELOG.md`,
  `copilot/**` (regenerated).

## Out of scope

- Tool-level / path-level read enforcement — no such mechanism exists in the
  Agent tool today. The lint is a prose floor only.
- `enforce-research-ticket-hiding` — mechanical guard on the researcher, sequenced
  after this change.
- Changing what the designer *writes* into `design.md`.
- Changing the divergence rubric / hard-stop conditions.
- Read-contract banner / lint coverage for `/qrspi:update` + `qrspi-update`
  (PQ13 — they read migration manifests and the `.qrspi-version` marker, not
  change-folder artifacts, and are not Q→PR stage agents).
- D-number-presence lint check (backlogged as `enforce-d-number-tags-in-slices`).
- Command-file rewording: OQ5 confirmed restrictions live in agent files only;
  a verification pass over command bodies confirms none implies a forbidden read.
