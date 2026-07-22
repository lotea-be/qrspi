# Follow-ups -- pr-review-open-tasks-and-followups

> Post-PR fix queue. Resolve with `/qrspi:followup pr-review-open-tasks-and-followups`.
> Archived with the change; every box should be ticked before archival.

> All eight items are `(human)` dogfood-verification runs left legitimately
> un-ticked per the change's own OQ1 `(human)`-box design. They are the
> behavioral acceptance bar for this change and require a dev-install of the kit
> (`claude --plugin-dir .`) plus manual `/qrspi:pr toy-change` runs — no
> automated test covers these paths. Complete them before marking PR #21 ready.

- [x] **Dogfood 1.5 — slice 1 tasks-pass UI + Drop annotation.** Prepare `openspec/changes/toy-change/tasks.md` with the prescribed ticked/un-ticked/`(human)` box mix; dev-install; run `/qrspi:pr toy-change`; verify the count banner, the Finish/Drop/Pause prompt, the Drop strikethrough annotation, the `(human)` Confirm-done/Drop/Leave-for-now prompt, and the early-exit commit. (tasks.md 1.5) (source: PR review)
- [x] **Dogfood 2.5 — follow-ups pass Drop + Promote.** Extend the toy change with a two-item `followups.md`; run `/qrspi:pr toy-change`; choose Drop for entry 1 and Promote for entry 2; verify the annotations and the new `openspec/backlog.md` idea row. (tasks.md 2.5) (source: PR review)
- [ ] **Dogfood 2.6 — absent followups.md is a clean no-op.** Remove `followups.md` from the toy change folder and re-run `/qrspi:pr toy-change`; confirm the follow-ups pass is a silent clean pass (no AskUserQuestion, no error). (tasks.md 2.6) (source: PR review)
- [x] **Dogfood 3.8 — Full-auto clean run spawns reviewer without gates.** Run `/qrspi:pr toy-change` in Full-auto mode on a fully-ticked toy change; confirm no AskUserQuestion fires and the reviewer spawns directly (mode-aware suppress). (tasks.md 3.8) (source: PR review)
- [x] **Dogfood 3.9 — Full-auto dirty run hard-stops at the gate.** Add one un-ticked box to the toy `tasks.md` and re-run in Full-auto; confirm the banner appears and the per-item gate fires as a hard-stop rather than auto-advancing. Primary behavioral acceptance test for D5 / PQ3. (tasks.md 3.9) (source: PR review)
- [ ] **Dogfood 3.10 — Check 8 passes on the live kit.** After dev-install, run `node scripts/lint.mjs`; confirm Check 8 reports OK and exit code 0. (tasks.md 3.10) (source: PR review)
- [ ] **Dogfood 3.11 — Check 8 catches deletion of the tasks-pass section.** Temporarily delete the tasks-pass section from `claude/commands/pr.md`, run `node scripts/lint.mjs`, confirm Check 8 reports "tasks pass missing from pr.md" and exits non-zero, then restore. Negative-path test for D8-bis. (tasks.md 3.11) (source: PR review)
- [ ] **Dogfood 3.12 — zero-drift + awareness-note spot-check.** Run `node sync-copilot.mjs --check` (zero drift); inspect `claude/agents/reviewer.md` for the Leave-for-now tolerance note and `claude/skills/workflow/SKILL.md` for the reconciliation-gate cross-reference. (tasks.md 3.12) (source: PR review)
