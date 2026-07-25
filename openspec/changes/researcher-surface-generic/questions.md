# Questions — researcher-surface-generic

> Stage Q of QRSPI. Generated 2026-07-25.
> Change summary: Make the QRSPI researcher (stage R) drive its factual-inventory
> sections from the repo's declared surfaces (the stack-cheatsheet `## Repo surface`
> block) instead of a fixed, web-app-shaped skeleton (`## Public API surface`,
> `## Data model`, ...).

<!-- Surface-gated sections: emit each section below only when its
     controlling surface is present for this repo, per the repo-surface
     skill mapping. Omit the heading entirely when the surface is absent
     (no heading, no "Not applicable"). Surface-independent sections
     (Testing, Sequencing & scope, Open product questions) always appear.

     Present surfaces for this repo (from qrspi-stack ## Repo surface):
       slash-command, stage-agent, skill, lint-gate, template, migration-manifest

     Absent: data-store, http-api, ui, auth, typed-nullable
-->

## Stage-agent surface

Questions about `claude/agents/researcher.md` -- the file being changed.

1. What is the researcher's current fixed skeleton structure? List every
   `## <Heading>` that appears inside the fenced `research.md` example in
   `claude/agents/researcher.md`, in order.

2. Which of those fixed headings are web-app-specific (i.e., they only make
   sense when a corresponding surface is present in the repo being researched)?
   Which are always-applicable regardless of surfaces?

3. The researcher today does NOT load `repo-surface` or the stack-cheatsheet
   skill. What would need to change in its `## What to do` steps to incorporate
   surface loading without violating the ticket-blind Read contract? Specifically:
   does loading `repo-surface` require reading any file that is banned for this
   stage (i.e., any file under `openspec/changes/<id>/`)?

4. The researcher's Read contract banner reads: "Reads: none (whole
   `changes/<id>/` folder banned)." If the researcher now loads `repo-surface`
   and the stack-cheatsheet skill, does this change the banner text? The
   stack-cheatsheet lives at `.claude/skills/qrspi-stack/SKILL.md` -- is that
   path inside or outside the banned `changes/<id>/` folder?

5. Check 7 (`checkReadContracts`) asserts each stage agent's Read contract
   banner matches its approved row in the read matrix (hardcoded in
   `scripts/lint.mjs`). If the researcher's banner changes to acknowledge skill
   loads, does Check 7's hardcoded expected string for the researcher need to
   change? What is that string today (line ~1139 of `scripts/lint.mjs`)?

6. The `workflow` skill's Read Matrix row for R reads: "Reads (within-change):
   *none* -- the whole `changes/<id>/` folder is banned." Does loading kit
   skills (`repo-surface`, the stack-cheatsheet) constitute a within-change
   read? Where do these skills live relative to the `changes/` tree?

7. The researcher currently receives its "areas of interest" brief from the
   orchestrator (R-stage command `claude/commands/research.md`). The areas-of-
   interest list is derived from `questions.md` section headings. If the
   researcher itself now drives section selection from surfaces, does the
   orchestrator's brief-derivation logic also need to change, or do the two
   operate independently (areas of interest = input scope; sections = output
   structure)?

8. Does the researcher currently load any skills at all (check its `## What to
   do` step 1)? What skills does it load?

## Skill surface

Questions about `claude/skills/repo-surface/SKILL.md` -- the skill that must
gain a new inventory-heading mapping for the researcher.

9. The `repo-surface` skill currently maps surfaces to *proposal-heading*
   sections (the sections gated in questioner, designer, architect, planner).
   Where precisely in the SKILL.md is this mapping expressed? Is it a single
   table, a series of `### <surface> gates` subsections, or something else?

10. What is the distinction, at a conceptual level, between a
    *proposal-heading* (e.g., `## Data model` in `questions.md`) and an
    *inventory-heading* (the equivalent section in `research.md`)? The backlog
    entry names this "a surface->inventory-heading mapping distinct from the
    existing surface->proposal-heading mapping." Does any such mapping exist
    today in `repo-surface` or anywhere else?

