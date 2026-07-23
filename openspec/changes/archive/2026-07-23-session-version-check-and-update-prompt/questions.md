# Questions — session-version-check-and-update-prompt

> Stage Q of QRSPI. Generated 2026-07-23.
> Change summary: At the start of each QRSPI session, compare `openspec/.qrspi-version`
> against the installed kit version and, when the repo is behind, offer to run
> `/qrspi:update` — a human-gated prompt, never a silent auto-migration.

## Version-source mechanism

1. The current kit version is carried in `.claude-plugin/plugin.json` (`version`
   field). What is the exact file path, as observed from inside a consumer repo
   when the plugin is installed? Is it reliably readable via the Read tool from a
   consumer repo's session, or does the plugin cache path vary per OS / install
   method in a way that makes it non-portable?

2. The `qrspi-update` skill already flags `OQ1 — auto-detect portability is
   UNVERIFIED`: "There is no portable primitive for a command body to learn its
   own install directory." Does the same portability concern apply here (reading
   the plugin's own `plugin.json` to determine the kit version at session start),
   or does the check happen in a command that ships inside the plugin and can
   therefore reference a known relative path?

3. Does the installed plugin always co-locate `plugin.json` with the
   `claude/commands/` tree? Concretely: when Claude Code resolves a
   `/qrspi:status` invocation, what is the working directory and can the command
   file reliably navigate to `../../../plugin.json` (or an equivalent relative
   path) to read the kit version? Or must the path always be treated as
   best-effort / OS-specific?

4. Is there a fallback version source if `plugin.json` is unreadable — for
   example, the highest filename stem in the `migrations/` directory (also
   shipped with the plugin)? Does that fallback produce the same SemVer as
   `plugin.json` for every release, or can they diverge (e.g. if a migration
   stub is omitted for a release)?

5. Is a network/marketplace lookup in scope for resolving the "latest version"?
   The backlog row explicitly flags "without adding a network dependency to every
   session." Confirm: the version source MUST be local (already-installed kit
   files), never a remote API call.

## Hook point — where the check runs

> ⮕ Resolved by PQ2: the hook point is **not** either/or — the check lives in
> `/qrspi:status` **and** all eight stage commands. Questions below that frame
> status-vs-stage as alternatives (Q6–Q9) are answered "both"; Q10/Q11 (which
> command bodies can host a live `AskUserQuestion`) remain the open R/D work.

6. The backlog row names two candidate hook points: "at the start of a stage
   command" or "in `/qrspi:status`." Are there other natural hook points worth
   considering — for example, `/qrspi:init` (refresh check after bootstrap),
   or a dedicated `/qrspi:version-check` command the user calls explicitly?

7. `/qrspi:status` is already the "where am I?" command and is the most natural
   place for a one-time-per-session surface. If the check lives there, does it
   fire every time the user runs `/qrspi:status`, or only on the first invocation
   of the session?

8. If the check lives in stage commands (Q, R, D, etc.) rather than in
   `/qrspi:status`, what is the de-duplication mechanism? Claude Code has no
   shared session-level flag store between independently invoked slash commands —
   does "once per session" mean "once per orchestrator context" (i.e. suppress
   re-checks only within an auto-chain)? Or does "once per session" require a
   disk marker (e.g. a `.qrspi-session-checked` temp file)?

9. If the check is embedded in every stage command individually (Q, R, D, S, V,
   P, I, PR), how many files ship the check logic? Is the check a loaded skill
   (one place), or is it inline prose repeated in each command file?

10. `/qrspi:status` has no `agent:` frontmatter and runs on the main loop. Do all
    stage commands also run on the main loop (for the check), or do some delegate
    entirely to a subagent where `AskUserQuestion` is unavailable — meaning the
    version check cannot live inside a subagent?

11. Which commands in `claude/commands/` currently carry `agent:` frontmatter
    (delegating to a subagent)? List them — this determines which commands cannot
    host a live `AskUserQuestion` version-check gate without restructuring.

## The version-behind check

12. The check is a SemVer comparison: marker version `A` (from
    `openspec/.qrspi-version`) vs. kit version `B` (from plugin files). Is the
    comparison exactly the same SemVer comparison logic already in the
    `qrspi-update` skill (numeric tuple compare, not string sort), or can it be
    simpler here (e.g., strict string equality, since the marker is always the
    exact SemVer string written by the kit)?

13. Should the check surface a warning on a downgrade (`A > B`) — marker version
    ahead of the installed kit? Or is that silent (only `/qrspi:update` handles
    downgrades)?

