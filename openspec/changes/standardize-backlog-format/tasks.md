# Tasks — standardize-backlog-format

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Check-10 label collision fix

**Compute:** effort=low model=sonnet — mechanical label renumber with no logic change; purely find-and-replace across two files.

- [ ] 1.1 In `scripts/lint.mjs`, identify which `process.stdout.write` label currently reads `"Check 10: ..."` for `checkTriagePaths`; renumber it and any downstream labels (`checkTriagePaths` onward) to the next free slot(s), keeping `checkBudgetGateEmbed` as Check 10. Update every `process.stdout.write` label string in `main()` to carry a unique `"Check N"` number. (D1)
- [ ] 1.2 Update `README.md`: change the Check-list entry for `checkTriagePaths` to the renumbered label and adjust the total Check count to match. (D1)
- [ ] 1.3 Unit/integration test: run `node scripts/lint.mjs`; confirm exit 0, no two `"Check N:"` lines in stdout share the same N, and `checkTriagePaths` still fires on a synthetic missing-P2-choice condition.
- [ ] 1.4 Checkpoint: run `node scripts/lint.mjs` in repo root — all checks report `OK`, no duplicate `"Check N"` label appears. Read `README.md` Check-list and confirm the renumbered entry and count are consistent. (D1)

## 2. Check 22 + kit backlog backfill + backlog template

**Compute:** effort=high model=opus — authoring real `**Shape:**` text for ~51 backlog rows is genuine content work, not mechanical; the regex with non-ASCII code points (em-dash U+2014, middle-dot U+00B7) and the row-classification logic (D3, D6) require careful reasoning; the inline self-test covers four distinct classifier cases (D4).

- [ ] 2.1 In `scripts/lint.mjs`, implement `checkBacklogSchema` as an async function pushing to `errors[]`. Write the frozen heading regex using explicit Unicode escapes: em-dash as `—` and middle-dot as `·` so the code points are unambiguous. Implement all six assertions: (1) three `## ` section headings present; (2) P-band preamble under `## Ideas`; (3) every `### ` line matches the frozen regex; (4) status leading keyword in `{idea, proposed, in-progress, merged, bundled}`; (5) standalone `idea`/`proposed` rows carry both `**Why:**` and `**Shape:**` (`bundled`/`merged` exempt, `in-progress` grammar-and-enum only); (6) `openspec-templates/backlog.template.md` exists. Register it in `main()` as `process.stdout.write('Check 22: checkBacklogSchema ...')` after Check 21. Pass silently when `openspec/backlog.md` is absent. (D2, D3, D6)
- [ ] 2.2 Add the inline self-test to `checkBacklogSchema` — runs before any file I/O, covers all four classifier cases: (a) well-formed standalone `idea` row with `**Why:**` and `**Shape:**` — MUST pass; (b) heading with wrong separator (double-hyphen or missing band) — MUST fire grammar detector; (c) standalone `idea` row missing `**Shape:**` — MUST fire body-field detector; (d) `bundled into <id> (<date>)` row with only a `>` blockquote pointer note — MUST NOT fire (guards the exempt class). If any assertion fails, push a self-test error to `errors[]` and return early. (D4)
- [ ] 2.3 Author `openspec-templates/backlog.template.md`: open with a `<!-- ... -->` legend comment documenting the heading grammar, status enum, separator characters (em-dash U+2014, middle-dot U+00B7), and the standalone-vs-exempt body rule. Include the three `## ` section headings (`## In progress`, `## Proposed`, `## Ideas`), a P-band preamble under `## Ideas` mentioning P1, P2, and P3, at least one sample standalone `idea` row with both `**Why:**` and `**Shape:**` using the frozen em-dash grammar, and at least one sample `bundled` row with a `>` pointer note. The file copied verbatim to `openspec/backlog.md` MUST satisfy all five content assertions of Check 22. (D2, D7)
- [ ] 2.4 Add a `TEMPLATE_CANONICAL_HEADINGS` entry for `backlog.template.md` with `headings: []` in `scripts/lint.mjs` so Check 3 does not flag the new template as undeclared. (D2)
- [ ] 2.5 Backfill `openspec/backlog.md`: add `**Shape:**` to all ~51 standalone `idea`/`proposed` rows that currently lack it; each Shape line MUST be substantive (not a TBD placeholder). Verify `**Why:**` is also present on every standalone row; add it where missing. Do not alter `bundled`/`merged` rows. (D2, D3, D6)
- [ ] 2.6 Unit/integration test: run `node scripts/lint.mjs`; confirm exit 0 with Check 22 reporting `OK` on the real backlog. Spot-check at least five formerly-missing `**Shape:**` rows to confirm they carry substantive text.
- [ ] 2.7 Checkpoint: run `node scripts/lint.mjs`; all checks (1–22) report `OK`, exit 0. Spot-check five formerly-missing `**Shape:**` rows in `openspec/backlog.md`. Confirm `openspec-templates/backlog.template.md` is present and the legend comment is present at the top of the file. (D1, D2, D3, D4, D6, D7)

## 3. Init seed path + Check 3 mapping

**Compute:** effort=low model=sonnet — two localized edits (one Glob-and-seed block in `init.md`, one map entry in `lint.mjs`); both follow established patterns already in the repo.

