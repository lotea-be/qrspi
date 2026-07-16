# Questions — pr-review-open-tasks-and-followups

> Stage Q of QRSPI. Generated 2026-07-16.
> Change summary: Before the PR stage creates the PR, walk every open (un-ticked) item in `tasks.md` and every entry in `followups.md`, asking the user what to do with each (finish / defer / drop), so nothing open is silently carried into the PR.

This is a **kit-behavior change** to the QRSPI PR stage command (`claude/commands/pr.md`),
the reviewer agent (`claude/agents/reviewer.md`), and the `followup` command
(`claude/commands/followup.md`) — plus the regenerated `copilot/` tree via
`sync-copilot.mjs`. The standard Data model / Indexing / API / UI / Front-end state /
Migrations sections are **Not applicable** — kept as headings so stage S does not
re-litigate — and replaced with sections that fit this workflow/gate change.

---

## Scope guard (explicit out-of-scope)

The following topics are **explicitly out of scope** for this change:

- **Right-sizing the follow-up handling path** (`right-size-followup-handling`). That
  backlog item introduces three routing paths (implement directly / addendum flow /
  defer). This change only adds the gate that prompts the user about each follow-up
  before the PR is created — it does not change how the fix is ultimately routed.
- **Standardizing recurring ops scripts** (`standardize-recurring-ops-scripts`). Writing
  a Node helper for open-item enumeration is a separate backlog item that relates to
  this change; this change may or may not consume such a helper, but authoring the
  helper belongs to that item.
- **Changing the reviewer subagent's checklist.** The reviewer already flags unticked
  tasks as "Open issues". This change acts on those upstream of the reviewer, in the
  orchestrator, not inside the reviewer itself.
- **Changing `followups.md` format.** The format written by `/qrspi:pr` already follows
  the `postpr-fix` skill's shape; this change reads from that shape, not changes it.

---

## Data model — Not applicable

No entities, tables, or DTOs. The analogue is the schema of `tasks.md` and
`followups.md` files — covered under "tasks.md / followups.md surface" below.

## Indexing & query performance — Not applicable

No database queries. Not applicable to this repo.

## API — Not applicable

No HTTP surface. The command's "API" is the prose logic in `claude/commands/pr.md` and
the questions it poses at runtime via AskUserQuestion.

## UI — Not applicable

No web UI. The user-facing surface is the AskUserQuestion prompts inserted by the new
gate — covered under "Gate interaction & run-mode" below.

## Front-end state — Not applicable

No front-end state management. Not applicable to this repo.

## Auth & authorization — Not applicable

No auth layer. Not applicable to this repo.

## Migrations & data — Not applicable

No data-store migration. Not applicable to this repo.

---

## tasks.md / followups.md surface

1. **How does the PR stage today determine that all tasks are ticked?** The current
   `claude/commands/pr.md` precondition says "all boxes in `tasks.md` are ticked" — but
   is this just documented intent, or is it mechanically checked (e.g. does the reviewer
   subagent parse the file and flag un-ticked items)? Confirm the exact enforcement path
   so the new gate knows whether it is replacing, augmenting, or relocating an existing
   check.

2. **What is the exact markdown shape of an un-ticked task item in `tasks.md`?** Confirm
   whether the format is `- [ ] N.M …` (the `tasks.template.md` shape) or whether
   real-world files show variation (e.g. `- [ ]` without a number prefix, indented sub-
   tasks). The gate's parser must reliably distinguish ticked vs. un-ticked lines.

3. **What is the exact markdown shape of a follow-up entry in `followups.md`?** Confirm
   the format written by `/qrspi:pr`: per `postpr-fix`, the shape is
   `- [ ] **<title>.** <explanation>`. Are follow-ups always top-level items, or can they
   be nested? Are there archived `followups.md` examples that show real-world variation?

4. **Does `followups.md` always exist by the time the PR stage runs?** Today's flow
   creates `followups.md` only when the reviewer found open issues. If it is absent,
   the follow-up gate has nothing to iterate — confirm the expected behavior (skip the
   follow-up pass silently, or treat absence as "zero follow-ups to review" and say so).

