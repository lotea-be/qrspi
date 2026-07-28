# Slices — spec-sync-contract

> Stage V of QRSPI. Generated 2026-07-28.
> Vertical slices, not horizontal layers.

## Overview

This change fixes a silent-data-loss bug in archive-time delta-spec sync:
a `## MODIFIED Requirements` block that omits unchanged scenarios causes the
sync agent to silently delete them from the base spec. The fix has three
independently demoable increments.

Slice 1 delivers the full runtime path end-to-end: a kit-owned `spec-syncer`
agent carrying the authoritative wholesale-replacement contract, registered in
`plugin.json`, wired into `claude/commands/archive.md` as the sole sync
delegator. After Slice 1 a human can dogfood `/qrspi:archive` and observe the
count-drop hard-stop firing instead of silent scenario loss.

Slice 2 adds the static author-side and CI guard layers: the template comment
that guides authors, Check 18 (count-drop static lint), and Check 19
(authoritative-delegator assertion). These are independently runnable via
`node scripts/lint.mjs` against synthetic fixtures.

Slice 3 closes the read-contract surface: the "Helper agents" subsection in
the workflow Read Matrix and Check 17 (non-stage agent banner lint). Like
Slice 2 it is demoable via `node scripts/lint.mjs`.

The three slices follow the approved design's preview directly; no re-slicing
was needed. Slice 1 carries the highest implementation risk (D2's
generated-skill-bypass and D4's already-synced branch detection) and is
flagged explicitly in its checkpoint.

The `(D<n>)` tags embedded throughout this file are required — this
`slices.md` dogfoods the rule it describes.

## Slices

### Slice 1 — Corrected merge contract, end-to-end runtime path

**Deliverable:** A human running `claude --plugin-dir /workspaces/git/qrspi`
in a fresh terminal can invoke `/qrspi:archive <fixture-id>` against a
throwaway consumer fixture whose delta has a scenario-dropping MODIFIED block
and observe the command hard-stopping with a clear count message instead of
silently losing scenarios. A clean delta (equal or more scenarios) archives
without any prompt. The generated `openspec-archive-change` skill's own sync
spawn is bypassed via the already-synced branch (D4), not removed.

- M: no mock service stub needed — `spec-syncer` is itself the runtime
  contract; there is no mock layer to wire before the real agent. (D1)
- F (agent file): write `claude/agents/spec-syncer.md` with least-privilege
  tool set (Read, Edit, Bash, Glob, Skill), `> **Read contract**` banner,
  authoritative wholesale-replacement body, count-drop hard-stop logic,
  structured result signals (`synced` / `blocked-on-count-drop` /
  `escape-hatch`), and confirmed-count-drop-ok re-spawn flag handling. (D1, D3)
- F (registration): add `spec-syncer` entry to `plugin.json`'s `agents`
  array. (D1)
- F (archive rewire): edit `claude/commands/archive.md` to insert step 4a
  that spawns `spec-syncer` (`subagent_type: qrspi:spec-syncer`) before the
  folder move; remove the happy-path "Sync now / Archive without syncing"
  prompt; retain the escape-hatch prompt (`escape-hatch` signal only); add
  count-drop AskUserQuestion flow (confirm → re-spawn with flag / abort); add
  the already-synced bypass instruction so the generated skill's post-4a sync
  prompt is declined. (D2, D4, D5)
- T (Tests): manual dogfood session per checkpoint below. No unit-test
  harness for agent prose; the check is behavioural.
- **Compute:** model=opus effort=high — first-of-kind helper agent with a
  non-obvious count-drop contract, re-spawn flag semantics, three distinct
  result-signal branches, and the generated-skill bypass that is the
  highest-risk element of the design (D2).
- Checkpoint: dev-install the in-development copy (`claude --plugin-dir
  /workspaces/git/qrspi`) in a fresh terminal outside this repo. Build two
  throwaway consumer fixtures in the scratchpad: (a) a fixture whose delta has
  a MODIFIED block with fewer scenarios than the base — verify `/qrspi:archive
  <fixture-a>` hard-stops naming the requirement and counts, base spec
  untouched; (b) a fixture with a clean delta — verify archive completes with
  no sync prompt and the generated skill's sync phase is bypassed (already-
  synced branch, no second sync spawn). **Dogfood watch item (D2):** confirm
  that the generated skill does NOT offer a second "Sync anyway" prompt after
  step 4a; if it does, the bypass instruction in archive.md is incomplete.

### Slice 2 — Author-side guidance and kit CI guards (Checks 18 & 19)

**Deliverable:** `node scripts/lint.mjs` fails on a synthetic delta fixture
that drops scenarios under `## MODIFIED Requirements`, and fails when
`claude/commands/archive.md` does not reference `qrspi:spec-syncer`. It
passes cleanly on correct fixtures. A human can run the lint script locally
after Slice 2 and observe both failure and pass paths. The template comment
strengthening provides author-time guidance independently of CI.

- M: no mock needed — the lint checks operate on static file content; no
  agent or runtime path is involved.
- F (template): strengthen the MODIFIED comment in
  `openspec-templates/spec-delta.template.md` to state unambiguously that
  MODIFIED = wholesale replacement and all scenarios must be repeated in
  full. (D7)
