---
description: Cut and publish a tag-based release of the QRSPI kit. Bumps plugin.json, rolls CHANGELOG [Unreleased] into a dated version section, re-checks lint + drift, commits, and — after an explicit human gate — tags and pushes so release.yml publishes the GitHub Release. Local repo dev-tooling, not shipped in the plugin.
agent: build
---

Cut a **tag-based release** of the QRSPI kit. Merging to `main` ships nothing;
consumers install from tags, and pushing a `vX.Y.Z` tag is the only thing that
publishes. This command prepares the release and gates the publish behind an
explicit human yes.

Optional argument — the target version `X.Y.Z`: $ARGUMENTS
(If omitted, the version is proposed from the `## [Unreleased]` contents and
confirmed with you.)

**Load skill `qrspi-release` first** — it carries the authoritative checklist
(preconditions, the CHANGELOG roll, the release.yml contract, the tag-push gate,
and the external marketplace step). Follow it exactly.

Summary of what happens (the skill is the source of truth):

1. **Verify preconditions** — on `main`, clean tree, level with `origin/main`;
   `## [Unreleased]` is non-empty; the target version is valid and forward; the
   `vX.Y.Z` tag does not already exist; `node scripts/lint.mjs` and
   `node sync-copilot.mjs --check` both exit 0. Stop on any failure.
2. **Determine the version** — from the argument, or propose minor/patch from the
   `[Unreleased]` contents and confirm via **AskUserQuestion** (semver is your
   call).
3. **Bump** `.claude-plugin/plugin.json` `version`.
4. **Roll the CHANGELOG** — move `## [Unreleased]` into `## [X.Y.Z] - <today>`,
   leaving a fresh `## [Unreleased]` with the `_No unreleased changes._`
   placeholder.
5. **Re-check** lint + drift (both exit 0), then **commit** the two files:

   ```
   git add .claude-plugin/plugin.json CHANGELOG.md
   git commit -m "release: vX.Y.Z"
   ```

6. **Tag-and-publish gate** — show the release notes release.yml will publish,
   then ask via **AskUserQuestion** before pushing. On yes:

   ```
   git push origin main
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

   and report the `release.yml` run. On no: stop and print the commands.
7. **Remind** to bump the qrspi `source` ref to `vX.Y.Z` in
   `lotea-be/ai-agent-marketplace` — the only step that reaches installed users,
   and the only one outside this repo.

Do not shell out to peek at the repo during parsing — to list existing tags or
inspect state, run the git/node commands as ordinary Bash steps per the skill (in
fenced blocks), never as an exclamation-prefixed shell-injection line.
