# Questions — context-budget

> Stage Q of QRSPI. Generated 2026-07-24.
> Change summary: Audit and cap the per-stage context surface on both the input side
> (what each stage auto-loads) and the output side (what each subagent returns to the
> orchestrator), making the `context-hygiene` under-40% principle measurable and enforced.

<!-- This is a cross-cutting, skill/agent/lint change — not a CRUD data feature.
     Sections: Data model, Indexing, API, UI, Front-end state, Auth, Migrations
     are Not applicable and are omitted per the surface-gate rule.
     Sections present: Input surface audit, Output-contract convention,
     Lint / enforcement, Testing, Sequencing & scope, Open product questions. -->

## Input surface audit — per-stage skill loads

1. The questioner agent (stage Q) loads: `workflow`, `openspec-workflow`, `repo-surface`,
   and the stack cheatsheet. The questions command additionally loads `workflow` and
   `openspec-workflow` before spawning. Is any of these four redundant for the questioner
   specifically — e.g. does the questioner genuinely need `openspec-workflow` (it does not
   write specs or archive), or is it loaded out of habit?

2. The researcher agent (stage R) loads: `workflow`, `openspec-workflow`, and the stack
   cheatsheet. Given that R's job is read-only code tracing, does it need `openspec-workflow`
   (folder layout / artifact conventions), or is `workflow` (read matrix, ticket-hiding rule)
   the only cross-cutting skill it actually uses?

3. The designer agent (stage D) loads: `workflow`, `openspec-workflow`, `context-hygiene`,
   and `repo-surface`. Is `openspec-workflow` load justified at D? (D reads `questions.md`
   and `research.md` and writes `design.md` — OpenSpec folder layout is not a primary need.)

4. The architect agent (stages S and V) loads: `workflow`, `openspec-workflow`,
   `vertical-slice`, and `repo-surface`. For the V (Slices) invocation, `repo-surface`
   governs section shape — is it also needed at the S invocation, or only at V?

5. The planner agent (stage P) loads: `workflow`, `openspec-workflow`, `vertical-slice`,
   and `repo-surface`. `vertical-slice` teaches the slice model — which P already consumes
   from `slices.md`. Is re-loading it at P redundant?

6. The implementer agent (stage I) loads: `workflow`, `vertical-slice`, and `context-hygiene`.
   It notably does NOT load `openspec-workflow` or `repo-surface`. Is this omission
   intentional (I only needs `tasks.md`) or accidental?

7. The reviewer agent (stage PR) loads: `workflow`, `openspec-workflow`, and `repo-surface`.
   Reviewer reads the full change folder by design. Is `openspec-workflow` load load at PR
   justified (folder layout is implicit from reading the folder), or is it there only to
   understand artifact shapes?

8. Each stage command (`claude/commands/*.md`) loads `qrspi-version-check` and then
   the main-loop skills (`workflow`, `openspec-workflow`) before spawning the subagent.
   Does the command need to load `workflow` and `openspec-workflow` if those same skills
   are also loaded by the spawned subagent? Which side of the firewall should hold each skill?

9. Is there currently any mechanism (code, convention, or documentation) that tracks which
   skills a given stage is declared to load, versus which it actually loads at runtime? Or
   is the load set purely prose inside each agent/command file?

10. Are there any skills loaded by agents today that contribute no unique rules for that
    stage — i.e. every rule they add is either not applicable to the stage or already
    covered by another loaded skill?

## Input surface audit — file reads inside subagents

11. The `context-hygiene` skill specifies a target of < 40% context window utilization,
    with a hard reset at 60%. Is there currently any instrumentation in any agent or command
    that logs, measures, or even estimates context% at stage entry? (Yes/no — not a design
    question, a fact question.)

12. Does the questioner subagent read the per-repo `<repo>-stack` cheatsheet skill as part
    of its standard load, and if so, what is a typical token footprint for that file in
    this repo (`claude/skills/qrspi-stack/SKILL.md`)?

13. Does any agent or command currently read `requirements.md` or `tech-stack.md` from the
    consuming repo? (The `questions.md` command body references them via `@requirements.md`
    and `@tech-stack.md` — are these always auto-injected into the orchestrator context
    even when the repo has no such files?)

