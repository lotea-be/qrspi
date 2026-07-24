# Design — right-size-followup-handling

> Stage D of QRSPI. Generated 2026-07-24.
> **Implementation is BLOCKED until a human approves this file.**

## Revision note

This design has been revised mid-PR. The **P2 path is redesigned**: it no
longer creates a separate sibling `<id>-addendum-N` change folder with an
entry-stage pick and a branch decision. **P2 is now an in-place scope
amendment of the parent change** — it reuses `implement.md`'s existing
"Adding scope after stage I has started" flow, edits the parent's `design.md`
/ delta `specs/**` in place, appends a `## N.` vertical-slice group to
`slices.md` + `tasks.md`, and extends the same open PR. All folder /
entry-stage / branch machinery from the earlier draft is **removed**. This
revision supersedes the folder-based P2 decisions and their associated risks
and open questions; the decisions below are renumbered cleanly. The triage
gate (D1–D5) and P1/P3 are substantively unchanged.

## Context

`/qrspi:followup <id>` is today a single-path loop: it verifies the PR is
open, spawns `qrspi:implementer` in FIX MODE, and lets the `postpr-fix`
skill's checklist resolve one item from `followups.md`. That path assumes
every follow-up is small, atomic, and in-scope. The skill's guardrails tell
the implementer to *stop* when a follow-up turns out to be design-level,
cross-capability, or new scope — but by then the orchestrator has already
committed to the small-fix path, and "stop" is a dead end with no sanctioned
next move.

This change adds an **upfront triage gate** to `followup.md` (the
orchestrator) that right-sizes each follow-up *before* the implementer is
spawned, and routes it to one of three paths: **P1 implement directly**
(today's flow), **P2 amend the parent change in place** (extend this change
and its open PR without a separate folder), or **P3 defer** (drop to
`openspec/backlog.md` as an idea). The triage is a human-in-the-loop
size/scope judgment, never suppressed, so a large follow-up is never silently
pushed through the small-fix path. The `postpr-fix` skill (the implementer's
checklist) is unchanged — the three-path model lives entirely in the
orchestrator. This is a prose-only kit-behavior change to
`claude/commands/followup.md` plus a summary edit to
`claude/skills/workflow/SKILL.md`, regenerated into `copilot/` via
`sync-copilot.mjs`, and a new `scripts/lint.mjs` structural check.

## Goals / Non-Goals

**Goals:**
- Add a never-suppressed triage gate to `followup.md` that classifies each
  follow-up (agent proposes from heuristics, human confirms/overrides — PQ1,
  PQ2) and routes to one of three wired paths.
- Define the P2 in-place amendment mechanics end-to-end by **reusing the
  scope-amendment flow already in `implement.md`**: edit the affected
  `design.md` decision and/or delta `specs/**` in place, add a `## N.`
  vertical-slice group to `slices.md` + `tasks.md`, commit, and extend the
  same open PR — adding no ninth stage and no new folder.
- Define P3 (defer) to reuse `pr.md`'s existing "Promote to backlog idea"
  mechanics (P3 priority default — PQ7).
- Apply the `workflow` **least-friction principle** ("prefer
  `AskUserQuestion` over emitting a command"): after each disposition, offer
  the obvious next action as a choice rather than printing a command to copy.
- Keep `postpr-fix` path-1-only (PQ8); update `workflow`'s "After PR — the
  fix loop" (PQ9); keep `copilot/` in parity.

**Non-Goals:**
- Changing the `postpr-fix` fix checklist, the `followups.md` format, how
  `followups.md` is seeded, or the `pr.md` reconciliation gate (all
  explicitly out of scope per questions.md scope guard).
- Building a Node helper to parse `followups.md` — that is the
  `standardize-recurring-ops-scripts` backlog item; the agent reads prose.
- Re-running `/qrspi:design` (or any stage command) on the parent to draft
  the P2 edit. A P2 amendment **edits the approved artifacts in place** (an
  optional `qrspi:designer` spawn may *draft* the edit); it never re-runs the
  stage command, which would overwrite the approved design.
- Any separate branch or separate PR for a follow-up. Anything that would
  need its own branch/PR — or whose parent PR has merged — is **P3**, not P2.

## Decisions

### D1 — Triage runs once per invocation, per targeted item, before the implementer is spawned

`/qrspi:followup` keeps its **one-follow-up-per-invocation** default
(research §Implicit-contracts 1). The triage classifies the *single* item
this invocation targets (the named fix, or the next un-ticked
`followups.md` item), then routes it. It is **not** a batch classifier over
the whole queue — different items route differently, so each is triaged on
its own invocation (answers Q4, Q22). The gate is inserted **after** the
Glob preconditions (folder + `pr.md` exist) and **before** the implementer
is spawned, so P2/P3 never reach FIX MODE.

Per the least-friction principle (D6), "one per invocation" becomes an
**opt-in-chainable default**: after any disposition, if un-ticked follow-ups
remain, the orchestrator *offers* to handle the next one (re-entering
`/qrspi:followup <id>`) rather than forcing the human to re-invoke manually.

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
scope), when the parent PR has already merged, or when the work would
otherwise need its own branch/PR (D5a). The signals are **agent-assessed, all
advisory** — the human's override is final (PQ1/PQ2).

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
> - "P2 — amend this change in place (extend the open PR)"
> - "P3 — defer to backlog idea (new scope)"

