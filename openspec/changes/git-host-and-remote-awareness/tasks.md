# Tasks — git-host-and-remote-awareness

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Centralized resolver, with-remote path

**Compute:** effort=medium model=sonnet — the skill's shape (a lookup table
plus ordered derivation steps) mirrors the pre-existing inline detector
already in `archive.md`, just lifted into a shared file; the main risk is
preserving GitLab coverage exactly, which is a checklist correctness task,
not novel design.

- [x] 1.1 Author `claude/skills/git-host-workflow/SKILL.md` codifying the
      four-step procedure (remote-presence check, vendor resolution,
      branch-slot resolution, no-remote menu) as pure derivation text — no
      `AskUserQuestion`, no bare git/host-CLI invocation in the skill body
      itself. Satisfies "Shared skill centralizes vendor, remote, and
      branch-slot resolution", "Vendor resolution is cheatsheet-override-first,
      else live-derived", "Vendor coverage spans GitHub, Azure DevOps, and
      GitLab", and "Branch-slot resolution reads named feature/archive slots"
      from the `git-host-workflow` spec.
- [x] 1.2 Extend `.claude/skills/qrspi-stack/SKILL.md`'s `## PR & git
      workflow` block with the `Branch naming` sub-block (`feature`/`archive`
      slots) and update the `/qrspi:stack` interview to collect it, as the
      per-repo data source the skill reads.
- [x] 1.3 Update `claude/commands/pr.md` to replace any inline
      vendor-resolution logic with `Load skill git-host-workflow` and follow
      its lookup table for PR-create/PR-status commands.
- [x] 1.4 Update `claude/commands/archive.md` to replace the hardcoded
      `chore/archive-<id>` branch literal and inline host inference with the
      skill's `archive` slot and vendor resolution ("Host CLI and
      status-query command are resolved host-agnostically", "The archive
      commit target is proposed" from the `archive-workflow` delta spec).
- [x] 1.5 Update `claude/commands/questions.md` step 2 to resolve the feature
      branch name via the skill's `feature` slot instead of a literal
      `features/<id>`.
- [x] 1.6 Register both commands in `scripts/skill-sets.mjs`:
      `pr: ['git-host-workflow']` and `archive: ['git-host-workflow']` in
      `COMMAND_SKILL_SET_EXPECTED`, per the `ci-quality-gates` delta spec's
      "Command skill-set registry covers pr and archive git-host-workflow
      loads" requirement.
- [x] 1.7 Checkpoint (automated): run `node scripts/lint.mjs`; Check 2 (the
      `checkSkillSets` registry assertion) reports no `[skill-sets]`
      violation for `pr` or `archive`.
- [ ] 1.8 Checkpoint (human, dogfood): in a fresh terminal, run `claude
      --plugin-dir /workspaces/git/qrspi` against a throwaway GitHub-remote
      fixture (outside this repo); run `/qrspi:pr` and `/qrspi:archive` far
      enough to reach the vendor-resolution step and confirm the resolved
      CLI is `gh` with no behavior change versus the pre-change flow. Since
      `az`/`glab` are not installed in this environment, verify Azure/GitLab
      coverage by reading `claude/skills/git-host-workflow/SKILL.md`'s lookup
      table directly against the spec's three scenarios (cheatsheet override,
      live-derive from `azure-pipelines.yml`/`.gitlab-ci.yml`, default-to-`gh`)
      rather than a live CLI run.

## 2. No-remote local-only flow

**Compute:** effort=high model=opus — this is the change's first-of-kind
pattern (branching three independent command bodies on live `git` state,
a human-confirmed merge-back with real conflict handling, and a
non-obvious boundary against the pre-existing "no linked PR" archive
bailout that the spec explicitly requires stays unconflated) — the kind of
subtle-edge-case, cross-file coordination the `vertical-slice` skill's
opus heuristics call out, not a templated mirror of existing code.

- [x] 2.1 Wire the live `git remote` presence check into the
      `git-host-workflow` skill ahead of every push, per "Remote presence is
      checked live and gates every push site" and "No-remote menu offers the
      full local menu minus push, plus merge-back" from the
      `git-host-workflow` spec.
- [x] 2.2 Wire the skill's remote-presence check into `claude/commands/questions.md`
      step 2's push path so a remoteless repo branches to the no-remote
      `AskUserQuestion` menu (local branch / patch file / commit-to-current —
      no push option) instead of attempting `git push`.
- [x] 2.3 Wire the skill's remote-presence check into `claude/commands/pr.md`'s
      PR-create step with the same no-remote branching.
- [x] 2.4 Wire the skill's remote-presence check into `claude/commands/archive.md`'s
      archive-push step, applying the "Archive push site is gated by the
      shared no-remote check" and updated "The archive commit target is
      proposed" requirements from the `archive-workflow` delta spec
      (no-remote skips "new branch + push", offers "commit straight to main"
      + the local menu; remote-present behavior is unchanged from Slice 1).
      Keep this branch visibly distinct from the pre-existing "no linked PR"
      hard-block.
- [x] 2.5 Implement the human-confirmed local `git merge` back into the
      default branch for the local-branch and commit-to-current no-remote
      paths; a merge conflict stops and hands the working tree to the human
      rather than auto-resolving.
- [x] 2.6 Update orchestrator run-mode handling to apply "No-remote gating
      applies to push-based auto-advance in Full and Semi-auto mode" and the
      modified "PR-create is auto-executed in Full and Semi-auto mode"
      requirement from the `qrspi-run-mode` delta spec: no hard-stop on
      no-remote during Full/Semi-auto, but the merge-back `AskUserQuestion`
      is never auto-advanced.
- [ ] 2.7 Checkpoint (human, dogfood): in a fresh terminal, run `claude
      --plugin-dir /workspaces/git/qrspi` against a throwaway scratch repo
      with no configured git remote (build it under the scratchpad, never
      inside this repo). Walk `questions.md` step 2: confirm the
      three-option no-remote menu appears with no push choice. Choose
      local-branch, complete the flow, and confirm the human-confirmed
      merge-back offer appears and a plain `git merge` (not forced
      fast-forward) runs only after confirmation. Force a merge conflict and
      confirm the command stops and leaves the conflicted tree rather than
      auto-resolving. Separately, on the same fixture, run through
      `archive.md`'s commit-target step and confirm "new branch + push" is
      absent while "commit straight to main" and the local menu are offered,
      and that this is visibly distinct from the "no linked PR" hard-block
      (test the latter separately on a with-remote fixture that has no
      `pr.md`). Finally, drive a Full-auto-mode run on the remoteless
      fixture and confirm it does not hard-stop at the push step, yet still
      pauses for the merge-back `AskUserQuestion`.

## 3. Legacy-cheatsheet fallback + migration

**Compute:** effort=medium model=sonnet — the migration YAML follows the
established schema shared by the kit's existing manifests, and the
prompt-once/write-back logic mirrors the "ask once, write back" pattern
already used elsewhere in the kit (e.g. cheatsheet field prompts); moderate
reasoning, not a first-of-kind pattern.

- [ ] 3.1 Implement "Missing branch-naming field prompts once and writes
      back" from the `git-host-workflow` spec in the skill and its call
      sites: prompt-once via `AskUserQuestion` when a call site first needs a
      missing value, offer to write the answer back into the cheatsheet's
      `## PR & git workflow` block, and continue the run using the supplied
      value without re-prompting later in the same run.
