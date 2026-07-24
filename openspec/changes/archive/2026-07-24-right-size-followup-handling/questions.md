# Questions — right-size-followup-handling

> Stage Q of QRSPI. Generated 2026-07-23.
> Change summary: Add an upfront triage step to `/qrspi:followup` that right-sizes each follow-up and routes it to one of three paths — implement directly (today's small-fix path), addendum flow (re-enter QRSPI from an earlier stage), or defer (drop to the backlog) — so large follow-ups are never silently pushed through the small-fix path.

This is a **kit-behavior change** to `claude/commands/followup.md` and
`claude/skills/postpr-fix/SKILL.md` — plus the regenerated `copilot/`
tree via `sync-copilot.mjs`. The standard Data model / Indexing / API
surface / UI / Front-end state / Migrations / Auth sections are
**Not applicable** — kept as headings so stage S does not re-litigate —
and replaced with sections that fit this workflow/routing change.

---

## Scope guard (explicit out-of-scope)

The following topics are explicitly out of scope for this change:

- **Changing the `postpr-fix` fix checklist itself.** The small-fix path
  (path 1) keeps its existing 7-step checklist unchanged.
- **Changing the `followups.md` format.** The format written by `/qrspi:pr`
  is already defined in `postpr-fix`; this change reads from that shape, not
  changes it.
- **Changing how `followups.md` is seeded.** The PR stage seeds the queue;
  that flow is untouched.
- **Changing the `pr-review-open-tasks-and-followups` gate.** That change
  added the tasks/followups reconciliation gate *before* the PR is created.
  This change governs what happens *after* the PR is open, when the human
  invokes `/qrspi:followup`.
- **Standardize-recurring-ops-scripts.** Writing a Node helper for
  `followups.md` parsing belongs to that backlog item; this change reads the
  file directly (agent reads prose).

---

## Data model — Not applicable

No entities, tables, or DTOs. Not applicable to this repo.

## Indexing & query performance — Not applicable

No database queries. Not applicable to this repo.

## API — Not applicable

No HTTP surface. The "API" is the prose logic in `claude/commands/followup.md`
and the triage questions it poses via AskUserQuestion.

## UI — Not applicable

No web UI. The user-facing surface is the AskUserQuestion prompts the new
triage step inserts.

## Front-end state — Not applicable

No front-end state management. Not applicable to this repo.

## Migrations & data — Not applicable

No data-store migration. Not applicable to this repo.

## Auth & authorization — Not applicable

No auth layer. Not applicable to this repo.

---

## Triage gate — sizing signals

1. **What signals does the triage use to classify a follow-up as small vs.
   large?** Today's `postpr-fix` skill defines "small" by implication
   (atomic fix, in-scope, one capability), but the triage needs an explicit
   rubric the agent can apply. Candidate dimensions:
   - Does it change a **contract** (route, status code, DTO shape, auth
     rule) that would require a delta-spec amendment, or is it purely
     internal?
   - Does it touch **more than one capability** (as defined by the change's
     `specs/` subdirectories)?
   - Does it require **re-aligning a design decision** (`design.md` Dn
     entry needs updating), or can it be expressed as an amendment to an
     existing delta-spec scenario?
   - Does it introduce **new scope** not covered by the change's delta spec
     at all (i.e., it is genuinely a separate change)?
   Which signals are mandatory vs. optional? Are they self-reported by the
   user or assessed by the agent?

2. **Does the triage present a structured size checklist to the user, or does
   it ask a single open-ended "how big is this?" question?** A checklist
   (e.g., "Does this touch more than one file/capability? Does it require
   re-alignment?") is reproducible; an open question relies on the user's
   judgment alone and may produce inconsistent routing.

3. **Who drives the triage decision — the agent or the human?** Options:
   (a) Agent proposes a path and the human confirms/overrides — fast but may
   miscategorize; (b) human is asked directly and the agent validates their
   answer against obvious misroutes (e.g., "you said small, but you also said
   it touches a new capability — are you sure?"); (c) human is sole judge,
   no agent validation — simple but the whole point of the triage is to
   prevent silent mis-routing.

4. **Is the triage run once per `/qrspi:followup` invocation regardless of
   how many items are in the queue, or once per follow-up item?** If the
   queue has three items, should each item be triaged individually (route
   may differ), or does the command classify the whole batch and pick a
   single path?

5. **If the triage classifies the currently-targeted follow-up as small,
   does the triage step disappear for that run (i.e., is it a one-time gate
   that, once passed, hands off to the existing fix checklist), or does the
   triage output appear in the human's context as a recorded decision?**
   Recording the decision (e.g., a note in the final commit message or
   in `followups.md`) provides an audit trail; not recording it keeps the
   happy path thin.

---

## Path 1 — implement directly (small fix)

6. **Is path 1 exactly the current `followup.md` flow, or does the triage
   gate add anything?** For example, should the triage result influence the
   model selection ("this is a complex fix — use opus even though the default
   is sonnet"), or is today's `followup.md` model logic (`sonnet` default,
   `opus` when the fix touches design-level logic or spans several files)
   sufficient and unchanged?

7. **When path 1 is taken, does the triage record anything in `followups.md`
   (e.g., a `(small-fix)` annotation on the checkbox), or does the entry
   remain in the existing format?** Recording the triage decision in the
   queue would make the audit trail visible; leaving the format unchanged
   avoids introducing a new `followups.md` shape that the existing tooling
   doesn't expect.

---

## Path 2 — addendum flow

8. **What exactly is an "addendum"?** Is it a new, separate change folder
   under `openspec/changes/<id>-addendum-N/` (a fresh sibling change), or
   is it additional artifacts *inside* the existing change folder (e.g.,
   `openspec/changes/<id>/addendum-1/questions.md`)? Nesting inside the
   existing change folder keeps the work scoped; a separate folder keeps
   the QRSPI artifact model clean but may blur the PR relationship.

9. **How does the addendum re-enter the QRSPI pipeline?** The backlog
   description says "re-enters from an earlier stage (any of
   Q/R/D/S/V/P/I)". In practice:
   - Does the command let the human pick the entry stage interactively
     (e.g., "Which stage should this addendum start from?"), or does the
     triage classify it automatically (e.g., "touches a delta spec → starts
     at D; needs new research → starts at R")?
   - Does the agent then invoke `/qrspi:<stage> <addendum-id>` directly, or
     does it just instruct the human to do so?

10. **Does an addendum land on the same PR branch as the original change, or
    on a new branch?** Keeping it on the same branch is simpler but means the
    PR grows unpredictably; a new branch gets a separate PR, which is cleaner
    but disconnects the work visually from the original change.

11. **Is the addendum represented in the backlog?** The current change is
    already `in-progress` in `openspec/backlog.md`. An addendum that re-enters
    the pipeline could:
    (a) be tracked as a new `in-progress` row with a cross-reference to the
    parent change,
    (b) reuse the parent change's backlog row (updating its note),
    (c) not appear in the backlog at all (it is subsumed by the parent change's
    PR).
    Which model is consistent with the existing backlog conventions?

12. **What happens to the follow-up entry in `followups.md` when path 2 is
    chosen?** Options:
    (a) The entry is ticked with a note like `(routed to addendum <id>)`,
    (b) The entry stays un-ticked until the addendum's implementation is done
    and closes it,
    (c) The entry is deleted and moved to the addendum's own planning artifacts.
    Which preserves the "every box ticked before archival" invariant of
    `postpr-fix`?

13. **Does the addendum flow ever block the original PR from being merged?**
    If an un-ticked follow-up is routed to an addendum but the original PR is
    already open, the archival rule (every box ticked) would block archive.
    Is there a sanctioned way to split: "original PR merges, addendum is a
    follow-on PR"? If so, how is that represented in `followups.md`?

---

## Path 3 — defer to backlog

14. **When path 3 is chosen, is the agent responsible for writing the backlog
    row, or does it just instruct the human to do so?** The existing
    follow-ups-pass gate in `pr.md` already has a "Promote to backlog idea"
    choice that appends a row to `openspec/backlog.md`. Does path 3 in
    `/qrspi:followup` reuse the same mechanics, or is a different flow needed
    because the follow-up is post-PR (the row must be added while the PR is
    still open and the change is `in-progress`)?

15. **What is written to `followups.md` when path 3 is chosen?** Options:
    (a) The entry is ticked with a `(deferred to backlog — <slug>)` note so
    the archival pre-check passes,
    (b) The entry stays un-ticked with a `(deferred to backlog)` annotation,
    but archival is blocked until a human clears it,
    (c) The entry is deleted from `followups.md` and the backlog row is its
    only record.
    Which option best satisfies the "every box ticked before archival" rule?

16. **If path 3 is chosen, what priority band should the new backlog row
    default to?** The existing "Promote to backlog idea" in `pr.md` defaults
    to `P3`. Should `/qrspi:followup`'s path 3 use the same default, or
    should the triage's size classification influence the priority (e.g., a
    follow-up that is new scope but high-impact defaults to `P2`)?

---

## Triage interaction & run-mode

17. **How does the triage gate interact with Full / Semi / Manual run-mode?**
    The `workflow` skill's "Never-suppressed gates" list includes D review and
    backlog-capture offers. Is the triage gate a never-suppressed gate (it is a
    human-in-the-loop judgment, so auto-advancing it defeats the purpose), or
    is it mode-aware (in Full/Semi-auto the agent proposes a path and
    auto-advances if the follow-up clearly matches a known pattern)?

18. **What is the exact AskUserQuestion shape for the triage step?** Draft a
    candidate prompt and choices. For example:
    - question: "Follow-up: `<title>` — `<brief excerpt>`. How would you
      classify this?"
    - choices: ["Small fix — implement directly", "Larger — needs addendum
      flow (re-enter QRSPI)", "New scope — defer to backlog idea"]
    Should the agent add a recommended option based on its own assessment?
    Should the choices include a "Tell me more / I'm unsure" escape hatch?

19. **If a follow-up is described by the user ad hoc (i.e., it was not
    already in `followups.md`), does the triage gate still run before adding
    it to `followups.md`?** Today's skill says "add it to `followups.md`
    first, then resolve it." With a triage gate, the classify-then-route
    order might mean: classify first (path 3 → add as backlog idea, never
    touch `followups.md`; path 2 → create addendum instead; path 1 → add and
    fix inline). Confirm the preferred order.

---

## `followup.md` command — structural changes

20. **Which file(s) need to change?** The likely candidates are:
    - `claude/commands/followup.md` — the orchestrator that spawns the
      implementer; triage gates go here.
    - `claude/skills/postpr-fix/SKILL.md` — the fix checklist loaded by the
      implementer; does it need a preamble that acknowledges paths 2/3, or is
      it left entirely to path 1?
    - `openspec/changes/<id>/followups.md` — runtime artifact; the triage
      writes annotations here (per path 2 and path 3 decisions above).
    Does any other file change (e.g., `workflow` skill's "After PR — the fix
    loop" section, the reviewer subagent)?

21. **Does the `postpr-fix` skill need to document the three-path model, or
    does it remain focused on the small-fix path (path 1) only?** If the skill
    is path-1-only, the three-path framing lives exclusively in
    `followup.md`. If the skill absorbs the triage, the agent that loads it
    (the implementer in FIX MODE) gets the full context — but the implementer
    should not be doing triage; that belongs in the orchestrator.

22. **Does `claude/commands/followup.md` currently have "one follow-up per
    invocation" as a hard constraint?** The current wording is "One follow-up
    per invocation. Re-running `/qrspi:followup <id>` picks up the next
    un-ticked item." With path 2 (addendum) and path 3 (defer), the command
    might need to terminate earlier (after the triage) rather than always
    handing off to the implementer. Confirm whether the "one per invocation"
    constraint still holds across all three paths.

---

## Addendum — QRSPI pipeline re-entry mechanics

23. **How does re-entering the pipeline mid-way work for an addendum?** The
    eight-stage flow normally starts at Q. For path 2, the human chooses an
    entry stage (e.g., D if the design is mostly clear, Q if it is not). Does
    the `/qrspi:<stage>` command work cleanly when given an addendum change id
    that is a sibling of the original, or does it need any adjustment?

24. **What is the naming convention for addendum change ids?** Candidates:
    (a) `<original-id>-addendum` (simple, no numbering),
    (b) `<original-id>-addendum-1`, `-2`, etc. (supports multiple addenda),
    (c) a fully independent name that cross-references the parent in its
    backlog row (no structural coupling in the id itself).
    Consistent naming matters because the orchestrator may need to find the
    addendum's folder programmatically.

25. **Is there a risk that starting an addendum from stage D (skipping Q and
    R) violates the research ticket-hiding invariant?** Research is the stage
    that must not see the ticket (questions.md). If path 2 skips Q and R and
    starts at D, the researcher is never invoked — that is consistent with the
    invariant. If path 2 starts at Q, the questioner runs and there is no
    conflict. Confirm that the "any of Q/R/D/S/V/P/I" entry point list from
    the backlog description is correct and that ticket-hiding is preserved for
    each entry point.

---

## Copilot parity

26. **After `node sync-copilot.mjs` regenerates the `copilot/` tree, which
    files are affected by this change?** Confirm which `copilot/` artifact
    mirrors `claude/commands/followup.md` and whether
    `claude/skills/postpr-fix/SKILL.md` has a copilot counterpart that also
    needs syncing.

27. **Does the Copilot port carry any hand-authored wiring in the followup
    flow that would conflict with the regenerated output?** Confirm whether
    any Copilot-specific adaptation of the post-PR fix flow exists today.

---

## Testing & verification

28. **How is the new triage behavior verified at merge time?** Options:
    (a) Manual dogfood run: create a real follow-up entry spanning multiple
    capabilities, run `/qrspi:followup <id>`, and confirm the triage fires
    and routes to path 2 or 3 as expected — highest confidence but requires
    a test scenario.
    (b) Code review of the diff alone — the change is prose-only in
    command/skill files and is small enough that reading it is proportionate.
    (c) A `scripts/lint.mjs` assertion: assert that `followup.md` contains
    keywords indicating the triage step ("right-size", "addendum", "defer").
    Mechanical but shallow.
    Which option is the acceptance bar?

29. **Should `scripts/lint.mjs` get a new structural check for this change?**
    Existing checks cover pin agreement, frontmatter, heading alignment,
    README-command correspondence, and read contracts. Is there a structural
    property of the triage gate (e.g., the three-option choice must appear in
    `followup.md`) that warrants mechanical assertion?

---

## Sequencing & scope

30. **Does this change depend on `pr-review-open-tasks-and-followups` having
    already merged?** That change added the tasks/followups reconciliation gate
    inside `pr.md`. This change extends the post-PR *resolution* path for
    follow-ups. Is there a dependency — e.g., the "Promote to backlog idea"
    choice introduced by that change overlaps with path 3 here — or are the
    two orthogonal enough to be developed independently?

31. **Does this change affect `followup.md`'s relationship with the
    backlog's `in-progress` row?** The current `followup.md` explicitly says
    "A post-PR fix does not change the backlog status line." Does path 3
    (defer to backlog) break this invariant, since path 3 *does* add a row
    to `openspec/backlog.md`? Or is adding a new `idea` row different from
    changing the *status* of the existing `in-progress` row?

32. **Should the CHANGELOG entry for this change go under `## [Unreleased]`?**
    Confirm this follows the same pattern as `pr-review-open-tasks-and-followups`
    (no version bump in feature work; migration manifest authored at release
    time per `versioned-update-command` conventions).

33. **Is `lint-auto-mode-gate-coverage` (P2) relevant here?** That item would
    add a lint check for auto-mode gate wiring consistency. The new triage gate
    this change adds would be subject to that lint once it lands. Does this
    change need to pre-wire anything, or is it independent?

---

## Open product questions (for the human)

- [x] **PQ1 — Triage ownership:** Who is responsible for the size/path
  classification — the agent or the human?
  Options: (a) Agent proposes a path based on heuristics (contract change?
  multi-capability? new scope?) and the human confirms or overrides
  (Recommended), (b) the agent asks the human directly with no prior
  assessment — simpler but the whole point is to prevent mis-routing, (c)
  the human is sole judge with no agent prompting — agent just offers the
  three choices cold.
  **Answer: (a) Agent proposes a path based on heuristics, human confirms or overrides.**

- [x] **PQ2 — Triage suppression in auto-mode:** Should the triage gate be
  suppressed in Full / Semi-auto mode when the agent's self-assessment is
  "clearly path 1" (unambiguously small fix)?
  Options: (a) Never suppressed — triage is always human-in-the-loop
  regardless of mode (Recommended — the whole point is to prevent silent
  mis-routing), (b) Mode-aware — in Full/Semi-auto, if the agent classifies
  the follow-up as clearly path 1, auto-advance to path 1 without asking;
  hard-stop when the classification is uncertain, (c) Suppressed entirely
  in Full auto — triage runs only in Manual mode.
  Note: if PQ1 resolves to option (c) (human is sole judge), then auto-mode
  suppression is moot — the gate must always fire.
  **Answer: (a) Never suppressed — the triage gate is a never-suppressed, human-in-the-loop gate in all run-modes.**

- [x] **PQ3 — Addendum folder model:** Where do addendum artifacts live?
  Options: (a) A new sibling change folder
  `openspec/changes/<original-id>-addendum-1/` — clean QRSPI model, separate
  PR possible (Recommended), (b) A subdirectory inside the existing change
  folder `openspec/changes/<original-id>/addendum-1/` — keeps the work
  collocated but breaks the flat change-folder convention, (c) Reuse the
  existing change folder with a new stage suffix (no dedicated subfolder —
  addendum artifacts mix with the original's artifacts).
  **Answer: Deferred to Research (R) — let stage R recommend the best folder model against the existing change-folder conventions. Pairs with PQ5 (addendum id naming).**

- [x] **PQ4 — Addendum branch strategy:** Does an addendum land on the same
  PR branch as the original change, or on a new branch?
  Options: (a) Same branch — addendum work extends the same PR (simpler,
  one PR to review), (b) New branch and new PR — addendum gets its own PR
  that references the parent change (cleaner separation; recommended when
  the addendum is stage Q/R re-entry since the work diverges significantly),
  (c) Let the human choose at triage time based on the entry stage (e.g.,
  D/S/V/P entry → same branch; Q/R entry → new branch).
  Note: PQ4's answer directly constrains how the addendum change id is
  constructed (PQ5) and what backlog row is written (PQ6).
  **Answer: (c) Let the human choose at triage time based on the entry stage (D/S/V/P → same branch; Q/R → new branch as the default steer).**

- [x] **PQ5 — Addendum change-id naming:** What naming convention should
  addendum change ids use?
  Options: (a) `<original-id>-addendum` (simple, supports one addendum),
  (b) `<original-id>-addendum-N` (numbered, supports multiple addenda per
  change) (Recommended), (c) A fully independent descriptive name with a
  cross-reference comment in its backlog row — no structural coupling to
  the parent id.
  **Answer: (b) `<original-id>-addendum-N` — numbered, supports multiple addenda per change.**

- [x] **PQ6 — followups.md annotation on path 2 / path 3:** What is written
  to the follow-up entry in `followups.md` when path 2 or path 3 is chosen?
  Options for path 2 (addendum): (a) Tick the entry with `(routed to
  addendum <id>)`, (b) Leave un-ticked until the addendum closes the item.
  Options for path 3 (defer): (a) Tick the entry with `(deferred to backlog
  — <slug>)`, (b) Leave un-ticked with an annotation, (c) Delete the entry
  (backlog row is the only record).
  The "every box ticked before archival" rule argues for ticking in both
  cases; leaving un-ticked blocks archive. What is the preferred choice for
  each path?
  **Answer: Deferred to Design (D) — the exact annotation semantics (tick vs. leave un-ticked, and how it interacts with the "every box ticked before archival" invariant) are a design-level decision.**

- [x] **PQ7 — Path 3 backlog-row priority default:** When a follow-up is
  deferred to the backlog (path 3), what priority band should the new idea
  row default to?
  Options: (a) `P3` — same as the "Promote to backlog idea" choice in
  `pr.md`'s follow-ups gate (Recommended — consistent convention), (b) `P2`
  if the triage classified the item as significant new scope, (c) Let the
  human choose the priority band during triage.
  **Answer: (a) `P3` — same default as the "Promote to backlog idea" choice in `pr.md`, keeping the convention consistent.**

- [x] **PQ8 — postpr-fix skill scope:** Should the `postpr-fix` skill
  document the three-path model, or remain path-1-only?
  Options: (a) Skill documents all three paths as an overview, with path 1
  as the "this skill's detailed checklist" and paths 2/3 as brief pointer
  sections — provides full context when the implementer loads it, (b) Skill
  stays path-1-only; the three-path model lives exclusively in `followup.md`
  — cleaner separation of concerns (Recommended — the implementer does not
  do triage; triage belongs in the orchestrator), (c) Create a separate
  `right-size-triage` skill for the classification logic, loaded by the
  orchestrator but not the implementer.
  **Answer: (b) `postpr-fix` stays path-1-only; the three-path triage model lives in `followup.md` (the orchestrator), not the implementer's skill.**

- [x] **PQ9 — workflow skill update:** Should the `workflow` skill's "After
  PR — the fix loop" section be updated to describe the three-path model?
  Options: (a) Yes — update the section to summarize the triage and the
  three paths so stage-command authors have the full picture when they read
  `workflow` (Recommended), (b) No — `workflow` describes the pipeline at a
  stage level; post-PR fix details belong in `postpr-fix` and `followup.md`,
  (c) Add only a one-sentence pointer: "See skill `postpr-fix` for the
  right-sizing triage."
  **Answer: (a) Yes — update "After PR — the fix loop" to summarize the triage and the three paths so stage-command authors get the full picture from `workflow`.**
