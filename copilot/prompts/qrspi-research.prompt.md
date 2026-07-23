---
description: QRSPI stage R. Delegates to the researcher subagent (read-only). The change ticket is hidden from this stage by design — only areas of interest are passed in. Writes openspec/changes/<id>/research.md.
argument-hint: <change-id>
agent: copilot-researcher
---

You are running QRSPI stage **R (Research)** for the current project.

Arguments: ${input}

1. **Version check.** Consult the **qrspi-version-check** instructions (`qrspi-version-check.instructions.md`) and follow its
   instructions exactly. This is the first step -- before the run-mode
   establishment and before any other work.

2. Read or establish the run-mode by following the **Run-mode** procedure in
   skill `workflow` before doing any other work.

**Critical**: do NOT pass the feature description or any opinion about
what the change should do to the researcher. The researcher works
without the ticket on purpose. From `${input}`, extract only:

1. The change id (first token).
2. The list of "areas of interest" — codebase areas to investigate
   (e.g. "questions table, vote logic, user role checks"). If the
   user only gave you a change id, read
   `openspec/changes/<id>/questions.md` and derive areas from the
   question headings — not from any speculation in the questions
   themselves.

   For each area, pass a heading PLUS a one-line factual scope
   statement that names existing files/conventions the researcher
   should map (e.g. `Data model conventions — existing entity
   classes, configurations, AppDbContext`). The scope statement may
   name existing precedents but must NOT state what the change
   should do.

Then spawn the `researcher` subagent via the **Agent tool**
(`subagent_type: qrspi:researcher`) with only those two inputs — the
change id and the areas of interest. Tell it to produce
`openspec/changes/<id>/research.md` and return the file path plus a
5-bullet summary. The orchestrator (this main-loop context) does not
inline the researcher's full conversation — only the returned summary is
used here.

To list the in-flight changes, use the **Glob** tool with pattern
`openspec/changes/*` — do not shell out; Glob has no permission requirements
and works on every platform.

Return only what the researcher's "Final message format" specifies.

**Choreography (see skill `workflow`, "Stage choreography").** Follow
the canonical *commit step* and *next-stage handoff* there, with these
stage variables:
- Artifact: `openspec/changes/<id>/research.md` (no backlog edit at this stage).
- Commit message: `docs(<id>): add research.md (QRSPI stage R)`
- Git add line: `git add openspec/changes/<id>/research.md`
- Next-stage command: `/qrspi-design <id>` — invoke it as its own stage in
  the main loop (re-enter the slash command so its body runs on the
  orchestrator; do NOT spawn it as a subagent).
