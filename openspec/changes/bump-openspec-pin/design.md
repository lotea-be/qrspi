# Design — bump-openspec-pin

> Stage D of QRSPI. Generated 2026-08-14.
> **Implementation is BLOCKED until a human approves this file.**

## Context

We are bumping the kit's pinned `@fission-ai/openspec` CLI from `1.4.1` to
`1.9.0` — Tier 1 of the road-to-1.0 runway, the pin the public v1.0.0 will
freeze on. The run bundles four backlog rows (`bump-openspec-pin`,
`scan-github-ci-openspec-pin`, `fix-openspec-workflow-skill-drift`,
`simplify-pin-coupling-mismatch-branch`), all of which touch the same two
surfaces: the literal pin sites and lint Check 1 (`checkPinAgreement`).

Today 12 pin occurrences all read `1.4.1`; Check 1 asserts they *agree* (not a
fixed value), so any consistent flip is lint-clean **in theory**. Research
found two confirmed blockers that make that false in practice, and the spike
found a third:

1. **Two of the 12 occurrences are narration, not declaration.**
   `CHANGELOG.md:900` records a *past release's* `validate` invocation at
   `1.4.1`; `openspec/backlog.md:53` narrates the current pin state. Flipping
   the live sites makes Check 1 report `found 2 distinct versions`. This is
   structural, not incidental: PQ5 requires a CHANGELOG bullet that says
   "1.4.1 to 1.9.0", so the CHANGELOG will *always* contain the old version.
2. **`validate --all` goes red for four stages of every QRSPI change.**
   v1.6.0 changed change resolution to directory existence. QRSPI commits the
   change folder at stage Q and `specs/` does not exist until stage S, so at
   1.9.0 CI fails every change through the Q → R → D window — here and in
   every consumer that copied the CI pattern. Reproduced in a clean fixture and
   against a copy of this repo's real spec tree.
3. **`ci-quality-gates` now states something false.** Its requirement says the
   CI job runs `validate --all` "(strict)" and that `--all` enforces the
   MUST/SHALL first-line rule. v1.7.0 demoted MUST/SHALL to guidance outside
   `--strict`, so after the bump that sentence is wrong and kit-side Check 20
   becomes CI's only MUST/SHALL enforcement.

Desired end state: every declaration site reads `1.9.0`; Check 1 guards
declarations (including CI's, which it does not scan today) and ignores
narration; a QRSPI change is CI-green from stage Q onward; and a consumer on
the previous kit release can upgrade without hand-repair.

**Verification note.** Every mechanical claim below marked *(verified)* was run
live against `@fission-ai/openspec@1.9.0` during this stage — in a synthetic
fixture and against a scratch copy of `openspec/`. Nothing was written into the
repo.

## Goals / Non-Goals

**Goals**

- Land on `1.9.0` unconditionally (PQ1), absorbing the adaptation work (PQ2)
  within the kit-source + one-consumer-migration boundary (PQ6).
- Keep `node scripts/lint.mjs` and `openspec validate` green at every commit,
  including the transient states mid-change (Q16).
- Make Check 1 guard the CI pin (row 2), stop mis-firing on narration, and make
  the config-coupling branch reachable (PQ3(b)).
- Hard-pin the `@latest` refs and fix the skill's stale layout entry (PQ4).
- Ship a consumer upgrade path for both the config sentinel and the new
  `validate` behaviour.

**Non-Goals** (backlog candidates, not this change)

- Reconciling kit-side scenario-count guards (lint Check 18, `spec-syncer`'s
  wholesale-replacement hard-stop) with the CLI's new 1.8/1.9 "every `####`
  child is a scenario" counting rule. No conflict is observable today (the
  whole surface passes at 1.9.0, *verified*), so this is a watch-item, not work.
- Adopting `validate --archived` (opt-in; requires every archived change's
  `tasks.md` boxes ticked — unaudited).
- Any generic "lint-directive comment" mechanism for per-line pin exemptions.
- Bumping `plugin.json` (CLAUDE.md: version moves only at a release cut).

## Decisions

