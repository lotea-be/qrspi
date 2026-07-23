# Tasks — session-version-check-and-update-prompt

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Skill authored and wired into `/qrspi:status` end-to-end

**Model:** sonnet — well-defined branching logic with a settled contract; the four branches and their exact text are specified in the spec, so the task is authoring-to-spec rather than novel reasoning.

- [x] 1.1 Create `claude/skills/qrspi-version-check/SKILL.md` with the complete skill body: session-flag guard, read installed version B from `.claude-plugin/plugin.json`, read repo marker A from `openspec/.qrspi-version`, numeric-tuple SemVer compare, and all four branches (up-to-date silent, behind AskUserQuestion with two-choice offer, downgrade one-line warning, unreadable-B one-line notice). (D1, D2, D3, D4, D5, D6, D7, D8)
- [x] 1.2 Add the `qrspi-version-check` inline load line as the first step of `claude/commands/status.md`, positioned before the onboarding check. (D1, D4)
- [x] 1.3 (human) Dev-install the in-repo copy (`claude --plugin-dir /workspaces/git/qrspi`), then in a repo with `openspec/.qrspi-version` = `0.6.0` and installed plugin at `0.7.0`, run `/qrspi:status`. Verify the AskUserQuestion names both version strings and offers exactly `["Run /qrspi:update now", "Continue on the current version"]`. (D2, D3) — re-verified under revised D2 (registry read); offer appeared where the old build showed "unavailable"
- [x] 1.4 (human) In a repo with matching versions, run `/qrspi:status`. Verify no version output appears. (D7) — re-verified after the silence-hardening (8699eec); fully silent
- [x] 1.5 (human) In a rolled-back repo (A ahead of B, e.g. marker `0.8.0` vs installed `0.7.0`), run `/qrspi:status`. Verify a one-line warning prints and the command continues. (D7) — re-verified under revised D2 (registry read): one-line warning, no gate
- [x] 1.6 (human) Confirm `claude/skills/qrspi-version-check/SKILL.md` exists under `claude/skills/` (not `.claude/skills/`). (D1)

## 2. Behind-offer wires through to `/qrspi:update`; no-marker and unreadable-B paths covered

**Model:** sonnet — refinements to an already-authored skill file; the wiring text is precisely specified in the spec and requires no novel reasoning.

- [x] 2.1 Update `claude/skills/qrspi-version-check/SKILL.md`: make the "Run now" branch explicit that it re-enters `/qrspi:update` as a slash command on the main loop (not a subagent spawn). (D5, D6)
- [x] 2.2 Update `claude/skills/qrspi-version-check/SKILL.md`: confirm the no-marker branch (when `openspec/.qrspi-version` is absent but `openspec/` exists) hands off to `/qrspi:update`'s own no-marker gate without issuing a second competing AskUserQuestion from the skill itself. (D5, D6)
- [x] 2.3 Update `claude/skills/qrspi-version-check/SKILL.md`: confirm the unreadable-B branch (when `.claude-plugin/plugin.json` is missing) sets the session flag and returns with a one-line notice, without blocking. (D10)
- [x] 2.4 (human) Dev-install, then in the behind-repo scenario select "Run /qrspi:update now" and confirm `/qrspi:update` enters as a main-loop re-entry (not spawned as a subagent). (D5, D6) — verified: update re-entered in-conversation
- [x] 2.5 (human) Remove `openspec/.qrspi-version` from a scratch repo (keep `openspec/` present), run `/qrspi:status`. Confirm the skill's no-marker branch fires and sends you to `/qrspi:update`'s own gate — no second competing AskUserQuestion from the skill. (D5) — verified: single delegated gate, no competing prompt
- [x] 2.6 (human) Make B unreadable — temporarily point `CLAUDE_CONFIG_DIR` at an empty dir (or rename `installed_plugins.json`), run `/qrspi:status`. Confirm the one-line "version check unavailable" notice prints and the command continues normally (no AskUserQuestion). Restore. (D2 fallback) — verified via empty CLAUDE_CONFIG_DIR: notice printed, no gate, no guess

