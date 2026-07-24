# Questions — per-slice-compute-knobs

> Stage Q of QRSPI. Generated 2026-07-24.
> Change summary: Replace the fragile per-slice `**Model:**` markdown annotation
> and implementer self-halt with a single, clean per-slice compute declaration
> that covers model, reasoning effort, and thinking budget together.

## Current mechanism — how model annotation works today

1. Where exactly does the `**Model:** sonnet|opus` annotation live in the artifact
   chain? Trace: architect writes it in `slices.md` → planner carries it verbatim
   into `tasks.md` → `implement.md` command reads it from `tasks.md` and passes
   `model: <annotated>` to the Agent-tool call. Is this the complete path, or does
   any stage read it from `slices.md` directly?

2. The implementer agent's frontmatter sets `model: opus` as a default. The
   `implement.md` command overrides this at spawn time with the Agent-tool's
   `model:` parameter. What happens if a slice's annotation is `sonnet` but
   the orchestrator is itself running on opus — does the subagent definitely
   execute on sonnet, or does the orchestrator model bleed through?

3. The "self-halt" path: `implementer.md` step 3 says if the agent is not running
   on the annotated model it must stop and tell the orchestrator to re-invoke. In
   practice, does a subagent spawned via the Agent tool know which model it is
   running on (i.e., can it reliably self-check)? Is the self-halt ever triggered
   in real flows, or is it dead code because the orchestrator always passes the
   correct `model:` at spawn time?

4. What does `implement.md` do today when the `**Model:**` annotation is entirely
   absent from a slice header? It says "stop and tell the user the slices/tasks
   file needs to be fixed." Is this guard enforced consistently, or is it only
   in the command's prose?

## Current mechanism — effort and thinking today

5. Effort and thinking budget are not set anywhere in the kit today. They default
   to whatever the invoking session has set. Where does the Agent-tool call in
   `implement.md` currently sit with respect to effort and thinking? Are those
   parameters simply absent (inheriting session defaults), or is there any existing
   attempt to set them?

6. Does the Claude Code Agent-tool accept `effort:` and/or `thinking_budget:`
   (or equivalent) parameters alongside `model:` when spawning a subagent? What
   is the exact parameter name and accepted value vocabulary (e.g. `low`/`medium`/
   `high` for effort, integer token count for thinking budget)?

7. If effort or thinking parameters are not exposed by the Agent tool, what is the
   alternative path — e.g., system-prompt hints, session-level configuration, or
   no path at all (making the effort/thinking axis not mechanically enforceable)?

## Declaration surface — where does the compute annotation live?

8. The current annotation lives in `slices.md` and is carried verbatim into
   `tasks.md`. If the annotation gains two more fields (effort + thinking budget),
   the current inline format `**Model:** sonnet|opus — <rationale>` would need to
   expand. What are the candidate single-line formats for a three-field annotation?
   For example: `**Compute:** model=sonnet effort=low thinking=0` vs. a YAML
   block vs. keeping three separate `**Model:** / **Effort:** / **Budget:**` lines?

9. Is `slices.md` still the right home for the declaration if the change simplifies
   or replaces the mechanism? Alternatives: a per-stage config block in
   `design.md`; a compute section in the change's `proposal.md`; a dedicated
   `compute.yaml` sidecar; or collapsing to a single stage-level annotation (no
   per-slice granularity).

10. The planner's rule today is "carry the `**Model:**` annotation forward verbatim
    from `slices.md`." If the annotation format changes, the planner agent and its
    template must also change. What other files in the artifact chain (agent
    banners, template skeletons, skill prose) reference or validate the annotation
    format, and must be updated atomically?

11. The `vertical-slice` skill's "Per-slice model selection" section tells the
    architect when to choose `sonnet` vs. `opus`. If effort and thinking are added,
    does this section need to grow a selection rubric for those axes too, or does
    the model choice act as a proxy (sonnet → low effort / no thinking; opus →
    high effort / large budget)?

## Simplification — the fragile self-halt problem

12. The self-halt is documented in `implementer.md` step 3: if the subagent
    detects it is on the wrong model it must stop. But the orchestrator in
    `implement.md` already reads the annotation and passes `model:` to the Agent
    call, so the self-halt is a redundant second gate. Should the self-halt be
    kept (defence in depth), replaced entirely (single gate at the orchestrator),
    or replaced with a softer warning (log and continue rather than hard-stop)?

