# Questions — emit-changelog-task-and-pr-triage

> Stage Q of QRSPI. Generated 2026-09-19.
> Change summary: Bundle two planner + PR-stage fixes that together close the CHANGELOG-gap story — the planner never emits the mandatory `## [Unreleased]` task, and the PR stage has no sanctioned in-stage fix path for the trivial gap that results.

<!-- Surface-gated sections: emit each section below only when its
     controlling surface is present for this repo, per the repo-surface
     skill mapping. Omit the heading entirely when the surface is absent
     (no heading, no "Not applicable"). Surface-independent sections
     (Testing, Sequencing & scope, Open product questions) always appear.

     slash-command      -> ## Slash-command surface
     stage-agent        -> ## Stage-agent surface
     skill              -> ## Skill surface
     lint-gate          -> ## Lint-gate surface
     template           -> ## Template surface
     migration-manifest -> ## Migration manifest
-->

## Slash-command surface

1. `claude/commands/plan.md` delegates the bounded artifact write to
   the `planner` subagent — it does not itself contain task-generation
   logic. Should the new CHANGELOG housekeeping rule live in
   `claude/agents/planner.md` only, in `claude/commands/plan.md` only,
   or in both? (Candidates: planner-agent-only, since the task list is
   its output; plan.md-only as an orchestrator post-processing step; or a
   reference in both so neither can be read without seeing the rule.)

2. `claude/commands/pr.md` is the orchestrator for the PR stage; it
   contains both the "Seed the follow-up queue" prose and the
   "Record the PR link" backlog-note step directly. Is `pr.md` the sole
   file to change for the two PR-stage fixes, or does any prose need to
   be mirrored into a skill (e.g. `stage-choreography`, `postpr-fix`)?

3. For the draft-vs-ready backlog note: `claude/commands/pr.md` calls
   `gh pr create` and captures its output to get the PR number and URL.
   Does `gh pr create --draft` vs. `gh pr create` (no flag) produce a
   detectable difference in the CLI output that the orchestrator can
   branch on, or must the command inspect its own call arguments to
   determine draft-ness?

4. The PR-create command is resolved via `git-host-workflow`'s vendor
   lookup table. Does the draft-ness fix need to be written to survive
   multiple vendors (GitHub `gh pr create --draft`, Azure DevOps
   `az repos pr create --draft`, etc.), or is GitHub the only target for
   this change (matching the current backlog row scope)?

## Stage-agent surface

5. `claude/agents/planner.md` currently has no logic for cross-cutting
   housekeeping tasks — it purely translates `slices.md` slice bullets
   into `tasks.md` checkbox items. What is the right insertion point for
   the CHANGELOG rule: (a) a new "Housekeeping tasks" section appended
   after all slice groups, (b) a prologue scan that adds a housekeeping
   group before the first slice group, or (c) an epilogue that appends a
   standalone housekeeping item after the last `## N.` group?

6. The planner's Read contract is `slices.md` only — it must not open
   `design.md`. How does the planner determine whether the change "alters
   shipped kit behaviour"? Options: (a) read `slices.md` for any
   mention of `claude/`, `openspec-templates/`, or `scripts/lint.mjs`
   (file-path signal); (b) always emit the task (over-fire for
   docs/backlog-only changes, but safe); (c) pass a flag from the
   orchestrator (`plan.md`) when it knows the change is code-touching vs.
   docs-only. Which is preferred?

7. When the planner emits the CHANGELOG housekeeping task, should it be
   a regular `- [ ]` task or a `(human)` checkpoint task? (A regular
   task the implementer can tick after editing `CHANGELOG.md` vs. a
   `(human)` step requiring the orchestrator to confirm at PR-reconcile
   time that a CHANGELOG entry was actually written.)

8. The planner carries a divergence self-check (hard-stop condition 4).
   Does adding a housekeeping task that is not directly derived from
   `slices.md` require an explicit note in the planner's divergence rules
   exempting "standing housekeeping tasks" from the "must trace to
   slices.md" expectation?

9. What should the task text look like? Candidates: (a) `Add a
   \`## [Unreleased]\` entry to \`CHANGELOG.md\` describing this change.`
   (verbatim from the backlog **Shape**); (b) a more specific form that
   includes the change id (e.g. `Add ## [Unreleased] to CHANGELOG.md for
   <id>:`); (c) a form that references the CLAUDE.md rule
   (`CHANGELOG.md: add ## [Unreleased] entry per CLAUDE.md`). Which is
   clearest for the implementer?

