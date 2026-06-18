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

### kit-quality-hardening — `proposed (change folder created 2026-06-18)`

**Next QRSPI command:** `/qrspi:implement kit-quality-hardening`


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
