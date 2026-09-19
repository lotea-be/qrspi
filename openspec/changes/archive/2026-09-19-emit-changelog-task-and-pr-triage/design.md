# Design — emit-changelog-task-and-pr-triage

> Stage D of QRSPI. Generated 2026-09-19.
> **Implementation is BLOCKED until a human approves this file.**

## Context

`CLAUDE.md` and the stack cheatsheet mandate that any change touching shipped
kit behaviour (a `claude/**`, `openspec-templates/**`, or `scripts/**` edit)
record itself under `## [Unreleased]` in `CHANGELOG.md`. Today nothing in the
QRSPI flow emits that work: the planner (stage P) mechanically translates each
`slices.md` slice into a `tasks.md` group and has **no mechanism** for a
cross-cutting task not tied to a slice (research Area 1). So the CHANGELOG
entry is only noticed at PR review — and when the reviewer flags it, `pr.md`
routes *every* open issue to `followups.md` and (per the misleading note text)
implies a draft PR, treating a one-line must-fix-before-merge gap as post-PR
scope (research Area 3, Notable discrepancy 1).

This change closes that loop end-to-end. After it ships: the planner emits a
standing CHANGELOG housekeeping task whenever the change is kit-touching; a new
lint Check 25 backstops that emission mechanically; the PR stage gains a triage
rule that fixes a trivial in-scope gap in-stage (atomic commit, no followup, no
forced draft) instead of deferring it; and the backlog note reflects real
draft-ness. The five product questions (PQ1–PQ5) are settled at Q and are baked
in below as decisions, not reopened.

## Goals / Non-Goals

**Goals:**
- The planner emits a regular `- [ ]` CHANGELOG task when `slices.md` mentions a
  kit-file path, and skips it for pure docs/backlog-only changes (PQ1, PQ2).
- A new numbered lint check mechanically asserts a kit-touching change's
  `tasks.md` carries that task (PQ5).
- `pr.md` gains a prose triage rule so a trivial in-scope must-fix gap is fixed
  in-stage and committed atomically, with only post-PR-shaped issues seeding
  `followups.md` (PQ3).
- The backlog PR note reflects actual draft-ness, `PR #<N> open` vs `draft PR
  #<N> open`, using the create decision the orchestrator already made (PQ4).
- This change dogfoods its own rule: it edits kit files, so its `tasks.md` must
  carry the CHANGELOG task and its `CHANGELOG.md` must gain an `## [Unreleased]`
  entry.

**Non-Goals:**
- Multi-vendor draft-ness (Azure DevOps / GitLab `--draft`). GitHub is the sole
  target, matching the backlog row scope (Q4). The note logic keys off the
  orchestrator's own create decision, so it is vendor-agnostic by construction
  without enumerating flags.
- A `(human)` checkpoint for the CHANGELOG task — explicitly rejected at PQ1.
- Making the PR triage a per-issue `AskUserQuestion` or a reviewer-emitted tag —
  explicitly rejected at PQ3.
- Reconciling the pre-existing `stage-choreography` ↔ `workflow` duplicated
  commit-step text (research Notable discrepancy 2). Unrelated defect, not
  surfaced-as-new-work by this design; leave it be.
- Authoring a `migrations/*.yaml` entry for this change now (see D6).

## Decisions

### D1 — Where the CHANGELOG rule lives: planner agent, not plan.md

The rule lives in `claude/agents/planner.md` (the subagent that owns `tasks.md`
output), NOT in `claude/commands/plan.md`. The task is planner *output*, and the
planner's `slices.md`-only read contract already carries exactly the signal the
skip rule needs (D2) — so the rule is self-contained where the file is written.
Routing it through `plan.md` as an orchestrator post-processing step (Q1
candidate) would split the emission logic from the file that emits and force the
orchestrator to re-open `tasks.md` after the subagent wrote it. Rejected:
plan.md-only, and "both". (Answers Q1.)

### D2 — Skip rule: scan slices.md for kit-file paths