## Skill surface

10. The `postpr-fix` skill (`claude/skills/postpr-fix/SKILL.md`) defines
    what a "trivial in-scope, fix-in-stage" item looks like during the
    follow-up loop. Does the new PR-stage triage rule (fix trivial
    in-scope gaps before seeding `followups.md`) need to reference or
    update `postpr-fix`, or is it entirely self-contained in `pr.md`'s
    "Seed the follow-up queue" step?

11. `claude/skills/stage-choreography/SKILL.md` (loaded by `workflow`)
    defines the canonical "commit step." The PR triage fix will add an
    atomic in-stage commit for any issue fixed before seeding
    `followups.md`. Does this commit need to be referenced in
    `stage-choreography`, or is it a `pr.md`-local detail?

## Lint-gate surface

12. `scripts/lint.mjs` currently has no check that asserts `tasks.md`
    carries a CHANGELOG task when the change touches shipped kit surfaces.
    Should this change add a static lint check (e.g. Check 25) that scans
    `tasks.md` for a CHANGELOG-related task line when the change folder
    has touched any `claude/` or `scripts/` path? Or is the planner rule
    alone (without a lint backstop) the right scope?

13. If a lint check is added, what is the detection signal? Options:
    (a) grep the `## [Unreleased]` keyword in the task text; (b) look for
    `CHANGELOG` in the task text; (c) rely on the planner emitting a
    deterministic task slug the lint can match. Which is most robust?

14. Is there an existing Check in `scripts/lint.mjs` (Checks 1–24) whose
    scope overlaps with or could be extended to cover the CHANGELOG
    presence assertion, or does this warrant a new numbered Check?

## Template surface

15. `openspec-templates/tasks.template.md` is the canonical template for
    `tasks.md`. Should the housekeeping task section (the CHANGELOG item)
    be reflected in the template as a documented pattern (a comment or a
    conditional stanza), or is the template kept clean and the rule lives
    only in the planner agent prose?

## Migration manifest

16. Does adding a standing rule to the planner agent constitute a
    "consumer-visible behaviour change" that requires a `migrations/`
    entry for consumers running `/qrspi:update`? Or is it purely a
    kit-internal change (the planner's output `tasks.md` is generated
    fresh each run, so existing change folders are unaffected)?

## Testing

17. The planner agent has no unit test — correctness is verified by
    `node scripts/lint.mjs` (static) and the `(human)` dogfood
    checkpoints. For this change, what is the dogfood verification
    plan? Specifically: run a QRSPI flow on a small kit-touching change
    in a fixture repo with the updated planner and confirm a CHANGELOG
    task appears in `tasks.md`. Is that the expected dogfood shape?

18. For the PR-stage triage fix (in-stage resolution of trivial issues):
    what is the observable test? The expected behaviour is that when the
    reviewer returns a "missing CHANGELOG entry" open issue, the PR-stage
    orchestrator fixes it in-stage (commits the edit) and opens a normal
    (non-draft) PR rather than seeding `followups.md` and opening a draft.
    Is that the right acceptance criterion, and how would a `(human)`
    checkpoint express it?

19. For the draft-ness fix on the backlog note: the expected observable
    is that `openspec/backlog.md` reads `in-progress (PR #N open)` (not
    `draft PR`) when the PR was opened as ready. How should the dogfood
    checkpoint verify this — by reading the backlog note after the PR
    stage, or by checking the GitHub PR state via `gh pr view`?

20. Are there edge cases that need explicit test coverage: (a) a change
    that is purely docs/backlog-only (no `claude/` or `scripts/` file
    touched) — the CHANGELOG task should NOT be emitted; (b) a change
    where the reviewer finds two open issues, one trivial and one
    genuinely post-PR — the trivial one is fixed in-stage, the other goes
    to `followups.md`?

## Sequencing & scope

21. `lint-auto-mode-gate-coverage` is the other Tier-2 item on the
    road-to-1.0 runway. Should this change run before, after, or in
    parallel with that change? (The two items touch different command and
    agent files with no apparent ordering dependency.)

22. The description bundles two sub-fixes: (1) planner CHANGELOG task,
    and (2) PR-stage triage + draft-ness note. Should these be two
    separate slices in one QRSPI flow, or could they be further split
    into two independent changes? (Shared theme but independent
    touch-points: `claude/agents/planner.md` vs. `claude/commands/pr.md`.)

