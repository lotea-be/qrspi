# Slices — add-auto-mode

> Stage V of QRSPI. Generated 2026-06-29.
> Vertical slices, not horizontal layers.

## Overview

This change edits only markdown files — the `workflow` skill, the 8 stage command
bodies, `README.md`, and the regenerated `copilot/` tree. There is no application
runtime to exercise; a slice's demoable endpoint is a real `/qrspi:*` invocation
that exhibits the mode behaviour live on the orchestrator, or a green lint/sync run.

The design's preview Slice 5 ("Hard-stops + README + copilot regen") was not
independently demoable as written. Hard-stop wiring is structurally coupled to the
commit-step auto-branch it guards (Slice 2), and README + copilot-regen is a
horizontal acceptance step. The re-cut folds hard-stop wiring into Slice 2 (where
the `git push` failure and subagent-block conditions arise naturally), folds the
approval-gate + implementer block-signal contract into Slice 3 (the S→PR chain
where they first take effect), and makes Slice 4 the README + copilot-regen
acceptance slice with an explicit, standalone checkpoint.

Four slices are the right number: the change has four genuinely separable
user-visible increments (Manual no-op → Q→R auto-chain → S→PR auto-chain →
acceptance docs/regen), each independently executable and verifiable without the
later slices being in place.

---

## Slices

### Slice 1 — Run-mode prompt + Manual no-op end-to-end

**Deliverable.** A human invokes any `/qrspi:*` stage command on a test change and
sees the ternary mode prompt ("Full auto / Semi-auto / Manual") before any stage
work begins. Picking **Manual** produces behaviour identical to today: every commit
gate and handoff fires as an AskUserQuestion. The mode prompt does NOT appear again
on a mid-chain auto-invocation (not yet relevant here — auto-chain logic comes in
Slice 2, but the fresh-vs-mid-chain detection is wired). The gap left by this
slice: Full and Semi auto-branches exist as stubs in the skill but are not yet
exercised (auto-commit and auto-chain are added in Slices 2 and 3).

**Spec coverage:** `qrspi-run-mode` — "Ternary mode prompt at every fresh stage
invocation" (all three scenarios); "Fresh-vs-mid-chain determined by in-process
context only" (both scenarios); "Manual mode is today's behaviour, unchanged"
(commit gate scenario).

- M: no mock service stub needed — there is no API layer; the orchestrator itself
  IS the "service". The mode prompt is wired directly into the workflow skill prose.
- F: `claude/skills/workflow/SKILL.md` — new **"Run-mode (Full / Semi / Manual)"**
  subsection containing: (i) the ternary AskUserQuestion wording (question text,
  three choices with Esc-abort note), (ii) the fresh-vs-mid-chain rule ("if you
  already hold a run-mode in this session, skip the prompt and reuse it; if not,
  ask"), (iii) a Manual branch stub in each of the four canonical procedures
  (commit step, next-stage handoff, precondition check, backlog atomicity) — Manual
  branch wording is "if mode is Manual → behave exactly as today". All 8 stage
  command bodies (`questions.md`, `research.md`, `design.md`, `structure.md`,
  `slices.md`, `plan.md`, `implement.md`, `pr.md`) gain one reference line: "Read
  or establish the run-mode by following the **run-mode procedure** in skill
  `workflow`."
- D: no data store; the "state" is orchestrator conversational context only
  (no file, no field, no flag).
- T: invoke `/qrspi:questions <test-change-id>` in a fresh session → ternary prompt
  appears → pick Manual → commit gate fires → handoff fires → identical to current
  behaviour. Invoke the same command again in a session that already has a mode held
  (simulate by running within a chain) → prompt does not reappear.
- **Model:** sonnet — mechanical prose edit: one new skill subsection + one
  reference line per command body; no novel pattern, no conditional logic to reason
  about beyond the stub wording.
- **Checkpoint:** Run `/qrspi:questions <test-change-id>` in a fresh Claude Code
  session. The ternary mode prompt appears as the first interaction before the
  precondition check. Pick Manual. Observe the stage completes exactly as it does
  today: commit AskUserQuestion fires, handoff AskUserQuestion fires. No new
  prompts, no missing prompts. `node scripts/lint.mjs` green (Check 5 must still
  hold — the new reference line must not introduce an inline AskUserQuestion into a
  subagent-hosted command body).

---

### Slice 2 — Full/Semi auto-advance commit + handoff across Q→R→D, with hard-stops

**Deliverable.** A human starts `/qrspi:questions <id>` and picks **Full auto**.
The Q stage completes, the orchestrator auto-commits (no prompt) and immediately
re-enters `/qrspi:research <id>` (no handoff prompt). Research runs and auto-commits;
the chain arrives at `/qrspi:design <id>` and pauses at the full interactive D
review — the first AskUserQuestion a Full-auto user sees after the initial mode
prompt. **Semi-auto** is also wired: it auto-commits but shows the handoff
AskUserQuestion at each boundary. Hard-stops are live: a simulated `git push`
failure (e.g. detached HEAD or remote rejection) stops the chain and surfaces the
error rather than continuing. The gap left by this slice: S's approval gate
auto-answer and the post-D chain (S→V→P→I→PR) come in Slice 3.

**Spec coverage:** `qrspi-run-mode` — "Full auto chains Q→PR pausing only at
sanctioned gates" (scenarios: Q→R without commit/handoff pause; D review pauses;
Full auto auto-clears S gate — wired here but not yet exercisable until Slice 3);
"Semi-auto pauses at stage boundaries, auto-advances within-stage gates" (both
scenarios); "Auto commit step uses explicit-path git add and identical commit
message" (both scenarios); "Hard-stop set halts the auto chain regardless of mode"
(git push failure scenario; subagent error scenario); "Ticket-blind Research
invariant and context firewall unchanged" (both scenarios).

