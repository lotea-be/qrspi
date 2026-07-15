# Tasks — versioned-update-command

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Marker lifecycle at init

**Model:** sonnet — mechanical appending of a known write step to an existing
command file; no novel logic, mirrors the existing `openspec/config.yaml`
sentinel write.

- [x] 1.1 In `claude/commands/init.md`, add a marker-write step after the `openspec/config.yaml` sentinel write: create `openspec/.qrspi-version` containing the bare SemVer string from `plugin.json` `version`, no `v` prefix, no trailing key (D1)
- [x] 1.2 Verify the marker-write step is positioned before the `git add openspec/` commit step in `claude/commands/init.md`, so the file is committed in the same commit as `openspec/config.yaml` (D1)
- [ ] 1.3 (human) Dev-install the branch (`claude --plugin-dir /workspaces/git/qrspi`) in a scratch consumer repo, run `/qrspi:init`, confirm `openspec/.qrspi-version` contains the bare SemVer of the installed kit (e.g. `0.6.0`), and run `git log --name-only -1` to confirm it is committed alongside `openspec/config.yaml`

## 2. Migration manifest schema + lint gate

**Model:** sonnet — the lint check is structured, follows an existing pattern
in `scripts/lint.mjs` (dependency-free ESM, errors array, labelled stdout
lines), and the YAML schema is fully settled in the specs.

- [x] 2.1 Create `migrations/` directory and add `migrations/0.6.0.yaml` as a valid stub with `version`, `summary`, and empty `automated` and `manual` lists (D4, D6)
- [x] 2.2 In `scripts/lint.mjs`, add a new check function (async, errors pushed to `errors[]`, labelled `process.stdout.write` call in `main()`) that asserts every `## [X.Y.Z]` CHANGELOG section has a corresponding `migrations/<version>.yaml` (D6)
- [x] 2.3 Extend the same lint check function to validate manifest schema well-formedness: required keys (`version`, `summary`, `automated`, `manual`), `automated[].action` must be `edit-file` only, `automated[].path` must start with `openspec/` (D4, D6, D7)
- [x] 2.4 Extend the same lint check function to validate the marker SemVer format (bare semver regex) where `openspec/.qrspi-version` exists (D1, D7)
- [ ] 2.5 (human) From the kit repo root, run `node scripts/lint.mjs`; confirm exit 0. Temporarily rename `migrations/0.6.0.yaml` to `.bak`; rerun and confirm non-zero exit with a clear "missing manifest entry" error line. Restore the file; confirm exit 0. Also add a temp `migrations/bad.yaml` with `action: run-command` and confirm the schema check fires, then remove the temp file.

## 3. /qrspi:update walk read-path (plan, no edits)

**Model:** opus — the walk algorithm has non-obvious SemVer ordering, the
no-marker / downgrade branching must be correct under edge inputs, and OQ1's
auto-detect vs. fallback branching introduces conditional logic that is
first-of-kind in this kit; deep reasoning materially reduces the risk of
a subtle mis-ordering or missed edge-case.

- [x] 3.1 Write `claude/commands/update.md` with no `agent:` frontmatter (main-loop command), accepting an optional `<target-version>` arg, loading the `qrspi-update` skill, and delegating arg parsing and auto-detect fallback to the skill (D2, D3)
- [x] 3.2 Write `claude/skills/qrspi-update/SKILL.md` with the manifest schema contract, the SemVer-ordered walk algorithm (`A < v ≤ B` in ascending SemVer order), and plan-only output for this slice (prints summary + step count per version, applies no edits) (D2, D4)
- [x] 3.3 In `claude/skills/qrspi-update/SKILL.md`, document auto-detect as primary (derive target from installed plugin version/manifest) and explicit `<target-version>` arg as the guaranteed-portable fallback, with OQ1's stage-I watch-item noted (D2, D5)
- [x] 3.4 In `claude/skills/qrspi-update/SKILL.md`, implement all three edge-case handlers: marker == target → "already up to date" + exit; no marker present → detect, tell human, offer to initialize to current target via `AskUserQuestion`; marker > target → hard-stop and warn (D5)
- [ ] 3.5 (human) Dev-install the branch in a scratch consumer repo with marker set to a version behind the kit. Run `/qrspi:update` (no arg, auto-detect path) and confirm terminal shows the per-version plan in ascending SemVer order with no file writes (`git status` clean). Run `/qrspi:update <explicit-target>` and confirm same output. Also test: marker == target → "already up to date"; absent marker → `AskUserQuestion` offer fires; marker > target → hard-stop warning.