### D1 — The Q→D validate break is fixed with a seeded `.openspec.yaml` marker, not by narrowing CI

QRSPI seeds `openspec/changes/<id>/.openspec.yaml` containing exactly:

```yaml
schema: spec-driven
skip_specs: true
```

at stage **Q** (in `claude/commands/questions.md` step 3, where the folder is
created), and **deletes it at stage S** when `specs/` is written.

*(verified)* With that file, `validate --all` over this repo's real 23 base
specs plus the in-flight change exits **0** (24 passed). Without it, **1**.
`schema:` is load-bearing — `skip_specs: true` alone is rejected with
"skip_specs is set but .openspec.yaml is not valid change metadata".

The obvious hazard — a stale marker silently suppressing real deltas — **does
not exist**: *(verified)* with both the marker and `specs/` present the CLI
fails with `skip_specs is set in .openspec.yaml but spec files exist under
specs/`. Upstream already guards the handoff, so no kit-side lint check is
needed to police marker removal (rejected as duplicating an upstream guard).
`claude/skills/openspec-archive-change/SKILL.md:114` already knows to preserve
`.openspec.yaml` on archive, so the archive path needs no edit.

Rejected: **narrow CI to `validate --specs`** — *(verified)* exits 0, but drops
delta-spec validation from CI entirely and contradicts two base specs that
require `--all`. **Defer folder creation to S** — breaks QRSPI's incremental-
commit design (questions.md has nowhere to live). **Seed a placeholder delta at
Q** — writes fiction into the spec surface and would trip Checks 18/20.
**Shell-loop over folders that have `specs/`** — keeps `--all` semantics but
puts logic in `ci.yml`, which a migration *cannot* touch (automated steps are
`openspec/`-scoped), so every consumer would hand-edit CI.

*Assumption to challenge:* that `skip_specs` on a not-yet-S change is an
acceptable use of a marker whose upstream meaning is "this change never has
deltas". I judge it acceptable because the marker is transient and its removal
is mechanically enforced — but it is a semantic stretch and the human may
prefer the CI-narrowing option.

### D2 — Check 1 guards *declarations*; narration surfaces are excluded by path

`scanFile` gains two named predicates alongside the existing
`isUnderChanges` / `isInGeneratedSkill`:

- `isNarrativeSurface(file)` → `CHANGELOG.md`, `openspec/backlog.md`. Same
  rationale already written in the check's own header for `openspec/changes/`:
  these files *cite* the pin as history, they do not maintain it. Rewriting
  `CHANGELOG.md:900` is rejected — it is a correct record of what a past
  release ran.
- `isConfigSentinel(file)` → `openspec/config.yaml`, excluded from the general
  sweep so the dedicated config-coupling assertion becomes its sole validator
  (PQ3(b) / Q9). This makes the `configVersion !== agreedPin` branch reachable
  and its actionable message the one that fires. Fixture B is retained (Q11).

Q10: nothing depends on `config.yaml` being in `found`. The zero-pin branch
stays as-is (still a real safety net if every invocation is deleted); on that
branch the coupling assertion is skipped because there is no `agreedPin` to
couple to — acceptable, and the emitted error already names the real problem.

### D3 — The scan extends to `.github/` **and** `.claude/`

Row 2 asks for `.github/` (the CI pin is unguarded today — research proved it
arithmetically: 12 found, ci.yml not among them). *(verified)* `.github/`
contains exactly one pin occurrence (`ci.yml:31`); `release.yml` and
`CODEOWNERS` contain none, so a plain recursive `scanDir` entry is safe with no
sub-exclusion (Q7).

I additionally recommend adding **`.claude/`**, because D5 hard-pins
`.claude/skills/qrspi-dogfood/SKILL.md`. Adding a literal pin to an unscanned
directory would manufacture exactly the unguarded-site problem row 2 exists to
close. `.claude/` currently contributes no other pin match (*verified*).

Q8 ("what fixture?"): the fixture is incidental — `.github/workflows/ci.yml` is
itself the exercise of the new code path, and the occurrence count is the
observable. No authored in-memory fixture is added for the directory scan.

