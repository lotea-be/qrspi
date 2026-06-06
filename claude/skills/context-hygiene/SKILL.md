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

Implications:

- Always invoke each QRSPI stage as a subagent via the Task tool. Do not
  inline the stage prompt into the orchestrator's conversation.
- Tell the subagent **exactly** what to return in its final message
  (e.g., "Return the path of the file you wrote and a 5-bullet summary").
  Anything more is wasted tokens.
- Use **read-only** subagents (researcher, planner, reviewer) for
  fact-gathering. They cannot accidentally drift into edits.
- Prefer many small subagents over one mega-subagent.

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
