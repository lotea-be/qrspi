# Research — example-greeting

> Stage R of QRSPI. Generated 2026-06-18.
> Read-only investigation of the current codebase.

## Relevant files

### Entry point: claude/commands/

`claude/commands/` contains one `.md` file per slash command. Each file has
YAML frontmatter (`description:`) and a markdown body that the agent loads
when the command is invoked. The sync generator (`sync-copilot.mjs`) converts
each command file into a corresponding `copilot/prompts/<name>.prompt.md`.

- There is currently no `greeting.md` in `claude/commands/`.
- The closest analogue is `claude/commands/status.md`, which also reads
  ambient context (branch, change folder) without writing any files.

### Kit version source of truth: plugin.json

```json
{ "name": "...", "version": "0.2.0", ... }
```

The greeting can read this file with `fs.readFile` or inline a reference to
`plugin.json` in its command body; no dedicated version file exists.

### Active change discovery: openspec/changes/

The `openspec/changes/` directory contains one subfolder per in-progress change
(excluding `archive/`). A simple `readdir` filter on `changes/` (excluding
`archive`) gives the list of active change IDs. The greeting command can surface
the first active ID, or all of them.

### Git context

The `/qrspi:status` command already demonstrates the pattern for reading git
context: it instructs the agent to run `git rev-parse --abbrev-ref HEAD` for
the branch and `git config user.name` for the contributor name. No dedicated
helper exists; each command shells out inline.

### sync-copilot.mjs: command-mapping table

The generator maps command source files to Copilot prompts. The relevant table
entry (simplified) is:

```js
commandHints.set('greeting', { agent: 'implementer', ... });
```

A new `greeting.md` command will be picked up automatically by the generator
as long as it has a `description:` frontmatter field.

## Gaps / watch-items

- No existing `claude/skills/greeting/` skill; the command body must be
  self-contained or load an existing skill.
- The Copilot prompt for status (`copilot/prompts/qrspi-status.prompt.md`)
  shows the expected output shape for ambient-context commands -- a useful
  reference for the new prompt.
- `sync-copilot.mjs` has no hard-coded list of commands; any `.md` file placed
  in `claude/commands/` is picked up. A new `greeting.md` requires no generator
  changes unless a non-default agent or hint is needed.