11. How many total surfaces are defined in the `repo-surface` taxonomy today?
    List them. For each, what would a reasonable *inventory* section heading
    be in `research.md` -- one that describes a factual audit ("what the repo
    currently has") rather than a design proposal ("what to build")?

12. The "Extending the taxonomy" checklist in `repo-surface/SKILL.md` lists
    six sites that must all change together when a new surface is added. Would
    adding a researcher inventory-heading mapping to `repo-surface` require
    touching all six sites, or only a subset? Which ones?

## Slash-command surface

Questions about `claude/commands/research.md` -- the orchestrator that spawns
the researcher.

13. The R-stage command derives "areas of interest" from `questions.md` section
    headings when the user gives only a change id. After this change, the
    researcher's output sections are driven by surfaces -- not by areas of
    interest. Does the areas-of-interest brief still need to list the
    inventory-section headings the researcher should produce, or is that now
    the researcher's own job (determined by surface loading)?

14. If the researcher gains its own surface-loading logic and thus determines
    its own output structure, does the orchestrator command need any change
    at all, or is it fully decoupled from the output section layout?

## Lint-gate surface

Questions about `scripts/lint.mjs` and its checks.

15. Check 14 (`SURFACE_APPLICABILITY`) currently scans every `*.md` under
    `openspec/changes/**` (excluding `/archive/`) for absent-surface headings.
    The backlog entry says this change "retires the temporary band-aid" that
    renamed `## Data model` to `## Data structures` in `kit-surface-dogfooding`'s
    `research.md`. After this change, will `research.md` files be naturally free
    of absent-surface headings (making them legitimately scannable by Check 14),
    or does Check 14 need a new exemption or denylist for research-specific
    headings?

16. Check 11 (`NO SURFACE-GATED SKELETON HEADINGS IN FENCED BLOCKS`) applies
    to the five artifact-producing agents: questioner, designer, architect,
    planner, reviewer. It does NOT currently cover the researcher. After this
    change, the researcher will have surface-gated sections inside its fenced
    `research.md` skeleton. Does Check 11 need to be extended to cover
    `researcher.md` as well? What is the `CRUD_CHECK_AGENTS` array today, and
    would "researcher" be added to it?

17. The `SURFACE_GATED_HEADINGS` map in `scripts/lint.mjs` (Check 14) maps
    each surface to the headings it gates in *proposal* artifacts. The researcher
    uses *inventory* headings that may differ from proposal headings (e.g.,
    `## Data model` in design.md vs. a hypothetical `## Current data model` in
    research.md). Does Check 14's heading map need a separate researcher-specific
    entry per surface, or will the inventory headings intentionally match the
    proposal headings so the same map covers both?

18. The Check 7 expected string for the researcher today is:
    `'Reads: none (whole changes/<id>/ folder banned).'` (line ~1139).
    If the Read contract banner changes to acknowledge skill-loading, what exact
    string would Check 7 need to assert instead? Is there precedent in the read-
    matrix row format for skill-loading acknowledgement, or would a new
    banner convention need to be established?

19. `scripts/lint.mjs` is a Node.js-only file with no npm dependencies. Any
    changes to the lint map (SURFACE_GATED_HEADINGS, CRUD_CHECK_AGENTS,
    SURFACE_GATED_DENYLIST_HEADINGS, read-contract expected strings) require
    editing this single file. Confirm: are all four of these constants defined
    in one place, or are any of them split across the file?

## Template surface

Questions about `openspec-templates/questions.template.md` and any researcher
output template.

20. There is currently no `research.template.md` in `openspec-templates/`.
    The researcher writes `research.md` from an inline skeleton in its own
    agent file (`claude/agents/researcher.md`). Does a `research.template.md`
    need to be created as part of this change, or is the inline skeleton in
    the agent file sufficient?

21. Check 3 (`HEADING ALIGNMENT`) asserts that canonical section headings from
    each `openspec-templates/*.template.md` appear in the corresponding inline
    skeleton in the relevant agent file. If a `research.template.md` is
    created, Check 3 would start enforcing alignment between it and the
    researcher's inline skeleton. Is that desirable -- or does the surface-driven
    dynamic nature of research.md make it incompatible with Check 3's
    static-heading alignment check?

## Inventory-vs-proposal semantics

> ⮕ Resolved by PQ6: the `## Repo surface` block is **authoritative** for
> section-gating (an absent surface's gated section is omitted). The
> "documenting absence is useful" concern is served instead by a factual
> `## Notable discrepancies` note for the only interesting case — a surface
> the researcher finds *code evidence* for although it is declared absent.
> Pure absence with no evidence is simply omitted. Read PQ1/PQ23–26 below
> through this lens.

This section covers the first named design wrinkle: whether the researcher
should omit sections for absent surfaces (like proposal agents do) or emit a
lightweight "not present" note (since documenting absence can be a useful
factual finding).

22. In the current fixed skeleton, does `research.md` contain any section that
    documents the *absence* of something -- e.g., "no public API surface found"
    -- or do all current sections assume the surface is present and simply map
    what is there?

23. Consider a change being researched in a repo that has `data-store` absent
    from its `## Repo surface`. Under the "omit when absent" rule (mirroring
    proposal agents), the researcher would emit no `## Data model` section.
    Under an alternative "emit with absence note" rule, it would emit a short
    `## Data model` section saying "not present." Which rule produces a more
    useful factual record for the downstream designer?

24. Is "omit when absent" or "emit with absence note" the right behavior for
    the researcher? Consider: (a) the designer reads `research.md` directly;
    (b) Check 14 scans `research.md` for absent-surface headings and would
    flag an absent-surface heading as a violation; (c) the researcher is
    supposed to produce facts, not decisions. Note the constraint from (b):
    if Check 14 fires on absent-surface headings in `research.md`, "emit with
    absence note" would require either a Check 14 exception for the researcher
    or using headings not in the surface-gated denylist (e.g., `## No data
    store present` instead of `## Data model`).

25. If "emit with absence note" is chosen, where does that note land? Options:
    (a) a dedicated `## Absent surfaces` section (always-emitted, listing what
    is NOT present and why that matters), (b) inline in each absent-surface's
    own section using a non-gated heading variant, (c) a short paragraph in
    `## Areas investigated`, (d) omit entirely. Which option avoids triggering
    Check 14 while still surfacing the factual record of absence?

26. Should "emit with absence note" vs "omit" be a per-surface decision, or a
    single policy applied uniformly? For example, `data-store: absent` might
    be worth documenting if the researcher found DB-like patterns anyway, while
    `http-api: absent` for a CLI tool might be too obvious to state.

## Read-contract impact (ticket-blind invariant)

This section covers the second named design wrinkle: the researcher is ticket-
blind and does not load `repo-surface` today, so adding surface-loading touches
its Read contract and the R stage's invariants.

27. The workflow skill's Read Matrix states the researcher "Reads: none (whole
    `changes/<id>/` folder banned)." This "none" describes within-change reads.
    Can skills loaded via the `Skill` tool be loaded without any file reads
    that could reveal the ticket? Specifically: do kit skills (`repo-surface`,
    `qrspi-stack`) reside under `openspec/changes/<id>/` or under
    `claude/skills/` and `.claude/skills/`?

28. Loading the stack-cheatsheet skill reveals the repo's surface list, but not
    the change description. Does learning the surface list constitute any form
    of ticket exposure that could compromise the ticket-blind invariant? Why or
    why not?

29. The R-stage command (`claude/commands/research.md`) today derives areas of
    interest from `questions.md` and passes only the change id + areas brief to
    the researcher -- no ticket. If the researcher now also loads `repo-surface`
    and the stack-cheatsheet skill internally (rather than relying on the
    orchestrator to pass surface info), does the orchestrator need to change its
    brief at all? Or can the orchestrator remain unmodified?

30. The researcher's tool list today is: Read, Write, Bash, Glob, Grep, Skill.
    `Skill` is already present, meaning the researcher can already invoke
    skills. Does adding skill loads (`repo-surface`, `qrspi-stack`) require a
    change to the agent's frontmatter `tools:` line?

31. After this change, the Read contract banner must accurately reflect what
    the researcher reads. The matrix row today is "Reads: none (whole
    changes/<id>/ folder banned)." How should the banner be updated to
    acknowledge skill-loading of `repo-surface` and the stack-cheatsheet while
    still accurately conveying the within-change ban? Proposed wording options
    to evaluate: (a) keep "Reads: none" and mention skills in a separate note,
    (b) change to "Reads: repo-surface skill, stack-cheatsheet skill (no
    change-folder files)", (c) something else.

