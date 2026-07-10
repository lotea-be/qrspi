---
description: Archive a completed QRSPI change after its PR has merged. Thin wrapper over OpenSpec's archive skill — moves the change folder under archive/ with a date prefix and syncs delta specs into the main specs.
agent: build
---

Archive a completed QRSPI change. This is the final step **after the PR has
merged** — it moves `openspec/changes/<id>/` into `openspec/changes/archive/`
with a date prefix and folds the change's delta specs into the main specs so
`openspec/specs/` reflects current truth.

This command is a thin QRSPI-namespaced entry point over OpenSpec's own
archive logic; the mechanics live in the generated `openspec-archive-change`
skill (do not hand-edit that skill — it is regenerated from the OpenSpec CLI).

Argument (optional): $ARGUMENTS — the change id (kebab-case). If omitted, the
skill will list active changes and prompt you to pick one.

Steps:

1. If `openspec/` does not exist, this repo was never bootstrapped — tell the
   user to run `/qrspi:init` first and stop.

2. **Sanity-check readiness before archiving.** Archival is meant for changes
   whose PR has merged. If `openspec/changes/<id>/` has a `followups.md` with
   un-ticked `- [ ]` boxes, surface that — those post-PR follow-ups should be
   resolved (`/qrspi:followup <id>`) before archiving. Inform, don't hard-block;
   the user may have a reason to proceed.

3. **PR-merge gate (hard-stop).** Archival is blocked unless the change's
   linked PR is verified merged. Unlike step 2's inform-only check, this step
   is a hard block: do not proceed to step 4 unless the PR is confirmed
   merged.
   - **Read the PR number.** Use the **Read** tool on
     `openspec/changes/<id>/pr.md` (use **Glob** first if you need to check
     existence without erroring on a missing file). If the file does not
     exist, hard-stop: tell the user to run `/qrspi:pr <id>` first to record
     the PR, and do not proceed to step 4. If it exists, extract the PR
     number: prefer the `#<N>` token on the `- **PR:** #<N>` line; if that
     line is missing or has drifted, fall back to a number parsed from a
     `URL:` or `PR link:` line (the trailing digits of a `.../pull/<N>`,
     `.../pulls/<N>`, or `.../merge_requests/<N>` URL). If no number can be
     extracted at all, show the human exactly what was found in `pr.md`,
     hard-stop, and ask them to fix it — never guess a number.
   - **Resolve the host CLI and status-query command.** If this repo has a
     project-scope stack-cheatsheet skill (discoverable via **Glob** pattern
     `.claude/skills/*-stack/SKILL.md`) whose `## PR & git workflow` section
     documents a PR-status-query line, use that CLI and command. Otherwise
     infer the host from repo signals: a GitHub remote or a `.github/`
     directory selects `gh`; `azure-pipelines.yml` selects `az repos`;
     `.gitlab-ci.yml` selects `glab`; default to `gh` when none of these
     signals match.
   - **Query the PR's live status.** Use the **Bash** tool to run the
     resolved status-query command against the extracted PR number at
     runtime (e.g. `gh pr view <N> --json state,url,number`,
     `az repos pr show --id <N>`, or `glab mr view <N>`) — this is a
     Bash-tool invocation, not literal shell-injection syntax in this file.
     Define "merged" per host: GitHub `state == MERGED`; Azure DevOps
     `status == completed`; GitLab `state == merged`. If the command fails
     because the CLI is not installed, or fails on an authentication error,
     hard-stop with an actionable message naming the fix instead of
     proceeding, e.g.: "Could not query PR #<N>: the `gh` CLI is unavailable
     or not authenticated. Run `gh auth login` (or the host equivalent), then
     re-run `/qrspi:archive <id>`." Never silently skip this check.
   - **Surface, then decide.** Always print the PR's number, state, and URL
     first, so the human sees the evidence before any decision. If the state
     is `merged` (per the host mapping above), proceed silently to step 4.
     For any other state (`open`, closed-unmerged, or anything else), hard-
     stop unconditionally — uniformly for `open` and closed-unmerged, with no
     override and no per-state softening:
     > PR #<N> for `<id>` is **<state>** (not merged): <url>
     > Archival is blocked until the PR merges. Merge PR #<N>, then re-run
     > `/qrspi:archive <id>`.

4. **Delegate to the archive skill.** Load and run the `openspec-archive-change`
   skill, passing the change id (or letting it prompt for selection). It checks
   artifact/task completion, assesses delta-spec sync state, moves the folder to
   `archive/YYYY-MM-DD-<id>/`, and prints the archive summary.

5. Relay the skill's completion summary to the user, including the archive path
   and whether specs were synced.

Repository signals you may use (to list in-flight and archived changes, use the
**Glob** tool with patterns `openspec/changes/*` and
`openspec/changes/archive/*` — do not shell out).
