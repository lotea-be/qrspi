# Questions -- standardize-backlog-format

> Stage Q of QRSPI. Generated 2026-07-29.
> Change summary: Freeze `openspec/backlog.md`'s ad-hoc shape with a canonical
> `openspec-templates/backlog.template.md` template seeded by `/qrspi:init`, plus
> a new `scripts/lint.mjs` Check over the backlog's row heading shape, status enum,
> and required section structure -- deferring the heavier per-file
> `backlog/<id>.md` model to post-1.0.

<!-- Surface-gated sections present for this repo (from qrspi-stack ## Repo surface):
     slash-command, stage-agent, skill, lint-gate, template, migration-manifest.

     Absent surfaces (no data-store, http-api, ui, auth): those section groups are
     fully omitted below.

     This change's shape is a cross-cutting schema/tooling change, so sections
     below are organized around the change's natural dimensions:
       Template surface   -> ## Template surface
       Slash-command surface -> ## Slash-command surface (init seeding + mutating commands)
       Stage-agent surface -> ## Stage-agent surface (questioner/others that write backlog rows)
       Skill surface      -> ## Skill surface (workflow skill documents the row grammar)
       Lint-gate surface  -> ## Lint-gate surface (new Check N)
       Migration manifest -> ## Migration manifest (no behavior change; assess need)
     Plus always-emitted: ## Backlog row schema (cross-cutting design questions),
     ## Testing, ## Sequencing & scope, ## Open product questions.
-->

## Backlog row schema

> ⮕ Resolved by PQ1/PQ2/PQ3/PQ4/PQ8: heading shape frozen exactly with band
> required (PQ1); status enum `{idea, proposed, in-progress, merged, bundled}` with
> free-text parenthetical suffix (PQ2); `**Why:**` **and** `**Shape:**` mandatory on
> standalone `idea`/`proposed` rows only (PQ3+PQ8) -- `bundled`/`merged`/superseded
> rows are a recognized class carrying a `>` pointer note and are body-exempt; the
> P-band preamble under `## Ideas` is a presence-only lint assertion (PQ4). Q4/Q6/Q7/Q8
> below are answered by these -- read them through the PQ answers, not their original
> open framing.

These questions establish what the frozen schema actually is -- the design space
the template and lint check must encode.

1. The current `### <id> -- \`<status>\` · **P<n>**` heading pattern is the de-facto
   row heading shape. Is this the shape to freeze exactly, or should any part change
   before we lock it? In particular: (a) single vs. double dash before the backtick
   status, (b) the `·` bullet separator between status and band, (c) whether the
   `P<n>` band is mandatory in the heading or just strongly conventional?

2. The status enum in the current backlog includes at least: `idea`, `proposed`,
   `in-progress`, `merged`, and the descriptive bundled-status strings
   (e.g. `bundled into <change> (proposed <date>)`, `proposed (change folder created
   <date>)`). Which of these are part of the official frozen enum vs. free-text
   notes? Specifically: does the lint check only validate the leading keyword
   (e.g., `idea`, `proposed`, `in-progress`, `merged`, `bundled`) and treat anything
   after that in parentheses as a free-text suffix?

3. The current backlog has three level-2 section groupings: `## In progress`,
   `## Proposed`, and `## Ideas`. Are these the canonical frozen set? Should a
   `## Merged` section be added (for rows awaiting archive cleanup), or is "merged"
   status always removed immediately by `/qrspi:archive`?

4. Under the current schema, every idea row has a `**Why:**` body paragraph. Is
   this the only mandatory body field? The backlog.md also carries a `**Shape:**`
   paragraph in many rows -- is `**Shape:**` optional (encouraged but not linted)?

5. Cross-refs use `[[wikilink]]` syntax throughout (e.g. `[[backlog-prioritization]]`).
   Should the lint check assert that all `[[...]]` targets resolve to an existing
   row id in the same file (or an archived change folder), or is wikilink resolution
   out of scope for the lint Check?

6. The `## In progress` and `## Proposed` sections carry narrative "Next up" and
   "Road to 1.0" prose blocks in blockquote (`>`) form. Are these narrative blocks
   part of the frozen schema (must appear; lint allows them), or are they
   change-specific editorial that the template should omit with a placeholder
   comment? Alternatively, are they entirely out of scope for the lint check (it
   only validates row headings, not surrounding editorial prose)?

7. The P-band (`P1`/`P2`/`P3`) is informally defined in the `## Ideas` section
   preamble with a three-sentence description. Is the preamble text itself part of
   the frozen schema (the template should include the canonical preamble verbatim),
   or only the heading shape and band value on each row?

8. Rows for bundled/superseded items (e.g.
   `### orchestrator-context-budget-gate -- \`bundled into orchestrator-context-budget (proposed 2026-07-28)\` · **P2**`)
   still appear in `## Ideas` with descriptive blockquote notes. Should the frozen
   schema include a canonical form for bundled rows, or is a bundled row just any
   row whose status keyword is `bundled`?

9. The "Road to 1.0" block in the current backlog is a large `>` blockquote under
   the `## Ideas` intro. Is this block editorial (not linted) or should the template
   include a placeholder for it? What happens to it post-1.0 -- does it stay,
   get removed, or shift to a `## Archived narrative` section?

## Slash-command surface

These questions cover which commands write backlog rows and how they must stay
consistent with the frozen schema after this change lands.

10. `/qrspi:questions` flips a row from `idea` to `proposed (change folder created
    <date>)`. After schema freeze, should this command produce the frozen heading
    shape mechanically (the questioner subagent writes the exact pattern the lint
    check expects), or is the current prose-driven approach sufficient given the lint
    check will catch deviations on commit?

11. `/qrspi:archive` removes a row entirely. No schema change needed, but should the
    archive command verify the row was well-formed (passes the new lint check) before
    removing it, as a "clean exit" invariant?

12. `/qrspi:pr`, `/qrspi:followup` (P3 promote path), and the Q/D/S "capture deferred
    work" flow all append new `idea` rows. After schema freeze, do these commands need
    to be updated to produce the exact frozen heading format, or does the downstream
    lint check on commit serve as sufficient enforcement?

13. The backlog row for `idea-capture-command` notes it is a "natural writer for the
    schema this change defines." Is `/qrspi:idea` (a new dedicated command for
    appending well-formed idea rows) in scope for this change, or explicitly deferred
    as a follow-on?

