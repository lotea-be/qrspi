# Questions — archive-requires-merged-pr

> Stage Q of QRSPI. Generated 2026-07-08.
> Change summary: `/qrspi:archive` currently moves a change folder under
> `archive/` unconditionally. Before archiving, check the linked PR's actual
> status (via the project's git-host CLI) and only proceed when it is
> `merged`; otherwise stop and surface the state. On a successful archive,
> also sync the change's `openspec/backlog.md` row so the backlog and the
> archive folder stay in sync.

This is a **kit-design change** to a QRSPI stage command (`claude/commands/archive.md`)
and its backlog-sync convention, NOT a CRUD data feature. The standard Data
model / Indexing / API / UI / Front-end state / Migrations sections are
therefore **Not applicable** — kept as headings so stage S does not
re-litigate — and replaced with sections that fit a workflow/tooling change,
mirroring `openspec/changes/archive/2026-07-06-add-auto-mode/questions.md`.

## Data model — Not applicable

No entities/tables/DTOs. The closest analogue is the shape of
`openspec/changes/<id>/pr.md` (already written by `/qrspi:pr` — see below)
and the shape of a backlog row in `openspec/backlog.md`.

## Indexing & query performance — Not applicable

## API surface — Not applicable

No HTTP surface owned by this repo. The closest analogue is the **host git
CLI's PR-query API** (`gh pr view --json state,mergedAt,...`, or the
equivalent for Azure DevOps / GitLab) invoked at runtime via the Bash tool —
covered under "PR-status detection" below.

## UI — Not applicable

No UI. The closest analogue is the command's stdout summary / stop message
when a PR isn't merged, and any AskUserQuestion prompts it introduces —
covered under "Stop / block behavior" below.

## Front-end state — Not applicable

## Migrations & data — Not applicable

No data-store migration. The analogue is the edit this change makes to
`openspec/backlog.md`'s row-lifecycle convention — covered under "Backlog
sync on archive" below.

---

## PR-status detection

1. **Source of the PR reference.** `/qrspi:pr` (`claude/commands/pr.md`)
   already writes `openspec/changes/<id>/pr.md` with `PR: #<N>`, `URL:
   <url>`, `Source branch:`, `Target branch:`, `Created:`. Confirm this file
   is the authoritative source the archive check reads from (rather than,
   say, re-deriving the PR number by searching the host for a PR matching
   the branch name).
2. **What if `pr.md` doesn't exist?** A change can reach `/qrspi:archive`
   without ever having a recorded PR link if: (a) it took the "trivial
   change, skip to `/qrspi:implement`" shortcut described in
   `qrspi-workflow`'s "When you can skip stages"; (b) it predates this
   change's `pr.md` convention; (c) the PR-create step was skipped ("Show me
   the description first" branch in `pr.md`, which explicitly does not write
   `pr.md`). Enumerate the intended behavior for each case — see PQ1.
3. **What CLI/command performs the status query?** `claude/commands/pr.md`
   generalizes PR-*creation* across git hosts via the project's
   stack-cheatsheet "PR & git workflow" section (`gh pr create`, `az repos pr
   create`, `glab mr create`). Does the merge-status *query* need the same
   per-project generalization (e.g. `gh pr view <n> --json state,mergedAt`,
   `az repos pr show --id <n>`, `glab mr view <n>`), or is GitHub (`gh`) the
   only host this change targets for now? See PQ4.
4. **What field(s) determine "merged"?** For GitHub, `gh pr view --json
   state,mergedAt` returns `state` of `OPEN` / `CLOSED` / `MERGED` (mergedAt
   is non-null only when merged). Confirm the exact field(s) to check and
   that a `CLOSED` PR with `mergedAt` null is treated as "closed unmerged"
   distinct from "merged" (a squash-merge still reports `state: MERGED`, so
   `state` alone should suffice for GitHub — confirm no edge case needs
   `mergedAt` as well, e.g. a PR merged then later force-pushed/reverted).
5. **Multiple or stale PRs.** If the PR recorded in `pr.md` was closed
   unmerged and a *new* PR was later opened for the same change (re-opened
   after review feedback, or a rebase-and-recreate), `pr.md` still points at
   the stale, closed PR. Is updating `pr.md` when a new PR is created in
   scope for this change, or is that a pre-existing gap in `/qrspi:pr` that
   stays out of scope here (the archive check would then correctly report
   "not merged" for the stale PR, which is technically correct but
   potentially confusing)?
