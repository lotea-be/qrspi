---
description: QRSPI stage R. Delegates to the researcher subagent (read-only). The change ticket is hidden from this stage by design — only areas of interest are passed in. Writes openspec/changes/<id>/research.md.
argument-hint: <change-id>
agent: copilot-researcher
---

You are running QRSPI stage **R (Research)** for the current project.

Arguments: ${input}

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

Then invoke the researcher with only those two inputs. The researcher
will produce `openspec/changes/<id>/research.md`.

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
- Next-stage command: `/qrspi-design <id>` — invoke it as its own stage.
