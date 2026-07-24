# Design — right-size-followup-handling

> Stage D of QRSPI. Generated 2026-07-24.
> **Implementation is BLOCKED until a human approves this file.**

## Context

`/qrspi:followup <id>` is today a single-path loop: it verifies the PR is
open, spawns `qrspi:implementer` in FIX MODE, and lets the `postpr-fix`
skill's seven-step checklist resolve one item from `followups.md`. That
path assumes every follow-up is small, atomic, and in-scope. The skill's
guardrails tell the implementer to *stop* when a follow-up turns out to be
design-level, cross-capability, or new scope — but by then the orchestrator
has already committed to the small-fix path, and "stop" is a dead end with
no sanctioned next move.

This change adds an **upfront triage gate** to `followup.md` (the
orchestrator) that right-sizes each follow-up *before* the implementer is
spawned, and routes it to one of three paths: **P1 implement directly**
(today's flow), **P2 addendum** (re-enter the QRSPI pipeline at an earlier
stage under a sibling change folder), or **P3 defer** (drop to
`openspec/backlog.md` as an idea). The triage is a human-in-the-loop
size/scope judgment, never suppressed, added so a large follow-up is never
silently pushed through the small-fix path. The `postpr-fix` skill (the
implementer's checklist) is unchanged — the three-path model lives entirely
in the orchestrator. This is a prose-only kit-behavior change to
`claude/commands/followup.md` plus a summary edit to
`claude/skills/workflow/SKILL.md`, regenerated into `copilot/` via
`sync-copilot.mjs`, and (recommended) a new `scripts/lint.mjs` structural
check.

## Goals / Non-Goals

**Goals:**
- Add a never-suppressed triage gate to `followup.md` that classifies each
  follow-up (agent proposes from heuristics, human confirms/overrides — PQ1,
  PQ2) and routes to one of three wired paths.
- Define the addendum (P2) mechanics end-to-end: sibling folder model, id
  naming, same-branch/open-PR rule, backlog treatment, `followups.md` annotation, and
  QRSPI pipeline re-entry — reusing existing choreography, adding no ninth
  stage.
- Define P3 (defer) to reuse `pr.md`'s existing "Promote to backlog idea"
  mechanics (P3 priority default — PQ7).
- Keep `postpr-fix` path-1-only (PQ8); update `workflow`'s "After PR — the
  fix loop" (PQ9); keep `copilot/` in parity.

**Non-Goals:**
- Changing the `postpr-fix` fix checklist, the `followups.md` format, how
  `followups.md` is seeded, or the `pr.md` reconciliation gate (all
  explicitly out of scope per questions.md scope guard).
- Building a Node helper to parse `followups.md` — that is the
  `standardize-recurring-ops-scripts` backlog item; the agent reads prose.
- Auto-executing the addendum's pipeline stages from within `followup.md` —
  triage hands off; it does not run Q→PR itself.

## Decisions

### D1 — Triage runs once per invocation, per targeted item, before the implementer is spawned

`/qrspi:followup` keeps its **one-follow-up-per-invocation** contract
(research §Implicit-contracts 1). The triage classifies the *single* item
this invocation targets (the named fix, or the next un-ticked
`followups.md` item), then routes it. It is **not** a batch classifier over
the whole queue — different items route differently, so each is triaged on
its own invocation (answers Q4, Q22). The gate is inserted **after** the
Glob preconditions (folder + `pr.md` exist) and **before** the implementer
is spawned, so P2/P3 never reach FIX MODE.

**Rejected:** batch-triage-the-whole-queue (one path for all items) — loses
per-item routing, which is the entire point.

### D2 — Agent proposes a path from an explicit heuristic rubric; human confirms or overrides (PQ1)

The orchestrator self-assesses the targeted follow-up against four
heuristic signals (from Q1), then presents its proposed path as the
*recommended* option in the triage question. The four signals:

1. **Contract change?** Does the fix change a route/status/DTO/auth/
   validation contract that needs a **delta-spec amendment** (vs. purely
   internal)? — a contract change alone is still P1 (the `postpr-fix`
   checklist already syncs deltas); it is a *nudge* toward P2 only in
   combination with the others.
2. **Multi-capability?** Does it touch more than one `specs/<capability>/`
   subdir the change owns? — nudges P2.
3. **Design re-alignment?** Does resolving it require revising a `design.md`
   `Dn` decision (not just amending a delta scenario)? — strong P2 signal.
4. **New scope?** Is it not covered by the change's delta spec at all
   (genuinely a different change)? — strong P3 signal.

Rubric (agent's default proposal): **P1** when none of 2/3/4 fire (atomic,
single-capability, expressible as a delta amendment or internal fix);
**P2** when 3 fires, or 1+2 fire together (re-alignment needed but still this
change's scope) **and the parent PR is still open**; **P3** when 4 fires (new
scope), when the parent PR has already merged, or when the work would otherwise
need its own branch/PR (D8a). The signals are **agent-assessed, all advisory** —
the human's override is final (PQ1/PQ2).

**Rejected:** open-ended "how big is this?" (Q2 option) — not reproducible;
human-sole-judge with no proposal (PQ1 option c) — the whole point is to
surface a reasoned proposal, not offer three cold choices.

### D3 — The triage gate is never suppressed, in every run-mode (PQ2)

The triage gate joins the **never-suppressed gates** list conceptually: it
is an `AskUserQuestion` that fires in Full auto, Semi-auto, and Manual alike
(answers Q17). Auto-advancing it would defeat its purpose (silent
mis-routing is exactly what it prevents). Note: `followup.md` is not itself
a chained Q→PR stage — it is invoked deliberately post-PR — so in practice
"run-mode" rarely holds here, but the rule is stated so a future
auto-chained invocation cannot suppress it. The exact shape (D4) always
asks.

### D4 — Exact triage AskUserQuestion shape (Q18)

After the preconditions and self-assessment, before any implementer spawn:

> question: "Triage follow-up `<short title>` — `<brief excerpt>`.
> Proposed: **<P1|P2|P3>** because <one-line rationale from the signals>.
> How should this be handled?"
> choices:
> - "P1 — implement directly (small in-scope fix)"
> - "P2 — addendum (re-enter QRSPI at an earlier stage)"
> - "P3 — defer to backlog idea (new scope)"

The agent's proposed path is named in the question text (not a fourth
choice) so the recommendation is visible but the human picks explicitly
(PQ1). No "I'm unsure" escape hatch is added — the three paths plus the
override are sufficient; an unsure human picks P2 (re-align) or stops.

