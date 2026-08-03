# Handover — `/qrspi:archive` prints the PR command instead of creating the PR

- **Date:** 2026-08-03
- **Surfaced by:** abkf-registrations consumer run (change `create-subprofiles-for-registration`)
- **Kit version in use:** 0.12.0
- **Status:** needs a maintainer decision (product/UX) — no code change made yet

## What happened

During a live `/qrspi:archive create-subprofiles-for-registration` run, the flow
reached step 5 with the **"New branch + push (open a PR)"** target selected. It
created `chore/archive-create-subprofiles-for-registration`, committed the folder
move + spec sync + backlog-row removal, pushed the branch with `-u`, and then
**printed** the `gh pr create` command as the suggested next step rather than
running it.

The consumer (a repo maintainer) expected the command to **create the PR itself**,
and asked why it didn't.

## Why it behaved that way (this is by design, today)

`claude/commands/archive.md`, step 5, "New branch + push" path, states verbatim:

> Then surface the project's PR-create command (the host CLI named in its
> stack-cheatsheet — e.g. `gh pr create` or `az repos pr create`) as the
> suggested next step, mirroring how `/qrspi:pr` surfaces its PR-create line.
> **Do not run it automatically — just print it.**

So print-don't-run is intentional and is the **same pattern `/qrspi:pr` uses** —
the agent prepares the branch/commit and hands the outward-facing "open the PR"
step to the human.

## What the backlog does / doesn't say

There is **no** backlog idea to make `/qrspi:archive` auto-create the PR. The two
adjacent items both preserve a human-in-the-loop on PR creation:

- **`standardize-recurring-ops-scripts`** — lists "create the PR from this
  title/body template" as a candidate helper to extract, but its scope boundary
  is explicit: *"Script only ops with one correct answer… The script supplies the
  fact; the caller makes the call."* Opening-vs-not-opening a PR is a "call," so
  even this item keeps the decision with the human/agent, not the script.
- **`archive-requires-merged-pr`** (archived) — established the current archive
  flow, including the print-don't-run PR line, explicitly "mirroring how
  `/qrspi:pr` surfaces its PR-create line." So the pattern is a deliberate
  cross-stage convention, not an oversight.

## The decision to make

Is print-don't-run the intended UX for the archive **bookkeeping** PR, or should
archive be able to open it directly? Note this PR is low-stakes and mechanical
(folder move + delta→main spec sync + backlog row) and only ever runs **after the
feature PR has already merged** — which weakens the usual "don't auto-open PRs"
caution and is part of why the consumer expected auto-creation.

Options for a maintainer:

1. **Keep print-don't-run, document the rationale louder.** Add a one-line "why
   we print rather than open" note in `archive.md` step 5 and/or the `/qrspi:pr`
   convention, so the behavior reads as deliberate rather than as a missing step.
   Cheapest; changes nothing functionally.
2. **New opt-in idea: `auto-create-archive-pr`.** Add a backlog item to let
   `/qrspi:archive` open the bookkeeping PR itself (e.g. an extra AskUserQuestion
   choice "New branch + push **and open PR**", or a default flip), gated on the
   host CLI being present/authenticated, reusing the same title/body it currently
   prints. Consistent with `standardize-recurring-ops-scripts` if the PR-open is
   surfaced as an explicit human-selected option rather than a silent auto-run.
3. **Broaden to `/qrspi:pr` too.** If archive gets auto-open, decide whether the
   feature-PR stage (`/qrspi:pr`) should offer the same, to keep the two stages
   symmetric (they currently share the print-don't-run convention).

Recommendation: **option 1 + file option 2 as a P3 opt-in idea** — preserve the
current safe default, but capture the consumer's expectation so it's a tracked
choice rather than recurring surprise. Do not silently auto-open PRs; if added,
it should be an explicit selectable target.

## Pointers

- `claude/commands/archive.md` — step 5 (commit-target prompt + PR-create line)
- `claude/commands/pr.md` — the sibling print-don't-run PR-create convention
- `openspec/backlog.md` — `standardize-recurring-ops-scripts`,
  archived `archive-requires-merged-pr`
