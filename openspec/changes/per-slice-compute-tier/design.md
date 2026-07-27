# Design — per-slice-compute-tier

> Stage D of QRSPI. Generated 2026-07-27.
> **Implementation is BLOCKED until a human approves this file.**

## Context

`per-slice-compute-knobs` (merged 2026-07-25) made per-slice **model** selection
enforceable at spawn time — `/qrspi:implement` parses the next un-ticked slice's
`**Compute:** model=<alias>` token and spawns the implementer with
`model: <alias>` (implement.md line 34). It did **not** deliver per-slice
**effort**: the Agent/Task tool has no per-invocation `effort` parameter, so
effort is honored only through the implementer agent's static frontmatter
`effort: high` — a per-*stage*, not per-*slice*, knob (implement.md lines 36-42,
stated identically in `vertical-slice` and the tasks template).

This change bundles the two deferred compute follow-ons:

1. **True per-slice effort** — recover it by selecting an implementer agent
   variant per slice, since each variant can carry a different static `effort:`.
2. **Haiku tier** — promote `haiku` from a frontmatter-only alias
   (`MODEL_ALIASES`, lint line 333) to a first-class `**Compute:** model=`
   value (`COMPUTE_MODELS`, lint line 343) with a runnable path and a
   `vertical-slice` "when is a slice trivial-mechanical enough for haiku"
   heuristic.

**Desired end state:** an author writes `effort=<level>` (required) and optionally
`model=<alias>` (default sonnet) on any slice; `/qrspi:implement` resolves it to a
spawn that runs the implementer on the right model *and* the right effort; all nine
`model × effort` combinations remain reachable; the implementer body lives once in
a shared `implementer-core` skill that each thin variant loads; and a new lint
check prevents the variant fleet from drifting.

## Goals / Non-Goals

**Goals:**
- Per-slice **effort** enforced at spawn time via 3 effort-variant agents
  (low/medium/high), with **model** passed per-spawn as today — reaching all 9
  `model × effort` combinations (PQ8/PQ1).
- `haiku` a first-class, runnable `**Compute:** model=` value + Check 13 update
  + a `vertical-slice` heuristic (PQ3, full peer).
- Orthogonal `**Compute:**` grammar: `effort=` (required, selects the variant) +
  `model=` (optional, defaults sonnet). All 9 cells reachable, no model/effort
  coupling (human-revised at D review — profiles dropped).
- Shared `implementer-core` skill; thin variant shells (PQ4). No generator
  script, no inline duplication.
- Breaking changes acceptable (kit in development); consumer repos migrated via a
  `migrations/<version>.yaml` entry on `/qrspi:update` (revised — overturns PQ7).
- A variant-drift sync check (PQ5) that keeps the fleet honest without
  hand-maintenance.

**Non-Goals (candidate `idea` backlog rows — offered to the human, not
auto-appended):**
- **`decompose-tasks-md-per-slice`** (P2 backlog) — out of scope; this bundle
  does not change tasks.md structure (Q30).
- **`compute-annotation-presence-lint`** (P3 backlog) — Check 13 stays
  value-validation-only; we do not add "every slice must carry a `**Compute:**`
  line" here (Q31).
- **Variant agents for stages other than Implement** — only the implementer is
  spawned per-slice; no researcher/architect variants.
- **`xhigh`/`max` effort or thinking control** — the kit's effort subset stays
  `{low, medium, high}`; thinking is not shipped (implement.md line 42).

## Decisions

### D1 — Mechanism: 3 effort-variant agents, model passed per-spawn (PQ8/PQ2/PQ5 crux)

**Chosen:** three static variant agents — one per effort level — sharing a body
via the `implementer-core` skill. `/qrspi:implement` continues to pass
`model: <alias>` on the Agent spawn (the existing knob), and additionally
selects **which variant agent** to spawn (`subagent_type`) from the slice's
resolved effort. 3 agents × per-spawn model = all 9 combinations. This confirms
the working hypothesis and is grounded in research: `model:` **is** an existing,
shipped per-invocation override (implement.md line 34, in production since
`per-slice-compute-knobs`); `effort:` **is not** a per-invocation parameter
(implement.md lines 36-42) and can only be varied by varying the static
frontmatter — hence one agent per effort level.

