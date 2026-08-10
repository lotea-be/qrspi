# Retrospective — archive-auto-create-pr / stage PR

> Generated 2026-08-10. Stage completed in commits 2f0ae36 (PR link),
> 4c407a4 (CHANGELOG fix), plus PR #48 opened.

## Friction observed

1. **No "fix a trivial in-scope blocking gap before opening" path.** The
   reviewer found one open issue — a missing `## [Unreleased]` CHANGELOG entry,
   which CLAUDE.md mandates for every feature change and which blocks release.
   The `pr.md` "Seed the follow-up queue" step routes *every* reviewer open
   issue to `followups.md` (post-PR) and the reviewer suggested opening a
   **draft** PR because the open-issues list was non-empty. But this issue was
   mechanical, in-scope, and must-fix-before-merge — deferring it to a post-PR
   followup would knowingly open a broken PR. I deviated from the command's
   letter and fixed the CHANGELOG in-stage, committed, then opened a normal PR.
   The command has no sanctioned branch for "triage the open issue; if it is a
   trivial in-scope gap that must be fixed before merge, fix it now instead of
   seeding a followup."

2. **Backlog note hardcodes "draft PR" regardless of draft-ness.** `pr.md`
   step "Record the PR link" (line 266) always sets the backlog note to
   `in-progress (draft PR #<N> open)`. The PR is only a draft when the reviewer
   found open issues (the draft convention); with zero open issues a *ready*
   (non-draft) PR is opened, making "draft PR" inaccurate. I wrote
   `in-progress (PR #48 open)` instead. The wording should be conditional on
   whether the PR was actually opened as a draft.

## Proposed edits

| # | File | Edit |
|---|------|------|
| 1 | `claude/commands/pr.md` (Seed the follow-up queue section, ~line 269) | Before seeding `followups.md`, add a triage line: for each reviewer open issue, if it is a trivial, in-scope gap that MUST be fixed before merge (a house-rule/doc gap such as a missing CHANGELOG `## [Unreleased]` entry required by the contributor-guidance file), fix it in-stage, commit atomically, and treat it as resolved — do NOT seed a followup or force a draft PR for it. Only genuinely post-PR-shaped issues (needing their own fix work) go to `followups.md`. |
| 2 | `claude/commands/pr.md` (Record the PR link, line 266) | Make the backlog note conditional on draft-ness: `in-progress (draft PR #<N> open)` only when the PR was opened as a draft (reviewer open issues remained); otherwise `in-progress (PR #<N> open)`. |

## Resolution

Both proposed edits were **not applied inline**. They touch
`claude/commands/pr.md` — off-scope for PR #48 (which only edits `archive.md`) —
and edit 1 is a *behavioural* change to the PR stage that deserves its own QRSPI
flow, not a drive-by in an unrelated PR. Both were captured together as backlog
idea `pr-stage-open-issue-triage` (P3), in the same retro commit.

## Deferred

- The retro command's step 6 references `./scripts/sync-agent-defs.ps1 -Pair
  <name>` and an agent/command "GitHub mirror", neither of which exists in this
  repo (single source of truth under `claude/`; only `scripts/*.mjs` exist).
  That is a `claude/commands/retro.md` / retrospective-skill staleness, out of
  scope for a PR-stage retro — capture separately.
