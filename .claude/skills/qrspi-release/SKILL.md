---
name: qrspi-release
description: Cut and publish a tag-based release of the QRSPI kit. Bumps plugin.json, rolls CHANGELOG [Unreleased] into a dated version section, re-checks lint + drift, commits, and (after an explicit human gate) tags and pushes so release.yml publishes the GitHub Release. Local repo dev-tooling — not shipped in the plugin.
---

# Cutting a QRSPI release

This is the mechanism behind `/qrspi-release`. It automates the **"Releases
(tag-based)"** and **"Version-bump checklist"** procedures in
[`CONTRIBUTING.md`](../../../CONTRIBUTING.md) — read that section for the
authoritative policy; this skill encodes its steps.

**Release model (why the gate matters).** Merging to `main` ships nothing.
Consumers install from **tags**: the `lotea-be/ai-agent-marketplace` entry pins
the qrspi `source` to a release tag. Pushing a `vX.Y.Z` tag triggers
[`release.yml`](../../../.github/workflows/release.yml), which re-runs lint +
drift, asserts the tag matches `.claude-plugin/plugin.json` `version` **and**
that a matching `## [X.Y.Z]` CHANGELOG section exists, then publishes the GitHub
Release from those notes. A mismatch fails the job — tag, version, and CHANGELOG
can never silently disagree. **Pushing the tag is the only outward-facing,
publish-to-consumers step; it is irreversible-ish (a published release + a tag
others may pull). Never push it without an explicit human yes.**

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
6. **Gates are green.** `node scripts/lint.mjs` exits 0 and
   `node sync-copilot.mjs --check` exits 0 (release.yml re-runs both — catching it
   here avoids a failed publish).

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
Run `node scripts/lint.mjs` and `node sync-copilot.mjs --check` again (both must
exit 0 after the edits). If either fails, stop and surface it — do not commit.

### 5. Show the human what will publish, then commit
Print (a) the release commit's diff (`plugin.json` + `CHANGELOG.md`), and (b) the
exact notes release.yml will extract (everything under `## [VER]`). Then commit on
`main` with the conventional release message:

```
git add .claude-plugin/plugin.json CHANGELOG.md
git commit -m "release: vVER"
```

(Stage only those two explicit paths — never `git add -A`.)

### 6. Tag-and-push gate (mandatory human confirmation)
Use **AskUserQuestion**: *"Publish vVER? This pushes `main`, tags `vVER`, and
triggers release.yml to publish the GitHub Release (ships to consumers once the
marketplace ref is bumped)."* Choices: **"Yes — tag and publish"** /
**"No — I'll push the tag myself"**.

- **Yes:** push the commit, then the tag:
  ```
  git push origin main
  git tag vVER
  git push origin vVER
  ```
  Then watch/report the `release.yml` run (`gh run list --workflow release.yml`
  / `gh run watch`) so the human sees the publish succeed or fails fast.
- **No:** stop after the commit and print the exact three commands above for the
  human to run when ready. Do not push the tag.

### 7. Remind about the external marketplace step
The release does not reach installed users until the qrspi entry's `source` ref
is bumped to `vVER` in the **separate** `lotea-be/ai-agent-marketplace` repo. This
skill cannot do that (different repo) — print the reminder as the final line.

## Notes
- **Local dev-tooling.** This command/skill lives under `.claude/` and is **not**
  part of the shipped plugin — no `copilot/` mirror, no plugin README entry, no
  CHANGELOG entry for itself.
- **Markdown safety (CLAUDE.md).** In this file and the command, never place an
  exclamation mark immediately before a backticked span, and do not use
  shell-injection command lines; the release commands run as ordinary Bash task
  steps, shown in fenced blocks.
- **If lint/drift is red at precondition 5,** the fix is a normal change through
  the usual flow (or `/qrspi-sync-copilot` for drift) landed on `main` first —
  the release command does not paper over a red gate.
