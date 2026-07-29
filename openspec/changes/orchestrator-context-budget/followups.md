# Follow-ups -- orchestrator-context-budget

> Post-PR fix queue. Resolve with `/qrspi:followup orchestrator-context-budget`. Archived with the
> change; every box should be ticked before archival.

- [x] **Make the reset gate name `/clear`.** The "Reset now" / archive-step-7 "Yes" branches should direct the user to run `/clear` (the lightweight in-place reset), since auto-invoking it is infeasible (slash commands are user-initiated; verified via claude-code-guide). (source: user request) (re-aligned in place -- slice 4)
- [x] **Correct the "11 commands" off-by-one in prose.** `design.md`, `proposal.md`, `specs/context-budget-gate/spec.md`, `specs/ci-quality-gates/spec.md`, and `README.md` all say "11 commands"; the real embed set is **10** (8 stage commands + `archive` + `followup`). The implementation is correct at 10 — `BUDGET_GATE_COMMAND_STEMS` in `scripts/lint.mjs`, the skill, and the commands all agree — only the prose is wrong. Replace "11" → "10" in those docs. Non-blocking documentation drift. (source: PR review) (fixed)
