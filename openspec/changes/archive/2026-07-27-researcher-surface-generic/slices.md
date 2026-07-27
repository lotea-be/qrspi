# Slices — researcher-surface-generic

> Stage V of QRSPI. Generated 2026-07-26.
> Vertical slices, not horizontal layers.

## Overview

This change makes the researcher agent surface-aware in exactly the same way the
questioner, designer, and other artifact-producing agents already are. The work
decomposes into three capability paths, each verifiable end-to-end with a green
`node scripts/lint.mjs` run:

1. **Gating spine** — the researcher loads `repo-surface`, restructures its fenced
   skeleton to the gate-comment convention, and adds the standing
   `## Notable discrepancies` heading. This is the runtime behaviour change: after
   this slice, the researcher is mechanically incapable of hardcoding absent-surface
   headings, and lint is green.
2. **Mechanical guards** — Check 11 is extended to cover `researcher.md`, and
   Check 3 is wired to the new `research.template.md`. After this slice, regressions
   in the researcher skeleton are caught automatically by CI.
3. **Mapping + docs** — `repo-surface` skill gets `(in research.md)` tagged lines
   per surface and a 7th checklist site. This closes the documentation loop so the
   next person extending the taxonomy sees research.md as a required edit site.

The design sketched these as three slices. The design also noted slices 1-2 could
merge, but they are kept separate here: slice 1 is the runtime behaviour change
(the researcher output is different), while slice 2 is the guard layer (lint now
enforces that change). Keeping them separate means slice 1's checkpoint is "the
researcher produces correct output" and slice 2's checkpoint is "lint catches
regressions" — two distinct observable signals.

The `(D<n>)` tags embedded throughout this file are required — this `slices.md`
dogfoods the rule it describes.

## Slices

### Slice 1 — Gating spine: surface-aware researcher skeleton

