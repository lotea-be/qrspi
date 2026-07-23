# Spec delta template (canonical OpenSpec format)

This is the single source of truth for how the QRSPI **Structure** stage writes
`openspec/changes/<id>/specs/<capability>/spec.md`. Both `architect`
agents point here. The format below is what `openspec validate <id>` enforces
and what `openspec-sync-specs` parses at archive time — do not invent other
section shapes.

---

## New capability

Use when no base spec exists yet at `openspec/specs/<capability>/spec.md`.
Every requirement goes under `## ADDED Requirements`.

```markdown
# Spec — <capability>

> New capability introduced by the `<change-id>` change. <one line on what it is>.

## ADDED Requirements

### Requirement: <name>
The system MUST ...

#### Scenario: <name>
- **WHEN** ...
- **THEN** ...
```

---

## Delta against an existing capability

Use when a base spec already exists. Capture ONLY what changes (never a copy of
the base), grouped under the operation headers. Include only the sections you
need.

```markdown
# Spec — <capability>

> Delta against `openspec/specs/<capability>/spec.md` for the `<change-id>` change.
> <one line on what it adds / changes / removes>.

## ADDED Requirements

### Requirement: <new requirement name>
The system MUST ...

#### Scenario: <name>
- **WHEN** ...
- **THEN** ...

## MODIFIED Requirements

### Requirement: <EXACT name of the existing base-spec requirement>
<the FULL replacement text for the requirement — sync overwrites the base
 requirement, it does not append. Repeat every scenario it should still have.>

#### Scenario: <name>
- **WHEN** ...
- **THEN** ...

## REMOVED Requirements

### Requirement: <EXACT name of the base-spec requirement being deleted>
One line stating why it is removed. (No scenarios are needed under REMOVED.)
```

---

## Format rules (enforced by `openspec validate <id> --strict`)

> Use `--strict`. Plain `openspec validate <id>` does NOT check the MUST/SHALL
> rule below; CI runs `openspec validate --all` (strict), so a spec that passes
> non-strict locally can still fail CI.

- Section headers MUST be exactly `## ADDED Requirements`,
  `## MODIFIED Requirements`, or `## REMOVED Requirements`. Do NOT invent
  `## Requirements (delta)`, `## Purpose`, `## Out of scope`, or
  `## Open questions` sections in a spec file — that context belongs in
  `proposal.md` / `design.md`, not the spec.
- A `## MODIFIED` or `## REMOVED` requirement title MUST match an existing
  requirement header in the base spec **verbatim** — no `MODIFIED — ` /
  `REMOVED — ` prefix in the title (the section header already states the
  operation). A mismatched title means sync cannot locate the requirement.
- `## MODIFIED` requirements carry the **full** new requirement text, not just
  the changed sentence.
- The **first line** of every requirement body MUST contain `MUST` or `SHALL`.
  OpenSpec reads the requirement's *first physical line* as its statement, so a
  `MUST`/`SHALL` that wraps onto the second line does NOT count — keep it on line
  one (write `The skill MUST …`, not `When X …, the\nskill MUST …`).
- Every `### Requirement:` under `## ADDED` or `## MODIFIED` MUST have at least
  one `#### Scenario:` block using `- **WHEN** / **THEN**` bullets (`GIVEN` /
  `AND` optional).

After writing all spec files, run `openspec validate <id> --strict` and fix any
errors before emitting the final message.
