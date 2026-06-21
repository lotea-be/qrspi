# Spec — qrspi-command-surface

> Delta against `openspec/specs/qrspi-command-surface/spec.md` for the
> `verify-stage-gate-execution` change. Moves all human gate execution and
> next-stage invocation onto the main-loop orchestrator; removes
> `agent:` + `subtask:` frontmatter from the nine stage commands; requires the
> `qrspi-workflow` skill choreography section to attribute procedures to the
> orchestrator and the next-stage handoff to re-enter the next command in the
> main loop.

## ADDED Requirements

### Requirement: Stage commands run on the main-loop orchestrator
Each of the nine QRSPI stage commands MUST run its body in the main-loop
orchestrator (`questions`, `research`, `design`, `structure`, `slices`, `plan`,
`implement`, `pr`, `followup`) so that AskUserQuestion and the Agent tool are
reachable for gate execution and subagent delegation. None of the nine commands
SHALL carry an `agent:` frontmatter field paired with a fork directive
(`subtask:` or `context: fork`) that routes the entire command body into a
subagent context.

#### Scenario: stage command frontmatter after the fix
- **WHEN** any of the nine stage command files is inspected
- **THEN** the frontmatter contains `description:` but does NOT contain both
  `agent: <non-builtin>` and a fork directive (`subtask: true` or
  `context: fork`).

#### Scenario: AskUserQuestion commit gate fires under plugin invocation
- **GIVEN** a user invokes `/qrspi:questions <id>` via the Claude Code plugin
- **WHEN** the questioner subagent returns its artifact
- **THEN** the main-loop orchestrator presents an AskUserQuestion commit gate
  ("Commit questions.md to the feature branch?") and the user can choose
  yes or no.

### Requirement: Bounded artifact write delegated to stage subagent via Agent tool
Each stage command MUST delegate only the bounded artifact-writing job to its
stage subagent by spawning it via the Agent tool (`subagent_type: qrspi:<agent>`).
The subagent MUST return a condensed result (written paths + short summary). The
orchestrator MUST NOT inline the stage subagent's full prompt into its own body
or expand the subagent's work beyond the artifact write.

#### Scenario: orchestrator spawns subagent for the write only
- **GIVEN** a user invokes `/qrspi:research <id>`
- **WHEN** the precondition check passes
- **THEN** the orchestrator spawns the `qrspi:researcher` subagent via the Agent
  tool, waits for it to return `research.md` and a summary, and then runs the
  commit gate itself — the subagent is not asked to run the commit gate.

#### Scenario: subagent returns condensed result
- **WHEN** any stage subagent completes its artifact write
- **THEN** its final message contains the path(s) of the file(s) it wrote and
  a short summary (≤ 10 lines), not the full artifact content or gate dialogue.

### Requirement: Next-stage handoff re-enters the next command in the main loop
The next-stage handoff procedure MUST invoke the next `/qrspi:*` command so that
its body runs in the main-loop orchestrator — NOT by spawning the next stage's
subagent via the Agent tool. Spawning the next stage as a subagent would run only
its bounded write and bypass that stage's own gates, re-trapping the bug.

#### Scenario: next-stage handoff invokes the command, not the subagent
- **GIVEN** a user answers "Continue to /qrspi:design <id>" at the end of the
  research stage
- **WHEN** the orchestrator processes that answer
- **THEN** it invokes `/qrspi:design <id>` as a slash command (so its body runs
  in the main loop), not by spawning `qrspi:designer` directly via the Agent tool
  — ensuring the design stage's approval gate and commit gate are also reachable.

#### Scenario: gate-on-main-loop invariant holds recursively across stages
- **WHEN** a user runs a full QRSPI flow from Q through PR
- **THEN** at every stage transition the precondition check, approval gate (where
  applicable), commit gate, and handoff gate each fire as AskUserQuestion calls
  visible to the user in the main conversation.

## MODIFIED Requirements

### Requirement: Choreography procedure canonical in qrspi-workflow skill
The `qrspi-workflow` skill body MUST contain the canonical descriptions of the
commit step, next-stage handoff, Glob-based precondition pattern, and approval
gate. The skill MUST attribute all four procedures to the **main-loop
orchestrator** as the executor. Each QRSPI stage command MUST keep only a thin
inline stub naming its own artifact filename, commit message template, and
next-stage command, and MUST reference the `qrspi-workflow` skill for the
invariant procedure text. The next-stage handoff description in the skill MUST
state that the orchestrator invokes the next-stage command so it runs as its own
stage in the main loop — it MUST NOT use wording that implies a fresh subagent
fork (such as "fresh subtask" or "invoke the next stage as a subagent").

#### Scenario: contributor reads a stage command
- **WHEN** a contributor opens any stage command file (e.g., `research.md`)
- **THEN** the command contains a thin stub with the stage-specific variable
  parts (artifact name, commit message, next command) and a reference to
  `qrspi-workflow` for the commit-step and handoff procedure, rather than a
  full verbatim copy of the procedure.

#### Scenario: choreography procedure updated in one place
- **WHEN** the commit-step wording is updated in the `qrspi-workflow` skill
- **THEN** all stage commands automatically reflect the updated procedure
  because they reference the skill rather than duplicating its text.

#### Scenario: next-stage handoff wording attributes orchestrator as executor
- **WHEN** the "Stage choreography" section of `qrspi-workflow` SKILL.md is read
- **THEN** the next-stage handoff procedure says the orchestrator invokes the
  next-stage command in the main loop, and contains no phrase that implies a
  fork or subagent spawn for the handoff (e.g., no "fresh subtask", no "invoke
  the next stage as a subagent").
