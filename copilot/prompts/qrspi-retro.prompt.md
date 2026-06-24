---
description: Post-stage retrospective. Captures friction from a just-completed QRSPI stage and turns it into concrete edits to the prompts/skills/templates that govern that stage.
argument-hint: <change-id> <stage>
tools: ['search/codebase', 'search', 'edit/editFiles', 'execute/runInTerminal', 'execute/getTerminalOutput', 'web/fetch', 'vscode/askQuestions']
agent: agent
---

You are running a **QRSPI retrospective** for the current project.

Arguments: ${input}

The first token is the change id (kebab-case, e.g. `add-questions`).
The second token is the stage letter (`Q`, `R`, `D`, `S`, `P`, `W`,
`I`, or `PR`). If either is missing, ask the user for it before
proceeding.

If `openspec/changes/<id>/` does not exist, tell the user the change
id is unknown and stop.

Otherwise:

1. Consult the instructions for `retrospective`, `workflow`, and
   `openspec-workflow`.
2. Read the artifact the stage just wrote (e.g. `questions.md` for
   stage Q, `research.md` for stage R, etc.) plus the
   command/agent/skill files that govern that stage. The table in the
   `retrospective` skill lists which files apply per stage.
3. **Identify friction in this session.** Use the categories listed in
   the skill (Knowledge gaps, Stale facts, Missing conventions,
   Workflow gaps, Template gaps, Constraints that surprised the human).
   Be honest — if the stage went smoothly, say so and write a
   one-line retrospective.md.
4. Write `openspec/changes/<id>/retrospective.md` following the
   structure in the skill. Each "Proposed edit" row must be concrete
   (file path + exact change), not vague.
5. **Interactive step (mandatory):** For each row in "Proposed edits",
   use the #tool:vscode/askQuestions to ask whether to apply, defer, or skip. Apply
   approved edits to both the Claude file AND its GitHub mirror.
6. After each pair-edit, run `./scripts/sync-agent-defs.ps1 -Pair <name>`
   to verify the mirror is clean. If it reports unexpected DRIFT, fix
   the mirror before moving on.
7. **Commit step (mandatory):** When all approved edits are applied,
   use the #tool:vscode/askQuestions to ask:
     question: "Commit retrospective.md and the prompt edits to the feature branch?"
     choices: ["Yes — commit and push", "No — I'll commit later"]
   If yes:
   ```
   git add openspec/changes/<id>/retrospective.md \
     <each edited prompt/skill/template/instruction file>
   git commit -m "docs(<id>): retrospective for stage <letter> + prompt edits"
   git push
   ```

Repository signals you may use (to list in-flight and archived changes, use the
**Glob** tool with patterns `openspec/changes/*` and
`openspec/changes/archive/*` — do not shell out):
#file:openspec/changes/${input}
#file:openspec/backlog.md
Final message format:

```
Wrote: openspec/changes/<id>/retrospective.md
Friction items: <N>
Edits applied: <N applied> / <N proposed>
Edits deferred: <N>
Mirror status: <clean | drifted: <pairs>>
```
