# Questions — kit-surface-dogfooding

> Stage Q of QRSPI. Generated 2026-07-25.
> Change summary: Give the kit its own surface taxonomy entries so its artifacts
> use surface-gated sections that match kit-specific concerns, and add a CI check
> (Check 14) that validates the kit's committed artifacts carry no sections for
> absent surfaces.

<!-- No present surfaces for this repo (qrspi-stack ## Repo surface: _No present
     surfaces._), so surface-gated sections (Data model, API, UI, Auth, etc.) are
     all omitted. Custom sections below cover the change's own dimensions:
     surface taxonomy design, skill/template/agent changes, and lint. -->

## Surface taxonomy — candidate surfaces

1. The backlog lists six candidate kit surfaces: `slash-command`, `stage-agent`,
   `skill`, `template`, `lint-gate`, and `migration-manifest`. For each, what is
   the precise membership criterion — i.e., what makes a change qualify as
   "touching" that surface? For example: does a change that *renames* a command
   file qualify as `slash-command`? Does a change that edits a skill's *prose*
   but not its section headings qualify as `skill`?

2. The `repo-surface` skill states: "a surface exists only to gate a cluster of
   the emitted sections." For each of the six candidates, what section heading(s)
   would it gate in a `questions.md`, `design.md`, `proposal.md`, or `tasks.md`?
   List the proposed section name(s) per surface — these are the section labels
   that will appear in artifacts when that surface is present.

3. Are any of the six candidates *always* present for any kit change (i.e.,
   every kit change touches them), making them a poor gate? For example, does
   `skill` fire on nearly every QRSPI flow since almost every change loads or
   modifies a skill?

4. `migration-manifest` gates sections relevant to release migrations
   (`migrations/<v>.yaml`). Is this surface always co-present with a version bump?
   Can a change need a migration manifest without touching any other surface
   (e.g., a pure documentation rename that still requires a migration step)?

5. `lint-gate` covers changes to `scripts/lint.mjs`. Are there related files
   (e.g., `scripts/skill-sets.mjs`) that should also trigger the `lint-gate`
   surface, or is `lint.mjs` the only gating file?

6. `stage-agent` is described as "touches an agent read-contract / the Read
   Matrix." Does this surface fire only when an agent's Read Matrix row changes,
   or also when any other structural part of an agent file changes (e.g., adding
   an `effort:` frontmatter field, changing the output-contract banner)?

7. Should any of the six candidates be split further? For example, should
   `slash-command` split into `slash-command` (command prose) and
   `command-readme-sync` (README coverage), or is one surface + a multi-part
   gated section the right shape?

8. The `repo-surface` skill says the vocabulary is "closed by construction" —
   a surface must gate at least one emitted section or it is inert. After listing
   the candidate section headings (Q2), are any of the six candidates still
   inert (no compellingly distinct section to gate)? Which ones, if any, should
   be dropped?

## Surface taxonomy — scope decision

9. The change description says "each new surface must ship WITH the section(s) it
   gates." Does this mean all six candidate surfaces must land in one PR, or is
   it acceptable to ship a subset (say, three surfaces) and defer the rest as
   separate backlog items? What is the minimum viable set?

10. `enforce-artifact-surface-applicability` (the lint check, half 2 of this
    bundle) depends on the kit declaring its own surfaces. If this PR ships only
    a partial surface set, does the lint check still make sense — or does it
    become more confusing than useful until the surface set is complete?

11. Should `typed-nullable` remain absent from the kit's `## Repo surface` block
    after this change? The kit is Markdown + one `.mjs` file — there is no typed
    language. Confirm the block stays silent on `typed-nullable` (and the five
    web surfaces) after this change.

## Skill — `repo-surface` mapping

12. Today the `repo-surface` skill's `## Section-to-surface mapping` table lists
    four named surfaces (`data-store`, `http-api`, `ui`, `auth`, `typed-nullable`).
    For each new kit surface, a new row must be added. What is the exact format
    of a mapping row (prose description + indented bullet list of gated sections),
    and must it follow a specific order relative to the existing rows?

