# Design — versioned-update-command

> Stage D of QRSPI. Generated 2026-07-15.
> **Implementation is BLOCKED until a human approves this file.**

## Context

Today the QRSPI kit ships as a Claude Code plugin whose only version carrier is
`.claude-plugin/plugin.json` `version` (currently `0.5.0`). That string is
**never written into a consuming repo**. A consumer who runs `/qrspi:init` gets
`openspec/config.yaml` (schema + the OpenSpec CLI pin `openspec_version: 1.4.1`,
a *different* pin) but nothing recording which kit version their `openspec/`
layout and workflow assumptions correspond to. When the kit changes behaviour —
e.g. the sibling `tighten-stage-read-boundaries` change narrows which files a
stage agent may read — a consumer has no signal that they need to adapt, and no
tool to walk them through the adaptation. Updating the plugin (`plugin
marketplace update` → `plugin install`) refreshes the *code*, but performs no
per-repo migration.

The desired end state: every QRSPI-initialized repo carries a one-line version
marker; a new `/qrspi:update` command reads it, walks each intervening version's
migration entry from a kit-side manifest, auto-applies mechanical steps and
gates judgment steps, then bumps the marker; and cutting any release requires a
manifest entry (CI-enforced). This change delivers **only that mechanism** —
the marker, the command + skill, the manifest format, and the release/CI gate.
It implements **no read-boundary behaviour**; that change writes its own
manifest entry in its own PR.

## Goals / Non-Goals

**Goals:**
- Add an `openspec/.qrspi-version` marker (one-line plain text) to consuming
  repos, written at `/qrspi:init` and bumped on `/qrspi:update` completion.
- Ship `/qrspi:update` (a shipped command) + a backing shipped skill that reads
  the marker, walks intervening versions step-by-step, hybrid-applies each
  entry (mechanical auto, judgment gated), and bumps the marker.
- Define the `migrations/<version>.yaml` manifest schema (kit-side, structured
  `automated` vs `manual` steps), starting at the version that ships this
  feature; a "no consumer action" stub is valid.
- Gate every release on manifest-entry presence via CI/lint.
- Keep `sync-copilot.mjs`, README, CHANGELOG, and CONTRIBUTING current with the
  new command/skill and release step.

**Non-Goals:**
- The read-boundary behaviour itself (`tighten-stage-read-boundaries`).
- Retroactive manifest entries for 0.1.0–0.5.0 (PQ6: none).
- Reverse/downgrade migrations (design defaults to hard-stop; see D5).
- A Copilot-specific interactive update mechanism (`reassess-copilot-port`);
  the shipped command still regenerates a Copilot prompt for zero-drift.
- A general test harness for the kit (none exists today; see D7 / OQ6).

## Decisions

### D1 — Marker file: content, format, write/read points (PQ1, PQ2, Q2, Q3, Q25)
**Chosen:** `openspec/.qrspi-version`, a single line holding the bare SemVer
string from `plugin.json` `version` (e.g. `0.5.0`) — no `v` prefix, no YAML, no
trailing key. Written by `/qrspi:init` (new step, after the `config.yaml`
sentinel write) and re-bumped by `/qrspi:update` on successful completion.
**Rejected:** a `qrspi_version:` field in `config.yaml` (couples a
runtime-mutable value to the is-initialized sentinel, risking the Glob check);
storing the marketplace tag ref `vX.Y.Z` (the tag can be cut mid-PR and is not
the source of truth — `plugin.json` `version` is). **Why:** a dedicated
plain-text file is Glob-readable, single-purpose, trivially diffable, and
decoupled from OpenSpec-owned config. The bare SemVer form matches
`plugin.json` exactly so string comparison against a target is direct.

### D2 — `/qrspi:update` is a shipped hybrid command + shipped skill (PQ2, Q17, Q18)
**Chosen:** `claude/commands/update.md` (ships to consumers, generates a
Copilot prompt via `sync-copilot.mjs`) delegating manifest-reading + walk logic
to a shipped skill `claude/skills/qrspi-update/SKILL.md`. The command runs the
**hybrid** model: it auto-applies each entry's `automated` steps (deterministic
file edits + the marker bump) and surfaces each `manual` step to the human for
confirmation before advancing. **Rejected:** inlining all logic in the command
body (the walk algorithm + schema contract is too long — a skill is the right
home); a `.claude/`-scoped dev-tooling command (consumers need this, so it must
ship); a strictly report-only command (PQ2 chose hybrid). **Why:** matches
QRSPI's "mechanical auto, judgment gated" ethos and the D-stage precedent that
mechanical steps auto-advance while judgment steps pause.

