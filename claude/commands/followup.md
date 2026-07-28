---
description: QRSPI post-PR fix loop. Delegates to the implementer subagent in FIX MODE to resolve a single post-PR follow-up (reviewer open issue or retro code flag) while keeping code, tests, and the change's DELTA spec in sync. Ticks followups.md and commits atomically on the PR branch.
---

You are running the QRSPI **post-PR fix loop** for the current project.

Arguments: $ARGUMENTS — the first token is the change id; any remaining
text is an optional description of the specific follow-up to fix. If only
the id is given, work the next un-ticked item in `followups.md`.

**Inline compute spec (optional).** The follow-up description (or the
`followups.md` entry text) may contain an inline `(compute: …)` spec using
the same `key=value` grammar as `**Compute:**` slice annotations, e.g.:

```
(compute: model=opus effort=high)
```

- `model=` — one of `{sonnet, opus}`. When present, the FIX MODE Agent call
  passes `model: <value>` per-invocation, overriding the default.
- `effort=` — one of `{low, medium, high}`. Honored via the implementer
  agent's frontmatter `effort:` (a per-stage knob, not a per-invocation
  parameter -- there is no per-invocation effort param on the Agent tool).
  When absent, the agent frontmatter default takes effect.
- `(compute: …)` is optional. When absent, the FIX MODE default applies
  (see **FIX MODE default** below).

Parse the inline spec before spawning the implementer: scan the follow-up
description text for the pattern `(compute:` followed by one or more
space-separated `key=value` tokens and a closing `)`. Extract the `model=`
token if present and the `effort=` token if present. If the spec is absent
or malformed, fall back to the default.

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

