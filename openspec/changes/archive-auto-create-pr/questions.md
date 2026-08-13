# Questions — archive-auto-create-pr

> Stage Q of QRSPI. Generated 2026-08-04.
> Change summary: Make `/qrspi:archive` actually create the archive PR on the "New branch + push" path, instead of only printing the host `gh pr create` command.

<!-- Surface-gated sections: emit each section below only when its
     controlling surface is present for this repo, per the repo-surface
     skill mapping. Omit the heading entirely when the surface is absent
     (no heading, no "Not applicable"). Surface-independent sections
     (Testing, Sequencing & scope, Open product questions) always appear.

     Surfaces present (from qrspi-stack ## Repo surface):
       slash-command  -> ## Slash-command surface
       stage-agent    -> ## Stage-agent surface
       skill          -> ## Skill surface
       lint-gate      -> ## Lint-gate surface
       template       -> ## Template surface
       migration-manifest -> ## Migration manifest

     data-store, http-api, ui, auth are absent -- their sections are omitted.
-->

## Slash-command surface

1. `claude/commands/archive.md` step 5's "New branch + push" path currently ends with printing the PR-create command and saying "do not run it automatically." What is the **exact prose** that must be replaced -- is it confined to the two sentences after the `git push -u` block, or does it extend into step 6's "New branch chosen" relay as well (which currently repeats the suggested PR-create command)?

2. `/qrspi:pr`'s PR-create step captures the PR number and URL from the CLI output and writes them to `pr.md` + `openspec/backlog.md`. The archive command does not produce or maintain a `pr.md` for itself (it is the archiver, not a feature change). Where should the archive PR number + URL be recorded after creation: only in the step-6 completion summary printed to the user, or also written to a file (e.g. the archived change's `pr.md` that it is about to move, or a new `openspec/changes/archive-<id>/archive-pr.md`)?

3. The current step 6 "New branch chosen" branch says "confirm the archive commit landed there and was pushed, and repeat the suggested PR-create command as the next step." After this change, step 6 should instead report the PR number + URL. Are there other places in step 6 text or step 7 text that must change -- specifically, does the "Offer a fresh session" wording need updating to reference the newly created PR?

4. The PR-create call in `/qrspi:archive` must produce a PR title and body. Does the archive PR warrant a generated body (e.g. listing what was archived, whether specs were synced, which backlog row was removed), or is a minimal single-line title sufficient (e.g. `chore(<id>): archive change + remove backlog row`) with no body?

5. The host CLI resolver in archive step 3 (for the PR-status query) and the one needed in step 5 (for the PR-create call) use the same detection logic. Should the resolver be called once and its result reused in both steps, or should each step independently re-derive the host CLI? (This is a prose-ordering / variable-scoping question within `archive.md`.)

