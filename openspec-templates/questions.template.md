# Questions — <change-id>

> Stage Q of QRSPI. Generated <YYYY-MM-DD>.
> Change summary: <one sentence describing what this change adds, changes, or
> removes, and which Epic / Phase it serves>

<!--
  Canonical template for stage Q of QRSPI.

  Read me before writing `openspec/changes/<id>/questions.md`. This file
  is the single source of truth for the structure and conventions used
  in this repo. Update this template when those conventions evolve;
  do not let individual `questions.md` files drift from it.

  How to use:
  - Use these section names by default.
  - Split or rename sections when the change's shape demands it.
    Example: a change that touches a list page AND a detail page
    should have BOTH "UI — list page" and "UI — detail page" sections
    instead of a single "UI" section.
  - Surface-gated sections (Data model, Indexing & query performance,
    API, UI, Front-end state, Auth & authorization, Migrations & data):
    emit a section only when its controlling surface is present in this
    repo (per the repo-surface skill mapping) AND it carries content for
    this change. When the surface is absent, omit the section entirely
    (no heading, no "Not applicable" text, no empty block).
  - Always-emitted sections (Testing, Sequencing & scope, Open product
    questions): emit regardless of surface presence.
  - Add sections that aren't here when the change has dimensions this
    template doesn't anticipate (e.g., "Background jobs", "Real-time
    contracts"). Note the new section in `openspec/templates/` so the
    next change benefits.
  - For a cross-cutting or reusable-component change (e.g. a rendering
    pipeline, a shared UI component, a formatting/sanitization service),
    add the sections that fit the change shape (e.g. "Rendering
    pipeline", "Sanitization / security", "Component API surface", or
    "Styling ownership") alongside any surface-gated sections from the
    repo-surface mapping that apply.
  - Number questions consecutively across the whole document (1, 2, 3
    ...) -- do NOT reset numbering at each section. Code-touching
    questions are answerable by the agent during stage R; only the human
    can answer the "Open product questions" block.
  - Keep questions narrow and code-grounded. "Should the body be
    `text` or `varchar(N)`?" is good. "What should the UX feel like?"
    is design -- drop it.

  Worked example: read the most recent archived `questions.md` under
  `openspec/changes/archive/<date>-<id>/questions.md` before drafting.
-->

<!-- SURFACE-GATED: data-store surface. Omit this section entirely (no heading,
     no "Not applicable") when the repo has no data-store surface. -->
## Data model

<!-- Entities, properties, relations, FK delete behaviour, soft-delete,
     audit columns, value-object choices. -->

1. ...

<!-- SURFACE-GATED: data-store surface. Omit this section entirely when the
     repo has no data-store surface. -->
## Indexing & query performance

<!-- Which indexes are mandatory at table creation, pagination strategy,
     N+1 risks, expected payload sizes. -->

...

<!-- SURFACE-GATED: http-api surface. Omit this section entirely when the
     repo has no http-api surface. -->
## API

<!-- API endpoints added or changed. For each: route, verb, auth,
     request type, response type, error responses. Mention the
     input-validation rules and whether validation hits the DB. -->

...

<!-- SURFACE-GATED: ui surface. Omit this section entirely when the
     repo has no ui surface. -->
## UI

<!-- Pages and components. Routes, layout integration, and the UI
     primitives/components used. Split into "UI -- list page", "UI --
     detail page", "UI -- form" etc. when the change touches multiple
     routes. -->

...

<!-- SURFACE-GATED: ui surface. Omit this section entirely when the
     repo has no ui surface. -->
## Front-end state

<!-- Does this change introduce new front-end state (a store slice:
     actions, reducers, effects)? If yes, describe it. -->

...

<!-- SURFACE-GATED: auth surface. Omit this section entirely when the
     repo has no auth surface. -->
## Auth & authorization

<!-- New policies, role checks, ownership rules. Reference the project's
     existing auth policy definitions and precedent. -->

...

<!-- SURFACE-GATED: data-store surface. Omit this section entirely when the
     repo has no data-store surface. -->
## Migrations & data

<!-- Data-store migration name, schema changes, FK constraints, seed
     data. Reference the project's existing migration / seeding pattern. -->

...

## Testing

<!-- Unit tests for endpoints and validators, smoke tests for components,
     and e2e tests. Reference the project's established test patterns. -->

...

## Sequencing & scope

<!-- How does this change relate to other rows in `openspec/backlog.md`?
     Are there scope choices that affect what lands in this PR vs. a
     follow-up? -->

...

## Open product questions (for the human)

<!-- Questions only the human can answer. Use the `PQ<N> — <topic>:`
     prefix so research/design docs can cite them precisely (e.g., "see
     PQ4 in questions.md"). Offer multiple-choice options when the
     answer space is bounded; mark the recommended option with
     "(Recommended)" so the human can defer to a default without
     reading three paragraphs.

     During the interactive ask_user pass, tick the checkbox and append
     `**Answer: <response>.** <one-line rationale>.` -->

- [ ] **PQ1 — <topic>:** <question>? Options:
  (a) <option> (Recommended) — <one-line rationale>,
  (b) <option> — <trade-off>,
  (c) <option> — <trade-off>.

- [ ] **PQ2 — <topic>:** ...
