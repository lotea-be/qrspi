---
name: qrspi-dogfood
description: How to dogfood an in-flight QRSPI change in THIS repo before the PR stage — load the local working copy as the plugin with `claude --plugin-dir`, build throwaway consumer fixtures, and walk the change's `(human)` verification tasks against a live session so their tasks.md boxes become observed Confirm-done ticks instead of Leave-for-now. Local repo dev-tooling — not shipped in the plugin. Load this when running /qrspi-dogfood or whenever asked how to try an in-flight change for real before opening its PR.
---

# Dogfooding a QRSPI change before its PR

This is the mechanism behind `/qrspi-dogfood`. It is **maintainer dev-tooling for
this repo only** — it lives under `.claude/` (not `claude/`), is never shipped in
the plugin, and is never synced into `copilot/`.

## Why this exists (the trap it closes)

The QRSPI kit ships as a **Claude Code plugin**. A running session loads the
plugin from the **installed release** in the plugin cache
(`~/.claude/plugins/cache/<marketplace>/qrspi/<version>/`), *not* from this repo's
working tree. So every runtime change a QRSPI change makes — a new or edited
command body, a new skill, an agent tweak — is **invisible in the session you
built it in**. `/reload-plugins` reloads the *installed* plugin; it does not
overlay your uncommitted working tree.

A change's `openspec/changes/<id>/tasks.md` almost always carries `(human)` tasks:
the runtime observations no static check can make (an `AskUserQuestion` shows the
right two choices; an up-to-date repo stays silent; a chain checks once). At the
PR reconciliation gate those boxes are either **Confirm-done** (you observed the
behaviour) or **Leave-for-now** (the sanctioned "not verified" escape). Dogfooding
is what earns the Confirm-done: it turns "looks plausible" into "I watched it
work" **before** the PR, which is exactly where the alignment payoff should land.

## The mechanism: `--plugin-dir`

Launch a **new** terminal session pointed at this repo as the plugin:

```
claude --plugin-dir /workspaces/git/qrspi
```

- `--plugin-dir <path>` loads the plugin from that directory for that session,
  so the working-tree `claude/` payload (commands, skills, agents) is what runs.
  It is repeatable and also accepts a `.zip`.
- It must be a **fresh session** — the current session keeps the cached release.
  Confirm which copy is active with `/plugin` (check the version/source) before
  trusting an observation.
- `--plugin-url <url>` (fetch a zip) and `--bare` (skip plugin loading entirely)
  are the neighbouring flags; `--plugin-dir` is the one for local dogfooding.
- Run it only in directories you trust — the flag loads that directory's
  settings, skills, hooks, and MCP config.

## Build throwaway consumer fixtures

Most QRSPI changes are exercised against a **consumer repo**, not this kit repo.
Create fixtures **outside** this repo (the scratchpad dir, or `/tmp`), never
inside it:

- A minimal initialized repo: `git init` a scratch dir, then either
  `npx @fission-ai/openspec@latest init` or hand-write a minimal `openspec/`
  (a `config.yaml` sentinel is enough for "is-initialized" checks).
- The `openspec/.qrspi-version` marker is a one-line bare SemVer. Vary it to hit
  each branch a version-aware change defines (behind / matching / ahead / absent).
- Keep one fixture per branch, or edit the single marker between runs — whichever
  makes the observation unambiguous.

## Derive the dogfood runbook from the change

Open `openspec/changes/<id>/tasks.md` and take **every `(human)` task**. Each is
one runbook row:

1. **Fixture state** — what the scratch repo / marker / plugin files must be.
2. **Command to run** — the exact `/qrspi:*` (or other) invocation in the
   `--plugin-dir` session.
3. **Expected observation** — the precise thing to watch for (which choices an
   `AskUserQuestion` offers, whether output is silent, whether a prompt fires
   once vs. per stage).

Read the change's `design.md` / delta `specs/**` for the authoritative expected
behaviour behind each observation, so you are checking against the approved
contract, not a guess.