### D3 — `/qrspi:update` is a main-loop stage-style command, not subagent-routed (Q16, lint Check 5)
**Chosen:** `update.md` carries **no `agent:` frontmatter** — it runs on the
main-loop orchestrator, because the hybrid model needs `AskUserQuestion` for the
per-manual-step gates, and that tool is main-loop-only. It may issue Write/Edit
against the consuming repo's `openspec/` files as part of auto steps.
**Rejected:** routing to a subagent (would trap the gate — the exact violation
lint Check 5 exists to catch). **Why:** the interactive gate requirement forces
main-loop residence; this mirrors every other gate-bearing stage command.
*Watch-item:* whatever files the manifest's `automated` steps may edit must be
scoped narrowly (see D4) — this command is edit-capable in the consumer repo,
which is broader than the read-only Research stage.

### D4 — Manifest schema: `migrations/<version>.yaml`, `automated` vs `manual` (PQ3, PQ4, PQ5, Q11)
**Chosen:** a kit-side top-level `migrations/` directory, one YAML file per
release version, named by the bare version (`migrations/0.6.0.yaml`). Proposed
minimal schema (exact shape is OQ3):
```yaml
version: 0.6.0
summary: One-line human description of what consumers must adapt.
automated:            # steps the command applies itself (may be empty)
  - description: Human-readable label shown before/after applying.
    action: edit-file  # CLOSED vocabulary — `edit-file` ONLY (per OQ3)
    path: openspec/...  # openspec/-scoped path only
    # + deterministic edit fields (find/replace, insert, …)
manual:               # steps surfaced for human confirmation (may be empty)
  - description: What the human must review/do (incl. anything needing a shell
      command — shell steps are NEVER automated, per OQ3).
```
A "no consumer action" stub is a valid file with empty `automated`/`manual`
lists and a `summary`. The walk is **step-by-step** (PQ4): for a consumer on
`A` moving to `B`, apply each `migrations/<v>.yaml` for `A < v ≤ B` in ascending
SemVer order, preserving intermediate ordering. **Automated action vocabulary is
`edit-file` only, `openspec/`-scoped (OQ3)** — no shell execution as an automated
step; command-requiring steps are authored as `manual`. **Rejected:** prose-only
markdown per version (not machine-distinguishable, so the hybrid split is
impossible); extending `CHANGELOG.md` with a `### Migration` subsection (couples
release notes to a machine format and leaves empty subsections everywhere given
the every-release stub rule); embedding the manifest in the skill body (a data
table that grows unbounded and can't be authored per-release-PR cleanly).
**Why:** structured per-version YAML is exactly what the hybrid command needs to
know what it may auto-apply vs. surface, and one-file-per-version makes each
release PR's manifest addition an isolated, reviewable diff.

### D5 — Edge cases: up-to-date, no-marker, downgrade (Q5, Q6, Q7)
**Chosen defaults (each also a human-confirmable OQ — see OQ2):**
- **Marker == current target:** report "already up to date", walk nothing, exit.
- **No marker present** (every pre-this-feature repo): do **not** silently
  assume `0.0.0` and replay everything (PQ6 means there are no retroactive
  entries anyway, so a `0.0.0` walk would find nothing and give false comfort).
  Default: detect the missing marker, tell the human no marker exists, and offer
  to **initialize it to the current target version** (assume up-to-date), or let
  them supply their actual current version. This avoids destructive replays and
  gives a clean bootstrap for existing repos.
- **Marker > target (downgrade):** hard-stop and warn; do **not** silently skip
  and do **not** attempt reverse migrations (reverse steps are a Non-Goal).
**Rejected:** treating no-marker as `0.0.0` and walking from the start
(misleading given no retroactive entries); silent downgrade skip (hides a real
inconsistency). **Why:** the guarded/hard-stop defaults prevent silent data loss
and surface anomalies for a human, consistent with QRSPI's hard-stop discipline.

### D6 — Every release ships a manifest entry, CI-enforced (PQ5, Q12, Q13, Q20, Q21)
**Chosen:** a manifest entry is **required for every release without
exception** (a patch with no consumer impact ships a stub). Enforcement is a
**mechanical presence check** — the version being released must have a
`migrations/<version>.yaml`. Placement is **settled (OQ4): a new `scripts/lint.mjs`
check** so it runs on every PR (not only on a tag push), catching a missing entry
before the release rather than at tag time — with `release.yml` continuing to run
lint (so the gate also fires at tag push). The same lint check also validates
schema well-formedness + marker SemVer shape (OQ6, see D7).
The `qrspi-release` dev-tooling skill and CONTRIBUTING's version-bump checklist
gain a "write the migration entry" precondition/step. **Rejected:** entries only
for consumer-impacting versions (requires a relevance judgment the gate would
have to make — a stub for all is simpler and mechanical); post-release authoring
(a consumer who upgrades first gets an incomplete walk); convention-only, no CI.
**Why:** a presence-only gate needs no judgment, mirrors the existing
CHANGELOG-section assertion, and makes the manifest trustworthy for the walk.

### D7 — Verification bar: dogfood + presence lint, no new test harness (Q27, Q28, Q29, Q33)
**Chosen:** the kit has no test runner and this change does not introduce one.
The walk logic is verified by (a) the manifest-presence lint check (D6) and (b)
a manual dogfood walk (simulate a marker several versions behind and observe the
step-by-step output). **An additional lint check validating marker SemVer format +
`migrations/*.yaml` schema well-formedness (required keys, `edit-file`-only
`action`, `openspec/`-scoped paths) IS in scope (settled OQ6)** — folded into the
same `scripts/lint.mjs` check as the presence gate. The walk logic stays in the
skill markdown, not a `scripts/` helper. **Rejected:** a `scripts/test-update-
walk.mjs` unit harness (over-engineered for pre-1.0; no harness exists to hang
it on); extracting the walk to a Node script per `standardize-recurring-ops-
scripts` (that backlog item is separable — keep the logic in the skill for now).
**Why:** matches the kit's current verification bar (CI = drift + lint +
validate, plus code review and manual dogfood).

