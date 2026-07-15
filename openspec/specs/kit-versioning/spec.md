# kit-versioning Specification

## Purpose
TBD - created by archiving change versioned-update-command. Update Purpose after archive.
## Requirements
### Requirement: Consuming repo carries a one-line version marker
The system MUST write a file `openspec/.qrspi-version` into every
QRSPI-initialized consuming repo. The file SHALL contain exactly one line: the
bare SemVer string matching `.claude-plugin/plugin.json` `version` at the time of
writing (e.g. `0.6.0`), with no `v` prefix, no YAML key, and no trailing syntax.

#### Scenario: fresh init writes the marker
- **WHEN** a user runs `/qrspi:init` on a repo that has not previously been
  initialized
- **THEN** `openspec/.qrspi-version` is created containing the bare SemVer
  string of the installed kit version, and it is committed in the same `git add
  openspec/` commit as `openspec/config.yaml`.

#### Scenario: marker is a plain one-line file
- **WHEN** `openspec/.qrspi-version` is read
- **THEN** its contents are exactly a bare SemVer string (e.g. `0.6.0`) with no
  prefix, no key-value syntax, and no trailing non-newline characters.

### Requirement: Kit ships a migrations directory with one YAML file per release
The system MUST provide a `migrations/` directory in the kit source tree. For
every released version from the version shipping this feature onward, a file
`migrations/<version>.yaml` MUST exist. The file MUST conform to the schema:
a `version` field (bare SemVer), a `summary` field (one-line human description),
an `automated` list (zero or more steps the command applies itself), and a
`manual` list (zero or more steps surfaced for human confirmation). A release
with no consumer impact MUST ship a stub with empty `automated` and `manual`
lists and a `summary` stating no consumer action is required. No `automated`
step's `action` field SHALL use any value other than `edit-file`. Every
`automated` step's `path` field MUST be `openspec/`-scoped (relative path
starting with `openspec/`).

#### Scenario: release stub for a no-action version
- **WHEN** `migrations/0.6.0.yaml` is read for a release that has no consumer
  impact
- **THEN** the file contains `version: 0.6.0`, a `summary` field, an empty
  `automated: []` list, and an empty `manual: []` list.

#### Scenario: automated step uses only edit-file action
- **WHEN** any `migrations/*.yaml` file is read
- **THEN** every item in its `automated` list has `action: edit-file` and no
  other `action` value appears.

#### Scenario: automated step paths are openspec-scoped
- **WHEN** any `migrations/*.yaml` automated step is inspected
- **THEN** the `path` field starts with `openspec/` and does not reference any
  path outside the consuming repo's `openspec/` directory.

#### Scenario: manual step for a shell-requiring action
- **WHEN** a migration requires the consumer to run a shell command
- **THEN** that step appears in the `manual` list with a `description` field
  explaining what the human must do, and it does NOT appear in `automated`.

### Requirement: /qrspi:update command ships as a hybrid main-loop command
The system MUST ship `claude/commands/update.md` as a QRSPI command accessible
to consumers as `/qrspi:update`. The command MUST run on the main-loop
orchestrator (no `agent:` frontmatter pairing with a non-builtin agent) so that
`AskUserQuestion` gates are reachable for manual steps. The command MUST accept
an optional `<target-version>` argument as a portable fallback when auto-detect
is unavailable. The command MUST auto-apply each `automated` step from the
manifest without asking the human, and MUST gate each `manual` step with an
`AskUserQuestion` confirmation before advancing.

