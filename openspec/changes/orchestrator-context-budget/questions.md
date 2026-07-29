# Questions — orchestrator-context-budget

> Stage Q of QRSPI. Generated 2026-07-28.
> Change summary: Bound the QRSPI orchestrator's own cross-session context growth by (1) making
> reset-and-resume a blessed first-class step at natural structural boundaries, and (2) adding
> a live-% or structural-heuristic budget gate at the top of each stage command that nudges or
> soft-blocks the user before the orchestrator context degrades.

<!--
  Surface-gated sections: this repo's ## Repo surface block lists slash-command, stage-agent,
  skill, lint-gate, template, migration-manifest.
  No data-store / http-api / ui / auth surfaces are present -- those sections are omitted.
  Sections below are shape-driven for a slash-command + skill change, plus the three
  always-emitted sections. No new stage-agent, lint-gate, template, or migration-manifest
  changes are anticipated -- those sections are omitted as inapplicable to this change's shape.
-->

## Slash-command surface (all stage commands + `/qrspi:archive` + `/qrspi:followup`)

> ⮕ Resolved by product questions: PQ6 → the gate is added to ALL eleven
> commands (8 stages + archive + followup), so Q7's inclusion set is settled.
> PQ4 → the post-archive reset (Q2/Q24) is a NEW step-7 AskUserQuestion, not a
> summary line; its "Yes" branch only prints the resume path (no auto-reset).
> PQ2 → the mid-chain soft gate (Q8/Q9) is never-suppressed in every run-mode.
> PQ5 → the gate fires once per threshold level (Q4), not every stage.

1. Every `/qrspi:<stage>` command currently opens with two mandatory steps:
   (a) session version check (skill `qrspi-version-check`) and (b) run-mode
   establishment. What is the exact intended insertion point for the new budget
   check -- before step (a), between (a) and (b), or after (b)? The version check
   is designed to be "the very first step, before run-mode and before any other
   work"; does the budget gate share that priority or run after version-check but
   before run-mode?

2. The backlog description calls for nudging a reset after `/qrspi:archive` and
   after a `/qrspi:followup` batch. The archive command already has a mandatory
   AskUserQuestion at step 5 (commit-target choice). Should the reset recommendation
   appear at the END of the archive command (as a 7th step, after the completion
   summary) rather than at the TOP (where the stage gate checks live), given that
   archive itself is typically the last action before the boundary?

3. The `/qrspi:followup` command drives a multi-loop flow. At what point in the
   followup loop should the reset nudge fire -- after each individual followup is
   resolved, or once after the batch is complete? What distinguishes "a batch is
   complete" in that command's structure?

4. The version check uses an in-context session flag to fire only once per session.
   Should the budget gate also use a session flag (fire once, silent thereafter), or
   should it re-evaluate at every stage invocation throughout the session? If it
   re-evaluates every time and the human chose "continue" at 65%, they will be
   re-asked at 70%, 75%, etc. -- is that the designed behaviour or a friction smell?

5. Should the reset recommendation / soft gate appear in the archive command and
   followup command as explicit prose additions to those command files, or as a
   shared helper mechanic (like a skill) so the wording stays consistent across all
   insertion points? The version-check skill is the existing precedent for a
   "runs at the top of every command, shared mechanic" pattern.

6. The `context-hygiene` skill lists the hard-reset trigger as 60% and the target
   as under 40%. Are those the right thresholds for the two gate levels (nudge vs.
   soft gate)? Specifically: should the first-level nudge fire at 40% (you are at
   the target ceiling), 50% (halfway), or 60% (the stated hard-reset trigger)?
   Should the soft gate (AskUserQuestion) fire at 60%, 70%, or 80%?

7. The commands that carry the gate are: all eight stage commands (`/qrspi:questions`,
   `/qrspi:research`, `/qrspi:design`, `/qrspi:structure`, `/qrspi:slices`,
   `/qrspi:plan`, `/qrspi:implement`, `/qrspi:pr`), plus `/qrspi:archive` and
   `/qrspi:followup`. Are there other commands (`/qrspi:status`, `/qrspi:update`,
   `/qrspi:retro`) that should also carry the gate? What is the principled inclusion
   criterion -- "any command that the orchestrator runs in a long session"?