The agent's proposed path is named in the question text (not a fourth
choice) so the recommendation is visible but the human picks explicitly
(PQ1). No "I'm unsure" escape hatch is added — the three paths plus the
override are sufficient; an unsure human picks P2 (re-align) or stops. The
three choice-label prefixes (`P1 — implement directly`, `P2 — amend this
change in place`, `P3 — defer`) are the anchors lint Check 10 pins (D8).

### D5 — Path routing is wired inline in `followup.md`; only P1 spawns the implementer

- **P1** — unchanged from today: spawn `qrspi:implementer` in FIX MODE with
  the model logic already in the file (sonnet default, opus for
  design-level/multi-file). The triage adds nothing to P1's mechanics
  (answers Q6) and records **no new annotation** on the P1 `followups.md`
  entry — the existing `— fixed in <short-sha>` tick is the record (Q7,
  keeps the happy path thin and avoids a new `followups.md` shape).
- **P2** — the orchestrator does **not** spawn the implementer to triage. It
  performs the in-place amendment mechanics (D5b), annotates `followups.md`
  (D7), commits, then per least-friction **offers** to run
  `/qrspi:implement <id>` now (D6). Same branch, same PR.
- **P3** — the orchestrator does **not** spawn the implementer. It reuses
  the "Promote to backlog idea" mechanics (D9), annotates `followups.md`
  (D7), and ends the turn (offering the next follow-up if any remain, D6).

The "one follow-up per invocation" default holds across all three (Q22):
P1 resolves one item; P2/P3 dispose of one item and terminate (with the
opt-in chaining offer of D6).

### D5a — P2 requires an open parent PR; a merged parent (or need-own-branch/PR) routes to P3

`/qrspi:followup` only requires `pr.md` to exist, and `pr.md` persists after
the PR merges — so the parent PR may already be merged when a follow-up
lands. A P2 amendment is **inherently same-branch / same-PR**: it extends the
parent change's open PR by adding slices to it. Therefore:

- If the parent PR has already merged, there is no open PR to extend → **P3**.
- If the work would need its own branch or its own PR (genuinely divergent,
  or the human wants it isolated) → **P3**.

"Needs its own branch/PR" is exactly the P2↔P3 boundary. The triage rubric
(D2) proposes P2 only when there is an open PR to extend; a P3 idea created
this way relates back to the parent change.

### D5b — P2 mechanics: reuse `implement.md`'s "Adding scope after stage I" flow, in place

A P2 follow-up is re-alignment work that still belongs to **this** change and
extends the **open** PR. It is resolved by **amending the parent change in
place** — there is NO separate folder. The mechanics are exactly
`implement.md`'s existing "Adding scope after stage I has started"
scope-amendment flow, applied post-PR:

1. **Amend the approved artifacts in place.** Edit the affected `design.md`
   `Dn` decision and/or the change's delta `specs/**` (move the item in
   scope; add/adjust the requirement + scenarios). The orchestrator may spawn
   a `qrspi:designer` subagent to **draft** the edit for a design-level
   re-alignment, but it does **NOT** re-run `/qrspi:design` — that would
   overwrite the approved artifact (Non-Goal above).
2. **Add a `## N.` vertical-slice group** to `slices.md` **and** a matching
   `## N.` group to `tasks.md`, each carrying a `**Model:**` annotation
   (loading `vertical-slice` + the stack-cheatsheet skill first, as
   `implement.md` step 2 requires — so the new slice honours documented
   conventions).