## Stage-agent surface

14. The questioner subagent (stage Q) writes the status-flip from `idea` to
    `proposed (change folder created <date>)` in `openspec/backlog.md` atomically
    with `questions.md`. Does the questioner need to carry the frozen row grammar
    inline (as a canonical string it formats), or is the current prose guidance in
    `claude/agents/questioner.md` and the workflow skill sufficient?

15. The designer (stage D) and architect (stage S) may append new `idea` rows via
    "Capturing deferred work." After schema freeze, should their subagent files carry
    an explicit row-format snippet (e.g. a fenced example of the canonical heading
    shape) so they produce lint-clean rows, or is a reference to the template +
    workflow skill sufficient?

16. No stage agent directly reads `openspec/backlog.md` as a primary input artifact
    (the read-matrix forbids it at most stages). Does the new backlog schema need to
    be referenced in any agent's `> **Read contract**` banner, or is it out of scope
    for the per-agent read matrix entirely?

## Skill surface

17. The `workflow` skill (`claude/skills/workflow/SKILL.md`) is the current home of
    the backlog row grammar (under "Before Q -- the backlog" and "Backlog atomicity").
    After schema freeze, should the `workflow` skill's row-grammar prose be updated
    to reference the canonical template (`openspec-templates/backlog.template.md`) as
    the authoritative source, or should the prose remain self-contained?

