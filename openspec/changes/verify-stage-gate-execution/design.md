# Design — verify-stage-gate-execution

> Stage D of QRSPI. Generated 2026-06-20.
> **Implementation is BLOCKED until a human approves this file.**

## Context

The nine QRSPI stage commands (`questions`, `research`, `design`, `structure`,
`slices`, `plan`, `implement`, `pr`, `followup`) each declare `agent: <subagent>`
+ `subtask: true` in frontmatter. That routing makes the **entire command body**
— including the AskUserQuestion commit / handoff / approval gates and the
next-stage invocation — execute inside the named subagent's context. None of the
seven `claude/agents/*.md` subagents list `AskUserQuestion`, and four
(`planner`, `questioner`, `researcher`, `reviewer`) also lack `Agent`. So under
the real plugin-invocation path every human gate is dead and four stages cannot
invoke the next stage.

**Operative semantics — confirmed, high confidence.** Research open gap #1
flagged that `subtask:`'s harness dispatch behaviour was undocumented in-repo.
A `claude-code-guide` lookup against the official Claude Code docs resolved it
and made the picture *stronger* than the dogfood finding assumed:

- A command with `agent: <X>` + a fork directive runs its **whole body** in `<X>`'s
  context, constrained by `<X>`'s `tools:`. The body is the subagent's prompt.
- **`AskUserQuestion` is architecturally unavailable to subagents — even when
  listed in `tools:`.** It (with `EnterPlanMode`, `ScheduleWakeup`, etc.) depends
  on the main conversation's UI/session state. A subagent must *return* and let
  the main loop call it. This kills Option B more decisively than questions.md
  knew: you cannot fix the gates by granting the tool.
- The docs name the fork directive `context: fork`; **`subtask:` is not a
  documented frontmatter field.** The dogfood bug confirms `subtask: true`
  currently *does* fork (the gates were trapped in-subagent), but its exact spelling
  is a stage-I watch-item (see Risks) — the fix removes it regardless.

Desired end state: every human gate and every next-stage invocation runs on the
main-loop orchestrator (which can reach AskUserQuestion + Agent); the stage
subagent does only the bounded artifact write and returns a condensed result —
exactly `context-hygiene`'s "firewall, not persona" model. A standing lint check
prevents the bug class from recurring, and the regenerated `copilot/` tree stays
zero-drift.

## Goals / Non-Goals

**Goals:**
- Move all human gates (precondition/approval, commit, next-stage handoff) and
  next-stage invocation onto the tool-capable main-loop orchestrator for all nine
  stage commands (PQ1=A, PQ2=all-nine).
- Keep the bounded artifact write delegated to the stage subagent via the Agent
  tool (firewall preserved).
- Ship a standing `scripts/lint.mjs` check that statically catches a gate-tool /
  executor mismatch (PQ3).
- Keep `node sync-copilot.mjs --check` zero-drift; ship the regenerated `copilot/`
  (PQ4).
- Fix the README delegation line and re-check `context-hygiene` wording (PQ5).

**Non-Goals (spun out as backlog ideas):**
- Whether Copilot's custom-agent runtime has an AskUserQuestion analogue and how
  its gates *should* behave → existing `reassess-copilot-port` item (PQ4).
