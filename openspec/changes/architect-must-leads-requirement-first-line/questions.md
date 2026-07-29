# Questions — architect-must-leads-requirement-first-line

> Stage Q of QRSPI. Generated 2026-07-28.
> Change summary: Fix a late-failing gotcha where the architect (stage S) authors
> requirement bodies that begin with a `When …` clause, placing `MUST`/`SHALL` on
> line 2, which passes non-strict lint but hard-stops the Implement stage at the
> `openspec validate --strict` slice gate.

<!--
  Surface-gated sections: this repo's ## Repo surface block lists slash-command,
  stage-agent, skill, lint-gate, template, and migration-manifest. None of these
  map to data-store / http-api / ui / auth. The standard CRUD sections are omitted
  entirely (no heading, no body). Sections below are shape-driven for a
  stage-agent + template + lint-gate change.
-->

## Stage-agent surface (`claude/agents/architect.md`)

1. The architect's inline skeleton for a new-capability requirement already shows
   `The system MUST ...` on the first body line. Is the `MUST`-on-first-line rule
   stated **explicitly** anywhere in `architect.md`'s prose body, or does it live
   only in the table row and the one-sentence note in the "Format rules" section?
   Which file location(s) does the fix need to touch?

2. The "Format rules" block in `architect.md` states: "The **first line** of every
   requirement body MUST contain `MUST` or `SHALL`." But this note appears only
   in the delta-spec quick-reference table, which the architect reads when writing
   specs. Does it also appear in the free-text prose guidance the architect reads
   before reaching the table? If not, is that the gap that needs closing?

3. The observed failure pattern is: architect writes `When X …,\nthe system MUST …`
   (the `When` clause is on the first line and `MUST` lands on the second). Is this
   pattern ever semantically correct -- i.e., is there any valid reason to open a
   requirement body with a `When` clause rather than with `MUST`/`SHALL` directly?
   If yes, what is the correct encoding that keeps `MUST` on line 1?

4. The architect has two invocation modes (S = Structure, V = Slices). The
   MUST-on-first-line rule applies only in **S mode**, when spec files are written.
   Does the fix need to be scoped to the S-mode section in `architect.md`, or
   should it appear at the top of the file where it applies to both modes (since V
   does not touch spec files)?

5. The architect is the only agent that writes delta spec files today. The
   `spec-syncer` helper also edits specs under `openspec/specs/`, but it operates
   on already-merged base specs (not delta files under `changes/<id>/specs/`). Does
   the `spec-syncer` need an analogous MUST-leads note in its own agent file, or
   does the rule only apply to delta authoring?

## Template surface (`openspec-templates/spec-delta.template.md`)

6. The `spec-delta.template.md` already includes a "Format rules" section with the
   MUST/SHALL first-line rule. Does the template's wording and placement make the
   rule prominent enough that an agent reading it would not produce the `When …`
   pattern? Is there a structural change to the template (e.g., moving the rule
   higher, bolding it separately, adding a counter-example) that would make it
   harder to miss?

7. The delta template shows only the positive example `The system MUST ...`. Should
   the template also include an explicit **counter-example** showing the forbidden
   `When X …, the\nsystem MUST …` pattern, so the correct form is unambiguous? If
   yes, where in the file -- in the skeleton itself, or only in the "Format rules"
   section?

8. The `questions.template.md` and other templates are independent of the spec
   authoring rules. Is `spec-delta.template.md` the only template that needs
   updating, or does any other template (e.g., `proposal.template.md`) contain
   guidance about how to write requirement bodies that would also need updating?

## Lint-gate surface (`scripts/lint.mjs`)

9. The current lint script (`scripts/lint.mjs`) runs `openspec validate` at CI time
   via Check 6 or as a manual step, but does the kit's lint script itself parse
   delta spec files and assert the first-line MUST/SHALL rule? In other words, does
   a new lint check duplicate logic already in `openspec validate --strict`, or does
   it provide an earlier, more actionable signal?

10. The `openspec validate --strict` flag enforces the first-line MUST/SHALL rule.
    Does the current `node scripts/lint.mjs` call `openspec validate --strict` (or
    `--all`) on the committed change artifacts, or does it rely on the orchestrator
    to run `openspec validate <id> --strict` manually after S-commit? What is the
    current CI invocation in `.github/workflows/`?

