# Contributing to the QRSPI kit

## Quick orientation

- **Source of truth for Claude:** `claude/` (agents, commands, skills)
- **Source of truth for Copilot:** `copilot/` -- generated, never hand-edited
- **Generator:** `sync-copilot.mjs` (Node.js ES module, no build step)
- **Kit version authority:** `plugin.json` `version` field

Never edit files under `copilot/` directly. The entire tree is wiped and
rebuilt by the generator. Any manual edit there is lost on the next sync run.

---

## Semver discipline (0.x pre-1.0 convention)

The kit follows the 0.x convention. Version 1.0.0 is deferred until the kit
is declared stable.

| Change type | Version component | Example |
|-------------|-------------------|---------|
| Breaking change (e.g. generator interface, removed command) | **minor** | `0.2.0` -> `0.3.0` |
| New feature (new command, new skill, new CI gate) | **minor** | `0.2.0` -> `0.3.0` |
| Bug fix, prompt-text edit, documentation-only change | **patch** | `0.2.0` -> `0.2.1` |

The `plugin.json` `version` field is the single source of truth. No separate
`VERSION` file or `openspecVersion` key exists.

---

## Sync workflow

When you edit anything under `claude/agents/`, `claude/commands/`, or
`claude/skills/`:

1. Make your changes in the `claude/` source files.
2. Run the generator to rebuild `copilot/`:

   ```
   node sync-copilot.mjs
   ```

3. Verify no uncommitted drift remains:

   ```
   node sync-copilot.mjs --check
   ```

4. Commit **both** the `claude/` source changes and the regenerated `copilot/`
   files in the same commit. Never split them across separate commits.

The CI drift job (`node sync-copilot.mjs --check`) enforces this on every PR.

---

## Version-bump checklist

When bumping `plugin.json` `version`:

- [ ] Decide the correct component (see semver table above).
- [ ] Update `plugin.json` `version`.
- [ ] Update `CHANGELOG.md`: move items from `## [Unreleased]` into the new
  version section, add the release date.
- [ ] **Pin-coupling rule:** if the OpenSpec CLI pin is also changing (e.g.
  `@fission-ai/openspec@1.4.1` -> a new version), the `plugin.json` version
  MUST bump in the same commit -- minor if the CLI minor version moved, patch
  if only the CLI patch version moved. Conversely, a `plugin.json` bump does
  NOT require an OpenSpec pin reassessment.
- [ ] Run `node scripts/lint.mjs` and confirm exit 0 (pin-agreement check will
  catch any occurrence that disagrees after the pin change).
- [ ] Run `node sync-copilot.mjs --check` and confirm exit 0.

### Pin-coupling rule in detail

The OpenSpec CLI pin appears in several hand-maintained locations (CI workflow,
`claude/commands/init.md`, skill files, README). When the pin changes, every
occurrence must be updated to the new value. The lint gate (`node scripts/lint.mjs`)
asserts that all hand-maintained occurrences agree -- it does NOT assert a fixed
version string, so any consistent value passes. This means:

- Change ALL occurrences together in one commit.
- The CI lint job will catch any straggler.

---

## Lint / drift / validate gates

Three CI gates run on every PR:

| Gate | Command | What it checks |
|------|---------|---------------|
| Drift | `node sync-copilot.mjs --check` | `copilot/` matches what the generator would produce from `claude/` |
| Lint | `node scripts/lint.mjs` | Pin agreement, frontmatter validity, heading alignment |
| Validate | `npx --yes @fission-ai/openspec@1.4.1 validate example-greeting` | Reference example spec files are well-formed |

Run all three locally before pushing:

```
node sync-copilot.mjs --check
node scripts/lint.mjs
npx --yes @fission-ai/openspec@1.4.1 validate example-greeting
```

---

## Convention-only boundary: command stub wording

The eight QRSPI stage commands (`claude/commands/questions.md`,
`research.md`, `design.md`, `structure.md`, `plan.md`, `worktree.md`,
`implement.md`, `pr.md`) each contain a thin inline stub with the artifact
filename, commit-message template, and next-stage command reference. The
**invariant choreography** (commit step, next-stage handoff, Glob-based
precondition, backlog-atomicity reminder) lives in
`claude/skills/qrspi-workflow/SKILL.md`.

The stub wording is deliberately minimal and is **not lint-checked** for
exact phrasing. Contributors may rephrase the stub text without triggering a
CI failure. If you find that the stub for a stage is misleading or incomplete,
update it and mention the change in the PR description -- no special process
required.

---

## CLAUDE.md key rules (summary for human contributors)

`CLAUDE.md` is Claude Code-specific and is the authoritative source. The
following rules from it apply equally to human contributors:

- **Never hand-edit `copilot/`.** Always edit `claude/` and run the generator.
- **No shell-injection in command/skill files.** Do not use an exclamation mark
  followed by a backtick-delimited shell expression in any `.md` file under
  `claude/` or `.claude/`. The permission checker parses these statically and
  rejects bash redirects, breaking file load on all platforms. Use the Glob
  tool reference pattern instead.
- **No exclamation mark directly before a backtick in prose.** Even in
  documentation, the same scanner fires. When describing that syntax, keep the
  exclamation mark in its own code span or spell it out in words.
