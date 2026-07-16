# Questions — progressive-task-ticking

> Stage Q of QRSPI. Generated 2026-07-16.
> Change summary: Strengthen the implementer prompt so each `tasks.md` checkbox is ticked immediately after its task completes (persisted as its own edit), rather than batched in a single pass at the slice checkpoint.

This is a **prompt-text-only change** — it touches one source file (`claude/agents/implementer.md`) and the regenerated `copilot/` tree. The standard Data model / Indexing / API / UI / Front-end state / Auth / Migrations sections are **Not applicable** — kept as headings so stage S does not re-litigate — and replaced with sections that fit this cross-cutting agent-behavior change.

---

## Scope guard (explicit out-of-scope)

The following topics are **explicitly out of scope** for this change:

- **Per-task git commits.** The slice is the atomic reviewable unit; per-task commits would push half-built, potentially red states to the branch. This change does not touch commit granularity.
- **Per-task human checkpoints.** The block-signal contract forbids mid-slice human gates on red code. This change does not add per-task AskUserQuestion calls.
- **Orchestrator or command changes.** The ticking behavior lives entirely inside `implementer.md`; neither `claude/commands/implement.md` nor any skill needs editing.
- **Copilot-specific behavioral change.** The Copilot artifact is regenerated for zero-drift but no Copilot-specific behavior is added.

---

## Data model — Not applicable

No entities, tables, or DTOs. This change edits prompt text only.

## Indexing & query performance — Not applicable

## API — Not applicable

No HTTP surface. The "interface" is the prose instruction in `implementer.md` and the downstream behavior of the model.

## UI — Not applicable

## Front-end state — Not applicable

## Auth & authorization — Not applicable

## Migrations & data — Not applicable

---

## Implementer prompt — current behavior

1. **Where exactly in `implementer.md` is the ticking instruction stated today?** The "What to do" section step 4a says "do the work and tick the box" and the Coding rules section has a line "Tick the boxes in `tasks.md` as you complete them." Confirm: are these the only two locations that govern ticking, or is there a third?

2. **What is the observed failure mode in more detail?** The backlog item says ticks land in a single pass right before the slice's final message. Is this because the current wording is ambiguous ("complete them" could mean "complete all of them" or "complete each one"), or because there is no explicit "before starting the next task" anchor that forces an immediate Edit call?

3. **Does the current wording explicitly forbid batching, or is batching simply not prohibited?** Confirm whether any existing sentence in `implementer.md` says "do not batch ticks" or equivalent — ruling out whether a simple negative statement is already present and just being ignored by the model.

4. **What does "persisted as its own edit" mean mechanically?** The backlog description says each tick should be "persisted as its own edit, not batched to the slice end." Confirm the implementation target: the model must call the Edit tool (or Write tool) on `tasks.md` immediately after finishing each task, before opening any file for the next task. Is this the correct interpretation?

---

## Implementer prompt — revised instruction shape

5. **Should the new instruction be placed in "What to do" step 4a, the Coding rules section, or both?** Step 4a already says "do the work and tick the box" — is this the natural home for "tick the box immediately, as its own Edit call, before starting the next task"? Or does the Coding rules section need updating independently because some consumers may focus on that section?

6. **Is "immediately after its task is done" sufficient, or must the instruction name the Edit/Write tool explicitly?** Naming the tool (e.g. "call the Edit tool on `tasks.md` now, before opening any file for the next task") is more mechanically prescriptive and less ambiguous than prose instruction. Confirm whether tool-explicit language is appropriate for this instruction style, given that the rest of `implementer.md` uses prose intent rather than tool names for coding rules.

7. **Should the instruction say "before starting the next task" or "before touching any file for the next task"?** The former allows reading docs or notes between tasks (not a write action); the latter is a stricter boundary. Which phrasing more accurately models the intended atomicity?

8. **Does the revised instruction need to handle the single-task-per-slice edge case?** When a slice has only one task, the "before starting the next task" anchor has no following task. The tick still happens immediately after the work, but the instruction may read oddly. Confirm whether a qualifying phrase ("or, for the last task in the slice, immediately before running tests") is needed.

