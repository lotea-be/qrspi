# Design — context-budget

> Stage D of QRSPI. Generated 2026-07-24.
> **Implementation is BLOCKED until a human approves this file.**

## Context

We are capping the per-stage context surface of the QRSPI kit on both sides of
the subagent firewall, and making the `context-hygiene` under-40% principle
mechanically enforced instead of prose-only. This is a kit-only change to
`claude/agents/*.md`, `claude/skills/context-hygiene/SKILL.md`, `scripts/lint.mjs`,
plus a new `scripts/` utility, README, and CHANGELOG. It bundles two settled
backlog levers (PQ1): the **input side** (trim which skills each agent auto-loads;
declare + lint the allowed set) and the **output side** (bound each subagent's
return payload; assert an `> **Output contract**` banner is present).

Today (from research.md): skill loads are **agent-side**, not command-side —
commands load only `qrspi-version-check` (+ `workflow`/`openspec-workflow` inline
in `questions.md`). Each of the seven stage agents loads its own set in its step 1.
`openspec-workflow` is loaded by six of seven agents but only two of them
(architect, reviewer) actually touch OpenSpec spec/proposal artifacts.
`context-hygiene` is loaded by only two agents (designer, implementer). Five of
seven agents already return tight 3–5 line formats; the **implementer** (8-section
per-slice) and **reviewer** (open-ended issue list) are the two unbounded returns.
No instrumentation exists; 40%/60% are prose in `context-hygiene`. Lint has 11
checks; Check 7 (`checkReadContracts`) uses a hardcoded `READ_CONTRACT_EXPECTED`
map + banner-line parse, and Check 2 (`checkSkillRefs`) already harvests every
backtick skill name from each agent's `Load skills` lines (existence check only).

Desired end state: each agent loads a **minimal, declared** skill set enforced by
a new allowlist assertion in lint; each agent carries an `> **Output contract**`
banner whose presence a new Check 12 asserts; a `scripts/context-footprint.mjs`
prints a deterministic per-stage byte/line estimate; and `context-hygiene` gains a
short pointer to the enforcement so the 40% number is no longer unbacked prose.

## Goals / Non-Goals

**Goals:**
- Trim each agent's skill loads to only what that stage uses (PQ5); no behavioural
  change to any stage's output artifact.
- A central `SKILL_SET_EXPECTED` registry in `scripts/lint.mjs` (PQ2) + a lint
  assertion that each agent loads exactly its declared set (Check 2 extension).
- An `> **Output contract**` banner on each of the seven agents + a new Check 12
  asserting the banner is present (existence only — PQ3).
- A `scripts/context-footprint.mjs` static estimator (PQ4), CI-runnable.
- README + CHANGELOG `## [Unreleased]` updated in this change; no migration
  manifest (PQ6).

**Non-Goals (candidate backlog spin-offs):**
- Live/runtime context-% telemetry — Claude Code does not expose it to an agent
  (PQ4). Out of scope by construction.
- Content-level output-contract linting (max-line-count parsing) — PQ3 settled on
  existence-only. *Candidate backlog idea if drift appears.*
- A runtime read-set guard (asserting an agent only *reads* its Read-Matrix row) —
  distinct from the skill-load allowlist; overlaps `enforce-research-ticket-hiding`
  (Q41). *Leave to that item.*
- Rewriting the implementer/reviewer verbose formats into something lossy. We add
  a banner and a cap statement, not a redesign (see D4).

## Decisions

### D1 — Trim `openspec-workflow` from the four agents that never touch OpenSpec spec/proposal artifacts

`openspec-workflow` teaches OpenSpec folder layout, the artifact↔stage map, and
`openspec validate --strict`. Only **architect** (writes `proposal.md` + `specs/`,
must validate) and **reviewer** (reads the whole folder end-to-end incl. specs)
genuinely need it. **Remove it from researcher, questioner, designer, and
planner** — each of those writes a QRSPI-only artifact (`research.md`,
`questions.md`, `design.md`, `tasks.md`) and gets its change-folder/read-matrix
knowledge from `workflow`. Rejected: leaving it everywhere "for safety" — that is
exactly the habitual load this change exists to cut, and research confirms these
four never invoke a spec/proposal/validate rule. The rule is legible:
**`openspec-workflow` loads iff the agent produces or validates an OpenSpec
spec/proposal artifact.** (Answers Q1, Q2, Q3, Q7.)

### D2 — Keep `repo-surface` and `vertical-slice` where they shape output; do not trim them

