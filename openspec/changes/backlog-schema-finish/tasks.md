# Tasks — backlog-schema-finish

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Replayable, fault-tolerant migration

**Compute:** effort=medium model=sonnet — extends an existing lint check with two optional-field rules and an inline self-test; pattern mirrors existing Check 6 structure.

- [x] 1.1 In `migrations/0.13.0.yaml`, add `skip_if_contains` and `anchor_missing: warn-and-skip` to the single `insert_after` step in place (D1, D2)
- [x] 1.2 Document `skip_if_contains` and `anchor_missing` fields and their dispatcher semantics in `claude/skills/qrspi-update/SKILL.md` (D1, D2)
- [x] 1.3 Extend Check 6 in `scripts/lint.mjs` to validate both optional fields against their closed value-domain (D1, D3)
- [x] 1.4 Add a positive-path inline self-test fixture (synthetic step carrying both fields) to Check 6 in `scripts/lint.mjs` (D1, D3)
- [x] 1.5 Unit/integration test: `node scripts/lint.mjs` — Check 6 passes on valid `skip_if_contains` + `anchor_missing: warn-and-skip` values, and fails on an invalid `anchor_missing` value
- [x] 1.6 Checkpoint (automated): `node scripts/lint.mjs` exits 0 and Check 6 line reads `OK`
- [ ] 1.7 (human) Launch `claude --plugin-dir /workspaces/git/qrspi` in a throwaway consumer fixture that already contains the legend block; run `/qrspi:update`; confirm the dispatcher emits "skipped (already present)" and does not duplicate the legend. Repeat with the anchor renamed; confirm a one-line warning is emitted and the walk continues to completion with the version marker bumped. (D1, D2)

## 2. Dangling wikilinks fail CI (Check 23)

**Compute:** effort=medium model=sonnet — new lint check with a pure resolver function and inline self-test; follows the established Check pattern in `scripts/lint.mjs`.

- [x] 2.1 Demote the five pre-existing bare dangling links in `openspec/backlog.md` to back-ticked plain text (`simplify-per-slice-model-selection`, `configurable-effort-and-thinking`, `per-slice-effort-via-agent-variants`, `haiku-model-tier`, `kit-self-surfaces`) (D6)
- [x] 2.2 Implement `resolveWikilinks(text, liveRowIds, archiveSlugs)` as a pure helper in `scripts/lint.mjs` (D5, D6)
- [x] 2.3 Implement `checkBacklogWikilinks` (Check 23) in `scripts/lint.mjs` using the dependency-free ESM pattern, calling `resolveWikilinks` with the live row IDs and archive folder slugs (D5, D6)
- [x] 2.4 Add an inline self-test to Check 23 covering all four cases: live-row hit, archive-folder hit, code-spanned meta-token must-not-fire, bare dangling slug must-fire (D5, D6)
- [x] 2.5 Unit/integration test: `node scripts/lint.mjs` exits 0 on the cleaned backlog with Check 23 `OK`; temporarily inject a bare `[[does-not-exist]]` into `openspec/backlog.md`, confirm non-zero exit naming the slug, then revert (D5, D6)
- [x] 2.6 Checkpoint (automated): `node scripts/lint.mjs` exits 0 with Check 23 `OK` after the cleanup; temporarily add a bare `[[does-not-exist]]` to `openspec/backlog.md`, confirm non-zero exit naming the slug, then revert (D5, D6)

## 3. Idea capture on a shared writer

**Compute:** effort=medium model=sonnet — new skill file and new command file; the skill is procedure prose with clear spec; the command wires an interview flow following an existing pattern.

- [x] 3.1 Create `claude/skills/backlog-writer/SKILL.md` implementing the shared append procedure: dedup, P-band proposal, row construction referencing the frozen grammar in `openspec-templates/backlog.template.md` and Check 22, and staging (D7, D8, D11)
- [x] 3.2 Create `claude/commands/idea.md` with main-loop interview flow (no `agent:` frontmatter, no version-check or budget-gate embeds) (D7, D9, D11)
- [x] 3.3 Update `scripts/skill-sets.mjs` to register `backlog-writer` in the skill set for the `idea` command (D7, D9)
- [x] 3.4 Add `/qrspi:idea` to the README helpers listing (D9)
- [x] 3.5 Unit/integration test: `node scripts/lint.mjs` — Check 2 resolves `backlog-writer` for the `idea` command; Check 4 passes for `idea.md` ↔ README; Check 9 does not flag `idea.md` for missing version-check embed; budget-gate embed check does not flag `idea.md` (D7, D9, D11)
- [x] 3.6 Checkpoint (automated): `node scripts/lint.mjs` exits 0; Check 2, 4, 9, and budget-gate check all report `OK`
- [ ] 3.7 (human) Launch `claude --plugin-dir /workspaces/git/qrspi` in a throwaway consumer fixture with a populated `openspec/backlog.md`; run `/qrspi:idea "add usage telemetry dashboard"`; confirm the command reads the backlog and surfaces near-matches (if any), offers proceed/abort, proposes a P-band via `AskUserQuestion`, prompts for a one-sentence shape, and stages a row; run `node scripts/lint.mjs` inside the fixture and confirm Check 22 reports no violation for the new row. Also run `/qrspi:idea` with no argument and confirm the intent prompt appears. (D7, D8, D9, D11)

