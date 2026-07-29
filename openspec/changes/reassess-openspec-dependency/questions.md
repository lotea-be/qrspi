# Questions — reassess-openspec-dependency

> Stage Q of QRSPI. Generated 2026-07-29.
> Change summary: Decision spike — document a keep-CLI-vs-vendor verdict for the
> `@fission-ai/openspec` dependency before 1.0, co-deciding the fate of the
> `assert-openspec-version-pin-coupling` guard.

<!-- Surface-gated sections: this repo's ## Repo surface block declares:
     slash-command, stage-agent, skill, lint-gate, template, migration-manifest.
     No data-store, http-api, ui, or auth surface.

     Sections emitted:
     - ## Slash-command surface        (slash-command present)
     - ## Stage-agent surface          (stage-agent present)
     - ## Skill surface                (skill present)
     - ## Lint-gate surface            (lint-gate present)
     - ## Template surface             (template present)
     - ## Migration manifest           (migration-manifest present)
     - ## Testing                      (always)
     - ## Sequencing & scope           (always)
     - ## Open product questions       (always)

     Custom sections added for this spike:
     - ## OpenSpec CLI dependency map  (cross-cutting -- inventory what the CLI does for us)
     - ## Vendored-convention shape    (what a vendored replacement must cover)
     - ## Pin-coupling guard           (the assert-openspec-version-pin-coupling bundle leg)
-->

## OpenSpec CLI dependency map

<!-- What the CLI currently does for the kit; what would have to be replicated or
     dropped under a vendor verdict. Each invocation site is a potential coupling
     point. -->

1. Where exactly are all `npx @fission-ai/openspec@1.4.1` invocations today?
   List every file (command, agent, skill, CI workflow) that issues the CLI,
   and for each: which subcommand (`init`, `validate`, `status`, `list`,
   `update`) and in what context (interactive session, CI job, agent Bash call)?

2. `openspec init --tools none` scaffolds the `openspec/` directory skeleton.
   Concretely, which files and sub-directories does it create? Which of those
   does QRSPI actually rely on at runtime vs. which are unused or swept away by
   `/qrspi:init`'s own post-init steps?

3. `openspec validate <id> --strict` is the primary quality gate called by
   the architect at stage S and by CI (`validate --all`). What does this command
   actually enforce? Enumerate each distinct check it performs (section header
   format, MUST/SHALL first-line rule, MODIFIED title verbatim-match, scenario
   presence, etc.), and confirm which are `--strict`-only vs. always-on.

4. `openspec validate --all` (CI job) is described as the strict mode that
   catches what non-strict local runs miss. Is there any check `--all` performs
   that `--strict` on a single change does not? Is there any difference in
   scope (which files it scans) beyond the per-change vs. across-all-changes
   distinction?

5. `openspec status --change "<id>" --json` is used by the generated
   `openspec-archive-change` skill to check artifact-completion status. What
   is the JSON schema of its output? Which fields does `openspec-archive-change`
   actually read (e.g., `artifacts`, `artifactPaths`, `actionContext`)? Are any
   of those fields consumed by kit-owned code (as opposed to the generated skill)?

6. `openspec list --json` is called by both generated skills to enumerate
   available changes. What does it return that the kit cannot derive itself from
   a simple directory listing of `openspec/changes/` (minus `archive/`)?

7. `openspec update` is used in the `init` command's refresh path to pull in
   any upstream template changes. What does this command actually do? Which
   files does it touch in a consumer repo, and how many of those are the
   generated skills the kit already prohibits editing (`openspec-archive-change`,
   `openspec-sync-specs`)?

8. The `openspec-archive-change` and `openspec-sync-specs` skills carry
   `generatedBy: "1.4.1"` in their frontmatter and must not be hand-edited.
   If the CLI were dropped, what exactly would replace their logic? Is their
   step-by-step procedure something the kit's archive command already re-implements
   in `claude/commands/archive.md`, or does the generated skill carry logic not
   yet present in the kit-owned command?

