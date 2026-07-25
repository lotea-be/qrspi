# Tasks — per-slice-compute-knobs

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Grammar + authoring + carry-forward

**Model:** sonnet — mechanical text substitution across four files; no novel reasoning; every change is a targeted find-and-replace of a known string.

- [x] 1.1 Rewrite the `slices.md` skeleton in `claude/agents/architect.md` — replace `**Model:** sonnet|opus — <rationale>` with `**Compute:** model=<alias> effort=<low|medium|high> — <rationale>` (D1, D2, D3)
- [x] 1.2 Update the "Per-slice model selection" heading and all example lines in `claude/skills/vertical-slice/SKILL.md` to use `**Compute:**`; add a note documenting both structural forms (dash-bullet in `slices.md`, bare bold in `tasks.md`) (D1, D2, D3)
- [x] 1.3 Update the carry-forward rule in `claude/agents/planner.md` (or `claude/commands/plan.md`) so it names `**Compute:**` rather than `**Model:**` and preserves it verbatim into `tasks.md` (D1, D3)
- [x] 1.4 Rewrite `openspec-templates/tasks.template.md` — replace the `**Model:**` placeholder line with `**Compute:** model=<alias> effort=<low|medium|high> — <rationale>` in the bare bold form (D1, D3)
- [x] 1.5 Run `node scripts/lint.mjs` (green)
- [ ] 1.6 (human) In a `claude --plugin-dir /workspaces/git/qrspi` session, open `claude/agents/architect.md`, `claude/skills/vertical-slice/SKILL.md`, and `openspec-templates/tasks.template.md` — confirm every occurrence of `**Model:**` is gone and `**Compute:**` appears in the correct position with the `model=` and `effort=` token names.

## 2. Lint Check 13 + frontmatter effort

**Model:** opus — Check 13 requires writing a regex/token parser that handles two structural forms and three error cases; Check 2 extension adds a new required-field rule; the seven frontmatter edits are mechanical but must be consistent with D5's defaults.

- [x] 2.1 Add `COMPUTE_MODELS = ['sonnet', 'opus']` and `COMPUTE_EFFORTS = ['low', 'medium', 'high']` as adjacent consts in `scripts/lint.mjs` (D6)
- [x] 2.2 Add `checkComputeAnnotations` async function and register it as Check 13 in `main()` after Check 12 in `scripts/lint.mjs`; update the header comment to 1–13 (D6)
- [x] 2.3 Implement `checkComputeAnnotations` to glob `openspec/changes/**/slices.md` and `**/tasks.md`, find every `**Compute:**` line (tolerating both `-` bullet and bare bold forms), and flag: missing/empty `model=`; `model=` not in `COMPUTE_MODELS`; `effort=` present but not in `COMPUTE_EFFORTS` (D1, D6)
- [x] 2.4 Extend Check 2 to require an `effort:` frontmatter key on every agent file and validate its value against `{low, medium, high}` — rejecting `xhigh` and `max` (D5, D6)
- [x] 2.5 Add `effort: high` to the frontmatter of `claude/agents/designer.md` and `claude/agents/implementer.md` (D5)
- [x] 2.6 Add `effort: medium` to the frontmatter of `claude/agents/questioner.md`, `researcher.md`, `architect.md`, `planner.md`, and `reviewer.md` (D5)
- [x] 2.7 Run `node scripts/lint.mjs` (green)
- [ ] 2.8 (human) Run `node scripts/lint.mjs` and confirm it exits 0 and reports "Check 13: …" in the output. Then temporarily write `**Compute:** model=haiku — test` into a scratch `openspec/changes/test-lint/slices.md` and re-run — confirm Check 13 exits non-zero naming the file. Remove the scratch file before continuing.

## 3. Thread compute on every stage's Agent call

**Model:** opus — threading model across eight command files (seven non-implement + implement) requires reasoning about each file's Agent-call structure and ensuring the annotation-parsing logic in `implement.md` is correct; the self-halt removal needs careful verification that no other gate is accidentally dropped.

- [x] 3.1 Update `claude/commands/questions.md`, `research.md`, `design.md`, `structure.md`, `slices.md`, `plan.md`, and `pr.md` — each Agent call targeting a QRSPI stage subagent gains an explicit `model:` parameter sourced from that agent's frontmatter `model:` value (D4, D5)
- [x] 3.2 Update `claude/commands/implement.md` — parse the `model=` token from the next un-ticked `**Compute:**` line in `tasks.md` and pass it as the per-invocation `model` parameter on the Agent call (D4, D5)
- [x] 3.3 Remove the self-halt instruction from `claude/agents/implementer.md`; the orchestrator spawn-time `model:` parameter is the sole gate (D4, D5)
- [x] 3.4 Add a prose note in `claude/commands/implement.md` that `effort=` documents per-stage intent and is honored via the implementer agent's frontmatter `effort:`, not a per-invocation parameter (D4)
- [x] 3.5 Run `node scripts/lint.mjs` (green)
- [ ] 3.6 (human) In a `claude --plugin-dir /workspaces/git/qrspi` session, inspect the source of each stage command file — confirm the Agent call in each contains an explicit `model:` parameter and that `claude/agents/implementer.md` no longer contains the self-halt text.

## 4. FIX MODE inline spec + prose/wiring fix

**Model:** sonnet — the fix is two targeted prose-and-wiring edits in a single command file; the inline-spec grammar reuses the same `key=value` pattern already established in D1; no novel logic required.

- [ ] 4.1 Update `claude/commands/followup.md` — add prose describing the optional `(compute: model=… effort=…)` inline spec in the follow-up description; add parsing logic that extracts `model=` and `effort=` tokens from within `(compute: …)` when present (D7)
- [ ] 4.2 Update the FIX MODE Agent call in `claude/commands/followup.md` — pass `model: sonnet` explicitly as the default; when the inline `(compute: model=X)` spec is present, pass `model: X` instead; note that `effort=` is honored only via the implementer's frontmatter (D7)
- [ ] 4.3 Run `node scripts/lint.mjs` (green)
- [ ] 4.4 (human) In a `claude --plugin-dir /workspaces/git/qrspi` session, read `claude/commands/followup.md` — confirm the default FIX MODE Agent call carries `model: sonnet` and the prose describes the `(compute: …)` inline spec override.

## 5. Migration + README + CHANGELOG

**Model:** sonnet — pure documentation: adding a YAML manifest with a known schema, updating a README with established structure, and appending changelog bullets; no algorithmic or architectural reasoning required.

- [ ] 5.1 Add `migrations/<version>.yaml` with `version: <TBD>`, `summary: "…"`, `automated: []`, and a `manual:` step describing the `**Model:** → **Compute:** model=X` rewrite for in-flight `slices.md`/`tasks.md` files (D8)
- [ ] 5.2 Update `README.md` — add `**Compute:**` annotation form to the relevant stage-table or command-notes section; note Check 13 (`checkComputeAnnotations`) in the checks surface (D8)
- [ ] 5.3 Add `## [Unreleased]` entries to `CHANGELOG.md` covering: `**Compute:**` grammar, `effort:` frontmatter on all agents, Check 13, Check 2 extension, stage-command threading, FIX MODE inline spec + wiring fix, and the migration manifest (D8)
- [ ] 5.4 Run `node scripts/lint.mjs` (green — including Check 4 README coverage and Check 6 migration manifest schema)
- [ ] 5.5 (human) Run `node scripts/lint.mjs` and confirm it exits 0 with Check 4 and Check 6 both passing. Confirm `migrations/<version>.yaml` exists and its `manual:` list contains the `**Model:** → **Compute:**` rewrite instruction.
