# Research — <change-id>

> Stage R of QRSPI. Generated <YYYY-MM-DD>.
> Ticket is hidden from this stage by design.

<!--
  Canonical template for stage R of QRSPI.

  Read me before writing `openspec/changes/<id>/research.md`. This file
  is the single source of truth for the structure and conventions used
  in this repo. Update this template when those conventions evolve;
  do not let individual `research.md` files drift from it.

  How to use:
  - The five headings below (Areas investigated, File map, Notable
    discrepancies, Implicit contracts and conventions, Open gaps) are
    ALWAYS emitted regardless of which surfaces the repo declares. Do
    not omit or rename them.
  - Surface-driven inventory sections (## Data model, ## API surface,
    ## UI surface, ## Authorization, ## Slash-command surface,
    ## Stage-agent surface, ## Skill surface, ## Lint-gate surface,
    ## Template surface, ## Migration manifest) are NOT listed here.
    They are injected dynamically by the researcher agent at write
    time based on the surfaces declared in the repo's stack-cheatsheet
    skill (via the repo-surface skill mapping). Omit a surface section
    entirely (no heading, no "Not applicable" text) when its controlling
    surface is absent.
  - Keep research factual: no "this should change" commentary, no
    proposed solutions, no design opinions.
  - Open gaps are open questions the researcher could not resolve from
    the codebase alone (files not found, ambiguous patterns, points
    that need human input).

  Worked example: read the most recent archived `research.md` under
  `openspec/changes/archive/<date>-<id>/research.md` before drafting.
-->

## Areas investigated
- <area>: <one-line scope>

## File map
### <area>
- `path/to/file` — purpose. Exports: `Foo`. Depends on: ...

## Notable discrepancies
- None.

## Implicit contracts and conventions
- ...

## Open gaps
- [ ] Could not determine ...
- [ ] Need human input on ...

<!-- SURFACE-GATED: data-store surface. Omit this section entirely (no heading,
     no "Not applicable") when the repo has no data-store surface. -->

<!-- SURFACE-GATED: http-api surface. Omit this section entirely (no heading,
     no "Not applicable") when the repo has no http-api surface. -->

<!-- SURFACE-GATED: ui surface. Omit this section entirely (no heading,
     no "Not applicable") when the repo has no ui surface. -->

<!-- SURFACE-GATED: auth surface. Omit this section entirely (no heading,
     no "Not applicable") when the repo has no auth surface. -->

<!-- SURFACE-GATED: slash-command surface. Omit this section entirely (no heading,
     no "Not applicable") when the repo has no slash-command surface. -->

<!-- SURFACE-GATED: stage-agent surface. Omit this section entirely (no heading,
     no "Not applicable") when the repo has no stage-agent surface. -->

<!-- SURFACE-GATED: skill surface. Omit this section entirely (no heading,
     no "Not applicable") when the repo has no skill surface. -->

<!-- SURFACE-GATED: lint-gate surface. Omit this section entirely (no heading,
     no "Not applicable") when the repo has no lint-gate surface. -->

<!-- SURFACE-GATED: template surface. Omit this section entirely (no heading,
     no "Not applicable") when the repo has no template surface. -->

<!-- SURFACE-GATED: migration-manifest surface. Omit this section entirely (no heading,
     no "Not applicable") when the repo has no migration-manifest surface. -->
