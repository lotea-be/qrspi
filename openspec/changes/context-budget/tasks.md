# Tasks — context-budget

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Input trims + skill-set registry & lint allowlist

**Model:** sonnet — mechanical trim of four load lines + a new lint check that mirrors the existing `READ_CONTRACT_EXPECTED` / `checkReadContracts` pattern; no novel architectural reasoning required.

- [ ] 1.1 Add `SKILL_SET_EXPECTED` registry constant to `scripts/lint.mjs` (D2, D5)
- [ ] 1.2 Add `checkSkillSets` function and register it in `main()` after Check 2 (D5, D6)
- [ ] 1.3 Remove `openspec-workflow` from the `Load skills` line in `claude/agents/researcher.md`, `claude/agents/questioner.md`, `claude/agents/designer.md`, and `claude/agents/planner.md` (D1)
- [ ] 1.4 Add `context-hygiene` to the `Load skills` line in `claude/agents/researcher.md` (D3)
- [ ] 1.5 Unit/integration test: `node scripts/lint.mjs` exits 0 with all four agents trimmed; mutate one agent to add a stray skill load and confirm non-zero exit naming the violation (D5)
- [ ] 1.6 (human) Checkpoint: run `node scripts/lint.mjs` in the repo — confirm it exits 0 and reports no `checkSkillSets` errors. Then manually add `openspec-workflow` to `claude/agents/planner.md`, re-run lint, and confirm a non-zero exit with a message naming the stray skill. Revert before continuing.

## 2. Output-contract banners + Check 12

**Model:** sonnet — banner insertion is templated (same text to seven files); `checkOutputContracts` is a pattern-match check mirroring Check 7 (`checkReadContracts`); no deep reasoning required.

- [ ] 2.1 Add `checkOutputContracts` function and register it in `main()` as Check 12 in `scripts/lint.mjs` (D4)
- [ ] 2.2 Add `> **Output contract**` banner block to all seven stage agent files: `claude/agents/researcher.md`, `questioner.md`, `designer.md`, `architect.md`, `planner.md`, `implementer.md`, `reviewer.md` (D4)
- [ ] 2.3 Add cap sentence to `claude/agents/implementer.md` and `claude/agents/reviewer.md` banner blocks (D4)
- [ ] 2.4 Unit/integration test: `node scripts/lint.mjs` exits 0 with all seven banners present; remove one banner and confirm non-zero exit naming the offending file (D4)
- [ ] 2.5 (human) Checkpoint: run `node scripts/lint.mjs` — confirm Check 12 passes. Then remove the `> **Output contract**` line from `claude/agents/implementer.md`, re-run, and confirm a non-zero exit naming `implementer.md`. Revert before continuing.

## 3. Footprint script

**Model:** sonnet — a report-only script with no decision logic; file-reading + arithmetic + table formatting, all in Node built-ins; pattern similar to existing `scripts/*.mjs` files.

- [ ] 3.1 Add `scripts/context-footprint.mjs` as a Node ESM script using built-ins only; import or re-declare `SKILL_SET_EXPECTED` from `scripts/lint.mjs` or a shared module so the two sources never drift (D7)
- [ ] 3.2 Implement table output: seven rows × five columns (agent stem, skill count, total lines, total bytes, rough tokens via `Math.round(bytes / 4)`) printed to stdout (D7)
- [ ] 3.3 Ensure the script exits unconditionally with `process.exit(0)` — no ceiling gate (D7)
- [ ] 3.4 Unit/integration test: `node scripts/context-footprint.mjs` runs to completion, exits 0, and prints exactly seven data rows
- [ ] 3.5 (human) Checkpoint: run `node scripts/context-footprint.mjs` from the repo root — confirm it prints a table with seven rows (one per stage) and exits 0. Spot-check that the token column is present and numeric.

## 4. context-hygiene pointer + README + CHANGELOG

**Model:** sonnet — pure documentation edits; no algorithmic reasoning; all three files have a settled structure and the additions are one-liner or bullet-list inserts.

- [ ] 4.1 Add enforcement pointer to `claude/skills/context-hygiene/SKILL.md` naming `checkSkillSets` (Check N from slice 1), Check 12 (`checkOutputContracts`), and `scripts/context-footprint.mjs` (D3, PQ6)
- [ ] 4.2 Update `README.md` to document `checkSkillSets` and Check 12 in the helpers/checks surface and `scripts/context-footprint.mjs` in the scripts table (PQ6)
- [ ] 4.3 Add `## [Unreleased]` entries to `CHANGELOG.md` for `checkSkillSets`, Check 12 (`checkOutputContracts`), and `scripts/context-footprint.mjs` (PQ6)
- [ ] 4.4 Checkpoint: `node scripts/lint.mjs` exits 0 with Check 4 (README command coverage) passing; confirm `README.md` contains entries for `checkSkillSets`, Check 12, and `context-footprint.mjs`
