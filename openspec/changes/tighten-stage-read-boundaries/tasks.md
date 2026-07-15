# Tasks — tighten-stage-read-boundaries

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Within-change narrowing + per-agent banners

**Model:** sonnet — mechanical banner insertion + prose narrowing across 7 files; every change mirrors a fixed template from the spec (D9 OQ1 answer).

- [x] 1.1 `claude/agents/researcher.md` — tighten within-change read prose to "none (whole `changes/<id>/` folder banned)"; reword any existing single-artifact ban to cover the whole folder (D5, D9)
- [x] 1.2 `claude/agents/researcher.md` — insert the uniform read-contract banner block at the top of the file: `> **Read contract** — Reads: none (whole changes/<id>/ folder banned). Never opens: any file under openspec/changes/<id>/; no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).` (D9)
- [x] 1.3 `claude/agents/questioner.md` — tighten within-change read prose to "backlog + templates, no change-folder artifact" (D9)
- [x] 1.4 `claude/agents/questioner.md` — insert read-contract banner: `> **Read contract** — Reads: backlog + templates (no change-folder artifact). Never opens: any change-folder file (questions.md, research.md, design.md, etc.); no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).` (D9)
- [x] 1.5 `claude/agents/designer.md` — tighten within-change read prose to "questions.md + research.md" (D9)
- [x] 1.6 `claude/agents/designer.md` — insert read-contract banner: `> **Read contract** — Reads: questions.md, research.md. Never opens: design.md (from any change), proposal.md, slices.md, tasks.md, pr.md, followups.md; no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).` (D9)
- [x] 1.7 `claude/agents/architect.md` — stage-S step 2: change to read `design.md` only; drop any mention of `questions.md` and `research.md` from the S-path read instruction (D1)
- [x] 1.8 `claude/agents/architect.md` — reword the S-path final-message "Open questions surfaced" field from "not answered by `design.md`, `questions.md`, or `research.md`" to "not answered by `design.md` alone" (D1)
- [x] 1.9 `claude/agents/architect.md` — verify the V-path reads only `proposal.md` + `specs/`; adjust wording if any V-path step names additional artifacts (D1)
- [x] 1.10 `claude/agents/architect.md` — insert two-mode read-contract banner covering both S and V: `> **Read contract** — Reads (S): design.md. Reads (V): proposal.md, specs/. Never opens: questions.md, research.md (at S); no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).` (D1, D9)
- [x] 1.11 `claude/agents/planner.md` — tighten within-change read prose to "`slices.md` only"; remove any mention of `design.md`, `proposal.md`, `specs/` from the inputs/step-2 read list (D2)
- [x] 1.12 `claude/agents/planner.md` — insert read-contract banner: `> **Read contract** — Reads: slices.md. Never opens: design.md, proposal.md, specs/, questions.md, research.md; no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).` (D2, D9)
- [x] 1.13 `claude/agents/implementer.md` — confirm within-change read is stated as `tasks.md` only; add explicit hard-stop clause: "If a task appears to conflict with a design decision, hard-stop to the human via hard-stop condition (4) — do NOT open `design.md`." (D4)
- [x] 1.14 `claude/agents/implementer.md` — insert read-contract banner: `> **Read contract** — Reads: tasks.md. Never opens: design.md, slices.md, proposal.md, specs/, questions.md, research.md; no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).` (D4, D9)
- [x] 1.15 `claude/agents/reviewer.md` — add "full change-folder by design" note to the read-prose section (D9)
- [x] 1.16 `claude/agents/reviewer.md` — insert read-contract banner: `> **Read contract** — Reads: full changes/<id>/ folder (by design). Never opens: no restriction within the current change; no other change's process artifacts (spec.md excepted — see workflow skill Read Matrix).` (D9)
- [x] 1.17 Checkpoint: run `node scripts/lint.mjs` — must exit 0 (checks 1–6; Check 7 does not exist yet so no new assertion fires)
- [x] 1.18 Checkpoint: grep all 7 agent files for `> **Read contract**` — all 7 must match; zero missing banners

## 2. `(D<n>)` embed rule + template/skeleton label fixes

**Model:** sonnet — targeted prose additions in two files; the rule wording is fully specified in D3 and OQ6.

