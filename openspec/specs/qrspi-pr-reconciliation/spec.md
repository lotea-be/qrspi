# qrspi-pr-reconciliation Specification

## Purpose
TBD - created by archiving change pr-review-open-tasks-and-followups. Update Purpose after archive.
## Requirements
### Requirement: Gate placement — after precondition, before reviewer spawn
The system MUST insert the pre-PR reconciliation gate into `claude/commands/pr.md`
between the precondition check (step 2) and the reviewer spawn (former step 3),
running on the main-loop orchestrator (not inside a subagent), so that
AskUserQuestion and `tasks.md` edits are reachable. The gate SHALL consist of
two sequential passes: (1) tasks pass, then (2) follow-ups pass.

#### Scenario: reconciliation gate position is between precondition and reviewer
- **WHEN** `/qrspi:pr <id>` is invoked and `tasks.md` exists with at least one
  un-ticked box
- **THEN** the orchestrator runs the tasks pass before spawning the reviewer
  subagent, not after.

#### Scenario: reviewer sees fully reconciled state
- **WHEN** both reconciliation passes complete without a Pause or redirect
- **THEN** the reviewer subagent is spawned only after all open items have
  received an explicit human decision, so the reviewer's ticked-box check
  encounters no unresolved normal tasks.

### Requirement: Softened precondition — file-exists + clean tree
The system MUST soften the PR stage precondition prose to "tasks.md exists +
working tree clean" (removing any assertion that all boxes must already be ticked
before the stage begins). The "all ticked" expectation SHALL become the exit
condition of the tasks pass, not an entry guard. This allows the reconciliation
gate to help the human resolve open tasks rather than refusing before the help
can run.

#### Scenario: PR stage starts with un-ticked tasks
- **WHEN** `/qrspi:pr <id>` is invoked and `tasks.md` has one un-ticked box
- **THEN** the precondition check passes (file exists + tree clean), and the
  orchestrator proceeds to the reconciliation gate rather than refusing.

#### Scenario: PR stage still refuses if tasks.md is absent
- **WHEN** `/qrspi:pr <id>` is invoked and no `tasks.md` file exists in the
  change folder
- **THEN** the precondition check fails and the orchestrator asks the human to
  run `/qrspi:plan <id>` first.

### Requirement: Count banner shown before per-item loops
The system MUST display a count banner before starting the per-item
reconciliation loops, reporting the number of un-ticked regular task boxes,
the number of un-ticked `(human)`-tagged task boxes, and the number of
un-resolved follow-up entries. The banner is shown in Manual mode always; in
Full/Semi-auto mode it is shown only when open items exist (a clean pass in
auto mode is silent).

#### Scenario: banner appears before the tasks pass loop
- **WHEN** the tasks pass finds N regular un-ticked boxes and K `(human)` boxes
- **THEN** the orchestrator shows a banner such as "Found N open tasks (K
  `(human)` boxes) and M un-resolved follow-ups — reviewing each now" before
  presenting the first per-item AskUserQuestion.

#### Scenario: zero-item banner in Manual mode
- **WHEN** Manual mode is active and both `tasks.md` and `followups.md` are
  fully ticked / absent
- **THEN** the orchestrator shows a "0 open — nothing to resolve" banner for
  each pass and continues without presenting per-item questions.

### Requirement: Tasks pass — Finish / Drop / Pause per un-ticked regular box
The system MUST walk every un-ticked `- [ ] N.M …` line in `tasks.md` that
does NOT carry a `(human)` tag and present a per-item AskUserQuestion with
exactly three choices: Finish, Drop, Pause. Each question MUST show the
parent `## N. <slice>` heading for context and a `(i of M)` counter.

- **Finish**: the orchestrator pauses and presents a second AskUserQuestion
  offering to redirect to `/qrspi:implement <id>` (then re-run `/qrspi:pr
  <id>`), or to stop here. The orchestrator MUST NOT write any code inline.
- **Drop**: the box is rewritten to `- [x] ~~N.M <text>~~ (dropped)`,
  self-documenting the intentional skip. The resulting line reads as ticked
  and satisfies the reviewer's check.
- **Pause**: the orchestrator stops the pass, ends the turn, and instructs the
  human to re-run `/qrspi:pr <id>` when ready.

#### Scenario: Drop annotates with strikethrough and (dropped) suffix
- **WHEN** the human chooses Drop for task `- [ ] 2.3 Wire the endpoint`
- **THEN** the orchestrator rewrites that line to
  `- [x] ~~2.3 Wire the endpoint~~ (dropped)` in `tasks.md`, and the pass
  continues to the next un-ticked box.

#### Scenario: Finish redirects to implement, not inline code
- **WHEN** the human chooses Finish for an un-ticked task
- **THEN** the orchestrator presents a second AskUserQuestion: "Run
  `/qrspi:implement <id>` now, then re-run `/qrspi:pr <id>`?" with choices
  [Yes — redirect, Stop here], and does NOT write any code itself.

#### Scenario: Pause ends the turn immediately
- **WHEN** the human chooses Pause for any task
- **THEN** the orchestrator stops the tasks pass immediately, does not start
  the follow-ups pass, and ends the turn with a note to re-run
  `/qrspi:pr <id>`.

