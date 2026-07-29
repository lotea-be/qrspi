# Tasks — architect-must-leads-requirement-first-line

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Authoring guidance: Warning paragraph + counter-example + sentinels

**Compute:** effort=low — mechanical prose insertion into two files, no logic, no cross-file coordination beyond placing identical sentinel-delimited blocks

- [x] 1.1 In `claude/agents/architect.md`: add the `**Warning —**` paragraph immediately before the "New capability" skeleton, and wrap the existing Format-rules MUST/SHALL bullet with `<!-- must-leads:begin -->` / `<!-- must-leads:end -->` sentinel comments (D1, D2, D9)
- [x] 1.2 In `openspec-templates/spec-delta.template.md`: add the matching permitted/forbidden counter-example bullet and wrap it with `<!-- must-leads:begin -->` / `<!-- must-leads:end -->` sentinel comments (D2, D9)
- [x] 1.3 Unit/integration test: run `node scripts/lint.mjs` on the modified tree; confirm all existing checks pass and exit code is 0 (no new check exists yet, so no new failure is expected)
- [x] 1.4 (human) Checkpoint: `node scripts/lint.mjs` exits 0; open `claude/agents/architect.md` in a viewer and confirm the `**Warning —**` paragraph is visible immediately before the "New capability" skeleton, and that the sentinel comments appear around the counter-example bullet — VERIFIED 2026-07-29: lint exit 0 (all 19 checks pass), warning at line 109 precedes "New capability" at line 111, sentinel blocks in architect.md and spec-delta.template.md are byte-identical

## 2. Check 20: `checkRequirementFirstLineModal` + inline self-test

**Compute:** effort=medium — new lint function with multi-glob scanning, section-boundary parsing, fence-block suppression, and five-fixture self-test; well-defined spec but non-trivial parsing logic

- [x] 2.1 In `scripts/lint.mjs`: add `async function checkRequirementFirstLineModal()` after Check 19; implement the two-glob scanner (delta specs excluding `/archive/`, base specs), ADDED/MODIFIED inclusion and REMOVED exclusion logic, first-non-blank-body-line extraction, `[must-leads]` error push, fence-block suppression, and empty-body skip (D3, D4, D5, D6, D7, D8)
- [x] 2.2 In `scripts/lint.mjs`: embed the five-fixture inline self-test inside `checkRequirementFirstLineModal()` covering: passing body, failing body, REMOVED skip, base-spec violating body, and fence-skip guard (D3, D4, D5, D6, D7, D8)
- [x] 2.3 In `scripts/lint.mjs`: register `await checkRequirementFirstLineModal()` in `main()` with a `process.stdout.write('Check 20: ...')` label; update the check-inventory header comment to list Check 20 (D3, D4)
- [x] 2.4 Unit/integration test: `node scripts/lint.mjs` exits 0 on the clean tree; the inline self-test within Check 20 passes (no `[must-leads] SELF-TEST FAILED` line in stdout)
- [x] 2.5 (human) Checkpoint: `node scripts/lint.mjs` exits 0 on the clean working tree and prints `Check 20: OK`; the self-test passes inline; manually introduce a violating requirement body in a scratch delta-spec file, run lint, confirm `[must-leads]` error appears and exit code is non-zero; remove the scratch file — VERIFIED 2026-07-29: clean run exit 0 (Check 20 present, 0 self-test failures); scratch violating delta → exit 1 with `[must-leads] … requirement "Scratch violates the rule" … (found: "When the token is expired,")`; after removing scratch, exit 0 restored

## 3. Check 21: `checkFormatRulesParity` + inline self-test + stale cheatsheet fix

**Compute:** effort=medium — new lint function with sentinel extraction, byte-identity assertion, three-fixture self-test, plus the one-line cheatsheet fix; similar complexity to Slice 2 but simpler parsing (two-file string comparison rather than multi-glob section scanning)

- [x] 3.1 In `scripts/lint.mjs`: add `async function checkFormatRulesParity()` after Check 20; implement sentinel extraction from both `claude/agents/architect.md` and `openspec-templates/spec-delta.template.md`; assert byte-identity; push `[format-rules-parity]` errors for missing-anchor and drift cases (D9, OQ2)
- [x] 3.2 In `scripts/lint.mjs`: embed the three-fixture inline self-test inside `checkFormatRulesParity()` covering: match, drift, and missing-anchor cases (D9, OQ2)
- [x] 3.3 In `scripts/lint.mjs`: register `await checkFormatRulesParity()` in `main()` with a `process.stdout.write('Check 21: ...')` label; update the check-inventory header comment to list Check 21 (D9, OQ2)
- [x] 3.4 In `.claude/skills/qrspi-stack/SKILL.md`: replace the stale "Checks 1--14" range with "Checks 1--21" (OQ3)
- [x] 3.5 Unit/integration test: `node scripts/lint.mjs` exits 0 on the clean tree and prints both `Check 20: OK` and `Check 21: OK`; the Check 21 inline self-test passes (no SELF-TEST FAILED in output)
- [x] 3.6 (human) Checkpoint: `node scripts/lint.mjs` exits 0 on the clean working tree and prints `Check 20: OK` and `Check 21: OK`; manually drift the sentinel block in one file, run lint, confirm `[format-rules-parity]` error appears and exit code is non-zero; restore the file and confirm the suite returns to green; open `.claude/skills/qrspi-stack/SKILL.md` and confirm the range now reads "Checks 1--21" — VERIFIED 2026-07-29: clean run exit 0 (Check 20 & 21 present); verified drift (DRIFTMARK in architect.md sentinel block) → exit 1 with `[format-rules-parity] … blocks differ`; restore → exit 0; cheatsheet reads "Checks 1-21" (two places)
