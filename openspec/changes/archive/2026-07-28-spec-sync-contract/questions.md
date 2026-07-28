# Questions — spec-sync-contract

> Stage Q of QRSPI. Generated 2026-07-28.
> Change summary: Harden the archive-time delta-spec→main-spec sync by (1) adding
> MODIFIED-wholesale guidance and a scenario-count-drop guard, and (2) standing up
> a dedicated least-privilege `qrspi:spec-syncer` agent that owns the delta-merge
> contract so `/qrspi:archive` delegates to it rather than the generated skill's
> catch-all `general-purpose` spawn.

<!--
  Surface-gated sections: this repo's ## Repo surface block lists slash-command,
  stage-agent, skill, lint-gate, template, migration-manifest -- none of these map
  to data-store / http-api / ui / auth in the repo-surface taxonomy. All five
  surface-gated standard sections are therefore omitted (no heading, no body).
  Sections below are shape-driven additions for a slash-command + stage-agent +
  skill + lint-gate change, plus the three always-emitted sections.
-->

## Slash-command surface (`/qrspi:archive`)

1. The archive command's step 4 currently reads: "Load and run the
   `openspec-archive-change` skill ... It checks artifact/task completion,
   assesses delta-spec sync state, moves the folder to `archive/YYYY-MM-DD-<id>/`".
   Concretely, which of those responsibilities must move into `/qrspi:archive`
   itself (command-owned) vs. which should continue to be delegated to the
   generated skill? At minimum the sync delegation must move; does artifact/task
   completion checking also move, or does it stay in the generated skill?

2. The generated `openspec-archive-change` skill's step 4 contains the
   "Sync now (recommended) / Archive without syncing" prompt. If `/qrspi:archive`
   takes over sync delegation, does the kit-owned command replicate this prompt
   logic, suppress it on the happy path (always sync unless the agent signals a
   conflict), or replace it with a narrower escape-hatch prompt (malformed delta /
   abandoned change only)? What distinguishes an escape-hatch case from a
   happy-path case?

3. After the kit command takes over the sync delegation, the generated skill's
   step 4 still contains `subagent_type: "general-purpose"` and its own sync
   prompt. When `/qrspi:archive` loads the `openspec-archive-change` skill and
   that skill re-evaluates the sync prompt, will the generated skill's spawn
   still fire -- creating a double-spawn race -- or does the command's earlier
   delegation prevent the skill's step 4 from reaching its own spawn? What is the
   exact call sequence after this change, and where does each agent boundary sit?

4. The generated skill is described as "must NOT be hand-edited -- it is
   regenerated from the OpenSpec CLI." Does the kit command's new sync delegation
   (step 4 replacement) constitute an edit to that skill, or does it live entirely
   in `claude/commands/archive.md`? If the CLI regenerates `openspec-archive-change`
   in a future OpenSpec version bump, would it overwrite the delegation change or
   leave it untouched?

5. The `archive.md` command already carries step 5 (backlog removal, branch,
   commit). After ownership of the sync delegation moves to `archive.md`, the
   command becomes considerably longer. Is there a maximum prose length guideline
   for a command file, and does this change push against it?

## Stage-agent surface (`qrspi:spec-syncer`)

6. What should the new agent be named -- `spec-syncer` (matches the kit's
   kebab-slug convention), `sync-specs` (verb-first), or something else?
   Which naming pattern do the existing seven stage agents follow?

7. The `workflow` skill's Read Matrix table has one row per stage agent. The
   `spec-syncer` is not a stage agent in the QRSPI eight-stage sense -- it is a
   helper invoked during archive. Does it get a row in the Read Matrix table?
   If so, what is the row's "Reads" field? If not, where is its read contract
   documented?

8. The proposed least-privilege tool set for the sync agent is Read + Edit plus
   `openspec validate`. Bash is needed to run `openspec validate`; is that the
   only Bash operation the agent needs, or are there other shell calls (e.g.
   reading file lists, status queries)? Should the `tools:` frontmatter list Bash
   as a full permission or should it be narrowed some other way?

9. The `openspec-sync-specs` generated skill currently carries "Intelligent
   Merging" guidance that explicitly says: "Preserve scenarios/content not
   mentioned in the delta" for MODIFIED requirements -- directly contradicting
   the wholesale-replacement contract this change is meant to enforce. The new
   `spec-syncer` system prompt must carry the corrected contract. Does the
   corrected contract fully replace the generated skill's guidance (the new agent
   ignores the generated skill's step 4c text entirely), or does the new agent
   load `openspec-sync-specs` and override only the MODIFIED semantics?

10. When the spec-syncer agent encounters a MODIFIED delta requirement whose
    scenario list is shorter than the pre-sync main spec, does it: (a) hard-stop
    and return an error/blocked signal naming the gap, (b) proceed after logging a
    structured warning in its output, or (c) ask the human via AskUserQuestion
    before continuing? Which of these is the guard behaviour this change ships?