8. In Full-auto run-mode, the orchestrator chains stages without AskUserQuestion
   pauses (except at never-suppressed gates). If the budget gate fires mid-chain in
   Full-auto mode at the 80% level, should it: (a) hard-stop the chain
   unconditionally (like a hard-stop condition), (b) pause and ask as usual (the
   gate is never-suppressed), or (c) demote to a one-line warning only (a degraded
   gate to preserve the auto-chain)? The answer has implications for which "never-
   suppressed gates" category this falls into (see `workflow` skill).

9. The `workflow` skill's "Never-suppressed gates" list currently enumerates the
   D review and backlog-capture offers. Does the budget soft gate (at ~80%)
   join that list? Or is it a suppressible gate that Full-auto may demote to a
   one-line warning?

10. When the budget gate fires mid-chain and the user chooses "reset now", they
    lose the in-context run-mode, the in-context version-check session flag, and
    any other in-context state. The change folder is the durable artifact and
    resuming is lossless. What exact prompt text and resume instruction should the
    gate print so the user knows how to continue ("start a new session and run
    `/qrspi:<next> <id>`")?

## Skill surface (`context-hygiene`, `qrspi-version-check`, `workflow`)

11. The `context-hygiene` skill currently says "keep the orchestrator under ~40%,
    reset at 60%" and "subagents are context firewalls" -- but it does NOT name
    the marathon anti-pattern explicitly: starting change N+1 in the same
    orchestrator that finished change N, or running 10+ followups in one session,
    silently accumulates past the ceiling even though each stage subagent is lean.
    What specific prose additions to `context-hygiene` make this gap undeniable?
    Should the new content be a `## Marathon anti-pattern` subsection, an
    expansion of the existing `## Operational checklist`, or a structural addition
    to the "Subagents are context firewalls" section?

12. The `context-hygiene` skill's "Mechanism backing the 40%/60% principle"
    section lists three lint mechanisms (Check 2b, Check 12, and
    `scripts/context-footprint.mjs`). Should the new budget gate mechanism also be
    listed here (as a fourth bullet) to keep the mechanism inventory complete, or
    is the budget gate documented only in the commands/skills that embed it?

13. The `qrspi-version-check` skill is the closest precedent for this gate:
    session-scoped, silent on the happy path, loaded at the top of every command,
    fires an AskUserQuestion on a specific condition. What aspects of the version
    check's design SHOULD the budget gate mirror exactly (e.g. silence discipline,
    session-flag pattern, the exact two-choice AskUserQuestion format)? What
    aspects should deliberately differ (e.g. the budget gate may fire multiple
    times per session if re-evaluated, unlike the version check)?

14. The `workflow` skill's "Stage choreography" section defines the run-mode
    establishment procedure and the never-suppressed gate list. If the budget soft
    gate joins the never-suppressed list, does the `workflow` skill need a prose
    update naming it? If the gate is suppressible in Full-auto, does it need a
    "Mode-aware budget gate" paragraph analogous to the existing "Run-mode (Full /
    Semi / Manual)" section?

15. The `workflow` skill documents the "Full-auto chaining" behaviour: after
    `/qrspi:archive`, the orchestrator may be mid-chain into `/qrspi:questions`
    for the next change (if the user is running multiple changes in sequence in
    Full-auto). The reset recommendation after archive is meant to interrupt
    exactly this scenario. How does the reset recommendation interact with the
    Full-auto next-stage handoff -- does the recommendation appear before the
    handoff question, does it override the handoff, or does it replace the
    handoff entirely for the post-archive case?

16. The backlog's item (4) says: "harden `context-hygiene`'s prose to name the
    marathon anti-pattern explicitly (subagent firewalling does NOT bound cross-
    session accumulation)." Is "cross-session" the accurate term here? The problem
    is cross-STAGE accumulation WITHIN one session (not across terminal sessions).
    Confirm the correct vocabulary before writing the prose so it doesn't mislead.

## Feasibility: live context-% read vs. structural heuristic

> ⮕ Resolved by PQ1: stage R must answer Q17/Q21 (can a command body read live
> context %?) FIRST; stage D branches the whole gate design on the finding — do
> not design both mechanisms. Resolved by PQ3: the structural-counter thresholds
> in Q18 are deferred to stage D (not fixed here).

17. **Load-bearing feasibility question.** The version-check skill reads a static
    file (`installed_plugins.json`) using the Read tool. Live context utilization %
    is a different capability. Read `claude/skills/qrspi-version-check/SKILL.md`
    and `claude/commands/status.md` and any other relevant command files: is there
    ANY existing mechanism in this repo that reads or surfaces live context
    utilization mid-run from within a slash-command body? If yes, where is it used
    and what tool/API call provides it?

