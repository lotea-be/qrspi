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

Load skill `context-budget-gate` and follow its instructions exactly.

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

4a. **Sync the delta specs into the base specs (command-owned, before the
   folder move).** This runs by default — there is **no** "Sync now / Archive
   without syncing" prompt on the happy path.
   - **Skip when there is nothing to sync.** Use the **Glob** tool with pattern
     `openspec/changes/<id>/specs/**/spec.md`. If it returns nothing, skip step
     4a entirely and go straight to step 4 (the folder move). Do not spawn
     `spec-syncer`.
   - **Spawn `spec-syncer`.** When delta specs are present, spawn the
     `spec-syncer` helper via the **Agent tool**
     (`subagent_type: qrspi:spec-syncer`, `model: opus`), passing the change id.
     It owns the authoritative MODIFIED = wholesale-replacement merge contract
     and folds the delta specs into `openspec/specs/**`. It returns **exactly
     one** structured signal — `synced`, `blocked-on-count-drop`, or
     `escape-hatch` — and never prompts the human itself (it holds no
     AskUserQuestion). Branch on that signal:
   - **`synced`** — the merge succeeded (or there was nothing to merge). Proceed
     directly to step 4 (the folder move). Do **not** show any sync prompt.
   - **`blocked-on-count-drop`** — at least one MODIFIED requirement would
     reduce its scenario count (wholesale replacement would silently drop base
     scenarios). This is a **hard-stop**: the base spec is untouched and you
     MUST NOT proceed to the folder move while any count-drop block is
     unresolved. Surface the blocked requirement(s) and their `<pre> -> <post>`
     counts, then use the **AskUserQuestion** tool, once per blocked
     requirement (or grouped if several):
     - question: "Syncing `<id>` would reduce requirement `<Foo>` from `<pre>`
       to `<post>` scenarios (MODIFIED replaces the base wholesale). Is that
       intentional?"
     - choices:
       - "Yes — the reduction is intentional (re-sync)"
       - "No — abort the archive so I can fix the delta"
     - On **Yes**, **re-spawn `spec-syncer` from scratch** (same Agent-tool
       call) with a `confirmed count-drop OK: <Foo>` flag naming the confirmed
       requirement(s). The re-spawn carries no partial merge state — it
       re-derives the full merge and skips the guard for the named
       requirement(s) only. Only proceed to step 4 once the re-spawn returns
       `synced`. If the re-spawn returns `blocked-on-count-drop` again for a
       *different* requirement, repeat this confirmation flow for that one.
     - On **No**, **halt the archive** — do not run the folder move. The change
       folder and base specs remain unchanged. Tell the user to fix the delta
       (repeat the missing scenarios verbatim in the MODIFIED block) and re-run
       `/qrspi:archive <id>`.
   - **`escape-hatch`** (malformed delta / abandoned change) — the delta failed
     `openspec validate <id> --strict` or is otherwise malformed such that a
     merge would corrupt the base spec. No base specs were modified. Surface the
     failure description, then use the **AskUserQuestion** tool:
     - question: "The delta for `<id>` is malformed and could not be synced:
       <failure>. How do you want to proceed?"
     - choices:
       - "Archive without syncing (escape hatch)"
       - "Abort to fix the delta"
     - On **Archive without syncing**, proceed to step 4 (folder move) with the
       base specs left un-synced. On **Abort**, halt without the folder move.
     - This escape-hatch prompt appears **only** in response to the
       `escape-hatch` signal — never on a `synced` result (happy path) and never
       on a `blocked-on-count-drop` result (which uses the count-drop
       confirmation flow above instead).

   Respect the Non-Goal: do **not** hand-edit the generated
   `openspec-archive-change` skill or the generated `openspec-sync-specs`
   skill — the merge contract lives in the `spec-syncer` agent, not in those
   generated files.

4. **Delegate to the archive skill (folder move only).** Load and run the
   `openspec-archive-change` skill, passing the change id (or letting it prompt
   for selection). It checks artifact/task completion, assesses delta-spec sync
   state, moves the folder to `archive/YYYY-MM-DD-<id>/`, and prints the archive
   summary.
   - **Already-synced bypass (mandatory).** Step 4a has **already** merged the
     delta specs into `openspec/specs/**`, so the base spec is up to date before
     this skill runs. The skill's own sync-assessment must therefore take its
     **already-synced** branch and NOT offer a re-sync. If the skill nonetheless
     raises a sync prompt post-4a (e.g. "Sync now" / "Sync anyway"), **hard-
     decline it** — do NOT accept "Sync anyway" and do NOT let it run a second
     sync. No second `spec-syncer` or `general-purpose` sync spawn may occur;
     syncing the base spec twice would double-apply the merge. Take only the
     folder move from this skill.

