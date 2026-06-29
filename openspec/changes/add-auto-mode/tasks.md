# Tasks — add-auto-mode

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Run-mode prompt + Manual no-op end-to-end

**Model:** sonnet — mechanical prose edit: one new skill subsection + one reference line per command body; no novel pattern, no conditional logic to reason about beyond the stub wording.

- [x] 1.1 Add the **"Run-mode (Full / Semi / Manual)"** subsection to `claude/skills/workflow/SKILL.md` under the "Stage choreography" section: (i) the ternary AskUserQuestion wording — question text "Run mode for this QRSPI flow?" with the three choices and the Esc-abort note; (ii) the fresh-vs-mid-chain inheritance rule ("if you already hold a run-mode in this session, skip the prompt and reuse it; if not, ask"); (iii) stub Manual-branch clause in each of the four canonical procedure subsections (commit step, next-stage handoff, precondition check, backlog atomicity) — "if mode is Manual → behave exactly as today" (D1, D2, D3)
- [x] 1.2 Add one reference line to each of the 8 stage command bodies (`claude/commands/questions.md`, `research.md`, `design.md`, `structure.md`, `slices.md`, `plan.md`, `implement.md`, `pr.md`): "Read or establish the run-mode by following the **run-mode procedure** in skill `workflow`." Place it alongside the existing choreography reference, not inside a subagent body (D1, D7)
- [ ] 1.3 (human) Verify `node scripts/lint.mjs` exits 0 — confirm Check 5 still holds (the new reference line must not introduce an inline AskUserQuestion into a subagent-hosted command body)
- [ ] 1.4 (human) Checkpoint: run `/qrspi:questions <test-change-id>` in a fresh Claude Code session. The ternary mode prompt appears as the first interaction before the precondition check. Pick Manual. Observe the stage completes exactly as today: commit AskUserQuestion fires, handoff AskUserQuestion fires. No new prompts, no missing prompts.

---

## 2. Full/Semi auto-advance commit + handoff across Q→R→D, with hard-stops

**Model:** sonnet — expanding existing prose subsections with structured if/else-mode branches; mirrors the pattern already established in Slice 1; no novel reasoning required.

- [ ] 2.1 Expand the **Commit step** subsection in `claude/skills/workflow/SKILL.md` with Full/Semi auto-branch: "If Full or Semi auto → stage the explicit paths, commit with the stage's exact message string (no `[auto]` suffix), and push immediately (never `git add -A`). On any git exit code ≠ 0 → hard-stop (surface error, do not auto-advance). If Manual → ask as today." (D4)
- [ ] 2.2 Expand the **Next-stage handoff** subsection in `claude/skills/workflow/SKILL.md` with Full/Semi auto-branch: "If Full auto → re-enter `/qrspi:<next> <id>` immediately (held mode carries). If Semi-auto → ask 'Stage X complete. Continue to Y, or stop here?' and re-enter on Continue. If Manual → ask as today." (D4)
- [ ] 2.3 Add a **Hard-stop procedure** subsection to `claude/skills/workflow/SKILL.md` enumerating the four conditions: (1) failing precondition check; (2) `git commit`/`git push` failure; (3) subagent returning error or blocked signal; (4) execution-stage output materially diverging from approved `design.md`/spec. Response: "stop the chain, surface the condition, ask the human — do not auto-advance and do not silently downgrade to Manual." (D6)
- [ ] 2.4 Add a D-review clause to the Stage choreography notes in `claude/skills/workflow/SKILL.md`: "The D review (open-questions pass + decision-by-decision approval + final confirmation) is NEVER suppressed in any mode; it is a sanctioned pause." Also add: "Backlog-capture offers in Q, D, and S are NEVER suppressed in any mode; they remain interactive AskUserQuestion calls." (D4)
- [ ] 2.5 (human) Checkpoint: start `/qrspi:questions <test-id>` fresh, pick Full auto. Observe: (1) no commit AskUserQuestion after Q completes; (2) no handoff AskUserQuestion; (3) chain arrives at D review with all D prompts firing. Then break push (e.g. `git remote set-url origin https://bad`), run again, pick Full auto → chain halts at git push failure with a human-readable error, does NOT continue to R.
- [ ] 2.6 (human) Verify Semi-auto: confirm auto-commit fires but handoff AskUserQuestion appears at each stage boundary.

