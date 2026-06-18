# Questions — example-greeting

> Stage Q of QRSPI. Generated 2026-06-18.
> Change summary: Add a `greeting` capability to the QRSPI kit so that the
> `/qrspi:greeting` command surfaces a context-aware welcome message with the
> contributor's name, the active branch, and the current change ID.

## Data model

*Not applicable.* The greeting capability reads existing context (git branch,
`plugin.json` version, `openspec/changes/` folder names) and produces text
output. No new data entities or persisted state are introduced.

## Indexing & query performance

*Not applicable.* No new queries or indexes.

## API

*Not applicable.* The greeting is emitted as inline text by the slash command;
there is no HTTP endpoint or service method.

## UI — command output surface

1. What exact text should the greeting emit? Should it include the current
   branch name, the active change ID (if any), and the kit version from
   `plugin.json`?
2. Should the greeting fail gracefully (print a partial message) when running
   outside a git repository, or exit non-zero?
3. Is there a Copilot equivalent prompt for the greeting, or does it remain
   Claude-only (no `copilot/prompts/qrspi-greeting.prompt.md` generated)?

## Front-end state

*Not applicable.* There is no front-end or persistent state for a greeting
command.

## Auth & authorization

*Not applicable.* The greeting reads only public repository metadata; no
auth checks are required.

## Migrations & data

*Not applicable.* No data-store changes.

## Testing

4. Can the greeting command be integration-tested by running it against a
   fixture repo (a temp dir with a minimal `plugin.json` and `openspec/`
   scaffold), or is a checkpoint-style manual test sufficient?
5. What does a passing test look like? Exit 0 + substring match on expected
   output lines, or a full snapshot?

## Sequencing & scope

6. Should the Copilot prompt equivalent land in the same PR or a follow-up?
   The sync generator already handles `claude/commands/*.md` → `copilot/prompts/`,
   so it could be included at no extra cost.
7. Does this change depend on the `kit-quality-hardening` lint gates being
   live, or can it ship independently on a clean branch?

## Open product questions (for the human)

- [x] **PQ1 — greeting content:** Should the greeting include the git user name
  (from `git config user.name`) in addition to branch and change ID? Options:
  (a) Include git user name (Recommended) -- personalises the output and matches
  the "contributor's name" intent,
  (b) Omit user name -- simpler, avoids a subprocess call.
  **Answer: (a) include git user name.**

- [x] **PQ2 -- Copilot scope:** Include the Copilot prompt in this PR? Options:
  (a) Yes, include it now (Recommended) -- the generator handles it automatically,
  (b) Defer to a follow-up.
  **Answer: (a) include in this PR.**
