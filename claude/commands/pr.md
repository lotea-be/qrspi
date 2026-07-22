---
description: QRSPI stage PR. Delegates to the reviewer subagent (read-only) to draft the pull request description, run a final checklist, and flag anything that looks off.
---

You are running QRSPI stage **PR (Pull Request)** for the current project.

Change id: $ARGUMENTS

Read or establish the run-mode by following the **Run-mode** procedure in
skill `workflow` before doing any other work.

Precondition: `openspec/changes/<id>/tasks.md` exists and the working
tree is clean (no uncommitted changes outside of the change folder
updates). **This stage's precondition has two parts** (the canonical
*precondition check* in skill `workflow` covers the file gate; the
clean-tree gate is unique to PR). The "all boxes ticked" condition is
enforced by the tasks pass below -- the precondition no longer hard-stops
on un-ticked boxes:

1. Use the **Glob** tool with pattern `openspec/changes/$ARGUMENTS/tasks.md`
   to confirm the file exists. If Glob returns nothing, refuse and tell
   the user to start from `/qrspi:questions`.
2. Use the **Bash** tool to run `git status --short` and confirm the
   working tree is clean (or that any remaining changes are inside the
   change folder). Do not Glob this — `git status` is not on the default
   allow-list and the harness's obfuscation guard blocks brace+quote shapes.

## Tasks pass (reconciliation gate)

After the precondition passes, run the tasks pass before spawning the
reviewer. Read `openspec/changes/<id>/tasks.md` and enumerate every line
matching `- [ ]` (un-ticked). Separate them into two lists:
- **Regular tasks** -- lines that do NOT contain the `(human)` tag.
- **Human tasks** -- lines that contain `(human)` in the task text.

Let R = count of regular un-ticked tasks, H = count of un-ticked `(human)`
tasks, M = R + H total open items.

**Mode-awareness.** The tasks pass is mode-aware:

- **Full or Semi-auto, M = 0:** suppress the banner silently and skip
  directly to the follow-ups pass. Do NOT display any "0 open" message.
- **Full or Semi-auto, M > 0:** this is a **hard-stop** (see the Hard-stop
  procedure in skill `workflow`). Display the count banner below and run the
  per-item gate. Do NOT auto-advance past the gate; the user must resolve
  each open item interactively. The auto chain is halted until all items
  are resolved or the user chooses to exit (Pause / Stop here).
- **Manual:** always display the banner, including the "0 open" variant.

**Count banner.** Display before the per-item loop (always in Manual; in
Full/Semi-auto only when M > 0):

> Tasks pass: found R open task(s) and H `(human)` box(es) awaiting
> confirmation (M total). Reviewing each now.

If M = 0 in Manual mode, display instead:

> Tasks pass: 0 open tasks -- nothing to resolve. Continuing.

Then skip the loops below and proceed to the follow-ups pass.

**Regular-task loop** (for each of the R regular un-ticked tasks, in
file order -- `(i of R)` counter):

Read the parent `## N. <slice>` heading for context (scan upwards from
the task line). Use the **AskUserQuestion** tool:

- question: "Task N.M -- `<task text>` (slice: <parent heading>) is not
  ticked. (i of R) What would you like to do?"
- choices: ["Finish it now", "Drop -- no longer needed", "Pause -- let me check the code first"]

Semantics per choice:

- **Finish it now** -- the task needs real implementation work. Ask a
  follow-up via **AskUserQuestion**:
  - question: "This task needs implementation work. Run `/qrspi:implement <id>` now, then re-run `/qrspi:pr <id>` when done?"
  - choices: ["Yes -- redirect to /qrspi:implement", "Stop here"]
  If the user chooses "Yes -- redirect to /qrspi:implement": commit any
  Drop edits already made (see early-exit commit below), end the turn,
  and instruct the user to run `/qrspi:implement <id>`. If they choose
  "Stop here": apply the early-exit commit and end the turn.
- **Drop -- no longer needed** -- edit the line in `tasks.md` from
  `- [ ] N.M <text>` to `- [x] ~~N.M <text>~~ (dropped)`. Continue
  to the next task.
- **Pause -- let me check the code first** -- apply the early-exit
  commit (see below) and end the turn with a message:
  > Paused at task N.M. Re-run `/qrspi:pr <id>` when ready to continue.

**`(human)`-task loop** (for each of the H un-ticked `(human)` tasks,
in file order -- `(i of H)` counter). Run after the regular-task loop:

Use the **AskUserQuestion** tool:

- question: "Human step N.M -- `<task text>` (slice: <parent heading>) is
  not confirmed. (i of H) This is a manual step. What would you like
  to do?"
- choices: ["Confirm-done -- I completed this step", "Drop -- no longer needed", "Leave-for-now -- skip and continue"]

Semantics per choice:

- **Confirm-done** -- edit the line from `- [ ] N.M <text>` to
  `- [x] N.M <text>` (no `(dropped)` annotation; the human confirmed
  completion).
- **Drop** -- edit the line from `- [ ] N.M <text>` to
  `- [x] ~~N.M <text>~~ (dropped)`.
- **Leave-for-now** -- leave the line un-ticked. This is the sole
  sanctioned exception where a `(human)` box may remain open at PR
  time; the reviewer will note it as an expected open item (not a
  blocking issue).

**Early-exit commit.** If the tasks pass ends before spawning the
reviewer (because the user chose Finish, Pause, or Stop here), commit
any edits already made to `tasks.md` so the working tree stays clean:

```
git add openspec/changes/<id>/tasks.md
git commit -m "docs(<id>): reconcile open tasks before PR"
```

Only commit if `tasks.md` was actually edited (at least one Drop or
Confirm-done was written). If no edits were made, skip the commit.

Once all regular tasks and `(human)` tasks have been resolved (or
left-for-now), the tasks pass is complete. All dropped items read as
`- [x]` so the reviewer's independent "all ticked" check will pass
(with the sole `(human)` Leave-for-now exception noted in D8).

## Follow-ups pass (reconciliation gate)

After the tasks pass completes (or is skipped when M = 0 and mode is not
Manual), run the follow-ups pass. Use the **Glob** tool with pattern
`openspec/changes/$ARGUMENTS/followups.md` to check whether the file exists.
If Glob returns nothing, or if the file exists but contains no `- [ ]` lines
(absent, prose-only, or all-ticked), the pass is clean -- treat it as zero
un-resolved follow-ups and proceed directly to spawning the reviewer.

If `followups.md` exists and has `- [ ]` lines, enumerate them. Let F = count
of un-ticked follow-up entries.

**Mode-awareness.** The follow-ups pass is mode-aware:

- **Full or Semi-auto, F = 0 (or file absent / all-ticked):** suppress the
  banner silently and proceed directly to spawning the reviewer. Do NOT
  display any "0 un-resolved" message.
- **Full or Semi-auto, F > 0:** this is a **hard-stop** (see the Hard-stop
  procedure in skill `workflow`). Display the count banner below and run the
  per-entry gate. Do NOT auto-advance past the gate; the user must resolve
  each open entry interactively. The auto chain is halted until all entries
  are resolved or the user chooses to exit (Stop here).
- **Manual:** always display the banner, including the "0 un-resolved" variant.

**Count banner.** Display before the per-entry loop (always in Manual; in
Full/Semi-auto only when F > 0):

> Follow-ups pass: found F un-resolved follow-up(s). Reviewing each now.

If F = 0 in Manual mode, display instead:

> Follow-ups pass: 0 un-resolved follow-ups -- nothing to resolve. Continuing.

Then skip the loop below and proceed to spawn the reviewer.

**Follow-up loop** (for each of the F un-ticked entries in `followups.md`,
in file order -- `(i of F)` counter):

Use the **AskUserQuestion** tool:

- question: "Follow-up: `<entry title>` -- `<brief excerpt of entry text>`.
  (i of F) What now?"
- choices: ["Fix now -- run /qrspi:followup", "Defer -- keep in followups.md",
  "Drop -- no longer needed", "Promote to backlog idea"]

Semantics per choice:

- **Fix now** -- the follow-up needs real fix work. Ask a follow-up via
  **AskUserQuestion**:
  - question: "This follow-up needs fix work. Run `/qrspi:followup <id>` now,
    then re-run `/qrspi:pr <id>`?"
  - choices: ["Yes -- redirect to /qrspi:followup", "Stop here"]
  If the user chooses "Yes -- redirect to /qrspi:followup": commit any
  Drop/Promote edits already made to `followups.md` and `openspec/backlog.md`
  (using the early-exit commit from the tasks pass -- if that commit already
  happened add these paths; otherwise issue a new commit:
  `docs(<id>): reconcile open tasks before PR`) and end the turn, instructing
  the user to run `/qrspi:followup <id>`. If they choose "Stop here": apply
  the same commit and end the turn.
- **Defer** -- leave the entry in `followups.md` un-ticked and unchanged; no
  annotation is added. Continue to the next entry.
