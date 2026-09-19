# Spec — kit-governance

> Delta against `openspec/specs/kit-governance/spec.md` for the
> `bump-openspec-pin` change.
> Clarifies the pin-coupling rule: the `plugin.json` version bump lands at
> the release-cut commit that ships the pin change, not the feature-work
> commit that lands the pin edit — aligning the requirement with CLAUDE.md's
> "don't bump the version in feature work" rule (D9).

## MODIFIED Requirements

### Requirement: OpenSpec pin bump requires a plugin version bump
The system MUST document and enforce (via `CONTRIBUTING.md`) the coupling
rule: an OpenSpec CLI pin bump (e.g. `1.4.1` → `1.9.0`) is a kit change and
MUST be accompanied by a `plugin.json` version bump — minor if the CLI minor
version moved, patch if only the CLI patch version moved — applied at the
**release** that ships the pin change (the release-cut commit produced by
cutting a tagged release), not in the feature-work commit that lands the pin
edit itself, per the kit's "don't bump the version in feature work" rule. The
inverse is not true: a plugin version bump does not force an OpenSpec pin
reassessment.

#### Scenario: OpenSpec minor pin bump
- **WHEN** the OpenSpec CLI pin is updated from `1.4.1` to `1.9.0` in a
  feature change
- **THEN** the feature-work commit that lands the pin edit does NOT touch
  `plugin.json` `version`; the minor-position bump is applied later, in the
  release-cut commit that ships the release containing this pin change.

#### Scenario: plugin bump without pin change
- **WHEN** a release bumps `plugin.json` from `0.13.0` to `0.14.0` for
  unrelated reasons
- **THEN** the OpenSpec pin is not required to change.

#### Scenario: CONTRIBUTING.md's "same commit" language means the release commit
- **WHEN** a contributor reads `CONTRIBUTING.md`'s pin-coupling rule in its
  release checklist context
- **THEN** the rule reads as applying to the release-cut commit that ships
  the pin change, not to any feature PR's commit — resolving the prior
  ambiguity where the rule appeared to require every feature PR touching the
  pin to also bump `plugin.json`.
