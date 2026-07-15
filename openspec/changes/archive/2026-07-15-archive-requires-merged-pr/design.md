# Design — archive-requires-merged-pr

> Stage D of QRSPI. Generated 2026-07-10.
> **Implementation is BLOCKED until a human approves this file.**

## Context

`/qrspi:archive` (`claude/commands/archive.md`) today does two things wrong at
the end of the QRSPI lifecycle. First, it archives **unconditionally** — it
never checks that the linked PR actually merged, so a change whose PR is still
open (or was closed unmerged) can be swept into `openspec/changes/archive/`
prematurely, folding its delta specs into `openspec/specs/` as "current truth"
when the code never landed. Second, it never touches `openspec/backlog.md`: the
change's row is meant to disappear on archive (the `archive/` folder is the
source of truth for completed work), but nothing removes it — the row lingers as
stale `in-progress` clutter.

Today's flow (from research): `archive.md` is an `agent: build` main-loop
command with three body steps — (1) `openspec/` existence check, (2) inform-only
`followups.md` sanity check, (3) delegate to the generated
`openspec-archive-change` skill, which does the artifact/task/spec checks and the
filesystem `mv`. **There is no `git commit` anywhere in the flow** and no
PR-status check. The generated skill must not be hand-edited (it is regenerated
from the OpenSpec CLI, like `copilot/`).

Desired end state: before delegating to the skill, `archive.md` reads the
change's `pr.md`, queries the linked PR's **live** state via the host git CLI,
surfaces number/state/URL, and hard-blocks archival unless the PR is `merged`.
On a successful archive it removes the change's `backlog.md` row in the same
commit as the folder move. The PR-status query is host-agnostic (read from the
stack-cheatsheet's `## PR & git workflow` section, in step with how `pr.md`
already generalizes PR *creation*).

## Goals / Non-Goals

**Goals:**
- Hard-block `/qrspi:archive` unless the recorded PR is live-verified `merged`.
- Surface the actual PR number/state/URL *before* blocking, so the human sees why.
- Remove the change's `backlog.md` row on successful archive, atomically with the move.
- Keep the query host-agnostic (`gh` / `az repos` / `glab`), inline in `archive.md`.
- Keep the generated `openspec-archive-change` skill unedited; wrap it.
- Regenerate `copilot/prompts/qrspi-archive.prompt.md` and pass `sync-copilot.mjs --check`.

**Non-Goals (each a separate backlog item — do not fold in):**
- No shared Node ops-helper (`standardize-recurring-ops-scripts` owns that; PQ5).
- No reprioritization-offer seam (`backlog-prioritization` wires itself in later; PQ8).
- No pre-PR open-tasks review pass (`pr-review-open-tasks-and-followups`; Q25).
- No fixing `pr.md`'s stale-PR gap (a closed-then-reopened PR still points at the
  stale one; the check correctly reports "not merged" — out of scope, Q5).
- No enforcing/validating `pr.md`'s six-field shape (drift exists; not this change).

## Decisions

### D1 — PR-merge gate is a new step, ordered AFTER the followups check, BEFORE skill delegation
The gate becomes new **step 3** in `archive.md`, inserted between the existing
inform-only `followups.md` check (step 2) and the skill delegation (renumbered to
step 4). Rationale: the gate is the *hardest* precondition — it should run after
the cheap local checks but is the last thing standing before the irreversible
`mv`. Ordering it after followups keeps the followups warning visible even when
the PR gate later blocks (the human sees both signals in one run). The gate is a
**hard-stop** (PQ2), unlike the inform-only followups check — the two coexist:
followups warns-and-continues, the PR gate blocks. (Answers Q6, PQ6.)

### D2 — `pr.md` is the authoritative PR-number source; missing `pr.md` hard-blocks
The gate reads `openspec/changes/<id>/pr.md` (via Read/Glob) and extracts the PR
number from the `- **PR:** #<N>` line. If `pr.md` does not exist, **hard-block**
and tell the user to record the PR via `/qrspi:pr` first (PQ1). We do NOT
re-derive the PR by searching the host for a branch match, and we do NOT prompt
for an ad-hoc number. Rationale: `pr.md` is the durable, single source of truth
and survives into the archive; anything else invites drift. **Watch-item (stage
I):** research documents real `pr.md` field drift across archived examples
(`PR: #<N>` vs. bare `PR link:` URL vs. `PR:` URL-with-"(draft)"). The extractor
must tolerate this — parse a `#<N>` token if present, else fall back to a PR
number/URL parsed from the `URL:`/`PR link:` line. If **no** number can be
extracted from a present `pr.md`, treat it like CLI-failure surfacing (D6): show
what was found and hard-stop asking the human to fix `pr.md`. (Answers Q1, PQ1.)

