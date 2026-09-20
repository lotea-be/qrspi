# Tasks — lint-auto-mode-gate-coverage

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Choreography-embed check, end to end

**Compute:** effort=low model=haiku — single-file edit, zero design reasoning, pattern mirrors two existing adjacent checks (Checks 9/10 for version-check and budget-gate embeds) with fully specified constant names, substring, and self-test shape.

- [ ] 1.1 Add constants `CHOREOGRAPHY_EMBED_COMMAND_STEMS` (array of 8 stem strings: `questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`) and `CHOREOGRAPHY_EMBED_LINE` (the substring ending at `exactly`, no trailing period) beside the existing embed constants in `scripts/lint.mjs` (D1, D2)
- [ ] 1.2 Add `checkChoreographyEmbed(errors)` with an inline self-test (present-fixture passes, absent-fixture fires) run before file I/O, following the Check 24 pattern; then a per-stem whitespace-collapse `.includes()` scan; error tag `[choreography-embed]` (D2, D3, D4)
- [ ] 1.3 Register `checkChoreographyEmbed` as Check 26 appended at the end of `main()` (no renumbering of existing checks); update the top-of-file check-enumeration comment block to include Check 26 (D1, D2)
- [ ] 1.4 Unit/integration test: inline self-test covers happy path (present-fixture passes) + 1 error case (absent-fixture fires) — already embedded in `checkChoreographyEmbed`; confirm both branches are exercised when `node scripts/lint.mjs` runs (D3, D4)
- [ ] 1.5 (human) Checkpoint:
  1. Run `node scripts/lint.mjs` — must exit 0 and print `Check 26: OK: all 8 stage command(s) contain the stage-choreography embed line`.
  2. Temporarily remove or comment out the `Load skill \`stage-choreography\`` line from `claude/commands/plan.md`, run `node scripts/lint.mjs` again — must print a `[choreography-embed] claude/commands/plan.md: missing inline stage-choreography embed line` violation and exit non-zero.
  3. Restore `plan.md` and confirm `node scripts/lint.mjs` exits 0 again.
  4. Confirm Checks 1–25 labels are unchanged in the output.

## 2. Housekeeping

**Compute:** effort=low model=haiku — mechanical CHANGELOG entry, no design reasoning.

- [ ] 2.1 Add a `## [Unreleased]` entry to `CHANGELOG.md` describing Check 26 (`checkChoreographyEmbed`) and the new constants added to `scripts/lint.mjs`