18. The `workflow` skill describes the row heading pattern as:
    `### <id> -- \`<status> (<note>)\`` but the actual backlog has entries without
    parenthetical notes (e.g. `### spec-anchored-code-comments -- \`idea\` · **P1**`).
    Should the `workflow` skill prose be corrected/aligned with the frozen template
    as part of this change, or tracked separately?

19. Should a new skill (e.g. a `backlog-schema` or an update to `workflow`) carry the
    frozen row grammar as the authoritative reference that both the template and the
    lint Check cite, rather than keeping the schema only in the template file?

## Lint-gate surface

20. The new lint Check will be numbered Check 22 (the next available number after
    Check 21). What should its scope be? Options: (a) validate every `### ` heading
    in `openspec/backlog.md` matches the `### <id> -- \`<status>\` · **P<n>**`
    pattern; (b) additionally assert required body content (`**Why:**` is present);
    (c) additionally validate that each row sits under the correct `##` section
    matching its status keyword; (d) validate the three `##` section headings are
    present; (e) some subset of the above.

21. Should the new Check run a self-test (an inline synthetic fixture, like Checks
    14 and 15 do) to assert it fires on a malformed row? Is a self-test mandatory for
    all new Checks per kit convention, or only for Checks where the detection logic
    is non-trivial?

22. Hard-fail vs. warn: should the new Check exit 1 immediately on any backlog
    violation (the same behavior as every other Check), or should it emit warnings
    for rows that look like bundled/superseded entries with atypical status strings
    and only hard-fail on the clearly canonical rows?

23. Should the lint Check assert anything about the P-band token (`**P1**`,
    `**P2**`, `**P3**`) -- e.g., that it is one of the three valid values and is
    bold-formatted -- or only validate the id/status/separator portion of the heading?

24. Should the lint Check validate the `## In progress`, `## Proposed`, and
    `## Ideas` section headings are present (at minimum as an ordered triple), or
    only validate individual row headings wherever they appear?

25. The `workflow` skill note under "Backlog atomicity" says the row heading
    backtick-status and section grouping are the only structured fields (no separate
    `Status:` body line). Should the lint Check actively assert there is NO
    `Status:` or `Next QRSPI command:` body line (forbid the body-line form) as a
    companion invariant?

26. After this change, Check 14 (surface applicability of artifact headings) scans
    `openspec/changes/**` excluding archive paths. Does `openspec/backlog.md` fall
    outside Check 14's scan scope (it is not under `openspec/changes/`), or does
    Check 14 need to be aware of the backlog file?

## Template surface

27. The template should live at `openspec-templates/backlog.template.md`. Should it
    include a row-format legend comment (like `questions.template.md` carries a
    `<!-- How to use: ... -->` block), or only the structural skeleton (section
    headings + one example row per section)?

28. Should the template include a sample `## Ideas` intro paragraph (the P1/P2/P3
    band definitions) as canonical text that `/qrspi:init` seeds verbatim, or as a
    placeholder comment the human fills in?

29. Should the template include the "Next up" and "Road to 1.0" blockquote
    placeholder, or omit it (those are editorial, not structural)?

30. Does `/qrspi:init` currently read `openspec-templates/backlog.template.md` and
    seed it as `openspec/backlog.md` in consumer repos, or does it use a hard-coded
    embedded template? If the latter, how is the seeding path updated -- does
    `claude/commands/init.md` need to be updated to reference the template file?

31. Check 3 (heading alignment) currently asserts that canonical section headings
    from each `openspec-templates/*.template.md` also appear in the corresponding
    inline skeleton in the relevant agent file. Is there an agent file that renders
    `backlog.template.md`? If not, does Check 3 need a new mapping for the backlog
    template, or does it only apply to agent-skeleton pairs?

32. The existing templates (`questions.template.md`, `design.template.md`, etc.)
    all map to a specific QRSPI stage agent that carries their skeleton. The
    `backlog.template.md` does not map to a single agent. How should Check 3's
    heading-alignment check handle it -- assert it against the `workflow` skill
    prose, or simply exempt the backlog template from Check 3?

