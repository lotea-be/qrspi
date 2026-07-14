# Questions — tighten-stage-read-boundaries

> Stage Q of QRSPI. Generated 2026-07-14.
> Change summary: Enforce strict, minimum-read boundaries on each QRSPI stage
> subagent so that no stage reads artifacts it does not need — eliminating the
> cross-stage redundant reads that cause token blowup in long flows.

This is a **kit-architecture change** to the QRSPI workflow's own agent and
command source files. It changes what each subagent is told to read, not any
user-facing product feature. The standard Data model / Indexing / API / UI /
Front-end state / Migrations sections are therefore **Not applicable** — kept
as headings so stage S does not re-litigate — and replaced with sections that
fit a workflow/agent-boundary change.

## Data model — Not applicable

No entities, tables, or DTOs are involved. The "model" here is the read-matrix
(which artifact each subagent is allowed to open), encoded as prose instructions
in `claude/agents/*.md` and optionally the matching `claude/commands/*.md`.

## Indexing & query performance — Not applicable

## API surface — Not applicable

No HTTP surface. The analogous "surface" is the set of files each agent opens
(its effective read interface), addressed under "Read-boundary mechanics" below.

## UI — Not applicable

## Front-end state — Not applicable

## Migrations & data — Not applicable

No data migration. The analogue is a `node sync-copilot.mjs` regeneration pass
so `copilot/` stays in sync with any `claude/` edits — covered under
"Copilot parity" below.

---

## Current read behavior (facts to verify before designing)

1. **What does the researcher currently read?** The `claude/agents/researcher.md`
   file explicitly prohibits opening `questions.md` or any change-folder artifact
   ("do not open `openspec/changes/<id>/questions.md`"). Confirm:
   - Is the prohibition enforced only by that single explicit sentence, or is
     there also a restriction in `claude/commands/research.md` (the command that
     spawns the researcher)?
   - Are there any other change-folder paths the researcher might plausibly read
     (e.g. `design.md` via a Glob-based exploration)?

2. **What does the architect currently read at stage S?** The agent file
   (`claude/agents/architect.md`) step 2 says: "Read `questions.md`, `research.md`,
   and `design.md` in order." The problem statement says the architect reads all
   three but should read only `design.md`. Confirm:
   - Is the three-file read mandated only in the agent file, or also echoed in the
     command file (`claude/commands/structure.md`)?
   - Does the command file pass `questions.md` or `research.md` paths to the
     architect as explicit inputs, or does it rely on the agent file's prose
     instructions to discover them?

3. **What does the architect read at stage V (Slices)?** The Slices section in
   `claude/agents/architect.md` ("What to do — Slices") says to read `proposal.md`
   and `specs/` only. Confirm whether this is already correct or whether the architect
   can drift and read `design.md`, `questions.md`, or `research.md` during V.

4. **What does the planner currently read?** The `claude/agents/planner.md` step 2
   says: "Read `design.md` and `slices.md`." The human's intent is for `design.md`
   to remain a bounded, lazily-referenced anchor (only for D-number back-references),
   not a full cover-to-cover read. Confirm:
   - Does the planner's current instruction say "read end to end" or something
     weaker?
   - Does the planner read `proposal.md` or `specs/` in addition to `slices.md` and
     `design.md`?

5. **What does the implementer currently read?** The `claude/agents/implementer.md`
   step 2 says only "Read `tasks.md`." But the designer agent (`designer.md`) step 2
   says "Read `questions.md` and `research.md` end to end." Clarify whether the
   implementer's concrete practice of reading `design.md` at runtime (via the
   divergence self-check citation `"against the approved design.md"`) constitutes
   a cover-to-cover read or only a targeted lookup. Confirm:
   - Does `implementer.md` explicitly instruct opening `design.md`, or is `design.md`
     referenced only inside the divergence self-check clause ("diverges from the
     approved `design.md`/delta spec")?
   - If the divergence self-check is the only reference, does removing "cover-to-cover"
     wording require a change to the implementer agent, or is it already bounded?

6. **What does the designer currently read?** `designer.md` step 2 says: "Read
   `openspec/changes/<id>/questions.md` and `research.md` end to end." The human
   intent is to keep this pairing: `questions.md` + `research.md`, both end to end.
   Confirm this is already the correct scope and no other change-folder files (e.g.
   `proposal.md` from a previous run, or archived artifacts) are read by the designer.

7. **What does the reviewer currently read?** `reviewer.md` step 2 says: "Read the
   full `openspec/changes/<id>/` folder." The human intent is to leave this unchanged.
   Confirm this is still the design intent and the reviewer is the only stage with
   full-folder read access.

---

## Read-boundary mechanics

8. **Where is each stage's read list authoritatively declared?** For each stage,
   the read list may live in two places: the agent file (`claude/agents/<name>.md`)
   and the command file (`claude/commands/<stage>.md`). Determine which is the
   authoritative declaration for each stage:
   - For stages where the command file spawns a subagent via the Agent tool, the
     command file controls what the agent is *told* to do; the agent file is a
     standing instruction. If they conflict, the Agent tool invocation wins for
     that run.
   - For stages where the command file simply invokes the agent file's body (no
     explicit "read these files" instruction in the command), the agent file is
     the sole authority.
   Which stages fall into each bucket today?