9. The `openspec-workflow` skill documents the folder layout and CLI quick-reference.
   Under a vendor verdict, this skill becomes stale (it references `npx @fission-ai/openspec@latest`). Is this skill the only prose documentation of the folder layout, or does the layout also appear in agent skeletons, the README, or other skills?

10. The `openspec/config.yaml` sentinel is written by `/qrspi:init` (not by the
    CLI in `--tools none` mode). The `openspec_version` field is described as
    "informational only." Under a keep verdict, is this field the only consumer-side
    record of which CLI version was used to scaffold the repo? Is there any
    CLI-read config key in `config.yaml` that the validator actually depends on
    (i.e., `schema:`, `context:`, `rules:`) that a vendored replacement would
    also need to honour?

11. The `openspec-workflow` skill's `source:` frontmatter points at
    `https://github.com/Fission-AI/OpenSpec`. Under a vendor verdict, this skill
    would need to be replaced by a kit-authored equivalent. How many consumer
    repos have already installed and cached this skill via the plugin? (I.e.,
    is there a migration burden for existing consumers?)

## Vendored-convention shape

<!-- What a "drop the CLI" outcome must cover: the minimal replacement surface. -->

12. If the kit vendors its own convention (no CLI), the MUST/SHALL first-line rule
    and the `## ADDED/MODIFIED/REMOVED Requirements` section-header checks are
    currently enforced by `openspec validate --strict`. Could these checks be
    fully replicated in `scripts/lint.mjs` (Node.js, no npm dependencies)?
    Are there any checks the CLI performs that would be hard to replicate with
    plain regex/string parsing over the spec markdown?

13. The `openspec validate --all` CI job today is a separate CI job from the
    `node scripts/lint.mjs` lint job. Under a vendor verdict, the spec validation
    would move into `scripts/lint.mjs`. How many new check numbers would that
    require (rough count of distinct checks `openspec validate` enforces), and
    would the lint script's "no npm dependencies" constraint be preserved?

14. The `openspec-archive-change` skill calls `openspec status --change "<id>" --json`
    and `openspec list --json` before any git operations. Under a vendor verdict,
    the archive command must derive the same information without the CLI. Is the
    artifact-completion check (are all expected QRSPI stage artifacts present?)
    already partially replicated in `claude/commands/archive.md`'s own Glob-based
    logic? What is the gap, if any?

15. The generated `openspec-sync-specs` skill's sync procedure is described as
    "agent-driven" (the spec-syncer reads delta specs and edits base specs directly).
    The kit has already absorbed this logic into `claude/agents/spec-syncer.md`
    and `claude/commands/archive.md`. Does `claude/skills/openspec-sync-specs/SKILL.md`
    still carry any step the kit-owned path does not replicate? If it is now
    functionally superseded by the kit's spec-syncer agent, is the generated
    skill already dead weight under either verdict?

16. A vendored convention needs a canonical workspace-root folder name. The
    backlog context establishes that `openspec/` is the OpenSpec CLI's hardcoded
    name. Under a vendor verdict, the kit would own the folder name outright.
    What is the full list of locations in kit source files (commands, agents,
    skills, templates, lint script, CI) that hardcode `openspec/` as a path
    prefix? Would a rename to `qrnchi/` (for the rebrand) require touching each
    of those sites individually, or is the path centralized anywhere?

17. Under a vendor verdict, the `migrations/` manifests guide consumers through
    per-version upgrades. A "drop the CLI" migration would need a manifest entry.
    What is the typical content of a structural manifest step (e.g., what did
    `0.10.0.yaml` do when the kit dropped the base `implementer.md`), and would
    a folder-rename step (e.g., `openspec/` to `qrnchi/`) fit the current
    manifest schema (`automated[].action: edit-file`, path must start with
    `openspec/`)? I.e., does the migration-manifest schema need to be extended
    to support move/rename steps?

## Pin-coupling guard

<!-- The assert-openspec-version-pin-coupling bundle leg.
     Under a keep verdict, this guard is live; under a vendor verdict, it retires. -->

