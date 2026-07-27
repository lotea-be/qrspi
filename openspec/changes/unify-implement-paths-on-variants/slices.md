# Slices — unify-implement-paths-on-variants

> Stage V of QRSPI. Generated 2026-07-27.
> Vertical slices, not horizontal layers.

## Overview

This change eliminates the asymmetry between the three implementer-dispatch
paths (normal slice, FIX MODE, trivial inline-plan) by routing every spawn
through an effort-variant, then deleting the now-dead base `implementer.md`
and cleaning up the lint guards that enforced its former responsibilities.
A bundled rider adds a cwd/change-folder note to all eleven resolving commands
and syncs documentation.

The "surfaces" in this repo are markdown command/agent/skill files,
`scripts/lint.mjs`, and `plugin.json`. There is no HTTP API, no DB, and no UI.
The vertical unit here is therefore an **end-to-end routing or guard behaviour
that leaves `node scripts/lint.mjs` green at its boundary**. Each slice adds
real, observable, lint-green behaviour before the next slice starts. The
four-slice ordering below matches the phasing in `proposal.md` but is arranged
so that no banner, map entry, or skill-set entry is ever orphaned mid-change:
routing lands first (Slice 1), then the deletion with its dependent structural
edits is bundled as one atomic unit (Slice 2), then the new guards are added
(Slice 3), and finally the documentation/surface cleanup closes the change
(Slice 4).

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — FIX MODE + trivial-path routing onto variants

**Deliverable.** After this slice, every code path that spawns an implementer
does so through an effort-variant agent. Specifically: `followup.md` FIX MODE
spawns `qrspi:implementer-<effort>` (defaulting to `implementer-medium`) instead
of the bare base, and `implement.md`'s trivial inline-plan branch explicitly
targets `qrspi:implementer-medium` with `model: sonnet`. The base
`implementer.md` still exists at this slice boundary (it is not deleted until
Slice 2), so lint remains green on the nine-minus-three-plus-one agent set.
Deliberate gap: the base agent's lint responsibilities (Check 7/12 map,
`SKILL_SET_EXPECTED`) are carried over unchanged until Slice 2 removes the
base entirely.

- M: no mock stub — these are orchestrator-prose edits to two command files,
  not service endpoints; the routing contract is settled in specs/followup-triage
  and specs/compute-selection. (D1, D2)
- F: edit `claude/commands/followup.md` — parse optional `(compute: effort=…
  model=…)` token from the follow-up description; map `effort=` to variant
  subagent_type (default `qrspi:implementer-medium`); wire `model: sonnet` as
  the explicit default; update the FIX MODE Agent spawn block from
  `qrspi:implementer` to the resolved variant. (D1)
- F: edit `claude/commands/implement.md` — in the trivial / no-`tasks.md`
  inline-plan branch, replace the fall-through with an explicit spawn of
  `qrspi:implementer-medium` with `model: sonnet`. (D2)
- D: no data-store surface in this repo.
- T: run `node scripts/lint.mjs` — MUST exit 0 (the base agent still exists,
  so Check 7/12 and Check 15 see no new violation). Manual read of the two
  edited files confirms the spawn blocks name variant subagent_types and the
  prose description of the FIX MODE default agrees with the wiring. (D1, D2)
- **Compute:** model=sonnet effort=low — two mechanical prose edits to existing
  command files; pattern is a direct find-and-replace of the spawn block and
  effort-routing addition with a settled spec.
- Checkpoint: `node scripts/lint.mjs` exits 0. Read `followup.md` and confirm
  the FIX MODE Agent call targets `qrspi:implementer-medium` (or a resolved
  variant) and carries `model: sonnet` as the default. Read `implement.md` and
  confirm the trivial inline-plan branch spawns `qrspi:implementer-medium` with
  `model: sonnet`, with no reference to the bare `qrspi:implementer`.
- (human) Confirm `/qrspi:followup` with no inline effort token in a
  `--plugin-dir` session spawns `implementer-medium`. Install the dev copy
  (`claude --plugin-dir /workspaces/git/qrspi`) in a throwaway consumer
  fixture outside this repo, invoke `/qrspi:followup <id>` with a P1 triage
  pick and no `(compute: …)` spec, and confirm the Agent tool call targets
  `qrspi:implementer-medium`. (D1)
- (human) D8 model-override precedence: in the same `--plugin-dir` session,
  invoke `/qrspi:followup <id>` with a follow-up description containing
  `(compute: model=opus effort=high)` and confirm the Agent call carries
  `subagent_type: qrspi:implementer-high` and `model: opus` — verifying that
  an explicit inline model= overrides the sonnet default. (D1)

