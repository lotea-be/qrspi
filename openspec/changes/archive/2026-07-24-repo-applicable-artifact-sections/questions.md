# Questions — repo-applicable-artifact-sections

> Stage Q of QRSPI. Generated 2026-07-24.
> Change summary: Make every artifact-producing QRSPI stage (Q/D/S/P/PR) emit
> only sections and checklist items that apply to the actual repo surface,
> driven by the `<repo>-stack` cheatsheet, so CRUD/web boilerplate never
> appears in a docs/prompt/plugin repo like this kit.

## Scope reminder

This repo is a Claude Code plugin: markdown command/agent/skill/template files,
a Node lint script, and docs. There is no data store, HTTP API, web UI,
auth system, or migration surface. The sections below fit this shape.

---

## Source inventory — Part A (fixed section/checklist skeletons)

These questions map to the nine files that bake in the CRUD/web skeleton today:
`claude/agents/questioner.md`, `claude/agents/designer.md`,
`claude/agents/architect.md`, `claude/agents/planner.md`,
`claude/agents/reviewer.md`, and
`openspec-templates/{questions,design,proposal,tasks}.template.md`.

1. In `questioner.md`, the inline "What to do" step 6 lists a fixed area
   menu (Data model, Indexing, API surface, State, Migrations, Auth) and the
   inline "What to write" skeleton carries those same headings. Which of
   those two locations is the canonical source that the agent actually follows
   at runtime — the prose bullet list, the skeleton, or both independently?

2. In `openspec-templates/questions.template.md`, the note reads "For sections
   that don't apply, keep the heading and write `*Not applicable.*` plus a
   one-line rationale — do NOT silently drop them." This rule is explicitly
   OVERRIDDEN by this change for repo-level surfaces. What is the exact
   replacement rule? Options: (a) "Sections for surfaces the repo does not
   have are simply omitted — no heading, no N/A stanza"; (b) same as (a) but
   add a per-change grace: sections inapplicable for *this* change but
   *possible* in this repo still get a heading with "N/A for this change" note.

3. The `questioner.md` inline skeleton and the template file
   (`openspec-templates/questions.template.md`) must agree. Should they share
   a single authoritative block (one file references the other), or remain
   two independent copies that must both be updated when the menu evolves?

4. In `designer.md`, the design doc skeleton has dedicated sections
   `## Data model changes`, `## API surface`, `## UI surface`,
   `## Authorization` below `## Decisions`. Are these sections governed by
   the same "omit when not applicable to this repo" rule being introduced,
   or are they structural enough to the D artifact that they should stay
   but be collapsed into `## Decisions` when irrelevant?

5. In `openspec-templates/design.template.md`, are those same four sections
   (`Data model changes`, `API surface`, `UI surface`, `Authorization`)
   present as top-level headings or as examples nested inside `## Decisions`?
   (Matters for deciding whether the template needs a heading change or just
   a note update.)

6. In `planner.md`, the `tasks.md` example embeds the line
   `- [ ] 1.2 Generate the data-store migration (D6)` as a literal example
   task. Is this the only CRUD assumption baked into the planner, or does
   the planner's prose also mention other CRUD-specific steps?

7. In `openspec-templates/tasks.template.md`, are there hardcoded CRUD task
   items (migration, endpoint, entity) in the boilerplate, or is the template
   already free-form enough that the planner's prose is the only source of
   the CRUD framing?

8. In `reviewer.md`, the PR description template hard-codes:
   - `## Migrations` section (yes/no + rollback note)
   - Reviewer checklist items: "No raw SQL in feature code", "No nullable
     suppression (`!`) without justification comment", "All new endpoints use
     authorization policies where appropriate", "Migration is reversible"
   Are these four checklist items only in `reviewer.md`, or also duplicated
   in `openspec-templates/` or any other file?

9. In `openspec-templates/proposal.template.md`, what is the exact text of
   the Migrations impact line — is it `Impact — Migrations: <yes/no>` or
   something else, and is it the only CRUD-specific field in that template?

10. Across all five agent files (questioner, designer, architect, planner,
    reviewer), does any agent file load a stack cheatsheet skill at startup
    and already have hook-in code for "if the stack has no DB, skip DB
    questions"? Or do all five apply their fixed menu unconditionally today?

---

## Source inventory — Part B (CRUD/web-shaped illustrative framing)

