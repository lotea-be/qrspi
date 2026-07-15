# Slices — versioned-update-command

> Stage V of QRSPI. Generated 2026-07-15.
> Vertical slices, not horizontal layers.

## Overview

This change is a pure kit-tooling change: no DB, no browser UI. "Vertical"
here means each slice delivers a working, end-to-end-demoable increment of the
versioning mechanism. The natural demoable path is: (1) marker written at init
→ (2) manifest schema + lint gate pass and fail correctly → (3) update skill
reads the marker and walks the manifest in the right order → (4) automated and
manual dispatch works end-to-end → (5) docs/parity artefacts are complete and
drift-clean.

Slices 1–2 are self-contained setup pieces (marker write, manifest + lint) that
do not depend on each other and can be implemented independently, but slice 3–4
depend on both. Slice 5 is the docs/parity pass that must come last to capture
the final command surface.

The design's "Vertical slices (preview)" treated slices 3 and 4 as potentially
mergeable — after reviewing the specs they are kept separate: the walk read-path
(slice 3) has a clear demoable checkpoint (step-by-step plan output with no edits
applied) and the hybrid-apply write-path (slice 4) adds the edit + gate
behaviour. Keeping them separate gives a clean revert point if the dispatcher
logic needs rework.

Because the kit has no test harness (D7) the "T" bullet in each slice describes
lint-based and dogfood-based verification rather than automated test files.

Dev-install note (applies to every checkpoint below): the installed
`/qrspi:update` command runs the *released* plugin, not your branch. To test
your branch, dev-install via `claude --plugin-dir /workspaces/git/qrspi` in the
target consumer repo, then `/reload-plugins` to pick up subsequent edits.

## Slices

### Slice 1 — Marker lifecycle at init

The marker file `openspec/.qrspi-version` is created during `/qrspi:init` and
committed in the same `git add openspec/` commit as `openspec/config.yaml`. At
the end of this slice a human can run `/qrspi:init` on a fresh test repo and
verify that `openspec/.qrspi-version` exists, contains a bare SemVer string (no
`v` prefix, no YAML key), and is committed together with the rest of the
`openspec/` skeleton. The init `re-run` path (already-initialized repo) is left
as a stage-I implementation decision (design D1 note).

- M: no mock service stub needed — `init.md` is an existing command with a
  settled write path; the marker-write step is a single `Write` call appended
  after the `openspec/config.yaml` write, pattern mirrors the existing sentinel
  step.
- F: update `claude/commands/init.md` with the new marker-write step (after the
  `config.yaml` sentinel, before the `git add openspec/` commit step).
- D: no data-store entity; the marker file IS the persistent artefact
  (`openspec/.qrspi-version`, one line, bare SemVer).
- T: lint check (added in slice 2) validates marker SemVer format. Manual
  dogfood: init a fresh test repo, confirm file content matches kit version and
  is in the same commit as `openspec/config.yaml`.
- **Model:** sonnet — mechanical appending of a known write step to an existing
  command file; no novel logic, mirrors the existing `openspec/config.yaml`
  sentinel write.
- Checkpoint: dev-install the branch in a scratch repo, run `/qrspi:init`,
  confirm `openspec/.qrspi-version` contains the bare SemVer of the installed
  kit (e.g. `0.6.0`), and that `git log --name-only -1` shows it committed
  alongside `openspec/config.yaml`.

### Slice 2 — Migration manifest schema + lint gate

The `migrations/` directory ships in the kit with `migrations/0.6.0.yaml`
(the stub for the release shipping this feature, with empty `automated` and
`manual` lists). The `scripts/lint.mjs` migration check is in place: it
asserts every `## [X.Y.Z]` CHANGELOG section has a `migrations/<version>.yaml`,
validates schema well-formedness (`version`, `summary`, `automated`, `manual`
keys; `automated[].action` must be `edit-file` only; `automated[].path` must
start with `openspec/`), and validates the marker SemVer format where the file
exists. At the end of this slice a human can run `node scripts/lint.mjs` on the
kit repo and watch it pass; they can then temporarily delete `migrations/0.6.0.yaml`
and watch it fail with the missing-entry error.

