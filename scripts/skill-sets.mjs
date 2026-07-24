// scripts/skill-sets.mjs
// Shared single source of truth for the SKILL_SET_EXPECTED registry.
// Imported by both scripts/lint.mjs (Check 2b) and scripts/context-footprint.mjs.
// No Node built-in imports required -- pure data.

// Registry of the fixed, unconditional kit skills each stage agent is allowed
// to load. The <repo>-stack cheatsheet name is Glob-discovered per-repo and
// is explicitly excluded -- it must NOT appear here (neither required nor
// forbidden). Derived from the approved design (D2, D5, D6):
//   researcher  -- trimmed: removed openspec-workflow (D1), added context-hygiene (D3)
//   questioner  -- trimmed: removed openspec-workflow (D1), removed repo-surface (D1)
//   designer    -- trimmed: removed openspec-workflow (D1)
//   architect   -- unchanged: keeps openspec-workflow (spec-delta + validate)
//   planner     -- trimmed: removed openspec-workflow (D1)
//   implementer -- unchanged
//   reviewer    -- unchanged: keeps openspec-workflow (archive / sync steps)
export const SKILL_SET_EXPECTED = {
  researcher:  ['context-hygiene', 'workflow'],
  questioner:  ['repo-surface', 'workflow'],
  designer:    ['context-hygiene', 'repo-surface', 'workflow'],
  architect:   ['openspec-workflow', 'repo-surface', 'vertical-slice', 'workflow'],
  planner:     ['repo-surface', 'vertical-slice', 'workflow'],
  implementer: ['context-hygiene', 'vertical-slice', 'workflow'],
  reviewer:    ['openspec-workflow', 'repo-surface', 'workflow'],
};
