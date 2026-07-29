---
name: qrspi-stack
description: Stack cheatsheet for qrspi -- languages, runtime versions, frameworks, key libraries, project layout, testing, and coding conventions. This is the QRSPI stack-cheatsheet skill for this repo; load it whenever you need the project's tech stack or conventions.
---

## Languages & runtime

- Markdown (command, agent, skill, and template files -- the primary deliverable)
- Node.js (used for the lint script only; no build output or runtime app)
- No pinned Node version beyond what GitHub Actions provides; any modern LTS works

## Frameworks & key libraries

- No web framework, ORM, or frontend framework
- No npm runtime dependencies; the lint script (`scripts/lint.mjs`) uses Node.js
  built-ins only (`node:fs`, `node:path`, `node:url`)
- Claude Code plugin system: commands under `claude/commands/`, agents under
  `claude/agents/`, kit-shipped skills under `claude/skills/`, project-scoped
  skills under `.claude/skills/`

## Project layout

```
.claude-plugin/plugin.json   -- plugin manifest (name, version, commands, agents, skills paths)
claude/
  commands/                  -- slash commands (/qrspi:* etc.)
  agents/                    -- seven QRSPI stage subagents
  skills/                    -- kit-shipped shared skills (auto-registered via plugin)
.claude/
  skills/                    -- project-scoped skills (not shipped in plugin)
  commands/                  -- project-scoped dev-tooling commands
openspec/                    -- OpenSpec workspace (config, changes, backlog)
openspec-templates/          -- templates for OpenSpec artifacts
scripts/
  lint.mjs                   -- CI quality gate (Checks 1-21)
migrations/                  -- per-version migration manifests
CHANGELOG.md                 -- versioned release notes
```

## Conventions

- All skill/agent/command files carry YAML frontmatter (`name:`, `description:`)
- Agent files additionally carry a `> **Read contract**` banner
- No emoji in command or skill prose unless the user explicitly requests it
- ASCII-only in commit messages and PR text (use `--` for em-dash, `->` for arrows)
- In command/skill markdown, never use shell-injection (exclamation-prefixed
  backtick spans); instruct use of the Glob tool instead
- Changes are tracked in `openspec/changes/<id>/` folders following the QRSPI
  eight-stage workflow

## Testing

- No unit test framework; correctness is verified by the lint script
- Run: `node scripts/lint.mjs` (Checks 1-21; exits 0 on pass, 1 on failure)
- No watch mode; run once per slice to gate a commit

## Build, lint & test commands

- Lint / check: `node scripts/lint.mjs`
- No separate build or compile step; the deliverable is markdown + one `.mjs` file
- No test runner beyond the lint script

## PR & git workflow

- Git host: GitHub
- PR creation: `gh pr create`
- PR status query: `gh pr view <N> --json state`
- Source-branch naming: `features/<id>` (derived from the change id)
- Default target branch: `main`
- Version-bump and release: tag-based only (see `.claude/skills/qrspi-release/`)

## Dependency policy

- No npm runtime dependencies allowed; the lint script uses Node.js built-ins only
- Dev tooling that requires npm (e.g., OpenSpec CLI) is invoked via `npx` with a
  pinned version (`@fission-ai/openspec@<version>`)

## Gotchas / house rules

- Do NOT bump `plugin.json` version in feature work; version changes only at release
- Record all feature changes under `## [Unreleased]` in `CHANGELOG.md`
- Each new `claude/skills/<name>/` directory auto-registers as a kit skill; no
  `plugin.json` edit needed
- `CLAUDE.md` at repo root is the authoritative contributor-guidance file; read it
  before making any change to commands, skills, or agents

## Repo surface

- slash-command
- stage-agent
- skill
- lint-gate
- template
- migration-manifest
