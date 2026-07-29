# Design — reassess-openspec-dependency

> Stage D of QRSPI. Generated 2026-07-29.
> **Implementation is BLOCKED until a human approves this file.**

## Context

This change is a **decision spike**: produce a defensible, written verdict on
whether QRSPI should **keep** its runtime dependency on the `@fission-ai/openspec`
CLI (pinned `1.4.1`) or **vendor** the convention outright before the 1.0 cut,
and — co-decided in the same breath — settle the fate of the bundled
`assert-openspec-version-pin-coupling` guard. The human's prior (PQ1) is
**lean keep**, and PQ2 scopes this run as *verdict + guard in the same QRSPI
flow if the verdict is keep* (if R/D surprisingly lands on vendor, the vendor
*build* is out of scope and becomes its own change).

**What exists today** (from research.md): the CLI is invoked at exactly a
handful of sites — `init.md` (`init --tools none`, `update`), the CI `validate`
job (`validate --all`, pinned `1.4.1`), and the `spec-syncer` agent
(`validate <id> --strict` via Bash). Two *generated* skills
(`openspec-archive-change`, `openspec-sync-specs`, both `generatedBy: "1.4.1"`)
call bare `openspec list/status --json`, but the kit has already re-implemented
their logic in `archive.md` + `spec-syncer.md` and actively *suppresses* the
generated sync path (whose partial-merge rule contradicts the kit's authoritative
wholesale-replacement contract). `scripts/lint.mjs` (Checks 1–21, no npm deps)
already owns most structural invariants, including the MUST/SHALL first-line rule
(Check 20) that duplicates what `validate --strict` enforces. Lint Check 1 asserts
all hardcoded pin strings agree but does **not** assert `openspec/config.yaml`'s
`openspec_version` against the kit pin, does **not** scan `.github/`, and
**errors on zero pin occurrences** (line 362).

**Desired end state:** a `design.md` that records a keep-vs-vendor verdict with
its rationale, and — on the keep verdict this flow expects — a shipped
pin-coupling guard so `openspec/config.yaml`'s `openspec_version` can no longer
silently drift from the kit's pin. The vendor path is mapped in enough detail to
make the verdict defensible, but not built here.

## Goals / Non-Goals

**Goals:**
- Record a keep-vs-vendor **verdict** with cited evidence (this is the primary
  deliverable — PQ5 sets the bar at "R/D analysis is sufficient," no prototype).
- On a keep verdict, **design the pin-coupling guard** (the
  `assert-openspec-version-pin-coupling` bundle leg) so S→I can ship it in this
  same flow (PQ2b).
- Keep the vendor path mapped well enough that the verdict is defensible and the
  eventual vendor change has a clear starting inventory.

**Non-Goals (each a candidate backlog `idea`, offered per-item at commit):**
- **The vendor implementation itself** — if the verdict were vendor, the build is
  its own change (PQ2 corollary). Out of scope regardless.
- **Renaming `openspec/` → `qrnchi/`** — PQ3 makes this a *soft* 1.0 want, not a
  blocker; PQ4 makes the migration-manifest rename-step schema extension a
  *separate* concern. Both stay out of this spike.
- **Deleting the two generated skills** — even though research shows them
  functionally superseded by `archive.md`/`spec-syncer.md`, removing them is a
  keep-path cleanup that is separable from the guard (see D5). Candidate follow-up.
- **Fixing the `openspec-workflow` `@latest` vs. pinned `@1.4.1` inconsistency
  and its stale `openspec/templates/` layout entry** — real drift (research
  "Notable discrepancies"), but a doc-hygiene follow-up, not the guard.
- **Adding `.github/` to Check 1's scan** — the CI YAML pin is genuinely
  unchecked today (research gap); whether to close it is discussed in D4 but the
  fix, if wanted, is separable.

## Decisions

### D1 — Verdict: KEEP the OpenSpec CLI dependency for 1.0
**Chose:** keep. **Rejected:** vendor-now.
Grounded in research, not just the PQ1 prior. The CLI's *only* load-bearing runtime
job is `validate --all` (CI) / `validate <id> --strict` (spec-syncer) enforcing
spec-delta *block grammar* (`## ADDED/MODIFIED/REMOVED Requirements` →
`### Requirement:` → `#### Scenario:`). Everything else the CLI once did is
already kit-owned: archive flow (`archive.md`), delta sync (`spec-syncer.md`),
folder layout (documented in-repo), and the MUST/SHALL rule (Check 20 duplicates
`--strict`). So the *residual* CLI value is narrow but real — a maintained
spec-grammar validator the kit does not have to write or self-test — and vendoring
it means porting that grammar into `lint.mjs` with synthetic fixtures (Q38: several
new checks) with *no npm deps*, purely to enable a workspace-root rename that PQ3
already downgraded to a soft want. The cost/benefit favours keep before 1.0.
The verdict document is the deliverable (PQ5a); no prototype was required.