9. **Should the instruction reference the payoff explicitly (live visibility + durability on interruption)?** Including a rationale ("so progress is visible live and `tasks.md` is durable if the slice is interrupted") makes the instruction self-documenting and harder for a model to rationalize away. Or does adding a rationale make the instruction longer without behavioral improvement?

10. **Is there a risk the model ticks a box prematurely — before the task's code actually compiles or passes its unit test?** The instruction must not cause "optimistic ticking" where the model ticks before verifying the task's output. Does the new instruction need a qualifier like "after confirming the task's output is correct" to prevent that?

---

## Coding rules section

11. **The Coding rules section currently says "Tick the boxes in `tasks.md` as you complete them." Should this line be removed, replaced, or augmented?** Options:
    - (a) Augment in place: expand the line to say "Tick each box immediately after completing that task — as its own Edit call, before starting the next task."
    - (b) Remove from Coding rules and rely solely on the updated step 4a: the Coding rules line is redundant once step 4a carries the full instruction.
    - (c) Keep both but in sync: update both occurrences so neither can be read in isolation as permitting batching.
    Which option is chosen?

12. **Are there any other places in `implementer.md` that imply ticking happens at slice end?** Scan the "Final message format" section: "Tasks ticked: `<list of numbers>`" implies the list is known at message time — but the ticking itself should already be done. Does this line need any change to avoid implying it is the moment of ticking?

---

## Slice checkpoint and commit granularity

13. **The scope boundary says "git commit stays at slice granularity." Does the revised instruction need to explicitly restate this boundary** so the model does not infer "tick immediately" implies "commit immediately"? Confirm whether a one-sentence clarification ("ticking is immediate; committing and the human checkpoint remain at slice granularity") is needed inline.

14. **Is there a risk of confusion between "tick the box" (a `tasks.md` edit) and "commit the slice" (a git operation)?** Some models conflate file edits with git commits. Does the instruction need to disambiguate these two operations explicitly?

---

## Copilot parity

15. **After `node sync-copilot.mjs` regenerates the `copilot/` tree, does the ticking instruction land in the correct Copilot artifact?** Confirm which `copilot/` file mirrors `claude/agents/implementer.md` and whether the sync script needs any change, or whether a straight regeneration suffices.

16. **Does the Copilot port of `implementer.md` carry any hand-authored differences that could conflict with the regenerated output?** Check whether the copilot agent has any deviation from the claude source on the ticking instruction or coding-rules section that would need a manual reconciliation step.

---

## Testing & verification

17. **How is "ticks land immediately" verified at merge time?** This is a behavioral prompt change, not a code change, so there is no unit test. Options:
    - (a) A manual dogfood run: run `/qrspi:implement` on the `progressive-task-ticking` change itself (or a toy change) and observe that each task checkbox is ticked before the next task's first tool call.
    - (b) A lint check in `scripts/lint.mjs` that asserts the ticking instruction contains a specific keyphrase (e.g. "before starting the next task"). Mechanical, but only checks text presence, not behavior.
    - (c) No automated check — code review of the diff is the verification bar (the change is small enough for this to be proportionate).
    Which option is the acceptance bar?

18. **Does `scripts/lint.mjs` need a new check for this change?** Existing lint checks cover: pin agreement, frontmatter/name, heading alignment, README-command correspondence, read contracts. Should a new check assert the ticking instruction contains a "before the next task" or equivalent anchor? Or is that over-engineering for a one-line prose change?

---

## Sequencing & scope

19. **Does `progressive-task-ticking` depend on any other in-flight or backlog change, or is it independent?** Review the backlog: `pr-review-open-tasks-and-followups`, `session-version-check-and-update-prompt`, and `right-size-followup-handling` are all Ideas. Confirm whether any of those would alter `implementer.md` in a way that conflicts with this change's patch.

20. **Is this change a prerequisite for any other backlog item?** Specifically: does `right-size-followup-handling` (which also uses the implementer in FIX MODE) or `simplify-per-slice-model-selection` need to land before or after this change to avoid a merge conflict?