### D5 — Path routing is wired inline in `followup.md`; only P1 spawns the implementer

- **P1** — unchanged from today: spawn `qrspi:implementer` in FIX MODE with
  the model logic already in the file (sonnet default, opus for
  design-level/multi-file). The triage adds nothing to P1's mechanics
  (answers Q6) and records **no new annotation** on the P1 `followups.md`
  entry — the existing `— fixed in <short-sha>` tick is the record (Q7,
  keeps the happy path thin and avoids a new `followups.md` shape).
- **P2** — the orchestrator does **not** spawn the implementer. It performs
  the addendum-creation mechanics (D6–D9), annotates `followups.md` (D10),
  and **ends the turn** instructing the human to run `/qrspi:<stage>
  <addendum-id>`.
- **P3** — the orchestrator does **not** spawn the implementer. It reuses
  the "Promote to backlog idea" mechanics (D11), annotates `followups.md`
  (D10), and ends the turn.

The "one follow-up per invocation" constraint holds across all three
(Q22): P1 resolves one item; P2/P3 dispose of one item and terminate.

### D6 — Addendum folder model: a flat sibling change folder (PQ3)

An addendum is a **new, flat sibling change folder**
`openspec/changes/<original-id>-addendum-N/` — a first-class QRSPI change,
not a subdirectory of the parent and not mixed into the parent's artifacts
(answers PQ3 option a, Q8). This is the model consistent with the
conventions research documented: change folders are **flat** and one-per-id
(research §Change-folder), the id is kebab-case (D7 satisfies verb-first
because the parent id already leads with a verb), and every `/qrspi:<stage>`
command already expects `openspec/changes/<id>/` at the top level. A nested
`<id>/addendum-1/` (option b) would break that flat convention and every
stage command's Glob precondition path; reusing the parent folder (option c)
would collide artifact names (two `design.md`s). The sibling model also keeps
the addendum's artifacts cleanly namespaced from the parent's on the shared
branch (D8).

