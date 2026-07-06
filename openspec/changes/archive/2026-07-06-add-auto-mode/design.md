# Design — add-auto-mode

> Stage D of QRSPI. Generated 2026-06-29.
> **Implementation is BLOCKED until a human approves this file.**

## Context

QRSPI today is fully hand-driven: every `/qrspi:*` stage runs on the main-loop
orchestrator, spawns its subagent for the bounded artifact write, then pauses at
the canonical **commit step** and **next-stage handoff** AskUserQuestion gates
(plus stage-specific gates — Q's product-question pass, D's review loop, S's
design-approval gate, I's per-slice checkpoints, PR's create prompt, and the
Q/D/S backlog offers). A human chairing a flow they trust still has to click
through ~20 prompts per change.

This change adds a **ternary run-mode** — Full auto / Semi-auto / Manual —
chosen via a dedicated AskUserQuestion at the top of a *fresh* stage invocation.
**Full auto** chains `Q → R → D → S → V → P → I → PR` unattended, auto-advancing
the commit step (commit **and** push), the handoff, S's approval gate, I's
per-slice checkpoints, and PR-create — pausing **only** at the Q product-question
pass, the D review, the backlog offers, and the hard-stops. **Semi-auto** adds a
pause at every stage boundary. **Manual** is today's behaviour. There is **no
disk persistence** (PQ1/PQ12): the mode lives in the orchestrator's context for
the life of the chain and is re-asked whenever a stage is started standalone.

The product decisions (PQ1–PQ13) are settled and binding; this design spends its
depth on the one architectural reconciliation that PQ12 + PQ4 create — *how a
stage knows whether it is a fresh invocation (ask the mode) or a mid-chain
re-entry (inherit the mode)* with no disk state to consult — and on the hard-stop
risk PQ13 explicitly flagged.

**Current state (from research.md):** the four canonical procedures live in
`claude/skills/workflow/SKILL.md`; each stage command body carries only its
stage *variables* and references the skill via "follow the canonical *commit
step* / *next-stage handoff* in skill `workflow`". The handoff, on Continue,
**re-enters the next slash command in the same main-loop orchestrator** (it does
NOT spawn a subagent) — this continuity is the linchpin of the design below.
Lint Check 5 asserts main-loop-only tools (AskUserQuestion) are not reachable
from a command that declares a non-builtin `agent:`, matching both the inline and
the transitive (`` `workflow` `` + choreography-marker) forms.

**Desired end state:** the same 14 commands, plus a "read/establish run-mode"
step and per-gate auto branches sourced from one place in the `workflow` skill.
`copilot/` regenerates at zero drift; no Copilot-specific gate logic (PQ10).

## Goals / Non-Goals

**Goals:**
- A ternary run-mode chosen at the top of a fresh stage, carried in-process
  across a Full/Semi auto chain, re-asked on any standalone (resume/new-session)
  invocation — no disk artifact (PQ1/PQ9/PQ12).
- Full auto chains Q→PR, pausing only at Q, D, the backlog offers, and the
  hard-stops; Semi-auto additionally pauses at stage boundaries (PQ4/PQ9/PQ11).
- Auto-advance the commit step (commit + push, explicit-path `git add`
  unchanged), the handoff, S's approval gate (auto-Yes after the D pause), I's
  per-slice checkpoints (all slices straight through, per-slice model
  re-invocation preserved), and PR-create (PQ3/PQ6/PQ7).
- A precise, enumerated hard-stop set that fires regardless of mode (PQ2/PQ13).
- Single source of truth for the mode logic; `node sync-copilot.mjs --check`
  stays at zero drift (PQ10).

**Non-Goals:**
- **No disk persistence** of the mode (no marker file, backlog field, config, or
  `--auto` flag) — explicitly rejected (PQ1/PQ12).
- **No `/qrspi:stop` command** — abort is the standard Esc/stop interrupt,
  documented in the mode prompt (PQ5).
- **No Copilot-specific auto logic** — deferred to `reassess-copilot-port`
  (PQ10).