**Rejected:**
- *Full 9-file cross-product* (`implementer-sonnet-low.md`, …) — redundant:
  model is already per-spawn overridable, so a `-sonnet-` vs `-opus-` file pair
  at the same effort would be byte-identical except for a frontmatter `model:`
  the orchestrator overrides anyway. 9 files where 3 suffice; larger sync
  surface.
- *`subagent=<stem>` token naming the agent directly* — leaks the internal file
  layout into author-facing annotations. Rejected in favour of the orthogonal
  `effort=`/`model=` grammar (D3).

**Open dependency (resolved, OQ1):** D1 assumes the spawn-time `model:` override
**wins over** each variant's frontmatter `model:`. The kit's own code cannot prove
this (it is Claude tool-API behaviour), but the **Agent tool contract states the
per-call `model:` takes precedence over the agent's frontmatter `model:`** — so the
assumption is well-supported. Kept as a stage-I confirm-in-passing (D2's neutral
`sonnet` frontmatter caps the blast radius; 9-file cross-product is the documented
fallback). D1 stands as the chosen mechanism.

### D2 — Variant naming + frontmatter (Q4, Q8)

**Chosen filenames — effort-suffixed:** `implementer-low.md`,
`implementer-medium.md`, `implementer-high.md`. Effort-only names (not
`-sonnet-medium`) because model is not baked into the file (D1). This reads
cleanly and the stem encodes exactly the one dimension the file actually fixes.

**Frontmatter each variant minimally carries** (Check 2, lint line 364):
`name:` (the stem), `description:`, `tools:` (repeated — `checkFrontmatter`
reads each file's own frontmatter; there is no inheritance from the skill,
research §skill-structure), `model:`, `effort:` (matching the stem).

- `effort:` — `low` / `medium` / `high` respectively (the load-bearing field).
- `model:` — set to `sonnet` on every variant as a **neutral default**. Rationale:
  the orchestrator always resolves a concrete `model:` on spawn (explicit
  `model=`, or `sonnet` when omitted — D4), so the frontmatter `model:` is only a
  fallback. `sonnet` is the kit's "when in doubt" default
  (`vertical-slice` line 145) and is a safe, cheap fallback if the override ever
  fails to bind (OQ1). The base `implementer.md` keeps `model: opus` for
  backward compatibility (it remains the standalone/trivial-change agent).

**Base `implementer.md` stays.** It is referenced by name elsewhere (the
`SKILL_SET_EXPECTED['implementer']` entry, Check 7/12 banners) and is the
identity `/qrspi:implement` documents. The three variants are added alongside it;
`implementer.md` also loads `implementer-core` so its body does not fork.

### D3 — Annotation vocabulary: orthogonal `effort=` + `model=` (human-revised at D review — PQ1/PQ2)

**Chosen (human-revised):** drop the `profile=` concept entirely — it coupled
model to effort, which is presumptuous (a low-effort slice need not be haiku). The
`**Compute:**` grammar is two **orthogonal** tokens:

- `effort=<low|medium|high>` — **required**; selects the variant agent (the one
  dimension that must be static, D1).
- `model=<haiku|sonnet|opus>` — **optional**; passed per-spawn, **defaults to
  `sonnet`** when omitted.

All 9 `model × effort` combinations are reachable directly, chosen independently.
Examples: `**Compute:** effort=low model=haiku`; `**Compute:** effort=medium`
(model defaults to sonnet).

