# Tasks — progressive-task-ticking

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Immediate per-task ticking: end-to-end prompt + mirror + changelog

**Model:** sonnet — mechanical two-site text edit to a known file, following the exact wording supplied in the approved design (D1, D2); no novel reasoning required.

- [ ] 1.1 Rewrite step 4a in `claude/agents/implementer.md`: immediacy anchor, inline rationale, no-batch rule, premature-ticking guard, and commit/tick disambiguation sentence (D1)
- [ ] 1.2 Rewrite the Coding-rules ticking line in `claude/agents/implementer.md` into a terse pointer to step 4a, preserving its "commit message references the change id" clause (D2)
- [ ] 1.3 Add an `[Unreleased]` entry to `CHANGELOG.md` describing the per-task ticking behavior change (D5)
- [ ] 1.4 Regenerate the Copilot mirror: run `node sync-copilot.mjs` (D6)
- [ ] 1.5 Verify zero drift and lint: run `node sync-copilot.mjs --check` then `node scripts/lint.mjs` (all checks green, including Check 7 for the `'Reads: tasks.md.'` banner) (D3, D6)
- [ ] 1.6 (human) Code-review checkpoint: open `git diff` (or the PR diff) and review the two edited passages in `claude/agents/implementer.md` plus the regenerated Copilot mirror — human diff review is the acceptance bar (D4, OQ1)