14. What is the mechanism by which skills are injected into an agent's context in Claude Code
    — are they inlined as text into the system prompt, or loaded lazily on demand? Does
    loading a skill that is "not applicable" for a stage still consume tokens?

15. Is there currently any guard or convention that prevents a stage agent from reading
    more files than its Read Matrix row declares? (The check at lint Check 7 validates the
    banner wording, but nothing validates actual runtime reads.)

## Output-contract convention

16. What is the current format of each stage agent's "Final message format" section?
    Specifically: is the format of these return payloads already bounded, or is it open-ended
    prose that can grow arbitrarily? (The agent files carry a `## Final message format`
    section — are the current formats already short and structured, or verbose?)

17. The `context-hygiene` skill states "Tell the subagent exactly what to return in its
    final message. Anything more is wasted tokens." Each command file tells the subagent
    to "return the file path plus a 5-bullet summary." Is the "5-bullet" instruction
    currently present consistently across all stage commands, or only in some?

18. Is there a dedicated "output-contract" section or label in any current agent file
    distinct from the "Final message format" section? Or are "output contract" and
    "final message format" the same concept handled in one block?

19. Do any current agent return formats include fields beyond the structured minimum —
    for example, inline diffs, file contents, or extended prose — that would inflate the
    orchestrator context window?

20. The `bounded-subagent-return-summaries` backlog item proposes a convention that the
    return payload include: artifact path, a short N-line summary, and the next command.
    Currently, `Next stage: /qrspi:research <id>` already appears at the end of several
    Final message formats. Is "next command" consistently present in all seven agents'
    current formats?

21. If an output-contract section is added to each agent, where should it live in the file
    relative to the existing `## Final message format` section — as a subsection under it,
    merged into it, or as a separate `## Output contract` section that precedes it?

## Lint / enforcement

22. Check 7 in `scripts/lint.mjs` (`checkReadContracts`) parses the `> **Read contract**`
    banner from each of the seven stage agents and asserts the `Reads:` field equals the
    approved read matrix. Could a similar banner-keyed approach be used for an output
    contract — i.e. a `> **Output contract**` banner with a machine-parseable `Returns:`
    field — and would Check 7 be extended or a new Check 12 added?

23. Is there a natural static-analysis approach to assert that a stage loads only a
    declared set of skills — or does that require runtime instrumentation that Claude Code
    does not expose? (The `checkSkillRefs` function in lint already validates that skill
    references in agent bodies resolve to real skill dirs — could it additionally assert
    that only declared skills are referenced per stage?)

24. The lint Check 2 (`checkFrontmatter`) already validates that `Load skill X` references
    in agent body text resolve to real `claude/skills/<X>/` directories. Could the same
    function be extended to assert that *only* the skills in a declared allowed-set are
    loaded by a given stage? What would the declaration format look like?

25. What is the boundary between a lint check that passes in CI and a runtime visibility
    signal (like logging context%)? Which enforcement mechanism is appropriate for which
    concern: (a) skill-set drift (static, checkable at lint time), (b) per-run read
    footprint (runtime, not statically knowable), (c) return payload size (runtime)?

26. Are there any existing lint checks that would need to be updated or that would conflict
    with a new "declared skill set" check? Specifically, does Check 2's `checkSkillRefs`
    currently enforce an allowlist or just a resolution (existence) check?

27. If a lint check asserts "this agent must load exactly these skills," what happens when
    an agent conditionally loads a skill (e.g. "load the stack cheatsheet if one exists")?
    How should conditionality be represented in the declaration and validated?

28. The `context-hygiene` skill is currently loaded by the designer (D) and implementer (I).
    Should it be loaded by every stage agent (since every stage can hit the 40% threshold),
    or only by the two stages with the most complex file reads?

## Visibility signal

29. Is there any precedent in the codebase for a stage agent logging a metric at entry —
    e.g. a line like "Context at stage entry: ~N tokens / ~M% window"? What mechanism
    would produce such a log visible to the human: a Bash command, a comment in the
    final message, or something else?

