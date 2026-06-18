# Proposal — kit-quality-hardening

> Stage S of QRSPI. Generated 2026-06-18.

## Why

At v0.1.0 the QRSPI kit's core invariant — "`copilot/` is generated from
`claude/`, never hand-edited, always in sync" — is enforced only by convention.
The `-Check` mode of the PowerShell generator exits 0 even on drift, the repo
has no CI, the OpenSpec version pin is scattered across ~11 hand-maintained
locations with a README that mis-describes them, three structural blocks are
duplicated verbatim across 8 stage commands and 7 agents, governance docs do
not exist, and a redundant opsx command surface bloats the kit with 5 commands
and 3 orphaned skills that no QRSPI stage actually calls. This change converts
"correctness depends on a human remembering" into mechanical guarantees and
pays down the structural duplication across five focused capability areas (D1–D10,
OQ1–OQ6 all approved).

## What Changes

- **New:** Node.js generator (`sync-copilot.mjs`) replacing the PowerShell
  script + bash wrapper, with correct exit codes, deleted-file detection,
  source guard, temp-dir cleanup, and missing-SKILL warnings.
- **New:** GitHub Actions CI workflow (`ubuntu-latest`, parallel jobs: drift /
  lint / validate) that mechanically enforces the sync invariant and pin
  agreement on every PR and post-merge push.
- **New:** Frontmatter/name lint, OpenSpec pin-drift lint, and heading-level
  skeleton check in CI.
- **New:** `CONTRIBUTING.md` and `CHANGELOG.md` documenting semver discipline,
  the version↔pin coupling rule, and the sync workflow.
- **New:** Hand-authored reference example change under `openspec/changes/archive/`
  serving as both end-to-end documentation and the `openspec validate` CI fixture.
- **Modified:** `qrspi-workflow` skill — canonical commit/handoff/precondition
  procedure moved here; stage commands keep thin inline stubs.
- **Modified:** Agent frontmatter — `Edit` removed from `qrspi-researcher`,
  `qrspi-questioner`, `qrspi-planner` (least-privilege tightening).
- **Removed:** 5 opsx commands (`opsx/{propose,explore,apply,archive,sync}.md`)
  and 3 orphaned OpenSpec-generated skills (`openspec-{propose,explore,apply-change}`).
- **Modified:** Install scripts (`install.ps1` / `install.sh`) — self-heal sweep
  deletes the 8 now-stale Copilot files from prior installs.
- **Modified:** `plugin.json` version bumped to 0.2.0 (MINOR: opsx removal +
  generator interface change).

## Capabilities

### New Capabilities

- `copilot-sync`: The kit's `claude/ → copilot/` generator, rewritten as
  `sync-copilot.mjs` (Node.js). Includes correct `--check` exit codes, union-of-trees
  deleted-file detection, source guard, temp-dir try/finally cleanup, and a
  missing-SKILL warning that exits non-zero — creates
  `specs/copilot-sync/spec.md`.

- `ci-quality-gates`: A GitHub Actions workflow (`ubuntu-latest`, parallel jobs)
  enforcing drift (`node sync-copilot.mjs --check`), a lint job (pin-drift
  assertion, frontmatter/name validity, heading-level skeleton check), and a
  validate job (`npx @fission-ai/openspec@<pin> validate` on the reference
  example) — creates `specs/ci-quality-gates/spec.md`.

- `kit-governance`: `CONTRIBUTING.md` (semver discipline, sync workflow,
  version-bump checklist, pin-coupling rule) and `CHANGELOG.md`
  (Keep-a-Changelog format); `plugin.json version` as the sole kit-version
  authority (0.x convention, this change → 0.2.0) — creates
  `specs/kit-governance/spec.md`.

- `reference-example`: A hand-authored minimal fictional change archived under
  `openspec/changes/archive/YYYY-MM-DD-add-greeting/` with the full artifact
  set, valid for `openspec validate` — creates `specs/reference-example/spec.md`.

### Modified Capabilities