14. What is the exact output of the version-check prompt when the repo is behind?
    A one-line notice + a yes/no offer to run `/qrspi:update`? Does the prompt
    show the gap explicitly (e.g. "repo is at 0.6.0, kit is at 0.7.0 — 1 version
    behind")?

15. When the offer is accepted (user chooses "Run `/qrspi:update` now"), does the
    check hand off by directly invoking `/qrspi:update` as a slash command on the
    main loop, or does it just print the command and let the user run it? Note:
    directly re-entering `/qrspi:update` from within a running stage command
    (e.g., `/qrspi:questions`) would interrupt that stage's own flow.

## Edge cases and degradation

16. When `openspec/.qrspi-version` does not exist (uninitialized repo), the check
    has no marker to compare against. Does it stay silent (no version-check offer
    — the user should run `/qrspi:init` first), surface a separate "run
    `/qrspi:init`" prompt, or reuse `/qrspi:update`'s no-marker gate
    (AskUserQuestion to initialize or supply version)?

17. When the kit version is unreadable (plugin.json not found, portability
    failure), does the check fail silently (skip with no message) or warn the
    user ("version check unavailable — run `/qrspi:update` manually if needed")?

18. When the repo is already up to date (`A == B`), is there any output — a
    brief "up to date" confirmation, or complete silence?

19. If the user has already run `/qrspi:update` and updated the marker but has
    not yet committed the bump, the marker file on disk reflects the new version.
    Does the check treat this as up-to-date (it reads the file, sees the new
    version, no offer)? Or does it also check staged vs. committed state?

## Skill / command architecture

20. Should the version-check logic live in a new shipped skill (e.g.
    `qrspi-version-check`) so stage commands can load it by name without
    duplicating prose, or is it inline prose added to each relevant command file?

21. If the logic is a skill, is it a `claude/skills/` shipped skill (available
    to consumers) or a `.claude/skills/` dev-tooling skill (kit-internal only)?
    Given that consumers run the check, it must ship in `claude/skills/`.

22. Would the version-check skill be loaded only by the specific commands that
    embed the check, or auto-loaded by every stage command via the stage-agent
    system prompt? (The existing `workflow` and `openspec-workflow` skills are
    already auto-loaded; adding a third auto-loaded skill has a context-budget
    cost.)

23. Does `plugin.json` need a change for this feature (e.g. adding the new skill
    to the `skills` list), or is it automatically discovered because the `skills`
    entry in `plugin.json` points to `./claude/skills/` as a directory?

## Session-level suppression mechanism

> ⮕ Resolved by PQ3: suppression is **in-context only** — the orchestrator
> holds a "checked this session" flag (same mechanism as the run-mode), so an
> auto-chain checks once and suppresses downstream re-checks; a fresh session or
> standalone stage call re-checks. Option (b) (disk marker) is rejected, so
> Q25's temp-file/repo-disambiguation question is moot; Q24/Q26 collapse to the
> in-context branch. Open R/D work: how the flag is passed across auto-chained
> stage re-entries.

24. A "once per session" guarantee requires some state. In Claude Code, a slash
    command runs in the main-loop context and has no shared singleton across
    independent invocations. What is the intended mechanism?
    - (a) No suppression — the check fires on every invocation of the embedding
      command(s). Accept it as a low-frequency operation (cheap Read + string
      compare).
    - (b) Disk marker — write a temp file (e.g.
      `/tmp/qrspi-session-checked-<repo-hash>`) on first check; skip on
      subsequent invocations in the same OS session.
    - (c) Embed only in `/qrspi:status` and accept that "once per session" means
      "whenever the user runs `/qrspi:status`" (not truly session-scoped).
    - (d) Other?

25. If option (b) (disk marker) is chosen, where is the temp file written, and
    how is the "repo" disambiguated (git remote URL, repo root path hash, or
    another key)?

26. If option (a) (fire every time) is chosen, which specific commands embed the
    check? All eight stage commands? Only the first-touch commands (Q)?
    Only `/qrspi:status`?

## Testing

27. What does a passing test for this feature look like? The kit's CI is
    `scripts/lint.mjs`. Is there a test harness for command-body behavior, or
    is coverage via the lint checks only (structural) with manual testing for
    runtime behavior?

28. Are there existing lint checks that should be extended to assert the
    version-check embed is present in the expected command(s)? (Analogous to
    lint Check 7 asserting read-contract banners, or Check 4 asserting every
    command is documented in the README.)

29. What manual test scenarios should be defined in the design to cover:
    behind / up-to-date / no-marker / plugin-unreadable / downgrade?

## Impact on existing commands and skills

30. `/qrspi:status` currently has no version-check logic. If the check moves
    there, what is the ordering relative to the existing onboarding check
    (Steps 1–5 in `status.md`)? Does the version check run before or after the
    onboarding check?

31. The `qrspi-update` skill already handles all edge cases. Should this change
    *reuse* that skill's edge-case prose by loading it, or should the version-
    check be a thin wrapper that only reads two values and compares them (deferring
    full walk logic to `qrspi-update` only when the user accepts the offer)?

32. Does the `copilot/` tree need corresponding updates (sync via
    `sync-copilot.mjs`)? Confirm: any new or modified `claude/` file requires a
    copilot sync run; the `copilot/` tree is never hand-edited.

## Sequencing & scope

33. Does this change depend on any currently in-flight or not-yet-merged backlog
    items? In particular: does `update-walk-resume-idempotency` (P3) need to
    land before the session check is useful? (If the update walk can corrupt on
    re-run, surfacing it more aggressively makes that risk worse.)

34. Should this change ship the version check only in `/qrspi:status` first
    (minimal footprint, clearly scoped), with embedding in stage commands deferred
    to a follow-up idea, or should it target both in one PR?

35. Is `lint-auto-mode-gate-coverage` (currently P2, unblocked after `add-auto-mode`)
    a blocking prerequisite, a natural pairing, or truly independent? If this
    change adds a new command/skill, the lint-coverage change becomes easier to
    sequence after it.

## Open product questions (for the human)

- [x] **PQ1 — version source:** Where should the kit version be read from to
  determine whether the repo is behind? Options:
  (a) `.claude-plugin/plugin.json` `version` field — the same file `/qrspi:init`
      reads when writing the marker; requires a portable read path from within
      a consumer repo's session (Recommended — consistent with existing precedent,
      no new concept),
  (b) Highest filename stem in `migrations/` directory — avoids `plugin.json`
      portability concern but can diverge if a stub is omitted,
  (c) Both, with (b) as fallback when (a) is unreadable — belt-and-suspenders
      but two-source-of-truth risk,
  (d) Skip auto-detect entirely — require the user to pass the version explicitly
      or run `/qrspi:update` manually (no session check feature at all in this
      form).
  **Answer: (a) — read the kit version from `.claude-plugin/plugin.json`
  `version`, the same source `/qrspi:init` uses for the marker. Local only, no
  network (settles Q5). The portability concern in Q1–Q3 / `qrspi-update` OQ1
  must be resolved in R/D — this is the same "learn my own install dir" problem.**