9. **How should the read restriction be expressed?** For each agent that needs
   a narrower read list, the restriction can be stated as:
   - (a) An explicit positive list: "You MUST read only X and Y. Do NOT open any
     other artifact in the change folder."
   - (b) An explicit negative list: "Do NOT read `questions.md` or `research.md`."
   - (c) Both: a positive list followed by explicit prohibition of the most
     likely-to-be-opened forbidden files.
   Which form gives the clearest, most-enforceable boundary? Note that agents can
   be instructed in prose but cannot be given a deny-list at the tool level today
   (no per-tool path restriction in the Agent tool call), so this is entirely
   prose-enforced.

10. **Do the command files need to change, or only the agent files?** For each stage
    where the read-boundary changes:
    - If the command file explicitly names or passes artifact paths (e.g. as part of
      its Agent tool invocation text), it must be updated to remove the forbidden
      paths.
    - If the command file's invocation text is agnostic (e.g. "produce design.md
      and return a summary"), the read restriction lives only in the agent file.
    Identify which command files, if any, today pass or imply artifact paths that
    would contradict the new boundary.

---

## Stage-by-stage boundary analysis

### Researcher (R)

11. **Is the researcher's current prohibition already airtight?** The agent file
    tells the researcher not to open `questions.md` and explains why (it contains
    the change summary). However:
    - Is there an explicit prohibition on opening `design.md`, `proposal.md`, or
      `research.md` from a prior run in the same change folder?
    - Is there a prohibition on opening archived change folders
      (`openspec/changes/archive/`) to gather contextual "inspiration"?
    - Does the researcher have any instruction that could be read as permitting
      it to open project-level files in `openspec/specs/` (which are not per-change
      but do carry domain context the ticket-hiding premise should block)?
    What, if anything, needs to be added to make the prohibition exhaustive?

### Designer (D)

12. **Should the designer read `questions.md` and `research.md` strictly end to end,
    or is there a case for reading `research.md` lazily?** The designer's current
    instruction is a cover-to-cover read of both. The human intent preserves this.
    Confirm there is no performance concern large enough to motivate a lazy read at D
    (i.e., the token cost at D is acceptable because D is Opus and the two files are
    bounded in size for typical changes).

13. **Should the designer be explicitly prohibited from opening `design.md` from a
    prior run or an archived change?** If a change folder already contains a `design.md`
    (e.g., from a restart or a prior aborted run), the designer might open it as context.
    Is this acceptable, or should the designer be restricted to only `questions.md` and
    `research.md` as inputs (regenerating `design.md` fresh each time)?

### Architect — Structure (S)

14. **What value, if any, did reading `questions.md` and `research.md` at stage S
    provide historically?** The current `architect.md` states the rationale: "the
    other two anchor the spec scenarios in the technical-question record and the
    codebase factual map." Now that the boundary is narrowing to `design.md` only,
    something must cover that grounding. Options:
    - (a) The designer already distills `questions.md` + `research.md` into `design.md`;
      by the time S runs, `design.md` is sufficient and the other two are redundant.
    - (b) The architect should be told explicitly: "design.md is the source of truth;
      do not open questions.md or research.md."
    - (c) A brief "Grounding" note in `design.md`'s template should be added so the
      designer always leaves a codebase-anchor block the architect can reference
      without the raw `research.md`.
    Which is the correct answer, and does it require a change to `design.md`'s template
    or to the designer's output instructions?

15. **The architect's "Open questions surfaced" final-message field** currently says:
    "any assumption you made that was NOT answered by `design.md`, `questions.md`, or
    `research.md`." If the architect no longer reads `questions.md` or `research.md`,
    this citation becomes a lie. Should the field be reworded to "any assumption not
    answered by `design.md` alone"?

