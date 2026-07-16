# Slices — progressive-task-ticking

> Stage V of QRSPI. Generated 2026-07-16.
> Vertical slices, not horizontal layers.

## Overview

This change is a prompt-text-only edit to `claude/agents/implementer.md` at
two sites, followed by regenerating the Copilot mirror and adding a CHANGELOG
entry. There is no runtime surface, no DB, no API, and no frontend. The
end-to-end user-facing unit is: "the implementer prompt ticks each checkbox
immediately after confirmation, and the Copilot mirror agrees." All of that
lands together and is demoable as a single diff reviewed by a human — splitting
by file (edit first, then sync) would be horizontal layering, which this skill
forbids.

One slice is therefore correct. The generic mock-API → frontend → real-DB
progression does not apply; the slice's steps are adapted to this change's
actual work surface. Fewer than the typical 3–5 slices is justified because
the entire observable change fits in a human's code review of one coherent
diff.

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Immediate per-task ticking: end-to-end prompt + mirror + changelog

A human running `/qrspi:implement` on any change after this PR will see
`tasks.md` tick one checkbox at a time as each task is confirmed — not in a
batch at the end of the slice. The Copilot mirror (`copilot/agents/
copilot-implementer.agent.md`) reflects the identical instruction so Copilot
users get the same behavior. The CHANGELOG records the change under
`[Unreleased]`. The diff is tight (two edit sites in one source file, one
regenerated file, one CHANGELOG line) and is reviewable in a single code
review session.

Deliberate gaps: none — this slice is the entire change.

- M (Mock): no mock layer — there is no service stub or API contract to
  prototype; the change is prompt text whose acceptance bar is a human diff
  review (D4, OQ1). The response type was settled in the approved design.
- F (Prompt edit — step 4a): rewrite step 4a in `claude/agents/implementer.md`
  to be a full immediate-ticking sequencing gate (immediacy anchor, rationale,
  premature-ticking guard, commit/tick disambiguation sentence). (D1)
- F (Prompt edit — Coding rules): rewrite the Coding-rules ticking line into a
  terse pointer to step 4a, preserving its "commit message references the change
  id" clause. (D2)
- D (CHANGELOG): add an `[Unreleased]` entry in `CHANGELOG.md` describing the
  per-task ticking behavior change. (D5)
- D (Copilot mirror): regenerate the Copilot mirror by running
  `node sync-copilot.mjs`. (D6)
- T (Verification): run `node sync-copilot.mjs --check` (zero-drift assertion)
  then `node scripts/lint.mjs` (all checks green, including Check 7 which
  asserts the `'Reads: tasks.md.'` banner in the implementer agent). (D3, D6)
- **Model:** sonnet — mechanical two-site text edit to a known file, following
  the exact wording supplied in the approved design (D1, D2); no novel
  reasoning required.
- Checkpoint: human runs `git diff` (or opens the PR diff) and reviews the two
  edited passages in `claude/agents/implementer.md` plus the regenerated Copilot
  mirror. Code review of the diff is the acceptance bar (D4 / OQ1 resolved) —
  there is no automated behavior test for prompt text. Dev-install
  (`claude --plugin-dir <repo-root>` then `/reload-plugins`) is optional for
  manual smoke-testing but is not the primary acceptance gate.