13. The backlog item `simplify-per-slice-model-selection` says "consider a simpler
    lever or a single implement-stage model." The "single implement-stage model"
    option means: ignore per-slice annotations and run all slices on one fixed
    model for the whole change (e.g., always opus for implement). What does this
    simplification look like mechanically? Does it mean removing the `**Model:**`
    line from slices.md entirely and setting `model: opus` hard in the implement
    command, or is there a midpoint (e.g., a per-change default with a per-slice
    override only for exceptions)?

14. If the simplification collapses per-slice granularity to per-change or
    per-stage, what happens to the effort/thinking axes — do they also collapse
    to per-change, or do they remain per-slice (because the cost difference between
    a mechanical slice and a judgment-heavy slice is large enough to warrant it)?

## Passing through at delegation time

15. The orchestrator in `implement.md` currently reads the `**Model:**` annotation
    from `tasks.md` before spawning the implementer via the Agent tool. If the
    annotation gains effort and thinking fields, the orchestrator must parse all
    three fields and pass them all to the Agent-tool call. What is the minimal
    change to `implement.md` — just adding two more `model:` sibling parameters
    to the Agent-tool invocation, or is the spawn call restructured more deeply?

16. The `followup.md` command also spawns the implementer but is in post-PR FIX
    MODE, which explicitly says "no `**Model:**` annotation to honor." Should
    effort and thinking be configurable for post-PR fixes as well, or always
    inherit session defaults there?

17. Other stage commands (questions, research, design, structure, slices, plan, pr)
    each spawn their own subagent. Their agents carry a `model:` field in
    frontmatter as a recommendation. Should effort and thinking become agent-level
    frontmatter fields too (alongside `model:`), or only a per-slice runtime
    override at the implement stage?

## Lint and validation

18. `scripts/lint.mjs` Check 2 validates that `model:` fields in agent frontmatter
    use aliases (`opus`/`sonnet`/`haiku`), not pinned model ids. If effort or
    thinking become frontmatter fields, does lint need new checks for their value
    vocabularies? What values are legal — and would a lint check be worth the
    maintenance cost, or is it overkill?

19. Check 3 (heading alignment) verifies that canonical section headings from
    template files appear in the agent's inline skeleton. If the annotation format
    in `slices.md` / `tasks.md` templates changes, does Check 3 catch drift
    automatically, or does lint need an additional check for the annotation line
    shape?

20. Is there a lint check today that validates the `**Model:** sonnet|opus`
    annotation line format in a committed `slices.md` or `tasks.md`? If not,
    should one be added to catch a missing or malformed compute annotation before
    `implement.md` hits a runtime error?

## Agent frontmatter and the "recommended model" banner

21. Each agent carries two model signals: the frontmatter `model:` field (default
    used when the orchestrator does not override) and the `> **Recommended model:**`
    banner in the body prose. If effort and thinking become per-agent knobs,
    should they live only in the banner (prose guidance) or also as frontmatter
    fields (machine-readable defaults the orchestrator can read and pass through)?

22. The designer agent has `model: opus` in frontmatter. The implement command
    overrides the implementer's `model: opus` default per slice. Is there any
    current mechanism by which the questions/research/design/structure/slices/plan
    stage commands read the agent's frontmatter `model:` field and pass it
    explicitly to the Agent-tool call, or do those stages simply rely on the
    frontmatter default being applied automatically?

## Testing and dogfooding

23. The self-halt path is hard to test because it requires the orchestrator to
    intentionally NOT pass the correct model to the agent. Is there a dogfood-able
    checkpoint for the new mechanism — e.g., a throwaway test change where the
    architect annotates one slice `sonnet` and one `opus` and we verify the
    orchestrator spawns the correct model for each?

24. How does the kit currently test that the `**Model:**` annotation is honored
    in practice? Are there any automated or manual tests for the model-selection
    path, or is it entirely untested and relied upon by convention?

## Sequencing & scope

