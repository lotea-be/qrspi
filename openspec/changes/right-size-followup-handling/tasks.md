# Tasks — right-size-followup-handling

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Triage gate + P1 pass-through

**Model:** sonnet — the triage gate is a new prose block but its structure is fully specified by D1–D5; no novel reasoning required, templating against the spec suffices

- [x] 1.1 Author the self-assessment block in `claude/commands/followup.md`: four heuristic signals evaluated in prose, yielding a proposed path + one-line rationale (D1, D2, D3)
- [x] 1.2 Add the D4 `AskUserQuestion` with three verbatim choice labels ("P1 — implement directly", "P2 — amend this change in place", "P3 — defer") immediately after the self-assessment block (D4)
- [x] 1.3 Wire the P1 branch: on P1 selection proceed to the existing FIX MODE implementer spawn with no extra annotation on `followups.md` (D5)
- [x] 1.4 Stub the P2 and P3 branches with a clear "path not yet wired" error message so a human who selects P2 or P3 is told to wait rather than crashing (D5)
- [x] 1.5 (human) Checkpoint: dev-install the plugin (`claude --plugin-dir <repo-root>`); run `/qrspi:followup <id>` targeting a clearly small fix; confirm (1) the triage `AskUserQuestion` appears before any implementer spawn, (2) selecting P1 causes the implementer to launch in FIX MODE, and (3) selecting P2 or P3 displays the stub message rather than crashing

## 2. P3 defer path

**Model:** sonnet — P3 mechanics mirror the existing `pr.md` "Promote to backlog idea" pattern precisely; the backlog row format is fully specified in D11; no novel reasoning required

- [x] 2.1 Author the P3 execution block in `claude/commands/followup.md`: derive a kebab slug from the follow-up title (D10)
- [x] 2.2 Append an `idea` row under `## Ideas` in `openspec/backlog.md` with status `idea`, `· **P3**` priority marker, and a `**Why:**` paragraph (D10, D11)
- [x] 2.3 Tick the `followups.md` entry with `(deferred to backlog — <slug>)` (D10, D11)
- [x] 2.4 Stage both `openspec/backlog.md` and `openspec/changes/<id>/followups.md` in one atomic commit; end the turn with a confirmation message naming the slug and the ticked item (D11)
- [x] 2.5 Remove the P3 stub wired in task 1.4 (replace with the real P3 block)
- [x] 2.6 (human) Checkpoint: dev-install the plugin; run `/qrspi:followup <id>` targeting a genuinely out-of-scope item; select P3; confirm (1) no implementer spawns, (2) `openspec/backlog.md` contains a new `idea` row with `· **P3**` and a `**Why:**` paragraph, (3) the `followups.md` entry reads `- [x] <text> (deferred to backlog — <slug>)`, and (4) `git diff --staged` shows both files staged together

## 3. P2 in-place scope-amendment path (dogfood checkpoint)

**Model:** opus — P2 is the most novel mechanics in this change: it must mirror `implement.md`'s "Adding scope after stage I" flow post-PR, editing the approved `design.md`/delta specs in place, appending a matching `## N.` slice group to both `slices.md` and `tasks.md`, and offering (not printing) `/qrspi:implement <id>` — a first-of-kind reuse of the scope-amendment flow with the cross-cutting rule that P2 never re-runs a stage command and never creates a folder/branch/PR (D5b, D5a)