18. Today `openspec/config.yaml`'s `openspec_version` field is "informational only"
    and lint Check 1 does not assert it against the kit's pinned CLI version.
    The only guard is that Check 1 asserts all hand-maintained pin occurrences
    agree with each other. Under a keep verdict, what exactly is the consumer-side
    failure mode if `openspec_version` silently drifts from the kit's pin?
    Concretely: does the validator produce different results on a consumer repo
    scaffolded at 1.3.x vs. re-run at 1.4.1?

19. Under a keep verdict, where would the pin-coupling guard live? Options include:
    (a) a new lint.mjs check that reads `openspec/config.yaml` and asserts
    `openspec_version` equals the kit-pinned version, (b) a session-time check
    (mirroring `qrspi-version-check`), or (c) a CI-only check. What is the
    difference in blast radius and friction between these placements?

20. Check 1 (pin agreement) today excludes `generatedBy:` lines in the generated
    skills. Under a keep verdict, would the pin-coupling guard use the same pin
    constant that Check 1 already extracts, or would it need a separate,
    authoritative source for the "expected" version? Where would that authoritative
    source live (a constant in `lint.mjs`, the README, or somewhere else)?

21. Under a keep verdict, when a consumer upgrades the kit (e.g., from 0.12.0 to
    a future 0.13.0 that bumps the OpenSpec pin from 1.4.1 to 1.5.0), what is the
    consumer's required action to keep the pin-coupling guard green? Does the
    `/qrspi:update` command currently touch `openspec/config.yaml`? If not, would
    the migration manifest for the version bump need to add a step?

## Slash-command surface

22. The `/qrspi:init` command contains the only interactive `npx @fission-ai/openspec@1.4.1`
    calls (both `init --tools none` and `update`). Under a vendor verdict, what
    does the `init` command's Step 2 body look like without the CLI? Specifically:
    does the `openspec/changes/` and `openspec/specs/` scaffolding need a new
    mechanism (e.g., a `node scripts/scaffold.mjs` helper), or would the command
    body create those directories via agent Bash calls?

23. The `openspec-workflow` skill is loaded by the `init` command (or referenced
    in related commands). Under a vendor verdict, would the `openspec-workflow`
    skill be deleted, replaced by a kit-authored equivalent, or repurposed?
    Does any other `/qrspi:*` command load or depend on `openspec-workflow`'s
    specific prose?

24. Under a keep verdict, the README's "OpenSpec CLI version is pinned" section
    (listing the four pin sites) would need to also reference `openspec/config.yaml`
    as a fifth site subject to the new coupling guard. Are there any other
    CLAUDE.md or README sections that describe the pin and would need updating?

## Stage-agent surface

25. The architect agent (`claude/agents/architect.md`) calls
    `openspec validate <id> --strict` after writing specs (step 4). Under a vendor
    verdict, this call would be replaced by a kit-owned validator invocation.
    Would the replacement be a `node scripts/lint.mjs --change <id>` flag, a
    separate `node scripts/validate.mjs`, or an inline agent Bash check? What
    is the impact on the architect's Read contract (it currently uses Bash for
    validate; under a vendor verdict, the tool remains the same)?

26. The spec-syncer agent (`claude/agents/spec-syncer.md`) calls
    `openspec validate <id> --strict` as its first validation step before editing
    base specs. Under a vendor verdict, would this call be replaced by the same
    mechanism as the architect, or does the spec-syncer's context (it runs after
    archiving, on the delta spec in place) require a different invocation signature?

27. The `openspec-archive-change` skill is listed in the `openspec-archive-change`
    skill directory and carries `generatedBy: "1.4.1"`. Under a vendor verdict,
    this skill would be retired and the archive command would own the full archive
    flow. Is the `claude/skills/openspec-archive-change/` directory the only place
    its logic lives, or does `claude/commands/archive.md` already fully supersede it?

## Skill surface

28. The three generated or CLI-tied skills are `openspec-archive-change`,
    `openspec-sync-specs`, and `openspec-workflow`. Under a vendor verdict, which
    of these would be deleted, replaced, or absorbed into the archive command or
    a new kit-authored skill? Would any replacements require new `claude/skills/`
    entries and corresponding `plugin.json` skill registrations?

