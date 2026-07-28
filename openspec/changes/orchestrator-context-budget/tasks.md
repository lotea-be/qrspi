# Tasks -- orchestrator-context-budget

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Gate fires on the stage path

**Compute:** effort=medium -- new skill with non-trivial branching logic (dual trigger, two thresholds, two session flags, run-mode-agnostic soft gate); 8-command embed is mechanical but the position rule is load-bearing (D4)

- [x] 1.1 Create `claude/skills/context-budget-gate/SKILL.md` with YAML frontmatter, in-context counter logic, dual-trigger evaluation (counter OR self-assessment), nudge at 8 (print advisory + set flag, no AskUserQuestion), soft gate at 12 (AskUserQuestion "Reset now" / "Continue anyway", never suppressed; "Reset now" prints resume one-liner and ends turn), and per-level fire-once session flags (D1, D3, D5, D6, D7, D8)
- [x] 1.2 Insert the `context-budget-gate` load line after `qrspi-version-check` and before run-mode establishment in all 8 stage command files: `claude/commands/questions.md`, `research.md`, `design.md`, `structure.md`, `slices.md`, `plan.md`, `implement.md`, `pr.md` (D2, D4)
- [x] 1.3 Add a third bullet to the "Never-suppressed gates" list in `claude/skills/workflow/SKILL.md` naming the context-budget soft gate and noting it fires in all run-modes with "Reset now" ending the turn (D9)
- [x] 1.4 Run `node scripts/lint.mjs` (smoke pass -- the Slice 3 lint check does not exist yet); manually verify the embed is positioned correctly in at least one command file (e.g., `plan.md`)
- [ ] 1.5 (human) In a fresh `claude --plugin-dir /workspaces/git/qrspi` session, invoke any stage command 8 times; confirm the one-line nudge advisory appears exactly once and the stage proceeds without an AskUserQuestion. Invoke 4 more times (total 12); confirm the soft-gate AskUserQuestion appears. Select "Reset now"; confirm the resume one-liner is printed and the turn ends. Start a new session and confirm no flags carry over (counter starts at 1).

## 2. Boundary resets

**Compute:** effort=low -- two command-file edits against established patterns; the archive step-7 wording mirrors the soft-gate "Reset now" pattern already shipped in Slice 1 (D10)

- [x] 2.1 Insert the `context-budget-gate` load line after `qrspi-version-check` in `claude/commands/archive.md` (D2, D4)
- [x] 2.2 Add step-7 AskUserQuestion ("Start a new session for the next change?" / "Yes -- print resume path and end turn" / "No -- stay in this session") after the successful-archive block in `claude/commands/archive.md`; "Yes" prints `/qrspi:status` and ends the turn without auto-advancing; the offer is never suppressed by run-mode (D10)
- [x] 2.3 Insert the `context-budget-gate` load line after `qrspi-version-check` in `claude/commands/followup.md` (D2, D4)
- [x] 2.4 Verify that `claude/skills/context-budget-gate/SKILL.md` (shipped in Slice 1) already instructs the once-per-invocation nudge rule for `/qrspi:followup`; make no additional skill edit if the rule is already present (D8)
- [x] 2.5 Run `node scripts/lint.mjs` smoke pass; manually verify step-7 prose and embed positions in `archive.md` and `followup.md`
- [ ] 2.6 (human) In a fresh `claude --plugin-dir /workspaces/git/qrspi` session, archive a throwaway fixture change; confirm the step-7 AskUserQuestion appears after the commit and selecting "Yes" prints `/qrspi:status` and ends the turn. Then in a separate session invoke `/qrspi:followup` on a change with 2+ follow-up items after crossing the nudge threshold (8 prior events); confirm the nudge fires at most once during that invocation.

## 3. Docs + guardrail

**Compute:** effort=medium -- the lint check is new logic (file-read loop, constant definition, inline-form assertion, excluded-commands guard); the context-hygiene prose edit is light but the vocabulary constraint (cross-stage not cross-change) requires care

- [ ] 3.1 Add `checkBudgetGateEmbed` to `scripts/lint.mjs` after Check 9, using the same async-function-pushing-to-errors pattern; hardcode `BUDGET_GATE_COMMAND_STEMS` as the 11-command constant; assert inline form (not transitive-only); flag missing embeds by file name; excluded commands (`status.md`, `update.md`, `retro.md`) must not be in the constant (D12, D13)
- [ ] 3.2 Add `## Marathon anti-pattern` subsection to `claude/skills/context-hygiene/SKILL.md` with "cross-stage within one session" vocabulary and a 4th mechanism bullet naming the `context-budget-gate` skill (D14)
- [ ] 3.3 Check `README.md` for any skills list or lint-checks section that needs updating to reflect the new `context-budget-gate` skill and the new `checkBudgetGateEmbed` lint check; update as needed to keep `README.md` current per `CLAUDE.md` policy
- [ ] 3.4 Run `node scripts/lint.mjs` -- must exit 0 with all 11 embeds present
- [ ] 3.5 Temporarily remove the `context-budget-gate` load line from `claude/commands/plan.md`, run `node scripts/lint.mjs` again, confirm `checkBudgetGateEmbed` reports a violation naming `plan.md` and exits non-zero; restore the line and confirm the check passes again
- [ ] 3.6 Run `openspec validate orchestrator-context-budget --strict`
