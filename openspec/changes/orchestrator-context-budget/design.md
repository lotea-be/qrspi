# Design — orchestrator-context-budget

> Stage D of QRSPI. Generated 2026-07-28.
> **Implementation is BLOCKED until a human approves this file.**

## Context

QRSPI firewalls each stage behind a subagent, so every *stage* stays lean — but
the **orchestrator's own** conversational context is never reset between stages
or between changes in one terminal session. It grows monotonically: every
AskUserQuestion, every condensed subagent return, every commit/handoff dialogue
adds to it. A real consumer hit 982k/1m (98%) context at the **D review of their
SECOND change** in one session — roughly 8 stage-events of change 1 + ~4 of
change 2 + followup traffic ≈ 12–15 stage-events before overflow. The
`context-hygiene` skill already states the 40%/60% principle, but nothing names
this specific marathon anti-pattern and nothing *acts* on it mid-session.

Research (resolving PQ1) confirms there is **no live harness signal** a
slash-command body can read for context-window utilization, token count, message
count, or session size. `context-footprint.mjs` is a static file-size estimator;
the version check reads only static files. The 40%/60% numbers are prose targets
backed by lint checks, not a runtime gauge. Therefore the budget gate **cannot**
be a real-time %-read — it must be a **structural heuristic**.

The desired end state: reset-and-resume is a blessed, first-class step at natural
boundaries, and a shared **in-context stage-event counter** (the same
conversational-flag mechanism the version-check flag and run-mode already use, no
disk backing) drives a two-level nudge/soft-gate at the top of all eleven
long-session command entry points — so a marathon session self-interrupts before
it degrades.

## Goals / Non-Goals

**Goals:**
- A single shared budget-gate mechanic (a new skill, mirroring `qrspi-version-check`)
  embedded at the top of all 11 long-session commands, so wording stays in sync.
- An in-context stage-event counter with two calibrated thresholds: a once-fired
  **nudge** and a once-fired **soft gate** (never-suppressed AskUserQuestion).
- A blessed post-archive reset offer (new archive step 7) and a post-followup-batch
  nudge, plus a documented one-line resume path.
- Harden `context-hygiene` to name the marathon anti-pattern with accurate
  vocabulary (cross-**stage** within one session, not "cross-session").
- Add the soft gate to the `workflow` skill's "Never-suppressed gates" list.

**Non-Goals** (load-bearing fences unless noted):
- **Automating the reset** (LB) — no harness primitive lets the orchestrator
  reset its own context; we recommend/gate only. Every "reset now" branch prints
  the resume path and ends the turn. **Verified (D12):** even `/clear` cannot be
  auto-invoked — slash commands are user-initiated REPL directives (a
  model-emitted `/clear` is inert text; there is no `SlashCommand` invoke API; and
  `/clear` would wipe the turn attempting it). So the resume instruction *names*
  `/clear` for the human to run; it never runs it.
- **A live-% mechanism** (LB) — infeasible per PQ1/research; do not design one.
- **Persisting the counter to disk** (LB) — in-context only; drift on `/clear` is
  acceptable because the counter is always a *lower bound* (see D3).
- **Tracking subagent context** (LB) — orchestrator window only.
- Per-stage input/output load — the archived `context-budget` axis (incidental).
- The `orchestrator-effort-targeting` per-turn effort axis (incidental).

## Decisions

### D1 — Shared mechanic: a new `context-budget-gate` skill (not per-command prose)
Chose a **new skill** loaded at the top of each command, exactly mirroring
`qrspi-version-check`. Rejected copy-pasting prose into 11 files: 11 divergent
copies of threshold numbers and resume text would drift. The skill owns the
counter-increment rule, both thresholds, the nudge text, the soft-gate
AskUserQuestion shape, and the resume-path string. Each command carries one embed
line (`Load skill \`context-budget-gate\` and follow its instructions exactly.`).
Answers Q5, PQ6, Q13. (New `claude/skills/context-budget-gate/` auto-registers; no
`plugin.json` edit.)