These questions cover the softer framing in
`claude/skills/vertical-slice/SKILL.md` and `claude/skills/workflow/SKILL.md`.

11. `vertical-slice/SKILL.md` uses a concrete 4-step example
    (Mock API → Frontend → Real DB → Tests). Is there already a parenthetical
    or aside noting "this is an illustrative web-app example — your slice shape
    will differ"? Or is the example presented as a universal required structure?

12. `workflow/SKILL.md` says "Anything that touches the data model, an API
    surface, or auth must go through the full flow." In a plugin/markdown repo
    that has none of those surfaces, what is the intended full-pipeline trigger?
    Should this sentence be generalized (e.g. "anything that touches a
    durable external contract or observable behavior") or just accompanied by
    a parenthetical ("these are examples for a web-app; adapt to your repo")?

13. The researcher's guidance in `workflow/SKILL.md` says the researcher
    "maps the data model." In a plugin repo the researcher traces command
    bodies, skill load order, and lint rules instead. Is this description
    literal (and needs updating) or already understood as illustrative?

---

## Filter mechanism — the `<repo>-stack` cheatsheet

14. The `<repo>-stack` cheatsheet is proposed as the filter's source of truth.
    Does this cheatsheet already declare structured fields like
    `has_database: false` / `has_http_api: false`, or does it use prose that an
    agent would have to interpret? Concretely: does the QRSPI kit's own
    `qrspi-stack` skill exist today, or is there no stack cheatsheet for this
    repo?

15. When a stack cheatsheet exists but is silent about a surface (it neither
    asserts `has_database: false` nor mentions a database), should absence of
    mention be interpreted as "surface not present" or "surface unknown"?

16. When no stack cheatsheet exists for the repo at all, what should an
    artifact-producing stage do? Options: (a) emit the full menu with a
    warning that filtering is unavailable until `/qrspi:stack` is run;
    (b) prompt the agent to infer the surface from visible repo files (e.g.
    no `*.sql`, no ORM dep → no DB surface); (c) emit the full menu silently
    as today (minimal change for repos without a cheatsheet).

17. Should the filter mechanism be described in a single shared skill
    (e.g. an updated `qrspi-stack` skill or a new `repo-surface` helper),
    or should each of the five agent files carry its own independent
    "read the stack cheatsheet, then filter" logic inline?

18. The questioner already loads the stack cheatsheet skill ("load the
    project's stack-cheatsheet skill if it defines one") in some agents.
    Does the questioner's current step 1 already list the stack skill, or
    does only the designer/architect/reviewer list it? (This determines
    whether the questioner needs a new load step or already has one.)

---

## Rule update — the N/A heading convention

19. The current note in `openspec-templates/questions.template.md` says N/A
    headings must be kept "so stage S doesn't re-litigate whether they were
    considered." If repo-level surfaces are simply omitted, what lightweight
    signal — if any — serves the same purpose: letting stage S know a section
    was considered and dropped rather than forgotten? Options: (a) nothing —
    silence is acceptable because the stack cheatsheet is the record;
    (b) a single one-line comment block at the top of `questions.md` listing
    dropped sections; (c) a brief note in the `## Sequencing & scope` section.

20. The current rule conflates two distinct levels: "this section does not
    apply to any change in this repo" (repo-level) vs. "this section does not
    apply to this specific change" (change-level). After this fix, what is
    the rule for change-level N/A? Should a section like "Auth" that is present
    in the repo but not touched by a given change still be omitted, or still
    get a heading with "N/A for this change"?

21. The `## Open product questions (for the human)` template note instructs
    that recorded answers should append `**Answer: <response>.**` — that part
    of the template is not CRUD-specific. Should the rule-update note in the
    template clarify that only the *section menu* changes (not the
    answer-recording format)?

---

## Lint & enforcement

22. `scripts/lint.mjs` currently runs seven checks. Do any existing checks
    (e.g., Check 4 — commands vs. README cross-reference, or Check 7 —
    read-contract banners) already validate the section list in agent files?
    Or is the section list currently lint-free?

23. Is there a practical static check that would catch a future agent file
    re-introducing a hard-coded CRUD section heading (e.g. detecting the string
    `## Data model` or `## Migrations` inside an agent `claude/agents/*.md`
    file)? What would the false-positive risk be (those strings are legitimate
    in example output or prose descriptions)?

24. Should enforcement of "sections match the stack surface" be a lint-time
    static assertion, a runtime note in each agent's instructions, or both?
    Given that this repo has no CI-time access to a live stack cheatsheet
    parse, what is the realistic scope of a static check?

---

## Testing

25. The QRSPI kit's test surface is the lint script and any end-to-end dogfood
    sessions (see `qrspi-dogfood` skill). Does `scripts/lint.mjs` have a test
    harness, or is it run directly and its exit code checked by CI?

26. A dogfood session for this change would run the updated questioner on a
    test change and verify no CRUD headings appear. Is there an existing
    reference consumer fixture (outside this repo) where such a dogfood session
    could be staged, or must one be created fresh?

27. For the reviewer agent change (removing the hard-coded CRUD checklist
    items), is there an existing integration test or a PR description fixture
    that can be diffed before/after, or is manual inspection the only
    verification path?

---

## Sequencing & scope

28. `init-conductor-plus-overview` (P2 backlog idea) proposes a `/qrspi:overview`
    skill as a domain complement to the stack cheatsheet. Does
    `repo-applicable-artifact-sections` depend on `init-conductor-plus-overview`
    being implemented first, or can the filter work off the stack cheatsheet
    alone without an overview skill?

29. `spec-anchored-code-comments` (P1 backlog idea) is the other current P1
    item. Are the two changes independent (can ship in either order), or does
    one produce artifacts the other consumes?

30. Part B (framing in `vertical-slice/SKILL.md` and `workflow/SKILL.md`) is
    described in the backlog as "fix more lightly." Should Part B be included
    in this change or deferred to a follow-up? If deferred, what is the
    minimum viable edit that flags the examples as illustrative without
    restructuring the skills?

31. Should the four templates (`openspec-templates/{questions,design,proposal,
    tasks}.template.md`) be updated in the same PR as the five agent files,
    or should templates trail behind agents (since agents are the runtime path
    and templates are reference only)?

32. Are there any archived changes whose generated artifacts would serve as
    regression examples — i.e., would re-running their Q or PR stage with the
    new agents produce noticeably cleaner output — that could be used as a
    before/after demo in the PR description?

---

## Open product questions (for the human)

- [x] **PQ1 — N/A silence vs. signal:** If repo-level N/A sections are omitted
  entirely (no heading, no stanza), does stage S (the architect) need any
  lightweight explicit signal in `questions.md` that "Data model / Migrations /
  Auth were considered and dropped at the repo level," or is silence acceptable
  because the stack cheatsheet is the standing record? (Depends on PQ2 for the
  change-level case.) Options:
  (a) Silence is acceptable — the stack cheatsheet is the record, no extra
  signal needed in `questions.md` (Recommended),
  (b) Add a one-line comment block at the top of each artifact listing
  the surfaces that were filtered out,
  (c) Add a brief note in `## Sequencing & scope` naming the dropped sections.
  **Answer: (a) Silence is acceptable — no extra signal in `questions.md`; the
  `<repo>-stack` cheatsheet is the standing record of what surfaces the repo
  has. This is the whole point: omitted means gone, not gone-but-annotated.**

- [x] **PQ2 — Change-level N/A rule:** After this fix, when a section (e.g.
  "Auth") is present in the repo surface but not touched by a specific change,
  should that section still be omitted from that change's artifact, or kept
  with a "N/A for this change" note? Options:
  (a) Omit it — same rule at both levels; sections appear only when they
  carry content for this change (Recommended — consistent, minimal boilerplate),
  (b) Keep it with "N/A for this change" — preserves the original "S doesn't
  re-litigate" guard for change-level gaps,
  (c) Keep it for Auth and Migrations only, omit for Data model / API / UI
  (those three are almost always linked).
  **Answer: (a) Omit it — the same rule applies at both the repo level and the
  change level. A section appears only when it carries content for this change.
  This fully retires the "keep N/A headings so S doesn't re-litigate" rule.**

- [x] **PQ3 — No-stack-cheatsheet fallback:** When a repo has no stack
  cheatsheet at all, what should an artifact stage do? Options:
  (a) Emit the full CRUD/web menu with a visible warning block at the top
  of the artifact ("No stack cheatsheet found — run /qrspi:stack first;
  section list may include inapplicable sections") (Recommended),
  (b) Infer the surface from visible repo files (no *.sql, no ORM dep → no DB)
  and proceed silently,
  (c) Refuse to continue and instruct the user to run /qrspi:stack first.
  **Answer: (a) Emit the full menu with a visible warning block pointing to
  `/qrspi:stack`. Graceful degradation — never block a stage on a missing
  cheatsheet. See PQ7 for how this repo itself gets a cheatsheet so it isn't
  stuck on the full-menu fallback.**

- [x] **PQ4 — Part B scope:** Should the "illustrative framing" fixes to
  `vertical-slice/SKILL.md` and `workflow/SKILL.md` be part of this same PR,
  or deferred? Options:
  (a) Include in this PR — the change is described as "one big change spanning
  the pipeline" and Part B is in-scope per the backlog row (Recommended),
  (b) Defer Part B to a follow-up — keep this PR focused on the Part A
  skeleton sources (5 agents + 4 templates); Part B is "fix more lightly"
  and lower risk,
  (c) Include only the `workflow/SKILL.md` fix (the full-pipeline trigger
  sentence) in this PR, defer the vertical-slice example reframing.
  **Answer: (a) Include Part B in this PR. One big change spanning the whole
  pipeline, per the backlog row — the convention should land everywhere at
  once. Part B stays "fix lightly" (flag examples as illustrative rather than
  restructure the skills).**

- [x] **PQ5 — Lint check for CRUD headings:** Should a new `scripts/lint.mjs`
  check be added that asserts no hard-coded CRUD section headings (e.g.
  `## Data model`, `## Migrations`) appear as literal emitted text inside
  agent `claude/agents/*.md` files? Options:
  (a) Yes — add a lint check; false positives (the strings in prose or
  examples) can be handled by restricting the check to fenced-code skeleton
  blocks (Recommended),
  (b) No lint check — agent-instruction prose is too free-form to lint
  reliably; rely on PR review and dogfood sessions instead,
  (c) Add a lint check but scope it narrowly to the PR-description template
  only (the `## Migrations` section is the most structurally unambiguous).
  **Answer: (a) Yes — add a lint check, scoped to fenced-code skeleton blocks
  in the agent files to avoid false positives on legitimate prose/examples.
  Mechanically prevents a future agent re-introducing a hard-coded CRUD
  heading. (The exact detection surface is a design/S concern.)**

- [x] **PQ6 — Single shared filter skill vs. inline logic:** Should the
  "load the stack cheatsheet, then filter the section list" logic live in a
  new shared skill (e.g. an expanded `qrspi-stack` or a new `repo-surface`
  helper) loaded by all five agents, or should each agent carry its own
  inline filtering instructions? Options:
  (a) Shared skill — less duplication, a single place to update when the
  filter rule evolves (Recommended),
  (b) Inline in each agent — simpler, no new skill file, no cross-agent
  coupling; acceptable because the five agents are already coupled by
  convention not code,
  (c) Hybrid — shared skill defines the surface taxonomy, each agent inlines
  its own section-to-surface mapping (agent-specific sections vary enough
  to warrant local mapping).
  **Answer: (a) Shared skill — one authoritative place for the "load the stack
  cheatsheet, then filter the section menu" convention, loaded by all five
  agents. Whether it's a new skill or an expansion of an existing one is a
  design/S concern.**

- [x] **PQ7 — Kit self-cheatsheet (emergent, from PQ3 + Q14):** PQ3 chose the
  "no cheatsheet → full menu + warning" fallback, and this kit repo currently
  has **no** `qrspi-stack` cheatsheet — so without one, the kit's own artifacts
  would keep emitting the full CRUD menu (just warned), and the fix wouldn't
  visibly clean up the repo it ships from. Should this change also establish a
  `qrspi-stack` cheatsheet for the kit? Options:
  (a) Yes — add a `qrspi-stack` cheatsheet declaring the kit's surface
  (markdown command/agent/skill/template files + a Node lint; no DB / HTTP /
  UI / auth) as part of this change (Recommended),
  (b) No — establish it as a separate `/qrspi:stack` run outside this PR,
  (c) No — rely on the full-menu + warning fallback until someone runs
  `/qrspi:stack`.
  **Answer: (a) Yes — add a `qrspi-stack` cheatsheet for the kit in this change
  so the kit dogfoods its own fix and provides a live surface for the filter to
  act on (its artifacts then drop the CRUD sections instead of only warning).**
