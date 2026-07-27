# Tasks — unify-implement-paths-on-variants

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. FIX MODE + trivial-path routing onto variants

**Compute:** model=sonnet effort=low — two mechanical prose edits to existing command files; pattern is a direct find-and-replace of the spawn block and effort-routing addition with a settled spec.

- [ ] 1.1 Edit `claude/commands/followup.md` — parse the optional `(compute: effort=… model=…)` token from the follow-up description; map `effort=` to variant subagent_type (default `qrspi:implementer-medium`); wire `model: sonnet` as the explicit default; replace the bare `qrspi:implementer` Agent spawn in the FIX MODE block with the resolved variant name. (D1)
- [ ] 1.2 Edit `claude/commands/implement.md` — in the trivial / no-`tasks.md` inline-plan branch, replace the fall-through bare spawn with an explicit spawn of `qrspi:implementer-medium` with `model: sonnet`. (D2)
- [ ] 1.3 Unit/integration test: run `node scripts/lint.mjs` and confirm it exits 0 (base agent still exists so Check 7/12 and Check 15 see no violation). (D1, D2)
- [ ] 1.4 (human) Confirm no-effort-token default: in a `--plugin-dir /workspaces/git/qrspi` session with a throwaway consumer fixture outside this repo, invoke `/qrspi:followup <id>` with a P1 triage pick and no `(compute: …)` token; confirm the Agent tool call targets `qrspi:implementer-medium`. (D1)
- [ ] 1.5 (human) D8 model-override precedence: in the same `--plugin-dir` session, invoke `/qrspi:followup <id>` with a follow-up description containing `(compute: model=opus effort=high)`; confirm the Agent call carries `subagent_type: qrspi:implementer-high` and `model: opus`, verifying the inline `model=` overrides the sonnet default. (D1)
- [ ] 1.6 Checkpoint: `node scripts/lint.mjs` exits 0. Read `claude/commands/followup.md` and confirm the FIX MODE Agent call targets `qrspi:implementer-medium` (or a resolved variant) and carries `model: sonnet` as the default. Read `claude/commands/implement.md` and confirm the trivial inline-plan branch spawns `qrspi:implementer-medium` with `model: sonnet` and contains no reference to the bare `qrspi:implementer`. (D1, D2)

## 2. Delete base + relocate banner and skill-set responsibilities

**Compute:** model=sonnet effort=medium — ordering-sensitive: the deletion, the banner additions, the map edits, and the `plugin.json` change must all land atomically so no intermediate lint state is broken. Sonnet is sufficient for the mechanical edits; the medium effort tier is chosen because the sequencing constraint (never leave banners/map entries orphaned) requires careful ordering rather than creative reasoning.

> **Atomic-commit constraint:** all tasks in this slice (2.1–2.5) must be staged and committed together in a single commit. No partial intermediate state should be committed — doing so would break Check 7, Check 12, or Check 15 between tasks.

- [ ] 2.1 Add verbatim `> **Read contract** — Reads: tasks.md. …` and `> **Output contract**` blockquote banners to each of `claude/agents/implementer-low.md`, `claude/agents/implementer-medium.md`, and `claude/agents/implementer-high.md`, placed before the numbered steps so `extractStep1Skills` does not harvest them. (D4)
- [ ] 2.2 Edit `scripts/lint.mjs` — in `READ_CONTRACT_EXPECTED`, remove the `implementer` key and add `implementer-low`, `implementer-medium`, `implementer-high` (each with value `'Reads: tasks.md.'`); in `SKILL_SET_EXPECTED`, remove the `implementer` key and add `implementer-low`, `implementer-medium`, `implementer-high` (each with value `['implementer-core']`). (D5)
- [ ] 2.3 Edit `claude/skills/implementer-core/SKILL.md` frontmatter — update `description:` to reference the effort-variant agents and remove the `implementer.md` mention. (D5)
- [ ] 2.4 Edit `.claude-plugin/plugin.json` — remove `"./claude/agents/implementer.md"` from the `agents` array (10 paths -> 9 paths). (D3)
- [ ] 2.5 Delete `claude/agents/implementer.md`. (D3)
- [ ] 2.6 Unit/integration test: run `node scripts/lint.mjs` and confirm it exits 0 across all checks (Check 2b, Check 7, Check 12, Check 15 sub-checks a-d; note sub-check (e) is not yet present). (D3, D4, D5)
- [ ] 2.7 Checkpoint: `node scripts/lint.mjs` exits 0. Confirm `claude/agents/implementer.md` does not exist. Confirm `plugin.json` `agents` array has exactly 9 paths and does not list `./claude/agents/implementer.md`. Confirm each of the three variant files contains a `> **Read contract**` and `> **Output contract**` blockquote banner. (D3, D4, D5)

