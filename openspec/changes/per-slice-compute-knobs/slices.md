# Slices — per-slice-compute-knobs

> Stage V of QRSPI. Generated 2026-07-25.
> Vertical slices, not horizontal layers.

## Overview

This change has no data-store, HTTP-API, or browser-UI surface. A "vertical
slice" here means a self-contained unit that edits the relevant kit sources
AND lands its own passing CI gate — so each slice is demoable by running
`node scripts/lint.mjs` green and, where the behaviour is user-facing,
verifiable in a `--plugin-dir` session.

The five slices follow the five phases from the proposal exactly — each is
independently lint-green and reviewable on its own:

1. Grammar + authoring + carry-forward — the mechanical text-substitution
   that authors the new `**Compute:**` form in templates and skills; the new
   annotation is visible in any hand-written change folder immediately.
2. Lint Check 13 + frontmatter effort — the machine-readable enforcement
   layer; adds Check 13 to `scripts/lint.mjs` and the `effort:` key to all
   seven agent files; depends on slice 1 because it must tolerate the form
   introduced there.
3. Thread compute on every stage command — the per-stage and per-slice
   orchestration wiring; each command explicitly passes model + effort;
   drops the self-halt from the implementer; depends on slices 1–2 because
   it reads the annotation form and relies on the frontmatter field.
4. FIX MODE inline spec + prose/wiring fix — the targeted `followup.md`
   change; isolated from slices 2–3 and can ship after slice 1, but is
   listed fourth to keep review scope narrow.
5. Migration + README + CHANGELOG — pure documentation; must land last so
   it can reference the final check number and all changed files by name.

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Grammar + authoring + carry-forward

**Deliverable.** The `**Model:**` token is replaced by `**Compute:**` in every
authoring surface that guides a human or agent to write the annotation: the
architect's `slices.md` skeleton (in `claude/agents/architect.md`), the
`vertical-slice` skill's "Per-slice model selection" section, the planner's
carry-forward rule (in `claude/agents/planner.md` or the plan command), and
`openspec-templates/tasks.template.md`. After this slice, opening any of these
files in a `--plugin-dir` session shows the new `**Compute:** model=… effort=…`
form; a hand-written `slices.md` or `tasks.md` that uses the new form will be
a valid artifact. `node scripts/lint.mjs` is green throughout (no Check 13 yet
— that lands in slice 2; no existing check watches the annotation token). The
old `**Model:**` form disappears from every template and authoring guide.

- A (Agent files): rewrite the `slices.md` skeleton in `claude/agents/architect.md` — replace `**Model:** sonnet|opus — <rationale>` with `**Compute:** model=<alias> effort=<low|medium|high> — <rationale>` (D1, D2, D3)
- S (Skills): update the "Per-slice model selection" heading and all example lines in `claude/skills/vertical-slice/SKILL.md` to use `**Compute:**`; add a note documenting both structural forms (dash-bullet in `slices.md`, bare bold in `tasks.md`) (D1, D2, D3)
- A (Agent files / planner): update the carry-forward rule in `claude/agents/planner.md` (or `claude/commands/plan.md`) so it names `**Compute:**` rather than `**Model:**` and preserves it verbatim into `tasks.md` (D1, D3)
- T (Templates): rewrite `openspec-templates/tasks.template.md` — replace the `**Model:**` placeholder line with `**Compute:** model=<alias> effort=<low|medium|high> — <rationale>` in the bare bold form (D1, D3)
- T (Tests/CI): `node scripts/lint.mjs` exits 0 after all four edits above
- **(human) Checkpoint:** launch `claude --plugin-dir /workspaces/git/qrspi` and open `claude/agents/architect.md`, `claude/skills/vertical-slice/SKILL.md`, and `openspec-templates/tasks.template.md` — confirm every occurrence of `**Model:**` is gone and `**Compute:**` appears in the correct position with the `model=` and `effort=` token names.
- **Model:** sonnet — mechanical text substitution across four files; no novel reasoning; every change is a targeted find-and-replace of a known string.
- Checkpoint: `node scripts/lint.mjs` exits 0; no `**Model:**` token remains in `architect.md`, `vertical-slice/SKILL.md`, `planner.md`/`plan.md`, or `tasks.template.md`.

### Slice 2 — Lint Check 13 + frontmatter effort

**Deliverable.** `scripts/lint.mjs` gains `checkComputeAnnotations` as Check 13
(registered in `main()` after Check 12, header comment updated to 1–13). All
seven `claude/agents/*.md` files carry a new `effort:` frontmatter key (`high`
for designer and implementer; `medium` for all others). Check 2 is extended to
require and validate the `effort:` field on every agent file. After this slice,
a `slices.md` containing `- **Compute:** model=haiku — …` or a `tasks.md`
containing `**Compute:** model=sonnet effort=medium-high — …` causes Check 13
to exit non-zero; an agent file with `effort: xhigh` causes Check 2 to exit
non-zero; a clean repo exits 0. Depends on slice 1 (Check 13 must tolerate the
`**Compute:**` form introduced there).

