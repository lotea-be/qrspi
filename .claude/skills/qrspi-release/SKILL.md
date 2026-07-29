---
name: qrspi-release
description: Cut a tag-based release of the QRSPI kit. Bumps plugin.json, rolls CHANGELOG [Unreleased] into a dated version section, re-checks lint, commits, and pushes main — then creates the tag and, after an explicit human confirmation, pushes it to publish (which triggers release.yml). The skill never pushes the tag without that confirmation. Local repo dev-tooling — not shipped in the plugin.
---

# Cutting a QRSPI release

This is the mechanism behind `/qrspi-release`. It automates the **"Releases
(tag-based)"** and **"Version-bump checklist"** procedures in
[`CONTRIBUTING.md`](../../../CONTRIBUTING.md) — read that section for the
authoritative policy; this skill encodes its steps.

**Release model (why the gate matters).** Merging to `main` ships nothing.
Consumers install from **tags**: the `lotea-be/ai-agent-marketplace` entry pins
the qrspi `source` to a release tag. Pushing a `vX.Y.Z` tag triggers
[`release.yml`](../../../.github/workflows/release.yml), which re-runs lint,
asserts the tag matches `.claude-plugin/plugin.json` `version` **and**
that a matching `## [X.Y.Z]` CHANGELOG section exists, then publishes the GitHub
Release from those notes. A mismatch fails the job — tag, version, and CHANGELOG
can never silently disagree. **Pushing the tag is the only outward-facing,
publish-to-consumers step; it is irreversible-ish (a published release + a tag
others may pull). The skill creates the tag and pushes it, but only after an
explicit human confirmation gate (see step 6) — never a silent auto-publish. If
the human declines, the tag stays local and unpushed and the skill prints the
manual push command.**

## Preconditions (hard-stops — verify all before changing anything)

Stop and surface the problem if any fail; do not proceed:

1. **On `main`, clean tree, in sync with origin.** `git rev-parse --abbrev-ref HEAD`
   is `main`; `git status --porcelain` is empty; `git fetch origin` then confirm
   `main` is level with `origin/main` (no unpushed commits, not behind). A release
   is cut from the integration line, not a feature branch.
2. **`[Unreleased]` has real content.** `CHANGELOG.md`'s `## [Unreleased]` section
   is not the empty placeholder. Nothing to release ⇒ stop.
3. **Version is valid and forward.** The target `X.Y.Z` is greater than the
   current `.claude-plugin/plugin.json` `version`, and follows the 0.x semver rule
   (see CONTRIBUTING "Semver discipline"): a new feature (`### Added`, or a
   behaviour-changing `### Changed`) bumps the **minor**; fixes / prose / docs bump
   the **patch**. The human owns this call — see step 1 below.
4. **Migration manifest entry exists.** `migrations/<X.Y.Z>.yaml` must exist in
   the kit repo (use the Read tool to check the path). A stub with empty
   `automated` and `manual` lists is valid — but the file must be present. If it
   is absent, halt and instruct the human to write `migrations/<X.Y.Z>.yaml`
   before re-running. (The lint gate also catches this on every PR, but this
   hard-stop ensures the release skill never commits without the entry.)
5. **Tag is free.** `vX.Y.Z` does not already exist locally
   (`git tag --list vX.Y.Z`) or on origin
   (`git ls-remote --tags origin vX.Y.Z`).
6. **Gates are green.** `node scripts/lint.mjs` exits 0 (release.yml re-runs it —
   catching it here avoids a failed publish).

## Steps

### 1. Determine the version
If the caller passed a version (e.g. `/qrspi-release 0.5.0`), validate it against
precondition 3. If not, inspect `## [Unreleased]`: propose **minor** when it
contains an `### Added` or a behaviour-changing `### Changed`, otherwise **patch**.
Confirm the exact version with the human via **AskUserQuestion** (semver is a
judgement call — never auto-pick silently). Let `VER` be the chosen `X.Y.Z`.

### 2. Bump `plugin.json`
Set `version` to `VER` in [`.claude-plugin/plugin.json`](../../../.claude-plugin/plugin.json).
This is the one place a version bump is allowed — and only when cutting a release.

