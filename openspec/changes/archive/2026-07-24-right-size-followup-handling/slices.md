# Slices — right-size-followup-handling

> Stage V of QRSPI. Generated 2026-07-24.
> Vertical slices, not horizontal layers.

## Overview

This change is a prose-only kit-behavior change: there is no mock API, no DB,
and no browser UI. The "product" is the QRSPI slash-command kit itself, so each
slice is a demoable end-to-end behavior of `/qrspi:followup` observable by a
human running the dev-installed kit. "Vertical" here means each slice ends with
a new, independently exercisable path through the command — the human can
install the in-development plugin (`claude --plugin-dir <repo-root>`) and
verify the slice's checkpoint without the next slice being written.

The four slices follow the design's preview (which is already vertically
structured): triage gate + P1 (Slice 1), P3 defer path (Slice 2), P2 in-place
scope-amendment path (Slice 3), and cross-cutting finishers — least-friction
offers, workflow summary, copilot resync, and lint Check 10 (Slice 4). Each slice is an independently demoable kit path;
Slice 4 is the infrastructure finisher that gives CI the mechanical floor.

Because this is a prompt-engineering / docs kit (no mock-API or DB tier), the
M/F/D/T bullets below are adapted: M = the prose block being authored in the
command file; F = the end-to-end user-visible behavior of the slash command; D =
any persistent side effects on disk (files the command creates or edits at
runtime); T = lint assertions + manual checkpoint. The `(D<n>)` tags embedded
throughout this file are required — this `slices.md` dogfoods the rule it
describes.

## Slices

### Slice 1 — Triage gate + P1 pass-through

A human running `/qrspi:followup <id>` on a small in-scope fix now sees a
triage `AskUserQuestion` before the implementer spawns. On selecting P1 the
implementer launches exactly as before; no new annotation appears on
`followups.md`. P2 and P3 choices appear but are stubbed ("not yet
implemented") so the command does not break on those branches while the later
slices are being written.

- M: author the self-assessment block (four heuristic signals evaluated in
  prose, yielding a proposed path + one-line rationale) and the D4
  `AskUserQuestion` (three choice labels verbatim) inside
  `claude/commands/followup.md`; stub P2/P3 branches with a clear "path not
  yet wired" error message so a human who picks P2/P3 is told to wait (D1, D2,
  D3, D4)
- F: `/qrspi:followup <id>` — after preconditions pass, the triage question
  surfaces; selecting P1 proceeds to the existing FIX MODE implementer spawn
  with no extra annotation; selecting P2 or P3 surfaces the stub message (D5)
- D: `followups.md` receives the existing `— fixed in <short-sha>` tick (P1
  path, unchanged); no new runtime files created by this slice
- T: manual checkpoint (see below); Slice 4's lint Check 10 will provide the
  mechanical floor — the anchor strings for all three choice labels are already
  present in this slice because the stubs contain the verbatim labels
- **Model:** sonnet — the triage gate is a new prose block but its structure is
  fully specified by D1–D5; no novel reasoning required, templating against the
  spec suffices
- Checkpoint: dev-install the plugin (`claude --plugin-dir <repo-root>`); run
  `/qrspi:followup <id>` targeting a clearly small fix; confirm (1) the triage
  `AskUserQuestion` appears before any implementer spawn, (2) selecting P1
  causes the implementer to launch in FIX MODE, and (3) selecting P2 or P3
  displays the stub message rather than crashing

### Slice 2 — P3 defer path

A human running `/qrspi:followup <id>` on an out-of-scope follow-up item can
now select P3 and see the command write a new `idea` row to
`openspec/backlog.md` and tick the `followups.md` entry with
`(deferred to backlog — <slug>)`. The turn ends cleanly; no implementer is
spawned. This slice replaces the P3 stub from Slice 1.

- M: author the P3 execution block in `claude/commands/followup.md`:
  derive the kebab slug from the follow-up title, append the `idea` row under
  `## Ideas` in `openspec/backlog.md` (status ``idea`` + `· **P3**` priority +
  `**Why:**` paragraph), tick `followups.md` with
  `(deferred to backlog — <slug>)`, stage both files in one commit, end the
  turn (D10, D11)
