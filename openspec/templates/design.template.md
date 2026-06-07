# Design template (canonical OpenSpec skeleton + QRSPI depth)

Single source of truth for how the QRSPI **Design** stage writes
`openspec/changes/<id>/design.md`. The **required skeleton** is OpenSpec's
canonical design shape — `## Context`, `## Goals / Non-Goals`, `## Decisions`,
`## Risks / Trade-offs` — do not rename or drop those four. QRSPI's richer
detail sections (Data model / API surface / UI surface / Authorization /
Vertical slices preview / Open questions) are kept as **allowed extras** nested
between `## Decisions` and `## Risks / Trade-offs`, or folded directly into the
relevant numbered decision when that reads tighter.

This keeps design.md the rich "brain surgery" review artifact QRSPI relies on
while staying canonical-shaped so it round-trips through OpenSpec tooling.

---

```markdown
# Design — <change-id>

> Stage D of QRSPI. Generated <YYYY-MM-DD>.
> **Implementation is BLOCKED until a human approves this file.**

## Context

<!-- Background and current state, condensed from research.md, plus the
     desired end state: what the world looks like after this change ships. -->

## Goals / Non-Goals

**Goals:**
<!-- What this design aims to achieve. -->

**Non-Goals:**
<!-- What is explicitly out of scope. Name follow-up changes if relevant. -->

## Decisions

<!-- The heart of the document. For each non-obvious decision, numbered
     D1, D2, …: what we chose, what we rejected, and why. Cite the questions
     it answers (Q<n> / PQ<n>). Fold data-model / API / UI / authorization
     specifics into the relevant decision, OR use the dedicated sections
     below — whichever reads tighter. The stage-D command walks the human
     through one numbered decision per ask_user, so keep them discrete. -->

### D1 — <decision name> (Q.., PQ..)
<!-- Chosen: … Rejected: … Why: … -->

<!-- OPTIONAL QRSPI detail sections — keep the ones that sharpen the design: -->

## Data model changes
<!-- Entities added/modified, properties, indexes, constraints, migration shape. -->

## API surface
<!-- New/changed endpoints or service methods: request/response types,
     validation rules, auth requirement, error responses. -->

## UI surface
<!-- Pages/components added/changed, the framework primitives used, state
     slices if any. -->

## Authorization
<!-- Who can do what. Role checks, policies, defaults. -->

## Vertical slices (preview)
<!-- 2–5 slices stage S/W will detail. MUST be vertical and user-facing —
     each ends in something demoable end-to-end, never a horizontal layer. -->

## Risks / Trade-offs

<!-- What could go wrong, the trade-offs taken, and stage-I watch-items. -->

## Open questions for the human
- [ ] ...
```

---

## Format rules

- The four canonical headers MUST be present and spelled exactly:
  `## Context`, `## Goals / Non-Goals`, `## Decisions`, `## Risks / Trade-offs`.
- Everything QRSPI adds is an extra nested *after* `## Decisions` and *before*
  `## Risks / Trade-offs` (or folded into a decision). Never drop a canonical
  header to make room for an extra.
- `## Decisions` is mandatory and is the whole point of the stage — never omit
  it or "agree with yourself"; name both options when there is a real trade-off.