5. **Can `tasks.md` have partially-ticked slices?** E.g., slice 2 has tasks 2.1 (ticked)
   and 2.2 (un-ticked). Does the gate enumerate individual un-ticked task lines, or does
   it enumerate un-ticked *slices* (the `## N. <slice>` heading plus all its un-ticked
   children)? Enumerating by slice groups related tasks, which is likely more useful but
   harder to parse.

---

## Gate placement — tasks pass

> ⮕ Resolved by PQ9 + PQ10: "Defer" is removed from the task-resolution options. An
> un-ticked task is **Finish / Drop / Pause** only — tasks are in-change work that must be
> done (or explicitly dropped) before archive, never deferred. Read item 8's "Defer" bullet
> and item 15's draft choices as superseded by this.

6. **Where exactly in the `claude/commands/pr.md` flow should the tasks-review gate
   be inserted?** The current flow is: establish run-mode → precondition check (tasks.md
   exists + git clean) → spawn reviewer subagent → PR-create step → record PR → seed
   followups → commit. The tasks-review gate must happen *before* spawning the reviewer
   (because the reviewer verifies that all tasks are ticked, and the gate is the step
   that resolves un-ticked ones). Confirm the insertion point: after the precondition
   check and before the reviewer spawn.

7. **Should the precondition check's "all boxes are ticked" assertion be softened or
   removed** once the gate exists? Today's precondition is a hard gate: if any task is
   un-ticked, presumably the stage stops. With the new review pass, the stage instead
   helps the user resolve open tasks. Confirm whether the precondition should:
   (a) remain as-is (the gate runs first, and by the time the reviewer is spawned,
       all tasks must already be ticked or dropped),
   (b) be removed (the gate alone is the guard — a task left un-ticked after the review
       pass is a blocker at PR-create time, not a precondition check), or
   (c) be softened to "tasks.md exists" only, deferring the "all ticked" assertion to
       the end of the tasks-review pass.

8. **For each open task, what are the resolution options?** The backlog description
   names: "finish / defer / drop." Confirm each option:
   - **Finish:** the user must resolve the task before the PR stage continues — i.e.,
     does the stage pause and wait for the user to implement the task, or does it hand
     off to `/qrspi:implement` and then resume?
   - **Defer:** the task is annotated somehow (a note? a `followups.md` entry? a new
     backlog idea?) and the PR proceeds without it. How is the deferral recorded?
   - **Drop:** the task is crossed out or removed from `tasks.md`. Does the stage
     actually edit `tasks.md` to mark it dropped, or does it only record the user's
     decision in the conversation?
   Does the gate need a fourth option: **"pause — let me check the code first"** so
   the user is not forced to decide immediately?

9. **How many un-ticked tasks are realistic?** If a typical scenario has 0–2 open tasks
   at PR time, a one-at-a-time loop is fine. If a batch-implementation run left a dozen
   tasks open, a one-by-one AskUserQuestion loop would be tedious. Should the gate
   enumerate all open tasks at once for visibility before prompting, or ask about each
   individually without a summary header?

---

## Gate placement — followups pass

10. **Should the followups-review pass happen before or after the tasks pass?** The
    backlog description implies tasks first, then followups. Confirm the ordering and
    whether there is a dependency (e.g., a "defer" decision on a task that should be
    added as a follow-up would logically precede the follow-up enumeration).

11. **When `followups.md` already exists at the start of the PR stage**, does that mean
    the reviewer subagent already ran in a previous session? The normal flow is:
    reviewer → seeds `followups.md` → human resolves via `/qrspi:followup`. If
    `followups.md` exists before the reviewer runs, the PR stage is presumably being
    re-invoked after a `/qrspi:followup` session. Should the followups-review pass only
    run at a specific point in the flow (before reviewer spawn? after?), or always?

12. **For each follow-up entry, what are the resolution options?** The backlog says "ask
    the user what to do with each." Candidate options:
    - **Fix now:** pause and invoke the implementer in post-PR FIX MODE (delegate to
      `/qrspi:followup` inline) before continuing to the PR-create step.
    - **Defer to post-PR:** keep it in `followups.md` for resolution after the PR is
      created; the PR stage proceeds.
    - **Drop:** remove the entry from `followups.md` (the item is no longer relevant).
    Are there additional options (e.g. "promote to a new backlog idea")?