## 4. Every append site on the shared writer (depends on Slice 3)

**Compute:** effort=medium model=sonnet — mechanical prose migration across four files; pattern is established by Slice 3; no new design reasoning needed.

- [x] 4.1 Update `claude/agents/questioner.md` to load skill `backlog-writer` in its Load skills line and replace inline deferred-work-capture grammar prose with a delegation call to the skill procedure (D11)
- [x] 4.2 Update `claude/agents/designer.md` to load skill `backlog-writer` in its Load skills line and replace inline deferred-work-capture grammar prose with a delegation call to the skill procedure (D11)
- [x] 4.3 Update `claude/agents/architect.md` to load skill `backlog-writer` in its Load skills line and replace inline deferred-work-capture grammar prose with a delegation call to the skill procedure (D11)
- [x] 4.4 Update `claude/commands/followup.md` P3 promote path to load `backlog-writer` and follow its procedure (D11)
- [x] 4.5 Update `scripts/skill-sets.mjs` `SKILL_SET_EXPECTED` map to include `backlog-writer` in the skill set for questioner, designer, and architect (D11)
- [x] 4.6 Unit/integration test: `node scripts/lint.mjs` — Check 2 resolves `backlog-writer` for questioner, designer, and architect; no dangling skill references reported; full lint passes green (D11)
- [x] 4.7 Checkpoint (automated): `node scripts/lint.mjs` exits 0; Check 2 reports `OK` for questioner, designer, and architect against `backlog-writer`
- [ ] 4.8 (human) Launch `claude --plugin-dir /workspaces/git/qrspi` in a throwaway consumer fixture; exercise one deferred-work-capture path (e.g. run `/qrspi:questions <id>` on a minimal change and let it surface a separable idea); confirm the resulting row matches the `backlog-writer` procedure (correct grammar, Check-22-valid) and that no inline grammar copy appears in the agent response. Also exercise the followup P3 path (`/qrspi:followup <id>` on a fixture with a deferred follow-up) and confirm it delegates to `backlog-writer`. (D11)

## 5. Command-level append sites on the shared writer (added stage I; depends on Slice 3)

**Compute:** effort=medium model=sonnet — mechanical prose migration across four command files following the Slice 3–4 pattern, but touches the `pr.md` reconciliation path whose surrounding commit orchestration must be preserved and requires the skill-sets wiring; no new design reasoning.

- [x] 5.1 Migrate `claude/commands/design.md` step 4 ("Capture deferred work") to load `backlog-writer` and delegate row construction, removing the inline `### <slug> — \`idea\` · **P<n>**` + `**Why:**`/`**Shape:**` block while preserving the offer/dedup/skip-if-nothing prose (D11)
- [x] 5.2 Migrate `claude/commands/structure.md`'s capture step the same way — load `backlog-writer`, remove the inline grammar block, preserve surrounding capture semantics (D11)
- [x] 5.3 Migrate `claude/commands/pr.md`'s "Promote to backlog idea" path to load `backlog-writer` and delegate row construction, removing the inline grammar block while preserving the surrounding `followups.md` tick + commit orchestration (D11)
- [x] 5.4 Trim the referential grammar block in `claude/commands/slices.md` to a pointer to the frozen grammar (template + Check 22) — stage V does not append, so no delegation call is needed, only removal of the full inline copy (D11)
- [x] 5.5 Wire any command→skill registration Check 2 requires in `scripts/skill-sets.mjs` for the migrated commands (D11)
- [x] 5.6 Unit/integration test: `node scripts/lint.mjs` — Check 2 resolves `backlog-writer` for every migrated command with no dangling skill reference; a scan for the inline row-construction pattern outside `claude/skills/backlog-writer/` and `openspec-templates/` finds no remaining copy; `openspec validate backlog-schema-finish --strict` passes (D11)
- [x] 5.7 Checkpoint (automated): `node scripts/lint.mjs` exits 0; Check 2 reports `OK` for the migrated commands against `backlog-writer`; no inline row-grammar block remains outside the skill/template
- [ ] 5.8 (human) Launch `claude --plugin-dir /workspaces/git/qrspi` in a throwaway consumer fixture; exercise the D-stage capture (run `/qrspi:design <id>` on a change whose Non-Goals name a separable future change and accept the idea offer) and confirm the staged row is produced through the `backlog-writer` procedure (Check-22-valid, no inline grammar in the command's own prose). Also exercise the PR promote path (`/qrspi:pr <id>` with an open follow-up promoted to backlog) and confirm it delegates to `backlog-writer`. (D11)
