# Tasks — researcher-apply-surface-gate

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Add gate-instruction sentence to researcher.md

**Compute:** effort=low model=haiku — single-sentence insertion at a pinned position in one markdown file; zero branching logic, zero cross-file coordination.

- [x] 1.1 In `claude/agents/researcher.md`, locate `## What to do` step 1 and insert the sentence "Apply the surface-gate rule per the `repo-surface` skill: emit each inventory section only when its surface is present, omitting absent-surface headings entirely." immediately after the existing sentence that states `repo-surface` defines which inventory sections to emit. (D1)
- [x] 1.2 Unit/integration test: read the edited file and confirm (a) the sentence appears inside step 1, (b) it immediately follows the existing `repo-surface` sentence, and (c) it is not formatted as a new numbered step. (D1)
- [x] 1.3 Run `node scripts/lint.mjs` and confirm it exits 0 with no new errors. (D1)
- [ ] 1.4 (human) Run `grep -n "surface-gate rule per the" claude/agents/researcher.md` and confirm it returns exactly one match located inside step 1. Visually confirm the surrounding step context looks correct.

## 2. Add Check 24 (checkResearcherGateInstruction) to lint.mjs

**Compute:** effort=medium model=sonnet — a new lint check function with inline self-test logic (two fixture branches + error-push branching); small but has more structure than a one-liner edit.

- [x] 2.1 In `scripts/lint.mjs`, add the `checkResearcherGateInstruction` function after the Check 23 function, following the existing dependency-free ESM pattern. The check reads `claude/agents/researcher.md`, locates step 1 of `## What to do`, and asserts the stable substring `surface-gate rule per the \`repo-surface\` skill` is present. (D6)
- [x] 2.2 Add an inline in-memory self-test inside `checkResearcherGateInstruction`: a fixture string containing the phrase must produce a pass result; a fixture omitting it must produce a fail result. A self-test regression pushes a `[researcher-gate-instruction] SELF-TEST FAILED` error. (D6)
- [x] 2.3 Wire `checkResearcherGateInstruction` into `main()` after Check 23 so it registers in the run order and contributes to the process exit code on failure. (D6)
- [x] 2.4 Run `node scripts/lint.mjs` with the slice 1 edit already in place and confirm it exits 0 and prints `Check 24: OK`. (D6)
- [ ] 2.5 (human) Temporarily delete the gate-instruction sentence from `claude/agents/researcher.md`, run `node scripts/lint.mjs`, and confirm Check 24 reports a violation and the process exits non-zero. Restore the sentence afterwards and confirm `node scripts/lint.mjs` exits 0 again.

## 3. Add SURFACE-GATED comments to research.template.md

**Compute:** effort=low model=haiku — comment insertion only; pattern is fully determined by the adjacent `questions.template.md` file; zero branching logic.

- [ ] 3.1 In `openspec-templates/research.template.md`, insert a `<!-- SURFACE-GATED: <surface> surface. Omit the heading and body entirely when <surface> is absent from ## Repo surface. -->` comment at each surface-gated inventory section position, matching the comment convention already used in `openspec-templates/questions.template.md`. Do not add heading lines; do not alter the five spine headings, the title, or the blockquote. (D7)
- [ ] 3.2 Unit/integration test: run `grep "SURFACE-GATED" openspec-templates/research.template.md` and confirm it returns at least one match per surface-gated section. Diff the comment wording against `questions.template.md` to confirm the format strings are consistent. (D7)
- [ ] 3.3 Run `node scripts/lint.mjs` and confirm it exits 0 (Check 14 and the template denylist checks must not regress). (D7)
- [ ] 3.4 (human) Open `openspec-templates/research.template.md` and `openspec-templates/questions.template.md` side-by-side and confirm the `SURFACE-GATED` comment wording is consistent between the two templates, and that each surface-gated section in the research template has a corresponding comment where present-surface headings would still emit correctly.