16. **Does narrowing the architect's read set at S risk breaking the divergence
    self-check?** The divergence rubric in `architect.md` says "against the approved
    `design.md`/delta spec." Since `design.md` is exactly what the architect still reads,
    the self-check is unaffected. Confirm this analysis is correct and no divergence
    check wording cites `questions.md` or `research.md`.

### Architect — Slices (V)

17. **Is the Slices (V) section of `architect.md` already at the correct boundary?**
    The V section says "read `proposal.md` and `specs/`" — no `design.md`, no
    `questions.md`, no `research.md`. If this is already correct:
    - Is there any prose elsewhere in `architect.md` (shared preamble, the skills
      load list, the divergence self-check) that instructs or implies the architect
      should read `design.md` during V?
    - Is `design.md` currently passed or implied by the `slices.md` command file?

18. **Does the "Overview" block of `slices.md` require knowledge from `design.md`?**
    The template says the Overview must allow "the planner and implementer … to read
    this block cold without re-reading `proposal.md` or `design.md`." This implies
    the Overview should be self-contained. Does writing a sufficient Overview require
    the architect to read `design.md` during V, or can it be derived entirely from
    `proposal.md` and `specs/`?

### Planner (P)

19. **How should "bounded, lazily-referenced" be defined precisely for `design.md`
    at the Plan stage?** The human intent is that the planner uses `design.md` only
    to copy D-number back-references (e.g., `(D3)`) into task items — it does not
    re-read the whole file to re-derive decisions. Define the exact rule:
    - (a) "Read `slices.md` end to end. Then, when writing a task that implements a
      design decision, look up only the numbered decision (D<n>) in `design.md` to
      confirm the label — do not read the surrounding text."
    - (b) "Read `slices.md` end to end and `design.md` in full for the
      decision-traceability pass, but do not re-derive decisions already in slices.md."
    - (c) "Read only `slices.md`. If a task references a D-number, carry the reference
      forward from `slices.md`'s slice bullet (the architect should have embedded the
      D-number in the slice) — do not open `design.md` at all."
    What is the human's chosen approach, and is it possible for slices.md to reliably
    carry D-numbers so option (c) is viable?

20. **Should the planner be prohibited from reading `questions.md`, `research.md`,
    and `proposal.md` explicitly?** Today the planner's "Implicit inputs" line lists
    `proposal.md`, `specs/`, `slices.md` — which includes `proposal.md`. If the
    boundary tightens to `slices.md` + bounded `design.md`, should `proposal.md` and
    `specs/` be dropped from the planner's read list, or are they still needed (e.g.,
    for capability names or spec scenario references in tasks)?

### Implementer (I)

21. **Does the implementer currently read `design.md` cover to cover?** The agent file
    (`implementer.md`) only says "Read tasks.md." The divergence self-check clause says
    "against the approved `design.md`/delta spec" — but does not say "read design.md."
    Determine:
    - Is the divergence self-check currently implemented by the implementer opening
      and reading `design.md` fully, or by referencing the D-numbers it already knows
      from `tasks.md` and checking them?
    - Does the implementer ever explicitly open `design.md` in practice (even though
      the agent file does not instruct it to)?

22. **What does "bounded, lazily-referenced anchor" mean concretely for the
    implementer?** If the implementer should reference `design.md` only for the
    divergence self-check, define the exact rule:
    - (a) "Do not open `design.md` proactively. If a slice decision seems to conflict
      with something you believe the design said, open only the specific numbered
      decision section to verify — do not read `design.md` cover to cover."
    - (b) "Read `design.md` only at the divergence self-check step (before emitting the
      slice's final message); read the full file at that single point."
    - (c) "Never open `design.md` during Implement — the D-number back-references in
      `tasks.md` are sufficient; if something conflicts, stop and ask the human."
    Which approach minimizes token use while preserving the divergence-catch safety net?

23. **Should the implementer be explicitly prohibited from reading `questions.md`,
    `research.md`, `proposal.md`, and `slices.md`?** Adding explicit prohibitions
    makes boundaries machine-auditable via lint but adds prose bulk. Options:
    - (a) Rely on the positive instruction ("read only `tasks.md` + bounded `design.md`").
    - (b) Add explicit "Do not open" lines for the most-likely-to-drift files
      (`questions.md`, `research.md`, `design.md` cover-to-cover).
    - (c) Both: a positive list plus a prohibition banner.