13. **If the user chooses "fix now" for a follow-up, does the PR stage re-enter the
    tasks pass after the fix?** A fix might re-open a task, or might not. Confirm
    whether the gate loops back after an inline fix or simply continues linearly.

---

## Gate interaction & run-mode

14. **How do the new gates interact with Full / Semi / Manual run-mode?** The `workflow`
    skill's "Never-suppressed gates" list includes D review and backlog-capture offers.
    Should the tasks-review and followups-review gates be added to the never-suppressed
    list, or should they be suppressible in Full/Semi-auto when the tasks/followups
    files are clean?
    - If the files are clean (all ticked, no un-ticked follow-ups), the gate is a no-op
      either way — the interesting case is when there ARE open items.
    - Should Full-auto silently block on open items (hard-stop) or present the review
      gate regardless of mode?

15. **What is the exact AskUserQuestion shape for a single open task?** Draft a candidate
    question and choices. For example:
    - question: "Task 2.2 — `<task text>` is not ticked. What would you like to do?"
    - choices: ["Finish it now (I'll implement and re-run /qrspi:pr)", "Defer — add to followups.md", "Drop — this task is no longer needed"]
    Confirm whether the question should show the task's parent slice heading for context,
    and whether it should show a count ("1 of 3 open tasks").

16. **What is the exact AskUserQuestion shape for a single open follow-up entry?** Draft
    a candidate question and choices. For example:
    - question: "Follow-up: `<title>` — `<explanation excerpt>`. What would you like to do?"
    - choices: ["Fix now — invoke implementer in post-PR FIX MODE", "Defer — keep in followups.md for after the PR", "Drop — no longer needed"]

17. **Should the gate show a summary ("N open tasks, M un-resolved follow-ups") before
    starting the per-item loop**, so the user knows the scope of what they are about to
    be asked? Or is each item presented cold?

---

## tasks.md editing behavior

> ⮕ Resolved by PQ9 + PQ10: there is no "Defer" for tasks, so item 18 is moot. The only
> `tasks.md` edit this gate makes is the **Drop** annotation — tick `- [x]` with
> `~~strikethrough~~` text + `(dropped)` (PQ5). A "Finish" simply ticks the box normally.

18. **When the user chooses "Defer" for an open task, what exactly is written?** Options:
    - (a) Nothing is written to `tasks.md`; the task stays un-ticked but a note is added
      to `followups.md` referencing the deferred task.
    - (b) The task line in `tasks.md` is edited to mark it as deferred (e.g., change
      `- [ ]` to `- [-]` or add `~~` strikethrough text), keeping it visually distinct
      from "done" and "not-yet-started".
    - (c) The task is moved to `followups.md` and deleted from `tasks.md`.
    Which option best preserves the `tasks.md` contract that the planner wrote?

19. **When the user chooses "Drop" for an open task, what is written?** Options:
    - (a) The task is ticked (`- [x]`) with a `(dropped)` annotation.
    - (b) The task line is deleted from `tasks.md`.
    - (c) The task is struck through in-place: `- [ ] ~~2.3 <text>~~ (dropped)`.
    The choice affects whether `openspec validate` or future lint passes see the file
    as "clean" (all ticked).

20. **Does the PR stage commit the `tasks.md` edits (defer / drop annotations) before
    spawning the reviewer, or are they committed as part of the final PR-link commit?**
    If the edits land in the final commit, the reviewer sees the pre-edit state.
    If they land in a separate intermediate commit, the commit message should distinguish
    it from the final "docs(<id>): record PR #<N> link" commit.

---

## followups.md editing behavior

21. **When the user chooses "Drop" for a follow-up, is the entry deleted from
    `followups.md`, ticked, or annotated?** A deleted entry leaves no trace; a ticked
    entry satisfies the "every box should be ticked before archival" rule in
    `postpr-fix`. Confirm which behavior.

