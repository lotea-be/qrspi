---
name: qrspi-retrospective
description: How to run a post-stage retrospective on a just-completed QRSPI stage. Captures friction the agent encountered that the prompts/skills did not anticipate, and turns it into concrete edits to the agent/command/skill files (and to the kit's openspec-templates/, openspec/backlog.md, and the project's contributor-guidance file). Load this when running `/qrspi:retro <change-id> <stage>` or whenever the human asks "what could we improve about this stage?".
---

## Why this exists

Each QRSPI stage is governed by a triplet of files:

- A **command** in `.claude/commands/<stage>.md` (entrypoint)
- An **agent** in `.claude/agents/qrspi-<role>.md` (the stage's worker)
- One or more **skills** in `.claude/skills/<name>/` (shared methodology)

Plus shared assets: the kit's `openspec-templates/` (shared shape — edits here
change all repos), `openspec/backlog.md`, and the project's contributor-guidance
file (if it defines one).

These files describe how the stage *should* run. Every session reveals
small gaps between that description and reality: a convention the agent
had to reverse-engineer from code, a stale fact in the instructions,
a step the agent had to re-derive, a section the template doesn't list.

The retrospective is the deliberate moment to capture those gaps and
fold them back into the prompts. Without it, the same friction repeats
on the next change.

## When to run it

- Immediately after a stage's artifact is finalized (`questions.md`,
  `research.md`, `design.md`, `proposal.md`, `tasks.md`, `slices.md`,
  or after the merge commit for stage I/PR).
- When the human says "what could we improve about this stage?" or
  similar.
- Do NOT run a retrospective during a stage — it interrupts the stage's
  own work. Stage first, retro after.

## Inputs

1. The change id (kebab-case) — e.g. `add-questions`.
2. The stage letter — `Q`, `R`, `D`, `S`, `P`, `W`, `I`, or `PR`.
3. (Implicit) The session's recent conversation — what the orchestrator
   actually had to do to complete the stage.

## What to do

### 1. Identify the stage's governing files

For stage `Q`:

| Role | Claude source (edit here) | Copilot mirror (generated) |
|------|---------------------------|----------------------------|
| Command | `claude/commands/questions.md` | `copilot/prompts/qrspi-questions.prompt.md` |
| Agent | `claude/agents/questioner.md` | `copilot/agents/copilot-questioner.agent.md` |
| Skill (workflow) | `claude/skills/qrspi-workflow/SKILL.md` | `copilot/instructions/qrspi-workflow.instructions.md` |
| Skill (openspec) | `claude/skills/openspec-workflow/SKILL.md` | `copilot/instructions/openspec-workflow.instructions.md` |
| Template (kit) | `openspec-templates/questions.template.md` | — |
| Artifact written this stage | `openspec/changes/<id>/questions.md` | — |

The Copilot mirror is **generated** from the Claude source by
`sync-copilot.mjs` — never hand-edit it. Apply your edit to the Claude
source, then regenerate (see step 5).

The same table applies stage by stage — substitute the role name
(researcher, designer, architect, planner, implementer, reviewer) and
the artifact name.

### 2. Read everything

- The artifact the stage just wrote.
- The command, agent, and skill(s) that govern the stage.
- The template, if any.
- `openspec/backlog.md` row matching the change.
- The most recent archived artifact of the same stage (e.g.
  `openspec/changes/archive/<date>-<id>/questions.md`) for comparison.

### 3. Cross-examine the session

For each of the categories below, scan the conversation and the
artifact for evidence:

- **Knowledge gaps:** What did the orchestrator have to grep for, read,
  or ask the human to recover information that the prompts/skills
  did not point at?
- **Stale facts:** Anything in the governing files that turned out to
  be wrong (e.g., wrong runtime version, missing directory, outdated
  convention)?
- **Missing conventions:** A repo-wide convention the artifact had
  to follow but the prompts did not state (e.g., a sealing/visibility
  default, a Conventional Commits scope)?
- **Workflow gaps:** A step the orchestrator did that the prompts did
  not require (e.g., flipping the backlog status, staging a sibling
  file in the commit)?
- **Template gaps:** Sections the artifact contains that the template
  does not list (or vice versa)?
