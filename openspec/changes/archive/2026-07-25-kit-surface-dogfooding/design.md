# Design — kit-surface-dogfooding

> Stage D of QRSPI. Generated 2026-07-25.
> **Implementation is BLOCKED until a human approves this file.**

## Context

The `repo-surface` skill lets each repo declare which *surfaces* it exposes (via
a `## Repo surface` block in its stack cheatsheet) so QRSPI artifacts emit only
the relevant surface-gated sections. Today the taxonomy is five web-app surfaces
(`data-store`, `http-api`, `ui`, `auth`, `typed-nullable`) — none of which the
kit itself exposes. So the kit's own `## Repo surface` block reads
`_No present surfaces._`, and every kit QRSPI artifact falls to the
always-emitted minimum (Context, Decisions, Testing, …). The kit's *real*
change-shapes — a command edit, an agent read-contract change, a skill rewrite, a
template edit, a lint gate, a release migration — are invisible to the surface
filter, so the kit never dogfoods `repo-surface`.

This change bundles two co-designed backlog ideas that both extend the merged
`repo-applicable-artifact-sections` work:

1. **kit-self-surfaces** — add all six kit surfaces (`slash-command`,
   `stage-agent`, `skill`, `template`, `lint-gate`, `migration-manifest`) to the
   taxonomy *with* the section(s) each gates, add the mapping rows, the gated
   sections in the relevant agent skeleton(s)/template(s), the Check 11 denylist
   entries, and rewrite the kit's own `## Repo surface` block to list its present
   surfaces — so the kit dogfoods `repo-surface` on itself.
2. **enforce-artifact-surface-applicability** — add lint **Check 14**, which
   reads the kit's declared surfaces and asserts the kit's live
   `openspec/changes/**` artifacts carry no section for an *absent* surface
   (validates OUTPUT vs. declared surface; complementary to Check 11, which
   scans agent SOURCE fenced skeletons).

**Desired end state:** the kit's `## Repo surface` block lists its present kit
surfaces; future kit QRSPI artifacts emit kit-specific gated sections; `node
scripts/lint.mjs` runs Check 14 as a standing gate; and the `repo-surface` skill
carries an `## Extending the taxonomy` checklist proving the exact steps.

## Goals / Non-Goals

**Goals**
- Land all six kit surfaces (PQ1) with their gated sections, mapping rows,
  agent-skeleton/template placeholders, and Check 11 denylist entries (PQ4).
