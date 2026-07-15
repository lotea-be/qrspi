# Slices — tighten-stage-read-boundaries

> Stage V of QRSPI. Generated 2026-07-15.
> Vertical slices, not horizontal layers.

## Overview

All five slices are prose/lint changes to the kit itself — no app to run in a
browser. "Vertical" here means each slice leaves the repo in a **green,
checkable state**: `node scripts/lint.mjs` exits 0 and/or
`node sync-copilot.mjs --check` exits 0 by the end of that slice. No slice is
"all the agent files, then all the tests" — the banners land in slice 1 so
the lint Check 7 introduced in slice 4 has actual content to assert from the
moment it is added (no chicken-and-egg failure). The planner/implementer can
open each slice as a fresh session with the single narrowed instruction set.

The slices follow the order the design previewed: front-load prose changes
(so lint has something to assert), then D-number self-carry wiring, then
cross-change boundary + trigger relocation, then the workflow-skill table +
lint Check 7, and finally migration entry + changelog + copilot sync.

The `(D<n>)` tags embedded throughout this file are themselves required by D3
— this `slices.md` dogfoods the rule it introduces.

Five slices are needed because the lint check (slice 4) depends on the banners
(slice 1) and the templates (slice 2) both existing first, and the final sync
(slice 5) must be the last act. Collapsing to fewer than five would require
landing the lint check before its inputs exist, which breaks the "each slice
is independently green" contract.

## Slices

### Slice 1 — Within-change narrowing + per-agent banners

All seven stage-agent files (`claude/agents/*.md`) receive their tightened
within-change read instruction and the uniform machine-readable read-contract
banner. After this slice every agent file states its minimal read set and the
repo is structurally ready for the lint check that will be added in slice 4.
No cross-change clause yet (that lands in slice 3); the banner already carries
the trailing reference to "no other change's process artifacts — spec.md
excepted; see workflow skill Read Matrix" but the Read Matrix table itself is
not yet written (slice 4). This is intentional: the repo is green because lint
Check 7 does not exist yet.

- M: no mock step — these are prose changes to markdown agent files; pattern
  is mechanical search-and-replace + banner insertion across 7 files (D1, D9).
- F: `claude/agents/researcher.md` — tighten within-change read prose to
  "none" (whole `changes/<id>/` folder banned) (D5); add banner `> **Read
  contract** — Reads: none (whole changes/<id>/ folder banned). Never opens:
  any file under openspec/changes/<id>/; no other change's process artifacts
  (spec.md excepted — see workflow skill Read Matrix).` (D9).
- F: `claude/agents/questioner.md` — tighten within-change read prose to
  "backlog + templates, no change-folder artifact"; add banner (D9).
- F: `claude/agents/designer.md` — tighten within-change read prose to
  "questions.md + research.md"; add banner (D9).
- F: `claude/agents/architect.md` — stage-S step 2 changes to read
  `design.md` only (drop `questions.md` and `research.md`) (D1); reword
  S-only final-message "Open questions surfaced" field to "not answered by
  `design.md` alone" (D1); add two-mode banner for S (`design.md` only) and
  V (`proposal.md + specs/`) (D9).
- F: `claude/agents/planner.md` — tighten within-change read prose to
  `slices.md` only (drop `design.md`, `proposal.md`, `specs/`) (D2); add
  banner (D9).
- F: `claude/agents/implementer.md` — confirm/state within-change read as
  `tasks.md` only; add hard-stop clause for design-decision conflict (D4); add
  banner (D9).
- F: `claude/agents/reviewer.md` — add "full change-folder by design" note to
  read prose; add banner with `Reads: full changes/<id>/ folder (by design)`
  (D9).
- D: no data-store changes.
- T: manual read-through of each agent file; `node scripts/lint.mjs` MUST exit
  0 (no regression on checks 1–6; check 7 does not exist yet so no new
  assertion fires).
- **Model:** sonnet — mechanical banner insertion + prose narrowing across 7
  files; every change mirrors a fixed template from the spec (D9 OQ1 answer).
- Checkpoint: `node scripts/lint.mjs` exits 0. Grep each agent file for the
  `> **Read contract**` banner string; all 7 must match. Dev-install in-progress
  copy: `claude --plugin-dir /workspaces/git/qrspi` then `/reload-plugins` to
  confirm no parse error on the edited agent files.

---

### Slice 2 — `(D<n>)` embed rule + template/skeleton label fixes

