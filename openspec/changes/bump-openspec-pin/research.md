# Research — bump-openspec-pin

> Stage R of QRSPI. Generated 2026-08-14.
> Ticket is hidden from this stage by design.

## Areas investigated
- OpenSpec version-pin sites: every hand-maintained occurrence of the `@fission-ai/openspec` version across the repo
- Lint-gate surface — Check 1 (`checkPinAgreement`) in `scripts/lint.mjs`: full control flow, and the conventions the other 23 checks follow
- Slash-command surface — `claude/commands/init.md`: CLI invocations, config content, version-specific prose
- Skill surface — `claude/skills/openspec-workflow/SKILL.md` and `.claude/skills/qrspi-stack/SKILL.md` dependency-policy block
- Migration manifest surface — `migrations/*.yaml` schema and the `qrspi-update` skill's apply-phase contract
- OpenSpec CLI dependency contract — every `validate`/`init`/`update` invocation and what base specs say about it
- Delta-spec grammar and validation surface — `openspec-templates/spec-delta.template.md` and base `spec.md` structure
- Doc conventions for multi-part changes — `CHANGELOG.md` `## [Unreleased]` shape and README pin/command enumeration

## File map

### OpenSpec version-pin sites (all agree on `1.4.1` as of this survey)

| File | Line(s) | Exact text | Form | Shipped to consumers? |
|---|---|---|---|---|
| `.github/workflows/ci.yml` | 31 | `run: npx --yes @fission-ai/openspec@1.4.1 validate --all` | literal semver | repo-local (CI workflow) |
| `README.md` | 221 | `` `npx @fission-ai/openspec@1.4.1` `` (Requirements section) | literal semver | repo-local doc |
| `README.md` | 300 | `This runs `npx @fission-ai/openspec@1.4.1 init --tools none`...` | literal semver | repo-local doc |
| `README.md` | 356-372 | "### Updating the pinned OpenSpec version" section — enumerates the hand-maintained sites (`init.md`, README, `openspec/config.yaml`) and states Check 1's config-coupling requirement | literal semver (`currently 1.4.1`) + version-agnostic prose (`@fission-ai/openspec@<version>`) | repo-local doc |
| `README.md` | 361, 363, 366 | prose using the `@fission-ai/openspec@<version>` placeholder form | version-agnostic prose | repo-local doc |
| `CONTRIBUTING.md` | 104-108 | "Pin-coupling rule" — `plugin.json` version MUST bump in the same commit as a pin change (minor if CLI minor moved, patch if only CLI patch moved); a `plugin.json` bump does NOT itself require a pin reassessment | literal semver reference (`@fission-ai/openspec@1.4.1 -> a new version`) | repo-local doc |
| `CONTRIBUTING.md` | 132, 138 | Lint/validate gates table + local-run snippet, `npx --yes @fission-ai/openspec@1.4.1 validate --all` | literal semver | repo-local doc |
| `claude/commands/init.md` | 22 | `Run \`npx @fission-ai/openspec@1.4.1 update\` (not \`init\`)...` | literal semver | **shipped** (plugin command body) |
| `claude/commands/init.md` | 28 | `...run \`npx @fission-ai/openspec@1.4.1 init --tools none\` to repair...` | literal semver | **shipped** |
| `claude/commands/init.md` | 41 | `Run \`npx @fission-ai/openspec@1.4.1 init --tools none\`.` | literal semver | **shipped** |
| `claude/commands/init.md` | 47 | prose: "As of CLI v1.4.1, `--tools none` forces non-interactive mode..." — a version-specific factual claim about CLI behaviour | literal semver, behavioural claim | **shipped** |
| `claude/commands/init.md` | 81 | inline YAML snippet the command writes: `openspec_version: 1.4.1` (inside the `openspec/config.yaml` content block) | literal semver | **shipped** (written into every newly-initialized consumer repo) |
| `claude/commands/init.md` | 84 | prose: "Keep `openspec_version` in sync with the pinned version run in step b." | version-agnostic prose | **shipped** |
| `openspec/config.yaml` | 9 | `openspec_version: 1.4.1` | literal semver | repo-local (this repo's own sentinel; Check 1 also requires every consumer's `openspec/config.yaml` to carry this key) |
| `claude/skills/openspec-workflow/SKILL.md` | 48-49 | `` npx @fission-ai/openspec@latest init `` / `` npx @fission-ai/openspec@latest update `` | **`@latest`**, not a pinned version | **shipped** (kit skill) |
| `.claude/skills/qrspi-stack/SKILL.md` | 80 | "Dev tooling that requires npm (e.g., OpenSpec CLI) is invoked via `npx` with a pinned version (`@fission-ai/openspec@<version>`)" | version-agnostic prose | repo-local (project-scoped stack cheatsheet) |
| `.claude/skills/qrspi-dogfood/SKILL.md` | 56 | `` npx @fission-ai/openspec@latest init `` (build a throwaway fixture) | `@latest` | repo-local dev-tooling (not shipped) |
| `openspec/specs/reference-example/spec.md` | 32 | `openspec validate` CI job scenario: "runs `npx @fission-ai/openspec@<pin> validate --all`" | version-agnostic prose (`<pin>` placeholder) | repo-local base spec |
| `openspec/specs/ci-quality-gates/spec.md` | 154 | Requirement body: "The CI `validate` job MUST run `npx @fission-ai/openspec@<pin> validate --all`" | version-agnostic prose (`<pin>` placeholder) | repo-local base spec |
| `CHANGELOG.md` | 249, 900 | historical narrative mentions (a "KEEP" verdict for the CLI dependency; a `validate` example in an archived entry) | literal semver in prose, historical | repo-local doc (not a live pin site — historical record) |

