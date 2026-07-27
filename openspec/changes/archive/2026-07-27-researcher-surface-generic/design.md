# Design — researcher-surface-generic

> Stage D of QRSPI. Generated 2026-07-25.
> **Implementation is BLOCKED until a human approves this file.**

## Context

The QRSPI researcher (stage R, `claude/agents/researcher.md`) writes `research.md`
from a **fixed, web-app-shaped skeleton**: its fenced example hardcodes
`## Public API surface` and `## Data model` as literal heading lines, regardless
of what the repo being researched actually contains. Every other artifact-producing
agent — questioner, designer, architect, planner, reviewer — was made
surface-aware by `repo-applicable-artifact-sections`: each loads `repo-surface`,
reads the stack cheatsheet's `## Repo surface` block, and emits a section only when
its controlling surface is present. The researcher was left out of that work. In
this repo (surfaces: slash-command, stage-agent, skill, lint-gate, template,
migration-manifest — no data-store/http-api/ui/auth), the researcher would emit
`## Data model` / `## Public API surface` for a repo that has neither, which is why
`kit-surface-dogfooding` needed a temporary band-aid (renaming `## Data model` to
`## Data structures` in its `research.md` to dodge Check 14).

**Desired end state:** the researcher drives its factual-inventory sections from
the repo's declared surfaces exactly as the proposal agents do — omitting a
section for any absent surface (PQ1), reporting code-evidence of a *declared-absent*
surface as a factual `## Notable discrepancies` note (PQ6), and staying
ticket-blind and recommendation-free. The change also lands the mechanical guards
that make surface-gating real for research.md: Check 14 scanning research.md
(PQ2), Check 11 covering the researcher skeleton (PQ5), a spine-only
`research.template.md` guarded by Check 3 (PQ4), and the skill-set / heading-map /
denylist updates those imply.

Six product questions (PQ1–PQ6) are **already answered and binding** — they are
cited as settled constraints below, not re-opened.

## Goals / Non-Goals

**Goals:**
- The researcher loads `repo-surface` + the stack cheatsheet and gates its
  inventory sections on the repo's declared surfaces (mirror the 5 proposal agents).
- Absent surface ⇒ no inventory section, no heading, no "not applicable" (PQ1).
- Code evidence of a *declared-absent* surface ⇒ a factual `## Notable
  discrepancies` note under a non-gated heading; no recommendation to run
  `/qrspi:stack` (PQ6).
- Every mechanical guard is wired so a future regression (a hardcoded web-app
  heading in a repo lacking that surface) is caught: Check 14 scans research.md
  (PQ2), Check 11 covers the researcher (PQ5), Check 3 guards a spine-only
  template (PQ4).
- The ticket-blind invariant is preserved: skill loads reveal only the surface
  list, never the change ticket.

**Non-Goals:**
- Adding a new surface to the taxonomy (that is `extend-surface-taxonomy`, P3).
- Changing the R-stage orchestrator command's areas-of-interest brief (it is
  decoupled from output section structure — see D8).
- Changing the researcher's `Reads:` banner clause or Check 7's researcher string
  (PQ3 — unchanged).
- Making the `implementer` surface-aware (out of scope; a separate artifact class).

## Decisions

### D1 — Inventory headings REUSE proposal headings; no separate inventory-heading namespace

The backlog names "a surface→inventory-heading mapping distinct from the existing
surface→proposal-heading mapping." Two options:

- **(A) Distinct inventory headings** — e.g. `## Current data model`,
  `## Existing API surface`. Semantically cleaner ("audit" vs "proposal") but
  forces a *second* per-surface heading namespace: new entries in Check 14's
  `SURFACE_GATED_HEADINGS`, new entries in Check 11's denylist, a second column in
  the repo-surface mapping, and a second set of strings to keep in sync forever.
