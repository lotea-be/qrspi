# Spec — followup-triage

> Delta against `openspec/specs/followup-triage/spec.md` for the
> `orchestrator-context-budget` change.
> Clarifies that the context-budget nudge fires at most once per invocation
> of `/qrspi:followup`, not once per follow-up item processed.

## ADDED Requirements

### Requirement: Context-budget nudge fires at most once per followup invocation
The system MUST enforce that when `/qrspi:followup <id>` embeds the
`context-budget-gate` skill, any context-budget nudge that fires during that
invocation fires exactly once for the entire invocation -- regardless of how many
follow-up items are processed in that session. The skill MUST NOT re-evaluate the
nudge trigger between individual follow-up items within a single `/qrspi:followup`
call.

#### Scenario: multi-item invocation fires the nudge at most once
- **WHEN** `/qrspi:followup <id>` processes multiple follow-up items in one
  invocation and the nudge threshold is crossed during that session
- **THEN** the nudge advisory notice appears at most once; it does NOT re-fire
  between follow-up items within the same invocation.

#### Scenario: nudge already fired on a prior command does not re-fire in followup
- **WHEN** the nudge-level session flag was set during an earlier stage command
  and `/qrspi:followup <id>` is then invoked
- **THEN** the followup invocation finds the nudge-level flag already held and
  produces no advisory notice.