- A lint cross-check that `sync-copilot.mjs`'s `agentFor` table agrees with the
  Claude command `agent:` frontmatter (research open gap #3) → backlog idea.
- Bundling with `enforce-research-ticket-hiding` (Q#17) → stays independent.
- Auditing the non-stage helpers (`init`, `stack`, `archive`, `retro`, `status`)
  beyond what the new lint check naturally covers (Q#18).

## Decisions

### D1 — Orchestrator owns the gates; drop the routing frontmatter (PQ1, Q#1, Q#4)

Remove `agent:` **and** `subtask:` from all nine stage command files. The body then
runs in the main loop, which can reach AskUserQuestion + Agent. The body
explicitly spawns the stage subagent via the **Agent tool** for *only* the
bounded artifact write. Rejected: Option B (grant tools) — impossible for
AskUserQuestion (subagent-unavailable by design) and it defeats the context
firewall; Option C (shell + delegate split files) — same destination as A with
file-duplication overhead.

**Exact frontmatter transformation** (identical pattern for all nine):

```
BEFORE                          AFTER
---                             ---
description: <unchanged>        description: <unchanged>
agent: <subagent>               ---
subtask: true
---
```

`description:` stays (lint Check 2 requires it). Both `agent:` and `subtask:` are
deleted. The subagent is no longer *named in frontmatter*; the body already names
it (each body says "invoke the `<X>` subagent"). The body keeps that prose but
makes the mechanism explicit: **"spawn the `<X>` subagent via the Agent tool for
the artifact write."**

### D2 — Canonical delegation body shape (Q#11, research deviations)

Every converted command follows one orchestrator-shaped sequence:

1. **Precondition / approval** — orchestrator runs the Glob file check; if the
   stage also has an approval gate (Structure needs an approved `design.md`), the
   orchestrator runs that AskUserQuestion here.
2. **Delegate the write** — orchestrator spawns the stage subagent via the
   **Agent tool** (`subagent_type: qrspi:<agent>`), passing the change id + the
   bounded "write this artifact, return path + 5-bullet summary" instruction.
3. **Interactive review** (stages that have one, e.g. Q's PQ pass, D's
   decision-by-decision) — orchestrator runs the AskUserQuestion loop on the
   returned artifact.
4. **Commit step** — orchestrator runs the AskUserQuestion commit gate, then the
   explicit-path `git add/commit/push`.
5. **Next-stage handoff** — orchestrator runs the AskUserQuestion handoff and, on
   Continue, re-enters the next `/qrspi:*` command so its body runs in the main
   loop (D3 / OQ2) — not a subagent spawn.

Reconciliation with existing deviations: `implement.md` **already** spawns its
subagent via the Agent tool per slice — it is already orchestrator-shaped, so D1
only removes its `agent:`/`subtask:` and keeps the body. `design.md` and `pr.md`
keep their documented deviations (design re-uses the final-confirmation answer for
handoff; pr commits unconditionally after PR creation) — those are *which gate
fires when*, not *who runs it*; the executor is now uniformly the orchestrator.

### D3 — Next-stage invocation mechanism (Q#10) — settled via OQ2

The orchestrator invokes the next `/qrspi:*` stage by **re-entering that slash
command so its body runs in the main loop** — not by spawning the next stage's
subagent. After D1 the next command no longer carries `agent:`/`subtask:`, so when
invoked it executes on the orchestrator, and *its* precondition/approval/commit/
handoff gates are tool-reachable too. The gate-on-main-loop invariant therefore
holds recursively across every stage.

The Agent tool is **rejected** as the hand-off mechanism (OQ2): spawning the next
stage as a subagent would run only its bounded write and skip that stage's gates —
re-trapping the bug. The Agent tool remains the mechanism for the *intra-stage*
write delegation (D2 step 2). The handoff prose becomes: "invoke the next-stage
command now so it runs as its own stage in the main loop" (drop the old
"fresh subtask/subagent" phrasing, which implied a fork).

### D4 — `qrspi-workflow` "Stage choreography" edits (Q#9)

The four canonical procedures' *logic* is unchanged (Glob precondition,
AskUserQuestion approval/commit/handoff). What changes is the **executor
attribution**: the section currently reads as if the stage subagent runs the
gates. Edit the section's framing to state explicitly: *the main-loop
orchestrator runs all four procedures; the subagent is spawned via the Agent tool
only for the bounded artifact write and returns a condensed result.* The
"fresh subtask/subagent" wording in the next-stage handoff becomes "invoke the
next-stage command so it runs as its own stage in the main loop" (per D3 / OQ2 —
re-enter the slash command, do **not** spawn it as a subagent). Per-command
variables (artifact paths, commit strings, next-stage names) are untouched.

### D5 — `context-hygiene` edits + Task/Agent terminology (Q#12, research gap #10)

Add one clarifying sentence under "Subagents are context firewalls": the
orchestrator owns the human dialogue (commit / handoff / approval) and the
next-stage invocation; the subagent does only the bounded write — because
AskUserQuestion is unavailable inside a subagent. Resolve the Task-vs-Agent
terminology drift (skill says "Task tool", commands say "Agent tool") by
standardising on **"Agent tool"** in the skill's "invoke each QRSPI stage as a
subagent" line, so skill and commands agree.

### D6 — Standing lint check (PQ3, Q#16) — predicate settled via OQ1 (body-aware)

Add **Check 5: gate-tool / executor agreement** to `scripts/lint.mjs`, registered
after Check 4 in `main()` (new `checkGateExecutor(errors)` + a
`process.stdout.write('Check 5: ...')` label; push to `errors[]` on violation,
write an `OK:` line on pass — the existing dependency-free ESM pattern).

**Chosen predicate (body-aware, OQ1):** the script carries a small hardcoded
main-loop-only tool set (`MAIN_LOOP_ONLY = {'AskUserQuestion'}` — tools a subagent
can never reach). For each `claude/commands/*.md`: **if the frontmatter declares a
non-builtin `agent:` AND the body references any tool in `MAIN_LOOP_ONLY`, that is
a violation** — the gate would be trapped in a subagent that cannot reach it. This
guards the actual invariant (gate tool vs executor capability), not just the one
syntactic form that shipped, so it also catches a future command that re-adds
`agent:` while calling AskUserQuestion *without* `subtask:`.

After D1 the nine stage commands have no `agent:`, so their executor is the main
loop and they pass. The non-stage helpers pass too: `init`/`stack`/`archive` use
the builtin `build` agent (excluded by "non-builtin"); `retro`/`status` have no
`agent:`. This is the precise class of the shipped bug (`af29540`).

Acceptance signal: `node scripts/lint.mjs` green.

### D7 — Copilot / sync impact (PQ4, Q#13)