- [x] 2.1 `claude/agents/architect.md` — locate the inline `slices.md` skeleton section; add required output-format rule: "MUST embed `(D<n>)` or `(D<n>, D<m>)` tags in every slice bullet that implements a numbered design decision" (D3)
- [x] 2.2 `claude/agents/architect.md` — update at least one example slice bullet in the skeleton to demonstrate the `(D<n>)` tag (e.g. `- F: ... (D1)`); add the dogfood note mirroring the one in `slices.md` line 22–23 (D3)
- [x] 2.3 `openspec-templates/tasks.template.md` — fix the stale `worktree.md` label: change every occurrence of `worktree.md` to `slices.md` in the annotation wording (D3, OQ6)
- [x] 2.4 `openspec-templates/tasks.template.md` — add `(D<n>)` carry-forward note to the `**Model:**` annotation line and/or the Format rules section, making clear the tags propagate from `slices.md` without the planner opening `design.md` (D3, OQ6)
- [x] 2.5 Checkpoint: run `node scripts/lint.mjs` — must exit 0
- [x] 2.6 Checkpoint: grep `openspec-templates/tasks.template.md` for `worktree.md` — must return zero results
- [x] 2.7 Checkpoint: grep `claude/agents/architect.md` for `(D<n>)` — must return at least one occurrence inside the slices skeleton section

## 3. Cross-change boundary + questioner archived-read drop + designer trigger relocation

**Model:** sonnet — mechanical clause addition to 7 files + two targeted rewrites (questioner step, designer trigger step); every change is fully specified in D6, D7, D8.

- [x] 3.1 `claude/agents/researcher.md` — add cross-change boundary clause to the read-prose body (the banner already carries the reference; ensure the body instruction also states: "never open another change's process artifacts; spec.md excepted — see workflow skill Read Matrix") (D6)
- [x] 3.2 `claude/agents/questioner.md` — locate the step that globs/opens an archived `questions.md` as a worked example; remove that step entirely (D7)
- [x] 3.3 `claude/agents/questioner.md` — replace the removed step with a reference to `openspec-templates/questions.template.md` and the inline canonical shape (watch-item: if `openspec-templates/` is unreachable in a consuming repo, the inline shape alone stands — note this in the file) (D7)
- [x] 3.4 `claude/agents/questioner.md` — add cross-change boundary clause to the body (D6)
- [x] 3.5 `claude/agents/designer.md` — reword the trigger-honouring step (step 6 or equivalent) to source scheduled triggers from `openspec/specs/**` base specs instead of any archived `design.md` (D8)
- [x] 3.6 `claude/agents/designer.md` — add cross-change boundary clause to the body (D6)
- [x] 3.7 `claude/agents/architect.md` — add cross-change boundary clause to the body (D6)
- [x] 3.8 `claude/agents/planner.md` — add cross-change boundary clause to the body (D6)
- [x] 3.9 `claude/agents/implementer.md` — add cross-change boundary clause to the body (D6)
- [x] 3.10 `claude/agents/reviewer.md` — add cross-change boundary clause to the body, noting that "full current-change folder" is intentional but other changes' process artifacts remain off-limits (D6)
- [x] 3.11 Checkpoint: run `node scripts/lint.mjs` — must exit 0
- [x] 3.12 Checkpoint: grep all 7 agent files for `openspec/changes/archive` — must return zero results in `questioner.md`; reviewer may reference the archive path only as its own-change folder path, not as a cross-change read
- [x] 3.13 Checkpoint: grep `claude/agents/designer.md` for any reference to an archived `design.md` as a trigger source — must return zero results

## 4. Workflow-skill read-matrix table + lint Check 7

**Model:** opus — Check 7 has non-obvious parsing logic: it must handle the architect's two-mode contract (one agent file, two distinct `Reads:` assertions for S vs. V), the reviewer's special-case "full change-folder by design" string, and must not flag non-stage-agent files. The parse-and-assert pattern is first-of-kind in the lint script; getting the extraction regex and the equality checks wrong silently passes a bad state.

