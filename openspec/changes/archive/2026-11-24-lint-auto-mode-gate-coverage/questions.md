# Questions — lint-auto-mode-gate-coverage

> Stage Q of QRSPI. Generated 2026-09-19.
> Change summary: Add a `scripts/lint.mjs` Check that asserts every stage command
> references the `stage-choreography` skill and that each per-gate auto-branch is
> consistently wired, so a command that silently drops run-mode handling is caught
> at CI rather than discovered at runtime.

<!-- Surface-gated sections emitted per the repo-surface skill.
     Active surfaces: slash-command, stage-agent, skill, lint-gate, template,
     migration-manifest.
     Absent surfaces: data-store, http-api, ui, auth, typed-nullable.
     Omitted entirely: Data model, Indexing & query performance, API, UI,
     Front-end state, Auth & authorization, Migrations & data.

     This change is primarily a lint-gate change. The slash-command surface is
     also relevant (the commands being asserted). Stage-agent, skill, template,
     and migration-manifest are NOT touched by this change and are omitted
     per the surface-gate rule ("carries content for this change").
-->

## Slash-command surface

1. Which stems are the "stage commands" the new Check must cover? The existing
   Check 9 (`VERSION_CHECK_COMMAND_STEMS`) enumerates: `status`, `questions`,
   `research`, `design`, `structure`, `slices`, `plan`, `implement`, `pr`. Is
   that the exact set this new check targets, or should it also cover
   `archive` and `followup` (which carry the budget-gate embed but not the
   stage-choreography step 3 block)?

2. The `stage-choreography` load appears in every command as a literal block
   (step 3, "Load skill `stage-choreography` and follow its instructions exactly").
   Is the stable detection substring `Load skill \`stage-choreography\` and
   follow its instructions exactly` — matching the existing budget-gate and
   version-check embed patterns — or does the Check need to detect something
   richer (e.g. the *presence of the Run-mode establishment line* rather than
   the skill-load sentence)?

3. Every stage command also ends with a `**Choreography (see skill
   \`stage-choreography\` ...).**` paragraph. Should the new Check assert both
   (a) the skill-load sentence (step 3) AND (b) the tail choreography paragraph,
   or is just asserting (a) sufficient to prove the command is wired to
   run-mode?

4. `archive.md` and `followup.md` carry the budget-gate embed but load
   `stage-choreography` too (both have the step-3 block). Should those two
   be included in the new Check's stem list even though they are not "stage
   commands" per Check 9?

## Lint-gate surface

### Scope of the new Check

> ⮕ Resolved by PQ1/PQ2: scope is the 9 stage-command stems in
> `VERSION_CHECK_COMMAND_STEMS`, asserting only the `stage-choreography`
> skill-load line. Questions 6–8 (per-gate wiring) are OUT OF SCOPE per PQ2(a).

5. The backlog shape says the new Check "mirrors the existing embed-presence
   Checks (9/10) in shape". Does "mirrors in shape" mean: (a) a flat string-
   includes test over the collapsed body, identical to how Checks 9 and 10
   work — no regex, no AST, just substring; or (b) something more structural
   (e.g. assert the load line appears in numbered-step position, not in a
   comment or prose example)?

6. The per-gate auto-branch wiring is described as the second half of what the
   Check must assert. Which specific gates are in scope?
   - The per-slice checkpoint auto-advance in `implement.md` (Full/Semi auto
     suppress the inter-slice gate)?
   - The PR-create auto-advance in `pr.md` (Full/Semi auto skip the
     "Create the PR now?" question)?
   - The S-approval gate wiring in `structure.md`?
   - The commit-step and next-stage handoff auto-branches in every stage command?
   Which of these are statically checkable at all, and which require runtime
   observation?

7. For the per-gate auto-branch assertions that ARE statically checkable: what
   is the minimal anchor string whose presence proves the branch is wired? For
   example, `implement.md` wires its per-slice auto-branch by naming "If mode
   is Full or Semi auto:" followed by the slice-commit logic. Is asserting the
   substring `Full or Semi auto` inside the relevant file sufficient, or does
   the Check need to verify a specific command-file + auto-branch combination?

8. Check 5 (`checkGateExecutor`) already detects choreography references
   transitively (`CHOREOGRAPHY_MARKERS = ['Stage choreography', 'commit step',
   'next-stage handoff']`). Should the new Check reuse that helper function, or
   is it a standalone parallel check with its own detection logic?

9. What is the Check number? Checks 1–25 are taken; the next available
   number in sequence is **26**. Is 26 correct, or has another Check been
   informally reserved in the backlog?

