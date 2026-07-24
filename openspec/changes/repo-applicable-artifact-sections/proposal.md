# Proposal — repo-applicable-artifact-sections

> Stage S of QRSPI. Generated 2026-07-24.

## Why

Every artifact-producing QRSPI stage currently stamps a fixed CRUD/web-app
skeleton into its output regardless of the repo's actual tech surface. In a
markdown/Node plugin repo like this kit — which has no data-store, HTTP API, UI,
or auth surface — this produces boilerplate (`## Data model`, `## Migrations`,
`## Auth & authorization`, etc.) that forces agents to write "Not applicable"
under headings that can never apply, and forces human readers to read past it.
The fix: ship a shared `repo-surface` skill that owns the surface taxonomy and
section→surface mapping, extend the five artifact-producing agents to load it
and omit inapplicable sections entirely, reconcile lint to match, and dogfood
the change by shipping a `qrspi-stack` cheatsheet for this kit with a
deterministic `## Repo surface` block.

## What Changes

- New kit-shipped skill `claude/skills/repo-surface/SKILL.md` carrying the
  closed surface taxonomy, section→surface mapping, and omit/warn rules (D1, D2,
  D3, D4).
- New project-scoped cheatsheet `.claude/skills/qrspi-stack/SKILL.md` for this
  kit, with an explicit `## Repo surface` allowlist block declaring no present
  surfaces (D9). `/qrspi:stack` (`claude/commands/stack.md` and/or its skill)
  extended to emit a present-only `## Repo surface` allowlist block going forward
  (D3, OQ2).
- Five agent files updated: questioner and planner gain a `repo-surface` +
  stack-cheatsheet load step; designer, architect, and reviewer gain the
  `repo-surface` load only (D7). All five have their fenced skeleton's
  CRUD-specific headings replaced by a conditional placeholder (D4) and their
  prose reworded off the "Not applicable" convention (D4, D8).
- Four template files updated to demote the seven CRUD headings from
  always-present to surface-gated (D8).
- Lint Check 3 (`checkSkeletonHeadings` / `TEMPLATE_CANONICAL_HEADINGS`) shrunk:
  questioner's required heading set drops from 10 to 3 (surface-independent
  headings only); designer/architect/planner unchanged (D5).
- New lint Check 11 (`checkNoCrudSkeletonHeadings`) added to `scripts/lint.mjs`:
  forbids a denylist of CRUD heading lines inside fenced skeleton blocks of the
  five agent files (D6).
- Light Part B edits: one illustrative-note line each in
  `claude/skills/vertical-slice/SKILL.md` and `claude/skills/workflow/SKILL.md`
  (D10).
- README updated with the new `repo-surface` skill entry and CHANGELOG updated
  under `## [Unreleased]`.

## Capabilities

### New Capabilities

- `repo-surface`: The shared kit skill that owns the surface taxonomy
  (`data-store`, `http-api`, `ui`, `auth`, `typed-nullable`), the section→surface
  mapping, and the omit/warn rules. Loaded by all five artifact-producing agents.
  Creates `specs/repo-surface/spec.md`.
- `qrspi-stack`: The project-scoped cheatsheet for this kit, with a
  `## Repo surface` allowlist block declaring no present surfaces. Includes
  the `/qrspi:stack` extension to emit that block for new cheatsheets.
  Creates `specs/qrspi-stack/spec.md`.

### Modified Capabilities

- `ci-quality-gates`: Lint Check 3's required questioner heading set shrinks from
  10 to 3 (D5); new Check 11 (`checkNoCrudSkeletonHeadings`) added to
  `scripts/lint.mjs` (D6). Needs a delta spec.
- `qrspi-command-surface`: The five artifact-producing agents gain `repo-surface`
  load steps; questioner and planner also gain the stack-cheatsheet load (D7).
  Fenced skeletons replace CRUD headings with a conditional placeholder (D4).
  Templates updated to surface-gated headings (D8). Part B light skill edits
  (D10). Needs a delta spec.

## Impact

- Migrations: no schema or data migrations (pure markdown/JS changes).
- Breaking changes: no — the agent behavior change is additive (sections
  previously always emitted are now conditionally emitted based on the surface).
  Existing prose-only cheatsheets continue to work via LLM inference (D3-B);
  the explicit `## Repo surface` block is optional and additive (D3-C).
- Phases: single PR; four vertical slices (see Slices stage).
- Affected code / APIs / dependencies: `scripts/lint.mjs` (Check 3 map + new
  Check 11); `claude/agents/questioner.md`, `designer.md`, `architect.md`,
  `planner.md`, `reviewer.md`; `openspec-templates/questions.template.md`,
  `design.template.md`, `proposal.template.md`, `tasks.template.md`;
  `claude/skills/vertical-slice/SKILL.md`, `workflow/SKILL.md`;
  `claude/commands/stack.md` (or its skill); `README.md`; `CHANGELOG.md`.

## Out of scope

- Building a structured stack-schema parser or machine-readable surface DSL
  beyond the prose-inference + optional explicit block approach (D3 Non-Goal).
- Making the surface filter a CI-enforced runtime assertion at lint time (D6
  Non-Goal — there is no live cheatsheet parse in the lint).
- Re-litigating PQ1–PQ7 (fixed product answers).
- Changing the `PQ<N>`/`(D<n>)`/`(human)` conventions or any canonical OpenSpec
  header.
- Migrating existing consumer cheatsheets to add a `## Repo surface` block
  (they continue to work via prose inference; the block is optional). This is
  **not a separate change** — it is a consumer-adoption step for the release
  that ships this work: the release's `migrations/<version>.yaml` MUST carry a
  **manual** step advising consumers to optionally re-run `/qrspi:stack` to add
  the block for deterministic filtering (prose inference works without it). It
  cannot be an automated `edit-file` step — the cheatsheet lives at
  `.claude/skills/<repo>-stack/SKILL.md`, outside the `openspec/`-scoped paths
  the update walk's automated steps are confined to, and adding the block is a
  per-repo judgement `/qrspi:stack` owns.