25. The backlog note says effort/thinking "must ride the same simplified mechanism
    as model" — so this is a single, bundled change. Does implementing
    "simplify-per-slice-model-selection" first (as a prerequisite) make sense, or
    are they co-designed and shipped together in one PR?

26. `decompose-tasks-md-per-slice` (backlog, P2) proposes splitting `tasks.md`
    into one file per slice. If the compute annotation moves or changes format in
    this change, does `decompose-tasks-md-per-slice` need to re-examine the
    annotation placement? Is there a sequencing dependency?

27. `standardize-recurring-ops-scripts` (backlog, P2) proposes extracting
    deterministic recurring ops into Node scripts. The annotation-reading logic in
    `implement.md` (parse the next un-ticked slice header, extract the model field)
    is a candidate for such a script. Should that extraction be a non-goal here,
    explicitly deferred to `standardize-recurring-ops-scripts`?

28. `kit-self-surfaces` (backlog, P2) adds kit-specific surfaces to the
    `qrspi-stack` surface taxonomy. Does adding a compute-knobs mechanism
    constitute a new surface worth capturing there, or is it an internal
    implementation concern below the surface level?

## Open product questions (for the human)

- [x] **PQ1 — granularity:** **Answer: Keep per-slice (option a) — the granularity is the value; only the mechanism gets fixed.** Should the compute annotation remain per-slice (one
  annotation per slice in `slices.md`/`tasks.md`), or should it collapse to a
  coarser granularity? Options:
  (a) Keep per-slice (current granularity) — lets mechanical slices run cheap and
      judgment-heavy ones run expensive within the same change (Recommended),
  (b) Per-change (one annotation for all slices of a change) — simpler declaration,
      but loses the cheap/expensive split within a change,
  (c) Per-stage fixed (design always opus, implement always the annotation's value,
      plan always sonnet) — no per-slice variance at all.

- [x] **PQ2 — self-halt disposition:** **Answer: Drop the self-halt entirely (option a) — the orchestrator spawn-time gate is sufficient.** The implementer's self-halt (step 3:
  "if you are not running on the annotated model, stop") is a second gate after
  the orchestrator already passes the correct model at spawn time. What should
  happen to it? Options:
  (a) Drop the self-halt entirely — the orchestrator gate at spawn time is
      sufficient; the self-halt is dead code today (Recommended),
  (b) Keep the self-halt as defence in depth — it catches any future orchestrator
      that forgets to pass the parameter,
  (c) Replace with a soft warning — log "running on <actual> but annotation says
      <expected>" and continue, so humans notice drift without a hard-stop.

- [x] **PQ3 — annotation format:** **Answer: Single `**Compute:**` line (option a) — `model=… effort=… thinking=…`, replaces `**Model:**`. Reconciliation: PQ8's inline FIX-MODE spec reuses this same grammar as `(compute: …)`.** If effort and thinking budget are added alongside
  model, what format should the compute annotation take in `slices.md`/`tasks.md`?
  Options:
  (a) Extend the existing single line: `**Compute:** model=sonnet effort=low
      thinking=0` (a single key-value line, replaces `**Model:**`) (Recommended),
  (b) Keep `**Model:**` and add sibling lines `**Effort:**` and `**Budget:**`
      (three separate lines, backward-compatible but verbose),
  (c) A fenced YAML block per slice header (structured and lint-friendly, but
      heavyweight compared to a one-liner).

- [x] **PQ4 — effort vocabulary:** **Answer: `low` / `medium` / `high` (option a).** What value vocabulary should reasoning effort
  use? Options:
  (a) Three levels: `low` / `medium` / `high` — mirrors how effort is described
      in Claude Code's own documentation and is human-readable (Recommended),
  (b) Numeric 0–100 — more granular but requires defining what the numbers mean,
  (c) Boolean: `extended` / `normal` — simpler but coarser than three levels.
  Note: if PQ3 picks option (a) (Recommended), this answer determines the
  value that goes in the `effort=` field.