### D3 — Host CLI + status-query command are read from the stack-cheatsheet, with a documented fallback
Per PQ4, the status query is generalized: it is read from the project's
stack-cheatsheet `## PR & git workflow` section, which `pr.md` already uses for
PR *creation*. This change adds a **parallel status-query line** to the
`stack.md` section template (D8) so a freshly-generated cheatsheet documents both
`gh pr create` **and** `gh pr view` (and the `az`/`glab` equivalents).
**Tension — no stack-cheatsheet exists in many repos (including this one):**
research confirms this repo has no `.claude/skills/*-stack/SKILL.md`, and a
consumer repo may also lack one. `pr.md`'s existing wording ("the host CLI named
in its stack-cheatsheet") already assumes a runtime fallback. The gate mirrors
that: **if the stack-cheatsheet is absent or lacks a status-query line, infer the
host from repo signals** — `.github/` or a GitHub remote → `gh`;
`azure-pipelines.yml` → `az repos`; `.gitlab-ci.yml` → `glab` (the same
detection `stack.md` documents) — and default to `gh` when signals are ambiguous.
This keeps the gate operable in a repo with no cheatsheet while honoring the
cheatsheet when present. (Answers Q3, PQ4.)

### D4 — "merged" is defined per host: GitHub `state == MERGED`, with az/glab parallels
The gate runs the host's status-query command and treats the PR as merged only
when:
- **GitHub:** `gh pr view <N> --json state,url,number -q .state` returns
  `MERGED`. `state` alone suffices — a squash-merge still reports `MERGED`
  (confirmed in Q4). `OPEN` and `CLOSED` (closed-unmerged) both fail the gate.
- **Azure DevOps:** `az repos pr show --id <N>` → `status == "completed"`
  (open = `active`, closed-unmerged = `abandoned`).
- **GitLab:** `glab mr view <N>` → `state == "merged"` (open = `opened`,
  closed-unmerged = `closed`).

`mergedAt` is **not** additionally required for GitHub (`state` is authoritative;
the force-push/revert edge in Q4 does not change `state`). These commands are
also what D8 writes into the cheatsheet template. **Watch-item (stage I):** the
exact `--json`/`-q` flag shapes must be verified against the installed CLI at
implement time; if a flag differs, the gate should fall back to the CLI's default
human-readable output and let the agent read the state from it. (Answers Q4.)

### D5 — Surface state first, THEN hard-block on non-merged — uniform across open/closed-unmerged
The gate always **fetches and prints** the PR's number, state, and URL first
(so the human sees the evidence), and only then decides. If `merged`, it proceeds
to skill delegation silently. If any non-`merged` state, it **hard-stops
unconditionally, no override** (PQ2), uniform across `open` and `closed-unmerged`
(no per-state softening). Message shape:

> PR #<N> for `<id>` is **<state>** (not merged): <url>
> Archival is blocked until the PR merges. Merge PR #<N>, then re-run
> `/qrspi:archive <id>`.

Rationale: the ticket's literal "otherwise stop" plus PQ2's binding answer. This
is a genuine hard-stop per `workflow`'s hard-stop procedure — the orchestrator
surfaces it and does not auto-advance. (Answers Q7, Q8, PQ2.)

### D6 — CLI unavailable/unauthenticated → hard-stop with an actionable message, never silent-skip
If the host CLI is not installed, or the query fails on auth (non-zero exit with
an auth/`not logged in` signal), the gate **hard-stops** with an actionable
message naming the fix (PQ7):

> Could not query PR #<N>: the `<cli>` CLI is unavailable or not authenticated.
> Run `gh auth login` (or the host equivalent), then re-run `/qrspi:archive <id>`.

The check is never silently skipped — a skip would defeat the change's entire
purpose. The gate distinguishes "CLI failed" (D6) from "CLI succeeded and PR is
not merged" (D5) so the message is right; both are hard-stops but with different
wording. (Answers Q10, PQ7.)

### D7 — Backlog-row removal + who commits: the archive flow gains an explicit commit step
This is the load-bearing tension. PQ3 requires the change's `backlog.md` row to
be **removed** (not flipped to `merged`) in the **same commit** as the folder
move. But research finding #5 is emphatic: **the archive flow has NO git commit
step at all today** — the skill does a bare filesystem `mv` and nobody commits.
There is no existing commit to piggyback the backlog edit onto.

Two options:
- **(a)** Add an explicit commit step to `archive.md` (new step 6): after the
  skill's `mv` succeeds, `git add` the archived paths **and** the removed
  `backlog.md` row, then `git commit`/`git push` — introducing the archive
  flow's first-ever commit step.
- **(b)** Leave committing to the human; `archive.md` only *edits* `backlog.md`
  (removes the row) and relies on the human to commit the move + edit together.