## Migration manifest

> ⮕ Resolved by PQ7: a migration manifest **is** in scope -- an **additive-only**
> `edit-file` `migrations/<next-version>.yaml` that adds canonical section headings
> if absent and inserts the legend/preamble, never rewriting existing consumer rows.
> This overturns Q33's "does it require a manifest" framing (it does) and Q34 option
> (c) "no manifest / opt-in". Requires a version bump at release. Q35 (is `edit-file`
> sufficient for an additive legend/preamble insert) is now a live D/S design question.

33. This change ships no user-visible behavior change (commands work the same; the
    template is additive; the lint check adds a new gate). Does it require a
    migration manifest entry (a new `migrations/<next-version>.yaml`) to update
    consumer repos' `openspec/backlog.md` to the frozen shape, or is the template
    seeded only for new repos (consumers keep their existing backlog as-is)?

34. If a migration manifest is needed, what action should it perform? Options:
    (a) an `edit-file` step adding the canonical section headings if any are missing;
    (b) a lint-and-report step noting which rows are malformed (human fixes manually);
    (c) no migration manifest (opt-in at next `/qrspi:init` run). Note that existing
    consumers may have heavily customized their `backlog.md` rows; a blind rewrite
    risks data loss.

35. The current migration manifests (`migrations/*.yaml`) use only `edit-file`
    actions. If the backlog migration requires a more complex operation (like
    appending a legend comment without touching existing content), is `edit-file`
    sufficient, or does the migration manifest schema need to be extended?

## Testing

36. The new lint Check is the primary testing surface. Should the Check carry an
    inline self-test fixture (a synthetic multi-line string simulating a
    well-formed and a malformed `openspec/backlog.md`) that asserts the check fires
    on the malformed case and passes on the well-formed case -- consistent with the
    pattern used by Checks 14, 15, and 21?

37. Should the self-test fixture cover the bundled-status edge case (a row whose
    status starts with `bundled`) to ensure the check does not false-positive on
    those rows?

38. After this change, `node scripts/lint.mjs` should pass on the existing
    `openspec/backlog.md` without modification. Should the first slice verify this
    by (a) writing the Check that passes on the current backlog as-is, then (b) in
    a separate step, tightening it to catch known violations; or should the Check
    be written to the final spec in one pass and the current backlog be
    simultaneously updated to be compliant?

39. The template itself has no automated test beyond the lint Check 3 heading-
    alignment check. Is that sufficient, or should the new Check also validate that
    `openspec-templates/backlog.template.md` exists as a presence assertion?

## Sequencing & scope

40. This change is Tier 1.5 in the road-to-1.0 runway. The runway note says
    `bump-openspec-pin` (Tier 1.75) "has no hard order vs. Tier 1.5 -- both are
    cheap pre-rename readiness." Should `standardize-backlog-format` land before,
    after, or in parallel with `bump-openspec-pin`, and does either change touch
    files the other also touches (e.g. `migrations/*.yaml`, `openspec/backlog.md`,
    `scripts/lint.mjs`)?

41. The `idea-capture-command` backlog entry says it is a "natural writer for the
    schema this change defines." Is `/qrspi:idea` explicitly deferred to a separate
    change after `standardize-backlog-format` merges, or is there any part of it
    that should land here (e.g. a command stub)?

42. The `backlog-prioritization` entry notes the P1/P2/P3 band convention this
    change encodes. That entry is itself an `idea` row in the backlog. After this
    change lands and freezes the P-band convention in the schema, is
    `backlog-prioritization` fully addressed and archivable, or does it still carry
    residual scope (e.g. the self-maintaining re-rank proposal)?

43. The `standardize-recurring-ops-scripts` idea mentions "flip a backlog entry's
    status" as a candidate recurring op to extract to a Node script. Does this
    change create any new recurring ops (e.g., a `scripts/backlog-add-row.mjs`
    helper) that would later be candidates for that extraction?