`scripts/lint.mjs` line 284 documents the `pinRe` pattern in a comment (not itself a pin occurrence subject to the check, since Check 1's own source file is not scanned for the pin pattern — see below).

Note: `claude/skills/openspec-workflow/SKILL.md` and `.claude/skills/qrspi-dogfood/SKILL.md` use `@latest` rather than a literal pinned semver — these two are visibly different in form from the other shipped/repo-local sites, which all use a literal `1.4.1`.

### Lint-gate surface — Check 1 (`checkPinAgreement`), `scripts/lint.mjs` lines 280-490

**Control flow:**
- `pinRe = /(?:@fission-ai\/openspec@|openspec_version:\s*)(\d+\.\d+\.\d+)/g` — matches either an `@fission-ai/openspec@X.Y.Z` npx invocation OR an `openspec_version: X.Y.Z` YAML key, capturing the semver. It does **not** match `@latest` (no digits) or the `<pin>`/`<version>` placeholder forms — those are invisible to Check 1 by construction.
- `scanFile(file)`:
  - Skips any file under `isUnderChanges(file)` (the whole `openspec/changes/` subtree — "change artifacts merely CITE the pin as historical examples, they don't maintain it").
  - `isInGeneratedSkill(file)`: true when the file lives under a `claude/skills/<name>/` directory whose name starts with `openspec-` (i.e. CLI-generated skill dirs, not `openspec-workflow` which starts with `openspec-` too — this scoping is by directory-name prefix, so `openspec-workflow` IS included in `generatedBySkills`). Note: `generatedBySkills` is built by scanning subdirectories of `claude/skills/` whose name starts with `openspec-`; `openspec-workflow` matches this prefix, so `claude/skills/openspec-workflow/SKILL.md` is treated as a "generated skill" for the purpose of skipping `generatedBy:` lines only (not for skipping pin occurrences generally — its `@latest` lines are not pin occurrences anyway since `@latest` doesn't match `pinRe`).
  - Within a generated-skill file, lines matching `/generatedBy:/i` are skipped entirely (not scanned for the pin pattern).
  - Every other line is scanned with a fresh copy of `pinRe` (global) and every match is pushed to `found[]` as `{version, file, lineNum, text}`.
- `scanDir(dir)`: recurses into `claude/`, `openspec/` (skipping the `openspec/changes/` subtree explicitly by path comparison, in addition to the `isUnderChanges` per-file check), and `openspec-templates/`, plus a non-recursive scan of root-level files (README.md, plugin.json, etc.) with extensions `.md .yaml .yml .json .mjs .ps1 .sh`. `scripts/lint.mjs` itself is NOT included in any scanned directory (root-level scan is non-recursive over top-level files only, and `scripts/` is never walked) — so the `pinRe` pattern quoted in its own comment (line 284) is never a scanned occurrence.
- **Aggregation**: `found.length === 0` → error "No OpenSpec version pin occurrences found -- cannot assert agreement" (unreachable in the real repo today since 12+ occurrences exist).
- `versions = [...new Set(found.map(f => f.version))]`.
  - **`versions.length === 1` branch** (current real-repo state): prints `OK: N pin occurrence(s) all agree on vX.Y.Z`, then runs the **config-coupling assertion**:
    - Defines `extractConfigVersion(rawText)` (a narrower regex reused for the config file specifically: `/openspec_version:\s*(\d+\.\d+\.\d+)/`).
    - Runs **three in-memory self-test fixtures** before the real assertion:
      - Fixture A ("absent key"): text with no `openspec_version:` line — asserts extractor returns `null`; pushes a `SELF-TEST FAILED` error if not.
      - Fixture B ("wrong value"): text with `openspec_version: <a version != agreedPin>` — asserts extractor returns a non-null value that is NOT `agreedPin`.
      - Fixture C ("agrees"): text with `openspec_version: <agreedPin>` — asserts extractor returns exactly `agreedPin`.
    - **Real assertion** reads `openspec/config.yaml`:
      - File missing entirely → error, "add `openspec_version: <agreedPin>`" (config-absent leg, failure leg **(a)**).
      - File present but `extractConfigVersion` returns `null` (key absent) → error, "missing the `openspec_version:` key" (also failure leg **(a)**).
      - File present, key present, but `configVersion !== agreedPin` → error, "has `openspec_version: X` but the agreed pin is vY" (failure leg **(b)**, mismatch).
      - `configVersion === agreedPin` → no error (happy path; this is the current real-repo state: `1.4.1 === 1.4.1`).
  - **`versions.length > 1` branch** (multi-version, currently unreached): pushes `[pin] Version pin mismatch -- found N distinct versions: ...` plus one line per individual `found` occurrence (`file:lineNum (vVersion): text`).

**Conventions the other 23 checks follow** (observed from the file's header comment block and `main()`, lines 1-186 and 4130-4231):
- Each check is a numbered, header-documented block (`// ---- Check N: NAME ----`) with a multi-line comment above the function explaining scope, sub-legs, and any self-tests, mirrored in the file's top-of-file numbered index (lines 5-183).
- Each check is an `async function checkXxx(errors)` (or returns a violation count directly, e.g. `checkFrontmatter`/`checkGateExecutor`/`checkReadmeCoverage`) that pushes formatted strings (`[tag] message`) onto a shared `errors` array passed by reference — no per-check return-value aggregation contract beyond that array (some also return an integer violation count, inconsistently, though `main()` never uses the return value for anything but console noise).
- Each check prints `process.stdout.write` progress lines, ending with an `OK: ...` summary line on a clean pass, mirroring Check 1's `OK: N pin occurrence(s) all agree on vX.Y.Z` pattern.
- Checks with a synthetic/adversarial edge case carry an **inline self-test** using in-memory fixtures run before or alongside the real assertion (Check 1's three fixtures; Check 14, 15, 17, 21, 22, 23, 24 all document similar inline self-tests per the header comment).
- `main()` (lines 4132-4226) registers every check in strict numeric order via sequential `process.stdout.write('\nCheck N: ...\n')` + `await checkXxx(errors)` pairs, ending with a pass/fail summary and `process.exit(0|1)`.
- New/modified checks are documented in the top-of-file numbered comment block (lines 5-183) in the same prose style: what it scans, what it flags, any self-test, and its registration position relative to neighboring checks ("Registered after Check N").

### Slash-command surface — `claude/commands/init.md`

- Frontmatter: `agent: build` (no stage subagent; runs directly on the main loop).
- **OpenSpec CLI invocations issued**:
  - Step 1 (already initialized): `npx @fission-ai/openspec@1.4.1 update` (refresh agent guidance); if the skeleton is corrupted, also `npx @fission-ai/openspec@1.4.1 init --tools none` (repair).
  - Step 2b (not initialized): `npx --version` (availability probe) then `npx @fission-ai/openspec@1.4.1 init --tools none` (scaffold).
- **`openspec/config.yaml` content it writes** (step b-bis, verbatim in the command body):
  ```yaml
  schema: spec-driven
  openspec_version: 1.4.1
  ```
  Written because, per the command's own prose, `--tools none` forces non-interactive mode in which the CLI prints "Config: skipped" and writes no config file — this is a version-specific behavioural claim attributed to "CLI v1.4.1" (line 47).
- Also writes `openspec/.qrspi-version` (bare SemVer from `plugin.json`, unrelated to the OpenSpec CLI pin) and seeds `openspec/backlog.md` from an inline sentinel-delimited copy (`<!-- backlog-template:begin/end -->`) kept byte-identical to `openspec-templates/backlog.template.md` by lint Check 3's `driftGuard` branch.
- Step 3 unconditionally strips any project-scope `opsx`/`openspec-*` Claude tooling the CLI may have generated.
- Step 4 commits `openspec/` only (never `git add -A`); step 5 offers `/qrspi:stack` bootstrap.

### Skill surface

**`claude/skills/openspec-workflow/SKILL.md`:**
- "CLI quick reference" section (lines 43-55) shows two invocations using `@latest`, not the pinned version: `npx @fission-ai/openspec@latest init` and `npx @fission-ai/openspec@latest update`.
- "Folder layout" block (lines 18-38) documents:
  ```
  openspec/
    config.yaml
    templates/                # canonical artifact templates (see "Canonical artifact shapes")
    changes/
      <change-id>/...
      archive/...
    specs/
  ```
  This layout claims a `templates/` directory under `openspec/`. On-disk, `openspec/` in this repo contains no `templates/` subdirectory — the canonical templates live only at the repo root under `openspec-templates/` (confirmed by the repo layout in the stack cheatsheet and by direct listing: `openspec/` contains `config.yaml`, `backlog.md`, `changes/`, `specs/`, `.qrspi-version`, no `templates/`). The skill's own later section ("Canonical artifact shapes", lines 70-96) explicitly contradicts the folder-layout block's `templates/` line: it states templates are "**not** copied into consuming repos: `/qrspi:init` no longer seeds a per-repo `openspec/templates/`" and that they "travel bundled with the plugin" as `openspec-templates/`.
- Maps each QRSPI stage to its OpenSpec artifact and which agent writes it (table, lines 57-68); documents `openspec validate <id> --strict` as required (plain `validate` skips the MUST/SHALL check; CI runs strict `--all`, so a non-strict local pass can still fail CI) — lines 84-88.

**`.claude/skills/qrspi-stack/SKILL.md`** — dependency-policy block ("## Dependency policy", lines ~78-81):
```
- No npm runtime dependencies allowed; the lint script uses Node.js built-ins only
- Dev tooling that requires npm (e.g., OpenSpec CLI) is invoked via `npx` with a
  pinned version (`@fission-ai/openspec@<version>`)
```
This is the sole normative statement (version-agnostic prose) that the OpenSpec CLI must always be invoked pinned, not via `@latest` — in tension with the two `@latest` occurrences found in `openspec-workflow/SKILL.md` and `qrspi-dogfood/SKILL.md` (see "Notable discrepancies").

### Migration manifest surface

`migrations/` contains 10 files: `0.6.0.yaml` through `0.14.0.yaml` (one per minor release from the 0.6.0 migration-mechanism floor onward: 0.6.0, 0.7.0, 0.8.0, 0.9.0, 0.10.0, 0.10.1, 0.11.0, 0.12.0, 0.13.0, 0.14.0).

- **Schema** (per `parseManifestYaml` in `scripts/lint.mjs` and the `kit-versioning` base spec): top-level `version` (bare SemVer, must equal filename stem), `summary` (string or `>`-block scalar), `automated` (list, possibly empty), `manual` (list, possibly empty).
- **`edit-file` action fields**: `action` (must be literally `edit-file` — the only allowed value), `path` (must start with `openspec/`), `description`. Optional idempotency fields: `skip_if_contains` (non-empty string; content-idempotent replay guard — skip the edit if the target file already contains this marker) and `anchor_missing` (only valid literal value: `warn-and-skip` — fault-tolerant degradation: if the documented edit anchor is absent, warn and skip rather than hard-stop).
- **Path-scoping guard**: every `automated[].path` must start with `openspec/` — this is enforced both by lint Check 6 (schema check, `scripts/lint.mjs`) and is the boundary that makes migrations "consumer-repo-local edits only" (never edits `.claude/` or kit-shipped files).
- **Released vs. unreleased relative to `plugin.json`**: `.claude-plugin/plugin.json` `version` is currently `0.13.0`. `migrations/0.14.0.yaml` exists but has no matching `## [0.14.0]` section in `CHANGELOG.md` — `CHANGELOG.md`'s current top section is `## [Unreleased]`, whose content (git-host-and-remote-awareness, researcher-surface-gate) matches `0.14.0.yaml`'s `summary` field verbatim in subject matter. So `0.14.0.yaml` is the **not-yet-released** next-version manifest, staged ahead of the `plugin.json` bump that would formally cut 0.14.0; all 9 other manifests (0.6.0-0.13.0) correspond 1:1 to released `## [X.Y.Z]` CHANGELOG sections.
- **`qrspi-update` skill's apply-phase contract** (`claude/skills/qrspi-update/SKILL.md`): walks `migrations/<v>.yaml` for every `A < v <= B` in ascending SemVer order (A = the repo's `openspec/.qrspi-version` marker, B = target). The apply phase (section "Apply phase", ~line 177 onward) has a "4.1 -- Automated `edit-file` dispatcher" that requires `action === 'edit-file'` exactly, dispatches on one of several documented edit-pattern sub-fields, evaluates `skip_if_contains` first (whole-file substring check) before applying an edit, and on a missing anchor either hard-stops (default) or warns-and-skips when `anchor_missing: warn-and-skip` is set. Manual steps are gated via human confirmation (not auto-applied). After all steps, the marker `openspec/.qrspi-version` is bumped and the changes staged, ending with a printed ready-to-run `git commit` command.

### OpenSpec CLI dependency contract

Every `validate` / `init` / `update` invocation in the repo, and where it runs:
- **CI**: `.github/workflows/ci.yml` — two parallel jobs on `ubuntu-latest`: `lint` (`node scripts/lint.mjs`) and `validate` (`npx --yes @fission-ai/openspec@1.4.1 validate --all`, strict-mode-by-default via `--all`).
- **`/qrspi:init` command body** (`claude/commands/init.md`): `init --tools none` (scaffold) and `update` (refresh agent guidance on repos already initialized) — see Slash-command surface above.
- **Docs**: `CONTRIBUTING.md` lint/validate gates table (lines 125-139) documents the same two local commands (`node scripts/lint.mjs`, `npx --yes @fission-ai/openspec@1.4.1 validate --all`) as the pre-push checklist; `README.md` "### Updating the pinned OpenSpec version" documents the bump procedure; `openspec-workflow/SKILL.md` documents `init`/`update` via `@latest` (see discrepancy above) and separately states `openspec validate <id> --strict` is the authoring-time equivalent of the CI strict gate.
- **Base specs mentioning the pin, `validate`, or the CLI**:
  - `openspec/specs/ci-quality-gates/spec.md`, Requirement "Validate job runs openspec validate on the reference example" (line 153): "The CI `validate` job MUST run `npx @fission-ai/openspec@<pin> validate --all` (strict) on `ubuntu-latest`, validating every base spec under `openspec/specs/` and every active change under `openspec/changes/` — including the hand-authored reference example — and failing the job if any item reports an error." Also documents that `--all` enforces the strict MUST/SHALL first-line rule that non-strict `openspec validate <id>` skips.
  - `openspec/specs/reference-example/spec.md`, Requirement "CI validates the full spec surface" (line 25): "CI MUST run `openspec validate --all`, validating every spec under `openspec/specs/` together with any active change, and MUST exit 0. CI MUST NOT depend on a fictional change being kept artificially active to have something to validate." Scenario (line 31-34) references `npx @fission-ai/openspec@<pin> validate --all` as the concrete CI command.
  - `openspec/specs/kit-versioning/spec.md`: governs the `openspec/.qrspi-version` marker and the `migrations/` directory schema (SemVer filename, required `version`/`summary`/`automated`/`manual` keys) — this is the marker/migration mechanism, a sibling concern to the CLI pin but not the pin itself.
  - Other base specs with a "pin"/`openspec@`/CLI mention (per grep): `compute-selection`, `kit-governance`, `backlog-schema`, `implementer-variants`, `qrspi-command-surface`, `repo-surface`, `followup-triage`, `researcher-surface-gating`, `research-template` — these hits are incidental (e.g. mentions of "pinned model id" for `model:` frontmatter, or "pin" used in an unrelated sense); none of these define a normative requirement about the OpenSpec CLI version pin beyond `ci-quality-gates` and `reference-example` above.

### Delta-spec grammar and validation surface

- `openspec-templates/spec-delta.template.md` is "the single source of truth for how the QRSPI Structure stage writes `openspec/changes/<id>/specs/<capability>/spec.md`" — both architect modes (S and V... actually only S writes specs) point here; format is "what `openspec validate <id>` enforces and what `openspec-sync-specs` parses at archive time."
  - Two top-level shapes: "New capability" (all requirements under `## ADDED Requirements`) and "Delta against an existing capability" (only `## ADDED`/`## MODIFIED`/`## REMOVED Requirements` sections, never a full copy of the base).
  - "Format rules (enforced by `openspec validate <id> --strict`)" section, delimited by `<!-- must-leads:begin/end -->` sentinel comments (guarded byte-for-byte against `claude/agents/architect.md` by lint Check 21):
    - Section headers MUST be exactly `## ADDED Requirements` / `## MODIFIED Requirements` / `## REMOVED Requirements` — no invented sections (`## Purpose`, `## Out of scope`, etc.) belong in a spec file.
    - A `## MODIFIED`/`## REMOVED` requirement title MUST match an existing base-spec requirement header verbatim (no prefix).
    - `## MODIFIED` requirements carry the full new requirement text, not a diff.
    - **The first line of every requirement body MUST contain `MUST` or `SHALL`** (checked only under `--strict`; this exact rule is also independently guarded by lint Check 20, `checkRequirementFirstLineModal`, which scans both delta specs under `openspec/changes/*/specs/**/spec.md` and base specs under `openspec/specs/**/spec.md`).
    - Every `### Requirement:` under `## ADDED`/`## MODIFIED` MUST have at least one `#### Scenario:` block using `- **WHEN** / **THEN**` bullets.
- **Base `openspec/specs/**/spec.md` structure**: 23 capability directories under `openspec/specs/` (archive-workflow, backlog-schema, backlog-writer, ci-quality-gates, compute-selection, context-budget-gate, followup-triage, git-host-workflow, implementer-variants, kit-context-budget, kit-governance, kit-versioning, qrspi-command-surface, qrspi-pr-reconciliation, qrspi-read-contracts, qrspi-run-mode, qrspi-stack, reference-example, repo-surface, researcher-surface-gating, research-template, session-version-check, spec-syncer) — one `spec.md` file each, totalling 6,499 lines across all 23 files. Each observed base `spec.md` follows the heading convention `# <capability> Specification` → `## Purpose` (one-paragraph, sometimes `TBD - created by archiving change <id>...`) → `## Requirements` → `### Requirement: <name>` → body (first line MUST/SHALL) → `#### Scenario: <name>` → `- **WHEN**` / `- **THEN**` bullets. No `## ADDED`/`## MODIFIED`/`## REMOVED` operation headers appear in base specs — those are delta-only.

### Doc conventions for multi-part changes

- `CHANGELOG.md` structure: header block states versioning policy (0.x pre-1.0 semver: breaking/features bump minor, fixes/docs bump patch; `plugin.json` `version` is the single source of truth), then a `## [Unreleased]` section as the always-first section, followed by dated `## [X.Y.Z] - YYYY-MM-DD` sections in reverse-chronological order.
- The current `## [Unreleased]` section (lines 15-40+) is structured as `### Added` with **top-level bold-lead bullets naming the change slug in parens** (e.g. `**Researcher surface-gate (\`researcher-apply-surface-gate\`).**` / `**Git host and remote awareness (\`git-host-and-remote-awareness\`).**`), each followed by one or more paragraphs of prose describing the mechanism, and — for the git-host entry — nested sub-bullets (`  - Vendor resolution stays cheatsheet-override-first...`) itemizing sub-facets of that one multi-part change. This is the observed shape for recording a multi-facet change: one top-level bullet per change-id, prose body, optional nested sub-bullets for distinct facets within that change.
- README sections that enumerate the pin: "## Requirements" (line 220-222, prose), "### Updating the pinned OpenSpec version" (lines 356-372, the authoritative bump-procedure section naming the three hand-maintained locations: `claude/commands/init.md`, `README.md` itself, `openspec/config.yaml` — this list does **not** mention `.github/workflows/ci.yml`, `CONTRIBUTING.md`, or the skill files, even though Check 1's actual scan does cover `claude/`, `openspec/`, `openspec-templates/`, and root-level files including `CONTRIBUTING.md`; `.github/` is not among Check 1's scanned directories at all — see "Notable discrepancies").
- README sections that enumerate the command surface: repo-layout tree (`claude/commands/` bullet), "## Install" (`/qrspi:*` commands), "## Consuming in another repo" step 2 (the full `/qrspi:questions ... /qrspi:archive` stage-command listing), and "### CI lint checks (`node scripts/lint.mjs`)" (lines 374+, prose walkthrough of selected checks including a reference to "24 checks... plus sub-checks 2b, 10b").

## Notable discrepancies

- `claude/skills/openspec-workflow/SKILL.md` (lines 48-49) and `.claude/skills/qrspi-dogfood/SKILL.md` (line 56) invoke the OpenSpec CLI via `@latest`, not the pinned `1.4.1` used everywhere else — this diverges from `.claude/skills/qrspi-stack/SKILL.md`'s stated dependency policy ("Dev tooling that requires npm (e.g., OpenSpec CLI) is invoked via `npx` with a pinned version"). Lint Check 1's `pinRe` does not match `@latest` (no digit sequence after `@`), so these two occurrences are structurally invisible to the pin-agreement check regardless of what the pin value is.
- `claude/skills/openspec-workflow/SKILL.md`'s "Folder layout" block (lines 18-38) documents `openspec/templates/` as part of the on-disk layout, while the same file's later "Canonical artifact shapes" section (lines 90-96) and `claude/commands/init.md` step "d" (lines 206-212) both state templates are no longer copied per-repo — the folder-layout block's `templates/` line does not match either the on-disk reality of this repo (no `openspec/templates/` directory exists) or the file's own later prose.
- README's "### Updating the pinned OpenSpec version" section (lines 358-364) lists only three hand-maintained locations (`claude/commands/init.md`, `README.md`, `openspec/config.yaml`) as needing updates on a pin bump, but the actual set of files carrying a literal pinned semver (per the pin-sites table above) is larger — `.github/workflows/ci.yml` and `CONTRIBUTING.md` also carry literal `1.4.1` occurrences that Check 1 scans and would flag on disagreement, yet neither is named in this README section's enumeration.
- Lint Check 1's directory scan (`claude`, `openspec`, `openspec-templates`, plus non-recursive root files) does not include `.github/` at all — the `.github/workflows/ci.yml` occurrence is picked up only because the root-level, non-recursive file scan does NOT cover `.github/` either (it is a subdirectory, and `scanDir` is only invoked on the three named source directories). Re-verify at implementation time whether `.github/workflows/ci.yml`'s pin occurrence is actually included in the `found[]` aggregation the ground truth's "12 pin occurrences" count reflects, since the directory-walk code as read does not appear to traverse `.github/`.

## Implicit contracts and conventions

- Every hand-maintained pin occurrence is expected to agree on a single semver value; lint Check 1 enforces agreement (not a fixed value), so any consistent bump is lint-clean as long as every occurrence — including `openspec/config.yaml`'s `openspec_version:` key — is updated together in one commit (this is spelled out explicitly in `CONTRIBUTING.md`'s "Pin-coupling rule" and README's "Updating the pinned OpenSpec version" section).
- `plugin.json` `version` bumps and the OpenSpec CLI pin bump are coupled in one direction only (per `CONTRIBUTING.md`): changing the pin requires a `plugin.json` bump in the same commit (minor-for-minor, patch-for-patch), but a `plugin.json` bump does not require a pin reassessment.
- The migration-manifest floor is fixed at `0.6.0` (a hard-coded constant in `scripts/lint.mjs`, not derived from `migrations/` contents, specifically to prevent a fail-open if the floor manifest were deleted); every `CHANGELOG.md` `## [X.Y.Z]` section at or above that floor must have a matching `migrations/<version>.yaml`.
- `automated[].path` in every migration manifest step must start with `openspec/` — migrations only ever touch consumer-repo OpenSpec state, never kit-shipped files (`.claude/`, `claude/`).
- Delta specs never copy the base spec wholesale; `## MODIFIED` requirements replace the requirement wholesale (all scenarios must be re-listed or they are deleted on sync) — enforced by the spec-delta template's format rules and consumed by `openspec-sync-specs`/`spec-syncer` at archive time.
- Every requirement's first body line must contain `MUST` or `SHALL` — enforced both by `openspec validate <id> --strict` (CLI-side) and independently by lint Check 20 (kit-side), a doubled guard so authoring-time and CI-time checks agree.
- New/renamed slash commands must be reflected in README's command-coverage list; this is mechanically enforced (Check 4) in both directions (every shipped command documented, every documented command resolves).

## Open gaps

- [x] Whether `.github/workflows/ci.yml`'s pin occurrence is actually reachable by Check 1's directory walk as currently written (see "Notable discrepancies" — the scan appears scoped to `claude/`, `openspec/`, `openspec-templates/`, and non-recursive root files only, with no `.github/` traversal), given the stated ground truth of "12 pin occurrence(s) all agree." **Resolved — see "Orchestrator-verified gap resolutions" below: it is NOT reachable.**
- [ ] The exact 1.4.1 → target-version CLI changelog content (grammar/`validate` behavioural changes across that version range) was not researched here — out of scope for a ticket-blind codebase inventory; would need to be sourced from the upstream OpenSpec CLI's own release notes, not this repo.
- [x] Whether any other files outside the directories Check 1 currently scans (e.g. `.github/`, `scripts/`) carry an undetected pin occurrence that would not surface in Check 1's aggregate count. **Resolved — see below.**

## Orchestrator-verified gap resolutions

Verified empirically on 2026-08-14 by enumerating pin-regex matches per file and
reconciling against Check 1's own reported aggregate. Factual only.

**Check 1's 12 occurrences decompose exactly as:**

| Count | File | Scanned via |
|-------|------|-------------|
| 4 | `claude/commands/init.md` | `scanDir(claude/)` |
| 3 | `CONTRIBUTING.md` | root-level non-recursive sweep |
| 2 | `README.md` | root-level non-recursive sweep |
| 1 | `openspec/config.yaml` | `scanDir(openspec/)` |
| 1 | `openspec/backlog.md` | `scanDir(openspec/)` |
| 1 | `CHANGELOG.md` | root-level non-recursive sweep |
| **12** | | matches Check 1's reported total exactly |

**Gap 1 — resolved: `.github/` is not traversed.** `.github/workflows/ci.yml:31`
(`npx --yes @fission-ai/openspec@1.4.1 validate --all`) carries a real pin
occurrence that is **not** among the 12. The scan loop iterates only `claude/`,
`openspec/`, and `openspec-templates/`, plus a non-recursive root-file sweep;
`.github/` appears in neither. The CI pin is therefore unguarded by Check 1 today,
and the arithmetic above confirms it rather than merely inferring it from the code.

**Gap 3 — resolved: two scanned files are *historical/citational*, not
hand-maintained pin sites.** Beyond the CI file, the sweep also picks up:

- `CHANGELOG.md:900` — `` - `validate` -- `npx --yes @fission-ai/openspec@1.4.1 validate example-greeting` `` — inside a **dated, already-released** changelog section. This is a historical record of what a past release did, not a live pin declaration.
- `openspec/backlog.md:53` — prose inside the `bump-openspec-pin` row describing the current pin state. Editable prose, not an invocation.

`openspec/changes/**` is excluded by `isUnderChanges`, so the ~80 further
occurrences across archived change artifacts do not participate.

**Consequence for the design stage (factual, not a recommendation):** Check 1
asserts that *all* found occurrences agree on a single version. Changing the live
pin sites to any version `V ≠ 1.4.1` while `CHANGELOG.md:900` still reads `1.4.1`
produces two distinct versions in `found`, so Check 1 takes its multi-version
branch and fails with `[pin] Version pin mismatch -- found 2 distinct versions`.
The same holds for `openspec/backlog.md:53`. Whether a historical changelog entry
should be rewritten, excluded from the scan, or handled another way is a design
decision, not a research finding — but the mechanical consequence is certain.
