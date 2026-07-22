# Design — pr-review-open-tasks-and-followups

> Stage D of QRSPI. Generated 2026-07-16.
> **Implementation is BLOCKED until a human approves this file.**

## Context

The QRSPI PR stage (`/qrspi:pr`, driven by `claude/commands/pr.md`) today runs a
short line: establish run-mode → precondition check (tasks.md exists + working
tree clean) → spawn the `reviewer` subagent → PR-create → record the PR link →
seed `followups.md` → commit. Nothing between the precondition and the reviewer
spawn reconciles *loose ends*. Two kinds of loose end can be silently carried
into the PR: (1) **un-ticked boxes in `tasks.md`** — committed in-change work
that was never finished; and (2) **entries in `followups.md`** — post-PR fixes,
which today are only *seeded* by this stage but, when the stage is re-run after a
`/qrspi:followup` session, may already exist and hold un-resolved items. The
reviewer flags un-ticked tasks as "Open issues" (step 4 of `reviewer.md`), but
that is a *report at the end*, not a *resolution before* the PR is drafted.

This change inserts a **pre-PR reconciliation gate** into the PR-stage
orchestrator that runs after the precondition check and before the reviewer
spawn: a **tasks pass** that walks every un-ticked box in `tasks.md`, then a
**follow-ups pass** that walks every entry in `followups.md`. The end state: by
the time the reviewer runs, every open item has had an explicit human decision,
and `tasks.md` reads all-ticked (dropped items self-document). This is a
kit-behavior change to `claude/commands/pr.md` plus a small note in the
`workflow` skill's gate machinery, and the regenerated `copilot/` tree via
`sync-copilot.mjs`. The reviewer agent is deliberately left almost untouched.

## Goals / Non-Goals

**Goals:**
- Insert two reconciliation passes into `pr.md` — tasks first, then follow-ups —
  between the precondition check and the reviewer spawn.
- Tasks pass offers **Finish / Drop / Pause** per un-ticked box; Drop writes the
  self-documenting `- [x] ~~text~~ (dropped)` artifact (PQ5, PQ10).
- Follow-ups pass offers **Fix now / Defer / Drop / Promote-to-backlog** per
  entry; "Fix now" redirects (via AskUserQuestion) to `/qrspi:followup`, it does
  not inline-delegate (PQ2, PQ7).
- Make both passes mode-aware: suppress a *clean* pass in Full/Semi-auto; present
  the gate (hard-stop) when open items exist; always run in Manual (PQ3).
- Show a count banner before the per-item loop (PQ8).
- Keep the reviewer's "all boxes ticked" check as an independent safety net (PQ6).
- Handle an absent/empty `followups.md` gracefully (research bullet 2).
- Carry the new behavior into `copilot/` via a clean `sync-copilot.mjs` port.

**Non-Goals (separable future changes, not this PR):**
- **`right-size-followup-handling`** — the three-way routing of a follow-up fix
  (implement directly / addendum / defer). This change only *asks* about each
  follow-up; it does not change how a "Fix now" is ultimately routed once
  `/qrspi:followup` runs.
- **`standardize-recurring-ops-scripts`** — a Node helper for open-item
  enumeration. This change enumerates open items by having the orchestrator read
  the files inline; authoring a shared helper is that item's job (D9).
- **Changing the reviewer subagent's checklist** beyond a one-line awareness note
  — the reviewer keeps its independent ticked-box verification (PQ6).
- **Changing the `followups.md` or `tasks.md` on-disk format** — the passes read
  and (for Drop) annotate existing shapes; they do not redefine them.
- **A `pr.md`-shape validator** (`validate-pr-md-shape`) — out of scope.

## Decisions

### D1 — Gate placement: after the precondition, before the reviewer spawn; the gate itself is not a subagent

The reconciliation gate lives in `pr.md` between step 2 (precondition) and the
current step 3 (reviewer spawn). It runs **on the main-loop orchestrator**, not
inside a subagent — it must call AskUserQuestion (main-loop-only, research
"AskUserQuestion gate conventions") and it edits `tasks.md`. Placing it before
the reviewer is required by PQ6-plus-Q6: the reviewer verifies all boxes are
ticked, so open items must be resolved *upstream* of it. (Chosen over: putting
the passes inside the reviewer — rejected, the reviewer is read-only and cannot
call AskUserQuestion; over putting them after the reviewer — rejected, the
reviewer would then flag the very items the gate is about to resolve.) Cites
Q6, PQ6.

