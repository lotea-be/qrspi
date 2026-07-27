# Proposal — researcher-surface-generic

> Stage S of QRSPI. Generated 2026-07-26.

## Why

Every artifact-producing QRSPI agent except the researcher gates its inventory
sections on the repo's declared surfaces (loaded via `repo-surface` + the stack
cheatsheet). The researcher was left out, so its fenced skeleton hardcodes
`## Public API surface` and `## Data model` regardless of what surfaces the
target repo actually declares. In this kit repo (surfaces: slash-command,
stage-agent, skill, lint-gate, template, migration-manifest — no data-store or
http-api), the researcher would emit absent-surface headings, which is why the
prior change (`kit-surface-dogfooding`) needed a temporary band-aid. This change
makes the researcher surface-aware and wires the mechanical guards (Check 11,
Check 3, Check 14 correctness) that prevent regressions.

## What Changes

- `claude/agents/researcher.md` — loads `repo-surface`, restructures fenced
  skeleton to gate-comment convention, adds prose note about skill loads (D5, D7).
- `scripts/lint.mjs` — adds `researcher` to `CRUD_CHECK_AGENTS` for Check 11;
  wires `research.template.md → researcher → [5 spine headings]` in
  `TEMPLATE_CANONICAL_HEADINGS` for Check 3 (D4, D6).
- `scripts/skill-sets.mjs` — updates `SKILL_SET_EXPECTED.researcher` from
  `['context-hygiene','workflow']` to `['context-hygiene','repo-surface','workflow']`
  (D5, Check 2b).
- `openspec-templates/research.template.md` — new spine-only template with 5
  headings; `## Notable discrepancies` is a standing heading (D6).
- `claude/skills/repo-surface/SKILL.md` — adds `(in research.md)` tagged lines to
  each per-surface `### <surface> gates` subsection; extends the "Extending the
  taxonomy" checklist with a 7th site (D2, D9).

## Capabilities

### New Capabilities

- `researcher-surface-gating`: The researcher agent loads `repo-surface` and the
  stack cheatsheet, gates its inventory sections on declared surfaces, and emits
  `## Notable discrepancies` (standing) for code evidence of declared-absent
  surfaces — creates `specs/researcher-surface-gating/spec.md`.
- `research-template`: A spine-only `research.template.md` ships with the kit;
  Check 3 guards its five canonical spine headings against the researcher's inline
  skeleton — creates `specs/research-template/spec.md`.

### Modified Capabilities

- `ci-quality-gates`: Check 11 now covers `researcher.md` (added to
  `CRUD_CHECK_AGENTS`); Check 3 gains a `research.template.md` entry wiring the
  five spine headings — needs a delta spec.
- `repo-surface`: Each `### <surface> gates` subsection gains a `(in research.md)`
  tagged line documenting the research.md inventory heading; the "Extending the
  taxonomy" checklist gains a 7th site (researcher skeleton gate comment) — needs
  a delta spec.

## Impact

- Breaking changes: no — the researcher's output headings change only for repos
  that declared surface-absent headings as hardcoded (a correctness fix, not a
  breaking contract change); no API or command signature changes.
- Phases: single phase; three vertical slices (gating spine, mechanical guards,
  mapping + docs).
- Affected code / APIs / dependencies: `claude/agents/researcher.md`,
  `scripts/lint.mjs`, `scripts/skill-sets.mjs`,
  `openspec-templates/research.template.md`,
  `claude/skills/repo-surface/SKILL.md`.
