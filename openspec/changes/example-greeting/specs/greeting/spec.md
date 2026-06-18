# Spec -- greeting

> New capability introduced by the `example-greeting` change. A slash command that
> prints a context-aware welcome banner showing the contributor's git user name,
> current branch, kit version, and active change IDs.

## ADDED Requirements

### Requirement: Greeting command emits context banner
The system MUST provide a `/qrspi:greeting` slash command that, when invoked,
emits a welcome banner containing the contributor's git user name (from
`git config user.name`), the current branch (from `git rev-parse --abbrev-ref
HEAD`), the kit version from `plugin.json`, and the list of active QRSPI
change IDs found in `openspec/changes/` (excluding `archive/`).

#### Scenario: greeting in a normal repository session
- **WHEN** a contributor runs `/qrspi:greeting` inside a git repository with
  `plugin.json` present and at least one active change under `openspec/changes/`
- **THEN** the command emits one line each for user name, branch, kit version,
  and active change IDs, in that order

#### Scenario: greeting outside a git repository
- **WHEN** a contributor runs `/qrspi:greeting` in a directory that is not a
  git repository
- **THEN** the command prints whatever context is available (e.g. kit version
  from `plugin.json` if present) and notes "git context unavailable" rather
  than exiting non-zero

### Requirement: Copilot prompt generated from command source
The system MUST generate `copilot/prompts/qrspi-greeting.prompt.md` from
`claude/commands/greeting.md` via the `node sync-copilot.mjs` pipeline,
such that the Copilot and Claude command surfaces remain in sync with no
manual authoring of the Copilot artifact.

#### Scenario: sync run after adding greeting command
- **WHEN** a contributor runs `node sync-copilot.mjs` after adding
  `claude/commands/greeting.md`
- **THEN** `copilot/prompts/qrspi-greeting.prompt.md` appears in the output
  tree and `node sync-copilot.mjs --check` exits 0