### D2 — Precondition assertion softened to "file exists"; the pass is the guard

Today's precondition prose says "all boxes in tasks.md are ticked" but the Glob
only checks existence (research "Implicit contracts" 1). I recommend option (c)
from Q7: **soften the stated precondition to "tasks.md exists + tree clean"**,
and move the "all ticked" expectation to the *exit condition of the tasks pass*.
Rationale: the whole point of the new pass is to *help the user resolve* open
tasks, so a hard precondition failure on an un-ticked box would abort before the
help can run. After the tasks pass completes, every box is ticked (finished or
dropped-as-ticked per PQ5), which is exactly the state the reviewer then
verifies. (Rejected: keep as a hard gate (a) — it would refuse before the gate
can help; remove entirely (b) — loses the documented contract.) Cites Q7.

### D3 — Tasks pass: Finish / Drop / Pause; enumerate individual un-ticked lines, show parent slice for context

Per PQ10, the per-task question offers **Finish / Drop / Pause** (no Defer, per
PQ9). The pass enumerates individual un-ticked `- [ ] N.M …` lines (not whole
slices) so each decision is precise, but the AskUserQuestion **shows the parent
`## N. <slice>` heading** for context and a `(i of M)` counter (Q15). Semantics:
- **Finish** — the user resolves it. Because the orchestrator cannot itself
  implement arbitrary in-change work reliably, "Finish" pauses and offers (via
  AskUserQuestion) to redirect to `/qrspi:implement <id>` then re-run `/qrspi:pr`,
  mirroring the follow-up "Fix now" redirect shape (D4). The orchestrator does
  *not* silently write code.
