---
name: qrspi-update
description: Drives /qrspi:update. Carries the migration-manifest schema contract, the SemVer-ordered walk algorithm (apply each migrations/<v>.yaml for A < v <= B in ascending order), target-version resolution (auto-detect primary, explicit-arg fallback), the edge-case handling (up-to-date / no-marker / downgrade), and the plan-only vs. apply scope. Load this whenever running /qrspi:update.
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

> **Scope of the current slice: PLAN-ONLY.** This skill currently specifies the
> read path — read the marker, resolve the target, handle the edge cases, and
> print the ordered per-version plan. It applies **no file edits and bumps no
> marker**. The apply/gate/bump/commit tail is added in a later slice; the seam
> where it attaches is marked "APPLY PHASE (later slice)" below. Structure any
> extension there — do not fold apply logic into the read path.

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
    # + deterministic edit fields (find/replace, insert, ...) consumed in the
    #   apply phase (later slice)
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

### Plan-only output (current slice)

For each version in the ordered walk list, print a plan entry:

- the version `v`,
- its one-line `summary`,
- the count of `automated` steps and the count of `manual` steps it carries.

Present the entries in ascending SemVer order as a readable per-version plan,
then state that this is a plan only — no files were edited and the marker was
not bumped. `git status` should be clean after a plan-only run (aside from a
marker write the human explicitly chose in the no-marker branch above).

<!-- ========================================================================
     APPLY PHASE (later slice) -- extend, do NOT fold into the read path.

     A later slice attaches the hybrid apply here, iterating the SAME ordered
     walk list produced above:
       - automated `edit-file` dispatcher: apply each automated step's edit to
         the openspec/-scoped path in the consumer repo, without prompting;
       - manual step gate: surface each manual step's `description` via
         AskUserQuestion and hold the walk until the human confirms;
       - marker bump: after all steps for all versions complete, write `B` to
         openspec/.qrspi-version;
       - stage + print-commit tail: stage the marker and any auto-edited
         openspec/ files, then print a ready-to-run `git commit` command for
         the human (do NOT auto-commit).
     ===================================================================== -->
