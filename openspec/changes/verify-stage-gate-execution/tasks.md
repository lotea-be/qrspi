# Tasks — verify-stage-gate-execution

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Lint guard (Check 5)

**Model:** sonnet — mechanical pattern: parse frontmatter key, grep body for tool name, push to errors array. Mirrors the existing `checkFrontmatter` pattern already in `scripts/lint.mjs`.

- [x] 1.1 Add `MAIN_LOOP_ONLY = new Set(['AskUserQuestion'])` constant and `BUILTIN_AGENTS` exclusion list to `scripts/lint.mjs` (D6)
- [x] 1.2 Implement `checkGateExecutor(errors)` async function in `scripts/lint.mjs`: for each `claude/commands/*.md`, parse frontmatter for a non-builtin `agent:` field; if found, flag a violation if the body *reaches* a `MAIN_LOOP_ONLY` tool — either directly (tool name in body) OR transitively (body references the `qrspi-workflow` "Stage choreography" commit step / next-stage handoff, which invoke the tool); push a violation to `errors[]` on match, print an `OK:` line otherwise (D6, strengthened at stage I)
- [x] 1.3 Register `checkGateExecutor` after Check 4 in `main()` with a `process.stdout.write('Check 5: ...')` label using the existing dependency-free ESM pattern in `scripts/lint.mjs` (D6)
- [x] 1.4 Checkpoint: run `node scripts/lint.mjs`; confirm it exits 1 with exactly 9 Check 5 violations (one for each of `questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`, `followup`). Confirm helper commands (`archive`, `init`, `stack`, `retro`, `status`) produce no Check 5 violation. Confirm all existing Check 1–4 results are unchanged.

## 2. Core conversion: six simpler stage commands + skill edits

**Model:** sonnet — the D2 body shape is a well-defined template; applying it to six structurally similar commands is templated, mechanical work. The `qrspi-workflow` and `context-hygiene` edits are targeted prose changes with clear before/after (D4/D5 in design.md).

- [x] 2.1 In `claude/commands/questions.md`: remove `agent:` and `subtask:` from frontmatter (keep `description:`); restructure body to the canonical D2 orchestrator shape — Glob precondition → spawn `questioner` subagent via Agent tool for artifact write → interactive review → AskUserQuestion commit gate with explicit `git add/commit/push` → AskUserQuestion next-stage handoff that re-enters `/qrspi:research <id>` in the main loop (D1, D2, D3)
- [x] 2.2 In `claude/commands/research.md`: remove `agent:` and `subtask:` from frontmatter (keep `description:`); restructure body to the canonical D2 orchestrator shape — Glob precondition → spawn `researcher` subagent via Agent tool → AskUserQuestion commit gate → AskUserQuestion handoff re-entering `/qrspi:design <id>` in the main loop (D1, D2, D3)
- [x] 2.3 In `claude/commands/structure.md`: remove `agent:` and `subtask:` from frontmatter (keep `description:`); restructure body to canonical D2 shape — Glob precondition + AskUserQuestion approval gate for `design.md` → spawn `architect` subagent via Agent tool for artifact write → AskUserQuestion commit gate → AskUserQuestion handoff re-entering `/qrspi:slices <id>` in the main loop (D1, D2, D3)
- [x] 2.4 In `claude/commands/slices.md`: remove `agent:` and `subtask:` from frontmatter (keep `description:`); restructure body to canonical D2 shape — Glob precondition → spawn `architect` subagent via Agent tool → AskUserQuestion commit gate → AskUserQuestion handoff re-entering `/qrspi:plan <id>` in the main loop (D1, D2, D3)
- [x] 2.5 In `claude/commands/plan.md`: remove `agent:` and `subtask:` from frontmatter (keep `description:`); restructure body to canonical D2 shape — Glob precondition → spawn `planner` subagent via Agent tool → AskUserQuestion commit gate → AskUserQuestion handoff re-entering `/qrspi:implement <id>` in the main loop (D1, D2, D3)
- [x] 2.6 In `claude/commands/followup.md`: remove `agent:` and `subtask:` from frontmatter (keep `description:`); restructure body to canonical D2 shape — Glob precondition → spawn appropriate subagent via Agent tool for the fix → AskUserQuestion commit gate → AskUserQuestion handoff (D1, D2, D3)
- [x] 2.7 Edit `claude/skills/qrspi-workflow/SKILL.md` "Stage choreography (canonical procedures)" section: rewrite executor attribution to state explicitly that the main-loop orchestrator runs all four procedures (precondition, commit, next-stage handoff, and interactive review); change "fresh subtask/subagent" and "invoke the next stage as a subagent" handoff wording to "invoke the next-stage command so it runs as its own stage in the main loop" (D4, D3)
- [x] 2.8 Edit `claude/skills/context-hygiene/SKILL.md`: add one clarifying sentence under "Subagents are context firewalls" — the orchestrator owns human dialogue (commit/handoff/approval) and the next-stage invocation; the subagent does only the bounded artifact write, because AskUserQuestion is unavailable inside a subagent. Standardise "Task tool" → "Agent tool" throughout the skill (D5)
- [x] 2.9 Checkpoint: run `node scripts/lint.mjs`; confirm Check 5 shows exactly 3 violations (for `design`, `implement`, `pr`) and exits 1. Confirm the six converted commands each have only `description:` in frontmatter (no `agent:` or `subtask:`). Confirm Check 2 still passes for all six commands and for both edited skill files. Confirm `qrspi-workflow` SKILL.md contains no "fresh subtask" or "invoke the next stage as a subagent" phrasing in the handoff step. Confirm `context-hygiene` SKILL.md uses "Agent tool" (not "Task tool") throughout.