5. **Remove the backlog row, propose the commit target, and commit the
   archive (mandatory).** The skill in step 4 only moves the folder on disk;
   it never touches git or `openspec/backlog.md`. This step finishes the job
   with the archive flow's first-ever explicit commit, so the folder move
   and the backlog-row removal land together atomically. Because this step
   runs after the PR has merged (the human is typically sitting on `main`)
   and the archive syncs the change's delta specs into `openspec/specs/` — a
   reviewable content change, not silent bookkeeping — it also asks where
   that commit should land rather than pushing it straight to the current
   branch.
   - **Remove the backlog row.** Edit `openspec/backlog.md` and delete the
     `<id>` row's heading and body entirely — the row disappears rather than
     flipping to a `merged` status, because the dated `archive/` folder from
     step 4 is now the source of truth for this completed work.
   - **Stage explicit paths only, never `git add -A`** (the canonical *commit
     step* in skill `workflow` applies). The skill in step 4 used a plain
     `mv`, not `git mv`, so nothing is staged yet: `git add` both the new
     archived path (from the archive summary in step 4) and the now-deleted
     old change path so the deletion is staged too, alongside the backlog
     edit:
     ```
     git add openspec/changes/archive/<YYYY-MM-DD>-<id>/ openspec/changes/<id>/ openspec/backlog.md
     ```
   - **Propose the commit target (always shown — not a suppressible
     confirmation).** Use the **AskUserQuestion** tool:
     - question: "Where should the archive commit land?"
     - choices:
       - "New branch + push (open a PR)" — **default / recommended**
       - "Commit straight to main"
   - **New branch + push (the default).** Create `chore/archive-<id>` off
     the current HEAD — the staged changes carry over onto the new branch —
     commit them with the unchanged message, then push with `-u`:
     ```
     git checkout -b chore/archive-<id>
     git commit -m "chore(<id>): archive change + remove backlog row"
     git push -u origin chore/archive-<id>
     ```
     Then surface the project's PR-create command (the host CLI named in
     its stack-cheatsheet — e.g. `gh pr create` or `az repos pr create`) as
     the suggested next step, mirroring how `/qrspi:pr` surfaces its
     PR-create line. Do not run it automatically — just print it.
   - **Commit straight to main.** Commit and push on the current branch —
     the same commit as the new-branch path, just without the intermediate
     `git checkout -b`, and no PR-create suggestion follows:
     ```
     git commit -m "chore(<id>): archive change + remove backlog row"
     git push
     ```
   - **On any non-zero exit from `git checkout -b`, `git commit`, or `git
     push` in either path,** this is a hard-stop (see the *hard-stop
     procedure* in skill `workflow`): surface the git error verbatim and
     stop here — do not proceed to step 6, and do not retry silently. The
     tree is now moved-but-uncommitted; say so explicitly so the human
     knows to resolve it before re-running.

6. Relay the skill's completion summary to the user, including the archive
   path, whether specs were synced, confirmation that the backlog row was
   removed, and which commit target was chosen (or the git error, if step 5
   hard-stopped):
   - **New branch chosen:** name the branch (`chore/archive-<id>`), confirm
     the archive commit landed there and was pushed, and repeat the
     suggested PR-create command as the next step.
   - **Main chosen:** confirm the archive commit landed and was pushed on
     the current branch, with no new branch created.

7. **Offer a fresh session for the next change (never suppressed).** After the
   completion summary in step 6, always present this offer -- it is not
   suppressible by run-mode (Full auto, Semi-auto, or Manual). Use the
   **AskUserQuestion** tool:
   - question: "Start a new session for the next change?"
   - choices:
     - "Yes -- print resume path and end turn"
     - "No -- stay in this session"
   - **On "Yes -- print resume path and end turn":** print the following
     one-liner and **end the turn without auto-advancing**:
     ```
     Run /clear, then /qrspi:status to see what is next -- the change folder on disk is the truth.
     ```
   - **On "No -- stay in this session":** end the turn normally. No resume
     path is printed.

Repository signals you may use (to list in-flight and archived changes, use the
**Glob** tool with patterns `openspec/changes/*` and
`openspec/changes/archive/*` — do not shell out).

> Resolve `openspec/changes/<id>/…` against the **current working repo root** (the consumer's CWD), not the plugin install directory — the change folder lives in the repo you are running the command in.