## Manifest & marker (data shape)

- **Marker (consumer repo):** `openspec/.qrspi-version` — one line, bare SemVer,
  no newline-trailing key. Committed by `/qrspi:init` in the same `git add
  openspec/` commit; on `/qrspi:update` the bump + auto-edits are **staged, not
  committed** — the command prints a ready-to-run commit line and the human commits
  (settled OQ5).
- **Manifest (kit repo):** `migrations/*.yaml`, one file per shipped release
  from this feature's version onward. Schema in D4. Included in lint's scan set.

## Command / skill surface

- **`/qrspi:update`** — no argument in the common case (reads marker, resolves
  target — target-resolution mechanism is **OQ1**), walks `A < v ≤ B`
  step-by-step, hybrid-applies, bumps marker. A `--dry-run` preview and an
  explicit `<target-version>` arg are candidate extensions (OQ1 / signature).
- **`claude/skills/qrspi-update/SKILL.md`** — carries the manifest schema
  contract, the SemVer-ordered walk algorithm, the automated/manual dispatch,
  and the edge-case handling (D5). Shipped to consumers.
- **`/qrspi:init`** — new step writes the marker at the current version (init's
  knowledge of "current version" shares OQ1's mechanism — flagged in OQ1).
- **README / CHANGELOG / CONTRIBUTING / `sync-copilot.mjs`** — updated: README
  helpers line + an "Updating your repo" note; CHANGELOG `[Unreleased]`;
  CONTRIBUTING release checklist + `qrspi-release` precondition; a regenerated
  `copilot/prompts/qrspi-update.prompt.md`.

## Authorization

Not applicable (no runtime auth surface). The only "who can do what" concern is
that `/qrspi:update` is **edit-capable in the consumer repo** — a broader
capability than read-only stages. Mitigation: auto-edits are confined to the
manifest's `automated` steps against `openspec/`-scoped paths, and every
judgment step is human-gated (D3, D4).

## Vertical slices (preview)

Stage S will detail these; each ends in something demoable end-to-end:

- **Slice 1 — Marker lifecycle:** `openspec/.qrspi-version` written at
  `/qrspi:init`; demoable by initializing a test repo and seeing the marker at
  the current version.
- **Slice 2 — Manifest + release gate:** the `migrations/<version>.yaml` schema,
  this feature's own entry, and the presence lint/CI gate; demoable by running
  lint and watching it fail when the entry is absent, pass when present.
- **Slice 3 — `/qrspi:update` walk (read path):** the command + skill reading
  the marker, resolving the target, walking step-by-step and reporting the
  planned steps; demoable end-to-end on a repo whose marker is behind.
- **Slice 4 — Hybrid apply + marker bump:** auto-apply mechanical steps, gate
  manual steps, bump + commit the marker; demoable as a full update run.
- **Slice 5 — Two-tool + docs parity:** `sync-copilot.mjs` regeneration, README
  / CHANGELOG / CONTRIBUTING updates; demoable via green drift + lint.

(Slice 3/4 split, or a merged single update slice, is a stage-S call.)

## Risks / Trade-offs

- **Target-version discovery is the load-bearing unknown (OQ1).** The plugin
  cache path encodes the version (`~/.claude/plugins/cache/lotea-agents/qrspi/
  0.5.0/`) and multiple versions co-exist there (0.4.1 and 0.5.0 both present on
  this machine), but a running command body has **no portable primitive to learn
  its own install directory** across machines/OSes. If the design assumes the
  skill can read the installed `plugin.json`, that must be **verified at stage I
  as a watch-item with a fallback** (explicit `<target>` arg, or a manifest
  "latest" header) rather than approved as a settled default here.
- **Marker/`plugin.json` drift:** if a consumer edits the marker by hand or a
  release is cut mid-PR, the marker can disagree with reality; D5's downgrade
  hard-stop and no-marker guard are the safety nets.
- **Manifest stub fatigue:** requiring a stub every release adds a release step;
  mitigated by making it mechanical and cheap, and by `qrspi-release` prompting
  for it.
- **Copilot update path stays out of parity:** Copilot consumers still update by
  re-running `install.sh`; the interactive walk is Claude-only until
  `reassess-copilot-port`.

## Open questions for the human

- [x] **OQ1 — How does `/qrspi:update` (and `/qrspi:init`) learn the CURRENT
  target version?** Candidates: (a) read the installed plugin's `plugin.json`
  via the cache path — **feasibility unverified**, the path encodes the version
  and there's no portable "know my own dir" primitive, so this may not work
  cross-machine; (b) explicit `/qrspi:update <target-version>` argument; (c) a
  `latest:`-style header the manifest carries; (d) GitHub API fetch of the
  latest release. This is the load-bearing decision and its resolution shapes
  the command signature and init's marker-write step. Recommend picking a
  primary + a fallback (I-stage watch-item) rather than betting solely on (a).
  **Answer: Auto-detect as PRIMARY (derive the target from the plugin's shipped
  version/manifest), with an explicit `/qrspi:update <version>` (and, for init, an
  equivalent) as the GUARANTEED-PORTABLE fallback. Auto-detect feasibility is a
  stage-I watch-item; the fallback ensures the command is never blocked. Command
  signature therefore accepts an optional `<target-version>` arg.**
- [x] **OQ2 — Confirm the edge-case defaults (D5):** up-to-date → no-op;
  no-marker → offer-to-initialize (not `0.0.0` replay); downgrade → hard-stop
  (no reverse migrations). Override any you disagree with.
  **Answer: Approved all three as written.**
- [x] **OQ3 — Exact `migrations/<version>.yaml` schema (D4):** is the proposed
  `version` / `summary` / `automated[] {description, action, …}` / `manual[]
  {description}` shape right, and what is the closed `action:` vocabulary for
  automated steps (e.g. `edit-file`, `run-command`)? A too-open `action` set
  makes the hybrid dispatcher unbounded.
  **Answer: Approved the shape. Automated `action:` vocabulary is `edit-file`
  ONLY, scoped to `openspec/`-relative paths — deterministic edits the command may
  apply itself. Anything requiring a shell command is NOT an automated action; it
  is authored as a `manual` step (human-gated). This closes the auto-execution risk
  surface. The vocabulary may expand only via a future change. (Updates D4.)**
- [x] **OQ4 — Where does the release gate live — `scripts/lint.mjs` or
  `release.yml`?** Design recommends a lint check (runs every PR, catches the
  miss early; release.yml already runs lint). Confirm, or prefer a
  release.yml-only assertion (only fires at tag push).
  **Answer: `scripts/lint.mjs` — the presence check lives in lint so it runs on
  every PR; `release.yml` continues to run lint, so it is also enforced at tag
  push. (Settles D6 placement.)**
- [x] **OQ5 — Marker commit behaviour on `/qrspi:update`:** does the command
  commit the marker bump (and any auto-edited files) on the human's behalf, or
  leave them staged/unstaged for the human? (Q10e.)
  **Answer: Do NOT auto-commit. Apply the auto-edits, bump the marker, stage the
  changed files, and print a ready-to-run commit command; the human commits. Safe
  for a consumer-facing tool that may run on any branch. (Settles the "commit
  behaviour is OQ5" note in D1 / Command surface.)**
- [x] **OQ6 — Is a new lint check for marker-format / manifest-schema
  well-formedness in scope**, beyond the presence check (D6)? Or is presence +
  code review + dogfood sufficient?
  **Answer: Yes — in scope. The lint check validates: (1) each `migrations/*.yaml`
  is well-formed against the D4 schema (required keys; `automated[].action` is
  `edit-file` only; paths are `openspec/`-scoped) and (2) the marker string, where
  present, matches a SemVer regex. A malformed manifest would otherwise break the
  walk silently. (Extends D6/D7.)**
