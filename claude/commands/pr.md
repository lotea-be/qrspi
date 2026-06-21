---
description: QRSPI stage PR. Delegates to the reviewer subagent (read-only) to draft the pull request description, run a final checklist, and flag anything that looks off.
---

You are running QRSPI stage **PR (Pull Request)** for the current project.

Change id: $ARGUMENTS

Precondition: all boxes in `openspec/changes/<id>/tasks.md` are ticked,
and the working tree is clean (no uncommitted changes outside of the
change folder updates). **This stage's precondition has two parts** (the
canonical *precondition check* in skill `qrspi-workflow` covers the
file gate; the clean-tree gate is unique to PR):

1. Use the **Glob** tool with pattern `openspec/changes/$ARGUMENTS/tasks.md`
   to confirm the file exists. If Glob returns nothing, refuse and tell
   the user to start from `/qrspi:questions`.
2. Use the **Bash** tool to run `git status --short` and confirm the
   working tree is clean (or that any remaining changes are inside the
   change folder). Do not Glob this — `git status` is not on the default
   allow-list and the harness's obfuscation guard blocks brace+quote shapes.

Otherwise spawn the `reviewer` subagent via the **Agent tool** (`subagent_type: qrspi:reviewer`) for the bounded read and draft work. It will:

1. Read the full `openspec/changes/<id>/` folder.
2. Run the project's build + lint/format + test commands to confirm green.
3. Draft a PR description.
4. List unresolved checklist items so the human reviewer is not
   surprised.

The reviewer does NOT create the PR itself — it drafts the description
and provides the suggested PR-create command for the human to run.

**Interactive step (mandatory):** After the reviewer produces the PR
description and checklist, use the **AskUserQuestion** tool to ask:
  question: "The PR description is ready. Would you like me to create the PR now, or do you want to review the description first?"
  choices: ["Create the PR now", "Show me the description first — I'll create it manually"]
If they choose to create, run the project's PR-create command (the host CLI
named in its stack-cheatsheet — e.g. `gh pr create` or `az repos pr create`),
capturing the output so you get the PR number and URL, with the generated
title, description, the change's source branch, and the project's default
target branch. Otherwise print the command for them to copy.

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
   - Change the row `Status:` line to
     `in-progress (Q, R, D, S, W, P, I complete; PR #<N> open — <url>)`.
   - Change the `Next QRSPI command:` line to `archive after merge`.

**Seed the follow-up queue (when the reviewer found open issues).** If the
reviewer's "Open issues found" count is greater than zero, write those
issues into `openspec/changes/<id>/followups.md` so they are tracked and
resolvable with `/qrspi:followup <id>` (otherwise the list is printed once and
lost). Use the format defined in skill `qrspi-postpr-fix`:
```markdown
# Follow-ups -- <id>

> Post-PR fix queue. Resolve with `/qrspi:followup <id>`. Archived with the
> change; every box should be ticked before archival.

- [ ] **<reviewer issue title>.** <explanation; file:line; suggested fix.> (source: PR review)
```
If the reviewer found zero open issues, do not create the file.

Then commit and push (the canonical *commit step* in skill `qrspi-workflow`
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