**Rejected:** nested subdir (breaks flat convention + stage Globs); reuse
parent folder (artifact-name collisions).

### D7 — Addendum id naming: `<original-id>-addendum-N`, numbered (PQ5)

The addendum change id is `<original-id>-addendum-N`, `N` starting at 1 and
incrementing per addendum on the same parent (PQ5 option b). The
orchestrator finds the next `N` by Globbing
`openspec/changes/<original-id>-addendum-*/` and taking `max+1` (Q24). This
supports multiple addenda per change and lets the orchestrator locate the
folder programmatically. Verb-first is satisfied transitively (the parent id
leads with a verb).

### D8 — Addendum stays on the parent's branch; no new branch or PR (revises PQ4)

A P2 addendum always extends the **parent's open PR on its current branch** —
the orchestrator never creates a branch or a separate PR and never asks a branch
question. The justification for P2 over P3 is that the work still belongs to
*this* change and extends the work in flight; if it cannot live on the open PR
it is not extending anything — it is a separate change, which is P3 (D11). This
**revises PQ4** (originally "branch by entry stage; Q/R → new branch"): the
new-branch / follow-on-PR variant is removed, because "needs its own branch/PR"
is exactly the P2↔P3 boundary. Consequences: the branch `AskUserQuestion` and
the `git checkout -b` / `push -u` machinery are gone, and P2 is only meaningful
while the parent PR is open (D8a).

### D8a — P2 requires an open parent PR; a merged parent routes to P3

`/qrspi:followup` only requires `pr.md` to exist, and `pr.md` persists after the
PR merges — so the parent PR may already be merged when a follow-up lands. With
no open PR to extend, a same-branch addendum is impossible, so a merged parent
(or any otherwise-divergent, question-/research-shaped follow-up) routes to
**P3**, not P2. The triage rubric (D2) proposes P2 only when there is an open PR
to extend; a P3 idea created this way relates back to the parent change.

### D9 — Pipeline re-entry: human picks the entry stage (D/S/V/P/I); orchestrator hands off, does not auto-run (Q9, Q23, Q25)

The valid entry stages are **D, S, V, P, I** — the design-or-later stages that
extend an open PR. Q and R are dropped from the original Q..I list: re-opening
questions or fresh research is early-pipeline divergence, i.e. a new change,
which is P3 (D8/D8a). The orchestrator asks the human to pick the entry stage
(one `AskUserQuestion`; the agent may *suggest* one from the signals — e.g.
"reopens a design decision → D"; "reshapes a delta scenario → S"; OQ3:
suggest-only, no pre-selection), then **instructs the human to run
`/qrspi:<stage> <addendum-id>`** rather than invoking it itself (answers Q9).
Handing off (not auto-running) preserves every re-entered stage's own gates and
run-mode establishment.

**Note (feasibility, verified in dogfood):** `/qrspi:<stage> <addendum-id>`
works unmodified on a sibling id — the stage commands are id-parametric and Glob
`openspec/changes/<id>/`; nothing hard-codes a single change. The dogfood
confirmed only `/qrspi:questions` self-bootstraps its folder; every late
entry-stage command (D/S/V/P/I) Globs a precondition artifact and refuses if the
folder is missing. So `followup.md` creates the empty sibling folder itself
(with a `.gitkeep`) before the handoff, guaranteeing the entry-stage command
finds a valid `openspec/changes/<addendum-id>/` path on disk.

