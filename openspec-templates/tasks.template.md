# Tasks template (canonical OpenSpec numbering + QRSPI slice annotations)

Single source of truth for how the QRSPI **Plan** stage writes
`openspec/changes/<id>/tasks.md`. The **required shape** is OpenSpec's canonical
task list — numbered groups `## N. <name>` with `- [ ] N.M` checkbox items — do
not use any other group-heading form. QRSPI keeps two annotations on top of the
canonical shape: the per-group `**Model:**` line (carried verbatim from
`slices.md`) and the trailing `(D<n>)` design-decision back-references.

Each numbered group is one vertical slice from `slices.md`. The slice's name
goes in the heading text; do **not** prefix it with `Slice N —` (the canonical
`## N.` already numbers it).

---

```markdown
# Tasks — <change-id>

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. <slice name>

**Model:** sonnet|opus — <rationale carried verbatim from slices.md>

- [ ] 1.1 Add the data-model entity and configuration (D1, D2)
- [ ] 1.2 Generate the data-store migration (D6)
- [ ] 1.3 Add service method or API endpoint hitting the real data store (D10)
- [ ] 1.4 Wire the page/component to call the service (D11)
- [ ] 1.5 Add the input validator for the request (D9)
- [ ] 1.6 Unit/integration test: happy path + 1 error case
- [ ] 1.7 e2e: <scenario>
- [ ] 1.8 Checkpoint: <how the human verifies the slice>

## 2. <slice name>

**Model:** sonnet|opus — <rationale>

- [ ] 2.1 ...
```

---

## Format rules

- Group headings MUST be `## N. <slice name>` with a numeric `N` (1, 2, 3 …).
  No `Slice`, `A/B/C`, or other prefix.
- Checkbox ids MUST be `N.M` and match their group number (group 2 → `2.1`,
  `2.2`, …). Number consecutively within the group.
- Carry the `**Model:**` annotation from each `slices.md` slice into the
  matching group header **verbatim** — do not re-derive it. The `(D<n>)` tags
  embedded in each `slices.md` bullet carry forward into the matching task line
  unchanged — do NOT open `design.md` to re-derive them; the tags in `slices.md`
  are the authoritative source (D3).
- Append `(D<n>)` (or `(D<n>, D<m>)`) where a task implements a numbered
  `design.md` decision. Skip the citation only for scaffolding/migration tasks
  no decision enumerates.
- Prefix a task the implementer **cannot perform itself** (an interactive or
  manual verification, a human-run dogfood, anything needing a UI or session
  the subagent can't reach) with a leading `(human)` tag after the id:
  `- [ ] 1.8 (human) Manually verify the AskUserQuestion gate fires`. The
  implementer leaves `(human)` boxes unticked and surfaces them at the final
  checkpoint as human-run verification pending — they do not block the
  agent-executable tasks from being marked done.
- An optional `## N. Quality gate` / `## N. Final verification` group at the end
  is fine — it is still a numbered group.
