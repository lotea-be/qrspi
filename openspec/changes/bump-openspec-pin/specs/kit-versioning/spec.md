# Spec — kit-versioning

> Delta against `openspec/specs/kit-versioning/spec.md` for the
> `bump-openspec-pin` change.
> Folds the pin-bump migration steps into the existing unreleased
> `migrations/0.14.0.yaml`, per the human's binding OQ1 answer.

## ADDED Requirements

### Requirement: migrations/0.14.0.yaml folds in the OpenSpec pin bump to 1.9.0
The system MUST extend the existing, unreleased `migrations/0.14.0.yaml`
manifest with the pin-bump migration steps rather than shipping a separate
`0.15.0.yaml`, because `0.14.0.yaml` is staged ahead of the next cut and a
second unreleased manifest would be orphaned by the `/qrspi:update` walk. The
manifest's `summary` field MUST be extended to describe the pin bump
alongside its existing content. The manifest's `automated` list MUST include
an `edit-file` step with `path: openspec/config.yaml`, `find: "openspec_version:
1.4.1"`, and `replace: "openspec_version: 1.9.0"`, carrying `skip_if_contains:
"openspec_version: 1.9.0"` for idempotent replay. The manifest's `manual`
list MUST include: (a) a step instructing the consumer to update their own
CI's `validate` invocation to `@1.9.0 ... --all --strict`; and (b) a step
instructing the consumer to add the two-line `.openspec.yaml` marker to any
of their own change folders currently between stage Q and stage S.

#### Scenario: automated config edit applies to a consumer still on 1.4.1
- **WHEN** a consumer's `openspec/config.yaml` reads `openspec_version:
  1.4.1` and `/qrspi:update` processes `migrations/0.14.0.yaml`'s pin-bump
  step
- **THEN** the dispatcher replaces the value with `openspec_version: 1.9.0`
  and stages the file.

#### Scenario: automated config edit is idempotent on replay
- **WHEN** a consumer's `openspec/config.yaml` already reads
  `openspec_version: 1.9.0` and `/qrspi:update` processes the same step
- **THEN** the dispatcher skips the edit because `skip_if_contains:
  "openspec_version: 1.9.0"` matches the file's current contents, and does
  not error.

#### Scenario: manual CI-invocation step is gated by AskUserQuestion
- **WHEN** `/qrspi:update` reaches the manual steps in `migrations/0.14.0.yaml`
- **THEN** the human is asked, via `AskUserQuestion`, to confirm they have
  updated their own CI's `validate` invocation to `@1.9.0 ... --all
  --strict`, before the walk advances.

#### Scenario: manual marker-backfill step is gated by AskUserQuestion
- **WHEN** `/qrspi:update` reaches the second manual step in
  `migrations/0.14.0.yaml`
- **THEN** the human is asked, via `AskUserQuestion`, to confirm they have
  added the `.openspec.yaml` marker to any of their own in-flight change
  folders currently between stage Q and stage S, before the walk advances.

#### Scenario: no orphaned 0.15.0.yaml manifest is shipped
- **WHEN** the kit source tree is inspected after this change ships
- **THEN** `migrations/0.15.0.yaml` does not exist, and the pin-bump steps
  live entirely inside `migrations/0.14.0.yaml`.

#### Scenario: lint Check 6 passes for the extended manifest
- **WHEN** `node scripts/lint.mjs` is run after `migrations/0.14.0.yaml` is
  extended
- **THEN** Check 6 passes schema validation: `version`, `summary`,
  `automated`, and `manual` fields are present, the automated step uses only
  the `edit-file` action, its `path` is `openspec/`-scoped, and
  `skip_if_contains` is a non-empty string.
