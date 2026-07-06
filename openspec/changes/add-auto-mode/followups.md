# Follow-ups — add-auto-mode

> Post-PR fix queue. Resolve with `/qrspi:followup add-auto-mode`. Archived with the
> change; every box should be ticked before archival.

- [x] **Live-runtime dogfood (human).** ✅ Verified 2026-07-06 via a `claude
  --plugin-dir` dogfood on a throwaway clone (isolated local remote) — the run-mode
  prompt, Full-auto gate suppression, the D pause, the push-failure hard-stop, and
  Semi-auto boundary pauses behaved as designed. Slice checkpoints 1.4, 2.5, 2.6,
  and 3.5 are now live-verified (previously static-only). The dev-install path is
  documented
  (README → "Developing QRSPI further": `claude --plugin-dir .` loads this repo's
  `claude/` tree, shadowing the installed release for that session; `/reload-plugins`
  picks up edits) — so no prerelease tag is required. What remains is actually
  running the walk. **Runbook** (do it on a throwaway change id in an isolated
  scratch branch/clone — Full auto auto-commits *and pushes*, so don't aim it at a
  real branch):
  1. `claude --plugin-dir /workspaces/git/qrspi`, then `/qrspi:questions <throwaway-id> <desc>`.
  2. **Full auto:** the ternary "Run mode?" prompt appears first → pick Full auto →
     confirm Q runs, then NO commit/handoff prompts, the chain auto-advances into R,
     and it PAUSES at the D review (and at any backlog offer).
  3. **Hard-stop:** break the remote (`git remote set-url origin https://invalid.example/x`),
     run Full auto again → the first auto-commit's push fails → chain HALTS with the
     git error surfaced, does not continue. Restore the remote afterwards.
  4. **Semi-auto:** pick Semi-auto → confirm auto-commit fires but a "continue to
     next stage?" prompt appears at each stage boundary.
  5. **Red-build block (optional):** a slice whose lint fails → implementer returns
     blocked → chain stops, slice not committed.
  Then tick this box (or file bugs for any gate that misbehaves). (source: PR review)
- [x] **`implement.md` ↔ `backlog.md` status-line convention drift.** `implement.md`
  references `Status:` and `Next QRSPI command:` body lines, but
  questioner-generated backlog rows use a `### <id> — <status-in-backticks>`
  heading format. Align either the instruction wording or the questioner's row
  template so a Full-auto run does not produce confusing no-op backlog edits.
  (source: PR review; predates this change) — fixed (commit pending): rewrote
  the backlog-update wording in `implement.md`, `pr.md`, `plan.md`,
  `structure.md`, `slices.md`, and `workflow` `SKILL.md` to describe the real
  heading-backtick convention (verified against this repo's own backlog
  history) and dropped the non-existent `Next QRSPI command:` line concept;
  P and V now correctly say no backlog edit happens at those stages, and
  `implement.md`'s intermediate slices no longer touch `backlog.md`.
- [ ] **"Materially diverges" rubric for execution-stage subagents.** Hard-stop
  condition (4) — implementation/structure materially diverging from the approved
  `design.md`/spec — is a semantic self-assessment. Add a concrete divergence
  rubric to the architect, planner, and implementer contracts so the bar is
  explicit and the signal fires reliably. (source: PR review / design Risks)
- [ ] **`lint-auto-mode-gate-coverage` — decide priority.** Accepted into the
  backlog as an `idea` at stage D (a structural lint asserting every stage command
  references the run-mode procedure). Confirm priority in the next planning
  session. (source: PR review)