### D10 — `followups.md` annotation for P2 and P3: tick-with-note, mirroring pr.md precedent (PQ6)

Both P2 and P3 **tick** the `followups.md` entry with an annotation, rather
than leaving it un-ticked (resolves PQ6):

- **P2:** `- [ ] <text>` → `- [x] <text> (routed to addendum <addendum-id>)`
- **P3:** `- [ ] <text>` → `- [x] <text> (deferred to backlog — <slug>)`

Rationale: research established the archival un-ticked check in `archive.md`
is **inform-only, non-blocking** (§Implicit-contracts 6) — so ticking is not
strictly required to unblock archive, but it *is* the right choice for two
reasons. (1) It mirrors the **existing pr.md precedent exactly**: that gate
already writes `- [x] <text> (promoted to backlog)` and `- [x] <text>
(dropped — ...)` — tick-with-parenthetical-note is the established
`followups.md` disposition idiom, so P2/P3 reuse it rather than inventing a
new leave-un-ticked-but-annotated shape. (2) It keeps the audit trail
honest: the box is closed *here* because this item's disposition is decided
*here* (routed onward / deferred); the follow-on work is tracked by the
addendum folder (P2) or the backlog row (P3), not by a dangling parent
checkbox. This satisfies the "every box ticked before archival" advisory
without leaving a box that blocks nothing but reads as unfinished.

**Rejected:** leave-un-ticked (Q12b/Q15b) — reads as unfinished, blocks
nothing, and diverges from the pr.md idiom; delete-the-entry (Q12c/Q15c) —
loses the audit trail of why the item left the queue.

### D11 — P3 defer reuses pr.md's "Promote to backlog idea" mechanics, P3 default priority (PQ7, Q14, Q16)

Path 3 appends **one `idea` row** to `openspec/backlog.md` under `## Ideas`,
using the exact mechanics research documented for `pr.md`'s follow-ups pass:
level-3 heading with kebab-slug + `idea` status + `· **P3**` priority band,
followed by a `**Why:**` paragraph; slug derived from the follow-up title.
The orchestrator writes the row itself (answers Q14 — agent writes it, does
not merely instruct). Priority defaults to **P3** (PQ7), matching the pr.md
convention. This does **not** violate `followup.md`'s "a post-PR fix does
not change the backlog *status line*" rule (Q31): adding a new `idea` row is
distinct from flipping the parent change's `in-progress` status — the parent
row is untouched. Both the backlog row and the `followups.md` tick (D10) are
staged in the same commit (backlog atomicity).

### D12 — Files that change; postpr-fix stays path-1-only (PQ8); workflow gets the summary (PQ9)

- `claude/commands/followup.md` — the triage gate (D1–D5), P2 mechanics
  (D6–D10), P3 mechanics (D10–D11). The bulk of the change.
- `claude/skills/postpr-fix/SKILL.md` — **unchanged** (PQ8): the implementer
  does not triage; the three-path model lives only in the orchestrator.
- `claude/skills/workflow/SKILL.md` — update "After PR — the fix loop" to
  summarize the triage and the three paths (PQ9), so stage-command authors
  get the full picture from `workflow`.
- `copilot/prompts/qrspi-followup.prompt.md` and any touched
  `copilot/instructions/*` — **regenerated** by `node sync-copilot.mjs`,
  never hand-edited (research §Copilot; house rule). The existing
  `AskUserQuestion → #tool:vscode/askQuestions` and skill-load rewrites apply
  to the new triage prose automatically; no new fidelity gap is expected
  (Q26, Q27).
- `CHANGELOG.md` — one line under `## [Unreleased]` (Q32); no version bump.
- `scripts/lint.mjs` — recommended new Check 10 (D13).

### D13 — Recommended: a `scripts/lint.mjs` structural check for the triage choices (Q29)