#### Scenario: command runs with no argument (auto-detect path)
- **WHEN** a user invokes `/qrspi:update` with no argument
- **THEN** the command attempts to determine the target version automatically
  (e.g. from the installed plugin's shipped files) and proceeds with the walk,
  falling back to asking the human if auto-detect is unavailable.

#### Scenario: command runs with explicit target version
- **WHEN** a user invokes `/qrspi:update 0.7.0`
- **THEN** the command treats `0.7.0` as the target version and walks all
  `migrations/<v>.yaml` files for versions `A < v ≤ 0.7.0` where `A` is the
  version in `openspec/.qrspi-version`.

#### Scenario: automated step applied without gate
- **WHEN** the walk reaches a version whose manifest has a non-empty `automated`
  list
- **THEN** the command applies each `automated` step (e.g. an `edit-file` edit)
  without presenting an `AskUserQuestion` prompt for that step.

#### Scenario: manual step gated by AskUserQuestion
- **WHEN** the walk reaches a version whose manifest has a non-empty `manual`
  list
- **THEN** the command presents each manual step's `description` via
  `AskUserQuestion` and waits for the human to confirm completion before
  advancing.

### Requirement: /qrspi:update walk is step-by-step in ascending SemVer order
The system MUST walk each intervening version's manifest entry in sequence for a
consumer moving from marker version `A` to target version `B`. The walk MUST
apply every `migrations/<v>.yaml` for which `A < v ≤ B`, in strictly ascending
SemVer order. It MUST NOT merge all intervening steps into a single flat
checklist.

#### Scenario: consumer is two versions behind
- **WHEN** `openspec/.qrspi-version` contains `0.6.0` and the target is `0.8.0`
- **THEN** the command processes `migrations/0.7.0.yaml` in full before
  processing `migrations/0.8.0.yaml`, preserving intermediate ordering.

#### Scenario: single version gap
- **WHEN** `openspec/.qrspi-version` contains `0.6.0` and the target is `0.7.0`
- **THEN** only `migrations/0.7.0.yaml` is processed; no other manifest files
  are read.

### Requirement: /qrspi:update bumps the marker after a successful walk
The system MUST update `openspec/.qrspi-version` to the target version string
after all automated and manually-confirmed migration steps complete successfully.
The command MUST stage the marker bump (and any auto-edited files) but MUST NOT
commit them automatically. It MUST print a ready-to-run commit command for the
human to execute.

#### Scenario: marker bumped and staged, not auto-committed
- **WHEN** `/qrspi:update` completes the full walk without error
- **THEN** `openspec/.qrspi-version` contains the new target version string,
  all changed files are staged (but not committed), and the terminal displays a
  `git commit` command the human can copy-paste to finalize.

#### Scenario: human commits after reviewing staged changes
- **WHEN** the human runs the printed commit command
- **THEN** the marker file and any auto-edited `openspec/` files are committed
  together in one commit on the current branch.

### Requirement: /qrspi:update handles edge cases with guarded defaults
The system MUST implement the following edge-case behaviours for `/qrspi:update`:

- **Already up to date:** if the marker version equals the target version, the
  command MUST report "already up to date", walk no migration steps, and exit.
- **No marker present:** if `openspec/.qrspi-version` does not exist, the command
  MUST detect this, explain to the human that no marker exists, and offer via
  `AskUserQuestion` to initialize the marker to the current target version
  (treating the repo as already up to date) or to supply the actual current
  version manually. It MUST NOT silently assume version `0.0.0` or replay all
  available manifest entries.
- **Downgrade (marker > target):** if the marker version is greater than the
  target version, the command MUST hard-stop and warn the human. It MUST NOT
  silently skip the condition or attempt reverse migrations.

#### Scenario: already up to date
- **WHEN** `openspec/.qrspi-version` contains `0.7.0` and the target is also
  `0.7.0`
- **THEN** the command prints "already up to date" and exits without modifying
  any file.

#### Scenario: no marker — offer to initialize
- **WHEN** `openspec/.qrspi-version` does not exist
- **THEN** the command presents an `AskUserQuestion` offering to write the marker
  at the target version (skip the walk) or to enter the actual current version
  before walking.

#### Scenario: downgrade hard-stop
- **WHEN** `openspec/.qrspi-version` contains `0.8.0` and the target is `0.7.0`
- **THEN** the command halts immediately with a clear warning that the recorded
  version is ahead of the target, and takes no further action.

### Requirement: Kit ships a backing skill for the update walk logic
The system MUST provide `claude/skills/qrspi-update/SKILL.md` as a shipped skill
(in `claude/skills/`, not `.claude/skills/`) so that consumers have access to the
manifest schema contract, the SemVer-ordered walk algorithm, the
automated/manual dispatch rules, and the edge-case handling. The `update.md`
command MUST delegate manifest-reading and walk logic to this skill by loading it.

#### Scenario: skill is available to consumers
- **WHEN** a consumer's Claude Code agent processes `/qrspi:update`
- **THEN** the `qrspi-update` skill is loadable from the plugin's installed
  `claude/skills/qrspi-update/SKILL.md` and provides the walk algorithm and
  schema contract.

#### Scenario: skill is not a dev-tooling-only file
- **WHEN** the kit's `claude/skills/` directory is inspected
- **THEN** `qrspi-update/SKILL.md` is present and NOT located under `.claude/skills/`.

