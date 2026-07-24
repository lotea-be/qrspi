# Slices — repo-applicable-artifact-sections

> Stage V of QRSPI. Generated 2026-07-24.
> Vertical slices, not horizontal layers.

## Overview

This change adds surface-awareness to every artifact-producing QRSPI agent so
that CRUD/web-app sections are omitted — not written as "Not applicable" — when
the repo has no data-store, HTTP API, UI, or auth surface. The work is organized
into four slices that each deliver a demoable kit-behavior increment.

The natural dependency order drives the slice grouping. The `repo-surface` skill
(the shared surface-taxonomy and omit-rule authority) plus the kit's own
`qrspi-stack` cheatsheet (which self-declares all surfaces absent) must exist
before any agent can load them (Slice 1). The questioner is wired first because
it is the highest-visibility artifact in a real flow and its lint check (Check 3
shrink) lands in the same slice (Slice 2). The remaining four agents — designer,
architect, planner, and reviewer — share the same wiring pattern and are batched
in Slice 3, making that slice demoable against multiple stage outputs in a single
`--plugin-dir` session. The lint (Check 11), four templates, `/qrspi:stack`
block extension, Part B edits, README, and CHANGELOG land in Slice 4 and form
the enforcement and documentation layer — after the agents are correct, the fence
denylist can be verified, and the release surface is documented.

Each slice is independently demoable in a `claude --plugin-dir /workspaces/git/qrspi`
session. Human runtime verifications are marked `(human)`.

The `(D<n>)` tags embedded throughout this file are required — this `slices.md`
dogfoods the rule it describes.

## Slices

### Slice 1 — Filter foundation: repo-surface skill + qrspi-stack cheatsheet

**Deliverable.** After this slice the `repo-surface` skill exists at
`claude/skills/repo-surface/SKILL.md` with the closed five-surface taxonomy,
section→surface mapping, and omit/warn rules fully documented. The
project-scoped cheatsheet `.claude/skills/qrspi-stack/SKILL.md` exists with a
`## Repo surface` block declaring all five surfaces absent. A dev-install
session can load the skill and read the cheatsheet; no agent wiring yet — that
is Slice 2. Lint passes (Check 2 validates the new skill reference resolves;
Checks 1–10 still pass).

- M: no mock needed — the skill and cheatsheet are standalone markdown files
  with no runtime dependency on a service or DB; their correctness is observable
  by reading them and running lint.
- F: `claude/skills/repo-surface/SKILL.md` — five named surfaces (`data-store`,
  `http-api`, `ui`, `auth`, `typed-nullable`), section→surface mapping table,
  omit mechanic (no heading, no "Not applicable"), inference rule (explicit block
  > prose inference > full-menu + warning), always-emitted sections list. (D1, D2, D3, D4)
- F: `.claude/skills/qrspi-stack/SKILL.md` — kit stack description (markdown
  files + Node lint at `scripts/lint.mjs`) plus `## Repo surface` block listing
  all five surfaces as absent. (D9)
- D: no data-store — this is a markdown/JS kit; no migrations.
- T: `node scripts/lint.mjs` — Check 2 must resolve the new `repo-surface` skill
  reference from any agent file that will gain a `Load skill repo-surface` step
  in Slice 2. Verify Checks 1–10 pass. (D5, D6)
- **Model:** sonnet — both files are new standalone markdown files with well-defined
  content (taxonomy table + inference rules + kit description). No novel patterns;
  the spec fully constrains the shape.