- **(B) Reuse the existing proposal headings** — the researcher emits the SAME
  gated heading strings the questioner/designer already use for each surface
  (e.g. `## Data model` for data-store, `## Skill surface` for skill). The
  "audit vs proposal" distinction lives in the *prose under* the heading and in
  the artifact's identity (research.md is factual by contract), not in a distinct
  heading string.

**Chosen: (B) reuse.** Rationale: Check 14 keys its `SURFACE_GATED_HEADINGS` map
by *heading string across all artifacts* — reusing proposal headings means the
existing map already gates them in research.md the moment PQ2 turns scanning on,
with **zero new heading strings** to register. This is also what the repo's
current skeleton already does for data-store (`## Data model` is verbatim a
proposal heading and already in Check 14's data-store array). Distinct headings
would double the taxonomy's string surface for no downstream benefit — the
designer reading research.md does not need a different word, it needs the facts.
Answers Q10, Q11, Q17.

Consequence: the "surface→inventory-heading mapping" the backlog asks for is **not
a new second mapping** — it is a documented statement, added to `repo-surface`,
that *research.md reuses the same gated heading per surface as questions.md*. See D2.

### D2 — Where the inventory-heading mapping lives: extend `repo-surface`'s existing per-surface subsections with a `(in research.md)` line

The section-to-surface mapping in `repo-surface/SKILL.md` is a series of
`### <surface> gates` subsections, each listing gated sections tagged by artifact
(`(in questions.md)`, `(in design.md)`, `(in PR checklists)`). The researcher's
inventory heading is added as one more tagged line per surface:
`- Section \`## Data model\` (in research.md)` under `### data-store gates`, and so
on for every surface that has an inventory section.

For **the five present kit surfaces plus the absent web surfaces**, the research.md
inventory heading per surface (reusing D1) is:

| Surface | research.md inventory heading (= proposal heading reused) |
|---|---|
| `data-store` | `## Data model` |
| `http-api` | `## API surface` |
| `ui` | `## UI surface` |
| `auth` | `## Authorization` |
| `slash-command` | `## Slash-command surface` |
| `stage-agent` | `## Stage-agent surface` |
| `skill` | `## Skill surface` |
| `lint-gate` | `## Lint-gate surface` |
| `template` | `## Template surface` |
| `migration-manifest` | `## Migration manifest` |

(`typed-nullable` gates no section — only a PR checklist item — so it contributes
no research.md heading, consistent with the other artifacts.)

**Retiring the `## Public API surface` orphan:** the researcher's current skeleton
uses `## Public API surface`, which is NOT in any Check-14 array (http-api's array
is `## API`, `## API surface`). Rather than register a third http-api string, the
researcher's http-api inventory heading becomes `## API surface` (already gated),
and `## Public API surface` is dropped entirely. Answers the research.md
reconciliation finding and Q17. Alternative rejected: add `## Public API surface`
to http-api's Check-14 array — rejected because it multiplies near-synonym strings
the taxonomy must carry.

### D3 — Check 14's `SURFACE_GATED_HEADINGS` needs NO new entries; scanning is turned on for research.md via PQ2

Because D1 reuses proposal headings, every research.md inventory heading is already
a value in `SURFACE_GATED_HEADINGS`. Check 14 already walks **all** `*.md` under
`openspec/changes/` (excluding `/archive/`) — research.md files are *already in the
glob*. The finding that "`## Public API surface` was not flagged by Check 14" is
resolved by D2 (that heading is dropped, not added). So PQ2's "scan research.md the
same way" requires **no code change to the glob or the map** — it is already true;
what makes it *safe* is D1+D2 ensuring research.md only ever emits gated headings
for *present* surfaces. This is the correctness guard the change exists to
establish. Answers Q15, Q17, PQ2.

> Watch-item for stage I: independently re-verify Check 14 already includes
> research.md in its walk (research.md finding #8 says it walks all `*.md` under
> `openspec/changes/`, archive-excluded; confirm no research-specific filename
> filter exists). If a filter is found, removing it is a one-line change — not a
> new denylist. This is framed as a verify-then-proceed, not an assumed default.

### D4 — Check 11: add `researcher` to `CRUD_CHECK_AGENTS` and restructure the skeleton to gate the two web headings (PQ5)

PQ5 binds: add `researcher` to `CRUD_CHECK_AGENTS` (currently
`['questioner','designer','architect','planner','reviewer']`). Consequence — the
researcher's fenced skeleton currently hardcodes `## Public API surface` and
`## Data model` as literal lines *inside the fence*; once `researcher` is in
`CRUD_CHECK_AGENTS`, `## Data model` is a denylist hit and fails Check 11. So the
skeleton must be restructured to the **gate-comment convention** the designer uses:
the fenced example carries a `<!-- Surface-gated inventory sections: … -->` comment
block listing `surface -> ## Heading` mappings, and the literal gated heading lines
are removed from inside the fence (`## Public API surface` dropped per D2;
`## Data model` moved out of the fence into the gate comment). This is the
source-level guard that makes "the researcher is surface-gated" real — Check 14
only catches leaks at output time and only in a repo lacking the surface. Answers
Q16, PQ5.

### D5 — Skill set: researcher gains `repo-surface`; new set is `['context-hygiene','repo-surface','workflow']`

The researcher must load `repo-surface` to apply the gating (it already loads
`workflow`, `context-hygiene`, and Glob-discovers the stack cheatsheet). Update:
- `researcher.md` step 1: add `repo-surface` to the "Load skills" line.
- `scripts/skill-sets.mjs` `SKILL_SET_EXPECTED.researcher`:
  `['context-hygiene','workflow']` → `['context-hygiene','repo-surface','workflow']`
  (Check 2b enforces the match).

**`qrspi-stack` (the cheatsheet) is NOT added to the registry list** — it is
Glob-discovered per-repo and explicitly excluded from `SKILL_SET_EXPECTED` (the
`-stack` suffix rule). The researcher already loads it today via the Glob step, so
no registry change for it. `repo-surface` itself reads the cheatsheet, so the
researcher does not need a *separate* new load beyond `repo-surface`. Answers Q30,
research.md finding #3. `tools:` line is unchanged — `Skill` is already present
(Q30 / research.md finding #4).

### D6 — `research.template.md`: spine-only, with `## Notable discrepancies` as a STANDING spine heading (PQ4 ratification)

PQ4 binds a spine-only template. This design **ratifies the exact spine set** as:

```
## Areas investigated
## File map
## Notable discrepancies
## Implicit contracts and conventions
## Open gaps
```

plus the `# Research — <change-id>` title and the `> Stage R …` blockquote. The
surface-driven inventory headings (`## Data model`, `## API surface`, the kit-surface
sections, …) are **NOT** in the template — a comment records that they are injected
dynamically from the repo's declared surfaces.

**Ratification of the open sub-question (standing vs conditional `## Notable
discrepancies`):** make it a **standing spine heading**, emitted every run (its
body reads "None." when there are no discrepancies). Two options were weighed:
- Conditional (emit only when a discrepancy is found) — keeps clean runs terminal
  at `## Open gaps`, but makes the heading dynamic, which fights Check 3 (a
  template heading Check 3 requires-present must reliably appear in the skeleton).
- Standing (always emit, "None." when empty) — Check 3 can list it as a canonical
  required heading; it never surprises the designer; a discrepancy note has a fixed
  home. **Chosen.** A one-word "None." body is cheaper than a heading that Check 3
  cannot depend on. This keeps `## Notable discrepancies` off the surface-gated
  denylist (it is a non-gated, always-emitted heading — exactly what PQ6 needs).

Check 3 wiring: add a `research.template.md → researcher → [the 5 spine headings]`
entry to `TEMPLATE_CANONICAL_HEADINGS`. Enforcement then divides cleanly: Check 3
guards the spine (template ↔ inline skeleton), Check 14 guards the dynamic gated
part (PQ2), Check 11 guards against hardcoded gated headings in the skeleton (PQ5).
The disjoint-set invariant holds — none of the 5 spine headings is a surface-gated
denylist string. Answers Q20, Q21, PQ4.

### D7 — Read-contract banner unchanged; add a one-line prose note documenting the skill loads (PQ3)

PQ3 binds: the `Reads:` clause stays `Reads: none (whole changes/<id>/ folder
banned).` — the `repo-surface` and `qrspi-stack` skills are kit skills loaded via
the Skill tool, not change-folder file reads, so the clause is literally true and
Check 7's hardcoded researcher string (`scripts/lint.mjs:1139`) and the workflow
Read-Matrix R row need **no change**. Add one prose line in the researcher's
preamble noting it loads `repo-surface` + the stack cheatsheet to determine which
inventory sections to emit. The cross-change `spec.md` exception stays in the
existing "Never opens … spec.md excepted" pointer. Answers Q4, Q5, Q18, Q31, Q32,
PQ3.

**Ticket-blind invariant confirmed:** loading `repo-surface`/`qrspi-stack` reveals
only the repo's *surface list* (`## Repo surface` bullets) — never the change
description, which lives under `openspec/changes/<id>/` and stays banned. Learning
"this repo has a data-store" is not learning "this change adds a votes table." The
invariant holds (Q27, Q28, PQ6/PQ3).

### D8 — R-stage orchestrator command is unchanged (areas-of-interest ⟂ output sections)

The R-stage command (`claude/commands/research.md`) derives *areas of interest*
(input scope) from questions.md headings. The researcher's *output section
structure* is now driven by surfaces, internally, via `repo-surface`. These are
orthogonal: areas of interest tell the researcher *what to look at*; surfaces tell
it *which inventory headings to emit*. The orchestrator neither computes nor passes
surface info, so it needs **no change**. Answers Q7, Q13, Q14, Q29.

### D9 — "Extending the taxonomy" checklist gains a 7th site (the research.md inventory line)

Adding a future surface now must also add its `(in research.md)` line to the
relevant `### <surface> gates` subsection AND gate it in the researcher skeleton's
comment block. Update the "Extending the taxonomy" checklist in `repo-surface`
(site 2 "Agent skeleton gate comment" must now name `claude/agents/researcher.md`
alongside questioner/designer; a note that the per-surface mapping line must include
the research.md artifact tag). Because D1 reuses proposal headings, **no new Check
11 / Check 14 string** is introduced per surface — the existing sites 4 and 5 keep
covering research.md automatically. So the checklist grows by scope (researcher.md
joins the skeleton-gate site), not by a new mechanical constant. This keeps
`extend-surface-taxonomy` (P3) a table-row-plus-skeleton edit, not a structural
rework. Answers Q12, Q39.

### D10 — No `migrations/<version>.yaml` entry for this change (Q40)

Migration manifests exist to migrate **consumer repos** across kit versions
(`/qrspi:update` walks them). This change edits kit *source* — the researcher
agent, the repo-surface skill, the lint script, and adds a template — none of which
requires a consumer repo to run a migration step: a consumer picks up the new
researcher behaviour simply by installing the new kit version; there is no stateful
consumer artifact to rewrite. The migration-manifest surface being *present* in
this repo governs whether such entries are *possible*, not whether every change
*needs* one. **No migration entry.** (If stage I discovers a consumer-visible
breaking rename — e.g. a heading consumers' own tooling keys on — revisit; none is
expected.) Answers Q40.

<!-- Surface-gated detail sections omitted per PQ1. This repo declares
     slash-command, stage-agent, skill, lint-gate, template, migration-manifest —
     so the data-store ("## Data model changes"), http-api, ui, and auth detail
     sections are absent (their surfaces are not present). The kit-surface detail
     lives in the Decisions above (D4 stage-agent, D5 skill, D6 template, D2/D9
     skill+lint, D3/D4 lint-gate), folded per the designer's 1-decision-per-question
     cadence. -->

## Vertical slices (preview)

Two to three vertical slices, each ending in a green `node scripts/lint.mjs` with
observable surface-gated behaviour — sliced by *capability path*, not by file layer:

- **Slice 1 — Gating spine: researcher emits surface-gated inventory + Notable
  discrepancies, end-to-end.** Add `repo-surface` to the researcher (agent step 1 +
  `skill-sets.mjs`), restructure the fenced skeleton to the gate-comment convention
  (drop `## Public API surface`, gate `## Data model`, add standing
  `## Notable discrepancies`), add the prose note (D7). Demoable: the researcher's
  own skeleton no longer hardcodes an absent-surface heading.
- **Slice 2 — Mechanical guards: Check 11 + Check 3 + template.** Add `researcher`
  to `CRUD_CHECK_AGENTS`; create spine-only `research.template.md`; wire
  `TEMPLATE_CANONICAL_HEADINGS`. Demoable: lint now fails if the researcher skeleton
  regresses to a literal gated heading or drops a spine heading.
- **Slice 3 — Mapping + docs: repo-surface `(in research.md)` lines, the
  7th-site checklist update, and the retired band-aid confirmation.** Demoable:
  `repo-surface` documents research.md inventory headings; Check 14 scanning
  research.md is confirmed clean (band-aid no longer needed).

(Stage V finalises the cut; this is a preview. Slices 1–2 could merge if the
architect prefers a single lint-green checkpoint.)

## Risks / Trade-offs

- **Reuse (D1) blurs "audit vs proposal" at the heading level.** A reader skimming
  only headings sees `## Data model` in both research.md and questions.md. Mitigated
  by artifact identity (research.md's blockquote + factual-only contract) and the
  prose beneath. The trade taken: taxonomy simplicity over heading-level semantic
  distinction. If this proves confusing downstream, D1 can be revisited to option
  (A) as a follow-up — but it would then owe the second heading namespace.
- **Standing `## Notable discrepancies` (D6) adds a "None." line to every clean
  research.md.** Minor noise; the payoff is a Check-3-stable heading and a fixed
  home for PQ6 notes. Trade taken: one predictable heading over a dynamic one.
- **Check 14-already-scans-research.md (D3) is asserted from research.md's reading,
  not yet re-verified against the live code in this stage.** Flagged as a stage-I
  watch-item (D3) with a one-line fallback if a filename filter is found.
- **`## Notable discrepancies` heading collision risk.** It must never be added to
  `SURFACE_GATED_DENYLIST_HEADINGS` / `SURFACE_GATED_HEADINGS`, or Check 14 would
  flag every clean research.md. Called out so stage I does not "helpfully" register
  it. It is a non-gated always-emitted heading by design.
- **Transitive skeleton manifestation.** The researcher names its gated headings
  *inline* in its own fenced skeleton (no shared include reaches them), so Check 11
  covering `researcher.md` catches the full manifestation — no transitive/delegated
  form exists for this predicate. (Noted per the inline-vs-transitive enumeration
  rule; here the inline form is the only form.)

## Open questions for the human

- [x] **OQ1 — heading reuse vs distinct (D1).** **Resolved (human, 2026-07-26): REUSE
  proposal headings (Option A).** The researcher emits the same gated heading string
  per surface as the questioner/designer (`## Data model`, `## API surface`, …); no
  distinct inventory-heading namespace is minted. Rationale accepted as stated in D1:
  reuse means zero new heading strings for Check 11 / Check 14 to carry, the existing
  gating map already covers research.md the moment PQ2 scanning turns on, and the
  "audit vs proposal" distinction is carried by artifact identity (research.md's
  factual-only contract + blockquote) and the prose under each heading rather than by
  a different word. D1 stands as written.