32. Check 7 asserts the banner matches an expected string hardcoded in
    `scripts/lint.mjs`. How many distinct strings are there in the Check 7
    expected map today (one per stage agent)? Must the researcher's string be
    updated atomically with the banner in the same commit, or does Check 7
    tolerate a transient mismatch?

## Testing

33. The kit has no unit test framework -- correctness is verified by
    `node scripts/lint.mjs`. Which of the fourteen lint checks are directly
    relevant to verifying this change is correct? List each check and why
    it applies.

34. Check 14's self-test runs a synthetic in-memory fixture with a known absent-
    surface heading. After this change, should the self-test also exercise a
    researcher-specific inventory heading to confirm it is correctly gated (or
    not gated) for absent surfaces? What would such a fixture look like?

35. The "band-aid" this change retires is in `kit-surface-dogfooding`'s
    `research.md` (which renamed `## Data model` to `## Data structures` to
    avoid Check 14 firing). Once this change ships, that band-aid file is under
    `/archive/` and thus excluded from Check 14 scanning. Does the retired
    band-aid need any active cleanup, or does the archive-exclusion rule
    make it a non-issue?

36. What manual verification steps can confirm the researcher produces the
    correct surface-gated output on a real run against a consumer repo? Describe
    the observable: given a consumer repo with only `data-store` + `http-api`
    surfaces, what sections should appear in `research.md`, and what sections
    should be absent?

