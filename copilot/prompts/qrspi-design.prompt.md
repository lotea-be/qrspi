---
description: QRSPI stage D. Delegates to the designer subagent to produce design.md (~200 lines). HUMAN REVIEW IS REQUIRED before stage S.
argument-hint: <change-id>
agent: copilot-designer
---

You are running QRSPI stage **D (Design)** for the current project.

Arguments: ${input}

1. **Version check.** Consult the **qrspi-version-check** instructions (`qrspi-version-check.instructions.md`) and follow its
   instructions exactly. This is the first step -- before the run-mode
   establishment and before any other work.

2. Read or establish the run-mode by following the **Run-mode** procedure in
   skill `workflow` before doing any other work.

This is the highest-leverage stage. The output of this command must be
reviewed (and possibly rewritten) by a human before any code is planned.

Inputs:

1. The change id (first token of `${input}`).
2. The change description (the rest of `${input}`) — now visible
   again, after being hidden during Research.
3. Implicit: `openspec/changes/<id>/questions.md` and `research.md`.

Verify both files exist. If not, refuse and tell the user which previous
stage they need to run first.

Then spawn the `designer` subagent via the **Agent tool** (`subagent_type: qrspi:designer`) for the bounded artifact write. Pass the change id plus instructions to produce `openspec/changes/<id>/design.md` and return the file path plus a condensed summary of its decisions. The orchestrator (this main-loop context) does not inline the designer's full conversation -- only the returned summary and the written file are used in the steps below.

Repository signals you may use (to list in-flight changes, use the **Glob**
tool with pattern `openspec/changes/*` — do not shell out; Glob has no
permission requirements and works on every platform):
#file:requirements.md
#file:tech-stack.md
After the designer returns, append this banner to the chat:

```
⚠ HUMAN REVIEW REQUIRED.
Read openspec/changes/<id>/design.md, edit it freely, and only then run:
  /qrspi-structure <id>
```

**Interactive review (mandatory):** After writing `design.md`:

1. **Open questions first:** If the "Open questions for the human" section
   contains items, use the #tool:vscode/askQuestions to ask EACH question directly
   (one at a time, with sensible multiple-choice options when possible).
   Record answers back into `design.md` by ticking the checkboxes,
   appending the answer, AND updating any numbered decision whose body
   the OQ answer changes (auth matrices, table values, timestamps,
   heading levels, etc.). The decisions presented in step 2 must already
   be consistent with the OQ answers — do not walk the human through
   approve/change on text that contradicts an OQ they just answered.

2. **Decision-by-decision review:** For each design decision (D1, D2, …),
   present the decision to the human using the #tool:vscode/askQuestions:
   - Summarize the decision in 1–2 sentences (what was chosen and why).
   - Offer choices: `["Approve", "Change (I'll explain)"]`.
   - If the human selects "Change", ask a follow-up freeform question to
     capture their preferred alternative, then update `design.md`
     accordingly.

   You may batch up to 4 decisions per vscode/askQuestions call (the tool's hard
   cap). For designs with many decisions, walk them in successive
   batched calls (e.g. D1–D4, D5–D8, …) rather than one round trip per
   decision — the human still sees one prompt per decision inside each
   batch.

   If a numbered decision is also listed in "Open questions for the
   human", it is resolved during the open-questions pass — do NOT
   re-present it here. Note it to the human as "settled via OQ<n>" and
   move on.

   **Partial settlement (decisions↔OQs are many-to-many).** A single
   decision may be *partly* settled by one or more OQs and *partly* still
   open; equally, one OQ may touch several decisions. Do not treat "this
   decision is mentioned in an OQ" as "skip the whole decision." Present
   only the still-open part of the decision for approval, and note which
   OQ(s) settled the rest — e.g. "D4: routing/`Location` header still
   open; GET-endpoint settled via OQ1, `VoteCount` via OQ4, PUT-guard via
   OQ5." If a decision is *entirely* settled by OQs, skip it with the
   "settled via OQ<n>" note.

3. **Final confirmation:** After all decisions are reviewed, ask the human
   one final question: "All design decisions reviewed. Ready to proceed to
   Structure?" with choices `["Yes — proceed to /qrspi-structure",
   "I want to edit design.md manually first"]`.

4. **Capture deferred work:** Read the `## Goals / Non-Goals` section's
   Non-Goals (which name follow-up changes) plus anything the human moved
   out of scope during the decision review. For each candidate *separable
   future change*, offer it to the human one at a time (vscode/askQuestions:
   *Add as idea / Skip*) and add each accepted one as an `idea` row with a
   one-line *Why* in `openspec/backlog.md`. Follow the "Capturing deferred
   work" rules in skill `workflow` (offer-never-auto-append, dedup
   against existing rows, minimal row); do not promote in-change
   follow-ups. Skip silently if there are no Non-Goals worth promoting.

5. **Commit step (mandatory):** After the human confirms, follow the
   canonical *commit step* in skill `workflow` ("Stage choreography"),
   with these stage variables:
   - Artifact: `openspec/changes/<id>/design.md`.
   - Commit message: `docs(<id>): add design.md (QRSPI stage D)`
   - Git add line: `git add openspec/changes/<id>/design.md` — add
     `openspec/backlog.md` to the same commit **only if** you captured any
     idea rows in step 4 (backlog atomicity).

6. **Next-stage handoff:** This stage's handoff acts on the step 3
   final-confirmation choice rather than asking again. If the human chose
   **"Yes — proceed to /qrspi-structure"**, invoke `/qrspi-structure <id>`
   now — run it as its own stage. If they chose **"I want to edit design.md
   manually first"** (or stopped), print the banner above
   (`Next stage: /qrspi-structure <id>`) and end your turn so they can review
   and edit `design.md` before continuing.
