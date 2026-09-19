# Questions — bump-openspec-pin

> Stage Q of QRSPI. Generated 2026-08-14.
> Change summary: Bump the kit's pinned `@fission-ai/openspec` from `1.4.1` to
> `1.9.0` across every hand-maintained pin site plus `openspec/config.yaml`,
> taken up as one QRSPI run with the three bundled Tier-1 pin-family rows —
> extend Check 1 (`checkPinAgreement`) to scan `.github/`, fix the
> `openspec-workflow` skill's `@latest` drift, and simplify the unreachable
> `configVersion !== agreedPin` branch inside Check 1.

<!-- Surface-gated sections: emit each section below only when its
     controlling surface is present for this repo, per the repo-surface
     skill mapping. Omit the heading entirely when the surface is absent
     (no heading, no "Not applicable").

     Surfaces present (from qrspi-stack ## Repo surface):
       slash-command      -> ## Slash-command surface
       skill               -> ## Skill surface
       lint-gate           -> ## Lint-gate surface
       migration-manifest  -> ## Migration manifest

     stage-agent and template are present as taxonomy but carry no content
     for this change (no agent file references the pin; no
     openspec-templates/ file references the pin) -- omitted per the
     "surface present but no content" rule (omit when the section itself
     would be empty).
     data-store, http-api, ui, auth, typed-nullable are absent for this repo.
-->

## Slash-command surface

1. `claude/commands/init.md` carries three `@fission-ai/openspec@1.4.1`
   invocations (lines ~22, 28, 41) plus a fourth site: the inline
   `openspec/config.yaml` snippet it writes (line ~81, `openspec_version:
   1.4.1`). Are all four sites bumped mechanically to `1.9.0` in one pass, or
   does the config-snippet site need special handling because it is *authored
   text describing a file format* rather than a live invocation?

2. `claude/commands/init.md` line ~47 states "As of CLI v1.4.1, `--tools none`
   does not create `openspec/config.yaml`." This is a factual claim about CLI
   behavior tied to a specific version. Does the 1.5→1.9 changelog review (the
   spike) need to re-verify this claim still holds at 1.9.0, and if the
   behavior changed, does the surrounding step-b/step-c prose in `init.md`
   need a rewrite beyond the version-number substitution?

3. Is there a lint or doc-coverage check that would catch a missed
   `@fission-ai/openspec@1.4.1` occurrence in `init.md` if the bump misses
   one of the four sites, or does correctness rely entirely on Check 1's
   "all occurrences agree" assertion (which only fires post-edit, not
   pre-edit guidance)?

## Skill surface

4. `claude/skills/openspec-workflow/SKILL.md` lines 48-49 use
   `npx @fission-ai/openspec@latest init` / `@latest update` — verified to
   escape Check 1's `openspec@<semver>` regex entirely (the regex requires
   `\d+\.\d+\.\d+` after `@`, and `latest` does not match). Once these become
   a hard pin (`@1.9.0`), do they get folded into Check 1's tracked
   occurrence set automatically (since they'll now match the regex), or does
   the fix also need a self-test fixture asserting `@latest` no longer
   appears anywhere in this file (a regression guard distinct from Check 1's
   agreement check, since Check 1 can't assert *absence* of a pattern it
   doesn't match)?

5. The same skill file carries a stale `openspec/templates/` layout entry
   (the backlog row says the real path differs). What is the current,
   correct path this entry should point to, and is it `openspec-templates/`
   at the repo root (as used elsewhere in this file's own section-to-surface
   mapping) or something else?

6. `.claude/skills/qrspi-stack/SKILL.md:80` references "pinned version
   (`@fission-ai/openspec@<version>`)" generically, with no literal version
   number. Does this site need any edit as part of the bump, or is it
   correctly version-agnostic prose that Check 1 does not (and should not)
   track?

## Lint-gate surface

> ⮕ Resolved by PQ3: the `configVersion !== agreedPin` branch is
> **restructured, not removed** — Q9 and Q10 are the live design questions;
> Q11's removal leg is moot (fixture B is retained).

7. Check 1 (`checkPinAgreement`) currently scans three top-level directories
   (`claude/`, `openspec/`, `openspec-templates/`) plus non-recursive
   root-level files, explicitly skipping `openspec/changes/`. Extending it to
   `.github/` — is `.github/` added as a fourth entry in the same `for (const
   dir of [...])` loop (full recursive `scanDir`), or does it need the same
   "don't recurse into changes/"-style exclusion for anything under
   `.github/` (e.g. should `.github/ISSUE_TEMPLATE/` or other subdirs be
   excluded, or does `.github/` contain nothing that would produce a false
   positive)?

8. The backlog row for `scan-github-ci-openspec-pin` says "a one-line
   addition to the check's file list, plus a fixture." Given Check 1 has no
   existing directory-scan self-test (its only self-test is the three
   in-memory `extractConfigVersion` fixtures for the config-coupling
   assertion), what does "a fixture" mean here — a new in-memory self-test
   exercising the `.github/`-scan code path, or is the fixture simply
   `.github/workflows/ci.yml` itself (a real repo file that, once scanned,
   either agrees or disagrees with the pin — i.e., the "fixture" is
   incidental, not authored)?

9. The unreachable-branch row (`simplify-pin-coupling-mismatch-branch`) says
   a wrong `openspec/config.yaml` version is caught first by "the
   pre-existing multi-version scan" because `config.yaml` is *also* picked up
   by the general `scanFile`/`found` collection (its `openspec_version:`
   line matches the same `pinRe` used for `@fission-ai/openspec@` sites) —
   which means every disagreement produces a generic "distinct versions"
   error before the dedicated `configVersion !== agreedPin` branch can ever
   fire. To "restructure so `config.yaml` is validated solely through the
   coupling assertion" (the row's second option), does `config.yaml` need to
   be added to the `isUnderChanges`-style exclusion list in `scanFile` (so
   its `openspec_version:` line is no longer counted in the general `found`
   array), leaving the dedicated coupling assertion as the *only* place that
   reads `config.yaml`'s value?

10. If Check 1's `scanFile` is changed to exclude `openspec/config.yaml` from
    the general scan (per Q9), does that change what "all pin occurrences
    agree" means when `config.yaml` currently agrees — does the `found.length
    === 0` zero-pin branch, or any other branch, depend on `config.yaml`
    being counted as one of the `found` occurrences?

11. `checkPinAgreement`'s three in-memory self-test fixtures (absent /
    wrong-value / agrees) exist specifically to guard the
    `extractConfigVersion` extractor used by the coupling assertion. If the
    `configVersion !== agreedPin` branch is removed entirely (the first
    option in the backlog row) rather than restructured, do fixture B
    ("wrong value") and its assertion become dead code that must be deleted
    alongside the branch, or does fixture B still guard something else (the
    extractor itself, independent of which branch consumes its result)?

## Migration manifest

12. `plugin.json` currently reports `version: 0.13.0`, but `migrations/`
    already ships `0.14.0.yaml` (unreleased — the archived
    `git-host-and-remote-awareness` change's manifest, staged for the next
    release cut, per CLAUDE.md's "version bumps only at release time" rule).
    Since migration filenames are the **kit's own** SemVer (not the OpenSpec
    CLI's), does this change's `config.yaml` edit-file step land in a *new*
    `migrations/0.15.0.yaml` file, or does it get folded into the existing
    unreleased `0.14.0.yaml` (adding a second `automated` entry to a manifest
    another change already authored)?

13. The `edit-file` schema's closed edit-pattern vocabulary includes `find` +
    `replace` (first occurrence) and `find_all` + `replace` (all
    occurrences). `openspec/config.yaml`'s `openspec_version: 1.4.1` line is
    a single, unique occurrence in that file. Is `find: "openspec_version:
    1.4.1"` / `replace: "openspec_version: 1.9.0"` sufficient, or does the
    step need `skip_if_contains: "openspec_version: 1.9.0"` for idempotent
    replay (per the optional idempotency fields), given a consumer might
    re-run `/qrspi:update` after already hand-editing their config?

14. The migration-manifest walk (`qrspi-update` skill) only ever touches
    files under `openspec/` (a hard-coded guard: "Every automated `path` is
    `openspec/`-scoped... path must start with `openspec/`. Any path that
    does not is rejected"). `openspec/config.yaml` satisfies this, but does
    the migration manifest for this bump need *any* automated step for the
    other pin sites (README, CONTRIBUTING, init.md, ci.yml,
    openspec-workflow skill) — or are those kit-repo-local files that a
    consumer never has a copy of, making `config.yaml` the *only* file a
    consumer-side migration step could possibly touch?

15. Given Q14, are the four kit-repo-local pin sites (README, CONTRIBUTING,
    `init.md`, `ci.yml`) purely a same-PR mechanical edit with no migration
    manifest involvement at all — i.e., does "add a migration-manifest
    edit-file step" apply exclusively to `config.yaml`, confirming the
    backlog row's phrasing ("bump every hand-maintained site... **and**
    `openspec/config.yaml`'s `openspec_version`, plus add a migration-manifest
    `edit-file` step for `config.yaml`") already scopes it that way?

## Testing

16. `node scripts/lint.mjs` is the sole automated harness. After the bump,
    does Check 1 pass cleanly on the first run (all occurrences now read
    `1.9.0`), or does the `.github/` scan extension (Q7-Q8) and the
    unreachable-branch simplification (Q9-Q11) need to land and be
    self-consistent *before* the version bump itself is applied, to avoid a
    transient state where Check 1 fails for a reason unrelated to the pin
    value?

17. Is there a way to smoke-test the four `npx --yes @fission-ai/openspec@1.9.0
    validate --all` / `init --tools none` invocations locally (e.g. running
    them against a scratch directory) before merging, to confirm the pinned
    CLI version actually exists on npm and behaves as `init.md`/`README.md`
    describe, or does this change rely solely on the spike's changelog read
    plus CI's `ci.yml` run (which itself uses the bumped pin) as the
    verification?

18. Does the spike's changelog assessment (1.5→1.9) need to produce any
    artifact beyond `research.md` findings — e.g. should a finding that
    changes delta-spec grammar or `validate` behavior surface as a new
    scenario in `openspec/specs/**` (if QRSPI has a spec describing the
    OpenSpec dependency contract), or is a research-stage note sufficient
    since this is a dependency-version bump, not a QRSPI capability change?

## Sequencing & scope

> ⮕ Resolved by PQ1 + PQ2: the target version is **fixed at 1.9.0
> unconditionally** and any breaking-change adaptation is **absorbed into
> this change**. Q20's "slip to a safe intermediate" and "spawn a separate
> idea" legs are therefore closed — only its *mechanism* half stays live
> (how the discovery gets recorded and routed). PQ6 bounds the absorbed
> scope.

19. This change is the head of the road-to-1.0 runway (Tier 1), explicitly
    sequenced ahead of Tier 2 (`lint-auto-mode-gate-coverage` +
    `plan-emits-changelog-task` + `pr-stage-open-issue-triage`) and Tier 3
    (`spec-anchored-code-comments`). Does landing this change have any
    structural prerequisite on those later tiers (e.g. does
    `plan-emits-changelog-task`'s planned CHANGELOG-task convention need to
    exist before this change's own CHANGELOG entry can be planned via the
    normal QRSPI planner flow), or is this change fully independent and free
    to proceed first as the runway ordering intends?

20. If the spike (research stage) finds a breaking grammar or `validate`
    behavior change between 1.5 and 1.9 that would require rewriting parts of
    the kit beyond the mechanical pin-and-lint edits (e.g. a delta-spec
    template change), does that discovery grow *this* change's scope, or
    does it spawn a *new*, separate backlog idea and this change either (a)
    slips to a safe intermediate version short of 1.9.0, or (b) proceeds with
    1.9.0 and defers the grammar-adaptation work? (See PQ2 below — this
    technical question is about *mechanism*: how the discovery gets recorded
    and routed, not which choice is made.)

21. `openspec/config.yaml`'s header comment states `openspec_version` is
    "informational only — OpenSpec reads just `schema`/`context`/`rules` and
    ignores any other top-level key." Given that, is the entire
    `openspec_version` field (and by extension Check 1's config-coupling
    assertion, and this bump's `config.yaml` edit) purely a QRSPI-internal
    drift guard with zero effect on OpenSpec CLI behavior itself — i.e., does
    bumping this field carry any functional risk, or is it pure bookkeeping
    that the spike does not need to worry about?

## Open product questions (for the human)

- [x] **PQ1 — target version, 1.9.0 vs. an intermediate:** The bundle's
  premise is bumping straight to `1.9.0` (latest, verified 2026-08-14). If
  the spike (PQ2) surfaces breaking grammar/`validate` changes concentrated
  in a specific later minor (e.g. only 1.8→1.9 changed something risky),
  should the fallback be "stop at the last safe minor" or "absorb the fix and
  still land on 1.9.0"? This decision gates PQ2's disposition — answering it
  now sets the policy the spike will apply if it finds something. Options:
  (a) Always land on 1.9.0 (latest) regardless of what the spike finds —
  absorb any needed grammar/validate fixes into this change's scope,
  (b) Land on 1.9.0 if the spike finds nothing breaking; if it finds
  something breaking, stop at the newest minor below the break and defer the
  rest as a new backlog idea, (c) Land on 1.9.0 only if the spike finds
  nothing breaking at all; any breaking finding, however small, means this
  change stops at 1.4.1 (no bump) until a follow-up change addresses it.
  **Answer: (a) — always land on 1.9.0 regardless of what the spike finds;
  absorb any needed grammar/`validate` fixes into this change's scope. The
  public v1.0.0 freezes on this pin, so a partial bump to a "safe
  intermediate" would re-open the pin question immediately after the freeze
  — exactly the outcome the runway sequencing exists to prevent. The spike
  therefore becomes a *scoping* input (how much adaptation work does 1.9.0
  cost?), not a *go/no-go* gate on the target version. See PQ6 for how far
  the absorbed adaptation reaches.**

- [x] **PQ2 — spike-breaking-finding disposition:** If the 1.5→1.9 changelog
  review turns up a genuine breaking change to delta-spec grammar or
  `validate` behavior, should that finding become in-scope work absorbed
  into this same change (the item "grows" per the backlog row's own
  language), or should it be spun out as a new, separate backlog idea while
  this change either slips its target version (per PQ1) or is deferred
  entirely until the new idea lands? This is a real fork in how the
  Research stage's output gets routed — it determines whether Design (D)
  proceeds against a wider or narrower scope.
  **Answer: absorb the breaking finding into *this* change — the item
  "grows" per the backlog row's own language rather than spinning out. This
  follows directly from PQ1(a): if the target version is fixed at 1.9.0
  unconditionally, the adaptation work has nowhere else to go, and deferring
  it would ship a knowingly-broken pin. Consequence for Design: this
  change's scope is not fully known until the spike (stage R) reports, so
  D must be prepared to widen S/V/P beyond the mechanical pin-and-lint
  edits. PQ6 bounds how far that widening reaches.**

- [x] **PQ3 — unreachable Check 1 branch: remove vs. restructure:** The
  backlog row for `simplify-pin-coupling-mismatch-branch` offers two
  options — remove the dead `configVersion !== agreedPin` branch outright
  (since the pre-existing multi-version scan already catches a wrong
  `config.yaml` value first), or restructure `checkPinAgreement` so
  `config.yaml` is excluded from the general scan and validated *solely*
  through the coupling assertion (making the dedicated, more actionable
  error message the one that actually fires). The restructure is more work
  (touches `scanFile`'s exclusion logic, per Q9-Q10) but produces a better
  error message for the one failure mode it's designed for. Options:
  (a) Remove the branch — delete the dead `configVersion !== agreedPin` code
  and its now-unnecessary fixture B; simplest, lowest-risk, matches the
  row's stated title ("simplify"), (b) Restructure — exclude
  `openspec/config.yaml` from the general pin scan (`scanFile`'s
  `isUnderChanges`-style skip list) so the coupling assertion is the sole
  validator of that file, surfacing its specific, more actionable message
  instead of the generic "distinct versions" error.
  **Answer: (b) Restructure — exclude `openspec/config.yaml` from the
  general pin sweep (per Q9) so a wrong `openspec_version` no longer trips
  the generic "distinct versions" error first, leaving the coupling
  assertion as its sole validator and letting its specific, actionable
  message actually reach the user. Chosen over removal because the branch's
  *message* is worth having — deleting it would permanently settle for the
  vaguer error on the one failure mode the coupling guard was built for.
  Fixture B is retained (it guards the extractor, which the restructured
  path still depends on — see Q11). Scope note: this makes Q9 and Q10 the
  live design questions and moots Q11's removal leg.**

- [x] **PQ4 — `@latest` in `openspec-workflow/SKILL.md`: hard pin vs.
  Check-1-aware exemption:** The two `@latest` references
  (`init`/`update` invocations) currently escape Check 1's regex entirely.
  Should they become a hard pin (`@1.9.0`, matching every other site and now
  tracked by Check 1 like the rest), or is `@latest` semantically correct
  there — a piece of user-facing documentation showing "how to manually
  refresh OpenSpec agent guidance," where always fetching the newest CLI is
  the intended behavior — in which case the fix is only the stale
  `openspec/templates/` path (Q5), and Check 1 should gain an explicit,
  documented exemption for this file rather than a bump? Options:
  (a) Hard pin `@1.9.0`, consistent with every other site — Check 1 now
  guards this file like the rest; any future bump touches it too,
  (b) Keep `@latest` deliberately (it is user-run guidance for refreshing to
  the newest CLI, not the kit's own bootstrap invocation) — fix only the
  stale template-path line, and document the exemption inline so it reads as
  intentional rather than drift, (c) Keep `@latest` but change it to
  `@^1.9.0` or similar range syntax if OpenSpec/npx supports it, splitting
  the difference between "always latest" and "pinned."
  **Answer: (a) Hard pin `@1.9.0`, consistent with every other site — Check 1
  then guards this file like the rest and any future bump touches it too.
  Confirmed by the human; also what the backlog row's Shape line already
  specified ("change both `@latest` mentions to the pinned version, matching
  Check 1's guarded pin"), with no exemption proposed anywhere in the row.
  Q4 remains live: whether an absence-guard is additionally needed, since
  Check 1 can only assert agreement among patterns it matches, never the
  absence of `@latest`.**

- [x] **PQ5 — CHANGELOG entry shape:** CLAUDE.md requires a `##
  [Unreleased]` CHANGELOG entry for any change to shipped kit behavior. This
  bundle touches four backlog rows' worth of surface (the pin bump itself,
  the `.github/` scan extension, the skill drift fix, and the Check 1
  branch simplification). Should this land as one combined bullet under
  `### Changed` describing the whole pin-family bundle, or as separate
  bullets — one per bundled row — so each is independently
  greppable/citable later? Options: (a) One combined bullet — "Bumped the
  OpenSpec CLI pin from 1.4.1 to 1.9.0 (Check 1 now scans `.github/`; the
  `openspec-workflow` skill's stale `@latest`/template references are
  fixed; the unreachable Check-1 branch is simplified)" — mirrors how the
  bundle is described as one QRSPI run everywhere else, (b) Four separate
  bullets, one per backlog row, all under the same `### Changed` heading —
  more granular, easier to cite an individual fix later, (c) Split across
  `### Changed` (the pin bump + `.github/` scan) and `### Fixed` (the skill
  drift + unreachable branch), since two of the four are arguably bug fixes
  rather than feature changes.
  **Answer: (a) One combined bullet under `### Changed`, with sub-bullets
  per bundled row — mirrors the existing `git-host-and-remote-awareness`
  CHANGELOG entry's shape (one bolded top-level bullet, indented sub-bullets
  per facet), which is the established convention in this repo's own
  `## [Unreleased]` section for a multi-row bundle landing as one QRSPI
  run. Confirmed by the human.**

- [x] **PQ6 — absorbed-adaptation blast radius** *(emergent follow-up, raised
  from the PQ1(a) + PQ2 pairing)*: fixing the target at 1.9.0 and absorbing
  any breaking-change fix leaves this change's scope open-ended. If the
  spike finds a delta-spec grammar or `validate` behaviour change, how far
  does the absorbed adaptation reach? Options: (a) kit source + a
  consumer-side migration step, (b) kit source and this repo's own specs
  only, spinning consumer migration out as a new idea, (c) the generation
  surface only (`openspec-templates/` + stage agents), leaving existing
  specs alone, (d) leave the boundary open and decide at D once the spike
  has reported.
  **Answer: (a) — kit source **and** a consumer-side migration step. Adapt
  the kit's own spec templates/agents, and ship a migration-manifest step so
  existing consumer repos' specs are carried forward rather than left broken
  on upgrade. This is consistent with the change already owning a
  `config.yaml` migration step (Q13-Q15), and the manifest's
  `openspec/`-scoped path guard accommodates spec files. Consequence: the
  migration-manifest questions (Q12-Q15) may need to cover more than the
  single `config.yaml` step they currently assume — revisit their scope at D
  once the spike has reported.**