18. If live context % is NOT exposed to command bodies (the expected finding), the
    gate degrades to a **structural heuristic**: a counter of stages-run and
    followups-resolved maintained in orchestrator context this session. What is
    the baseline calibration for that counter? Specifically: at what stages-run
    count should the first-level nudge fire, and at what count should the soft
    gate (AskUserQuestion) fire? Use the consumer evidence (982k/1m at the D
    review of the second change) to derive a rough estimate.

19. The version-check session flag and the run-mode flag both live "in context"
    (no disk file). A structural counter would use the same mechanism. What is the
    risk that the counter drifts from reality (e.g. a mid-session `/clear` resets
    the counter but not the actual accumulated context)? Is that drift acceptable,
    or does the counter need to be more conservative (reset = start fresh, so the
    counter is always a lower bound, not an estimate)?

20. If the structural heuristic (counter) is the only viable mechanism, the two
    halves of this change (reset-and-resume structural triggers + budget gate)
    converge onto the same trigger: "N stages run" or "M followups run" in this
    session. Does that convergence mean the live-% gate degrades to the same set
    of structural nudges the reset-and-resume half already emits, effectively making
    the two halves one feature rather than two? Should the design reflect that
    convergence explicitly (merging the two sub-items into one mechanism) rather
    than shipping them as separate features?

21. If a live context-% read IS feasible (needs R to confirm), what is the exact
    tool call or API surface that exposes it? Is it a tool result field, a special
    environment variable, a harness-injected variable available in command prose,
    or something else? Stage R should probe this specifically.

## Reset-and-resume triggers

22. The backlog identifies four concrete structural triggers:
    (a) after `/qrspi:archive` before the next `/qrspi:questions`,
    (b) document/one-command the resume path so reset is routine hygiene,
    (c) nudge after a `/qrspi:followup` batch,
    (d) harden `context-hygiene` prose.
    Are all four mandatory for this change, or are some deferrable? Specifically:
    is trigger (b) (documenting the resume path) a prose addition to
    `context-hygiene`, a new paragraph in each stage command, or something in
    `/qrspi:status`?

