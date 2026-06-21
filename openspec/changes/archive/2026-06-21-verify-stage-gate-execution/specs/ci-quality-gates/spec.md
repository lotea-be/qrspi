# Spec — ci-quality-gates

> Delta against `openspec/specs/ci-quality-gates/spec.md` for the
> `verify-stage-gate-execution` change. Adds lint Check 5: a body-aware static
> assertion that no command declares a non-builtin `agent:` while its body
> reaches a main-loop-only gate tool (currently: `AskUserQuestion`) — either by
> naming it inline OR by referencing the `qrspi-workflow` "Stage choreography"
> procedures (commit step / next-stage handoff) that transitively invoke it.

## ADDED Requirements

### Requirement: Lint job checks gate-tool / executor agreement
The CI `lint` job MUST include a Check 5 (`checkGateExecutor`) that maintains
a hardcoded `MAIN_LOOP_ONLY` set (at minimum `{'AskUserQuestion'}`) and, for
each `claude/commands/*.md`, flags a violation if the command's frontmatter
declares a non-builtin `agent:` AND the command's body **reaches** a tool in
`MAIN_LOOP_ONLY`. A body reaches such a tool either **directly** (the tool name
appears in the body text) or **transitively** (the body references the
`qrspi-workflow` "Stage choreography" procedures — commit step / next-stage
handoff / approval gate — which invoke a main-loop-only tool on the command's
behalf). Builtins (`build`, `agent`) MUST be excluded from the check. Check 5
MUST be registered in `scripts/lint.mjs` after Check 4 using the same
dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 5: ...')` label in `main()`).

#### Scenario: stage command carries gate-trapping agent: pairing (inline tool)
- **WHEN** a `claude/commands/*.md` file declares `agent: questioner` (a
  non-builtin) AND its body references `AskUserQuestion`, and the lint job runs
- **THEN** Check 5 reports a violation and `node scripts/lint.mjs` exits
  non-zero.

#### Scenario: stage command traps gates transitively via the skill
- **WHEN** a `claude/commands/*.md` file declares `agent: researcher` (a
  non-builtin) AND its body does NOT name `AskUserQuestion` directly but
  references the `qrspi-workflow` "Stage choreography" commit step / next-stage
  handoff (which invoke `AskUserQuestion`), and the lint job runs
- **THEN** Check 5 reports a violation, because the body transitively reaches a
  main-loop-only tool that would be trapped in the subagent.

#### Scenario: stage commands after fix pass Check 5
- **WHEN** the nine stage commands have had `agent:` and the fork directive
  removed (per this change) and the lint job runs
- **THEN** Check 5 finds no command with both a non-builtin `agent:` and a
  body reference to a main-loop-only tool, and reports `OK`.

#### Scenario: helper commands with builtin agent: are not flagged
- **WHEN** `archive.md`, `init.md`, or `stack.md` declare `agent: build`
  and the lint job runs
- **THEN** Check 5 does not flag them, because `build` is in the
  `BUILTIN_AGENTS` exclusion set.

#### Scenario: no-agent commands pass Check 5
- **WHEN** `retro.md` and `status.md` (which carry no `agent:` field) are
  evaluated by Check 5
- **THEN** Check 5 does not flag them, because the check only applies to
  commands with a non-builtin `agent:` declaration.

#### Scenario: future command re-adds gate-trapping pattern is caught
- **GIVEN** a contributor adds a new command with `agent: planner` in
  frontmatter and an `AskUserQuestion` call in the body
- **WHEN** `node scripts/lint.mjs` runs in CI
- **THEN** Check 5 flags the new command as a violation, preventing the
  gate-trapping bug from recurring silently.
