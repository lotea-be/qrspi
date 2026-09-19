# Spec — qrspi-pr-reconciliation

> Delta against `openspec/specs/qrspi-pr-reconciliation/spec.md` for the
> `emit-changelog-task-and-pr-triage` change. Adds an in-stage triage rule for
> trivial must-fix gaps (D7a) and a conditional draft-ness backlog note (D7b).

## ADDED Requirements

### Requirement: PR stage triages trivial in-scope gaps in-stage before seeding followups
The PR stage orchestrator MUST apply a triage rule in the "Seed the follow-up
queue" step before writing `followups.md`: a trivial, in-scope, must-fix-before-merge
gap (for example a missing CHANGELOG entry or a single-line prose correction) MUST
be fixed in-stage — the orchestrator applies the edit and commits it atomically in
its own commit — and the issue MUST be treated as resolved without creating a
`followups.md` entry. Only issues that are genuinely post-PR-shaped (require their
own branch, span multiple capabilities, or need design re-alignment) MUST seed
`followups.md`. The orchestrator MUST surface its triage decision — listing which
issues it fixed in-stage and which it deferred — so the human can override. In a
mixed case where one issue is trivial and another is post-PR-shaped, the trivial
issue is fixed in-stage and the post-PR-shaped issue still seeds `followups.md`.

#### Scenario: trivial CHANGELOG gap fixed in-stage
- **WHEN** the reviewer flags a missing `## [Unreleased]` CHANGELOG entry and
  no other issues are open
- **THEN** the PR stage orchestrator applies the CHANGELOG edit and commits it
  atomically (its own commit), treats the issue as resolved, and does NOT create
  a `followups.md` entry for it.

#### Scenario: orchestrator surfaces triage decision for override
- **WHEN** the PR stage applies an in-stage fix and defers another issue
- **THEN** the orchestrator states which issues it fixed in-stage and which it
  deferred to `followups.md` so the human can override before the turn ends.

#### Scenario: post-PR-shaped issue still seeds followups.md
- **WHEN** a reviewer flags an issue that requires a new branch or design
  re-alignment
- **THEN** the PR stage treats that issue as post-PR-shaped and seeds a
  `followups.md` entry for it, regardless of the in-stage triage rule.

#### Scenario: mixed trivial and post-PR issues handled correctly
- **WHEN** the reviewer flags both a missing CHANGELOG entry (trivial) and a
  capability gap requiring its own branch (post-PR-shaped)
- **THEN** the orchestrator fixes the CHANGELOG entry in-stage (atomic commit,
  no followup entry) AND seeds a `followups.md` entry for the capability gap.

### Requirement: PR stage backlog note reflects actual draft-ness
The PR stage MUST record the backlog note in the "Record the PR link" step as
`in-progress (PR #<N> open)` when no `--draft` flag was passed to the PR-create
CLI call, and as `in-progress (draft PR #<N> open)` when `--draft` was passed.
The note MUST be derived from the orchestrator's own PR-create decision already
made in that stage run, with no additional CLI query.

#### Scenario: non-draft PR produces non-draft backlog note
- **WHEN** the PR stage creates a PR without the `--draft` flag
- **THEN** the backlog note is updated to `in-progress (PR #<N> open)` — not
  `in-progress (draft PR #<N> open)`.

#### Scenario: draft PR produces draft backlog note
- **WHEN** the PR stage creates a PR with the `--draft` flag
- **THEN** the backlog note is updated to `in-progress (draft PR #<N> open)`.

#### Scenario: note derived from create decision, not a CLI re-query
- **WHEN** the PR stage records the backlog note
- **THEN** it uses the draft/non-draft determination already made at PR-create
  time rather than issuing an additional `gh pr view --json isDraft` call.
