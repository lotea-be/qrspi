# Slices — pr-review-open-tasks-and-followups

> Stage V of QRSPI. Generated 2026-07-16.
> Vertical slices, not horizontal layers.

## Overview

This change inserts a pre-PR reconciliation gate into `claude/commands/pr.md`
between the existing precondition check and the reviewer spawn. The gate runs
two sequential passes — tasks first, follow-ups second — giving the human an
explicit per-item decision before the reviewer sees the change.

Three slices deliver the full path end-to-end, each independently demoable
against a toy change folder:

1. **Tasks pass** — the orchestrator can walk un-ticked `tasks.md` boxes
   (including `(human)`-tagged ones) and apply Finish/Drop/Pause decisions,
   plus the early-exit commit. The complete regular-task and `(human)`-tag
   flows are verified with a toy change that has one un-ticked regular box,
   one `(human)` box, and one ticked box.
2. **Follow-ups pass** — the orchestrator can walk un-resolved `followups.md`
   entries with Fix-now/Defer/Drop/Promote decisions, plus the absent-file
   tolerance. Verified with a two-item `followups.md` and then a change with no
   `followups.md`.
3. **Auto-mode wiring + lint + reviewer note + docs** — the mode-aware
   suppress/hard-stop behavior, the `workflow` skill cross-reference note,
   lint Check 8, the reviewer awareness note, Copilot sync, and the
   `CHANGELOG.md` / `README.md` currency pass. Verified by a Full-auto run
   (clean → silent, dirty → hard-stop) and `node scripts/lint.mjs`.

There is no database, HTTP API, or web UI. The "M (Mock API)" role is played
by prose instructions in `pr.md` that direct the orchestrator; "F (Frontend)"
is the human-facing AskUserQuestion dialog; "D (DB)" is the on-disk write to
`tasks.md`, `followups.md`, or `openspec/backlog.md`; and "T (Tests)" is a
combination of `node scripts/lint.mjs` and a manual `/qrspi:pr` checkpoint
run against a prepared toy change folder.

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Tasks pass end-to-end

**Deliverable.** By the end of this slice a human can dev-install the kit
(`claude --plugin-dir .`), run `/qrspi:pr toy-change`, and observe: (a) the
softened precondition passes despite the un-ticked box; (b) the count banner
appears; (c) the regular un-ticked box is offered Finish / Drop / Pause; (d)
choosing Drop rewrites the line to `- [x] ~~N.M text~~ (dropped)`; (e) the
`(human)` un-ticked box is offered Confirm-done / Drop / Leave-for-now
(not Finish); (f) choosing Leave-for-now passes the box through un-ticked;
(g) if the human chose Drop earlier and then Pause, an early-exit commit
`docs(toy-change): reconcile open tasks before PR` is issued so the working
tree is clean. The follow-ups pass and reviewer spawn are deferred to slices 2
and 3.

- M (Orchestrator prose): Edit `claude/commands/pr.md` — soften step-2 precondition from "all boxes ticked" to "tasks.md exists + working tree clean" (D2); insert the tasks pass between the precondition check and the reviewer spawn, with a count banner, a regular-task loop (Finish / Drop / Pause), a `(human)`-tag loop (Confirm-done / Drop / Leave-for-now), Drop annotation writes, and early-exit commit logic (D3, PQ5, PQ8, D7)
- F (Human dialog): The AskUserQuestion prompts that surface during the tasks pass — count banner text, per-item choice set with slice/task context and `(i of M)` counter, the Finish second-question redirect to `/qrspi:implement`, the Pause end-of-turn message — all authored inline in `claude/commands/pr.md` (D3)
- D (On-disk writes): `tasks.md` mutation: Drop rewrites `- [ ] N.M text` to `- [x] ~~N.M text~~ (dropped)`; Confirm-done rewrites to `- [x] N.M text`; early-exit commit touches `tasks.md` with message `docs(<id>): reconcile open tasks before PR` (D7, PQ5)
- T (Tests): `node scripts/lint.mjs` passes (no Check 8 yet — that is Slice 3); manual checkpoint run against the toy change folder as described in Checkpoint below
- **Model:** sonnet — prose additions and AskUserQuestion wiring inside an existing command file, following established `pr.md` patterns; the decision logic is well-scoped by the spec
- Checkpoint: Dev-install the kit (`claude --plugin-dir .`; `/reload-plugins` if already open). Prepare toy change folder `openspec/changes/toy-change/` with a `tasks.md` containing `- [ ] 1.1 Wire endpoint`, `- [ ] 1.2 (human) Code-review checkpoint`, and `- [x] 1.3 Write tests`. Run `/qrspi:pr toy-change`. Verify: precondition passes; banner shows "2 open tasks (1 `(human)` box)"; box 1.1 is offered [Finish, Drop, Pause]; choose Drop → line becomes `- [x] ~~1.1 Wire endpoint~~ (dropped)`; box 1.2 is offered [Confirm-done, Drop, Leave-for-now] (Finish is absent); choose Leave-for-now → box remains un-ticked; if a prior run had a Pause after a Drop, confirm the early-exit commit exists via `git log --oneline -1`.

