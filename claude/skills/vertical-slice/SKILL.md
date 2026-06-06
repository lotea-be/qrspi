---
name: vertical-slice
description: How to decompose a change into vertical slices (mock service → UI → real DB) rather than horizontal layers. Load this during the Structure (S) stage when you are about to write the slice plan.
---

## Why vertical, not horizontal

Horizontal layering ("first do all DB work, then all API, then all UI") is
the default trap for AI-assisted work. By the time you reach UI, the
context window is full of DB and API decisions and the agent is least
equipped to integrate them. Bugs surface only at the end, after the
expensive work is done.

Vertical slices flip this: each slice produces a working end-to-end path
you can demo, test, and review. Each slice can be a **fresh agent
session** with a clean context window.

## How to slice a feature

For each user-visible capability in the change, write a slice that
contains:

1. **Mock API.** A service method (or API endpoint) that returns realistic
   hard-coded data matching the eventual response type. No DB calls yet.
2. **Frontend.** The page or component that consumes the service. This is
   also where UI composition happens.
3. **Real DB.** Replace the mock with a real query against the data store.
   Add the entity / migration if needed.
4. **Tests.** A unit test for the service/endpoint, a component test for the
   UI, and an end-to-end test for the page.

Each slice has a **checkpoint** at the end: a human can run the app and
see the slice working before the next slice starts.

### When the Mock-API step is optional

Skip step 1 (Mock API) when the slice mirrors an existing templated
pattern (e.g., a new entity + service + endpoint group following an
existing one already in the codebase) AND the response type is already
settled in `design.md`. In that case the mock layer would be throwaway
scaffolding around a known contract. Say so explicitly in the slice's
M bullet, e.g.

> M: no mock service stub needed — the read path hits the real DB from
> the start; pattern mirrors an existing service and the response type is
> settled in `design.md` D&lt;n&gt;.

This exception does not weaken the "Mock data is throwaway work → No"
anti-pattern below — it only sanctions skipping the mock layer when
the contract was *already* pinned down in design, not deferred to
"we'll figure it out in implementation."

## Example: "ask a question"

> Illustrative only — shown in a .NET/Blazor stack (EF Core, MudBlazor, xUnit,
> Playwright). Substitute your own stack's equivalents from the project's
> stack-cheatsheet; the **shape** (M/F/D/T per slice) is what transfers.

```
Slice 1 — Read path: list of questions
  M: QuestionService.ListAsync() returns 3 hard-coded questions
  F: /questions page renders them with MudDataGrid
  D: EF Core entity `Question`, seed 3 rows, replace mock
  T: xUnit for ListAsync(), Playwright list page renders
Slice 2 — Write path: create a question
  M: QuestionService.CreateAsync(request) echoes input
  F: /questions/new form with MudTextField + textarea + Markdig preview
  D: insert into Questions table, return id
  T: xUnit CreateAsync() validation, Playwright happy path
Slice 3 — Read path: question detail
  M: QuestionService.GetByIdAsync(id) returns hard-coded detail
  F: /questions/{id} renders title, body (sanitized Markdig), author, votes
  D: EF Core query joining Question + User
  T: xUnit GetByIdAsync() not-found, Playwright happy path```

## Per-slice model selection

Each slice in `worktree.md` MUST carry a one-line
`**Model:** sonnet|opus` annotation under its header, plus a short
rationale. The architect (W stage) writes it. The planner (P stage)
carries it forward into `tasks.md` unchanged. The `/qrspi-implement`
command reads the next un-ticked slice's annotation and runs the
implementer subagent on that model.

Choose `sonnet` when the slice is structured and templated:

- A new data-model entity + configuration + migration that mirrors an
  existing one in the codebase.
- A new API endpoint group that mirrors an existing pattern.
- DTOs/records, input validators, request/response wiring.
- Tests that follow an established test template.
- Wiring dependency-injection registrations.
- Renames, moves, and mechanical refactors.

Choose `opus` when deep reasoning materially changes the output:

- First-of-kind patterns (the first real-time hub, the first complex
  state-effect chain, the first feature with cross-entity FK + cascade
  decisions).
- Non-obvious authorization (ownership checks that interact with admin
  policy, multi-tenant isolation, claim transformation).
- Performance-critical code (full-text search query design, paginated
  endpoints with keyset cursors, N+1 hot paths).
- Concurrency, transactional integrity, race conditions.
- Business rules with subtle edge cases or invariants.
- UI components with substantive interaction complexity (focus
  management, keyboard navigation in custom widgets, dynamic state).

When in doubt, prefer `sonnet`. The implementer can escalate to opus
mid-slice by re-invoking `/qrspi-implement <id>` with an override; the
reverse direction (recovering from a flubbed opus run) costs the same
plus the wasted call.

## Anti-patterns to avoid

- "Let's just get the schema right first." → No. Schema may change in
  slice 2 once UI reality lands. Do the smallest schema that supports
  slice 1.
- "Mock data is throwaway work." → No. Mocks pin down the contract (the
  response type) before the DB locks it in.
- "We'll write tests at the end." → No. Tests are part of the slice. A
  slice without tests is not finished.

## When to use horizontal layering anyway

The only legitimate case is a pure infrastructure change that has no
user-visible effect (e.g., switching the SMTP provider, adding a CI
step). Even then, keep slices small.
