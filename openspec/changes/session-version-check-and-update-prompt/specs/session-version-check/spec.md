# Spec — session-version-check

> New capability introduced by the `session-version-check-and-update-prompt` change.
> A shipped skill that reads the repo's QRSPI version marker (A) and the installed
> kit version (B), compares them, and branches on the result — surfacing a
> human-gated update offer when the repo is behind, a warning on downgrade, and
> proceeding silently when up-to-date.

## ADDED Requirements

### Requirement: Skill ships as a named-loadable consumer skill
The system MUST ship `claude/skills/qrspi-version-check/SKILL.md` in the
`claude/skills/` directory (not `.claude/skills/`) so that it is available to
consumers as a named-loaded skill. The skill MUST be auto-registered from the
`skills: ./claude/skills` directory and MUST NOT require a `plugin.json` edit to
be available.

#### Scenario: skill is loadable by consumers after install
- **WHEN** a consumer invokes any QRSPI command and the command body loads
  skill `qrspi-version-check`
- **THEN** `claude/skills/qrspi-version-check/SKILL.md` is found, loaded, and
  its instructions are followed by the orchestrator.

#### Scenario: skill is not under dev-tooling directory
- **WHEN** the kit's `claude/skills/` directory is inspected
- **THEN** `qrspi-version-check/SKILL.md` is present in `claude/skills/` and
  NOT in `.claude/skills/`.

### Requirement: Version source B is read from Claude Code's installed-plugin registry
The skill MUST read the installed kit version B from Claude Code's
installed-plugin registry — the file `plugins/installed_plugins.json` under the
Claude config directory (`$CLAUDE_CONFIG_DIR`, defaulting to `~/.claude`) — local
only, no network call. The skill MUST locate the plugin entry by matching the key
glob `qrspi@*` (never a hardcoded marketplace name) and take that entry's
`version`; when multiple scope entries exist, it MUST use the highest SemVer. B
MUST be a bare SemVer string. The skill MUST NOT read the plugin's own
`.claude-plugin/plugin.json` for B (that path is not resolvable from an arbitrary
consumer working directory). If B cannot be read reliably, the skill MUST print a
one-line notice ("version check unavailable — run `/qrspi:update` manually if
needed"), set the in-context session flag, and proceed with the stage without
blocking.

#### Scenario: B read succeeds
- **WHEN** `$CLAUDE_CONFIG_DIR/plugins/installed_plugins.json` is accessible and
  contains a `qrspi@*` plugin entry whose `version` is a bare SemVer string
- **THEN** the skill reads B from that entry (highest SemVer if several) and
  proceeds with the comparison, regardless of the current working directory.

#### Scenario: B is unreadable — warn and proceed
- **WHEN** the config directory cannot be resolved, `installed_plugins.json`
  cannot be read or is malformed, or no `qrspi@*` entry with a valid `version`
  is present
- **THEN** the skill prints a one-line notice, sets the in-context session flag
  (so it does not re-nag), and returns immediately without issuing an
  AskUserQuestion or blocking the stage.

### Requirement: Version source A is read from the repo's qrspi-version marker
The skill MUST read the consumer repo's current QRSPI version A from
`openspec/.qrspi-version` — a bare SemVer one-line file written by `/qrspi:init`
and updated by `/qrspi:update`. If A is absent (the marker file does not exist),
the skill MUST delegate to `/qrspi:update`'s existing no-marker gate without
inventing a parallel path.

#### Scenario: A read succeeds
- **WHEN** `openspec/.qrspi-version` exists and contains a bare SemVer string
- **THEN** the skill reads A from that file and proceeds with the comparison.

#### Scenario: marker absent — delegate to /qrspi:update
- **WHEN** `openspec/.qrspi-version` does not exist
- **THEN** the skill hands off to `/qrspi:update`'s no-marker gate (which offers
  via AskUserQuestion to initialize the marker or supply the actual version),
  without the version-check skill inventing a second parallel prompt.

### Requirement: SemVer comparison uses numeric-tuple ordering
The skill MUST compare A and B by parsing each as a `(major, minor, patch)`
integer tuple and comparing left-to-right numerically — the same algorithm
documented in the `qrspi-update` skill's walk algorithm section — so that
version ordering is correct (e.g. `0.10.0 > 0.9.0`). String-equality or
lexicographic comparison MUST NOT be used as the sole comparison method, because
direction (behind vs downgrade) is required.

#### Scenario: numeric ordering is correct for two-digit minor versions
- **WHEN** A is `0.9.0` and B is `0.10.0`
- **THEN** the skill correctly identifies A < B (behind) and NOT A > B
  (which a lexicographic compare would produce).

#### Scenario: same-version result is up-to-date
- **WHEN** A equals B (all three tuple components are equal)
- **THEN** the skill takes the up-to-date branch (silent, no output).

### Requirement: Up-to-date branch is silent
The skill MUST produce no visible output (no confirmation line, no banner) when
A == B. Silently setting the in-context session flag and returning is the entire
up-to-date behaviour.

#### Scenario: up-to-date produces no output
- **WHEN** A equals B
- **THEN** the user sees nothing — the version check happens invisibly and the
  stage continues normally.