---

## 3. S approval gate auto-answer + full S→V→P→I→PR chain + implementer block-signal

**Model:** sonnet — adding structured conditional clauses to existing prose sections; the pattern mirrors Slice 2's auto-branch additions; the most complex piece (per-slice iterate logic in `implement.md`) mirrors the existing manual per-slice loop already described there.

- [ ] 3.1 Add the S approval gate auto-answer clause to the **Precondition check** subsection in `claude/skills/workflow/SKILL.md`: "If a run-mode is held and the human approved `design.md` at the D pause in this chain, treat the approval gate as satisfied (do not ask). If no in-chain D approval exists (standalone invocation or fresh session), ask as today." (D4)
- [ ] 3.2 Add PR-create auto-advance clause to the per-stage notes for the PR stage in `claude/skills/workflow/SKILL.md`: "If Full or Semi auto → run `gh pr create` without asking 'Create now?'." (D4)
- [ ] 3.3 Add per-slice auto-advance clause to `claude/commands/implement.md`: "If Full or Semi auto → after the implementer subagent returns for Slice N: (1) auto-commit that slice (explicit paths, stage message, push); (2) read the next un-ticked slice's `**Model:**` annotation; (3) invoke the implementer on that model; repeat until all slices are done. If the implementer returns error/blocked → hard-stop (surface error, do NOT commit, do NOT advance to Slice N+1)." (D4, D6)
- [ ] 3.4 Add the implementer block-signal contract to `claude/commands/implement.md`: "The implementer MUST return an error or blocked signal — and MUST NOT commit the slice — when lint, typecheck, or tests fail at a slice boundary." (D6)
- [ ] 3.5 (human) Checkpoint: run a Full-auto from Q→PR on a prepared test change (one that has a `tasks.md` with at least two slices with different `**Model:**` annotations). Observe: (1) S does not ask the approval gate; (2) I auto-commits Slice 1, reads Slice 2's model annotation and re-invokes on that model, auto-commits Slice 2; (3) PR is created via `gh pr create` without a prompt. Then force a lint failure in a slice → confirm the chain stops with the error surfaced and the slice is NOT committed.

---

## 4. README update + copilot regen at zero drift

**Model:** sonnet — mechanical prose addition to README and a script invocation; no reasoning required beyond following the README-update rule and confirming the sync script output.

- [ ] 4.1 Add a **"Run modes"** paragraph to `README.md` under the stage-overview section (after the eight-stages table, before the helpers line): describe the ternary mode prompt, which gates are suppressed in Full/Semi auto (commit step, handoff in Full, S approval gate, I per-slice checkpoints, PR-create), which are never suppressed (D review, backlog offers, hard-stops), and the Esc-to-abort path. Update the D-stage row in the eight-stages table to add a parenthetical: "(Full auto pauses here — see Run modes)". (D5)
- [ ] 4.2 Run `node sync-copilot.mjs` to regenerate `copilot/` from the updated `claude/` sources (all command-body changes from Slices 1–3 flow through automatically). Do NOT hand-edit any file under `copilot/` directly. (D5)
- [ ] 4.3 Run `node sync-copilot.mjs --check` and confirm it exits 0 (zero diff between generated and committed `copilot/`). (D5)
- [ ] 4.4 Run `node scripts/lint.mjs` and confirm it exits 0 (all checks pass, including Check 4 README coverage and Check 5 gate-tool agreement).
- [ ] 4.5 Run `npx @fission-ai/openspec@1.4.1 validate add-auto-mode` and confirm it passes.
- [ ] 4.6 (human) Checkpoint: run `node sync-copilot.mjs --check` → exits 0. Run `node scripts/lint.mjs` → exits 0. Read the updated `README.md` and confirm the "Run modes" paragraph is present and accurate (names all three modes, identifies which gates are suppressed and which are not). Run `npx @fission-ai/openspec@1.4.1 validate add-auto-mode` → passes.