### D2 — Pin-coupling guard lives as a new assertion inside lint Check 1
**Chose:** extend `checkPinAgreement` (Check 1). **Rejected:** a new Check 22;
a session-time check mirroring `qrspi-version-check`; a CI-only check.
Check 1 *already* scans `openspec/config.yaml` and captures its
`openspec_version` via the same `pinRe` (research Area 3; lint.mjs line 274,
339–345). Today it only asserts all captured strings *agree with each other* —
it does not assert them against an authoritative expected value. The guard is
therefore the *natural* next assertion in the existing collect-then-compare
structure (Q33), not a separate check. A separate Check 22 would re-scan the same
files; a session-time check adds per-invocation friction for a static, CI-catchable
fact; a CI-only check misses local `node scripts/lint.mjs` runs. Keeping it in
Check 1 means one scan, one failure surface, zero new npm deps.

### D3 — The authoritative "expected pin" is the agreed set itself, not a new constant
**Chose:** the guard asserts that `openspec/config.yaml`'s `openspec_version`
is **present and equal to the agreed pin** that Check 1 already derives from the
executable sites (`init.md`, CI, CONTRIBUTING). **Rejected:** a hardcoded
`EXPECTED_PIN` constant in `lint.mjs`; the README as source of truth.
Today the pin is not single-sourced anywhere (research Area 3 lists 9 occurrences
across files) — Check 1's job is precisely to make them agree. Introducing a
separate constant would create a *tenth* place to drift and a chicken-and-egg
"which is authoritative" question (Q20). Instead, once Check 1 confirms all
occurrences agree on one version V, the coupling assertion is simply: *did
`openspec/config.yaml` contribute a value, and is it V?* This upgrades the failure
mode from "config drifted silently" (Q18 — a consumer scaffolded at 1.3.x re-run
at 1.4.1 gets no warning) to "lint fails loudly." No new authoritative source is
introduced.

### D4 — Zero-pin behavior stays as-is (error), and `.github/` scope is left unchanged
**Chose:** leave Check 1's zero-occurrence branch erroring (lint.mjs line 362–364),
and do **not** add `.github/` to Check 1's scan in this change.
The zero-pin error is *correct under keep* — a keep repo must always carry pins, so
"no pins found" is a real failure, not a vacuous pass (Q31). (It would only need
changing under vendor, which is out of scope.) The `.github/ci.yml` pin being
unscanned (research "Notable discrepancies") is a pre-existing gap; the CI job
itself would fail loudly if `1.4.1` were wrong, so it is not a *silent* drift risk
like config.yaml is. Closing it is a separable hygiene item (Non-Goal), not part
of the guard's core value. **Watch-item for stage I:** confirm the guard's new
assertion fails on a fixture where config's `openspec_version` is *absent* as well
as where it is *present-but-wrong* — "present and equal" has two failure legs.

### D5 — Generated skills, `openspec-workflow` drift, and rename all stay untouched
**Chose:** ship *only* the guard in this flow; defer the three cleanups above.
Research shows the two generated skills are functionally superseded and the
`openspec-workflow` skill has `@latest`/stale-layout drift — all tempting to fix
"while we're here." But each is independent of the guard, and folding them in
would blur a clean spike into a grab-bag. Under keep, the generated skills remain
*live* (their `list/status --json` calls still run inside the archive folder-move
step), so deleting them is a real behavior change deserving its own flow, not a
drive-by. Each is offered as a backlog `idea` at commit time.