11. If a new lint check (e.g., Check 20) were added that scans every
    `openspec/changes/*/specs/**/spec.md` for requirement bodies whose first line
    does not contain `MUST` or `SHALL`, what exactly would it scan? Specifically:
    (a) which files (delta specs only, or also base specs under `openspec/specs/`),
    (b) which sections (`## ADDED` and `## MODIFIED` only, since `## REMOVED`
    requirements have no body requirement), and (c) what constitutes "the first
    line" of a requirement body -- the line immediately after the `### Requirement:`
    heading, ignoring blank lines?

12. The existing Check 18 (`MODIFIED SCENARIO COUNT GUARD`) already parses delta
    spec files under `openspec/changes/*/specs/**/spec.md` using a per-requirement
    parser. Is that parsing logic extractable / reusable for a new check, or would
    a new check need to re-implement its own requirement-body parser?

13. The lint script runs in CI over the committed working tree. A new MUST-leads
    lint check would catch the failure at the **S-commit** step (when the architect
    commits `proposal.md` + `specs/`), rather than at the I-stage slice gate. Is
    the commit step the correct detection point? Are there any delta spec files
    legitimately committed before the architect runs `openspec validate --strict`
    (e.g., manually authored interim commits) that would cause false positives?

14. If the lint check fires, what is the correct error message format to match the
    existing check conventions in `lint.mjs`? For example: `[must-leads]
    openspec/changes/<id>/specs/<cap>/spec.md: Requirement "<name>" -- first line
    does not contain MUST or SHALL`. Does the check number become Check 20, or does
    it slot into an existing gap?

15. Adding a new lint check requires adding an inline self-test (see Check 14, which
    includes an inline self-test asserting the detector fires on a synthetic
    fixture). What would the synthetic fixture look like for the MUST-leads check,
    and where does it live -- as an in-memory string inside `lint.mjs`, or as a
    fixture file?

## Testing

16. There is no unit test framework beyond `node scripts/lint.mjs`. If a new lint
    check is added, the self-test block inside `lint.mjs` (pattern established by
    Check 14) is the mechanism for verifying correctness. What specific cases must
    the self-test cover: (a) a `### Requirement:` body whose first line is
    `The system MUST …` (should pass), (b) a body whose first line is `When X …`
    with `MUST` on line 2 (should fail), and (c) a `## REMOVED` requirement (should
    be skipped, since removed requirements have no body constraint)?

17. The architect instruction change (guidance prose in `architect.md` and/or
    `spec-delta.template.md`) has no automated test coverage today. The only
    verification path is (a) the dogfood flow -- a human runs `/qrspi:structure`
    on a real change and verifies the generated specs pass `openspec validate
    --strict`, and/or (b) the new lint check (if added) catches a deliberately
    broken delta spec in the self-test. Are there any additional tests warranted
    for the instruction change, or are dogfood + lint self-test sufficient?

18. The `spec-sync-contract` change (archived 2026-07-28) already surfaced the
    three-requirement failure case. Should the self-test for the new lint check
    use a multi-requirement fixture (two ADDED requirements, one violating, one
    passing) to verify the check does not short-circuit on the first finding?

## Sequencing & scope

19. The backlog row states "fix, cheapest first: (1) architect.md / spec-delta.template.md
    guidance; (2) optionally a lint check." Are options (1) and (2) intended as
    two separate QRSPI changes, or should they ship as one change? What determines
    the boundary?

20. The `researcher-apply-surface-gate` idea (P2) was surfaced for the same root
    cause pattern -- "artifact-authoring gate fires late at stage I" -- as this
    change. Does shipping this change first create any ordering dependency with
    `researcher-apply-surface-gate`, or are they independent?

21. The `spec-anchored-code-comments` change (P1) intends to give specs stable
    requirement ids. If those ids land before this change, would the new lint
    check's error message benefit from citing a requirement id? Is there any
    integration point, or are the two changes independent?

22. The `standardize-backlog-format` idea (P2) includes a lint check for backlog
    schema. This change also adds a lint check. Does lint check numbering need to
    be coordinated between concurrent changes, or is it first-in-wins (each change
    picks the next available number at S-commit time)?