## 3. Core conversion: three deviating stage commands

**Model:** sonnet — `implement.md` is a frontmatter-strip only (the body is already orchestrator-shaped per research §Deviations). `design.md` and `pr.md` require reading their documented deviations carefully to preserve them, but design.md D2 gives explicit before/after guidance for each. No novel reasoning required beyond following design.md's documented deviation notes.

- [x] 3.1 In `claude/commands/implement.md`: remove `agent:` and `subtask:` from frontmatter only (keep `description:`); leave the body unchanged — it is already orchestrator-shaped with per-slice Agent tool spawns and its two AskUserQuestion calls per slice; confirm the body still references the Agent tool with `model: <annotated>` per-slice annotation (D1, D2)
- [x] 3.2 In `claude/commands/design.md`: remove `agent:` and `subtask:` from frontmatter (keep `description:`); restructure body to canonical D2 shape while preserving its documented deviation — the final-confirmation AskUserQuestion answer is reused for the next-stage handoff (no separate handoff gate); spawn `designer` subagent via Agent tool for the artifact write; the orchestrator runs the decision-by-decision interactive review loop and the commit gate (D1, D2)
- [x] 3.3 In `claude/commands/pr.md`: remove `agent:` and `subtask:` from frontmatter (keep `description:`); restructure body to canonical D2 shape while preserving its documented deviations — two-part precondition (Glob + Bash `git status --short`); spawn `reviewer` subagent via Agent tool for PR creation; unconditional commit step after PR creation (no AskUserQuestion gate before the commit) (D1, D2)
- [x] 3.4 Checkpoint: run `node scripts/lint.mjs`; confirm it exits 0 with Check 5 reporting 0 violations. Confirm all nine stage commands have only `description:` in frontmatter. Confirm `implement.md` body still references the Agent tool with `model: <annotated>` per-slice annotation. Confirm `pr.md` body still has its two-part precondition (Glob + Bash `git status --short`).

## 4. Docs and Copilot parity

**Model:** sonnet — the README edit is a single sentence substitution with the exact new wording provided in design.md D8. The Copilot regeneration is a script execution with a zero-drift verification check, not reasoning work.

- [ ] 4.1 Rewrite `README.md` line 192: replace the current delegation claim with: "A Copilot prompt carries an `agent:` field so the whole prompt runs in that agent; the Claude command instead runs in the main loop and spawns its subagent (via the Agent tool) only for the bounded artifact write, keeping the human gates on the orchestrator." (D8)
- [ ] 4.2 Regenerate the `copilot/` tree by running `node sync-copilot.mjs` — do NOT hand-edit any file under `copilot/` directly (CLAUDE.md rule); body rewrites from D2/D4/D5 propagate automatically through `rewriteAll` in `sync-copilot.mjs` (D7)
- [ ] 4.3 Verify zero drift: run `node sync-copilot.mjs --check`; confirm it exits 0 with no ADDED/DELETED/DIFF lines (D7)
- [ ] 4.4 Checkpoint: `node sync-copilot.mjs --check` exits 0. `node scripts/lint.mjs` exits 0 (all checks including Check 5 green). README.md line 192 contains "main loop" and "bounded artifact write" language matching D8's final wording.

## 5. Final acceptance

- [ ] 5.1 Run `node scripts/lint.mjs`; confirm green (Check 1 through Check 5 all pass, 0 violations)
- [ ] 5.2 Run `node sync-copilot.mjs --check`; confirm zero drift (exits 0)
- [ ] 5.3 Manually invoke a QRSPI stage command (e.g. `/qrspi:plan <id>`) and confirm the AskUserQuestion commit gate fires visibly in the main conversation (not silently swallowed inside a subagent)