13. The `qrspi-stack` skill's `## Repo surface` block is the authoritative
    allowlist for THIS repo. After this change, the block's `_No present surfaces._`
    sentinel will be replaced with the accepted surface entries. Which surfaces
    are listed determines which sections fire in future kit artifacts. Does
    updating this block in `qrspi-stack` require any corresponding update to the
    `repo-surface` skill, or are they independent edits?

14. The `repo-surface` skill describes surface-inference Rule A (authoritative
    `## Repo surface` block) and Rule B (prose fallback). After adding kit
    surfaces to the block, the block becomes the authoritative list. Confirm that
    no existing prose anywhere in `qrspi-stack` accidentally mentions the new
    surface names in a way that could confuse Rule B inference in a repo that
    lacks a `## Repo surface` block.

## Agent skeletons and templates

15. When a kit surface is present, the gated section(s) must appear in the
    relevant agent skeleton(s) and/or template(s). For each accepted surface,
    which of the following files need a new section placeholder or conditional
    comment added: `claude/agents/questioner.md` (questions skeleton),
    `claude/agents/designer.md` (design skeleton), `claude/agents/architect.md`
    (proposal skeleton), `claude/agents/planner.md` (tasks skeleton),
    `openspec-templates/questions.template.md`, `openspec-templates/design.template.md`,
    `openspec-templates/proposal.template.md`, `openspec-templates/tasks.template.md`?

16. Check 11 (`checkNoCrudSkeletonHeadings`) maintains a denylist of twelve
    surface-gated headings that must NOT appear as literal heading lines inside
    fenced blocks in the five artifact-producing agent files. If a new kit surface
    introduces a new section heading (e.g., `## Slash-command surface`), must a
    corresponding denylist entry be added to `CRUD_DENYLIST_HEADINGS` in
    `scripts/lint.mjs`? Or is the denylist only for the original twelve CRUD
    headings and the new kit headings can live literally in fences (since they
    are kit-specific, not web-app CRUD)?

17. Check 3 (`checkHeadingAlignment`) asserts that canonical surface-INDEPENDENT
    headings from each template appear in the corresponding agent file. The three
    always-emitted `questions.template.md` headings (`## Testing`,
    `## Sequencing & scope`, `## Open product questions (for the human)`) are
    already in Check 3's list. If a kit surface introduces a section that is
    always present for the kit (not conditionally gated), should it be added to
    Check 3's `TEMPLATE_CANONICAL_HEADINGS`? Or is that only for truly
    surface-independent headings?

18. The agent skeleton in `questioner.md` carries an inline `<!-- Surface-gated
    sections -->` comment block mapping surfaces to section headings. After
    adding kit surfaces, this comment block must be updated to include the new
    surface-to-section mappings. What is the correct format for the new entries
    — must they follow the exact `surface-name -> ## Section heading` format
    already used for `data-store`, `http-api`, `ui`, and `auth`?

## Lint — Check 14 (enforce-artifact-surface-applicability)

19. The proposed Check 14 "parses the kit's own `qrspi-stack` surface block and
    asserts the kit's committed `openspec/changes/**` artifacts carry no sections
    for absent surfaces." Where exactly does Check 14 find the `qrspi-stack` skill?
    The file is at `.claude/skills/qrspi-stack/SKILL.md` — is it always at this
    path, or must Check 14 Glob-discover it to avoid hardcoding?