## 4. Hybrid apply + marker bump

**Model:** sonnet — the apply dispatcher follows a mechanical pattern (iterate
steps, branch on `action == edit-file`, call `AskUserQuestion` for manual);
the walk ordering was settled in slice 3 (opus). The git stage + print-commit
tail mirrors the existing pattern used in QRSPI's own commit step.

- [ ] 4.1 Extend `claude/skills/qrspi-update/SKILL.md` with the automated `edit-file` dispatcher: for each automated step in a manifest entry, apply the edit to the `openspec/`-scoped file in the consumer repo without prompting (D2, D4)
- [ ] 4.2 Extend `claude/skills/qrspi-update/SKILL.md` with the manual step gate: for each manual step, surface it to the human via `AskUserQuestion` and hold the walk until the human confirms before advancing (D2, D4)
- [ ] 4.3 Extend `claude/skills/qrspi-update/SKILL.md` with the marker bump: after all steps for all intervening versions complete, write the target version to `openspec/.qrspi-version` (D1, D2)
- [ ] 4.4 Extend `claude/skills/qrspi-update/SKILL.md` with the stage + print-commit tail: stage all changed files (marker + any auto-edited `openspec/` files) and print a ready-to-run `git commit` command for the human (do not auto-commit) (D2, D5)
- [ ] 4.5 If any dispatch logic belongs in the command body, extend `claude/commands/update.md` accordingly (D3)
- [ ] 4.6 (human) Dev-install the branch in a scratch consumer repo. Write a `migrations/<next>.yaml` with one `automated` `edit-file` step (e.g. append a comment to `openspec/config.yaml`) and one `manual` step. Run `/qrspi:update`; confirm the automated edit is applied immediately, the manual step is gated via `AskUserQuestion`, the marker is bumped after confirmation, and `git status` shows both the marker and the edited file staged. Run the printed commit command; verify `git log` shows the expected commit.

## 5. Docs, release-gate, and parity

**Model:** sonnet — mechanical prose edits and a sync script run; no novel
logic, every target file follows a well-understood existing pattern in this
kit.

- [ ] 5.1 Update `README.md`: add `/qrspi:update` to the helpers line and add an "Updating your repo" note describing the update flow (D2)
- [ ] 5.2 Add an `[Unreleased]` CHANGELOG entry in `CHANGELOG.md` for the versioned-update-command change (D6)
- [ ] 5.3 Update `CONTRIBUTING.md` release checklist to include the manifest-entry step (`write migrations/<version>.yaml`) adjacent to the CHANGELOG roll step (D6)
- [ ] 5.4 Update `.claude/skills/qrspi-release/SKILL.md` preconditions to include a manifest-presence hard-stop: halt if `migrations/<version>.yaml` for the release version does not exist (D6)
- [ ] 5.5 Run `node sync-copilot.mjs` to regenerate `copilot/prompts/qrspi-update.prompt.md` (do not hand-edit `copilot/`) (D2)
- [ ] 5.6 Run `node scripts/lint.mjs` from the kit repo root; confirm exit 0 and that Check 4 passes for `/qrspi:update` (D6, D7)
- [ ] 5.7 Run `node sync-copilot.mjs --check` from the kit repo root; confirm exit 0 (no drift)
- [ ] 5.8 (human) Open `README.md` and confirm `/qrspi:update` appears in the helpers line. Open `CONTRIBUTING.md` and confirm the release checklist includes the manifest-entry step. Confirm `qrspi-release` skill halts on a missing manifest entry (manual review).
