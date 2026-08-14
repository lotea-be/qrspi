---
name: workflow
description: The eight-stage QRSPI workflow (Questions, Research, Design, Structure, Slices, Plan, Implement, PR) used on top of OpenSpec -- the stage model, the per-stage Read Matrix, and the divergence rubric. Load this when you need to know what stage you are in, what the next stage is, or why a stage exists. The main-loop choreography (run-mode, precondition check, commit step, next-stage handoff, hard-stops) lives in the companion skill stage-choreography, which orchestrator command bodies load in addition to this one.
metadata:
  source: https://alexlavaee.me/blog/from-rpi-to-qrspi/
  audience: all-agents
---

## What QRSPI is

QRSPI is the successor to Dex Horthy's RPI (Research → Plan → Implement). It
fixes three failure modes RPI exhibited at scale:

1. **Instruction budget overflow.** Mega-prompts silently drop deep
   instructions. QRSPI restructures into smaller stages so each stage has a
   shorter prompt.
2. **Magic-word dependency.** Workflows that only work when the user types
   exactly the right phrase are broken. Each QRSPI stage produces the right
   behavior by default.
3. **The plan-reading illusion.** Plans read well but build poorly. QRSPI
   front-loads alignment (Q + R + D) before any code planning happens.

> **Acronym lineage note.** QRSPI / "Crispy" is a lineage label from the RPI
> ancestry; Design, Slices, and PR sit outside the five acronym letters
> (Q-R-S-P-I). The kit intentionally orders **Slices (V) before Plan (P)** --
> slices-then-tasks is the natural data flow (Plan needs the slices as input)
> and is an intentional divergence from the RPI blog's Plan-before-Work-Tree
> ordering.

## Before Q — the backlog

QRSPI starts at Q, but candidate changes are tracked beforehand in
`openspec/backlog.md`. Each row is a heading carrying an `idea` /
`proposed` / `in-progress` / `merged` status and a one-line *Why*, and the
rows are **grouped under a `##` section per status** (`## Ideas`,
`## Proposed`, `## In progress`, ...) — so flipping a row's status also
moves it under the matching section. See "Backlog atomicity" in skill
`stage-choreography` for the frozen heading grammar. Consult it when
deciding what to propose next, and update the matching row whenever a
change is proposed, merged, or archived (remove archived rows — the
`openspec/changes/archive/` folder is the source of truth for completed
work). `/qrspi:archive` is the command that performs that removal,
atomically with the folder move. The backlog is not a stage and produces
no QRSPI artifact; it just feeds Q.

**Always commit the backlog edit in the same commit as the state change
it reflects** — never as a separate follow-up. If you're proposing a
change folder, archiving one, or merging a PR, the matching `backlog.md`
edit goes in that same commit. This keeps the backlog atomic with the
truth it describes.

### Capturing deferred work

As the alignment stages run, they surface work that is deliberately *not*
part of the current change — a Non-Goal, an "out of scope" item, a scope
answer that pushes something to "later". There are two kinds, handled
differently:

- **In-change follow-ups** (a gap *this* PR will leave: a reviewer open
  issue, "mocked now, real impl in a later slice") belong in the change's
  `followups.md`, **not** the backlog. See "After PR — the fix loop".