The planner decides whether to emit by scanning `slices.md` for any mention of
`claude/`, `openspec-templates/`, or `scripts/lint.mjs` (equivalently
`scripts/`). Emit the task when any appears; skip otherwise. This is
self-contained (respects the `slices.md`-only read contract), maps directly onto
`CLAUDE.md`'s "shipped kit behaviour" trigger, and needs no orchestrator flag.
Rejected: always-emit (over-fires on docs/backlog-only changes) and an
orchestrator-passed flag (breaks self-containment). (Settles PQ2, Q6.)

### D3 — Insertion point and task text

Append the CHANGELOG task as a **standalone trailing housekeeping group** after
the last slice group, reusing the sanctioned optional-trailing-group slot
documented in `tasks.template.md` (`## N. Quality gate` / `## N. Final
verification`; research Area 2). Concretely a `## N. Housekeeping` group with a
single item. This keeps it a valid numbered group (Check-3 / template grammar)
without inventing a new artifact shape, and places it last because it is a
release-hygiene step, not slice work.

- **Group form:** `## N. Housekeeping` (N = last slice number + 1), with a
  `**Compute:** model=haiku effort=low — release-hygiene one-liner` annotation so
  Check 13 passes (every group needs a valid `**Compute:**`).
- **Task text (verbatim, from the backlog Shape):**
  `- [ ] N.1 Add a \`## [Unreleased]\` entry to \`CHANGELOG.md\` describing this change.`