## 3. Tighten the guards: Check 15(e) + Check 16

**Compute:** model=sonnet effort=medium — the regex predicate (`qrspi:implementer(?!-)`) and self-test fixture logic require careful authoring to avoid false positives (variant names must not match) and to cover both file-form variants (fenced block and prose). Medium effort is appropriate; no creative reasoning required.

- [ ] 3.1 Edit `scripts/lint.mjs` — extend the `checkVariantAgents` function with sub-check (e): read `plugin.json`, parse the `agents` array, assert `"./claude/agents/implementer.md"` is absent; add an inline self-test that passes a synthetic fixture containing the base path and asserts the detector fires; push a Check 15 error if the self-test fails; register the sub-check inside `main()` under the existing `Check 15:` label. (D6)
- [ ] 3.2 Edit `scripts/lint.mjs` — add async function `checkFollowupStem(errors)`: read `claude/commands/followup.md`, apply regex `/qrspi:implementer(?!-)/` over the full file content, push a violation to `errors[]` for any match; register it in `main()` as `process.stdout.write('Check 16: ...')`. (D7)
- [ ] 3.3 Unit/integration test: run `node scripts/lint.mjs` and confirm it exits 0 with Check 15 and Check 16 both reporting OK (the state left by Slice 2 satisfies both new checks). Introduce a synthetic bare `qrspi:implementer` in a scratch copy of `claude/commands/followup.md`, run lint, confirm Check 16 fires and exits non-zero, then revert the scratch copy before committing. (D6, D7)
- [ ] 3.4 Checkpoint: `node scripts/lint.mjs` exits 0 with Check 15 and Check 16 both reporting `OK`. Manually insert a bare `qrspi:implementer` line in a scratch copy of `followup.md`, run lint, confirm Check 16 reports a violation and exits non-zero, then revert. (D6, D7)

## 4. Bundled rider: cwd note + docs sync

**Compute:** model=sonnet effort=low — eleven identical one-line insertions plus four doc-file edits; fully mechanical with verbatim text specified in the spec; no reasoning required.

- [ ] 4.1 Edit the eleven change-folder-resolving command files (`claude/commands/questions.md`, `claude/commands/research.md`, `claude/commands/design.md`, `claude/commands/structure.md`, `claude/commands/slices.md`, `claude/commands/plan.md`, `claude/commands/implement.md`, `claude/commands/pr.md`, `claude/commands/followup.md`, `claude/commands/archive.md`, `claude/commands/retro.md`) — insert the verbatim cwd/change-folder note immediately after the Glob/precondition line in each. (D9)
- [ ] 4.2 Edit `migrations/0.10.0.yaml` — append one `manual` note entry advising consumers who locally overrode `followup.md` to re-apply their customisations onto the new variant-routing logic (`qrspi:implementer-medium` default instead of bare `qrspi:implementer`), mirroring the structure of the existing `implement.md` override note. (D10)
- [ ] 4.3 Edit `README.md` — update Check 7/12 descriptions to reference nine agents (six stage agents plus three implementer effort-variant agents); remove any agent inventory line that lists `implementer.md` as a base agent; update Check 15 description to include sub-check (e) and the variant-banner note; add Check 16 entry (`checkFollowupStem`). (D11)
- [ ] 4.4 Edit `CHANGELOG.md` — add `## [Unreleased]` entry summarising the implementer-dispatch unification, the base-agent deletion, and the cwd-note addition to eleven commands. (D11)
- [ ] 4.5 Unit/integration test: run `node scripts/lint.mjs` and confirm it exits 0 (including Check 4 command-README sync). (D9, D10, D11)
- [ ] 4.6 Load the `/qrspi-readme-audit` skill and confirm it reports no stale spots. (D11)
- [ ] 4.7 Checkpoint: `node scripts/lint.mjs` exits 0 (including Check 4). Confirm each of the eleven command files contains the verbatim cwd note. Confirm `migrations/0.10.0.yaml` contains the new `manual` entry. Run `/qrspi-readme-audit` and confirm it reports no stale spots. (D9, D10, D11)