**Chosen: (a) — introduce an explicit commit step.** Rationale: PQ3 + PQ14
(atomicity) *require* the row removal and the `mv` to land in one commit; option
(b) cannot guarantee atomicity (the human might commit them separately, or forget
the backlog edit), which is exactly the drift this change exists to prevent. The
commit follows `workflow`'s canonical commit step (explicit paths, never
`git add -A`; on non-zero git exit, hard-stop and surface verbatim). Commit
message: `chore(<id>): archive change + remove backlog row`. The staged paths are
the new `openspec/changes/archive/YYYY-MM-DD-<id>/` tree, the now-absent old path,
and `openspec/backlog.md`. **Note for stage S/I:** `git mv` would stage the move
cleanly, but the generated skill uses plain `mv` (research); the commit step must
therefore `git add` both the new archive path and the deletion of the old path
(`git add -A <specific paths>` scoped to the change dir + archive dir, still never
a repo-wide `-A`). This is a real behavioral addition — flagged for human review.
(Answers Q11, Q12, Q13, Q14, PQ3.) **Refined by D11:** the commit target
(current branch vs. a fresh `chore/archive-<id>` branch) is now proposed at
archive time rather than always the current branch.

### D8 — `stack.md`'s `## PR & git workflow` template gains a parallel status-query line
So that newly-generated cheatsheets document the query the gate needs, the
`stack.md` section template (`claude/commands/stack.md:84–88`) gains a
status-query CLI line next to the existing PR-create line — e.g. "the PR-status
query CLI (`gh pr view <N> --json state`, `az repos pr show --id <N>`,
`glab mr view <N>`)". This is documentation-only and does not retro-fit existing
cheatsheets (D3's fallback covers repos without one). (Supports PQ4.)

### D9 — `workflow` skill gains a forward-reference naming `/qrspi:archive` as the row-removal owner
PQ3 asks for `workflow`'s "Before Q — the backlog" wording to name
`/qrspi:archive` as the command that removes the archived row (it becomes the
first and only command that removes a completed `in-progress` row, closing the
lifecycle gap Q12 identifies). Edit the sentence "update the matching row
whenever a change is proposed, merged, or archived (remove archived rows …)" to
add: "— `/qrspi:archive` is the command that performs that removal, atomically
with the folder move." No other `workflow` semantics change. (Answers Q11–Q13, PQ3.)

### D10 — No new lint check; verification is a manual dogfood walk
Research's Check-4 (README↔command bidirectional coverage) already passes —
`/qrspi:archive` is documented and no README prose describes today's
unconditional-move behavior (Q18 confirms no stale prose). A new lint check
asserting "`archive.md` references the PR-status step" would be weak (it cannot
verify actual `gh` behavior statically) and is explicitly the *weak* option (d)
in Q22. **Chosen:** no new `scripts/lint.mjs` check; verify by manual dogfood —
run `/qrspi:archive` against an open PR (confirm block), merge, re-run (confirm
proceed), plus the closed-unmerged negative path (Q22 a+b). The `example-greeting`
reference change already has a merged PR to double as the happy path (Q23).
(Answers Q22, Q23.)

### D11 — The archive commit proposes its target: a new branch (default) or straight to main
**Scope amendment (added post-dogfood, 2026-07-13).** D7 introduced the archive
flow's commit step but committed-and-pushed unconditionally on the *current*
branch. Dogfooding surfaced the gap: `/qrspi:archive` runs **after the PR has
merged**, so the human is typically sitting on `main`, and the archive is not a
trivial move — the `openspec-archive-change` skill **syncs the change's delta
specs into `openspec/specs/`** (a real content change to the main specs) on top
of the folder move and backlog-row removal. Pushing all of that straight to
`main` silently bypasses branch protection and a second review.

So the D7 commit step (step 5) gains a **target proposal**: after staging the
archive changes but before committing, `/qrspi:archive` asks (AskUserQuestion)
where to land the commit:
- **"New branch + push (open a PR)"** — the **default/recommended** option:
  create `chore/archive-<id>` off the current HEAD, commit the staged changes
  there, `git push -u`, and print the host PR-create command as the suggested
  next step (mirroring how `pr.md` surfaces its PR-create line). Rationale:
  syncing delta specs into `openspec/specs/` is a reviewable content change and
  keeps `main` protected.
- **"Commit straight to main"** — commit + push on the current branch (D7's
  original behavior), for repos/humans that treat archival as post-merge
  bookkeeping.

Both paths are otherwise identical to D7: same explicit staged paths (never
`git add -A`), same commit message `chore(<id>): archive change + remove backlog
row`, and the same non-zero-git-exit hard-stop. The proposal is always shown (it
is a genuine target decision, like a backlog-capture offer); the branch name is
fixed as `chore/archive-<id>`, not prompted. This refines D7; it does not change
what is committed, only where. (Supersedes D7's "commit on the current branch"
default; answers the post-dogfood scope request.)

## Data model changes
Not applicable — this is a kit/workflow-tooling change. The closest analogues:
the `pr.md` artifact shape (read-only consumer here: the `- **PR:** #<N>` line)
and the `backlog.md` row format (`### <id> — \`<status> (<note>)\`` — removed
whole on archive).

## API surface
No HTTP/RPC surface. The "API" is the host git CLI's PR-query invoked via the
**Bash tool** at runtime (PQ5, Q16): `gh pr view <N> --json state,url,number`
(or `az repos pr show --id <N>` / `glab mr view <N>`). This mirrors how `pr.md`
already runs `git status --short` via the Bash tool — **not** literal
`!`-prefixed shell-injection in the command body (which CLAUDE.md forbids and the
static permission checker rejects). No Node helper is built (PQ5). Failure modes:
CLI-missing/auth-fail → D6 hard-stop; PR present but non-merged → D5 hard-stop.

## UI surface
No UI. The user-facing surface is `archive.md`'s stdout: the surfaced PR
state line (D5), the two hard-stop messages (D5 non-merged, D6 CLI-unavailable),
and the missing-`pr.md` hard-block (D2). All hard-stops route through the
orchestrator's AskUserQuestion per `workflow`'s hard-stop procedure.

## Authorization
Not applicable — no roles. The implicit "authorization" is the host CLI's own
auth (the human must be `gh auth login`'d); D6 handles the unauthenticated case.

## Vertical slices (preview)
Three user-facing slices (Structure will detail; each ends demoable end-to-end):
- **Slice 1 — Block path: archive refuses an unmerged/missing/unauth PR.** The
  PR-merge gate (D1–D6) inserted into `archive.md`, plus the `stack.md` template
  line (D8). Demo: run `/qrspi:archive` on a change with an open PR → it surfaces
  the state and hard-stops; with missing `pr.md` → hard-blocks; with the CLI
  logged out → actionable hard-stop.
- **Slice 2 — Merge path: archive proceeds, removes the backlog row, commits.**
  The successful-archive branch (D7 commit step + row removal) plus the `workflow`
  wording (D9). Demo: merge the PR, re-run `/qrspi:archive` → folder moves,
  backlog row disappears, one atomic commit lands. Then regenerate copilot + sync.
- **Slice 3 — Commit-target proposal: branch or main (D11).** The D7 commit step
  gains the branch-vs-main AskUserQuestion (default `chore/archive-<id>` + PR
  suggestion). Demo: on a merged-PR archive, confirm the prompt appears, the
  branch path lands the archive on `chore/archive-<id>` and prints the PR-create
  command, and the main path commits on the current branch as before. Regenerate
  copilot + sync. (Scope amendment — added after the Slice 1/2 dogfood.)

## Risks / Trade-offs
- **Introducing the archive flow's first commit step (D7)** is the biggest
  behavioral change and the one most worth human scrutiny. If the human prefers
  archive to stay commit-free (leaving the commit to a human/CI), PQ3's atomicity
  requirement cannot be met — flag this explicitly.
- **`plain mv` vs `git mv` staging (D7).** The generated skill uses plain `mv`;
  the commit step must stage both the new path and the old-path deletion
  correctly. Stage I must verify the exact `git add` incantation moves cleanly.
- **No stack-cheatsheet fallback correctness (D3).** Host inference from repo
  signals is a heuristic; a repo with an unusual remote could mis-infer. Default
  to `gh`; the human can add a cheatsheet line to be explicit.
- **CLI flag drift (D4).** `--json`/`-q` shapes may differ across CLI versions;
  the fallback-to-human-readable-output watch-item mitigates but Stage I must
  confirm against the installed CLIs.
- **`pr.md` field drift (D2).** The extractor must tolerate the documented
  non-canonical shapes; a too-strict parser would falsely hard-block a valid change.
- **Copilot parity (Q21).** The mechanical `sync-copilot.mjs` produces a working
  (if unverified) Copilot analogue; deep port quality stays with
  `reassess-copilot-port`. `sync-copilot.mjs --check` must exit 0 (Q20).

## Open questions for the human
- [x] None blocking. All 8 product questions (PQ1–PQ8) are answered and binding.
  The three decisions most worth a human's eye before Structure: **D7** (introduce
  the archive flow's first-ever commit step — confirm this is wanted, vs. leaving
  the commit to the human), **D3** (the no-cheatsheet host-inference fallback and
  `gh` default), and **D2**'s `pr.md`-drift-tolerant number extraction.
