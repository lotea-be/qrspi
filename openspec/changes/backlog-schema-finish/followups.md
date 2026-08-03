# Follow-ups -- backlog-schema-finish

> Post-PR fix queue. Resolve with `/qrspi:followup backlog-schema-finish`. Archived with the
> change; every box should be ticked before archival.

- [ ] **Confirm the `(human)` runtime checkpoints in a live `--plugin-dir` session.** Tasks 1.7, 3.7, 4.8, 5.8, and 6.5 are marked Confirm-done in `tasks.md`, but each exercises runtime behaviour (migration dispatcher idempotency/anchor-fallback, the `/qrspi:idea` interview, the `backlog-writer` delegation at each capture site, and the Q-stage orchestrator-level offer) that the static lint cannot verify. Before archival, confirm each was observed to pass in a throwaway consumer fixture via `claude --plugin-dir /workspaces/git/qrspi` (see the `qrspi-dogfood` skill), or drop this item if the ticks already reflect observed passes. (source: PR review)