20. Check 14 reads the `## Repo surface` block from `qrspi-stack/SKILL.md` to
    obtain the list of present surfaces, then maps each surface to the section
    headings it gates (from `repo-surface`'s section-to-surface mapping). Where
    does Check 14 get the surface-to-heading mapping — does it hardcode a
    duplicate copy of the mapping table, or does it read from the `repo-surface`
    skill file? What are the maintenance implications of each approach?

21. If the `## Repo surface` block is malformed (e.g., the sentinel line
    `_No present surfaces._` is absent and the bullet list is also absent, but
    the heading exists), what should Check 14 do — fail with a parse error, treat
    it as "no surfaces declared," or skip the check and warn?

22. If the `## Repo surface` block is entirely absent from `qrspi-stack/SKILL.md`
    (the heading `## Repo surface` is missing), what should Check 14 do?
    Options: (a) fail loudly (the block is required for the kit to dogfood its
    own check), (b) skip the check and emit a warning, (c) treat absence as
    "no surfaces present" and scan artifacts for ALL surface-gated headings.

23. Check 14 scans `openspec/changes/**` artifacts (not archived ones). Which
    artifact files does it scan — only `questions.md` and `design.md`, or all
    `*.md` files in the changes tree? Does it also scan `research.md`,
    `proposal.md`, `slices.md`, `tasks.md`, `pr.md`, and `followups.md`?

24. When Check 14 finds a disallowed section heading in an artifact, it must
    determine whether the heading is surface-gated or always-emitted. What
    heading set does it test against — the twelve CRUD headings already listed in
    Check 11's `CRUD_DENYLIST_HEADINGS`, plus the new kit surface headings? Or a
    separate, independently maintained set for Check 14?

25. Check 14 and Check 11 are described as complementary, not overlapping. Check 11
    scans source agent files for hardcoded headings inside fenced blocks; Check 14
    scans committed artifacts for emitted headings whose surface is absent. Is there
    any case where both checks would fire on the same violation? Should the checks'
    comments in `lint.mjs` explicitly state the disjoint-scope invariant (as Check
    11 already does for Check 3)?

26. Check 14 is scoped to the kit linting its OWN artifacts. Should it also scan
    the `openspec-templates/*.template.md` files? Or are those explicitly excluded
    (like `claude/skills/` is excluded from Check 13) because templates may contain
    example headings that are not "emitted" output?

27. What is the implementation strategy for Check 14's heading detection — does it
    scan for exact `## Heading Name` lines at the start of a line (like Check 11),
    or does it use a different matching approach to handle headings inside or outside
    fenced blocks? Should it skip headings inside fenced code blocks (since those
    are examples, not emitted content)?

## Lint — relationship to existing checks

28. Check 11's `CRUD_DENYLIST_HEADINGS` currently lists twelve headings for the
    five web-app surfaces. If new kit surfaces introduce new section headings, and
    those headings are also to be denied from agent fenced skeletons, the denylist
    must grow. Is the denylist expected to expand with each new surface added
    (whether kit or consumer-facing), or is it intentionally limited to the
    original twelve?

29. The `repo-surface` skill skill file (`.claude/skills/repo-surface/` inside the
    installed plugin, NOT a kit source file) is loaded at agent runtime but is not
    a source file the lint script reads. If Check 14 needs the surface-to-heading
    mapping at lint time, it must either (a) read it from the installed plugin path,
    (b) hardcode it in `lint.mjs`, or (c) extract it from a shared module like
    `scripts/skill-sets.mjs`. Which approach fits the existing pattern?

## Testing and dogfooding

30. The kit's test suite is `node scripts/lint.mjs`. After adding Check 14, how
    is it tested? The kit has no committed artifacts with disallowed surface sections
    (by design), so the "no violation" path is trivially tested by the CI run. How
    would a regression be caught — is there a fixture or example artifact that
    intentionally has a disallowed heading to verify Check 14 fires?

31. The kit's own `questions.md`, `design.md`, and other artifacts in
    `openspec/changes/**` are the subject of Check 14's scan. After this change
    lands, will the kit's own in-progress artifact files (including this
    `questions.md`) be scanned by Check 14 and must be free of disallowed sections?
    Confirm the scope: does Check 14 scan the `archive/` subfolder or only the
    live `openspec/changes/**` tree?

32. Dogfooding: once the new kit surfaces are declared in `qrspi-stack`'s
    `## Repo surface` block, future QRSPI artifacts for kit changes will
    emit the new surface-gated sections. What does a human verifier need to
    observe to confirm the surface-gate filter fires correctly — i.e., that a
    kit change touching `slash-command` gets the gated section in its artifact,
    and a kit change that does NOT touch `slash-command` does not?

## Sequencing & scope

33. The two halves of this bundle (`kit-self-surfaces` and
    `enforce-artifact-surface-applicability`) are co-designed but sequencing
    matters: the lint check (half 2) validates output against the declared
    surface (half 1). Can half 2 land before half 1 (would Check 14 pass with
    `_No present surfaces._` in the block, since no sections would be gated)?
    Or does half 1 need to ship first?