- **No new lint check** that simulates runtime gate suppression; verification is
  a dogfood walk (see D6 / Risks). A *structural* lint guard is offered as a
  separable backlog item, not built here.
- **`followup.md` is out of scope** — it is the post-PR fix loop, not a stage in
  the Q→PR chain (see D5).
- **The ticket-blind Research invariant and the context-firewall model are
  untouched** (see D7) — non-negotiable, called out so S does not weaken them.

## Decisions

### D1 — Mode logic lives as a new canonical procedure in `claude/skills/workflow/SKILL.md`, referenced by every stage (Q26)
Three options: (a) inline the mode-read + per-gate branching in each of the 8
command bodies; (b) add it to the existing "Stage choreography" section of the
`workflow` skill that every stage already references; (c) a new `auto-mode`
skill each command loads. **Chosen: (b).** The four invariant procedures already
live there and every stage command already says "follow the canonical … in skill
`workflow`"; option (a) is an 8-way DRY violation (the exact failure mode the
choreography section was created to kill), and (c) adds a second skill to load
for logic that *is* choreography. We add one subsection — **"Run-mode (Full /
Semi / Manual)"** — defining (i) the mode prompt, (ii) the fresh-vs-mid-chain
rule (D2), and (iii) an auto-branch clause folded into each of the existing four
procedure subsections (D4). Each command body gains one new line: a reference to
the run-mode procedure, alongside its existing choreography reference. *Rejected
(a)/(c) for DRY and load-cost.*

### D2 — Fresh-vs-mid-chain is decided by an in-process mode variable, not disk state (PQ1/PQ4/PQ12 — the central reconciliation)
This is the brain-surgery decision. PQ12 says re-ask on every *fresh* invocation;
PQ4 says Full auto auto-invokes the next stage *without* re-asking. They reconcile
because of a fact research confirmed: **the handoff re-enters the next slash
command in the same orchestrator context — it does not spawn a subagent.** So the
orchestrator's working memory is continuous across the whole chain. The rule:

> At the top of a stage command, the orchestrator checks whether it is already
> holding a run-mode from earlier in *this* context. **If it holds none → this is
> a fresh invocation → show the ternary mode prompt and record the answer in
> context.** **If it already holds one → this is an auto-chained re-entry → skip
> the prompt and inherit the held mode.**

No disk read, no signal-passing, no flag on the invocation. A Full/Semi chain
sets the variable once (at the entry stage), and each auto-re-entered stage sees
it already set and proceeds silently. The moment any stage command runs in a
context with no held mode — a brand-new session, or a human typing
`/qrspi:slices <id>` after a Stop — there is nothing to inherit, so it re-asks.