- **No `(D<n>)` back-ref** — the task derives from a standing rule, not a design
  decision (matches the template's "omit citation for scaffolding" latitude).

Rejected: a prologue group before slice 1 (Q5b — buries slice work under
housekeeping) and a bare item appended inside the last slice group (Q5c — item
grammar `N.M` must match its group number, so it cannot be a floating item).
(Answers Q5, Q9; PQ1 fixes it as a regular `- [ ]`.)

### D4 — Divergence self-check amendment (hard-stop condition 4)

The planner's divergence self-check (`## Before returning`) must be amended so a
standing housekeeping task that does not trace to a `slices.md` bullet does NOT
trip hard-stop condition 4. Add a sentence to the planner's divergence paragraph:
the CHANGELOG housekeeping task is a **sanctioned standing task** the planner is
instructed to emit per D2 — it is expected non-slice-derived output, not
invented scope, so it is immaterial elaboration under the rubric. Without this,
the planner could self-flag its own required emission as divergence (b)
("introduces … not present in the approved design") and block. (Answers Q8.)

### D5 — Lint Check 25: mechanical backstop

Add `checkChangelogTaskEmission` as **Check 25** (highest existing is 24;
verified against the `await check*` sequence at `scripts/lint.mjs:4428+`). It
walks active change folders (`openspec/changes/**`, excluding `/archive/` — the
Check 13/14 precedent) and, for each folder judged **kit-touching**, asserts its
`tasks.md` carries a CHANGELOG task line.

- **Kit-touching detection (in-folder, no git diff):** a lint check runs
  statically over the tree and cannot diff the change's commits, so it must read
  the signal from *inside the change folder* — exactly the planner's D2 signal.
  Scan the folder's own `tasks.md` **and** its delta `specs/**` for a `claude/`,
  `openspec-templates/`, or `scripts/` path mention. If any appears, the folder
  is kit-touching. This reuses the Check 13 `walkMd` + basename-filter scan and
  keeps the lint's judgement identical to the planner's, so the two never
  disagree.
- **Task-presence signal:** match a `tasks.md` line that is a checkbox item AND
  contains `CHANGELOG` (case-sensitive substring). This is more robust than
  grepping the literal `## [Unreleased]` string (which the entry text may or may
  not quote) and does not require the planner to emit a magic slug the lint
  hard-codes (avoiding brittle slug coupling). Ticked or unticked both satisfy
  presence — the check asserts the task *exists*, not that it is done (that is
  the implementer's / PR reconcile gate's job). (Settles PQ5 detection signal;
  answers Q13, Q14 — no existing check's scope covers this, so a new numbered
  check is warranted.)
- **Registration:** write `async function checkChangelogTaskEmission(errors)`,
  call it in sequence after `checkResearcherGateInstruction`, add the `// 25.`
  header-block comment (lines 1–190), and update the check-count references
  (README, `qrspi-stack` cheatsheet `## Build, lint & test commands`,
  `CHANGELOG.md`). Include an inline self-test (the Check 13 convention).
- **Watch-item (stage I):** confirm at implementation that this change's *own*
  folder passes — its `tasks.md` (D3) and `specs/**` mention `claude/` +
  `scripts/`, so it is kit-touching and must carry the task. This is the
  dogfood.

### D6 — Migration manifest: none

This change is **kit-internal**, not consumer-visible, so it authors no
`migrations/*.yaml` entry. `tasks.md` is generated fresh each run; existing
consumer change folders are untouched by a new planner rule, and a lint check is
a CI-side gate consumers never invoke. Check 6 only requires a manifest for a
*released* `## [X.Y.Z]` CHANGELOG section at/above `0.6.0` — the manifest is
authored at release time (`/qrspi:release`), not in feature work. (The existing
`migrations/0.14.0.yaml` with no matching released `## [0.14.0]` section confirms
manifests lead releases, not features.) (Answers Q16.)

### D7 — PR triage rule (prose in pr.md) and draft-ness note

Two edits to `claude/commands/pr.md`, both prose-local (no skill mirror needed —
Q2, Q10, Q11: `postpr-fix`/`stage-choreography` describe the *post-PR* loop, a
different phase; the in-stage fix precedes seeding and belongs in `pr.md`):

- **(a) Triage before seeding.** In "Seed the follow-up queue", add a heuristic
  prose rule the orchestrator applies before writing `followups.md`: a *trivial,
  in-scope, must-fix-before-merge* gap (e.g. a missing CHANGELOG entry, a
  single-line prose correction) is fixed **in-stage** — apply the edit, commit
  it atomically (its own commit), treat the issue resolved (no `followups.md`
  entry). Only genuinely post-PR-shaped issues seed `followups.md`. The
  orchestrator **surfaces its triage decision** (which issues it fixed in-stage
  vs. deferred) so the human can override — not a per-issue `AskUserQuestion`,
  not a reviewer tag. Mixed case (Q20b): a trivial issue is fixed in-stage while
  a genuine one still seeds `followups.md`. (Settles PQ3.)
- **(b) Draft-ness note.** In "Record the PR link", make the backlog note
  conditional on the create decision the orchestrator already made: `in-progress
  (PR #<N> open)` when no `--draft` was passed, `in-progress (draft PR #<N>
  open)` when it was. Since the current GitHub path passes no `--draft`
  (research Area 5), the default note becomes the non-draft form, fixing the
  misleading hardcoded "draft" text (Notable discrepancy 1). No extra CLI query
  (PQ4 rejects `gh pr view --json isDraft`). (Settles PQ4, answers Q3.)

## Command changes

`claude/commands/pr.md`: the two D7 edits (triage rule in "Seed the follow-up
queue"; conditional draft note in "Record the PR link"). No change to `plan.md`
(D1). Check 8 anchors (`Fix now`/`Defer`/`Drop`/`Promote` in the follow-ups
pass) are untouched — the triage rule sits *upstream* of seeding and does not
alter the follow-up-loop choice labels.

## Agent changes

`claude/agents/planner.md`: add the D2 skip-rule + D3 emission instruction (a new
short subsection in `## What to do`), and the D4 divergence-exemption sentence.
The `> **Read contract**` banner is unchanged (still `slices.md` only) — the
rule reads nothing new. `Load skills` line unchanged (Check 2b).

## Skill changes

None. The triage and commit behaviour is `pr.md`-local (D7); `postpr-fix` and
`stage-choreography` are not touched (Q10, Q11). Called out explicitly so the
implementer does not "helpfully" mirror the rule into a skill and drift the
prose.

## Lint changes

Add Check 25 `checkChangelogTaskEmission` per D5: new function, sequenced call,
`// 25.` header comment, check-count reference updates, inline self-test.

## Template surface

Optional, low-value: `tasks.template.md` already documents the trailing
optional-group slot D3 reuses, so no template edit is strictly required. Decide
at S whether to add a one-line comment in the template noting the Housekeeping
group as a recognised pattern (keeps the template as the single source of truth)
or keep it clean and let the planner prose own it. Leaning: a brief comment, so
Check 3 heading-alignment stays coherent — but this is a judgement for S, not a
blocker. (Answers Q15.)

## Migration manifest

None authored by this change — see D6.

## Vertical slices (preview)

Value is realised only when the planner half and the PR half both ship (Q23:
fixing the planner alone still leaves the PR stage deferring the gap). Three
user-facing slices, each demoable end-to-end:

- **Slice 1 — Planner emits the CHANGELOG task.** Planner rule (D2, D3, D4) +
  Check 25 backstop (D5) together, so the slice is demoable as "run `/qrspi:plan`
  on a kit-touching fixture → a Housekeeping CHANGELOG task appears in
  `tasks.md`, and lint stays green; run on a docs-only fixture → no task, lint
  still green." (Pairing the planner rule with its own backstop keeps the slice's
  demo self-verifying.)
- **Slice 2 — PR stage triages in-stage + honest draft note.** The two `pr.md`
  edits (D7a, D7b), demoable as "reviewer flags a missing CHANGELOG entry → PR
  stage fixes it in-stage, commits atomically, opens a non-draft PR, backlog
  reads `PR #<N> open`."
- **Slice 3 — Dogfood this change.** This change's own `CHANGELOG.md`
  `## [Unreleased]` entry + confirm its `tasks.md` carries the CHANGELOG task and
  Check 25 passes on its own folder (D5 watch-item). Closes the loop by eating
  the dogfood.

(S will decide whether Slice 3 folds into Slice 1's checkpoint or stands alone.)

## Risks / Trade-offs

- **Check 25 / planner signal drift.** Both use the same
  `claude/`+`openspec-templates/`+`scripts/` path signal (D2, D5) but read it
  from different files — the planner from `slices.md`, the lint from `tasks.md` +
  `specs/**`. A change whose `slices.md` mentions a kit path but whose `tasks.md`
  does not could theoretically diverge. Mitigated by the planner always emitting
  the task when it fires (so the path *and* the task land together), and by the
  lint asserting task-presence rather than re-deriving it. Watch at stage I:
  keep both signals a single documented substring set.
- **Substring `CHANGELOG` match is loose.** Check 25's presence signal matches
  any checkbox line containing `CHANGELOG`, which could match an unrelated task.
  Accepted: a false-negative (missing task) is the failure we care about; a
  loose match only risks a false-*pass*, which is strictly safer than the status
  quo (no check at all). Tightening to `## [Unreleased]` was rejected (D5) as
  more brittle.
- **Triage over-reach.** A heuristic prose rule (D7a) trusting the orchestrator
  to classify "trivial in-scope" could pull genuinely post-PR work into an
  in-stage commit. Mitigated by surfacing the triage decision for human override
  (PQ3) and by scoping the examples tightly (missing CHANGELOG, single-line
  prose). Still a judgement call — the human sees it and can push an item back to
  `followups.md`.
- **What we still don't know.** The exact "trivial, in-scope" bound is left as a
  heuristic, not a line-count rule (research Open gap 4) — deliberately, since a
  hard bound would misfire. S/I should keep the examples illustrative, not an
  exhaustive allowlist.

## Open questions for the human

- [ ] None blocking. All five product questions (PQ1–PQ5) are settled at Q and
  baked into D1–D7. Two judgement calls are deferred to S as noted (not
  blockers): whether to add the Housekeeping-group comment to
  `tasks.template.md` (Template surface), and whether Slice 3 folds into Slice 1
  (Vertical slices preview).
