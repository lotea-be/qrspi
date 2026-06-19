# Design — example-greeting

> Stage D of QRSPI. Generated 2026-06-18.
> **Implementation is BLOCKED until a human approves this file.**

## Context

The QRSPI kit currently has no ambient "hello" command. Contributors landing
on a fresh clone must piece together kit version, active changes, and branch
context from separate commands (`/qrspi:status`, `git branch`, `cat plugin.json`).
The desired end state: a single `/qrspi:greeting` command emits a short,
context-aware welcome banner that a contributor can run at the start of a
session to orient themselves.

## Goals / Non-Goals

**Goals:**
- Add `/qrspi:greeting` as a Claude slash command that prints the contributor's
  git user name, the current branch, the kit version (`plugin.json`), and the
  list of active change IDs (non-archived folders in `openspec/changes/`).
- Generate a matching Copilot prompt via the existing sync pipeline (no generator
  changes needed -- automatic pickup).
- Degrade gracefully: if outside a git repo or `plugin.json` is absent, print
  whatever is available and note what is missing.

**Non-Goals:**
- No persistent greeting preferences or configuration file.
- No animation, colour output, or terminal-detection logic.
- No dedicated `claude/skills/greeting/` skill; the command body is
  self-contained.

## Decisions

### D1 -- Self-contained command vs. dedicated skill (Q1, Q3)

Chosen: self-contained command body in `claude/commands/greeting.md`.
Rejected: a `claude/skills/greeting/SKILL.md` that the command loads.
Why: the greeting logic is a single read-pass with no reusable sub-procedure;
a skill would be a container with one item. The lint gate already enforces that
any `Load skill X` reference resolves to a real skill, so a spurious skill
would need to exist forever just to satisfy the lint.

### D2 -- Git subprocess vs. ambient context injection (Q1, Q2)

Chosen: instruct the agent to run `git rev-parse --abbrev-ref HEAD` and
`git config user.name` as inline bash calls in the command body.
Rejected: relying on Claude's built-in context (branch may not be injected).
Why: the research stage confirmed that `/qrspi:status` uses the same pattern
successfully; no new mechanism is introduced.

### D3 -- Copilot prompt: include now vs. defer (PQ2)

Chosen: include the Copilot prompt in this PR (generator handles it automatically).
Rejected: defer to a follow-up change.
Why: PQ2 answer is (a). The generator already picks up any new `claude/commands/`
file; zero additional work is needed, and keeping Claude and Copilot in sync
is the kit's core invariant.

## Vertical slices (preview)

- **Slice 1 -- command + Copilot prompt:** Add `claude/commands/greeting.md`,
  run `node sync-copilot.mjs`, confirm the Copilot prompt appears in `copilot/`.
  Demoable: `/qrspi:greeting` prints contributor name, branch, version, changes.

## Risks / Trade-offs

- If the agent runs the command outside a git repo, the `git` subprocess calls
  return non-zero. The command body must handle this with a `|| echo "unknown"`
  fallback so the greeting still prints.
- The kit version is read from `plugin.json` at command invocation time; if the
  file is absent the agent should note "version unavailable" rather than crashing.

## Open questions for the human

- [x] All product questions resolved in `questions.md` (PQ1, PQ2 answered).
