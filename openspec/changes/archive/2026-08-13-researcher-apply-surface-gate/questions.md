# Questions — researcher-apply-surface-gate

> Stage Q of QRSPI. Generated 2026-08-13.
> Change summary: Add an explicit surface-gate instruction to the researcher
> agent so it suppresses absent-surface headings in research.md the same way
> the questioner, designer, and architect already do -- preventing a Check 14
> hard-stop that only fires mid-implementation, far from its cause.

<!-- Surface-gated sections: emit only when the surface is present per the
     repo-surface skill mapping. Present surfaces for this repo: slash-command,
     stage-agent, skill, lint-gate, template, migration-manifest.
     Absent: data-store, http-api, ui, auth -- those sections are omitted. -->

## Stage-agent surface

1. The researcher's `## What to do` step 1 already loads `repo-surface` and
   states it "defines which inventory sections to emit based on the surfaces
   present in the repo." Does the current wording constitute an effective gate
   instruction, or is it merely descriptive -- i.e., does the agent actually
   suppress absent headings today, or does it rely on the skeleton comment
   alone? (The backlog row says it emitted `## Data model` in a repo without
   `data-store`, confirming the instruction is insufficient.)

2. The questioner's gate instruction is a full paragraph in step 6 beginning
   "Apply the **surface-gate rule** from the `repo-surface` skill: emit a
   section only when its controlling surface is present ..." followed by an
   explicit enumeration of every surface and its gated headings. Should the
   researcher's gate instruction mirror this verbatim structure (a dedicated
   numbered-step paragraph), or is a shorter inline sentence added to step 1
   sufficient given the researcher's simpler output shape?

3. The researcher skeleton already has a comment block that enumerates the
   surface-to-heading mapping. Does that comment block need to change, or does
   the fix land entirely in the `## What to do` prose (the instructions) and
   leave the skeleton comment untouched?

4. The questioner's gate instruction uses the phrase "emit a section only when
   its controlling surface is present ... otherwise omit it entirely (no heading,
   no 'Not applicable' stanza)." The researcher's skeleton comment uses the same
   "Omit the heading entirely when the surface is absent" wording. Should both
   be kept in sync (same canonical phrase) or is a slight variation acceptable?

5. The researcher has two surface-independent always-emitted sections:
   `## Notable discrepancies`, `## Implicit contracts and conventions`, and
   `## Open gaps`. These are NOT in the surface-to-heading mapping. The surface-
   gated sections are the inventory blocks (`## Data model`, `## API surface`,
   etc.). Confirm: the gate instruction must only enumerate the surface-gated
   inventory sections, and the always-emitted sections require no gate logic?

6. `scripts/skill-sets.mjs` currently lists `repo-surface` in the researcher's
   set: `researcher: ['context-hygiene', 'repo-surface', 'workflow']`. Check 2b
   therefore already passes. Does this change need to touch `skill-sets.mjs` at
   all, or is the registry already correct?

7. Are there any researcher-specific headings beyond the standard ten surfaces
   mapped in `SURFACE_GATED_HEADINGS` in `scripts/lint.mjs` that the researcher
   emits and that could trigger a Check 14 false positive or miss? (The
   researcher emits `## File map`, `## Areas investigated`, `## Notable
   discrepancies`, `## Implicit contracts and conventions`, `## Open gaps` --
   none of these appear in `SURFACE_GATED_HEADINGS`. Confirm none need adding.)

8. The `## File map` section uses subsection headings (`### <area>`) to
   organize per-area findings. These are `###`-level, not `##`-level. Does
   Check 14's scanner catch `###`-level headings or only `##`-level? (Check 14
   uses an exact-prefix match against the heading strings in
   `SURFACE_GATED_HEADINGS`, which are all `##`-prefixed -- so `###` headings
   would not match. Confirm this is correct behavior and no `###`-level headings
   in the researcher's output need to be gated.)

## Skill surface

9. The researcher currently loads `repo-surface` in step 1. The `repo-surface`
   skill's `## Omit mechanic` section defines the gate rule explicitly. Is it
   sufficient to tell the researcher to "apply the surface-gate rule per
   `repo-surface`" without restating the full enumeration, or does the researcher
   need the full in-prose enumeration (as the questioner carries in step 6) for
   the gate to be reliable in practice?

10. The other three artifact-producing agents (questioner, designer, architect)
    carry their gate logic in the `## What to do` numbered steps, not in a
    separate `## Surface-gate` section. The researcher should follow the same
    convention (inline in step 1 or as a new step in `## What to do`). No new
    top-level section needed. Confirm?

## Lint-gate surface

> ⮕ Resolved by PQ2: no R-commit-time lint run is in scope. Questions 11-14
> (and Q27) below explore *how* to add one; they are now moot -- the change
> relies on the gate-instruction fix plus the existing CI/PR Check 14 backstop.