34. The backlog rows `kit-self-surfaces` and `enforce-artifact-surface-applicability`
    are both listed as separate `idea` entries. This change bundles them. After
    this change's PR merges, both rows should be removed from the backlog (the
    combined change covers both). Confirm this is the intended handling — no
    residual row for either idea.

35. `extend-surface-taxonomy` (P3) proposes adding non-kit, non-web surfaces
    (CLI, message queues, background jobs, etc.). Should any of those candidates
    be pulled into this change, or is the scope hard-limited to kit-specific
    surfaces only?

36. `standardize-backlog-format` (P2) and `backlog-prioritization` (P2) are
    unrelated to this change. Do the new surfaces added here require any
    corresponding update to the backlog format skill or conventions, or are those
    fully independent?

37. After this change, will the kit's `qrspi-stack` `## Repo surface` block
    list the accepted surfaces? If a future change adds another kit surface
    (e.g., from `extend-surface-taxonomy`), the process is: update `repo-surface`
    skill + `qrspi-stack` block + relevant agent skeletons/templates + Check 11
    denylist + Check 14 mapping. Is this process documented anywhere in the kit,
    or should this change add a "How to add a surface" note to the `repo-surface`
    skill?

## Open product questions (for the human)

- [x] **PQ1 — surface subset:** Which of the six candidate kit surfaces
  (`slash-command`, `stage-agent`, `skill`, `template`, `lint-gate`,
  `migration-manifest`) should land in THIS change vs. be deferred as separate
  backlog items? Options:
  (a) All six — ship the complete kit surface taxonomy at once; the full set is
      needed for Check 14 to be meaningful (Recommended if scope permits),
  (b) Core four only: `slash-command`, `stage-agent`, `skill`, `lint-gate` —
      defer `template` and `migration-manifest` as lower-traffic surfaces,
  (c) Minimum two: `slash-command` and `lint-gate` only — the most clearly
      distinct surfaces with the easiest-to-name gated sections; defer the rest.
  **Answer: (a) All six — ship the complete kit surface taxonomy at once.**

- [x] **PQ2 — Check 14 with partial surfaces:** If PQ1 picks a subset (options b
  or c), should Check 14 still ship in this change (asserting no absent-surface
  sections for the declared partial set), or should Check 14 be deferred until
  the full surface set is declared? Options:
  (a) Ship Check 14 with whatever surfaces are declared — it is useful even
      partially; absent surfaces simply have no gated headings to scan for
      (Recommended),
  (b) Defer Check 14 until the full surface set lands — a partial check gives
      a false sense of coverage.
  **Answer: Moot — resolved by PQ1 (a). Full surface set + Check 14 ship
  together in this change.**

- [x] **PQ3 — section names per surface:** For each surface accepted in PQ1,
  confirm the section heading name(s) to gate. Proposed defaults:
  `slash-command` → `## Slash-command surface` in questions.md / `## Command
  changes` in design.md; `stage-agent` → `## Stage-agent surface` / `## Agent
  changes`; `skill` → `## Skill surface` / `## Skill changes`; `lint-gate` →
  `## Lint-gate surface` / `## Lint changes`; `template` → `## Template
  surface`; `migration-manifest` → `## Migration manifest`. Options:
  (a) Use the proposed defaults above (Recommended),
  (b) Use a consistent `## <Surface> changes` pattern across all artifact types
      (flatter, but "Lint-gate changes" is slightly awkward),
  (c) Decide per surface ad-hoc during design.
  **Answer: (a) Use the proposed defaults.**

- [x] **PQ4 — Check 11 denylist growth:** Should the new kit surface section
  headings (accepted in PQ3) be added to Check 11's `CRUD_DENYLIST_HEADINGS` so
  that agent fenced skeletons cannot hardcode them? Options:
  (a) Yes — add every new kit surface heading to the denylist; the disjoint-set
      invariant (Check 3 requires surface-independent headings; Check 11 forbids
      surface-gated headings in fences) should extend to kit surfaces too
      (Recommended),
  (b) No — the denylist is intentionally limited to the original twelve CRUD
      headings; kit headings can live literally in fences since they are
      always-present for the kit.
  Note: if PQ4 picks (a), each accepted surface heading adds one entry to
  `CRUD_DENYLIST_HEADINGS` and must also appear in the Check 11 comment block.
  **Answer: (a) Yes — add every new kit surface heading to the denylist. The
  human flagged that the constant name `CRUD_DENYLIST_HEADINGS` becomes a
  misnomer once non-CRUD kit headings join it → tracked as the emergent PQ9
  (rename).**