#### Scenario: all boxes are ticked after the tasks pass
- **WHEN** the tasks pass completes without a Pause or redirect (all un-ticked
  boxes were Finished or Dropped)
- **THEN** every line in `tasks.md` that was a `- [ ]` box (excluding
  Leave-for-now `(human)` boxes) is now a `- [x]` box.

### Requirement: Tasks pass — distinct (human)-tag path
The system MUST detect any un-ticked `- [ ] N.M …` line whose text carries
the `(human)` tag and route those boxes to a separate AskUserQuestion with
exactly three choices: Confirm-done, Drop, Leave-for-now. These boxes SHALL
NOT be offered the Finish (code-redirect) choice.

- **Confirm-done**: the human confirms they performed the manual step; the box
  is ticked normally (`- [x] N.M <text>` with no `(dropped)` annotation).
- **Drop**: the same PQ5 annotation as a normal Drop:
  `- [x] ~~N.M <text>~~ (dropped)`.
- **Leave-for-now**: the box stays un-ticked and passes through to the reviewer
  without a Pause. This is the sole sanctioned exception to the reviewer's
  ticked-box check; a `(human)` box left via Leave-for-now is an expected open
  item, not a blocking oversight.

#### Scenario: (human) box gets Confirm-done / Drop / Leave-for-now prompt
- **WHEN** the tasks pass encounters `- [ ] 1.6 (human) Code-review checkpoint`
- **THEN** the orchestrator presents "Task 1.6 (human) — Code-review checkpoint
  is not ticked. (i of M) What would you like to do?" with choices
  [Confirm-done, Drop, Leave-for-now], NOT [Finish, Drop, Pause].

#### Scenario: Leave-for-now passes box through un-ticked
- **WHEN** the human chooses Leave-for-now for a `(human)`-tagged box
- **THEN** the box remains `- [ ] 1.6 (human) Code-review checkpoint` in
  `tasks.md` (unchanged), and the pass continues to the next item without
  ending the turn.

#### Scenario: Confirm-done ticks the box without (dropped) annotation
- **WHEN** the human chooses Confirm-done for `- [ ] 1.6 (human) Code-review
  checkpoint`
- **THEN** the orchestrator rewrites that line to
  `- [x] 1.6 (human) Code-review checkpoint` (no `~~strikethrough~~` or
  `(dropped)` annotation).

### Requirement: Follow-ups pass — Fix now / Defer / Drop / Promote per entry
The system MUST walk every un-ticked entry in `followups.md` and present a
per-item AskUserQuestion with exactly four choices: Fix now, Defer, Drop,
Promote to backlog idea. The follow-ups pass MUST run after the tasks pass.
The pass MUST tolerate `followups.md` being absent, present but prose-only,
or fully ticked — all three collapse to a clean pass.

- **Fix now**: the orchestrator presents a second AskUserQuestion offering to
  redirect to `/qrspi:followup <id>` (then re-run `/qrspi:pr <id>`), or to
  stop here. The orchestrator MUST NOT spawn an implementer inline.
- **Defer**: the entry is left un-ticked and unchanged in `followups.md`; no
  annotation is added. The entry will be resolved post-PR via
  `/qrspi:followup`.
- **Drop**: the entry is ticked (`- [x]`) with a `(dropped — no longer needed)`
  annotation appended. The entry is not deleted so the drop leaves a trace.
- **Promote to backlog idea**: one `idea` row is added to
  `openspec/backlog.md` (reusing the "Capturing deferred work" offer machinery
  from the workflow skill), then the entry in `followups.md` is ticked with a
  `(promoted to backlog)` annotation.

#### Scenario: absent followups.md is a clean pass
- **WHEN** the follow-ups pass runs and `followups.md` does not exist in the
  change folder
- **THEN** the pass is treated as clean (zero un-resolved entries) and
  continues without error or per-item prompts.

#### Scenario: prose-only followups.md is a clean pass
- **WHEN** `followups.md` exists but contains no `- [ ]` checkbox lines
- **THEN** the pass is treated as clean and continues without per-item prompts.

#### Scenario: Drop annotates the entry without deleting it
- **WHEN** the human chooses Drop for a follow-up entry
- **THEN** the entry is changed from `- [ ] …` to `- [x] … (dropped — no
  longer needed)` in `followups.md`, and the entry is not removed.

#### Scenario: Promote adds a backlog idea row and annotates the entry
- **WHEN** the human chooses Promote to backlog idea for a follow-up entry
- **THEN** one new `idea` row is appended to `openspec/backlog.md` describing
  the follow-up, and the `followups.md` entry is ticked with
  `(promoted to backlog)` annotation.

#### Scenario: Fix now redirects to followup command, not inline
- **WHEN** the human chooses Fix now for a follow-up entry
- **THEN** the orchestrator presents a second AskUserQuestion: "Run
  `/qrspi:followup <id>` now, then re-run `/qrspi:pr <id>`?" with choices
  [Yes — redirect, Stop here], and does NOT spawn an implementer subagent
  inline.