**Expected post-change occurrence accounting** (a stage-I reconciliation aid,
not a contract): `init.md` 4 + `CONTRIBUTING.md` 3 + `README.md` 2 + `ci.yml` 1
+ `openspec-workflow/SKILL.md` 2 + `qrspi-dogfood/SKILL.md` 1 = **13**, with
`config.yaml`, `CHANGELOG.md`, `backlog.md` excluded.

### D4 — Check 1 gains an `@latest` absence sub-guard (not a new check)

Check 1 cannot assert the absence of a pattern it does not match, so hard-
pinning today's `@latest` refs leaves no guard against them coming back (Q4).
The sweep records `@fission-ai/openspec@latest` hits in the same pass and
errors on any. Implemented as a **sub-leg of Check 1**, not Check 25: it is
pin discipline, it reuses the same file set, and it keeps the README's "24
checks" count and the top-of-file index churn-free.

### D5 — `@latest` is hard-pinned in both skills; the stale layout entry is deleted

`claude/skills/openspec-workflow/SKILL.md:48-49` → `@1.9.0` (PQ4(a)). The
folder-layout block's `openspec/templates/` line (Q5) is **deleted**, not
repointed: the canonical templates are not in `openspec/` at all — they ship
with the plugin as `openspec-templates/`, which the file's own "Canonical
artifact shapes" section already says. Repointing the tree entry to a
repo-root path inside an `openspec/` tree diagram would just relocate the lie.

`.claude/skills/qrspi-dogfood/SKILL.md:56` is also hard-pinned. **This is one
line beyond the four bundled rows** — I recommend it because the dogfood
fixture should exercise the CLI the kit actually pins, and because it removes
the last standing violation of the stack cheatsheet's stated dependency policy.
Easy to strike if the human wants the bundle held to its rows.

`.claude/skills/qrspi-stack/SKILL.md:80` needs no edit (Q6) — it is
version-agnostic prose and correctly untracked.

### D6 — CI's invocation gains `--strict`

`ci-quality-gates` already *claims* CI validation is strict. v1.7.0 made that
false. Two ways to restore truth: weaken the spec, or make the command match
it. *(verified)* `validate --all --strict` at 1.9.0 exits **0** over all 23 base
specs plus a marked change — adopting it costs nothing today and restores
CLI-side MUST/SHALL enforcement instead of leaving lint Check 20 alone.

`ci.yml:31` becomes `npx --yes @fission-ai/openspec@1.9.0 validate --all
--strict`; the `ci-quality-gates` requirement is MODIFIED to name the flag
explicitly and drop the "`--all` runs strict" claim; `reference-example`'s
scenario command string is updated to match. `CONTRIBUTING.md`'s local-run
snippet follows.

*Risk taken:* `--strict` may reject a future delta shape that normal mode
accepts. That is the intended direction, and Check 20 already enforces the one
rule that bites.

### D7 — Migration steps fold into the unreleased `migrations/0.14.0.yaml`

Q12: **fold**, do not author `0.15.0.yaml`. `0.14.0.yaml` is staged-unreleased
ahead of the next cut; a second unreleased manifest would be *orphaned* — a
consumer upgrading to 0.14.0 walks `A < v <= 0.14.0` and would never apply
0.15.0's steps, and lint only enforces CHANGELOG→manifest, not the reverse, so
nothing would catch it. Its `summary` is extended to cover the pin bump.

Steps added:

- **automated** — `path: openspec/config.yaml`, `find: "openspec_version:
  1.4.1"` / `replace: "openspec_version: 1.9.0"`, plus `skip_if_contains:
  "openspec_version: 1.9.0"` for idempotent replay (Q13 — yes). The pin has
  never moved, so `1.4.1` is the only value a consumer's config can hold; a
  hand-edited third value hard-stops, which is the correct loud failure.
- **manual** — update the consumer's own CI `validate` invocation to
  `@1.9.0 ... --all --strict` (cannot be automated: the path guard forbids
  anything outside `openspec/`).
- **manual** — for any change folder currently between Q and S, add the
  two-line `.openspec.yaml` (an `edit-file` step reads its target first, so it
  cannot reliably create a new file).