30. What would "log context% at stage entry" look like concretely in a Claude Code agent
    context — is there an API or tool call that returns the current token count or
    utilization percentage, or would this require an estimate based on content length?

31. If a lightweight visibility signal is added, where should it appear: in the subagent's
    final message (visible to orchestrator, not directly to human), in the orchestrator's
    pre-spawn log (visible to human), or both?

## Testing

32. Since this change modifies agent and/or command files (`.md` source), the primary test
    surface is the existing `scripts/lint.mjs` CI gate. Which of the existing Checks (1–11)
    would need to be updated if agent files change their skill-load sections or banner wording?

33. If a new lint Check 12 is added (output-contract banner presence), what are the minimal
    test cases: (a) an agent with a correct banner, (b) an agent with a missing banner, (c)
    an agent with a malformed banner?

34. If Check 2 (`checkFrontmatter` / `checkSkillRefs`) is extended to enforce an allowlist
    rather than just resolution, how should the test verify that the allowlist itself is
    correct (i.e. that no stage has been accidentally over-restricted)?

35. Does this change require any dogfooding — running the modified kit via `--plugin-dir`
    on a throw-away consumer repo to verify the context reduction is real — or is CI lint
    the sufficient gate? (The `qrspi-dogfood` skill defines the dogfood protocol.)

