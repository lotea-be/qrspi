# kit-context-budget Specification

## Purpose
Provides a static, deterministic per-stage context-footprint estimator
(`scripts/context-footprint.mjs`) that reports byte/line/rough-token estimates
for each QRSPI stage agent and its declared skill set, giving contributors
visibility into per-stage context cost. Report-only — not a CI gate.

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

### Requirement: context-footprint script prints a per-stage table to stdout
The `scripts/context-footprint.mjs` script MUST print a per-stage footprint table
to stdout. Each row in the table MUST correspond to one QRSPI stage (researcher,
questioner, designer, architect, planner, implementer, reviewer) and MUST include
at minimum: the stage/agent stem, the number of declared skills, the total line
count, the total byte count, and a rough token estimate (calculated as
`Math.round(bytes / 4)`). The script MUST use the same `SKILL_SET_EXPECTED` map
as `scripts/lint.mjs` (or import it from a shared location) so that the two
sources of truth never drift.

#### Scenario: table rows cover all seven stages
- **WHEN** `node scripts/context-footprint.mjs` is run from the kit repo root
- **THEN** the output contains exactly seven data rows — one per QRSPI stage
  agent (researcher, questioner, designer, architect, planner, implementer,
  reviewer) — plus any header/footer lines.

#### Scenario: table columns include the required footprint fields
- **WHEN** `node scripts/context-footprint.mjs` is run
- **THEN** the output table includes columns for agent stem, skill count, total
  lines, total bytes, and rough tokens (bytes / 4), making the per-stage cost
  visible at a glance.

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
