# Tasks — pr-review-open-tasks-and-followups

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Tasks pass end-to-end

**Model:** sonnet — prose additions and AskUserQuestion wiring inside an existing command file, following established `pr.md` patterns; the decision logic is well-scoped by the spec

- [x] 1.1 Edit `claude/commands/pr.md`: soften step-2 precondition from "all boxes ticked" to "tasks.md exists + working tree clean" (D2)
- [x] 1.2 Edit `claude/commands/pr.md`: insert tasks-pass section between the precondition check and the reviewer spawn — count banner, regular-task loop (Finish / Drop / Pause), `(human)`-tag loop (Confirm-done / Drop / Leave-for-now), Drop annotation writes (`- [x] ~~N.M text~~ (dropped)`), Confirm-done writes (`- [x] N.M text`), and early-exit commit logic (`docs(<id>): reconcile open tasks before PR`) (D3, PQ5, PQ8, D7)
- [x] 1.3 Author all AskUserQuestion prompt text inline in `claude/commands/pr.md`: count banner wording, per-item choice sets with slice/task context and `(i of M)` counter, the Finish second-question redirect to `/qrspi:implement`, and the Pause end-of-turn message (D3)
- [x] 1.4 Verify `node scripts/lint.mjs` passes (no Check 8 yet — that arrives in Slice 3)
- [x] 1.5 (human) Prepare toy change folder `openspec/changes/toy-change/` with `tasks.md` containing `- [ ] 1.1 Wire endpoint`, `- [ ] 1.2 (human) Code-review checkpoint`, and `- [x] 1.3 Write tests`; dev-install the kit (`claude --plugin-dir .`; `/reload-plugins` if already open); run `/qrspi:pr toy-change` and verify: precondition passes; banner shows "2 open tasks (1 `(human)` box)"; box 1.1 offered [Finish, Drop, Pause]; choose Drop → line becomes `- [x] ~~1.1 Wire endpoint~~ (dropped)`; box 1.2 offered [Confirm-done, Drop, Leave-for-now] (Finish absent); choose Leave-for-now → box remains un-ticked; if a prior run had Pause after a Drop, confirm early-exit commit via `git log --oneline -1`

## 2. Follow-ups pass end-to-end

**Model:** sonnet — follow-ups pass mirrors the tasks-pass pattern established in Slice 1; the Promote path's backlog write reuses the existing "Capturing deferred work" workflow-skill machinery; no novel reasoning required

- [x] 2.1 Edit `claude/commands/pr.md`: append follow-ups pass section after the tasks pass — walk `- [ ]` entries in `followups.md`; present Fix-now / Defer / Drop / Promote per entry; tolerate absent, prose-only, or all-ticked `followups.md` as a clean pass (D4, D6)
- [x] 2.2 Author all AskUserQuestion prompt text for the follow-ups pass inline in `claude/commands/pr.md`: count banner component (M un-resolved follow-ups), per-entry choice set with entry text, Fix-now second-question redirect to `/qrspi:followup`, Defer no-op continuation, Drop annotation, Promote backlog-row write + annotation (D4)
- [x] 2.3 Implement on-disk writes for the follow-ups pass in `claude/commands/pr.md`: Drop → `- [x] … (dropped — no longer needed)`; Promote → `- [x] … (promoted to backlog)` plus one new `idea` row appended to `openspec/backlog.md`; Defer → entry left unchanged; all Drop/Promote writes staged for the final `docs(<id>): record PR #<N> link` commit (D7)
- [x] 2.4 Verify `node scripts/lint.mjs` passes
- [x] 2.5 (human) Extend the toy change: add `followups.md` with `- [ ] Investigate caching` and `- [ ] Remove debug logging`; run `/qrspi:pr toy-change`; verify: tasks pass completes (or skips cleanly); follow-ups banner shows "2 un-resolved follow-ups"; entry 1 offered [Fix now, Defer, Drop, Promote to backlog idea]; choose Drop → becomes `- [x] Investigate caching (dropped — no longer needed)`; entry 2 choose Promote → becomes `- [x] Remove debug logging (promoted to backlog)` and `openspec/backlog.md` gains one new `idea` row
- [ ] 2.6 (human) Remove `followups.md` from the toy change folder and re-run `/qrspi:pr toy-change`; confirm the follow-ups pass is a clean no-op (no AskUserQuestion, no error)

## 3. Auto-mode wiring, lint Check 8, reviewer note, and docs

**Model:** sonnet — mode-wiring is a straightforward conditional wrap over already-written prose; the lint check mirrors the existing Check 1–7 pattern; the one-line notes in `workflow` and `reviewer.md` are small targeted additions; Copilot sync is a script run, not authored code

- [x] 3.1 Edit `claude/commands/pr.md`: wrap each pass's AskUserQuestion calls with mode-awareness — Full/Semi-auto + clean pass → suppress silently; Full/Semi-auto + open items → fire hard-stop (show banner, run gate, do NOT auto-advance); Manual → always show banner including "0 open" message (D5, OQ2)
- [x] 3.2 Edit `claude/skills/workflow/SKILL.md`: add one-line cross-reference in the Hard-stop procedure section noting the conditional hard-stop at the PR reconciliation gate and pointing to `claude/commands/pr.md` for full mechanics (OQ2)
- [x] 3.3 Edit `claude/agents/reviewer.md`: add one-line awareness note that a pre-reconciliation gate runs upstream and that a `(human)` box left via Leave-for-now is a sanctioned open box, not a blocking issue (D8)
- [x] 3.4 Edit `scripts/lint.mjs`: add `checkPrReconciliationPasses()` async function after Check 7 using the same dependency-free ESM pattern; check for structural anchors (tasks-pass heading + Finish/Drop/Pause labels; follow-ups-pass heading + Fix-now/Defer/Drop/Promote labels) in `claude/commands/pr.md`; report violation if either pass is missing; emit `process.stdout.write('Check 8: ...')` label in `main()` (D8-bis, OQ3)
- [x] 3.5 Run `node sync-copilot.mjs` to regenerate `copilot/prompts/qrspi-pr.prompt.md` from the updated `claude/commands/pr.md`; run `node sync-copilot.mjs --check` to assert zero drift (D1)
- [x] 3.6 Add an entry under `## [Unreleased]` in `CHANGELOG.md` describing this change (D1)
- [x] 3.7 Verify `README.md` currency: no new commands or skills added, so the command table is unchanged — confirm no lint Check 4 violations via `node scripts/lint.mjs` (D1)
- [x] 3.8 (human) Dev-install the kit; run `/qrspi:pr toy-change` in Full-auto mode on a fully-ticked toy change — confirm no AskUserQuestion fires and the reviewer spawns directly
- [x] 3.9 (human) Add one un-ticked box back to the toy `tasks.md` and re-run in Full-auto mode — confirm the banner appears and the per-item gate fires (hard-stop)
- [ ] 3.10 (human) Run `node scripts/lint.mjs` — confirm Check 8 reports OK and exit code is 0
- [ ] 3.11 (human) Temporarily delete the tasks-pass section from `claude/commands/pr.md` and re-run `node scripts/lint.mjs` — confirm Check 8 reports "tasks pass missing from pr.md" and exits non-zero; restore the section afterwards
- [ ] 3.12 (human) Run `node sync-copilot.mjs --check` — confirm zero drift; inspect `claude/agents/reviewer.md` for the Leave-for-now tolerance note; inspect `claude/skills/workflow/SKILL.md` for the one-line reconciliation-gate cross-reference
