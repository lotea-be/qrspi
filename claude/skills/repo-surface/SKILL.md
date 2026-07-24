---
name: repo-surface
description: Shared kit skill that owns the surface taxonomy, section-to-surface mapping, and omit/warn rules for all five artifact-producing QRSPI agents. Load this in each agent's preamble to determine which sections to emit based on the project's stack cheatsheet.
---

# repo-surface -- surface taxonomy and section filter

This skill is the single authority for which QRSPI artifact sections are emitted
for a given repo. Every artifact-producing agent loads it and applies its rules
before writing a single section heading.

## Surface taxonomy (closed vocabulary)

There are exactly five named surfaces. Adding a sixth requires an explicit edit to
this file -- the vocabulary is intentionally closed.

| Surface | Meaning |
|---------|---------|
| `data-store` | The repo has a database, ORM, SQL layer, or any persistent data store |
| `http-api` | The repo exposes or consumes an HTTP API (REST, GraphQL, gRPC, etc.) |
| `ui` | The repo ships a user interface (web, native, TUI, or similar) |
| `auth` | The repo has authentication, authorization, sessions, or identity management |
| `typed-nullable` | The repo uses a typed language where nullable-suppression operators (`!`, `?.`, `??`, etc.) can mask null-safety violations |

## Section-to-surface mapping

The table below maps each surface-gated section or checklist item to the surface
that controls it. Only emit a row's section when its controlling surface is
present. Omit it entirely (no heading, no body, no "Not applicable") when the
surface is absent.

### `data-store` gates

- Section `## Data model` (in questions.md)
- Section `## Indexing & query performance` (in questions.md)
- Section `## Migrations & data` (in questions.md)
- Section `## Data model changes` (in design.md)
- Migration-generation task (in tasks.md)
- Section `## Migrations` (in PR review artifacts)
- Checklist item "No raw SQL" (in PR checklists)

### `http-api` gates

- Section `## API` (in questions.md)
- Section `## API surface` (in design.md)
- Checklist item "endpoints use authorization policies" (in PR checklists)

### `ui` gates

- Section `## UI` (in questions.md)
- Section `## Front-end state` (in questions.md)
- Section `## UI surface` (in design.md)

### `auth` gates

- Section `## Auth & authorization` (in questions.md)
- Section `## Authorization` (in design.md)
- Checklist item "auth-policy applied" (in PR checklists)

### `typed-nullable` gates

- Checklist item "No nullable suppression" (in PR checklists)

## Omit mechanic

"Omit a section" means: skip emitting both the heading and its body. Produce no
heading, no "Not applicable" stanza, and no empty block. The artifact for a
surface-absent repo MUST contain no trace of the omitted section -- not even a
commented-out heading.

Correct behavior when `data-store` is absent:

- The `## Data model` heading does NOT appear.
- No "Not applicable" text appears under `## Data model`.
- The section is simply absent from the artifact.

Correct behavior when `http-api` is present:

- The `## API surface` (or equivalent) section is emitted with its content as usual.

## Surface-inference rule

When an agent loads this skill it SHALL read the project's stack-cheatsheet skill
(if present) and determine which surfaces are present or absent using the following
priority order:

### Rule A -- explicit `## Repo surface` block (deterministic)

If the loaded stack cheatsheet contains a `## Repo surface` section, read each
surface's status directly from that block. This is the deterministic path -- no
prose inference is performed.

Example block that signals all surfaces absent:

```
## Repo surface

- data-store: absent
- http-api: absent
- ui: absent
- auth: absent
- typed-nullable: absent
```

When this block is present, its declarations are taken as-is. A surface listed as
`present` is treated as present; one listed as `absent` (or not listed at all) is
treated as absent.

### Rule B -- prose inference (fallback when no `## Repo surface` block exists)

If the cheatsheet is prose-only (no `## Repo surface` block), infer each surface
flag by LLM judgment from the cheatsheet prose:

- A surface is **absent** when the cheatsheet contains no mention of technologies
  associated with that surface (silence = absent).
- A surface is **present** when the cheatsheet mentions a related technology
  (e.g., "PostgreSQL", "Prisma", "EF Core" -> `data-store` present).

Inference is per-surface: each flag is decided independently from the prose.

### Rule C -- no cheatsheet loaded (full menu + warning)

If no stack-cheatsheet skill is loaded, emit the full section menu (all
surface-gated sections for all surfaces) and include a visible warning at the top
of the artifact:

> **Warning:** No stack cheatsheet is loaded for this repo. All sections are emitted.
> Run `/qrspi:stack` to generate a cheatsheet, then re-run this stage so
> surface-gated sections can be filtered correctly.

Do not silently omit or include sections when the surface status is unknown.

## Always-emitted sections (surface-independent)

The following sections are NOT gated by any surface. Emit them in every artifact
regardless of what the cheatsheet reports:

**In questions.md:**
- `## Testing`
- `## Sequencing & scope`
- `## Open product questions (for the human)`

**In all OpenSpec artifacts (canonical headers):**
- `## Context`
- `## Why`
- `## What Changes`
- `## Capabilities`
- `## Impact`
- `## Decisions`
- `## Risks / Trade-offs`
- `## ADDED Requirements`
- `## MODIFIED Requirements`
- `## REMOVED Requirements`

These sections describe the change itself and are meaningful for every repo,
regardless of stack.