- [x] **PQ5 — Check 14 scope:** Which files should Check 14 scan for disallowed
  surface sections? Options:
  (a) All `*.md` files in `openspec/changes/**` excluding the `archive/`
      subfolder — covers live in-progress artifacts without touching historical
      ones (Recommended),
  (b) Only the primary artifact files (`questions.md`, `design.md`,
      `proposal.md`) — the planning artifacts most likely to carry surface-gated
      sections; skip `slices.md`, `tasks.md`, `followups.md`, etc.,
  (c) All `*.md` files including `archive/` — most thorough but scans a large
      and growing tree.
  **Answer: (a) All `*.md` under `openspec/changes/**`, excluding `archive/`.**

- [x] **PQ6 — Check 14 surface-to-heading source:** Where does Check 14 get the
  surface-to-section-heading mapping at lint time? Options:
  (a) Hardcode a copy of the mapping in `lint.mjs` (or a shared module like
      `scripts/surface-headings.mjs`) — same pattern as `CRUD_DENYLIST_HEADINGS`
      and `SKILL_SET_EXPECTED`; no file-read at lint time (Recommended),
  (b) Parse the mapping live from the `repo-surface` skill file at
      `.claude/skills/repo-surface/SKILL.md` — stays in sync automatically but
      requires the installed plugin to be present at lint time,
  (c) Parse the mapping from the kit's own source copy under
      `claude/skills/repo-surface/SKILL.md` — avoids the installed-plugin
      dependency but requires a second skill copy to exist.
  **Answer: (a) Hardcode the mapping in `lint.mjs` (or a shared module) — same
  pattern as the existing lint constants; no file-read at lint time.**

- [x] **PQ7 — Check 14 malformed/absent block behaviour:** What should Check 14
  do if the `## Repo surface` block is absent or unparseable in
  `.claude/skills/qrspi-stack/SKILL.md`? Options:
  (a) Fail with a clear error: the block is required for the kit to dogfood its
      own surface check (Recommended),
  (b) Warn and skip: emit a warning but do not fail CI, so a missing block does
      not block unrelated PRs,
  (c) Treat absence as "no surfaces declared" and scan for ALL surface-gated
      headings (most conservative, but noisy for a repo mid-migration).
  **Answer: (a) Fail with a clear error — the block is required for the kit to
  dogfood its own surface check.**

- [x] **PQ8 — "How to add a surface" documentation:** Should this change add a
  "How to add a surface" section to the `repo-surface` skill (or a similar
  doc location) describing the required steps (mapping row + agent
  skeleton/template + Check 11 denylist + Check 14 mapping + `qrspi-stack`
  block)? Options:
  (a) Yes — add a `## Extending the taxonomy` section to `repo-surface` skill
      so future contributors have a checklist (Recommended),
  (b) No — the requirement is already implicit in the repo-surface skill's
      "To extend the taxonomy" paragraph; a separate checklist risks drift.
  **Answer: (a) Yes — add a `## Extending the taxonomy` checklist to the
  `repo-surface` skill (this change just proved the exact steps).**

- [x] **PQ9 — rename `CRUD_DENYLIST_HEADINGS` (emergent, from PQ4):** Once the
  Check 11 denylist also holds non-CRUD kit surface headings (`## Slash-command
  surface`, `## Lint changes`, …), the constant name `CRUD_DENYLIST_HEADINGS`
  becomes a misnomer — "CRUD" no longer describes the whole set. Rename it?
  Options:
  (a) Rename to a surface-generic name (e.g. `SURFACE_GATED_DENYLIST_HEADINGS`
      or `GATED_SKELETON_HEADINGS`); update Check 11's comment block to match
      (Recommended),
  (b) Keep `CRUD_DENYLIST_HEADINGS` — accept "CRUD" as a loose historical label
      to minimize churn.
  **Answer: (a) Rename to a surface-generic name (e.g.
  `SURFACE_GATED_DENYLIST_HEADINGS`) and update the Check 11 comment block to
  match. Exact name to be settled in design.**
