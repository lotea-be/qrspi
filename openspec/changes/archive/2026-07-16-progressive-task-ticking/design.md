# Design — progressive-task-ticking

> Stage D of QRSPI. Generated 2026-07-16.
> **Implementation is BLOCKED until a human approves this file.**

## Context

The QRSPI implementer (`claude/agents/implementer.md`) is meant to tick each
`tasks.md` checkbox as it finishes that task — step 4a says "For each task in
the slice, do the work and tick the box" and the Coding-rules line says "Tick
the boxes in `tasks.md` as you complete them." In practice the model writes all
the slice's code first and then ticks every box in one batch right before the
slice's final message. Research confirmed the root cause: the constraint is
stated as *intent* ("as you complete them" reads ambiguously as "complete all of
them"), never as a *sequencing gate* — there is no "tick immediately, before the
next task starts" anchor and no "do not batch" prohibition anywhere in the file
(research §Implicit-contract 1, Area 1 line 68).

This change is **prompt-text-only**. It rewrites two sites in
`implementer.md` so each box is ticked immediately after its task is done and
before the next task begins — persisted as its own edit — then regenerates the
Copilot mirror for zero drift. Desired end state: progress is observable live in
the IDE, and `tasks.md` survives a mid-slice interruption because it is durable
at every task boundary rather than only at the slice checkpoint.

The five product questions (PQ1–PQ5) were **already answered by the human** in
`questions.md` and are treated here as settled constraints, not re-litigated:
placement = full instruction in step 4a + terse pointer in Coding rules (PQ1);
prose intent, no tool names (PQ2); inline rationale (PQ3); premature-ticking
guard (PQ4); commit/tick disambiguation sentence (PQ5).

## Goals / Non-Goals

**Goals:**
- Rewrite step 4a so each tick lands immediately after its task, before the
  next task starts, as its own edit — honoring PQ1–PQ5.
- Rewrite the Coding-rules ticking line into a short non-ambiguous pointer to
  step 4a (closing the isolation-reading loophole) rather than leaving it as-is
  or fully duplicating.
- Regenerate `copilot/agents/copilot-implementer.agent.md` via `sync-copilot.mjs`
  for zero drift.
- Add a `[Unreleased]` CHANGELOG entry.

**Non-Goals (explicit — do not let these creep in during S/V/P/I):**
- **Per-task git commits.** Commits stay at slice granularity. Follow-up: none —
  this is a permanent design boundary (block-signal contract forbids committing a
  red, half-built slice).
- **Per-task human checkpoints.** The slice remains the atomic reviewable/
  verifiable unit; no per-task AskUserQuestion is added.
- **Orchestrator / command / skill changes.** No edit to
  `claude/commands/implement.md`, the `workflow` skill, or any other file. The
  behaviour lives entirely in `implementer.md`.
- **A new lint check for the ticking keyphrase.** See D4 — recommended out, but
  surfaced as OQ1 for the human.
- **A migration manifest in this PR.** See D5 — authored when a release is cut,
  not here.

## Decisions

**D1 — Full "tick immediately" instruction lives in step 4a (PQ1, PQ2, PQ3,
PQ4, PQ5).** Chose to concentrate the authoritative instruction in the
procedural step the model reads task-by-task, folding all four content
requirements (immediacy anchor, rationale, premature-ticking guard,
commit/tick disambiguation) into one revised sub-step. Rejected: spreading them
across step 4a + a full Coding-rules duplicate (drift risk, ~20–30 extra
tokens — PQ1 rejected (c)); tool-explicit "call the Edit tool" phrasing
(inconsistent with the file's prose style — PQ2 rejected (b)). Proposed
replacement for step 4a bullet **a.** (currently: *"For each task in the slice,
do the work and tick the box."*):

> a. For each task in the slice, do the work and, once you have confirmed that
>    task's output is correct, tick its box **immediately** — before you start
>    the next task — so progress is visible live and `tasks.md` stays durable if
>    the slice is interrupted. Persist each tick as its own edit; do not batch
>    ticks to the end of the slice. Ticking is immediate; committing and the
>    human checkpoint stay at slice granularity.

This wording carries: the immediacy anchor + no-batch ("before you start the
next task", "do not batch ticks to the end of the slice"); the rationale (PQ3);
the guard ("once you have confirmed that task's output is correct" — PQ4); and
the disambiguation sentence (PQ5). "Before you start the next task" was chosen
over "before touching any file for the next task" — it is the leaner phrasing
and reads naturally for the single-task-per-slice edge case (Q7/Q8), where there
is simply no next task and the tick still lands right after the confirmed work.

**D2 — Coding-rules line becomes a terse pointer, not a duplicate (PQ1).** The
observed bug is the model reading the terse rule line *in isolation* as
permission to batch, so that line must be de-ambiguated — but a full second copy
invites drift. Chose to rewrite the current line (line 77–78: *"Tick the boxes
in `tasks.md` as you complete them. The commit message references the change
id."*) to:

> - Tick each box immediately after its task — see step 4a. The commit message
>   references the change id.

Rejected: removing the line entirely (PQ1 rejected — leaves the Coding-rules
section silent on ticking, and the "commit message references the change id"
clause co-located here must survive); leaving it as-is (the loophole the bug
exploits). The "commit message references the change id" sentence is preserved
verbatim — it is unrelated to ticking and must not be dropped.

**D3 — No change to `Tasks ticked: <list>` in the final-message template
(Q12).** The final-message field lists the numbers ticked *during* the slice; it
is a report, not the moment of ticking. Under D1 the ticks are already persisted
before the final message, so the field is unchanged and consistent. Chose to
leave it. Rejected: rewording it to "Tasks ticked (persisted incrementally)" —
adds noise without changing behaviour, and the durability guarantee now lives in
step 4a where the model acts on it.

**D4 — No new lint check for the ticking keyphrase (Q17, Q18; recommended,
surfaced as OQ1).** Research confirmed no content-level lint governs ticking
today, and that the Read-contract banner (Check 7, expected `'Reads: tasks.md.'`)
is **unaffected** because this change does not touch the banner (research
Implicit-contract 10). A text-presence check (assert step 4a contains "before
you start the next task") is mechanically cheap to add (research Area 5 gives the
exact shape) but only asserts *text presence*, not *behaviour* — it cannot verify
the model actually ticks incrementally, which is the real acceptance bar. Chose
code review of the diff as the acceptance bar (Q17 option (c)), consistent with
the change being a one-line-scale prose edit. Rejected adding the check: it
freezes an exact keyphrase (making future rewording a two-file edit) for a guard
that does not catch the failure mode it appears to. Surfaced as **OQ1** because
"is a keyphrase lint worth it" is a genuine judgment call the human flagged as
PQ18/OQ material.

**D5 — No migration manifest in this PR (Q21).** Per `versioned-update-command`'s
established sequencing (its PQ5 answer, cited in Q21), the `migrations/<version>.
yaml` entry is authored when the **release is cut**, not in the feature PR. This
change ships no consumer-repo migration step anyway — it is a kit-internal prompt
edit with no `openspec/`-path action for `/qrspi:update` to apply. Lint Check 6
only requires a manifest for a CHANGELOG `## [X.Y.Z]` version section at/above the
0.6.0 floor; `## [Unreleased]` is not a versioned section, so no manifest is due.
Chose: `[Unreleased]` CHANGELOG entry only. Rejected: writing a stub manifest now
(premature, and would fail nothing but adds noise the release step must reconcile).

**D6 — Copilot parity by straight regeneration (Q15, Q16).** Research confirmed
`copilot/agents/copilot-implementer.agent.md` is produced purely by `rewriteAll()`
+ frontmatter rebuild, with **no** per-file `applyFixups` entry keyed to the agent
(the only implement-side fixup is keyed to `prompts/qrspi-implement.prompt.md`,
which this change does not touch). So a straight `node sync-copilot.mjs` run
regenerates the mirror with no manual reconciliation, and `node sync-copilot.mjs
--check` asserts zero drift. Chose: regenerate, do not hand-edit `copilot/` (per
CLAUDE.md). No `sync-copilot.mjs` change is warranted. Note: `sync-copilot.mjs`
rewrites the `/qrspi:implement <id>` reference this change adds to step 4a's
prose into `/qrspi-implement` in the Copilot output — this is the existing
namespace rewrite and needs no special handling.

## Data model changes

Not applicable — prompt text only. No entities, tables, or DTOs.

## API surface

Not applicable — no HTTP surface. The "interface" is the prose instruction in
`implementer.md` (step 4a + Coding rules) and the downstream model behaviour.

## UI surface

Not applicable.

## Authorization

Not applicable.

## Vertical slices (preview)

This change is small enough to be a single vertical slice — the end-to-end
user-facing unit is "the implementer prompt ticks each box immediately, and the
Copilot mirror agrees." Stage V should confirm one slice rather than splitting by
file (a per-file split would be horizontal layering):

- **Slice 1 — Immediate ticking, end to end.** Rewrite step 4a (D1) and the
  Coding-rules pointer (D2) in `claude/agents/implementer.md`; add the
  `[Unreleased]` CHANGELOG entry (D5); run `node sync-copilot.mjs` to regenerate
  `copilot/`; verify with `node sync-copilot.mjs --check` (zero drift) and `node
  scripts/lint.mjs` (all seven checks green, including the unchanged Check 7
  banner). Demoable: the diff shows the strengthened instruction and the
  regenerated Copilot mirror, lint green.

## Risks / Trade-offs

- **Behavioural, not mechanically verifiable.** The payoff (live incremental
  ticks) cannot be proven by a lint or unit test — only by a dogfood run or code
  review of the wording. Accepted: D4 makes code review the bar. **Stage-I
  watch-item:** during the first real `/qrspi:implement` after this lands,
  observe whether ticks actually land before each next task's first tool call; if
  the model still batches, the wording needs a stronger anchor (fallback:
  reconsider the tool-explicit phrasing PQ2 rejected).
- **Prompt-length creep.** Step 4a grows from one sentence to ~three; the
  rationale + guard + disambiguation is ~35 tokens. Accepted per PQ3/PQ4/PQ5 — the
  human judged each worth its cost against the observed rationalize-away failure.
- **Copilot rewrite of the added slash-command reference.** Low risk — the
  `/qrspi:implement` → `/qrspi-implement` rewrite is existing, deterministic
  behaviour; `--check` will catch any surprise. Mitigation: run `--check` as part
  of the slice.

## Open questions for the human

- [x] **OQ1 — Keyphrase lint (D4).** Recommended **out** — code review is the
  acceptance bar and a text-presence check does not verify the behaviour it
  guards. Do you want a `scripts/lint.mjs` check asserting step 4a contains the
  immediacy anchor anyway (freezing the exact phrase, making future rewording a
  two-file edit), or is code review of the diff sufficient? Default if unanswered:
  no lint check.
  **Answer: No lint check — code review of the diff is the acceptance bar. Confirms D4 as written.**
