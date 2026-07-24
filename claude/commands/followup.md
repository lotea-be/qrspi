---
description: QRSPI post-PR fix loop. Delegates to the implementer subagent in FIX MODE to resolve a single post-PR follow-up (reviewer open issue or retro code flag) while keeping code, tests, and the change's DELTA spec in sync. Ticks followups.md and commits atomically on the PR branch.
---

You are running the QRSPI **post-PR fix loop** for the current project.

Arguments: $ARGUMENTS — the first token is the change id; any remaining
text is an optional description of the specific follow-up to fix. If only
the id is given, work the next un-ticked item in `followups.md`.

This is **not** stage I. It is the loop that hangs off the **PR** stage:
small, contained fixes that surfaced *after* the PR was opened. The
slice/checkpoint machinery of `/qrspi:implement` does **not** apply here.

Preconditions (verify with the **Glob** tool — no shell preamble):

1. `openspec/changes/<id>/` exists. If Glob returns nothing, refuse and
   tell the user to start from `/qrspi:questions`.
2. `openspec/changes/<id>/pr.md` exists (the PR is open). If it does not,
   this isn't a post-PR fix — point the user at `/qrspi:implement <id>`
   for pre-PR slice work, then stop.
3. `openspec/changes/<id>/followups.md` — if present, it holds the queue.
   If absent and the user named a specific fix, the implementer creates it
   and adds the item before resolving it (per skill `postpr-fix`).

**Triage gate (never suppressed -- fires in Full auto, Semi-auto, and Manual).**

Before spawning the implementer, self-assess the targeted follow-up item
(the named fix, or the next un-ticked entry in `followups.md`) against four
heuristic signals:

1. **Contract change?** Does the fix alter a route, status, DTO, auth, or
   validation contract beyond a purely internal change? A contract change
   alone is still P1; it is a nudge toward P2 only when combined with
   signal 2 or 3.
2. **Multi-capability?** Does it touch more than one `specs/<capability>/`
   subdir the change owns? -- nudges P2.
3. **Design re-alignment?** Does resolving it require revising a `design.md`
   Dn decision (not merely amending a delta scenario)? -- strong P2 signal.
4. **New scope?** Is it not covered by the change's delta spec at all
   (genuinely a different change)? -- strong P3 signal.

Evaluate each signal in prose. Then derive a proposed path using this rubric:
- **Propose P1** when none of signals 2, 3, or 4 fire (atomic, single-
  capability, expressible as a delta amendment or internal fix).
- **Propose P2** when signal 3 fires, or when signals 1 and 2 fire together
  (re-alignment needed but still this change's scope).
- **Propose P3** when signal 4 fires (new scope -- genuinely a different
  change).

Write one line of rationale citing which signals fired and why they point to
the proposed path.

Then present the triage decision using the **AskUserQuestion** tool:
- question: "Triage follow-up `<short title>` -- `<brief excerpt>`.
  Proposed: **<P1|P2|P3>** because <one-line rationale>.
  How should this be handled?"
- choices:
  - "P1 — implement directly (small in-scope fix)"
  - "P2 — addendum (re-enter QRSPI at an earlier stage)"
  - "P3 — defer to backlog idea (new scope)"

The proposed path is named in the question text (not as a fourth choice) so
the recommendation is visible but the human picks explicitly. There is no
"unsure" escape hatch -- an unsure human picks P2 (re-align) or stops.

**On P1 -- proceed to the implementer spawn below** (the existing FIX MODE
flow, unchanged). The triage adds no new annotation to the P1 `followups.md`
entry -- the standard `-- fixed in <short-sha>` tick at completion remains
the sole record.

**On P2 -- this path is not yet wired.** Stop and tell the human:
> "P2 (addendum) routing is not yet implemented. No addendum folder has been
> created and no implementer has been spawned. Please wait for the P2 path to
> be wired (Slice 3 of right-size-followup-handling) or manually create the
> addendum change folder and re-enter the QRSPI pipeline."

**On P3 -- defer to backlog idea.**

Derive a kebab-slug from the follow-up title: lowercase the title, replace
spaces and punctuation with hyphens, collapse consecutive hyphens, strip
leading/trailing hyphens. Example: "Rate-limit the new endpoint" becomes
`rate-limit-the-new-endpoint`.

Open `openspec/backlog.md` and append one new `idea` row under the
`## Ideas` section (create the section if it does not exist). The row
format mirrors `pr.md`'s "Promote to backlog idea" mechanic exactly:

```markdown
### <slug> -- `idea` · **P3**

**Why:** <one-sentence reason drawn from the follow-up text explaining
why this warrants a future change rather than being fixed here.>
```

Use `idea` as the status and `· **P3**` as the priority band. Write the
`**Why:**` paragraph in one sentence drawing from the follow-up content.
Do NOT flip the parent change's existing backlog status line -- only the
new `idea` row is added.

Tick the targeted `followups.md` entry by changing `- [ ]` to `- [x]`
and appending the disposition note:

`- [x] <original text> (deferred to backlog -- <slug>)`

Stage both files together in one atomic commit (backlog atomicity rule --
never as separate commits):

```
git add openspec/backlog.md openspec/changes/<id>/followups.md
git commit -m "docs(<id>): defer <slug> to backlog (P3)"
```

End the turn with a confirmation message naming the slug and the ticked
item. Do NOT spawn the implementer -- P3 disposes of this follow-up and
terminates the invocation.

**Model.** Default the implementer to **sonnet** -- post-PR follow-ups are
typically small and contained. Use **opus** only when the fix touches
design-level logic or spans several files; say so when you invoke.

Spawn the `implementer` subagent via the **Agent tool** (`subagent_type:
qrspi:implementer`) in FIX MODE. Tell it explicitly:

> You are in POST-PR FIX MODE, not slice mode. Load skill
> `postpr-fix` and follow its checklist. Ignore the per-slice
> `tasks.md` / checkpoint machinery. Resolve exactly one follow-up:
> `<description or "next un-ticked item in followups.md">`.

The implementer will, per the skill: load the change folder context, make
the code + test change, **sync the DELTA spec** (never the base
`openspec/specs/**`) if a contract changed, tick the `followups.md` box
(and any matching `tasks.md` box), and run the project's build +
lint/format + test commands.

**Interactive step (mandatory).** Before committing, use the **AskUserQuestion** tool:
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

One follow-up per invocation. Re-running `/qrspi:followup <id>` picks up the
next un-ticked item. Return only what the skill's "Final message format
(per fix)" specifies.
