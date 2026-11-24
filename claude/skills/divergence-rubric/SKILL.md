---
name: divergence-rubric
description: The divergence rubric (QRSPI hard-stop condition 4) that execution-stage subagents (architect at S/V, planner at P, implementer at I) self-check their output against before returning. Small on purpose so the implementer can load it without the whole workflow skill.
---

# Divergence rubric (hard-stop condition 4)

The orchestrator's hard-stop procedure lives in skill `stage-choreography`;
its condition (4) -- "execution-stage output materially diverging from the
approved `design.md` or spec" -- is the one hard-stop only the **subagent**
can recognise, so the rubric for it lives here, in a small skill each
execution-stage agent (architect, planner, implementer) loads on its own.

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