The researcher agent, once this slice is complete, loads `repo-surface` and the
stack cheatsheet in step 1 of its preamble, replaces all literal surface-gated
heading lines in its fenced skeleton with a `<!-- Surface-gated inventory
sections: ... -->` gate comment, and adds a standing `## Notable discrepancies`
heading to the inline skeleton. A human running the kit repo's researcher against
a consumer fixture (fresh `--plugin-dir` session) will not see `## Data model` or
`## API surface` emitted, because those surfaces are absent from the kit's
declared surface block. The `SKILL_SET_EXPECTED.researcher` entry in
`scripts/skill-sets.mjs` is updated to include `repo-surface`. Lint passes
(`node scripts/lint.mjs` exits zero) because Check 2b now sees the expected skill
set and Check 11 has no literal gated headings to reject in the skeleton (Check 11
already covers the five non-researcher agents; the skeleton fix is the precondition
for slice 2's guard addition, not a dependency on it).

- F (Researcher skeleton): restructure `claude/agents/researcher.md` — add `repo-surface` to the step-1 "Load skills" line, add D7 prose note about the skill load, replace all literal surface-gated headings in the fenced skeleton with a `<!-- Surface-gated inventory sections: ... -->` comment block listing the surface-to-heading mappings, add `## Notable discrepancies` as a standing skeleton heading (D1, D3, D5, D7)
- D (Skill-set registry): update `scripts/skill-sets.mjs` `SKILL_SET_EXPECTED.researcher` from `['context-hygiene','workflow']` to `['context-hygiene','repo-surface','workflow']` (D5)
- T (Lint): run `node scripts/lint.mjs` — Check 2b must pass with updated skill set; Check 7 must still pass (researcher banner unchanged); Check 11 already covers the other five agents and must still pass (researcher not yet in scope for Check 11 — that is slice 2)
- **Compute:** model=sonnet effort=medium — restructuring a fenced skeleton to gate-comment convention is templated; the D7 prose note and gate-comment wording require careful reading of the existing pattern but no novel reasoning
- Checkpoint: `node scripts/lint.mjs` exits zero; (human) in a fresh `claude --plugin-dir /workspaces/git/qrspi` session, run the researcher on a consumer fixture that declares no `data-store` surface — confirm `research.md` does NOT contain `## Data model` and DOES contain `## Notable discrepancies`

### Slice 2 — Mechanical guards: Check 11 + Check 3 + research template

Once this slice lands, a future contributor cannot accidentally reintroduce a
literal gated heading into the researcher skeleton without lint failing. This slice
adds `researcher` to `CRUD_CHECK_AGENTS` in `scripts/lint.mjs` (Check 11 guard),
creates the spine-only `openspec-templates/research.template.md` with the five
canonical headings, and wires `TEMPLATE_CANONICAL_HEADINGS` with the
`research.template.md → researcher → [5 headings]` entry (Check 3 guard). The
checkpoint demonstrates the guard bites: mutate the researcher skeleton to
reintroduce a literal gated heading, observe lint fail, revert, observe lint pass.

- M (Template): create `openspec-templates/research.template.md` — title, `> Stage R …` blockquote, five spine headings (`## Areas investigated`, `## File map`, `## Notable discrepancies`, `## Implicit contracts and conventions`, `## Open gaps`), no surface-gated headings, comment explaining inventory headings are injected dynamically (D6)
- F (Lint wiring): add `'researcher'` to `CRUD_CHECK_AGENTS` (Check 11) in `scripts/lint.mjs`; add `research.template.md → researcher → [five spine headings]` entry to `TEMPLATE_CANONICAL_HEADINGS` (Check 3); confirm `## Notable discrepancies` is NOT added to `SURFACE_GATED_DENYLIST_HEADINGS` or `SURFACE_GATED_HEADINGS` (D4, D6, D8)
- T (Lint guard demo): (a) temporarily inject `## Data model` as a literal heading inside the researcher's fenced skeleton — `node scripts/lint.mjs` must exit non-zero and name `researcher.md`; (b) revert injection — lint passes; (c) temporarily remove `## Open gaps` from the researcher's inline skeleton — Check 3 must exit non-zero; (d) revert — lint passes
- **Compute:** model=sonnet effort=low — mechanical constant-array and mapping additions in an existing pattern; template creation mirrors the questioner template exactly
- Checkpoint: `node scripts/lint.mjs` exits zero on the clean tree; the guard-bite demo in step T above confirms Check 11 and Check 3 each fire correctly before revert

### Slice 3 — Mapping + docs: repo-surface `(in research.md)` lines and 7th checklist site

This slice closes the documentation loop. The `repo-surface` skill's
section-to-surface mapping gains a `(in research.md)` tagged line under each
`### <surface> gates` subsection that has a research.md inventory heading. The
`## Extending the taxonomy` checklist gains a 7th site explicitly naming the
researcher skeleton gate comment as a required edit location. Additionally, the
D3 stage-I watch-item (re-verify Check 14 already includes research.md in its
walk with no research-specific filename filter, and that the kit-surface-dogfooding
band-aid is no longer needed) is confirmed here: Check 14's existing walk should
already cover research.md, so no code change is expected — this is a verification
step only. After this slice, `node scripts/lint.mjs` exits zero and `repo-surface`
documents research.md as a first-class artifact site.

- F (Skill docs): edit `claude/skills/repo-surface/SKILL.md` — add `- Section \`## <heading>\` (in research.md)` tagged lines to each `### <surface> gates` subsection that has an inventory heading (slash-command, stage-agent, skill, lint-gate, template, migration-manifest); extend the `## Extending the taxonomy` checklist with sites 6 and 7 (`verify Check 11 still covers all agent skeletons for the new heading` and `confirm the researcher skeleton gate comment and the (in research.md) mapping line are consistent`) (D2, D9, D10)
- T (Lint + Check 14 verification): run `node scripts/lint.mjs` — confirm exit zero; review Check 14 implementation in `scripts/lint.mjs` to confirm it walks research.md with no research-specific filter; confirm the kit-surface-dogfooding band-aid is no longer needed (if a skip/filter exists for research.md in Check 14, remove it) (D3)
- **Compute:** model=sonnet effort=low — documentation additions following an established per-surface pattern; verification of Check 14 scope is a targeted code read
- Checkpoint: `node scripts/lint.mjs` exits zero; `claude/skills/repo-surface/SKILL.md` contains a `(in research.md)` line for each of the six kit surfaces; the `## Extending the taxonomy` section lists exactly 7 sites; (human) review `claude/skills/repo-surface/SKILL.md` to confirm the 7th site explicitly names `claude/agents/researcher.md`