10. Should the new Check carry an inline self-test (a synthetic fixture that
    must fire), matching the pattern Checks 14, 15, 17, 21, 22, 23, 24, and 25
    use? The embed-presence Checks 9 and 10 do NOT carry inline self-tests —
    they rely on the stem list as their self-description. Which model should
    this new Check follow?

### Auto-branch wiring — what is statically checkable

> ⮕ Resolved by PQ2: the Check is a pure embed-presence check for the
> `stage-choreography` skill-load line (option a). Per-gate auto-branch wiring
> is OUT OF SCOPE — questions 11–13 below (and 6–8 above) are superseded and
> retained only as context for a possible future change.

11. The never-suppressed gates (the D review, backlog-capture offers,
    context-budget soft gate) must NOT be auto-advanced. The Check cannot
    assert the absence of auto-advance for these gates (a substring test proves
    presence, not absence of suppression in a different code path). Should the
    Check explicitly skip these never-suppressed gates, or simply stay silent
    about them (the check only asserts the presence of wiring for the
    suppressible gates)?

12. The run-mode establishment block in every command reads:
    "Read or establish the run-mode by following its **Run-mode** procedure
    before doing any other work." Should the Check assert this specific sentence
    as a second embed line (alongside the skill-load sentence), or does detecting
    the skill-load sentence alone prove run-mode establishment?

13. Some commands carry the choreography reference only once (in the skill-load
    step 3 block) while others also carry it in the tail `**Choreography (see
    skill \`stage-choreography\` ...)**` paragraph. Should the Check require
    BOTH occurrences (as a richer invariant), or treat either one as sufficient?

### Check registration and naming

14. What label should the new Check use in its error messages? Existing embed
    checks use `[version-check-embed]` and `[budget-gate-embed]`. Candidates
    for this check: `[choreography-embed]`, `[auto-mode-gate]`,
    `[run-mode-wiring]`. Which is clearest for a developer reading a lint
    failure?

15. Where in the check-execution order should the new Check be registered?
    The comment block at the top of `lint.mjs` lists Checks 1–25 in order;
    a new check at 26 would go at the very end. Should it be inserted among
    the embed-presence checks (near 9/10) for thematic clustering, or appended
    as Check 26 at the end to avoid renumbering any existing check?

### Migration manifest

16. The `add-auto-mode` change landed at version v0.12.0 (or the equivalent
    tag when it merged). The new Check enforces a convention introduced by
    that version. Does the new Check need a migration manifest entry (e.g.
    `migrations/<version>.yaml`) to signal "existing consumers should verify
    their commands are wired before upgrading"? Or is this a pure lint-tightening
    with no consumer-facing migration concern (the Check only applies to the kit
    itself, not to consumer repos)?

## Testing

17. `scripts/lint.mjs` is the sole test surface. The new Check must be verified
    by running `node scripts/lint.mjs` on the kit repo itself. What constitutes
    a green run: (a) the check runs, finds all stage commands correctly wired,
    and prints its `OK:` line; (b) a synthetic failing fixture that must produce
    a violation, mirroring the self-test pattern of Checks 14+ — is a self-test
    fixture required, or is the live-corpus pass sufficient?

18. If an inline self-test is included: the self-test typically uses a synthetic
    in-memory fixture string that deliberately lacks the required embed and
    asserts the check catches it. Where in the function body should the self-test
    live — before any file I/O (matching Checks 14/15/17/21–25), or after?

19. The change must not regress any of Checks 1–25. Are there known interactions
    between the new Check and existing ones — particularly Check 5 (gate-tool
    executor, which already probes choreography references) — that could cause
    unexpected failures on the live corpus?

## Sequencing & scope

20. The backlog note says this change is "now unblocked — `add-auto-mode` merged
    2026-07-06". Are there any currently-in-flight changes (not archived) that
    touch `scripts/lint.mjs` or the stage command files, which could conflict
    with this change's edits? (As of the backlog read, `## In progress` is empty
    and `## Proposed` is empty, so no conflict risk is apparent — confirm.)

21. The backlog's Tier 2 description says this change "can run parallel to the
    large Tier 3 design". Does that mean Tier 3 (`spec-anchored-code-comments`)
    should be started concurrently with this change, or just that this change
    does not need to wait for Tier 3 to finish? Is there any ordering constraint
    between this change and `spec-anchored-code-comments`?

