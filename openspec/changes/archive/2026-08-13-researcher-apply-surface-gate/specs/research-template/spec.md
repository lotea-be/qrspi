# Spec — research-template

> Delta against `openspec/specs/research-template/spec.md` for the `researcher-apply-surface-gate` change.
> Adds per-section SURFACE-GATED comments to research.template.md's surface-gated inventory sections, matching the questions.template.md convention.

## MODIFIED Requirements

### Requirement: Kit ships a spine-only research.template.md
The system MUST provide `openspec-templates/research.template.md` containing
exactly the five spine headings (`## Areas investigated`, `## File map`,
`## Notable discrepancies`, `## Implicit contracts and conventions`,
`## Open gaps`), the `# Research — <change-id>` title, and the `> Stage R …`
blockquote. Surface-driven inventory headings MUST NOT appear in the template;
a comment MUST note they are injected dynamically from the repo's declared surfaces.
Additionally, each surface-gated inventory section position in the template MUST
carry a `<!-- SURFACE-GATED: <surface> surface. Omit the heading and body
entirely when <surface> is absent from ## Repo surface. -->` comment (or
equivalent phrase-aligned wording matching the `repo-surface` omit mechanic),
matching the convention already present in `questions.template.md`.

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

#### Scenario: surface-gated inventory sections carry SURFACE-GATED comments
- **WHEN** `openspec-templates/research.template.md` is read
- **THEN** each position in the template that corresponds to a surface-gated
  inventory section carries a `<!-- SURFACE-GATED: … -->` comment (or equivalent
  phrase-aligned wording), matching the convention used in
  `openspec-templates/questions.template.md`; these comments are for
  human-facing legibility and do not add surface-gated heading lines.
