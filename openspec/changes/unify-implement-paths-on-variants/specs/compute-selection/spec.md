# Spec — compute-selection

> Delta against `openspec/specs/compute-selection/spec.md` for the
> `unify-implement-paths-on-variants` change.
> Makes the trivial / no-tasks.md inline-plan dispatch explicit
> (implementer-medium); formalises followup.md effort-routing for the FIX MODE
> (compute: effort=…) token.

## MODIFIED Requirements

### Requirement: Implement command threads per-slice model= from tasks.md and drops the self-halt
The system MUST update `claude/commands/implement.md` so that, for each
_normal_ slice, it reads both the `effort=` value (required; hard-stop if
absent from a slice's `**Compute:**` line) and the `model=` value (optional;
defaults to `sonnet`) from the next un-ticked slice's `**Compute:**` line in
`tasks.md`, maps the effort value to a `subagent_type` (`low` →
`implementer-low`, `medium` → `implementer-medium`, `high` →
`implementer-high`), and spawns that variant via the Agent tool with the
resolved `model:` parameter. For the _trivial / inline-plan_ path (no
`tasks.md`, user supplies a one-paragraph inline plan), the command MUST
explicitly spawn `qrspi:implementer-medium` with `model: sonnet` — this path
MUST NOT fall through to any base `qrspi:implementer` agent (which is deleted).
The missing-`effort=` hard-stop applies only to the normal slice path (a slice
with no `effort=` token is a planning gap); the trivial inline-plan path is
frictionless and carries no `effort=` requirement. Both the main spawn site and
the auto-mode loop site in `implement.md` MUST be updated. The implementer
self-halt MUST remain removed; the orchestrator's spawn-time gate is the sole
enforcement point.

#### Scenario: trivial inline-plan path spawns implementer-medium with sonnet
- **WHEN** `/qrspi:implement <id>` is invoked with no `tasks.md` and the user
  provides a one-paragraph inline plan
- **THEN** `qrspi:implementer-medium` is spawned with `model: sonnet` on the
  Agent call, without requiring an `effort=` token.

#### Scenario: trivial path does not hard-stop on absent effort=
- **WHEN** `/qrspi:implement <id>` is running on the trivial inline-plan path
  (no `tasks.md`)
- **THEN** the orchestrator does NOT issue a hard-stop for a missing `effort=`
  token; the hard-stop applies only to normal-slice `**Compute:**` lines in
  `tasks.md`.

#### Scenario: implement reads effort= to select the variant agent (normal path unchanged)
- **WHEN** `claude/commands/implement.md` is running and the next un-ticked
  slice in `tasks.md` has `**Compute:** effort=low model=haiku -- version bump`
- **THEN** the implementer subagent `implementer-low` is spawned with
  `model: haiku` on the Agent call.

#### Scenario: missing effort= token triggers hard-stop in implement.md (normal path unchanged)
- **WHEN** `claude/commands/implement.md` is running and the next un-ticked
  slice's `**Compute:**` line contains no `effort=` token (normal slice path)
- **THEN** the orchestrator issues a hard-stop and does not spawn any
  implementer subagent.

### Requirement: followup.md supports an optional inline (compute: …) spec and wires an explicit default model
The system MUST update `claude/commands/followup.md` so that: (a) the
orchestrator parses an optional inline `(compute: model=… effort=…)` token from
the follow-up description, using the same `key=value` grammar as the normal
slice path, and when `effort=` is present maps it to a variant subagent_type
(`low` → `qrspi:implementer-low`, `medium` → `qrspi:implementer-medium`,
`high` → `qrspi:implementer-high`); (b) when `effort=` is absent, the
orchestrator defaults to `qrspi:implementer-medium`; (c) when `model=` is
present in the inline spec, the parsed value is threaded as the per-invocation
`model` parameter on the FIX MODE Agent call; (d) when `model=` is absent, the
orchestrator passes an explicit `model: sonnet` on the FIX MODE Agent call as
the wired default, so prose and wiring agree. The `thinking=` field MUST NOT
appear in the `(compute: …)` grammar.

#### Scenario: inline (compute: effort=high model=opus) routes to implementer-high with opus
- **WHEN** a follow-up description contains `(compute: effort=high model=opus)`
  and `/qrspi:followup <id>` is invoked in FIX MODE (P1)
- **THEN** `qrspi:implementer-high` is spawned with `model: opus` on the Agent
  call.

#### Scenario: absent effort= token defaults to implementer-medium
- **WHEN** a follow-up description contains no `effort=` token in its
  `(compute: …)` spec (or has no `(compute: …)` at all) and `/qrspi:followup
  <id>` is invoked in FIX MODE (P1)
- **THEN** `qrspi:implementer-medium` is spawned, regardless of whether `model=`
  was parsed or defaulted.

#### Scenario: absent inline spec uses explicit sonnet default
- **WHEN** a follow-up description contains no `(compute: …)` token and
  `/qrspi:followup <id>` is invoked in FIX MODE (P1)
- **THEN** the FIX MODE implementer variant is spawned with `model: sonnet` on
  the Agent call.

#### Scenario: prose and wiring agree on the FIX MODE defaults
- **WHEN** `claude/commands/followup.md` is read after the change ships
- **THEN** both the prose description of the FIX MODE defaults and the Agent
  call's default `subagent_type` and `model:` parameter resolve to
  `qrspi:implementer-medium` and `sonnet` respectively.