### Reviewer (PR)

24. **Is the reviewer's full-folder read access intentionally unchanged?** The reviewer
    reads `openspec/changes/<id>/` in full (all artifacts). This is by design — the
    reviewer is the final gate and needs the complete picture. Confirm:
    - Should the reviewer's read access be documented explicitly as "full folder by
      design" to distinguish it from the narrowed stages above?
    - Are there any files the reviewer should NOT read (e.g., could it inadvertently
      open `openspec/specs/` base specs and conflate them with the delta?)?

---

## Lint & enforcement

25. **Should `scripts/lint.mjs` gain a new check that audits agent files for prohibited
    reads?** Options:
    - (a) A static check that asserts each agent file's "What to do" section does NOT
      contain a path that violates the canonical read matrix (e.g., `architect.md`
      does not mention `questions.md` or `research.md` in its S section).
    - (b) A documentation-only check: a comment block in each agent file declaring
      its read contract, asserted by a lint rule that the block is present.
    - (c) No lint check — the agent file's prose is the enforcement; rely on code
      review and the `sync-copilot.mjs --check` gate to catch drift.
    Is a lint check practical given that the read lists are prose instructions, not
    structured metadata?

26. **How should the canonical read matrix be documented for humans?** Options:
    - (a) A table in `claude/skills/qrspi-workflow/SKILL.md` listing each stage's
      permitted reads (the workflow skill already documents the stage choreography).
    - (b) A comment banner in each agent file declaring its own read contract ("This
      agent reads: X, Y. It MUST NOT open: A, B, C.").
    - (c) Both.
    - (d) Neither — the agent files are the documentation.
    What is the chosen form?

---

## Blast radius

27. **Which files must change, and is this list complete?** For each file that
    changes, identify what changes:
    - `claude/agents/architect.md` — remove `questions.md` and `research.md` from
      the S section's step 2 read list; update the "Open questions surfaced"
      final-message wording; potentially add a prohibition banner; verify the V
      section is already correct.
    - `claude/agents/planner.md` — narrow the `design.md` read from cover-to-cover
      to bounded/lazy per PQ resolution; possibly drop `proposal.md`/`specs/` from
      implicit inputs.
    - `claude/agents/implementer.md` — add or tighten the bounded/lazy `design.md`
      instruction; add explicit prohibitions if chosen.
    - `claude/agents/researcher.md` — add prohibitions if the current single-sentence
      ban is found to be insufficient.
    - `claude/agents/designer.md` — no change expected if the current boundary is
      correct; verify.
    - `claude/agents/reviewer.md` — no change expected; add "full folder by design"
      note if Q24 decides to document it explicitly.
    - `claude/commands/structure.md` — update if the command file passes or implies
      artifact paths that conflict with the new boundary.
    - `claude/skills/qrspi-workflow/SKILL.md` — add a read-matrix reference table
      if Q26 decides to document it there.
    - `copilot/` — regenerated by `node sync-copilot.mjs`; never hand-edited.
    - `scripts/lint.mjs` — add a new check if Q25 decides to lint the read matrix.
    Are `claude/commands/research.md`, `claude/commands/design.md`,
    `claude/commands/plan.md`, or `claude/commands/implement.md` in scope, or do
    all necessary restrictions live in the agent files alone?

28. **Does this change touch any QRSPI artifact template?** The `openspec-templates/`
    folder ships canonical shapes for `design.md`, `proposal.md`, etc. If Q14(c)
    decides that `design.md`'s template needs a "Grounding" block so the architect
    can reference it without reading `research.md`, that template must change. Confirm
    whether any template edit is in scope and, if so, which template.

---

## Copilot parity

29. **Does `node sync-copilot.mjs --check` zero-drift remain the acceptance criterion
    for this change?** Every edit to `claude/agents/*.md` or `claude/commands/*.md`
    must be reflected in `copilot/` via the sync script. Confirm:
    - The PR acceptance gate requires `sync-copilot.mjs --check` to exit 0.
    - The `copilot/` tree is committed as part of this change's PR, not left as a
      follow-up.

---

## Testing & verification

30. **How is "the agent no longer reads the forbidden file" verified?** Prose changes
    to agent files cannot be unit-tested. Options:
    - (a) A manual dogfood walk: run a test change through stages S, P, and I and
      observe that the agents do not open the prohibited files (via conversation log
      inspection).
    - (b) A lint check that statically asserts the agent file's "What to do" section
      does not contain certain forbidden path strings (fragile — the agent might still
      open the file without it being named in the prose).
    - (c) A read-matrix comment block in each agent file, linted for presence, serving
      as a machine-readable declaration of intent even if it cannot enforce runtime
      behavior.
    - (d) Accept that prose-level enforcement is the only practical option and rely on
      the design review (stage D, human-approved) to catch regressions in the agent
      files.

31. **Does this change require a new entry in `CHANGELOG.md` under `## [Unreleased]`?**
    The CLAUDE.md "keep the README current" rules and the reviewer's mandatory check
    both require a `## [Unreleased]` entry whenever agent/command/skill files change.
    Confirm the entry is in scope for this change and what its summary line should be.

---

## Sequencing & scope

32. **Should this change land before or after `enforce-research-ticket-hiding`?**
    The backlog item `enforce-research-ticket-hiding` targets the same researcher
    agent and the same ticket-hiding premise. This change may add prohibition prose
    to `researcher.md` that overlaps with whatever `enforce-research-ticket-hiding`
    would add. Options:
    - (a) Land this change first (read-boundary narrowing); let
      `enforce-research-ticket-hiding` layer a mechanical guard on top later.
    - (b) Merge the two changes — do ticket-hiding enforcement and all read-boundary
      narrowing in one PR.
    - (c) Land `enforce-research-ticket-hiding` first, then this change.
    What is the recommended sequence, and does the overlap risk double-editing
    `researcher.md` in close succession?

33. **Should the read-matrix documentation table (Q26) be part of this change or a
    separate backlog item?** Adding a table to `qrspi-workflow/SKILL.md` is low-cost
    but orthogonal to the agent-file edits. Options:
    - (a) Include the documentation table in this change's PR (it documents what the
      change just enforced).
    - (b) Spin it off as a separate `idea` row — this change only edits the agent
      files; docs can follow.

