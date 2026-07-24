# Tasks — repo-applicable-artifact-sections

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Filter foundation: repo-surface skill + qrspi-stack cheatsheet

**Model:** sonnet — both files are new standalone markdown files with well-defined content (taxonomy table + inference rules + kit description). No novel patterns; the spec fully constrains the shape.

- [x] 1.1 Write `claude/skills/repo-surface/SKILL.md` with the five named surfaces (`data-store`, `http-api`, `ui`, `auth`, `typed-nullable`), a section→surface mapping table, the omit mechanic (no heading, no "Not applicable"), the inference rule (explicit block > prose inference > full-menu + warning), and the always-emitted sections list (D1, D2, D3, D4)
- [x] 1.2 Write `.claude/skills/qrspi-stack/SKILL.md` with the kit stack description (markdown files + Node lint at `scripts/lint.mjs`) and a `## Repo surface` allowlist block declaring no present surfaces (D9)
- [x] 1.3 Run `node scripts/lint.mjs` — confirm Checks 1–10 pass; Check 2 must resolve the new `repo-surface` skill reference (D5, D6)
- [ ] 1.4 (human) In a fresh `claude --plugin-dir /workspaces/git/qrspi` session, load the `repo-surface` skill and confirm the body lists all five surfaces and the omit rule (no "Not applicable"), and describes the `## Repo surface` block as an authoritative present-only allowlist. Also confirm `.claude/skills/qrspi-stack/SKILL.md` contains a `## Repo surface` allowlist block declaring no present surfaces (not an enumeration of all five as absent).

## 2. Questioner emits repo-applicable sections

**Model:** sonnet — the questioner wiring follows a clear spec-prescribed pattern (add preamble step + swap skeleton lines + update template). No novel architecture; the change is templated once the pattern from Slice 1 is set.

- [x] 2.1 Edit `claude/agents/questioner.md` — add `Load skill repo-surface` and stack-cheatsheet load to the preamble; replace the CRUD-heading lines in the fenced skeleton with a conditional placeholder; remove the "Not applicable" instruction (D4, D7, D8)
- [x] 2.2 Edit `openspec-templates/questions.template.md` — replace the N/A instruction under CRUD headings with a surface-gate omit rule (emit only when surface is present; omit entirely otherwise) (D8)
- [x] 2.3 Run `node scripts/lint.mjs` — confirm Check 3 passes with the reduced 3-heading set and Check 2 resolves the new `repo-surface` load; grep confirms no CRUD-denylist heading appears inside a fenced block in `questioner.md` (D5, D6)
- [ ] 2.4 (human) In a `claude --plugin-dir /workspaces/git/qrspi` session on this kit, run `/qrspi:questions` on a throwaway change — confirm the produced `questions.md` contains no `## Data model`, `## API`, `## Migrations & data`, `## UI`, `## Auth & authorization`, `## Front-end state`, or `## Indexing & query performance` headings, and no "Not applicable" text under any surface-gated heading.
- [ ] 2.5 (human) Build a throwaway web-app fixture outside this repo (in the scratchpad), run `/qrspi:questions` in a `--plugin-dir` session — confirm CRUD sections appear in the output (prose inference fires).

## 3. Designer, architect, planner, and reviewer emit repo-applicable sections

**Model:** sonnet — four files follow the identical pattern established in Slice 2 (add preamble load + swap skeleton lines + update template). Highly templated, mechanical repetition across agents.