`repo-surface` governs which sections each artifact-producing agent emits
(questioner, designer, architect, planner, reviewer) — dropping it would
regress the surface-gating those agents depend on, so **keep it on all five**.
`vertical-slice` is kept on architect (cuts slices at V) and planner (groups
tasks by slice) — although P consumes slices from `slices.md`, the slice *model*
(vertical vs. horizontal) still guides task grouping and the cost of dropping it
(layered tasks) outweighs the ~140 lines saved. Rejected trimming `vertical-slice`
from P (Q5): the saving is real but the regression risk is a genuine behaviour
change, and this change's contract is "no output behaviour change." (Answers
Q4, Q5, Q10.)

### D3 — `context-hygiene` loads on researcher + designer + implementer; do NOT blanket-load it into all seven agents

The under-40% principle applies to every stage, but `context-hygiene` is largely
**orchestrator/firewall guidance** — much of its value is to the main loop
deciding when to delegate and reset, not to a bounded subagent that already does
one job and returns. Blanket-loading its 78 lines into all seven subagents is
precisely the per-stage bloat this change fights. **Load it on the three
heaviest-read stages — researcher, designer, and implementer** — where the
self-check earns its cost when reads balloon (researcher added per OQ1: it does
the heaviest reads of any stage). The other four agents (questioner, architect,
planner, reviewer) do **not** carry it; instead add a one-line pointer from
`context-hygiene` to the new lint enforcement + footprint script so the 40%/60%
numbers are backed by a mechanism. Rejected: "load it everywhere since every stage
can hit 40%" — that trades a real, measured token cost for a self-check the
subagent cannot act on mid-run anyway. Note: the researcher's `SKILL_SET_EXPECTED`
entry (D5) must now include `context-hygiene`. (Answers Q28; OQ1 resolved — add
researcher.)

### D4 — Output side: add a `> **Output contract**` banner to all seven agents; leave the verbose formats structurally intact

PQ3 settled on **existence-only** enforcement. Add one banner line per agent,
mirroring the read-contract banner shape, e.g.
`> **Output contract** — Returns: <artifact path> + <N-line summary> + <next command>. No inline diffs or file bodies.`
The banner is the machine-checkable anchor (Check 12); the human keeps its content
honest. Five agents already satisfy the intent — the banner formalises it. For the
two unbounded returns we add a **cap sentence**, not a rewrite: the **implementer**
keeps its per-slice sections but the banner states "one-line bullets only, no file
bodies or diffs"; the **reviewer** banner states "issue titles + one-paragraph
each, path list, no pasted file contents." This bounds growth without losing the
slice-checkpoint signal the human relies on. (Answers Q16, Q18, Q19, Q21, Q22.)

### D5 — Separate `> **Skill contract**` banner from the `> **Output contract**` banner; keep the skill *allowlist* in lint, not in a third banner

PQ2 puts the declared skill set in a `scripts/lint.mjs` registry, not in a banner
— so there is **no `> **Skill contract**` banner**. The lint reads each agent's
existing `Load skills` line (Check 2 already harvests those names) and compares the
harvested set against `SKILL_SET_EXPECTED[stem]`. This keeps agent files carrying
exactly **two** banners (Read contract + Output contract), and the skill set stays
a pure lint concern. Rejected combining skill-set + output into one banner: they
enforce different things (a set equality vs. a presence check) and combining
couples two unrelated lint checks. (Answers Q23, Q24, Q26; PQ2/PQ3.)

### D6 — Conditional stack-cheatsheet load is *excluded* from the skill-set allowlist; the allowlist covers only the unconditional kit skills

Every agent conditionally Globs and loads the `<repo>-stack` cheatsheet ("if it
defines one"). Because it is discovered by Glob (not a literal `Load skill \`name\``
with a fixed name) and is optional, it is **not** part of `SKILL_SET_EXPECTED` and
the allowlist check ignores it. The registry lists only the fixed, unconditional
kit skills per stage. This mirrors Check 7 scoping itself to a known key set.
(Answers Q27 — conditionality is handled by exclusion, not by a "maybe" marker.)

### D7 — `scripts/context-footprint.mjs`: deterministic per-stage byte/line report, CI-runnable, no live session

PQ4's estimator sums, per stage: the agent file + each declared skill's
`SKILL.md` + `workflow`/other shared skills the agent loads + a nominal
stack-cheatsheet allowance. Output is a table (stage, skill count, total lines,
total bytes, rough token estimate = bytes/4) printed to stdout, exit 0. It is a
**visibility** tool, not a gate — it does not fail CI on a threshold (a hard
budget number is unowned; see OQ2). It reuses the same `SKILL_SET_EXPECTED` map as
the lint so the two never drift. Rejected a pass/fail budget gate: no defensible
absolute token ceiling exists yet, and a wrong ceiling would block legitimate work.
(Answers Q4/PQ4, Q29, Q30, Q31, Q11 — confirms no live % exists.)