### Slice 2 — Follow-ups pass end-to-end

**Deliverable.** Building on Slice 1's tasks pass, a human can run
`/qrspi:pr toy-change` on a change that has a two-entry `followups.md` and
observe: the follow-ups pass runs after the tasks pass; each entry is offered
Fix-now / Defer / Drop / Promote; choosing Drop annotates with
`(dropped — no longer needed)`; choosing Promote adds an `idea` row to
`openspec/backlog.md` and annotates the entry with `(promoted to backlog)`;
choosing Fix-now shows a redirect second-question to `/qrspi:followup` without
spawning an implementer. A second run against a change with no `followups.md`
confirms the file-absent tolerance (clean pass, no error). The reviewer spawn
is still deferred (stubbed or skipped in the toy run); this is acceptable
because the deliverable is the follow-ups gate, not the full PR flow.

- M (Orchestrator prose): Edit `claude/commands/pr.md` — append the follow-ups pass section after the tasks pass; walk `- [ ]` entries in `followups.md`; present Fix-now / Defer / Drop / Promote per entry; tolerate absent, prose-only, or all-ticked `followups.md` as a clean pass (D4, D6)
- F (Human dialog): AskUserQuestion prompts for the follow-ups pass — count banner component (M un-resolved follow-ups), per-entry choice set with entry text, Fix-now second-question redirect to `/qrspi:followup`, Defer no-op continuation, Drop annotation, Promote backlog-row write + annotation — authored inline in `claude/commands/pr.md` (D4)
- D (On-disk writes): `followups.md` mutation: Drop → `- [x] … (dropped — no longer needed)`; Promote → `- [x] … (promoted to backlog)` plus one new `idea` row appended to `openspec/backlog.md`; Defer → entry left unchanged; all Drop/Promote writes on the normal path are staged for the final `docs(<id>): record PR #<N> link` commit (D7)
- T (Tests): `node scripts/lint.mjs` passes; manual checkpoint run as described below — two-entry `followups.md` run plus absent-`followups.md` run
- **Model:** sonnet — follow-ups pass mirrors the tasks-pass pattern established in Slice 1; the Promote path's backlog write reuses the existing "Capturing deferred work" workflow-skill machinery; no novel reasoning required
- Checkpoint: Extend the toy change: add `followups.md` with `- [ ] Investigate caching` and `- [ ] Remove debug logging`. Run `/qrspi:pr toy-change`. Verify: tasks pass completes (or skips cleanly if already clean from Slice 1); follow-ups pass banner shows "2 un-resolved follow-ups"; entry 1 is offered [Fix now, Defer, Drop, Promote to backlog idea]; choose Drop → entry becomes `- [x] Investigate caching (dropped — no longer needed)`; entry 2 choose Promote → entry becomes `- [x] Remove debug logging (promoted to backlog)` and `openspec/backlog.md` gains one new `idea` row. Then remove `followups.md` from the toy change folder and re-run `/qrspi:pr toy-change` — confirm the follow-ups pass is a clean no-op (no AskUserQuestion, no error).