- M: no mock service stub needed — the auto-branch logic is instruction text in the
  workflow skill; the commit commands (`git add`, `git commit`, `git push`) execute
  live against the real git working tree.
- F: `claude/skills/workflow/SKILL.md` — expand the four canonical procedure
  subsections with Full/Semi auto-branches:
  - **Commit step:** "If Full or Semi auto → stage the explicit paths, commit with
    the stage's exact message string (no `[auto]` suffix), and push immediately
    (never `git add -A`). On any git exit code ≠ 0 → hard-stop (surface error, do
    not auto-advance). If Manual → ask as today."
  - **Next-stage handoff:** "If Full auto → re-enter `/qrspi:<next> <id>` immediately
    (held mode carries). If Semi-auto → ask 'Stage X complete. Continue to Y, or
    stop here?' and re-enter on Continue. If Manual → ask as today."
  - **Hard-stop procedure (new subsection):** enumerate the four conditions and the
    response ("stop the chain, surface the condition, ask the human — do not
    silently downgrade to Manual").
  - Note on D review: add a clause to the D-stage procedure reference — "The D
    review (open-questions pass + decision-by-decision approval + final
    confirmation) is NEVER suppressed in any mode; it is a sanctioned pause."
  - Note on backlog-capture offers: "Backlog-capture offers in Q, D, and S are
    NEVER suppressed in any mode; they remain interactive AskUserQuestion calls."
  No change to command bodies beyond Slice 1's reference line (the skill body is
  the single source of truth per D1).
- D: no data store changes.
- T: dogfood walk — run `/qrspi:questions <test-id>` with Full auto on a test
  change → confirm no commit prompt, no handoff prompt, chain arrives at D review →
  confirm D review prompts fire. Force a push failure (set `git remote set-url
  origin bad-url`) → confirm chain stops at the push failure, error is surfaced.
  For Semi-auto: confirm auto-commit fires but handoff AskUserQuestion appears.
- **Model:** sonnet — expanding existing prose subsections with structured
  if/else-mode branches; mirrors the pattern already established in Slice 1;
  no novel reasoning required.
- **Checkpoint:** Start `/qrspi:questions <test-id>` fresh, pick Full auto. Observe:
  (1) no commit AskUserQuestion after Q completes; (2) no handoff AskUserQuestion;
  (3) chain arrives at D review with all D prompts firing. Then break push (e.g.
  `git remote set-url origin https://bad`), run again, pick Full auto → chain halts
  at git push failure with a human-readable error, does NOT continue to R.

---

### Slice 3 — S approval gate auto-answer + full S→V→P→I→PR chain + implementer block-signal

**Deliverable.** After the D pause (from Slice 2), Full auto chains S→V→P→I→PR
without further interruption. S's "Have you reviewed and approved design.md?"
AskUserQuestion is not shown (the in-chain D approval satisfies it). The Implement
stage runs all slices straight through, re-invoking the implementer on the
per-slice annotated model for each slice, auto-committing each. The PR-create
step (`gh pr create`) runs without asking "Create now or show first?". The
implementer block-signal contract (D6/OQ2) is encoded in `implement.md`: when
lint, typecheck, or tests fail at a slice boundary the implementer returns
error/blocked and does NOT commit, so the hard-stop fires. The gap left by this
slice: README prose and copilot-regen come in Slice 4.

**Spec coverage:** `qrspi-run-mode` — "Full auto chains Q→PR" (S auto-clears
approval gate scenario; Implement straight-through scenario; per-slice model
preserved scenario; PR-create auto-executed scenario); "Semi-auto pauses at stage
boundaries" (applies identically here — all S/V/P/I/PR boundaries pause in
Semi-auto); "Hard-stop set" (subagent error hard-stops chain; hard-stop does not
permanently downgrade mode). `qrspi-command-surface` — "Bounded artifact write
delegated to stage subagent" (implementer signals blocked on failing build; does
not commit a red slice).

- M: no mock service stub needed — the approval-gate auto-answer and the
  per-slice iterate-and-commit logic are instruction text in the workflow skill and
  `implement.md`; no external service.