44. This change adds Check 22 to `scripts/lint.mjs`. Does the README's Check list
    or any other documentation reference the current Check count (21) in a way that
    needs updating, beyond the in-file comment block?

## Open product questions (for the human)

- [x] **PQ1 -- row heading shape:** The current heading pattern is
  `### <id> -- \`<status>\` · **P<n>**`. Should this exact pattern be the frozen
  canonical shape, or should any part change before locking (e.g., band optional
  vs. required, separator character)?
  Options:
  (a) Freeze the current pattern exactly, band required -- (Recommended) matches
  every non-bundled row in the current backlog with no edits needed,
  (b) Make the band optional in the heading (lint warns but does not fail if absent)
  -- relaxed; harder to enforce the convention,
  (c) Change the separator (e.g., drop the `·`) -- cosmetic; requires a backlog
  cleanup pass before merge.
  **Answer: (a) Freeze the current pattern exactly, band required.**

- [x] **PQ2 -- status enum and free-text suffix:** Which tokens are the official
  frozen status enum, and how should the lint check treat the parenthetical
  free-text suffix (e.g., `proposed (change folder created 2026-07-29)`)?
  Options:
  (a) Official enum is `{idea, proposed, in-progress, merged, bundled}`; lint
  validates the leading keyword only and treats everything after it in parens as
  free-text -- (Recommended) matches the current backlog without edits,
  (b) Official enum is exactly the keyword, no suffix allowed -- requires stripping
  existing parenthetical notes from all current rows,
  (c) Full string is enumerated (each descriptive form is a valid enum value) --
  brittle; too many variants to enumerate exhaustively.
  **Answer: (a) Enum `{idea, proposed, in-progress, merged, bundled}`; lint
  validates the leading keyword only, parenthetical suffix is free-text.**

- [x] **PQ3 -- mandatory body fields:** Is `**Why:**` the only mandatory body field
  the lint check enforces, or should `**Shape:**` also be required?
  Note: if PQ3 requires `**Shape:**`, many current rows that lack it would fail lint
  until updated -- this dependency affects PQ3's answer.
  Options:
  (a) Lint requires only `**Why:**` -- (Recommended) matches current rows as-is,
  (b) Lint requires both `**Why:**` and `**Shape:**` -- requires a backlog cleanup
  pass; more prescriptive,
  (c) Lint requires neither (heading shape only) -- minimal; the `**Why:**`
  convention lives only in the template as guidance.
  **Answer: (b) Lint requires both `**Why:**` and `**Shape:**` -- SCOPE IMPACT: a
  backlog cleanup pass to backfill `**Shape:**` on standalone rows lacking it is now
  in scope. Refined by PQ8 (which rows this applies to).**

- [x] **PQ4 -- narrative blocks (lint scope):** The `## Ideas` section carries a
  P-band preamble paragraph and the "Road to 1.0" blockquote. Should the lint
  check assert anything about these blocks, or treat everything between the
  `## <section>` heading and the first `### ` row heading as editorial free text
  the check never touches?
  Options:
  (a) Everything between a `##` heading and the first `###` row is editorial --
  lint ignores it -- (Recommended) cleanest; the P-band preamble stays as-is,
  (b) Lint asserts the P1/P2/P3 preamble is present in `## Ideas` (presence-
  only check) -- ensures the convention is always documented in the file,
  (c) Lint validates the preamble text matches a canonical string -- too brittle;
  the narrative evolves.
  **Answer: (b) Lint asserts the P1/P2/P3 preamble is PRESENT under `## Ideas`
  (presence-only, not text-match). DEPENDENCY: the seeded template (PQ5) must carry
  the canonical preamble so a freshly-seeded backlog passes this check.**

