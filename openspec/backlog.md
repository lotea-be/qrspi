# Backlog

Candidate changes for this repo, tracked before they enter the QRSPI flow
(Q → R → D → S → V → P → I → PR). Status is one of `idea` / `proposed` /
`in-progress` / `merged`. Completed work lives under
`openspec/changes/archive/`, not here.

## Ideas

### repo-branch-protection — `idea`

**Why:** The CI gates added by `kit-quality-hardening` are only advisory until
the `main` branch requires them; a `CODEOWNERS` file would also route reviews.
Deferred from `kit-quality-hardening` as a separate governance concern (its Q7).
**Fresh evidence (2026-06-19):** PR #5 merged while its CI run was still
`UNSTABLE` — confirming `main` has no required checks today. Pair this with the
new `release.yml` so a tag can't publish on a red build either.

### verify-stage-gate-execution — `idea`

**Why:** Commands set `agent: <subagent>` + `subtask: true` yet their bodies run
the AskUserQuestion commit/handoff and invoke the next stage, while the subagents'
toolsets exclude AskUserQuestion/Agent. **CONFIRMED (2026-06-19) by the
`reconcile-plan-worktree-order` dogfood run:** every human gate fired only
because the *orchestrator* (main loop) ran it — the `questioner`/`researcher`/
`reviewer` subagents could not have prompted the human under the real
`agent:`-frontmatter path. So this is no longer "verify whether"; it is "fix the
architecture": either move the choreography out of the subagent's responsibility
into the command/orchestrator explicitly, or grant the gate tools. Highest-
priority correctness item.

### enforce-research-ticket-hiding — `idea`

**Why:** Ticket-hiding (the source's most important rule) is enforced only by
telling the researcher not to open `questions.md`, though it has Read on the whole
repo -- the "persona, not mechanism" anti-pattern `context-hygiene` itself warns
against. Consider a mechanical guard.

### reassess-copilot-port — `idea`

**Why:** The Copilot half drops the core QRSPI mechanisms (subagent orchestration,
per-slice model, skill auto-load) the source calls the whole point, leaving a
checklist. Weigh relabeling it a "lite" companion against the ongoing
sync/maintenance tax.

### reassess-openspec-dependency — `idea`

**Why:** The source only asks to "persist to disk," but the kit pins an external
OpenSpec CLI (npx, a version pin spread across files, a CI lint to police it) to
gain `openspec validate` on the delta specs. (`openspec/specs/` is now populated
as of the 2026-06-19 archives, so the validated surface is real — re-weigh the
dependency against a vendored folder convention + a small validator with that in
mind.)

### simplify-per-slice-model-selection — `idea`

**Why:** Per-slice model intent is endorsed by the source, but the mechanism (the
architect writes a markdown `**Model:**` annotation; the implementer self-halts and
asks to be re-invoked when on the wrong model) is fragile and breaks on Copilot.
Consider a simpler lever or a single implement-stage model.