- [x] **PQ2 — hook point:** Where should the version check live? Options:
  (a) `/qrspi:status` only — the natural "where am I?" entry point; fires
      whenever the user runs status, which is a reasonable session-start ritual
      (Recommended — minimal footprint, no stage-command coupling),
  (b) Every stage command (Q, R, D, S, V, P, I, PR) — maximum coverage but
      adds a check to every command, increases nag risk, and hits every
      `agent:`-delegating command's architecture constraint (those can't host
      `AskUserQuestion`),
  (c) First-stage command only (`/qrspi:questions`) — surfaces at the natural
      point a user begins a new change; misses users who skip straight to a later
      stage,
  (d) A dedicated `/qrspi:version-check` command the user calls explicitly — no
      automatic surfacing, purely opt-in.
  **Answer: (a)+(b) combined — the check lives in `/qrspi:status` AND all eight
  stage commands (Q, R, D, S, V, P, I, PR). Broadest coverage, so it surfaces
  no matter where the user enters the flow. This makes once-per-session
  suppression important (see PQ3) and requires the check to sit in each command
  *body* (main loop), not inside a delegated subagent, since `AskUserQuestion`
  is unreachable in a subagent — R/D must confirm every stage command body runs
  on the main loop before delegating (relates to Q10/Q11).**

- [x] **PQ3 — session suppression:** What is the acceptable nag behavior if the
  version check fires every time the embedding command runs (rather than once
  per session)? Options:
  (a) Accept fire-every-time — the check is a cheap Read + string compare; the
      offer appears on every status call but the user dismisses it in one
      keystroke (Recommended if PQ2 = status-only, since `/qrspi:status` is
      rarely run in a tight loop),
  (b) Disk-based suppression — write a temp file keyed to the repo root on first
      check; skip on subsequent invocations in the same OS session (adds
      complexity, cross-platform temp-file concerns),
  (c) In-context suppression only — suppress re-checks within an auto-chain
      (the held run-mode already scopes a session); accept re-offer if the user
      runs a new session or standalone command.
  **Answer: (c) In-context suppression only — the orchestrator holds a
  "version-checked this session" flag (the same context-held mechanism as the
  run-mode), so a Full/Semi-auto Q→PR chain checks once at the first stage and
  suppresses the ~8 downstream re-checks. No disk state. A fresh session or a
  standalone stage invocation legitimately re-checks. R/D must define exactly
  how that flag is held/passed across auto-chained stage re-entries.**

