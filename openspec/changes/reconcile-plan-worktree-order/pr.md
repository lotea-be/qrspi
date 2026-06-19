# PR — reconcile-plan-worktree-order

> Stage PR of QRSPI. Drafted 2026-06-19.

**PR link:** _(to be filled when the PR is opened)_
**Branch:** `features/reconcile-plan-worktree-order` → `main`

## Verification (all green)

| Check | Result |
|---|---|
| `node scripts/lint.mjs` | exit 0 — 4 checks (pin, frontmatter, heading, 14 commands documented) |
| `node sync-copilot.mjs --check` | exit 0 — 0 files differ |
| `openspec validate reconcile-plan-worktree-order` | valid |
| `tasks.md` | 20/20 ticked |
| `design.md` | human-APPROVED marker present |
| grep sweep (`qrspi:worktree`/`stage W`/`worktree.md`/`Worktree`) | clean in `claude/ README.md CLAUDE.md CONTRIBUTING.md` (only the git-sense `implementer.md` mention and historical change-folder files remain, as intended) |

Change surface: 38 files, +1332/−151.

## PR title

`reconcile-plan-worktree-order: rename Worktree -> Slices, reconcile stage order`

## PR body

## Summary

- Renames the QRSPI "Worktree" stage to "Slices" (stage code V, command
  `/qrspi:slices`, artifact `slices.md`) — the old name collided with the real
  git worktree concept (a built-in Claude Code feature) and was never part of
  the QRSPI acronym.
- Reconciles five documents that stated Plan (P) before Worktree (W), which
  contradicted the actual execution chain; all sources now agree on
  `S -> Slices -> P`.
- Adds a QRSPI / "Crispy" acronym-lineage note explaining that Design, Slices,
  and PR sit outside the five acronym letters (Q-R-S-P-I). Kit stays **eight
  stages**.

## QRSPI artifacts

- Design (APPROVED): `openspec/changes/reconcile-plan-worktree-order/design.md`
- Proposal: `openspec/changes/reconcile-plan-worktree-order/proposal.md`
- Spec delta: `.../specs/qrspi-command-surface/spec.md`
- Tasks: `.../tasks.md` (20/20 ticked)

## What changed

**Commands:** `worktree.md` → `slices.md` (code W→V, `/qrspi:plan` next-stage and
preconditions unchanged); `structure.md`/`plan.md`/`status.md`/`implement.md`
re-pointed `/qrspi:worktree` → `/qrspi:slices`.

**Agents:** `architect.md` (W branch → Slices/V throughout), `planner.md` (input
`worktree.md` → `slices.md`).

**Skills:** `qrspi-workflow` (stage list → S, Slices, P; acronym note;
intentional Slices-before-Plan divergence note), `vertical-slice`,
`openspec-workflow`.

**Sync/generated:** `sync-copilot.mjs` `agentFor`/`hintFor` key
`qrspi-worktree` → `qrspi-slices`; `copilot/` regenerated (prompt renamed).

**Docs:** `README.md` (stage table row + acronym note), `CLAUDE.md`,
`CONTRIBUTING.md`, `backlog.md` header (`S → V → P`), `CHANGELOG.md`
(`[Unreleased]` entry).

**Historical:** `example-greeting/worktree.md` and
`kit-quality-hardening/worktree.md` get a one-line pre-rename annotation (not
rewritten).

## Migration / rollback

`/qrspi:worktree` is replaced by `/qrspi:slices`; the Copilot prompt
`qrspi-worktree.prompt.md` → `qrspi-slices.prompt.md`. Existing `worktree.md`
files are preserved with a one-line annotation — no rewrite, no data loss.
Rollback = revert the branch.

## Tests

`node scripts/lint.mjs` (exit 0) · `node sync-copilot.mjs --check` (0 differ) ·
`openspec validate reconcile-plan-worktree-order` (valid) · grep sweep clean.

## Out of scope

- `slices.template.md` (design D5 rejects it — inline skeleton stays the source).
- `AskUserQuestion`-ownership gap — backlog item `verify-stage-gate-execution`.
- `context-hygiene` narrative on why Plan is "alignment".

## Release note

No `plugin.json` version bump — recorded under `CHANGELOG.md` `[Unreleased]` per
the tag-based release convention (version moves only when a release is cut).

## Reviewer checklist (kit-appropriate)

- [ ] `design.md` still matches what was built
- [ ] `node scripts/lint.mjs`, `node sync-copilot.mjs --check`, and `openspec validate` pass
- [ ] No hand-edits under `copilot/` (regenerated only)
- [ ] README stage table + acronym note read correctly
- [ ] Rename is reversible (annotations are additive)
