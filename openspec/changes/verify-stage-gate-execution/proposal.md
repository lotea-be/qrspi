# Proposal — verify-stage-gate-execution

> Stage S of QRSPI. Generated 2026-06-20.

## Why

Every QRSPI stage command declares `agent: <subagent>` + `subtask: true` in its
frontmatter, which routes the entire command body — including the AskUserQuestion
commit gate, handoff gate, approval gate, and next-stage invocation — into the
named subagent's context. `AskUserQuestion` is architecturally unavailable to
subagents (it depends on the main conversation's UI/session state and cannot be
reached from inside a forked context, even if listed in `tools:`). As a result,
every human gate across all nine stage commands is dead under the real
plugin-invocation path. The bug shipped silently in commit `af29540` and was
surfaced by a QRSPI dogfood run. The fix restores the gates by moving all gate
execution onto the main-loop orchestrator and shipping a static lint check that
prevents the bug class from recurring.

## What Changes

- **Nine stage command files** (`claude/commands/questions.md`,
  `research.md`, `design.md`, `structure.md`, `slices.md`, `plan.md`,
  `implement.md`, `pr.md`, `followup.md`): remove `agent:` and `subtask:`
  frontmatter; keep `description:`. Each body adopts the canonical
  orchestrator shape — Glob precondition (+ approval gate where required) →
  spawn stage subagent via the Agent tool for the bounded artifact write →
  interactive review (where applicable) → commit gate → next-stage handoff
  re-entering the next `/qrspi:*` command in the main loop.
- **`claude/skills/qrspi-workflow/SKILL.md`** — "Stage choreography (canonical
  procedures)" section: rewrite executor attribution so it names the
  main-loop orchestrator as the runner of all four procedures; change
  "fresh subtask" / "subagent" handoff wording to "invoke the next-stage
  command so it runs as its own stage in the main loop" (not a subagent spawn).
- **`claude/skills/context-hygiene/SKILL.md`** — add a clarifying sentence
  under "Subagents are context firewalls": the orchestrator owns human
  dialogue (commit / handoff / approval) and the next-stage invocation;
  the subagent does only the bounded artifact write, because AskUserQuestion
  is unavailable inside a subagent. Standardise "Task tool" → "Agent tool"
  terminology to match command bodies.
- **`scripts/lint.mjs`** — add Check 5 (`checkGateExecutor`): flags any
  `claude/commands/*.md` that declares a non-builtin `agent:` while its body
  references a tool in the hardcoded `MAIN_LOOP_ONLY = {'AskUserQuestion'}` set.
  Registered after Check 4 in `main()` using the existing dependency-free ESM
  pattern.
- **`README.md` line 192** — rewrite the delegation claim: *"A Copilot prompt
  carries an `agent:` field so the whole prompt runs in that agent; the Claude
  command instead runs in the main loop and spawns its subagent (via the Agent
  tool) only for the bounded artifact write, keeping the human gates on the
  orchestrator."*
- **`copilot/` tree** — regenerated via `node sync-copilot.mjs` after all
  `claude/` edits. Body rewrites from D2/D4/D5 propagate into Copilot prompts
  and instructions. The `agentFor` table in `sync-copilot.mjs` is unchanged
  (it does not read the source `agent:` field; dropping `agent:` from Claude
  commands does not alter generated Copilot frontmatter). Deliverable must pass
  `node sync-copilot.mjs --check`.

## Capabilities

### New Capabilities

- _none_

### Modified Capabilities

- `qrspi-command-surface`: Stage commands MUST run on the main-loop orchestrator
  without `agent:` + `subtask:` frontmatter; the next-stage handoff MUST
  re-enter the next command in the main loop (not spawn it as a subagent); the
  `qrspi-workflow` skill choreography section MUST attribute all four gate
  procedures to the orchestrator.
- `ci-quality-gates`: Add lint Check 5 — a body-aware static assertion that no
  command declares a non-builtin `agent:` while its body references a main-loop-only
  gate tool (currently: `AskUserQuestion`).

## Impact

- Migrations: no data migration. The `copilot/` tree is regenerated (no manual
  migration; `node sync-copilot.mjs` handles it).
- Breaking changes: no external API surface changes. The slash-command names and
  artifacts are unchanged. Users who invoke `/qrspi:*` commands will see human
  gates fire correctly for the first time under the real plugin-invocation path —
  this is a correctness fix, not a behavioural redesign.
- Phases: single phase, no epic split.
- Affected code / APIs / dependencies:
  - `claude/commands/` — all nine stage commands
  - `claude/skills/qrspi-workflow/SKILL.md`
  - `claude/skills/context-hygiene/SKILL.md`
  - `scripts/lint.mjs`
  - `README.md`
  - `copilot/` (regenerated; never hand-edited per CLAUDE.md)
- Acceptance signals: `node scripts/lint.mjs` green (including new Check 5);
  `node sync-copilot.mjs --check` zero-drift; human-visible AskUserQuestion
  gate fires on the next dogfood stage run.

## Out of scope

- Whether Copilot's custom-agent runtime has an AskUserQuestion analogue and
  how its gates should behave → deferred to existing `reassess-copilot-port`
  backlog item.
- A lint cross-check that `sync-copilot.mjs`'s `agentFor` table agrees with
  the Claude command `agent:` frontmatter → deferred to backlog idea
  `agentFor-frontmatter-crosscheck`.
- Bundling with `enforce-research-ticket-hiding` → stays independent.
- Auditing the non-stage helper commands (`init`, `stack`, `archive`, `retro`,
  `status`) beyond what the new Check 5 naturally covers.