## 3. Embed added to all eight stage commands; in-context session suppression verified in a chain

**Model:** sonnet — mechanical repetition of one embed line across eight files; no novel decisions, all positions are specified in the spec.

- [x] 3.1 Add the `qrspi-version-check` inline load line as the first step of `claude/commands/questions.md`, before the run-mode AskUserQuestion. (D1, D8)
- [x] 3.2 Add the `qrspi-version-check` inline load line as the first step of `claude/commands/research.md`, before the run-mode AskUserQuestion. (D1, D8)
- [x] 3.3 Add the `qrspi-version-check` inline load line as the first step of `claude/commands/design.md`, before the run-mode AskUserQuestion. (D1, D8)
- [x] 3.4 Add the `qrspi-version-check` inline load line as the first step of `claude/commands/structure.md`, before the run-mode AskUserQuestion. (D1, D8)
- [x] 3.5 Add the `qrspi-version-check` inline load line as the first step of `claude/commands/slices.md`, before the run-mode AskUserQuestion. (D1, D8)
- [x] 3.6 Add the `qrspi-version-check` inline load line as the first step of `claude/commands/plan.md`, before the run-mode AskUserQuestion. (D1, D8)
- [x] 3.7 Add the `qrspi-version-check` inline load line as the first step of `claude/commands/implement.md`, before the run-mode AskUserQuestion. (D1, D8)
- [x] 3.8 Add the `qrspi-version-check` inline load line as the first step of `claude/commands/pr.md`, before the run-mode AskUserQuestion. (D1, D8)
- [x] 3.9 Confirm the skill body from Slice 1 already instructs embedding commands to check for the held session flag before running any version-check logic; amend `claude/skills/qrspi-version-check/SKILL.md` if the guard text is absent or unclear. (D8)
- [ ] 3.10 (human) Open each of the nine command files and confirm the `qrspi-version-check` load line is the first substantive instruction in each command body (before run-mode prompt). (D1)
- [ ] 3.11 (human) Start a fresh session, run a Q→R→D auto-chain against a behind-repo. Verify the version AskUserQuestion appears once (at Q) and that the R and D stage entries produce no second version prompt. (D8)
- [ ] 3.12 (human) Start a new session and run a standalone `/qrspi:design <id>`. Verify the version check fires (no held flag in the new session). (D8)

## 4. Lint Check 9 added; README entry; `sync-copilot.mjs` run

**Model:** sonnet — mechanical addition of a new check following the existing pattern (Check 8 is the template); no algorithmic complexity, no novel reasoning.

- [x] 4.1 Add `checkVersionCheckEmbed` to `scripts/lint.mjs` after the existing Check 8, hardcoding the nine-command stem list and asserting the inline embed form is present in each. (D11)
- [x] 4.2 Add `qrspi-version-check` to the skills list in `README.md` with a one-line description. (D12)
- [x] 4.3 Run `node scripts/lint.mjs` — all checks including the new Check 9 must report `OK`. (D11)
- [ ] 4.4 (human) Temporarily remove the embed line from one command body (e.g. `claude/commands/plan.md`), re-run `node scripts/lint.mjs` — Check 9 must name the violation and exit non-zero. Restore the line. (D11)
- [x] 4.5 Run `node sync-copilot.mjs` to regenerate `copilot/` from the updated `claude/` sources. (D11, D12)
- [x] 4.6 Run `node sync-copilot.mjs --check` — must exit 0 (zero drift). (D11)
- [ ] 4.7 (human) Confirm `copilot/instructions/qrspi-version-check.instructions.md` exists after the sync. (D12)
- [ ] 4.8 (human) Confirm `README.md` lists `qrspi-version-check` in the skills section. (D12)
- [x] 4.9 Flip the `session-version-check-and-update-prompt` row in `openspec/backlog.md` from `proposed` to `in-progress` and move it under `## In progress`, with a completed-stages note (Q through P done). Commit this alongside the Slice 4 artifact changes.