6. When the `gh pr create` call fails (e.g. the CLI is unauthenticated, or the remote does not exist on the host), should the failure be a hard-stop (matching how archive step 3's CLI failure is handled), or should it degrade gracefully by printing the PR-create command for the human to run manually?

7. The archive branch is named `chore/archive-<id>`. The PR title and body need a target branch. Should the archive PR always target the repo's default branch (as the stack-cheatsheet `## PR & git workflow` block names it -- `main` for this repo), or should it be derived from the current HEAD's upstream at create time?

## Skill surface

8. `/qrspi:pr` resolves the host CLI from the stack-cheatsheet `## PR & git workflow` block inline (no separate skill). `archive.md` does the same thing in step 3. The `git-host-and-remote-awareness` idea (P2, Tier 1.6 runway) proposes centralizing this into a shared skill. **For this change**, should the PR-create resolver be: (a) added inline to `archive.md` (mirroring the current `/qrspi:pr` approach, no new skill), (b) extracted to a new shared skill that both `archive.md` and `pr.md` load, or (c) held as inline prose and noted in a follow-up for `git-host-and-remote-awareness` to centralize later?

9. If a shared PR-resolver skill is created (option b above), does it also absorb the PR-status-query resolver already in archive step 3, or does it cover PR-create only and leave the status-query resolver in place?

10. The `git-host-and-remote-awareness` backlog item explicitly says its shape includes "the `gh`/`az repos`/`glab` line from the stack-cheatsheet `## PR & git workflow` block, same resolver `/qrspi:pr` uses." Does this change need to implement the same multi-vendor fallback (`gh` / `az repos` / `glab`) that archive step 3 already implements, or is GitHub-only (`gh pr create`) acceptable as a scope boundary for this change (with the full multi-vendor centralization deferred to `git-host-and-remote-awareness`)?

## Lint-gate surface

11. Check 4 (README command-coverage lint) asserts that every `claude/commands/<stem>.md` is documented in `README.md`. `archive.md` is already documented. Does this change modify `archive.md`'s behavior enough that its README description needs updating, and if so, does Check 4 currently verify the *body* of the README description or only that the command name appears?

12. Does any existing lint check (Checks 1--22) assert anything about the step 5 prose in `archive.md` that would need to be updated when the "print-only" sentence is replaced with a PR-create invocation? (E.g., does any check scan for the literal phrase "do not run it automatically" or similar, or do the checks operate only on structural markers?)

13. The `backlog-writer` skill is referenced from `pr.md` (for the follow-up "Promote to backlog idea" path). If this change introduces any new shared skill for the PR-create resolver, does Check 2b (skill-set registry enforcement) need to be updated to include the new skill name?

## Template surface

14. The `openspec-templates/` folder contains artifact templates. Does the archive flow's `pr.md` format (written by `/qrspi:pr` after creating the PR) need a corresponding template, or is it fully defined by the command prose? If the archive creates its own PR record, does it write into a different location that would need a template?

## Testing

15. `node scripts/lint.mjs` is the only automated test harness. Are there any existing checks that exercise the `archive.md` command body (e.g. an embed-presence check asserting specific structural phrases exist in archive.md), and if so, would removing the "do not run it automatically" prose break any such check?

16. The PR-create call (`gh pr create`) is a Bash-tool invocation at runtime and cannot be exercised by the static lint script. The only test surface for archive's new PR-create behavior is the `(human)` dogfood checkpoint in `tasks.md`. Is there anything in the lint script that could assert the PR-create call site exists (e.g. a string-presence check for `gh pr create` in `archive.md`), or is the dogfood checkpoint the sole verification gate?

17. When `gh pr create` is called, its output format includes the PR URL on stdout. Does the command body need to parse the URL and extract the PR number from it (as `/qrspi:pr` does when writing `pr.md`), and if so, is the URL-to-number parsing logic documented anywhere in the existing commands (e.g. the format `https://github.com/<org>/<repo>/pull/<N>`)?

## Sequencing & scope

18. The `git-host-and-remote-awareness` idea (P2, Tier 1.6 runway head) is the directly related planned change. This change's short description says "the same resolver `/qrspi:pr` uses" -- should this change be **blocked on** `git-host-and-remote-awareness` landing first (so it can reuse the centralized resolver from day one), or should it proceed now inline and leave the centralization as the follow-up? What is the risk of proceeding now with inline prose if `git-host-and-remote-awareness` later extracts the resolver?

19. The `batch-archive-multiple-changes` idea (P3) archives multiple changes in one PR. Does this change's single-archive PR-create logic conflict with, or need to anticipate, the batch-archive design? Specifically, does the single-archive PR-create call need to be structured so that batch-archive can reuse it, or is it acceptable to implement naively and let batch-archive redesign the creation step?

20. The `README.md` documents the archive flow (the CLAUDE.md rule says keep the README current for command behavior changes). Is the print-only behavior explicitly documented anywhere in README's archive section, and if so, is updating the README in scope for this change?

21. Does `/qrspi:archive`'s step 2 (sanity-check for un-ticked `followups.md` boxes) or step 3 (PR-merge gate) need any changes as part of this work, or is the scope strictly confined to step 5's "New branch + push" branch and step 6's relay?

## Open product questions (for the human)

- [x] **PQ1 — mode-awareness gate shape:** `/qrspi:pr` has a Manual-mode "create now / show first" gate (`AskUserQuestion`: "Create the PR now" / "Show me the description first -- I'll create it manually"), and in Full/Semi auto it skips this and runs `gh pr create` directly. Should `/qrspi:archive`'s "New branch + push" path mirror this **exactly** -- a Manual-mode gate before creating, auto-create in Full/Semi -- or is a simpler approach acceptable (e.g. always create without a gate, since the "New branch + push" choice already implies intent to create a PR)? Options: (a) Mirror `/qrspi:pr` exactly -- Manual gate ("Create now" / "Show command first"), auto-create in Full/Semi auto (Recommended -- the two stages then behave identically on this dimension, which is the stated goal), (b) Always create without a mode gate -- the "New branch + push" AskUserQuestion already constitutes the human's consent; no second gate needed, (c) Always print and never auto-create -- preserve current behavior but as explicit policy (clearly conflicts with the change goal; included only as a scope boundary reference). **Answer: (a) Mirror `/qrspi:pr` exactly — Manual-mode gate ("Create now" / "Show command first"), auto-create in Full/Semi auto, so the two stages behave identically.**

- [x] **PQ2 -- PR record location:** After `/qrspi:archive` creates the archive PR, where should the PR number + URL be persisted beyond the completion summary? Options: (a) Completion summary only -- print `#<N>` and URL in step 6's relay; no file is written (the archive PR is operational bookkeeping, not a QRSPI artifact) (Recommended -- the archive PR has a different nature than the feature PR; writing it to `pr.md` of the change being archived would pollute that file with a different PR's data), (b) Append to the archived change's `pr.md` -- add a second `- **Archive PR:** #<N>` line so the history is complete; the archive PR is still associated with this change, (c) Write a new `openspec/changes/archive/<YYYY-MM-DD>-<id>/archive-pr.md` -- a sibling file to `pr.md`, tracking the archival event separately. **Answer: (a) Completion summary only — print `#<N>` + URL in step 6's relay; write no file. The archive PR is operational bookkeeping, not a QRSPI artifact.**