- [x] **PQ5 -- template content:** What should `openspec-templates/backlog.template.md`
  contain beyond the three section headings and a sample row?
  Options:
  (a) Section headings + sample row per section + `<!-- legend -->` comment block
  explaining the heading grammar (like `questions.template.md`'s How-to-use block)
  -- (Recommended) self-documenting for new consumer repos,
  (b) Section headings + sample row only, no legend comment -- minimal,
  (c) Full canonical preamble for `## Ideas` (P-band definitions) seeded verbatim
  by `/qrspi:init` -- prescriptive; forces every consumer to carry the same preamble.
  **Answer: legend + canonical preamble -- section headings + sample row(s) carrying
  `**Why:**` + `**Shape:**` + a `<!-- legend -->` grammar comment + the canonical
  P1/P2/P3 preamble verbatim (combines (a) and (c); required by PQ4's presence-check).**

- [x] **PQ6 -- init seeding:** Does `/qrspi:init` currently read template files from
  `openspec-templates/` and seed them into `openspec/` in consumer repos? If so,
  should `backlog.template.md` be seeded as `openspec/backlog.md` only when no
  `backlog.md` exists (additive), or should `/qrspi:init` always offer a refresh
  (detect existing + ask)?
  Options:
  (a) Seed only if `openspec/backlog.md` is absent; skip silently if it exists --
  (Recommended) safe; existing consumers keep their backlog,
  (b) Always offer a refresh (AskUserQuestion: seed / skip) -- like the stack skill
  "Read it first -- this is a refresh" pattern; adds friction for existing repos,
  (c) Do not seed via `/qrspi:init` at all; the template is reference-only --
  simplest to implement; relies on human discovery.
  **Answer: (a) Seed only if `openspec/backlog.md` is absent; skip silently if it
  exists. R stage to confirm how `/qrspi:init` currently seeds templates.**

- [x] **PQ7 -- migration manifest:** Should this change ship a migration manifest
  entry for existing consumer repos, or is the template + lint check purely
  forward-looking (new repos get it from `/qrspi:init`; existing repos are not
  touched)?
  Note: if PQ7 ships a migration manifest, it must increment the plugin version at
  release time and needs a `migrations/<next-version>.yaml`.
  Options:
  (a) No migration manifest -- template and lint are purely forward-looking --
  (Recommended) zero risk of corrupting existing consumer backlogs,
  (b) Migration manifest that adds the canonical section headings if absent and
  inserts a legend comment -- additive-only; safe but complex to author as
  `edit-file` steps,
  (c) Migration manifest that reports malformed rows without editing (lint-and-
  report mode) -- requires a new manifest action type beyond `edit-file`.
  **Answer: (b) Additive `edit-file` migration manifest that adds canonical section
  headings if absent + inserts the legend/preamble -- additive-only, no destructive
  rewrite of existing rows. SCOPE IMPACT: needs a `migrations/<next-version>.yaml`
  and a version bump at release time. D/S to design the additive-only edit steps
  carefully (must not clobber customized consumer rows).**

- [x] **PQ8 (emergent from PQ3) -- which rows must carry `**Why:**` + `**Shape:**`:**
  PQ3 makes both body fields mandatory, but bundled/superseded/merged rows today
  carry a `> Bundled into <change>` blockquote pointer instead of a full body.
  Which rows must carry the full body?
  Options:
  (a) Only `idea` + `proposed` rows (live, not-yet-started scope) carry Why+Shape;
  `bundled`/`merged`/superseded rows are a recognized row class carrying a blockquote
  pointer note instead,
  (b) All rows including bundled require Why+Shape -- forces backfilling bodies onto
  pointer rows,
  (c) Only `idea` rows require it.
  **Answer: (a) -- bundling several ideas into one QRSPI run is a first-class,
  tracked concept (see [[propose-bundling-ideas]]), so `bundled` is a legitimate row
  state. The frozen schema must define a CANONICAL bundled-row form (the
  `bundled into <change> (<date>)` status + `>` pointer note) that is EXEMPT from the
  Why+Shape body rule; Why+Shape is required only on standalone `idea`/`proposed`
  rows. D stage: reconcile this bundled-row form with what `propose-bundling-ideas`
  would later produce.**