### Requirement: Behind branch issues a two-choice AskUserQuestion with the gap shown
When A < B (repo marker is behind installed kit), the skill MUST issue exactly one
AskUserQuestion showing the gap explicitly. The question text MUST name both A and
B and the version delta. The choices MUST be exactly:
`["Run /qrspi:update now", "Continue on the current version"]`. On "Run now" the
orchestrator MUST re-enter `/qrspi:update` as a slash command on the main loop.
On "Continue" the skill MUST set the in-context session flag and proceed with the
stage.

#### Scenario: behind — user chooses to update
- **WHEN** A is `0.6.0`, B is `0.7.0`, and the user selects "Run /qrspi:update now"
- **THEN** the orchestrator re-enters `/qrspi:update` as a slash command on the
  main loop (not as a subagent spawn), and the current stage is not advanced.

#### Scenario: behind — user chooses to continue
- **WHEN** A is `0.6.0`, B is `0.7.0`, and the user selects "Continue on the
  current version"
- **THEN** the skill sets the in-context session flag and returns; the stage
  proceeds normally without running `/qrspi:update`.

#### Scenario: question shows explicit version gap
- **WHEN** A is `0.6.0` and B is `0.7.0`
- **THEN** the AskUserQuestion text contains both version strings and conveys
  that the repo is behind (e.g. "This repo is on QRSPI 0.6.0; installed kit
  is 0.7.0 (1 version behind). Run /qrspi:update now?").

### Requirement: Downgrade branch warns once and proceeds without a gate
When A > B (repo marker is ahead of installed kit — a rolled-back plugin), the
skill MUST print a one-line warning notice naming both A and B, set the in-context
session flag, and proceed with the stage. No AskUserQuestion MUST be issued for
a downgrade; a gate would be a dead end because there is nothing to update toward
from a downgraded plugin.

#### Scenario: downgrade warns and continues
- **WHEN** A is `0.7.0` and B is `0.6.0`
- **THEN** the skill prints a one-line warning (e.g. "Installed kit 0.6.0 is
  older than this repo's marker 0.7.0 — you may be running a stale plugin"),
  sets the in-context session flag, and returns so the stage continues normally.

#### Scenario: no AskUserQuestion on downgrade
- **WHEN** A > B
- **THEN** the skill does NOT issue any AskUserQuestion; the stage proceeds
  without any user interaction.

### Requirement: In-context session flag suppresses re-checking within a chained session
The skill MUST instruct each embedding command to check "do I already hold a
version-checked flag from earlier in this orchestrator context?" before running
any check logic. If the flag is already held, the skill MUST return immediately
without reading A, reading B, or issuing any prompt. The flag MUST be held in
the orchestrator's conversational context only — no disk file, no temp marker,
no frontmatter — using the same mechanism as the run-mode flag.

#### Scenario: second stage in an auto-chain does not re-check
- **WHEN** Full auto mode chains from stage Q (which ran the check) to stage R
- **THEN** the version-check preamble in the R command body finds the flag
  already held, returns immediately, and the user sees no second version prompt.

#### Scenario: fresh session re-checks
- **WHEN** a user starts a new session (after a `/clear` or new terminal) and
  invokes a stage command
- **THEN** no in-context flag is held, so the full check runs again — this is
  correct and expected behaviour, parallel to the run-mode re-ask.

#### Scenario: no disk artifact written for the session flag
- **WHEN** a full Q→PR auto-chain runs to completion
- **THEN** no flag file, marker file, or config entry containing the session-check
  state exists in the repository after the run.

### Requirement: Check runs first — before run-mode establishment and before every side effect
The skill's instructions MUST specify that each embedding command runs the version
check as its very first step, before run-mode establishment, before the
precondition Glob, and before any branch, folder, subagent, or commit work.
Within the check itself, the ordering MUST be: (1) session-flag guard; (2) read B;
(3) read A; (4) compare and branch. The check ends by setting the flag.

#### Scenario: version check precedes run-mode prompt
- **WHEN** a user invokes `/qrspi:questions <id>` in a fresh session (no flag held)
- **THEN** the version check runs first; only after it completes (or is suppressed
  by the flag) does the run-mode AskUserQuestion appear.

#### Scenario: run-mode is established immediately after the check
- **WHEN** the version check completes or is skipped via the session flag
- **THEN** the command body proceeds to establish run-mode (if not already held)
  as its next step.

### Requirement: Check is suppressed when openspec/ is absent (onboarding wins)
In `/qrspi:status` specifically, when `openspec/` itself is absent (the repo has
never been initialized), the onboarding check MUST win and send the user to
`/qrspi:init`; the version-check skill MUST do nothing in that case. The skill's
no-marker delegation to `/qrspi:update` is reached only when `openspec/` exists
but `openspec/.qrspi-version` does not.

#### Scenario: completely un-initialized repo — onboarding wins
- **WHEN** a user runs `/qrspi:status` on a repo where `openspec/` does not exist
- **THEN** the status command's existing onboarding check fires (sending the user
  to `/qrspi:init`) and the version-check skill does nothing — avoiding two
  competing prompts for the same "not initialized" root cause.

#### Scenario: initialized repo without marker — version check's no-marker path fires
- **WHEN** `openspec/` exists but `openspec/.qrspi-version` does not
- **THEN** the version-check skill's no-marker branch fires (delegating to
  `/qrspi:update`'s gate), not the onboarding check.
