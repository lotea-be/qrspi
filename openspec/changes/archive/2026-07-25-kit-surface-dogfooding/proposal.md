# Proposal — kit-surface-dogfooding

> Stage S of QRSPI. Generated 2026-07-25.

## Why

The kit's surface taxonomy today lists only five web-app surfaces (`data-store`,
`http-api`, `ui`, `auth`, `typed-nullable`) — none of which the kit itself exposes.
As a result the kit's own QRSPI artifacts fall to the always-emitted minimum and
never dogfood `repo-surface`. This change adds six kit-specific surfaces to the
taxonomy, wires them into the questioner and designer skeletons and templates, adds
a standing lint gate (Check 14) that verifies the kit's live artifacts carry no
heading for an absent surface, and rewrites the kit's `## Repo surface` block to
declare all six surfaces present — completing the self-description loop the Goals
section describes.

## What Changes

- Six new surfaces added to the `repo-surface` taxonomy: `slash-command`,
  `stage-agent`, `skill`, `lint-gate`, `template`, `migration-manifest`.
- Mapping rows and gated section names added to the `repo-surface` skill body,
  plus an `## Extending the taxonomy` checklist.
- Gated sections added to the questioner and designer agent skeletons and to
  `questions.template.md` / `design.template.md` (D3/OQ3 — not proposal or tasks).
- `CRUD_DENYLIST_HEADINGS` renamed to `SURFACE_GATED_DENYLIST_HEADINGS`; 10 new
  heading entries added, growing the denylist from 12 to 22 entries (D4/D5).
- Check 11 comments updated to reference "surface-gated headings" and the
  disjoint-scope invariant with Check 14 (D4/D6).
- New lint Check 14 (`checkSurfaceApplicability`) added to `scripts/lint.mjs`:
  reads the `## Repo surface` block (fail-loud if absent/unparseable), hardcodes
  the surface→heading map, scans all `*.md` under `openspec/changes/**` excluding
  `archive/`, skips fenced blocks, emits `[surface-applicability]` errors (D6).
- Inline in-memory self-test added inside Check 14 for regression coverage (D8/OQ2).
- Kit's `## Repo surface` block in `qrspi-stack` rewritten from
  `_No present surfaces._` to list all six kit surfaces (D7).
- README surface taxonomy and lint-check documentation updated (D9).

## Capabilities

### New Capabilities

- _none_

### Modified Capabilities

- `repo-surface`: taxonomy extended from 5 to 11 surfaces (5 web + 6 kit);
  mapping rows, gated section names, surface-inference rule, and
  `## Extending the taxonomy` checklist added — needs a delta spec.
- `ci-quality-gates`: Check 11 denylist grows 12→22 and constant renamed
  (`CRUD_DENYLIST_HEADINGS` → `SURFACE_GATED_DENYLIST_HEADINGS`); new Check 14
  (`checkSurfaceApplicability`) added with inline self-test — needs a delta spec.

## Impact

- Breaking changes: no — the five existing web surfaces and their section names
  are unchanged; consumer repos unaffected.
- Phases: single phase; epics: taxonomy (slice 1–2), lint (slice 3–4).
- Affected code / APIs / dependencies: `claude/skills/repo-surface/SKILL.md`,
  `.claude/skills/qrspi-stack/SKILL.md`, `scripts/lint.mjs`,
  `claude/agents/questioner.md`, `claude/agents/designer.md`,
  `openspec-templates/questions.template.md`,
  `openspec-templates/design.template.md`, `README.md`.

## Out of scope

- Consumer-repo surface enforcement (deferred to `standardize-recurring-ops-scripts`).
- Non-kit / non-web surfaces such as CLI, queues, jobs (deferred to
  `extend-surface-taxonomy`).
- `typed-nullable` and the five web surfaces remain absent for the kit.
- `plugin.json` version bump — CHANGELOG `[Unreleased]` only.

## Vertical slices (preview)

1. **Taxonomy + mapping + skeletons** — add six surfaces to `repo-surface` skill
   (mapping rows + `## Extending the taxonomy` checklist), add gated sections to
   questioner/designer skeletons and questions/design templates.
2. **Declare kit present surfaces** — rewrite `qrspi-stack` `## Repo surface`
   block to list all six kit surfaces.
3. **Rename + denylist growth** — rename `CRUD_DENYLIST_HEADINGS`, add 10 new
   headings, update Check 11 comments.
4. **Check 14 + self-test + README** — add Check 14, inline self-test, and
   README surface/lint documentation updates.
