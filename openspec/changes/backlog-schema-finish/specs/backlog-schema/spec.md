# Spec — backlog-schema

> Delta against `openspec/specs/backlog-schema/spec.md` for the `backlog-schema-finish` change.
> Adds wikilink-resolution contract (Check 23 companion) and the shared backlog-writer append procedure.

## ADDED Requirements

### Requirement: Bare wikilinks in openspec/backlog.md MUST resolve to a live row or archive folder
The system MUST require that every bare (non-code-span) `[[slug]]` in
`openspec/backlog.md` resolves to either a live `### <slug>` row in the file or
a date-stripped archived change folder `openspec/changes/archive/<YYYY-MM-DD>-<slug>/`.
A `[[slug]]` inside a backtick code span MUST be excluded from resolution — it is
documentation of the syntax, not a live link. Slug grammar is the frozen row-id
kebab grammar (`[a-z0-9]+(?:-[a-z0-9]+)*`). Archive-folder resolution MUST pass
silently even when the live row is gone. A slug that does not resolve by either
path MUST cause Check 23 to push a violation and exit non-zero.

#### Scenario: bare link to a live row passes
- **WHEN** `openspec/backlog.md` contains `[[active-idea]]` (bare) and a heading
  `### active-idea` exists in the file
- **THEN** Check 23 resolves the link and reports no violation.

#### Scenario: bare link to an archived change folder passes
- **WHEN** `openspec/backlog.md` contains `[[shipped-change]]` (bare), no live
  `### shipped-change` row exists, but
  `openspec/changes/archive/2025-12-01-shipped-change/` exists
- **THEN** Check 23 strips the date prefix and resolves the link; no violation.

#### Scenario: code-span wikilink is excluded from resolution
- **WHEN** `openspec/backlog.md` contains `` `[[slug]]` `` and there is no live
  or archived `slug` entry
- **THEN** Check 23 does NOT flag the occurrence; code-spanned text is
  documentation of the syntax and exempt from resolution.

#### Scenario: bare dangling link fails
- **WHEN** `openspec/backlog.md` contains `[[ghost-idea]]` (bare) and no live row
  or archive folder matches `ghost-idea`
- **THEN** Check 23 pushes a violation naming `ghost-idea` and exits non-zero.

### Requirement: Kit MUST ship a shared backlog-writer skill owning the canonical row-append procedure
The system MUST provide `claude/skills/backlog-writer/SKILL.md` as a shipped skill
(in `claude/skills/`, not `.claude/skills/`) that owns the canonical row-append
procedure for adding an `idea` row to `openspec/backlog.md`. The skill MUST
reference the frozen grammar (the template and Check 22 remain the single sources
of truth for the grammar itself) and MUST carry the full procedure: dedup by
intent against existing rows (read the backlog, show near-matches, offer
proceed/abort), propose a P-band and `## Ideas` placement interactively via
`AskUserQuestion`, construct a Check-22-valid `idea` row (`### <slug> — \`idea\`
· **P<n>**` with `**Why:**` and `**Shape:**` fields using real em-dash and
middle-dot), and stage the append. The skill MUST be registered in
`scripts/skill-sets.mjs` (Check 2). Every command and agent that appends an idea
row MUST load this skill and follow its procedure rather than embedding the grammar
inline.

#### Scenario: backlog-writer skill is loadable by consumers
- **WHEN** a slash command or agent body contains `Load skill backlog-writer`
- **THEN** `claude/skills/backlog-writer/SKILL.md` is present and loadable from
  the kit plugin's installed `claude/skills/backlog-writer/` directory.

#### Scenario: skill is registered in scripts/skill-sets.mjs
- **WHEN** `scripts/skill-sets.mjs` is read after this change ships
- **THEN** `backlog-writer` appears as a registered skill name so that Check 2
  can resolve `Load skill backlog-writer` references.

#### Scenario: a row produced via the backlog-writer procedure passes Check 22
- **WHEN** a command or agent follows the backlog-writer procedure to append an
  idea row to `openspec/backlog.md` and `node scripts/lint.mjs` is run
- **THEN** Check 22 finds the new row satisfies all six assertions (frozen grammar,
  valid status, both `**Why:**` and `**Shape:**` present).

### Requirement: The kit's own backlog MUST pass Check 23 within the same change that introduces it
The system MUST ensure that `openspec/backlog.md` in the kit repo satisfies
Check 23 — no bare dangling wikilinks — before or in the same commit that
introduces Check 23. Specifically the five pre-existing bare dangling links
(`simplify-per-slice-model-selection`, `configurable-effort-and-thinking`,
`per-slice-effort-via-agent-variants`, `haiku-model-tier`, `kit-self-surfaces`)
MUST be demoted to back-ticked plain text in `openspec/backlog.md`. Check 23
MUST NOT be committed in a state where the kit's own backlog fails it; the cleanup
and the check MUST land together so CI never observes a reddened state.

#### Scenario: lint passes green after the cleanup-and-check slice is committed
- **WHEN** the slice that adds Check 23 and demotes the five dangling links is
  committed and `node scripts/lint.mjs` is run
- **THEN** Check 23 passes on `openspec/backlog.md` with no violations.

#### Scenario: all five slugs become back-ticked plain text
- **WHEN** `openspec/backlog.md` is read after this change ships
- **THEN** `simplify-per-slice-model-selection`, `configurable-effort-and-thinking`,
  `per-slice-effort-via-agent-variants`, `haiku-model-tier`, and `kit-self-surfaces`
  appear as back-ticked text (e.g. `` `simplify-per-slice-model-selection` ``),
  not as bare `[[…]]` wikilinks.
