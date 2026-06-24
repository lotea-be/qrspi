---
description: QRSPI post-PR fix loop. Delegates to the implementer subagent in FIX MODE to resolve a single post-PR follow-up (reviewer open issue or retro code flag) while keeping code, tests, and the change's DELTA spec in sync. Ticks followups.md and commits atomically on the PR branch.
argument-hint: <change-id>
agent: copilot-implementer
---

You are running the QRSPI **post-PR fix loop** for the current project.

Arguments: ${input} — the first token is the change id; any remaining
text is an optional description of the specific follow-up to fix. If only
the id is given, work the next un-ticked item in `followups.md`.

This is **not** stage I. It is the loop that hangs off the **PR** stage:
small, contained fixes that surfaced *after* the PR was opened. The
slice/checkpoint machinery of `/qrspi-implement` does **not** apply here.

Preconditions (verify with the **Glob** tool — no shell preamble):

1. `openspec/changes/<id>/` exists. If Glob returns nothing, refuse and
   tell the user to start from `/qrspi-questions`.
2. `openspec/changes/<id>/pr.md` exists (the PR is open). If it does not,
   this isn't a post-PR fix — point the user at `/qrspi-implement <id>`
   for pre-PR slice work, then stop.
3. `openspec/changes/<id>/followups.md` — if present, it holds the queue.
   If absent and the user named a specific fix, the implementer creates it
   and adds the item before resolving it (per skill `postpr-fix`).

**Model.** Default the implementer to **sonnet** — post-PR follow-ups are
typically small and contained. Use **opus** only when the fix touches
design-level logic or spans several files; say so when you invoke.

continue as the implementer in FIX MODE. Tell it explicitly:

> You are in POST-PR FIX MODE, not slice mode. Consult the instructions for
> `postpr-fix` and follow its checklist. Ignore the per-slice
> `tasks.md` / checkpoint machinery. Resolve exactly one follow-up:
> `<description or "next un-ticked item in followups.md">`.

The implementer will, per the skill: load the change folder context, make
the code + test change, **sync the DELTA spec** (never the base
`openspec/specs/**`) if a contract changed, tick the `followups.md` box
(and any matching `tasks.md` box), and run the project's build +
lint/format + test commands.

**Interactive step (mandatory).** Before committing, use the #tool:vscode/askQuestions:
  question: "Fix for '<short title>' is implemented and green. Commit it to the PR branch?"
  choices: ["Yes — commit and push", "Yes — commit, I'll push later", "No — let me review first"]

On commit, stage the touched files **explicitly** (code + tests + delta
spec + `followups.md` + any ticked `tasks.md`) — never `git add -A` — and:
```
git commit -m "fix(<id>): <summary>"
```
Push only if the user approved pushing.

**Backlog.** A post-PR fix does not change the backlog status line (the PR
is already open). The only exception: if this fix empties `followups.md`,
say so — the change is then clean for merge/archive.

One follow-up per invocation. Re-running `/qrspi-followup <id>` picks up the
next un-ticked item. Return only what the skill's "Final message format
(per fix)" specifies.