- S (Scripts/lint): add `checkComputeAnnotations` async function and register as Check 13 in `main()` after Check 12 in `scripts/lint.mjs`; declare `COMPUTE_MODELS = ['sonnet', 'opus']` and `COMPUTE_EFFORTS = ['low', 'medium', 'high']` as adjacent consts; update header comment 1–13 (D6)
- S (Scripts/lint): implement the check to glob `openspec/changes/**/slices.md` and `**/tasks.md`, find every `**Compute:**` line (tolerating both `-` bullet and bare bold forms), and flag: missing/empty `model=`; `model=` not in `COMPUTE_MODELS`; `effort=` present but not in `COMPUTE_EFFORTS` (D1, D6)
- S (Scripts/lint): extend Check 2 to require an `effort:` frontmatter key on every agent file and validate its value against `{low, medium, high}` — rejecting `xhigh` and `max` (D5, D6)
- A (Agent files): add `effort: high` to the frontmatter of `claude/agents/designer.md` and `claude/agents/implementer.md` (D5)
- A (Agent files): add `effort: medium` to the frontmatter of `claude/agents/questioner.md`, `researcher.md`, `architect.md`, `planner.md`, and `reviewer.md` (D5)
- T (Tests/CI): `node scripts/lint.mjs` exits 0 with the new check and all seven agents updated; verify the bad-annotation mutation (add `model=haiku` to a scratch slices.md) exits non-zero and names the file (D6)
- **(human) Checkpoint:** run `node scripts/lint.mjs` and confirm it exits 0 and reports "Check 13: …" in the output. Then temporarily write `**Compute:** model=haiku — test` into a scratch `openspec/changes/test-lint/slices.md` and re-run — confirm Check 13 exits non-zero naming the file. Remove the scratch file before continuing.
- **Model:** opus — Check 13 requires writing a regex/token parser that handles two structural forms and three error cases; Check 2 extension adds a new required-field rule; the seven frontmatter edits are mechanical but must be consistent with D5's defaults.
- Checkpoint: `node scripts/lint.mjs` exits 0 in a clean repo; the bad-model mutation above exits non-zero naming the offending file.

### Slice 3 — Thread compute on every stage's Agent call

**Deliverable.** Every QRSPI stage command file is updated to pass its
agent's frontmatter `model:` value explicitly on the Agent tool call:
`claude/commands/questions.md`, `research.md`, `design.md`, `structure.md`,
`slices.md`, `plan.md`, and `pr.md` each gain an explicit `model:` parameter.
`claude/commands/implement.md` is updated to read the `model=` value from the
next un-ticked `**Compute:**` line in `tasks.md` and pass it per-invocation.
The implementer self-halt (the instruction asking the subagent to check its
running model and stop on mismatch) is removed from `claude/agents/implementer.md`.
A prose note is added to `implement.md` stating that `effort=` is a per-stage
knob honored via the agent's frontmatter `effort:`, not a per-invocation
parameter. After this slice, every spawned subagent receives an explicit model;
no stage relies on implicit inheritance. Depends on slices 1–2 (the annotation
form and the `effort:` frontmatter are both live before threading lands).

- C (Commands): update `claude/commands/questions.md`, `research.md`, `design.md`, `structure.md`, `slices.md`, `plan.md`, and `pr.md` — each Agent call targeting a QRSPI stage subagent gains an explicit `model:` parameter sourced from that agent's frontmatter `model:` value (D4, D5)
- C (Commands): update `claude/commands/implement.md` — parse the `model=` token from the next un-ticked `**Compute:**` line in `tasks.md` and pass it as the per-invocation `model` parameter on the Agent call (D4, D5)
- A (Agent files): remove the self-halt instruction from `claude/agents/implementer.md`; the orchestrator spawn-time `model:` parameter is the sole gate (D4, D5)
- C (Commands): add a prose note in `claude/commands/implement.md` that `effort=` documents per-stage intent and is honored via the implementer agent's frontmatter `effort:`, not a per-invocation parameter (D4)
- T (Tests/CI): `node scripts/lint.mjs` exits 0 after all command edits (D5)
- **(human) Checkpoint:** launch `claude --plugin-dir /workspaces/git/qrspi` and run `/qrspi:structure test-id` against a test change folder (or review the command source directly) — confirm the Agent call in each command file includes an explicit `model:` parameter and that `implementer.md` no longer contains the self-halt text. Confirm `node scripts/lint.mjs` exits 0.
- **Model:** opus — threading model across eight command files (seven non-implement + implement) requires reasoning about each file's Agent-call structure and ensuring the annotation-parsing logic in `implement.md` is correct; the self-halt removal needs careful verification that no other gate is accidentally dropped.
- Checkpoint: `node scripts/lint.mjs` exits 0; every stage command file contains an explicit `model:` on its Agent call; `implementer.md` contains no self-halt text.

