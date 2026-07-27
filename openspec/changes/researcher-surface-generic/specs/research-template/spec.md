# Spec — research-template

> New capability introduced by the `researcher-surface-generic` change.
> A spine-only `research.template.md` ships with the kit; Check 3 guards its
> five canonical spine headings against the researcher's inline skeleton.

## ADDED Requirements

### Requirement: Kit ships a spine-only research.template.md
The system MUST provide `openspec-templates/research.template.md` containing
exactly the five spine headings (`## Areas investigated`, `## File map`,
`## Notable discrepancies`, `## Implicit contracts and conventions`,
`## Open gaps`), the `# Research — <change-id>` title, and the `> Stage R …`
blockquote. Surface-driven inventory headings MUST NOT appear in the template;
a comment MUST note they are injected dynamically from the repo's declared surfaces.

#### Scenario: research.template.md exists after the change ships
- **WHEN** the kit is installed and `openspec-templates/research.template.md` is read
- **THEN** the file is present and contains exactly the five spine headings and
  the standard title and blockquote.

#### Scenario: research.template.md contains no surface-gated headings
- **WHEN** `openspec-templates/research.template.md` is read
- **THEN** none of the strings in `SURFACE_GATED_DENYLIST_HEADINGS` appear as
  heading lines in the file; a comment explains that inventory headings are
  injected dynamically.

#### Scenario: Notable discrepancies is a standing spine heading in the template
- **WHEN** `openspec-templates/research.template.md` is read
- **THEN** `## Notable discrepancies` is present as a standing heading (always
  emitted, body "None." when empty), not a conditional or optional heading.

### Requirement: TEMPLATE_CANONICAL_HEADINGS wires research.template.md to the researcher agent
The system MUST add a `research.template.md → researcher → [the 5 spine headings]`
entry to `TEMPLATE_CANONICAL_HEADINGS` in `scripts/lint.mjs` so that Check 3
asserts every spine heading appears in the researcher's inline skeleton.

#### Scenario: Check 3 passes when researcher skeleton contains all five spine headings
- **WHEN** `claude/agents/researcher.md` contains all five spine headings
  (`## Areas investigated`, `## File map`, `## Notable discrepancies`,
  `## Implicit contracts and conventions`, `## Open gaps`) in its inline skeleton
  and `node scripts/lint.mjs` is run
- **THEN** Check 3 reports `OK` for the researcher and does not contribute a
  non-zero exit.

#### Scenario: Check 3 fails when a spine heading is absent from the researcher skeleton
- **WHEN** a contributor removes `## Open gaps` from the researcher's inline skeleton
  and `node scripts/lint.mjs` is run
- **THEN** Check 3 reports a violation naming `researcher.md` and the missing
  heading `## Open gaps`, and exits non-zero.

### Requirement: Notable discrepancies heading is not added to the surface-gated denylist or headings map
The system MUST NOT add `## Notable discrepancies` to `SURFACE_GATED_DENYLIST_HEADINGS`
(Check 11) or to `SURFACE_GATED_HEADINGS` (Check 14), because it is a non-gated
always-emitted spine heading; adding it would cause Check 14 to flag every clean
`research.md`.

#### Scenario: Check 14 does not flag Notable discrepancies in research.md
- **WHEN** `research.md` contains `## Notable discrepancies` with body "None." and
  `node scripts/lint.mjs` is run
- **THEN** Check 14 does not flag the heading, because it is not in the
  absent-surface heading set.

#### Scenario: Check 11 does not flag Notable discrepancies in the researcher skeleton
- **WHEN** the researcher's fenced skeleton contains `## Notable discrepancies`
  and `node scripts/lint.mjs` is run
- **THEN** Check 11 does not flag it, because `## Notable discrepancies` is not
  in `SURFACE_GATED_DENYLIST_HEADINGS`.