21. **Should the CHANGELOG entry for this change be placed under `## [Unreleased]`, and does a new migration manifest stub need to be written per `versioned-update-command`'s rule (every release ships a `migrations/<version>.yaml`)?** The migration entry is authored when the release is cut, not in this PR — confirm this is the correct sequencing per `versioned-update-command`'s PQ5 answer.

---

## Open product questions (for the human)

- [x] **PQ1 — Instruction placement:** Should the "tick immediately" instruction be placed in step 4a only, in the Coding rules section only, or in both places? Options:
  (a) Step 4a only — the natural procedural home; the Coding rules line is removed or left as a terse reminder (Recommended) — concentrates the authoritative instruction where the model reads task-by-task behavior,
  (b) Coding rules only — the procedural step is left unchanged; the coding rule is expanded with the "before starting the next task" anchor — risks the model reading the rule in isolation without the procedural context,
  (c) Both updated in sync — belt-and-suspenders; both occurrences say the same thing so neither can be read in isolation as permitting batching — adds a small redundancy cost.
  **Answer: A leaner hybrid of (a)+(c) — the FULL instruction goes in step 4a; the existing Coding-rules line ("Tick the boxes in `tasks.md` as you complete them") is tweaked to a short, non-ambiguous pointer (e.g. "tick each box immediately — see step 4a") rather than left as-is or fully duplicated. This closes the isolation-reading loophole (the ambiguous rule line no longer reads as permission to batch) for ~5–10 tokens instead of ~20–30 for a full duplicate. Rationale: the observed bug is the model reading the terse rule line in isolation, so that line must be de-ambiguated, but a full second copy is unnecessary and risks drift.**

- [x] **PQ2 — Tool-explicit vs. prose language:** Should the new instruction name the Edit tool explicitly (e.g. "call the Edit tool on `tasks.md` now, before touching any file for the next task") or keep prose intent ("tick the box immediately, before starting the next task")? Options:
  (a) Prose intent only (Recommended) — consistent with the rest of `implementer.md`'s style; the model infers the tool from context,
  (b) Tool-explicit — more mechanically precise; reduces ambiguity about what "tick" means; may feel overly prescriptive in a prose document.
  **Answer: (a) Prose intent only. It is the shorter/leaner phrasing (tool-explicit language is more verbose) AND stays consistent with the rest of `implementer.md`, which states coding rules as prose intent rather than naming tools.**

- [x] **PQ3 — Rationale inline:** Should the instruction include an inline rationale ("so progress is visible live and `tasks.md` is durable if interrupted")? Options:
  (a) Yes — self-documents the rule and makes it harder to rationalize away (Recommended),
  (b) No — keeps the instruction terse; rationale belongs in the commit message or design doc, not the agent prompt.
  **Answer: (a) Yes. The ~15-token rationale directly counters the observed failure mode (the model rationalizing the rule away); a rule that states its own purpose is harder to wriggle out of. Worth the small cost.**

- [x] **PQ4 — Premature-ticking guard:** Should the instruction include a qualifier to prevent optimistic ticking before the task's output is confirmed correct (e.g. "after confirming the task's output is correct")? Options:
  (a) Yes — explicit guard prevents the model from ticking then discovering the code is broken (Recommended),
  (b) No — the existing "run tests" and "fix until green" instructions in step 4b already imply correctness; adding a qualifier would duplicate that guarantee.
  **Answer: (a) Yes, add the guard. Step 4b's "run tests / fix until green" runs at the slice checkpoint, not per task — so between tasks there is no verification gate and a box could be ticked before that task's code is sound. A short "after confirming the task's output is correct" qualifier is cheap insurance against that gap.**

- [x] **PQ5 — Commit/tick disambiguation:** Should the revised instruction include a one-sentence clarification that ticking is immediate but committing remains at slice granularity? Options:
  (a) Yes — removes any risk the model conflates file edit with git commit (Recommended),
  (b) No — the "What you must NOT do" section and the scope boundary already make clear that committing is not a per-task action; adding it to the ticking instruction would be redundant.
  **Answer: (a) Yes. Include a one-sentence clarification inline with the ticking instruction — "ticking is immediate; committing and the human checkpoint remain at slice granularity" — so the model cannot read "tick immediately" as "commit immediately."**