22. **When "Defer — keep in followups.md" is chosen, is any annotation added to the
    follow-up entry** (e.g. a date, a "acknowledged" note), or is it simply left as-is?

---

## Interaction with the reviewer subagent

23. **After the tasks-review and followups-review passes complete, does the reviewer
    subagent still run the "verify each box in tasks.md is ticked" check?** If the
    gate guaranteed all open items are resolved before the reviewer runs, the reviewer's
    check becomes redundant. Or is the reviewer's check a safety net that should be
    kept regardless?

24. **Does the reviewer's "Flag unresolved checklist items" in the PR description need
    to be updated** to reflect that the tasks-review and followups-review gates have
    already run? E.g., if the user chose "Defer" for a task, the reviewer's PR
    description should mention the deferred item in "Out of scope", not "Open issues."

---

## Copilot parity

25. **After `node sync-copilot.mjs` regenerates the `copilot/` tree, which files are
    affected by this change?** Confirm which `copilot/` artifact mirrors
    `claude/commands/pr.md` and whether `claude/agents/reviewer.md` has a copilot
    counterpart that also needs syncing.

26. **Does the Copilot port carry hand-authored AskUserQuestion stubs or any wiring
    that would conflict with the regenerated output?** Confirm whether any Copilot-
    specific adaptation of the PR stage's gate behavior exists today.

---

## Testing & verification

27. **How is the new gate behavior verified at merge time?** Options:
    - (a) Manual dogfood run: deliberately leave a task un-ticked on a real or toy
      change and run `/qrspi:pr <id>` to confirm the gate fires and records the
      decision correctly.
    - (b) A `scripts/lint.mjs` assertion: assert the PR command's prose contains
      specific keyphrases ("open task", "finish / defer / drop"). Mechanical but
      shallow.
    - (c) Code review of the diff alone — the change is prose-only in command/agent
      files and the change is small enough for this to be proportionate.
    Which option is the acceptance bar?

28. **Should `scripts/lint.mjs` get a new check for this change?** Existing checks cover
    pin agreement, frontmatter, heading alignment, README-command correspondence, and
    read contracts. Is there a structural property of the new gate (e.g. presence of
    "tasks pass" and "followups pass" sections in `pr.md`) that warrants mechanical
    assertion?

---

## Sequencing & scope

29. **Does this change depend on any other in-flight or backlog change?** In particular:
    - `right-size-followup-handling` (P2) — could alter how "fix now" is routed; confirm
      whether this change should land before or after it, or is independent.
    - `standardize-recurring-ops-scripts` (P2) — would provide a Node helper for open-
      item enumeration; confirm whether this change should wait for that helper or
      implement the enumeration inline (agent reads the file directly).
    - `lint-auto-mode-gate-coverage` (P2) — would add a lint check for auto-mode gate
      wiring; the new gates added here would be subject to that lint once it lands.

30. **Are there any other backlog changes that read or depend on the current PR stage
    flow** (e.g. anything that assumes the PR is created immediately after the reviewer
    runs)? If another in-flight change relies on the PR-create gate order, it could
    conflict with the new pre-PR review passes.

31. **Should the CHANGELOG entry for this change be placed under `## [Unreleased]`?**
    Confirm this follows the same pattern as `progressive-task-ticking` (no version bump
    in feature work; migration manifest authored at release time per
    `versioned-update-command` conventions).

32. **Does this change touch `claude/commands/followup.md` at all**, or only
    `claude/commands/pr.md` and `claude/agents/reviewer.md`? The backlog row says
    "the stage should first walk the still-open tasks in `tasks.md` … then loop over the
    entries in `followups.md`" — both passes live in the PR orchestrator, not in the
    followup command.

---

## Open product questions (for the human)

- [x] **PQ1 — Task resolution options:** When the PR gate encounters an un-ticked task,
  what resolution choices should the user see? Options:
  (a) Three choices — Finish now / Defer (add to followups.md) / Drop — matching the
  backlog description exactly (Recommended) — clean and covers the common cases,
  (b) Four choices — Finish now / Defer / Drop / Pause ("let me check the code first")
  — adds an escape hatch for users who want to inspect before deciding,
  (c) Two choices — Finish now / Skip for now — simpler but doesn't distinguish
  "intentionally dropped" from "deferred to a later change".
  **Answer: SUPERSEDED by PQ9 + PQ10 — the "Defer" option is removed for tasks. Tasks
  are in-change work that must be done before archive, so the reconciled task options are
  Finish / Drop / Pause (see PQ10).**

