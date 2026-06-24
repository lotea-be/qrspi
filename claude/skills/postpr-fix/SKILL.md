---
name: postpr-fix
description: How to make a transient, qrspi-aware code fix AFTER the PR has been opened — the small follow-ups that surface from the reviewer's "Open issues" list or a retrospective code flag. Keeps code, tests, and the change's DELTA spec in sync, ticks the follow-up, and commits atomically on the PR branch. Load this when running `/qrspi:followup <id>` or whenever the human asks for a post-PR cleanup on an in-flight change.
metadata:
  audience: implementer, orchestrator
---

## Why this exists

QRSPI ends at **PR**, but the work doesn't. The reviewer emits an
"Open issues found: N" list, and retrospectives surface code-level flags
(e.g. *"the create endpoint returns 409 with the wrong error-body shape"*).
These are real, small, and easy to fix — but fixing them freehand tends to
drop the parts that keep the change folder honest:

- the **delta spec** silently diverges from the code,
- `tasks.md` / `followups.md` are never ticked,
- the commit doesn't carry the `<id>` scope,
- the fix quietly expands scope past what the PR claims.

This skill is the checklist that makes a post-PR fix **qrspi-aware**: the
code, the tests, and the spec move together, and the fix is tracked.

## What counts as a fix (and what doesn't)

A `/qrspi:followup` resolves something **already in scope** that does not work as
specified — a wrong status code, a missing validation, a stale delta, a
broken edge case. **Net-new or previously-out-of-scope functionality is not a
fix**, even after the PR is open: it needs a **scope amendment** (a new
vertical slice on the still-open change — see *"Adding scope after stage I has
started"* in `qrspi-implement`) or a **separate change**, never a
`followups.md` checkbox. If a "follow-up" turns out to be new scope (e.g.
"add an edit button" for an affordance the spec listed under *Out of Scope*),
**stop and route it to a scope amendment** instead of fixing it here.

## Where post-PR fixes come from

Two sources, both landing in `openspec/changes/<id>/followups.md` (a
checkbox list, created by the PR stage when the reviewer finds open issues,
and appended to by retrospectives that surface code flags):

- **Reviewer open issues** — `/qrspi:pr` writes the reviewer's
  "Open issues found" list into `followups.md`.
- **Retro code flags** — `/qrspi:retro` routes *code-level* findings (not
  prompt/skill edits) into `followups.md` too.

A fix can also be requested ad hoc ("fix X on `<id>`"); in that case add it
to `followups.md` first, then resolve it, so the queue stays complete.

## The fix checklist

Do **one follow-up at a time**. For each:

1. **Load context.** Read `openspec/changes/<id>/`: `design.md` (the
   intent), `proposal.md`, the `specs/` **delta(s)**, `tasks.md`, `pr.md`
   (so you know the PR branch + number), and `followups.md` (the queue).
   Load the project's stack-cheatsheet skill (if any).
2. **Make the code + test change.** Follow the coding rules in the project's
   stack-cheatsheet skill and its contributor-guidance file (if any). Every
   behavior change gets a test that *locks in* the new behavior — a fix
   with no covering assertion will regress.
3. **Sync the spec — DELTA only.** This is the step freehand fixing drops.
   - If the fix changes an **observable contract** (status code, response
     shape/body, route, auth, validation, DTO), edit the delta under
     `openspec/changes/<id>/specs/<capability>/spec.md`: add or amend a
     requirement and at least one scenario describing the new behavior, and
     update the delta's "Out of scope" list if the fix widened scope.
   - **Never edit `openspec/specs/**`** (the base spec). Deltas are applied
     to the base at archive time by `/openspec-archive-change`.
   - If the fix is purely internal (refactor, rename, perf) with **no**
     contract change, no spec edit is needed — say so explicitly in your
     final message rather than staying silent.
4. **Tick the trackers.** Check the item's box in `followups.md`. If the
   fix also satisfies a `tasks.md` box, tick that too. Do not restructure
   `tasks.md` or rewrite other artifacts.
5. **Verify green.** Run the project's build + lint/format + test commands.
   Fix until clean. Report the numbers.
6. **Checkpoint, then commit.** Show the human what changed and ask before
   committing (and again before pushing). Commit message:
   `fix(<id>): <summary>` — Conventional Commits, `<id>` as scope,
   ASCII-only. Stage files **explicitly** (code + tests + delta spec +
   `followups.md` + any ticked `tasks.md`); never `git add -A`.
7. **Flag PR-description drift.** If the fix changed an observable contract,
   the PR description may now be stale. Note this in your final message so
   the human can update the PR body (you do not edit the PR yourself).

## Backlog

A post-PR fix does **not** change the backlog status line — the PR is
already open and the row already says so. The exception: if this fix empties
`followups.md` (all boxes ticked), mention it so the human knows the change
is clean for merge/archive. Backlog edits, when they do happen, commit
atomically with the change they reflect (house rule in the project's
contributor-guidance file, if it defines one).

## Guardrails — when to STOP instead of fixing

- The fix reveals a **design-level** problem (the contract in `design.md`
  is wrong, not just the implementation). Stop. A post-PR fix is not the
  place to redesign — recommend a `design.md` revision or a new change.
- The fix would touch a **different capability** than the change owns, or
  pull in Phase 2 scope. Stop and recommend a separate change.
- The fix can't be expressed as a delta amendment because it contradicts an
  already-merged base requirement. Stop — that's a new change with its own
  Q/R/D, not a follow-up.

Small and contained is the whole point. If it isn't, it's not a follow-up.

## `followups.md` format

```markdown
# Follow-ups — <id>

> Post-PR fix queue. Each box is a code-level issue raised after the PR was
> opened (reviewer "Open issues" or a retrospective code flag). Resolve with
> `/qrspi:followup <id>`. This file is archived with the change; every box should
> be ticked before archival.

- [ ] **<short title>.** <what's wrong; `file:line`; suggested fix.> (source: PR review | retro <stage>)
- [x] **<resolved title>.** ... (source: ...) — fixed in <short-sha>
```

## Final message format (per fix)

```
Fix complete — <id>: <short title>
Follow-up ticked: followups.md item <n> (and tasks.md <n> if applicable)

Files modified:
- [<path>](<path>) — <one-line purpose>
- ...

Spec sync: <delta requirement/scenario added or amended, with path> | "none — internal change, no contract impact"

Tests: build OK, lint/format clean, <N> tests passing

PR-description drift: <"none" | "PR body now stale because <contract change> — human should update">

Remaining follow-ups in followups.md: <N>
```

## How this skill relates to others

- `workflow` — the eight stages; this is the post-PR fix loop that
  hangs off the PR stage.
- `retrospective` — routes *code* flags into `followups.md` (and
  *prompt* flags into the governing files).
- the project's stack-cheatsheet skill — the coding rules a fix must still honor.
- `context-hygiene` — keep the fix conversation lean; one follow-up at a time.