- F:
  - `claude/skills/workflow/SKILL.md` — add the S approval gate auto-answer clause
    to the precondition check procedure: "If a run-mode is held and the human
    approved `design.md` at the D pause in this chain, treat the approval gate as
    satisfied (do not ask). If no in-chain D approval exists (standalone invocation
    or fresh session), ask as today."
  - `claude/skills/workflow/SKILL.md` — add PR-create auto-advance clause to the
    per-stage notes for the PR stage: "If Full or Semi auto → run `gh pr create`
    without asking 'Create now?'."
  - `claude/commands/implement.md` — add per-slice auto-advance clause: "If Full or
    Semi auto → after the implementer subagent returns for Slice N: (1) auto-commit
    that slice (explicit paths, stage message, push); (2) read the next un-ticked
    slice's `**Model:**` annotation; (3) invoke implementer on that model; repeat
    until all slices are done. If the implementer returns error/blocked → hard-stop
    (surface error, do NOT commit, do NOT advance to Slice N+1)."
  - `claude/commands/implement.md` — add the implementer block-signal contract:
    "The implementer MUST return an error or blocked signal — and MUST NOT commit
    the slice — when lint, typecheck, or tests fail at a slice boundary."
  - No other command body changes needed: all other stages (S, V, P, PR) are fully
    covered by the workflow skill's commit-step and handoff auto-branches wired in
    Slice 2, plus the approval-gate clause wired here.
- D: no data store changes.
- T: dogfood walk using a real test change — run a Full-auto from Q through PR on a
  minimal test change (e.g. a trivial backlog-entry-only change); observe: S does
  not show the approval-gate prompt; I runs all slices without checkpoint prompts;
  per-slice model annotations are respected (check via the tool-call log that
  `model:` differs per slice if annotated differently); PR is created without a
  "Create now?" prompt. For block-signal: run on a test change where the
  implementer is instructed to simulate a lint failure → confirm no commit happens,
  chain halts.
- **Model:** sonnet — adding structured conditional clauses to existing prose
  sections; the pattern mirrors Slice 2's auto-branch additions; the most complex
  piece (per-slice iterate logic in `implement.md`) mirrors the existing manual
  per-slice loop already described there.
- **Checkpoint:** Run a Full-auto from Q→PR on a prepared test change (one that has
  a `tasks.md` with at least two slices with different `**Model:**` annotations).
  Observe: (1) S does not ask the approval gate; (2) I auto-commits Slice 1, reads
  Slice 2's model annotation and re-invokes on that model, auto-commits Slice 2;
  (3) PR is created via `gh pr create` without a prompt. Then force a lint failure
  in a slice → confirm the chain stops with the error surfaced and the slice is NOT
  committed.

---

### Slice 4 — README update + copilot regen at zero drift

**Deliverable.** `README.md` has a "Run modes" paragraph in the stage-overview
section explaining the ternary mode and which gates are conditionally suppressed.
The gate prose notes that Full auto suppresses commit gates and handoffs while
always preserving the D review, backlog offers, and hard-stops. `copilot/` is
regenerated via `node sync-copilot.mjs` to reflect all command-body changes from
Slices 1–3. `node sync-copilot.mjs --check` exits 0. `node scripts/lint.mjs`
green. This slice has no new user-visible gate behaviour; it is the acceptance bar
for the change (the CI `drift` + `lint` + `validate` gates all passing on the
final state of the branch).

**Spec coverage:** this slice does not add new spec requirements — it satisfies
the acceptance signals in `proposal.md` Impact section ("node sync-copilot.mjs
--check exits 0; node scripts/lint.mjs green") and the "Keep the README current"
rule from `CLAUDE.md`.

- M: n/a — no service stub; the sync script is the "build" step.
- F: `README.md` — add "Run modes" paragraph under the stage-overview section (after
  the eight-stages table, before the helpers line): describe the ternary mode
  prompt, which gates are suppressed in Full/Semi auto, which are never suppressed
  (D review, backlog offers, hard-stops), and the Esc-to-abort path. Update the
  D stage note in the eight-stages table to add a parenthetical: "(Full auto pauses
  here — see Run modes)". Copilot regen: run `node sync-copilot.mjs` to
  regenerate `copilot/` from the updated `claude/` sources (Slices 1–3); commit
  the entire regenerated `copilot/` tree alongside `README.md`.
- D: no data store changes.
- T: `node sync-copilot.mjs --check` exits 0 (no diff between generated and
  committed `copilot/`); `node scripts/lint.mjs` exits 0 (all 5 checks pass,
  including Check 4 README coverage and Check 5 gate-tool agreement);
  `npx @fission-ai/openspec@1.4.1 validate add-auto-mode` passes.
- **Model:** sonnet — mechanical prose addition to README and a script invocation;
  no reasoning required beyond following the README-update rule and confirming the
  sync script output.
- **Checkpoint:** Run `node sync-copilot.mjs --check` → exits 0. Run
  `node scripts/lint.mjs` → exits 0. Read the updated `README.md` and confirm the
  "Run modes" paragraph is present and accurate (names all three modes, identifies
  which gates are suppressed and which are not). Run
  `npx @fission-ai/openspec@1.4.1 validate add-auto-mode` → passes.
