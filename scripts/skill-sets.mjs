// scripts/skill-sets.mjs
// Shared single source of truth for the SKILL_SET_EXPECTED registry.
// Imported by both scripts/lint.mjs (Check 2b) and scripts/context-footprint.mjs.
// No Node built-in imports required -- pure data.

// Registry of the fixed, unconditional kit skills each stage agent is allowed
// to load. The <repo>-stack cheatsheet name is Glob-discovered per-repo and
// is explicitly excluded -- it must NOT appear here (neither required nor
// forbidden). Derived from the approved design (D2, D5, D6, D11):
//   researcher         -- trimmed: removed openspec-workflow (D1), added context-hygiene (D3)
//   questioner         -- trimmed: removed openspec-workflow (D1), removed repo-surface (D1); added backlog-writer (D11)
//   designer           -- trimmed: removed openspec-workflow (D1); added backlog-writer (D11)
//   architect          -- unchanged: keeps openspec-workflow (spec-delta + validate); added backlog-writer (D11)
//   planner            -- trimmed: removed openspec-workflow (D1)
//   implementer-low    -- effort-variant: delegates all behaviour to implementer-core
//   implementer-medium -- effort-variant: delegates all behaviour to implementer-core
//   implementer-high   -- effort-variant: delegates all behaviour to implementer-core
//   reviewer           -- unchanged: keeps openspec-workflow (archive / sync steps)
export const SKILL_SET_EXPECTED = {
  researcher:          ['context-hygiene', 'repo-surface', 'workflow'],
  questioner:          ['backlog-writer', 'repo-surface', 'workflow'],
  designer:            ['backlog-writer', 'context-hygiene', 'repo-surface', 'workflow'],
  architect:           ['backlog-writer', 'openspec-workflow', 'repo-surface', 'vertical-slice', 'workflow'],
  planner:             ['repo-surface', 'vertical-slice', 'workflow'],
  'implementer-low':   ['implementer-core'],
  'implementer-medium': ['implementer-core'],
  'implementer-high':  ['implementer-core'],
  reviewer:            ['openspec-workflow', 'repo-surface', 'workflow'],
};

// Registry of the fixed kit skills each non-stage main-loop command is expected
// to load. Validated by Check 2 (checkFrontmatter) skill-ref resolution -- each
// listed skill must resolve to a real claude/skills/<name>/ directory. The
// <repo>-stack cheatsheet is excluded from this map (same rationale as above).
//   idea -- loads backlog-writer to delegate row construction and staging (D7, D11)
export const COMMAND_SKILL_SET_EXPECTED = {
  idea: ['backlog-writer'],
};