6. **Where does this check run relative to the existing archive.md steps?**
   Today `claude/commands/archive.md` has: (1) `openspec/` existence check,
   (2) followups.md sanity check (soft, informational), (3) delegate to the
   generated `openspec-archive-change` skill. Confirm the PR-merge check
   becomes a new step *before* the skill delegation (see PQ6 for why it
   can't live inside the generated skill itself), and confirm its ordering
   relative to the existing followups.md check (before, after, or
   independent/parallel).

## Stop / block behavior

7. **Hard-stop vs. soft-block-with-override.** The existing followups.md
   check in `archive.md` step 2 is explicitly "inform, don't hard-block" —
   it warns and lets the user proceed anyway. The ticket's wording ("only
   proceed when it's `merged`; otherwise stop and surface the state") reads
   more like an unconditional hard-stop. Confirm which pattern applies, and
   whether it's uniform across all non-merged states or varies by state
   (open vs. closed-unmerged) — see PQ2.
8. **What does "surface the state" print?** At minimum the PR number, its
   current state (open / closed-unmerged), and its URL, so the human can
   act (merge it, or explicitly override). Confirm the message also names
   the exact next step the human should take (e.g. "merge PR #12, then
   re-run `/qrspi:archive <id>`").
9. **Retry ergonomics.** After a stop, the human merges the PR out-of-band
   and re-runs `/qrspi:archive <id>`. Confirm no state from the aborted
   attempt needs cleanup (the check should be idempotent/side-effect-free
   until the merge check actually passes).
10. **CLI/auth unavailable.** If the host CLI (`gh`, `az`, `glab`) is not
    installed or not authenticated, the status query itself fails before it
    can report a state. Is this a hard-stop with an actionable message
    ("run `gh auth login`"), the same soft-block pattern as PQ7, or does the
    check get silently skipped (defeating the change's purpose)? See PQ7.

## Backlog sync on archive

11. **What does "flip status to `merged`" mean given the existing
    convention?** The `qrspi-workflow` skill's "Before Q — the backlog"
    section already states: "update the matching row whenever a change is
    proposed, merged, or archived (**remove archived rows** — the
    `openspec/changes/archive/` folder is the source of truth for completed
    work)." The ticket's wording ("flip status to `merged` / move it out of
    'In progress'") could mean either (a) an intermediate `merged` status
    label that a *separate* step later removes, or (b) the ticket author
    intends *removal* and used "flip to merged" loosely as shorthand for
    "make it reflect completion." Confirm the intended end-state — see PQ3.
12. **Is row removal itself already mechanically owned by any existing
    command?** Search the `## In progress` section lifecycle
    (`## Ideas` → `## Proposed` → `## In progress`, per `implement.md`'s
    final-slice edit) — no current command removes a row on completion.
    Confirm `/qrspi:archive` becomes the first (and only) place that
    removes an `## In progress` row, closing that lifecycle gap.
13. **`pr.md`'s in-progress backlog note.** `claude/commands/pr.md` sets the
    row's backtick note to `in-progress (draft PR #<N> open)`. If PQ3
    resolves to "remove the row on archive," confirm no intermediate
    `merged` label is ever written — the row simply disappears in the same
    commit as the folder move. If PQ3 resolves to "flip to `merged` first,"
    define the exact backtick text (e.g. `` `merged (archived YYYY-MM-DD)` ``)
    and whether/when a follow-up removes it.
14. **Atomic commit.** Per `qrspi-workflow`'s backlog-atomicity rule, the
    backlog edit must land in the **same commit** as the archive move
    (`git mv openspec/changes/<id> openspec/changes/archive/YYYY-MM-DD-<id>`
    + `openspec/backlog.md`). Confirm the archive skill's existing `mv`
    step and this change's backlog edit are staged and committed together,
    not as two commits.
15. **Interaction with `backlog-prioritization` (idea, not yet built).**
    That backlog item's *Why* names this change's archive-triggered backlog
    edit as "a natural trigger point to offer the reprioritization pass"
    once it exists. Does this change need to leave any hook/seam for that
    future offer, or is nothing required here (the future change can wire
    itself into the same archive step without this change anticipating it)?
    See PQ8.

## Auth & tooling availability

16. **Node vs. shell constraint.** CLAUDE.md prohibits `!`-prefixed
    shell-injection auto-run syntax *inside slash-command markdown bodies*
    (a static-parse concern, e.g. `!\`gh pr view ...\`` written literally in
    `archive.md`). That is distinct from the agent invoking the **Bash
    tool** at runtime to run `gh pr view ...` (the same pattern `pr.md`
    already uses for `git status --short`). Confirm the PR-status query is
    implemented as a Bash-tool call at runtime, not as literal shell-out
    syntax in the command file, so no CLAUDE.md violation is introduced.
17. **Runtime-helper-ships-to-consumers concern.** The
    `standardize-recurring-ops-scripts` backlog item flags that a shipped
    Node helper invoked at runtime (unlike `scripts/lint.mjs` /
    `sync-copilot.mjs`, which only run in *this* repo's CI) ships into every
    consumer repo and inherits their `gh`/auth availability and
    cross-platform concerns. If this change inlines the check directly in
    `archive.md` (PQ5 option a), this concern doesn't apply yet; if it
    builds a shared helper now (PQ5 option b), this constraint governs the
    helper's design (Node, not shell; graceful failure when the CLI/auth is
    missing).

## Blast radius (affected files)

18. **Which files change?** Enumerate and confirm completeness:
    - `claude/commands/archive.md` — new PR-status-check step before
      delegating to the generated skill; new stop/surface-state behavior;
      new backlog-sync step after a successful archive.
    - `claude/skills/openspec-archive-change/SKILL.md` — confirmed
      **out of scope for hand-edits** (regenerated from the OpenSpec CLI,
      like `copilot/`). The PR check must live entirely in `archive.md`'s
      own steps, wrapping the skill delegation rather than modifying it.
    - `claude/skills/qrspi-workflow/SKILL.md` — if PQ3 resolves to "remove
      the row on archive" as the settled convention (rather than an
      unwritten implication), does its "Before Q — the backlog" wording
      need a forward-reference to `/qrspi:archive` as the command that
      performs the removal?
    - `openspec/backlog.md` — this change's own row flips `idea` → `proposed`
      in this Q stage's commit (per QRSPI stage-9 duty).
    - `copilot/prompts/qrspi-archive.prompt.md` — regenerated by
      `node sync-copilot.mjs` from the updated `claude/commands/archive.md`;
      confirmed as a blast-radius item, not hand-edited.
    - README.md — no stage/command list changes expected (archive already
      exists as `/qrspi:archive`); confirm no prose describes today's
      unconditional-move behavior that would go stale.
19. **Does `claude/agents/reviewer.md` or `pr.md` need any change?** Neither
    currently records anything this change would consume beyond the existing
    `pr.md` fields (PQ1) — confirm no new field needs to be added to `pr.md`
    at PR-creation time to support the later merge check (e.g. nothing
    extra beyond PR number is required; the state is always queried live at
    archive time, not cached).

## Copilot parity & sync

20. **Zero-drift requirement.** Confirm the acceptance criteria include
    `node sync-copilot.mjs --check` exiting 0 after this change, with the
    regenerated `copilot/prompts/qrspi-archive.prompt.md` committed as part
    of the PR (same pattern as every prior command-body change).
21. **Does Copilot's runtime support the same Bash-tool PR-status query?**
    If the Copilot port's execution model differs (per the open
    `reassess-copilot-port` question), does this change need to special-case
    anything for Copilot, or does the mechanical sync produce a working
    (if unverified) analogue and the port-quality question stays with
    `reassess-copilot-port`?

## Testing & verification

22. **How is "the check actually blocks an unmerged PR" verified?** This is
    runtime behavior (an AskUserQuestion/stop is not something a lint check
    can assert). Candidates: (a) a manual dogfood walk — open a real PR for
    a throwaway test change, run `/qrspi:archive` while it's still open and
    confirm the stop fires, merge it, re-run and confirm the archive
    proceeds; (b) exercising the closed-unmerged case similarly; (c) both;
    (d) additionally, a `scripts/lint.mjs` check asserting `archive.md`
    references the PR-status step (weak — can't verify actual gh-CLI
    behavior statically).
23. **Does this change need new fixture/test-change scaffolding**, or does
    the existing `example-greeting` reference change (used elsewhere for
    dogfooding) already have a merged PR that can double as the "already
    merged, archive proceeds" case, requiring only a fresh throwaway
    open/closed-PR case for the negative paths?

## Sequencing & scope

24. **Relationship to `standardize-recurring-ops-scripts`.** That item names
    this change as a "direct enabler" and expects "the first one or two
    helpers worth extracting fall out naturally" *after* this change and
    `pr-review-open-tasks-and-followups` land. Confirm this change should
    implement the check inline (not pre-build the generalized helper) so
    that extraction backlog item stays meaningful — see PQ5.
25. **Relationship to `pr-review-open-tasks-and-followups`.** That item adds
    a pre-PR-creation review pass (open `tasks.md`/`followups.md` items)
    at the **PR stage**, before a PR exists. This change's check happens at
    the **archive stage**, after a PR exists and (hopefully) merged. Confirm
    there's no ordering dependency between the two — they touch different
    stages and can land in either order.
26. **Relationship to `backlog-prioritization`.** See Q15/PQ8 — confirm this
    change does not need to build the reprioritization-offer trigger itself,
    only (optionally) leave the seam.
27. **Scope guard.** Confirm this change is limited to: the PR-merge check +
    stop/surface behavior + the backlog row sync on successful archive —
    and does not fold in the generalized ops-helper extraction, the
    reprioritization trigger, or the pre-PR open-tasks review pass. Those
    stay separate backlog items.

---

## Open product questions (for the human)

- [x] **PQ1 — Missing `pr.md` handling:** If `openspec/changes/<id>/pr.md`
  doesn't exist when `/qrspi:archive <id>` is run (trivial change that
  skipped the PR stage, an old change predating this convention, or the PR
  stage's "show me the description first" branch that never wrote it), how
  should archive respond? Options: (a) hard-block — refuse and tell the
  user to record the PR via `/qrspi:pr` first; (b) soft warn + confirm,
  matching the existing followups.md pattern in `archive.md` step 2,
  letting the human proceed anyway; (c) prompt the human interactively for
  a PR number/URL to check for this run only, without writing it back to
  `pr.md`.
  **Answer: (a) hard-block — if `pr.md` is missing, refuse and tell the
  user to record the PR via `/qrspi:pr` first.**
- [x] **PQ2 — Hard-block vs. soft-block when not merged:** When `pr.md`
  exists but the linked PR isn't `merged`, should the command: (a)
  hard-block unconditionally, no override — matches the ticket's literal
  "otherwise stop"; (b) soft-block with confirm-to-override, matching the
  existing followups.md pattern; (c) hard-block for "still open" (nothing
  to archive yet) but soft-block+confirm for "closed unmerged" (the human
  may deliberately want to archive an abandoned change's artifacts).
  **Answer: (a) hard-block unconditionally, no override — but first *fetch
  and surface* the PR's actual status (number, state, URL) so the human
  sees why it stopped. The status query runs, its result is displayed, and
  only then does a non-`merged` state hard-stop. Uniform across open and
  closed-unmerged (no per-state softening).**
- [ ] **PQ3 — Backlog outcome on archive:** What happens to the change's row
  in `openspec/backlog.md` on a successful archive? Options: (a) flip the
  row's status backtick to `merged` and leave the row in place, per the
  ticket's literal wording — note this contradicts `qrspi-workflow`'s
  stated convention ("remove archived rows — the archive folder is the
  source of truth"); (b) remove the row entirely, matching that existing
  documented convention (treating "flip to merged" as the ticket author's
  shorthand for "reflect completion," not a literal intermediate label);
  (c) flip to `merged` now, with row removal deferred as a separate,
  later manual/automated cleanup. If (b), `qrspi-workflow`'s "Before Q" text
  may need a forward-reference naming `/qrspi:archive` as the row-removal
  owner (Q11/Q12/Q13 depend on this answer).
  **Answer: (b) remove the row entirely on successful archive — matching
  `qrspi-workflow`'s documented "remove archived rows" convention. No
  intermediate `merged` label is ever written; the row disappears in the
  same commit as the folder move (resolves Q11→removal, Q13→no `merged`
  backtick). `qrspi-workflow`'s "Before Q — the backlog" wording should
  gain a forward-reference naming `/qrspi:archive` as the row-removal owner
  (Q12 — this becomes the first/only command that removes a completed row).**
- [ ] **PQ4 — Git-host CLI generalization:** `pr.md`'s PR-*creation* step
  already generalizes across hosts via the stack-cheatsheet's "PR & git
  workflow" section (`gh pr create` / `az repos pr create` / `glab mr
  create`). Should the merge-*status query* use that same per-project
  generalization, or is this change scoped to GitHub (`gh pr view`) only
  for now? Options: (a) generalize immediately — read the status-query
  command from the stack-cheatsheet, adding a parallel line next to the
  existing PR-create line; (b) GitHub-only for now, documented as a known
  limitation for non-GitHub hosts; (c) generalize later, in a follow-up.
  This answer feeds directly into PQ5 (an inline check is simpler if
  GitHub-only; a generalized query is a stronger case for extracting a
  helper).
  **Answer: (a) generalize immediately — read the status-query command from
  the project's stack-cheatsheet "PR & git workflow" section, adding a
  parallel status-query line (`gh pr view` / `az repos pr show` / `glab mr
  view`) next to the existing PR-create line, so the merge check stays
  host-agnostic in step with `pr.md`.**
- [ ] **PQ5 — Inline check vs. extracted helper now:** `standardize-recurring-ops-scripts`
  (P2 idea) explicitly proposes extracting "does the linked PR show merged?"
  into a shared Node helper and names this change as the direct enabler,
  saying the first helper(s) worth extracting "fall out naturally" once
  this change and `pr-review-open-tasks-and-followups` land. Should this
  change (a) implement the check inline in `archive.md` (a Bash-tool call
  to the host CLI, mirroring how `pr.md` already runs `git status --short`),
  leaving generalized-helper extraction to `standardize-recurring-ops-scripts`;
  or (b) build the Node helper now, front-running that backlog item?
  **Answer: (a) implement inline in `archive.md` as a Bash-tool call to the
  host CLI, mirroring `pr.md`'s `git status --short`. Do NOT build a Node
  helper now — reusable-helper extraction stays with the
  `standardize-recurring-ops-scripts` backlog item. Keeps the
  runtime-helper-ships-to-consumers concern (Q17) out of scope for this
  change.**
- [ ] **PQ6 — Where the check lives given the generated-skill constraint:**
  `openspec-archive-change` is an auto-generated skill (regenerated from the
  OpenSpec CLI's template, like `copilot/`) that must not be hand-edited.
  Confirm the PR-merge check is implemented entirely as new steps in
  `claude/commands/archive.md` itself, running *before* it delegates to the
  generated skill — i.e. confirm there is no alternative mechanism intended
  (this seems structurally forced by the do-not-hand-edit constraint, but
  flagging it as a product decision in case a different wrapper point is
  preferred).
  **Answer: Yes — confirmed. The PR-merge check lives entirely as new steps
  in `claude/commands/archive.md`, running before it delegates to the
  auto-generated `openspec-archive-change` skill. No alternative mechanism;
  the generated skill is not hand-edited.**
- [ ] **PQ7 — CLI/auth unavailable:** If the host CLI (`gh`/`az`/`glab`) is
  not installed or not authenticated when the status query runs, how should
  archive respond? Options: (a) hard-stop with an actionable message (e.g.
  "run `gh auth login`, then retry"); (b) the same soft-block+confirm
  pattern chosen for PQ2; (c) skip the merge check with a loud warning if
  the CLI is unavailable (note: this defeats the change's purpose and is
  probably not intended — included only for completeness).
  **Answer: (a) hard-stop with an actionable message (e.g. "the `<cli>` CLI
  is unavailable / not authenticated — run `gh auth login` (or the host
  equivalent), then re-run `/qrspi:archive <id>`"). Never silently skip the
  check.**
- [x] **PQ8 — Reprioritization-trigger seam:** `backlog-prioritization`'s
  *Why* names this change's archive-triggered backlog edit as "a natural
  trigger point to offer the reprioritization pass" once that item is
  built. Does this change need to leave any hook/seam in `archive.md` for
  that future offer (e.g. a comment marking where it would plug in), or is
  nothing required now (the future change can wire itself into the same
  step without anticipation)?
  **Answer: Nothing required now — add no seam/marker. The future
  `backlog-prioritization` change wires its reprioritization offer into the
  archive step when it's built. Avoids speculative scaffolding (resolves
  Q15/Q26 — no trigger built here).**
