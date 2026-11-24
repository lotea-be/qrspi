---
name: context-hygiene
description: Rules for keeping agent context windows lean (target under 40%, reset at 60%) and using subagents as context firewalls rather than personas. Load this when planning a multi-stage workflow, starting a long session, or deciding whether to delegate work to a subagent.
metadata:
  sources: "Horthy QRSPI; HumanLayer harness engineering"
---

## The numbers

- **Target: < 40% context window utilization** at any given moment.
- **Hard reset trigger: 60%.** Start a new session. Persist progress to
  disk (OpenSpec artifacts, code, tests). Load only what the next stage
  needs.

Bigger models with bigger windows do **not** fix this. Filling the
window with conversation history, verbose tool output, and stale plans
degrades tool calls, increases hallucinations, and lowers code quality.

## Subagents are context firewalls, not personas

Common mistake: "Let's have a 'researcher persona' so the answers feel
more authoritative." That is roleplay, not engineering.

Correct framing: a subagent is a **separate context window** that does a
bounded job and returns a condensed result. The orchestrator never sees
the subagent's full conversation — only the final message. This is the
mechanism that makes long QRSPI flows possible without context bloat.

The orchestrator owns all human dialogue (commit gate, next-stage handoff,
approval gate) and the next-stage invocation; the subagent does only the
bounded artifact write — because AskUserQuestion is unavailable inside a
subagent and must be called by the main-loop orchestrator.

Implications:

- Always invoke each QRSPI stage's bounded artifact write as a subagent via
  the Agent tool. Do not inline the stage prompt into the orchestrator's
  conversation.
- Tell the subagent **exactly** what to return in its final message
  (e.g., "Return the path of the file you wrote and a 5-bullet summary").
  Anything more is wasted tokens.
- Use **read-only** subagents (researcher, planner, reviewer) for
  fact-gathering. They cannot accidentally drift into edits.
- Prefer many small subagents over one mega-subagent.

## Off-stage work: the orchestrator stays a thin main thread

A long-lived orchestrator session is fine **as long as it holds decisions
and summaries, not raw output**. What bloats it is the work between stages:
writing test scenarios, digging through logs, running and watching deploys,
configuring an external service, chasing a staging bug, re-reading code to
answer "why did X happen?". Done inline, each of those adds thousands of
tokens that every later turn re-reads.

Delegate it as a subthread instead:

- **Investigations** ("check the logs", "why does it stay on awaiting
  payment?", "is an email sent when…?") → a read-only subagent
  (general-purpose or Explore) told to return the answer in ≤10 lines with
  `path:line` citations. The orchestrator relays the answer, not the search.
- **Deploys and CI watching** → a subagent (or a background command) that
  returns pass/fail plus the one relevant error line.
- **Test help** (e2e scenarios, local setup steps) → write it to a file in
  the change folder or the scratchpad once and point the human at it; don't
  regenerate it in chat each time it's asked.
- **Code fixes** found along the way → `/qrspi:followup` or a scope
  amendment, which already run in a subagent — never inline edits from the
  orchestrator.

The orchestrator itself only: talks with the human, runs the
AskUserQuestion gates, spawns stage and off-stage subagents, commits, and
keeps a one-paragraph running state ("slice 5 done, staging flag on,
waiting on human Stripe test"). If you notice yourself reading a third file
or a long log to answer a question, stop and delegate it.

## Operational checklist

Before starting a session:

- [ ] Do I know which QRSPI stage I am in?
- [ ] Is the OpenSpec change folder already created?
- [ ] Have I closed unrelated tabs / artifacts?

During a session:

- [ ] Am I past 40%? → finish the current step, then offload to a
      subagent or persist to disk.
- [ ] Am I past 60%? → stop. Persist state. New session.

When delegating to a subagent:

- [ ] One job, one return value.
- [ ] Hidden inputs (e.g., the change ticket during Research) stay hidden.
- [ ] Specify the return format explicitly.

## Marathon anti-pattern

Running many QRSPI stages in a single session without resetting the context
window is the **marathon anti-pattern**. It looks like efficiency but degrades
quality: each successive stage inherits all the conversation history, tool
output, and interim plans from every prior stage, inflating the context window
well past the 60% hard-reset trigger.

The risk is not just latency -- it is correctness. A full-context orchestrator
in stage Implement has already seen Q, R, D, S, Slices, and Plan output. That
history crowds out the fresh, focused reasoning the implementer needs.

**Cross-stage within one session** is the specific failure mode: stages Q
through PR are designed to run as separate invocations with a fresh context at
each boundary. Running them back-to-back without a reset turns the staged
firewall model into a single long thread.

Mitigations:

- At each stage boundary (`/qrspi:archive` and the `context-budget-gate` soft
  gate) the kit offers a "Start a new session for the next stage?" prompt.
  An orchestrator that has stayed a thin main thread (see "Off-stage work"
  above) may decline and keep going. Accept it when the orchestrator has
  absorbed raw output (logs, file reads, long test sessions) or has been
  summarized once already. The OpenSpec artifacts on disk are the
  persistence layer -- a new session loses nothing.
- If the soft gate fires mid-stage (at 8 tool calls: advisory; at 12: gate),
  treat it as a genuine signal, not noise. "Continue anyway" is available but
  should be the exception, not the default.

## Mechanism backing the 40%/60% principle

The under-40%/reset-at-60% targets are backed by four lint/tooling mechanisms:

- **`checkSkillSets` (Check 2b in `scripts/lint.mjs`)** -- asserts each stage
  agent's `Load skills` line matches the approved per-stage registry
  (`scripts/skill-sets.mjs`). Stray or missing skill loads fail CI.
- **`checkOutputContracts` (Check 12 in `scripts/lint.mjs`)** -- asserts that
  every stage agent carries a `> **Output contract**` banner. The banner caps
  what the subagent returns so the orchestrator's context stays lean.
- **`scripts/context-footprint.mjs`** -- a report-only script (always exits 0)
  that prints a per-stage table (agent + declared skills) with line count,
  byte count, and a rough token estimate. Run it to spot which stages are
  growing heaviest. The skill list is sourced from the same
  `scripts/skill-sets.mjs` module as Check 2b -- no drift.
- **`context-budget-gate` skill** -- a runtime structural mechanism loaded by
  every stage command and the `archive`/`followup` boundary commands. Tracks
  an in-context tool-call counter; nudges at 8 (advisory, no gate) and soft-
  gates at 12 (AskUserQuestion "Reset now" / "Continue anyway"). "Reset now"
  prints a resume one-liner and ends the turn so the next stage starts fresh.
  The gate fires in all run-modes and is never suppressed.

## Why "plans that read well do not build well"

LLMs are trained to produce text that reads as authoritative. A plan
that sounds coherent can still rest on wrong assumptions about the
codebase. The defense is:

1. Research produces **facts**, not opinions.
2. Design surfaces the agent's assumptions so a human can correct them.
3. Plans are verified against Structure, not against their own prose.
4. Reviews go deeper than "does this read well?"

This is why QRSPI splits alignment (Q, R, D, S, P) into five stages
instead of compressing them into one "plan" step.
