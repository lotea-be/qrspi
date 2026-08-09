# Design — archive-auto-create-pr

> Stage D of QRSPI. Generated 2026-08-04.
> **Implementation is BLOCKED until a human approves this file.**

## Context

`/qrspi:archive` (`claude/commands/archive.md`) archives a merged change: it
syncs delta specs, moves the change folder under `archive/`, removes the
backlog row, then commits. Step 5 offers two commit targets — "New branch +
push (open a PR)" or "Commit straight to main". On the **new-branch** path it
runs `git push -u origin chore/archive-<id>` and then merely **prints** the
project's PR-create command with the explicit instruction "Do not run it
automatically — just print it" (`archive.md:190-193`); step 6 repeats that
suggested command.

Meanwhile `/qrspi:pr` (`claude/commands/pr.md`) genuinely **creates** the PR:
a mode-aware gate (Manual asks "Create the PR now" vs. "Show me the description
first"; Full/Semi auto-create), then it runs the host PR-create command
capturing stdout, extracts the PR number + URL, and records them.

**Desired end state:** on archive's new-branch path, after `git push -u`, the
command *creates* the archive PR (mode-aware, mirroring `/qrspi:pr`), captures
the PR number + URL, and reports them in step 6 instead of re-printing a
command to run. The "Commit straight to main" path is untouched (no PR is
opened there). All PR-record persistence is a **completion-summary print only**
— no file is written.

This is a `slash-command`-surface change: it edits prose in one command file
(`archive.md`) and one README section. There is no data-store, http-api, ui, or
auth surface in this repo, so those sections are omitted.

## Goals / Non-Goals

**Goals:**
- On archive step 5's new-branch path, run the resolved host PR-create command
  after `git push -u`, mode-aware (Manual gate; Full/Semi auto-create), exactly
  mirroring `/qrspi:pr`'s create step (PQ1).
- Capture the PR number + URL from the create command's stdout and surface them
  in step 6's completion summary. Write **no** file (PQ2).
- Reuse the host-CLI resolution already performed in archive step 3 for the
  create call — no new resolver, no new skill (PQ4).
- Update README archive-flow prose if it documents the print-only behaviour (PQ5).

**Non-Goals:**
- **No centralized host resolver skill.** Extracting a shared `gh`/`az repos`/
  `glab` resolver skill that both `archive.md` and `pr.md` load is the separate
  `git-host-and-remote-awareness` change. This change reuses the existing inline
  resolver only.
- **No batch-archive anticipation.** Structuring the create call so
  `batch-archive-multiple-changes` can reuse it is out of scope; that change may
  redesign the creation step. Implement the single-archive case naively.
- **No PR-record file for the archive PR.** No `pr.md`, no `archive-pr.md`
  (PQ2). The archive PR is operational bookkeeping.
- **No change to steps 2, 3, 4a, 4, 7,** or to the "Commit straight to main"
  path. Scope is confined to step 5's new-branch sub-path and step 6's relay.

## Decisions

### D1 — Reuse step 3's host resolution; derive the create command from it (PQ4, PQ5-adjacent, answers Q5)

Step 3 already resolves the host CLI to run the PR-**status**-query
(`archive.md:46-53`): read the stack-cheatsheet `## PR & git workflow` block,
else infer from repo signals (`gh` / `az repos` / `glab`, default `gh`). That
resolution identifies the *host*, from which both the status-query command and
the create command follow. We reuse the **already-resolved host** from step 3
rather than re-detecting in step 5.

Prose ordering: step 3 runs before step 5 on the happy path, so the resolved
host is in scope when step 5 executes. The step-5 edit says: "Using the host
already resolved in step 3, run that host's PR-create command
(`gh pr create` / `az repos pr create` / `glab mr create`)." No second Glob or
repo-signal scan. If step 3's resolution somehow was not reached (it always is
on the archive happy path, since step 3 is the merge gate), fall back to the
same inference the step-3 prose describes — but do not duplicate the inference
block; point back to step 3.

**Rejected:** independently re-deriving the host in step 5. It would duplicate
the resolver prose (drift risk) and burn a second Glob. **Rejected:** extracting
a shared skill (PQ4 fixes this as a Non-Goal → `git-host-and-remote-awareness`).

### D2 — Mode-aware create gate, worded to match `/qrspi:pr` (PQ1, answers Q1 gate half)

