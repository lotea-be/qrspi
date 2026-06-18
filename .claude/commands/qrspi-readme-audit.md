---
description: Audit README.md against the current kit source surface (commands, agents, skills, install/update flow, OpenSpec pin, repo layout) and report stale or missing documentation. Read-only review — proposes edits, does not apply them without confirmation. Run after a rename, a new/removed command or agent, or an install/pin/layout change.
agent: build
---

Audit [`README.md`](../../README.md) against what the kit actually ships, and
report where the doc has drifted. This is the **prose-level** companion to the
CI lint: `node scripts/lint.mjs` (Check 4) already guarantees the *command*
surface mechanically, so your job is the drift the lint can't judge.

This is a **read-only review**. Surface findings and propose concrete edits; do
not rewrite `README.md` until the user picks what to apply.

First, run the mechanical floor so you don't re-report what CI already covers:

1. **Run the lint.** `node scripts/lint.mjs`. If Check 1 (pin agreement) or
   Check 4 (README command coverage) fails, note it — those are already-broken
   couplings the README must fix. If it passes, the command list and the
   OpenSpec pin in the README are already consistent; move on to the prose.

Then audit each README surface against source (use the **Glob**/**Grep**/**Read**
tools — do not shell out; Glob works on every platform):

2. **Stages & helpers table.** Glob `claude/commands/*.md`. Confirm the eight
   stage rows and the helpers line match the actual command set, that each
   command's one-line description still reflects what the command does, and that
   the human-approval gate / read-only notes are still accurate.

3. **Agents & the two-tool mapping.** Glob `claude/agents/*.md`. Check that any
   agent named in the README (and the `claude/… ↔ copilot/…` table, the "runs
   inside the X agent" sentence, and the Verify section's dropdown/prompt names)
   matches the current agent names and the generated `copilot/agents/*` filenames.
   (This is the surface a rename most easily leaves stale — the lint does not
   cover it.)

4. **Skills.** Glob `claude/skills/*/SKILL.md`. Confirm any skill the README
   names still exists and is described accurately.

5. **Install / update flow.** Read the `## Install` section against `install.ps1`
   / `install.sh` (flags, what gets copied, the settings.json patch) and against
   the documented plugin install/**update** commands. Flag any command string or
   flag that no longer matches the scripts.

6. **OpenSpec pin & layout.** Confirm the README's pinned-version section lists
   the real hand-maintained pin locations, and that the repo-layout tree matches
   the actual top-level directories (Glob the repo root).

7. **Report.** Produce a findings list grouped by README section: for each, quote
   the stale line, state what source it disagrees with (`file:line` where useful),
   and propose the corrected text. End with a one-line verdict (clean / N findings)
   and ask the user which fixes to apply. Apply only the approved edits, then
   re-run `node scripts/lint.mjs` to confirm the command/pin couplings still pass.

User argument (ignored): $ARGUMENTS