11. Check 14 (`checkSurfaceApplicability`) scans all `*.md` files under
    `openspec/changes/**` (excluding `/archive/`) and flags headings that belong
    to absent surfaces. It runs as part of `node scripts/lint.mjs`, which CI
    triggers on PR and on push to `main`. It does NOT run at R-commit time --
    the R-commit step does not invoke the lint script. Is adding an R-commit-time
    lint run in scope for this change?

12. If an R-commit-time lint run is added: where should it be triggered? Options:
    (a) in the researcher agent's `## What to do` step -- instruct the researcher
        to run `node scripts/lint.mjs` after writing `research.md` and fail/block
        if Check 14 reddens;
    (b) in the `/qrspi:research` command's commit step -- the orchestrator runs
        lint before `git commit`;
    (c) both -- the researcher self-checks AND the orchestrator re-checks before
        committing;
    (d) neither -- fix only the gate instruction; Check 14 at CI/PR time is
        sufficient given the fix will prevent the miss at the source.
    Identify the preferred option. Note that option (a) or (c) gives the
    earliest signal (inside the subagent), whereas (b) alone misses the case
    where the researcher commits its artifact directly.

13. The lint script runs all 21 checks. An R-commit-time run would pay the full
    lint cost (all checks) even though only Check 14 is relevant at that point.
    Is the full-lint cost acceptable, or should only Check 14 be extracted into
    a standalone call? (Node's built-in module system would require either
    exporting `checkSurfaceApplicability` or keeping a full lint run -- no
    partial check mode exists today.)

14. If the R-commit-time lint is added via the researcher agent's step, it would
    require the researcher to have `Bash` tool access to invoke
    `node scripts/lint.mjs`. The researcher's frontmatter already lists `Bash`
    in its `tools:` field. Confirm no tooling change is needed for option (a).