**Mechanism precisely:** the mode is **conversational state on the orchestrator**,
asserted by command-body instruction ("if you have not already established a
run-mode in this session, ask; otherwise reuse it"), exactly the way the
orchestrator already "remembers" the change id across the handoff today. We do
*not* pass an explicit `--mode` token on the re-entered slash command: that would
require the handoff to construct the invocation string and would resurface as
visible flag plumbing the human could mistype. *Rejected: marker file (PQ1
rejected disk state), explicit flag (PQ12 rejected, and it duplicates state the
context already holds).*

**Fragility (must be accepted to approve this decision):** the in-process variable
is the *only* carrier. If the human starts a fresh session in the middle of a
Full-auto run (context reset, crash, `/clear`), the resumed stage has no held
mode and **re-asks** the ternary prompt — the human simply re-picks Full auto and
the chain continues from that stage. There is no "the run was auto, resume it as
auto automatically" — that would require the disk state PQ1/PQ12 ruled out. **The
design accepts a mid-flow new session re-asking as correct, not a bug.** Confirm
this is acceptable (Open question OQ1).

### D3 — The mode prompt is a dedicated AskUserQuestion before any work, documenting Esc as the abort path (PQ5/PQ9/PQ12)
At the top of a fresh stage (per D2), before the precondition check, ask one
AskUserQuestion: question "Run mode for this QRSPI flow?"; choices —
**"Full auto — chain Q→PR, pause only at Q, D, backlog offers, hard-stops"** /
**"Semi-auto — auto-advance within-stage gates, pause at each stage boundary"** /
**"Manual — pause at every gate (today's behaviour)"**. The prompt text states:
*"Press Esc / stop at any time to interrupt a running auto chain."* (PQ5 — no
`/qrspi:stop`). It is a standalone question, **not** folded into Q's
product-question pass (PQ9). It appears at *whatever* stage is the fresh entry
point — usually `/qrspi:questions`, but `/qrspi:slices` if that is where a human
resumes (PQ12).

### D4 — Each of the four canonical procedures gains a mode-aware branch (wording sketches)
The auto-branch is "if mode is Manual → behave exactly as today (ask); if Full or
Semi → take the auto action *unless a hard-stop fires (D6)*", with two procedures
carrying a Semi exception:

- **Precondition check** — unchanged on the happy path. A *failing* precondition
  is a hard-stop in every mode (it always was — the stage refuses). S's added
  **approval gate** is auto-answered "Yes" in Full/Semi *when the D review
  happened earlier in this same chain* (PQ3): "If a run-mode is held (auto-chain)
  and the human approved `design.md` at the D pause, treat the approval gate as
  satisfied and do not ask; otherwise ask as today." A standalone `/qrspi:structure`
  (fresh, mode just re-asked) has no in-chain D approval to inherit, so it asks.
- **Commit step** — "If Full or Semi: stage the explicit paths, commit with the
  stage's exact message, and push — do **not** ask. `git add` stays explicit;
  **never `-A`** (PQ6/PQ16). Commit message is **identical** to manual (no `[auto]`
  suffix, PQ17). If Manual: ask as today." A push failure or dirty/conflicted
  tree is a hard-stop (D6).
- **Next-stage handoff** — "If Full: do not ask; re-enter the next slash command
  immediately (same main-loop context, so the held mode carries — D2). If Semi:
  **ask** ('Stage X complete — continue to Y?') even though within-stage gates
  were auto-advanced — this is the only behavioural difference between Full and
  Semi (PQ9). If Manual: ask as today." Re-entry is still the slash command, never
  a subagent (D7).
- **Backlog atomicity** — unchanged; the auto commit step stages `backlog.md`
  alongside the artifact exactly as the manual step does.

Stage-specific gates layer on top: **D review** always pauses (never suppressed,
PQ3/PQ11). **Backlog offers** (Q/D/S) always pause — "offer, never auto-append"
holds in every mode (PQ8); this is the deliberate exception to "only Q and D
pause". **I per-slice checkpoints** are auto-advanced in Full/Semi (all slices
straight through, auto-commit per slice), preserving per-slice model re-invocation
(PQ7/Q20) — only the human checkpoint is removed. **PR-create** is auto-executed
in Full/Semi (the "Create now or show first?" question, not the human code review,
PQ3-adjacent / Q3).

### D5 — Blast radius: the 8 stage commands + the skill + README + regenerated copilot; `followup.md`, lint, and templates out of scope
**In scope:** `claude/skills/workflow/SKILL.md` (the new run-mode subsection +
auto-branch clauses — the single source of truth, D1); all 8 stage command bodies
(`questions/research/design/structure/slices/plan/implement/pr.md`) gain a
one-line reference to the run-mode procedure; `README.md` (the eight-stage table
note + a short "Run modes" paragraph + the gate prose, per the kit's
keep-README-current rule); `openspec/backlog.md` (the `proposed` row for this
change); `copilot/` (regenerated — every command-body change flows through;
acceptance includes `node sync-copilot.mjs --check` exit 0, PQ28).

**Out of scope:** `claude/commands/followup.md` — it is the post-PR fix loop, not
a stage in the Q→PR chain a mode would chain through; folding it in would expand
scope without serving the auto-chain (Non-Goal). `scripts/lint.mjs` — no new check
(D6 / Risks; a structural guard is offered to the backlog). `openspec-templates/`
— untouched (no artifact shape changes).