### 3. Roll the CHANGELOG
In `CHANGELOG.md`: rename the `## [Unreleased]` heading's body into a new
`## [VER] - <today>` section (use today's date, `YYYY-MM-DD`), placed directly
above the previous top release section. Leave a fresh, empty `## [Unreleased]`
above it with the placeholder:

```
## [Unreleased]

_No unreleased changes._
```

Keep the moved bullets verbatim — release.yml publishes exactly the text under
`## [VER]` as the release notes, so what you write here is what consumers read.

### 4. Re-verify the gates
Run `node scripts/lint.mjs` again (it must
exit 0 after the edits). If it fails, stop and surface it — do not commit.

### 5. Show the human what will publish, then commit
Print (a) the release commit's diff (`plugin.json` + `CHANGELOG.md`), and (b) the
exact notes release.yml will extract (everything under `## [VER]`). Then commit on
`main` with the conventional release message:

```
git add .claude-plugin/plugin.json CHANGELOG.md
git commit -m "release: vVER"
```

(Stage only those two explicit paths — never `git add -A`.)

### 6. Push `main`, create the tag, and push it behind a confirmation gate
The tag push is the only outward-facing publish step. The skill performs it, but
**only after an explicit human confirmation** — never silently.

1. **Push the release commit to `main`.** This ships nothing — consumers install
   from tags, so a `main` push merely parks the version bump on the integration
   line and is safe to do automatically:
   ```
   git push origin main
   ```
2. **Create the tag locally.** Annotate it at the release commit:
   ```
   git tag vVER
   ```
3. **Ask the human to confirm the publish, via AskUserQuestion.** This gate is
   mandatory — the tag push is outward-facing and irreversible-ish. Phrase it as,
   e.g. *"Push tag vVER now to publish the GitHub Release?"* with two choices:
   - **Push vVER now — publish the release** → run the push:
     ```
     git push origin vVER
     ```
     This triggers `release.yml`, which re-runs lint, asserts the tag matches
     `plugin.json` `version` and the `## [VER]` CHANGELOG section, then publishes
     the GitHub Release from those notes. Tell the human they can watch it with
     `gh run watch` (or `gh run list --workflow release.yml`).
   - **Don't push yet — I'll publish later** → do **not** push. The tag stays
     local at the release commit. Print the exact command for them to run when
     ready, and note they can delete the local tag with `git tag -d vVER` if they
     want to redo it:
     ```
     git push origin vVER
     ```

   Never push the tag without an affirmative answer to this gate.

### 7. Hand off the external marketplace step
The release does not reach installed users until the qrspi entry's `source` ref
is bumped to `vVER` in the **separate** `lotea-be/ai-agent-marketplace` repo. The
release skill does not edit that repo itself, but a companion command automates the
bump: `/qrspi-marketplace-bump` (skill `qrspi-marketplace-bump`) locates the
marketplace repo as a sibling folder, verifies `vVER` is published, edits only the
qrspi entry's ref, and opens a bump **PR** (never a direct push to the marketplace
`main`).

- **If the tag was pushed in step 6** (the human chose to publish), offer to run the
  bump now via **AskUserQuestion** — "Bump the marketplace pin to `vVER` now?" with
  choices "Run `/qrspi-marketplace-bump vVER` now" / "Not now — I'll do it later". On
  the first choice, re-enter `/qrspi-marketplace-bump vVER` as a slash command on the
  main loop. On the second, print the command for later.
- **If the tag was NOT pushed** (human deferred the publish), do not offer the bump —
  there is no published tag to pin to yet. Print the reminder that both the tag push
  and `/qrspi-marketplace-bump vVER` remain to be done.

## Notes
- **Local dev-tooling.** This command/skill lives under `.claude/` and is **not**
  part of the shipped plugin — no plugin README entry, no
  CHANGELOG entry for itself.
- **Markdown safety (CLAUDE.md).** In this file and the command, never place an
  exclamation mark immediately before a backticked span, and do not use
  shell-injection command lines; the release commands run as ordinary Bash task
  steps, shown in fenced blocks.
- **If lint is red at precondition 5,** the fix is a normal change through
  the usual flow landed on `main` first —
  the release command does not paper over a red gate.
