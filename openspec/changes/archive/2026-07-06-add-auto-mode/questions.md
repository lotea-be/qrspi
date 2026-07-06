# Questions — add-auto-mode

> Stage Q of QRSPI. Generated 2026-06-26.
> Change summary: Add a ternary run-mode (**Full auto / Semi-auto / Manual**), chosen via a dedicated AskUserQuestion at the top of every fresh stage invocation (no disk persistence; carried in-process across an auto chain). In **Full auto** the orchestrator chains `Q → R → D → S → V → P → I → PR`, auto-advancing the commit step (commit **and** push, explicit-path `git add`), the next-stage handoff, Structure's design-approval gate (auto-Yes after the human approves at D), the per-slice Implement checkpoints (all slices run straight through), and the PR-create step. It pauses **only** at: the Q open-product-questions pass, the D design review, the backlog-capture offers (still interactive — "offer, never auto-append"), and the hard-stops (precondition fail, git commit/push fail, a subagent error/block, and an implementation/structure divergence from the approved design). **Semi-auto** is the same but also pauses at every stage boundary. The standard Esc/stop interrupt aborts a running chain. Scope is Claude-only with `node sync-copilot.mjs --check` zero-drift. See the resolved Open Product Questions (PQ1–PQ13) for the authoritative decisions.

This is a **kit-design change** to the QRSPI workflow itself (it changes how `/qrspi:*` stage commands execute their human gates), NOT a CRUD data feature. The standard Data model / Indexing / API / UI / Front-end state / Migrations sections are therefore **Not applicable** — kept as headings so stage S does not re-litigate — and replaced with sections that fit a workflow/architecture change, mirroring the structure of `openspec/changes/archive/2026-06-21-verify-stage-gate-execution/questions.md`.

## Data model — Not applicable

No entities, tables, or DTOs. The "model" here is the run-mode flag that modifies whether the orchestrator pauses at each human gate, encoded in a persistence artifact (file, marker, or frontmatter field) and read at the start of each stage command.

## Indexing & query performance — Not applicable

## API — Not applicable

No HTTP surface. The closest analogue is the slash-command surface (`/qrspi:*`) and the human-gate dialog (AskUserQuestion), both covered under the sections below.

## UI — Not applicable

## Front-end state — Not applicable

## Migrations & data — Not applicable

No data migration. The analogue is any new file written to `openspec/changes/<id>/` or `openspec/backlog.md` that persists the mode choice, plus the Copilot regeneration (`copilot/` via `sync-copilot.mjs`) forced by any command-body change — covered under "Copilot parity & sync" below.

---

## Current gate inventory (facts to confirm before designing)

1. **Enumerate the gates that exist today.** The `qrspi-workflow` skill's "Stage choreography" section names four invariant procedures. Confirm the complete gate inventory against the actual stage commands and their choreography bodies:
   - **Precondition check** (Glob-based file gate in every stage; approval-gate AskUserQuestion in `structure.md` — "Have you reviewed and approved design.md?"). Works today.
   - **Commit step** (AskUserQuestion "Commit … to the feature branch?" — choices: Yes / No). Present in every stage.
   - **Next-stage handoff** (AskUserQuestion "Continue to stage Y, or stop here?" — choices: Continue / Stop). Present in every stage.
   - **D decision-by-decision review** (`design.md` open-questions pass + decision-approve-or-change loop + final "Ready to proceed to Structure?" confirmation). Specific to the Design command.
   - **Per-slice Implement checkpoints** (AskUserQuestion at each slice boundary: "Should I continue with Slice N+1?" — choices: Yes / Stop). Present only in `implement.md`.
   - **Backlog-capture offers** in Q, D, and S (AskUserQuestion: "Add as idea / Skip" for each deferred-work candidate). Present only in those three stages.
   - **PR interactive step** (AskUserQuestion "Create the PR now or show me the description first?" — choices: Create / Show). Present only in `pr.md`.
   Confirm this list is complete and nothing has been added since `verify-stage-gate-execution` established the choreography.