### D6 — Hard-stop set is exactly PQ2/PQ13; lint/test failures are NOT standalone hard-stops (and that is the risk to weigh)
Forced pause regardless of mode, exactly: **(1)** a failing precondition check
(nothing to advance to); **(2)** a `git commit`/`git push` failure — dirty or
conflicted tree, or a rejected push; **(3)** a subagent returning an error or
signalling it is blocked; **(4)** (execution stages S→V→P→I) implementation or
structure **materially diverging** from the approved `design.md`/spec. Mechanism:
the canonical procedures already inspect the subagent's returned final message and
git command exit; the auto-branch in each procedure says "on any of the four
hard-stop conditions, stop the chain, surface the condition, and ask the human —
do not auto-advance." A hard-stop pauses *this stage*; it does not silently
downgrade the rest of the run to Manual (the human decides at the pause).

**Deliberately NOT hard-stops (PQ13):** `openspec validate` failure, lint/typecheck
failure, test failure, `gh pr create` failure. The intent is they surface via
hard-stop (3) — "subagent errors or blocks".

**OQ2 resolution (binding):** to make hard-stop (3) actually cover the red-build
case, the **implementer's contract is tightened**: on a failing
lint/typecheck/test (or `openspec validate`) at a slice boundary, the implementer
**must return error/blocked and must NOT commit that slice**. No 5th standalone
hard-stop is added (OQ2 option (a)). Stage S must encode this clause in the
implementer's contract; without it, Full auto could `git push` a red slice.

### D7 — Auto-chaining does not touch the ticket-blind Research invariant or the context firewall (PQ12 / Q12)
Auto mode changes *whether the orchestrator pauses*, never *how stages are
invoked*. The handoff still re-enters `/qrspi:research <id>` as its own slash
command on the main loop (never inlining the researcher, never passing it the
ticket), and every stage still spawns its subagent via the Agent tool for the
bounded write. Full auto re-entering Research immediately (no human click) is
behaviourally identical to a human clicking "Continue" instantly — the researcher
still starts fresh, ticket-blind. Lint Check 5 still holds: the run-mode logic
lives in the `workflow` skill the commands reference transitively, and no
non-builtin-`agent:` command gains an inline AskUserQuestion. **This invariant is
non-negotiable; S must not weaken it to "simplify" the chain.**

## Data model changes
Not applicable — this is a workflow/architecture change. The only "state" is the
in-process run-mode variable on the orchestrator (D2); it is never written to
disk (no entity, file, frontmatter field, or config).

## API surface
The slash-command surface is unchanged: same 14 `/qrspi:*` commands, same
arguments (no `--mode`/`--auto` flag — D2). The only new "call" is the run-mode
AskUserQuestion (D3) at the top of a fresh stage. The four canonical procedures
gain mode-aware branches (D4) but keep their existing signatures/wording for
Manual.

## UI surface
The "UI" is the AskUserQuestion dialog set. **Added:** the ternary run-mode prompt
(D3). **Conditionally suppressed in Full/Semi:** commit step, handoff (Full only),
S approval gate, I per-slice checkpoints, PR-create. **Never suppressed:** D
review, Q/D/S backlog offers (PQ8), hard-stop pauses (D6).

## Authorization
Not applicable — no roles or permissions. The human chairing the flow chooses the
mode; the standard Esc/stop interrupt is the only "override" of a running chain
(PQ5).

## Vertical slices (preview)
A preview for stage V — **slice by the run-mode behaviour reaching real stages
end-to-end**, not by file-type layers:

- **Slice 1 — Run-mode prompt + Manual no-op end-to-end.** Add the run-mode
  subsection to the `workflow` skill and the mode prompt + fresh-vs-mid-chain rule
  (D2/D3); wire one stage (Q) to read it. Demoable: running `/qrspi:questions`
  shows the ternary prompt; picking Manual behaves exactly as today.
- **Slice 2 — Full/Semi auto-advance the commit + handoff across the alignment
  chain (Q→R→D).** Add the auto-branches to the commit step and handoff (D4);
  Full auto chains Q→R and pauses at D; Semi pauses at each boundary. Demoable:
  a Full-auto run flows Q→R→D-pause with no commit/handoff clicks.