- **Separable future changes** (genuinely a *different* change: "rate-limit
  the new endpoint", "migrate the old callers") become a new `idea` row in
  `openspec/backlog.md`.

Stages **Q, D, and S** capture the second kind, under these rules:

1. **Offer, never auto-append.** Present each candidate to the human one at
   a time (AskUserQuestion: *Add as idea / Skip*). The human decides per
   item; a skipped item is dropped, not re-asked.
2. **Dedup first.** Skip any candidate already covered by an existing
   backlog row — match on intent, not exact wording.
3. **Minimal row.** An accepted item is one `idea` row with a one-line
   *Why*. Do not pre-fill a *Likely shape* the human hasn't scoped.
4. **Same commit.** Added rows land in the same commit as the stage's
   artifact, per the atomic-commit rule above.

R and V do not capture: R is ticket-blind (it cannot judge what is in or
out of scope), and V's cut slices are almost always the same change
deferred to a later slice — an in-change concern, not a new backlog item.

## The eight stages

### Alignment phases (5)

**Q — Questions.** Identify what the agent does not know. Generate targeted
technical questions that force the model to touch the relevant parts of the
codebase. Artifact: `openspec/changes/<id>/questions.md`.

**R — Research.** Gather objective facts about the current codebase. **The
ticket is hidden from this stage.** The agent traces logic, lists endpoints,
maps the data model, and produces a factual record — no recommendations, no
opinions about the change. Artifact: `openspec/changes/<id>/research.md`.

**D — Design.** The agent brain-dumps its understanding into ~200 lines of
markdown: current state, desired end state, design decisions. **The human
reviews this and may rewrite it.** This is "brain surgery" — the place to
correct architectural assumptions before any code is planned. Artifact:
`openspec/changes/<id>/design.md`. **Never proceed to S without human review.**

**S — Structure.** The "C header file" of the change. Signatures, new types,
high-level phases, and the vertical slices that will be built. Artifact:
`openspec/changes/<id>/proposal.md` plus `openspec/changes/<id>/specs/`.

**P — Plan.** Tactical task list. Because D and S are already aligned, this
should only be spot-checked, not deeply reviewed. Artifact:
`openspec/changes/<id>/tasks.md`.

### Execution phases (3)

**V — Slices.** Takes the proposal and cuts it into vertical slices. Each
slice maps to a testable unit of work. Artifact:
`openspec/changes/<id>/slices.md`.

**I — Implement.** Write code. Tick tasks in `tasks.md` as you go.

**PR — Pull Request.** Human reviews the code. No exceptions. Because Design
and Structure were already aligned, this review is fast and contains few
surprises. `/qrspi:pr` records the PR link in `openspec/changes/<id>/pr.md`
and seeds `followups.md` with any open issues the reviewer found.

### Read Matrix — what each stage may open

Each stage agent reads the strict minimum the human approved in Q. Reading
more than the row below burns tokens and blurs the stage boundary. This table
is the **single authoritative source** of the per-stage read contract; the
`> **Read contract**` banner at the top of each `claude/agents/*.md` is a terse
mirror of its row, and lint Check 7 (`checkReadContracts`) asserts each banner
equals its row here. All paths are relative to the current change folder
`openspec/changes/<id>/` unless stated otherwise.

| Stage | Agent | Reads (within-change) | Cross-change |
|-------|-------|-----------------------|--------------|
| R  | researcher  | *none* — the whole `changes/<id>/` folder is banned | spec.md only |
| Q  | questioner  | backlog + templates (no change-folder artifact) | spec.md only |
| D  | designer    | `questions.md`, `research.md` | spec.md only |
| S  | architect   | `design.md` | spec.md only |
| V  | architect   | `proposal.md`, `specs/` | spec.md only |
| P  | planner     | `slices.md` | spec.md only |
| I  | implementer | `tasks.md` | spec.md only |
| PR | reviewer    | full `changes/<id>/` folder (by design) | spec.md only |

Two rows carry a special case:

- **Architect (S vs. V) — two-mode contract.** The architect runs both the
  Structure stage and the Slices stage, and its read set differs by mode: at
  **S** it reads `design.md` only (the designer has already distilled
  `questions.md` + `research.md` into it); at **V** it reads `proposal.md` +
  `specs/` only. It never reopens `questions.md`/`research.md` once past D. Its
  banner encodes both modes: `Reads (S): design.md. Reads (V): proposal.md,
  specs/.`
- **Reviewer — full folder by design.** The PR reviewer intentionally reads the
  *entire* current change folder — there is no within-change restriction for it,
  because its whole job is to check the change end-to-end. This is the sole
  "read everything" row and is deliberate, not a gap.

#### Helper agents

Helper agents are spawned by kit commands (not stage commands) to perform a
bounded, one-job task. They are not QRSPI stages and do not carry a stage row
in the table above. Their read contract is governed by the same cross-change
boundary as stage agents, with a different within-change read set:

| Agent | Spawned by | Reads (within-change) | Cross-change |
|-------|------------|-----------------------|--------------|
| spec-syncer | `/qrspi:archive` | `specs/**` (delta only) | `openspec/specs/**` (main, via the spec.md exception) |

The `spec-syncer` agent opens **no process artifacts** -- not `questions.md`,
`research.md`, `design.md`, `proposal.md`, `slices.md`, `tasks.md`, `pr.md`,
or `followups.md` -- of this change or any other. Lint Check 17
(`checkHelperAgentReadContracts`) asserts its `> **Read contract**` banner
matches this table, keeping the two surfaces in sync.

#### Cross-change boundary (the `spec.md` exception)

On **every** stage agent, one boundary holds regardless of the within-change
row above: **no agent may read another change's *process* artifacts** —
`questions.md`, `research.md`, `design.md`, `proposal.md`, `slices.md`,
`tasks.md`, `pr.md`, or `followups.md` — whether that other change is in-flight
under `openspec/changes/<other-id>/` or archived under
`openspec/changes/archive/`. Do not skim an archived worked example, do not
honour a trigger recorded in another change's `design.md`, do not "check how
the last change did it" by opening its process files.

**The sole exception is any `spec.md`.** Base specs under `openspec/specs/**`
and delta `specs/**/spec.md` inside other or archived changes are the durable,
shared contract surface and MAY be read across changes (e.g. the designer
sources scheduled triggers from base specs; the researcher may consult base
specs). Everything else in another change's folder is off-limits. This is the
single home of this rule — each agent banner ends with a short pointer back to
it (`…no other change's process artifacts (spec.md excepted — see workflow
skill Read Matrix)`) rather than restating it.

## After PR — the fix loop

QRSPI ends at PR, but follow-ups always surface afterwards: the reviewer's
"Open issues" list and code-level retrospective flags. These are tracked as
checkboxes in `openspec/changes/<id>/followups.md` and resolved with
`/qrspi:followup <id>` — a loop that hangs off the PR stage, not a ninth
stage.

Before resolving each follow-up, `/qrspi:followup` runs a **triage gate**
(never suppressed in any run-mode) that right-sizes the item and routes it to
one of three paths:

- **P1 — implement directly.** The fix is small, atomic, and in-scope. The
  implementer is spawned in FIX MODE (see skill `postpr-fix`); code, tests,
  and the change's **delta** spec are kept in sync; the `followups.md` box is
  ticked `-- fixed in <sha>` on commit. This is the original path and the
  common case.
- **P2 — amend this change in place.** The fix needs design re-alignment or
  spans multiple capabilities but still belongs to *this* change and its **open
  PR**. The orchestrator amends the parent change in place (reusing
  `implement.md`'s "Adding scope after stage I" flow): edit the affected
  `design.md` decision / delta `specs/**`, add a `## N.` vertical-slice group to
  `slices.md` + `tasks.md`, commit on the same branch, tick the follow-up
  `(re-aligned in place -- slice N)`, then **offer** `/qrspi:implement <id>`. No
  separate folder, branch, or PR; no implementer is spawned to triage. If the
  parent PR has already merged, or the work needs its own branch/PR, it is P3
  instead.
- **P3 — defer to backlog.** The fix is genuinely new scope (or needs its own
  branch/PR, or the parent PR has merged). An `idea` row is appended to
  `openspec/backlog.md` and the follow-up is ticked
  `(deferred to backlog -- <slug>)`. No implementer is spawned.

The agent proposes a path from a four-signal heuristic rubric (contract
change? multi-capability? design re-alignment? new scope?); the human
confirms or overrides. The triage gate is always shown -- it cannot be
auto-advanced in Full or Semi-auto mode.

The change is ready to archive only when `followups.md` has no un-ticked
boxes. P2 and P3 tick the box at disposition time, so they count as resolved
for archival purposes even though work continues in the added slice (P2) or
the backlog (P3).

## Rules of the road

- One change at a time. Never run two QRSPI flows in the same session.
- Each stage's bounded artifact write is delegated to a subagent via the
  Agent tool, so the orchestrator's context stays clean. See skill
  `context-hygiene`.
- Hide the ticket during Research. This is the most important rule.
- Vertical slices in Structure, not horizontal layers. See skill
  `vertical-slice`.
- "Looks plausible" is the failure mode. Plans that read well do not
  necessarily build well. Verification must go deeper than reading.
- **Least friction: prefer `AskUserQuestion` over emitting a command to run.**
  The kit's goal is the least friction for the user. When a step ends with an
  obvious next action — advance to the next stage, re-enter the follow-up loop,
  build a just-added slice, retry after a fix — offer it as an `AskUserQuestion`
  choice and act on the pick, rather than printing a `/qrspi:…` line for the
  user to copy and run. Emitting a command is the *fallback* for when no
  interactive choice is possible; a bare "now run X" is a friction smell worth
  designing out. (The Run-mode auto-advance rules are this principle applied to
  stage chaining; extend the same instinct to every hand-off.)

## When you can skip stages

Trivial changes (typo, lint fix, dependency bump under a patch version)
can skip directly to `/qrspi:implement` with an inline one-paragraph plan.
Anything that touches the data model, an API surface, or auth must go
through the full flow. (These are web-app examples of surfaces that
warrant the full pipeline. For other repo types, check the stack-cheatsheet
`## Repo surface` block to identify which surfaces your repo exposes; a
change touching any present surface benefits from the full flow.)

## Divergence rubric (hard-stop condition 4)

The orchestrator's hard-stop procedure lives in skill `stage-choreography`;
its condition (4) -- "execution-stage output materially diverging from the
approved `design.md` or spec" -- is the one hard-stop only the **subagent**
can recognise, so the rubric for it lives here, where every stage agent
already loads.

Condition (4) is a semantic self-assessment, not a process exit code: the
execution-stage subagent (S, V, P, or I) is the only thing that can recognise
it, so it MUST self-check its output against this rubric before returning.
Treat the output as "materially diverges from the approved `design.md`/delta
spec" -- and therefore a hard-stop -- when **any** of the following holds:

- **(a)** it changes or drops a decision recorded in `design.md` (D1...Dn) or
  a Requirement/Scenario in the change's delta spec
  (`openspec/changes/<id>/specs/**`);
- **(b)** it introduces a new capability, public API surface, data-model
  change, or dependency that is not present in the approved design;
- **(c)** it contradicts a stated Non-Goal, or an approved product-question /
  open-question answer (PQ/OQ);
- **(d)** it alters an observable contract -- a signature, a gate's behaviour,
  or a commit/branch/push side effect -- beyond what the design describes.

**Immaterial elaboration is NOT a divergence** (normal implementation
latitude -- do NOT signal, or the hard-stop over-fires): naming, internal
structure and organisation, wording and comments, test mechanics and coverage
depth, and any detail the approved design deliberately left open. When the
design is silent on a point that does not touch (a)-(d), choosing an approach
is implementation, not divergence.

**Response on a material divergence:** the subagent MUST NOT proceed silently
and MUST NOT commit. It surfaces the specific divergence in its final message
-- which decision (D-number) / delta requirement / contract it departs from,
and how -- and returns an error/blocked signal. The orchestrator treats that
signal as hard-stop condition (4): stop the chain, surface the divergence, and
ask the human how to proceed. Each execution-stage agent contract references
this rubric and commits to the self-check; the criteria live here (single
source of truth).

## Orchestrator procedures live in `stage-choreography`

The four canonical procedures every stage command runs on the main loop --
run-mode establishment, precondition/approval check, commit step, and
next-stage handoff -- plus the hard-stop procedure, backlog atomicity, and the
stage-specific gate notes, live in the companion skill `stage-choreography`.

They are **orchestrator-only**: a stage subagent never runs them, because it is
spawned via the Agent tool for one bounded artifact write and returns a
condensed result. Splitting them out keeps that choreography out of the context
of every subagent that loads `workflow` for the stage model and the Read
Matrix alone.

If you are running a `/qrspi:*` command body on the main loop, load
`stage-choreography` as well -- every stage command does so in its opening
steps.