- [ ] 3.1 In `claude/commands/init.md`, after the step that writes `openspec/config.yaml`, add a Glob-based absence check for `openspec/backlog.md` (do not shell out). If absent, instruct the agent to copy the content of `openspec-templates/backlog.template.md` to `openspec/backlog.md` and stage it within the existing `git add openspec/` step. If present, skip silently. (D7)
- [ ] 3.2 Unit/integration test: run `node scripts/lint.mjs` in the kit repo; Check 3 reports `OK` with no "undeclared template" error for `backlog.template.md`.
- [ ] 3.3 Checkpoint (automated): run `node scripts/lint.mjs`; Check 3 reports `OK` with no undeclared-template error for `backlog.template.md`. (D7)
- [ ] 3.4 (human) Checkpoint (live `/qrspi:init` dogfood): in a fresh terminal, run `claude --plugin-dir /workspaces/git/qrspi` in a throwaway directory outside this repo that has no `openspec/backlog.md`. Run `/qrspi:init`. Confirm `openspec/backlog.md` is created from the template and that `node scripts/lint.mjs` passes Check 22 on the seeded file with no violations. Then run `/qrspi:init` a second time and confirm the existing file is not overwritten (idempotency). (D7)

## 4. Workflow skill prose + writer command fenced examples

**Compute:** effort=medium model=sonnet — six files edited, each with a localized prose change; the fenced examples must mirror the template verbatim (requires reading the template and matching exactly); no new logic.

- [ ] 4.1 Edit `claude/skills/workflow/SKILL.md` "Backlog atomicity" section: replace the drifted `--` (double-hyphen) heading grammar example with the frozen `### <id> — \`<status>\` · **P<n>**` form (real em-dash U+2014, middle-dot U+00B7, bold band token). Add a one-line pointer to `openspec-templates/backlog.template.md` as the authoritative shape reference. Keep the corrected grammar inline (not pointer-only). (D8, OQ2)
- [ ] 4.2 Edit `claude/commands/followup.md` (P3 promote path): replace `--` separators with the frozen em-dash grammar; add a fenced canonical row example showing `### <id> — \`idea\` · **P<n>**` with `**Why:**` and `**Shape:**` fields, matching the template's sample row verbatim. (D8, OQ2)
- [ ] 4.3 Edit `claude/commands/pr.md` (promote prose): replace `--` separators with the frozen em-dash grammar; add a fenced canonical row example matching the template verbatim. (D8, OQ2)
- [ ] 4.4 Edit `claude/commands/design.md` (deferred-work-append path): replace `--` separators with the frozen em-dash grammar; add a fenced canonical row example matching the template verbatim. (D8, OQ2)
- [ ] 4.5 Edit `claude/commands/structure.md` (deferred-work-append path): replace `--` separators with the frozen em-dash grammar; add a fenced canonical row example matching the template verbatim. (D8, OQ2)
- [ ] 4.6 Edit `claude/commands/slices.md` (deferred-work-append path): replace `--` separators with the frozen em-dash grammar; add a fenced canonical row example matching the template verbatim. (D8, OQ2)
- [ ] 4.7 Unit/integration test: run `node scripts/lint.mjs`; exit 0 with no new violations. Read `claude/skills/workflow/SKILL.md` "Backlog atomicity" and confirm the real em-dash grammar and template pointer are present. Read `claude/commands/followup.md` P3 path and confirm the fenced example uses the real em-dash.
- [ ] 4.8 Checkpoint: run `node scripts/lint.mjs`; all checks report `OK`. Read `claude/skills/workflow/SKILL.md` "Backlog atomicity" to confirm frozen grammar. Spot-check `claude/commands/followup.md` and `claude/commands/pr.md` for fenced canonical row examples with the real em-dash. (D8, OQ2)

## 5. Migration manifest + CHANGELOG entry

**Compute:** effort=medium model=sonnet — the YAML schema and `edit-file` dispatcher contract are known from the existing 8 manifests; the main reasoning task is keeping the automated step on a guaranteed-present anchor and putting conditional logic in `manual` steps (OQ3 decision).

- [ ] 5.1 Determine the next version number by reading the existing filenames under `migrations/`. Author `migrations/<next-version>.yaml` with exactly one entry in `automated:`: an `edit-file` step that inserts the legend comment after the backlog file's title line (a guaranteed-present anchor such as `# Backlog`). The step MUST be idempotent (skip insertion if the legend comment is already present). Keep all conditional logic (adding `## In progress`, `## Proposed`, `## Ideas` section headings if absent; adding the P-band preamble under `## Ideas`) in `manual:` steps. Include a `manual:` step directing consumers with no `openspec/backlog.md` to run `/qrspi:init` instead of creating the file manually. Do NOT rewrite any existing row content. (OQ3)
- [ ] 5.2 Add a `[Unreleased]` entry to `CHANGELOG.md` describing this change. Do NOT bump `plugin.json` version.
- [ ] 5.3 Unit/integration test: run `node scripts/lint.mjs`; exit 0 (CHANGELOG and migrations are not linted by the kit, but overall lint must stay green). Read `migrations/<next-version>.yaml` and confirm: exactly one entry in `automated:` (the legend-comment insert); the `manual:` steps include section-heading guidance and a pointer to `/qrspi:init` for repos with no backlog. (OQ3)
- [ ] 5.4 Checkpoint (automated): run `node scripts/lint.mjs`; all checks report `OK`. Read `migrations/<next-version>.yaml` and confirm the `automated:` list has exactly one entry keyed on the title-line anchor, and `manual:` steps cover the conditional/section logic. (OQ3)
- [ ] 5.5 (human) Checkpoint (live `/qrspi:update` dogfood): in a fresh terminal, set up a throwaway consumer fixture outside this repo (e.g. scratchpad) with an existing `openspec/backlog.md` that lacks the legend comment. Run `claude --plugin-dir /workspaces/git/qrspi` and then `/qrspi:update`. Confirm the automated step inserts the legend comment after the title line without altering any existing row content. (OQ3)
