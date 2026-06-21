# Questions — verify-stage-gate-execution

> Stage Q of QRSPI. Generated 2026-06-20.
> Change summary: The QRSPI stage commands declare `agent: <subagent>` + `subtask:
> true`, so their bodies — including the AskUserQuestion commit/handoff/approval
> gates and the next-stage invocation — run inside subagents whose toolsets lack
> AskUserQuestion (all seven) and, for half of them, Agent. Decide and implement
> the architecture that puts the human gates back on a tool-capable executor.

This is a **kit-design change** (it edits how QRSPI stages execute), not a CRUD
data feature. The standard Data model / Indexing / API / UI / Front-end state /
Migrations sections are therefore **Not applicable** — kept as headings so stage
S does not re-litigate — and replaced with sections that fit a workflow/arch
change.

## Data model — Not applicable
No entities, tables, or DTOs. The "model" here is the command→subagent execution
topology, encoded in markdown frontmatter + bodies, plus agent `tools:` lines.

## Indexing & query performance — Not applicable

## API — Not applicable
No HTTP surface. The closest analogue is the slash-command surface (`/qrspi:*`)
and the human-gate dialog (AskUserQuestion), covered under "Choreography & human
gates" below.

## UI — Not applicable

## Front-end state — Not applicable

## Migrations & data — Not applicable
No data migration. The analogue is the Copilot artifact regeneration (`copilot/`
via `sync-copilot.mjs`) any frontmatter/body change forces — covered under
"Copilot parity & sync" below.

## Current state (facts to confirm before designing)

