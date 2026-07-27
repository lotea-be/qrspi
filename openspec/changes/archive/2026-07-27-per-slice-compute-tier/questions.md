# Questions — per-slice-compute-tier

> Stage Q of QRSPI. Generated 2026-07-27.
> Change summary: Bundle two deferred compute follow-ons into one change --
> agent-variant selection for true per-slice effort, and a haiku model tier
> with a when-to-use heuristic -- both extending the `**Compute:**` grammar,
> lint Check 13, and the slice-to-agent mapping shipped by `per-slice-compute-knobs`.

<!-- Surface-gate applied per repo-surface skill.
     Present surfaces: slash-command, stage-agent, skill, lint-gate, template, migration-manifest.
     Absent standard surfaces: data-store, http-api, ui, auth, typed-nullable.
     Sections emitted:
       ## Slash-command surface  (slash-command)
       ## Stage-agent surface    (stage-agent)
       ## Skill surface          (skill)
       ## Lint-gate surface      (lint-gate)
       ## Template surface       (template)
       ## Migration manifest     (migration-manifest)
       ## Testing                (always)
       ## Sequencing & scope     (always)
       ## Open product questions  (always)
-->

## Slash-command surface

1. The `**Compute:**` annotation is read and the subagent spawned in
   `claude/commands/implement.md` (the orchestrator). How many lines of that
   command must change to swap "resolve `model=` alias -> `subagent_type`"
   for "resolve `model=alias,effort=level` pair -> specific named agent"? Is
   there a single lookup site or multiple?

2. The current command parses `model=<alias>` and passes `model: <alias>` on
   the `Agent` tool call. If we switch to named variant agents instead, the
   Agent tool requires a `subagent_type` that matches the agent filename stem.
   Confirm: does the Agent tool accept `subagent_type: implementer-sonnet-medium`
   (a derived name) or does the agent file stem have to be spelled exactly in
   the command? Is the full list of accepted `subagent_type` values documented
   anywhere in the kit source?

3. Does `claude/commands/implement.md` currently handle the case where
   `effort=` is absent from the `**Compute:**` line (it is documented as
   optional in `vertical-slice`)? If effort becomes load-bearing for agent
   selection, the command will need to hard-stop on a missing `effort=` token
   rather than silently defaulting. Where is that guard written today?

## Stage-agent surface

> ⮕ See PQ4/PQ8: shared body → an `implementer-core` skill (PQ4); the variant
> agents are likely **effort-only** (3 files), since model is already
> per-call-overridable on the Agent tool (PQ8) — narrowing Q4/Q5's
> `model × effort` file-count framing to the 3 effort levels. R/D to confirm.

4. Today there is one `claude/agents/implementer.md` with `model: opus` and
   `effort: high`. If we introduce variant agents sharing a core skill body,
   what are the agent filenames? Candidates: `implementer-<model>-<effort>.md`
   (e.g. `implementer-sonnet-low.md`) vs named-profile files
   (`implementer-mechanical.md`, `implementer-standard.md`,
   `implementer-deep.md`). Which naming scheme does the kit's frontmatter
   `name:` convention support without ambiguity?

5. The `checkSkillSets` check in `scripts/lint.mjs` (Check 2b) asserts the
   `implementer` stem's skill load list against `SKILL_SET_EXPECTED['implementer']`.
   If we split into variant agents, does each variant agent get its own entry
   in `SKILL_SET_EXPECTED`, or does the sync check use a different mechanism?
   How many entries would `SKILL_SET_EXPECTED` grow by under the full
   cross-product matrix vs a named-profiles approach?

6. The read-contract banner check (Check 7) parses the `> **Read contract**`
   banner from each of the seven QRSPI stage agents listed in
   `READ_CONTRACT_EXPECTED`. Variant agents are NOT in that map. Confirm:
   variant agents would not carry a read-contract banner and would not be
   checked by Check 7 -- they are thin shells that delegate to the core skill.
   Is that the intended design, or should each variant carry the same banner
   as the base implementer?

7. The output-contract banner check (Check 12) covers the same seven-agent
   set. Same question: do variant agents carry `> **Output contract**` banners?
   If not, what prevents a variant agent from returning a non-conforming output?

8. The `checkFrontmatter` function (Check 2) validates every agent file in
   `claude/agents/` -- including `model:`, `effort:`, `name:`, `description:`.
   Variant agents must each carry valid frontmatter. Enumerate the fields a
   variant agent minimally needs: `name:`, `description:`, `model:`, `effort:`,
   `tools:`. Is `tools:` inherited from the core skill or must it be repeated
   in the variant agent's frontmatter?