#### Scenario: Defer leaves entry unchanged
- **WHEN** the human chooses Defer for a follow-up entry
- **THEN** the entry remains un-ticked and unannotated in `followups.md`; the
  pass continues to the next entry.

### Requirement: Commit timing — fold into PR-link commit or early-exit commit
The system MUST handle reconciliation edits in one of two commit paths:

- **Normal path** (no Pause / redirect): Drop annotations to `tasks.md` and
  `followups.md`, plus any `openspec/backlog.md` Promote row, are folded into
  the existing final `docs(<id>): record PR #<N> link` commit by adding those
  paths to the explicit `git add` list. No separate intermediate commit is
  issued for reconciliation edits alone.
- **Early-exit path** (Pause or Finish/Fix-now redirect chosen before PR
  creation): any `tasks.md` Drop edits already made MUST be committed in a
  small `docs(<id>): reconcile open tasks before PR` commit before the turn
  ends, so the edits are not left in a dirty working tree that would cause the
  next `/qrspi:pr <id>` invocation's clean-tree precondition to fail.

#### Scenario: Drop edits folded into PR-link commit on normal path
- **WHEN** the human drops two tasks and one follow-up during reconciliation,
  then completes the PR stage (reviewer runs, PR is created)
- **THEN** the `docs(<id>): record PR #<N> link` commit includes
  `tasks.md`, `followups.md`, and `pr.md` (and `openspec/backlog.md` if a
  Promote was chosen) — no separate intermediate commit exists for the
  reconciliation edits.

#### Scenario: early-exit commits pending Drop edits before ending the turn
- **WHEN** the human drops one task, then chooses Pause on the next task
- **THEN** the orchestrator commits the already-applied Drop edit to
  `tasks.md` in a `docs(<id>): reconcile open tasks before PR` commit before
  ending the turn, so the working tree is clean for the next run.

### Requirement: PR stage triages trivial in-scope gaps in-stage before seeding followups
The PR stage orchestrator MUST apply a triage rule in the "Seed the follow-up
queue" step before writing `followups.md`: a trivial, in-scope, must-fix-before-merge
gap (for example a missing CHANGELOG entry or a single-line prose correction) MUST
be fixed in-stage — the orchestrator applies the edit and commits it atomically in
its own commit — and the issue MUST be treated as resolved without creating a
`followups.md` entry. Only issues that are genuinely post-PR-shaped (require their
own branch, span multiple capabilities, or need design re-alignment) MUST seed
`followups.md`. The orchestrator MUST surface its triage decision — listing which
issues it fixed in-stage and which it deferred — so the human can override. In a
mixed case where one issue is trivial and another is post-PR-shaped, the trivial
issue is fixed in-stage and the post-PR-shaped issue still seeds `followups.md`.

#### Scenario: trivial CHANGELOG gap fixed in-stage
- **WHEN** the reviewer flags a missing `## [Unreleased]` CHANGELOG entry and
  no other issues are open
- **THEN** the PR stage orchestrator applies the CHANGELOG edit and commits it
  atomically (its own commit), treats the issue as resolved, and does NOT create
  a `followups.md` entry for it.

#### Scenario: orchestrator surfaces triage decision for override
- **WHEN** the PR stage applies an in-stage fix and defers another issue
- **THEN** the orchestrator states which issues it fixed in-stage and which it
  deferred to `followups.md` so the human can override before the turn ends.

#### Scenario: post-PR-shaped issue still seeds followups.md
- **WHEN** a reviewer flags an issue that requires a new branch or design
  re-alignment
- **THEN** the PR stage treats that issue as post-PR-shaped and seeds a
  `followups.md` entry for it, regardless of the in-stage triage rule.

#### Scenario: mixed trivial and post-PR issues handled correctly
- **WHEN** the reviewer flags both a missing CHANGELOG entry (trivial) and a
  capability gap requiring its own branch (post-PR-shaped)
- **THEN** the orchestrator fixes the CHANGELOG entry in-stage (atomic commit,
  no followup entry) AND seeds a `followups.md` entry for the capability gap.

### Requirement: PR stage backlog note reflects actual draft-ness
The PR stage MUST record the backlog note in the "Record the PR link" step as
`in-progress (PR #<N> open)` when no `--draft` flag was passed to the PR-create
CLI call, and as `in-progress (draft PR #<N> open)` when `--draft` was passed.
The note MUST be derived from the orchestrator's own PR-create decision already
made in that stage run, with no additional CLI query.

#### Scenario: non-draft PR produces non-draft backlog note
- **WHEN** the PR stage creates a PR without the `--draft` flag
- **THEN** the backlog note is updated to `in-progress (PR #<N> open)` — not
  `in-progress (draft PR #<N> open)`.

#### Scenario: draft PR produces draft backlog note
- **WHEN** the PR stage creates a PR with the `--draft` flag
- **THEN** the backlog note is updated to `in-progress (draft PR #<N> open)`.

#### Scenario: note derived from create decision, not a CLI re-query
- **WHEN** the PR stage records the backlog note
- **THEN** it uses the draft/non-draft determination already made at PR-create
  time rather than issuing an additional `gh pr view --json isDraft` call.