3. **Commit** as `docs(<id>): amend scope — <desc>`, carrying any matching
   `openspec/backlog.md` heading edit atomically (only if the amendment
   changes the parent row's status/note — normally it does not).
4. **Then, per least-friction, OFFER to run `/qrspi:implement <id>` now**
   (D6) — same branch, same PR, through the normal slice/checkpoint/commit
   machinery.

**Why no folder (key rationale).** Entering a *separate* `<id>-addendum-N`
folder at a late stage requires the prior stages' artifacts, so the
orchestrator would have to **copy** the parent's `questions.md` /
`research.md` / `design.md` into it — making the folder a near-duplicate of
the parent, which is pointless. Separate folders also force **dual-tracking**:
the PR reviewer, the `pr.md` tasks pass, the follow-ups pass, and `archive.md`
would each have to enumerate `<id>` **plus** every `<id>-addendum-*`. In-place
amendment avoids all of it and reuses machinery that already ships in
`implement.md`. This supersedes the earlier folder-based P2 decisions.

### D6 — Least-friction end-of-turn offers (applies the workflow principle)

Applying the `workflow` "Rules of the road" principle — *prefer
`AskUserQuestion` over emitting a command to run* — the orchestrator **offers**
next actions as choices rather than printing a `/qrspi:…` line to copy:

- **After P2:** offer to run `/qrspi:implement <id>` now.
  > question: "Scope amended (slice N added). Implement it now?"
  > choices: ["Run `/qrspi:implement <id>` now", "Not now"]
  On "Run … now", re-enter `/qrspi:implement <id>` as a slash command.
- **After any path (P1/P2/P3),** if un-ticked follow-ups remain, offer:
  > question: "Follow-up handled. N un-ticked follow-up(s) remain. Continue?"
  > choices: ["Handle the next follow-up", "Stop here"]
  On "Handle the next follow-up", re-enter `/qrspi:followup <id>`.

This makes "one follow-up per invocation" (D1) the **default** with **opt-in
chaining** — the human is never handed a bare "now run X" for an obvious next
step. Emitting a command is the fallback only where no interactive choice is
possible.

### D7 — `followups.md` annotation per path: tick-with-note, mirroring pr.md (PQ6)

All three paths **tick** the `followups.md` entry (research established the
archival un-ticked check in `archive.md` is inform-only, non-blocking —
§Implicit-contracts 6 — but ticking mirrors the pr.md idiom and keeps the
audit trail honest: the box closes *here* because this item's disposition is
decided *here*). Note: the repo uses **ASCII `--`** in these parentheticals.

- **P1:** no new annotation — the standard `— fixed in <short-sha>` tick from
  the fix checklist is the record.
- **P2:** `- [ ] <text>` → `- [x] <text> (re-aligned in place -- slice N)`.
- **P3:** `- [ ] <text>` → `- [x] <text> (deferred to backlog -- <slug>)`.

The follow-on work is tracked by the new parent slice (P2) or the backlog row
(P3), not by a dangling checkbox. This mirrors pr.md's existing
`(promoted to backlog)` / `(dropped -- ...)` tick-with-parenthetical exactly.

**Rejected:** leave-un-ticked — reads as unfinished, blocks nothing, diverges
from the pr.md idiom; delete-the-entry — loses the audit trail.

### D8 — Recommended: a `scripts/lint.mjs` structural check for the triage choices (Q29, OQ2)

Add **Check 10** asserting `claude/commands/followup.md` contains the three
triage choice anchors — the P1/P2/P3 choice-label prefixes from D4 (e.g.
`"P1 — implement directly`, `"P2 — amend this change in place`,
`"P3 — defer`). This mirrors Check 8 (`checkPrReconciliationPasses`), which
already pins the follow-ups pass choice labels in `pr.md`, so the triage gate
gets the same mechanical floor and a future rename can't silently drop a path.
Follow the documented add-a-check pattern (new
`async function checkTriagePaths(errors)` + a `main()` call + header-comment
update).

### D9 — P3 defer reuses pr.md's "Promote to backlog idea" mechanics, P3 default priority (PQ7, Q14, Q16)

Path 3 appends **one `idea` row** to `openspec/backlog.md` under `## Ideas`,
using the exact mechanics research documented for `pr.md`'s follow-ups pass:
level-3 heading with kebab-slug + `idea` status + `· **P3**` priority band,
followed by a `**Why:**` paragraph; slug derived from the follow-up title.
The orchestrator writes the row itself (answers Q14 — agent writes it, does
not merely instruct). Priority defaults to **P3** (PQ7). This does **not**
violate `followup.md`'s "a post-PR fix does not change the backlog *status
line*" rule (Q31): adding a new `idea` row is distinct from flipping the
parent change's `in-progress` status — the parent row is untouched. Both the
backlog row and the `followups.md` tick (D7) are staged in the same commit
(backlog atomicity). Commit: `docs(<id>): defer <slug> to backlog (P3)`.

### D10 — Files that change; postpr-fix stays path-1-only (PQ8); workflow gets the summary (PQ9)

- `claude/commands/followup.md` — the triage gate (D1–D5), the in-place P2
  mechanics (D5b), P3 mechanics (D7, D9), and the least-friction offers (D6).
  The bulk of the change. All folder/entry-stage/branch machinery from the
  earlier draft is removed.
- `claude/skills/postpr-fix/SKILL.md` — **unchanged** (PQ8): the implementer
  does not triage; the three-path model lives only in the orchestrator.
- `claude/skills/workflow/SKILL.md` — "After PR — the fix loop" already
  summarizes the triage and three paths; update it so the **P2 description is
  the in-place amendment** (not the folder model), and confirm the
  least-friction principle in "Rules of the road" covers the P2/next-follow-up
  offers (PQ9).
- `copilot/prompts/qrspi-followup.prompt.md` and any touched
  `copilot/instructions/*` — **regenerated** by `node sync-copilot.mjs`,
  never hand-edited (research §Copilot; house rule). The existing
  `AskUserQuestion → #tool:vscode/askQuestions` and skill-load rewrites apply
  automatically; no new fidelity gap expected (Q26, Q27).
- `CHANGELOG.md` — one line under `## [Unreleased]` (Q32); no version bump.
- `scripts/lint.mjs` — new Check 10 (D8). `postpr-fix` stays path-1-only.

## Vertical slices (preview)

Prose-only kit change; slices are thin but still user-facing end-to-end:

- **Slice 1 — Triage gate + P1 pass-through:** add the self-assessment,
  the D4 `AskUserQuestion`, and wire P1 to today's implementer spawn
  (P2/P3 stubbed to "not yet"). Demoable: running `/qrspi:followup`
  surfaces the triage and, on P1, resolves a fix exactly as before.
- **Slice 2 — P3 defer path:** wire P3 to the backlog-idea append + D7
  tick. Demoable: a new-scope follow-up lands as a `P3` idea row and the
  box is ticked `(deferred to backlog -- <slug>)`.
- **Slice 3 — P2 in-place scope-amendment path:** wire P2 to the
  `implement.md` scope-amendment flow — edit `design.md`/delta specs in
  place, append a `## N.` slice to `slices.md` + `tasks.md`, commit, tick
  `(re-aligned in place -- slice N)`, and offer `/qrspi:implement <id>` now.
  Demoable: a design-re-alignment follow-up adds a slice to the parent change
  on the same branch and offers to build it — no new folder.
- **Slice 4 — least-friction offers + workflow summary + copilot resync + lint
  Check 10:** wire the "next follow-up?" offer (D6), align `workflow`'s "After
  PR" P2 text to the in-place model, run `sync-copilot.mjs`, add the lint
  check; `node scripts/lint.mjs` green.

## Risks / Trade-offs

- **Triage mis-proposal.** The agent's four-signal rubric (D2) can propose
  the wrong path. Mitigated: the human always confirms/overrides (PQ1) and
  the gate is never suppressed (D3). The rubric is a nudge, not an
  auto-router.
- **In-place P2 grows the open PR.** A P2 amendment always adds slices to the
  parent's open PR (D5b), so a large one can bloat the PR. Accepted: the
  triage gate is the control — genuinely divergent, isolate-worthy, or
  post-merge work is P3 (D5a), so only work that legitimately belongs in this
  PR lands here. This is the same trade-off `implement.md`'s existing
  scope-amendment flow already makes.
- **Amend-in-place vs. re-running the stage.** A P2 edit touches the approved
  `design.md`/specs directly rather than re-running `/qrspi:design`. Risk: a
  hand-edit can diverge from the artifact's conventions. Mitigated by reusing
  `implement.md`'s documented flow (load `vertical-slice` + stack-cheatsheet
  first) and, for design-level edits, an optional `qrspi:designer` draft. The
  alternative (re-run the stage) would overwrite the approved artifact and is
  explicitly a Non-Goal.
