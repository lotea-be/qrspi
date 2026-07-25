# Design — per-slice-compute-knobs

> Stage D of QRSPI. Generated 2026-07-25.
> **Implementation is BLOCKED until a human approves this file.**

## Context

We are making per-slice/per-stage COMPUTE declarable on one unified mechanism,
replacing today's fragile per-slice `**Model:**` markdown annotation plus the
implementer self-halt. This is the compute-axis token/cost lever, following the
merged `context-budget` change (which capped the input + output axes). It bundles
two co-designed backlog items: `simplify-per-slice-model-selection` and
`configurable-effort-and-thinking`.

**Enforceability reality (verified against the Claude Code sub-agents docs, via
claude-code-guide).** Of the three axes originally imagined, only some are
controllable at subagent-spawn time today:
- **model** — enforceable **per-slice**: the Task/Agent tool accepts a
  per-invocation `model` override (resolution order: `CLAUDE_CODE_SUBAGENT_MODEL`
  env → per-invocation `model` → agent frontmatter `model:` → session).
- **effort** — enforceable **per-agent only**, via the agent frontmatter
  `effort:` field (overrides session; values `low|medium|high|xhigh|max`). There
  is **no per-invocation effort parameter** on the Task tool, so effort cannot
  vary per slice — it is a per-stage (per-agent) knob.
- **thinking** — **not controllable per subagent at all**: subagents inherit the
  parent session's extended-thinking config (v2.1.198); there is no frontmatter
  field and no per-spawn parameter.

Per the human's stage-D scoping decision, this change therefore enforces **model
per-slice + effort per-stage (frontmatter)** and **drops thinking** from the
mechanism entirely until Claude Code exposes a per-subagent thinking knob.

Today (from research.md): the annotation is `**Model:** sonnet|opus — <rationale>`,
authored by the architect in `slices.md` (as a `-` list bullet), carried verbatim
by the planner into `tasks.md` (as a bare bold line — two syntaxes, undocumented),
and read by `implement.md` — the **only** stage command that passes a compute
param (`model:`) on its Agent-tool call. All other stage commands spawn with
`subagent_type` only and inherit the agent's frontmatter `model:`. Agent
frontmatter carries `model:` but no `effort:`. The implementer self-checks the
running model and halts on mismatch (dead code — the orchestrator already gates at
spawn). `followup.md` prose says "default sonnet" but its Agent call omits
`model:`, so the implementer's frontmatter `model: opus` actually wins (a
prose/wiring bug). `scripts/lint.mjs` has 12 checks (highest is 12, with a "2b"
interstitial); no check parses the annotation.

Desired end state: one `**Compute:**` line with grammar `model=… effort=…`
replaces `**Model:**` in both files (`model=` required and per-slice enforced;
`effort=` optional); every agent's frontmatter carries a machine-readable
`effort:` default; every stage command threads its model + effort on the Agent
call (per-slice model for implement, frontmatter values for the rest); a new lint
Check 13 parses and validates the annotation; the self-halt is gone; `followup.md`
supports an inline `(compute: …)` spec and its prose/wiring bug is fixed.

## Goals / Non-Goals

**Goals:**
- One `**Compute:**` grammar (`model=… effort=…`) replacing `**Model:**`, rendered
  consistently in `slices.md` and `tasks.md` (PQ3).
- Keep per-slice granularity for the one axis that supports it — **model** (PQ1/PQ9).
- Make **effort** a real, enforced per-stage lever via agent frontmatter (PQ6).
- Drop the implementer self-halt; orchestrator spawn-time gate is the sole gate (PQ2).
- New lint Check 13 that value-validates the annotation (PQ7).
- Inline `(compute: …)` spec in FIX MODE, and fix the followup prose/wiring
  mismatch (PQ8).
- README (stage table / command notes), CHANGELOG `[Unreleased]`, and templates
  updated in this change.

**Non-Goals (separable future changes — offer as backlog ideas):**
- **Per-slice effort via encapsulated agent variants** — effort can be made
  per-slice by *selecting* an agent whose frontmatter carries the desired effort
  (thin-shell variant agents that share one `implementer-core` skill body and
  differ only in `model:`/`effort:` frontmatter, picked per slice by the
  `**Compute:**` line, kept in sync by a lint check). Deferred: it roughly doubles
  this change's surface and warrants its own Q/R/D (variant matrix, encapsulation
  mechanism, sync check, `**Compute:** → subagent_type` mapping). Captured as a
  backlog idea.
- **Any per-slice/per-stage thinking enforcement** — blocked by the Task tool (no
  subagent thinking knob). Revisit if/when Claude Code adds per-subagent thinking;
  the `**Compute:**` grammar is designed to absorb a `thinking=` field then with
  only an orchestrator change.