- [x] **PQ4 — no-marker behavior:** When `openspec/.qrspi-version` is absent
  (repo not yet initialized), should the version check:
  (a) Stay silent — no version check; surface the missing init via the existing
      onboarding check in `/qrspi:status` instead (Recommended — avoids two
      overlapping prompts for the same root cause),
  (b) Reuse `/qrspi:update`'s no-marker gate (offer to initialize or supply
      version) — consistent with the existing edge-case handling but adds
      `AskUserQuestion` friction to an already-failing init state,
  (c) Print a one-line passive note ("No version marker — run `/qrspi:init`
      first") without an interactive gate.
  **Answer: (b) Reuse `/qrspi:update`'s existing no-marker gate — do not invent
  a parallel degradation path. The version check delegates the absent-marker
  case to the same handling `/qrspi:update` already defines (offer to
  initialize / supply version), keeping one source of truth for the edge cases
  (ties to Q31 — the check is a thin wrapper that reuses `qrspi-update`'s
  edge-case prose rather than re-implementing it). This one-per-session gate is
  bounded by PQ3's in-context suppression, so it does not re-fire on every
  stage.**

- [x] **PQ5 — offer UX when behind:** When the repo is behind, what should the
  check offer? Options:
  (a) `AskUserQuestion` with two choices — "Run `/qrspi:update` now" (which
      immediately invokes the command on the main loop) and "Remind me later"
      (Recommended — interactive, actionable, consistent with QRSPI gate style),
  (b) Print-only — print a notice with the version gap and the command to run,
      but no interactive gate; the user copies and runs it,
  (c) `AskUserQuestion` with "Run `/qrspi:update` now", "Skip this time", and
      "Suppress for this session" (three-way, more explicit suppression path).
  Note: if PQ2 = `/qrspi:status`, the offer fires within a running status command;
  "Run now" would re-enter `/qrspi:update` on the main loop immediately after
  status finishes (or interrupt it). Confirm this sequencing is acceptable.
  **Answer: (a) `AskUserQuestion` with two choices — "Run `/qrspi:update` now"
  (re-enters the update command on the main loop) and "Continue on the current
  version". The offer should show the gap explicitly (Q14 — e.g. "repo 0.6.0 →
  kit 0.7.0"). Because PQ2 spreads the check across all stage commands, "Run
  now" can fire mid-flow; PQ7 resolves what happens to the interrupted stage.**

- [x] **PQ6 — downgrade visibility:** When the marker is ahead of the installed
  kit version (`A > B`) — meaning the consumer has rolled back the plugin — should
  the check:
  (a) Stay silent — this is an unusual state, and `/qrspi:update` already handles
      downgrade hard-stop if the user runs it (Recommended — avoids alarming
      users for a rare case they may not be able to act on),
  (b) Warn explicitly — "Installed kit (vB) is older than this repo's marker (vA)
      — you may be running a stale plugin" — no gate, just a printed notice,
  (c) Surface via `AskUserQuestion` — hard-stop style, matching `/qrspi:update`'s
      own downgrade behavior.
  **Answer: (b) Warn explicitly, no gate — print a one-line notice that the
  installed kit is older than the repo's marker (running a stale plugin), then
  proceed with the stage. No `AskUserQuestion`: a downgrade offers nothing to
  *update* toward, so a gate would be a dead end; the notice is purely
  informational. Subject to the same PQ3 in-context suppression (warn once).**

- [x] **PQ7 — post-update resumption (emergent, from PQ2 + PQ5):** When the user
  accepts "Run `/qrspi:update` now" from within a running stage command, what
  happens to that interrupted stage afterward? Options:
  (a) Check-first, re-run fresh — the version check runs at the very *top* of the
      command, before any branch/folder/subagent work, so accepting the offer
      loses no partial state; `/qrspi:update` runs to completion and the user
      re-runs the original stage command fresh (Recommended),
  (b) Auto-resume — after `/qrspi:update` completes, the orchestrator
      automatically re-enters the original stage command to continue the chain,
  (c) Abort — running update aborts the current chain entirely; the user restarts
      from whichever stage they choose.
  **Answer: (a) Check-first, re-run fresh — the version check is the *first*
  thing each embedding command does, before it creates a branch, writes any
  artifact, or spawns a subagent. So "Run update now" can safely re-enter
  `/qrspi:update` with nothing partial to unwind; after the walk finishes the
  user re-invokes the original stage. This gives PQ2's broad placement a clean
  interrupt boundary and keeps the update walk human-gated (no auto-resume
  coupling). Design note for D: the check must be positioned ahead of every
  side-effecting step in each command body.**