11. The agent's system prompt must carry the delta-merge contract (ADDED /
    MODIFIED / REMOVED / renamed semantics). What is the canonical, authoritative
    source of these semantics today -- the `openspec-sync-specs` generated skill,
    the OpenSpec CLI docs, or somewhere else? Is there an existing prose statement
    this change can quote verbatim rather than re-authoring?

12. After the `spec-syncer` is added, Check 7 (Read-Contract Banner Agreement)
    must cover it. The check currently has a strict list of "seven QRSPI stage
    agents." Does extending Check 7 to cover `spec-syncer` mean widening its
    agent enumeration, or should a new check (e.g. Check 17) handle the banner
    assertion for non-stage helper agents?

## Skill surface (delta-merge contract)

13. The `openspec-sync-specs` generated skill step 4c under "MODIFIED
    Requirements" currently reads: "Preserve scenarios/content not mentioned in
    the delta." This is the proximate cause of the silent scenario loss. This
    change corrects that rule in the new agent's system prompt. Does the
    generated skill also need to be corrected, or is the entire intent that the
    generated skill's sync path is bypassed and never called by the kit after
    this change?

14. The MODIFIED-wholesale rule must also appear as architect (stage S) guidance
    so the author of a delta spec knows to re-state kept scenarios. Where does
    this guidance live -- in the `architect.md` agent file, in a skill the
    architect loads (e.g. `workflow`, `openspec-workflow`), or in the
    `openspec-templates/` delta-spec template? Which location is read at stage S
    and therefore guaranteed to be seen before a MODIFIED block is authored?

15. Is the architect guidance additive (add a new paragraph about MODIFIED
    semantics) or corrective (find existing MODIFIED guidance that is wrong and
    fix it)? Read `claude/agents/architect.md` and the delta-spec template to
    determine whether any current MODIFIED guidance exists.

16. The `openspec-workflow` skill describes the delta-spec format sections
    (ADDED / MODIFIED / REMOVED / RENAMED). Does it state the wholesale-
    replacement semantics explicitly? If not, is this skill the right home for a
    canonical statement, or would adding it there create a second source of truth
    with whatever the `spec-syncer` system prompt carries?

## Lint-gate surface (scenario-count-drop guard)