**Backward-compat (revised — overturns PQ7):** breaking changes are acceptable
(the kit is in development); consumer repos are migrated via a
`migrations/<version>.yaml` entry on `/qrspi:update` (D7). The old grammar
required `model=` and treated `effort=` as optional; the new grammar swaps that
(effort required, model optional). Existing in-repo annotations already carry both
tokens, so no in-repo breakage.

**Rejected:** *profile= as an effort alias* (a redundant second effort
vocabulary). *Profiles that bundle model+effort* (the original D3 — the coupling
the human rejected).

### D4 — `implement.md` resolution: parse effort (required) + model (optional) → pick variant + model (Q1, Q3)

The single spawn site in `implement.md` (line 27-47) and its auto-mode twin
(lines 92-101) change from "parse `model=` (required), spawn with `model:`" to:

1. Read the slice's `**Compute:**` line.
2. Parse the two orthogonal tokens (D3): `effort=` is **required** — if absent,
   hard-stop (replacing the old missing-`model=` guard, line 44); `model=` is
   **optional**, defaulting to `sonnet` when omitted.
3. Map `effort` → `subagent_type` (`low`→`implementer-low`, etc.).
4. Spawn that variant via the Agent tool with `model: <model or sonnet>`.

Two edit sites (main spawn + auto-mode loop), mirroring today's structure. The
required/optional swap (effort now required, model optional) is a breaking grammar
change carried by the migration (D3/D7).

### D5 — Encapsulation: `implementer-core` skill; thin variant shells (PQ4, Q9, Q11)

Create `claude/skills/implementer-core/SKILL.md` (frontmatter `name:` +
`description:`, required by Check 2, lint line 434). It holds the reusable body:
precondition, cross-change read boundary, "What to do", coding rules,
"when you get stuck", ASCII rule, "what you must NOT do", divergence self-check,
fix mode, and the per-slice final-message format.

Each variant agent body is a thin shell that (a) carries the "Load skill
`implementer-core`" line and (b) keeps the sections that **cannot** move because
lint asserts them on the agent file itself:

- The `> **Read contract**` and `> **Output contract**` banners **stay on the
  base `implementer.md`** (Check 7 / Check 12 scope the seven-agent set by stem,
  lint lines 1154, 1571) — variants are **not** in those maps, so they carry no
  banner (Q6, Q7). This is intended: variants are effort-shells reached only via
  the base implementer's contract.
- Check 2b (`checkSkillSets`) harvests the **step-1 numbered "Load skills"** line
  (lint line 1103). Each variant's body therefore uses a numbered
  `1. Load skill \`implementer-core\`` line so the harvest sees it. See D6 for
  the registry consequence.

### D6 — Sync check (new Check 15) + skill-set registry (PQ5, Q5, Q16, Q17, Q18)

`SKILL_SET_EXPECTED` (skill-sets.mjs) is keyed by the **seven** stage-agent
stems. The three variants are **not** stage agents in the Check-2b sense; adding
them there would force Check 7/12/read-contract parity they should not carry.
Instead, add a dedicated **Check 15 — `checkVariantAgents`**, registered in
`main()` after Check 14 (line 2029). It asserts the minimal drift invariants:

- **(a) Coverage:** the set of `claude/agents/implementer-*.md` stems exactly
  equals a registry constant `IMPLEMENTER_VARIANTS = ['implementer-low',
  'implementer-medium', 'implementer-high']` — no missing, no stray variant.
- **(b) Core load:** each variant's step-1 "Load skills" line loads **only**
  `implementer-core` (OQ2) — the allowed-set is exactly `{implementer-core}`;
  `context-hygiene`/`vertical-slice`/`workflow` live solely in the core skill
  (reuses the Check-2b harvest logic, lint line 1097).
- **(c) Content-matches-name:** each variant's frontmatter `effort:` matches its
  stem's suffix (`implementer-low` → `effort: low`).

`checkSkillRefs` (Check 2, lint line 456) already fails loudly if any body
references `implementer-core` before its directory exists (Q13) — so a dangling
ref is caught even without Check 15. Check 15 adds the *coverage* + *name-match*
guards Check 2 does not give. Per the Check-14 precedent (research §Check 14), it
carries an inline self-test fixture that must fire.