The architect's inline `slices.md` skeleton in `claude/agents/architect.md`
gains the required `(D<n>)` tag-embed rule so the V → tasks.md → implementer
traceability chain is self-carrying (D3). `openspec-templates/tasks.template.md`
is updated in the same slice: the stale `worktree.md` label is corrected to
`slices.md` and the `**Model:**` annotation note gains the `(D<n>)` carry-forward
wording (D3, OQ6). After this slice the planner's `(D<n>)` carry-forward
chain is fully documented without the planner needing to open `design.md` (D2,
D3).

- M: no mock step — prose + template changes.
- F: `claude/agents/architect.md` — add to the inline `slices.md` skeleton the
  dogfood note and bullet-level `(D<n>)` embed rule: "MUST embed `(D<n>)` or
  `(D<n>, D<m>)` tags in every slice bullet that implements a numbered design
  decision" (D3); update the example slice bullets in the skeleton to
  demonstrate the tag.
- F: `openspec-templates/tasks.template.md` — correct `worktree.md` → `slices.md`
  in the `**Model:**` annotation example; add `(D<n>)` carry-forward note (D3,
  OQ6).
- D: no data-store changes.
- T: `node scripts/lint.mjs` exits 0. Manual check that the architect skeleton
  shows at least one `(D<n>)` example and that `tasks.template.md` contains no
  remaining `worktree.md` reference.
- **Model:** sonnet — targeted prose additions in two files; the rule wording
  is fully specified in D3 and OQ6.
- Checkpoint: `node scripts/lint.mjs` exits 0. Grep `tasks.template.md` for
  `worktree.md` returns no results. Grep `claude/agents/architect.md` for
  `(D<n>)` returns at least one occurrence in the slices skeleton section.

---

### Slice 3 — Cross-change boundary + questioner archived-read drop + designer trigger relocation

All seven agent files receive the cross-change read boundary clause (D6),
referencing the workflow-skill Read Matrix (not yet written — that's slice 4,
but the reference text is just a pointer that will resolve once slice 4 lands).
The questioner's archived-example read is replaced by a reference to
`openspec-templates/questions.template.md` and the inline canonical shape (D7).
The designer's trigger-honouring step is reworded to source triggers from base
specs (`openspec/specs/**`) via the permitted `spec.md` exception, never from
another change's `design.md` (D8). After this slice the cross-change perimeter
is fully prose-enforced in agent files; the Read Matrix table documenting it
centrally lands in slice 4.

- M: no mock step — prose changes to markdown agent files.
- F: `claude/agents/researcher.md` — add cross-change boundary clause (D6):
  "never open another change's process artifacts; spec.md excepted — see
  workflow skill Read Matrix." (D6, D9).
- F: `claude/agents/questioner.md` — remove step that globs/opens an archived
  `questions.md` (D7); replace with reference to
  `openspec-templates/questions.template.md` and the inline canonical shape
  (D7); add cross-change boundary clause (D6).
- F: `claude/agents/designer.md` — reword trigger-honouring step (step 6 or
  equivalent) to check `openspec/specs/**` base specs instead of any archived
  `design.md` (D8); add cross-change boundary clause (D6).
- F: `claude/agents/architect.md` — add cross-change boundary clause (D6).
- F: `claude/agents/planner.md` — add cross-change boundary clause (D6).
- F: `claude/agents/implementer.md` — add cross-change boundary clause (D6).
- F: `claude/agents/reviewer.md` — add cross-change boundary clause (D6).
- D: no data-store changes.
- T: `node scripts/lint.mjs` exits 0. Manual check that `questioner.md`
  contains no `openspec/changes/archive` path reference. Manual check that
  `designer.md` step references `openspec/specs/**` not an archived `design.md`.
- **Model:** sonnet — mechanical clause addition to 7 files + two targeted
  rewrites (questioner step, designer trigger step); every change is fully
  specified in D6, D7, D8.
- Checkpoint: `node scripts/lint.mjs` exits 0. Grep all agent files for
  `openspec/changes/archive` returns only the reviewer (which reads the full
  folder by design) and zero results in questioner. Grep `designer.md` for
  archived-`design.md` reference returns no results.

---

### Slice 4 — Workflow-skill read-matrix table + lint Check 7

`claude/skills/workflow/SKILL.md` gains the "Read Matrix" subsection near
"The eight stages", documenting the per-agent read set and the cross-change
boundary / `spec.md` exception as the single authoritative source of truth
(D9a). `scripts/lint.mjs` gains Check 7 (`checkReadContracts`): a
banner-keyed positive check that parses each agent's `Reads:` field from its
read-contract banner and asserts it equals the expected matrix row, with
special handling for the architect's two-mode contract and the reviewer's
full-folder declaration (D10, OQ2, OQ3). After this slice the lint passes
end-to-end and the workflow-skill table makes the Read Matrix browsable for
humans. `node sync-copilot.mjs --check` is expected to show drift at this
point (copilot sync is the last act, slice 5).