- [ ] **PQ2 — Follow-up resolution options:** When the PR gate encounters a follow-up
  entry, what choices should the user see? Options:
  (a) Three choices — Fix now (invoke implementer in post-PR FIX MODE) / Defer (keep
  in followups.md, PR proceeds) / Drop — symmetric with PQ1 (Recommended),
  (b) Two choices — Defer / Drop — the "Fix now" option adds implementation complexity
  (the PR stage must temporarily delegate to the implementer inline); simpler to push
  "Fix now" back to `/qrspi:followup` and just ask "include in PR or defer/drop",
  (c) Four choices — add "Promote to backlog idea" as a fourth option, matching the
  spirit of `right-size-followup-handling`.
  **Answer: (c) — four choices: Fix now / Defer (keep in followups.md) / Drop / Promote
  to backlog idea. This asymmetry with tasks (PQ10) is intentional: follow-ups already
  live in the post-PR bucket, so keep-deferred, drop, and promote-to-backlog (for
  separable scope) all make sense there. See PQ7 for how "Fix now" is handled.**

- [ ] **PQ3 — Gate suppression in auto-mode:** In Full / Semi-auto run-mode, should
  the tasks-review and followups-review gates be suppressed when all items are already
  resolved (zero open tasks, zero open follow-ups), and trigger a hard-stop when there
  are open items? Options:
  (a) Always interactive — the passes run regardless of mode, even if they have zero
  items to review (they display "0 open tasks — nothing to resolve" and continue
  automatically) — predictable and consistent, small no-op cost,
  (b) Mode-aware and suppressed when clean — in Full/Semi-auto, skip the passes
  entirely if all tasks are ticked and followups.md is absent/empty; fire a hard-stop
  only when items are found (Recommended) — avoids adding a chatty no-op in the happy
  path,
  (c) Add the new gates to the "never-suppressed" list (alongside D review and backlog
  offers) — gates always shown, regardless of mode or clean state.
  **Answer: (b) — mode-aware and suppressed when clean. In Full/Semi-auto, skip both
  passes when all tasks are ticked and followups.md is absent/empty; when open items ARE
  found, fire a hard-stop (present the review gate). Manual mode always runs the passes.**

- [ ] **PQ4 — Defer artifact:** When a task is deferred ("not doing it in this PR"),
  where is the deferral recorded? Options:
  (a) Add a new un-ticked entry to `followups.md` referencing the deferred task; leave
  `tasks.md` un-edited (Recommended) — followups.md is already the queue for post-PR
  work; consistent with how the reviewer seeds open issues,
  (b) Edit the task line in `tasks.md` to mark it deferred (e.g. struck through or
  annotated) and leave `followups.md` as-is — keeps deferral visible in the plan file
  but introduces a non-standard task-line shape,
  (c) Add to followups.md AND tick the task in `tasks.md` as "done via deferral" — so
  `tasks.md` reads as fully ticked after the pass, at the cost of obscuring intent.
  **Answer: MOOT / SUPERSEDED by PQ9 + PQ10 — there is no "Defer" for tasks, so there is
  no defer artifact to write. An un-ticked task is either Finished (done, ticked) or
  Dropped (PQ5). Deferring in-change work to followups.md is a useless step (it still
  blocks archive) and promoting it to the backlog wrongly treats in-change work as
  separable scope.**

- [ ] **PQ5 — Drop artifact:** When a task is dropped, what is written to `tasks.md`?
  Options:
  (a) Tick the task (`- [x]`) with a `~~<text>~~` strikethrough and a `(dropped)`
  annotation, so `tasks.md` is "all ticked" and the drop is self-documenting
  (Recommended),
  (b) Delete the task line — cleaner file, but the drop is invisible in the artifact,
  (c) Leave un-ticked and add a comment line below — non-standard shape; may confuse
  the reviewer's "all ticked" check.
  **Answer: (a) — tick the task (`- [x]`) with `~~strikethrough~~` text and a `(dropped)`
  annotation, so `tasks.md` reads "all ticked" and the drop is self-documenting.**