Q14/Q15 confirmed: the other pin sites are kit-repo-local; `config.yaml` is the
only file an automated step can touch.

### D8 — The `.openspec.yaml` marker is inline in the command, not a template

Two machine-consumed lines with no authoring judgement. `openspec-templates/`
holds *artifact* shapes agents reason about; a metadata stub does not belong
there. `questions.md`'s git-add line gains the marker path;
`structure.md`'s git-add line gains it too (a named path stages the deletion).

### D9 — Docs corrected in the same change

CLAUDE.md's keep-README-current rule plus research's discrepancy list:
README's "Updating the pinned OpenSpec version" section under-enumerates the
hand-maintained sites (misses `ci.yml`, `CONTRIBUTING.md`, the skills) — it is
rewritten to the real set and to describe the new exclusions; the README's
Check-1 prose gains the `.github/`/`.claude/` scan and the `@latest` guard.
`CONTRIBUTING.md`'s pin-coupling rule is clarified to say the *release* that
ships a pin change bumps the minor (it sits in the release checklist, so
"same commit" means the release commit — today it reads as if a feature PR must
bump `plugin.json`, which contradicts CLAUDE.md). CHANGELOG gets one bolded
`### Changed` bullet with per-row sub-bullets (PQ5(a)).

> ⮕ Extended by OQ3: the README additionally publishes a **copy-pasteable
> `validate` job snippet** — the canonical CI invocation carrying the pinned
> version and `--strict` (D6) — so the consumer-side manual migration step
> (D7) is checkable by diff rather than interpretive. Two consequences the
> Implement stage must honour: (a) the snippet is itself a **live pin
> declaration** in `README.md`, so it is scanned by Check 1 and must carry the
> same version as every other site — raising the expected occurrence count by
> one beyond D3's estimate; and (b) it must be added to the README's own
> "Updating the pinned OpenSpec version" site enumeration, or the next bump
> will miss it and red-line Check 1.

## Command changes

- `claude/commands/questions.md` — step 3 seeds `.openspec.yaml`; git-add line
  extended.
- `claude/commands/structure.md` — deletes the marker when `specs/` is written;
  git-add line extended.
- `claude/commands/init.md` — four pin sites (3 invocations + the inline
  `openspec_version:` snippet) to `1.9.0`, mechanically (Q1: no special
  handling — the snippet is a declaration shipped into every consumer repo).
  The "As of CLI v1.4.1, `--tools none` …" claim (Q2) must be **re-verified at
  1.9.0 during stage I**, not just renumbered; if `--tools none` now writes a
  config, step b-bis's rationale prose changes.

## Skill changes

- `claude/skills/openspec-workflow/SKILL.md` — `@latest` ×2 → `@1.9.0`; drop the
  `templates/` layout line; the `validate <id> --strict` guidance stays correct
  and now matches CI exactly (D6).
- `.claude/skills/qrspi-dogfood/SKILL.md` — `@latest` → `@1.9.0` (D5, optional).

## Lint changes

Check 1 only. Four edits: narration + config exclusions (D2), `.github/` +
`.claude/` scan entries (D3), the `@latest` absence sub-leg (D4), and the
header comment + top-of-file index rewritten to document all of it. No new
check number; Checks 18 and 20 are untouched.

## Migration manifest

`migrations/0.14.0.yaml`: `summary` extended, one automated `edit-file` step,
two manual steps (D7).

## Vertical slices (preview)

Ordering is chosen so no commit is ever transiently red (Q16).

1. **Check 1 is bump-ready, still at 1.4.1.** Exclusions, `.github/`/`.claude/`
   scan, `@latest` sub-guard, reachable coupling branch. *Demo:* lint prints the
   new occurrence set including `ci.yml`; a deliberately wrong `config.yaml`
   value now yields the specific coupling error instead of "distinct versions".
2. **A QRSPI change stays CI-green from stage Q.** Marker lifecycle in
   Q + S, archive check. *Demo:* on a throwaway fixture, run `/qrspi:questions`,
   then `@1.9.0 validate --all` → exit 0; run `/qrspi:structure`, marker gone,
   still 0. (Dogfood `(human)` checkpoint per CLAUDE.md.)
