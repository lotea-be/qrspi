# Claude instructions for the QRSPI kit repo

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
input redirect and the whole file fails to load ("Unrecognized redirect shape").

When you need to *describe* that syntax, never put `!` directly against a
backtick. Split it — keep the `!` in its own code span or spell it out in words
(e.g. "an exclamation-prefixed shell-injection line"), the way this very file does.

## Keep the README current

[`README.md`](README.md) is the kit's user-facing surface (install/update flow,
the eight stages + command list, repo layout, requirements incl. the pinned
OpenSpec version, and contributor conventions). It drifts silently when the
source changes and the doc doesn't.

**In the same change that touches any of the following, update the matching
README section** — do not leave it for "later":

- **Commands** — adding, removing, or renaming a `claude/commands/*.md` (the
  stage table and the helpers line). The CI lint (`node scripts/lint.mjs`,
  Check 4) enforces this mechanically: every shipped `/qrspi:*` command must be
  documented and every `/qrspi:*` the README mentions must resolve. A rename
  that misses the README will fail CI.
- **Agents / skills** — renaming or re-scoping them (e.g. the agent-name
  references). Not lint-covered — this one is on you.
- **Install / update flow** — changes to the plugin/marketplace steps, or how
  users pull updates.
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
[`release.yml`](.github/workflows/release.yml), which re-checks lint,
asserts the tag matches `plugin.json` `version` and a matching `CHANGELOG.md`
section, and publishes the GitHub Release. So a version bump that isn't part of
cutting a release will fail the release job if tagged, and is just noise if not.

## Dogfood `(human)` checkpoints with `/qrspi-dogfood` — don't improvise

QRSPI changes carry `(human)` verification tasks in `tasks.md` — runtime
observations no static check can make (an `AskUserQuestion` shows the right
choices, a chain fires once, an up-to-date repo stays silent). When you run the
QRSPI flow on a change **in this repo** and reach un-ticked `(human)` tasks —
the stage-I slice checkpoints or the PR reconciliation gate — **load the
[`qrspi-dogfood`](.claude/skills/qrspi-dogfood/SKILL.md) skill and drive it**
before offering Confirm-done / Leave-for-now. Do not silently fall through to
Leave-for-now, and do not invent your own verification.

Two hard rules the skill encodes:

- A running session loads the **installed release**, not this working tree, so a
  new or edited command body is invisible until you relaunch with
  `claude --plugin-dir /workspaces/git/qrspi`. Never "dogfood" by paraphrasing
  the command prose yourself in the current session — that exercises nothing the
  change actually altered.
- Build throwaway consumer fixtures **outside** this repo (the scratchpad or
  `/tmp`), never inside `openspec/changes/`. Drive one check at a time:
  provision the fixture, hand the human the exact terminal + `/qrspi:*` commands
  for a fresh `--plugin-dir` session, state the expected observation (grounded in
  the change's `design.md` / delta `specs/**`), and ask (AskUserQuestion) whether
  it matched — ticking Confirm-done only on an observed pass.

Only fall back to Leave-for-now when the human genuinely cannot run the session.