> Resolve `openspec/changes/<id>/…` against the **current working repo root** (the consumer's CWD), not the plugin install directory — the change folder lives in the repo you are running the command in.

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
  (re-alignment needed but still this change's scope) -- **but only when the
  parent PR is still open**, since a P2 amendment extends that open PR on its
  branch (see "On P2" below).
- **Propose P3** when signal 4 fires (new scope -- genuinely a different
  change), when the parent PR has already merged, or when the work would
  otherwise need its own branch or PR (there is no open PR for an in-place
  amendment to extend).

Write one line of rationale citing which signals fired and why they point to
the proposed path.

Then present the triage decision using the **AskUserQuestion** tool:
- question: "Triage follow-up `<short title>` -- `<brief excerpt>`.
  Proposed: **<P1|P2|P3>** because <one-line rationale>.
  How should this be handled?"
- choices:
  - "P1 — implement directly (small in-scope fix)"
  - "P2 — amend this change in place (extend the open PR)"
  - "P3 — defer to backlog idea (new scope)"

The proposed path is named in the question text (not as a fourth choice) so
the recommendation is visible but the human picks explicitly. There is no
"unsure" escape hatch -- an unsure human picks P2 (re-align) or stops.

**On P1 -- proceed to the implementer spawn below** (the existing FIX MODE
flow, unchanged). The triage adds no new annotation to the P1 `followups.md`
entry -- the standard `-- fixed in <short-sha>` tick at completion remains
the sole record.

**On P2 -- amend this change in place.** The orchestrator does NOT spawn the
implementer to triage. It **amends the parent change in place** -- no separate
folder, the same branch, the same open PR. A P2 follow-up is re-alignment work
that still belongs to *this* change and extends the *open* PR by adding slices
to it. If the parent PR is not open (already merged, or the work needs its own
branch or PR), do NOT use P2 -- route the follow-up to P3 instead. Do all of
this here in the orchestrator (AskUserQuestion is not available inside a
subagent).

The mechanics mirror `implement.md`'s "Adding scope after stage I has started"
scope-amendment flow, applied post-PR:

*Step P2.1 -- amend the approved artifacts in place.* Edit the affected
`design.md` `Dn` decision and/or the change's delta `specs/**` (move the item
in scope; add or adjust the requirement + scenarios). The orchestrator MAY spawn
a `qrspi:designer` subagent to **draft** a design-level edit, but it MUST NOT
re-run `/qrspi:design` (or any stage command) on the parent -- that overwrites
the approved artifact. The edit lands directly on the approved files.

*Step P2.2 -- add a `## N.` slice group to `slices.md` and `tasks.md`.* Load
skill `vertical-slice` plus the project's stack-cheatsheet skill (if any), then
add a new `## N.` vertical-slice group to `slices.md` **and** a matching `## N.`
group to `tasks.md`, each carrying a `**Compute:**` annotation. Loading the
convention skills is what the architect (V) and planner (P) normally do before
writing slice/task specs -- do not skip it, or the new slice will contradict
documented conventions.

*Step P2.3 -- tick `followups.md`.* Tick the targeted entry by changing
`- [ ]` to `- [x]` and appending the disposition note (mirroring the pr.md
tick-with-parenthetical idiom, ASCII `--`):

`- [x] <original text> (re-aligned in place -- slice N)`

*Step P2.4 -- commit.* Stay on the parent's current branch. Stage the edited
`design.md` / delta `specs/**` / `slices.md` / `tasks.md` / `followups.md`
explicitly (never `git add -A`), carrying any matching `openspec/backlog.md`
heading edit atomically **only if** the amendment changes the parent row's
status or note (normally it does not):

```
git commit -m "docs(<id>): amend scope -- <desc>"
```

Push per the normal flow so the commit lands on the parent's open PR.

*Step P2.5 -- offer to build it now (least-friction, D6).* Do NOT merely print
a `/qrspi:implement` command for the human to copy. Use the **AskUserQuestion**
tool:
- question: "Scope amended (slice N added). Implement it now?"
- choices:
  - "Run `/qrspi:implement <id>` now"
  - "Not now"

On "Run ... now", re-enter `/qrspi:implement <id>` as a slash command in the
main loop -- P2 does not spawn the implementer directly here. On "Not now",
leave the slice for the human to build later. Either way, P2 disposes of this
follow-up; then apply the next-follow-up offer below.

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
item. Do NOT spawn the implementer -- P3 disposes of this follow-up; then
apply the next-follow-up offer below.

**Next-follow-up offer (least-friction, D6 -- applies to P1, P2, and P3).**
After a path's disposition completes, check whether any un-ticked (`- [ ]`)
entries remain in `openspec/changes/<id>/followups.md`. Read the file with the
**Read** tool (or list it with the **Glob** tool) -- do NOT shell out to grep
or count, per the house rule. If one or more un-ticked entries remain, do NOT
merely print a `/qrspi:followup` command for the human to copy. Use the
**AskUserQuestion** tool:
- question: "Follow-up handled. `<N>` un-ticked follow-up(s) remain. Continue?"
- choices:
  - "Handle the next follow-up"
  - "Stop here"

On "Handle the next follow-up", re-enter `/qrspi:followup <id>` as a slash
command in the main loop (which re-triages the next un-ticked item). On "Stop
here", end the turn. If no un-ticked entries remain, skip the offer and end the
turn. Wire this offer at the end of P1 (after the fix commit step), at the end
of P2 (after the implement offer resolves, including "Not now"), and at the end
of P3 (after the backlog commit).

**FIX MODE default.** Default the implementer to **sonnet** -- post-PR
follow-ups are typically small and contained. Use **opus** only when the
fix touches design-level logic or spans several files, or when the inline
`(compute: model=opus …)` spec is present.

**Model threading (mandatory -- not prose-only).** The orchestrator MUST
pass an explicit `model:` parameter on the Agent call so the wired behavior
matches the documented default. Do not omit `model:` and rely on the
implementer's frontmatter `model: opus` to win silently:

- **No inline `(compute: model=…)` spec:** pass `model: sonnet` explicitly.
- **Inline `(compute: model=X)` spec present:** pass `model: X` instead.

`effort=` from the inline spec is NOT passed as a per-invocation parameter
(the Agent tool has no per-invocation effort param). If `effort=` is present
in the inline spec it documents intent; the implementer agent's frontmatter
`effort:` remains the actual per-stage knob.

**Resolve the implementer variant.** Before spawning, resolve which variant
to use:

- If `effort=` was parsed from the inline `(compute: …)` spec, map it to the
  variant subagent_type: `low` -> `qrspi:implementer-low`,
  `medium` -> `qrspi:implementer-medium`, `high` -> `qrspi:implementer-high`.
- If `effort=` was absent or the spec was absent, default to
  `qrspi:implementer-medium`.

The `model:` parameter is resolved independently:

- If `model=` was parsed from the inline spec, use that value.
- Otherwise default to `sonnet`.

Spawn the resolved implementer variant via the **Agent tool**
(`subagent_type: qrspi:implementer-<resolved>`,
`model: <sonnet | parsed model from inline spec>`) in
FIX MODE. Tell it explicitly:

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

After the P1 fix commit resolves, apply the **next-follow-up offer** (D6,
defined in the P3 section above) -- if un-ticked follow-ups remain, offer to
handle the next one rather than making the human re-invoke manually.

One follow-up per invocation is the **default**, with opt-in chaining via the
next-follow-up offer (D6): re-running `/qrspi:followup <id>` -- or accepting the
offer -- picks up the next un-ticked item. Return only what the skill's "Final
message format (per fix)" specifies.
