# Design — git-host-and-remote-awareness

> Stage D of QRSPI. Generated 2026-08-13.
> **Implementation is BLOCKED until a human approves this file.**

## Context

Git-host/vendor detection and PR mechanics are duplicated and asymmetric across
the kit. `archive.md` step 3 carries the only inline multi-signal host detector
(`.github/`/GitHub remote → `gh`; `azure-pipelines.yml` → `az repos`;
`.gitlab-ci.yml` → `glab`; default `gh`) and reuses that host for its step-5
archive-PR create; `pr.md` carries *no* detector — it just reads "the host CLI
named in its stack-cheatsheet." Branch naming is split too: `questions.md`
step 2 derives the feature branch from the cheatsheet (`features/<id>` default),
while `archive.md` step 5 **hardcodes** `chore/archive-<id>`. Every `git push`
site (questions step 2, implement, pr, archive) assumes `origin` exists and is
writable; a remoteless repo fails at the first push via the generic
hard-stop, with no local-only path.

**Desired end state.** One shared kit skill (`git-host-workflow`, name
provisional) codifies *how to derive* remote-presence, vendor→CLI, and
branch names; the stack-cheatsheet `## PR & git workflow` block holds the
per-repo *data*. `pr.md` and `archive.md` load that skill and follow it instead
of each re-deriving. A remoteless repo gets a first-class local-only flow
(local branch / patch / commit-to-current, minus push) ending in a
human-confirmed local merge-back. This is a slash-command + skill + lint +
template + migration-manifest change; no data-store/http-api/ui/auth surface.

## Goals / Non-Goals

**Goals:**
- Single shared skill both `pr.md` and `archive.md` load for remote-presence
  detection, vendor→CLI resolution, branch-name resolution, and the no-remote
  flow (PQ1, PQ7). Add a `scripts/skill-sets.mjs` registry entry.
- Live-derive vendor from repo signals; a cheatsheet override wins when present
  (PQ2). Support **GitHub (`gh`) + Azure DevOps (`az repos`) + GitLab (`glab`)** —
  the three detected today (PQ4, revised 2026-08-13).
- First-class no-remote local-only flow with a human-confirmed terminal
  merge-back (PQ3, PQ8).
- Fold branch naming into one `## PR & git workflow` sub-block with named
  feature + archive slots (PQ5); prompt-once + write-back for missing fields on
  legacy cheatsheets, backed by a `manual` migration step (PQ6).

**Non-Goals:**
- **Bitbucket vendor support** — net-new (no current support); deferred to the
  backlog idea `bitbucket-pr-vendor-support` (P3). GitLab is **in scope** (D3) —
  the human reversed the earlier defer on 2026-08-13, so `gitlab-pr-vendor-support`
  is dropped from the backlog.
- **Node PR-ops helper scripts** — `standardize-recurring-ops-scripts` (P2) may
  later port the vendor table to `scripts/*.mjs`; out of scope here (D9).
- **`lint-auto-mode-gate-coverage`** (Q21) — unrelated runway item, not touched.

## Decisions

### D1 — Shared skill (how-to-derive) + cheatsheet block (data) (PQ1, Q6-8)
New kit skill `git-host-workflow` (a **procedure** skill in the `backlog-writer`
mould: numbered steps the *calling command body* follows; the actual git/gh Bash
calls and every `AskUserQuestion` stay in the main-loop command per Check 5). It
owns: (1) remote-presence check, (2) vendor→CLI resolution + a vendor→CLI/PR-
create/PR-status lookup table, (3) branch-name resolution, (4) the no-remote
menu procedure. The cheatsheet `## PR & git workflow` block stays the per-repo
data source. Both `pr.md` and `archive.md` (main-loop commands) load it.
**Rejected:** block-only, no skill (PQ1 option b) — leaves `pr.md`/`archive.md`
each re-deriving; skill-only with no block — loses per-repo overrides.

### D2 — Vendor source of truth: live-derive, cheatsheet override wins (PQ2)
Resolution order in the skill: **if** the cheatsheet `Git host` field is set,
use it (human override); **else** live-derive from repo signals (`.github/`/
GitHub remote → `gh`; `azure-pipelines.yml` → `az repos`). Live is the primary
mechanism; the field is an override, not a required cache — vendor identity is
stable but the field lets a human correct a mis-detection.
**Rejected:** field authoritative-first (PQ2 a) — stale on first run; ignore the
field (PQ2 b) — removes the human override the answer requires.

### D3 — Coverage = GitHub + Azure DevOps + GitLab (PQ4, human revision 2026-08-13)
The centralized resolver knows `gh`, `az repos`, and `glab` — the three vendors
`archive.md` detects **today** (`.github/`/GitHub remote → `gh`;
`azure-pipelines.yml` → `az repos`; `.gitlab-ci.yml` → `glab`; default `gh`).
The vendor→CLI/PR-create/PR-status lookup table carries all three. This preserves
existing GitLab coverage (no regression) and matches the `archive-workflow`
**base spec**, which already mandates the three-way inference — so the delta
keeps that scenario intact (no REMOVED requirement, no Check 18 concern). Only
**Bitbucket** stays deferred (net-new, no current support) to
`bitbucket-pr-vendor-support` (P3).
**Rejected:** GitHub + Azure only — would drop existing `glab` coverage (a
regression the human explicitly reversed on 2026-08-13); GitHub only — drops both
Azure and GitLab, undercutting the non-GitHub-stranger rationale.