- [x] **PQ3 -- PR body content:** The archive PR needs a title (already defined as the commit message) and optionally a body. What should the PR body contain? Options: (a) No body -- title only (`chore(<id>): archive change + remove backlog row`); the commit message is self-explanatory and the PR is mechanical (Recommended -- consistent with how most archive PRs have been created manually), (b) Minimal body -- one-sentence description ("Archives change `<id>` (PR #<feature-PR-N>), syncing delta specs and removing the backlog row."), linking to the feature PR for traceability, (c) Full body -- list what was archived: change id, feature PR #, spec-sync status, backlog row removed, archive path. Note: if PQ2 picks option (b) or (c) (writing a record), this answer also determines what to persist. **Answer: (a) No body — title only (`chore(<id>): archive change + remove backlog row`); the PR is mechanical, consistent with manually-created archive PRs.**

- [x] **PQ4 -- resolver scope (inline vs. shared skill vs. full multi-vendor):** Should the PR-create resolver in this change reuse the same inline multi-vendor detection already in archive step 3 (`gh` / `az repos` / `glab` fallback), or should this change be scoped to GitHub-only (`gh pr create`) with the full multi-vendor resolver left for `git-host-and-remote-awareness`? Note: if PQ4 picks GitHub-only, this change is simpler but leaves non-GitHub consumers with a broken archive-PR step until `git-host-and-remote-awareness` lands. Options: (a) Reuse the same multi-vendor resolver already in archive step 3 -- the detection logic already exists in the command body; just apply it to the PR-create call as well (Recommended -- no new code; the change is consistent with existing behavior), (b) GitHub-only (`gh pr create`) -- scope this change narrowly; non-GitHub consumers still get an error message, (c) Extract to a shared skill now -- this change becomes the first step of `git-host-and-remote-awareness`, landing the resolver as a new shared skill that both `archive.md` and `pr.md` load. Note: PQ4(c) materially increases scope and may warrant treating this as a bundle rather than a standalone fix. **Answer: (a) Reuse the same multi-vendor resolver already in archive step 3 (`gh` / `az repos` / `glab` fallback) for the PR-create call — no new code, consistent with existing behavior; full centralization stays deferred to `git-host-and-remote-awareness`.**

- [x] **PQ5 -- README update scope:** The CLAUDE.md rule says to update the README in the same change that alters documented command behavior. Does the README currently document the print-only behavior of archive step 5, and if so, is updating it in scope for this change? Options: (a) Confirm README update is in scope -- read the README, find and update any prose describing archive step 5's print-only behavior, in the same PR (Recommended -- the CLAUDE.md rule is explicit: "Update README/archive-flow prose if it documents the print-only behaviour"), (b) README update is out of scope -- no README prose currently documents this detail at the step level; Check 4 only verifies command name coverage, not step-level prose, (c) Defer to a follow-up -- update the README in a separate commit after this PR merges. Note: option (c) violates the CLAUDE.md "in the same change" rule, so it is only viable if the README genuinely has no step-level prose to update. **Answer: (a) README update is in scope — read the README, find and update any prose describing archive step 5's print-only behavior, in this same PR, per the CLAUDE.md rule.**
