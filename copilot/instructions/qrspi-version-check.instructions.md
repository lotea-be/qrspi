---
description: Session-scoped version check for QRSPI commands. Compares the repo's installed-kit marker (A from openspec/.qrspi-version) against the installed plugin version (B from Claude Code's installed_plugins.json registry under $CLAUDE_CONFIG_DIR) and branches on the result -- silent on match, vscode/askQuestions gate when behind, one-line warning on downgrade. Load this at the top of each QRSPI stage command.
---

## What this skill does

Each QRSPI stage command loads this skill **as its very first step**, before
run-mode establishment, before any precondition Glob, and before any branch,
folder, subagent, or commit work. The skill compares the consumer repo's
QRSPI version marker (`A`) against the installed plugin's version (`B`) and
acts on the result. It is session-scoped: once run in an orchestrator context
it sets an in-context flag so subsequent commands in the same chained session
skip the check entirely.

> **Shipped skill location:** `claude/skills/qrspi-version-check/SKILL.md`
> (not `.github/instructions/`). It auto-registers from the `skills: ./claude/skills`
> directory and requires no `plugin.json` edit.

## Silence discipline (mandatory — read before every branch)

This check speaks to the user on **exactly three** paths: **behind**
(vscode/askQuestions), **downgrade** (one-line warning), and **unreadable-B / config
missing** (one-line notice). On **every other path** — already-checked-this-
session, **up-to-date**, `openspec/` absent, and no-marker-delegate — the check
is **completely invisible**. That means, on those paths:

- Do **not** announce that you are running, loading, or performing a version
  check (no "I'll run the version check", no "checking version…").
- Do **not** report a result: no "version check passed", no "passed silently",
  no "up to date", no `✅`, and never print A or B.
- Do **not** narrate the transition in a way that references the check.
- Emit **zero** user-visible tokens about the check — proceed directly to the
  embedding command's next step as if the check had not run.

A single line like `Version check passed silently (0.7.0 = 0.7.0)` on the matched
path is the exact per-command nag D7/Q18 exists to prevent: it would repeat on
`/qrspi-status` plus all eight stage commands. Silence is the *designed
behaviour*, not an omission to helpfully fill in — reporting that the check
"passed silently" is itself the failure. This holds even when you otherwise
think out loud.

## Execution order (mandatory)

Within each embedding command, execute in this exact order:

1. Session-flag guard (step 1 below) -- exit immediately if already run
2. Read B -- installed plugin version (step 2)
3. Read A -- repo marker (step 3)
4. Compare and branch (step 4)
5. Set the session flag (always, in every exit path that reaches step 4)

## Step 1 -- Session-flag guard

Before reading any file, check whether an in-context "version-checked this
session" flag is already held in the orchestrator's conversational context.

This flag is held in context only -- no disk file, no temp marker, no
frontmatter -- using the same mechanism as the run-mode flag. It is lost
on `/clear` or a new terminal session, which is correct behaviour (a fresh
session re-checks, just as it re-asks for run-mode).

**If the flag is already held:** return immediately. Do not read A, do not
read B, do not issue any prompt. The stage continues from where it was.

**If the flag is NOT held:** continue to step 2.

## Step 2 -- Read installed kit version B

