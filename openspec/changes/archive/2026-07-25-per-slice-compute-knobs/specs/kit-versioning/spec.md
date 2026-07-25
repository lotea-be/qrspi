# Spec — kit-versioning

> Delta against `openspec/specs/kit-versioning/spec.md` for the
> `per-slice-compute-knobs` change. Adds a migration manifest for the
> `**Model:** → **Compute:**` annotation rename so consumers with in-flight
> changes are guided through the textual rewrite.

## ADDED Requirements

### Requirement: Kit ships a migration manifest for the Model-to-Compute annotation rename
The system MUST ship a `migrations/<version>.yaml` file for the release that
introduces the `**Compute:**` annotation, containing a `manual:` step that
instructs the consumer to rewrite any `**Model:** X — R` line in in-flight
`slices.md` or `tasks.md` files to `**Compute:** model=X — R` (with `effort=`
omitted, meaning inherit). The `automated:` list MUST be empty (`[]`) because
the rewrite targets arbitrary consumer change folders that the kit cannot safely
locate or edit blindly. The `version` field MUST be set to the bare SemVer of
the release (not pre-filled in this change per the no-version-bump-in-feature-work
rule). The `summary` field MUST describe the annotation rename.

#### Scenario: migration manifest ships with the release
- **WHEN** the release that includes `per-slice-compute-knobs` is tagged and `migrations/<version>.yaml` is read
- **THEN** the file contains a non-empty `manual:` list with at least one step describing the `**Model:** → **Compute:**` rewrite, and `automated: []`.

#### Scenario: automated list is empty
- **WHEN** `migrations/<version>.yaml` for this release is read
- **THEN** the `automated:` list is empty (`[]`), because the per-repo rewrite of in-flight change folders cannot be safely automated by the kit.

#### Scenario: manual step guides the consumer through the rename
- **WHEN** a consumer running `/qrspi:update` reaches the migration manifest for this release
- **THEN** the manual step's `description` instructs the consumer to find any `**Model:** X — R` line in in-flight `slices.md` or `tasks.md` files and rewrite it to `**Compute:** model=X — R`, preserving the rationale tail and omitting `effort=` (inherit).

#### Scenario: lint Check 6 passes for the new manifest
- **WHEN** `node scripts/lint.mjs` is run after the manifest is added
- **THEN** Check 6 passes schema validation for the new `migrations/<version>.yaml`: `version`, `summary`, `automated`, and `manual` fields are all present; no `automated` step uses a disallowed action; no `automated` step has a non-openspec path.
