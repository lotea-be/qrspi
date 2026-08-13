# Questions — git-host-and-remote-awareness

> Stage Q of QRSPI. Generated 2026-08-13.
> Change summary: Make git-remote/vendor detection and PR mechanics a shared,
> single-sourced concern (skill and/or stack-cheatsheet `## PR & git workflow`
> block) that `/qrspi:pr` and `/qrspi:archive` both reuse instead of each
> re-deriving the host CLI, add an explicit no-remote local-only flow, and
> fold the feature- and archive-branch naming schemes into the same block.

<!-- Surface-gated sections: emit each section below only when its
     controlling surface is present for this repo, per the repo-surface
     skill mapping. Omit the heading entirely when the surface is absent
     (no heading, no "Not applicable"). Surface-independent sections
     (Testing, Sequencing & scope, Open product questions) always appear.

     Surfaces present (from qrspi-stack ## Repo surface):
       slash-command  -> ## Slash-command surface
       stage-agent    -> ## Stage-agent surface (not touched by this change --
                          omitted below since it carries no content)
       skill          -> ## Skill surface
       lint-gate      -> ## Lint-gate surface
       template       -> ## Stack-cheatsheet template surface
       migration-manifest -> ## Migration manifest

     data-store, http-api, ui, auth are absent -- their sections are omitted.
-->

## Slash-command surface