- **Slice 3 — Auto-clear S's approval gate + chain S→V→P (D4 PQ3).** Demoable:
  after approving at D, Full auto runs S→V→P unattended without re-asking
  "approved design.md?".
- **Slice 4 — Implement all-slices-straight-through + auto-commit per slice,
  model re-invocation preserved + PR-create (D4 PQ7).** Demoable: Full auto runs
  every slice and reaches a created PR.
- **Slice 5 — Hard-stops + README + copilot regen at zero drift (D6/D5).**
  Demoable: a forced precondition/push/divergence pauses the chain; `node
  sync-copilot.mjs --check` exits 0.

## Risks / Trade-offs

- **Auto-commit + push through a red build (the PQ13 risk — highest).** Since
  lint/typecheck/test/`openspec validate` failures are *not* standalone hard-stops
  (D6), Full auto can `git push` a broken slice **if** the implementer does not
  reliably signal "blocked" on a failing build. The whole safety of unattended
  Implement rests on hard-stop (3) firing. **Mitigation to decide (OQ2):** make
  the implementer's contract explicit — "on a failing lint/typecheck/test at a
  slice boundary, return an error/block (do not commit)" — so hard-stop (3)
  covers (c)/(d) without adding a fourth standalone hard-stop; *or* reconsider
  PQ13 and add a lint/test hard-stop. The designer's recommendation: tighten the
  implementer block-signal contract rather than re-open PQ13, because a pushed-then-
  reverted commit on a feature branch is cheap and the human reviews at PR — but
  this must be a conscious human choice, so it is surfaced as an open question.
- **In-process-only mode is fragile across sessions (D2).** A mid-flow new session
  re-asks the mode. Accepted by PQ1/PQ12 (the price of no disk state); flagged as
  OQ1 to confirm.
- **"Divergence from approved design" (hard-stop 4) is a judgement call.** Unlike a
  process exit code, "materially diverges" is semantic — the implementer/architect
  must self-assess and signal it. Risk of under-firing. Stage S should give the
  execution agents a concrete divergence rubric in their contracts.
- **Full auto re-entering Research instantly is correct but feels risky.** It is
  identical to an instant human "Continue" (D7); the firewall holds. Documented so
  reviewers do not "fix" it.
- **Copilot has no auto-chain analogue.** Claude-only by PQ10; `--check` zero-drift
  is the only Copilot acceptance bar. The Copilot gap is already a known fidelity
  gap and a separate backlog item.

## Open questions for the human  — RESOLVED at the D review (2026-06-29)
- [x] **OQ1 — Confirm in-process-only mode is acceptable.** A genuinely new session
  mid-chain (crash, `/clear`, new terminal) has no held mode and **re-asks** the
  ternary prompt; there is no auto-resume-as-auto. This is the direct consequence
  of PQ1/PQ12's no-disk-state decision.
  **Answer: Approved — re-ask on a new session is correct, not a bug.** No resume
  hint / disk state is added; the human re-picks the mode and the chain continues
  from that stage. PQ1/PQ12 stand.
- [x] **OQ2 — Resolve the red-build risk (PQ13 re-weigh).**
  **Answer: (a) keep PQ13 as-is and tighten the implementer's contract.** A failing
  lint/typecheck/test at a slice boundary must make the implementer **return
  error/blocked and NOT commit**, so the existing hard-stop (3) ("subagent errors
  or blocks") covers it. No 5th standalone hard-stop is added. This is now folded
  into **D6** as a binding contract clause (not just a risk).

---

**Separable future changes offered for backlog capture (decide per item):**
- **`lint-auto-mode-gate-coverage`** — a structural `scripts/lint.mjs` check
  asserting every stage command references the run-mode procedure and that the
  per-gate auto-branches stay consistent (the runtime behaviour itself is not
  statically checkable; this only guards the wiring). Offered, not built (D5 /
  Non-Goals).
