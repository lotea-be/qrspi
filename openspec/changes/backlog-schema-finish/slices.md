# Slices — backlog-schema-finish

> Stage V of QRSPI. Generated 2026-07-31.
> Vertical slices, not horizontal layers.

## Overview

This change closes four loose ends left by `standardize-backlog-format`:
fault-tolerant migration replay (Slice 1), wikilink CI enforcement (Slice 2),
a new `/qrspi:idea` capture command backed by a shared `backlog-writer` skill
(Slice 3), and migration of every existing append site onto that shared skill
(Slice 4, depends on Slice 3).

Slices 1 and 2 are file-disjoint and fully independent — they can be
implemented and committed in either order. Slices 3 and 4 are sequential: the
`backlog-writer` skill that Slice 4 references must exist before Slice 4
touches any agent or command file. Slice 5 (added during stage I) likewise
depends on Slice 3 and migrates the command-level append sites the original
plan mis-attributed to the agent files — see its header for the correction.

Because this is a kit-tooling repo with no web-app UI or data-store, the
vertical-slice principle is applied as "each slice ships an independently
demoable capability plus its tests." There is no mock-API or frontend surface;
the acceptance for each slice is a combination of `node scripts/lint.mjs`
passing green and, where the observable behaviour is a runtime interview (the
`/qrspi:update` dispatcher walk; the `/qrspi:idea` interview flow), a `(human)`
checkpoint using `claude --plugin-dir <repo>` against a throwaway fixture.

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Replayable, fault-tolerant migration

A double-run of the `0.13.0` legend-insert step no longer duplicates content;
a consumer whose anchor has been renamed gets a warning and a continuing walk
instead of a hard-stop. At end of this slice, `node scripts/lint.mjs` passes
green including a new positive-path self-test inside Check 6.

- M: no mock layer — the `qrspi-update` dispatcher is a prose skill, not a
  service endpoint; the YAML schema is the contract and is settled in
  `design.md`. (D1, D2)
- F: n/a — no UI surface in this repo.
- D: add `skip_if_contains` and `anchor_missing: warn-and-skip` to the single
  `insert_after` step in `migrations/0.13.0.yaml` in place; document both
  fields and their dispatcher semantics in `claude/skills/qrspi-update/SKILL.md`.
  (D1, D2)
- T: extend Check 6 in `scripts/lint.mjs` to accept both optional fields with
  closed value-domain validation; add a positive-path inline self-test fixture
  (synthetic step carrying both fields); run `node scripts/lint.mjs` as
  acceptance. (D1, D3)
- **Compute:** effort=medium model=sonnet — extends an existing lint check with
  two optional-field rules and an inline self-test; pattern mirrors existing
  Check 6 structure.
- Checkpoint (automated): `node scripts/lint.mjs` exits 0 and the Check 6 line
  reads `OK`.
- Checkpoint (human): launch `claude --plugin-dir /workspaces/git/qrspi` in a
  throwaway consumer fixture that already contains the legend block; run
  `/qrspi:update`; confirm the dispatcher emits "skipped (already present)" and
  does not duplicate the legend. Repeat with the anchor renamed; confirm a
  one-line warning is emitted and the walk continues to completion with the
  version marker bumped. (D1, D2)

### Slice 2 — Dangling wikilinks fail CI (Check 23)

`node scripts/lint.mjs` now exits non-zero when `openspec/backlog.md` contains
any bare `[[slug]]` that does not resolve to a live row or a date-stripped
archive folder. The kit's own backlog already passes because the five
pre-existing dangling bare links are demoted to back-ticked plain text in the
same commit. An injected `[[does-not-exist]]` reddens CI.

- M: no mock layer — `checkBacklogWikilinks` is a pure lint function; the
  resolver is factored as `resolveWikilinks(text, liveRowIds, archiveSlugs)`
  accepting injected lists, making it directly unit-testable in-process. (D5,
  D6)
- F: n/a — no UI surface.
- D: demote the five pre-existing bare dangling links in `openspec/backlog.md`
  to back-ticked plain text (`simplify-per-slice-model-selection`,
  `configurable-effort-and-thinking`, `per-slice-effort-via-agent-variants`,
  `haiku-model-tier`, `kit-self-surfaces`). (D6)
- T: implement `checkBacklogWikilinks` (Check 23) in `scripts/lint.mjs` using
  the same dependency-free ESM pattern; factor the resolver as
  `resolveWikilinks(text, liveRowIds, archiveSlugs)` and add an inline self-test
  covering all four cases (live-row hit, archive-folder hit, code-spanned
  meta-token must-not-fire, bare dangling slug must-fire); verify `node
  scripts/lint.mjs` exits 0 on the cleaned backlog and exits non-zero when a
  bare `[[does-not-exist]]` is injected. (D5, D6)
- **Compute:** effort=medium model=sonnet — new lint check with a pure resolver
  function and inline self-test; follows the established Check pattern in
  `scripts/lint.mjs`.
- Checkpoint (automated): `node scripts/lint.mjs` exits 0 with Check 23 `OK`
  after the cleanup; temporarily add a bare `[[does-not-exist]]` to
  `openspec/backlog.md`, confirm non-zero exit naming the slug, then revert.
  (D5, D6)

