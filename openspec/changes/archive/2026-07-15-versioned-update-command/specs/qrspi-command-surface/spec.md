# Spec — qrspi-command-surface

> Delta against `openspec/specs/qrspi-command-surface/spec.md` for the
> `versioned-update-command` change. Adds `/qrspi:update` as a new shipped
> hybrid command with main-loop residence, documents its README and
> sync-copilot parity requirements, and records the `/qrspi:init` marker-write
> step addition.

## ADDED Requirements

### Requirement: /qrspi:update is a shipped main-loop command
The system MUST ship `claude/commands/update.md` as a consumer-facing command
accessible via `/qrspi:update`. The command file MUST NOT carry an `agent:`
frontmatter field paired with a non-builtin agent, because the hybrid walk
requires `AskUserQuestion` for per-manual-step gates, and that tool is
main-loop-only. The command MUST be listed in `README.md` (in the helpers line
or an equivalent "Updating your repo" note), and every `/qrspi:update` reference
in the README MUST resolve to `claude/commands/update.md`, satisfying lint
Check 4 (both directions).

#### Scenario: update command is loadable by consumers
- **WHEN** a consumer installs the kit and runs `/qrspi:update`
- **THEN** the command is available (registered via the plugin) and its body
  runs in the main-loop orchestrator.

#### Scenario: lint Check 4 passes with the new command
- **WHEN** `node scripts/lint.mjs` is run after `claude/commands/update.md` is
  added and `README.md` is updated
- **THEN** Check 4 reports no undocumented command file and no stale README
  entry for `/qrspi:update`.

#### Scenario: lint Check 5 does not flag the update command
- **WHEN** `node scripts/lint.mjs` Check 5 (`checkGateExecutor`) evaluates
  `claude/commands/update.md`
- **THEN** Check 5 does not flag a violation, because the command carries no
  non-builtin `agent:` field (the AskUserQuestion call is legitimately on the
  main loop).

### Requirement: sync-copilot regenerates a Copilot prompt for /qrspi:update
The system MUST ensure that `node sync-copilot.mjs` produces
`copilot/prompts/qrspi-update.prompt.md` from `claude/commands/update.md`,
applying all standard rewrite rules (`$ARGUMENTS` → `${input}`, path rewrites,
etc.). The generated file MUST be committed in the same change as the source
`update.md` so that the drift CI job remains green.

#### Scenario: sync produces qrspi-update prompt
- **WHEN** `node sync-copilot.mjs` is run after `claude/commands/update.md` is
  added
- **THEN** `copilot/prompts/qrspi-update.prompt.md` is generated and its
  content reflects the standard rewrite rules applied to `update.md`.

#### Scenario: drift check passes after the change
- **WHEN** `node sync-copilot.mjs --check` is run on the committed state
- **THEN** the drift check exits 0 (no difference between committed `copilot/`
  and generated output).

### Requirement: /qrspi:init writes the version marker as part of initialization
The system MUST update `claude/commands/init.md` so that the initialization flow
includes a step that writes `openspec/.qrspi-version` with the bare SemVer
string of the installed kit version. This step MUST execute after the
`openspec/config.yaml` sentinel write and MUST be included in the same
`git add openspec/` commit so that the marker is committed alongside the rest
of the `openspec/` skeleton.

#### Scenario: init writes the marker in the openspec/ commit
- **WHEN** a user runs `/qrspi:init` on a fresh repo
- **THEN** `openspec/.qrspi-version` is created with the current kit version,
  and it is staged and committed together with `openspec/config.yaml` in the
  same commit.

#### Scenario: re-running init on an already-initialized repo
- **WHEN** a user runs `/qrspi:init` on a repo that already has
  `openspec/config.yaml`
- **THEN** the init flow follows its existing "already initialized" path; the
  marker handling in that path is a stage-I implementation decision (the design
  leaves this open per D1's "re-init" note).
