# Tasks — per-slice-compute-tier

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Haiku tier: lint constant + vertical-slice docs

**Compute:** model=sonnet effort=low — mechanical constant addition plus a docs section that mirrors an existing pattern; no novel design reasoning. (D1, D2)

- [x] 1.1 Add `haiku` to the allowed-model vocabulary constant in `scripts/lint.mjs` (Check 13) so it accepts `model=haiku` without error. (D1)
- [x] 1.2 Update `claude/skills/vertical-slice/SKILL.md` to document `model=haiku` as a recognized alias with its own heuristic band (e.g. "single-file edits, renames, boilerplate with zero design reasoning"). (D2)
- [x] 1.3 Add a fixture line `effort=low model=haiku — mechanical rename` to the Check 13 test corpus inside `scripts/lint.mjs`. (D2)
- [x] 1.4 Unit/integration test: run `node scripts/lint.mjs` and confirm exit 0; verify a `model=unknown` fixture still triggers a non-zero exit. (D1, D2)
- [x] 1.5 Checkpoint: run `node scripts/lint.mjs` locally and confirm Check 13 passes with the `model=haiku` fixture line present.

## 2. implementer-core skill + base implementer refactor

**Compute:** model=sonnet effort=low — mechanical extraction: copy the body, update one load line, update one registry entry; the skill-set structure is already established. (D3, D4)

- [x] 2.1 Create `claude/skills/implementer-core/SKILL.md` containing the full shared implementer body extracted verbatim from `claude/agents/implementer.md`. (D3)
- [x] 2.2 Rewrite `claude/agents/implementer.md` to load `implementer-core` (a thin delegation wrapper) — keep the agent frontmatter and Read-contract banner, replace the body with a load directive. (D3)
- [x] 2.3 Verify `SKILL_SET_EXPECTED` in `scripts/lint.mjs` has an entry for the `implementer` stem and that Check 5 (`checkSkillSets`) reports OK for the updated layout; add or adjust the entry if needed. (D4)
- [x] 2.4 Unit/integration test: `node scripts/lint.mjs` exits 0 with Check 2 (skill resolution) and Check 5 (`checkSkillSets`) both passing. (D3, D4)
- [ ] 2.5 (human) In a `--plugin-dir /workspaces/git/qrspi` session run `/qrspi:implement <id>` on a change that has a `tasks.md` with exactly one un-ticked box; confirm the implementer subagent launches and behaves normally — confirming the refactored `implementer.md` + `implementer-core` body is functionally identical to the pre-refactor baseline.
- [x] 2.6 Checkpoint: `node scripts/lint.mjs` exits 0.

## 3. Variant agents + Check 15 drift gate

**Compute:** model=sonnet effort=medium — three new agent files following a clear template plus a new lint check with inline self-test; the self-test harness adds moderate but well-defined complexity. (D5, D6)

- [x] 3.1 Create `claude/agents/implementer-low.md`, `claude/agents/implementer-medium.md`, and `claude/agents/implementer-high.md`, each loading `implementer-core` with the appropriate effort-tier frontmatter (`effort: low / medium / high`). (D5)
- [x] 3.2 Add Check 15 (`checkVariantAgents`) to `scripts/lint.mjs`: asserts all three variant agent files exist and resolve correctly; include an inline synthetic-fixture self-test that fires on every lint pass. (D6)
- [x] 3.3 Confirm or update `SKILL_SET_EXPECTED` entries in `scripts/lint.mjs` for the three variant stems (`implementer-low`, `implementer-medium`, `implementer-high`) per the design decision (add entries if required, leave absent if the design says no entry needed). (D5)
- [x] 3.4 Unit/integration test: `node scripts/lint.mjs` exits 0 with Check 15 visible in output as `Check 15: OK`; verify the inline self-test fires correctly against its synthetic fixture; verify that removing `claude/agents/implementer-medium.md` in a temp copy causes `node scripts/lint.mjs` to exit non-zero. (D5, D6)
- [x] 3.5 Checkpoint: run `node scripts/lint.mjs` and confirm Check 15 appears in output as `Check 15: OK`.

## 4. implement.md resolution + orthogonal grammar + migration

**Compute:** model=opus effort=high — two edit sites in `implement.md` (main spawn + auto-mode loop), non-trivial resolution logic (token parsing, variant mapping, default handling, hard-stop wiring), and a live OQ1 interaction observable only at runtime; this is the highest-reasoning slice in the set. (D7, D8)

- [x] 4.1 Edit `claude/commands/implement.md` (main spawn site): add logic to parse the next un-ticked slice's `**Compute:**` line — extract `effort=` (required; hard-stop if absent) and `model=` (optional; default `sonnet`) — then map `effort=` to the correct variant agent (`low` → `implementer-low`, `medium` → `implementer-medium`, `high` → `implementer-high`) and spawn with the resolved `model:` parameter. (D7)
- [x] 4.2 Edit `claude/commands/implement.md` (auto-mode loop site): apply the same `effort=` → variant + `model=` resolution in the Full/Semi-auto per-slice loop so auto-chained slices also dispatch to the correct variant. (D7)
- [x] 4.3 Wire the hard-stop: when `effort=` is absent from a slice's `**Compute:**` line, surface the condition and halt — no implementer is spawned. (D7)
- [x] 4.4 Update Check 13 in `scripts/lint.mjs` to enforce `effort=` as required and accept `model=` as optional in the orthogonal grammar; also update the `vertical-slice` skill grammar section and `openspec-templates/` grammar comments to reflect the new canonical form. (D8)
- [x] 4.5 Add the migration entry to `migrations/` for this version covering the grammar change (existing `slices.md` and `tasks.md` files using the old `model=`-required form). (D8)
- [x] 4.6 Unit/integration test: `node scripts/lint.mjs` exits 0 with the updated Check 13; verify that a fixture with `model=sonnet` and no `effort=` token causes a non-zero exit. (D7, D8)
- [ ] 4.7 (human) In a `--plugin-dir /workspaces/git/qrspi` session: (a) run `/qrspi:implement <id>` against a change whose next slice has `effort=low model=haiku` — confirm the terminal shows `implementer-low` spawned with `model: haiku` (OQ1 observed: Agent-tool `model:` overrides frontmatter default); (b) temporarily set a slice's `**Compute:**` line to `model=sonnet` with no `effort=` token — confirm a hard-stop is issued and no implementer is spawned.
- [x] 4.8 Checkpoint: `node scripts/lint.mjs` exits 0.