9. The current `implementer.md` body begins "You are the QRSPI **Implement**
   stage..." and ends with a final-message format block. If the body moves to
   `implementer-core` (a skill), what remains in each variant agent's body --
   only a "Load skill `implementer-core`" line, or also the
   "Fix mode (post-PR)" section, the "final message format" block, and the
   divergence self-check? Which sections are too woven into the agent body to
   cleanly extract?

10. `claude/commands/implement.md` currently references the block-signal
    contract ("Implementer block-signal contract") that the orchestrator relies
    on. If the implementer body moves to a skill, does that contract reference
    need to move too, or can the variant agents reference the skill for it?

## Skill surface

11. If the shared implementation body moves to a `claude/skills/implementer-core/`
    skill, it joins the kit-shipped skills. The `checkSkillRefs` function
    (Check 2) validates "Load skill X" references against real
    `claude/skills/<X>/` directories. Confirm: any agent referencing
    "Load skill `implementer-core`" would be checked automatically. Does the
    skill need a `name:` and `description:` in its YAML frontmatter (required
    by Check 2 for all `claude/skills/` entries)?

12. An alternative to a static skill file is a generator script (e.g.
    `scripts/generate-variants.mjs`) that emits variant agent files from a
    template at build/CI time. This avoids the skill-machinery entirely but
    introduces a build step currently absent from the repo. The repo has no
    build step today (only `node scripts/lint.mjs`). Does adding a generator
    script change the "no npm runtime dependencies" policy, or is a second
    Node-built-ins-only script acceptable?

13. How does the `checkSkillRefs` check behave if a skill is referenced in a
    variant agent's body but that skill's directory does not yet exist? Confirm:
    Check 2 fails immediately with a `[frontmatter]` error for unresolved skill
    refs -- this is the static guard that prevents a variant agent shipping with
    a dangling reference.

## Lint-gate surface

14. Check 13 (`checkComputeAnnotations`) in `scripts/lint.mjs` currently validates
    `**Compute:**` lines against `COMPUTE_MODELS = ['sonnet', 'opus']` and
    `COMPUTE_EFFORTS = ['low', 'medium', 'high']`. Adding `haiku` to
    `COMPUTE_MODELS` is a one-line change. Confirm the exact line and variable
    that needs updating.

15. The `MODEL_ALIASES` set in `scripts/lint.mjs` (Check 2) already includes
    `haiku` (for frontmatter `model:` fields). Does Check 13 read from
    `MODEL_ALIASES` or from its own separate `COMPUTE_MODELS` array? If
    separate, are there other places in `lint.mjs` that would need updating
    when haiku is added to the annotation vocabulary?

16. The `checkSkillSets` sync check (Check 2b) asserts that each stage agent's
    skill load list matches `SKILL_SET_EXPECTED`. Adding a new skill
    (`implementer-core`) would only require updating agents that explicitly
    load it. Which agents in `SKILL_SET_EXPECTED` would need their entry
    updated, if any?