2. **Which gates does the ticket say auto mode must still pause at?** The ticket names Q and D as the two stages that "still pause." Map this to the gate list in Q1:
   - Q pause = the open-product-questions pass (AskUserQuestion per PQ item).
   - D pause = the entire Design interactive review (open-questions pass + decision-by-decision approval + final confirmation)?
   Or does "D pauses" mean only the D approval gate in `structure.md` ("Have you reviewed design.md?"), not the full D review loop? Confirm which D surfaces must remain interactive.

3. **Which gates does the ticket say auto mode suppresses?** The ticket lists: commit gate, next-stage handoff, Structure's design-approval gate, per-slice Implement checkpoints, and the PR step. Confirm:
   - Does "PR step" mean the "Create now or show description first?" AskUserQuestion, or does it mean the human code review itself (which is never automated)?
   - Does "commit gate" auto-advancing mean auto-commit on every stage? Does it also mean auto-push?
   - Does suppressing Structure's design-approval gate conflict with `qrspi-workflow`'s "Never proceed to S without human review" rule? (See tension 3 below.)
   - Are backlog-capture offers (Q/D/S) in scope as suppressible gates, or left out of the ticket's list because they are secondary?

4. **Where does the mode-choice prompt appear?** The ticket says "when starting or resuming a QRSPI run." Identify the exact command that is the run's entry point:
   - `/qrspi:questions <id>` is the canonical start.
   - "Resuming" could mean any stage command invoked after a stop — if resuming in the middle of stage V, the mode prompt would appear at `/qrspi:slices`. Confirm whether "resuming" means every stage command independently checks for a mode marker, or only Q asks (with persisted mode read by later stages).

---

## Persistence mechanism

> ⮕ Resolved by PQ1 + PQ12: **no disk persistence.** The ternary mode prompt is
> re-asked at the start of every *fresh* stage invocation (resume / new session);
> within a running auto chain the mode is carried in-process across the
> auto-invoked stages. The marker-file / backlog-field / config options below
> (Q5b–d, Q6–Q8) are **not adopted** — kept only as the rejected alternatives.