- [x] **PQ5 — thinking budget vocabulary:** **Answer: Integer token count (option a) — e.g. `thinking=8000`; maps directly to the Agent-tool parameter.** What vocabulary should the thinking
  budget use? Options:
  (a) Integer token count (e.g. `thinking=8000`) — maps directly to the
      Agent-tool parameter, no translation needed (Recommended),
  (b) Named sizes: `none` / `small` (4k) / `medium` (8k) / `large` (32k) —
      human-readable but requires a translation table,
  (c) Boolean `thinking=off|on` (on = a kit-defined default budget) — simplest
      to write, but hides the actual token cost.
  Note: if PQ3 picks option (a) (Recommended) and this picks (b) or (c), the
  orchestrator must translate the named value to a token count before passing
  it to the Agent tool.

- [x] **PQ6 — agent frontmatter defaults:** **Answer: Yes (option a) — add `effort:`/`budget:` frontmatter fields; implement reads per-slice from tasks.md, other stages read agent frontmatter defaults.** Should effort and thinking become
  machine-readable frontmatter fields in agent `.md` files (alongside the
  existing `model:` field), so stage commands that spawn those agents can pass
  them through automatically? Options:
  (a) Yes — add `effort:` and `budget:` (or equivalent) to agent frontmatter;
      the implement command reads them from `tasks.md`; other stage commands
      read them from the agent's frontmatter defaults (Recommended),
  (b) No — keep them only as per-slice annotation in `slices.md`/`tasks.md`;
      other stages inherit session defaults and only implement gains per-slice
      control,
  (c) Banner-prose only — document preferred effort/thinking in the
      `> **Recommended model:**` banner but do not add frontmatter fields; no
      machine-readable enforcement.

- [x] **PQ7 — lint enforcement:** **Answer: Yes (option a) — add a Check 13 that parses the annotation and flags unknown values. With the self-halt gone (PQ2), this is the only static gate.** Should `scripts/lint.mjs` gain a new check that
  validates the compute annotation line format (model alias, effort vocabulary,
  thinking budget range) in committed `slices.md` / `tasks.md` files? Options:
  (a) Yes — add a Check 13 that parses the annotation and flags unknown values;
      prevents silent typos from reaching the implement stage (Recommended),
  (b) No — prose convention is sufficient; a lint check would be brittle if the
      annotation format evolves,
  (c) Partial — lint checks only that the annotation line is present (existence
      check), not that its values are valid.
  Note: if PQ2 picks (a) (drop the self-halt), lint becomes the only static
  gate catching annotation gaps, which makes this question more consequential.

- [x] **PQ8 — post-PR fix mode:** **Answer: Allow inline compute spec (option b) — an optional inline spec in the follow-up task description; reuse the `**Compute:**` grammar as `(compute: model=… effort=… thinking=…)` per the PQ3 reconciliation note.** The `followup.md` / implementer's FIX MODE
  explicitly says "no `**Model:**` annotation to honor." Should effort and
  thinking be configurable for post-PR fixes as well? Options:
  (a) No — FIX MODE always inherits session defaults; post-PR fixes are
      one-off and the token cost is acceptable (Recommended),
  (b) Yes — allow an optional inline compute spec in the follow-up task
      description (e.g. `(compute: model=opus effort=high)`),
  (c) Per-follow-up type: P1 fixes inherit defaults; P2 amend-in-place fixes
      use the original slice's annotation; P3 deferred items start fresh.

- [x] **PQ9 — scope of "simplify":** **Answer: Keep per-slice granularity, clean up the annotation format (option a) — same decision as PQ1; PQ3–PQ7 all remain in scope.** The backlog item `simplify-per-slice-model-
  selection` says "consider a simpler lever or a single implement-stage model."
  Is the goal of this change to keep per-slice granularity but make the annotation
  format cleaner, or to actually reduce granularity to per-change or per-stage?
  Options:
  (a) Keep per-slice granularity, clean up the annotation format — the
      granularity IS the value; only the mechanism (self-halt + markdown knob)
      needs fixing (Recommended),
  (b) Collapse to per-change: one compute spec per change (in `design.md` or
      `proposal.md`), not per slice — simpler but loses intra-change cost
      optimization,
  (c) Collapse to per-stage fixed defaults: each QRSPI stage has a hardcoded
      or frontmatter-driven compute profile; no per-slice or per-change override.
  Note: the answer to PQ9 determines whether PQ3–PQ6 are relevant (they
  assume per-slice) or become moot (if granularity collapses to per-change/
  stage, the annotation in slices.md goes away entirely).