Read B from **Claude Code's installed-plugin registry**, not from the plugin's
own `.github-plugin/plugin.json` -- that file is not resolvable from an arbitrary
consumer working directory (a real consumer's CWD is their repo, not the kit).
The registry is readable from any CWD. Local only -- no network call.

1. **Resolve the Claude config directory.** Use the `CLAUDE_CONFIG_DIR`
   environment variable if set; otherwise default to `~/.copilot` (expand `~` to
   an absolute home path). The registry file is
   `<config-dir>/plugins/installed_plugins.json`.
2. **Read and parse it** with the Read tool. It is JSON of the shape
   `{ "plugins": { "<name>@<marketplace>": [ { "version": "X.Y.Z", ... }, ... ] } }`.
3. **Select the QRSPI entry.** Find the plugin key matching the glob `qrspi@*`
   (match on the `qrspi@` prefix -- never hardcode a marketplace name such as
   `qrspi@lotea-agents`). Take that key's entry `version`. If the key holds more
   than one entry (multiple install scopes), use the **highest** SemVer -- the
   effective installed kit.
4. B must be a bare SemVer string (e.g. `0.7.0` -- three dot-separated
   non-negative integers, no `v` prefix).

**If the config directory cannot be resolved, `installed_plugins.json` cannot be
read or is malformed, or there is no `qrspi@*` entry with a valid `version`:**
- Print a one-line notice: `version check unavailable -- run /qrspi-update manually if needed`
- Set the in-context session flag (so the notice does not repeat in a chain)
- Return immediately (do not block; do not issue an vscode/askQuestions)

## Step 3 -- Read repo marker A

Read `openspec/.qrspi-version` using the Read or Glob tool. A must be a
bare SemVer string.

**If `openspec/.qrspi-version` does not exist:**

- Check whether `openspec/` itself exists (use Glob `openspec/`).
- **If `openspec/` is absent:** do nothing -- the repo has never been
  initialized and the onboarding check in the embedding command (e.g.
  `/qrspi-status`) owns that case. Set the session flag and return
  immediately without issuing any prompt.
- **If `openspec/` exists but `openspec/.qrspi-version` does not:** hand off
  to `/qrspi-update`'s existing no-marker gate. Do NOT invent a second
  competing vscode/askQuestions from this skill -- `/qrspi-update` owns that
  gate. Re-enter `/qrspi-update` on the main loop as a slash command (not
  as a subagent spawn) so its vscode/askQuestions gate fires normally.
  Set the session flag and return.

## Step 4 -- SemVer compare and branch

Parse both A and B as `(major, minor, patch)` integer tuples. Compare
left-to-right numerically -- the same algorithm documented in the
`qrspi-update` skill's walk algorithm section (numeric-tuple ordering, NOT
string/lexicographic comparison). This is load-bearing: `0.10.0 > 0.9.0`
must be true, which a lexicographic sort would get wrong.

Algorithm: split on `.`, coerce each field to an integer, compare
`(major, minor, patch)` tuples left-to-right. Lower `major` wins; on a
tie, lower `minor`; on a tie, lower `patch`. Equal tuples are up-to-date.

Branch on the result:

### A == B -- up-to-date (silent)

Set the in-context session flag and return with **no output at all** — apply the
**Silence discipline** above in full (no announcement, no "passed", no versions,
zero tokens about the check). The very next thing the user sees is the stage's
own output (for `/qrspi-status`, the onboarding/stage map).

### A < B -- behind (vscode/askQuestions gate)

The repo marker is behind the installed kit. Issue exactly one
`vscode/askQuestions`:

- **question text:** must name both A and B and convey the gap explicitly.
  Example wording: `This repo is on QRSPI <A>; installed kit is <B>
  (<delta> version(s) behind). Update now?`
- **choices (exactly these two, in this order):**
  - `Run /qrspi-update now`
  - `Continue on the current version`

**If the user chooses "Run /qrspi-update now":**
Re-enter `/qrspi-update` as a slash command on the main loop (NOT as a
subagent spawn -- a subagent cannot issue vscode/askQuestions, which the update
walk requires). The current stage is not advanced. Do NOT set the session
flag in this path (the update flow will run a new context after re-entry).

**If the user chooses "Continue on the current version":**
Set the in-context session flag and return. The stage proceeds normally
without running `/qrspi-update`.

### A > B -- downgrade (one-line warning, no gate)

The repo marker is ahead of the installed kit -- the plugin may have been
rolled back. Print a one-line warning naming both versions:

> `Installed kit <B> is older than this repo's marker <A> -- you may be running a stale plugin`

Do NOT issue an vscode/askQuestions. Set the in-context session flag and return.
The stage proceeds normally.

## End of check -- set the session flag

In every path that reaches step 4 (up-to-date, behind-continue, and
downgrade), record the in-context "version-checked this session" flag before
returning so subsequent stage commands in the same orchestrator context skip
immediately at step 1.

The behind-update-now path is the sole exception: the session context is
effectively handed off to `/qrspi-update`, so the flag is not set on that
path.
