# kit-context-budget Specification

## Purpose
Provides a static, deterministic per-stage context-footprint estimator
(`scripts/context-footprint.mjs`) that reports byte/line/rough-token estimates
for each QRSPI stage agent and its declared skill set, giving contributors
visibility into per-stage context cost. Report-only — not a CI gate. Also
specifies the `context-hygiene` guidance that keeps a long-lived orchestrator
session a thin main thread.

## Requirements
### Requirement: context-footprint script exists and is runnable with Node built-ins only
The kit MUST include `scripts/context-footprint.mjs` as a standalone Node ESM
script that imports no third-party dependencies (only Node built-in modules such
as `fs`, `path`, and `url`) and runs to completion without error when invoked
as `node scripts/context-footprint.mjs` from the kit repo root.

#### Scenario: script runs without install step
- **WHEN** a contributor runs `node scripts/context-footprint.mjs` in the kit
  repo with no `npm install` precondition
- **THEN** the script executes to completion without throwing an import error or
  any unhandled exception.

### Requirement: context-footprint script prints a per-agent and a per-command table to stdout
The `scripts/context-footprint.mjs` script MUST print two footprint tables to
stdout. The first MUST have one row per entry of `SKILL_SET_EXPECTED` (imported
from `scripts/skill-sets.mjs`, shared with `scripts/lint.mjs`) and MUST count the
agent file, its declared kit skills, and every kit skill those skills in turn
name in a "Load skill(s) …" sentence, transitively and deduplicated. The second
MUST have one row per `claude/commands/*.md` file and MUST count the command body
plus the kit skills it loads, transitively. Rows MUST include at minimum: the
agent or command, the number of skills counted, total lines, total bytes, and a
rough token estimate (`Math.round(bytes / 4)`). Both tables MUST label that the
counts include conditional loads.

#### Scenario: agent table covers every registered agent
- **WHEN** `node scripts/context-footprint.mjs` is run from the kit repo root
- **THEN** the first table has exactly one data row per `SKILL_SET_EXPECTED` key.

#### Scenario: transitive skill loads are counted
- **WHEN** an implementer variant declares only `implementer-core` and `implementer-core` tells it to load `divergence-rubric`
- **THEN** the implementer rows count `divergence-rubric` too.

#### Scenario: command table shows orchestrator cost
- **WHEN** the script is run
- **THEN** the second table has one row per slash command, e.g. `/qrspi:implement` counting `qrspi-version-check`, `context-budget-gate` and `stage-choreography`.

#### Scenario: table columns include the required footprint fields
- **WHEN** `node scripts/context-footprint.mjs` is run
- **THEN** both tables include columns for the agent or command, skill count, total
  lines, total bytes, and rough tokens (bytes / 4).

### Requirement: context-footprint script always exits 0
The `scripts/context-footprint.mjs` script MUST exit with code 0 regardless of
the individual per-stage estimates. The script MUST NOT enforce a budget ceiling
or advisory threshold that causes a non-zero exit; it is a visibility tool only,
not a CI gate.

#### Scenario: footprint within normal range exits 0
- **WHEN** `node scripts/context-footprint.mjs` runs and all per-stage estimates
  are within normal bounds
- **THEN** the process exits with code 0.

#### Scenario: footprint showing a large stage still exits 0
- **WHEN** one stage has an unusually large estimated token count (e.g. because
  a skill file grew significantly) and `node scripts/context-footprint.mjs` runs
- **THEN** the process still exits with code 0, because the script is report-only
  and enforces no ceiling.

### Requirement: context-hygiene keeps the orchestrator a thin main thread
The `context-hygiene` skill MUST carry an "Off-stage work" section stating that a
long-lived orchestrator session is acceptable while it holds decisions and
summaries rather than raw output, and MUST direct off-stage work to subagents or
files: investigations to a read-only subagent returning ≤10 lines with
`path:line` citations; deploys and CI watching to a subagent or background
command returning pass/fail plus the relevant error; test help written once to a
file; code fixes through `/qrspi:followup` or a scope amendment. The skill MUST
make the stage-boundary "start a new session" prompt conditional: an orchestrator
that stayed thin MAY decline it, and SHOULD accept it once it has absorbed raw
output or been summarized.

#### Scenario: staging bug investigation from the orchestrator
- **WHEN** the human asks the orchestrator "why does the registration stay on awaiting payment?"
- **THEN** the orchestrator delegates the log and code search to a subagent and relays its short answer, rather than reading logs and files inline.

#### Scenario: thin orchestrator declines the stage-boundary reset
- **WHEN** the stage-boundary prompt offers a new session and the orchestrator has held only stage summaries
- **THEN** continuing in the same session is acceptable under the guidance.

### Requirement: Stage commands load orchestrator skills once per session
Every command MUST precede an embedded `qrspi-version-check`,
`context-budget-gate` or `stage-choreography` load line with a guard: skip the version
check when it already ran earlier in the session; follow the budget-gate and
choreography instructions from context when they are still there from an earlier
command (not lost to a context summary) instead of loading the skill again. The
embed lines themselves MUST stay verbatim so lint Checks 9, the budget-gate embed
check and 26 keep passing. `/qrspi:questions` MUST NOT load the `workflow` skill
into the orchestrator; it MUST carry the deferred-work rules it needs inline.

#### Scenario: second stage in a chained session
- **WHEN** `/qrspi:research` runs right after `/qrspi:questions` in the same session with no summary in between
- **THEN** the orchestrator skips the version check and does not reload `context-budget-gate` or `stage-choreography`, while still incrementing the budget counter.

#### Scenario: after a context summary
- **WHEN** the session was summarized and the skill text is no longer in context
- **THEN** the next command loads `context-budget-gate` and `stage-choreography` again.