### D8 — No command-side skill trims; the firewall side that holds each skill is settled by D1–D3

Research confirms commands load only `qrspi-version-check` (+ `workflow`/`openspec-workflow`
inline in `questions.md`). The firewall answer (Q8): **shared skills live on the
subagent that uses them**, because the subagent is the bounded worker; the command
(orchestrator) needs only `qrspi-version-check` + the choreography from `workflow`.
`questions.md`'s inline `openspec-workflow` reference is the one exception to tidy —
**leave it**, it is prose guidance for the orchestrator's folder-creation step, not
a duplicate subagent load. No command file changes for the trim. (Answers Q8, Q13.)

## Data model changes

No database. New/changed durable structures:
- `scripts/lint.mjs`: add `SKILL_SET_EXPECTED` (stem→array of skill names, mirrors
  `READ_CONTRACT_EXPECTED`); add `OUTPUT_CONTRACT` presence check (Check 12); extend
  Check 2's `checkSkillRefs` (or a sibling `checkSkillSets`) to assert set equality.
- `scripts/context-footprint.mjs`: new file, no deps, Node built-ins only.
- Each `claude/agents/<stem>.md`: one new `> **Output contract**` banner line;
  four agents lose `openspec-workflow` from their `Load skills` line.

## API surface

No HTTP surface. The "surface" is lint behaviour + one new script:
- **Check 12 (`checkOutputContracts`)** — for each of the seven stage agents,
  assert a line matching `/^>\s*\*\*Output contract\*\*/` exists. Error if absent.
- **Skill-set assertion** — harvested skill names (minus the conditional stack
  cheatsheet) per agent must equal `SKILL_SET_EXPECTED[stem]`; report added/missing.
- **`node scripts/context-footprint.mjs`** — prints the per-stage footprint table;
  exit 0 always (visibility, not gate).

## UI surface

None (no UI surface in this repo).

## Authorization

None (no auth surface).

## Vertical slices (preview)

Each slice is end-to-end (source edit + its lint/CI gate green), demoable by
running `node scripts/lint.mjs`:

- **Slice 1 — Input trims + skill-set registry & lint (D1, D2, D5, D6):** add
  `SKILL_SET_EXPECTED`, extend Check 2 to assert the allowlist, remove
  `openspec-workflow` from the four agents; lint green proves the trims match the
  registry. Demoable: lint passes; a deliberate stray load fails.
- **Slice 2 — Output-contract banners + Check 12 (D4):** add the banner to all
  seven agents (incl. the cap sentence for implementer + reviewer), add Check 12;
  lint green. Demoable: removing a banner fails Check 12.
- **Slice 3 — Footprint script (D7):** add `scripts/context-footprint.mjs`;
  running it prints the per-stage table. Demoable: table output.
- **Slice 4 — context-hygiene pointer + README + CHANGELOG (D3, PQ6):** add the
  enforcement pointer to `context-hygiene`, document the two new checks + script in
  README, record under `## [Unreleased]`. Demoable: README lint (Check 4) green.

## Risks / Trade-offs

- **Trimming a skill an agent silently relied on.** Mitigated by D1's legible rule
  (spec/proposal/validate ⇒ keep) and by re-reading each trimmed agent's body for a
  cited `openspec-workflow` rule before removing. Watch-item for stage I: grep each
  trimmed agent for any `openspec validate`/spec-folder instruction that assumes the
  skill.
- **Existence-only Check 12 can't stop a banner that lies.** Accepted per PQ3; the
  human keeps content honest. Content-lint is a Non-Goal / backlog candidate.
- **Footprint estimate is coarse** (bytes/4 tokens; ignores harness system prompt).
  Accepted — it is a relative visibility signal, not an accounting tool.
- **Check 2 vs. new allowlist interaction (Q26).** Check 2 today is existence-only;
  the allowlist is additive. Confirm the extension does not make Check 2 reject the
  conditional stack-cheatsheet name — D6 excludes it, but verify the harvester's
  name set is filtered before the equality compare (stage-I watch-item).

## Open questions for the human

- [x] **OQ1 — context-hygiene coverage.** D3 kept `context-hygiene` on
  designer + implementer only. **Answer: also add the researcher** (heaviest-read
  stage) — D3 updated to researcher + designer + implementer; the researcher's
  `SKILL_SET_EXPECTED` entry gains `context-hygiene`.
- [x] **OQ2 — footprint as gate vs. report.** D7 makes the script report-only (no
  CI threshold). **Answer: pure report table** — no advisory ceiling for now
  (no defensible number exists yet); a soft warning can be added later. D7 stands.