15. Check 14's self-test uses a synthetic fixture with `## Data model` as the
    known absent-surface heading (because `data-store` is absent from this
    repo's `## Repo surface` block). This self-test fires on every `node
    scripts/lint.mjs` run. If this change is implemented correctly, the self-
    test continues to fire (it uses a hardcoded fixture, not live artifacts).
    Confirm the self-test does not need modification.

## Template surface

16. The `openspec-templates/research.template.md` template carries the surface-
    gated comment block that mirrors the researcher agent's skeleton. Does this
    template need a matching prose update (e.g., an instruction comment about
    applying the gate), or is the comment block already sufficient guidance
    for a human reading the template directly?

17. The `openspec-templates/questions.template.md` template is not changed by
    this fix (the questioner already gates correctly). Confirm it is out of
    scope.

## Migration manifest

18. This change modifies `claude/agents/researcher.md` (an agent file) and
    possibly `claude/commands/research.md` (the orchestrator command, if the
    R-commit-time lint option is chosen). Neither of these is a user-facing
    schema file -- they are kit internals that consumers pull via plugin
    install. Does this change require a migration manifest entry (a
    `migrations/<version>.yaml` step) for existing consumer repos, or is the
    fix delivered purely through the updated plugin install with no consumer-
    side migration needed?

19. If no migration manifest is needed: the researcher agent is a plugin-shipped
    file that consumers receive on the next `claude update` (or equivalent
    plugin refresh). Existing `research.md` artifacts already committed in a
    consumer's `openspec/changes/` will not be retroactively re-gated -- Check
    14 will still flag them if they contain absent-surface headings. Is a
    migration-manifest `manual` step advising consumers to re-run stage R (or
    delete and re-generate `research.md`) warranted, or is this considered
    acceptable forward-only behavior (the fix applies from the next R run)?

## Testing

20. `node scripts/lint.mjs` Check 14 is the mechanical gate that would have
    caught the original miss. After this fix, how do we verify the researcher
    actually gates correctly at runtime? Options:
    (a) a `(human)` dogfood checkpoint in `tasks.md` -- run the researcher on a
        non-web repo and confirm absent-surface headings are suppressed;
    (b) add a static lint check that asserts the researcher's `## What to do`
        step 1 contains a gate instruction matching a required phrase (similar
        to Check 7's read-contract banner assertion);
    (c) rely on existing Check 14 + the new gate instruction prose -- if the
        researcher emits an absent heading on the next run, Check 14 fires at CI.
    Which verification approach is sufficient?

21. Check 2b (`checkSkillSets`) already asserts `repo-surface` is in the
    researcher's skill-set. If this change does NOT touch `skill-sets.mjs`,
    Check 2b continues to pass with no change. Is that the correct state, or
    should this change add a note documenting that the registry was already
    correct (i.e., no edit needed)?

22. After the fix, run `node scripts/lint.mjs` against this repo's own change
    artifacts (the `openspec/changes/researcher-apply-surface-gate/` folder)
    to confirm no Check 14 violations are introduced by the questions.md itself.
    Which of the present surfaces (slash-command, stage-agent, skill, lint-gate,
    template, migration-manifest) are used in this questions.md? Confirm that no
    data-store, http-api, ui, or auth headings appear.

23. Is there a risk that the gate instruction fix could cause the researcher to
    suppress headings it SHOULD emit -- i.e., over-gating? (Example: a repo
    with `stage-agent` present should still get `## Stage-agent surface` in its
    research.md. The gate instruction must only suppress headings for ABSENT
    surfaces, not present ones.) How do we verify the over-gating case does not
    occur?

## Sequencing & scope

24. The backlog row identifies this change as part of the Tier 1.6 "stranger-
    hardening" cluster alongside `git-host-and-remote-awareness` and
    `lint-auto-mode-gate-coverage`. The row explicitly notes "researcher-gate
    is cheap and lands first." Does this change have any ordering dependency on
    `git-host-and-remote-awareness`, or are they fully independent?

25. `lint-auto-mode-gate-coverage` (P2) is mentioned as "rides along as a cheap
    correctness guard" in the Tier 1.6 cluster. Is `lint-auto-mode-gate-coverage`
    in scope for this change, or is it a separate standalone backlog item? (The
    backlog description says "taking it up standalone" -- confirm
    `lint-auto-mode-gate-coverage` is out of scope here.)

26. This change touches `claude/agents/researcher.md`. The other three artifact-
    producing agents (questioner, designer, architect) already gate correctly.
    Should this change audit those three for any gate-instruction drift while in
    the researcher file, or is that out of scope (the three already pass Check
    14 in practice)?

27. If an R-commit-time lint run is added (PQ2 below), does it need to be
    documented in the researcher's `## Final message format` output contract
    (e.g., adding "Lint result: PASS/FAIL" to the return summary)?

## Open product questions (for the human)

- [x] **PQ1 -- gate-instruction form:** Should the gate instruction added to
  the researcher's `## What to do` step 1 be (a) a full surface-gate paragraph
  mirroring the questioner's step 6 (verbose, self-contained enumeration of all
  surfaces and their gated headings), or (b) a concise sentence pointing to the
  `repo-surface` skill's omit mechanic ("Apply the surface-gate rule per the
  `repo-surface` skill: emit each inventory section only when its surface is
  present, omitting absent-surface headings entirely")? Options:
  (a) Full enumeration paragraph (matches questioner step 6 verbatim style,
      maximally explicit, no ambiguity -- costs ~15 additional prose lines),
  (b) Concise pointer sentence (DRY, shorter, relies on the agent having loaded
      and read `repo-surface` -- which step 1 already ensures) (Recommended),
  (c) No new prose -- only add the concise phrase "Apply the surface-gate rule"
      to the existing step 1 sentence (minimal diff, highest risk of being
      insufficient).
  **Answer: (b) Concise pointer sentence -- add the single sentence "Apply the
  surface-gate rule per the `repo-surface` skill: emit each inventory section
  only when its surface is present, omitting absent-surface headings entirely"
  to the researcher's step 1, keeping `repo-surface` as the one source of truth.**

- [ ] **PQ2 -- R-commit-time lint:** Should this change add a lint run at
  R-commit time so a missed surface heading reddens at stage R rather than
  surfacing mid-implement as a Check 14 hard-stop? Options:
  (a) Yes -- instruct the researcher to run `node scripts/lint.mjs` after
      writing research.md and block on Check 14 failure (earliest signal, fully
      in the researcher agent's turn),
  (b) Yes -- add the lint run to the `/qrspi:research` command's commit step
      in the orchestrator (slightly later signal, but keeps the researcher
      artifact-only),
  (c) Yes -- both (a) and (b): researcher self-checks, orchestrator re-confirms,
  (d) No -- the gate-instruction fix is the correct lever; Check 14 at CI/PR
      time is a sufficient backstop and adding lint at R-commit time adds
      friction without meaningful benefit given the fix prevents the miss.
      (Recommended)
  **Answer: (d) No -- gate-instruction fix + CI/PR Check 14 backstop only. No
  R-commit-time lint run in scope. This keeps the change lean and forward-only;
  the fix removes the cause at the source, so an earlier-warning lint run is not
  warranted for this change.**

- [ ] **PQ3 -- migration manifest:** Does this change require a
  `migrations/<version>.yaml` entry? Options:
  (a) Yes -- include a `manual` step advising consumers to re-run stage R on
      any in-flight change whose `research.md` may contain absent-surface
      headings,
  (b) No -- the fix is forward-only; the researcher gate applies from the next
      R run, and existing committed `research.md` artifacts are the consumer's
      responsibility to re-generate if Check 14 fires on them. (Recommended)
  **Answer: (b) No migration manifest -- forward-only fix. The researcher gate
  applies from the next R run; no consumer-side migration step is needed.**