- **Content-level lint** beyond value-validation (presence-on-every-slice, or
  model-matches-a-heuristic). Check 13 is value-validity only.
- **Per-stage fixed compute profiles** (rejected granularity option PQ9c).
- **A `haiku` model tier** if D2 declines it now.
- **Extracting the annotation-parsing helper into a shared Node script** — defer to
  `standardize-recurring-ops-scripts` (Q27); Check 13 and each command parse inline.
- **`decompose-tasks-md-per-slice`** re-placement of the annotation (Q26).

## Decisions

### D1 — Grammar: one `**Compute:**` line, `model=<alias> effort=<low|medium|high>`; drop `thinking`; keep the two existing structural forms

Replace `**Model:** sonnet|opus — <rationale>` with:

`**Compute:** model=<alias> effort=<low|medium|high> — <rationale>`

Space-separated `key=value` tokens; `model=` required, `effort=` optional; the
`— <rationale>` tail is preserved (load-bearing review context). No `thinking=`
field ships (dropped per the enforceability decision; grammar can absorb it later).
We **keep** the two existing structural forms (PQ3 asks us to decide the form in
each file):
- **slices.md** — a `-` list bullet in the `### Slice N` block: `- **Compute:** model=sonnet effort=low — …`
- **tasks.md** — a bare bold line under `## N.`, no `-` prefix: `**Compute:** model=sonnet effort=low — …`

Chose one line over PQ3b (three sibling lines) and PQ3c (fenced YAML). Rejected
unifying the two structural forms: the `-` vs bare distinction is dictated by each
file's shape and changing it churns both templates for no gain. Check 13 (D6)
tolerates both by matching the `**Compute:**` token, not the line prefix. (Answers PQ3.)

### D2 — Model vocabulary: keep `sonnet` / `opus`; do NOT add `haiku` in this change