## Sequencing & scope

37. The backlog entry names this change a "sibling of `kit-self-surfaces`" and
    says it is the "durable completion of the surface-gating work." Is
    `kit-self-surfaces` currently in the backlog, in-progress, or archived?
    Does this change depend on `kit-self-surfaces` being merged first, or can
    it be developed independently?

38. The change retires a band-aid in `kit-surface-dogfooding`'s archived
    `research.md`. Is `kit-surface-dogfooding` fully archived? Does any live
    artifact from that change affect the work here?

39. The backlog lists `extend-surface-taxonomy` (P3) as a future idea for
    adding new surfaces. This change must not block that path. Does the
    surface->inventory-heading mapping design here introduce any coupling that
    would make adding a new surface harder than adding a new row to a table?

40. Should this change include a `migration-manifest` entry (i.e., a
    `migrations/<version>.yaml`)? The migration-manifest surface is present in
    this repo. What criteria determine whether a QRSPI kit change needs a
    migration entry vs. not?

## Open product questions (for the human)

- [x] **PQ1 — inventory-vs-proposal omit rule:** When the researcher encounters
  a surface that is absent from the repo's `## Repo surface` block, should it
  (a) omit the section entirely (mirroring proposal agents -- cleanest for
  Check 14, no false-positive headings), (b) emit a lightweight "not present"
  note under a non-gated heading (e.g., inside `## Absent surfaces` or
  `## Areas investigated`) to give the designer a factual absence record, or
  (c) keep a minimal always-emitted `## Implicit contracts and conventions`
  section and fold absence notes there?
  Options: (a) omit entirely, (b) dedicated absence section with non-gated
  heading, (c) fold into always-emitted section.
  Note: PQ1's answer directly shapes PQ2 -- if (b) or (c), the absence-note
  heading must not appear in `SURFACE_GATED_HEADINGS` or Check 14 will fire.
  **Answer: (a) omit entirely** (reframed by PQ6). For a *pure* absent surface
  with no code evidence, research.md emits no section, no heading, no "not
  applicable" line — identical to the proposal agents. The only case where an
  absence is worth stating (the researcher found code evidence of a
  declared-absent surface) is handled by PQ6's `## Notable discrepancies` note,
  not by an always-emitted absence section. Keeps Check 14 clean and research.md
  scannable.