36. Is there a test for the case where a stage's skill-load section is edited to remove a
    skill that Check 7 or a new check references? (In other words, would trimming a skill
    from an agent's load break any existing lint assertion?)

## Sequencing & scope

37. The two items in this bundle — `trim-per-stage-context-loading` (P1) and
    `bounded-subagent-return-summaries` (P2) — are proposed as one change. Would it be
    cleaner to implement them in two sequential changes (input first, output second), or
    is the coupling tight enough that a single change is correct?

38. `bounded-subagent-return-summaries` is ranked P2 and `trim-per-stage-context-loading`
    is P1. Does bundling them force the P2 item to ship ahead of other P2 items that have
    no dependency on context-budget (e.g. `simplify-per-slice-model-selection`,
    `configurable-effort-and-thinking`), or is the bundle still correctly ordered at P1?

39. The `lint-auto-mode-gate-coverage` item (P2) adds a structural lint check that
    references auto-mode gate wiring. Would a new Check 12 for output-contract banners
    interfere with or naturally extend that check, and does lint-auto-mode-gate-coverage
    need to be sequenced before or after context-budget?

40. `standardize-recurring-ops-scripts` proposes extracting deterministic QRSPI ops into
    Node helper scripts (a direction compatible with adding a lint-only context-budget check
    to `scripts/lint.mjs`). Is there a dependency between that item and this one, or are
    they independent?

41. `enforce-research-ticket-hiding` proposes a mechanical guard on the R stage's read set.
    Does this change (which audits all stage read sets) naturally produce the groundwork for
    that guard, or are they fully orthogonal?

42. The CLAUDE.md rule "keep the README current" requires updating the README whenever a
    command is added, renamed, or removed. Does trimming skills inside an existing agent/command
    (without renaming it) trigger the README update obligation, or is that limited to
    command-surface changes?

## Open product questions (for the human)

- [x] **PQ1 — bundle vs. split:** Should `trim-per-stage-context-loading` and
  `bounded-subagent-return-summaries` ship as one change (`context-budget`) or as two
  sequential changes? The backlog description proposes bundling them as complementary
  input/output levers; splitting would let P1 ship first and unblock cost savings sooner.
  Options: (a) one bundled change as proposed, (b) split into two sequential changes
  (input first, output second), (c) split but develop in parallel on the same branch.
  **Answer: (a) one bundled change — the input and output levers are complementary sides
  of the same per-stage context surface and share the audit + lint mechanism.**

- [x] **PQ2 — skill-set declaration format:** If a lint check is added that asserts each
  stage agent loads only a declared set of skills, where should that declaration live?
  Options: (a) a new YAML frontmatter field in each agent file (e.g. `skills: [workflow,
  openspec-workflow]`), (b) a central registry in `scripts/lint.mjs` (the expected-map
  pattern already used by Check 7's `READ_CONTRACT_EXPECTED`), (c) a `> **Skill contract**`
  banner in each agent file (mirror of the read-contract banner pattern), (d) no declaration
  — just trim the loads and don't lint the trimmed set.
  Note: if PQ2 = (d), questions 22–27 become moot.
  **Answer: (b) central registry in `scripts/lint.mjs` — mirror the existing
  `READ_CONTRACT_EXPECTED` expected-map pattern from Check 7 for consistency.**

- [ ] **PQ3 — output-contract enforcement approach:** For bounding subagent return payloads,
  what enforcement level is appropriate? Options: (a) prose convention only — update each
  agent's `## Final message format` section with explicit N-line caps and add a
  `> **Output contract**` banner the human must keep honest, no lint; (b) lint check that
  asserts the banner is present in each agent (existence only, not content); (c) lint check
  that parses the banner and asserts a max-line-count field is present; (d) no change to
  agent files — just update the command files' "tell the subagent what to return" instruction.
  Note: if PQ3 = (d), PQ2 = (d), and PQ4 = (a), the entire change might reduce to prose edits
  with no new lint check.
  Note: PQ3 answer determines whether a new Check 12 is warranted. If PQ2 or PQ3 requires a
  new banner, the two banners could be combined or kept separate.
  **Answer: (b) lint check that asserts a `> **Output contract**` banner is present in each
  agent (existence only, not content) — mirrors the read-contract banner enforcement; a new
  Check 12 is warranted. Design decides whether it shares a banner with PQ2's skill contract.**

- [x] **PQ4 — visibility signal:** Should a context% visibility signal be added at stage
  entry, and if so, at what layer? Options: (a) no signal — trimming alone is sufficient,
  regressions will be caught by code review; (b) log a token-count estimate in each
  subagent's final message (orchestrator sees it, human may not); (c) have the orchestrator
  log a brief note before spawning each subagent ("Spawning <stage> — context at ~N%");
  (d) add a dedicated visibility utility script in `scripts/` that produces a context
  footprint estimate by summing the declared skill and file sizes (static, no runtime needed).
  Note: (d) is the only option that is CI-runnable without a live Claude session.
  **Answer: (d) static footprint-estimate script in `scripts/` — deterministic, CI-runnable,
  and the only option that does not depend on live context% (which Claude Code does not
  expose to an agent). Ties naturally to the PQ2 declared skill-set registry.**

- [ ] **PQ5 — skill trim scope:** After the audit, which skills, if any, should be removed
  from which stages? This cannot be fully answered before Research, but the question is
  whether the scope of allowed trimming is: (a) remove only skills that are provably unused
  by the stage (no rule from the skill is cited or relied on in that stage's agent text);
  (b) remove skills where the relevant subset of rules can be inlined cheaply (avoiding a
  full-skill load for one rule); (c) no removal — only prevent future additions by adding
  the declaration lint; (d) scope is deferred to Research + Design.
  Note: PQ5 = (d) is the safe default; answering (a) or (b) now would pre-empt the Research
  stage.
  **Answer: (d) defer the concrete trim list to Research + Design — R maps actual per-stage
  skill usage (ticket-blind), D decides the trims. Removal is in scope for the change; only
  the specific list is deferred.**

- [x] **PQ6 — CHANGELOG and version:** Per CLAUDE.md, `plugin.json` version is only bumped
  on a release. This change should record its additions under `## [Unreleased]` in
  `CHANGELOG.md`. Should it also add a `migrations/<v>.yaml` entry now (pre-release), or
  defer that to the actual release? Options: (a) defer entirely to the release author;
  (b) add a stub `manual:` entry under the next version now so the release checklist is
  pre-populated; (c) no manifest needed if this change makes no automated migration to
  consumer `openspec/` paths.
  Note: if no agent file under `openspec/` is modified by consumers (skills live in the
  plugin, not the consumer repo), (c) may be correct — confirm at Research.
  **Answer: (c) no migration manifest — skills/agents/commands ship in the plugin, so
  consumers' `openspec/` paths are untouched; record additions under `## [Unreleased]` in
  CHANGELOG.md. Confirm at Research that no consumer-side path is modified.**