- [x] 3.1 Edit `claude/agents/designer.md` — add `Load skill repo-surface` to preamble; replace CRUD-heading lines in fenced skeleton with conditional placeholder; remove "Not applicable" instruction (D4, D7)
- [x] 3.2 Edit `claude/agents/architect.md` — same treatment as designer: `repo-surface` preamble load, conditional placeholder in fenced skeleton, remove "Not applicable" instruction (D4, D7)
- [x] 3.3 Edit `claude/agents/planner.md` — add `Load skill repo-surface` and stack-cheatsheet load to preamble; replace CRUD-heading lines in fenced skeleton with conditional placeholder; remove "Not applicable" instruction (D4, D7)
- [x] 3.4 Edit `claude/agents/reviewer.md` — add `Load skill repo-surface` to preamble; retain existing stack-cheatsheet load; update fenced skeleton; remove "Not applicable" instructions (D4, D7)
- [x] 3.5 Edit `openspec-templates/design.template.md` — relabel the four detail sections (`## Data model changes`, `## API surface`, `## UI surface`, `## Authorization`) from "OPTIONAL" to "surface-gated (omit when the surface is absent)" (D8)
- [x] 3.6 Edit `openspec-templates/proposal.template.md` — flag the Migrations impact line inside `## Impact` as surface-gated (`data-store` absent → omit) (D8)
- [x] 3.7 Edit `openspec-templates/tasks.template.md` — flag the migration-task note as surface-gated (D8)
- [x] 3.8 Run `node scripts/lint.mjs` — confirm Checks 1–10 pass; Check 2 resolves all new `repo-surface` load references; grep over all five agent files confirms zero CRUD-denylist headings inside any fenced block (D5)
- [ ] 3.9 (human) In a `claude --plugin-dir /workspaces/git/qrspi` session, run `/qrspi:design`, `/qrspi:structure`, `/qrspi:plan`, and `/qrspi:pr` (or a subset) on a throwaway change in this kit — confirm each produced artifact contains no CRUD headings and no "Not applicable" text under surface-gated sections.

## 4. Lint Check 11 + /qrspi:stack block + Part B edits + README/CHANGELOG

**Model:** sonnet — Check 11 mirrors the dependency-free ESM pattern of existing checks in `scripts/lint.mjs`; the stack command extension and Part B edits are prose additions; README/CHANGELOG are mechanical doc updates. No novel logic.

- [x] 4.1 Add `checkNoCrudSkeletonHeadings` to `scripts/lint.mjs` — async function, twelve-heading denylist, scoped to lines inside fenced blocks of the five agent files, `process.stdout.write('Check 11: ...')` label, disjoint-set invariant comment, registered after Check 10 (D6)
- [x] 4.2 Extend `claude/commands/stack.md` (and/or `claude/skills/qrspi-stack/SKILL.md` if the command delegates to it) to emit a `## Repo surface` allowlist block listing only the repo's present surfaces (absent surfaces omitted; declare none present when the repo has none) in the generated cheatsheet (D3)
- [x] 4.3 Edit `claude/skills/vertical-slice/SKILL.md` — add the one-line note directing readers to `repo-surface` for which slice shapes apply to their repo (D10)
- [x] 4.4 Edit `claude/skills/workflow/SKILL.md` — add the parenthetical on the "data model, API surface, or auth" sentence clarifying these are web-app examples and pointing to the stack cheatsheet for other repos (D10)
- [x] 4.5 Edit `README.md` — add `repo-surface` skill entry to the kit's skill/command table or list (D9)
- [x] 4.6 Edit `CHANGELOG.md` — add `## [Unreleased]` entry describing the four-slice change (D9)
- [x] 4.7 Run `node scripts/lint.mjs` — confirm all 11 checks pass, including Check 11 `OK` for all five agent files (D6)
- [x] 4.8 Regression-injection test: deliberately inject `## Migrations` as a literal heading line inside a fenced block in one agent file, run `node scripts/lint.mjs`, confirm Check 11 exits non-zero and names the file and offending heading; revert before committing (D6)
- [ ] 4.9 (human) In a `claude --plugin-dir /workspaces/git/qrspi` session, run `/qrspi:stack` on a fresh throwaway repo outside this kit — confirm the generated cheatsheet contains a `## Repo surface` allowlist block listing only the repo's present surfaces (or declaring none present), not an enumeration of every surface as present/absent.