23. The resume path is "start a fresh session and run `/qrspi:<next> <id>`". The
    `/qrspi:status` command already shows the current stage and the next command.
    Does the reset recommendation need to link to `/qrspi:status` as the
    "check where you are" step, or is it self-contained ("fresh session,
    `/qrspi:<next> <id>`" is enough)?

24. After `/qrspi:archive`, the existing step 6 prints a completion summary.
    Should the reset recommendation appear (a) as additional text appended to
    step 6's summary, (b) as a new step 7 after step 6, or (c) embedded in
    the AskUserQuestion of step 5 (commit-target choice) as an extra choice
    ("Commit to main and start a new session for the next change")?

25. The followup loop in `/qrspi:followup` may resolve items one at a time.
    Should the reset nudge fire after each resolution (potentially many prompts)
    or only once at the end when the loop finds no more open followup items?
    If the human is doing 10+ followups (the motivating case), a per-item nudge
    would itself become friction.

## Testing

26. The version-check skill has no test in `scripts/lint.mjs` -- its correctness
    is verified by loading it at runtime. If the budget gate takes the same
    "skill loaded at runtime" approach rather than a lint check, what is the
    observable that a `(human)` dogfood checkpoint would verify? Specifically:
    what must a human do in a fresh `--plugin-dir` session to confirm the nudge
    appears at the right threshold?

27. If the gate is a structural heuristic counter, the counter must reach its
    threshold within the session. A dogfood test would need to run enough stages
    to cross the threshold (e.g. 5+ stages in one session). Is that feasible in
    a `qrspi-dogfood` scenario, or does the threshold need to be configurable /
    artificially lowered for testing?

28. What existing lint checks, if any, need to be updated to account for the new
    prose in the command files (e.g. any check that validates the order of steps
    in a stage command or the presence of specific step text)?

29. If the `context-hygiene` skill gains new prose, is there a lint check that
    validates the skill file's content or structure (e.g. Check 2b asserts skill
    sets per stage -- does it also check the skill's own content)? Does any new
    prose addition risk breaking an existing check?

## Sequencing & scope

30. The backlog's road-to-1.0 Tier 1 lists this bundle as the next item after
    `spec-sync-contract` (shipped 2026-07-28) and `unify-implement-paths-on-
    variants` (shipped 2026-07-28). Does anything from those two recently-shipped
    changes create a coupling or conflict this change must account for? Specifically:
    the `unify-implement-paths-on-variants` change added effort-variant subagents;
    do those new agents also need the budget gate?

31. The `orchestrator-effort-targeting` backlog item (P3) is described as a
    distinct axis (per-turn effort at the orchestrator level). Is there any design
    overlap between that item and the budget gate? Specifically: if the budget gate
    causes the orchestrator to reset, the per-turn effort state is also lost --
    does that interaction need to be documented as a Non-Goal here or in that item?

32. The archived `context-budget` change (2026-07-24) addressed per-stage
    input/output load. This change addresses cross-stage orchestrator accumulation.
    The two are explicitly called "distinct axes" in the backlog. Is there any prose
    in the archived `context-budget` design or skills (Check 12 output-contract
    banners, the `context-footprint.mjs` script) that this change must reference,
    extend, or avoid contradicting?

33. The `lint-auto-mode-gate-coverage` backlog item (P2) proposes a lint check
    asserting that every stage command references the run-mode procedure. If this
    change adds budget-gate prose to every stage command, does that touch the same
    "step ordering" invariant that a future `lint-auto-mode-gate-coverage` check
    would verify? Should this change pre-emptively note the interaction so that
    future check doesn't fight the new gate text?

34. The `reassess-openspec-dependency` backlog item is sequenced into the road-to-
    1.0 runway as Tier 1.25 ("decision spike, 2026-07-28 -- run R/D to a documented
    verdict"). Is that spike expected to produce a change folder and run the full
    QRSPI flow in the same session as this change? If so, the session-accumulation
    problem this change fixes is also a risk for the spike itself -- note it as a
    sequencing dependency.

35. What is explicitly OUT OF SCOPE for this change? Candidates for Non-Goals:
    (a) automating the reset itself (this change only recommends/gates -- no
    harness primitive),
    (b) tracking context % of subagents (only the orchestrator's own window),
    (c) any change to the subagent output-contract or per-stage input-load
    (the archived `context-budget` axis),
    (d) the `orchestrator-effort-targeting` per-turn effort management,
    (e) persisting the budget counter to disk (in-context only).
    Which of these Non-Goals are load-bearing (must be stated to prevent scope
    creep during design) vs. incidental?

## Open product questions (for the human)

- [x] **PQ1 — live-% feasibility verdict:** **Answer: (a) Check first — stage R probes live-% feasibility as its FIRST priority; stage D explicitly branches the design on R's finding (real-time numeric gauge if feasible, structural stage-counter if not). Do not pre-build both.** The design of the budget gate hinges
  entirely on whether a slash-command body can read live context utilization %.
  Stage R should probe this first. If it IS feasible, the gate is a real-time
  numeric check; if NOT, it degrades to a structural heuristic counter. Should
  stage R be explicitly directed to answer this question as its first priority,
  treating its finding as a design branch-point that the rest of R and D build on?
  Options:
  (a) Yes -- make it R's first research question, and have D explicitly branch
  the design on R's finding (Recommended) -- the feasibility gap is the single
  biggest unknown; resolving it first prevents designing two mechanisms when only
  one will ship,
  (b) Yes, but D should design BOTH paths (live-% and heuristic) in parallel and
  let implementation choose -- higher design cost, more robust to ambiguity,
  (c) Skip R's feasibility probe -- assume infeasible and design the heuristic
  counter only, treating live-% as a post-1.0 enhancement if ever proven feasible.

- [x] **PQ2 — gate severity in Full-auto:** **Answer: (a) Never-suppressed — the budget soft gate pauses the chain and asks via AskUserQuestion regardless of run-mode (including Full-auto). It JOINS the `workflow` skill's "Never-suppressed gates" list alongside the D review and backlog-capture offers.** When the budget soft gate fires (at
  the higher threshold) in Full-auto run-mode, how should it behave?
  Options:
  (a) Treat it as a never-suppressed gate -- pause the chain and ask
  AskUserQuestion regardless of mode (Recommended) -- context degradation at
  80%+ is a correctness concern that outranks auto-chain convenience; mirrors
  the D review's never-suppressed treatment,
  (b) Demote to a one-line warning in Full-auto -- preserve the auto-chain;
  the user who picked Full-auto implicitly accepted running to completion,
  (c) Hard-stop the chain unconditionally -- most conservative; any
  above-threshold stage invocation refuses to proceed without a fresh session.
  Note: this answer also determines whether the gate joins the `workflow`
  skill's "Never-suppressed gates" list (if (a)) or the mode-aware section
  (if (b) or (c)).

- [x] **PQ3 — structural nudge thresholds:** **Answer: (d) Defer threshold calibration to stage D — leave the exact nudge/gate counts open for R to surface more data points, then D sets them. (If PQ1 resolves to live-% feasible, this is moot.)** If the live-% read is infeasible,
  the gate falls back to a stages-run + followups-run counter. What should the
  counter thresholds be? The motivating evidence: 982k/1m (98% context) at the
  D review of a SECOND change (meaning roughly 8 stages of change 1 + 4 stages
  of change 2 + followup traffic = ~12--15 "stage events" before overflow). Options:
  (a) Nudge at 8 stage-events, soft gate at 12 (Recommended) -- derived from
  the observed overflow point; conservative enough to catch a second-change
  scenario before D,
  (b) Nudge at 6, soft gate at 10 -- more aggressive; better for users who
  run many followups per change (the 10+ followup scenario also cited),
  (c) No nudge, only soft gate at 10 -- fewer interruptions; the gate fires
  once when it matters rather than twice,
  (d) Defer threshold calibration to stage D -- leave this open for R to
  surface more data points. Note: if PQ1 resolves to live-% feasible, this
  question is moot.

- [x] **PQ4 — reset-after-archive mechanism:** **Answer: (b) Add a new step-7 AskUserQuestion after the archive completion summary — "Start a new session for the next change?" (Yes / Continue here). Because the tool has no primitive to start a session itself (Non-Goal 35a), the "Yes" branch prints the resume instruction (fresh session → `/qrspi:<next> <id>`) and ends the turn; it does not auto-reset. This is an interactive gate, so in Full-auto it is never-suppressed like the other AskUserQuestion offers.** How should the reset
  recommendation appear after `/qrspi:archive`? The archive command ends with
  step 6 (completion summary). Options:
  (a) Append a one-line recommendation to step 6's summary text -- lowest
  friction; no new AskUserQuestion; just tells the user (Recommended) --
  the recommendation is informational, not a gate; forcing a choice here adds
  friction at the wrong moment,
  (b) Add a new step 7 AskUserQuestion: "Start a new session for the next
  change?" with choices "Yes -- I'll start fresh" / "Continue in this session"
  -- makes the recommendation interactive but adds an extra prompt to every archive,
  (c) Embed the recommendation as an extra choice in the existing step 5
  AskUserQuestion (commit-target choice) -- consolidates two decisions but
  makes step 5 more complex.

- [x] **PQ5 — session-flag behaviour:** **Answer: (a) Session flag PER threshold level — the nudge fires once, then the soft gate fires once when the higher threshold is crossed; no further prompts after each has fired. Mirrors the version-check's silence discipline; avoids re-nagging every stage.** Should the budget gate use a session
  flag (like the version check -- fires once per session, silent thereafter),
  re-evaluate at every stage, or use a hybrid (session flag per threshold level --
  the nudge fires once, the soft gate fires once at the next threshold)? Options:
  (a) Session flag per threshold level -- nudge fires once, then soft gate
  fires once when the higher threshold is crossed; no further prompts
  (Recommended) -- matches the version check's silence discipline; avoids
  repeating the same prompt every stage once the threshold is passed,
  (b) Re-evaluate every stage -- most informative but highest friction;
  the user may be prompted many times in a Full-auto chain,
  (c) Session flag for both -- once either fires, all future budget checks
  in this session are suppressed; the user acknowledged and took action (or
  chose to continue).

- [x] **PQ6 — scope of command edits:** **Answer: (a) All eleven — the 8 stage commands (`/qrspi:questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`) plus `/qrspi:archive` and `/qrspi:followup`. Consistent coverage of every long-session entry point. (The shared wording should live in one mechanic so the 11 sites stay in sync — see PQ-driven note under the Skill surface section.)** How many command files need prose
  additions? Options:
  (a) All eight stage commands + `/qrspi:archive` + `/qrspi:followup` (11
  files) (Recommended) -- all are entry points to long orchestrator sessions;
  consistent coverage,
  (b) Stage commands only (8 files) -- archive and followup are less likely
  to be called mid-marathon; simpler scope,
  (c) Stage commands + archive only (9 files) -- archive is the highest-
  leverage post-change boundary; followup is lower priority.
  Note: this answer also determines the size of the implementation diff and
  whether a single vertical slice can cover all edits or they should be split
  by command group.