### Slice 2 — Delete base + relocate banner and skill-set responsibilities

**Deliverable.** After this slice, `claude/agents/implementer.md` is gone from
the repo and from `plugin.json`, and every lint responsibility formerly
attached to the base agent lives on the three variants. Specifically: the
three variant agents (`implementer-low.md`, `implementer-medium.md`,
`implementer-high.md`) carry full verbatim `> **Read contract**` and
`> **Output contract**` banners as blockquote lines; `SKILL_SET_EXPECTED` in
`scripts/lint.mjs` has three variant keys (`implementer-low`, `implementer-medium`,
`implementer-high`, each `['implementer-core']`) in place of the former base key;
`READ_CONTRACT_EXPECTED` drops the `implementer` key and gains the three variant
keys (each `Reads: tasks.md.`); `implementer-core`'s `description:` no longer
mentions `implementer.md`. All these edits land in the same commit so Check 7,
Check 12, Check 15, and the `checkSkillSets` sub-check (Check 2b) never see a
state where the base key is gone but the variant keys are absent (or vice versa).
Deliberate gap: the new sub-check (e) and standalone Check 16 are not yet
present — that is Slice 3.

- M: no mock stub — structural deletions and map-entry edits in markdown/JS
  files with a settled spec. (D3, D4, D5)
- F: add verbatim `> **Read contract** — Reads: tasks.md. …` and
  `> **Output contract**` banners to each of the three variant agent files, as
  blockquote lines before the numbered steps, so `extractStep1Skills` does not
  harvest them. (D4)
- F: edit `scripts/lint.mjs` — in `READ_CONTRACT_EXPECTED`, remove the
  `implementer` key and add `implementer-low`, `implementer-medium`,
  `implementer-high` (each with value `'Reads: tasks.md.'`); in
  `SKILL_SET_EXPECTED`, remove the `implementer` key and add the three variant
  keys (each with value `['implementer-core']`). (D5)
- F: edit `claude/skills/implementer-core/SKILL.md` frontmatter — update
  `description:` to reference the effort-variant agents and remove the
  `implementer.md` mention. (D5)
- F: edit `plugin.json` — remove `"./claude/agents/implementer.md"` from the
  `agents` array (10 → 9 paths). (D3)
- F: delete `claude/agents/implementer.md`. (D3)
- D: no data-store surface in this repo.
- T: run `node scripts/lint.mjs` — MUST exit 0 across all checks (Check 2b,
  Check 7, Check 12, Check 15 sub-checks a–d; note sub-check (e) is not yet
  present). Confirm the three variant files parse with banners and the base
  agent path is absent from `plugin.json`. (D3, D4, D5)
- **Compute:** model=sonnet effort=medium — ordering-sensitive: the deletion,
  the banner additions, the map edits, and the `plugin.json` change must all
  land atomically so no intermediate lint state is broken. Sonnet is sufficient
  for the mechanical edits; the medium effort tier is chosen because the
  sequencing constraint (never leave banners/map entries orphaned) requires
  careful ordering rather than creative reasoning.
- Checkpoint: `node scripts/lint.mjs` exits 0. Confirm `claude/agents/implementer.md`
  does not exist. Confirm `plugin.json` `agents` array has exactly 9 paths and
  does not list `./claude/agents/implementer.md`. Confirm each of the three
  variant files contains a `> **Read contract**` and `> **Output contract**`
  blockquote banner.

### Slice 3 — Tighten the guards: Check 15(e) + Check 16