- [ ] 3.2 Author a `manual` migration step in `migrations/0.14.0.yaml`
      describing the new `Branch naming` sub-block / no-remote posture and
      instructing existing consumers to re-run `/qrspi:stack` or hand-add the
      field (no `automated` step, since the block is free-form prose with no
      reliable `edit-file` anchor), per the proposal's "Migrations: yes"
      impact line.
- [ ] 3.3 Update `README.md`'s PR/archive-flow section to document the
      `git-host-workflow` skill, the `feature`/`archive` branch-naming
      slots, and the no-remote local flow (CLAUDE.md README-currency
      obligation — this slice is where the full feature first exists to
      document).
- [ ] 3.4 Checkpoint (automated): run `node scripts/lint.mjs`; all checks
      report `OK`, including the migration-manifest schema/pin checks
      against the new `migrations/0.14.0.yaml` entry.
- [ ] 3.5 Checkpoint (human, dogfood): in a fresh terminal, run `claude
      --plugin-dir /workspaces/git/qrspi` against a throwaway consumer
      fixture (built under the scratchpad) whose stack-cheatsheet
      `## PR & git workflow` block predates the `Branch naming` sub-block;
      run `/qrspi:archive` far enough to reach the point where the `archive`
      slot is needed and confirm exactly one `AskUserQuestion` prompt
      appears, the write-back offer is presented, and no second prompt
      appears later in the same run. Separately, run `/qrspi:update` on a
      similarly aged fixture and confirm the manual migration step surfaces
      the Branch-naming/no-remote guidance to the human.