- **Lint anchor brittleness.** Check 10 pins the exact choice-label prefixes;
  a wording change to D4's choices must update the lint (same property as
  Check 8). Accepted — that is the point of the anchor.

## Open questions for the human

- [x] **OQ1 — Acceptance bar (Q28).** **Resolved: dogfood the P2 path once.**
  Acceptance = code review of the prose diff **+** lint Check 10 **+** one
  real dogfood run of the **in-place P2** path end to end: create a
  design-re-alignment follow-up, run `/qrspi:followup`, confirm it routes to
  P2, amends `design.md`/`slices.md`/`tasks.md` in place, ticks
  `(re-aligned in place -- slice N)`, and offers `/qrspi:implement <id>`; then
  accept the offer and confirm the new slice implements on the same branch.
  P2 is the most novel mechanics, so it gets the higher-confidence bar.
- [x] **OQ2 — Is lint Check 10 worth its brittleness?** **Resolved: yes, add
  Check 10.** Parity with Check 8; the mechanical floor against a silently
  dropped path is worth the wording-brittleness cost (D8 proceeds).
- [x] **OQ3 — Entry-stage suggestion strength.** **Resolved: obsolete.** The
  earlier folder-based P2 asked the human to pick an entry stage (D/S/V/P/I)
  for an addendum folder. The in-place model has **no entry stage** — P2 edits
  the parent artifacts directly and, if building is wanted, offers
  `/qrspi:implement <id>`. This question no longer applies.
