# Backlog

Candidate changes for this repo, tracked before they enter the QRSPI flow
(Q → R → D → S → P → W → I → PR). Status is one of `idea` / `proposed` /
`in-progress` / `merged`. Completed work lives under
`openspec/changes/archive/`, not here.

## Ideas

### repo-branch-protection — `idea`

**Why:** The CI gates added by `kit-quality-hardening` are only advisory until
the `main` branch requires them; a `CODEOWNERS` file would also route reviews.
Deferred from `kit-quality-hardening` as a separate governance concern (its Q7).

### reconcile-plan-worktree-order — `proposed (change folder created 2026-06-19)`

**Next QRSPI command:** `/qrspi:research reconcile-plan-worktree-order`

**Why:** The kit runs S -> W -> P (slices defined in a dedicated Worktree stage,
before Plan), but the cited QRSPI source runs S -> P -> Work Tree with slices
defined at Structure; this file's own header even lists `P -> W`.

**Resolved scope (Q answers):** Collapse to **two** stages — fold the
vertical-slice plan into S, keep P (read-only planner) for `tasks.md`; remove the
Worktree stage/agent/artifact and its two gates. Stage set becomes
**Q R D S P I PR (7)**. Absorbs `rename-worktree-stage` (moot) and
`clarify-qrspi-acronym` (one-line note). Keep the "Crispy" acronym, update
"eight stages" prose to seven. Migrate `example-greeting` **and**
`kit-quality-hardening` to the new set (all PRs merged).

### rename-worktree-stage — `idea (folded into reconcile-plan-worktree-order)`

**Why:** The "Worktree" stage/artifact has nothing to do with git worktrees (a
real Claude Code feature). **Mooted by `reconcile-plan-worktree-order`** (PQ2):
the collapse removes the Worktree stage entirely, so there is nothing left to
rename. Closed here; tracked in that change.

### clarify-qrspi-acronym — `idea (folded into reconcile-plan-worktree-order)`

**Why:** "QRSPI" names only 5 of the stages. **Absorbed by
`reconcile-plan-worktree-order`** (PQ2/PQ3): after the collapse, Q-R-S-P-I are all
real stages (only D and PR sit outside), and that change adds the one-line
"acronym is a lineage nod / Crispy" note. Closed here; tracked in that change.

### verify-stage-gate-execution — `idea`

**Why:** Commands set `agent: <subagent>` + `subtask: true` yet their bodies run
the AskUserQuestion commit/handoff and invoke the next stage, while the subagents'
toolsets exclude AskUserQuestion/Agent. Confirm end-to-end that the human
commit/handoff gates actually fire, and in whose context, before trusting the
choreography.

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
gain `openspec validate` on the single validated artifact (`specs/`). Re-evaluate
whether the dependency earns its tax vs a vendored folder convention + a small
validator.

### simplify-per-slice-model-selection — `idea`

**Why:** Per-slice model intent is endorsed by the source, but the mechanism (the
architect writes a markdown `**Model:**` annotation; the implementer self-halts and
asks to be re-invoked when on the wrong model) is fragile and breaks on Copilot.
Consider a simpler lever or a single implement-stage model.

### kit-quality-hardening — `in-progress (Q, R, D, S, W, P, I complete; PR #1 open — https://github.com/lotea-be/qrspi/pull/1)`

**Next QRSPI command:** `archive after merge`


**Why:** The kit's core invariant — "`copilot/` is generated, never hand-edited,
always in sync" — is enforced only by convention, and at v0.1.0 it has no CI, no
governance docs, and duplicated stage choreography. This change converts
"correctness depends on a human remembering" into mechanical guarantees and pays
down the duplication. Scope = the top-10 review (below); Q/D/S will split or
sequence it as needed.

**Scope — review findings (ranked by impact):**
1. **CI to enforce sync drift + lint** — Action runs `node sync-copilot.mjs --check`
   (must report `0 file(s) differ`) on every PR; second job validates
   agent/command/skill frontmatter and that referenced names resolve.
2. **Single-source the OpenSpec version pin** — `1.4.1` is hardcoded in ~10
   places; README claims "two coupled places" (false) and its bump steps point
   at `claude/commands/qrspi:init.md`, which was renamed to
   `claude/commands/init.md`. Define once; fix README.
3. **DRY the 8-stage command choreography** — `questions…pr.md` repeat the same
   branch→precondition→invoke→backlog→commit dance; factor the shared parts into
   one referenced skill.
4. **Factor the repeated "Load skills" preamble** into a single `qrspi-workflow`
   bootstrap step (duplicated across 5+ agents).
5. **Port + harden the generator** — replace the old PowerShell generator with
   `sync-copilot.mjs` (Node ESM, no deps); validate `claude/` exists before
   wiping `copilot/`; `try/finally` to clean the `--check` temp tree; warn
   (don't silently skip) on a skill dir missing `SKILL.md`; per-line diff in
   `--check`.
6. **Governance: versioning + CONTRIBUTING + CHANGELOG** — plugin versioning
   already exists (`plugin.json` `version`, marketplace `update`); add the
   process around it: semver discipline, a `CHANGELOG.md`, and a rule tying the
   plugin version + OpenSpec pin together. Surface CLAUDE.md's contributor rules
   in `CONTRIBUTING.md`.
7. **Unify precondition checks + error-recovery messaging** — always `Glob` the
   required input; shared "missing artifact X → run `/qrspi:<stage>`" table.
8. **Least-privilege tool audit on agents** — trim unused `Edit`/`Bash` grants;
   `qrspi-reviewer` is the lean model. (Note: researcher/planner/questioner
   legitimately keep `Write` to author their artifact.)
9. **Ship a reference example change** under `openspec/changes/archive/` — doubles
   as docs and as a CI fixture validating the templates via `openspec validate`.
10. **Centralize the artifact skeletons** — canonical shapes live in 3 places
    (agent inline, `openspec-templates/`, per-repo seed); pick one source of
    truth or add a check that the copies match.
11. **Trim the redundant OpenSpec native surface** — the 5 `opsx:*` commands run
    a workflow parallel to QRSPI (`opsx:propose` even bypasses the human design
    gate). Drop the 5 opsx commands plus the 3 orphaned skills they back
    (`openspec-propose`, `openspec-explore`, `openspec-apply-change`); keep the
    3 load-bearing ones (`openspec-workflow`, `openspec-archive-change`,
    `openspec-sync-specs`). Ensure the removal survives `openspec update`/`init`
    regeneration (prune in the init flow, not just delete the files).
