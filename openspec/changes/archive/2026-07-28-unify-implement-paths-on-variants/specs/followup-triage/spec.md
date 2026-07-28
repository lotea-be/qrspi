# Spec — followup-triage

> Delta against `openspec/specs/followup-triage/spec.md` for the
> `unify-implement-paths-on-variants` change.
> Rewires the P1 FIX MODE spawn from the bare `qrspi:implementer` base agent
> to `qrspi:implementer-<effort>` (default `medium`), bringing the followup
> path into alignment with the normal-slice variant dispatch.

## MODIFIED Requirements

### Requirement: P1 path is identical to today's implementer flow
On P1, the system MUST spawn the appropriate `qrspi:implementer-<effort>`
effort-variant subagent in FIX MODE, selecting the variant from the optional
inline `(compute: effort=<low|medium|high>)` token in the follow-up description
using the same mapping as the normal slice path (`low` → `qrspi:implementer-low`,
`medium` → `qrspi:implementer-medium`, `high` → `qrspi:implementer-high`). When
the `effort=` token is absent, the system MUST default to
`qrspi:implementer-medium`. The `model:` threading is unchanged: the orchestrator
still passes the parsed `model=` value (or the `sonnet` default) as the explicit
`model:` parameter on the Agent tool call. The P1 path MUST NOT spawn the bare
`qrspi:implementer` base agent (which is deleted). The P1 path MUST NOT add any
new annotation to the `followups.md` entry; the existing `-- fixed in <short-sha>`
tick at completion remains the sole record. The triage adds no new steps or side
effects to P1 beyond the gate itself.

#### Scenario: P1 chosen with no effort token defaults to implementer-medium
- **WHEN** the human selects "P1 -- implement directly" at the triage gate and
  the follow-up description contains no `(compute: effort=…)` token
- **THEN** the `qrspi:implementer-medium` subagent is spawned in FIX MODE with
  `model: sonnet` on the Agent call.

#### Scenario: P1 chosen with explicit effort=high spawns implementer-high
- **WHEN** the human selects "P1 -- implement directly" and the follow-up
  description contains `(compute: effort=high)`
- **THEN** the `qrspi:implementer-high` subagent is spawned in FIX MODE.

#### Scenario: P1 chosen with explicit effort=low spawns implementer-low
- **WHEN** the human selects "P1 -- implement directly" and the follow-up
  description contains `(compute: effort=low)`
- **THEN** the `qrspi:implementer-low` subagent is spawned in FIX MODE.

#### Scenario: bare qrspi:implementer is never spawned on the P1 path
- **WHEN** `/qrspi:followup <id>` is invoked in FIX MODE (P1) under any
  effort setting
- **THEN** the Agent tool call targets `qrspi:implementer-low`,
  `qrspi:implementer-medium`, or `qrspi:implementer-high` — never the bare
  `qrspi:implementer` stem.

#### Scenario: model: threading is unchanged on P1
- **WHEN** a follow-up description contains `(compute: model=opus effort=high)`
  and the human selects P1
- **THEN** `qrspi:implementer-high` is spawned with `model: opus` on the Agent
  call, identical to the existing model-threading behaviour.
