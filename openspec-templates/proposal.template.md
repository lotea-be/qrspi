# Proposal template (canonical OpenSpec format)

Single source of truth for how the QRSPI **Structure** stage writes
`openspec/changes/<id>/proposal.md`. The top-level headers below are the
**canonical OpenSpec proposal shape** (`## Why`, `## What Changes`,
`## Capabilities`, `## Impact`) — do not rename or drop them. QRSPI extras
(Out of scope, Vertical slices preview, Risks) are allowed *after* `## Impact`,
never in place of a canonical section.

The `## Capabilities` block is what maps the proposal to the spec deltas under
`specs/<name>/` — every entry under `### New Capabilities` must have a matching
`specs/<name>/spec.md`, and every `### Modified Capabilities` entry must name an
existing capability in `openspec/specs/`.

---

```markdown
# Proposal — <change-id>

> Stage S of QRSPI. Generated <YYYY-MM-DD>.

## Why

<!-- One paragraph. The motivation: what problem this solves and why now.
     Link to the design's Goals. -->

## What Changes

<!-- Bulleted scope. Be specific about new capabilities, modifications, and
     removals. -->

## Capabilities

### New Capabilities

<!-- Capabilities being introduced. kebab-case id; each creates
     specs/<name>/spec.md. Leave the list empty if none. -->
- `<name>`: <brief description of what this capability covers>

### Modified Capabilities

<!-- Existing capabilities whose REQUIREMENTS change (not just implementation).
     Use existing names from openspec/specs/. Each needs a delta spec under
     specs/<name>/spec.md. Leave empty if none. -->
- `<existing-name>`: <what requirement is changing>

## Impact

- Migrations: <yes/no, summary>
- Breaking changes: <yes/no, summary>
- Phases / epics: <phase 1/2/3>, <epic numbers>
- Affected code / APIs / dependencies: <list>

<!-- OPTIONAL QRSPI extras below — keep only when they add signal. They never
     replace a canonical section above. -->

## Out of scope

<!-- What this proposal deliberately defers, and to which follow-up change. -->

## Vertical slices (preview)

<!-- A preview of the slices stage W will detail. Vertical, user-facing. -->
```

---

## Format rules

- The four canonical headers MUST be exactly `## Why`, `## What Changes`,
  `## Capabilities`, `## Impact`, in that order. Note the capital `C` in
  `## What Changes`.
- Under `## Capabilities`, use exactly `### New Capabilities` and
  `### Modified Capabilities`. Keep both headings even when one list is empty
  (write `- _none_`).
- Capability ids are kebab-case and match a folder under
  `specs/<name>/` (this change) or `openspec/specs/<name>/` (existing).
