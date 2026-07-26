# Tasks — researcher-surface-generic

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Gating spine: surface-aware researcher skeleton

**Compute:** model=sonnet effort=medium — restructuring a fenced skeleton to gate-comment convention is templated; the D7 prose note and gate-comment wording require careful reading of the existing pattern but no novel reasoning

- [x] 1.1 Edit `claude/agents/researcher.md`: add `repo-surface` to the step-1 "Load skills" line; add D7 prose note explaining the skill load; replace all literal surface-gated heading lines in the fenced skeleton with a `<!-- Surface-gated inventory sections: ... -->` gate-comment block that lists each surface-to-heading mapping; add `## Notable discrepancies` as a standing (non-gated) heading in the inline skeleton (D1, D3, D5, D7)
- [x] 1.2 Edit `scripts/skill-sets.mjs`: update `SKILL_SET_EXPECTED.researcher` from `['context-hygiene','workflow']` to `['context-hygiene','repo-surface','workflow']` (D5)
- [x] 1.3 Run `node scripts/lint.mjs` — Check 2b must pass with the updated skill set; Check 7 must still pass (researcher banner unchanged); Check 11 must still pass for all currently-covered agents
- [ ] 1.4 (human) In a fresh `claude --plugin-dir /workspaces/git/qrspi` session, run the researcher against a consumer fixture that declares no `data-store` surface — confirm the produced `research.md` does NOT contain `## Data model` and DOES contain `## Notable discrepancies`

## 2. Mechanical guards: Check 11 + Check 3 + research template

**Compute:** model=sonnet effort=low — mechanical constant-array and mapping additions in an existing pattern; template creation mirrors the questioner template exactly

- [x] 2.1 Create `openspec-templates/research.template.md`: include a title line, the `> Stage R …` blockquote, and the five spine headings (`## Areas investigated`, `## File map`, `## Notable discrepancies`, `## Implicit contracts and conventions`, `## Open gaps`); add no surface-gated headings; include a comment explaining that inventory headings are injected dynamically (D6)
- [x] 2.2 Edit `scripts/lint.mjs`: add `'researcher'` to `CRUD_CHECK_AGENTS` (Check 11); add the `research.template.md → researcher → [five spine headings]` entry to `TEMPLATE_CANONICAL_HEADINGS` (Check 3); confirm `## Notable discrepancies` is NOT added to `SURFACE_GATED_DENYLIST_HEADINGS` or `SURFACE_GATED_HEADINGS` (D4, D6, D8)
- [x] 2.3 Guard-bite demo (a): temporarily inject `## Data model` as a literal heading inside the researcher's fenced skeleton — run `node scripts/lint.mjs` and confirm it exits non-zero naming `researcher.md`; revert the injection (D4)
- [x] 2.4 Guard-bite demo (b): temporarily remove `## Open gaps` from the researcher's inline skeleton — run `node scripts/lint.mjs` and confirm Check 3 exits non-zero; revert (D6)
- [x] 2.5 Run `node scripts/lint.mjs` on the clean tree — confirm exit zero
- [x] 2.6 Checkpoint: lint exits zero on the clean tree; both guard-bite demos in 2.3 and 2.4 fired correctly before revert

## 3. Mapping + docs: repo-surface `(in research.md)` lines and 7th checklist site

**Compute:** model=sonnet effort=low — documentation additions following an established per-surface pattern; verification of Check 14 scope is a targeted code read

- [x] 3.1 Edit `claude/skills/repo-surface/SKILL.md`: under each `### <surface> gates` subsection that has a research.md inventory heading, add a `- Section \`## <heading>\` (in research.md)` tagged line for each relevant heading; extend the `## Extending the taxonomy` checklist with site 6 ("verify Check 11 still covers all agent skeletons for the new heading") and site 7 ("confirm the researcher skeleton gate comment and the `(in research.md)` mapping line are consistent") (D2, D9, D10)
- [x] 3.2 Review the Check 14 implementation in `scripts/lint.mjs`: confirm it walks `research.md` with no research-specific filename filter; if a skip or filter for `research.md` exists in Check 14 (the kit-surface-dogfooding band-aid), remove it (D3)
- [x] 3.3 Run `node scripts/lint.mjs` — confirm exit zero
- [ ] 3.4 (human) Review `claude/skills/repo-surface/SKILL.md` and confirm: (a) a `(in research.md)` line is present for each of the six kit surfaces; (b) the `## Extending the taxonomy` section lists exactly 7 sites; (c) site 7 explicitly names `claude/agents/researcher.md`
