---
description: QRSPI stage Q. Delegates to the questioner subagent to turn a vague feature request into a list of technical questions. Writes openspec/changes/<id>/questions.md.
argument-hint: <change-id>
agent: copilot-questioner
---

You are running QRSPI stage **Q (Questions)** for the current project.

Change id and short description: ${input}

If `openspec/` does not exist, tell the user to run `/qrspi-init`
first and stop.

Otherwise:

1. Parse the user's input. The first token is the kebab-case change id;
   the rest is the short description.
2. **Create a feature branch:** Use the project's branch-naming convention
   (see its stack-cheatsheet skill; default to `features/<id>` if none is
   specified). If not already on the change's branch, create and switch to it:
   ```
   git checkout -b <branch>
   ```
   If the branch already exists (e.g., resuming a flow), just switch to
   it. Push the branch to origin immediately so it exists remotely:
   ```
   git push -u origin <branch>
   ```
3. Create `openspec/changes/<id>/` if it does not already exist.
4. Consult the instructions for `qrspi-workflow` and `openspec-workflow`.
5. Follow the instructions in your agent prompt to produce
   `openspec/changes/<id>/questions.md`.
6. **Interactive step (mandatory):** After writing `questions.md`, read
   back the "Open product questions (for the human)" section. For EACH
   question listed there, use the #tool:vscode/askQuestions to ask the human
   directly (one question at a time, with sensible multiple-choice
   options when possible). Record their answers inline in `questions.md`
   by ticking the checkboxes and appending `**Answer: <their answer>.**`
   - **Emergent follow-up questions are sanctioned.** If a recorded answer
     opens a gap the document does not cover (e.g. an answer restricts an
     action to admins, but no PQ asked *where* that action then happens),
     ask a new follow-up PQ on the spot — numbered after the last existing
     PQ — and record it in `questions.md` before moving on.
   - **Reconcile overturned body sections.** If an answer contradicts an
     assumption baked into an earlier body section (e.g. a "UI — form"
     section that assumed a now-removed input), add a one-line
     `> ⮕ Resolved by PQ<n>: <what changed>` pointer at the top of that
     section so stages R/D/S are not misled by the superseded framing.
7. Only AFTER all product questions are answered (or explicitly deferred
   by the user), print the final message.

Repository signals you may use (to list in-flight and archived changes, use the
**Glob** tool with patterns `openspec/changes/*` and
`openspec/changes/archive/*` — do not shell out):
#file:requirements.md
#file:tech-stack.md
#file:openspec/backlog.md
The questioner agent carries the canonical section structure and the
`PQ<N> — <topic>:` product-question convention inline (the shape ships with the
QRSPI kit — there is no per-repo template to read). The most recent
`openspec/changes/archive/<date>-<id>/questions.md` is a fully-worked example
the agent is expected to read before writing.

Return the agent's "Final message format" followed by: `Next stage: /qrspi-research <id>`

**Choreography (see skill `qrspi-workflow`, "Stage choreography").** Follow
the canonical *commit step* and *next-stage handoff* there, with these
stage variables:
- Artifact: `openspec/changes/<id>/questions.md` (plus `openspec/backlog.md`).
- Commit message: `docs(<id>): add questions.md (QRSPI stage Q)`
- Backlog atomicity: the matching row must read `proposed` (flipped from
  `idea`) in this same commit. The questioner agent performs this flip (its
  step 9) — **verify** the row already reads `proposed` rather than editing
  it yourself; only flip it if the agent did not (re-editing it after the
  agent will fail with a "file modified since read" error).
- Git add line: `git add openspec/changes/<id>/questions.md openspec/backlog.md`
- Next-stage command: `/qrspi-research <id>` — invoke it as its own stage (a
  fresh subtask, so Research stays blind to the ticket per its design).