- [x] **PQ2 — Check 14 coverage of research.md:** After this change, should
  Check 14 scan `research.md` files the same way it scans `questions.md` and
  `design.md` (i.e., flag any absent-surface heading as a violation), or
  should `research.md` files be excluded from Check 14 scanning (similar to
  how `/archive/` paths are excluded)? Option (a): scan research.md the same
  way -- forces the inventory headings to use non-gated names or omit when
  absent. Option (b): exclude research.md from Check 14 -- simpler, but
  removes the correctness guard the change is meant to establish.
  Note: if PQ1 = (a) omit entirely, then option (a) here is safe and the
  preferred choice. If PQ1 = (b) or (c), option (a) requires care with
  heading naming.
  **Answer: (a) scan research.md the same way.** Because PQ1 = omit and PQ6
  keeps discrepancy notes under a non-gated heading, research.md is naturally
  free of absent-surface gated headings, so scanning is safe — and it is the
  correctness guard the change exists to establish (a future research.md that
  regressed to a hardcoded web-app heading in a repo lacking that surface would
  be caught). This legitimately retires the `kit-surface-dogfooding`
  `## Data model`→`## Data structures` band-aid.

- [x] **PQ3 — Read contract banner wording:** Should the researcher's updated
  Read contract banner (a) keep "Reads: none (whole changes/<id>/ folder
  banned)" unchanged (skills are not file reads in the Read Matrix sense),
  (b) change to explicitly acknowledge skill loads (e.g., "Reads: repo-surface
  skill, stack-cheatsheet skill (no change-folder files)"), or (c) keep the
  current banner text but add a separate prose note below it explaining the
  skill loads? The answer also determines whether Check 7's hardcoded expected
  string for the researcher must change.
  Options: (a) keep banner as-is, (b) update banner to name skill loads,
  (c) keep banner + add prose note.
  **Answer: keep the `Reads:` clause as-is + add a one-line prose note**
  (option (a)/(c) — the banner's `Reads:` clause is unchanged, and a prose note
  documents the skill loads). Rationale: the Read-Matrix `Reads:` clause tracks
  *change-folder file* reads; the `repo-surface` and `qrspi-stack` skills are
  kit skills loaded via the Skill tool, not change-folder files, so "Reads: none
  (whole changes/<id>/ folder banned)" stays literally true. Keeping it avoids a
  synchronized edit to Check 7's hardcoded string (`scripts/lint.mjs:1139`) AND
  the workflow Read-Matrix R row, with no accuracy gain and a new drift risk. The
  cross-change spec read (base `openspec/specs/**` + other/archived `spec.md`) is
  preserved untouched in the existing "Never opens … spec.md excepted" pointer.
  → Consequence for PQ18/PQ32: Check 7's researcher string needs **no** change.

- [x] **PQ4 — research.template.md creation:** Should this change create a new
  `openspec-templates/research.template.md` to hold the canonical surface-driven
  skeleton (so Check 3 can enforce alignment between the template and the inline
  skeleton), or is the inline skeleton in `claude/agents/researcher.md` the
  single source of truth and no template file is needed? Consider: Check 3 only
  fires when a template file exists; a template that is purely surface-driven
  (no fixed headings) would have nothing for Check 3 to assert.
  Options: (a) create research.template.md and update Check 3 accordingly,
  (b) no template file -- inline skeleton in researcher.md is the single source.
  **Answer: (c) middle path — a minimal *spine-only* `research.template.md`.**
  The template holds ONLY the surface-independent spine — from the current
  fenced skeleton that is `## Areas investigated`, `## File map`,
  `## Implicit contracts and conventions`, `## Open gaps`, plus PQ6's new
  `## Notable discrepancies` — and deliberately OMITS the surface-driven
  inventory headings (`## Public API surface`, `## Data model`, and any new
  per-surface sections), carrying a comment that those are injected dynamically
  from the repo's declared surfaces. This captures the value of option (a)
  (Check 3 locks the stable structure so the spine can't silently drift/rename)
  while avoiding its cost (the dynamic per-surface headings are NOT duplicated
  into the template, so the two-source sync burden is limited to the rarely
  changing spine). Enforcement then divides cleanly: Check 3 guards the spine
  (template ↔ inline), Check 14 guards the dynamic part (PQ2), Check 11 guards
  against hardcoded gated headings (PQ5). **D ratifies the exact spine set** —
  in particular whether `## Notable discrepancies` is a standing spine heading or
  a conditionally-emitted one — and adds the "surface sections injected here"
  comment so the spine-only template is not misread as the whole artifact.

- [x] **PQ5 — Check 11 extension to researcher:** Should Check 11
  (`NO SURFACE-GATED SKELETON HEADINGS IN FENCED BLOCKS`) be extended to cover
  `claude/agents/researcher.md` (add "researcher" to `CRUD_CHECK_AGENTS`)? This
  would mechanically prevent the researcher's inline skeleton from accidentally
  hardcoding surface-gated headings as literal lines. Or is the check
  appropriately scoped to the proposal-producing agents and should not cover
  the researcher (a different artifact class)?
  Options: (a) extend Check 11 to researcher, (b) leave Check 11 scoped to
  proposal agents only.
  **Answer: (a) extend Check 11 to the researcher** (add `researcher` to
  `CRUD_CHECK_AGENTS`). This mechanically forces the researcher's inline
  skeleton to treat surface-gated headings as conditional/emit-when-present
  rather than literal lines — the same discipline the five proposal agents
  already follow — and is the source-level guard that makes "the researcher is
  surface-gated" real (Check 14 only catches leaks at *output* time, and only in
  a repo where the surface is absent). Consequence: the researcher's current
  fenced skeleton, which hardcodes `## Public API surface` and `## Data model` as
  literal lines, must be restructured so those (and any new per-surface inventory
  headings) are gated, not literal — implementation work this change takes on.

- [x] **PQ6 — undeclared-but-evidenced surface (emergent):** The researcher
  reads the actual code, so it may find evidence of a surface (e.g. DB calls)
  that the repo's `## Repo surface` block declares absent. Should it (a) report
  the discrepancy as a factual note under a non-gated heading (e.g.
  `## Notable discrepancies`) and leave the declare-it decision to the human /
  a `/qrspi:stack` refresh, (b) also emit an explicit recommendation to run
  `/qrspi:stack` (crosses into the recommendation territory the R contract
  forbids), or (c) treat the surface block as merely advisory and emit the full
  inventory section whenever code evidence is found (undermines the
  declared-surface-driven premise and re-risks Check 14)?
  Options: (a) report discrepancy as fact, (b) report + recommend /qrspi:stack,
  (c) treat block as advisory.
  **Answer: (a) report discrepancy as fact.** The `## Repo surface` block is
  authoritative for section-gating; the researcher stays factual-only and
  ticket-blind, emitting a `## Notable discrepancies` note (non-gated heading)
  only when it finds code evidence of a surface declared absent. The decision to
  actually declare the surface belongs to the human or a `/qrspi:stack` refresh.
  This prevents surface-gating from silently swallowing a real code finding
  while keeping the block authoritative (so absent surfaces omit their gated
  section, keeping Check 14 clean).