**Deliverable.** After this slice, the lint system enforces both the
post-deletion invariants that Slice 2 established structurally. Check 15 gains
sub-check (e) (`"./claude/agents/implementer.md"` must NOT appear in
`plugin.json`'s `agents` array) with an inline self-test against a synthetic
fixture. A new standalone Check 16 (`checkFollowupStem`) reads
`claude/commands/followup.md` and asserts that `qrspi:implementer` is never
present without an immediately-following `-` suffix, using the negative-lookahead
predicate `qrspi:implementer(?!-)` over the whole file content (covering both
fenced `subagent_type:` blocks and inline prose). Both checks use the same
dependency-free ESM pattern as the existing checks. Deliberate gap: the cwd note
and documentation sync are in Slice 4.

- M: no mock stub — pure `scripts/lint.mjs` additions with settled spec
  predicates. (D6, D7)
- F: edit `scripts/lint.mjs` — extend the `checkVariantAgents` function with
  sub-check (e): read `plugin.json`, parse the `agents` array, assert
  `"./claude/agents/implementer.md"` is absent; add an inline self-test that
  passes a synthetic fixture containing the base path and asserts the detector
  fires; push a Check 15 error if the self-test fails. Register the sub-check
  inside `main()` under the existing `Check 15:` label. (D6)
- F: edit `scripts/lint.mjs` — add async function `checkFollowupStem(errors)`:
  read `claude/commands/followup.md`, apply regex `/qrspi:implementer(?!-)/`
  over the full file content, push a violation to `errors[]` for any match;
  register it in `main()` as `process.stdout.write('Check 16: ...')`. (D7)
- D: no data-store surface in this repo.
- T: run `node scripts/lint.mjs` — MUST exit 0 (the state left by Slice 2
  satisfies both new checks). Introduce a synthetic regression in a scratch
  file to confirm Check 16 fires on bare `qrspi:implementer` and exits non-zero
  (revert before committing). (D6, D7)
- **Compute:** model=sonnet effort=medium — the regex predicate (`qrspi:implementer(?!-)`)
  and self-test fixture logic require careful authoring to avoid false positives
  (variant names must not match) and to cover both file-form variants (fenced
  block and prose). Medium effort is appropriate; no creative reasoning required.
- Checkpoint: `node scripts/lint.mjs` exits 0 with Check 15 and Check 16 both
  reporting `OK`. Manually insert a bare `qrspi:implementer` line in a scratch
  copy of `followup.md`, run lint, confirm Check 16 reports a violation and
  exits non-zero, then revert.

### Slice 4 — Bundled rider: cwd note + docs sync

**Deliverable.** After this slice the change is complete and every repo
surface is consistent. All eleven change-folder-resolving command files carry
the verbatim cwd/change-folder note immediately after their Glob/precondition
line. `migrations/0.10.0.yaml` has one new `manual` note for consumers who
overrode `followup.md`. `README.md` is updated so Check 7/12 descriptions
reference nine agents (not seven), the base-implementer inventory entry is
removed, Check 15 describes sub-check (e) and the variant-banner requirement,
and Check 16 is documented as `checkFollowupStem`. `CHANGELOG.md` gains a
`## [Unreleased]` entry covering all four slices' changes. The `/qrspi-readme-audit`
skill is run to confirm no stale prose remains.

- M: no mock stub — mechanical text insertions and doc edits with verbatim
  spec. (D9, D10, D11)
- F: edit the eleven command files (`questions.md`, `research.md`, `design.md`,
  `structure.md`, `slices.md`, `plan.md`, `implement.md`, `pr.md`, `followup.md`,
  `archive.md`, `retro.md`) — insert the verbatim cwd note immediately after
  the Glob/precondition line in each. (D9)
- F: edit `migrations/0.10.0.yaml` — append one `manual` note entry advising
  consumers who locally overrode `followup.md` to re-apply their customisations
  onto the new variant-routing logic (`qrspi:implementer-medium` default instead
  of bare `qrspi:implementer`), mirroring the structure of the existing
  `implement.md` override note. (D10)
- F: edit `README.md` — update Check 7/12 descriptions to reference nine agents
  (six stage agents plus three implementer effort-variant agents); remove any
  agent inventory line that lists `implementer.md` as a base agent; update
  Check 15 description to include sub-check (e) and the variant-banner note;
  add Check 16 entry (`checkFollowupStem`). (D11)
- F: edit `CHANGELOG.md` — add `## [Unreleased]` entry summarising the
  implementer-dispatch unification, the base-agent deletion, and the cwd-note
  addition to eleven commands. (D11)
- D: no data-store surface in this repo.
- T: run `node scripts/lint.mjs` — MUST exit 0 (Check 4 command-README sync,
  all other checks). Load the `/qrspi-readme-audit` skill and confirm it reports
  no stale spots. (D9, D10, D11)
- **Compute:** model=sonnet effort=low — eleven identical one-line insertions
  plus four doc-file edits; fully mechanical with verbatim text specified in
  the spec; no reasoning required.
- Checkpoint: `node scripts/lint.mjs` exits 0 (including Check 4). Confirm each
  of the eleven command files contains the verbatim cwd note. Confirm
  `migrations/0.10.0.yaml` contains the new `manual` entry. Run
  `/qrspi-readme-audit` and confirm it reports no stale spots.