1. `claude/commands/pr.md`'s PR-create step (lines ~228-243) names the host
   CLI generically ("the host CLI named in its stack-cheatsheet -- e.g. `gh
   pr create` or `az repos pr create`") but has no explicit detection logic
   of its own -- it relies on the human/agent reading the stack-cheatsheet
   `## PR & git workflow` block. `archive.md` step 3, by contrast, has an
   inline multi-signal **detection** algorithm ("a GitHub remote or a
   `.github/` directory selects `gh`; `azure-pipelines.yml` selects `az
   repos`; `.gitlab-ci.yml` selects `glab`; default to `gh`"). Should the
   centralized resolver keep `archive.md`'s signal-based auto-detection, or
   should it instead trust the stack-cheatsheet's declared vendor field as
   the source of truth (falling back to signal detection only when the
   cheatsheet has no `## PR & git workflow` block yet, e.g. on a repo that
   hasn't run `/qrspi:stack`)?

2. `pr.md`'s PR-create step assumes a remote always exists and a push has
   already happened earlier in the flow (implicitly, since the change's
   feature branch was pushed at `/qrspi:questions` step 2 via `git push -u
   origin <branch>`). If this change adds an explicit remote-presence check,
   where does it first need to run -- only at `/qrspi:pr`'s PR-create step,
   or does `questions.md` step 2's unconditional `git push -u origin
   <branch>` also need gating (since that is the earliest point a
   remoteless repo would currently fail)?

3. `archive.md` step 3 already contains a "no linked PR" bailout path (skip
   step 4a, go straight to the folder move) for the case where the change
   was never pushed as a PR. Does the new no-remote detection subsume or
   sit alongside that existing bailout -- i.e. is "no remote configured"
   a distinct condition from "no PR was ever opened for this change," or
   should they collapse into one code path?

4. `archive.md` step 5 offers three choices today: "New branch + push",
   "Commit straight to main" (unclear from the excerpt whether a third,
   already-on-a-branch case exists), plus an implicit local-only
   possibility this change would add. Does the no-remote local-only flow
   replace the AskUserQuestion's option set entirely when no remote is
   detected (so the human is never offered "New branch + push" against a
   remote that doesn't exist), or does it stay a full three/four-way menu
   with the remote-requiring choices grayed out / annotated?

5. Both `pr.md` and `archive.md` currently print the PR-create/PR-status
   commands as a literal fenced code block with the host CLI hardcoded
   inline (e.g. `gh pr create`, `az repos pr create`, `git push -u origin
   chore/archive-<id>`). After centralization, do these files keep their
   own fenced-example blocks (now sourced from the shared skill's output),
   or do they replace the inline examples with a "see skill `<name>` for
   the exact invocation" pointer, avoiding duplicate prose that could drift
   from the skill?

## Skill surface

6. Should the vendor/remote-detection logic live in (a) a new dedicated
   kit skill (e.g. `claude/skills/git-host-workflow/SKILL.md`) that both
   `pr.md` and `archive.md` load, (b) purely as an expanded
   `## PR & git workflow` block in the stack-cheatsheet template with no
   new skill (each command reads the block directly, as `pr.md` already
   does), or (c) both -- a skill that codifies *how to derive/read* the
   block, plus the block itself as the *data* the skill's instructions
   consume? (This determines whether `scripts/skill-sets.mjs`, which
   registers which skills each command/agent loads, needs a new entry.)

7. If a new shared skill is created, what is its precise scope --
   vendor detection only, or does it also own the branch-naming
   resolution (feature-branch pattern + archive-branch pattern) and the
   no-remote local-only flow, making it a single "PR & git workflow"
   skill that both commands load for everything git-host-related?

8. The existing `backlog-writer` skill is a precedent for "a shared
   procedure command bodies load rather than re-deriving." Should the new
   skill (if any) follow that same shape -- a step-by-step procedure the
   calling command's AskUserQuestion / Bash invocations follow inline --
   or is a lighter "reference doc" skill (no numbered procedure, just a
   lookup table of vendor -> CLI -> commands) more appropriate here, given
   the actual git/gh invocations still happen in the calling command body
   (main-loop only, per the gate-tool/executor agreement Check 5)?

## Stack-cheatsheet template surface

9. The current `## PR & git workflow` block (see `.claude/skills/qrspi-stack/
   SKILL.md`) has these fields: `Git host`, `PR creation`, `PR status
   query`, `Source-branch naming`, `Default target branch`, `Version-bump
   and release`. This change adds at least an **archive-branch naming**
   field and (per the idea) a **no-remote** posture. What is the full field
   list after this change -- e.g. does `Git host` become `Git host / no
   remote configured` as an explicit third state, or is remote-presence a
   separate boolean the resolver checks live (via `git remote -v`) rather
   than a static cheatsheet field (since remote presence can change between
   sessions, unlike vendor identity)?

10. `/qrspi:stack` (the skill's bootstrap/refresh command) is what
    populates the `## PR & git workflow` block today. Does this change
    need to touch `claude/commands/stack.md` to interview for the new
    fields (archive-branch pattern, local-only flow preference), or is it
    sufficient to update `openspec-templates/`'s stack-cheatsheet template
    and rely on `/qrspi:stack`'s existing "detect from repo signals,
    interview to fill gaps" behavior picking up the new fields generically?

11. Every existing consumer repo that has already run `/qrspi:stack` has a
    `## PR & git workflow` block **without** the new archive-branch field.
    When `/qrspi:pr` or `/qrspi:archive` loads a stack-cheatsheet missing
    that field, should the command (a) fall back to the current hardcoded
    default (`chore/archive-<id>`) silently, (b) prompt the human once via
    AskUserQuestion to fill the gap and offer to write it back to the
    cheatsheet, or (c) hard-stop with an instruction to re-run
    `/qrspi:stack`?

## Lint-gate surface

12. Does `scripts/lint.mjs` need a new Check asserting the stack-cheatsheet
    template's `## PR & git workflow` block field list matches between
    `openspec-templates/`'s canonical shape and the project skill
    (mirroring the existing heading-alignment Check 3 pattern), or is the
    block loose prose not currently covered by any structural lint (i.e.
    is this change purely additive prose with no lint surface)?

13. If a new shared skill is added, does `scripts/skill-sets.mjs`'s
    registry (enforced by Check 2b) need a new entry mapping `pr` and
    `archive` command/agent bodies to the new skill name, and does that
    registry check run against command files, agent files, or both for
    this kit's shape (commands are thin main-loop wrappers; the reviewer
    subagent is what `pr.md` delegates to)?

## Migration manifest

> ⮕ Resolved by PQ6: a migration step **is** warranted, and it is a `manual`
> step (the fallback is prompt-once-and-write-back, an interactive action, not
> a mechanical `edit-file`). Q14 below is thus answered "manual, not
> edit-file"; Q15's anchor-fragility concern is moot for a `manual` step. D
> confirms the exact manifest wording.

14. Existing consumer repos that ran `/qrspi:stack` before this change
    lands have a `## PR & git workflow` block in the old shape. Per the
    `migration-edit-file-idempotency-guard` backlog item's caution about
    `insert_after` anchors, does landing the new field(s) warrant a
    `migrations/<version>.yaml` `edit-file` step that appends the new
    field(s) to each consumer's existing block, or is a `manual` migration
    step ("re-run `/qrspi:stack` to pick up the new PR & git workflow
    fields") sufficient given the block is free-form prose rather than a
    parsed schema?

15. If a migration step is warranted, what anchor can it reliably target
    inside a project-authored `## PR & git workflow` block whose exact
    wording is not kit-controlled (each consumer's block was interview-
    generated, not template-copied verbatim) -- does this argue for the
    `manual` step over `edit-file` regardless of the idempotency-guard
    concern, since there is no guaranteed literal anchor string to insert
    after?

## Testing

16. `node scripts/lint.mjs` is the only automated test harness and cannot
    exercise live git/gh invocations. Is there a static assertion this
    change could add (e.g. a Check that the new skill file exists and both
    `pr.md` and `archive.md` reference it via a `Load skill <name>` line,
    mirroring the existing frontmatter `Load skill X` resolution in Check
    2) beyond the doc-presence level?

17. The no-remote local-only flow (skip push/PR, offer local branch /
    patch / commit-to-current-branch) is pure runtime behavior with no
    static test surface. Is a `(human)` dogfood checkpoint -- run
    `/qrspi:pr` or `/qrspi:archive` in a scratch repo with `git remote`
    intentionally unset -- the sole verification for this path, per the
    `qrspi-dogfood` skill's fixture-outside-the-repo convention?

18. Vendor detection for GitHub / Azure DevOps / GitLab / Bitbucket needs
    at minimum a smoke check per vendor that the resolved CLI name and
    status-query invocation are correct. Given none of these CLIs
    (`gh`/`az repos`/`glab`/a Bitbucket equivalent) are installed in this
    kit's own CI, is per-vendor correctness verified only by prose review
    plus the dogfood checkpoint, or does the resolver's vendor-selection
    *logic* (not the CLI invocation itself) get a pure-Node unit path that
    `lint.mjs` or a sibling script could exercise (e.g. given a set of
    repo signals, does the detector return the right vendor name)?

## Sequencing & scope

19. The backlog row names `standardize-recurring-ops-scripts` (P2) as a
    related item that would eventually extract deterministic PR-create/
    PR-status ops into `scripts/*.mjs` Node helpers. Should this change's
    shared skill be written assuming it may later be *replaced* by such a
    script (keeping the skill's internal logic simple/tabular so a future
    script port is mechanical), or is that out of scope to design for now?

20. `researcher-apply-surface-gate` (in progress, PR #50) is the cheap
    sibling change in the same Tier 1.6 stranger-hardening cluster. Does
    this change have any file-overlap risk with that in-flight PR (e.g.
    both touching `scripts/skill-sets.mjs` or the `repo-surface` skill), or
    are the two changes' touched files fully disjoint?

21. `lint-auto-mode-gate-coverage` (P2) rides along in the same Tier 1.6
    cluster per the backlog's "Runway" note but has no dedicated backlog
    row content visible from this row alone -- is it in scope for this
    change, a separate change to sequence alongside, or does its presence
    in the runway note not obligate this change to do anything about it?

22. Should the no-remote local-only flow and the vendor/branch-naming
    centralization ship as **one** change (as currently scoped) or would
    splitting into "centralize vendor detection + branch naming" (smaller,
    no new runtime behavior) followed by "add the no-remote flow" (the
    larger net-new behavioral addition) reduce review risk? (Answered
    definitively by PQ7 below; this question exists to confirm the
    Sequencing section captures the dependency it creates.)

## Open product questions (for the human)

- [x] **PQ1 — where the shared logic lives:** Should the vendor/remote
  detection and PR-create/status commands live in (a) a new dedicated kit
  skill both `pr.md` and `archive.md` load, (b) purely an expanded
  `## PR & git workflow` stack-cheatsheet block with no new skill, or (c)
  both — a skill for *how to read/derive* it, using the block as the
  *data*? This determines whether `scripts/skill-sets.mjs` needs a new
  registry entry and shapes every other question in the Skill surface
  section above. Options: (a) new dedicated skill, (b) stack-cheatsheet
  block only, (c) both — skill + block.
  **Answer: (c) both — a new kit skill carries the how-to-derive logic and
  `pr.md`/`archive.md` load it; the stack-cheatsheet `## PR & git workflow`
  block holds the per-repo data. Needs a `scripts/skill-sets.mjs` registry
  entry for the new skill.**

- [ ] **PQ2 — vendor-detection source of truth:** Should the resolver trust
  the stack-cheatsheet's declared `Git host` field as authoritative
  (falling back to `archive.md`'s existing signal-based auto-detection --
  GitHub remote/`.github/`, `azure-pipelines.yml`, `.gitlab-ci.yml` -- only
  when the cheatsheet has no block yet), or should it always re-derive
  live from repo signals and treat the cheatsheet field as a cache/
  override a human can hand-edit? If PQ1 picks (b) or (c), this answer
  also determines what the skill's "how to derive" instructions say.
  Options: (a) cheatsheet field is authoritative, live signals are the
  fallback for first-run only, (b) always re-derive live from signals,
  cheatsheet field ignored, (c) live-derive first, cheatsheet field is a
  human-settable override that wins when present.
  **Answer: (c) live-derive from repo signals first; the cheatsheet field is
  a human-settable override that wins when present. The skill's "how to
  derive" instructions describe the live detection, with the override check
  first.**

- [x] **PQ3 — no-remote local-only flow shape:** When no remote is
  configured, what should `/qrspi:pr` and `/qrspi:archive` offer instead
  of failing on a missing `origin`? Options: (a) commit straight to the
  current local branch only (no patch, no new branch) -- simplest, matches
  `archive.md`'s existing "Commit straight to main" option minus the push,
  (b) offer a choice of local branch (no push) / patch file (`git
  diff`/`format-patch` output) / commit-to-current-branch, mirroring the
  full menu `archive.md` step 5 already has for the *with-remote* case
  minus the push step, (c) hard-stop with a clear message explaining a
  remote is required for this stage command, deferring the actual
  local-only UX to a future change. If PQ1 picks (a)/(c) (skill and/or
  cheatsheet only, no runtime behavior added), PQ3's answer determines
  whether this change also modifies command-body runtime logic or stays a
  detection/reference change.
  **Answer: (b) offer the full local menu — local branch (no push) / patch
  file / commit-to-current-branch — minus the push step. This change DOES
  modify command-body runtime logic (not detection-only). See PQ8 for the
  terminal merge-back step this raises.**

- [ ] **PQ4 — vendor coverage:** Which vendors must the centralized
  resolver support at launch? Options: (a) the three `archive.md` already
  detects today -- GitHub (`gh`), Azure DevOps (`az repos`), GitLab
  (`glab`) -- with Bitbucket deferred to a follow-up idea, (b) all four
  named in the backlog row including Bitbucket (needs its own CLI/PR-
  create invocation researched), (c) GitHub only for this change, with
  full multi-vendor centralization deferred (narrowest scope, but leaves
  the "non-GitHub stranger" problem only partially solved, undercutting
  the change's stated 1.0 rationale).
  **Answer (final, revised at stage D 2026-08-13): GitHub (`gh`) + Azure DevOps
  (`az repos`) + GitLab (`glab`) — the three vendors `archive.md` detects today.
  Only Bitbucket is deferred (net-new, no current support) to
  `bitbucket-pr-vendor-support` (P3). An earlier rescope to GitHub + Azure only
  was reversed by the human during the D review: because GitLab is supported
  today, keeping it in scope avoids a regression and is simpler than any
  degradation path (no base-spec REMOVED requirement, no Check 18 concern). The
  transient `gitlab-pr-vendor-support` idea captured under the rescope was
  dropped.**

- [x] **PQ5 — archive-branch naming default and field shape:** The archive
  branch is hardcoded today as `chore/archive-<id>`. Should the new
  `## PR & git workflow` field be (a) a single "Archive-branch naming"
  field parallel to the existing "Source-branch naming" field, defaulting
  to `chore/archive-<id>` when absent (matching the "Source-branch naming"
  field's own default-to-`features/<id>` convention), or (b) a more
  general "branch naming" sub-block with feature/archive as two named
  slots, allowing a consumer to define additional branch kinds later? Note
  this determines both the stack-cheatsheet template shape (Stack-
  cheatsheet template surface, Q9-10) and `archive.md`'s literal
  string replacement of `chore/archive-<id>`.
  **Answer: (b) a general "branch naming" sub-block with feature and archive
  as two named slots (extensible to more branch kinds later). The feature
  slot defaults to `features/<id>`, the archive slot to `chore/archive-<id>`.
  Both `questions.md`'s feature-branch derivation and `archive.md`'s archive-
  branch derivation read from this one sub-block.**

- [x] **PQ6 — missing-field fallback for existing consumers:** When a
  stack-cheatsheet's `## PR & git workflow` block predates this change and
  lacks the new archive-branch (and/or no-remote-posture) field, should
  the command (a) silently fall back to the current hardcoded default, (b)
  prompt once via AskUserQuestion and offer to write the answer back to
  the cheatsheet, or (c) hard-stop and instruct the human to re-run
  `/qrspi:stack`? This also determines whether a `migrations/<version>.yaml`
  step (manual or edit-file) is warranted, per the Migration manifest
  section's Q14-15.
  **Answer: (b) prompt once via AskUserQuestion and offer to write the answer
  back to the cheatsheet's `## PR & git workflow` block. This DOES warrant a
  `migrations/<version>.yaml` step (a `manual` step pointing the human at the
  new sub-block, since the write-back is interactive rather than a mechanical
  `edit-file`). Confirm the exact step shape at D.**

- [x] **PQ7 — one change or two:** Should this land as a single change
  (as currently scoped -- centralization + branch-naming fold-in + the
  no-remote flow together), or should it split into (a) a smaller,
  lower-risk "centralize vendor detection + branch naming, no new runtime
  behavior" change first, followed by (b) "add the no-remote local-only
  flow" as its own change once the centralized resolver exists to build
  the no-remote branch on top of? Options: (a) one change (current scope),
  (b) split into two sequenced changes as described.
  **Answer: (a) one change (current scope) — centralization + branch-naming
  fold-in + no-remote flow together. The vertical slices at stage V will
  still sequence the centralized resolver before the no-remote runtime
  behavior that builds on it.**

- [x] **PQ8 — no-remote terminal disposition (emergent follow-up to PQ3):**
  In the no-remote local-only flow there is no PR-merge event, so the "local
  branch (no push)" menu option would otherwise leave the work stranded on an
  unmerged feature branch. Should the flow finish by merging the feature
  branch back into the default branch locally? Options: (a) yes — offer a
  human-confirmed merge-back into the default branch as the terminal step
  (the local analogue of a PR merge), (b) no — land on the branch and stop,
  the human merges manually, (c) no merge-back step; steer the user to the
  commit-to-current-branch menu option instead.
  **Answer: (a) yes — as the terminal step, offer a human-confirmed merge of
  the feature branch into the default branch locally (the local analogue of
  a PR merge). Not automatic — the human-approves-before-merge gate is
  preserved. This applies to the local branch / commit paths of the no-remote
  menu; the default branch name comes from the stack-cheatsheet (`main`
  default).**