- **Drop** -- change the entry line from `- [ ] <text>` to
  `- [x] <text> (dropped -- no longer needed)` in `followups.md`. Continue to
  the next entry. Stage this edit for the final commit (D7).
- **Promote to backlog idea** -- append one new idea row to
  `openspec/backlog.md` under the `## Ideas` section, matching the file's
  existing format (level-3 heading with kebab-slug + status label + priority
  band, followed by a `**Why:**` paragraph). Use `idea` as the status and
  `P3` as the default priority band; derive the slug from the follow-up title.
  Then change the entry in `followups.md` from `- [ ] <text>` to
  `- [x] <text> (promoted to backlog)`. Stage both edits for the final
  commit (D7). Continue to the next entry.

Once all F entries have been resolved (or deferred), the follow-ups pass is
complete. All Drop/Promote entries read as `- [x]`; Deferred entries remain
`- [ ]` and will be resolved post-PR via `/qrspi:followup <id>`.

Spawn the `reviewer` subagent via the **Agent tool** (`subagent_type: qrspi:reviewer`) for the bounded read and draft work. It will:

1. Read the full `openspec/changes/<id>/` folder.
2. Run the project's build + lint/format + test commands to confirm green.
3. Draft a PR description.
4. List unresolved checklist items so the human reviewer is not
   surprised.

The reviewer does NOT create the PR itself — it drafts the description
and provides the suggested PR-create command for the human to run.

**PR-create step (mode-aware — follow the PR-create auto-advance rule in
skill `workflow`).** After the reviewer produces the PR description and
checklist:

- In **Full or Semi auto**, skip the question below and run the PR-create
  command directly per the "PR-create auto-advance" rule in skill `workflow`.
- In **Manual**, use the **AskUserQuestion** tool to ask:
  question: "The PR description is ready. Would you like me to create the PR now, or do you want to review the description first?"
  choices: ["Create the PR now", "Show me the description first — I'll create it manually"]

Run the project's PR-create command (the host CLI named in its
stack-cheatsheet -- e.g. `gh pr create` or `az repos pr create`),
capturing the output so you get the PR number and URL, with the generated
title, description, the change's source branch, and the project's default
target branch. In Manual, only run it if the human chose "Create the PR now".
Otherwise print the command for them to copy.

**Record the PR link (mandatory).** Once the PR is created and you have
the PR number and web URL (from the host CLI's output), persist
the link in **two** places:

1. **`openspec/changes/<id>/pr.md`** — the durable home. This file
   travels into `openspec/changes/archive/<id>/` on archive and is never
   deleted, so it is the permanent record of the PR link. Write:
   ```markdown
   # Pull request -- <id>

   - **PR:** #<N>
   - **URL:** <url>
   - **Title:** <id>: <summary>
   - **Source branch:** <change branch>
   - **Target branch:** <default branch>
   - **Created:** <YYYY-MM-DD>
   ```
2. **`openspec/backlog.md`** — the convenient in-progress lookup (this
   row is deleted on archive, which is why pr.md above is required):
   change the row's heading backtick note from
   `in-progress (Q, R, D, S, V, P, I complete)` to
   `in-progress (draft PR #<N> open)` -- it stays under `## In progress`;
   there is no separate `Status:` or `Next QRSPI command:` line to update.

**Seed the follow-up queue (when the reviewer found open issues).** If the
reviewer's "Open issues found" count is greater than zero, write those
issues into `openspec/changes/<id>/followups.md` so they are tracked and
resolvable with `/qrspi:followup <id>` (otherwise the list is printed once and
lost). Use the format defined in skill `postpr-fix`:
```markdown
# Follow-ups -- <id>

> Post-PR fix queue. Resolve with `/qrspi:followup <id>`. Archived with the
> change; every box should be ticked before archival.

- [ ] **<reviewer issue title>.** <explanation; file:line; suggested fix.> (source: PR review)
```
If the reviewer found zero open issues, do not create the file.

Then commit and push (the canonical *commit step* in skill `workflow`
applies — explicit paths only, never `git add -A`; PR open is a state
change so the backlog edit lands in this same commit, per backlog
atomicity):
```
git add openspec/changes/<id>/pr.md openspec/backlog.md openspec/changes/<id>/followups.md
git commit -m "docs(<id>): record PR #<N> link"
git push
```
(Omit `followups.md` from the `git add` if it was not created.) Skip this
step only if the user chose "Show me the description first" (no PR exists
yet, so there is no PR number or URL to record).

Return only what the reviewer's "Final message format" specifies, then
note how many follow-ups were queued (and that `/qrspi:followup <id>` resolves
them).
