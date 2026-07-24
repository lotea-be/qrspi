# Tasks — right-size-followup-handling

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Triage gate + P1 pass-through

**Model:** sonnet — the triage gate is a new prose block but its structure is fully specified by D1–D5; no novel reasoning required, templating against the spec suffices

- [x] 1.1 Author the self-assessment block in `claude/commands/followup.md`: four heuristic signals evaluated in prose, yielding a proposed path + one-line rationale (D1, D2, D3)
- [x] 1.2 Add the D4 `AskUserQuestion` with three verbatim choice labels ("P1 — implement directly", "P2 — addendum", "P3 — defer") immediately after the self-assessment block (D4)
- [x] 1.3 Wire the P1 branch: on P1 selection proceed to the existing FIX MODE implementer spawn with no extra annotation on `followups.md` (D5)
- [x] 1.4 Stub the P2 and P3 branches with a clear "path not yet wired" error message so a human who selects P2 or P3 is told to wait rather than crashing (D5)
- [ ] 1.5 (human) Checkpoint: dev-install the plugin (`claude --plugin-dir <repo-root>`); run `/qrspi:followup <id>` targeting a clearly small fix; confirm (1) the triage `AskUserQuestion` appears before any implementer spawn, (2) selecting P1 causes the implementer to launch in FIX MODE, and (3) selecting P2 or P3 displays the stub message rather than crashing

## 2. P3 defer path

**Model:** sonnet — P3 mechanics mirror the existing `pr.md` "Promote to backlog idea" pattern precisely; the backlog row format is fully specified in D11; no novel reasoning required

- [x] 2.1 Author the P3 execution block in `claude/commands/followup.md`: derive a kebab slug from the follow-up title (D10)
- [x] 2.2 Append an `idea` row under `## Ideas` in `openspec/backlog.md` with status `idea`, `· **P3**` priority marker, and a `**Why:**` paragraph (D10, D11)
- [x] 2.3 Tick the `followups.md` entry with `(deferred to backlog — <slug>)` (D10, D11)
- [x] 2.4 Stage both `openspec/backlog.md` and `openspec/changes/<id>/followups.md` in one atomic commit; end the turn with a confirmation message naming the slug and the ticked item (D11)
- [x] 2.5 Remove the P3 stub wired in task 1.4 (replace with the real P3 block)
- [ ] 2.6 (human) Checkpoint: dev-install the plugin; run `/qrspi:followup <id>` targeting a genuinely out-of-scope item; select P3; confirm (1) no implementer spawns, (2) `openspec/backlog.md` contains a new `idea` row with `· **P3**` and a `**Why:**` paragraph, (3) the `followups.md` entry reads `- [x] <text> (deferred to backlog — <slug>)`, and (4) `git diff --staged` shows both files staged together

## 3. P2 addendum path (dogfood checkpoint)

**Model:** opus — P2 is the most novel mechanics in this change: Glob-based N computation, two new `AskUserQuestion`s with non-trivial steering logic, folder creation, and a handoff that must preserve the ticket-blind Research invariant; this is a first-of-kind pattern with cross-cutting edge cases (D9's stage-I watch-item, N increment logic, branch steer overrides)

- [x] 3.1 Glob `openspec/changes/<id>-addendum-*/` to determine N (max existing addendum index + 1, defaulting to 1) inside `claude/commands/followup.md` (D6)
- [x] 3.2 Add the entry-stage `AskUserQuestion` with the heuristic-suggested stage in the question text but no pre-selection forced (D7)
- [x] 3.3 Add the branch `AskUserQuestion`: steer "same branch" when the chosen stage is D/S/V/P/I; steer "new branch" when the chosen stage is Q or R; make both human-overridable (D8, D9)
- [x] 3.4 Create the sibling folder `openspec/changes/<id>-addendum-N/` as a flat sibling (mkdir, no files inside) (D6)
- [x] 3.5 Tick `openspec/changes/<id>/followups.md` with `(routed to addendum <addendum-id>)` (D10)
- [x] 3.6 Stage both the new sibling folder marker and `followups.md` in one commit; end the turn with the handoff instruction `/qrspi:<stage> <addendum-id>` (D10)
- [x] 3.7 Remove the P2 stub wired in task 1.4 (replace with the real P2 block)
- [ ] 3.8 (human) Checkpoint (dogfood — satisfies OQ1): dev-install the plugin; identify a real multi-capability follow-up for `right-size-followup-handling` (e.g. one touching both `followup.md` and `workflow/SKILL.md`); run `/qrspi:followup right-size-followup-handling`; confirm the triage proposes P2 (signals 2+3 fire); select P2; confirm (1) the entry-stage question appears with a suggested stage in the text, (2) the branch question appears with the correct steer, (3) `ls openspec/changes/right-size-followup-handling-addendum-1/` succeeds, (4) `followups.md` reads `- [x] <text> (routed to addendum right-size-followup-handling-addendum-1)`, and (5) the turn ends with the handoff instruction naming the correct `/qrspi:<stage>` command

## 4. Workflow summary + copilot resync + lint Check 10

**Model:** sonnet — workflow prose update is mechanical summarization of decisions already made; lint check follows the Check 8 pattern exactly; copilot resync is a script invocation; no novel reasoning

- [ ] 4.1 Update `claude/skills/workflow/SKILL.md`'s "After PR — the fix loop" section to summarize the triage gate and P1/P2/P3 paths (D12)
- [ ] 4.2 Add `async function checkTriagePaths(errors)` to `scripts/lint.mjs` asserting the three choice-label prefixes (`"P1 — implement directly"`, `"P2 — addendum"`, `"P3 — defer"`) exist in `claude/commands/followup.md`; add one `checkTriagePaths(errors)` call in `main()`; update the numbered header-comment to include Check 10 (mirror the Check 8 `checkPrReconciliationPasses` pattern) (D13)
- [ ] 4.3 Add one line under `## [Unreleased]` in `CHANGELOG.md` summarising the triage-gate addition; do NOT bump `plugin.json` version
- [ ] 4.4 Verify the README needs no update: the `followup` command is already documented and no command was added, removed, or renamed; update only if the followup behavior description has drifted
- [ ] 4.5 Run `node sync-copilot.mjs` (do NOT hand-edit any file under `copilot/`) to regenerate `copilot/prompts/qrspi-followup.prompt.md` and any other copilot artifacts touched by the new `followup.md` + workflow prose (D12)
- [ ] 4.6 Run `node scripts/lint.mjs` and confirm all checks including Check 10 report `OK` and exit code is zero
- [ ] 4.7 Run `node sync-copilot.mjs --check` and confirm zero drift reported
- [ ] 4.8 (human) Checkpoint: from the repo root confirm `node scripts/lint.mjs` exits zero with Check 10 `OK`; confirm `node sync-copilot.mjs --check` exits zero; open `copilot/prompts/qrspi-followup.prompt.md` and confirm it reflects the triage gate prose added in Slices 1–3