### D6 — Guard needs its own lint self-test (built at stage I)
**Chose:** add a synthetic-fixture self-test for the new Check 1 assertion, in the
same inline style as the existing Check 14/15 self-tests (Q38–Q40; PQ5a's
corollary — the guard's tests land when it is built at I).
The self-test must cover both failure legs from D4: config `openspec_version`
*missing*, and config `openspec_version` *present but ≠ agreed pin* — plus the
green case. This is the Testing "done" bar for this spike (Q40 option b), since
the verdict document itself needs no test (Q40 option a for the doc half).

## Command changes
`claude/commands/init.md` — no functional change under keep. If the human wants
the config-write step (line 82) called out as the fifth pin site the guard now
governs, that is a one-line README/comment note, not a body change. No new
scaffolding mechanism is needed (Q22 only bites under vendor).

## Agent changes
`claude/agents/spec-syncer.md` and `claude/agents/architect.md` — **no change**
under keep. Both keep calling `openspec validate <id> --strict` via Bash; the CLI
stays. (These calls would only be replaced under vendor — out of scope.)

## Skill changes
No skill changes required for the guard. The `openspec-workflow` `@latest`/stale-
layout drift and the two generated skills are Non-Goals (D5), offered to backlog.

## Lint changes
Check 1 (`checkPinAgreement`) gains one assertion (D2/D3): after confirming all
captured pin strings agree on version V, assert that `openspec/config.yaml`
contributed a value and that it equals V. Zero-pin branch unchanged (D4). One new
inline self-test covering the two failure legs + green case (D6). No new check
number; no npm deps introduced.

## Template surface
`openspec-templates/spec-delta.template.md` — **no wording change** under keep.
Its "enforced by `openspec validate <id> --strict`" references stay accurate
because the CLI stays. (Q34's rewrite is a vendor-only concern.)

## Migration manifest
This change bumps no OpenSpec pin (stays `1.4.1`), so it needs **no** pin-drift
migration step. The guard is a lint-only addition invisible to consumer repos
already carrying `openspec_version: 1.4.1`. **Watch-item:** a *future* pin bump
(e.g. 1.4.1→1.5.0) will now need its migration manifest to also edit
`openspec/config.yaml`'s `openspec_version` (an `edit-file` step, path starts with
`openspec/` — schema already supports it, Q21), or the guard turns red on upgraded
consumers. Flag this in the guard's own doc note so the future bump remembers.
The rename-step schema extension (PQ4) is a separate backlog concern.

## Vertical slices (preview)
Verdict-first, then one guard slice that ends in a demoable red→green lint:
- **Slice 1 — Verdict of record (keep).** Land the verdict + rationale as the
  approved design/proposal + delta spec for the pin-coupling capability. Demoable:
  the written keep verdict a human can read and cite for 1.0 sequencing.
- **Slice 2 — Pin-coupling guard, end-to-end.** Extend Check 1 with the
  config-equals-pin assertion *and* its self-test in one vertical cut. Demoable:
  `node scripts/lint.mjs` stays green on the real repo, and the new self-test goes
  red when a fixture's `openspec/config.yaml` drifts from the pin (both legs) and
  green when it agrees.

(If the verdict had been vendor, there would be a single slice — the verdict
document — and the flow would end at the approved design, per PQ2's corollary.)

## Risks / Trade-offs
- **Keep defers the workspace-root rename.** Accepting keep means `openspec/`
  stays the folder name through 1.0 (PQ3 soft-want, consciously deferred). If the
  rebrand later demands `qrnchi/`, a vendor change + migration-schema extension
  (PQ4) must land first — a known, sequenced future cost, not a surprise.
- **The guard hardcodes the "config must equal the executable pin" assumption.**
  If OpenSpec ever gains a *configurable* workspace/version story that
  legitimately diverges config from the pinned CLI, the assertion would over-fire.
  Low risk today (research: `openspec_version` is "informational only"), and the
  guard makes the current invariant explicit rather than inventing one.
- **Not verified at design time:** the exact set of grammar rules
  `openspec validate --all` enforces beyond MUST/SHALL + block structure (research
  Open gap — no CLI source in-repo). This does not affect the guard, but it does
  underpin the keep rationale (D1): the residual CLI value is "a validator we'd
  otherwise reverse-engineer." **Stage-I fallback:** none needed for the guard;
  the unknown only sizes the *vendor* cost, which we are not paying.
- **Self-test brittleness.** The new self-test manipulates Check 1's scan over a
  synthetic fixture; it must not accidentally couple to the *real* repo's pin
  value. Build it against an isolated temp fixture, mirroring existing
  Check 14/15 self-tests (D6).

## Open questions for the human
- [x] None blocking. All five product questions (PQ1–PQ5) are answered in
  questions.md and the verdict (D1) follows the stated keep lean.
  **Resolved at the D review (2026-07-29):** the human approved all six decisions
  (D1 keep verdict, D2/D3 guard inside Check 1 with no new constant, D4 scope
  edges, D5 defer, D6 self-test) with no changes, and chose to **defer** all three
  D5 cleanups (generated-skill removal, `openspec-workflow` drift fix, `.github/`
  scan) to backlog `idea` rows rather than ship them in this flow.
