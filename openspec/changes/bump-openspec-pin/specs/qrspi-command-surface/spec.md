# Spec — qrspi-command-surface

> Delta against `openspec/specs/qrspi-command-surface/spec.md` for the
> `bump-openspec-pin` change.
> Adds the `.openspec.yaml` marker lifecycle to stages Q and S so a change
> folder stays `validate --all`-green before `specs/` exists.

## ADDED Requirements

### Requirement: Change folders carry a transient `.openspec.yaml` marker across the Q-to-S window
The system MUST seed `openspec/changes/<id>/.openspec.yaml` (containing
exactly `schema: spec-driven` and `skip_specs: true`) as part of
`claude/commands/questions.md` step 3, the step that creates
`openspec/changes/<id>/`, and MUST include the marker path in that step's
`git add` line alongside `questions.md`. The `claude/commands/structure.md`
command MUST delete `openspec/changes/<id>/.openspec.yaml` after the
architect subagent writes `specs/`, and MUST include the marker's deletion in
its `git add` line so the deletion is staged and committed in the same
stage-S commit as `proposal.md` and `specs/`. No kit-side lint check is
required to police marker removal; the upstream CLI already rejects a change
folder carrying both the marker and `specs/` (see the third scenario below).

#### Scenario: marker seeded at stage Q
- **WHEN** a user runs `/qrspi:questions <id>` for a new change and the
  command reaches step 3 (creating `openspec/changes/<id>/`)
- **THEN** `openspec/changes/<id>/.openspec.yaml` is created containing
  `schema: spec-driven` and `skip_specs: true`, and is staged in the same
  commit as `questions.md`.

#### Scenario: marker deleted at stage S
- **WHEN** a user runs `/qrspi:structure <id>` and the architect subagent
  writes `openspec/changes/<id>/specs/`
- **THEN** `openspec/changes/<id>/.openspec.yaml` is deleted, and that
  deletion is staged and committed in the same stage-S commit that adds
  `proposal.md` and `specs/`.

#### Scenario: CI stays green for a change between stage Q and stage D
- **WHEN** a change folder exists with `questions.md`, `research.md`, and/or
  `design.md` but no `specs/` yet, and the `.openspec.yaml` marker (seeded at
  stage Q) is present
- **THEN** `openspec validate --all` at the pinned CLI version exits 0 for
  that folder, because the marker declares it out of delta-spec-validation
  scope until stage S.

#### Scenario: marker and specs/ present simultaneously is rejected upstream
- **WHEN** `openspec/changes/<id>/.openspec.yaml` (with `skip_specs: true`)
  and `openspec/changes/<id>/specs/` both exist for the same change (a stale
  marker that stage S failed to delete)
- **THEN** `openspec validate` fails with an upstream CLI error naming the
  conflict, so a stale marker cannot silently suppress real delta-spec
  validation.

#### Scenario: archive preserves the marker's absence
- **WHEN** a change reaches `/qrspi:archive` after stage S has deleted its
  `.openspec.yaml` marker
- **THEN** the archive skill's existing handling of `.openspec.yaml` (which
  already knows to preserve the file when present) requires no change,
  because the marker has already been removed by stage S in the normal flow.
