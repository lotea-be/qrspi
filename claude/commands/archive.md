---
description: Archive a completed QRSPI change after its PR has merged. Thin wrapper over OpenSpec's archive skill — moves the change folder under archive/ with a date prefix and syncs delta specs into the main specs.
agent: build
---

Archive a completed QRSPI change. This is the final step **after the PR has
merged** — it moves `openspec/changes/<id>/` into `openspec/changes/archive/`
with a date prefix and folds the change's delta specs into the main specs so
`openspec/specs/` reflects current truth.

This command is a thin QRSPI-namespaced entry point over OpenSpec's own
archive logic; the mechanics live in the generated `openspec-archive-change`
skill (do not hand-edit that skill — it is regenerated from the OpenSpec CLI).

Argument (optional): $ARGUMENTS — the change id (kebab-case). If omitted, the
skill will list active changes and prompt you to pick one.

Steps:

1. If `openspec/` does not exist, this repo was never bootstrapped — tell the
   user to run `/qrspi:init` first and stop.

2. **Sanity-check readiness before archiving.** Archival is meant for changes
   whose PR has merged. If `openspec/changes/<id>/` has a `followups.md` with
   un-ticked `- [ ]` boxes, surface that — those post-PR follow-ups should be
   resolved (`/qrspi:followup <id>`) before archiving. Inform, don't hard-block;
   the user may have a reason to proceed.

3. **Delegate to the archive skill.** Load and run the `openspec-archive-change`
   skill, passing the change id (or letting it prompt for selection). It checks
   artifact/task completion, assesses delta-spec sync state, moves the folder to
   `archive/YYYY-MM-DD-<id>/`, and prints the archive summary.

4. Relay the skill's completion summary to the user, including the archive path
   and whether specs were synced.

Repository signals you may use (to list in-flight and archived changes, use the
**Glob** tool with patterns `openspec/changes/*` and
`openspec/changes/archive/*` — do not shell out).