**`implementer-core` and the seven-agent skill-set registry:** the base
`implementer.md` will now load `implementer-core`, so
`SKILL_SET_EXPECTED['implementer']` grows from
`['context-hygiene', 'vertical-slice', 'workflow']` to include
`implementer-core` — the one registry edit Check 2b requires (Q16). The variants
delegate `context-hygiene`/`vertical-slice`/`workflow` entirely to
`implementer-core` (OQ2 — load only the core), so they carry no other kit skill.

### D7 — Check 13 + docs: add haiku to the annotation vocabulary (PQ3, Q14, Q20, Q22)

- **Lint (one line):** `COMPUTE_MODELS` (lint line 343) becomes
  `['sonnet', 'opus', 'haiku']`. This is the only Check-13 edit — Check 13 reads
  `COMPUTE_MODELS`, not `MODEL_ALIASES` (research line 73). Update the adjacent
  comment (it currently says "deliberately {sonnet, opus} until a haiku
  heuristic exists" — that heuristic now exists, D8).
- **`vertical-slice` skill** — add the haiku heuristic (D8) and add `haiku` to
  the documented `model=` values (skill lines 100, 121). Editing this skill does
  not trip any lint check (Q22; Check 13 excludes `claude/skills/**`, research
  line 91).
- **tasks / slices templates** — update the grammar comment to the new orthogonal
  form (`effort=<level>` required, `model=<alias>` optional/default sonnet; no
  `profile=`). Placeholder text only; Check 13 never scans `openspec-templates/**`
  (research line 91), so no functional lint impact.
- **Migration manifest** — add a `migrations/<version>.yaml` entry (Q23)
  documenting the breaking grammar swap (effort now required, model optional) so
  `/qrspi:update` migrates consumer annotations that predate it.

### D8 — Haiku heuristic placement + wording (PQ6)

**Placement:** extend the existing `### Choosing model=sonnet vs model=opus`
section in `vertical-slice/SKILL.md` (lines 119-148) — retitle it
`### Choosing model=haiku vs sonnet vs opus` and add a `model=haiku` band
**below** the sonnet band, since haiku is "even more mechanical than sonnet". Keep
one section (not a standalone one) so the "when in doubt, prefer sonnet" tie-break
stays the single closing rule.

**Wording — choose `model=haiku` when the slice is purely mechanical, no
reasoning, output fully determined by a rule:**
- Adding one YAML frontmatter field to every agent file with the same value.
- Bumping a version string across N files (README + plugin.json + marker).
- Adding one value to a lint constant array (e.g. a new alias in
  `COMPUTE_MODELS`) with no logic change.
- Search-and-replace renames with no call-site judgment.

Tie-break addendum: "When in doubt between haiku and sonnet, prefer `sonnet` —
haiku is only for slices where a competent script could do it."

## Vertical slices (preview)

Each slice ends in something demoable end-to-end (an author writes an annotation
and `/qrspi:implement` runs the right agent; `node scripts/lint.mjs` passes).

- **Slice 1 — Haiku tier, end to end (thin, mechanical).** Add `haiku` to
  `COMPUTE_MODELS` (D7) + the `vertical-slice` heuristic (D8). Demo: a slice with
  `model=haiku` passes Check 13 and the heuristic reads correctly. Self-hosting:
  this slice is itself a `model=haiku` candidate.
- **Slice 2 — `implementer-core` skill + base implementer loads it.** Extract the
  body to the skill (D5); `implementer.md` becomes a thin loader; update
  `SKILL_SET_EXPECTED['implementer']` (D6). Demo: `/qrspi:implement` still runs
  the base implementer unchanged; lint green.
- **Slice 3 — 3 effort-variant agents + Check 15.** Add `implementer-low/medium/
  high.md` (D2), each loading the core; add `checkVariantAgents` with self-test
  (D6). Demo: lint green with the new check; variants present and name-matched.
- **Slice 4 — Resolution + grammar, end to end.** Update `implement.md`
  resolution (D4) + the `effort=`/`model=` grammar (D3) + the migration entry
  (D7). Demo: a slice annotated `effort=low model=haiku` (or `effort=high`, model
  defaulting to sonnet) spawns the correct variant on the correct model.

## Risks / Trade-offs

- **Spawn-override precedence (OQ1) is the load-bearing unknown.** If the
  spawn-time `model:` does *not* override a variant's frontmatter `model:`, D1's
  "3 agents reach 9 combos" collapses toward the 9-file cross-product. D2's
  neutral-`sonnet` frontmatter caps the blast radius (a mis-bind runs sonnet, not
  a wrong-tier surprise), and this is already the mechanism `per-slice-compute-knobs`
  relies on — but it must be observed live at stage I before Slice 4 is trusted.
- **Breaking grammar change (D3/D4)** — effort becomes required and model
  optional (was the reverse). Existing in-repo annotations carry both tokens, so
  no in-repo breakage; a `migrations/<version>.yaml` entry (D7, Q23) migrates
  consumers with `model=`-only lines. Acceptable because the kit is in development.
- **Banner asymmetry (D5)** — variants carry no read/output-contract banner.
  Correct by design (they are not stage agents), but a reviewer scanning agent
  files may expect one; the Check-15 self-test and this note are the guardrail.
- **`model=` default (D3)** — an omitted `model=` silently runs sonnet. Chosen as
  the safe, cheap default; the D8 heuristic still guides explicit choices.

## Open questions for the human

- [x] **OQ1 — spawn `model:` override precedence.** D1 assumes the per-spawn
  `model:` on the Agent tool overrides a variant agent's frontmatter `model:`.
  Research could not confirm this from code (it is Claude tool-API behaviour, not
  in the kit's files). D2 is chosen to be safe either way (neutral `sonnet`
  fallback). **Approve treating this as a stage-I watch-item** (observe a
  `model=opus`-annotated slice actually running on opus with a variant agent
  whose frontmatter says `sonnet`), with the 9-file cross-product as the
  documented fallback if it fails — rather than an approved default? Or verify it
  before Slice 4?

  **Answer: Keep D1 (3 effort-agents + per-spawn model override); stage-I
  watch-item.** The human confirmed the override is the minimal-file mechanism
  given effort is static-only, and that the off-diagonal `model×effort` cells the
  fully-declarative alternatives would preserve are largely incoherent. Added
  evidence the researcher lacked: the Agent tool's own contract states the
  per-call `model:` **takes precedence over** the agent's frontmatter `model:` —
  so this is a stage-I confirm-in-passing (observe a `model=opus` slice run on
  opus via a `sonnet`-frontmatter variant), with the 9-file cross-product as the
  documented fallback. Fully-declarative variants (drop the override) were
  considered and rejected: they cost 6 extra files or the incoherent off-diagonal
  combos without simplifying the effort side (which forces 3 static agents
  regardless).
- [x] **OQ2 — variant skill-set: delegate or repeat the base skills?** Should each
  variant's step-1 line load only `implementer-core` (letting the core skill be
  the sole home of `context-hygiene`/`vertical-slice`/`workflow`), or repeat the
  base three alongside `implementer-core`? This decides Check 15's allowed-set
  (D6b) and whether the variants appear leaner or parallel to the base
  implementer. Recommendation: **load only `implementer-core`** on the variants
  (thin shells), with the core skill's prose pointing at the base skills — but the
  Check-15 allowed-set wording needs your pick.

  **Answer: Load only `implementer-core`** on the variants (thin shells). Check
  15's allowed-set (D6b) is exactly `{implementer-core}`; the core skill is the
  sole home of `context-hygiene`/`vertical-slice`/`workflow`, its prose pointing
  at them.