3. **The pin reads 1.9.0 everywhere and both gates are green.** All declaration
   sites flip; `--strict` added; base-spec deltas; README/CONTRIBUTING fixes.
   *Demo:* `node scripts/lint.mjs` and `validate --all --strict` both exit 0.
4. **A consumer on the previous release upgrades cleanly.** Manifest steps +
   CHANGELOG. *Demo:* `/qrspi:update` on a throwaway 0.13.0 fixture bumps
   `config.yaml` and surfaces both manual steps. (Dogfood `(human)` checkpoint.)

## Risks / Trade-offs

- **D1 leans on an upstream marker whose semantics we are stretching.** If
  upstream tightens `skip_specs` (e.g. requires it be absent unless the change
  is declared docs-only), the Q→D window goes red again. Mitigation: the
  fallback (CI narrowing / shell loop) stays available and is a `ci.yml`-only
  change here — but a *consumer-visible* one, which is why it is not the
  default.
- **We are adding a file to every change folder.** Reviewer, archive, and any
  future folder-shape check must tolerate it. Archive already does (*verified by
  reading the skill*); the rest is a stage-I check.
- **`--strict` is verified green only against today's surface.** A future delta
  could fail strict where normal mode passed. Accepted deliberately.
- **Narration exclusion is a small fail-open.** A genuine new pin declaration
  added inside `CHANGELOG.md`/`backlog.md` would go unguarded. Judged
  acceptable: neither file is a plausible home for an invocation, and the
  alternative (an allowlist of pin-declaring files) turns the guard fail-open
  everywhere instead of in two files.
- **The 1.7/1.8/1.9 scenario-counting changes overlap Check 18 and
  `spec-syncer`.** No conflict observable today; recorded as a stage-I
  watch-item and a backlog candidate rather than pre-emptive rework.
- **Unknown:** whether `1.9.0` changed `init --tools none`'s config behaviour
  (Q2). Handled as a stage-I verification task, not an assumption.

## Open questions for the human

- [x] **OQ1 — release-cut intent.** D7 folds the migration steps into the
  unreleased `0.14.0.yaml`. That is correct only if this change lands *before*
  0.14.0 is cut. If you intend to cut 0.14.0 first, this needs its own
  `0.15.0.yaml` instead. Which is it?
  **Answer: this change lands BEFORE 0.14.0 is cut — fold into the existing
  `migrations/0.14.0.yaml` exactly as D7 proposes. Consumers therefore receive
  the pin migration and the `git-host-and-remote-awareness` migration in the
  same release. D7 stands unchanged.**
- [x] **OQ2 — scope of D5's extra line.** Hard-pinning
  `.claude/skills/qrspi-dogfood/SKILL.md` (and therefore adding `.claude/` to
  the scan, D3) is one line beyond the four bundled rows. Keep or strike?
  **Answer: KEEP — hard-pin it too, and keep `.claude/` in Check 1's scan.
  Rationale: it closes the same class of drift the bundle exists to fix, and
  leaving one unguarded `@latest` behind would recreate exactly the
  `fix-openspec-workflow-skill-drift` situation later. D3 and D5 stand
  unchanged; the expected post-change occurrence count of 13 is unaffected
  (the dogfood site becomes the 14th only if it was not already counted — see
  D3's count note and re-verify at Implement).**
- [x] **OQ3 — consumer CI guidance.** Consumers get a *manual* migration step
  telling them to edit their own CI. Should the README additionally publish a
  copy-pasteable `validate` job snippet so there is one canonical string to
  compare against, or is the manual step sufficient?
  **Answer: PUBLISH the snippet. The README gains a copy-pasteable `validate`
  job snippet carrying the pinned version and `--strict` (per D6), so the
  manual migration step becomes checkable-by-diff rather than interpretive.
  This ADDS scope to D9: the README snippet is a new pin site, so it must be
  covered by Check 1 (it lives in `README.md`, already scanned) and listed in
  the README's own "Updating the pinned OpenSpec version" site enumeration.
  See D9's updated body.**
