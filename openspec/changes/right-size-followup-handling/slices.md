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
structured): triage gate + P1 (Slice 1), P3 defer path (Slice 2), P2 addendum
path (Slice 3), and cross-cutting finishers — workflow summary, copilot resync,
and lint Check 10 (Slice 4). Each slice is an independently demoable kit path;
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

### Slice 3 — P2 addendum path (dogfood checkpoint)

A human running `/qrspi:followup <id>` on a large but still-in-scope follow-up
item can now select P2 and see the command: ask for the entry stage (D/S/V/P/I,
with a suggested value from the heuristic signals, no pre-selection); create the
sibling folder `openspec/changes/<id>-addendum-1/` **on the parent's branch**
(no branch question — a P2 addendum always extends the parent's open PR); tick
`followups.md` with `(routed to addendum <id>-addendum-1)`; and end the turn
with a handoff instruction to run `/qrspi:<stage> <addendum-id>`. This slice
replaces the P2 stub from Slice 1. The slice's checkpoint is the dogfood run
that satisfies OQ1: create a real multi-capability follow-up for this very
change, run `/qrspi:followup right-size-followup-handling`, confirm it routes to
P2 and produces the sibling folder + handoff.

- M: author the full P2 execution block in `claude/commands/followup.md`:
  Glob to determine N (max existing addendum + 1, defaulting to 1); ask entry
  stage (AskUserQuestion offering D/S/V/P/I, agent suggestion but no
  pre-selection); stay on the parent's branch (no branch question, no
  `git checkout -b` / `push -u`); mkdir the sibling folder; tick `followups.md`
  with `(routed to addendum <addendum-id>)`; end turn with handoff instruction
  `/qrspi:<stage> <addendum-id>` (D6, D7, D8, D8a, D9, D10)
- F: `/qrspi:followup <id>` — on P2 selection, one `AskUserQuestion` for the
  entry stage (no branch question); then the sibling folder appears on disk on
  the parent's branch, the `followups.md` entry is ticked, and the turn ends
  with the handoff instruction; no implementer spawns (D5, D6, D7, D8, D9, D10)
- D: `openspec/changes/<id>-addendum-1/` created as a flat sibling folder;
  `openspec/changes/<id>/followups.md` ticked with addendum note; both in the
  same commit (D6, D7, D10)
- T: manual dogfood checkpoint (see below); the sibling folder and ticked entry
  are verifiable with `ls openspec/changes/` and `cat
  openspec/changes/<id>/followups.md`
- **Model:** opus — P2 is the most novel mechanics in this change: Glob-based
  N computation, the entry-stage `AskUserQuestion`, sibling-folder creation on
  the parent's branch, and a handoff that must preserve the re-entered stage's
  gates; this is a first-of-kind pattern with cross-cutting edge cases
  (D9's stage-I watch-item, N increment logic, the same-branch/open-PR rule per
  D8/D8a)
- Checkpoint (dogfood — satisfies OQ1): dev-install the plugin; identify a
  real multi-capability follow-up for `right-size-followup-handling` (e.g., one
  that touches both `followup.md` and `workflow/SKILL.md` and requires a design
  decision revision); run `/qrspi:followup right-size-followup-handling`;
  confirm the triage proposes P2 (signal 2+3 fire); select P2; confirm (1) the
  entry-stage question appears offering D/S/V/P/I with a suggested stage and no
  pre-selection, (2) NO branch question appears and the addendum stays on the
  parent's branch, (3) `ls
  openspec/changes/right-size-followup-handling-addendum-1/` succeeds, (4)
  `followups.md` reads `- [x] <text> (routed to addendum
  right-size-followup-handling-addendum-1)`, (5) the turn ends with the handoff
  instruction naming the correct `/qrspi:<stage>` command

### Slice 4 — Workflow summary + copilot resync + lint Check 10

All cross-cutting finishers land together: the `workflow` skill's "After PR —
the fix loop" section is updated to summarize the triage and three paths; the
copilot artifacts are resynced to parity; Check 10 is added to `lint.mjs`;
`node scripts/lint.mjs` exits zero. A human can run `node scripts/lint.mjs`
from the repo root and see all checks green including the new Check 10. This is
the infrastructure finisher slice; it has no standalone user-facing behavior
beyond "CI is green" and is the only legitimate horizontal-ish slice in this
change, because its constituent parts (workflow prose, copilot sync, lint check)
have no meaningful ordering relative to each other and share a single
verifiable outcome.

- M: (a) update `claude/skills/workflow/SKILL.md`'s "After PR — the fix loop"
  section to summarize the triage gate and P1/P2/P3 paths (D12); (b) add
  `checkTriagePaths` async function and `main()` call to `scripts/lint.mjs`
  asserting the three choice-label prefixes (`"P1 — implement directly`,
  `"P2 — addendum`, `"P3 — defer`) exist in `claude/commands/followup.md`,
  following the Check 8 pattern (D13); (c) add one line to `CHANGELOG.md`
  under `## [Unreleased]`
- F: `node scripts/lint.mjs` — Check 10 reports `OK`; all other checks
  unchanged; `node sync-copilot.mjs --check` reports zero drift after
  `node sync-copilot.mjs` is run (D12, D13)
- D: `copilot/prompts/qrspi-followup.prompt.md` regenerated (and any other
  copilot artifacts touched by the new followup.md + workflow prose);
  `copilot/` changes are written by running `node sync-copilot.mjs`, never
  hand-edited (D12)
- T: `node scripts/lint.mjs` exits zero with Check 10 `OK`; `node
  sync-copilot.mjs --check` exits zero (zero drift); `CHANGELOG.md` has the
  new line
- **Model:** sonnet — workflow prose update is mechanical summarization of
  decisions already made; lint check follows the Check 8 pattern exactly;
  copilot resync is a script invocation; no novel reasoning
- Checkpoint: from the repo root run `node scripts/lint.mjs`; confirm all
  checks including Check 10 report `OK` and exit code is zero; run `node
  sync-copilot.mjs --check`; confirm zero drift reported; open
  `copilot/prompts/qrspi-followup.prompt.md` and confirm it reflects the triage
  gate prose added in Slices 1–3