- M: no mock — the lint check reads real files from the start; the stub YAML
  provides the test fixture in-tree.
- F: (a) create `migrations/0.6.0.yaml` (stub); (b) add a new check function
  in `scripts/lint.mjs` following the existing dependency-free ESM pattern
  (async function, errors pushed to `errors[]`, labelled
  `process.stdout.write` call in `main()`).
- D: no data-store; `migrations/` directory + the stub YAML are the
  persistent artefacts added to the kit repo.
- T: run `node scripts/lint.mjs` on the kit branch and confirm exit 0. Then
  rename `migrations/0.6.0.yaml` to `.bak` and confirm exit non-zero with the
  presence-check error. Also add a temp `migrations/bad.yaml` with
  `action: run-command` to confirm the schema check fires.
- **Model:** sonnet — the lint check is structured, follows an existing pattern
  in `scripts/lint.mjs` (dependency-free ESM, errors array, labelled stdout
  lines), and the YAML schema is fully settled in the specs.
- Checkpoint: from the kit repo root, run `node scripts/lint.mjs`; exit 0.
  Temporarily remove `migrations/0.6.0.yaml`; rerun; confirm non-zero exit and
  a clear "missing manifest entry" error line. Restore the file; confirm exit 0
  again.

### Slice 3 — /qrspi:update walk read-path (plan, no edits)

The `/qrspi:update` command and its backing skill `claude/skills/qrspi-update/SKILL.md`
are in place. The command reads `openspec/.qrspi-version`, resolves the target
version (auto-detect primary + explicit `<target-version>` arg fallback per OQ1
as a stage-I watch-item), and walks every `migrations/<v>.yaml` for
`A < v ≤ B` in ascending SemVer order, printing the plan (summary + step count
per version) without applying any edits. Edge cases (already up-to-date, no
marker, downgrade) are handled with the guarded defaults from D5. At the end
of this slice a human can point the command at a consumer repo whose marker is
one or more versions behind the kit and see the ordered per-version plan printed
to the terminal, with no files changed.

- M: no mock service stub; the command reads real `migrations/*.yaml` files and
  the real `openspec/.qrspi-version` marker; a two-version-behind test repo is
  the fixture.
- F: (a) write `claude/commands/update.md` (main-loop, no `agent:` frontmatter,
  loads the skill, handles arg parsing and auto-detect fallback); (b) write
  `claude/skills/qrspi-update/SKILL.md` (schema contract, SemVer-ordered walk
  algorithm, edge-case handling — plan-only output for this slice).
- D: no data-store; the skill and command files are the durable artefacts.
- T: dogfood: create a scratch consumer repo with marker `0.6.0` and two
  manifest stubs at `0.7.0` and `0.8.0` in the kit; invoke
  `/qrspi:update 0.8.0`; confirm the terminal prints the ordered plan for
  0.7.0 then 0.8.0 with no file writes. Also test the three edge cases: marker
  == target prints "already up to date"; absent marker triggers the offer-to-init
  AskUserQuestion; marker > target prints the downgrade hard-stop.
- **Model:** opus — the walk algorithm has non-obvious SemVer ordering, the
  no-marker / downgrade branching must be correct under edge inputs, and OQ1's
  auto-detect vs. fallback branching introduces conditional logic that is
  first-of-kind in this kit; deep reasoning materially reduces the risk of
  a subtle mis-ordering or missed edge-case.
- Checkpoint: dev-install the branch in a scratch consumer repo with marker set
  to a version behind the kit. Run `/qrspi:update` (no arg, auto-detect path)
  and confirm the terminal shows the per-version plan in ascending SemVer order.
  Run `/qrspi:update <explicit-target>` and confirm same output. Verify no files
  were modified (`git status` clean except for any pre-existing state).

### Slice 4 — Hybrid apply + marker bump

The walk from slice 3 now applies each step. Automated `edit-file` steps are
applied without prompting; manual steps are surfaced via `AskUserQuestion` and
the walk holds until the human confirms. After all steps for all intervening
versions complete, `openspec/.qrspi-version` is updated to the target version,
all changed files (marker + any auto-edited `openspec/` files) are staged, and
the command prints a ready-to-run `git commit` command for the human. At the
end of this slice a human can run `/qrspi:update` on a repo with a real
migration entry containing both `automated` and `manual` steps and see the full
end-to-end flow, ending with staged changes and a printed commit command.