17. The count-drop guard compares the post-sync scenario count for a MODIFIED
    requirement against the pre-sync main spec's count. Where does the "pre-sync"
    snapshot come from -- does the agent read `openspec/specs/**` before merging
    and hold the count in context, does the generated skill already expose a
    pre-sync summary (from `openspec-archive-change` step 4's "delta spec
    analysis" output), or does the guard reconstruct the count after the fact by
    diffing git?

18. Should the count-drop guard be implemented as a runtime check inside the
    `spec-syncer` agent (agent stops or warns before applying the MODIFIED block),
    a static CI check in `scripts/lint.mjs` over the committed change artifacts
    (fires at CI time, not archive time), or both? What are the trade-offs:
    runtime catches it before the main spec is written; CI catches it after but
    is always-on and doesn't depend on agent judgment.

19. If the guard lives in `scripts/lint.mjs`, it needs to compare a delta spec's
    MODIFIED scenario count against the corresponding main spec's scenario count
    for the same requirement. The lint script today reads only committed files
    (it has no pre/post concept). How would the lint check access both the delta
    spec (in `openspec/changes/<id>/specs/**`) and the main spec (in
    `openspec/specs/**`) at the same time -- are both present in the working tree
    when the lint runs, and is that a reliable invariant?

20. If the guard is runtime-only (in the agent), what does "warn" look like in
    output -- a structured stderr line the calling command can parse, a visible
    section in the agent's completion summary, or a hard-stop error/blocked signal?
    Who is responsible for surfacing the warning to the human: the agent or the
    `/qrspi:archive` command that spawned it?

21. Is a scenario-count comparison the right heuristic? A count drop from 5 to 3
    is always suspicious, but a drop from 3 to 2 might be intentional (a scenario
    was consolidated). Should the guard fire on any count reduction, or only
    reductions that exceed a threshold (e.g. more than one scenario removed at
    once)? Should the guard also fire when the count drops to zero?

22. What happens when a MODIFIED delta requirement is intentionally replacing all
    existing scenarios (a full rewrite)? Should the guard offer an explicit
    override mechanism (e.g. a marker in the delta spec like `# REPLACES-ALL:
    true`), or should it always prompt and let the architect confirm?

## Template surface (delta-spec template)

23. Does `openspec-templates/` contain a delta-spec template (the template an
    architect fills out at stage S when authoring changes to existing requirements)?
    If so, does its MODIFIED Requirements section carry any existing comment about
    re-stating kept scenarios? If not, a comment must be added -- what is the
    exact wording and where in the template should it appear?

24. The template comment must be authoritative enough to prevent the scenario-loss
    pattern without preventing legitimate partial MODIFIED deltas (e.g. "add one
    new scenario" where all others are preserved). What is the minimal, unambiguous
    instruction an architect needs at authoring time to avoid the bug?

## Migration-manifest surface

25. Does adding a new `claude/agents/spec-syncer.md` file and new lint behaviour
    require a migration manifest entry in `migrations/`? Review the existing
    manifest schema (schema-valid keys, `edit-file-only` action,
    `openspec/`-scoped paths) to determine whether the new agent or lint change
    constitutes a consumer-repo migration step or whether manifests only cover
    changes to `openspec/` workspace files.

## Testing

26. The lint script has no test runner -- correctness is verified by the lint
    script itself, and Check 15 includes inline self-tests ("Includes inline
    self-tests that must fire"). If Check 7 is extended (or a new Check 17 added)
    to cover `spec-syncer`'s banner, does it need an inline self-test that fires
    on a synthetic fixture, following the same pattern as Check 15?

27. If the scenario-count-drop guard is added to `scripts/lint.mjs` as a new
    check, what synthetic fixture is needed to verify the check fires correctly?
    The fixture needs: a delta spec with a MODIFIED requirement carrying fewer
    scenarios than the main spec. Where in the lint file should the self-test live
    (inline, at the bottom alongside Check 15's self-test, or elsewhere)?

28. How should the end-to-end sync behaviour be verified after this change?
    Specifically: create a minimal consumer fixture with a multi-scenario main
    spec, write a MODIFIED delta that omits some scenarios, run the spec-syncer,
    and confirm the main spec retains the omitted scenarios. Is this verifiable
    via the `qrspi-dogfood` skill in a `--plugin-dir` session, or does it require
    a separate consumer repo fixture?

29. What is the observable difference in `/qrspi:archive` behaviour before and
    after this change that a dogfood `(human)` checkpoint should confirm?
    Specifically: does the "Sync now / Archive without syncing" prompt disappear
    on the happy path, and does the spec-syncer agent name appear in the archive
    flow output?

## Sequencing & scope

30. The backlog's "Next up" note (2026-07-28) points at `reset-and-resume-between-
    boundaries` then `orchestrator-context-budget-gate` as Tier 1 road-to-1.0 work.
    `spec-sync-contract` is `proposed` with no explicit sequencing note relative to
    those two. Does this change block or unblock any of the road-to-1.0 items, or
    is it purely orthogonal?

31. The `researcher-apply-surface-gate` idea is also in the backlog (P2). That
    change adds surface-gating to the researcher agent. Does `spec-sync-contract`
    add a new agent (`spec-syncer`) whose research.md, if ever written, would also
    be subject to surface-gating? Is there a dependency or ordering between the two?

32. The backlog row for `standardize-recurring-ops-scripts` (P2) describes
    extracting recurring ops into Node scripts -- "flip a backlog entry's status",
    "list open items", "create the PR from a template". The sync operation is
    another recurring op. Does `spec-sync-contract` conflict with or supersede
    `standardize-recurring-ops-scripts` for the sync operation, or are they
    independent (one is the agent-level contract, the other is the script-level
    extraction)?

33. After this change, `/qrspi:archive` owns the sync delegation. A future
    OpenSpec CLI regeneration of `openspec-archive-change` might re-add the
    `general-purpose` spawn. Is there a lint check or migration-manifest pattern
    that should assert the kit command -- not the generated skill -- is the
    authoritative sync delegator, so a future regeneration doesn't silently
    regress?

34. The scope of this change includes: (a) new `claude/agents/spec-syncer.md`,
    (b) updated `claude/commands/archive.md`, (c) architect guidance update
    (agent file or template), (d) optional lint check, and (e) Read-Matrix row /
    Check 7 extension. Which of these five pieces, if any, should be deferred to
    a follow-up rather than landed in this PR? Is (d) the scenario-count lint
    check the most likely candidate to defer?

## Open product questions (for the human)

- [x] **PQ1 — guard severity:** When the spec-syncer detects a scenario-count
  drop in a MODIFIED requirement, should it hard-stop and require explicit
  confirmation before proceeding, or emit a visible warning and continue? Options:
  (a) Hard-stop (agent returns error/blocked signal; archive pauses for human
  confirmation) (Recommended) -- prevents silent loss, matches the P2 severity of
  the original bug; human must confirm intent before the main spec is written,
  (b) Warn-and-continue (agent logs the discrepancy in its output, proceeds) --
  lower friction but still exposes the gap post-sync; consistent with how the
  generated skill handles incomplete artifacts (inform, don't hard-block),
  (c) Warn-only, with an explicit override marker in the delta spec (e.g.
  `<!-- REPLACES-ALL -->`) -- allows intentional rewrites to self-document.
  **Answer: (a) Hard-stop — the spec-syncer returns an error/blocked signal on a
  MODIFIED scenario-count drop and the archive pauses for explicit human
  confirmation before the main spec is written. Matches the P2 severity of the
  original silent-loss bug.**

- [x] **PQ2 — happy-path prompt removal:** After the kit command owns sync
  delegation, should the "Sync now / Archive without syncing" prompt be removed
  from the happy path entirely (sync always runs unless the agent signals a
  conflict), or retained as a confirmation gate? Options:
  (a) Remove from happy path; reserve a prompt only for escape-hatch cases
  (malformed delta, abandoned/superseded change) (Recommended) -- reduces
  friction, matches the backlog's stated second motivation for this bundle,
  (b) Keep the prompt on every archive run -- consistent with current behaviour,
  no behaviour change for the human,
  (c) Remove entirely (no escape hatch either) -- simplest, but loses the
  safety valve for edge cases.
  **Answer: (a) Remove from the happy path; sync runs by default. Reserve a
  prompt only for escape-hatch cases (malformed delta that would corrupt main
  specs, or an abandoned/superseded change).**

- [x] **PQ3 — architect guidance location:** Where should the MODIFIED-wholesale
  rule ("a MODIFIED delta MUST re-state every scenario it intends to keep") be
  placed so an architect authoring a delta spec at stage S will see it? Options:
  (a) In the delta-spec template comment (`openspec-templates/`) (Recommended) --
  seen at the moment of authoring; the template is the closest-to-source prompt,
  (b) In `claude/agents/architect.md` -- loaded at stage S; ensures every
  architect run carries the rule even without reading the template,
  (c) Both (a) and (b) -- belt-and-suspenders but risks drift between two
  sources,
  (d) In the `openspec-workflow` skill -- loaded by multiple agents, but not
  exclusively by the architect.
  **Answer: (a) In the delta-spec template comment (`openspec-templates/`) —
  seen at the moment of authoring, closest-to-source, single home (avoids the
  two-sources-of-truth drift that (c) risks).**

- [x] **PQ4 — lint check for count-drop:** Should a scenario-count-drop guard
  also be added to `scripts/lint.mjs` as a CI check (in addition to or instead
  of the runtime agent check)? Options:
  (a) Runtime agent check only -- fires at archive time before the main spec is
  written; CI cannot easily compare delta vs. main in a pre-archive state,
  (b) Both runtime and CI (Recommended) -- runtime prevents the write; CI catches
  any case where the agent was bypassed or a manual sync was performed,
  (c) CI only -- always-on, independent of agent judgment, but fires after the
  main spec is already written (post-sync lint run).
  **Answer: (b) Both runtime and CI. Note (raised by the human at Q): the two
  halves protect different populations, not the same one redundantly — the
  runtime spec-syncer guard is what protects *consumer* repos (agents/commands
  ship in the plugin); `scripts/lint.mjs` is kit-internal CI that does NOT ship,
  so its half only guards this kit's own delta specs (dogfooding). Stage D must
  treat "CI" here as kit-only and NOT assume consumers inherit the lint check.**

- [x] **PQ5 — Read-Matrix row for spec-syncer:** The `spec-syncer` is a helper
  agent, not one of the seven QRSPI stages. Should it get a row in the workflow
  skill's Read Matrix table, or should its read contract be documented only in
  the agent file's banner? Options:
  (a) Add a row to the Read Matrix table in `workflow` skill, under a new
  "Helper agents" section (Recommended) -- keeps all agent read contracts in one
  place; Check 7 can then cover it,
  (b) Document only in the agent file's `> **Read contract**` banner -- no
  workflow-skill edit; Check 7 extended to cover the banner file alone,
  (c) No formal read contract needed -- the tool list in frontmatter is the
  contract.
  **Answer: (a) Add a row to the Read Matrix table in the `workflow` skill under
  a new "Helper agents" section — keeps all agent read contracts in one place.**

- [x] **PQ6 — Check 7 extension vs. new check:** Check 7 currently covers the
  seven QRSPI stage agents. To assert the spec-syncer's read-contract banner,
  should Check 7 be widened to include it, or should a new Check 17 handle
  non-stage helper agents? Options:
  (a) Widen Check 7 -- one check covers all agent banners; simpler,
  (b) New Check 17 -- keeps stage-agent and helper-agent assertions separate;
  easier to extend as more helpers are added (Recommended),
  (c) No lint assertion for the helper banner -- lower overhead but the banner
  can silently drift.
  **Answer: (b) New Check 17 for non-stage helper agents — keeps stage-agent and
  helper-agent assertions separate and easier to extend as more helpers arrive.**