- M: no mock step — table addition in a skill file + lint script extension;
  Check 7 pattern mirrors existing Check 5/6 in `scripts/lint.mjs` (D10).
- F: `claude/skills/workflow/SKILL.md` — add "Read Matrix" subsection near
  "The eight stages" with a table of 8 rows (R through PR) listing
  `Reads (within-change)` and `Cross-change`, per the approved matrix (D9);
  include full cross-change boundary clause and `spec.md` exception text (D6,
  D9); include architect two-mode notation (D1, D2) and reviewer full-folder
  intentional note (D9).
- F: `scripts/lint.mjs` — add async `checkReadContracts(errors)` after
  Check 6; register as `Check 7: checkReadContracts` in `main()`; parse each
  of the 7 agent banners' `Reads:` field; assert equality against hardcoded
  expected value per agent (architect: two-mode S/V assertion; reviewer:
  full-folder special case); push to `errors[]` on mismatch or missing banner
  (D10, OQ2, OQ3); do NOT flag `commands/update.md` or
  `skills/qrspi-update/SKILL.md` (D10, PQ13).
- D: no data-store changes.
- T: `node scripts/lint.mjs` exits 0 including the new Check 7. Confirm
  Check 7 output line reads `Check 7: checkReadContracts OK`. Intentionally
  break one agent banner's `Reads:` field temporarily, confirm Check 7 exits
  non-zero, then restore. (`node sync-copilot.mjs --check` may exit non-zero
  here — deferred to slice 5.)
- **Model:** opus — Check 7 has non-obvious parsing logic: it must handle the
  architect's two-mode contract (one agent file, two distinct `Reads:` assertions
  for S vs. V), the reviewer's special-case "full change-folder by design"
  string, and must not flag non-stage-agent files. The parse-and-assert pattern
  is first-of-kind in the lint script; getting the extraction regex and the
  equality checks wrong silently passes a bad state.
- Checkpoint: `node scripts/lint.mjs` exits 0 (all 7 checks including Check
  7). The `Check 7: checkReadContracts OK` line appears in output. Dev-install:
  `claude --plugin-dir /workspaces/git/qrspi` then `/reload-plugins` to confirm
  the updated workflow skill loads without error.

---

### Slice 5 — Migration entry + CHANGELOG + copilot sync

`migrations/<version>.yaml` is written with empty `automated: []` and one
`manual` note covering repos with locally-overridden stage-agent files (D11).
The `CHANGELOG.md` `## [Unreleased]` section gains the entry for this change.
`node sync-copilot.mjs` is run to regenerate `copilot/` from the updated
`claude/` source; `node sync-copilot.mjs --check` must exit 0. This slice is
the final green gate: `node scripts/lint.mjs` (all 7 checks) and
`node sync-copilot.mjs --check` both exit 0 together.

- M: no mock step — new YAML file + CHANGELOG prose + generated copilot output.
- F: `migrations/<version>.yaml` — write manifest: `automated: []`,
  `manual: ["If you have locally overridden any QRSPI stage-agent file, re-align
  it to the new per-agent read contracts introduced in tighten-stage-read-boundaries."]`
  (D11); `<version>` is the next version string from `plugin.json` version context
  (do NOT bump `plugin.json` — read the current version to derive the manifest name
  per the kit's versioning convention).
- F: `CHANGELOG.md` — add `## [Unreleased]` bullet(s) summarising the seven
  agent read-contract changes, workflow-skill Read Matrix table, lint Check 7,
  migration entry, and copilot sync (D9, D10, D11).
- F: `copilot/**` — regenerated by running `node sync-copilot.mjs` (never
  hand-edited per CLAUDE.md); all changes from slices 1–4 are now reflected.
- D: no data-store changes.
- T: `node scripts/lint.mjs` exits 0 (all 7 checks). `node sync-copilot.mjs
  --check` exits 0. Lint Check 6 passes (migration file present and well-formed).
- **Model:** sonnet — mechanical YAML + changelog prose + running the sync
  script; no non-obvious logic.
- Checkpoint: `node scripts/lint.mjs` exits 0 AND `node sync-copilot.mjs
  --check` exits 0. Confirm `migrations/<version>.yaml` exists and lint
  Check 6 (migration file check) reports OK. Confirm `CHANGELOG.md`
  `## [Unreleased]` section contains an entry for this change.