17. A new sync check for variant-agent drift is proposed ("à la the existing
    `checkSkillSets`"). What exactly would it verify? Candidates: (a) every
    variant agent file loads `implementer-core` and nothing else beyond the
    base set, (b) the set of variant agent stems exactly matches the
    `COMPUTE_MODELS × COMPUTE_EFFORTS` cross-product (or the declared named
    profiles), (c) each variant agent's `model:` and `effort:` frontmatter
    matches its filename. Enumerate the minimal set of invariants the sync check
    must assert to prevent drift.

18. Where in `scripts/lint.mjs` does `checkSkillSets` live relative to the
    other checks, and where would the new variant-drift check be registered
    in the `main()` function? Is there a numbering gap or would it become
    Check 15?

19. The `checkNoCrudSkeletonHeadings` check (Check 11) scans six agent files
    for surface-gated heading literals inside fenced blocks. If variant agents
    contain only minimal bodies (a skill load line and frontmatter), would
    Check 11 need to include the variant agent files in its `CRUD_CHECK_AGENTS`
    list?

## Template surface

20. `openspec-templates/tasks.template.md` contains the `**Compute:**` annotation
    grammar documentation and examples. If haiku is added to the vocabulary and
    the annotation is extended with a `subagent=` field (or if model+effort
    together map to a subagent), does the template's example line need updating?
    What does the current example line look like and where exactly is it?

21. Does `openspec-templates/` contain a template for slices? The `**Compute:**`
    annotation also lives in `slices.md`. If the vocabulary or mapping rules
    change, are both `slices.template.md` and `tasks.template.md` affected?

22. The `vertical-slice` skill (`claude/skills/vertical-slice/SKILL.md`) carries
    the "Choosing model=sonnet vs model=opus" heuristic section. The haiku
    heuristic would naturally live in the same section. Confirm: the skill file
    is not a template artifact covered by Check 3 (heading alignment) -- editing
    it does not trigger a lint failure, only editing agent skeleton headings would.

## Migration manifest

23. Adding haiku to `COMPUTE_MODELS` and introducing variant agent files changes
    the kit's artifact grammar and the file layout consumers interact with.
    This change will need a `migrations/<version>.yaml` when the next release is
    cut. What consumer-side action (if any) is required? Consumers who have
    existing `slices.md` / `tasks.md` with `model=sonnet` or `model=opus`
    annotations are unaffected (they remain valid). Only new annotations using
    `model=haiku` or a new `subagent=` field would require consumer updates.
    Is the migration purely additive (backward-compatible) or breaking?

## Testing

24. `node scripts/lint.mjs` is the sole automated gate. Which specific checks
    must pass with zero violations after this change? At minimum: Check 2
    (frontmatter on all new agent files), Check 2b (skill-set registry for
    any updated agents), Check 3 (heading alignment in agent skeletons),
    Check 13 (compute annotation vocabulary). Are there additional checks whose
    scope changes when new agent files are added?

25. Check 14 (`checkSurfaceApplicability`) scans all `.md` files under
    `openspec/changes/**` excluding `/archive/`. This `questions.md` file will
    be scanned. Confirm: it contains no surface-gated headings in the present
    surfaces taxonomy (the sections above use kit-surface headings, all of which
    are present for this repo), so Check 14 should pass cleanly.

26. Does the repo have any existing slices.md or tasks.md under
    `openspec/changes/` (non-archive) that would be affected by extending
    `COMPUTE_MODELS`? If an existing artifact has `model=haiku`, it currently
    fails Check 13. If no such file exists, the extension is additive-only
    from a lint perspective.

27. What is the test for the new variant-sync check? The self-test pattern from
    Check 14 (a synthetic in-memory fixture that must fire) is the established
    pattern for structural checks. Would the variant-sync check include an
    inline self-test, or is the real-file scan sufficient given the check is
    structural (it would catch a missing agent file immediately)?

28. The `checkSkillSets` check harvests skills from the step-1 "Load skills"
    line of each agent body. If variant agents load the core skill with a
    single-line body "Load skill `implementer-core`", does the harvesting regex
    in `checkSkillSets` capture that form (numbered step with "Load skill X"),
    or does it require the "1. Load skills `a`, `b`..." multi-skill form?

## Sequencing & scope

29. This change extends `per-slice-compute-knobs` (merged 2026-07-25). Are there
    any other in-flight changes that touch `scripts/lint.mjs`, the implementer
    agent, or `claude/commands/implement.md`? If so, which branch carries them
    and is there a merge ordering concern?

30. `decompose-tasks-md-per-slice` (P2 backlog) touches `tasks.md` structure
    and the implementer read path. Does that change depend on anything this
    bundle introduces, or vice versa? Should one be sequenced before the other?

31. The `compute-annotation-presence-lint` backlog idea (P3) is bundled with
    `decompose-tasks-md-per-slice` and needs a slice-boundary parser. If this
    change adds `model=haiku` and effort-variant annotations to the grammar,
    does the boundary-parser in that future change need to handle a wider
    vocabulary? Is there a coordination point?

32. If the named-profiles approach is chosen (rather than a full cross-product),
    the profile names must map cleanly onto existing `effort:` values
    (`low`/`medium`/`high`) and `model:` aliases. Is the profile vocabulary
    open for extension after this change ships, or locked by the migration
    manifest once it's released?

33. Does this change require a version bump at release time? The kit's
    "no version bump in feature work" rule applies here too -- but confirm
    whether the variant-agent filenames or the extended `COMPUTE_MODELS`
    vocabulary constitute a breaking change for consumers (consumers who have
    no `model=haiku` annotations are not affected; the real question is whether
    the variant-agent filenames are a consumer-visible surface).

## Open product questions (for the human)

- [x] **PQ1 — variant matrix shape:** Should the agent-variant mechanism use a
  **full cross-product** of `models × efforts`
  (e.g. `implementer-sonnet-low.md`, `implementer-sonnet-medium.md`,
  `implementer-sonnet-high.md`, `implementer-opus-low.md`, ...,
  plus any `haiku` variants) or a small set of **named profiles** that bundle
  model+effort into a human-legible intent
  (e.g. `implementer-mechanical.md` = haiku+low,
  `implementer-standard.md` = sonnet+medium,
  `implementer-deep.md` = opus+high)?
  Options: (a) full cross-product -- complete matrix, maximum flexibility,
  more files; (b) named profiles -- fewer files, names express intent,
  profile set is an opinionated constraint; (c) hybrid -- named profiles as
  the public annotation vocabulary, cross-product files generated from them.
  Note: if PQ1 selects named profiles, PQ2's `**Compute:**` syntax follows the
  profile names, not bare model/effort tokens.

  **Answer (direction; best solution → R/D): Named profiles preferred**
  (mechanical=haiku+low, standard=sonnet+medium, deep=opus+high). Human steers:
  (1) *keep all 9 `model × effort` combinations reachable* — likely free, since
  model is per-call-overridable and only effort needs static agents (see the
  Stage-agent pointer and PQ8); (2) *let the **researcher** also investigate the
  best solution* — R gathers the facts (Agent-tool model/effort behavior, the
  `implement.md` spawn/parse sites, `checkSkillSets`, the annotation grammar) and
  **D** picks the final matrix/mechanism. Not locked here.

- [x] **PQ2 — `**Compute:**` annotation syntax for effort:** Given that effort
  is now load-bearing (selects the agent), how should the annotation express it
  when both dimensions are explicit? Options: (a) keep the existing
  `model=<alias> effort=<low|medium|high>` grammar -- the orchestrator
  maps the pair to a variant agent name; (b) add a new `subagent=<stem>` token
  that names the variant agent directly, making the mapping trivial but the
  annotation more mechanical; (c) if named profiles are chosen in PQ1, use a
  single `profile=<name>` token instead of model+effort separately.
  Note: PQ2's answer also determines whether existing `slices.md` / `tasks.md`
  files with `model=sonnet effort=medium` style annotations are forward-compatible
  (option a) or need migration (options b/c).

  **Answer: folded into PQ8** — annotation syntax is a consequence of the matrix
  mechanism, decided by D after Research.

- [x] **PQ3 — haiku scope:** Is haiku a cell in the same effort-variant matrix
  (i.e. `model=haiku` becomes valid in the `**Compute:**` annotation alongside
  `model=sonnet` and `model=opus`), or a separate lightweight concern that only
  extends the vocabulary without adding haiku-specific variant agents? Options:
  (a) haiku is a full peer -- add it to `COMPUTE_MODELS`, generate haiku variant
  agents for each effort level, update the heuristic; (b) haiku is vocabulary-only
  in this change -- add it to `COMPUTE_MODELS` + Check 13, add the heuristic to
  `vertical-slice`, but do not generate haiku variant agents (those come later);
  (c) haiku is fully in scope -- vocabulary + agents + heuristic -- same as (a).
  Note: if PQ3 chooses (b), the haiku model tier is partially complete and the
  haiku variant agents become follow-up work.

  **Answer: Full peer** — haiku is a real, runnable tier in this change
  (COMPUTE_MODELS + Check 13 + heuristic + a runnable path), realizing the token
  lever now rather than half-delivering it.

- [x] **PQ4 — encapsulation mechanism:** Should the shared implementer body
  live in a **new `claude/skills/implementer-core/` skill** (loaded by each
  variant agent via "Load skill `implementer-core`"), or should each variant
  agent be **generated from a template by a new `scripts/generate-variants.mjs`
  script** (no skill, just emit agent files at generate-time)? Options:
  (a) shared skill -- fits the existing "load a skill" pattern, Check 2 validates
  refs, no new build step, the skill body can evolve independently; (b) generator
  script -- no new skill directory, generates complete standalone files, requires
  running the script to update variants (an implicit build step); (c) inline
  duplication -- each variant file copies the full implementer body and only
  `model:`/`effort:` differ (simple but drifts without a lint check).
  Note: PQ4's answer determines whether a new lint check is "does every variant
  agent load `implementer-core`?" (option a) or "does every variant file match
  the generator template?" (option b).

  **Answer: Shared `implementer-core` skill** — the implementer body moves to a
  skill each variant loads; Check 2 validates the refs and there is no new build
  step. Consistent with variant agents being thin, effort-only shells.

- [x] **PQ5 — sync-check design:** The proposed Check 15 (or equivalent) must
  prevent variant agents from drifting from the core. What should it assert?
  Options: (a) every file matching `claude/agents/implementer-*.md` loads the
  `implementer-core` skill and no unexpected additional skills (structural check);
  (b) the set of variant agent stems exactly equals the declared variant matrix
  from a registry constant in `scripts/lint.mjs` (coverage check); (c) each
  variant agent's `model:` and `effort:` frontmatter matches its filename stem
  (content-matches-name check); (d) all of the above.
  Note: option (d) is the most complete but also the most brittle if the variant
  matrix is the cross-product and grows with PQ3's haiku decision. If named
  profiles (PQ1-b), the registry is small and (d) is low-cost.

  **Answer: folded into PQ8** — the sync-check shape depends on the chosen
  mechanism (effort-only agents vs full matrix), decided by D after Research.

- [x] **PQ6 — haiku heuristic placement and wording:** The haiku heuristic
  ("when is a slice trivial-mechanical enough to warrant `model=haiku`?") must
  live somewhere the architect loads at stage V (Slices). The `vertical-slice`
  skill is the natural home (it already carries "Choosing model=sonnet vs
  model=opus"). Should the heuristic be: (a) a new sub-section appended to the
  existing "Choosing model=..." section in `claude/skills/vertical-slice/SKILL.md`;
  (b) a standalone new section "Choosing model=haiku" in the same skill; (c) a
  brief bullet added inline under the existing sonnet heuristic (since haiku is
  "even more mechanical than sonnet")?
  Regardless of form, what examples of "trivial-mechanical" slices specific to
  this kit (not a web-app example) belong in the heuristic? Candidates:
  adding a YAML frontmatter field to every agent file, updating a single constant
  in `scripts/lint.mjs`, bumping a version string across N files.

  **Answer (deferred to D): heuristic lives in `vertical-slice`** (its existing
  "Choosing model=" home). Exact placement/wording and the kit-specific
  trivial-mechanical examples are proposed by D and approved at the D review gate.

- [x] **PQ7 — backward compatibility of existing annotations:** Consumers and
  this repo's own committed `slices.md` / `tasks.md` files use
  `model=sonnet effort=medium` style today. If PQ2 introduces a new syntax
  (profile or subagent token), are old-style annotations: (a) still valid
  (the orchestrator accepts both old and new forms), (b) deprecated but not
  immediately broken (Check 13 still passes them, a warning only), or (c)
  invalid after this change (the orchestrator stops accepting bare model+effort
  pairs and Check 13 rejects them)?
  Note: option (c) is breaking and requires a migration manifest entry.
  This answer also constrains PQ2's choice -- if backward-compatibility is
  required, PQ2 must keep option (a).

  **Answer (deferred to D; leaning additive): backward-compatible.** Per the kit's
  migration-manifest / non-breaking-consumer ethos, existing `model=X effort=Y`
  annotations should stay valid (additive change), which also keeps PQ2/PQ8 on the
  compatible option. A breaking syntax would need explicit human sign-off at D and
  a migration-manifest entry.

- [ ] **PQ8 — matrix mechanism & keep-all-9 (→ R/D, per human):** Deferred to
  Research + Design at the human's request (see PQ1). Question: given named
  profiles is the preferred authoring vocabulary but all 9 `model × effort`
  combinations must stay reachable, what is the best mechanism? Working
  hypothesis for R to verify and D to decide: the Agent tool overrides **model**
  per spawn (already used by `per-slice-compute-knobs`) but exposes no
  per-invocation **effort** parameter, so the static variant agents need only
  cover the **3 effort levels** (low/medium/high) with model passed per-slice —
  reaching all 9 combos with 3 agents, named profiles acting as annotation sugar.
  R confirms the tool behaviour + the `implement.md` parse/spawn sites + the
  `checkSkillSets` mechanism; **D** then chooses the matrix shape, the annotation
  vocabulary (this supersedes **PQ2**), and the sync-check design (**PQ5**). PQ2
  and PQ5 are therefore rolled into this R/D item, not decided at Q.