29. The `openspec-workflow` skill carries `source: https://github.com/Fission-AI/OpenSpec`
    in its frontmatter. Under a vendor verdict, this attribution would be wrong.
    Under a keep verdict, is the skill still accurate? Does any lint check
    currently validate the `source:` frontmatter field?

30. Under a keep verdict, the kit's `openspec-workflow` skill references the CLI's
    `npx @fission-ai/openspec@latest init` quick-reference. This conflicts with
    the kit's own pinned-version discipline (the kit uses `@1.4.1`, not `@latest`).
    Is this an existing inconsistency that should be fixed regardless of verdict?

## Lint-gate surface

31. Check 1 (pin agreement) scans for two patterns:
    `@fission-ai/openspec@<version>` and `openspec_version: <version>`. Under a
    vendor verdict, all occurrences of both patterns would be removed (or replaced
    with a kit-version reference). What does Check 1 do when it finds zero matching
    occurrences -- does it pass silently, or does it require at least one pin to
    assert? (I.e., would a vendor outcome make Check 1 vacuously pass or break it?)

32. Under a vendor verdict, the separate `openspec validate` CI job would be
    retired and its checks folded into `node scripts/lint.mjs`. How many total
    CI jobs does the kit currently run (the `ci.yml` has `lint` and `validate`),
    and would the vendor path collapse to one job? What is the impact on CI run
    time (rough estimate: does `openspec validate --all` currently take meaningfully
    longer than `node scripts/lint.mjs`)?

33. Under a keep verdict with the pin-coupling guard, Check 1's scope would expand.
    The current implementation collects all version strings and asserts they agree.
    Adding a coupling check (assert `openspec_version` in `openspec/config.yaml`
    equals the kit-determined pin) is a new assertion. Does Check 1's current
    structure (collect-then-compare) naturally accommodate this, or would it need
    a separate check number (e.g., Check 22)?

## Template surface

34. The `openspec-templates/spec-delta.template.md` describes the format that
    `openspec validate <id> --strict` enforces. Under a vendor verdict, this
    template becomes the new authoritative source for the format rules (rather
    than referencing `openspec validate`). Would the template's wording need to
    change (remove "enforced by `openspec validate <id> --strict`" references),
    or would the same format rules persist under the kit-owned validator?

35. The `openspec-workflow` skill references the `openspec-templates/` directory.
    Under a vendor verdict, would the templates themselves change shape, or only
    their prose descriptions? Specifically: are any sections of the templates
    (`## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`)
    OpenSpec-proprietary vocabulary, or is this a QRSPI-owned convention that
    the kit can continue to use freely under a vendor path?

## Migration manifest

36. The current migration manifest schema requires `automated[].path` to start
    with `openspec/`. Under a vendor verdict that renames `openspec/` to `qrnchi/`
    (or any other name), this constraint would need relaxing. Is the path-prefix
    constraint load-bearing (checked by lint Check 6), and what is the minimal
    schema change needed to support a rename step?

37. A "drop the CLI" migration would be a breaking change requiring a migration
    manifest entry. What version number would this change land in (i.e., is this
    a 0.13.x minor or a 1.0.0 major), and what manual steps would consumers need
    beyond what `automated[]` entries can handle (e.g., deleting `openspec/` and
    recreating as `qrnchi/` may not be expressible as `edit-file` steps)?

## Testing

> ⮕ Resolved by PQ2/PQ5: this spike is R/D-shaped ONLY on a vendor verdict. On a
> **keep** verdict (the prior lean) it continues through I/PR to ship the
> pin-coupling guard, so the guard carries its own lint self-tests built at stage I.
> The verdict document itself needs no prototype (PQ5a). Read question 40 in that
> light.