Mirror `pr.md:228-243` exactly. After `git push -u origin chore/archive-<id>`:

- In **Full or Semi auto**: skip the question and run the host PR-create command
  directly (per the "PR-create auto-advance" rule in skill `workflow`).
- In **Manual**: AskUserQuestion —
  - question: "The archive branch is pushed. Create the archive PR now, or show
    the command first?"
  - choices: `["Create the PR now", "Show me the command first — I'll create it manually"]`
  - On "Create the PR now": run the create command. On "Show me the command
    first": print the resolved create command and do **not** run it (this is the
    single surviving print-only path — a deliberate Manual opt-out, not the
    default).

This reuses the same run-mode context the archive command already holds (it
loads `context-budget-gate`; run-mode is established/inherited per skill
`workflow`). The gate label is adapted to the archive context ("archive PR",
"command" not "description") but the *shape* is identical to `/qrspi:pr`.

**Rejected:** always-create with no gate (PQ1 option b) and always-print (option
c) — PQ1 fixes option (a), mirror exactly.

### D3 — Capture PR number + URL from stdout; report in step 6 only (PQ2, PQ3, answers Q17)

Run the create command "capturing the output so you get the PR number and URL"
— the same phrasing `pr.md:240` uses. The host CLIs print the PR/MR web URL on
stdout (`https://github.com/<org>/<repo>/pull/<N>`); the number is the trailing
path segment. This is the same URL→number shape archive step 3 already parses in
reverse (`.../pull/<N>`, `.../merge_requests/<N>`), so the parsing convention is
already established in this file — reference it rather than re-specifying.

Persistence: **step-6 completion summary only, no file** (PQ2). Step 6's
"New branch chosen" bullet changes from *"repeat the suggested PR-create command
as the next step"* to *"report the created archive PR as `#<N>` and its URL"*.
When the Manual "show command first" branch was taken (no PR created), step 6
instead prints the command that was surfaced and notes the PR was not created —
preserving an honest summary for that one path.

**Rejected:** writing `pr.md`/`archive-pr.md` (PQ2 fixes "no file").

### D4 — PR body = title only; target = default branch (PQ3, answers Q4, Q7)

- **Title/body:** the create command uses the archive commit message as the
  title — `chore(<id>): archive change + remove backlog row` — with **no body**
  (PQ3). Concretely `gh pr create --title "chore(<id>): archive change + remove
  backlog row" --body ""` (host-equivalent flags for `az`/`glab`).
- **Target branch:** the repo's **default branch** named in the stack-cheatsheet
  `## PR & git workflow` block (`main` here) — the same source `/qrspi:pr` uses
  for its target (`pr.md:241`, "the project's default target branch"). Do not
  derive it from HEAD's upstream: the archive branch's upstream is itself
  (`-u origin chore/archive-<id>`), which is not a merge target. Source branch is
  `chore/archive-<id>`.

**Rejected:** generated body listing archived id / feature-PR / sync status
(PQ3 options b, c). **Rejected:** upstream-derived target (would resolve to the
archive branch itself).

### D5 — Create-failure path: graceful degrade to printing the command (answers Q6) — SETTLED via OQ1 (graceful-degrade)

When the create command fails (unauthenticated CLI, missing remote on host), the
**recommended** behaviour is to **degrade gracefully**: catch the non-zero exit,
print the resolved create command for the human to run manually, and report in
step 6 that the branch was pushed but the PR was not auto-created. The archive
work itself (spec sync, folder move, backlog removal, commit, push) has already
*succeeded and been pushed* by this point — a create failure must **not** be a
hard-stop that leaves the human thinking the archive failed, because it didn't.
This diverges from step 3's status-query failure (a hard-stop), and the
divergence is justified: step 3 gates whether archival may proceed at all;
step 5's create is a post-success convenience.

**Tension with PQ1 ("mirror `/qrspi:pr` exactly"):** `/qrspi:pr` does *not*
document a create-failure branch (`pr.md:238-243` is silent on it), so there is
no explicit behaviour to mirror. The skill-`workflow` hard-stop condition 3
treats "`gh pr create` failure" as surfacing via the subagent's error signal —
but archive's create runs in the *orchestrator*, not a subagent, and the archive
commit is already pushed. Recommending graceful-degrade is therefore a genuine
design call, not settled by the PQs — surfaced as **OQ1** for the human.

## Vertical slices (preview)

The change is small (one command file + README) and single-path. One user-facing
slice, dogfood-verified:

