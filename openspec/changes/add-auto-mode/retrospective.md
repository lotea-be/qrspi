# Retrospective — add-auto-mode / stage I

> Generated 2026-07-06. Stage completed in commits f371858, fedffcb, 840a9c6, 18e4f62.

## Friction observed

1. **Live-runtime checkpoints had no runnable path.** Every slice's human
   checkpoint (1.4, 2.5, 2.6, 3.5) was written as "run `/qrspi:…` in a fresh
   session and observe X." But this repo *is* a Claude Code plugin: the installed
   `/qrspi:*` commands come from the tagged release in the plugin cache, not the
   feature branch's `claude/` tree. So the checkpoints could not be run as written,
   and all four were downgraded to "static-verified" until the human later found
   the `claude --plugin-dir .` dev-install path (documented only in README's
   "Developing QRSPI further", and referenced by no stage prompt). The slice plan
   and the implement checkpoints should have named the dev-install path up front.

2. **The slice-boundary gate assumes an app with tests.** `implement.md` step 3
   says "run lint, typecheck, and tests at the slice boundary," and the block-signal
   contract keys off "lint, typecheck, tests, or `openspec validate`." This repo has
   no app test suite — the real gate is lint + `sync-copilot --check` + `openspec
   validate` + a live dogfood. The orchestrator had to interpret "tests" as
   "whatever checks the repo actually has." A repo with no test suite should not
   read as a missing gate.

3. **Backlog-flip convention drift (already resolved).** `implement.md`'s final-slice
   commit step described `Status:` / `Next QRSPI command:` backlog lines that the
   real `backlog.md` never used (it tracks status in the heading backtick). Caught
   mid-flow and fixed in follow-up #2 (commit b745c2a) across six files — noted here
   for the record; no further edit needed.

## Proposed edits

| # | File | Edit |
|---|------|------|
| A | `claude/skills/vertical-slice/SKILL.md` | Extend the "checkpoint" definition: when the change edits a Claude Code plugin / agent-config / prompt-kit (including QRSPI editing itself), "run the app" means dev-installing the in-development version — name `claude --plugin-dir <repo>` (+ `/reload-plugins` to pick up edits) as the way to exercise un-released command/skill/agent bodies live. |
| B | `claude/commands/implement.md` | Soften step 3 + the block-signal line: the slice-boundary gate is "the project's *available* checks (lint/typecheck/tests where the repo has them, plus `openspec validate` / `sync-copilot --check` for this kit) and the slice checkpoint." A repo with no test suite is not a missing gate; but any check that *does* exist and fails still triggers the block-signal. |

## Deferred

- A lint check that asserts live-runtime slice checkpoints name a dev-install path:
  ambiguous to detect statically; the vertical-slice skill edit (A) is the lighter lever.

---

# Retrospective — add-auto-mode / stage PR

> Generated 2026-07-06. Stage completed in commits fc56c2d (+ followup loop).

## Friction observed

1. **The CHANGELOG `[Unreleased]` entry was enforced only by luck.** CLAUDE.md
   requires recording every change under `## [Unreleased]` in `CHANGELOG.md`, but
   no stage or checklist asserts it — the flow ran Q→PR without adding one, and it
   was caught only because the `reviewer` happened to check (from CLAUDE.md
   knowledge, not an instruction). A different reviewer pass could have missed it,
   shipping a PR that violates the kit's own rule. `pr.md` / `reviewer.md` carry no
   CHANGELOG item in their final checklist.

## Proposed edits

| # | File | Edit |
|---|------|------|
| C | `claude/agents/reviewer.md` | Add a standing checklist item to the PR final checklist: "A `## [Unreleased]` entry exists in `CHANGELOG.md` describing this change (per CLAUDE.md); if absent, flag it as a blocking gap." Make the CLAUDE.md keep-current rules (CHANGELOG + README) an explicit reviewer assertion rather than relying on the reviewer's memory. |

## Deferred

- A mechanical lint check for "[Unreleased] mentions the in-flight change": hard to
  bind a change id to a changelog line reliably; the reviewer checklist item (C) is
  the proportionate fix for now.
