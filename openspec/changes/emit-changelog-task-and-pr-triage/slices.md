# Slices — emit-changelog-task-and-pr-triage

> Stage V of QRSPI. Generated 2026-09-19.
> Vertical slices, not horizontal layers.

## Overview

This change has three independent slices, each demoable on its own. The overall
arc is: close the planner gap (Slice 1) → close the PR-stage gap (Slice 2) →
confirm the whole path on real kit artifacts (Slice 3).

Slice 1 adds the planner's kit-detection rule and emits the CHANGELOG housekeeping
task group, then immediately pairs it with the Check 25 lint backstop and the
one-line `tasks.template.md` comment. These two pieces are coupled by design (D5):
the rule without the backstop leaves no mechanical enforcement, so they ship as one
unit. Acceptance is self-verifying via `node scripts/lint.mjs`.

Slice 2 adds the two prose edits to `claude/commands/pr.md`: the in-stage triage
rule (D7a) and the conditional draft-ness backlog note (D7b). These are `pr.md`-local
per D7 — no skill files change. The slice is independently demoable via a dogfood
observation of the PR stage on a trivially-gapped change.

Slice 3 stands alone (the S-approved judgement). It writes this change's own
`CHANGELOG.md` `## [Unreleased]` entry and confirms Check 25 passes on the
change's own folder. This is the first real-world exercise of the full end-to-end
path on genuine kit-touching artifacts (not a synthetic fixture), and the
observable outcome is distinct from Slice 1's fixture checkpoint.

This repo has no web/DB stack — "vertical slice" here means a demoable end-to-end
unit of kit behaviour, where each checkpoint is reachable via `node scripts/lint.mjs`
and/or a dogfood observation in a dev-installed session (`claude --plugin-dir
/workspaces/git/qrspi`). The M/F/D/T framing is adapted accordingly: M = prose
rule edit (the agent instruction), F = lint or agent observable, D = no data store,
T = lint self-test + dogfood checkpoint.

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Planner emits the CHANGELOG task + Check 25 backstop (paired)

At the end of this slice, running `/qrspi:plan` via `claude --plugin-dir
/workspaces/git/qrspi` on a kit-touching fixture produces a `tasks.md` with a
trailing `## N. Housekeeping` group containing the verbatim CHANGELOG task and a
`**Compute:** model=haiku effort=low` annotation, while `node scripts/lint.mjs`
exits green including the new Check 25. On a docs-only fixture (no `claude/`,
`openspec-templates/`, or `scripts/` mention in `slices.md`), no Housekeeping group
is emitted and Check 25 does not flag the folder.

The template comment is folded into this slice because it annotates `tasks.template.md`
with the `## N. Housekeeping` pattern — the same rule being encoded in the planner.

- M (agent rule): add the kit-detection scan rule + Housekeeping group emission
  rule + divergence-check exemption to `claude/agents/planner.md` (D1, D2, D3, D4)
- M (template): add a one-line comment to `openspec-templates/tasks.template.md`
  noting `## N. Housekeeping` as a recognised trailing-group pattern (D3)
- F (lint backstop): add `checkChangelogTaskEmission` as Check 25 to
  `scripts/lint.mjs` — registration, `// 25.` header block comment, inline
  self-test, check-count reference updates in `README.md`,
  `.claude/skills/qrspi-stack/SKILL.md`, and `CHANGELOG.md` (D5)
- D: no data store
- T (lint): `node scripts/lint.mjs` green with Check 25 passing; inline self-test
  exercises both kit-touching detection and CHANGELOG-presence assertion
- **Compute:** effort=medium model=sonnet — two coordinated edits (agent prose + lint
  JS) to files with established patterns; Check 25 mirrors the Check 13 convention
  exactly, reducing design reasoning to near-zero
- Checkpoint: (1) `node scripts/lint.mjs` exits 0 including `Check 25: OK`; (2) in
  a `claude --plugin-dir /workspaces/git/qrspi` session, run `/qrspi:plan` on a
  scratch kit-touching change fixture (its `slices.md` mentions `claude/`) — observe
  `## N. Housekeeping` with the verbatim CHANGELOG task in the output `tasks.md`;
  (3) repeat with a docs-only fixture — observe no Housekeeping group

### Slice 2 — PR stage triages in-stage + honest draft note

At the end of this slice, running `/qrspi:pr` on a change where the reviewer flags
a missing CHANGELOG entry results in the PR stage applying the edit atomically in
its own commit and opening a non-draft PR, with the backlog note reading
`in-progress (PR #<N> open)` — not the `draft` variant. The orchestrator states
which issues it fixed in-stage and which it deferred before the turn ends.

- M (agent rule): add the triage rule to the "Seed the follow-up queue" step of
  `claude/commands/pr.md` — trivial in-scope gaps fixed in-stage with atomic commit,
  post-PR-shaped gaps seed `followups.md`, triage decision surfaced for override
  (D7a)
- M (agent rule): add the conditional draft-ness note to the "Record the PR link"
  step of `claude/commands/pr.md` — `PR #<N> open` vs `draft PR #<N> open` derived
  from the orchestrator's own create decision (D7b)
- D: no data store
- T (dogfood): run `/qrspi:pr` on a kit-touching change fixture that is missing its
  CHANGELOG entry; observe the in-stage fix and non-draft `PR #<N> open` backlog note
- **Compute:** effort=low model=sonnet — two targeted prose edits to a single file
  (`claude/commands/pr.md`); both rules are localized, no cross-file coordination
- Checkpoint: (1) `node scripts/lint.mjs` exits 0 (no new checks in this slice, but
  Check 25 must stay green); (2) in a `claude --plugin-dir /workspaces/git/qrspi`
  session, run `/qrspi:pr` on a fixture missing its CHANGELOG entry — observe the
  triage decision printed (in-stage fix listed), no `followups.md` entry created
  for that gap, and backlog note shows `PR #<N> open` (non-draft)

### Slice 3 — Dogfood this change (stands alone)

At the end of this slice, `CHANGELOG.md` carries a `## [Unreleased]` entry
describing all three surfaces touched by this change (planner rule, Check 25,
`pr.md` edits), and `node scripts/lint.mjs` exits green including Check 25 passing
on this change's own folder — which is kit-touching (its `tasks.md` and `specs/**`
mention `claude/` and `scripts/`) and must therefore carry the CHANGELOG task.

- M: no agent rule edits — this slice is purely an application of the rules shipped
  in Slices 1 and 2
- F (observable): `CHANGELOG.md` `## [Unreleased]` entry covering planner rule
  (D1–D4), Check 25 (D5), and `pr.md` triage + draft-note edits (D7a, D7b)
- D: no data store
- T (lint): `node scripts/lint.mjs` exits 0 with Check 25 reporting OK for the
  `emit-changelog-task-and-pr-triage` change folder (D5)
- **Compute:** effort=low model=haiku — single-file prose addition to `CHANGELOG.md`
  with no design reasoning; the content is fully determined by the proposal
- Checkpoint: `node scripts/lint.mjs` exits 0; `CHANGELOG.md` contains a
  `## [Unreleased]` section that names the three changed files/capabilities; the
  `emit-changelog-task-and-pr-triage` folder's `tasks.md` contains a checkbox line
  with `CHANGELOG` and Check 25 does not flag it
