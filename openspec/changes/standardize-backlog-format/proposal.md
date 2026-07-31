# Proposal — standardize-backlog-format

> Stage S of QRSPI. Generated 2026-07-29.

## Why

`openspec/backlog.md` is the last QRSPI artifact with neither a template nor a
lint check governing its shape. The live file already uses a consistent heading
grammar (`### <id> — \`<status>\` · **P<n>**` with a real em-dash and middle-dot)
and a three-section layout, but that shape is not enforced anywhere: the
`workflow` skill prose drifts from the real file (writing `--` for the em-dash
and omitting the `· P<n>` band), and only 4 of ~55 standalone rows carry the
`**Shape:**` body field the design requires. This change freezes the grammar into
a canonical template, enforces it via a new lint check (Check 22), backfills the
kit's own backlog rows to pass green, fixes the colliding Check-10 label in the
lint script, and adds fenced row examples to the writer command bodies so future
rows are authored correctly. A lightweight additive-only migration manifest
delivers the legend comment to existing consumer repos.

## What Changes

- **New:** `openspec-templates/backlog.template.md` — canonical template with
  legend comment, three `##` sections, P-band preamble, and sample rows.
- **New:** `scripts/lint.mjs` Check 22 (`checkBacklogSchema`) — six assertions
  (section presence, P-band preamble, heading regex, status enum, body-field rule
  scoped by row class, template file existence), with inline self-test fixture.
- **Fix:** Check-10 label collision in `scripts/lint.mjs` — `checkBudgetGateEmbed`
  and `checkTriagePaths` currently share the "Check 10" label; this change
  renumbers the duplicated label, re-sequences the tail as needed, and updates
  every downstream check-number reference and the README Check-list count.
- **Edit:** `claude/skills/workflow/SKILL.md` "Backlog atomicity" section — correct
  drifted heading grammar from `--` (double hyphen, no band) to the frozen
  em-dash grammar; add a one-line pointer to the template as authoritative.
- **Edit:** `claude/commands/followup.md` (P3 promote row template),
  `claude/commands/pr.md` (promote prose), and the deferred-work-append paths in
  `claude/commands/design.md`, `claude/commands/structure.md`,
  `claude/commands/slices.md` — replace `--` separators with the frozen em-dash
  grammar and add fenced canonical row examples.
- **Edit:** `claude/commands/init.md` — seed `openspec/backlog.md` from the
  template when absent (Glob presence check; skip silently if present).
- **Edit:** `scripts/lint.mjs` — add a Check 3 `TEMPLATE_CANONICAL_HEADINGS`
  entry for `backlog.template.md` (no agent maps to it; started as empty
  `headings: []`, later became a `driftGuard` targeting `init.md`'s inline copy).
- **New:** `migrations/<next-version>.yaml` — one `automated` `edit-file` step
  inserting the legend comment after the file title line; conditional/section
  steps as `manual`.
- **Edit:** `openspec/backlog.md` — backfill `**Shape:**` on ~51 standalone rows
  that currently lack it, so `node scripts/lint.mjs` passes green after Check 22
  lands; backfill happens in the same slice as the check so CI never reddens.
- **Edit:** `README.md` — bump the Check-list/count entry to reflect the new Check
  22 and any renumbered checks.
- **Edit:** `CHANGELOG.md` — add `[Unreleased]` entry for this change.

## Capabilities

### New Capabilities

- `backlog-schema`: Frozen, machine-checkable schema for `openspec/backlog.md` —
  includes the canonical template, lint enforcement (Check 22), init seeding,
  skill prose corrections, fenced command examples, and the migration manifest —
  creates `specs/backlog-schema/spec.md`.

### Modified Capabilities

- `ci-quality-gates`: Adds Check 22 (`checkBacklogSchema`) and fixes the
  Check-10 label collision (`checkBudgetGateEmbed` / `checkTriagePaths` currently
  share the label) — needs a delta spec.

## Impact

- Migrations: yes — `migrations/<next-version>.yaml`; one `automated` `edit-file`
  step (first non-empty `automated:` list in kit history), remainder `manual`.
  Forces a version bump at release (per PQ7).
- Breaking changes: no — Check 22 passes silently if `openspec/backlog.md` is
  absent; the check is enforced only in repos that already have the file.
- Phases: phase 1 (Tier 1.5 road-to-1.0 readiness); single epic.
- Affected code / APIs / dependencies: `scripts/lint.mjs` (Check 22 + Check-10
  collision fix + Check 3 `backlog.template.md` drift-guard entry);
  `openspec-templates/` (new `backlog.template.md`);
  `claude/commands/init.md`, `followup.md`, `pr.md`, `design.md`,
  `structure.md`, `slices.md`; `claude/skills/workflow/SKILL.md`;
  `openspec/backlog.md` (backfill); `README.md`; `CHANGELOG.md`;
  `migrations/<next-version>.yaml`.

## Out of scope

- **Per-file `backlog/<id>.md` model** — explicitly deferred to post-1.0 (Non-Goal).
- **`/qrspi:idea` dedicated writer command** — remains the `[[idea-capture-command]]`
  backlog idea; this change is its schema prerequisite.
- **Wikilink (`[[...]]`) target-resolution lint** — out of scope for Check 22;
  tracked as the new `backlog-wikilink-resolution-lint` backlog idea.
- **Narrative editorial** (the "Road to 1.0" / "Next up" blockquotes) beyond the
  P-band preamble presence assertion — not linted.
- **Rewriting existing consumer rows in the migration** — the manifest is
  additive-only and never rewrites existing row content.