22. Should this change also update the `## Build, lint & test commands` note in
    the `qrspi-stack` cheatsheet or the README to document that the new Check
    exists? (README coverage is required by CLAUDE.md if a new Check is
    considered a "commands" change — but a lint check is not a slash command;
    the README's command table is for `/qrspi:*` commands only.) Is README
    update in scope or out of scope for this PR?

23. The Check number comment block at the top of `lint.mjs` lists every check.
    Updating that comment block for Check 26 is clearly in scope. Are there
    any other top-of-file constants (like `VERSION_CHECK_COMMAND_STEMS` or
    `BUDGET_GATE_COMMAND_STEMS`) that would need a parallel new constant for
    this check — e.g. a `CHOREOGRAPHY_EMBED_COMMAND_STEMS` array?

## Open product questions (for the human)

- [x] **PQ1 — command scope:** Which command stems must the new Check assert?
  The stage commands (matching Check 9's `VERSION_CHECK_COMMAND_STEMS`: status,
  questions, research, design, structure, slices, plan, implement, pr) are the
  natural scope. `archive` and `followup` also carry the step-3 block. Options:
  (a) Stage commands only — the 9 stems in `VERSION_CHECK_COMMAND_STEMS`
  (Recommended — tightest scope, mirrors Check 9),
  (b) Stage commands + `archive` + `followup` — the 10 stems in
  `BUDGET_GATE_COMMAND_STEMS` (slightly wider, but both carry the block),
  (c) All command files in `claude/commands/` that contain a step-3
  choreography block (dynamic discovery, no hardcoded list).
  **Answer: (a) Stage commands only — the 9 stems in
  `VERSION_CHECK_COMMAND_STEMS`. Tightest scope, mirrors Check 9.**

- [x] **PQ2 — what to assert:** The embed-presence Checks (9/10) assert a single
  flat substring per file. For this Check, should the assertion be:
  (a) The skill-load sentence only: `Load skill \`stage-choreography\` and follow its instructions exactly`
  (Recommended — identical pattern to Checks 9/10, lowest false-positive risk),
  (b) The skill-load sentence + the "Run-mode" establishment line
  (`Read or establish the run-mode by following its **Run-mode** procedure`),
  treating both as required embed lines,
  (c) The skill-load sentence + a per-gate auto-branch anchor (e.g. `Full or
  Semi auto` appearing in each command that has suppressible gates).

  Note: PQ2's answer directly determines whether PQ3 (auto-branch wiring)
  is in scope at all — if (a), then per-gate wiring is NOT asserted; if (b) or (c),
  it is partially asserted.
  **Answer: (a) The skill-load sentence only. Identical pattern to Checks 9/10,
  lowest false-positive risk. This makes the new Check a pure embed-presence
  check for the `stage-choreography` load line — the per-gate auto-branch
  wiring (PQ3, body §"Auto-branch wiring — what is statically checkable",
  and questions 6–8/11–13) is therefore OUT OF SCOPE for this change.**

- [x] **PQ3 — per-gate auto-branch wiring:** If PQ2 chooses (b) or (c): which
  per-gate auto-branch anchors are in scope?
  (a) Assert `Full or Semi auto` appears somewhere in any stage command that
  has suppressible gates (implement.md, pr.md) — a loose presence check,
  (b) Assert specific per-file anchor strings (e.g. `implement.md` must contain
  `I per-slice auto-advance`; `pr.md` must contain `PR-create auto-advance`),
  (c) Assert only the choreography-tail paragraph (`**Choreography (see skill
  \`stage-choreography\`...)**`) as the single per-command wiring proof.
  If PQ2 chose (a) — stage-choreography skill-load only — answer this as "N/A;
  no per-gate wiring asserted."
  **Answer: N/A — PQ2 resolved to (a), so no per-gate auto-branch wiring is
  asserted by this Check.**

- [x] **PQ4 — inline self-test:** Should the new Check include an inline
  self-test fixture (a synthetic missing-embed string that must produce a
  violation, run before file I/O), matching the pattern of Checks 14, 15, 17,
  21–25? Options:
  (a) Yes — include an inline self-test (Recommended — consistent with the newer
  checks; a broken detector reddens CI immediately),
  (b) No — follow the Checks 9/10 pattern (no inline self-test; the OK line
  and violation count are the only output).
  **Answer: (a) Yes — include an inline self-test fixture, run before file I/O,
  matching Checks 14/15/17/21–25.**

- [x] **PQ5 — migration manifest:** Does this change require a new
  `migrations/<version>.yaml` entry? Options:
  (a) No — this is a pure lint-tightening internal to the kit; the Check
  only runs in this repo's CI and does not mandate consumer-side edits
  (Recommended — the convention being checked pre-dates consumers, and all kit
  commands already carry it),
  (b) Yes — add a migration manifest entry to signal the new Check to
  upgrading consumers (even if no consumer action is required, a manifest
  entry makes the upgrade surfaceable).
  **Answer: (a) No — pure lint-tightening internal to the kit; no migration
  manifest entry. The convention pre-dates consumers and all kit commands
  already carry the embed.**