`sync-copilot.mjs` builds the generated Copilot prompt frontmatter from its
**hardcoded `agentFor` table keyed by command stem** — it does **not** read the
source command's `agent:` field (research §Copilot sync mapping, confirmed). So
dropping `agent:`/`subtask:` from the Claude commands does **not** by itself
change the generated Copilot prompt's `agent:` line. However, the body rewrites
(`AskUserQuestion` → `vscode/askQuestions`, "invoke the `<X>` subagent" →
"continue as the `<X>`") mean any **body** edits from D2/D4/D5 *do* propagate into
`copilot/`. Therefore: edit only `claude/` + (if needed) `sync-copilot.mjs`,
never `copilot/` by hand (CLAUDE.md rule), then re-run `node sync-copilot.mjs` and
ship the regenerated tree. No `agentFor` change is required for this fix. The
deliverable must pass `node sync-copilot.mjs --check` (zero drift). Whether
Copilot's runtime even has an AskUserQuestion analogue is deferred to
`reassess-copilot-port` (Non-Goal).

### D8 — README + docs blast radius (PQ5, Q#18)

Rewrite README.md:192. Current: *"A Copilot prompt carries an `agent:` field, so
`/qrspi:questions` runs inside the `questioner` agent — mirroring how the Claude
command delegates to its subagent."* After A, the Claude command no longer "runs
inside" the subagent; the orchestrator runs the command and delegates the write.
New line (final wording for human review): *"A Copilot prompt carries an `agent:`
field so the whole prompt runs in that agent; the Claude command instead runs in
the main loop and spawns its subagent (via the Agent tool) only for the bounded
artifact write, keeping the human gates on the orchestrator."* The two-tool
mapping table (README.md:186–190) stays correct (it maps file types, not
execution model). No other README prose is invalidated; the stage table doesn't
name per-command executors.

## Risks / Trade-offs

- **`subtask:` spelling vs `context: fork`.** The official docs name the fork
  directive `context: fork` and do not document `subtask:`; the dogfood bug shows
  `subtask: true` *does* currently fork. The fix **removes** the field either way,
  so correctness does not depend on resolving this — but stage I should confirm at
  removal time that no command relied on `subtask:` for anything other than
  forking, and note if the kit ever wants the documented `context: fork` spelling
  elsewhere. **Watch-item, not a blocker.**
- **Larger rewrite than Option B.** Nine command bodies change. Mitigated by the
  single canonical D2 shape and by `implement.md` already being orchestrator-shaped.
- **Lint predicate breadth.** Check 5 must catch the real bug class without false
  positives on the non-stage helpers (`init`/`stack`/`archive` use builtin `build`;
  `retro`/`status` have no `agent:`). Scoping the assertion to "non-builtin
  `agent:` + body gate tool" avoids flagging those — verify against all 14 command
  files at stage I.
- **Body-rewrite drift into Copilot.** Because D2/D4/D5 touch bodies, the Copilot
  regeneration is non-trivial; `--check` is the guard. If a body edit produces an
  unexpected Copilot diff, fix the `claude/` source or a `sync-copilot.mjs`
  rewrite rule — never `copilot/` directly.

## Open questions for the human

- [x] **OQ1 (D6) — Exact Check 5 predicate.** Two viable spellings:
  (a) **Narrow/structural** — flag only the exact shipped shape: a command whose
  frontmatter has both non-builtin `agent:` and `subtask:` (regardless of body).
  Simple, zero false positives, but a future command that calls AskUserQuestion
  under just `agent:` (no `subtask:`) would slip through.
  (b) **Body-aware** — flag any command whose body references a known
  subagent-only-unreachable gate tool (`AskUserQuestion`) while declaring a
  non-builtin `agent:`. Catches more of the bug class; needs a small hardcoded
  "main-loop-only tools" set in the script.
  **Answer (human, 2026-06-20): (b) Body-aware.** Check 5 guards the actual
  invariant — gate tool vs executor capability — not just the one syntactic form
  that shipped. The script carries a small hardcoded main-loop-only set
  (`AskUserQuestion`) and flags any command that declares a non-builtin `agent:`
  while its body references a tool in that set. D6 below is updated to make
  body-aware the chosen predicate.
- [x] **OQ2 (D3) — Next-stage invocation mechanism.** Use the **Agent tool** with
  the next stage's `qrspi:<agent>` subagent, or **re-enter the next `/qrspi:*`
  command** so its now-unforked body runs in the main loop?
  **Answer (human, 2026-06-20): re-enter the next slash command in the main loop.**
  The Agent-tool option is *rejected* because spawning the next stage as a subagent
  runs only its bounded write and **bypasses that stage's own gates** (Structure's
  design-approval gate, its commit/handoff) — re-trapping the very bug this change
  fixes. The handoff must invoke the next command such that its body (no longer
  carrying `agent:`/`subtask:` after D1) executes on the orchestrator, keeping the
  gate-on-main-loop invariant true for *every* stage. The Agent tool stays the
  mechanism for the *intra-stage write delegation* (D2 step 2), not for stage
  hand-off. D3 below is updated accordingly.
