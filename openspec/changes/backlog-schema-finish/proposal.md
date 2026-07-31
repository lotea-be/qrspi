# Proposal — backlog-schema-finish

> Stage S of QRSPI. Generated 2026-07-31.

## Why

`standardize-backlog-format` froze the `openspec/backlog.md` grammar and shipped Check 22 plus `migrations/0.13.0.yaml`. Three loose ends remained: the migration dispatcher could duplicate inserts on replay and hard-stop on a missing anchor; dangling `[[slug]]` cross-references in the backlog passed CI silently; and no lightweight command existed to append a canonical idea row without hand-crafting the grammar. A fourth consolidation (D11) is folded in: all five backlog-append sites across the kit are migrated onto a single shared `backlog-writer` skill, so the schema cannot drift at any write site. This change closes all four gaps.

## What Changes

- Two optional YAML fields (`skip_if_contains`, `anchor_missing: warn-and-skip`) added to the `edit-file` step schema, backfilled onto `migrations/0.13.0.yaml` in place; the `qrspi-update` dispatcher skill documents both semantics.
- Check 6 extended to accept the two new optional fields with closed value-domain validation, plus a positive-path self-test fixture.
- New Check 23 (`checkBacklogWikilinks`) resolves every bare `[[slug]]` in `openspec/backlog.md` against live rows and date-stripped archive folders, with an injected-list inline self-test.
- Five pre-existing dangling bare links in this repo's own `openspec/backlog.md` demoted to back-ticked plain text (D6/OQ2).
- New `claude/skills/backlog-writer/SKILL.md` — the shared row-append procedure (dedup, propose band, construct Check-22-valid row, stage).
- New `claude/commands/idea.md` — main-loop, no `agent:` frontmatter — as the first consumer of `backlog-writer`; registered in `README.md` helpers listing.
- `scripts/skill-sets.mjs` updated to register `backlog-writer`.
- The Q/D/S deferred-work capture prose (questioner, designer, architect agents) and the `followup.md` P3 promote path migrated to load `backlog-writer` and follow its procedure (Slice 4).

## Capabilities

### New Capabilities

- `backlog-writer`: Shared kit skill owning the canonical backlog-row append procedure — creates `specs/backlog-writer/spec.md`.

### Modified Capabilities

- `kit-versioning`: `qrspi-update` SKILL.md gains two optional `edit-file` sub-fields and their dispatcher semantics — needs a delta spec.
- `ci-quality-gates`: Check 6 extended (new field validation + positive self-test); Check 23 added (`checkBacklogWikilinks`) — needs a delta spec.
- `backlog-schema`: Wikilink-resolution contract and backlog-writer append procedure folded in as requirements — needs a delta spec.
- `qrspi-command-surface`: `/qrspi:idea` command added with README helpers listing + embed-exclusion decision — needs a delta spec.

## Impact

- Breaking changes: no — all migration schema additions are optional; consumers on `0.13.0.yaml` get idempotency guards transparently; no existing Check 6 passes become failures.
- Phases: single change, four slices; Slices 1–2 are file-disjoint and order-free; Slices 3–4 sequential (Slice 4 depends on Slice 3).
- Affected code / APIs / dependencies: `claude/skills/qrspi-update/SKILL.md`, `migrations/0.13.0.yaml`, `scripts/lint.mjs` (Checks 6 + 23), `openspec/backlog.md` (D6 cleanup), `claude/skills/backlog-writer/SKILL.md` (new), `claude/commands/idea.md` (new), `scripts/skill-sets.mjs`, `README.md`, `claude/agents/questioner.md`, `designer.md`, `architect.md`, `claude/commands/followup.md`.

## Out of scope

- Per-file `backlog/<id>.md` model (deferred post-1.0; Non-Goal).
- Idea research / complexity assessment inside `/qrspi:idea` (deferred; PQ5).
- A runtime-verification harness for slash-command interview behaviour (separate, larger concern; PQ/TQ25).
- A `0.13.1.yaml` re-run manifest for consumers who received a duplicate legend on a prior `0.13.0` run (D4).