1. **What does `agent: <X>` + `subtask: true` on a command actually do at run
   time?** Confirm the operative semantics: does the *entire* command body
   execute inside subagent `<X>` (so the body's AskUserQuestion/Agent steps are
   constrained by `<X>`'s `tools:`), or does the orchestrator run the body and
   only the artifact-writing delegate to `<X>`? The backlog's dogfood finding
   (every gate fired only because the *orchestrator* ran it) says the former —
   confirm this is the real plugin-invocation path, not an artifact of the
   command being expanded inline into the main loop (as in this very session,
   where the orchestrator *can* fire AskUserQuestion).

2. **Which subagents lack which gate tools?** Confirmed inventory
   (`claude/agents/*.md` `tools:` lines):
   - **None** of the seven carry `AskUserQuestion` → every commit gate, handoff
     gate, and approval gate is dead under the subagent path.
   - `Agent` present: `architect`, `designer`, `implementer`. **Absent:**
     `planner`, `questioner`, `researcher`, `reviewer` → these four also cannot
     *invoke the next stage* ("run it as its own stage / fresh subtask").
   Confirm this table is complete and current.

3. **Which command bodies invoke gate tools they can't reach?** The choreography
   (commit step, next-stage handoff) lives in skill `qrspi-workflow`
   ([SKILL.md:165-205](../../../claude/skills/qrspi-workflow/SKILL.md#L165-L205))
   and is referenced by every stage command. AskUserQuestion is named directly in
   `design.md`, `followup.md`, `implement.md`, `pr.md`, `questions.md`,
   `structure.md`, plus `init.md`/`stack.md`/`retro.md` (non-`subtask` helpers).
   Confirm the full set of `subtask: true` commands whose gates are affected:
   `questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`,
   `followup`, `pr`.

4. **Does the design intent actually want gates *outside* the subagent?** Skill
   `context-hygiene` states the subagent is a **context firewall, not a persona**,
   and "always invoke each QRSPI stage as a subagent via the Task tool; do not
   inline the stage prompt into the orchestrator." Read literally, the human
   dialogue (commit/handoff) is the orchestrator's job and the subagent's job is
   only the bounded artifact write. Confirm this reading — it is the strongest
   argument against simply granting subagents the gate tools.

## Architecture options (the core fork — see PQ1)

5. **Option A — gates move to the orchestrator (drop `agent:`/`subtask:` from
   the command).** The command body runs in the main loop (which has
   AskUserQuestion + Agent); it explicitly spawns the stage subagent via the
   Agent/Task tool for *only* the artifact-writing job, then runs the
   precondition/commit/handoff gates itself. Pro: matches `context-hygiene`
   literally; one tool-capable executor owns all dialogue. Con: larger rewrite of
   every command; changes the documented `agent:`-frontmatter delegation model.

6. **Option B — grant the gate tools to the subagents** (add `AskUserQuestion`
   to all seven; add `Agent` to the four lacking it). Pro: smallest diff, keeps
   frontmatter as-is. Con: contradicts "firewall not persona"; a next-stage
   subagent spawned *from inside* the current subagent does **not** reset context
   (defeats the whole reason for `subtask`); read-only agents (researcher,
   reviewer, planner) gain write-adjacent orchestration tools.

7. **Option C — split each command into an orchestrator shell + a delegated
   subagent prompt** (explicit two-part structure: the shell holds gates +
   delegation; the agent prompt holds only the bounded job). Pro: makes the
   firewall boundary explicit and self-documenting. Con: most files to touch;
   may duplicate prose between shell and agent.

8. **Is a hybrid acceptable?** e.g. orchestrator owns commit + handoff (Option
   A-style) but the precondition/approval *file* check (Glob) stays in the
   subagent (it already has Glob). Confirm whether the precondition check —
   which is Glob-only and *works* today — should move too, for uniformity, or
   stay put.

## Choreography & human gates

9. The four canonical procedures in `qrspi-workflow` are: **precondition check**
   (Glob — works), **approval gate** (AskUserQuestion — broken, e.g. Structure
   requires approved `design.md`), **commit step** (AskUserQuestion — broken),
   **next-stage handoff** (AskUserQuestion + invoke next stage — broken). Which
   of these does the chosen option relocate, and does the shared skill section
   need rewriting or only the per-command variables?

10. **Next-stage invocation mechanism.** The handoff says "invoke the next-stage
    command now, as its own stage (a fresh subtask)." By what tool does an
    executor invoke a `/qrspi:*` *slash command* as a fresh subtask — the Agent
    tool with the stage's subagent, a SlashCommand tool, or something else?
    Confirm the mechanism exists for whichever executor the chosen option puts in
    charge (the orchestrator has it; a subagent may not).

11. **`implement.md` already spawns a subagent itself** (per-slice, via the Agent
    tool with the annotated model — [implement.md:25](../../../claude/commands/implement.md#L25)).
    Does that nested-spawn pattern inform the chosen option (it implies the
    *command* is already acting as orchestrator there), and does it need
    reconciling so all stages follow one model?

## Affected files (must change in lockstep)

12. Confirm the blast radius for the chosen option:
    - `claude/commands/*.md` — frontmatter and/or body of all nine `subtask`
      stage commands (and whether the three `build`-agent helpers `init`,
      `stack`, `archive` and the no-agent `status`/`retro` are touched).
    - `claude/agents/*.md` — `tools:` lines (Option B/C), and any prompt text
      that assumes the agent runs the gates.
    - `claude/skills/qrspi-workflow/SKILL.md` — the "Stage choreography" section.
    - `claude/skills/context-hygiene/SKILL.md` — if the executor model is
      clarified, this skill's "invoke via Task tool" wording may need a sentence
      on who runs the gates.
    - `README.md` — the line "a Copilot prompt carries an `agent:` field, so
      `/qrspi:questions` runs inside the `questioner` agent — mirroring how the
      Claude command delegates" ([README.md:192](../../../README.md#L192))
      becomes wrong under Option A.

## Copilot parity & sync

13. The Copilot half maps each command's `agent:` frontmatter to a Copilot custom
    agent and is documented as the *whole point* of how `/qrspi:questions` "runs
    inside the questioner agent." If Option A drops `agent:` from the Claude
    command, what happens to the Copilot mapping in `sync-copilot.mjs` — does
    Copilot keep its `agent:` (divergent), or does Copilot have the same broken-
    gate problem and need the same fix? Confirm the change must include the
    regenerated `copilot/` tree and pass `node sync-copilot.mjs --check`.

14. Does GitHub Copilot's custom-agent runtime even *have* an AskUserQuestion
    analogue? If not, the gates may be Claude-only by nature and the Copilot port
    may legitimately drop them — which intersects the backlog's
    `reassess-copilot-port` item. Flag whether this change should settle that or
    leave it.

## Testing / verification

15. **How is "the gate actually fires" verified mechanically**, given the gate is
    an interactive AskUserQuestion the human sees? Options to weigh: (a) a lint
    check that asserts every `subtask: true` command's gate-tool requirements are
    a subset of its declared `agent:`'s `tools:` (catches the class of bug
    statically); (b) a real `/qrspi` dogfood walk; (c) both. Note the backlog
    item itself was *named* "verify" — settle whether this change ships a
    standing guard or only a one-time fix.

16. Does `scripts/lint.mjs` need a new check (e.g. "no command requires a tool
    its agent lacks"), and would that check belong with the existing Checks 1/4?
    What is the acceptance test — `node scripts/lint.mjs` green, `node
    sync-copilot.mjs --check` zero-drift, and a manual stage walk where a gate
    visibly fires under the *real* invocation path?

## Sequencing & scope

17. This is the backlog's "highest-priority correctness item." Is it a
    prerequisite for `enforce-research-ticket-hiding` (also a "persona, not
    mechanism" fix) — do they share the agent-tooling surface and want bundling,
    or stay independent?

18. **Scope guard:** does this change fix *only* the gate-execution architecture,
    or also fold in adjacent cleanups it will touch (the README line #13, the
    `context-hygiene` wording #12)? Recommend keeping it to the architecture +
    the docs it directly invalidates, and spinning anything larger out as a new
    backlog idea.

## Open product questions (for the human)

- [x] **PQ1 — Which architecture fixes the gates?** Options:
  (a) **Orchestrator owns the gates** — drop `agent:`/`subtask:` from the stage
  commands; the command body runs in the main loop and spawns the stage subagent
  via the Agent tool only for the artifact write (matches `context-hygiene`'s
  firewall model);
  (b) **Grant the tools** — add `AskUserQuestion` to all seven agents and `Agent`
  to the four lacking it, keep frontmatter as-is (smallest diff, but subagents
  then conduct human dialogue and a nested next-stage spawn won't reset context);
  (c) **Split shell + delegate** — restructure each command into an orchestrator
  shell (gates + delegation) plus a bounded agent prompt;
  (d) **Defer to stage D** — record the trade-offs and let Design pick once it
  has mapped the runtime semantics (PQ-current-state #1).
  **Answer: (a) Orchestrator owns the gates.** Drop `agent:`/`subtask:` from the
  stage commands; the command body runs in the main loop (which has
  AskUserQuestion + Agent) and delegates only the artifact-writing job to the
  stage subagent via the Agent tool. This matches `context-hygiene`'s "subagent
  is a context firewall, not a persona" rule — the human dialogue (commit /
  handoff / approval) belongs to the orchestrator, the bounded write belongs to
  the subagent. (Option C reaches the same destination but with explicit shell +
  delegate files; rejected for its file-duplication overhead. Option B rejected:
  it fights the firewall model and a nested next-stage spawn would not reset
  context.)

- [x] **PQ2 — Scope of the fix:** Options: (a) fix **all nine** `subtask` stage
  commands uniformly now; (b) fix only the stages where the gate is most load-
  bearing (the human handoff between stages) and leave intra-stage prompts;
  (c) fix the four read-only agents (`planner`/`researcher`/`reviewer`, +
  `questioner`) that lack *both* AskUserQuestion *and* Agent first, since they are
  the most broken. (Depends on PQ1 — Option A makes scope uniform by construction.)
  **Answer: (a) All nine `subtask` stage commands**, converted uniformly:
  `questions`, `research`, `design`, `structure`, `slices`, `plan`, `implement`,
  `followup`, `pr`. Option A applies the same orchestrator-owns-the-gates shape
  to every stage, so a uniform conversion is the natural and most consistent
  scope.

- [x] **PQ3 — Ship a standing guard, or a one-time fix?** Options: (a) add a
  `scripts/lint.mjs` check that statically asserts no command needs a tool its
  `agent:` lacks (prevents regression — this exact bug shipped silently in
  `af29540`); (b) one-time fix + a manual dogfood walk, no new lint; (c) both.
  **Answer: (a) Add a `scripts/lint.mjs` check + the fix.** Ship a static guard
  that catches this whole bug class — e.g. assert no command requires a gate tool
  its declared executor lacks (and, post-A, that the stage commands no longer
  carry a gate-trapping `agent:`/`subtask:` pairing). The bug shipped silently
  once (`af29540`); a lint floor stops it recurring. (Stage D/S will pin the
  exact assertion; a manual dogfood walk remains welcome but the lint is the
  required deliverable.)

- [x] **PQ4 — Copilot parity:** Options: (a) apply the same fix to the Copilot
  port and keep zero drift; (b) accept that Copilot's runtime may lack an
  AskUserQuestion analogue and let the Copilot gates degrade gracefully (feeds
  `reassess-copilot-port`); (c) defer the Copilot question to its own backlog
  item and scope this change to the Claude side + a sync that doesn't regress.
  **Answer: Scope Claude-side, no regression.** Fix the Claude artifacts and keep
  `node sync-copilot.mjs --check` zero-drift (the regenerated `copilot/` tree
  ships with this change). The deeper question — whether Copilot's custom-agent
  runtime even has an AskUserQuestion analogue and how its gates *should* work —
  is deferred to the existing `reassess-copilot-port` backlog item, not settled
  here.

- [x] **PQ5 — README `agent:`-delegation claim:** Option A invalidates the
  README line that says the Claude command "delegates to its subagent" via
  `agent:`. Options: (a) rewrite it as part of this change (the CLAUDE.md
  "keep the README current" rule requires it); (b) only if Option A is chosen;
  (c) hold the README until D settles the model.
  **Answer: (a) Rewrite in this change.** Option A is chosen, so the README line
  (`README.md:192`, "runs inside the `questioner` agent — mirroring how the
  Claude command delegates to its subagent") is now wrong and must be corrected
  in the same change, per CLAUDE.md's "keep the README current" rule. Also
  re-check the `context-hygiene` wording about who runs the gates.
