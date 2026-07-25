# Proposal — per-slice-compute-knobs

> Stage S of QRSPI. Generated 2026-07-25.

## Why

Today's per-slice `**Model:**` annotation is fragile in three ways: it is
undocumented in two structural forms (a `-` bullet in `slices.md` vs. a bare
bold line in `tasks.md`); it is guarded only by an implementer self-halt that
is redundant with the orchestrator's spawn-time gate; and it carries no
machine-readable `effort` axis despite agent frontmatter supporting one.
Meanwhile, the seven stage agent frontmatter files carry a `model:` field but
no `effort:` field, so effort is effectively unconfigured at the stage level.
This change replaces `**Model:**` with a unified `**Compute:**` mechanism
(`model=<alias> effort=<low|medium|high>`) that is machine-readable, validated
by a new lint Check 13, threaded explicitly on every stage's Agent call, and
paired with a migration manifest for consumer repos mid-flight on the old
annotation. It also fixes a prose/wiring mismatch in `followup.md` that caused
FIX MODE to default to `opus` despite the prose saying "default sonnet".

## What Changes

- **`**Compute:**` line replaces `**Model:**`** — `model=<alias>` required,
  `effort=<low|medium|high>` optional, `— <rationale>` tail preserved; both
  structural forms kept (`-` bullet in `slices.md`, bare bold line in
  `tasks.md`).
- **No `thinking=` field** — thinking is dropped from the grammar; not
  controllable per subagent today; grammar designed to absorb it later.
- **`effort:` frontmatter added to all 7 agents** — opus stages (designer,
  implementer) get `effort: high`; sonnet stages get `effort: medium`.
- **Every stage command threads compute on its Agent call** — implement reads
  per-slice `model=` from `tasks.md`; every other stage passes its agent's
  frontmatter `model:` + carries `effort:` frontmatter; self-halt dropped.
- **New lint Check 13 `checkComputeAnnotations`** — value-validates
  `**Compute:**` lines in committed `slices.md`/`tasks.md`; Check 2 extended
  for frontmatter `effort:`.
- **FIX MODE inline `(compute: …)` spec + wiring fix** — `followup.md` gains
  an optional inline compute spec; its Agent call is fixed to pass explicit
  `model: sonnet` as default, matching the prose.
- **Migration manifest** — `migrations/<version>.yaml` with a `manual:` step
  for consumer repos holding in-flight `**Model:**` annotations.
- **README + CHANGELOG** — stage table/command notes updated; `[Unreleased]`
  entry added; no `plugin.json` version bump.

## Capabilities

### New Capabilities

- `compute-selection`: The unified `**Compute:**` annotation grammar, field
  semantics, agent frontmatter `effort:` defaults, per-stage Agent-call
  threading, FIX MODE inline spec, and prose/wiring correction in
  `followup.md` — creates `specs/compute-selection/spec.md`.

### Modified Capabilities

- `ci-quality-gates`: Gains Check 13 (`checkComputeAnnotations`, value-
  validates `**Compute:**` lines in slices.md/tasks.md) and an extension to
  Check 2 for frontmatter `effort:` validation — needs a delta spec.
- `kit-versioning`: Gains a `migrations/<version>.yaml` with a `manual:` step
  for the `**Model:** → **Compute:**` rewrite — needs a delta spec.

## Impact

- Migrations: yes — a `migrations/<version>.yaml` manifest ships with a
  `manual:` step for consumers who have in-flight `slices.md`/`tasks.md`
  files using the old `**Model:**` annotation; no automated steps (the
  transform is per-repo, per-change, textual and cannot be safely automated
  blindly). Version number set at release time per the no-version-bump rule.
- Breaking changes: yes (annotation grammar rename) — existing in-flight
  `**Model:**` annotations become unrecognized by the updated `implement.md`;
  the migration manifest provides the remediation step.
