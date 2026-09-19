# Tasks — emit-changelog-task-and-pr-triage

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Planner emits the CHANGELOG task + Check 25 backstop (paired)

**Compute:** effort=medium model=sonnet — two coordinated edits (agent prose + lint JS) to files with established patterns; Check 25 mirrors the Check 13 convention exactly, reducing design reasoning to near-zero

- [x] 1.1 Add the kit-detection scan rule, Housekeeping group emission rule, and divergence-check exemption to `claude/agents/planner.md` (D1, D2, D3, D4)
- [x] 1.2 Add a one-line comment to `openspec-templates/tasks.template.md` noting `## N. Housekeeping` as a recognised trailing-group pattern (D3)
- [x] 1.3 Add `checkChangelogTaskEmission` as Check 25 to `scripts/lint.mjs` — registration, `// 25.` header block comment, and inline self-test exercising both kit-touching detection and CHANGELOG-presence assertion (D5)
- [x] 1.4 Update check-count references in `README.md`, `.claude/skills/qrspi-stack/SKILL.md`, and `CHANGELOG.md` to reflect the addition of Check 25 (D5)
- [x] 1.5 Lint: `node scripts/lint.mjs` exits 0 including `Check 25: OK`
- [ ] 1.6 (human) In a `claude --plugin-dir /workspaces/git/qrspi` session, run `/qrspi:plan` on a scratch kit-touching change fixture (its `slices.md` mentions `claude/`) and confirm the output `tasks.md` contains a trailing `## N. Housekeeping` group with the verbatim CHANGELOG task and `**Compute:** model=haiku effort=low`; then repeat with a docs-only fixture and confirm no Housekeeping group is emitted

## 2. PR stage triages in-stage + honest draft note

**Compute:** effort=low model=sonnet — two targeted prose edits to a single file (`claude/commands/pr.md`); both rules are localized, no cross-file coordination

- [x] 2.1 Add the triage rule to the "Seed the follow-up queue" step of `claude/commands/pr.md` — trivial in-scope gaps fixed in-stage with atomic commit, post-PR-shaped gaps seed `followups.md`, triage decision surfaced for override (D7a)
- [x] 2.2 Add the conditional draft-ness note to the "Record the PR link" step of `claude/commands/pr.md` — `PR #<N> open` vs `draft PR #<N> open` derived from the orchestrator's own create decision (D7b)
- [x] 2.3 Lint: `node scripts/lint.mjs` exits 0 (Check 25 must stay green from Slice 1)
- [ ] 2.4 (human) In a `claude --plugin-dir /workspaces/git/qrspi` session, run `/qrspi:pr` on a kit-touching change fixture missing its CHANGELOG entry; confirm the triage decision is printed (in-stage fix listed), no `followups.md` entry is created for that gap, and the backlog note shows `PR #<N> open` (non-draft form) (D7a, D7b)

## 3. Dogfood this change (stands alone)

**Compute:** effort=low model=haiku — single-file prose addition to `CHANGELOG.md` with no design reasoning; the content is fully determined by the proposal

- [x] 3.1 Write the `## [Unreleased]` entry in `CHANGELOG.md` covering all three surfaces touched by this change: planner rule (D1–D4), Check 25 (D5), and `pr.md` triage + draft-note edits (D7a, D7b)
- [x] 3.2 Lint: `node scripts/lint.mjs` exits 0 with Check 25 reporting OK for the `emit-changelog-task-and-pr-triage` change folder — confirming this `tasks.md` contains a CHANGELOG checkbox and Check 25 does not flag the folder (D5)
