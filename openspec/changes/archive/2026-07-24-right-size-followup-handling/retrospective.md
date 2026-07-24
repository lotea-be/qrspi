# Retrospective — right-size-followup-handling / stage archive

> Generated 2026-07-24. Stage completed in commit 02a3c9f (archive move +
> backlog-row removal + delta-spec sync), on top of the merged PR #26 (bbe45a7).

## Friction observed

1. **The "Sync now / Archive without syncing" prompt is near-ceremony on the
   happy path.** For a normally-completed, merged change whose delta specs are
   valid, syncing into `openspec/specs/` is essentially always correct — the
   human is asked to confirm the only sensible option. The prompt is only
   load-bearing in two rare escape-hatch cases (a malformed delta that would
   corrupt the main specs, or an abandoned/superseded change archived for the
   record without promoting its deltas). The friction is that the kit can't just
   drop or default-and-proceed the prompt on the happy path, because the prompt
   lives inside the **generated** `openspec-archive-change` skill (regenerated
   from the OpenSpec CLI, must not be hand-edited), not the kit-owned
   `/qrspi:archive` command. The clean fix rides the exact restructuring already
   proposed by the `dedicated-spec-sync-agent` backlog idea: have the
   `/qrspi:archive` command own the sync delegation instead of deferring to the
   generated skill's spawn. Once the command owns the sync, it can also own the
   "is a sync needed? then just do it" decision and reserve a prompt for the
   escape-hatch conditions only. This is a **second, independent motivation** for
   that already-logged idea (which today is framed purely around least-privilege).

2. **`/qrspi:retro` assumes the change folder is still active — but an
   archive-stage retro runs *after* the folder has been moved.** `retro.md`
   hard-stops when `openspec/changes/<id>/` is absent ("tell the user the change
   id is unknown and stop") and writes its output to
   `openspec/changes/<id>/retrospective.md`. By definition, a retro *on the
   archive stage* runs after `/qrspi:archive` has moved the folder to
   `openspec/changes/archive/<date>-<id>/`, so both the existence check and the
   write-target point at a path that no longer exists. This session only
   completed because the orchestrator manually resolved the archived location;
   the command as written would have stopped. The command (and the retrospective
   skill's "When to run it" note) should resolve the folder to the archive path
   when the active path is absent, and write `retrospective.md` there.

3. **`retro.md`'s mirror-sync mechanics are stale.** Steps 5–6 tell the agent to
   apply edits "to both the Claude file AND its GitHub mirror" and to run
   `./scripts/sync-agent-defs.ps1 -Pair <name>` to verify the mirror. That
   contradicts both `CLAUDE.md` and the `retrospective` skill itself, which say
   the Copilot mirror lives under `copilot/`, is **generated**, is never
   hand-edited, and is regenerated/verified with `node sync-copilot.mjs`
   (+`--check`) — no `pwsh`, no per-pair script. Following `retro.md` literally
   would have the agent hand-edit generated output and invoke a script that
   isn't the current mechanism.

## Proposed edits

| # | File | Edit |
|---|------|------|
| 1 | `openspec/backlog.md` (`dedicated-spec-sync-agent` idea) | Add a sentence noting a second motivation: command-owns-sync also lets `/qrspi:archive` drop the near-redundant "Sync now / Archive without syncing" prompt on the happy path (reserve it for the malformed-delta / superseded-change escape hatches), since that prompt currently lives in the un-editable generated `openspec-archive-change` skill. |
| 2 | `claude/commands/retro.md` | Change the existence check and write-target so that when `openspec/changes/<id>/` is absent, the command resolves the change to `openspec/changes/archive/<date>-<id>/` (via Glob) and writes `retrospective.md` there, instead of hard-stopping with "change id is unknown". Only hard-stop if it exists under neither path. |
| 3 | `claude/commands/retro.md` | Replace the stale mirror mechanics in steps 5–6: drop "apply to both the Claude file AND its GitHub mirror" and `./scripts/sync-agent-defs.ps1 -Pair <name>`; state that `copilot/` is generated and edits are applied to the `claude/` source then regenerated with `node sync-copilot.mjs` (verified with `node sync-copilot.mjs --check`), matching `CLAUDE.md` and the `retrospective` skill. |

## Deferred

- Spawning a **new** backlog idea for the redundant prompt: deferred in favour
  of augmenting `dedicated-spec-sync-agent` (edit #1), because the two share the
  same enabling restructure (command owns the sync) and a separate row would be
  a near-duplicate.
- The `dedicated-spec-sync-agent` change itself (P3) is not built here — this
  retro only strengthens its rationale.