- `qrspi-command-surface`: The kit's command/agent/skill surface. Modifications:
  canonical choreography DRY'd into `qrspi-workflow` skill (D4); skill-load
  preamble lint-enforced (D5); `Edit` removed from researcher/questioner/planner
  frontmatter (D10); 5 opsx commands + 3 orphaned skills deleted (D9); generator
  opsx tables cleaned; install-script self-heal sweep added (D9) — needs a
  delta spec under `specs/qrspi-command-surface/spec.md`.

## Impact

- Migrations: no data store; no migrations.
- Breaking changes: yes — the generator interface changes from
  `./sync-copilot.sh [--check]` (PowerShell) to `node sync-copilot.mjs [--check]`
  (Node.js); the 5 `/opsx:*` commands and 3 `openspec-*` orphaned skills are
  removed from the kit surface.
- Phases: single PR, 5 ordered slices (A → E); see Vertical slices preview.
- Affected code / APIs / dependencies: `sync-copilot.ps1` + `sync-copilot.sh`
  (replaced), `install.ps1` / `install.sh` (self-heal sweep added),
  `claude/commands/opsx/*` (deleted), `claude/skills/openspec-{propose,explore,apply-change}/`
  (deleted), agent frontmatter for researcher/questioner/planner (tightened),
  `qrspi-workflow` skill body (choreography added), `plugin.json` (version bump +
  description update), `README.md` (pin claim corrected), `CLAUDE.md` (unchanged).

---

## Out of scope

- Pester/unit tests for generator internals — drift check is the contract (D1).
- Branch protection / `CODEOWNERS` — separate backlog item `repo-branch-protection`.
- Multi-OS CI matrix — single `ubuntu-latest` accepted (OQ6).
- Deprecation notices to downstream opsx consumers — none known (Q40).
- A new `.openspec-version` / `VERSION` file — explicitly rejected (D3, D7).
- Exact patch/minor/major semver mapping for non-pin-related change types beyond
  the 0.x convention — left to human judgment per OQ1.

## Vertical slices preview

- **Slice A — Node generator + drift gate:** Port to `sync-copilot.mjs` (exit-on-drift,
  deleted-file detection, source guard, cleanup, missing-SKILL warning), regenerate
  `copilot/`, add CI drift job. Demoable: `node sync-copilot.mjs --check` exits 1
  on intentional drift, 0 when synced.
- **Slice B — opsx removal, end to end:** Delete 5 opsx commands + 3 orphaned skills,
  clean generator tables, regenerate, add install-script self-heal sweep, update
  prose + `plugin.json`. Demoable: fresh sync produces no opsx artifacts; re-install
  removes stale ones.
- **Slice C — pin lint + frontmatter/name/heading lints:** Add lint CI job, fix
  README false claim + stale path. Demoable: CI fails on an introduced pin mismatch
  or dangling skill reference.
- **Slice D — choreography DRY + tool-grant audit:** Move canonical blocks into
  `qrspi-workflow`, thin command stubs, tighten agent frontmatter, regenerate.
  Demoable: stage commands still drive the full commit/handoff flow.
- **Slice E — reference example + validate gate + governance docs:** Author the
  archived example, wire `openspec validate` in CI, add `CONTRIBUTING.md` and
  `CHANGELOG.md`. Demoable: `openspec validate` passes on the fixture; docs render.

## Risks

- **Generator-port regressions.** A Node rewrite can subtly change the transform
  output, dirtying `copilot/` in ways unrelated to intent. Mitigation: diff the
  Node output against the PowerShell output before committing; the drift gate then
  locks the result.
- **`openspec validate` in CI needs the CLI available.** Mitigation: pin the
  invocation to `npx @fission-ai/openspec@<pin> validate` in the CI YAML (OQ3
  resolution).
- **Pin-lint false positives.** The lint asserts agreement among occurrences, not
  a fixed count; any agreeing occurrence passes. New prose mentions must agree or
  the lint fails — that is the intended behavior.
- **DRY-via-skill reach limit.** Because Claude command files have no runtime
  include, each command still inlines its variable parts (artifact filename, commit
  message, next command). Contributor drift on stub wording is documented in
  `CONTRIBUTING.md` as a known convention-only boundary.