- **Slice 1 — Archive new-branch path auto-creates the PR.** Edit `archive.md`
  step 5 (create call + mode gate + capture) and step 6 (report `#<N>`/URL), plus
  the README archive-flow prose. Demoable end-to-end: run `/qrspi:archive <id>`
  on a merged change, pick "New branch + push", and observe the archive PR is
  created and its `#<N>`/URL reported — verified via the `(human)` dogfood
  checkpoint (the create call is a runtime Bash invocation the lint cannot
  exercise).

## Command changes

`claude/commands/archive.md` — the only source edit:
- **Step 5, new-branch sub-path (`archive.md:190-193`):** replace the two
  print-only sentences ("Then surface the project's PR-create command … Do not
  run it automatically — just print it.") with: (a) the mode-aware create gate
  (D2), (b) "using the host resolved in step 3" reuse pointer (D1), (c) the
  create command with title-only body targeting the default branch (D4), (d)
  stdout capture of `#<N>`/URL (D3), and (e) the create-failure degrade prose
  (D5, pending OQ1).
- **Step 6, "New branch chosen" bullet (`archive.md:212-214`):** replace "repeat
  the suggested PR-create command as the next step" with "report the created
  archive PR (`#<N>` + URL)"; add the "show-command-first / create-failed"
  fallback wording.
- **Step 7 unchanged.** The "fresh session" offer does not reference the archive
  PR; no edit needed there (answers Q3's step-7 sub-question: no).

No lint check pins the replaced prose. Check 10 (budget-gate embed), Check 19
(`qrspi:spec-syncer` presence) key off strings this edit does not touch; Check 4
(README coverage) checks only that `/qrspi:archive` resolves, not step-level
prose (answers Q11, Q12, Q15). The dogfood `(human)` task is the sole runtime
gate for the create call (answers Q16).

## Skill changes

None. PQ4 fixes "reuse the existing inline resolver, no new skill", so Check 2b
(skill-set registry) needs no update (answers Q13). No new skill dir is created.

## Template surface

None. PQ2 writes no file, so no `pr.md`/`archive-pr.md` template is needed
(answers Q14). The absence of a `pr.md` template is pre-existing and unchanged.

## Risks / Trade-offs

- **Create-failure semantics (D5) is the one unsettled call.** If the human
  prefers hard-stop-on-failure over graceful-degrade, D5 flips — but the archive
  commit is already pushed, so a hard-stop must be worded to make clear the
  archive itself succeeded. See OQ1.
- **Resolver reuse depends on step-3 ordering.** If a future refactor lets step 5
  run without step 3 (it can't today — step 3 is the merge gate), the "host
  resolved in step 3" pointer would dangle. Low risk given step 3 is mandatory
  and hard-stops before step 5; noted so a future editor keeps the ordering.
- **Non-GitHub create flags unverified at design time.** The exact `az repos pr
  create` / `glab mr create` flag spellings for title-only/no-body/target are not
  verified here; `gh pr create --title … --body "" --base <default>` is known
  good. Treat non-`gh` flag exactness as a **stage-I watch-item** — the prose
  should name the host-equivalent create command generically (as step 3 does for
  status-query) rather than pin exact `az`/`glab` flags the kit can't test.
- **PR-create is runtime-only.** No static check can exercise it; correctness
  rides entirely on the dogfood `(human)` checkpoint. Mitigated by mirroring the
  already-working `/qrspi:pr` create step near-verbatim.

## Open questions for the human

- [x] **OQ1 — Create-failure behaviour: graceful-degrade (recommended) vs.
  hard-stop.** **Answer: (a) graceful-degrade** — on a non-zero create exit,
  print the resolved create command for manual use and report "branch pushed,
  PR not auto-created"; never hard-stop (the archive commit already landed and
  pushed). D5 is settled by this answer. When the PR-create call fails after the archive branch is already
  committed and pushed, should the command (a) degrade gracefully — print the
  create command for manual use and report "branch pushed, PR not auto-created"
  (D5, recommended, because the archive itself already succeeded and pushing on),
  or (b) hard-stop per skill `workflow`'s treatment of `gh pr create` failure
  (but worded so the human understands the archive commit *did* land)? PQ1 says
  "mirror `/qrspi:pr` exactly," but `/qrspi:pr` documents no create-failure
  branch, so this is not settled by the PQs. Recommend (a).