- [x] 4.1 `claude/skills/workflow/SKILL.md` — add a "Read Matrix" subsection near `## The eight stages`; the subsection contains an 8-row table (R through PR) with columns `Stage`, `Agent`, `Reads (within-change)`, `Cross-change`, matching the approved matrix from `design.md` (D9)
- [x] 4.2 `claude/skills/workflow/SKILL.md` — include in the Read Matrix subsection the full cross-change boundary clause and `spec.md` exception text as the single authoritative source (D6, D9)
- [x] 4.3 `claude/skills/workflow/SKILL.md` — annotate the architect row with its two-mode contract (S: `design.md` / V: `proposal.md` + `specs/`) and the reviewer row with the "full change-folder by design" intentional note (D1, D2, D9)
- [x] 4.4 `scripts/lint.mjs` — add `async function checkReadContracts(errors)` following the existing Check 5/6 pattern; place it after the last existing check function (D10)
- [x] 4.5 `scripts/lint.mjs` — inside `checkReadContracts`: define the expected per-agent `Reads:` value map (7 entries), derived mechanically from the approved read matrix; architect entry must encode the two-mode S/V contract; reviewer entry must use the "full change-folder by design" string (D10, OQ3)
- [x] 4.6 `scripts/lint.mjs` — inside `checkReadContracts`: read each of the 7 `claude/agents/*.md` files; extract the `Reads:` field from the `> **Read contract**` banner using a regex; push to `errors[]` if the banner is missing or if the extracted value does not equal the expected value for that agent (D10, OQ2)
- [x] 4.7 `scripts/lint.mjs` — inside `checkReadContracts`: scope the check to the 7 stage-agent files only; explicitly exclude `claude/commands/update.md` and `claude/skills/qrspi-update/SKILL.md` from any path glob used (D10)
- [x] 4.8 `scripts/lint.mjs` — register `checkReadContracts` in `main()` as `Check 7: checkReadContracts` following the existing OK-line pattern (D10)
- [x] 4.9 Checkpoint: run `node scripts/lint.mjs` — must exit 0 with all 7 checks passing; confirm the output line `Check 7: checkReadContracts OK` appears
- [x] 4.10 Checkpoint: temporarily corrupt one agent banner's `Reads:` value; run `node scripts/lint.mjs`; confirm it exits non-zero and reports a Check 7 failure; restore the banner
- [ ] 4.11 (human) Dev-install the in-progress copy (`claude --plugin-dir /workspaces/git/qrspi` then `/reload-plugins`) and confirm the updated workflow skill loads without parse error

## 5. Migration entry + CHANGELOG + copilot sync

**Model:** sonnet — mechanical YAML + changelog prose + running the sync script; no non-obvious logic.

- [x] 5.1 Read `plugin.json` to obtain the current version string; derive the migration manifest filename as `migrations/<version>.yaml` (do NOT bump `plugin.json`) (D11) — DEVIATION: did not read plugin.json (0.5.0, already released); per user correction, appended to the existing `migrations/0.6.0.yaml` instead of creating a new file
- [x] 5.2 Write `migrations/<version>.yaml` with `automated: []` and `manual: ["If you have locally overridden any QRSPI stage-agent file, re-align it to the new per-agent read contracts introduced in tighten-stage-read-boundaries."]` (D11) — DEVIATION: appended the manual note + extended summary to the existing `migrations/0.6.0.yaml` (per user correction); `manual: []` changed to a YAML list with the one entry
- [x] 5.3 `CHANGELOG.md` — add one or more bullet points under `## [Unreleased]` summarising: seven agent read-contract banners + narrowed read sets, workflow-skill Read Matrix table, lint Check 7 (`checkReadContracts`), and migration entry (D9, D10, D11)
- [x] 5.4 Run `node sync-copilot.mjs` to regenerate `copilot/` from the updated `claude/` sources (never hand-edit `copilot/`)
- [x] 5.5 Checkpoint: run `node scripts/lint.mjs` — must exit 0 (all 7 checks, including Check 6 migration-file check for the new manifest)
- [x] 5.6 Checkpoint: run `node sync-copilot.mjs --check` — must exit 0 (zero drift between `claude/` and `copilot/`)
- [x] 5.7 Checkpoint: confirm `migrations/<version>.yaml` exists and lint Check 6 output reports OK for it
- [x] 5.8 Checkpoint: confirm `CHANGELOG.md` `## [Unreleased]` section contains an entry referencing this change