- Phases: 5 slices (see Vertical slices below).
- Affected code / APIs / dependencies:
  - `openspec-templates/tasks.template.md` — `**Model:**` → `**Compute:**`
  - `claude/agents/*.md` (all 7) — add `effort:` frontmatter
  - `claude/agents/architect.md` — `slices.md` skeleton `**Model:**` → `**Compute:**`
  - `claude/agents/planner.md` — carry-forward rule `**Model:**` → `**Compute:**`
  - `claude/skills/vertical-slice/SKILL.md` — "Per-slice model selection"
    heading + heuristic prose updated to `**Compute:**`
  - `claude/commands/implement.md` — thread per-slice `model=` from tasks.md;
    drop self-halt
  - `claude/commands/questions.md`, `research.md`, `design.md`, `structure.md`,
    `slices.md`, `plan.md`, `pr.md` — each threads frontmatter `model:` on
    Agent call; each carries `effort:` via agent frontmatter
  - `claude/commands/followup.md` — parse `(compute: …)` inline spec; wire
    explicit `model: sonnet` default on Agent call
  - `scripts/lint.mjs` — new Check 13 `checkComputeAnnotations`; Check 2
    extended for frontmatter `effort:`; header comment updated 1–13
  - `migrations/<version>.yaml` — new manifest (manual step)
  - `README.md`, `CHANGELOG.md` — documentation update

## Vertical slices (preview)

- **Slice 1 — Grammar + authoring + carry-forward (D1, D2, D3):** switch the
  architect's `slices.md` skeleton, `vertical-slice` heuristic heading,
  planner carry-forward rule, and `tasks.template.md` from `**Model:**` to
  `**Compute:**`. Demoable: a hand-written change folder shows the new line in
  both files; `node scripts/lint.mjs` green.
- **Slice 2 — Lint Check 13 + frontmatter effort (D5 partial, D6):** add
  Check 13 `checkComputeAnnotations`, extend Check 2 for `effort:`, add
  `effort:` frontmatter to all 7 agents. Demoable: a bad `effort=medium-high`
  fails Check 13; lint green otherwise.
- **Slice 3 — Thread compute on every stage's Agent call (D4, D5):** implement
  threads per-slice `model=` from tasks.md; the other 7 stage commands thread
  frontmatter `model:`; drop the self-halt; encode the effort-is-per-stage note
  in command prose. Demoable: each command spawns with the declared/frontmatter
  model.
- **Slice 4 — FIX MODE inline spec + prose/wiring fix (D7):** parse
  `(compute: …)`, wire explicit `model: sonnet` default in `followup.md`.
  Demoable: a follow-up with `(compute: model=opus)` spawns opus; without it,
  sonnet (matching prose).
- **Slice 5 — Migration + README + CHANGELOG (D8):** add
  `migrations/<version>.yaml` (manual step), update README stage table/notes
  and CHANGELOG `[Unreleased]`. Demoable: README lint (Check 4) green; manifest
  schema passes Check 6.

## Out of scope

The following are deliberate Non-Goals captured in `design.md` and tracked as
backlog ideas. They will NOT be re-offered in this change.

- **Per-slice effort via encapsulated agent variants** — picking subagents
  whose frontmatter differs per-slice; deferred (doubles this change's surface;
  warrants its own Q/R/D).
- **Any per-slice/per-stage thinking enforcement** — blocked by the Task tool
  (no per-subagent thinking knob); grammar designed to absorb `thinking=` later.
- **Content-level lint beyond value-validation** — presence-on-every-slice or
  model-matches-heuristic checks; Check 13 is value-validity only.
- **Per-stage fixed compute profiles** (rejected option PQ9c).
- **`haiku` model tier** — no per-slice heuristic for haiku yet; deferred to a
  follow-up that also extends the heuristic.
- **Extracting the annotation-parsing helper to a shared Node script** —
  deferred to `standardize-recurring-ops-scripts` (Q27); Check 13 and each
  command parse inline.
- **`decompose-tasks-md-per-slice`** re-placement of the annotation (Q26).