38. Today spec validation is tested by the `openspec validate` CI job (a live
    CLI call against real spec files). Under a vendor verdict, the replacement
    lint checks would need their own inline self-tests (like the self-tests
    Check 14 and Check 15 already carry). How many of the format rules
    currently enforced by `openspec validate --strict` would need synthetic
    fixture tests in `scripts/lint.mjs`?

39. The `generatedBy:` exclusion in Check 1 is tested implicitly (the generated
    skills carry it and CI still passes). Under a vendor verdict, the generated
    skills would be deleted, removing this implicit test coverage. Would a Check 1
    self-test need to be added, or is the exclusion logic already verified by
    a synthetic fixture?

40. This spike is R/D-shaped and likely ends at a documented verdict rather than
    a code change. What constitutes "done" for the Testing section of this spike?
    Options: (a) no new tests -- the verdict is a document; (b) a lint self-test
    confirming Check 1 behaviour when zero pins exist (vendor path); (c) a
    prototype validator check in a branch to validate feasibility before the verdict
    is written. Which is the minimum bar?

## Sequencing & scope

41. The spike is sequenced as Tier 1.25 on the road to 1.0, ahead of
    `rename-qrspi-to-qrnchi`. Under a keep verdict, the rebrand proceeds with
    `openspec/` staying as the workspace root. Under a vendor verdict, the
    rebrand must wait for the CLI-drop change to land first. If this spike runs
    R and D but the verdict is "vendor," is there a risk that the vendor
    implementation change itself is too large to complete before the desired 1.0
    cut, and if so, what is the contingency (keep the CLI for 1.0 and vendor
    post-1.0)?

42. `assert-openspec-version-pin-coupling` is bundled into this spike. Under a
    keep verdict, does the implementation of the pin-coupling guard land in the
    same PR as the spike's verdict document, or is it a separate follow-on
    change with its own QRSPI flow? The backlog entry for
    `assert-openspec-version-pin-coupling` is already annotated as bundled --
    confirm whether the full I/PR stages for the guard run in this same flow.

43. `rename-qrspi-to-qrnchi` is explicitly sequenced after this spike. Are there
    any other backlog items whose design assumptions would change depending on
    the keep-vs-vendor verdict (e.g., `structured-surface-schema` cross-references
    `reassess-openspec-dependency`; `optional-technology-specs` relates to it)?
    Should those items be annotated with the dependency before the spike runs R/D?

44. `standardize-backlog-format` is Tier 1.5 on the road to 1.0. Does it depend
    on the outcome of this spike (e.g., if backlog format changes reference
    `openspec/` paths that a vendor verdict would rename), or can it proceed in
    parallel?

45. The R stage of this spike is explicitly ticket-blind -- the researcher will not
    see this questions.md. The spike's research questions (items 1-21 above) are
    heavily codebase-read tasks. Is the R stage the right place for all of them,
    or are there questions (e.g., the CLI's JSON output schema, what `openspec update`
    touches) that require a live CLI run or upstream docs read rather than a static
    code trace?

## Open product questions (for the human)

- [x] **PQ1 -- verdict appetite:** What is your prior lean on the keep-vs-vendor
  question before the spike runs R/D? This is not a commitment -- it sets the
  framing for the research stage (e.g., a strong prior toward vendor would prompt
  R to focus on feasibility of the replacement; a strong prior toward keep would
  prompt R to focus on the pin-coupling guard design). Options:
  (a) Lean keep -- the CLI provides real value and the coupling guard is the right
  answer (Recommended for minimizing risk before 1.0),
  (b) Lean vendor -- owning the convention outright is worth the upfront cost,
  especially given the workspace-root rename want,
  (c) Genuinely open -- let R/D surface the facts and decide at D.
  **Answer: (a) Lean keep.** Prior favours keeping the OpenSpec CLI; R should
  focus on the pin-coupling guard design (keep path), while still mapping the
  vendor path enough to make the verdict defensible.