### Slice 4 — FIX MODE inline spec + prose/wiring fix

**Deliverable.** `claude/commands/followup.md` is updated in two ways: (a) the
orchestrator prose gains an optional inline `(compute: model=… effort=…)` spec
that, when present, is parsed and its `model=` value is threaded as the
per-invocation `model` parameter on the FIX MODE Agent call; (b) the default
FIX MODE Agent call is changed to pass `model: sonnet` explicitly, eliminating
the prior mismatch where the implementer's frontmatter `model: opus` silently
won despite the prose saying "default sonnet". Both fixes together ensure prose
and wiring agree on the default, and that the optional inline spec overrides it
correctly. Depends on slice 1 (the `(compute: …)` grammar reuses D1's
`key=value` form). Independent of slices 2–3 (no lint check covers followup
wiring; no stage-command threading touches `followup.md`).

- C (Commands): update `claude/commands/followup.md` — add prose describing the optional `(compute: model=… effort=…)` inline spec in the follow-up description; add parsing logic that extracts `model=` and `effort=` tokens from within `(compute: …)` when present (D7)
- C (Commands): update the FIX MODE Agent call in `claude/commands/followup.md` — pass `model: sonnet` explicitly as the default; when the inline `(compute: model=X)` spec is present, pass `model: X` instead; note that `effort=` is honored only via the implementer's frontmatter (D7)
- T (Tests/CI): `node scripts/lint.mjs` exits 0 after the `followup.md` edits (D7)
- **(human) Checkpoint:** launch `claude --plugin-dir /workspaces/git/qrspi` and read `claude/commands/followup.md` — confirm the default FIX MODE Agent call carries `model: sonnet` and the prose describes the `(compute: …)` inline spec. Confirm `node scripts/lint.mjs` exits 0.
- **Model:** sonnet — the fix is two targeted prose-and-wiring edits in a single command file; the inline-spec grammar reuses the same `key=value` pattern already established in D1; no novel logic required.
- Checkpoint: `node scripts/lint.mjs` exits 0; `followup.md` FIX MODE Agent call contains an explicit `model: sonnet` default and prose describing the `(compute: …)` override.

### Slice 5 — Migration + README + CHANGELOG

**Deliverable.** A `migrations/<version>.yaml` manifest is added with an empty
`automated: []` list and a `manual:` step instructing consumers to rewrite any
`**Model:** X — R` line in in-flight `slices.md` or `tasks.md` to
`**Compute:** model=X — R`. The `README.md` stage table and command-notes
section are updated to document the new `**Compute:**` annotation form and the
addition of Check 13. `CHANGELOG.md` gains entries under `## [Unreleased]` for
every observable change introduced in slices 1–4. After this slice `node
scripts/lint.mjs` exits 0 including Check 4 (README command coverage) and
Check 6 (migration manifest schema). No `plugin.json` version bump (the version
field in the manifest is set at release time per the no-version-bump rule).
Depends on all prior slices so it can reference final file and check names.

- T (Templates / migration): add `migrations/<version>.yaml` with `version: <TBD>`, `summary: "…"`, `automated: []`, and a `manual:` step describing the `**Model:** → **Compute:** model=X` rewrite for in-flight `slices.md`/`tasks.md` files (D8)
- D (Docs): update `README.md` — add `**Compute:**` annotation form to the relevant stage-table or command-notes section; note Check 13 (`checkComputeAnnotations`) in the checks surface (D8; CLAUDE.md "keep README current" rule)
- D (Docs): add `## [Unreleased]` entries to `CHANGELOG.md` covering: `**Compute:**` grammar, `effort:` frontmatter on all agents, Check 13, Check 2 extension, stage-command threading, FIX MODE inline spec + wiring fix, and the migration manifest (D8)
- T (Tests/CI): `node scripts/lint.mjs` exits 0 including Check 4 (README coverage) and Check 6 (migration manifest schema validation) (D8)
- **(human) Checkpoint:** run `node scripts/lint.mjs` and confirm it exits 0 with Check 4 and Check 6 both passing. Confirm `migrations/<version>.yaml` exists and its `manual:` list contains the rewrite instruction.
- **Model:** sonnet — pure documentation: adding a YAML manifest with a known schema, updating a README with established structure, and appending changelog bullets; no algorithmic or architectural reasoning required.
- Checkpoint: `node scripts/lint.mjs` exits 0 with Check 4 and Check 6 passing; `migrations/<version>.yaml` is present with `automated: []` and a non-empty `manual:` list; `CHANGELOG.md` has `[Unreleased]` entries for all observable changes from slices 1–4.
