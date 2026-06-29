# Follow-ups — add-auto-mode

> Post-PR fix queue. Resolve with `/qrspi:followup add-auto-mode`. Archived with the
> change; every box should be ticked before archival.

- [ ] **Live-runtime dogfood gap.** Slice checkpoints 1.4, 2.5, 2.6, and 3.5 were
  static-verified only (the installed plugin runs the tagged release, not this
  branch's `claude/` tree). Cut a prerelease tag (e.g. `v0.5.0-rc.1`) or establish
  a symlink/dev-install path so the feature-branch command bodies can be exercised
  in a real Claude Code session: Full auto (Q→PR), Semi-auto (boundary pauses),
  and a forced hard-stop (git-push failure; a failing-lint slice not committed).
  (source: PR review)
- [ ] **`implement.md` ↔ `backlog.md` status-line convention drift.** `implement.md`
  references `Status:` and `Next QRSPI command:` body lines, but
  questioner-generated backlog rows use a `### <id> — <status-in-backticks>`
  heading format. Align either the instruction wording or the questioner's row
  template so a Full-auto run does not produce confusing no-op backlog edits.
  (source: PR review; predates this change)
- [ ] **"Materially diverges" rubric for execution-stage subagents.** Hard-stop
  condition (4) — implementation/structure materially diverging from the approved
  `design.md`/spec — is a semantic self-assessment. Add a concrete divergence
  rubric to the architect, planner, and implementer contracts so the bar is
  explicit and the signal fires reliably. (source: PR review / design Risks)
- [ ] **`lint-auto-mode-gate-coverage` — decide priority.** Accepted into the
  backlog as an `idea` at stage D (a structural lint asserting every stage command
  references the run-mode procedure). Confirm priority in the next planning
  session. (source: PR review)