- F: `/qrspi:followup <id>` — on P3 selection, the command writes the backlog
  row and ticked entry; the implementer is never spawned; the turn ends with a
  confirmation message naming the slug and the ticked item (D5, D10, D11)
- D: `openspec/backlog.md` gains one `idea` row; `openspec/changes/<id>/followups.md`
  gains a tick with `(deferred to backlog — <slug>)`; both written in the same
  commit (D11)
- T: manual checkpoint (see below); the P3 tick format is visually verifiable
  in `followups.md` and the backlog row is verifiable in `backlog.md`
- **Model:** sonnet — P3 mechanics mirror the existing `pr.md` "Promote to
  backlog idea" pattern precisely; the backlog row format is fully specified in
  D11; no novel reasoning required
- Checkpoint: dev-install the plugin; run `/qrspi:followup <id>` targeting a
  genuinely out-of-scope item; select P3; confirm (1) no implementer spawns,
  (2) `openspec/backlog.md` contains a new `idea` row with `· **P3**` and a
  `**Why:**` paragraph, (3) the `followups.md` entry reads
  `- [x] <text> (deferred to backlog — <slug>)`, and (4) `git diff --staged`
  shows both files staged together

### Slice 3 — P2 in-place scope-amendment path (dogfood checkpoint)

A human running `/qrspi:followup <id>` on a design-re-alignment follow-up that
still belongs to this change can now select P2 and see the command **amend the
parent change in place** — no separate folder, same branch, same open PR. The
command edits the affected `design.md` decision and/or delta `specs/**` in place,
appends a matching `## N.` vertical-slice group to both `slices.md` and
`tasks.md`, ticks `followups.md` with `(re-aligned in place -- slice N)`, commits
as `docs(<id>): amend scope -- <desc>`, and then **offers** (via
`AskUserQuestion`, not a printed command) to run `/qrspi:implement <id>` now.
This mirrors `implement.md`'s existing "Adding scope after stage I has started"
flow, applied post-PR. This slice replaces the P2 stub from Slice 1. The slice's
checkpoint is the dogfood run that satisfies OQ1: create a real
design-re-alignment follow-up for this very change, run
`/qrspi:followup right-size-followup-handling`, confirm it routes to P2 and
amends the parent in place + offers to build the slice.

- M: author the full in-place P2 execution block in
  `claude/commands/followup.md`: amend the approved `design.md`/delta `specs/**`
  in place (MAY spawn a `qrspi:designer` to draft, MUST NOT re-run
  `/qrspi:design`); load skill `vertical-slice` (+ stack-cheatsheet) then add a
  `## N.` slice group to `slices.md` AND `tasks.md` with a `**Model:**`
  annotation; tick `followups.md` with `(re-aligned in place -- slice N)`; commit
  staging the edited artifacts explicitly; then OFFER `/qrspi:implement <id>` via
  `AskUserQuestion`; also change the triage P2 choice label to
  `P2 — amend this change in place (extend the open PR)` (D4, D5, D5a, D5b, D6, D7)
- F: `/qrspi:followup <id>` — on P2 selection, no folder/entry-stage/branch
  question; the `design.md`/delta specs are edited in place, a `## N.` slice
  group appears in both `slices.md` and `tasks.md`, `followups.md` is ticked, the
  amendment commits on the parent's branch, and the turn offers to run
  `/qrspi:implement <id>` now; no implementer spawns to triage (D5, D5b, D6, D7)
- D: `design.md` and/or delta `specs/**` edited in place; a `## N.` group added to
  `slices.md` and `tasks.md`; `openspec/changes/<id>/followups.md` ticked
  `(re-aligned in place -- slice N)`; all in one `docs(<id>): amend scope` commit
  on the parent's branch (D5b, D7)
- T: manual dogfood checkpoint (see below); the in-place edits and ticked entry
  are verifiable with `git diff` and by reading `followups.md`
