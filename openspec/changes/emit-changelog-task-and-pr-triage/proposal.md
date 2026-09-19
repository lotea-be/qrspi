# Proposal — emit-changelog-task-and-pr-triage

> Stage S of QRSPI. Generated 2026-09-19.

## Why

The QRSPI flow has no mechanism for emitting a cross-cutting housekeeping task when a
change touches shipped kit files (`claude/`, `openspec-templates/`, `scripts/`). As a
result, the required `## [Unreleased]` CHANGELOG entry is only caught at PR review,
after which `pr.md` routes every flagged issue — including a one-line must-fix gap —
to `followups.md`, implying a draft PR even when none was opened. This change closes
that loop end-to-end: the planner emits a standing CHANGELOG housekeeping task for
kit-touching changes, a new lint check backstops that emission mechanically, and the
PR stage gains a triage rule that fixes trivial in-scope gaps in-stage rather than
deferring them. This directly fulfills the design's Goals for D1–D7.

## What Changes

- **New** planner rule in `claude/agents/planner.md` (D1, D2, D3): when `slices.md`
  mentions a kit-file path (`claude/`, `openspec-templates/`, `scripts/`), append a
  standalone `## N. Housekeeping` group with a single CHANGELOG task to `tasks.md`.
- **New** planner divergence-check exemption in `claude/agents/planner.md` (D4):
  the housekeeping task is a sanctioned standing output and does not trip hard-stop
  condition 4.
- **New** lint Check 25 `checkChangelogTaskEmission` in `scripts/lint.mjs` (D5):
  walks active change folders, judges kit-touching from `tasks.md` + `specs/**` path
  mentions, asserts a CHANGELOG checkbox line exists.
- **Modified** `claude/commands/pr.md` (D7a): triage rule in "Seed the follow-up
  queue" — trivial in-scope must-fix gaps are fixed in-stage with an atomic commit;
  the orchestrator surfaces its triage decision for human override.
- **Modified** `claude/commands/pr.md` (D7b): conditional draft-ness note in
  "Record the PR link" — `PR #<N> open` vs `draft PR #<N> open` based on the
  orchestrator's create decision.
- **Optional** one-line comment added to `openspec-templates/tasks.template.md`
  noting `## N. Housekeeping` as a recognised trailing-group pattern.
- No `migrations/*.yaml` entry (D6 — kit-internal, not consumer-visible).
- No skill changes (D7 — triage and draft-note behaviour is `pr.md`-local).

## Capabilities

### New Capabilities

- `planner-changelog-emission`: Planner rule that detects kit-touching changes via
  `slices.md` scan and appends a standing CHANGELOG housekeeping task group to
  `tasks.md`, including the divergence-check exemption (D1–D4) — creates
  `specs/planner-changelog-emission/spec.md`.

### Modified Capabilities

- `ci-quality-gates`: Add Check 25 `checkChangelogTaskEmission` — mechanical backstop
  asserting a CHANGELOG task line exists in every active kit-touching change's
  `tasks.md` (D5) — needs a delta spec.
- `qrspi-pr-reconciliation`: Add PR-stage in-stage triage rule for trivial gaps (D7a)
  and conditional draft-ness backlog note (D7b) — needs a delta spec.

## Impact

- Migrations: no (D6 — kit-internal change; no consumer `openspec/` migration needed)
- Breaking changes: no — the new planner rule only appends a trailing group; existing
  `tasks.md` shape and Check 3/13 grammar are preserved. Check 25 only asserts task
  *presence*, not doneness. PR-stage triage adds behaviour, does not remove any
  existing choice.
- Phases: single phase (all three capability deltas ship together per design's
  rationale that fixing the planner alone without the PR triage still leaves the
  loop open)
- Affected code / APIs / dependencies: `claude/agents/planner.md`,
  `claude/commands/pr.md`, `scripts/lint.mjs`, `openspec-templates/tasks.template.md`
  (optional comment), `README.md` + `.claude/skills/qrspi-stack/SKILL.md` + `CHANGELOG.md`
  (check-count reference updates per D5)

## Out of scope

- Multi-vendor draft-ness enumeration (Azure DevOps / GitLab `--draft`): the
  note keys off the orchestrator's own create decision, which is already vendor-agnostic.
- A `(human)` checkpoint for the CHANGELOG task: explicitly rejected at PQ1.
- Per-issue `AskUserQuestion` in the PR triage rule: explicitly rejected at PQ3.
- Reconciling the pre-existing `stage-choreography` ↔ `workflow` duplicated
  commit-step text: out of scope (research Notable discrepancy 2).
- Mirroring the PR triage rule into `postpr-fix` or `stage-choreography` skills:
  the triage sits upstream of seeding and belongs in `pr.md` only (D7).

## Vertical slices preview

Three slices, each independently demoable:

- **Slice 1** — Planner emits the CHANGELOG task (D1–D4) + Check 25 backstop (D5):
  run `/qrspi:plan` on a kit-touching fixture → Housekeeping group appears in
  `tasks.md`; lint stays green.
- **Slice 2** — PR stage in-stage triage (D7a) + honest draft-ness note (D7b):
  reviewer flags a missing CHANGELOG entry → PR stage fixes it in-stage, commits
  atomically, opens a non-draft PR, backlog reads `PR #<N> open`.
- **Slice 3** — Dogfood: this change's own `CHANGELOG.md` `## [Unreleased]` entry +
  confirm Check 25 passes on the change's own folder. Stands alone (does not fold
  into Slice 1 checkpoint) because the observable outcome is distinct: it exercises
  the full end-to-end path on real kit-touching artifacts, not a fixture.

S judgement calls resolved: (1) template comment — yes, a one-line comment is added
to `tasks.template.md` noting `## N. Housekeeping` as a recognised trailing-group
pattern (keeps the template as single source of truth for `tasks.md` grammar);
(2) Slice 3 stands alone.