- Checkpoint: run `node scripts/lint.mjs` — all checks pass. Then in a fresh
  `claude --plugin-dir /workspaces/git/qrspi` session, `/load-skill repo-surface`
  and confirm the skill body lists all five surfaces and the omit rule (no "Not
  applicable"). Also confirm `.claude/skills/qrspi-stack/SKILL.md` contains a
  `## Repo surface` section listing all five surfaces as absent. `(human)`

---

### Slice 2 — Questioner emits repo-applicable sections

**Deliverable.** After this slice, `claude/agents/questioner.md` loads
`repo-surface` and the project's stack-cheatsheet in its preamble. Its fenced
skeleton replaces the seven CRUD headings with a conditional placeholder; the
three surface-independent headings (`## Testing`, `## Sequencing & scope`,
`## Open product questions (for the human)`) remain. The `questions.template.md`
N/A instruction is replaced with the PQ2 surface-gate rule. Check 3's required
questioner heading set shrinks from 10 to 3. Running `/qrspi:questions` on this
kit in a `--plugin-dir` session produces a `questions.md` with no CRUD headings
and no "Not applicable" stanzas. Running the same command on a web-app fixture
outside this repo causes the CRUD sections to reappear (prose inference or
explicit block).

- M: no mock — the skill-load step, skeleton update, and template edit are pure
  markdown changes; their effect is verified by running the stage live.
- F: `claude/agents/questioner.md` — add `Load skill repo-surface` + stack-cheatsheet
  load to preamble; replace CRUD-heading lines in fenced skeleton with a
  conditional placeholder; remove "Not applicable" instruction. (D4, D7, D8)
- F: `openspec-templates/questions.template.md` — replace the N/A instruction
  under CRUD headings with a surface-gate omit rule (emit only when surface is
  present; omit entirely otherwise). (D8)
- D: no data-store changes.
- T: `node scripts/lint.mjs` — Check 3 must pass with the reduced 3-heading set;
  Check 11 must pass for `questioner.md` (no CRUD headings inside fences after
  update; Check 11 does not exist yet in this slice — see Slice 4 — so verify by
  grep: confirm no denylist heading appears inside a fenced block). Check 2 must
  resolve the new `repo-surface` load. (D5, D6)
- T `(human)`: in `claude --plugin-dir /workspaces/git/qrspi` on this kit, run
  `/qrspi:questions repo-applicable-artifact-sections` (or a throwaway change) —
  confirm the produced `questions.md` contains no `## Data model`, `## API`,
  `## Migrations & data`, `## UI`, `## Auth & authorization`,
  `## Front-end state`, or `## Indexing & query performance` headings, and no
  "Not applicable" text under any surface-gated heading. `(human)`
- T `(human)`: build a throwaway web-app fixture outside this repo (in the
  scratchpad), run `/qrspi:questions` in a `--plugin-dir` session — confirm CRUD
  sections appear in the output (prose inference fires). `(human)`
- **Model:** sonnet — the questioner wiring follows a clear spec-prescribed
  pattern (add preamble step + swap skeleton lines + update template). No novel
  architecture; the change is templated once the pattern from Slice 1 is set.
- Checkpoint: `node scripts/lint.mjs` passes (Checks 1–10; Check 11 is Slice 4).
  Grep confirms no CRUD-denylist heading inside a fenced block in `questioner.md`.
  Human `--plugin-dir` session confirms artifact is clean on the kit and full on
  a web-app fixture.

---

### Slice 3 — Designer, architect, planner, and reviewer emit repo-applicable sections

**Deliverable.** After this slice the remaining four agents (`designer.md`,
`architect.md`, `planner.md`, `reviewer.md`) have received the same wiring as
the questioner: `repo-surface` load in each preamble; planner also gains the
stack-cheatsheet load; fenced skeletons drop CRUD headings in favour of a
conditional placeholder; "Not applicable" instructions removed. The three
associated templates (`design.template.md`, `proposal.template.md`,
`tasks.template.md`) are updated to surface-gated labels. Running each of
`/qrspi:design`, `/qrspi:structure`, `/qrspi:plan`, and `/qrspi:pr` on the kit
in a `--plugin-dir` session produces clean artifacts with no CRUD headings and no
N/A stanzas. Deliberate gaps: Check 11 (the lint fence denylist for all five
agents) ships in Slice 4.

- M: no mock — same reasoning as Slice 2; observable by running each stage live.
- F: `claude/agents/designer.md` — add `Load skill repo-surface` to preamble;
  replace CRUD-heading lines in fenced skeleton with conditional placeholder;
  remove "Not applicable" instruction. (D4, D7)
- F: `claude/agents/architect.md` — same treatment. (D4, D7)
- F: `claude/agents/planner.md` — add `Load skill repo-surface` + stack-cheatsheet
  load to preamble; replace CRUD-heading lines in fenced skeleton with
  conditional placeholder; remove "Not applicable" instruction. (D4, D7)
- F: `claude/agents/reviewer.md` — add `Load skill repo-surface` to preamble;
  existing stack-cheatsheet load retained; fenced skeleton updated; "Not
  applicable" instructions removed. (D4, D7)
- F: `openspec-templates/design.template.md` — relabel the four detail sections
  (`## Data model changes`, `## API surface`, `## UI surface`, `## Authorization`)
  from "OPTIONAL" to "surface-gated (omit when the surface is absent)". (D8)
- F: `openspec-templates/proposal.template.md` — flag the Migrations impact line
  inside `## Impact` as surface-gated (`data-store` absent → omit). (D8)
- F: `openspec-templates/tasks.template.md` — flag the migration-task note as
  surface-gated. (D8)
- D: no data-store changes.
- T: `node scripts/lint.mjs` — Checks 1–10 pass. Grep confirms no CRUD-denylist
  heading inside a fenced block in any of the four updated agent files. Check 2
  resolves all new `repo-surface` load references. (D5)
- T `(human)`: in a `claude --plugin-dir /workspaces/git/qrspi` session, run
  `/qrspi:design`, `/qrspi:structure`, `/qrspi:plan` (or `/qrspi:pr`) on a
  throwaway change in this kit — confirm each produced artifact contains no CRUD
  headings and no "Not applicable" text under surface-gated sections. `(human)`
- **Model:** sonnet — four files follow the identical pattern established in
  Slice 2 (add preamble load + swap skeleton lines + update template). Highly
  templated, mechanical repetition across agents.
- Checkpoint: `node scripts/lint.mjs` passes. Grep over all five agent files
  (including `questioner.md` from Slice 2) confirms zero CRUD-denylist headings
  inside any fenced block. Human `--plugin-dir` session confirms each of the four
  stage artifacts is clean on the kit.

---

### Slice 4 — Lint Check 11 + /qrspi:stack block + Part B edits + README/CHANGELOG

**Deliverable.** After this slice `scripts/lint.mjs` contains Check 11
(`checkNoCrudSkeletonHeadings`) — the fenced-block CRUD-heading denylist — which
both enforces the agent edits from Slices 2–3 and guards against future
regressions. The `/qrspi:stack` command (and/or its companion skill) is extended
to emit a `## Repo surface` block in newly generated cheatsheets. The two Part B
light edits land (`vertical-slice` and `workflow` skills carry their new
illustrative-framing notes). `README.md` documents the new `repo-surface` skill.
`CHANGELOG.md` gains an `## [Unreleased]` entry. A deliberate CRUD re-injection
into a fenced block in any agent file is caught by Check 11 and exits non-zero.

- M: no mock — Check 11 is a Node function in `scripts/lint.mjs`; the stack
  command extension is a markdown file edit; all outputs are immediately
  observable via `node scripts/lint.mjs` and a `--plugin-dir` session.
- F: `scripts/lint.mjs` — add `checkNoCrudSkeletonHeadings` (async function,
  twelve-heading denylist, scoped to lines inside fenced blocks of the five agent
  files, `process.stdout.write('Check 11: ...')` label, disjoint-set invariant
  comment, registered after Check 10). (D6)
- F: `claude/commands/stack.md` (and/or `claude/skills/qrspi-stack/SKILL.md` kit
  skill if the command delegates to one) — extend to emit a `## Repo surface`
  block assessing each of the five taxonomy surfaces as present or absent in the
  generated cheatsheet. (D3, OQ2)
- F: `claude/skills/vertical-slice/SKILL.md` — add the one-line note directing
  readers to `repo-surface` for which slice shapes apply to their repo. (D10)
- F: `claude/skills/workflow/SKILL.md` — add the parenthetical on the
  "data model, API surface, or auth" sentence clarifying these are web-app
  examples and pointing to the stack cheatsheet for other repos. (D10)
- F: `README.md` — add `repo-surface` skill entry to the kit's skill/command
  table or list. (D9)
- F: `CHANGELOG.md` — add `## [Unreleased]` entry describing the four-slice
  change. (D9)
- D: no data-store changes.
- T: `node scripts/lint.mjs` — all 11 checks pass, including Check 11 `OK` for
  all five agent files. (D6)
- T: deliberately inject `## Migrations` as a literal heading line inside a
  fenced block of one agent file, run `node scripts/lint.mjs` — confirm Check 11
  exits non-zero and names the file and offending heading. Revert before
  committing. (D6)
- T `(human)`: in a `claude --plugin-dir /workspaces/git/qrspi` session, run
  `/qrspi:stack` on a fresh throwaway repo outside this kit — confirm the
  generated cheatsheet contains a `## Repo surface` section listing each of the
  five taxonomy surfaces as present or absent. `(human)`
- **Model:** sonnet — Check 11 mirrors the dependency-free ESM pattern of
  existing checks in `scripts/lint.mjs`; the stack command extension and Part B
  edits are prose additions; README/CHANGELOG are mechanical doc updates. No
  novel logic.
- Checkpoint: `node scripts/lint.mjs` passes all 11 checks. The regression-injection
  test (inject CRUD heading → Check 11 exits non-zero) confirms enforcement is
  live. Human `--plugin-dir` session confirms `/qrspi:stack` emits the
  `## Repo surface` block.