### D2 — Insertion point: after version-check, before run-mode
The version check is "the very first step, before run-mode and before any other
work." The budget gate runs **as the next step, after the silent version check
and before run-mode establishment**. Rationale: the version check may hand off to
`/qrspi:update` (ending the turn); no point counting/gating a turn that is about
to leave. Run-mode is per-flow state the gate does not need. So order is:
(1) version check → (2) budget gate → (3) run-mode. Answers Q1.

### D3 — Counter model: one increment per stage-command invocation, in-context, lower-bound
"One stage event" = **one invocation of any of the 8 stage commands** (each fires
the gate once at its top). `/qrspi:followup` increments **once per invocation**
(not per item — see D7), and `/qrspi:archive` increments once. The counter lives
in orchestrator conversational context (prose flag: "budget: N stage-events this
session"), no disk file — same mechanism as the version-check flag and run-mode.
A mid-session `/clear` resets the counter to 0, but `/clear` also resets the
actual context, so the counter is always a **lower bound** on real accumulation
(the safe direction — it under-counts, never over-warns after a genuine reset).
**Dual-trigger (OQ2 = combine):** the counter is the reliable *floor*, but the
gate ALSO evaluates the orchestrator's own qualitative self-assessment ("does my
context feel past the ceiling?") as a second, independent trigger. Each level
(nudge / soft gate) fires when **either** the counter threshold **or** the
self-assessment crosses first — so a verbose session that inflates real context
faster than the counter still trips the gate early. Answers Q18, Q19, OQ2.

### D4 — Thresholds: nudge at 8 stage-events, soft gate at 12 (PQ3 — present as OQ)
Grounded in the observed overflow (~12–15 stage-events at 98%): **nudge at 8**
(≈ end of a first full change), **soft gate at 12** (well before the observed
overflow, catching a second change before its D review). Both are proposed
numbers the human can tune — see Open Question OQ1. Answers PQ3, Q6, Q18.

### D5 — Session-flag per threshold level (fire once each, no re-nagging)
Two independent once-only flags. The nudge fires the first time **either** the
counter reaches 8 **or** self-assessment crosses the nudge ceiling (a one-line
notice, no question), then is silent. The soft gate fires the first time **either**
the counter reaches 12 **or** self-assessment crosses the gate ceiling
(AskUserQuestion), then is silent. Per-level once-only holds regardless of which
trigger fired it (D3 dual-trigger). No re-evaluation every stage — mirrors the
version-check silence discipline. Answers PQ5, Q4, Q13.

### D6 — Soft gate is never-suppressed (joins the workflow list) — exact prose
At 12 stage-events **or** when self-assessment crosses the gate ceiling (D3/D5
dual-trigger), the gate fires an AskUserQuestion **in every run-mode including Full-auto**;
context degradation is a correctness concern outranking auto-chain convenience.
It **joins** the `workflow` skill's "Never-suppressed gates (all modes)" list as a
third bullet. Exact prose to add under that heading:

> - **The budget soft gate** (skill `context-budget-gate`, at the higher
>   stage-event threshold) is NEVER suppressed in any mode. Full/Semi auto pause
>   here and ask the human whether to reset before continuing.

The AskUserQuestion shape (two choices, ordered, mirroring version-check):
- question: `Orchestrator context is getting full (~<N> stage-events this session). Reset to a fresh session before continuing?`
- choices: `Reset now — I'll start fresh` / `Continue in this session`

On **Reset now**: print the resume path (D8) and **end the turn** — do not
auto-advance the Full-auto chain. On **Continue**: set the soft-gate flag and
proceed. Answers PQ2, Q8, Q9, Q14.

### D7 — followup nudge: once per invocation, not per item
`/qrspi:followup` resolves one item per invocation by default and re-offers the
next via AskUserQuestion. The budget gate at its top increments once and evaluates
the two thresholds like any command — so a 10+ followup marathon crosses 8 then 12
naturally without a per-item nudge (which would itself be friction). No separate
"end of batch" detection is needed; the counter is the batch signal. Answers Q3,
Q25.

### D8 — Resume path: self-contained one-liner (names `/clear`, per D12)
The reset instruction printed by both the soft gate (D6) and archive step 7 (D9):

> Run `/clear` to reset this session in place, then `/qrspi:<next> <id>` — the
> change folder on disk is the truth; run-mode is re-asked (correct, not a bug).
> `/qrspi:status` shows where you are if unsure. (A full relaunch is only needed
> when the plugin files themselves changed.)

`<next>` is the stage the orchestrator was about to run (or, post-archive,
`/qrspi:questions <new-id>`). Links `/qrspi:status` as the optional "where am I"
step but is self-contained. `/clear` is named explicitly as the lightweight
in-place reset (D12) — it is the cheapest way to drop the accumulated
orchestrator context without leaving the terminal. Answers Q10, Q22(b), Q23.

### D9 — Post-archive reset: new step-7 AskUserQuestion in archive.md
`archive.md` gains a **new step 7** after the step-6 completion summary:
AskUserQuestion `Start a new session for the next change?` → `Yes — I'll start
fresh` / `Continue in this session`. Because no primitive can start a session
(Non-Goal), the **Yes** branch only prints the resume path (D8, pointing at
`/qrspi:questions <next-id>`) and ends the turn; **Continue** ends normally. This
is an interactive gate, so in Full-auto it is **never-suppressed** like other
offers — it interrupts the post-archive → next-change handoff. `archive.md` has
`agent: build` frontmatter, which is a `BUILTIN_AGENTS` member, so adding
AskUserQuestion does **not** trip lint Check 5. Answers PQ4, Q2, Q15, Q24.

### D10 — context-hygiene prose: name the marathon anti-pattern, accurate vocabulary
Add a `## Marathon anti-pattern` subsection to `context-hygiene`:

> Subagent firewalling bounds each *stage's* context — it does **NOT** bound the
> orchestrator's own accumulation **across stages within one session**. Starting
> change N+1 in the orchestrator that finished change N, or running 10+ followups
> in one session, silently grows past the ceiling even though every stage subagent
> is lean. The fix is structural: reset at natural boundaries (after archive,
> after a followup batch) and resume in a fresh session — see skill
> `context-budget-gate`.

The accurate term is **cross-stage within one session**, not the backlog's
imprecise "cross-session" (confirmed Q16). Also add a fourth bullet to the
`## Mechanism backing the 40%/60% principle` section naming
`context-budget-gate` as the runtime structural mechanism (the first non-static
one). Answers Q11, Q12, Q16.

### D11 — Scope: exactly the 11 commands; `status`/`update`/`retro` excluded; lint check IS in-scope
The gate is embedded in the **8 stage commands + `archive.md` + `followup.md`**
(PQ6). Excluded: `status` (a quick read, not a long-session driver), `update` and
`retro` (out-of-flow utilities). Inclusion criterion: *commands that drive or sit
inside a long orchestrator flow.* The effort-variant implementer **agents** need no
gate — the gate lives in `implement.md` (the command), which they run under.
A **new lint check** asserting all 11 command stems carry the embed line **is
in-scope** (mirrors Check 9's `VERSION_CHECK_COMMAND_STEMS`): a new
`BUDGET_GATE_COMMAND_STEMS = [questions, research, design, structure, slices,
plan, implement, pr, archive, followup]` with the whitespace-collapsed embed
assertion. This prevents silent under-coverage across 11 sites. Answers Q7, Q26,
Q28, Q30, Q33.

### D12 — Reset instruction names `/clear` (auto-invoke verified infeasible) — post-PR amendment
Added as a post-PR P2 amendment (follow-up "orchestrator runs `/clear` on Yes").
The follow-up asked whether the orchestrator could *itself* run `/clear` on the
"Reset now" / archive-step-7 "Yes" branch, which would overturn Non-Goal 35a's
"no auto-reset" fence. A `claude-code-guide` capability check returned a definitive
**no**: slash commands are user-initiated REPL directives parsed before model
invocation; a model-emitted `/clear` is inert text; there is no `SlashCommand`
(or equivalent) tool exposing `/clear`; and `/clear` wipes the conversation
(including the turn), so an agent could not continue after it. Non-Goal 35a
therefore **stands** — but the reset UX is refined: the resume one-liner (D8) and
the archive-step-7 "Yes" branch (D9) now **name `/clear` explicitly** as the
lightweight in-place reset the *human* runs (cheaper than relaunching a terminal),
followed by `/qrspi:<next> <id>`. Observable change is text-only: the branches
still print-and-end-the-turn; only the printed instruction now says `/clear`.

## Command changes
- All 8 stage commands: insert the budget-gate embed as the step **between** the
  version-check step and the run-mode step (D2).
- `archive.md`: add embed near the top (it has no version-check/run-mode preamble —
  place the embed as a new first step) **and** the step-7 reset AskUserQuestion (D9).
- `followup.md`: add embed near the top, before the triage gate (D7).

## Skill changes
- **New** `claude/skills/context-budget-gate/SKILL.md` — counter rule (D3), two
  thresholds (D4), per-level session flags (D5), nudge text, soft-gate
  AskUserQuestion (D6), resume path (D8).
- `context-hygiene`: `## Marathon anti-pattern` subsection + 4th mechanism bullet (D10).
- `workflow`: 3rd "Never-suppressed gates" bullet (D6).

## Lint changes
- New check: `BUDGET_GATE_COMMAND_STEMS` embed assertion over the 11 commands (D11).
  Note the interaction with the backlog's `lint-auto-mode-gate-coverage` idea — both
  assert step-presence in stage commands; flag so they don't later fight.

## Vertical slices (preview)
2–5 user-facing slices, each demoable end-to-end:
- **Slice 1 — the gate fires:** ship `context-budget-gate` skill + embed in the 8
  stage commands; demo: a session crossing 8 stage-events shows the nudge, crossing
  12 shows the soft gate. (End-to-end nudge/gate behaviour on the stage path.)
- **Slice 2 — boundary resets:** archive step-7 offer + followup embed + resume
  path; demo: archiving a change offers a fresh session; a followup marathon nudges.
- **Slice 3 — docs + guardrail:** `context-hygiene` marathon prose, `workflow`
  never-suppressed bullet, and the lint check; demo: `node scripts/lint.mjs` passes
  and fails if a command drops the embed.

## Risks / Trade-offs
- **Counter ≠ real context.** The heuristic can under- or over-fire relative to
  actual utilization (verbose slices inflate real context faster than the counter).
  Mitigation: lower-bound design (D3) keeps it from over-warning after a reset; the
  soft gate is advisory, not a hard-stop. Watch-item for stage I: confirm the nudge
  actually appears at 8 in a live `--plugin-dir` dogfood (Q27) — thresholds may need
  artificial lowering to test in one session.
- **Full-auto interruption.** The soft gate deliberately breaks the auto-chain
  (D6); a user who chose Full-auto for a 2-change marathon will be paused. This is
  intended — 98% context is the failure this change exists to prevent.
- **11-site drift.** Mitigated by the single skill (D1) + the lint check (D11).
- **Threshold calibration is a guess** from one data point — hence OQ1.

## Open questions for the human
- [x] **OQ1 — thresholds (PQ3). Answer: nudge at 8, soft gate at 12** (confirms D4;
      tunable later — derived from the single 12–15-event / 98% overflow observation).
- [x] **OQ2 — self-check vs. documentation. Answer: COMBINE.** The counter is the
      reliable floor AND the orchestrator's qualitative self-assessment is a second,
      independent trigger; the nudge/soft-gate fires on **whichever signal crosses
      first**. D3, D5, and D6 updated to the dual-trigger model.