## Iterate one check at a time (the interactive loop)

Do **not** dump the whole runbook and walk away. Drive the checks **one at a
time**, and for each one the orchestrator (main loop) performs this cycle before
moving on:

1. **Provision the fixture** for *this* check — set the scratch repo to the exact
   state the check needs (marker value, marker present/absent, config-dir state,
   etc.). Do it yourself with the file tools; do not make the human hand-edit
   fixture state.
2. **Give the exact terminal commands** the human runs in their *separate*
   `--plugin-dir` session — copy-pasteable, including any per-check env var (e.g.
   a `CLAUDE_CONFIG_DIR=…` prefix). Remind them a fresh session is needed only
   when the plugin source or a launch-time env var changed.
3. **Say what to do in Claude and what to look for** — the command to run and the
   precise expected observation (exact choices, silence, one-line notice, prompt
   fires once vs. per stage), grounded in the design/spec.
4. **Ask whether the actual result matches** — via AskUserQuestion
   (`Matches / Doesn't match — I'll describe`). Wait for the human's answer; do
   not assume.
5. **Record the outcome** — on *Matches*, tick that check's box in `tasks.md`
   (Confirm-done). On *Doesn't match*, capture the human's description as a
   finding: fix the slice (still stage I) or, if post-PR-shaped, add to
   `followups.md`; never tick a box that did not pass.
6. **Advance** to the next check and repeat from step 1.

Keep each turn scoped to a single check — provision, instruct, ask, record — so
the human always knows exactly what they are verifying and nothing is ticked
unobserved.

## After the run: tick, or file a follow-up

- Each `(human)` task whose expected observation you **saw** becomes a genuine
  Confirm-done tick in `tasks.md` at the PR reconciliation gate.
- Anything that **misbehaves** is real signal caught pre-PR: fix it (it is still
  stage I — amend the slice) or, if it is post-PR-shaped, record it in
  `followups.md`. Do not tick a box you did not observe pass.

## Gotchas

- **Wrong copy.** If behaviour looks unchanged, you are almost certainly on the
  cached release — check `/plugin` and relaunch with `--plugin-dir`.
- **"Learn my own install dir" portability.** A command/skill that reads its own
  plugin files (e.g. `.claude-plugin/plugin.json`) has no portable primitive for
  its install path — under `--plugin-dir` the CWD is the *consumer* fixture while
  the plugin files sit at the `--plugin-dir` path. Dogfooding is the way to find
  out whether that read actually resolves; if it does not, that is the finding.
- **In-context state.** "Once per session" suppression (a held flag, like the
  run-mode) only resets on a genuinely new session — a `/clear` or a fresh
  launch, not a re-invoked slash command in the same session.

## Worked example — `session-version-check-and-update-prompt`

This change adds a session-start version check (skill `qrspi-version-check`,
embedded first in `/qrspi:status` + the eight stage commands). Its `(human)`
tasks map to a runbook like:

| Fixture (`.qrspi-version` = A; kit = B=0.7.0) | Run | Expect |
|---|---|---|
| A = `0.6.0` (behind) | `/qrspi:status` | one `AskUserQuestion` naming both versions, choices exactly `["Run /qrspi:update now","Continue on the current version"]` |
| A = `0.7.0` (matching) | `/qrspi:status` | **no** version output (silent) |
| A = `0.8.0` (downgrade) | `/qrspi:status` | one-line "stale plugin" warning, command continues, no gate |
| marker file removed, `openspec/` present | `/qrspi:status` | delegates to `/qrspi:update`'s own no-marker gate — no second competing prompt |
| A = `0.6.0`, fresh session | `/qrspi:questions … → research → design` chain | version prompt fires **once** (at Q), silent on R and D |
| A = `0.6.0`, new session | standalone `/qrspi:design <id>` | version prompt fires (no held flag) |

Run each in a `claude --plugin-dir /workspaces/git/qrspi` session and Confirm-done
the matching `(human)` box only on the observed pass.