- **Drop** — the box is ticked with the self-documenting artifact from PQ5:
  `- [x] ~~N.M <text>~~ (dropped)`. This keeps `tasks.md` reading all-ticked
  (satisfying the reviewer's check, PQ6) while recording intent in the artifact.
- **Pause** — the escape hatch: stop the pass, let the user inspect the code, and
  end the turn with a note to re-run `/qrspi:pr <id>` when ready.

**`(human)`-tagged boxes are a distinct category (OQ1, option c).** An un-ticked box
whose text carries the `(human)` tag (e.g. `- [ ] 1.6 (human) Code-review checkpoint`)
is the human's manual step, not the agent's — a code-redirect "Finish" does not fit.
The tasks pass detects the `(human)` tag and routes those boxes to a separate prompt
with choices **Confirm-done / Drop / Leave-for-now**:
- **Confirm-done** — the human confirms they performed the manual step; the box is
  ticked normally (`- [x]`, no `(dropped)` annotation).
- **Drop** — same PQ5 artifact as a normal Drop (`- [x] ~~text~~ (dropped)`).
- **Leave-for-now** — the box stays un-ticked and passes through. This is the sole
  sanctioned exception to the reviewer's PQ6 "all ticked" check (see D8): a `(human)`
  box may legitimately remain open at PR/archive time. The banner counts these
  separately ("K `(human)` boxes await your confirmation").

Cites PQ9, PQ10, PQ5, Q5, Q15, OQ1.

### D4 — Follow-ups pass: four options; "Fix now" and "Finish" both redirect, never inline-delegate

Per PQ2, the per-follow-up question offers **Fix now / Defer (keep in
followups.md) / Drop / Promote to backlog idea** — four choices, intentionally
asymmetric with tasks (PQ9). Semantics:
- **Fix now** — per PQ7, the orchestrator does **not** spawn the implementer
  inline. It presents a *second* AskUserQuestion: "Run `/qrspi:followup <id>` now,
  then re-run `/qrspi:pr <id>`" vs "Stop here". It offers the redirect as a
  choice rather than dictating a flat instruction.
- **Defer** — leave the entry in `followups.md` un-ticked, unchanged; it is
  resolved post-PR. No annotation is added (Q22 — simplest; the entry already
  carries its own source tag).
- **Drop** — the entry is **ticked** (`- [x]`) with a `(dropped — no longer
  needed)` annotation rather than deleted, so the "every box ticked before
  archive" rule (postpr-fix skill) is satisfied and the drop leaves a trace
  (Q21, option "ticked"). Mirrors the tasks-Drop philosophy: annotate, don't
  vanish.
- **Promote to backlog idea** — reuse the existing "Capturing deferred work"
  offer machinery (workflow skill): add one `idea` row to `openspec/backlog.md`,
  then tick+annotate the followups.md entry as `(promoted to backlog)`. The
  backlog edit lands in the reconciliation commit (D7).

Cites PQ2, PQ7, Q21, Q22.

### D5 — Auto-mode: suppress a clean pass; present the gate as a hard-stop when items are found

Per PQ3 (option b), each pass is mode-aware:
- **Manual** — always run both passes (banner + per-item loop), even when clean
  (a clean pass prints "0 open — nothing to resolve" and continues).
- **Full / Semi-auto** — suppress a pass that is **clean** (tasks: every box
  ticked; follow-ups: `followups.md` absent or has zero un-ticked boxes). When a
  pass finds open items, it **fires a hard-stop** — surfaces the count and
  presents the review gate via AskUserQuestion, and does not auto-advance.

This maps onto existing `workflow` machinery deliberately: the reconciliation
gate is **not** added to the "Never-suppressed gates" list (that list is for
gates shown even when there is nothing to decide — D review, backlog offers).
Instead it behaves like a **conditional hard-stop**: clean → silent skip in
auto; dirty → hard-stop. This is a *new* hard-stop trigger, distinct from the
four enumerated conditions in the `workflow` "Hard-stop procedure" (which are
about failures/divergence, not open in-change items). D8 covers whether to add a
fifth enumerated condition or document this locally in `pr.md`; my recommendation
is a short cross-reference note in the workflow skill's hard-stop section plus the
full mechanics in `pr.md`, keeping the workflow skill the single source of truth
for the *concept* of a hard-stop while not bloating its enumerated list.

Cites PQ3, Q14.

### D6 — Ordering: tasks pass first, then follow-ups; both handle absence gracefully

Tasks pass runs before the follow-ups pass (Q10). There is no data dependency
now that tasks have no "Defer→followups.md" path (PQ9 removed it), but tasks-first
is the natural reading order and matches the ticket. Absence handling
(research bullet 2): the tasks pass always has a `tasks.md` (precondition), but
it may have zero un-ticked boxes → treated as a clean pass (D5). The follow-ups
pass must tolerate `followups.md` being **absent** (the common case — reviewer
found zero issues last run, or the change predates the convention) or **present
but prose-only / all-ticked** (the archived `reconcile-plan-worktree-order`
counter-example). All three collapse to "zero un-resolved follow-ups" → clean
pass. Cites Q10, Q4, Q11.

### D7 — Commit the reconciliation edits into the existing final PR-link commit

The Drop annotations to `tasks.md` and `followups.md`, and any backlog `idea`
row from a Promote, are **not** committed in a separate intermediate commit; they
are folded into the existing final `docs(<id>): record PR #<N> link` commit, with
those paths added to the explicit `git add` list. Rationale (Q20): a separate
pre-reviewer commit would need its own message and would fragment the PR-stage
history; the reviewer reads the working tree (not `HEAD`), so it sees the
post-edit state regardless of whether it is committed yet. The one caveat: if the
user chose "Pause" or a "Fix now/Finish" redirect, the stage ends **before**
PR-create — in that early-exit path any `tasks.md` Drop edits already made must
still be committed (a small `docs(<id>): reconcile open tasks before PR` commit)
so the edits are not left dangling in a dirty tree that the *next* `/qrspi:pr`
precondition (clean-tree gate) would then reject. Cites Q20.

### D8 — Reviewer check kept as-is; add only a one-line awareness note; Copilot sync via the script

Per PQ6, the reviewer's step-4 "verify each box in tasks.md is ticked" is
**kept unchanged** as an independent safety net. Dropped tasks read as `- [x]`
(PQ5) so they pass it. I recommend **not** softening the reviewer's "Open issues"
reporting (Q24 rejected option c) — the gate already reconciles, and having the
reviewer still surface anything that slipped through is the belt-and-suspenders
value. The one reviewer-agent edit is a one-line awareness note that (a) a
pre-reviewer reconciliation gate now runs upstream, and (b) a `(human)` box left
via "Leave-for-now" (OQ1) is a *sanctioned* open box — the reviewer may still
list it, but as an expected `(human)` item, not a blocking "Open issue". This is
documentation plus one tolerated exception, not a behavior rewrite.

**Copilot sync (research bullet 4 / "Copilot sync mapping"):** the Copilot port
collapses `pr.md`'s orchestration into the single `copilot-reviewer` agent, so
the new orchestrator-level passes will live *inside* that agent in the generated
`qrspi-pr.prompt.md`. This is the pre-existing fidelity gap, not a new one — the
AskUserQuestion → `vscode/askQuestions` mapping in `sync-copilot.mjs` already
handles the new gate's prompts. The sync story is: edit `claude/` only, run
`node sync-copilot.mjs`, and verify the generated prompt carries the passes with
`vscode/askQuestions` calls. No new `sync-copilot.mjs` mapping rule is expected;
if the new prose introduces an unmapped construct, fix the *script*, never the
generated file (CLAUDE.md). Cites PQ6, Q23, Q24, Q25, Q26.

### D8-bis — Add lint Check 8 asserting `pr.md` carries both passes (OQ3)

Per OQ3 (human override of the designer's lean), `scripts/lint.mjs` gains a
**Check 8**: a structural assertion that `claude/commands/pr.md` still contains
both reconciliation passes. To keep it robust rather than brittle, it matches on
stable anchors — the presence of a "tasks pass" and a "follow-ups pass" section
plus the two option-set signatures (`Finish`/`Drop`/`Pause` and the four-way
follow-up set) — not incidental wording. The check is a floor against a future
edit silently deleting a pass; the dogfood run (Q27a) remains the real behavioral
acceptance bar. This lands in Slice 3 alongside the other cross-cutting wiring.
Cites Q28, OQ3.

## Data model changes

Not applicable (kit-behavior change). The only file-shape touch is the **Drop
annotation** on existing artifacts: `tasks.md` gains `- [x] ~~N.M <text>~~
(dropped)` lines, and `followups.md` gains `- [x] **<title>.** … (dropped — no
longer needed)` / `(promoted to backlog)` lines. Both are within the existing
markdown checkbox grammar — no new format.

## API surface

The "API" is the prose logic of `claude/commands/pr.md` and the AskUserQuestion
prompts it poses. New prompts (Manual, and Full/Semi when items exist):
- Banner (not a question): "Found N open tasks and M un-resolved follow-ups —
  reviewing each now." (PQ8)
- Per task: "Task N.M — `<text>` (slice: <heading>) is not ticked. (i of M) What
  would you like to do?" choices: [Finish it now, Drop — no longer needed, Pause
  — let me check the code first].
- Per follow-up: "Follow-up: `<title>` — `<excerpt>`. (i of M) What now?" choices:
  [Fix now, Defer — keep in followups.md, Drop — no longer needed, Promote to
  backlog idea].
- Fix-now / Finish redirect: "Run `/qrspi:followup <id>` (or `/qrspi:implement
  <id>`) now, then re-run `/qrspi:pr <id>`?" choices: [Yes — redirect, Stop here].

## UI surface

Not applicable (no web UI). The user-facing surface is the AskUserQuestion gate
above, on the main-loop orchestrator.

## Authorization

Not applicable (no auth layer).

## Vertical slices (preview)

Stage V will detail; keep these vertical (each ends in a demoable `/qrspi:pr`
run against a toy change):

- **Slice 1 — Tasks pass end-to-end:** insert the tasks pass into `pr.md` (banner
  + per-item loop + Finish/Drop/Pause + Drop annotation + softened precondition +
  early-exit commit). Demo: run `/qrspi:pr` on a change with one un-ticked box and
  one already-ticked box; confirm Drop writes the strikethrough and the reviewer's
  check then passes.
- **Slice 2 — Follow-ups pass end-to-end:** insert the follow-ups pass (4-way
  options + Fix-now redirect + Drop/Promote annotations + absent-file tolerance).
  Demo: run against a change with a 2-item `followups.md` and against one with no
  `followups.md`.
- **Slice 3 — Auto-mode wiring + workflow-skill note + lint Check 8 + Copilot sync
  + docs:** mode-aware suppress/hard-stop behavior, the one-line reviewer note (incl.
  the `(human)` Leave-for-now tolerance, OQ1), the workflow hard-stop cross-reference
  (OQ2), the new `scripts/lint.mjs` Check 8 (OQ3), `node sync-copilot.mjs`, CHANGELOG
  `[Unreleased]` entry. Demo: Full-auto run stays silent when clean, hard-stops when
  dirty; `node scripts/lint.mjs` passes and fails if a pass is deleted.

## Risks / Trade-offs

- **Enumeration is done by the orchestrator reading the file inline**, not by a
  vetted parser — a malformed `tasks.md`/`followups.md` line could be mis-classified
  as ticked/un-ticked. Mitigation: match the canonical `- [ ]` / `- [x]` prefixes
  the templates define; the reviewer's independent check (PQ6) is the backstop.
- **Two new interactive passes lengthen the PR stage** in Manual mode even when
  clean (a no-op "0 open" message per pass). Accepted per PQ3 — Manual users opted
  into every gate.
- **The Fix-now/Finish "redirect then re-run" loop can feel like busywork** if a
  user has several items — they re-enter `/qrspi:pr` after each. Accepted:
  PQ7 explicitly chose redirect over inline delegation to keep the orchestrator
  simple; batching is a `right-size-followup-handling` concern.
- **The auto-mode hard-stop is a new trigger not in the workflow skill's
  enumerated four** — risk of the concept drifting from that single source of
  truth. Mitigated by D8's cross-reference note (see OQ2).

## Open questions for the human

- [x] **OQ1 — `(human)` un-ticked boxes.** Research bullet 5 notes `(human)`-tagged
  boxes (e.g. `progressive-task-ticking` `1.6 (human) Code-review checkpoint`)
  legitimately remain un-ticked at archive time — they are the human's to finish,
  not the agent's. Should the tasks pass (a) treat a `(human)` box like any other
  un-ticked box (offer Finish/Drop/Pause — but "Finish" for a `(human)` box means
  *the human confirms they did the manual step, then it is ticked*, not a code
  redirect); (b) **skip** `(human)` boxes silently and let them pass through
  un-ticked (but then the reviewer's "all ticked" check flags them — contradiction
  with PQ6); or (c) surface them in the banner as a distinct category ("K `(human)`
  boxes await your confirmation") with a **Confirm-done / Drop / Leave-for-now**
  choice? My lean is (c): `(human)` boxes are real open items but need a
  confirm-semantics distinct from the code-redirect Finish. This needs a human call
  because it interacts with the reviewer's PQ6 check.
  **Answer: (c) — distinct category. `(human)` boxes are surfaced separately (banner +
  a `Confirm-done / Drop / Leave-for-now` choice), NOT via the code-redirect Finish. See
  D3, updated accordingly. "Leave-for-now" lets the box pass through un-ticked — so this
  is the one sanctioned case where the reviewer's PQ6 "all ticked" check must tolerate a
  legitimately-open `(human)` box (see D8 awareness note).**

- [ ] **OQ2 — Where the new hard-stop trigger is documented.** D5 introduces a
  *conditional* hard-stop (clean→skip, dirty→present-gate) that is not one of the
  four enumerated conditions in the `workflow` skill's "Hard-stop procedure".
  Should we (a) add it as a **fifth enumerated hard-stop condition** in the
  workflow skill (most discoverable, but grows a list that is otherwise about
  failures/divergence); (b) keep the full mechanics in `pr.md` and add only a
  one-line **cross-reference** in the workflow skill (my lean — keeps the
  enumerated four about failures, documents the new gate where it lives); or
  (c) document it purely in `pr.md` with no workflow-skill note (risks the
  concept drifting from the single source of truth)?
  **Answer: (b) — cross-reference note. Full mechanics live in `pr.md`; the `workflow`
  skill's "Hard-stop procedure" gets a one-line pointer to it, keeping the enumerated
  four focused on failure/divergence while still reflecting the new gate. Matches D5.**

- [ ] **OQ3 — A lint check for the passes (Q28).** Existing `scripts/lint.mjs`
  has seven checks. Should we add a Check 8 asserting `pr.md` contains the two
  passes (e.g. keyphrases "tasks pass"/"follow-ups pass" and the Finish/Drop/Pause
  + four-way option sets)? Trade-off: mechanical but shallow (asserts prose
  presence, not behavior); a dogfood run (Q27a) is the real acceptance bar. My
  lean: **no new lint check** for v1 — the property is prose, not structural, and
  a keyphrase assertion is brittle; rely on the dogfood run plus code review. If a
  future regression removes a pass silently, revisit. Flagged because the ticket
  and Q28 explicitly raised it.
  **Answer: ADD Check 8 (overrides the designer's lean). `scripts/lint.mjs` gains a
  Check 8 asserting `pr.md` carries both passes — the accepted brittleness trade-off is
  worth a mechanical guard against a future edit silently dropping a pass. See D8-bis and
  Slice 3. Keep the assertion as robust as practical (match on stable structural
  anchors — e.g. a "tasks pass" / "follow-ups pass" heading and the option-set phrases —
  rather than incidental wording).**
