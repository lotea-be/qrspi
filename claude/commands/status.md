---
description: Print the QRSPI stage map and recommend the next command. Does not invoke a subagent.
---

You are helping a developer figure out where they are in
the QRSPI workflow.

Steps:

1. **Version check.** Load skill `qrspi-version-check` and follow its
   instructions exactly. This is the first step -- before the onboarding
   check and before any other work.

2. **Onboarding check (the two per-repo setup commands).**
   - If `openspec/` does not exist, this repo has not been bootstrapped.
     Tell the user to run `/qrspi:init` first (it scaffolds `openspec/`
     and seeds the QRSPI templates), then stop — the stages need that
     folder.
   - Whether or not `openspec/` exists, check (Glob
     `.claude/skills/*-stack/SKILL.md`) whether this repo has a
     stack-cheatsheet skill. If not, recommend a one-time `/qrspi:stack`
     so every stage runs stack-aware. This is a recommendation, not a
     blocker — continue regardless.

   Together `/qrspi:init` and `/qrspi:stack` are the two per-repo
   onboarding steps; surface whichever is still missing as the next
   action before any change-level stage.

3. List the in-flight change folders under `openspec/changes/` (ignore
   `archive/`). For each, look at which artifacts exist and infer the
   next stage:

   | Highest artifact present | Next stage / command |
   |--------------------------|----------------------|
   | (none / folder empty)    | Q — `/qrspi:questions <id>` |
   | `questions.md`           | R — `/qrspi:research <id>` |
   | `research.md`            | D — `/qrspi:design <id>` (then human review) |
   | `design.md`              | S — `/qrspi:structure <id>` (only after human approval of design.md) |
   | `proposal.md` + `specs/` | V — `/qrspi:slices <id>` (or do this together with S) |
   | `slices.md`              | P — `/qrspi:plan <id>` |
   | `tasks.md` (incomplete)  | I — `/qrspi:implement <id>` |
   | `tasks.md` (all done)    | PR — `/qrspi:pr <id>`, then archive with `/qrspi:archive <id>` after merge |
   | `pr.md`                  | PR is open — resolve any `followups.md`, then `/qrspi:archive <id>` after merge |

   **Reading the PR link:** When `pr.md` exists, the PR has already been
   opened; surface its **URL** line so the user has the clickable link.

   **Post-PR follow-ups:** When `followups.md` exists, Grep it for un-ticked
   `- [ ]` boxes. If any remain, the next action is `/qrspi:followup <id>` (one
   per follow-up), not archival — surface the count. Only when every box is
   ticked is the change ready to archive after the PR merges.

   **Detecting task completion:** When `tasks.md` exists, use Grep to
   count `- [ ]` (incomplete) vs `- [x]` (complete) checkboxes. If zero
   incomplete tasks remain, all implementation is done — the change is
   ready for PR review and archival, not for `/qrspi:implement`.

4. Print the eight stages with a 1-line description each (from skill
   `workflow`).

5. **Mention the retrospective.** After every stage, the human can
   optionally run `/qrspi:retro <id> <stage>` to capture friction
   and fold it back into the prompts/skills/templates. This is
   recommended after stages Q, D, S, and PR (the stages where the
   prompts have the most leverage), but optional everywhere.

6. If the user gave an argument, treat it as a change id and only show
   the status for that one. Otherwise show all in-flight changes.

User argument: $ARGUMENTS

To discover the current openspec state, use the **Glob** tool with pattern
`openspec/changes/**/*` (it returns nothing if `openspec/changes/` is
missing — in that case follow step 2 and stop). Do not shell out — Glob
has no permission requirements and works on every platform.

End with: "What change are you working on, and what stage are you in?"
