---
name: qrspi-update
description: Drives /qrspi:update. Carries the migration-manifest schema contract, the SemVer-ordered walk algorithm (apply each migrations/<v>.yaml for A < v <= B in ascending order), target-version resolution (auto-detect primary, explicit-arg fallback), the edge-case handling (up-to-date / no-marker / downgrade), and the full hybrid apply phase (edit-file dispatcher, manual step gate, marker bump, stage + print-commit tail). Load this whenever running /qrspi:update.
metadata:
  audience: orchestrator
---

## What this skill drives

`/qrspi:update` brings a QRSPI-initialized consumer repo up to date with a
newer kit version. Every such repo carries a one-line marker
`openspec/.qrspi-version` (written by `/qrspi:init`) holding the bare SemVer of
the kit version it was last aligned with. The kit ships a `migrations/`
directory with one YAML file per release. The update walk reads the marker
(version `A`), resolves the target (version `B`), and processes each
`migrations/<v>.yaml` for `A < v <= B` in ascending SemVer order.

The command runs on the **main loop** (no `agent:` frontmatter) because the
walk gates judgment steps with `AskUserQuestion`, a main-loop-only tool.

> **Scope:** This skill covers the full hybrid walk: the read path (resolve
> target, handle edge cases, build the ordered walk list) PLUS the apply phase
> (automated `edit-file` dispatch, manual step gates, marker bump, stage +
> print-commit tail). The read path and apply phase are documented in separate
> sections; do not fold apply logic into the read path.

## The migration manifest (schema contract)

Each release ships `migrations/<version>.yaml` (kit-side, in the plugin's
installed tree). The schema is a **closed** contract — the walk trusts it:

```yaml
version: 0.6.0          # bare SemVer, MUST match the filename stem
summary: >              # one-line human description of what consumers adapt
  What a consumer on the previous version must do to reach this one.
automated:              # zero or more steps the command applies ITSELF
  - description: Human-readable label shown before/after applying.
    action: edit-file   # CLOSED vocabulary -- `edit-file` is the ONLY value
    path: openspec/...   # MUST be an openspec/-scoped relative path
    # + deterministic edit fields (find/replace, insert, ...) -- see the
    #   "Apply phase" section below for the full sub-field vocabulary.
manual:                 # zero or more steps surfaced for human confirmation
  - description: What the human must review or do (including anything that
      needs a shell command -- shell steps are NEVER automated).
```

Contract facts the walk relies on:

- **`version`** is a bare SemVer (`major.minor.patch`), no `v` prefix, and
  equals the filename stem.
- **`summary`** is always present (even for a no-action stub).
- **`automated`** and **`manual`** are always lists; either may be empty
  (`[]`). A "no consumer action" release is a valid stub: non-empty `summary`,
  empty `automated`, empty `manual`.