34. **Scope guard.** This change is strictly about narrowing what each agent reads.
    Confirm the following are explicitly out of scope and should remain separate
    backlog items:
    - Mechanical enforcement of the read matrix via tool-level path restrictions
      (no such mechanism exists in the Agent tool today).
    - Changes to the content of `design.md` output (what the designer writes), as
      opposed to what stages downstream of D are allowed to read.
    - Changes to the divergence self-check rubric or hard-stop conditions (those
      live in `qrspi-workflow/SKILL.md` and were settled by `add-auto-mode`).
    - `enforce-research-ticket-hiding` (mechanical guard for the researcher) — a
      separate backlog item.

---

## Open product questions (for the human)

- [x] **PQ1 — Architect S read set:** Should the architect at stage S read
  `design.md` ONLY, with `questions.md` and `research.md` explicitly prohibited? Or
  is there a legitimate reason (e.g. to anchor spec scenario wording in exact
  question phrasing or raw research findings) to retain one of them? Options:
  (a) `design.md` only — the designer has already distilled the other two, making
  them redundant at S; (b) `design.md` + `research.md` only — drop `questions.md`
  but keep the codebase factual map; (c) keep all three (no change from today).
  Note: if PQ3 determines that slices.md must carry D-numbers for the planner, this
  also influences whether S needs questions.md for traceability labeling.
  **Answer: (a) `design.md` only — `questions.md` and `research.md` are explicitly prohibited at S.**

- [x] **PQ2 — Planner design.md access:** How should the planner use `design.md`?
  Options: (a) read it lazily — open only the specific numbered decision entry when
  writing a task that needs a D-number citation, never cover-to-cover; (b) read it
  in full once at the start of the plan pass (current behavior); (c) never open
  `design.md` — carry D-numbers forward from `slices.md` instead (requires the
  architect to embed D-numbers in each slice bullet). If PQ3 chooses (c), this
  question collapses. Note the dependency: the answer here defines what the planner
  agent file's step 2 says and directly determines whether `slices.md` must embed
  D-numbers.
  **Answer: (c) Only `slices.md` — the planner never opens `design.md`; it carries
  `(D<n>)` tags forward from `slices.md`. Depends on PQ3=yes.**