- **Model:** opus — P2 is the most novel mechanics in this change: it reuses
  `implement.md`'s "Adding scope after stage I" flow post-PR, editing the approved
  `design.md`/delta specs in place and appending a matching `## N.` slice group to
  both `slices.md` and `tasks.md`, with the cross-cutting rule that P2 never
  re-runs a stage command and never creates a folder/branch/PR (D5b, D5a)
- Checkpoint (dogfood — satisfies OQ1): dev-install the plugin; identify a
  real design-re-alignment follow-up for `right-size-followup-handling` (e.g.,
  one that touches both `followup.md` and a `design.md` decision); run
  `/qrspi:followup right-size-followup-handling`; confirm the triage proposes P2
  (signal 3 fires); select P2; confirm (1) NO folder is created and NO
  entry-stage/branch question appears, (2) `design.md` and/or the delta specs are
  edited in place and a new `## N.` slice group appears in both `slices.md` and
  `tasks.md`, (3) `followups.md` reads `- [x] <text> (re-aligned in place --
  slice N)`, (4) the turn offers `/qrspi:implement right-size-followup-handling`
  via `AskUserQuestion` (not a printed command), (5) accepting the offer builds
  the new slice on the same branch through the normal slice/checkpoint machinery

### Slice 4 — Workflow summary + copilot resync + lint Check 10

All cross-cutting finishers land together: the least-friction "next follow-up"
offer (D6) is wired into all three paths; the `workflow` skill's "After PR —
the fix loop" section is updated to summarize the triage and three paths (with
P2 described as the **in-place scope amendment**, not a separate addendum
folder); the copilot artifacts are resynced to parity; Check 10 is added to
`lint.mjs` pinning the **new** P2 label; `node scripts/lint.mjs` exits zero. A
human can run `node scripts/lint.mjs` from the repo root and see all checks green
including the new Check 10. This is the infrastructure finisher slice; it has no
standalone user-facing behavior beyond "CI is green" and the chaining offer, and
is the only legitimate horizontal-ish slice in this change, because its
constituent parts (offer wiring, workflow prose, copilot sync, lint check) have
no meaningful ordering relative to each other and share a single verifiable
outcome.

- M: (a) wire the least-friction "next follow-up" offer (D6) into
  `claude/commands/followup.md` so it fires at the end of P1/P2/P3 when un-ticked
  follow-ups remain (`AskUserQuestion`, not a printed command); (b) update
  `claude/skills/workflow/SKILL.md`'s "After PR — the fix loop" section to
  summarize the triage gate and P1/P2/P3 paths, describing P2 as the in-place
  scope amendment (D10); (c) add `checkTriagePaths` async function and `main()`
  call to `scripts/lint.mjs` asserting the three choice-label prefixes
  (`"P1 — implement directly`, `"P2 — amend this change in place`,
  `"P3 — defer`) exist in `claude/commands/followup.md`, following the Check 8
  pattern (D8); (d) add one line to `CHANGELOG.md` under `## [Unreleased]`
- F: `node scripts/lint.mjs` — Check 10 reports `OK` (pinning the new P2 label);
  all other checks unchanged; `node sync-copilot.mjs --check` reports zero drift
  after `node sync-copilot.mjs` is run (D6, D8, D10)
- D: `copilot/prompts/qrspi-followup.prompt.md` regenerated (and any other
  copilot artifacts touched by the new followup.md + workflow prose);
  `copilot/` changes are written by running `node sync-copilot.mjs`, never
  hand-edited (D10)
- T: `node scripts/lint.mjs` exits zero with Check 10 `OK`; `node
  sync-copilot.mjs --check` exits zero (zero drift); `CHANGELOG.md` has the
  new line
- **Model:** sonnet — workflow prose update is mechanical summarization of
  decisions already made; lint check follows the Check 8 pattern exactly;
  copilot resync is a script invocation; no novel reasoning
- Checkpoint: from the repo root run `node scripts/lint.mjs`; confirm all
  checks including Check 10 report `OK` (pinning the `P2 — amend this change in
  place` label) and exit code is zero; run `node sync-copilot.mjs --check`;
  confirm zero drift reported; open `copilot/prompts/qrspi-followup.prompt.md`
  and confirm it reflects the in-place P2 prose and the least-friction offers
  added in Slices 3–4