### Slice 3 — Auto-mode wiring, lint Check 8, reviewer note, and docs

**Deliverable.** The full feature is now wired end-to-end with all supporting
artifacts in place. A human can: (a) run `/qrspi:pr toy-change` in Full-auto
mode on a clean toy change and observe no AskUserQuestion or banner (silent
pass); (b) run it on a dirty toy change and observe the count banner + per-item
gate fires as a hard-stop rather than auto-advancing; (c) run
`node scripts/lint.mjs` and see Check 8 pass; (d) delete the tasks-pass
section from `claude/commands/pr.md` and see Check 8 fail with a clear message;
(e) inspect `claude/agents/reviewer.md` and find the one-line awareness note
about the upstream gate and Leave-for-now tolerance; (f) inspect
`claude/skills/workflow/SKILL.md` and find the one-line cross-reference to the
reconciliation gate; (g) run `node sync-copilot.mjs --check` and see zero
drift; (h) find `CHANGELOG.md` `## [Unreleased]` has an entry for this change.

- M (Mode wiring): Edit `claude/commands/pr.md` — wrap each pass's AskUserQuestion calls with mode-awareness: Full/Semi-auto + clean pass → suppress silently; Full/Semi-auto + open items → fire hard-stop (show banner, run gate, do NOT auto-advance); Manual → always show banner including "0 open" message (D5, OQ2)
- F (Workflow skill cross-ref + reviewer note): Edit `claude/skills/workflow/SKILL.md` — add one-line cross-reference in the Hard-stop procedure section noting the conditional hard-stop at the PR reconciliation gate and pointing to `claude/commands/pr.md` for full mechanics (OQ2); edit `claude/agents/reviewer.md` — add one-line awareness note that a pre-reconciliation gate runs upstream and that a `(human)` box left via Leave-for-now is a sanctioned open box, not a blocking issue (D8)
- D (Lint Check 8): Edit `scripts/lint.mjs` — add `checkPrReconciliationPasses()` async function after Check 7, using the same dependency-free ESM pattern; check for structural anchors (tasks-pass heading + Finish/Drop/Pause labels; follow-ups-pass heading + Fix-now/Defer/Drop/Promote labels) in `claude/commands/pr.md`; report violation if either pass is missing; emit `process.stdout.write('Check 8: ...')` label in `main()` (D8-bis, OQ3)
- T (Tests + Copilot sync + docs): Run `node sync-copilot.mjs` to regenerate `copilot/prompts/qrspi-pr.prompt.md` from the updated `claude/commands/pr.md`; run `node sync-copilot.mjs --check` to assert zero drift; add `## [Unreleased]` entry to `CHANGELOG.md`; verify `README.md` currency per CLAUDE.md instructions (no new commands or skills added, so the command table is unchanged — confirm no lint Check 4 violations via `node scripts/lint.mjs`) (D1)
- **Model:** sonnet — mode-wiring is a straightforward conditional wrap over already-written prose; the lint check mirrors the existing Check 1–7 pattern; the one-line notes in `workflow` and `reviewer.md` are small targeted additions; Copilot sync is a script run, not authored code
- Checkpoint: Dev-install the kit. (1) Run `/qrspi:pr toy-change` in Full-auto mode on a fully-ticked toy change — confirm no AskUserQuestion fires and the reviewer spawns directly. (2) Add one un-ticked box back to the toy `tasks.md` and re-run in Full-auto — confirm the banner appears and the per-item gate fires (hard-stop). (3) Run `node scripts/lint.mjs` — confirm Check 8 reports OK and exit code is 0. (4) Temporarily delete the tasks-pass section from `claude/commands/pr.md` and re-run `node scripts/lint.mjs` — confirm Check 8 reports "tasks pass missing from pr.md" and exits non-zero; restore the section. (5) Run `node sync-copilot.mjs --check` — confirm zero drift. (6) Inspect `claude/agents/reviewer.md` for the Leave-for-now tolerance note. (7) Inspect `claude/skills/workflow/SKILL.md` for the one-line reconciliation-gate cross-reference.