The `model=` alias set stays `{sonnet, opus}` — the pair the `vertical-slice`
heuristic teaches and lint Check 2 validates for frontmatter. Adding `haiku` is a
real option (lint's `MODEL_ALIASES` already includes it) but there is no per-slice
heuristic for when a slice warrants haiku, and a third tier without guidance
invites mis-annotation. **Recommend deferring `haiku` to a follow-up** that also
extends the heuristic. OQ1 surfaces this for the human to override.

### D3 — Field semantics: `model=` required and per-slice; `effort=` optional; an omitted field means "inherit default", expressed by ABSENCE of the token

`model=` is the one **required** field (a slice must name its model, as today) and
is enforced per-slice via the per-invocation `model` param. `effort=` is optional.
If `effort=` is absent, the orchestrator passes nothing extra and the agent's
frontmatter `effort:` (D5) — or, failing that, the session default — takes effect.
We express "inherit" by **omitting the token**, not a sentinel like
`effort=default` (absence needs no reserved word and no extra validation branch).
Check 13 enforces "model present and valid; effort optional but valid-if-present."
(Answers PQ3/PQ4 defaults.)

### D4 — Enforcement mapping: model → per-invocation Agent param (per-slice); effort → agent frontmatter (per-stage); thinking → dropped

This is the decision the stage-D review corrected. Verified enforcement paths:
- **model** is threaded on the Agent call per-invocation → genuine **per-slice**
  control (implement) and per-stage control (frontmatter default for other stages).
- **effort** has **no per-invocation Agent parameter**; it is set only by the
  agent's frontmatter `effort:` field. So effort is a **per-agent / per-stage**
  knob — the same implementer agent serves every implement slice, so effort cannot
  differ slice-to-slice. A per-slice `effort=` on the `**Compute:**` line is
  honored at **stage granularity** (it documents intent and matches the
  implementer's frontmatter `effort:`); it does **not** re-configure effort between
  slices. This is stated plainly in the implement command prose so authors aren't
  misled.
- **thinking** is **not shipped** — no per-subagent thinking control exists
  (session-inherited only). The grammar omits it; it returns as a follow-up when
  the tool supports it.

(Supersedes the earlier draft's assumption that effort/thinking were threadable
per-invocation. Answers the enforceability question; drives Risk R1.)

### D5 — Frontmatter: add `effort:` (only) to all 7 agents; each stage threads its agent's model + effort on the Agent call, except implement which reads per-slice model from tasks.md

Add one frontmatter key to every `claude/agents/*.md`: `effort: low|medium|high`.
(No `budget:`/thinking field — thinking is dropped, D4.) Where values come from
(PQ6):
- **implement** reads `model=` from the next un-ticked slice's `**Compute:**` line
  in `tasks.md` and passes it per-invocation (per-slice model); effort comes from
  the implementer agent's frontmatter `effort:` (per-stage).
- **Every other stage** (questions, research, design, structure, slices, plan, pr)
  reads its agent's frontmatter `model:` + `effort:` and passes `model:`
  explicitly on the Agent call; `effort:` is enforced by the frontmatter itself.
  This makes the frontmatter default *actively used*, where today only implement
  threads anything.

Suggested defaults mirror the current `model:` posture: opus stages (designer,
implementer) `effort: high`; sonnet stages `effort: medium`. PQ4's `low/medium/high`
is a deliberate valid **subset** of the tool's `low|medium|high|xhigh|max`; Check 13
/ Check 2 reject `xhigh`/`max` to keep the kit surface small (widening is a one-line
change). Lint Check 2 is extended to validate the new `effort:` frontmatter value,
mirroring its existing `model:` alias check. (Answers PQ6; OQ3 confirms the defaults.)

### D6 — Lint Check 13: parse the `**Compute:**` annotation in committed slices.md/tasks.md and flag unknown/invalid values; extend Check 2 for frontmatter `effort:`

Add `checkComputeAnnotations` as **Check 13** (highest existing is 12; follow the
existing add-a-check pattern: `async function check…(errors)`, register in `main()`
after Check 12, update the header comment block 1–13, declare fixed sets as adjacent
`const`s). It parses every `**Compute:**` line in `openspec/changes/**/slices.md`
and `**/tasks.md` and flags:
- `model=` not in `{sonnet, opus}` (or `{sonnet, opus, haiku}` if OQ1 adds haiku)
- `effort=` present but not in `{low, medium, high}`
- missing/empty `model=` token (model required — D3)

With the self-halt gone (PQ2), **Check 13 is the only static gate** catching a
malformed annotation before implement hits it at runtime — so it must tolerate both
the `-` bullet and bare-line forms (D1). It is **value-validation only**, not
presence-across-all-slices (a Non-Goal). Frontmatter `effort:` validation lives in
**Check 2** (it already owns frontmatter alias checks), keeping Check 13 scoped to
the committed-artifact annotation so each check has one concern. (Answers PQ7.)

### D7 — FIX MODE inline spec: `(compute: model=… effort=…)` in the follow-up description, same grammar as D1; and fix the followup prose/wiring mismatch

`followup.md` gains an optional inline compute spec parsed from the follow-up
description, e.g. `(compute: model=opus effort=high)`, reusing D1's `key=value`
grammar inside `(compute: …)` (no `thinking`). When present, the orchestrator
threads `model:` per-invocation; effort is honored via the implementer frontmatter
(same per-stage constraint as D4). When absent, the FIX MODE default applies.

Separately, fix the research-flagged bug (research Implicit-contract #5): prose says
"default sonnet" but the Agent call omits `model:`, so frontmatter `model: opus`
wins. **Resolution:** make the FIX MODE default *explicit and wired* — the
orchestrator passes `model: sonnet` on the Agent call unless the inline
`(compute: …)` spec or an "opus when…" prose condition overrides it. Prose and
wiring now agree. (Answers PQ8.)

### D8 — Migration: replacing `**Model:**` with `**Compute:**` needs a `migrations/<version>.yaml` entry for consumer repos with in-flight changes

A consumer repo mid-flight may hold a `slices.md`/`tasks.md` with the old
`**Model:** sonnet|opus — …` line; after the kit updates, `implement.md` looks for
`**Compute:**` and finds none. This is a real migration hazard, so this change
**must ship a `migrations/<next-version>.yaml` manifest**. Because the rewrite is a
per-repo, per-change textual transform the kit cannot safely automate blind, the
manifest carries a **`manual:` step** instructing the user to rewrite any
`**Model:** X — R` line in in-flight `slices.md`/`tasks.md` to
`**Compute:** model=X — R` (effort omitted → inherit). `automated: []` (no safe
edit-file action for arbitrary change folders). The version number is set at release
time, not now (per the no-version-bump-in-feature-work rule). (Answers the migration
question.)

## Data model changes

All "data" is markdown + one `.mjs`. Changed durable structures:
- **Annotation line** in `slices.md` (`- **Compute:** model=… effort=…`) and
  `tasks.md` (`**Compute:** …`) — replaces `**Model:**`.
- **Agent frontmatter** (`claude/agents/*.md`): add `effort:` key to all 7.
- **`scripts/lint.mjs`**: new Check 13 `checkComputeAnnotations`; Check 2 extended
  for `effort:` frontmatter; header comment updated 1–13.
- **`openspec-templates/tasks.template.md`** + the architect's `slices.md`
  skeleton + the planner's carry-forward rule + the `vertical-slice` skill's
  "Per-slice model selection" heading: all switch `**Model:**` → `**Compute:**`.
- **`migrations/<version>.yaml`**: new manifest (manual step).

## API surface

The "surface" is command/agent behaviour + lint:
- **Every stage command** (`questions/research/design/structure/slices/plan/pr`)
  now threads `model:` from its agent frontmatter on the Agent call, and carries an
  `effort:` frontmatter default; **implement** threads `model:` per-slice from
  `tasks.md`.
- **`followup.md`** parses optional inline `(compute: …)` and wires an explicit
  default model.
- **Check 13** (`checkComputeAnnotations`) — value-validates `**Compute:**` over
  committed slices.md/tasks.md; exits non-zero on unknown model/effort.

## UI / Authorization

None (no UI or auth surface in this repo — see qrspi-stack "no present surfaces").

## Vertical slices (preview)

Each slice ends in `node scripts/lint.mjs` green and is demoable:
- **Slice 1 — Grammar + authoring + carry-forward (D1, D2, D3):** switch the
  architect's slices.md skeleton, `vertical-slice` heuristic heading, planner
  carry-forward rule, and `tasks.template.md` from `**Model:**` to `**Compute:**`.
  Demoable: a hand-written change folder shows the new line in both files.
- **Slice 2 — Lint Check 13 + frontmatter (D5 partial, D6):** add Check 13, extend
  Check 2 for `effort:`, add `effort:` frontmatter to all 7 agents. Demoable: a bad
  `effort=medium-high` fails Check 13; lint green otherwise.
- **Slice 3 — Thread compute on every stage's Agent call (D4, D5):** implement
  threads per-slice model; the other 7 stage commands thread frontmatter model +
  carry effort frontmatter; drop the self-halt; encode the effort-is-per-stage note
  in command prose. Demoable: each command spawns with the declared/frontmatter model.
- **Slice 4 — FIX MODE inline spec + prose/wiring fix (D7):** parse
  `(compute: …)`, wire explicit default model in followup. Demoable: a follow-up
  with `(compute: model=opus)` spawns opus; without it, sonnet (matching prose).
- **Slice 5 — Migration + README + CHANGELOG (D8):** add
  `migrations/<version>.yaml` (manual step), update README stage table/notes and
  CHANGELOG `[Unreleased]`. Demoable: README lint (Check 4) green; manifest schema
  passes Check 6.

## Risks / Trade-offs

- **R1 — Only `model` is per-slice-enforceable; `effort` is per-stage; `thinking`
  is dropped (D4).** Verified against the Claude Code sub-agents docs: the Task tool
  exposes only a per-invocation `model` override; effort is a static per-agent
  frontmatter field; there is no per-subagent thinking control. So "per-slice
  compute" delivers per-slice **model** + per-stage **effort** — not the
  three-axis-per-slice knob PQ3–PQ5 originally imagined. Mitigated by shipping the
  enforceable axes honestly, labelling effort as per-stage in the prose, and keeping
  the grammar ready to absorb `thinking=` if the tool gains the knob.
- **R2 — Lint is now the ONLY static gate (self-halt dropped).** A slices.md/tasks.md
  that never passes lint could reach implement in an unlinted workflow. Mitigated by
  Check 13's robustness and by implement still hard-stopping on a missing/unparseable
  `**Compute:**` at runtime (the orchestrator gate).
- **R3 — Threading model onto seven previously-bare stage commands is broad surface.**
  Each command's Agent call changes shape; a missed one silently reverts a stage to
  session/frontmatter defaults. Mitigated by keeping frontmatter as the single source
  and by Check 2's frontmatter validation; a lint check asserting each command threads
  compute is a possible follow-up (not in scope).
- **R4 — Two structural forms (D1) mean Check 13 and every parser must tolerate both.**
  Mitigated by matching the `**Compute:**` token rather than the line prefix;
  documented in the templates so the distinction is no longer implicit.

## Open questions for the human

- [x] **OQ1 — Add `haiku` now?** **RESOLVED:** defer `haiku` to a follow-up that
  also extends the heuristic. Model vocab stays `{sonnet, opus}` (D2).
- [x] **OQ2 — Thinking enforceability.** **RESOLVED at the stage-D review:** the human
  chose "model per-slice + effort per-stage; **drop thinking**." Thinking is removed
  from the grammar and mechanism until Claude Code exposes a per-subagent knob.
- [x] **OQ3 — Frontmatter effort defaults (D5).** **RESOLVED:** opus stages
  (designer, implementer) `effort: high`; sonnet stages (questioner, researcher,
  planner, reviewer, architect) `effort: medium`. Effort stays a per-stage knob;
  per-slice effort via encapsulated agent variants is deferred to a follow-up
  (see Non-Goals).
