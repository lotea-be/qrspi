---
name: qrspi-marketplace-bump
description: Bump the qrspi plugin's pinned source ref in the separate lotea-be/ai-agent-marketplace repo to a published release tag, as a reviewed PR (never a direct push to the marketplace main). Locates the marketplace repo as a sibling folder, verifies the target tag is actually published, edits only the qrspi entry's ref, and opens a bump PR. Local repo dev-tooling — not shipped in the plugin. Run it after /qrspi-release publishes a tag, to actually deliver the release to installed consumers.
---

# Bumping the qrspi pin in the marketplace

This is the mechanism behind `/qrspi-marketplace-bump`. It performs the **external
marketplace step** that `/qrspi-release` cannot do from inside the kit repo:
pointing the consumer-facing pin at a freshly published release.

**Why this is separate from the release, and why it is a PR.** Merging to the kit's
`main` ships nothing; pushing a `vX.Y.Z` tag publishes a GitHub Release; but neither
reaches *installed* users until the qrspi entry's `source.ref` is bumped to that tag
in the **separate** `lotea-be/ai-agent-marketplace` repo (its
`.claude-plugin/marketplace.json`). That pin is **every consumer's install source**,
so a change to it must be **reviewed** — this skill opens a **PR against the
marketplace `main`, never a direct push**. The PR is the review gate, mirroring the
release skill's "human confirms the outward-facing publish" discipline.

This skill assumes the marketplace repo is checked out **as a sibling folder** next
to the kit repo (a maintainer-machine convention). If it is not present locally, the
skill hard-stops and tells the human where to clone it — it does not invent a path.

## Argument

`$ARGUMENTS` is an **optional** `<version>` — the bare SemVer to pin to (e.g.
`0.12.0`), no `v` prefix. If omitted, the skill defaults to the kit's **current**
`.claude-plugin/plugin.json` `version` (i.e. the version `/qrspi-release` just cut).
Validate the SemVer shape (three dot-separated non-negative integers); stop if it
does not match. Let `VER` be the resolved `X.Y.Z` and `TAG` be `vX.Y.Z`.

## Preconditions (hard-stops — verify all before changing anything)

Stop and surface the problem if any fail; do not proceed:

1. **The release tag is actually published.** `git ls-remote --tags origin <TAG>`
   (run from the kit repo) must return a ref. Pinning consumers to a tag that does
   not exist would break every install. If it is absent, halt and tell the human to
   run `/qrspi-release` (and push the tag) first.
2. **The marketplace repo is present as a sibling.** Locate it with the **Glob**
   tool: search sibling directories of the kit repo root for a
   `*/.claude-plugin/marketplace.json` whose `plugins` array contains a `qrspi`
   entry (read candidates with the Read tool; do not shell out to find it). If none
   is found, hard-stop: tell the human to clone `lotea-be/ai-agent-marketplace` next
   to this repo (e.g. as `../ai-agent-marketplace`) and re-run. If more than one
   candidate matches, list them and ask which via **AskUserQuestion**.
3. **The pin is not already at `TAG`.** Read the qrspi entry's `source.ref`. If it
   already equals `TAG`, report **"already pinned to `TAG`"**, change nothing, and
   stop. If the current ref is a *higher* SemVer than `VER` (a downgrade), hard-stop
   and warn rather than silently regressing consumers.
4. **The marketplace repo is releasable.** In the marketplace repo: the working tree
   is clean (`git status --porcelain` empty); `git fetch origin` then `main` can
   fast-forward to `origin/main` (not diverged). If the tree is dirty or `main` has
   diverged, hard-stop with the specific reason — do not stash or force.

## Steps

### 1. Resolve the target and confirm
Resolve `VER`/`TAG` per the argument rules above. Print the intended change —
`qrspi source.ref: <current-ref> -> <TAG>` and the marketplace repo path — so the
human sees exactly what will be pinned before any edit.

### 2. Branch off the marketplace `main`
In the marketplace repo, check out `main`, fast-forward it to `origin/main`, then
create a fresh bump branch:

```
git checkout main
git pull --ff-only origin main
git checkout -b chore/bump-qrspi-<TAG>
```

Do the bump on a branch, never on `main` directly (precondition rationale above).

### 3. Edit only the qrspi entry's ref
In `<marketplace>/.claude-plugin/marketplace.json`, change **only** the `qrspi`
plugin's `source.ref` value to `<TAG>`. Leave every other plugin entry, and every
other field of the qrspi entry (`repo`, `description`, `category`, `tags`),
untouched. After editing, confirm the file is still valid JSON (parse it — a broken
manifest would break the whole marketplace, not just qrspi).

### 4. Commit on the branch
Stage only the manifest and commit with the conventional message (matching prior
bumps):

```
git add .claude-plugin/marketplace.json
git commit -m "chore: bump qrspi source to <TAG>"
```

Never `git add -A` — stage only the manifest path.

### 5. Push the branch and open the PR
Push the branch and open a PR against the marketplace `main` (this is the review
gate — do **not** merge it here, and do **not** push to `main`):

```
git push -u origin chore/bump-qrspi-<TAG>
gh pr create -R lotea-be/ai-agent-marketplace --base main --head chore/bump-qrspi-<TAG> \
  --title "chore: bump qrspi source to <TAG>" \
  --body "Point the qrspi plugin pin at the published <TAG> release."
```

Print the PR URL. If `gh` is unavailable or unauthenticated, do not fail silently —
surface the error with the fix (`gh auth login`) and print the branch name so the
human can open the PR manually.

### 6. Report and offer cleanup
Relay: the PR URL, the ref change (`<current-ref> -> <TAG>`), and the reminder that
**merging that PR is what delivers the release to installed consumers** — until then
they stay on the old pin. If a prior, already-merged `chore/bump-qrspi-v*` branch
lingers (local or remote), offer to delete it via **AskUserQuestion** (do not delete
unmerged branches).

## Notes
- **Local dev-tooling.** This command/skill lives under `.claude/` and is **not**
  part of the shipped plugin — no plugin README entry, no CHANGELOG entry for itself.
  It complements `/qrspi-release` (which publishes the tag) by performing the
  cross-repo delivery step.
- **PR, never push.** The marketplace pin is every consumer's install source. This
  skill always routes the bump through a reviewable PR and never pushes to the
  marketplace `main`. This is the standing rule from the
  `automate-marketplace-source-bump` backlog idea (open a PR, not a push).
- **Sibling-folder assumption is maintainer-local.** The skill relies on the
  marketplace repo being checked out next to the kit repo; it degrades to a clear
  hard-stop (not a guess) when that is not the case. A fully hands-off, CI-driven
  bump (via `repository_dispatch` from `release.yml`) remains the broader
  `automate-marketplace-source-bump` idea; this skill is the local-run version.
- **Markdown safety (CLAUDE.md).** Never place an exclamation mark immediately
  before a backticked span, and do not use shell-injection command lines; the git /
  gh commands run as ordinary Bash task steps, shown in fenced blocks.