Add **Check 10** asserting `claude/commands/followup.md` contains the three
triage choice anchors — the P1/P2/P3 choice-label prefixes from D4 (e.g.
`"P1 — implement directly`, `"P2 — addendum`, `"P3 — defer`). This mirrors
Check 8 (`checkPrReconciliationPasses`), which already pins the follow-ups
pass choice labels in `pr.md`, so the triage gate gets the same mechanical
floor and a future rename can't silently drop a path. Follow the documented
add-a-check pattern (new `async function checkTriagePaths(errors)` + a
`main()` call + header-comment update). The acceptance bar (Q28) is code
review of the prose diff **plus** this lint anchor; a full dogfood run
(create a multi-capability follow-up, watch it route to P2) is the
higher-confidence option and is offered as an open question below.

## Vertical slices (preview)

Prose-only kit change; slices are thin but still user-facing end-to-end:

- **Slice 1 — Triage gate + P1 pass-through:** add the self-assessment,
  the D4 `AskUserQuestion`, and wire P1 to today's implementer spawn
  (P2/P3 stubbed to "not yet"). Demoable: running `/qrspi:followup`
  surfaces the triage and, on P1, resolves a fix exactly as before.
- **Slice 2 — P3 defer path:** wire P3 to the backlog-idea append + D10
  tick. Demoable: a new-scope follow-up lands as a `P3` idea row and the
  box is ticked `(deferred to backlog — <slug>)`.
- **Slice 3 — P2 addendum path:** wire folder/id/entry-stage mechanics (same
  branch, no branch question) + D10 tick + handoff. Demoable: a large follow-up
  produces a `<id>-addendum-1` folder on the parent branch and a handoff
  instruction.
- **Slice 4 — workflow summary + copilot resync + lint Check 10:** update
  `workflow`, run `sync-copilot.mjs`, add the lint check; `node
  scripts/lint.mjs` green.

## Risks / Trade-offs

- **Triage mis-proposal.** The agent's four-signal rubric (D2) can propose
  the wrong path. Mitigated: the human always confirms/overrides (PQ1) and
  the gate is never suppressed (D3). The rubric is a nudge, not an
  auto-router.
- **Addendum folder proliferation.** Sibling folders `-addendum-1/-2/...`
  accumulate under `openspec/changes/`. Accepted: they archive with (or
  alongside) the parent like any change; the flat model is the cost of a
  clean per-change QRSPI shape.
- **Same-branch addendum grows the PR.** A P2 addendum always lands on the
  parent's branch (D8), so a large one can bloat the open PR. Accepted: the
  triage gate is the control — genuinely divergent or post-merge work is P3
  (D8a), so only work that legitimately belongs in this PR lands here.
- **Stage-command folder bootstrapping for late entry stages (S/V/P/I).**
  If a late entry-stage command does *not* create a missing sibling folder,
  the handoff fails. Flagged as the D9 stage-I watch-item with a `mkdir`
  fallback in `followup.md`.
- **Lint anchor brittleness.** Check 10 pins the exact choice-label prefixes;
  a wording change to D4's choices must update the lint (same property as
  Check 8). Accepted — that is the point of the anchor.

## Open questions for the human

- [x] **OQ1 — Acceptance bar (Q28).** **Resolved: dogfood the P2 path once.**
  Acceptance = code review of the prose diff **+** lint Check 10 **+** one real
  dogfood run of the P2 addendum path (create a multi-capability follow-up,
  run `/qrspi:followup`, confirm it routes to P2 and produces the sibling
  folder + handoff). P2 is the most novel mechanics, so it gets the
  higher-confidence bar.
- [x] **OQ2 — Is lint Check 10 worth its brittleness?** **Resolved: yes, add
  Check 10.** Parity with Check 8; the mechanical floor against a silently
  dropped path is worth the wording-brittleness cost (D13 proceeds).
- [x] **OQ3 — Entry-stage suggestion strength (D9).** **Resolved: suggest
  only.** The agent names a suggested entry stage in the question text but
  pre-selects nothing; the human picks explicitly — entry-stage choice stays a
  deliberate human pick. (The branch question this once compared against is now
  gone — D8: the addendum always uses the parent's branch.)