23. If only the agent/template guidance fix lands (option 1 without the lint check),
    what is the remaining exposure? Specifically: is there any CI gate that catches
    the MUST-on-line-2 pattern before the Implement-stage slice gate, or does the
    gap remain until `openspec validate --strict` runs during I?

## Open product questions (for the human)

- [x] **PQ1 — scope (guidance vs. lint):** Should this change deliver *both*
  the architect/template guidance fix (option 1) *and* a new `scripts/lint.mjs`
  check (option 2), or only option 1? Options:
  (a) Both in one change -- the lint check catches regressions automatically and
  fires at S-commit, making option 1's prose hardening self-testing
  (Recommended),
  (b) Option 1 only now, option 2 as a separate follow-on -- ship the cheap
  guidance fix immediately without the lint engineering,
  (c) Option 2 only -- skip the prose change and rely solely on the mechanical
  guard. Note: if PQ1 = (a), PQ3's "which files change?" answer must
  include `scripts/lint.mjs`.
  **Answer: (a) Both in one change — the guidance fix (architect.md + template)
  and a new `scripts/lint.mjs` check ship together, so `scripts/lint.mjs` is in
  the changed-files set.**

- [x] **PQ2 — agent fix location:** Where in `architect.md` should the MUST-leads
  instruction be added? Options:
  (a) In the free-text prose guidance immediately before the delta-spec
  skeleton, as a bolded warning paragraph (Recommended) -- most visible
  when the architect reads its own instructions top-to-bottom,
  (b) Only in the quick-reference table row (the `Body` row already says
  "**first line** has MUST/SHALL") -- no prose change, rely on the table,
  (c) Both -- the table row gets a counter-example and a prose note is
  added before the skeleton.
  **Answer: (a) A bolded prose warning paragraph immediately before the
  delta-spec skeleton.**

- [x] **PQ3 — template counter-example:** Should `spec-delta.template.md` be
  updated to include an explicit forbidden-pattern counter-example (the
  `When X …` form) alongside the permitted `The system MUST …` form? Options:
  (a) Yes -- add a brief counter-example in the "Format rules" section so
  the architect cannot misread the rule (Recommended),
  (b) No -- the existing rule statement is already clear; adding a counter-
  example increases template length for minimal gain.
  **Answer: (a) Yes — add a brief forbidden-pattern counter-example in the
  "Format rules" section.**

- [x] **PQ4 — lint check placement:** If a lint check is added (PQ1 = (a) or (c)),
  should it scan *only* delta specs under `openspec/changes/*/specs/` (i.e.,
  files the architect writes during stage S), or also base specs under
  `openspec/specs/` (which the spec-syncer merges into)? Options:
  (a) Delta specs only -- base specs are produced by the spec-syncer from
  validated deltas, so if the delta passes the check the base will too
  (Recommended),
  (b) Both delta and base specs -- belt-and-suspenders; catches any
  manually authored base specs that violate the rule,
  (c) Only base specs -- the definitive source of truth; skip the delta
  layer.
  **Answer: (b) Both delta and base specs — the check scans
  `openspec/changes/*/specs/**/spec.md` AND `openspec/specs/**/spec.md` so a
  manually authored base spec violating the rule is also caught.**

- [x] **PQ5 — migration manifest:** This change touches `claude/agents/architect.md`,
  `openspec-templates/spec-delta.template.md`, and optionally `scripts/lint.mjs`.
  The kit's `scripts/lint.mjs` Check 6 requires a `migrations/<version>.yaml`
  for every `## [X.Y.Z]` CHANGELOG entry at or above the floor version. Should
  this change ship with a migration manifest entry (i.e., does it change any
  file that a consumer repo's `openspec/` workspace needs to update), or is
  it a kit-internal change with no migration impact? Options:
  (a) No migration manifest needed -- the changed files (`claude/agents/`,
  `openspec-templates/`, `scripts/`) are kit source files, not consumer
  workspace files; a consumer installing a new plugin version gets the fix
  automatically (Recommended),
  (b) A migration manifest entry is needed -- identify which, if any,
  consumer-side files (e.g. a locally copied template) would need editing.
  **Answer: (a) No migration manifest needed — the changed files are kit source
  (`claude/agents/`, `openspec-templates/`, `scripts/`), delivered by a plugin
  update. If the release's CHANGELOG entry still requires a manifest per Check 6,
  ship a no-action stub (non-empty summary, empty `automated`/`manual`).**