- F (Check 18): add `checkModifiedScenarioCounts` to `scripts/lint.mjs`
  after Check 17's placeholder position (or after the highest existing
  Check), using the dependency-free ESM async-function pattern. Check parses
  delta specs at `openspec/changes/*/specs/**/spec.md`, counts `#### Scenario:`
  blocks under `## MODIFIED Requirements` per requirement title, looks up the
  base count in `openspec/specs/<capability>/spec.md`, and flags any
  reduction. Skips requirements where the base capability spec does not exist
  (new capability). (D6)
- F (Check 19): add `checkAuthoritativeSyncDelegator` to `scripts/lint.mjs`
  after Check 18: assert (a) `claude/commands/archive.md` contains
  `qrspi:spec-syncer`; (b) no kit-owned file under `claude/commands/` or
  `claude/agents/` contains `subagent_type: general-purpose` in proximity to a
  sync-context string. (D8)
- T (Tests): run `node scripts/lint.mjs` with a synthetic scenario-dropping
  delta fixture in place; observe Check 18 non-zero. Run with archive.md
  temporarily stripped of `qrspi:spec-syncer`; observe Check 19 non-zero. Run
  clean; observe both pass.
- **Compute:** model=sonnet effort=medium — mechanical lint checks following
  the established dependency-free ESM pattern already in `scripts/lint.mjs`;
  no novel reasoning, templated after existing checks.
- Checkpoint: run `node scripts/lint.mjs` from the repo root. (1) With a
  synthetic delta file placed at
  `openspec/changes/lint-test-fixture/specs/foo/spec.md` containing a
  MODIFIED block with fewer scenarios than a matching file at
  `openspec/specs/foo/spec.md` — Check 18 must exit non-zero and name the
  requirement and counts. (2) With `claude/commands/archive.md` temporarily
  missing the `qrspi:spec-syncer` reference — Check 19 must exit non-zero.
  (3) After restoring both — lint exits zero. Remove the synthetic fixture
  after the check.

### Slice 3 — Read-contract wiring and Check 17

**Deliverable:** `node scripts/lint.mjs` passes with the `spec-syncer` banner
present in `claude/agents/spec-syncer.md` and fails if the banner drifts or is
missing. The workflow skill Read Matrix has a "Helper agents" subsection so
the kit's read-contract story is complete. A human can confirm both by
reading the skill and running lint.

- M: no mock needed — both deliverables are static content changes and a
  lint assertion.
- F (Read Matrix): add a "Helper agents" subsection to the Read Matrix table
  (or its surrounding prose) in `claude/skills/workflow/SKILL.md` with a
  `spec-syncer` row stating within-change reads (`specs/**` delta) and
  cross-change reads (`openspec/specs/**` via the spec.md exception), and
  explicitly stating it opens no process artifacts. (D9)
- F (Check 17): add `checkHelperAgentReadContracts` to `scripts/lint.mjs`
  after Check 16 (before Checks 18 and 19 from Slice 2, since Check 17
  logically precedes them by number). Check maintains a separate hardcoded
  `HELPER_READ_CONTRACT_EXPECTED` map (distinct from Check 7's
  `READ_CONTRACT_EXPECTED` for stage agents), asserting that each helper agent
  file carries a `> **Read contract**` banner whose `Reads:` field matches the
  map entry. Initial map: `{ "spec-syncer": "specs/** (delta) and
  openspec/specs/** (main)" }`. Include an inline in-memory self-test
  following Check 15's pattern: run the banner-detection logic against a
  synthetic fixture string representing a missing banner, assert the detector
  fires, push a Check 17 error if the self-test fails. Check 17 MUST NOT
  widen Check 7's nine-agent scope. (D9)
- T (Tests): `node scripts/lint.mjs` passes with the banner in place (written
  by Slice 1); fails if the Reads line is temporarily removed from
  `spec-syncer.md`. The inline self-test runs as part of every lint
  invocation.
- **Compute:** model=sonnet effort=low — Read Matrix prose addition is
  templated (mirrors the existing stage-agent rows); Check 17 follows the
  established lint check pattern and the map has a single entry.
- Checkpoint: run `node scripts/lint.mjs` from the repo root. (1) With
  `claude/agents/spec-syncer.md` as written by Slice 1 — Check 17 must report
  OK. (2) Temporarily remove the `> **Read contract**` banner line from
  `spec-syncer.md` — Check 17 must exit non-zero and name `spec-syncer` as
  missing. Restore the banner before committing. Also confirm that Check 17
  does NOT flag `claude/agents/architect.md` (a stage agent, not in
  `HELPER_READ_CONTRACT_EXPECTED`).

> **Ordering note:** Checks 17, 18, 19 are numbered sequentially in
> `scripts/lint.mjs`. Slice 3 adds Check 17 (helper-agent banner), and
> Slice 2 adds Checks 18 and 19. In implementation order, Slice 1 (no new
> checks) → Slice 2 (Checks 18 & 19) → Slice 3 (Check 17 inserted before
> them by number) is the natural sequence; the planner should note that
> Slice 3's Check 17 will be inserted before Checks 18/19 in the file
> rather than appended after them.