### Slice 3 — Idea capture on a shared writer

`/qrspi:idea "<intent>"` is available in any consumer repo with the kit
installed. It runs an interactive interview (dedup, slug confirm, P-band
proposal, shape prompt), delegates row construction to the new shared
`backlog-writer` skill, and stages a Check-22-valid idea row. `node
scripts/lint.mjs` Check 2 and Check 4 pass on the new files. This slice does
not yet migrate existing append sites — that is Slice 4.

- M: no mock layer — `backlog-writer` is a skill (prose procedure), not a
  service; the row grammar is settled in the frozen template and Check 22. (D7,
  D8, D11)
- F: n/a — no UI surface.
- D: create `claude/skills/backlog-writer/SKILL.md` (the shared append
  procedure: dedup, P-band proposal, row construction referencing the frozen
  grammar in `openspec-templates/backlog.template.md` and Check 22, staging);
  create `claude/commands/idea.md` (main-loop, no `agent:` frontmatter, no
  version-check or budget-gate embeds); update `scripts/skill-sets.mjs` to
  register `backlog-writer` for the `idea` command; add `/qrspi:idea` to the
  README helpers listing. (D7, D8, D9, D11)
- T: `node scripts/lint.mjs` — Check 2 resolves `backlog-writer` for the `idea`
  command; Check 4 passes for `idea.md` ↔ README; Check 9 does not flag
  `idea.md` for missing version-check embed; the budget-gate embed check does
  not flag `idea.md`. (D7, D9, D11)
- **Compute:** effort=medium model=sonnet — new skill file and new command file;
  the skill is procedure prose with clear spec; the command wires an interview
  flow following an existing pattern.
- Checkpoint (automated): `node scripts/lint.mjs` exits 0; Check 2, 4, 9, and
  the budget-gate check all report `OK`.
- Checkpoint (human): launch `claude --plugin-dir /workspaces/git/qrspi` in a
  throwaway consumer fixture with a populated `openspec/backlog.md`; run
  `/qrspi:idea "add usage telemetry dashboard"`; confirm the command reads the
  backlog and surfaces near-matches (if any), offers proceed/abort, proposes a
  P-band via `AskUserQuestion`, prompts for a one-sentence shape, and stages a
  row; run `node scripts/lint.mjs` inside the fixture and confirm Check 22
  reports no violation for the new row. Also run `/qrspi:idea` with no argument
  and confirm the intent prompt appears. (D7, D8, D9, D11)

### Slice 4 — Every append site on the shared writer (depends on Slice 3)

Every site that previously embedded an inline row grammar or bespoke append
procedure now loads `backlog-writer` and delegates to its procedure. After this
slice, no agent or command file in the kit embeds an inline copy of the frozen
row grammar for appending a row. Check 2 passes for all three migrated agents.

- M: no mock layer — changes are prose migrations in agent/command files. (D11)
- F: n/a — no UI surface.
- D: update `claude/agents/questioner.md`, `designer.md`, and `architect.md` to
  load skill `backlog-writer` in their Load skills line and replace inline
  deferred-work-capture grammar prose with a delegation call to the skill
  procedure; update `claude/commands/followup.md` P3 promote path to load
  `backlog-writer` and follow its procedure; update `scripts/skill-sets.mjs`
  `SKILL_SET_EXPECTED` map to include `backlog-writer` in the skill set for
  questioner, designer, and architect. (D11)
- T: `node scripts/lint.mjs` — Check 2 resolves `backlog-writer` for the
  questioner, designer, and architect; no dangling skill references reported;
  full lint passes green. (D11)
- **Compute:** effort=medium model=sonnet — mechanical prose migration across
  four files; pattern is established by Slice 3; no new design reasoning needed.
- Checkpoint (automated): `node scripts/lint.mjs` exits 0; Check 2 reports `OK`
  for questioner, designer, and architect against `backlog-writer`.
- Checkpoint (human): launch `claude --plugin-dir /workspaces/git/qrspi` in a
  throwaway consumer fixture; exercise one deferred-work-capture path (e.g. run
  `/qrspi:questions <id>` on a minimal change and let it surface a separable
  idea); confirm the resulting row matches the `backlog-writer` procedure
  (correct grammar, Check-22-valid) and that no inline grammar copy appears in
  the agent response. Also exercise the followup P3 path (`/qrspi:followup <id>`
  on a fixture with a deferred follow-up) and confirm it delegates to
  `backlog-writer`. (D11)

### Slice 5 — Command-level append sites on the shared writer (added stage I; depends on Slice 3)

Added during stage I after implementation surfaced that D11's site enumeration
was wrong: the real D/S capture offer + row construction live in the *command*
bodies (`design.md`, `structure.md`), not the designer/architect agents (agents
cannot issue the `AskUserQuestion` offer), and `pr.md`'s "Promote to backlog idea"
path is a sixth site D11 missed. After this slice, no command or agent body embeds
an inline copy of the frozen row grammar — the `backlog-writer` procedure and the
frozen template are the only places it is expressed. (D11)