- Ship Check 14 in the same change (PQ2 moot), reading the kit's `## Repo
  surface` block (PQ7: fail loud if absent/unparseable), hardcoding the
  surface→heading mapping (PQ6), scanning all `*.md` under `openspec/changes/**`
  except `archive/` (PQ5).
- Rename `CRUD_DENYLIST_HEADINGS` → surface-generic (PQ9) and add an
  `## Extending the taxonomy` checklist to `repo-surface` (PQ8).
- Update the kit's `## Repo surface` block to list present kit surfaces.

**Non-Goals**
- Consumer-repo enforcement of surface applicability — Check 14 lints the kit's
  OWN artifacts only. Consumer-side enforcement stays in
  `standardize-recurring-ops-scripts`.
- Adding non-kit / non-web surfaces (CLI, queues, jobs) — that is
  `extend-surface-taxonomy` (P3). `typed-nullable` and the five web surfaces
  stay absent for the kit (PQ11).
- Any `plugin.json` version bump (feature work does not bump; CHANGELOG
  `[Unreleased]` only).

## Decisions

### D1 — Six surfaces, but only a *subset* is declared "present" for the kit

The taxonomy gains all six surfaces (PQ1). Whether each is *present* for the kit
is a separate axis, and it drives what Check 14 scans against. A surface is
"present" when the kit routinely produces the section it gates. Recommendation:

| Surface | Present for kit? | Rationale |
|---------|------------------|-----------|
| `slash-command` | **yes** | 15 command files; nearly every kit change touches one |
| `stage-agent` | **yes** | 7 agent files; read-contracts/banners change often |
| `skill` | **yes** | 11 kit skills; the dominant change-shape |
| `lint-gate` | **yes** | `scripts/lint.mjs` is the single test surface |
| `template` | **yes** | 5 templates; edited whenever a section shape changes |
| `migration-manifest` | **yes** | every release cuts a `migrations/<v>.yaml` |

**Rejected:** declaring only 2–3 present (e.g. `skill` + `lint-gate`). That
would make Check 14 flag legitimate `## Command changes` / `## Template surface`
sections in future kit artifacts as violations. Since all six change-shapes are
real and recurring for this repo, all six are present. The *taxonomy* and the
*present-set* are both "all six" here — but they remain conceptually distinct
(a future repo could adopt one kit surface without the others).

**Trade-off / OQ1:** near-universality weakens a surface as a *gate*. If almost
every kit change touches `skill`, `## Skill changes` is nearly always emitted, so
the gate rarely filters. This is acceptable — the point is fidelity (the kit's
artifacts finally describe kit change-shapes), not aggressive filtering. See OQ1
for the human to confirm the present-set rather than trimming to "high-signal"
surfaces only.

### D2 — Membership criteria (what "touches" each surface)

Per-surface criterion, kept deliberately broad (structural OR prose change to the
governed file-class counts — a narrow "read-contract-only" criterion for
`stage-agent` would silently drop banner/frontmatter edits, Q6):

- `slash-command` — adds/removes/renames or edits a `claude/commands/*.md` body.
- `stage-agent` — edits any `claude/agents/*.md` (read-contract, output-contract,
  frontmatter, skeleton, or prose).
- `skill` — edits a `claude/skills/*/SKILL.md` (kit skill). Loading a skill at
  runtime does NOT count — only editing one.
- `lint-gate` — edits `scripts/lint.mjs` **or** a module it imports
  (`scripts/skill-sets.mjs`); Q5 → the gate is the lint *behaviour*, not one file.
- `template` — edits an `openspec-templates/*.template.md`.
- `migration-manifest` — adds/edits a `migrations/*.yaml` (typically, but not
  necessarily, co-present with a release; Q4 — a pure-rename change can still
  need a manifest step, so it is its own surface).

These criteria are documentation for humans/agents; they are NOT machine-checked.
Check 14 enforces only the *output* rule (no section for an absent surface).

### D3 — Section names and per-artifact placement (PQ3 settled)

Use the PQ3 default names. Placement across artifacts:

| Surface | questions.md | design.md | proposal.md | tasks.md |
|---------|--------------|-----------|-------------|----------|
| `slash-command` | `## Slash-command surface` | `## Command changes` | — | — |
| `stage-agent` | `## Stage-agent surface` | `## Agent changes` | — | — |
| `skill` | `## Skill surface` | `## Skill changes` | — | — |
| `lint-gate` | `## Lint-gate surface` | `## Lint changes` | — | — |
| `template` | `## Template surface` | `## Template surface` | — | — |
| `migration-manifest` | `## Migration manifest` | `## Migration manifest` | — | — |

**Scope decision:** gate sections only in `questions.md` (questioner skeleton +
`questions.template.md`) and `design.md` (designer skeleton +
`design.template.md`). Do NOT add kit-surface sections to `proposal.md` or
`tasks.md` skeletons — those artifacts carry no web-surface gated sections beyond
the data-store Migrations line either, and adding kit-surface task categories is
speculative. `template` and `migration-manifest` keep one name across both
artifacts (they read naturally as a design-time "surface" heading); the other
four use the questions-vs-design split from PQ3. **Rejected:** a flat
`## <Surface> changes` everywhere (PQ3 option b) — "Lint-gate changes" reads
worse than "Lint changes".

### D4 — Every new gated heading joins the Check 11 denylist (PQ4)

Each new heading a skeleton must NOT hardcode goes into the (renamed) denylist
set: `## Slash-command surface`, `## Command changes`, `## Stage-agent surface`,
`## Agent changes`, `## Skill surface`, `## Skill changes`, `## Lint-gate
surface`, `## Lint changes`, `## Template surface`, `## Migration manifest`. That
is 10 headings (the four two-name surfaces contribute both names; `template` and
`migration-manifest` contribute one each), growing the denylist from 12 → 22.
The Check 11 comment block is updated to describe "surface-gated headings" rather
than "twelve CRUD/web-app headings". The disjoint-set invariant with Check 3
still holds — none of the new headings is a Check 3 canonical (always-present)
heading.

**Verification note (grounded in source):** Check 11 matches a denylist entry
line-anchored (`trimmed === denied || startsWith(denied + ' '|'\t')`). Because
`## Template surface` is also a *present* kit heading, the skeletons must express
it as a surface-gate *conditional placeholder/comment*, never as a literal
`## Template surface` heading line inside the fence — exactly the existing
pattern (the `<!-- Surface-gated … -->` comment block), so Check 11 stays green.

### D5 — Rename `CRUD_DENYLIST_HEADINGS` → `SURFACE_GATED_DENYLIST_HEADINGS` (PQ9)

Rename to `SURFACE_GATED_DENYLIST_HEADINGS` (over `GATED_SKELETON_HEADINGS` —
"surface-gated" is the established vocabulary in the repo-surface skill and Check
3/11 comments). Update the constant, all references, the Check 11 header comment,
and the disjoint-set-invariant comment to drop "CRUD". The `CRUD_CHECK_AGENTS`
array and `[crud-skeleton]` error label may be renamed too for consistency
(implementation latitude), but the constant rename is the load-bearing part.

### D6 — Check 14: read present surfaces, hardcode the mapping, scan live artifacts

Structure (mirrors existing checks):

1. **Read** `.claude/skills/qrspi-stack/SKILL.md`, extract the `## Repo surface`
   block, parse the present-surface list (bullet lines under the heading; the
   `_No present surfaces._` sentinel = empty set). This READ is required (PQ6
   note) — only the surface→heading *mapping* is hardcoded, not the present-set.
2. **PQ7 fail-loud:** if the `## Repo surface` heading is absent, OR the block is
   present but yields neither the sentinel nor a parseable bullet list, Check 14
   **fails** with a clear error ("the `## Repo surface` block is required for the
   kit to dogfood its own surface check"). Do not warn-and-skip; do not treat
   absence as "no surfaces".
3. **Hardcode** a `SURFACE_GATED_HEADINGS` map (surface → array of its gated
   headings), same pattern as `SURFACE_GATED_DENYLIST_HEADINGS` /
   `SKILL_SET_EXPECTED` (PQ6). Compute the *absent-surface heading set* = union of
   headings for every taxonomy surface NOT in the present-set.
4. **Scan** every `*.md` under `openspec/changes/**` excluding `archive/` (PQ5),
   via the existing `walkMd` helper + a path filter. For each file, flag any line
   that is an absent-surface heading. **Skip headings inside fenced code blocks**
   (reuse Check 11's fence-tracking) — a fenced example is not emitted content
   (Q27).
5. On any hit, push a `[surface-applicability]` error naming file:line, the
   heading, and the absent surface it belongs to.

**Complementarity (Q25, mirror Check 11's disjoint-scope comment):** Check 11
scans agent SOURCE fenced skeletons for a hardcoded gated heading; Check 14 scans
committed ARTIFACT bodies (outside fences) for an emitted heading whose surface
is absent. Disjoint scopes (source vs. output; inside-fence vs. outside-fence) —
they never fire on the same line. State this invariant in both comment blocks.

**Where the mapping/constants live (shared-module question):** keep the Check 14
`SURFACE_GATED_HEADINGS` map and the renamed denylist **inline in `lint.mjs`**,
not a new `scripts/surface-headings.mjs`. Rationale: unlike `skill-sets.mjs`
(shared because `context-footprint.mjs` re-imports it), nothing outside
`lint.mjs` consumes these; a new module adds a file without a second consumer.
If a second consumer appears later, extract then (watch-item, not now).

### D7 — Present-block rewrite, and the self-consistency it forces

Rewrite the kit's `## Repo surface` block from `_No present surfaces._` to list
the six present kit surfaces. **This is the pivotal interaction:** the block
Check 14 reads is also the block that decides what future kit artifacts emit AND
what Check 14 scans against. With all six present, the absent-surface set for the
kit = the five web surfaces + `typed-nullable` — so Check 14 forbids the kit's
live artifacts from carrying `## Data model`, `## API surface`, etc., and permits
the six kit-surface headings. The block keeps `typed-nullable` and the five web
surfaces unlisted (PQ11). Confirm no stray prose elsewhere in `qrspi-stack`
promotes a surface under Rule B (Q14) — Rule A (the block) is authoritative, so
this is belt-and-suspenders, but worth a grep at implement time.

### D8 — Regression coverage for Check 14 (no in-repo violating artifact by design)

The kit has, by design, no artifact with a disallowed heading — so the CI run
only exercises the pass path. Options for catching a regression:

- **(a, recommended)** an inline self-test in `lint.mjs`: a tiny function that
  runs Check 14's detection over an in-memory fixture string containing a known
  absent-surface heading and asserts it flags — invoked at the top of Check 14,
  contributing an error if the detector fails to fire. No fixture file on disk,
  no scanned-tree pollution.
- (b) a throwaway fixture under the scratchpad during dogfood only (the
  `(human)` verification task), never committed.

Recommend (a) for a standing regression guard plus (b) for the human dogfood
observation. Flagged as OQ2 since it adds a self-test pattern the kit does not
have today.

### D9 — README / CLAUDE.md drift

New surfaces + a new lint check touch README-worthy surface: the README documents
the surface taxonomy and the lint checks. Per the "keep the README current" rule,
update the README's surface/lint description in THIS change (add the six kit
surfaces and Check 14). CLAUDE.md needs no change (its rules are unaffected). Run
`/qrspi-readme-audit` at implement time to catch prose drift the lint can't judge
(Check 4 only covers command coverage, not surface/lint prose).

## Vertical slices (preview)

1. **Taxonomy + mapping + skeletons** — add the six surfaces to `repo-surface`
   (mapping rows + `## Extending the taxonomy` checklist), the gated sections to
   the questioner/designer skeletons and questions/design templates. Demoable: a
   future kit questions.md/design.md *can* carry a `## Skill changes` section.
2. **Declare the kit's present surfaces** — rewrite the `qrspi-stack` `## Repo
   surface` block to list the six. Demoable: the kit now dogfoods `repo-surface`;
   an agent run on a kit change emits kit-surface sections.
3. **Rename + denylist growth** — rename `CRUD_DENYLIST_HEADINGS` →
   `SURFACE_GATED_DENYLIST_HEADINGS`, add the 10 new headings, update Check 11
   comments. Demoable: `node scripts/lint.mjs` green; a hardcoded kit heading in
   a skeleton fence now fails Check 11.
4. **Check 14 + self-test + README** — add Check 14 (read block, hardcode
   mapping, scan live artifacts, fail-loud on absent block), the inline
   self-test, and the README surface/lint updates. Demoable: `node
   scripts/lint.mjs` runs Check 14 green; a planted absent-surface heading fails.

## Risks / Trade-offs

- **Near-universal surfaces filter little (D1/OQ1).** All six present ≈ most kit
  changes emit most kit sections. Accepted: fidelity over filtering.
- **Denylist bloat and the `## Template surface` self-collision (D4).** A present
  kit heading is also on the Check 11 denylist, so skeletons must keep expressing
  it only as a gate comment, never a literal heading — a subtle authoring
  constraint. Mitigated by the existing comment-block pattern; called out in the
  `## Extending the taxonomy` checklist.
- **Check 14 mapping drift (D6).** Hardcoding the surface→heading map duplicates
  the `repo-surface` mapping; a future rename must touch both. Accepted (matches
  the `CRUD_DENYLIST_HEADINGS` precedent); the `## Extending the taxonomy`
  checklist lists "Check 14 mapping" as a required edit site.
- **Fence-skipping correctness (D6/Q27).** Check 14 must skip fenced examples or
  it will flag the very `openspec-templates`-style illustrative headings that may
  legitimately appear inside a change's own fenced snippet. Reuse Check 11's
  battle-tested fence tracker rather than a fresh matcher.
- **Present-block is load-bearing in two directions (D7).** An accidental future
  edit dropping a surface from the block silently both stops emitting that
  section AND makes Check 14 start flagging existing artifacts. The fail-loud
  (PQ7) guards only *absence of the block*, not a wrong-but-parseable list.

## Open questions for the human

- [x] **OQ1 — present-set confirmation.** D1 recommends declaring **all six** kit
  surfaces present. Confirm, or trim to a high-signal subset (e.g. `skill` +
  `lint-gate` + `stage-agent` + `slash-command`) and leave `template` /
  `migration-manifest` in the taxonomy-but-absent — which would make Check 14
  flag those two sections if a future artifact emits them.
  **Answer: All six present** — full fidelity over aggressive filtering, as D1
  recommends. D1 stands as written.
- [x] **OQ2 — Check 14 regression pattern.** D8 recommends an inline in-memory
  self-test in `lint.mjs` (a pattern the kit does not use today) so a broken
  detector is caught in CI. Approve the self-test, or rely solely on the
  `(human)` dogfood observation (planted fixture in the scratchpad)?
  **Answer: Inline self-test** (the standing CI guard). D8 option (a) stands.
  The `(human)` dogfood observation still runs as the live check.
- [x] **OQ3 — proposal/tasks skeletons.** D3 gates kit-surface sections in
  questions.md and design.md only, not proposal.md/tasks.md. Confirm no
  kit-surface section is wanted in the proposal or tasks skeletons.
  **Answer: No — questions.md + design.md only.** D3's placement stands.
