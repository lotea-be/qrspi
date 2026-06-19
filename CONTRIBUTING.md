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

## Releases (tag-based)

**Merging a PR to `main` does not release anything.** `main` is the integration
line; consumers install from **tags**, and the marketplace
(`lotea-be/ai-agent-marketplace`) pins the qrspi `source` to a release tag — so
`main` can move ahead of the latest release without affecting installed users,
and several merged PRs batch into one release.

**In a feature PR:**

- Do **not** bump `plugin.json` `version`.
- Add your user-facing change under `## [Unreleased]` in `CHANGELOG.md`.

**To cut a release** (deliberate; rolls up everything merged-but-unreleased):

1. Choose the new version per the semver table above.
2. Bump `plugin.json` `version`.
3. Move the `## [Unreleased]` items into a new `## [X.Y.Z] - <date>` section,
   leaving `## [Unreleased]` with its "No unreleased changes" placeholder.
4. Run `node scripts/lint.mjs` and `node sync-copilot.mjs --check` (both exit 0).
5. Commit, then tag and push:

   ```
   git tag vX.Y.Z
   git push origin main --tags
   ```

6. Update the qrspi entry's `source` ref to `vX.Y.Z` in
   `lotea-be/ai-agent-marketplace`, so consumers pick up the release. (This is
   the only step outside this repo, and the only thing that actually ships to
   users.)

The `.github/workflows/release.yml` job runs on the `v*` tag push: it re-runs
lint + drift, asserts the tag matches `plugin.json` `version` and that a
matching `CHANGELOG.md` section exists, then publishes a GitHub Release with
those notes. A mismatch fails the release — so the tag, the `version`, and the
CHANGELOG can never silently disagree.

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
| Validate | `npx --yes @fission-ai/openspec@1.4.1 validate --all` | All `openspec/specs/` and any active change are well-formed |

Run all three locally before pushing:

```
node sync-copilot.mjs --check
node scripts/lint.mjs
npx --yes @fission-ai/openspec@1.4.1 validate --all
```

---

## Convention-only boundary: command stub wording

The eight QRSPI stage commands (`claude/commands/questions.md`,
`research.md`, `design.md`, `structure.md`, `slices.md`, `plan.md`,
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