### D4 — No-remote detected live; gates from the first push onward (PQ3, Q2-3)
Remote presence is a **live** check (`git remote` via Bash), not a cheatsheet
field — presence can change between sessions (Q9). The earliest failure point is
`questions.md` step 2's unconditional `git push -u origin <branch>` (Q2), so the
skill's remote check gates *there*: no remote → create the branch locally, skip
the push, and record that the flow is local-only. `pr.md` and `archive.md` run
the same check before any PR-create/push. "No remote configured" is a **distinct**
condition from `archive.md`'s existing "no linked PR" bailout (Q3): the latter
still applies to a *with-remote* change that was never PR'd; no-remote replaces
the remote-requiring menu entirely (Q4) rather than graying options out.
> **Amended 2026-08-13 (dogfood finding #2):** the same live check also gates
> `archive.md`'s **step-3 PR-merge gate** — a local-only (no-remote) change has
> no `pr.md` to verify, so archive MUST skip the PR-merge gate for it and route
> to the local archive (sync + commit-to-`main`, no push). Without this, a change
> taken through the no-remote flow was un-archivable (step 3 hard-stopped on the
> missing `pr.md`), and task 2.4's step-5 no-remote wiring was unreachable. The
> with-remote "no linked PR" hard-block is unchanged; the two stay distinct.

### D5 — No-remote menu = full local menu minus push + merge-back (PQ3, PQ8, Q4)
> **Amended 2026-08-13 (dogfood finding):** the menu applies only at the
> **completion push sites** (`pr` PR-create, `archive` archive-push), where the
> change's work exists. It is NOT shown at `questions.md` step 2 branch creation
> — that site has no work to disposition, so per D4 it simply skips the push and
> continues local-only. (Stage-S spec + stage-P task 2.2 had over-applied the
> menu to the branch-creation site, beyond D4's intent; realigned here.)

At a completion push site with no remote: offer (a) local branch (no push),
(b) patch file
(`git format-patch`/`diff`), (c) commit-to-current-branch — the full menu minus
push. **Terminal step (PQ8):** for the local-branch and commit paths, offer a
**human-confirmed** merge of the feature branch into the default branch locally
(default branch from the cheatsheet, `main` default) — the local analogue of a
PR merge, never automatic. Recommend a plain `git merge` (not forced
fast-forward) so history mirrors a merged PR; on conflict, stop and hand the
human the conflicted state (do not auto-resolve).
**Rejected:** commit-to-current only (PQ3 a) / hard-stop (PQ3 c) — PQ3 fixes the
full menu; land-and-stop (PQ8 b) — strands work on an unmerged branch.

### D6 — Branch naming = one sub-block, named slots (PQ5)
`## PR & git workflow` gains a **Branch naming** sub-block with named slots:
`feature` (default `features/<id>`) and `archive` (default `chore/archive-<id>`),
extensible to more kinds later. The skill resolves `slot → cheatsheet value →
default`. `questions.md` step 2 reads the feature slot; `archive.md` step 5
reads the archive slot, replacing its hardcoded `chore/archive-<id>` (branch
name, PR title, and PR source-branch arg all derive from the one slot).

### D7 — Missing-field fallback: prompt-once + write-back; `manual` migration (PQ6)
On a legacy cheatsheet lacking a new field (archive slot / no-remote posture),
the command prompts once via `AskUserQuestion` (main-loop) and offers to write
the answer back into the `## PR & git workflow` block, then continues with the
supplied value. Because the block is free-form, interview-generated prose with no
kit-controlled anchor (Q14-15), the migration is a **`manual`** step, not
`edit-file`. See `## Migration manifest` for the exact shape.

### D8 — Commands point at the skill, not duplicated examples (Q5)
`pr.md` and `archive.md` replace their inline host-CLI example blocks with a
"load skill `git-host-workflow` and follow its resolution procedure" pointer.
The vendor→CLI lookup table lives once in the skill, so the two command bodies
can no longer drift from each other or from `stack.md`'s detection sweep.

### D9 — Lint floor = registry only; keep the table script-portable (Q12/13/16/18/19)
Add `pr` and `archive` entries to `COMMAND_SKILL_SET_EXPECTED` in
`scripts/skill-sets.mjs`; Check 2 then asserts the skill exists and both commands
load it (the mechanical floor, mirroring the `idea` precedent). **No** new
structural Check on the block's field list: the block shape lives only in
`stack.md`'s fenced skeleton (no second site to align against, so Q12's
heading-alignment pattern has nothing to compare). **No** pure-Node resolver now
(PQ1 keeps logic in the skill) — but keep the vendor table simple/tabular so
`standardize-recurring-ops-scripts` can port it mechanically later (Q19).
Vendor-selection + no-remote correctness are runtime-only → `(human)` dogfood
checkpoints (Q16-18).

## Command changes
- `pr.md` — load the skill; run the remote check before PR-create; on no-remote
  branch to the D5 local flow; replace inline CLI examples with the skill pointer.
- `archive.md` — load the skill; step 3 host resolution now *delegates* to the
  skill (GitLab → D3 hard-stop); step 5 archive slot from D6; no-remote → D5 flow.
- `questions.md` — step 2 feature slot from D6; gate the `git push -u origin`
  behind the D4 remote check (no remote → local branch, no push).
- `stack.md` — step-2 detection + step-4 fenced skeleton enumerate the new
  Branch-naming sub-block (feature + archive slots) so `/qrspi:stack` fills them.
- `README.md` — refresh the stage/PR-flow prose if it documents host/PR behaviour.

## Skill changes
New `claude/skills/git-host-workflow/SKILL.md` (auto-registers; no `plugin.json`
edit). Contents: override-then-live vendor resolution (D2), the GH/Azure lookup
table + GitLab known-but-unsupported stop (D3), remote-presence check (D4),
branch-slot resolution (D6), and the no-remote menu + merge-back procedure (D5).
It contains **no** `AskUserQuestion`/git invocations — those stay in the calling
main-loop command (Check 5). Also update the live dogfood cheatsheet
`.claude/skills/qrspi-stack/SKILL.md` to add the Branch-naming sub-block.

## Lint changes
`scripts/skill-sets.mjs`: add `pr: ['git-host-workflow']` and
`archive: ['git-host-workflow']` to `COMMAND_SKILL_SET_EXPECTED` (D9). No new
Check function.

## Template surface
The `## PR & git workflow` shape lives in `stack.md`'s step-4 fenced skeleton
(there is no separate `openspec-templates/*-stack.template.md`). Extend that
skeleton's field enumeration with the Branch-naming sub-block and a no-remote
posture note (D6/D7).

## Migration manifest
`migrations/<next-release>.yaml` (assume `0.14.0`; rename to match the actual
release — Check 6 asserts filename stem == `version`). One **`manual`** step
(PQ6): describe that `## PR & git workflow` gained a Branch-naming sub-block and
no-remote posture, instruct the human to re-run `/qrspi:stack` OR hand-add an
`Archive-branch naming: chore/archive-<id>` line, and note `/qrspi:pr` and
`/qrspi:archive` will prompt-and-write-back if a field is missing. No `automated`
step (free-form block, no reliable `edit-file` anchor — Q15).

## Vertical slices (preview)
Sequenced so the resolver lands before the behaviour that builds on it (PQ7):
- **Slice 1 — Centralized resolver, with-remote path.** New skill + registry;
  `pr.md`/`archive.md`/`questions.md` resolve vendor + branch slots through it.
  Demoable: `/qrspi:pr` and `/qrspi:archive` on a GitHub repo behave unchanged
  end-to-end via the shared path; Azure and GitLab both resolve to their CLIs.
- **Slice 2 — No-remote local-only flow.** Remote check gates the pushes; the
  local menu + human-confirmed merge-back. Demoable: in a remoteless scratch
  repo, run the flow and land the work on the default branch locally (dogfood).
- **Slice 3 — Legacy-cheatsheet fallback + migration.** Prompt-once/write-back
  for a missing slot; the `manual` migration step. Demoable: a pre-change
  cheatsheet prompts once and `/qrspi:update` surfaces the manual step.

## Risks / Trade-offs
- **Runtime-only verification.** Vendor detection, no-remote flow, and
  merge-back have no static test; the `(human)` dogfood checkpoints are the sole
  gate (build fixtures outside the repo per `qrspi-dogfood`).
- **`az repos` flag exactness unverified** at design time — treat the exact
  `az repos pr create/show` flags as a stage-I watch-item; name them
  generically in the skill rather than pinning untested flags.
- **Local merge-back conflicts.** A local `git merge` can conflict; the flow
  stops and hands the human the conflicted tree rather than auto-resolving.
- **`manual` migration is best-effort.** Free-form blocks mean the write-back
  target isn't a guaranteed anchor; the prompt-and-write-back at runtime (D7) is
  the real safety net, the migration step is the nudge.

## Open questions for the human
- [x] **OQ1 — How does GitLab degrade when the centralized resolver replaces
  `archive.md`'s inline `glab` support?** **Resolved 2026-08-13: moot — the human
  reversed the PQ4 rescope and put GitLab back in scope (D3).** The resolver
  supports GitHub + Azure + GitLab (the three detected today), so there is no
  regression, no base-spec change, and no Check 18 concern. Only Bitbucket stays
  deferred. The `gitlab-pr-vendor-support` backlog idea is dropped.