- M: no mock layer — changes are prose migrations in command files. (D11)
- F: n/a — no UI surface.
- D: migrate `claude/commands/design.md` (step 4 "Capture deferred work") and
  `claude/commands/structure.md` (capture step) to load `backlog-writer` and
  delegate row construction instead of embedding the inline `### <slug> —
  \`idea\` · **P<n>**` + `**Why:**`/`**Shape:**` block; migrate
  `claude/commands/pr.md`'s "Promote to backlog idea" path the same way,
  preserving the surrounding followups.md tick + commit orchestration; trim the
  referential grammar block in `claude/commands/slices.md` to a pointer to the
  frozen grammar; wire any command→skill registration Check 2 requires in
  `scripts/skill-sets.mjs`. (D11)
- T: `node scripts/lint.mjs` — Check 2 resolves `backlog-writer` for every
  migrated command with no dangling skill reference; a scan for the inline
  row-construction pattern outside `claude/skills/backlog-writer/` and
  `openspec-templates/` finds no remaining copy; full lint passes green;
  `openspec validate backlog-schema-finish --strict` passes. (D11)
- **Compute:** effort=medium model=sonnet — mechanical prose migration across four
  command files following the pattern established by Slices 3–4, but touches the
  `pr.md` reconciliation path whose surrounding commit orchestration must be
  preserved, and requires the skill-sets wiring; no new design reasoning.
- Checkpoint (automated): `node scripts/lint.mjs` exits 0; Check 2 reports `OK`
  for the migrated commands against `backlog-writer`; no inline row-grammar block
  remains outside the skill/template.
- Checkpoint (human): launch `claude --plugin-dir /workspaces/git/qrspi` in a
  throwaway consumer fixture; exercise the D-stage capture (run `/qrspi:design
  <id>` on a change whose Non-Goals name a separable future change and accept the
  idea offer) and confirm the staged row is produced through the `backlog-writer`
  procedure (Check-22-valid, no inline grammar in the command's own prose). Also
  exercise the PR promote path (`/qrspi:pr <id>` with an open follow-up promoted
  to backlog) and confirm it delegates to `backlog-writer`. (D11)

### Slice 6 — Q-stage command-level capture on the shared writer (added stage I; depends on Slice 3)

Added during stage I after dogfooding checkpoint 4.8 surfaced that Slice 5's site
enumeration still missed the **Q stage**: the deferred-work capture offer + append
lives in the questioner *agent* (`questioner.md` step 9), which drives it via
`AskUserQuestion` — a gate only the main-loop orchestrator can issue, not a subagent —
and `claude/commands/questions.md` (the orchestrator) has no capture step at all. This
is the identical mis-placement Slice 5 fixed for D/S. After this slice, the Q append
site is a genuine orchestrator-level site that delegates to `backlog-writer`, so D11's
"true at every write site" guarantee finally holds for every stage that captures. (D11)

- M: no mock layer — changes are prose migrations in a command + agent file. (D11)
- F: n/a — no UI surface.
- D: add a "Capture deferred work" step to `claude/commands/questions.md` (mirroring
  `design.md` step 4) that reads the questioner's returned candidate separable changes,
  offers each one at a time via `AskUserQuestion` (*Add as idea / Skip*), and on accept
  loads `backlog-writer` and follows its append procedure — staged in the same commit as
  `questions.md`; and trim `claude/agents/questioner.md` step 9 so the agent identifies
  candidate separable changes and surfaces them in its returned summary for the
  orchestrator instead of issuing the `AskUserQuestion` offer itself. Retain the
  questioner's `backlog-writer` registration and its `idea`→`proposed` status flip
  (a plain file edit a subagent can do). No `scripts/skill-sets.mjs` change — the
  questioner already registers `backlog-writer` (Slice 4). (D11)
- T: `node scripts/lint.mjs` — full lint passes green (Check 2 still resolves
  `backlog-writer` for the questioner; no dangling skill reference); a scan for the
  inline row-construction pattern outside `claude/skills/backlog-writer/` and
  `openspec-templates/` still finds no remaining copy; `openspec validate
  backlog-schema-finish --strict` passes. (D11)
- **Compute:** effort=medium model=sonnet — mechanical prose migration across one
  command + one agent file following the pattern established by Slice 5; no new design
  reasoning, but the offer/return-summary split must be wired correctly so the
  orchestrator receives candidates from the agent.
- Checkpoint (automated): `node scripts/lint.mjs` exits 0; the inline-grammar scan
  finds no copy outside the skill/template; `openspec validate backlog-schema-finish
  --strict` passes.
- Checkpoint (human): launch `claude --plugin-dir /workspaces/git/qrspi` in a
  throwaway consumer fixture with a populated `openspec/backlog.md` and a minimal
  in-flight change; run `/qrspi:questions <id>` and, when a sequencing/scope answer
  names a separable future change, confirm the **orchestrator** (not the subagent)
  offers it via `AskUserQuestion` and, on accept, stages a Check-22-valid row through
  `backlog-writer` — with no `Invalid tool parameters` error and no inline grammar in
  the command's own prose. (D11)
