# Slices — per-slice-compute-tier

> Stage V of QRSPI. Generated 2026-07-27.
> Vertical slices, not horizontal layers.

## Overview

This change has no web UI, no HTTP API, and no database — every deliverable is
observable by running `node scripts/lint.mjs` or by firing a QRSPI command in a
`--plugin-dir` session. The four slices below each end with a runnable
checkpoint that is demoable without the prior slice's code having been reviewed.

The slices follow the design's phasing (D1–D8): slice 1 unlocks `haiku` in lint
and docs so Check 13 can validate it (the smallest unit of shipped value); slice
2 extracts `implementer-core` and refactors the base `implementer.md` (the
shared body must exist before the variants can load it); slice 3 ships the three
variant agents and Check 15 (the drift gate that makes the fleet self-policing);
slice 4 rewires `implement.md` resolution to the new grammar and ships the
migration entry (the live OQ1 observation).

**Compute annotation note.** All `**Compute:**` lines in this file use the
currently-valid grammar (`model=<sonnet|opus> effort=<low|medium|high>`) — the
new orthogonal grammar (where `effort=` is required and `model=` is optional)
does NOT take effect until this change ships and Check 13 is updated in slice 3.
The `(D<n>)` tags embedded throughout this file are required — this `slices.md`
dogfoods the rule it describes.

## Slices

### Slice 1 — Haiku tier: lint constant + vertical-slice docs

A human running `node scripts/lint.mjs` after this slice sees Check 13 accept
`model=haiku` annotations without error. The `vertical-slice` skill is also
updated to document `model=haiku` as a recognized alias with its own heuristic
band. This slice ships no new agents and no grammar change — it is the smallest
atomic unit of value: the allowed-model vocabulary is widened and documented
before anything else depends on it.

- M: no mock needed — no service layer or API; lint reads source files directly.
- F: no UI surface.
- D: no data-store surface.
- T: add a `slices.md` fixture line `effort=low model=haiku — mechanical rename`
  to the lint test corpus; verify `node scripts/lint.mjs` exits 0. (D2)
- **Compute:** model=sonnet effort=low — mechanical constant addition plus a
  docs section that mirrors an existing pattern; no novel design reasoning. (D1, D2)
- Checkpoint: run `node scripts/lint.mjs` and confirm Check 13 passes with a
  `model=haiku` annotation in the test fixture. No `--plugin-dir` session needed
  for this slice.

### Slice 2 — implementer-core skill + base implementer refactor

A human can launch `claude --plugin-dir /workspaces/git/qrspi` and invoke
`/qrspi:implement <any-id>` against an existing in-flight change; the spawned
implementer subagent behaves identically to today because `implementer.md` still
delegates to `implementer-core`, which carries the same body. Check 2 passes
(`implementer-core` resolves correctly) and `checkSkillSets` reports OK for the
`implementer` stem. The three variant agents do not yet exist at this slice
boundary — they are slice 3.

- M: no mock needed.
- F: no UI surface.
- D: no data-store surface.
- T: `node scripts/lint.mjs` must exit 0 with Check 2 (skill resolution) and
  Check 5 (`checkSkillSets`) both passing for the updated `implementer.md` and
  the new `implementer-core` skill. (D3, D4)
- **Compute:** model=sonnet effort=low — mechanical extraction: copy the body,
  update one load line, update one registry entry; the skill-set structure is
  already established. (D3, D4)
- Checkpoint: `node scripts/lint.mjs` exits 0. (human) In a `--plugin-dir`
  session run `/qrspi:implement <id>` on a change that has a ticked-all-but-one
  `tasks.md`; confirm the implementer subagent launches and behaves normally —
  confirming that the refactored `implementer.md` + `implementer-core` body is
  functionally identical to the pre-refactor baseline.

### Slice 3 — Variant agents + Check 15 drift gate

A human running `node scripts/lint.mjs` sees Check 15 (`checkVariantAgents`)
report OK for the three new variant files. Removing or renaming any variant file
causes Check 15 to fire. The inline self-test for Check 15 runs during every
lint pass. This slice also updates `SKILL_SET_EXPECTED` for the three variant
stems (or confirms they need no entry per the design decision). At this slice
boundary the variant agents exist and are lint-clean but `implement.md` does not
yet dispatch to them — that is slice 4.

- M: no mock needed.
- F: no UI surface.
- D: no data-store surface.
- T: `node scripts/lint.mjs` must exit 0 with Check 15 reporting OK for the
  three variants; verify the inline self-test fires correctly against its
  synthetic fixture; verify that deleting `implementer-medium.md` (in a temp
  copy) causes Check 15 to exit non-zero. (D5, D6)
- **Compute:** model=sonnet effort=medium — three new agent files following a
  clear template plus a new lint check with inline self-test; the self-test
  harness adds moderate but well-defined complexity. (D5, D6)
- Checkpoint: `node scripts/lint.mjs` exits 0 and Check 15 is visible in the
  output as `Check 15: OK`. No `--plugin-dir` session needed for this slice
  (the variant agents are not yet dispatch targets).

### Slice 4 — implement.md resolution + orthogonal grammar + migration

A human can launch `claude --plugin-dir /workspaces/git/qrspi` and observe that
`/qrspi:implement <id>` reads `effort=` from the slice's `**Compute:**` line,
maps it to the correct variant agent (`effort=low` → `implementer-low`, etc.),
and spawns with the resolved `model=` (defaulting to `sonnet` when absent). A
`**Compute:**` line with no `effort=` token triggers the hard-stop. The
`openspec-templates/` grammar comments and the migration entry also ship in this
slice. This is the slice where OQ1 (spawn-time model override precedence) is
observed live: a `model=haiku` annotation causes `implementer-low` to be spawned
with `model: haiku`, confirming the Agent-tool `model:` parameter overrides the
`model: sonnet` frontmatter default. Check 13 is also updated in this slice to
enforce `effort=` as required (the grammar becomes fully enforced end-to-end).

- M: no mock needed.
- F: no UI surface.
- D: no data-store surface.
- T: `node scripts/lint.mjs` must exit 0 with the updated Check 13 (requiring
  `effort=` and accepting `model=` as optional); verify a fixture with `model=sonnet`
  and no `effort=` token exits non-zero. (D7, D8)
- **Compute:** model=opus effort=high — two edit sites in `implement.md` (main
  spawn + auto-mode loop), non-trivial resolution logic (token parsing, variant
  mapping, default handling, hard-stop wiring), and a live OQ1 interaction
  observable only at runtime; this is the highest-reasoning slice in the set. (D7, D8)
- Checkpoint: `node scripts/lint.mjs` exits 0. (human) In a `--plugin-dir`
  session: (a) run `/qrspi:implement <id>` against a change whose next slice has
  `effort=low model=haiku` — confirm the terminal shows `implementer-low` spawned
  with `model: haiku` (OQ1 observed: Agent-tool `model:` overrides frontmatter);
  (b) temporarily set a slice's `**Compute:**` line to `model=sonnet` with no
  `effort=` — confirm a hard-stop is issued and no implementer is spawned.
