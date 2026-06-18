# Design — kit-quality-hardening

> Stage D of QRSPI. Generated 2026-06-18.
> **Implementation is BLOCKED until a human approves this file.**

## Context

The QRSPI kit ships markdown (commands, agents, skills) plus generators and
install scripts for two consumers: Claude Code (a plugin) and GitHub Copilot
(files synced into `~/.copilot`). Its core invariant — "`copilot/` is generated
from `claude/`, never hand-edited, always in sync" — is enforced only by
convention. At v0.1.0 the repo has **no CI**, no `CONTRIBUTING.md`/`CHANGELOG.md`,
an OpenSpec version pin (`1.4.1`) copy-pasted across ~5 hand-maintained locations
(README still claims "two coupled places" and points at a stale `qrspi:init.md`
path), three structural blocks duplicated verbatim across the 8 stage commands +
7 agents, a `-Check` drift mode that **exits 0 even on drift** and silently misses
deleted files, and a redundant opsx surface (5 commands + 3 orphaned skills) that
no QRSPI stage actually calls. This change converts "correctness depends on a
human remembering" into mechanical guarantees and pays down the duplication. The
human has already answered the 9 product questions (PQ1–PQ9); this design folds
those settled answers into a coherent decision set and recommends a sequencing.

Desired end state: a `ubuntu-latest` GitHub Actions workflow gates drift +
lint; the pin is single-asserted by a lint (not single-sourced into a new file);
the choreography lives once in a skill that commands/agents reference; governance
docs exist; the opsx surface is gone and old installs self-heal; a reference
example doubles as docs and an `openspec validate` fixture.

## Goals / Non-Goals

