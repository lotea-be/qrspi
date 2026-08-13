# Slices — git-host-and-remote-awareness

> Stage V of QRSPI. Generated 2026-08-13.
> Vertical slices, not horizontal layers.

## Overview

This is a kit-tooling change: no data-store, http-api, ui, or auth surface is
present (per `repo-surface` — this repo ships `slash-command`, `stage-agent`,
`skill`, `lint-gate`, `template`, and `migration-manifest` surfaces only). The
canonical M/F/D/T ladder is replaced with Skill/Command/Registry/Migration
bullets, each ending in a verifiable outcome: a `node scripts/lint.mjs` pass,
or a `(human)` dogfood observation in a `claude --plugin-dir` session (the
kit's `run` skill / `qrspi-dogfood` pattern) — vendor detection, the no-remote
branch, the merge-back confirmation, and the legacy-fallback prompt are all
runtime behaviors no static check can exercise.

The three slices below are exactly the proposal's "Vertical slices preview"
phasing, each independently demoable and each strictly additive on top of the
last: Slice 1 stands up the shared skill and rewires the with-remote path
(behavior-preserving on GitHub, newly-correct on Azure/GitLab); Slice 2 adds
the no-remote branch that Slice 1's call sites already gate on structurally;
Slice 3 adds the legacy-cheatsheet fallback and the migration that lets
existing consumer repos pick the feature up.

**On `(D<n>)` tags:** this stage's read contract is `proposal.md` + `specs/`
only (not `design.md`); neither of those two artifacts carries numbered
`D<n>` decision citations for this change (unlike some other changes in this
repo's history), so there is no numbered design decision visible in scope to
tag. Bullets below instead cite the specific spec requirement they implement
by name, which is the equivalent traceability anchor available at this stage.

## Slices

### Slice 1 — Centralized resolver, with-remote path

**Deliverable:** the new `claude/skills/git-host-workflow/SKILL.md` exists
and codifies the four-step procedure (remote-presence check, vendor
resolution, branch-slot resolution, no-remote menu) as pure derivation text —
no `AskUserQuestion`, no bare git/host-CLI invocation in the skill body
itself. `claude/commands/pr.md` and `claude/commands/archive.md` load it and
resolve vendor + branch name through it instead of inline detection or a
hardcoded `chore/archive-<id>` literal; `claude/commands/questions.md` step 2
resolves its branch name via the skill's `feature` slot. The stack-cheatsheet
`## PR & git workflow` block gains the `Branch naming` sub-block as the data
source the skill reads. `scripts/skill-sets.mjs` registers both commands in
`COMMAND_SKILL_SET_EXPECTED`. On a GitHub repo, end-to-end behavior is
byte-for-byte unchanged; Azure and GitLab repos now resolve to `az repos` /
`glab` through the same shared path (no per-command duplication). The
no-remote branch (step 4 of the skill's procedure) is written but not yet
wired to any push call site — that wiring is Slice 2.

- Skill: author `claude/skills/git-host-workflow/SKILL.md` — satisfies
  "Shared skill centralizes vendor, remote, and branch-slot resolution",
  "Vendor resolution is cheatsheet-override-first, else live-derived",
  "Vendor coverage spans GitHub, Azure DevOps, and GitLab", and
  "Branch-slot resolution reads named feature/archive slots" from the
  `git-host-workflow` spec.
- Command: `claude/commands/pr.md` — replace any inline vendor-resolution
  logic with `Load skill git-host-workflow` and follow its lookup table for
  PR-create/PR-status commands.
- Command: `claude/commands/archive.md` — replace the hardcoded
  `chore/archive-<id>` branch literal and inline host inference with the
  skill's `archive` slot and vendor resolution ("Host CLI and status-query
  command are resolved host-agnostically", "The archive commit target is
  proposed" from the `archive-workflow` delta spec).
- Command: `claude/commands/questions.md` step 2 — resolve the feature branch
  name via the skill's `feature` slot instead of a literal `features/<id>`.
- Registry: `scripts/skill-sets.mjs` — add `pr: ['git-host-workflow']` and
  `archive: ['git-host-workflow']` to `COMMAND_SKILL_SET_EXPECTED`, per the
  `ci-quality-gates` delta spec's "Command skill-set registry covers pr and
  archive git-host-workflow loads" requirement. This is the static gate:
  `node scripts/lint.mjs` Check 2 (the `checkSkillSets` registry assertion,
  the same check that validates the `idea` command's `backlog-writer` load)
  fails non-zero if either command body drops the `Load skill
  git-host-workflow` reference.
- Cheatsheet: extend `## PR & git workflow` with the `Branch naming`
  sub-block (`feature`/`archive` slots) in `.claude/skills/qrspi-stack/SKILL.md`
  and the `/qrspi:stack` interview, as the per-repo data source Slice 1's
  skill reads.
- Tests: `node scripts/lint.mjs` — Check 2 passes with both registry entries
  and both command bodies carrying the load reference; `(human)` dogfood
  checkpoint below covers the live resolution behavior.
- **Compute:** effort=medium model=sonnet — the skill's shape (a lookup table
  plus ordered derivation steps) mirrors the pre-existing inline detector
  already in `archive.md`, just lifted into a shared file; the main risk is
  preserving GitLab coverage exactly, which is a checklist correctness task,
  not novel design.
- Checkpoint (automated): run `node scripts/lint.mjs`; Check 2 reports no
  `[skill-sets]` violation for `pr` or `archive`.
- Checkpoint (human, dogfood): in a fresh terminal, run `claude --plugin-dir
  /workspaces/git/qrspi` against a throwaway GitHub-remote fixture (outside
  this repo); run `/qrspi:pr` and `/qrspi:archive` far enough to reach the
  vendor-resolution step and confirm the resolved CLI is `gh` with no
  behavior change versus the pre-change flow. Since `az`/`glab` are not
  installed in this environment, verify Azure/GitLab coverage by reading
  `claude/skills/git-host-workflow/SKILL.md`'s lookup table directly against
  the spec's three scenarios (cheatsheet override, live-derive from
  `azure-pipelines.yml`/`.gitlab-ci.yml`, default-to-`gh`) rather than a live
  CLI run.

### Slice 2 — No-remote local-only flow

**Deliverable:** every push site (`questions.md` step 2, `pr.md`'s PR-create
step, `archive.md`'s archive-push step) now runs the skill's live `git
remote` check before pushing. The no-remote consequence differs by push-site
kind (amended 2026-08-13 per dogfood finding): at `questions.md` step 2 (the
branch-creation site, no work yet) a no-remote repo simply skips the push,
records local-only, and continues — no disposition menu. At the completion
push sites (`pr.md` PR-create, `archive.md` archive-push, where the work
exists) the site branches to the
no-remote `AskUserQuestion` menu (local branch / patch file /
commit-to-current — no push option) instead of attempting `git push`; the
local-branch and commit-to-current paths additionally offer a
human-confirmed local `git merge` back into the default branch, and a merge
conflict stops and hands the working tree to the human rather than
auto-resolving. `archive.md`'s commit-target proposal step specifically
substitutes "commit straight to main" + the no-remote menu for the
"new branch + push" option when no remote is configured, and stays distinct
from the pre-existing "no linked PR" hard-block. Additionally (amended
2026-08-13 per dogfood finding #2), `archive.md`'s **step-3 PR-merge gate**
runs the same live remote check first: a local-only (no-remote) change has no
`pr.md` to verify, so archive skips the PR-merge gate for it and routes to the
local archive — without this the no-remote flow was un-archivable and the
step-5 no-remote wiring unreachable. The orchestrator's Full/Semi-auto
run mode auto-follows the no-remote flow at push-based auto-advance steps
without treating the absent push as a hard-stop, while the merge-back
confirmation itself remains human-gated even in Full auto. This is fully
demoable in a remoteless scratch repo end-to-end.

- Command: `git-host-workflow` skill and its three call sites
  (`questions.md` step 2, `pr.md`, `archive.md`) — wire the live
  remote-presence check ahead of every push, per "Remote presence is checked
  live and gates every push site" and "No-remote menu offers the full local
  menu minus push, plus merge-back" from the `git-host-workflow` spec.
- Command: `claude/commands/archive.md` — apply the "Archive push site is
  gated by the shared no-remote check" and updated "The archive commit
  target is proposed" requirements from the `archive-workflow` delta spec
  (no-remote skips "new branch + push", offers "commit straight to main" +
  the local menu; remote-present behavior is unchanged from Slice 1).
- Command: orchestrator run-mode handling — apply "No-remote gating applies
  to push-based auto-advance in Full and Semi-auto mode" and the modified
  "PR-create is auto-executed in Full and Semi-auto mode" requirement from
  the `qrspi-run-mode` delta spec: no hard-stop on no-remote during
  Full/Semi-auto, but the merge-back `AskUserQuestion` is never auto-advanced.
- Tests: `(human)` dogfood checkpoint below — no static check can exercise
  live remote absence, the three-option menu, the merge-back confirmation,
  or conflict handling.
- **Compute:** effort=high model=opus — this is the change's first-of-kind
  pattern (branching three independent command bodies on live `git` state,
  a human-confirmed merge-back with real conflict handling, and a
  non-obvious boundary against the pre-existing "no linked PR" archive
  bailout that the spec explicitly requires stays unconflated) — the kind of
  subtle-edge-case, cross-file coordination the `vertical-slice` skill's
  opus heuristics call out, not a templated mirror of existing code.
- Checkpoint (human, dogfood): in a fresh terminal, run `claude --plugin-dir
  /workspaces/git/qrspi` against a throwaway scratch repo with no configured
  git remote (build it under the scratchpad, never inside this repo). Walk
  `questions.md` step 2: confirm the three-option no-remote menu appears
  with no push choice. Choose local-branch, complete the flow, and confirm
  the human-confirmed merge-back offer appears and a plain `git merge` (not
  forced fast-forward) runs only after confirmation. Force a merge conflict
  and confirm the command stops and leaves the conflicted tree rather than
  auto-resolving. Separately, on the same fixture, run through `archive.md`'s
  commit-target step and confirm "new branch + push" is absent while
  "commit straight to main" and the local menu are offered, and that this is
  visibly distinct from the "no linked PR" hard-block (test the latter
  separately on a with-remote fixture that has no `pr.md`). Finally, drive a
  Full-auto-mode run on the remoteless fixture and confirm it does not
  hard-stop at the push step, yet still pauses for the merge-back
  `AskUserQuestion`.

### Slice 3 — Legacy-cheatsheet fallback + migration

**Deliverable:** a project whose stack-cheatsheet predates the `Branch
naming` sub-block (or lacks a no-remote posture note) gets prompted exactly
once via `AskUserQuestion` when a call site first needs the missing value,
with an offer to write the answer back into the cheatsheet's `## PR & git
workflow` block; the run continues using the supplied value without
re-prompting later in the same run. `migrations/0.14.0.yaml` gains a
`manual` migration step describing the new sub-block / no-remote posture and
instructing existing consumers to re-run `/qrspi:stack` or hand-add the
field (no `automated` step, since the block is free-form prose with no
reliable `edit-file` anchor). `README.md` is updated to describe the new
skill, the branch-naming slots, and the no-remote flow, satisfying the
CLAUDE.md README-currency rule for a new skill + changed PR-flow prose. This
is demoable against a pre-change cheatsheet fixture and a `/qrspi:update` run.

- Command: `git-host-workflow` skill + its call sites — implement "Missing
  branch-naming field prompts once and writes back" from the
  `git-host-workflow` spec (prompt-once via `AskUserQuestion`, offer
  write-back, no re-prompt within the same run).
- Migration: author the `manual` step in `migrations/0.14.0.yaml` describing
  the `Branch naming` sub-block / no-remote posture and the re-run-`/qrspi:stack`
  guidance, per the proposal's "Migrations: yes" impact line.
- Docs: update `README.md`'s PR/archive-flow section to document the
  `git-host-workflow` skill, the `feature`/`archive` branch-naming slots, and
  the no-remote local flow (CLAUDE.md README-currency obligation — this
  slice is where the full feature first exists to document).
- Tests: `node scripts/lint.mjs` — the migration-manifest schema and pin
  checks stay green; `(human)` dogfood checkpoint below covers the live
  fallback-prompt and `/qrspi:update` paths, which no static check reaches.
- **Compute:** effort=medium model=sonnet — the migration YAML follows the
  established schema shared by the kit's existing manifests, and the
  prompt-once/write-back logic mirrors the "ask once, write back" pattern
  already used elsewhere in the kit (e.g. cheatsheet field prompts); moderate
  reasoning, not a first-of-kind pattern.
- Checkpoint (automated): run `node scripts/lint.mjs`; all checks report
  `OK`, including the migration-manifest schema/pin checks against the new
  `migrations/0.14.0.yaml` entry.
- Checkpoint (human, dogfood): in a fresh terminal, run `claude --plugin-dir
  /workspaces/git/qrspi` against a throwaway consumer fixture (built under
  the scratchpad) whose stack-cheatsheet `## PR & git workflow` block
  predates the `Branch naming` sub-block; run `/qrspi:archive` far enough to
  reach the point where the `archive` slot is needed and confirm exactly one
  `AskUserQuestion` prompt appears, the write-back offer is presented, and no
  second prompt appears later in the same run. Separately, run `/qrspi:update`
  on a similarly aged fixture and confirm the manual migration step surfaces
  the Branch-naming/no-remote guidance to the human.