- [x] **PQ3 — D-numbers in slices.md:** Should the architect embed design-decision
  D-numbers (e.g. `(D3, D7)`) in each slice's bullet items so that the planner and
  implementer can carry them forward from `slices.md` without opening `design.md`?
  Options: (a) yes — add this as a requirement to the architect's `slices.md` output
  format; (b) no — the planner's bounded `design.md` lookup (PQ2(a)) is sufficient;
  (c) optional / best-effort. Note: this decision also affects the slices.md template
  in `architect.md`. If PQ2 resolves to option (b), this question becomes moot.
  **Answer: (a) Yes — the architect MUST embed design-decision D-numbers in each
  slice bullet in `slices.md` (required output-format rule, not best-effort).**

- [x] **PQ4 — Implementer design.md access:** How should the implementer reference
  `design.md`? Options: (a) never open it — D-numbers in `tasks.md` are sufficient,
  and any conflict triggers a stop-and-ask; (b) open it lazily only at the divergence
  self-check step (before emitting the slice's final message), looking up only the
  specific D-numbers relevant to that slice; (c) open it fully once at the start of
  the slice (current de-facto behavior if the implementer opens it for the divergence
  check). Note the dependency on PQ3: if PQ3 embeds D-numbers in slices.md (and
  therefore tasks.md), option (a) becomes more viable because the implementer already
  has D-number labels to reference without opening design.md.
  **Answer: (a) Never open `design.md` — the `(D<n>)` tags in `tasks.md` suffice;
  a slice/decision conflict triggers a hard-stop to the human (stop-and-ask),
  not a design.md read.**

- [x] **PQ5 — Researcher prohibition completeness:** Beyond the current single-sentence
  ban on opening `questions.md`, should `researcher.md` explicitly prohibit: (a) any
  file under `openspec/changes/<id>/` (the whole change folder); (b) also
  `openspec/changes/archive/` (archived change folders); (c) `openspec/specs/` (base
  specs); (d) all of the above; (e) no additional prose — the current sentence is
  sufficient and more prose risks being ignored. Note the link to
  `enforce-research-ticket-hiding` (backlog): whatever is added here may be
  superseded or extended by that change.
  **Answer: (a) Ban the whole change folder only — prohibit opening any file under
  `openspec/changes/<id>/`. Do NOT add explicit bans on `openspec/changes/archive/`
  or `openspec/specs/` base specs (left for `enforce-research-ticket-hiding`).**

- [x] **PQ6 — Read-matrix documentation:** Should the canonical read matrix (which
  stage reads what) be documented in a dedicated table? Options: (a) add a table to
  `claude/skills/qrspi-workflow/SKILL.md` as part of this change; (b) add a
  read-contract comment banner to each agent file (visible at the top of the file);
  (c) both; (d) no explicit table — agent files are the documentation. Note:
  option (a) or (b) makes the matrix auditable by a future lint check (Q25); option
  (d) keeps things lean but relies on humans reading each agent file to reconstruct
  the matrix.
  **Answer: (c) Both — a read-matrix table in `claude/skills/qrspi-workflow/SKILL.md`
  AND a per-agent read-contract banner at the top of each agent file.**

- [x] **PQ7 — Lint enforcement:** Should `scripts/lint.mjs` gain a check that
  statically asserts the agent files' read prose does not contain prohibited path
  strings (e.g., `architect.md`'s S section must not contain "questions.md" or
  "research.md")? Options: (a) yes — add a lint check (it is a string-search, low
  cost); (b) no — prose enforcement via agent-file review is sufficient; the sync
  check (`sync-copilot.mjs --check`) is the only mechanical gate needed. Note: a
  string-search lint cannot prevent the agent from opening a file that isn't named in
  the prose (the agent can still use Glob to discover files); it can only catch the
  case where a forbidden path is explicitly named in the instruction text.
  **Answer: (a) Yes — add a `scripts/lint.mjs` check asserting each agent's read
  section names no forbidden artifact (string-search floor; accepted that it can't
  catch Glob-based discovery).**

- [x] **PQ8 — Sequencing vs. enforce-research-ticket-hiding:** Should this change
  land before or after the `enforce-research-ticket-hiding` backlog item? Options:
  (a) this change first — it adds prose prohibitions to the researcher and others,
  and `enforce-research-ticket-hiding` layers a mechanical guard on top later; (b)
  merge the two into one change; (c) do `enforce-research-ticket-hiding` first, then
  this change. Note: if both touch `researcher.md`, doing them in close succession
  risks a minor merge conflict; landing them as one change avoids that but may
  increase scope.
  **Answer: (a) This change first — land the read-boundary narrowing now;
  `enforce-research-ticket-hiding` layers a mechanical guard on `researcher.md` later.**
