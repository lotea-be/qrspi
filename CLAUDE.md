# Claude instructions for the QRSPI kit repo

## Never hand-edit `copilot/`

`copilot/` is **generated**, not authored. The source of truth is `claude/`
(plus `openspec-templates/`). The entire `copilot/` tree is wiped and rebuilt
by [`sync-copilot.mjs`](sync-copilot.mjs), so any manual edit there is lost on
the next sync.

**Do not edit, create, or delete files under `copilot/` directly.** If a change
needs to reach the Copilot artifacts:

1. Make the change in the corresponding `claude/` source file (or, for a
   systematic mapping gap, in `sync-copilot.mjs` itself — never in the output).
2. Propose running the sync script and let the user run/approve it (it is a
   plain Node script — needs only `node`, no `pwsh`):

   ```bash
   node sync-copilot.mjs             # regenerate copilot/ from claude/
   node sync-copilot.mjs --check     # verify zero drift (CI-style check)
   ```

   For a reviewed pass, `/qrspi-sync-copilot` runs the script and improves the
   script when it finds a gap.

If you catch yourself about to use Edit/Write on a path under `copilot/`, stop
and propose the sync instead.

## Don't shell out in slash commands — use Glob

In slash-command files (`claude/commands/*.md` and the dev-tooling
`.claude/commands/*.md`), do not use `!`...`` shell-injection to peek at the
repo (e.g. `ls … 2>/dev/null`). The permission checker statically parses those
and rejects bash redirects on Windows/PowerShell ("Unrecognized redirect
shape"). Instead, instruct the agent to use the **Glob** tool:

> Do not shell out — Glob has no permission requirements and works on every
> platform.

Write "use the Glob tool with pattern `…`" rather than embedding a shell `ls`.

## Don't write `!`-then-backtick literally — even in prose

The same static scanner that powers shell-injection also fires on
**documentation** of the syntax. In any command/skill markdown (`claude/**`,
`.claude/**`), an exclamation mark placed immediately before a backticked span is
read as a real auto-run directive — there is no "this is just an example" escape.
If the span holds a placeholder like `<shell>`, its leading `<` parses as an
input redirect and the whole file fails to load ("Unrecognized redirect shape"),
which is what broke `/qrspi-sync-copilot`.

When you need to *describe* that syntax, never put `!` directly against a
backtick. Split it — keep the `!` in its own code span or spell it out in words
(e.g. "an exclamation-prefixed shell-injection line"), the way this very file and
[`SKILL.md`](.claude/skills/qrspi-sync-copilot/SKILL.md) do.

## Keep the README current

[`README.md`](README.md) is the kit's user-facing surface (install/update flow,
the eight stages + command list, repo layout, requirements incl. the pinned
OpenSpec version, the two-tool mapping, and contributor conventions). It drifts
silently when the source changes and the doc doesn't.

**In the same change that touches any of the following, update the matching
README section** — do not leave it for "later":

- **Commands** — adding, removing, or renaming a `claude/commands/*.md` (the
  stage table and the helpers line). The CI lint (`node scripts/lint.mjs`,
  Check 4) enforces this mechanically: every shipped `/qrspi:*` command must be
  documented and every `/qrspi:*` the README mentions must resolve. A rename
  that misses the README will fail CI.
- **Agents / skills** — renaming or re-scoping them (e.g. the agent-name
  references and the two-tool table). Not lint-covered — this one is on you.
- **Install / update flow** — changes to `install.*`, the plugin/marketplace
  steps, or how users pull updates.
- **The OpenSpec pin** — see "Updating the pinned OpenSpec version" in the
  README; the pin lint (Check 1) asserts the README agrees.
- **Repo layout** — adding/removing a top-level dir shown in the layout tree.

The lint is the mechanical floor (commands + pin); for prose-level drift the
lint can't judge, run `/qrspi-readme-audit` — it diffs the README against the
current source surface and reports stale spots. When unsure whether an edit is
"README-worthy," it is: a stale README is worse than a redundant note.

## Don't bump the version in feature work

`plugin.json` `version` changes **only when cutting a release**, never in a
feature PR. Merging to `main` does **not** release anything — `main` is the
integration line, and consumers install from **tags** (the
`lotea-be/ai-agent-marketplace` entry pins the qrspi `source` to a release tag),
so `main` can sit ahead of the latest release without affecting installed users.

In day-to-day work:

- **Leave `plugin.json` `version` alone.** Do not bump it to "claim" a change.
- **Record the change under `## [Unreleased]`** in [`CHANGELOG.md`](CHANGELOG.md).

A release is a deliberate, tagged event — see **"Releases (tag-based)"** in
[`CONTRIBUTING.md`](CONTRIBUTING.md). Pushing a `vX.Y.Z` tag triggers
[`release.yml`](.github/workflows/release.yml), which re-checks lint + drift,
asserts the tag matches `plugin.json` `version` and a matching `CHANGELOG.md`
section, and publishes the GitHub Release. So a version bump that isn't part of
cutting a release will fail the release job if tagged, and is just noise if not.
