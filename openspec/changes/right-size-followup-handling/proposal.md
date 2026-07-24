# Proposal — right-size-followup-handling

> Stage S of QRSPI. Generated 2026-07-24.

## Why

`/qrspi:followup` currently has a single execution path: spawn the implementer in
FIX MODE and let the `postpr-fix` checklist resolve one item. That path assumes
every follow-up is small, atomic, and in-scope. The checklist tells the
implementer to *stop* when a follow-up is design-level or out of scope — but by
then the orchestrator has already committed to the small-fix path, and "stop" is a
dead end with no sanctioned next move. This change adds an upfront triage gate
that right-sizes each follow-up *before* the implementer is ever spawned, routing
it to one of three explicit paths: implement directly (P1 — today's flow), open a
sibling QRSPI addendum change (P2), or defer to the backlog as an idea (P3). The
triage is always human-confirmed and never suppressed.

## What Changes

- **`claude/commands/followup.md`** — insert the triage gate (self-assessment from
  four heuristic signals, a never-suppressed `AskUserQuestion`, and three wired
  routing paths) before the implementer spawn; add P2 addendum mechanics (sibling
  folder creation, id/branch/entry-stage selection, `followups.md` tick-with-note,
  handoff instruction) and P3 defer mechanics (backlog-idea append, tick-with-note).
- **`claude/skills/workflow/SKILL.md`** — update "After PR — the fix loop" to
  summarise the triage gate and the three paths.
- **`scripts/lint.mjs`** — add Check 10 asserting `followup.md` contains the three
  triage choice-label anchors (P1/P2/P3).
- **`copilot/`** — regenerated via `node sync-copilot.mjs` (never hand-edited).
- **`CHANGELOG.md`** — one line under `## [Unreleased]`; no version bump.

## Capabilities

### New Capabilities

- `followup-triage`: Upfront triage gate in `/qrspi:followup` that classifies each
  follow-up item using four heuristic signals, proposes a path (P1/P2/P3), requires
  human confirmation, and routes to one of three wired execution paths — creates
  `specs/followup-triage/spec.md`.

### Modified Capabilities

- `ci-quality-gates`: Add Check 10 to `scripts/lint.mjs` to pin the three triage
  choice-label anchors in `followup.md`, mirroring how Check 8 pins the PR
  reconciliation passes — needs a delta spec.

## Impact

- Migrations: no — prose-only kit-behavior change; no data model or disk format changes.
- Breaking changes: no — the triage gate adds a new `AskUserQuestion` step before
  the existing implementer spawn; the P1 path's downstream mechanics are unchanged.
- Phases: single phase; no epic split.
- Affected code / APIs / dependencies: `claude/commands/followup.md`,
  `claude/skills/workflow/SKILL.md`, `scripts/lint.mjs`,
  `copilot/prompts/qrspi-followup.prompt.md` (regenerated).

## Out of scope

- `postpr-fix` checklist: unchanged; the three-path model lives only in the orchestrator.
- `followups.md` format or seeding: no format change.
- `pr.md` reconciliation gate: no changes.
- A Node helper to parse `followups.md`: deferred to the `standardize-recurring-ops-scripts` backlog item; the orchestrator reads prose directly.
- Auto-executing addendum pipeline stages from within `followup.md`: the orchestrator hands off; it does not run Q→PR itself.
- A ninth QRSPI stage: the addendum re-enters the existing Q→PR pipeline.
- Version bump: `plugin.json` version is not changed; CHANGELOG under `## [Unreleased]` only.
