# Spec — kit-versioning

> Delta against `openspec/specs/kit-versioning/spec.md` for the `backlog-schema-finish` change.
> Adds two optional idempotency/fault-tolerance sub-fields to the `edit-file` step schema and documents their dispatcher semantics in the `qrspi-update` skill.

## ADDED Requirements

### Requirement: edit-file steps MAY carry skip_if_contains for content-idempotent replay
The system MUST support an optional `skip_if_contains: "<marker>"` field on any
`edit-file` step in a `migrations/*.yaml` `automated` list. When the field is
present and its value (a non-empty literal string) is found anywhere in the
target file's raw text, the dispatcher MUST skip the insert entirely and
continue the walk without applying the step. The whole-file substring search
MUST be evaluated before the `insert_after` or `insert_before` anchor search
so that a consumer who already has the content is a clean skip regardless of
anchor state. Check 6 MUST accept `skip_if_contains` as an optional field
whose value, when present, MUST be a non-empty string; a missing field is valid
and causes no Check 6 error.

#### Scenario: skip_if_contains marker present in file causes step to be skipped
- **WHEN** a consumer's `openspec/backlog.md` already contains the literal string
  `Backlog schema legend (frozen by standardize-backlog-format).` and
  `/qrspi:update` processes the `0.13.0.yaml` automated step that carries
  `skip_if_contains: "Backlog schema legend (frozen by standardize-backlog-format)."`
- **THEN** the dispatcher skips the insert step and continues the walk without
  duplicating the legend block or raising an error.

#### Scenario: skip_if_contains marker absent in file allows step to proceed
- **WHEN** a consumer's `openspec/backlog.md` does not contain the marker string
  and `/qrspi:update` processes the step
- **THEN** the dispatcher does not skip the step and proceeds to apply the insert
  as normal.

#### Scenario: Check 6 accepts skip_if_contains as optional non-empty string
- **WHEN** `migrations/0.13.0.yaml` carries `skip_if_contains: "Backlog schema legend (frozen by standardize-backlog-format)."` on its insert step and `node scripts/lint.mjs` is run
- **THEN** Check 6 reports no schema violation for that field.

#### Scenario: Check 6 rejects skip_if_contains with an empty string value
- **WHEN** a `migrations/*.yaml` step carries `skip_if_contains: ""` and
  `node scripts/lint.mjs` is run
- **THEN** Check 6 pushes a schema violation for the empty-string value and exits
  non-zero.

### Requirement: edit-file steps MAY carry anchor_missing for fault-tolerant degradation
The system MUST support an optional `anchor_missing: warn-and-skip` field on any
`edit-file` step in a `migrations/*.yaml` `automated` list. When the field is
present with the value `warn-and-skip` and the step's `insert_after` (or
`insert_before`) anchor is not found in the target file, the dispatcher MUST emit
a one-line human-readable warning (naming the file, the missing anchor, and the
step description) and MUST skip that step, continuing the walk rather than
hard-stopping. The version marker MUST still be bumped at end of walk after an
`anchor_missing`-skipped step, so the consumer is not permanently wedged. When
`anchor_missing` is absent, the existing hard-stop behaviour on a missing anchor
is unchanged. Check 6 MUST accept `anchor_missing` as optional; when present its
value MUST equal the closed literal `warn-and-skip` (the only valid value today);
any other value MUST cause a Check 6 error.

#### Scenario: anchor absent with anchor_missing:warn-and-skip emits warning and continues
- **WHEN** a consumer's `openspec/backlog.md` does not contain the `insert_after`
  anchor specified in the `0.13.0.yaml` step, and that step carries
  `anchor_missing: warn-and-skip`, and `/qrspi:update` processes the step
- **THEN** the dispatcher emits a one-line warning naming the file, missing
  anchor, and step description, skips the step, continues the walk, and bumps
  the version marker at end of walk.

#### Scenario: anchor absent without anchor_missing still hard-stops
- **WHEN** a consumer's target file does not contain the anchor and the step
  does not carry `anchor_missing`, and `/qrspi:update` processes the step
- **THEN** the dispatcher hard-stops as before and does not continue the walk.

#### Scenario: Check 6 accepts anchor_missing: warn-and-skip
- **WHEN** `migrations/0.13.0.yaml` carries `anchor_missing: warn-and-skip` on
  its insert step and `node scripts/lint.mjs` is run
- **THEN** Check 6 reports no schema violation for that field.

#### Scenario: Check 6 rejects anchor_missing with an unrecognized value
- **WHEN** a `migrations/*.yaml` step carries `anchor_missing: skip` (not the
  closed literal `warn-and-skip`) and `node scripts/lint.mjs` is run
- **THEN** Check 6 pushes a schema violation naming the disallowed value and
  exits non-zero.

### Requirement: migrations/0.13.0.yaml MUST be backfilled in place with both idempotency guards
The system MUST add `skip_if_contains: "Backlog schema legend (frozen by standardize-backlog-format)."` and `anchor_missing: warn-and-skip` to the single `insert_after` step in `migrations/0.13.0.yaml`, editing the file in place. No `0.13.1.yaml` re-run manifest MUST be shipped; the in-place backfill is sufficient because a first-time applier receives the guarded insert and a consumer who already ran `0.13.0` cleanly has the marker at `>= 0.13.0` and never re-walks that step.

#### Scenario: 0.13.0.yaml carries both new fields after the backfill
- **WHEN** `migrations/0.13.0.yaml` is read after this change ships
- **THEN** the single `automated` step carries both `skip_if_contains: "Backlog schema legend (frozen by standardize-backlog-format)."` and `anchor_missing: warn-and-skip`, and Check 6 reports no schema violation.

#### Scenario: no 0.13.1.yaml is shipped
- **WHEN** the kit source tree is inspected after this change ships
- **THEN** `migrations/0.13.1.yaml` does not exist.