- **Constraints that surprised the human:** Did the human change the
  agent's default recommendation? If yes, why — and should the
  recommendation change in the template?

### 4. Draft the retrospective

A change accrues one retrospective per stage, all in the **same**
`openspec/changes/<id>/retrospective.md`. If the file already exists (an
earlier stage was retro'd), **append** a new section separated by a `---`
rule — do NOT overwrite the prior stage's section. Each section is headed
`# Retrospective — <id> / stage <letter>`.

Write (or append to) `openspec/changes/<id>/retrospective.md` with this
structure:

```markdown
# Retrospective — <id> / stage <letter>

> Generated <YYYY-MM-DD>. Stage completed in commit(s) <short-shas>.

## Friction observed

1. **<short title>.** <one paragraph: what happened, why it slowed the
   stage, which file should have prevented it>
2. ...

## Proposed edits

| # | File | Edit |
|---|------|------|
| 1 | `.claude/agents/questioner.md` | Add step X: ... |
| 2 | `openspec-templates/questions.template.md` (kit) | Add section "..." |
| 3 | the project's contributor-guidance file | Fix stale fact "..." |

Each row is a concrete edit — not a vague suggestion. The implementer
of these edits should be able to apply them without re-deriving the
context.

## Deferred

Anything intentionally not addressed in this retrospective, with a
one-line reason (e.g., "ambiguous fix; needs human decision on X vs Y").
```

### 4b. Route code-level findings to followups.md

A retrospective produces two *kinds* of finding, and they go to different
places:

- **Prompt/process friction** (a stale fact, a missing convention, a step
  the agent re-derived) → the "Proposed edits" table above, applied to the
  governing `.claude/` files (and the project's contributor-guidance file).
- **Code-level flags** (the *code* is wrong or inconsistent, e.g.
  *"the create endpoint returns 409 with the wrong error-body shape"*) →
  these are **not** prompt edits. If the change's PR is already open (a
  `pr.md` exists), append each as a checkbox to
  `openspec/changes/<id>/followups.md` (format and resolution in skill
  `qrspi-postpr-fix`), tagged `(source: retro <stage>)`. They are resolved
  later with `/qrspi:followup <id>`, not in the retrospective. If the PR is not
  open yet, fold the fix into the still-running stage instead.

Do not put code fixes in the "Proposed edits" table — that table is only
for edits to the prompts/skills/templates.

### 5. Offer to apply each edit

For each row in "Proposed edits", ask the human (one at a time via
the **AskUserQuestion** tool) whether to apply, defer, or skip. Apply the
approved edits to the corresponding **Claude source** file (under `claude/`,
`openspec-templates/`, or the project's contributor-guidance file). The
`copilot/` mirror is generated — do **not** hand-edit it. After applying the
Claude-side edits, regenerate the mirror with `node sync-copilot.mjs` and
confirm zero drift with `node sync-copilot.mjs --check` so the human sees the
mirror is clean. (Template and contributor-guidance edits have no `copilot/`
mirror; only `claude/agents`, `claude/commands`, and `claude/skills` edits
propagate.)

### 6. Commit

After all approved edits are applied, ask the human:

> Commit retrospective.md and the prompt/skill/template edits to the feature branch?

If yes, stage the affected files and commit with:

```
docs(<id>): retrospective for stage <letter> + prompt edits
```

The retrospective.md is committed to the change folder so it travels
with the change and gets archived at merge time — preserving the
record of *why* a prompt changed.

## Output expectations

- The retrospective should be specific. "Improve the prompt" is not an
  edit; "Add a 'sealed by default' rule to the project's contributor-guidance
  file under Coding Conventions" is.
- The retrospective should be honest. If the stage went smoothly and
  there's nothing to improve, write a one-line retrospective.md saying
  so and stop. Do NOT invent friction.
- Keep retrospectives small — 2 to 6 entries is a healthy range.
  Larger lists usually mean two or more stages' worth of feedback got
  conflated; split them.

## How this skill relates to others

- `qrspi-workflow` — the eight-stage flow itself.
- `openspec-workflow` — how QRSPI artifacts persist on disk.
- `context-hygiene` — keeps the retrospective conversation lean.