23. Does fixing the planner alone (without the PR-stage triage fix) leave
    a usable intermediate state? (I.e. if only the planner emits the task,
    but PR-stage still routes it to `followups.md` and opens a draft, is
    that meaningfully better, or is the value only realised when both
    halves ship together?)

24. Are there any in-flight or recently archived changes that touch
    `claude/agents/planner.md` or `claude/commands/pr.md` and whose
    delta specs must be checked for conflict before this change lands?

## Open product questions (for the human)

- [x] **PQ1 — CHANGELOG task classification:** Should the CHANGELOG housekeeping task emitted by the planner be a regular `- [ ]` task (so the implementer can tick it by editing `CHANGELOG.md`) or a `(human)` checkpoint task (so the PR reconcile gate explicitly asks the human to confirm a CHANGELOG entry was written)? Options: (a) regular task — implementer ticks it after editing CHANGELOG.md; (b) `(human)` checkpoint — explicit human confirmation at PR-reconcile time; (c) both — regular task for the edit, plus a `(human)` note that it was done.
  **Answer: (a) regular task — a normal `- [ ]` item the implementer ticks after editing `CHANGELOG.md`. Satisfies the requirement during Implement (the whole point); a `(human)` gate would treat a mechanical one-line edit as a runtime observation it isn't.**

- [x] **PQ2 — skip condition for docs/backlog-only changes:** How should the planner decide NOT to emit the CHANGELOG task? Options: (a) scan `slices.md` for `claude/` or `scripts/` file-path mentions (file-signal heuristic, may miss some); (b) always emit the task and rely on the implementer to judge (never miss, may over-fire on pure docs changes); (c) a flag or annotation the orchestrator (`plan.md`) passes to the planner when the change is known to be docs/backlog-only.
  **Answer: (a) scan `slices.md` for kit-file mentions (`claude/`, `openspec-templates/`, `scripts/lint.mjs`). Self-contained in the planner (respects its `slices.md`-only read contract) and maps directly onto CLAUDE.md's "shipped kit behaviour" trigger. Emit when any such path appears; skip otherwise.**

- [x] **PQ3 — triage trigger for in-stage fix:** For the PR-stage open-issue triage, how should the orchestrator decide an issue is "trivial, in-scope, fix-it-now"? Options: (a) a heuristic rule in `pr.md` prose (e.g. "if the issue is a missing CHANGELOG entry or a single-line prose correction, fix in-stage"); (b) an AskUserQuestion per open issue with "Fix in-stage now / Defer to followups.md" as choices (always ask the human); (c) the reviewer subagent classifies each issue as `[fix-in-stage]` vs `[defer]` in its output, and the orchestrator branches on that tag.
  **Answer: (a) a heuristic prose rule in `pr.md` the orchestrator applies (trivial in-scope must-fix-before-merge gap — e.g. missing CHANGELOG entry, single-line prose correction — is fixed in-stage and committed atomically; only genuinely post-PR-shaped issues go to `followups.md`). Matches the backlog Shape and stays low-friction in Full auto. The orchestrator surfaces its triage decision so the human can override.**

- [x] **PQ4 — draft-ness detection:** For the draft-ness fix on the backlog note, how does the orchestrator know whether the PR was opened as draft or ready? Options: (a) inspect the `gh pr create` (or equivalent) call arguments used — if `--draft` was passed, note is `draft PR`; (b) run `gh pr view <N> --json isDraft` after creation and branch on the result; (c) the `git-host-workflow` PR-create resolution tells the caller whether the PR was created as draft, so no extra query is needed.
  **Answer: (a) the orchestrator uses the create decision it already made — it chose whether to pass `--draft`, so it already knows the draft-ness and sets the note (`draft PR #N open` vs `PR #N open`) with no extra CLI call. Cheapest and vendor-agnostic.**

- [x] **PQ5 — lint check scope:** Should this change add a static lint check asserting that `tasks.md` carries a CHANGELOG task when the change touches shipped kit files? Options: (a) yes — add a new Check to `scripts/lint.mjs` as a backstop; (b) no — the planner rule + dogfood `(human)` checkpoints are sufficient; (c) defer the lint check to a follow-up change (keep this change focused on agent/command prose only).
  **Answer: (a) yes — add a new Check to `scripts/lint.mjs` as a mechanical backstop, so the guard is "mechanism, not persona" and fits the road-to-1.0 mechanical-floor goal (the roadmap already scoped this bundle as "prose-or-lint"). Adds one slice. Detection signal + Check numbering to be settled at S; leave it a static assertion over an active change folder's `tasks.md`.**