- M: no mock — the apply logic writes directly to the consumer repo's
  `openspec/` files and the marker.
- F: extend `claude/skills/qrspi-update/SKILL.md` with the apply dispatcher
  (automated `edit-file` executor + manual `AskUserQuestion` gate), the marker
  bump, and the stage + print-commit-command tail. Extend
  `claude/commands/update.md` if the dispatch belongs there.
- D: the marker file `openspec/.qrspi-version` and any `openspec/`-scoped files
  named in `automated` steps are the artefacts modified in the consumer repo.
- T: dogfood: write a `migrations/<next>.yaml` with one `automated` edit-file
  step (e.g. append a comment to `openspec/config.yaml`) and one `manual` step.
  Run `/qrspi:update`; confirm the automated edit is applied immediately, the
  manual step is gated via AskUserQuestion, the marker is bumped after
  confirmation, and `git status` shows both the marker and the edited file
  staged. Run the printed commit command and confirm a clean commit.
- **Model:** sonnet — the apply dispatcher follows a mechanical pattern (iterate
  steps, branch on `action == edit-file`, call `AskUserQuestion` for manual);
  the walk ordering was settled in slice 3 (opus). The git stage + print-commit
  tail mirrors the existing pattern used in QRSPI's own commit step.
- Checkpoint: dev-install the branch in a scratch consumer repo. Ensure the
  repo has a manifest entry with both step types. Run `/qrspi:update`; watch
  the automated step fire silently and the manual step pause. Confirm after the
  manual step that `openspec/.qrspi-version` holds the new version, `git status`
  shows staged changes, and the printed `git commit` command includes both the
  marker and the auto-edited file. Run the command; verify `git log` shows the
  expected commit.

### Slice 5 — Docs, release-gate, and parity

All prose and tooling parity work is complete: README is updated (helpers line
entry for `/qrspi:update` + "Updating your repo" note), CHANGELOG `[Unreleased]`
carries the entry, CONTRIBUTING.md release checklist includes the manifest-entry
step, `.claude/skills/qrspi-release/SKILL.md` adds the manifest-presence
precondition hard-stop, and `node sync-copilot.mjs` has been run to regenerate
`copilot/prompts/qrspi-update.prompt.md`. At the end of this slice `node
scripts/lint.mjs` and `node sync-copilot.mjs --check` both exit 0 on the kit
branch.

- M: no mock — every artefact in this slice is a prose or config edit.
- F: (a) update `README.md` (helpers line + "Updating your repo" note);
  (b) add `[Unreleased]` entry in `CHANGELOG.md`; (c) update `CONTRIBUTING.md`
  release checklist with the manifest-entry step alongside the CHANGELOG roll
  step; (d) update `.claude/skills/qrspi-release/SKILL.md` preconditions to
  include manifest-presence hard-stop; (e) run `node sync-copilot.mjs` to
  generate `copilot/prompts/qrspi-update.prompt.md` (never hand-edit
  `copilot/`).
- D: no data-store changes.
- T: run `node scripts/lint.mjs` — exit 0 (Check 4 finds `/qrspi:update`
  documented and resolving, new manifest-presence check passes). Run `node
  sync-copilot.mjs --check` — exit 0 (no drift). Manual review: confirm
  CONTRIBUTING release checklist lists the manifest-entry step adjacent to the
  CHANGELOG roll step; confirm `qrspi-release` skill halts on a missing
  manifest entry.
- **Model:** sonnet — mechanical prose edits and a sync script run; no novel
  logic, every target file follows a well-understood existing pattern in this
  kit.
- Checkpoint: from the kit repo root, run `node scripts/lint.mjs`; confirm exit
  0 and that Check 4 passes for `/qrspi:update`. Run `node sync-copilot.mjs
  --check`; confirm exit 0. Open `README.md` and confirm `/qrspi:update` appears
  in the helpers line. Open `CONTRIBUTING.md` and confirm the release checklist
  includes the manifest-entry step.