**Goals**
- Mechanically enforce the `claude/ → copilot/` sync invariant in CI (drift gate that fails on drift **and** on deleted files).
- Port the generator from PowerShell to Node so CI needs no `pwsh` setup (PQ2).
- Catch version-pin drift via a CI lint and correct the README's false claim + stale path (PQ3).
- Remove duplication of the commit/handoff choreography and the skill-load preamble (PQ4).
- Add `CONTRIBUTING.md` + `CHANGELOG.md` and a documented version/pin-coupling rule (PQ6/PQ9).
- Delete the opsx command + orphaned-skill surface and make existing installs self-heal (PQ5/PQ6).
- Ship a hand-authored reference example that validates in CI (PQ7).
- Add a CI heading-level check keeping inline skeletons and `openspec-templates/` aligned (PQ8).
- Audit and tighten agent tool grants (finding #8).

**Non-Goals**
- Pester/unit tests of generator internals (`Rewrite-All`, `Map-Tools`) — drift check is the contract (finding #41).
- Branch-protection / `CODEOWNERS` rules — separate governance item (Q7 → backlog candidate).
- A multi-OS CI matrix — single `ubuntu-latest` runner (see D2, OQ6).
- Deprecation notices to downstream consumers of `opsx-*.prompt.md` (Q40); none known.
- Introducing a new `.openspec-version`/`VERSION` file — explicitly rejected (D3, D7).

## Decisions

### D1 — Port the generator to Node; keep the same transform contract (PQ2; findings #5, #1)
Chosen: rewrite `sync-copilot.ps1` as a Node script (e.g. `sync-copilot.mjs`), invoked
`node sync-copilot.mjs [--check]`. Drop the `pwsh` dependency and the `sync-copilot.sh`
wrapper. Rejected: keep PowerShell + `actions/setup-pwsh` (adds a CI setup step for a
dependency the kit otherwise doesn't need); port to bash (text-munging fidelity is worse
than Node, and Node is already a hard dep via `npx @fission-ai/openspec`). The port carries
over **all** robustness items the questions raised as Node requirements, not `.ps1` edits:
- **Non-zero exit on drift** (Q4) — `--check` must `process.exit(1)` when any file differs. This is the gate's whole point.
- **Deleted-file detection** (Q20 / research open-gap) — compare the *union* of committed `copilot/` and freshly-generated trees, so a file present in `copilot/` but no longer generated is flagged as drift (the current `.ps1` iterates only the generated tree and misses this).
- **Source guard** (Q16) — validate `claude/agents`, `claude/commands`, `claude/skills` exist and are non-empty *before* wiping the output dir; abort with a clear message otherwise.
- **Temp-dir cleanup** (Q17) — wrap `--check` generation in try/finally so a mid-run error still removes the scratch dir.
- **Missing-`SKILL.md` warning** (Q18) — warn to stderr and increment a counter that makes the run exit non-zero after finishing (CI catches a malformed skill dir) rather than silently skipping.
- **Per-line diff** (Q19) — show which lines differ (Node has no portability constraint here; a line diff is fine).
Open implementation detail (OQ2): ship committed JS, or a build step? — recommend **committed `.mjs`, no build/transpile**, to keep "clone and run" parity with the script it replaces.

### D2 — Single CI workflow on `ubuntu-latest`, parallel jobs (findings #1, #6; Q1/Q2/Q3/Q6/Q42)
Chosen: one `.github/workflows/ci.yml` triggered on `pull_request` → `main` **and** `push` → `main`
(catches post-merge drift), plus `workflow_dispatch`. Runner: `ubuntu-latest` only (no matrix —
the Node generator is OS-portable and a matrix triples cost for no proven benefit; OQ6 flags this
for the human). Jobs run in parallel: (1) **drift** — `node sync-copilot.mjs --check`; (2) **lint** —
pin lint (D3) + frontmatter/name lint + heading-level check (D8); (3) **validate** — `openspec validate`
on the reference example (D6). Rejected: a single sequential job (a lint failure would mask a drift
failure). The frontmatter/name lint scope is the union proposed in Q5 (agents have `name`/`description`;
commands have `description`; skills have `name`/`description`; every `agent:` reference resolves; `model:`
uses aliases; every `Load skill X` name resolves).

### D3 — Pin drift = CI lint, not a single-source file (PQ3; finding #2)
Chosen: a lint that collects every **real** `1.4.1` occurrence and fails if any disagree, then
fix the README's false "two coupled places" claim and its stale `claude/commands/qrspi:init.md`
path (now `claude/commands/init.md`). The lint **excludes** the auto-managed `generatedBy:` lines
in the OpenSpec-generated skills (those are CLI output, bumped by regeneration, not hand-edited).
Rejected: a `.openspec-version`/`plugin.json` key that scripts read (PQ3 option c) — most pin sites
are prose/`npx` invocations a constant can't substitute into without a templating pass the kit
deliberately avoids; the lint gives the same drift-safety with zero new indirection. The README's
"bump the pin" procedure is rewritten to Node (no `pwsh`) and to the corrected path, and the
authoritative location list is made accurate (init.md ×5, README, config.yaml, settings.local.json ×3).

### D4 — DRY the choreography into `qrspi-workflow`, reference + thin inline stub (PQ4; findings #3, #7)
Chosen: move the **canonical descriptions** of the three repeated blocks — (a) the commit step, (b)
the next-stage handoff, (c) the Glob precondition pattern — into the existing `qrspi-workflow` skill
(not a new skill; these are workflow mechanics and belong with the workflow definition). Each stage
command keeps a **thin inline stub** that names its own artifact filename, commit message, and
next-stage command, then references the skill for the canonical procedure. Rationale for *not* fully
collapsing to a reference: **Claude command files have no runtime include** (PQ4's stated constraint),
and the per-stage specifics (filename, commit message, next command) genuinely differ — so the
variable part stays inline and the invariant procedure moves to the skill. The backlog-atomicity
reminder (Q12) also moves to the skill. This is DRY-at-the-source for the *invariant* text while
keeping each command independently readable for its *variable* parts. Copilot generation is unaffected:
the generator already rewrites skill-load verbs, so the stubs survive the transform.

### D5 — Skill-load preamble: keep inline, lint-enforced (PQ4; finding #4)
Chosen: keep the "Load skills …" line inline in each agent (it is one line and differs per agent —
e.g. the architect/planner add `vertical-slice`, the implementer drops `openspec-workflow`), but add
it to the **frontmatter/name lint** (D2) so every referenced skill name must resolve to a real
`claude/skills/<x>/SKILL.md`. Rejected: a `qrspi-bootstrap` skill that loads the others (PQ4 option a)
— it adds an indirection layer to save one line per agent and would still need a per-agent exception
mechanism for the researcher's "do NOT open questions.md" rule (Q15) and the per-agent skill variation.
The duplication here is shallow and self-documenting; the lint converts the convention into a check.

### D6 — Reference example: hand-authored full-artifact change as an active fixture (PQ7; finding #9)
Chosen: a fictional minimal change `example-greeting` hand-authored under
`openspec/changes/example-greeting/` with the **full** artifact set
(questions/research/design/proposal/specs/tasks/worktree) so it serves as end-to-end documentation,
and a valid `proposal.md` + `specs/<cap>/spec.md` so `openspec validate example-greeting` exercises it as a CI fixture.
**Amended during implementation (slice 5):** the original plan placed it under
`openspec/changes/archive/YYYY-MM-DD-add-greeting/`, but `openspec validate <id>` (CLI v1.4.1)
only resolves *active* changes — archived changes are not addressable by id and `--all` skips them,
so an archived example could never be the validate fixture OQ3 intends. The example therefore lives
in the active `openspec/changes/` set under a clearly non-dated, fixture-named folder
(`example-greeting`). Accepted tradeoff: it shows permanently in `openspec list`; documented in
`CONTRIBUTING.md` as an intentional fixture. OQ3 resolved: validate DOES run in CI, via
`npx @fission-ai/openspec@<pin> validate example-greeting`.

### D7 — Governance docs + the version↔pin coupling rule (PQ6, PQ9; finding #6)
Chosen: add a new `CONTRIBUTING.md` (semver discipline for `plugin.json`, the sync workflow, the
version-bump checklist, the pin-bump procedure) and a `CHANGELOG.md` in Keep-a-Changelog format
(`## [Unreleased]`, `## [0.1.0]`). `CLAUDE.md` stays Claude-specific (PQ9). `plugin.json version`
remains the single kit-version authority — no separate `VERSION` file (Q25). The coupling rule
(Q24): an OpenSpec pin bump is a kit change, so it requires a `plugin.json` bump — minor if the CLI
minor moved, patch for a patch; a plugin bump does **not** force a pin reassessment. Exact
patch/minor/major mapping for other change types (Q22) is left to the human (OQ1).

### D8 — Keep both skeleton copies; CI heading-level check (PQ8; finding #10)
Chosen: agents keep inline skeletons (needed for self-contained subagents) and `openspec-templates/`
stays the canonical human reference; CI adds a check that the canonical section **headings** appear in
both places (not a full fenced-block diff — heading-level is robust to prose drift and matches PQ8).
The README line "canonical templates live in `openspec-templates/`" stays accurate (templates are kept).

### D9 — Delete the opsx surface; self-heal old installs (PQ5, PQ6; finding #11)
Chosen: delete the 5 opsx **commands** (`opsx/{propose,explore,apply,archive,sync}.md`) and the 3
orphaned **skills** (`openspec-{propose,explore,apply-change}`); keep the 3 load-bearing skills
(`openspec-{workflow,archive-change,sync-specs}`) — QRSPI's `/qrspi:archive` and the architect call
those *skills* directly, never the opsx *commands*. Clean the generator's stale `$hintFor`/`$agentFor`
opsx entries (delete, not comment out — Q38). Update README/init.md prose and the `plugin.json`
description (drops the "opsx-* OpenSpec helpers" claim). Self-healing (PQ6): add a **sweep** of the
now-deleted `~/.copilot/prompts/opsx-*.prompt.md` and `~/.copilot/instructions/openspec-{propose,explore,apply-change}.instructions.md`
to `install.ps1`/`install.sh` (the install scripts currently only *copy*, never delete, so stale files
would linger), and document the migration in `CHANGELOG.md`. The Claude plugin self-cleans on
`marketplace update` (plugin dir replaced wholesale). OQ5 flags confirming the exact generated
filenames the sweep must target.

### D10 — Tighten agent tool grants in this change (finding #8; Q28/Q29)
Chosen: produce a minimal-tools table and **apply** it (edit frontmatter) in this change rather than
deferring (Q28 option a). From research: drop `Edit` from `qrspi-researcher`, `qrspi-questioner`,
`qrspi-planner` (they Write fresh artifacts, never Edit). The `Agent` grant on designer/architect/
implementer is **kept** — the bodies describe human-directed ad-hoc expert-subagent delegation that
isn't scripted but is intended (research could not rule it out). Removing `Edit` also drops the
Copilot-side `edit/editFiles` grant via `Map-Tools` (Q29) — that is the desired least-privilege outcome
and the drift check will confirm it propagates.

## Data model changes
Not applicable — the kit ships markdown + scripts, no data store (per questions.md).

## API surface
The kit's "API" is its command/agent/skill set. Changes: **removed** 5 `/opsx:*` commands + 3
`openspec-*` skills (D9); **modified** generator interface (`node sync-copilot.mjs [--check]` replaces
the `.ps1`/`.sh` pair, D1); agent tool-grant frontmatter tightened (D10). No new commands.

## UI surface
Not applicable — no UI (per questions.md). The CLI/prompt surface is covered under API surface.

## Authorization
Not applicable — no auth layer (per questions.md). Repo governance (branch protection / CODEOWNERS)
is explicitly a Non-Goal / backlog candidate.

## Vertical slices (preview)
Slices are cut so each ends in something demoably green. Preview only — stage S details them.
- **Slice A — Node generator + green drift gate:** port to `sync-copilot.mjs` (with exit-on-drift, deleted-file detection, source guard, cleanup, skill warning), regenerate `copilot/`, add the CI workflow's drift job. Demoable: CI fails on an intentional drift, passes when synced.
- **Slice B — opsx removal, end to end:** delete commands + orphaned skills, clean generator tables, regenerate, add the install-script self-heal sweep, update prose + plugin.json. Demoable: fresh sync produces no opsx artifacts; re-install removes stale ones.
- **Slice C — pin lint + frontmatter/name/heading lints:** add the lint job and fix README claim/path. Demoable: CI fails on an introduced pin mismatch / dangling skill reference.
- **Slice D — choreography DRY + tool-grant audit:** move canonical blocks into `qrspi-workflow`, thin the command stubs, tighten agent frontmatter, regenerate. Demoable: stage commands still drive the full commit/handoff flow.
- **Slice E — reference example + validate gate + governance docs:** author the archived example, wire `openspec validate` in CI, add CONTRIBUTING/CHANGELOG. Demoable: `openspec validate` passes on the fixture; docs render.

## Risks / Trade-offs
- **Generator-port regressions.** A Node rewrite can subtly change the rewrite output, dirtying `copilot/` in ways unrelated to intent. Mitigation: regenerate and diff against the current PowerShell output before committing; the diff *is* the review surface. The drift gate then locks it.
- **`openspec validate` in CI needs the CLI in the runner.** If the runner can't resolve `openspec` (it's called bare today, not via `npx`), the validate job fails for the wrong reason. Watch-item (OQ3): pin the validate invocation to `npx @fission-ai/openspec@<pin>` in CI; falls back to a documented local check if CI resolution is unreliable.
- **Pin lint false positives.** Counting "real" `1.4.1` occurrences while excluding `generatedBy:` lines is a heuristic; a new legitimate prose mention could trip it. Mitigation: lint asserts *agreement*, not a fixed count, so any agreeing occurrence passes.
- **Single-runner blind spot.** `ubuntu-latest` only won't catch a Windows-path bug in the Node generator. Accepted (OQ6) — the generator does its own path normalization and the kit's Windows users run the same Node.
- **DRY-via-skill reach limit.** Because Claude commands have no runtime include, the skill holds the *procedure* but each command still inlines its variable parts (D4); a contributor could still drift the stub wording. The frontmatter lint doesn't cover prose, so this stays partly convention — documented in CONTRIBUTING.

## Sequencing recommendation (PQ1)
**Recommend: keep ONE change folder, ship as ONE PR, but land it as the ordered slices A–E above.**
Rationale: the findings are tightly coupled around two hubs — the **generator** (D1 underpins the
drift gate, the opsx removal's regeneration, the tool-grant propagation, and the choreography
regeneration) and the **CI workflow** (D2 hosts the drift, lint, and validate gates). Splitting into
separate PRs would force the generator port to merge first and every other PR to rebase on it, with
CI half-wired in between (a drift gate with no exit code, a lint job referencing files a later PR
deletes — exactly the hazards Q44 flags). The hard-dependency chain is: A (generator + exit code)
→ everything; B (opsx delete) before C (lint, so the lint doesn't cover about-to-be-deleted files);
E (example) is independent and can land any time. One PR reviewed slice-by-slice respects that chain
without rebase churn. If the human prefers smaller PRs, the only clean cut is **{A+B} then {C+D+E}**
— never separate the generator port from its consumers.

## Open questions for the human
- [x] **OQ1 — semver mapping (Q22).** Exact patch/minor/major rules for `plugin.json`: which change type (script bug fix, prompt-text fix, new stage command, breaking artifact-format change) triggers which bump? D7 sets the pin-coupling rule but leaves the general table to you.
  **Answer: 0.x (pre-1.0) convention. Breaking changes (artifact-format change, command removal like opsx) AND new features both bump the minor (0.X.0); fixes/prompt-text/docs bump patch (0.0.X). Defer 1.0.0 until the kit is declared stable. This change (opsx removal + generator-interface change) is therefore a MINOR bump → 0.2.0.**
- [x] **OQ2 — generator delivery.** Committed `.mjs` (recommended, "clone and run") vs. a build/transpile step? Affects whether a `package.json`/build script enters the repo.
  **Answer: Committed `.mjs`, no build/transpile step. Keep "clone and run with node" parity; no package.json build script enters the repo.**
- [x] **OQ3 — `openspec validate` in CI.** Run the validate gate in CI (needs the CLI in the runner — pin it via `npx @fission-ai/openspec@<pin>`) or keep it a documented local check only?
  **Answer: Yes — run validate in CI via `npx @fission-ai/openspec@<pin> validate` against the reference example.**
- [x] **OQ4 — deleted-file detection approach.** Confirm the union-of-trees comparison (D1) is the intended mechanism, vs. a manifest/lockfile of expected outputs.
  **Answer: Union-of-trees comparison (compare the union of committed `copilot/` and the freshly-generated tree). No manifest file.**
- [x] **OQ5 — install-script sweep targets.** Confirm the exact generated filenames the `install.*` self-heal sweep must remove (`opsx-{propose,explore,apply,archive,sync}.prompt.md` + `openspec-{propose,explore,apply-change}.instructions.md`).
  **Answer: Confirmed — all 8 files (5 `opsx-*.prompt.md` + 3 `openspec-{propose,explore,apply-change}.instructions.md`), verified to currently exist in `copilot/`. Sweep the explicit list.**
- [x] **OQ6 — CI OS matrix.** Accept `ubuntu-latest`-only (recommended), or require a windows/macos matrix to prove the Node generator's path handling?
  **Answer: `ubuntu-latest` only — no OS matrix.**
