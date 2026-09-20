# Tasks — lint-auto-mode-gate-coverage

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Choreography-embed check, end to end

**Compute:** effort=low model=haiku — single-file edit, zero design reasoning, pattern mirrors two existing adjacent checks (Checks 9/10 for version-check and budget-gate embeds) with fully specified constant names, substring, and self-test shape.

- [x] 1.1 Add constants `CHOREOGRAPHY_EMBED_COMMAND_STEMS` (array of 8 stem strings: `questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`) and `CHOREOGRAPHY_EMBED_LINE` (the substring ending at `exactly`, no trailing period) beside the existing embed constants in `scripts/lint.mjs` (D1, D2)
- [x] 1.2 Add `checkChoreographyEmbed(errors)` with an inline self-test (present-fixture passes, absent-fixture fires) run before file I/O, following the Check 24 pattern; then a per-stem whitespace-collapse `.includes()` scan; error tag `[choreography-embed]` (D2, D3, D4)
- [x] 1.3 Register `checkChoreographyEmbed` as Check 26 appended at the end of `main()` (no renumbering of existing checks); update the top-of-file check-enumeration comment block to include Check 26 (D1, D2)
- [x] 1.4 Unit/integration test: inline self-test covers happy path (present-fixture passes) + 1 error case (absent-fixture fires) — already embedded in `checkChoreographyEmbed`; confirm both branches are exercised when `node scripts/lint.mjs` runs (D3, D4)
- [x] 1.5 (human) Checkpoint: **VERIFIED by orchestrator observation 2026-09-20.**
  1. `node scripts/lint.mjs` prints `Check 26: Choreography embed` → `OK: all 8 stage command(s) contain the stage-choreography embed line`. (Script exits 1 only because of a PRE-EXISTING Check 1 pin violation in `.claude/settings.local.json` referencing openspec `1.4.1` — unrelated to Check 26; Check 26 itself is green.)
  2. Breaking the wrapped step-3 line in `claude/commands/plan.md` produced `[choreography-embed] claude/commands/plan.md: missing inline stage-choreography embed line (expected to find: "...")` and non-zero exit, confirming the guard is live.
  3. Restoring `plan.md` returned Check 26 to its OK line.
  4. Checks 1–25 labels are unchanged (Check 10 carries a `(budget-gate-embed)` parenthetical, present as before); Check 26 is appended last with no renumbering.

## 2. Housekeeping

**Compute:** effort=low model=haiku — mechanical CHANGELOG entry, no design reasoning.

- [ ] 2.1 Add a `## [Unreleased]` entry to `CHANGELOG.md` describing Check 26 (`checkChoreographyEmbed`) and the new constants added to `scripts/lint.mjs`