- **`action`** for every automated step is `edit-file` and nothing else. Any
  step that needs a shell command is authored as a `manual` step, never
  automated. (The kit's lint enforces this; the walk assumes it holds.)
- Every automated **`path`** is `openspec/`-scoped. The command never edits
  outside the consumer repo's `openspec/` directory.

If a manifest file is malformed against this contract, stop and report it
rather than guessing — a malformed manifest would corrupt the walk. (The kit's
lint gate is meant to prevent this from ever shipping, but be defensive.)

## Resolving the target version

Read the target with two strategies, in this priority order:

### 1. Explicit argument (guaranteed-portable FALLBACK)

If `/qrspi:update <target-version>` was invoked with an argument, that bare
SemVer **is** the target `B`. Validate it against a SemVer shape (three
dot-separated non-negative integers, e.g. `0.7.0`); if it does not match, stop
and tell the human the argument is not a bare SemVer. This path is always
available and portable across machines/OSes — it never depends on reading the
plugin's own install directory.

### 2. Auto-detect (PRIMARY, when no argument is given)

When invoked with no argument, derive `B` from the installed plugin's shipped
version/manifest — read `.claude-plugin/plugin.json` `version` from the
installed kit, or take the highest `migrations/<v>.yaml` present in the shipped
`migrations/` directory. Use the same bare-SemVer form as the marker so the
comparison against `A` is direct.

> **Stage-I watch-item (OQ1 — auto-detect portability is UNVERIFIED).** Auto-
> detect assumes the running command can read the plugin's OWN installed files
> (its `plugin.json` / `migrations/`). There is **no portable primitive for a
> command body to learn its own install directory** across machines and OSes.
> The plugin cache path encodes the version (e.g.
> `~/.claude/plugins/cache/<marketplace>/qrspi/<version>/`) and multiple
> versions can co-exist there, so guessing the path is fragile. Treat auto-
> detect as best-effort: if you cannot reliably read the installed version, do
> NOT silently pick a wrong one — fall back to asking the human for the target
> (or instruct them to re-run with an explicit `<target-version>` argument).
> The explicit-argument fallback above is the guaranteed-portable path and the
> reason the command signature accepts an optional `<target-version>`.

Once `B` is resolved, read the marker to obtain `A` (see edge cases first — a
missing marker changes the flow).

## Edge cases (handle BEFORE walking)

Read the marker `openspec/.qrspi-version` with the Read/Glob tools (never shell
out). Handle these three cases before selecting any manifest files. Each is a
guarded default settled in design D5 / OQ2.

### Already up to date — marker == target

If the marker version `A` equals the target `B`, report **"already up to
date"**, walk nothing, and exit. Do not read or process any manifest file.

### No marker present

If `openspec/.qrspi-version` does not exist (every pre-marker repo), do **NOT**
silently assume `0.0.0` and replay everything — there are no retroactive
manifest entries, so a `0.0.0` walk would find nothing and give false comfort.
Instead:

1. Tell the human no marker exists in this repo.
2. Offer, via **`AskUserQuestion`**, to either:
   - **Initialize the marker to the current target version** (assume the repo
     is already up to date) — write `openspec/.qrspi-version` = `B`, skip the
     walk, and stage it for the human to commit; or
   - **Supply the actual current version** — the human enters the real `A`,
     and the walk proceeds normally from there.

This is a real `AskUserQuestion` gate and therefore MUST run on the main loop
(it does — this command carries no `agent:` frontmatter). It is NOT a `0.0.0`
replay.

### Downgrade — marker > target

If the marker version `A` is **greater** than the target `B`, **hard-stop** and
warn the human that the recorded version is ahead of the requested target. Do
**not** silently skip the condition and do **not** attempt reverse migrations —
reverse/downgrade migrations are an explicit Non-Goal. Take no further action.

## The walk algorithm (ascending SemVer order)

Once `A` (marker) and `B` (target) are known and `A < B`, select and order the
manifest files:

1. **Enumerate** the shipped `migrations/*.yaml` files (Glob
   `migrations/*.yaml`). Each filename stem is a bare SemVer `v`.
2. **Filter** to the versions with `A < v <= B` (strictly greater than the
   marker, up to and including the target). Skip anything at or below `A`, and
   anything above `B`.
3. **Order ascending by SemVer, parsed NUMERICALLY — never string-sorted.**
   Split each version into `major.minor.patch`, coerce each field to an
   integer, and compare `(major, minor, patch)` tuples numerically. This is
   load-bearing: a lexical string sort places `0.10.0` **before** `0.9.0`,
   which is wrong. Numeric tuple comparison gives `0.9.0 < 0.10.0` correctly.
   Compare left to right: lower `major` wins; on a tie, lower `minor`; on a
   tie, lower `patch`.
4. The result is the ordered walk list. The walk is **step-by-step per
   version** — process each `migrations/<v>.yaml` in full before the next; do
   NOT merge all intervening steps into one flat checklist. Intermediate
   ordering is preserved so a consumer two versions behind sees `0.7.0` fully
   before `0.8.0`.

### Plan preview (before applying)

Before beginning the apply phase, print a short plan preview listing each
version in the ordered walk list:

- the version `v`,
- its one-line `summary`,
- the count of `automated` steps and the count of `manual` steps it carries.

Present the entries in ascending SemVer order. This gives the human a
heads-up of what is about to happen before any edits are applied. Then
proceed immediately into the apply phase (section "Apply phase" below) --
do not stop for a separate confirmation here unless a step's `AskUserQuestion`
gate fires (manual steps only).

## Apply phase

The apply phase uses the SAME ordered walk list produced by the read path.
Iterate each version `v` in ascending SemVer order; within
each version, apply all `automated` steps first, then gate all `manual` steps.
Only after the last version's last step (automated or manually confirmed) is
complete do you bump the marker and stage the changes. A partial or
aborted walk MUST NOT bump the marker.

### 4.1 -- Automated `edit-file` dispatcher

For each item in `automated` (processed in list order, without prompting):

1. **Guard (hard-stop, not skipped silently):**
   - `action` must be exactly `edit-file`. Any other value is a malformed
     manifest; stop and report it. The lint gate prevents this from shipping
     but be defensive.
   - `path` must start with `openspec/`. Any path that does not is rejected;
     stop and report it. Never edit outside `openspec/`.
   - Never execute shell commands as part of an automated step. A step that
     requires shell execution was incorrectly authored as `automated` rather
     than `manual`; stop and report it.

2. **Read the target file** at `path` using the Read tool.

3. **Apply the deterministic edit** described by the step's edit fields.
   The `edit-file` step carries one of the following edit patterns
   (exactly one per step; if more than one pattern key is present that is a
   malformed step -- stop and report):

   - **`find` + `replace`:** Replace the first exact occurrence of the
     `find` string in the file with the `replace` string. If `find` does
     not appear in the file, stop and report -- do not apply a no-op edit
     silently, as it may indicate the manifest targets the wrong version.
   - **`find_all` + `replace`:** Replace ALL exact occurrences of the
     `find_all` string in the file with the `replace` string.
   - **`insert_after` + `content`:** Insert the `content` string
     immediately after the first occurrence of `insert_after` in the file.
     If `insert_after` does not appear, stop and report.
   - **`insert_before` + `content`:** Insert the `content` string
     immediately before the first occurrence of `insert_before` in the
     file. If `insert_before` does not appear, stop and report.
   - **`append` + `content`:** Append the `content` string at the end of
     the file. No anchor required.
   - **`prepend` + `content`:** Prepend the `content` string at the
     beginning of the file.
   - **`overwrite` + `content`:** Overwrite the entire file with `content`.
     Use sparingly -- prefer targeted edits.

4. **Write the result** using the Write or Edit tool (Edit for targeted
   replacements, Write for full-file overwrites).

5. **Print a one-line confirmation** showing the step's `description` and
   the file path, so the human can see what was applied. Do NOT ask for
   confirmation -- this step is automated.

Track the set of files edited by automated steps (for the staging tail in
section 4.4).

### 4.2 -- Manual step gate

For each item in `manual` (processed in list order, after all `automated`
steps for the same version):

1. **Present the step** via `AskUserQuestion`:
   - question: `Migration step for v<version> -- <step description>. Confirm
     you have completed this step before the walk continues.`
   - choices:
     - `Done -- continue to the next step`
     - `Stop here -- I'll resume the walk manually`

2. **If the human chooses "Stop":** halt immediately. Do NOT apply further
   steps, do NOT bump the marker, do NOT stage anything. Print a summary of
   what was completed so far and instruct the human to re-run `/qrspi:update`
   (with the same target version) to resume. Because the marker has not been
   bumped and no automated edits from subsequent versions have been applied,
   re-running is safe -- the walk will replay from version `A` (the original
   marker), but automated steps from versions already processed in this run
   will be applied again. Warn the human of this: if the automated edits are
   idempotent (e.g. inserting a line that is already present) they are
   harmless on re-run; if not, they may need manual cleanup.

3. **If the human chooses "Done":** advance to the next step.

### 4.3 -- Marker bump (after ALL steps for ALL versions)

After the LAST step (automated or manually confirmed) of the LAST version in
the ordered walk list completes successfully:

1. Write the target version `B` (bare SemVer) to `openspec/.qrspi-version`,
   overwriting whatever was there. Use the Write tool. The content is a single
   line containing `B` with no prefix, no YAML key, and no trailing syntax
   beyond a newline.

2. Print a confirmation: `Marker bumped: openspec/.qrspi-version now
   contains <B>.`

**Critical invariant:** if the walk was aborted (any hard-stop, any
"Stop here" choice in a manual gate), do NOT write this file. The marker must
always reflect the last FULLY COMPLETED update run, not a partial one.

### 4.4 -- Stage + print-commit tail

After bumping the marker (section 4.3):

1. **Stage** the marker and every `openspec/`-scoped file that was written by
   an automated `edit-file` step in this run. Use Bash with the explicit file
   paths -- never `git add -A` or `git add .`. The exact command:
   ```
   git add openspec/.qrspi-version [<path1> <path2> ...]
   ```
   where the bracketed paths are the auto-edited files tracked in section 4.1
   (omit the brackets if no automated edits were applied).

2. **Print** a ready-to-run `git commit` command for the human. Do NOT run
   it -- the human commits. The printed command uses the following message
   template:
   ```
   git commit -m "chore: apply qrspi-update migrations to v<B>"
   ```
   Print it as a fenced code block so the human can copy-paste it. Remind
   the human to review `git diff --cached` before committing if they want to
   inspect the staged changes.

3. **Do NOT auto-commit.** The command is edit-capable in the consumer repo
   and a forced commit on an arbitrary branch is unsafe (OQ5 / D5). The human
   owns the final commit.