5. **Each `/qrspi:*` stage command runs as its own main-loop invocation with a fresh context.** A choice made during Q's orchestration does not survive to R's or D's orchestration. What is the proposed persistence mechanism? Enumerate the candidates:
   - (a) A **marker file** in `openspec/changes/<id>/` (e.g. `auto-mode` or `mode.txt` containing `auto`). Advantages: Glob-readable by any stage; explicit; survives context resets. Disadvantage: a new artifact the change folder must manage.
   - (b) A **field in the backlog row** (e.g. `Mode: auto` appended to the change's row). Advantages: co-located with status; no new file. Disadvantage: backlog.md is already written by the questioner; the row format has no documented field for run mode.
   - (c) A **flag passed on each stage command invocation** (e.g. `/qrspi:design add-auto-mode --auto`). Advantages: no disk state needed. Disadvantage: human must remember to pass it every time; breaks the "resuming a QRSPI run" UX requirement; cannot auto-chain across the handoff without encoding it in the invocation.
   - (d) An **environment variable or project-level config** (e.g. a field in `openspec/config.yaml`). Advantages: project-level default. Disadvantage: `config.yaml` is generated by OpenSpec CLI and the kit avoids coupling to its internals; not change-scoped.
   Which mechanism is chosen, and is it change-scoped (per `<id>`) or session-wide?

6. **If a marker file is chosen, what is its name and format?** Does it live inside `openspec/changes/<id>/` (change-scoped, gone on archive) or in `openspec/` (project-wide, persists across changes)? A project-wide file means auto mode would affect all future changes in the project unless explicitly reset — confirm if that is intended.

7. **Who writes the persistence artifact and when?** If Q writes a marker file, the questioner subagent writes it as part of `questions.md` (since the questioner does the backlog flip and product-question pass). Or does the orchestrator write it after the questioner returns, as part of the commit step? Confirm the exact moment the mode is persisted so the R-through-PR stages can read it reliably.

8. **How is a resumed run's mode determined?** If a human stops at stage V, then resumes by running `/qrspi:slices <id>` in a fresh session, the orchestrator has no memory of the original mode choice. Is the mode re-read from the marker file (the Glob-based precondition check could also read the mode), or re-asked (the "resuming" prompt the ticket mentions)? If re-asked, define when "re-ask" happens: only when no marker file exists, or always on resume?

---

## Auto-chain semantics

> ⮕ Resolved by PQ4 + PQ11: **D is a pause, not a ceiling.** Full auto chains
> `Q → R → D → S → V → P → I → PR`, pausing only at the Q open-questions pass and
> the D review (plus hard-stops, plus the always-interactive backlog offers per
> PQ8). There is no fixed pre-Implement stop. Abort (Q11 / PQ5): the standard
> Claude Code Esc/stop interrupt, **documented in the mode-choice prompt**. Q12's
> ticket-blind invariant still holds — auto mode re-enters each `/qrspi:*` slash
> command (it does not inline the subagent), so Research stays blind to the ticket.

9. **Does auto-advancing the next-stage handoff mean the orchestrator automatically invokes the next stage?** Today the handoff asks "Continue to /qrspi:design <id>?" and, on "Continue," re-enters the slash command. In auto mode, is the handoff skipped and the next stage command invoked immediately without asking? Confirm that this produces a chain: Q auto-chains to R, R auto-chains to D (where it pauses), D auto-chains to S after the human approves design, S auto-chains to V, V auto-chains to P, P auto-chains to I (where it runs all slices), I auto-chains to PR.

10. **Where does the auto-chain stop?** The ticket names Q and D as the only pauses. After the D review, does auto mode resume and run S → V → P → I → PR unattended? Or does the chain stop at a fixed point (e.g. before I, because code changes are higher-risk)? Is there a configurable stop point, or is the chain always Q-pause → R → D-pause → S → V → P → I → PR?

11. **How does the human interrupt or abort a running auto chain?** If the orchestrator is auto-advancing through R → D, there is no AskUserQuestion to intercept. What is the abort mechanism: (a) standard Claude Code stop-button / Escape interrupts the current tool call; (b) a dedicated `/qrspi:stop` command; (c) a configurable "always stop before I" option baked into the mode? Confirm that at minimum the standard session-interrupt mechanism applies and document it.

12. **Does auto-advancing the next-stage handoff interact with the `context-hygiene` rule** that says "each stage is invoked as its own stage in the main loop (re-enter the slash command)"? Today the handoff re-enters the slash command so Research is ticket-blind. In auto mode, the orchestrator still needs to invoke `/qrspi:research <id>` (not inline the researcher). Confirm auto mode does not collapse the subagent-firewall boundary — Research must remain ticket-blind even in auto mode.

---

## Hard-stop definition ("unless utterly necessary")

13. **Which conditions force a pause even in auto mode?** Enumerate candidates and ask which are non-negotiable hard-stops:
    - (a) A failing precondition check (required artifact missing) — the stage must refuse, since there is nothing to auto-advance to.
    - (b) An `openspec validate <id>` failure on the spec delta — a corrupt spec cannot silently proceed.
    - (c) Lint or typecheck failures at a slice boundary in Implement — auto-advancing through a failing slice bakes the error into the commit.
    - (d) Test failures at a slice boundary.
    - (e) Merge conflicts or a non-clean working tree detected by `git status`.
    - (f) The Design approval gate — the ticket says D still pauses, but does that mean S's "Have you reviewed design.md?" AskUserQuestion is also kept (since it guards against proceeding without reading), or is it auto-answered "Yes" if D was the last stage before S?
    - (g) A `git push` failure (remote rejects, no upstream set).
    - (h) The PR-creation step fails (e.g. `gh pr create` errors out).
    Confirm the canonical hard-stop set and whether any of these should cause auto mode to fall back to manual for the remainder of the run or abort entirely.

14. **Does auto mode override the Design human-review gate in `qrspi-workflow`?** The skill states: "Never proceed to S without human review." The ticket says D still pauses, implying the D review is always interactive. But does "D pauses" include: (a) the `structure.md` approval-gate AskUserQuestion ("Have you reviewed and approved design.md?"), or (b) only the `design.md` decision-by-decision review in the Design stage command itself? If the human completes the D review, does auto mode auto-answer the S approval gate "Yes" (since the human just reviewed), or does it re-ask?

---

## Auto-commit and push behavior

15. **Does auto-advancing the commit gate mean auto-commit AND auto-push?** The commit step has two actions: `git commit` and `git push`. In auto mode, does auto-advance execute both automatically, or only commit (leaving push manual)? The ticket says the commit gate auto-advances, but confirm whether push is included.

16. **Does auto mode still use explicit-path `git add` (never `-A`)?** The `qrspi-workflow` skill's commit step states: "Never use `git add -A`." Confirm this constraint is unchanged in auto mode — the implementation must still stage only the explicit artifact paths the stage names, even when committing automatically.

17. **What is the auto-commit message format?** In manual mode the commit message is the stage's exact commit-message string (e.g. `docs(<id>): add research.md (QRSPI stage R)`). In auto mode, does anything change about the message (e.g. a `[auto]` suffix), or is it identical?

---

## Per-slice Implement checkpoints

> ⮕ Resolved by PQ7: in auto mode Implement **runs all slices straight through**,
> auto-committing per slice, and pauses only on a hard-stop (see PQ13). Q19's
> lint/test-failure-as-hard-stop was **not** adopted as an explicit stop (PQ13);
> a broken build instead surfaces via the "subagent errors or blocks" hard-stop
> (PQ2). Q20 (per-slice model selection) still applies — auto mode must preserve
> the per-slice model re-invocation, just without the human checkpoint between slices.

18. **In auto mode, does Implement run all slices straight through without checkpoints?** Today `implement.md` stops at each slice boundary and asks "Should I continue with Slice N+1?" and "Commit Slice N changes?" In auto mode, are both questions suppressed and slices run end-to-end? Confirm the intended behavior.

19. **Is the per-slice checkpoint a candidate hard-stop?** Running all slices unattended means lint/test failures mid-run could leave the codebase in a partially-implemented state with broken tests committed. Is a lint/test failure at a slice boundary a hard-stop even in auto mode (see Q13c/d), or does auto mode proceed regardless?

20. **Does per-slice model selection still work in auto mode?** `implement.md` reads the `**Model:** sonnet|opus` annotation from `tasks.md` and re-invokes the implementer on the correct model per slice. Does auto-advancing through slices break this mechanism (each slice may need a different model, which requires a new agent invocation)?

---

## Backlog-capture offers

21. **In auto mode, are backlog-capture offers (Q/D/S "Add as idea / Skip") suppressed, auto-skipped, or auto-added?** The `qrspi-workflow` skill's "Capturing deferred work" section requires "Offer, never auto-append." In auto mode, does this rule still apply (offers are still asked) or is it relaxed? Options:
    - (a) Auto-skip all deferred-work candidates (nothing added to the backlog without human confirmation).
    - (b) Auto-add all candidates (violates "offer, never auto-append").
    - (c) Still ask (the offers remain interactive even in auto mode).
    - (d) Auto-skip unless the candidate is already in the backlog (no-op deduplications are skipped; novel items are still offered).
    Note that if (a), deferred work surfaces during Q would be lost silently unless the human reviews `questions.md` manually.

---

## Mode prompt UX

> ⮕ Resolved by PQ9 + PQ12: a **ternary** choice — **Full auto / Semi-auto /
> Manual** — asked as a dedicated AskUserQuestion at the top of every *fresh*
> stage invocation (not as a PQ inside the open-questions pass). Semi-auto pauses
> at stage boundaries (handoffs) but auto-advances within-stage gates (commit);
> both Full and Semi still pause at Q, D, and the backlog offers (PQ8). Q24 (commit
> the mode marker) is moot — nothing is persisted to disk (PQ1/PQ12).

22. **When exactly is the mode-choice prompt asked?** The ticket says "when starting or resuming a QRSPI run." Define the trigger precisely:
    - (a) Always at the top of `/qrspi:questions <id>` (start) and at every stage command when no mode marker is found (resume with no prior choice).
    - (b) Only at `/qrspi:questions <id>` (start); later stages read from the marker file and never re-ask.
    - (c) At every stage command invocation, re-asking each time (stateless, no persistence).
    - (d) At start, plus once on resume (when the marker file exists but the human explicitly passes `--confirm-mode`).

23. **What are the mode-choice options?** The ticket implies at least "auto" and "manual." Are there intermediate modes (e.g. "auto through R, then pause at D, then ask at each stage")? Options:
    - (a) Binary: "Full auto (pause only at Q and D)" / "Full manual (pause at every gate, as today)."
    - (b) Ternary: "Full auto" / "Semi-auto (pause at stage boundaries but not commit/handoff gates)" / "Full manual."
    - (c) Configurable: the human specifies which specific gates to suppress.
    - (d) Binary for now, extensible later.

24. **Is the mode choice recorded in the artifact commit?** If `questions.md` and the mode marker file are committed together in Q's commit step, the mode is part of the git history. If the marker is written but not committed until a later stage, the mode may be inconsistent if the user abandons the run. Confirm whether the mode marker is committed atomically with `questions.md` at stage Q.

---

## Affected files (blast radius)

25. **Which files must change?** Enumerate the blast radius and confirm completeness:
    - `claude/commands/questions.md` — add mode-prompt step and mode-write step; conditionally suppress commit gate and handoff gate.
    - `claude/commands/research.md` — conditionally suppress commit gate and handoff gate.
    - `claude/commands/design.md` — preserve D review as-is; conditionally suppress commit gate; auto-advance handoff after D approval.
    - `claude/commands/structure.md` — conditionally suppress design-approval gate (or auto-answer it) and commit gate and handoff.
    - `claude/commands/slices.md` — conditionally suppress commit gate and handoff.
    - `claude/commands/plan.md` — conditionally suppress commit gate and handoff.
    - `claude/commands/implement.md` — conditionally suppress per-slice checkpoint and commit gate.
    - `claude/commands/pr.md` — conditionally suppress "Create now?" AskUserQuestion.
    - `claude/skills/qrspi-workflow/SKILL.md` — the "Stage choreography" section's canonical commit step and next-stage handoff procedures need auto-mode branches or a reference to the new mode-reading mechanism.
    - `openspec/backlog.md` — new `proposed` row for this change.
    - `README.md` — the eight-stage table and any gate-description prose that changes.
    - `copilot/` — regenerated by `sync-copilot.mjs --check`; every command-body change flows through.
    - `scripts/lint.mjs` — does any new check become necessary (e.g. a lint that asserts every command that reads a mode marker uses a consistent file-name convention)?
    Confirm whether `claude/commands/followup.md` is in scope (the post-PR fix loop also has a commit step and handoff-style "Continue?" prompt).

26. **Does the mode-reading logic live in each stage command body, in the shared `qrspi-workflow` skill, or in a new skill?** Options:
    - (a) Each command body reads the mode marker independently (DRY violation risk — 8+ commands with similar logic).
    - (b) The `qrspi-workflow` skill's "Stage choreography" section defines a "read mode" step that all commands reference (extends the existing canonical-procedures pattern).
    - (c) A new `auto-mode` skill carries the mode-reading + gate-suppression logic; each command loads it.
    Confirm where the single source of truth for mode-reading lives.

---

## Copilot parity & sync

27. **Does GitHub Copilot's custom-agent runtime have an AskUserQuestion analogue?** If Copilot gates are already absent or no-ops in the Copilot port (as `reassess-copilot-port` implies), what does "auto mode" mean for the Copilot artifacts — is it a no-op there, or does it add something? Does this change need to settle the Copilot-gate question or leave it to `reassess-copilot-port`?

28. **Does this change require `node sync-copilot.mjs --check` zero-drift?** Every change to `claude/commands/*.md` bodies must be reflected in `copilot/`. Confirm the acceptance criteria include: `node sync-copilot.mjs --check` exits 0 after this change (i.e. the regenerated `copilot/` tree is committed as part of the PR, or the sync script is run as part of CI).

---

## Testing & verification

29. **How is "auto mode actually suppresses the gate" verified?** Unlike a lint check, AskUserQuestion suppression is a runtime behavior. Options:
    - (a) A manual dogfood walk: run a test change end-to-end in auto mode and observe no AskUserQuestion prompts appear at suppressed gates.
    - (b) A new `scripts/lint.mjs` check that statically asserts: every command that has an auto-mode branch names the mode marker consistently (e.g. always reads `openspec/changes/<id>/auto-mode`, never `mode.txt`).
    - (c) Both.
    - (d) A code-review check that verifies each gate in each command is wrapped in the mode-reading conditional.
    Confirm what the acceptance bar is: is a dogfood walk sufficient, or is a static lint check also required?

30. **Does `scripts/lint.mjs` need a new check for this change?** Existing checks (1–3) cover: pin agreement, frontmatter/name, heading alignment. A new check could assert: (a) every stage command that has a commit step also has a conditional-skip for auto mode, or (b) the mode-marker file name is referenced consistently across all commands. Or both. Confirm whether a new lint check is in scope, and what it would assert.

---

## Sequencing & scope

31. **Is this change a prerequisite for, or a successor to, `tutorial-mode-coaching-overlay`?** The coaching-overlay idea (backlog) explicitly mentions "explicit pauses at the human gates." Auto mode and the coaching overlay both modify gate behavior — do they need to be sequenced (auto mode first, then overlay on top), or are they independent enough to proceed in either order?

32. **Does this change interact with `simplify-per-slice-model-selection`?** Auto mode's per-slice auto-advance (Q19) depends on the current per-slice model annotation + re-invocation mechanism. If that mechanism is later simplified, auto mode's slice-chaining may need to change too. Is this an ordering constraint or just a future compatibility note?

33. **Scope guard.** Does this change fix only the auto-mode mechanism + the docs it directly invalidates, or does it fold in adjacent cleanups (e.g. `enforce-research-ticket-hiding`, `reassess-copilot-port`)? Confirm the recommendation is to keep this change to the mode mechanism alone and spin anything larger into separate backlog items.

---

## Open product questions (for the human)

- [x] **PQ1 — Persistence mechanism:** How is the auto-mode choice stored so that stages R through PR (each running in a fresh main-loop context) can read it? Options: (a) a marker file inside `openspec/changes/<id>/` (e.g. `auto-mode`, no content needed — presence = auto); (b) a `Mode: auto` field appended to the change's backlog row; (c) the flag is re-passed manually on each stage command invocation by the human (no persistence); (d) a project-level config in `openspec/` (affects all future changes in the repo, not change-scoped). If PQ8 auto-chains the stages, option (c) may be unnecessary — name that dependency explicitly.
  **Answer: (c) no disk persistence — refined by PQ12.** The mode is **not** written to a marker file, backlog field, or config. During a running auto chain the mode is carried in-process across the auto-invoked stages; any *fresh* stage invocation (resume / new session) **re-asks** the ternary mode prompt (PQ9/PQ12). Rationale: with the auto chain holding the mode in-process and a re-ask on resume, no durable artifact is needed and nothing extra is committed.

- [x] **PQ2 — Hard-stop set ("unless utterly necessary"):** Which conditions force a pause even in auto mode? Options — mark all that are non-negotiable: (a) failing precondition check (required artifact missing); (b) `openspec validate` failure on a spec delta; (c) lint or typecheck failure at a slice boundary; (d) test failure at a slice boundary; (e) merge conflict or non-clean working tree; (f) `git push` failure; (g) `gh pr create` failure; (h) S's design-approval gate (even if D just reviewed — the "Have you approved design.md?" question in `structure.md`); (i) none of the above — auto mode proceeds regardless and lets the human notice failures from commit history. Note: if PQ3 resolves the D/S-approval-gate question, answer (h) here may be redundant.
  **Answer: hard-stops = (a) precondition fail + (e/f) git commit/push fails (dirty/conflicted tree or rejected push) + "subagent errors or blocks" + (execution stages) "implementation diverges from the approved design" (see PQ13).** Explicitly **not** selected as standalone hard-stops: (b) `openspec validate` failure, (c) lint/typecheck failure, (d) test failure, (g) `gh pr create` failure. The intent is that a broken build surfaces via the "subagent errors or blocks" hard-stop rather than a dedicated check; (h) is moot because S's approval gate is auto-answered Yes (PQ3).

- [x] **PQ3 — Design review gate:** The ticket says D still pauses. Does "D pauses" mean: (a) the full Design-stage interactive review (open-questions pass + decision-by-decision approval + final "Ready to proceed to Structure?" confirmation) remains interactive, AND the Structure-stage "Have you reviewed design.md?" AskUserQuestion is auto-answered "Yes" (since the human literally just reviewed in auto-D); or (b) the full Design review is interactive AND the Structure gate is also kept interactive (the human is asked twice); or (c) only the Structure gate is kept (the D review is suppressed, and only the "Have you approved?" question in S pauses)?
  **Answer: (a) Full D review stays interactive; Structure's design-approval gate is auto-answered "Yes" in auto mode.** The human approves the design at the D pause; auto mode then chains into S and auto-clears S's "Have you approved design.md?" gate (no double-ask). The D review itself is never suppressed — it is one of the two sanctioned pauses.

- [x] **PQ4 — Auto-chain semantics and stop point:** In auto mode, after each gate is auto-advanced, does the orchestrator immediately invoke the next stage command (Q→R→D-pause→S→V→P→I→PR)? And does the chain always run to PR (unattended except for the Q and D pauses), or is there a configurable stop point (e.g. "auto through P, then pause before I because code changes are higher-risk")? Options: (a) always chains to PR; (b) chains to a fixed stop before I (never auto-runs code); (c) the human specifies the stop point at mode-choice time; (d) the chain stops at D (auto through Q-and-R, pause at D, then manual from there — "semi-auto").
  **Answer: (a) Full auto always chains to PR.** After resolving the ceiling contradiction in PQ11, **D is a pause, not a ceiling**: Full auto runs `Q → R → D → S → V → P → I → PR`, auto-invoking each next stage and pausing only at the Q open-questions pass, the D review, the backlog offers (PQ8), and the hard-stops (PQ2/PQ13). No fixed pre-Implement stop. (Semi-auto — PQ9 — is the milder option that pauses at every stage boundary but auto-advances within-stage gates.)

- [x] **PQ5 — Human abort during auto chain:** If auto mode chains R→D without pausing, how does the human stop it? Options: (a) the standard Claude Code Escape/stop-button interrupts the current tool call — document this in the mode-choice prompt; (b) a `/qrspi:stop <id>` command that writes a "pause requested" marker and the next gate checks it; (c) no special mechanism — the standard interrupt is sufficient and does not need documenting. Note: if PQ4 says "stop before I," this PQ is less critical for the alignment stages.
  **Answer: (a) standard Esc/stop interrupt, documented.** The normal Claude Code stop mechanism interrupts the running auto chain; the mode-choice prompt must explicitly tell the human this is the abort path (no dedicated `/qrspi:stop` command is built).

- [x] **PQ6 — Auto-commit and push:** In auto mode, when the commit gate is auto-advanced, does the orchestrator: (a) auto-commit AND auto-push (both actions from the canonical commit step); (b) auto-commit only, no auto-push; (c) skip both commit and push (artifacts written, changes unpersisted until the human commits manually)? Confirm explicit-path `git add` (never `-A`) is unchanged regardless of choice.
  **Answer: (a) auto-commit AND auto-push.** The full canonical commit step runs automatically (stage explicit paths → commit with the stage's exact message → push). The **explicit-path `git add` (never `-A`)** constraint is unchanged in auto mode.

- [x] **PQ7 — Per-slice checkpoint behavior:** In auto mode, does Implement: (a) run all slices straight through without checkpoints (fully unattended); (b) suppress the "Continue with Slice N+1?" question but keep the commit-per-slice (auto-commit after each slice, pausing if lint/tests fail per PQ2); (c) keep the per-slice checkpoint as a hard-stop even in auto mode (per-slice code verification is too risky to skip)? Note: option (c) effectively makes auto mode no-op for Implement — check whether that is intended.
  **Answer: (a) run all slices straight through.** Implement auto-advances every per-slice checkpoint and auto-commits per slice, pausing only on a hard-stop (PQ13 — design divergence — plus the PQ2 set). The per-slice model re-invocation (Q20) is preserved; only the human checkpoint between slices is removed.

- [x] **PQ8 — Backlog-capture offers in auto mode:** In Q, D, and S, deferred-work candidates are presented via AskUserQuestion ("Add as idea / Skip"). In auto mode, these are: (a) auto-skipped (no backlog additions without human confirmation; the human reviews `questions.md` manually later if interested); (b) still asked interactively (the "offer, never auto-append" rule is always enforced, even in auto mode); (c) auto-added (violates the backlog rule; probably not intended). What is the chosen behavior, and does it differ between the Q pass (where candidates appear mid-stage) and the D/S passes?
  **Answer: (b) still asked interactively.** The "offer, never auto-append" rule is always enforced — backlog-capture offers in Q, D, and S remain interactive AskUserQuestion prompts even in Full auto. This is a deliberate exception to "only Q and D pause": auto mode never auto-appends to the backlog, so these offers pause regardless of stage.

- [x] **PQ9 — Mode-choice UX:** When the mode prompt appears at the start of a QRSPI run (and on resume when no marker is present), what are the choices? Options: (a) binary — "Auto mode (pause only at Q open-questions and D review)" / "Manual mode (pause at every gate, as today)"; (b) ternary — "Full auto" / "Semi-auto (pause at stage boundaries, not per-gate)" / "Full manual"; (c) the choice is not asked at Q — instead the human passes `--auto` on the initial command invocation and it is persisted. Also confirm: is the mode prompt asked inside the open-product-questions pass (as a PQ) or as a separate AskUserQuestion before the PQ loop starts?
  **Answer: (b) ternary — Full auto / Semi-auto / Manual.** Asked as a **dedicated AskUserQuestion at run start**, not as a PQ inside the open-questions pass, and re-asked on each fresh stage invocation (PQ12). Mode meanings: **Full auto** = chain Q→PR, pause only at Q, D, backlog offers, and hard-stops; **Semi-auto** = pause at every stage boundary (handoff) but auto-advance within-stage gates (commit), still pausing at Q/D/backlog/hard-stops; **Manual** = today's behavior (every gate pauses).

- [x] **PQ10 — Copilot port scope:** Does this change ship auto-mode support for the Copilot port, or is it Claude-only with `node sync-copilot.mjs --check` zero-drift (the copilot/ tree regenerates from the updated claude/ commands, but no Copilot-specific gate logic is added)? Options: (a) Claude-only, regenerate copilot/ (defer the Copilot-gate question to `reassess-copilot-port`); (b) also implement a Copilot analogue if one exists. Note: PQ10 answer also determines whether `reassess-copilot-port` should be updated in this change's backlog-capture pass.
  **Answer: (a) Claude-only, keep zero-drift.** Implement auto mode in the `claude/` artifacts and regenerate `copilot/` so `node sync-copilot.mjs --check` stays at zero drift; **no** Copilot-specific gate/auto logic is added here. Whether Copilot's runtime even has an interactive-gate analogue is deferred to the existing `reassess-copilot-port` backlog item.

---

### Emergent follow-up questions (raised while recording answers)

- [x] **PQ11 — D: pause vs. ceiling (reconciliation):** PQ2's added hard-stop ("a discrepancy found during stages following D") and the original ticket ("only Q and D pause, the run continues") both implied auto continues past D, contradicting an earlier "nothing auto-runs past D" pick. Which is correct?
  **Answer: D is a PAUSE, not a ceiling.** Full auto chains all the way to PR, pausing only at Q, D, the backlog offers, and hard-stops. (This supersedes the transient "nothing past D" answer and aligns with the original ticket — it is the basis for PQ4(a).)

- [x] **PQ12 — Resume behavior with no persistence (reconciliation):** Given PQ1 chose no disk persistence, how does a freshly-invoked stage (resumed session, or any stage started outside a running auto chain) learn the mode? Options: re-ask the prompt each fresh invocation / accept an optional `--auto` flag / reconsider and use a marker file.
  **Answer: re-ask the ternary mode prompt on each fresh invocation.** No flag, no marker, no disk state. Within a running auto chain the mode is carried in-process; the moment a stage is invoked standalone (resume / new session) the orchestrator re-asks Full / Semi / Manual at the top of that command.

- [x] **PQ13 — Execution-stage discrepancy hard-stop (definition of the PQ2 addition):** In the execution stages (S→V→P→I), which conditions count as the "discrepancy" that hard-stops the auto run? Options: `openspec validate` fails / lint or typecheck fails / tests fail / implementation diverges from the approved design.
  **Answer: only "implementation or structure materially diverges from the approved `design.md`/spec."** A detected semantic divergence forces a pause for re-alignment. `openspec validate`, lint/typecheck, and test failures were **not** selected as standalone hard-stops (a broken build instead surfaces via PQ2's "subagent errors or blocks"). **Note for stage D/S to weigh:** auto-committing and pushing through a red lint/test result is a real risk under this choice — flag whether the implementer's "block" signal reliably fires on a failing build, or whether a lint/test hard-stop should be reconsidered during design.