- [ ] **PQ6 — Scope of reviewer subagent changes:** Should the reviewer subagent's
  "verify all tasks ticked" step be kept, softened, or removed after this change adds a
  pre-reviewer gate? Options:
  (a) Keep the reviewer check as a safety net — the gate may miss edge cases; belts and
  suspenders (Recommended),
  (b) Remove the reviewer check — it is now redundant and adds confusion ("the gate
  already resolved this"),
  (c) Soften it — the reviewer reports remaining deferred/dropped tasks in the PR
  description "Out of scope" section rather than "Open issues."
  **Answer: (a) — keep the reviewer's "all boxes ticked" check as a safety net. The gate
  resolves open tasks upstream, but the reviewer's independent verification is belts and
  suspenders in case the gate misses an edge case. (Note: dropped tasks read as ticked
  per PQ5, so they satisfy this check.)**

- [ ] **PQ7 — followup.md interaction with "fix now":** If the user chooses "Fix now"
  for a follow-up, should the PR stage inline-delegate to the implementer in post-PR
  FIX MODE (complex, adds implementation steps to the PR orchestrator) or should it
  instead pause and instruct the user to run `/qrspi:followup <id>` first, then re-run
  `/qrspi:pr <id>`? Options:
  (a) Pause and redirect — "Please run `/qrspi:followup <id>` to resolve this, then
  re-run `/qrspi:pr <id>`" — simpler PR orchestrator, no inline delegation (Recommended),
  (b) Inline-delegate — the PR stage spawns the implementer in FIX MODE and resumes
  the PR flow after the fix — seamless UX but substantially more complex orchestration,
  (c) Not applicable — remove "Fix now" from the follow-up options entirely (see PQ2
  option b).
  **Answer: (a) with a refinement — pause and redirect (no inline delegation), but do NOT
  just print a flat instruction: present the redirect as an AskUserQuestion so the user
  chooses (e.g. "Run `/qrspi:followup <id>` now, then re-run `/qrspi:pr <id>`" vs "Stop
  here"). The gate offers the choice rather than dictating the next step.**

- [x] **PQ8 — Summary banner before per-item loop:** Should the gate show a count
  summary ("Found N open tasks and M un-resolved follow-ups — reviewing each now")
  before starting the per-item AskUserQuestion loop? Options:
  (a) Yes — the user knows what they are about to be asked; no surprises mid-loop
  (Recommended),
  (b) No — present each item directly; the count is implicit.
  **Answer: (a) — yes, show the count of open tasks and follow-ups up front before the
  per-item loop.**

- [x] **PQ9 — (emergent, reconciles PQ4) How should "Defer" be modelled for an un-ticked
  task?** A task left un-ticked at PR time could conceivably be deferred to `followups.md`
  (in-change) or promoted to a backlog idea (separable). Which model?
  **Answer: NEITHER — tasks are in-change work meant to be *done* in the current change.
  Deferring to `followups.md` is a useless step because follow-ups also block archival, so
  it does not actually defer anything. Promoting to the backlog is wrong because a task is
  not separable scope — it is committed work for *this* change. Therefore "Defer" is
  removed entirely from the task-resolution options. An un-ticked task is Finished or
  Dropped. (Follow-ups keep their Defer/Promote options per PQ2 — that asymmetry is
  intentional; follow-ups already live in the post-PR bucket.)**

- [x] **PQ10 — (emergent, reconciles PQ1 + PQ9) Confirmed task-resolution options.** Given
  PQ9, what does the gate offer for an un-ticked task?
  **Answer: Finish / Drop / Pause.** Finish now (implement and tick it), Drop (it turned
  out not to be needed — tick with `~~strikethrough~~` + `(dropped)` per PQ5), or Pause
  ("let me check the code first" — the escape hatch to inspect before deciding). No
  "Defer".