- [x] **PQ2 -- scope of this spike:** Should this spike's output be (a) a verdict
  document only (questions.md + research.md + design.md, ending at D, no code),
  or (b) verdict plus implementation in the same QRSPI run (if the verdict is
  "keep + add coupling guard," continue through I/PR to ship the guard)? The
  backlog entry notes the bundle relationship: a keep verdict makes the guard
  live. If the guard is in-scope for this run, the spike is no longer R/D-shaped.
  Options:
  (a) Verdict-only (R/D ends the spike; guard is a follow-on change) --
  fastest to unblock the rename sequencing,
  (b) Verdict + guard in the same run if keep (extends the spike to full QRSPI
  flow; guard ships immediately) (Recommended -- the bundle rationale is exactly
  "co-decided, co-shipped to avoid speculative work"),
  (c) Verdict + full vendor implementation in the same run if vendor -- largest
  scope, highest 1.0-sequencing risk.
  **Answer: (b) Verdict + guard in the same run if keep.** On a keep verdict this
  flow continues through S->V->P->I->PR to ship the `assert-openspec-version-pin-coupling`
  guard. Corollary (not option (c)): if R/D surprisingly lands on **vendor**, the
  vendor *implementation* is OUT of scope here -- the spike ends at the verdict and
  the vendor build becomes its own change.

- [ ] **PQ3 -- workspace-root rename horizon:** Regardless of verdict, is renaming
  `openspec/` to `qrnchi/` (or another branded name) a 1.0 requirement, or is it
  acceptable to keep `openspec/` at 1.0 and revisit post-1.0? This determines
  whether a vendor verdict is a 1.0 blocker or a post-1.0 nice-to-have. Options:
  (a) Hard 1.0 requirement -- the branded workspace root is part of the rebrand
  and must ship with v1.0.0,
  (b) Soft want -- prefer it at 1.0 but will defer if the vendor scope is too
  large (Recommended -- derisks the 1.0 timeline),
  (c) Explicitly deferred past 1.0 -- the rebrand ships as `qrnchi:` namespace
  commands with `openspec/` staying as the folder name; rename is post-1.0.
  **Answer: (b) Soft want.** Prefer the branded `qrnchi/` root at 1.0 but defer it
  if the vendor scope proves too large -- so a vendor verdict is NOT automatically
  a 1.0 blocker.

- [ ] **PQ4 -- migration-manifest schema extension:** If the verdict is vendor and
  the workspace root is eventually renamed, the migration manifest schema
  (`automated[].path` must start with `openspec/`) blocks expressing a rename
  step. Should extending the schema to support rename/move steps be in-scope for
  this spike (or its immediate follow-on), or is it a separate concern? Options:
  (a) In-scope -- extend the schema as part of the vendor implementation,
  (b) Separate concern -- the vendor verdict documents the need; schema extension
  gets its own backlog entry (Recommended if PQ3 answer is (b) or (c)),
  (c) Not needed -- rename steps would be documented as manual migration steps
  rather than automated manifest entries.
  **Answer: (b) Separate concern.** The verdict documents any need to extend the
  manifest schema for rename/move steps; the extension itself gets its own backlog
  entry rather than expanding this spike (consistent with PQ3's soft/deferred
  rename).

- [ ] **PQ5 -- evidence bar for the verdict:** What evidence level is needed to
  make the keep-vs-vendor decision defensible before the 1.0 freeze? Options:
  (a) R/D analysis of the codebase is sufficient -- no prototype needed,
  (b) A proof-of-concept spec validator check in scripts/lint.mjs (vendor path)
  or a pin-coupling guard prototype (keep path) is needed before committing,
  (c) An upstream conversation with the OpenSpec CLI maintainer is needed to
  understand the CLI roadmap (e.g., whether a configurable workspace-root name
  is planned for 1.7+) before deciding.
  Note: PQ1 and PQ5 are interdependent -- a strong prior (PQ1a or PQ1b) lowers
  the evidence bar; a genuinely open prior (PQ1c) raises it.
  **Answer: (a) R/D analysis of the codebase is sufficient.** No prototype and no
  upstream conversation required before the verdict -- consistent with the PQ1
  keep lean lowering the bar. (Under a keep verdict, the guard's own tests land
  when it is built in the I stage per PQ2.)