- [x] 3.1 Author the P2 "amend in place" preamble in `claude/commands/followup.md`: the orchestrator does NOT spawn the implementer to triage, amends the parent change in place (no folder, same branch, same open PR), and routes to P3 if the parent PR is not open (D5, D5a, D5b)
- [x] 3.2 Author step P2.1 — amend the approved artifacts in place: edit the affected `design.md` `Dn` decision and/or delta `specs/**`; MAY spawn a `qrspi:designer` subagent to draft a design-level edit but MUST NOT re-run `/qrspi:design` or any stage command (D5b, Non-Goal)
- [x] 3.3 Author step P2.2 — load skill `vertical-slice` (+ stack-cheatsheet skill), then add a `## N.` vertical-slice group to `slices.md` AND a matching `## N.` group to `tasks.md`, each with a `**Model:**` annotation (D5b)
- [x] 3.4 Author step P2.3 — tick `openspec/changes/<id>/followups.md` with `(re-aligned in place -- slice N)` (ASCII `--`) (D7)
- [x] 3.5 Author step P2.4 — commit as `docs(<id>): amend scope -- <desc>`, staging the edited design/specs/slices/tasks/followups explicitly (backlog only if the parent status actually changes, which it normally does not) (D5b)
- [x] 3.6 Author step P2.5 — per least-friction (D6), OFFER via `AskUserQuestion` ("Scope amended (slice N added). Implement it now?" / choices "Run `/qrspi:implement <id>` now", "Not now"); on accept, re-enter `/qrspi:implement <id>` as a slash command (do NOT spawn the implementer directly) (D5b, D6)
- [x] 3.7 Remove the P2 stub wired in task 1.4 (replace with the real in-place P2 block); update the triage `AskUserQuestion` P2 choice label to `P2 — amend this change in place (extend the open PR)` (D4)
- [x] 3.8 (human) Checkpoint (dogfood — satisfies OQ1): dev-install the plugin; identify a real design-re-alignment follow-up for `right-size-followup-handling` (e.g. one touching both `followup.md` and a `design.md` decision); run `/qrspi:followup right-size-followup-handling`; confirm the triage proposes P2 (signal 3 fires); select P2; confirm (1) NO folder is created and NO entry-stage/branch question appears, (2) `design.md` and/or the delta specs are edited in place and a new `## N.` slice group appears in both `slices.md` and `tasks.md`, (3) `followups.md` reads `- [x] <text> (re-aligned in place -- slice N)`, (4) the turn offers `/qrspi:implement right-size-followup-handling` via `AskUserQuestion` (not a printed command), and (5) accepting the offer builds the new slice on the same branch through the normal slice/checkpoint machinery

## 4. Workflow summary + copilot resync + lint Check 10

**Model:** sonnet — workflow prose update is mechanical summarization of decisions already made; lint check follows the Check 8 pattern exactly; copilot resync is a script invocation; no novel reasoning

- [x] 4.1 Update `claude/skills/workflow/SKILL.md`'s "After PR — the fix loop" section to summarize the triage gate and P1/P2/P3 paths, describing **P2 as the in-place scope amendment** (edit design.md/delta specs in place + add a `## N.` slice group, same branch/open PR — NOT a separate addendum folder) (D10)
- [x] 4.2 Wire the least-friction "next follow-up" offer (D6) into `claude/commands/followup.md` so it fires at the end of P1, P2, and P3 when un-ticked follow-ups remain (`AskUserQuestion`, not a printed command); confirm the P2 "implement now?" offer is also present (D6)
- [x] 4.3 Add `async function checkTriagePaths(errors)` to `scripts/lint.mjs` asserting the three choice-label prefixes exist in `claude/commands/followup.md`; add one `checkTriagePaths(errors)` call in `main()`; update the numbered header-comment to include Check 10 (mirror the Check 8 `checkPrReconciliationPasses` pattern). NOTE: the P2 anchor label changed from `P2 — addendum` to `P2 — amend this change in place` — Check 10 must pin the NEW label (D8)
- [x] 4.4 Add one line under `## [Unreleased]` in `CHANGELOG.md` summarising the triage-gate addition; do NOT bump `plugin.json` version
- [x] 4.5 Verify the README needs no update: the `followup` command is already documented and no command was added, removed, or renamed; update only if the followup behavior description has drifted
- [x] 4.6 Run `node sync-copilot.mjs` (do NOT hand-edit any file under `copilot/`) to regenerate `copilot/prompts/qrspi-followup.prompt.md` and any other copilot artifacts touched by the new `followup.md` + workflow prose (D10)
- [x] 4.7 Run `node scripts/lint.mjs` and confirm all checks including Check 10 report `OK` and exit code is zero
- [x] 4.8 Run `node sync-copilot.mjs --check` and confirm zero drift reported
- [x] 4.9 (human) Checkpoint: from the repo root confirm `node scripts/lint.mjs` exits zero with Check 10 `OK` (pinning the `P2 — amend this change in place` label); confirm `node sync-copilot.mjs --check` exits zero; open `copilot/prompts/qrspi-followup.prompt.md` and confirm it reflects the in-place P2 prose and the least-friction offers added in Slices 3–4
