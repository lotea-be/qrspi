# Questions — kit-quality-hardening

> Stage Q of QRSPI. Generated 2026-06-18.
> Change summary: Harden the QRSPI kit by enforcing sync via CI, single-sourcing the OpenSpec version pin, DRYing stage choreography, adding governance docs, and trimming the redundant opsx surface.

---

*Backlog scope (from `openspec/backlog.md`):*
> **Why:** The kit's core invariant — "`copilot/` is generated, never hand-edited, always in sync" — is enforced only by convention, and at v0.1.0 it has no CI, no governance docs, and duplicated stage choreography. This change converts "correctness depends on a human remembering" into mechanical guarantees and pays down the duplication.
>
> **Likely shape:** 11 numbered findings ranging from CI/Actions to version-pin centralization, DRYing agent/command preambles, `sync-copilot.ps1` hardening, governance docs, precondition unification, tool-grant audit, reference example, artifact-skeleton single-sourcing, and opsx surface removal.

---

This is a tooling-distribution change, not a product/CRUD feature. The sections
below that map to product-specific concerns are marked **Not applicable** so
stage S does not re-litigate them.

---

## Data model

Not applicable — the kit ships markdown files and scripts, not a data store. No
entities, tables, migrations, or FK relationships exist or are introduced by this
change.

## Indexing & query performance

Not applicable — no database or query layer exists in this repo.

## API surface

Not applicable — the kit exposes no HTTP or RPC API. Its "surface" is the set of
slash commands, agents, and skills it ships; those are covered under the
dedicated sections below.

## UI

Not applicable — the kit has no web or desktop UI. Interaction is through the
Claude Code CLI or the Copilot Chat panel.

## Front-end state

Not applicable — no front-end framework or reactive state is involved.

## Migrations & seed data

Not applicable — there is no data store to migrate.

---

## CI / automation (finding #1)

1. The repo has no `.github/` directory. What CI provider should the workflow
   target? Options: (a) GitHub Actions only, (b) another provider the
   contributor already runs (Azure Pipelines, GitLab CI), (c) add a local
   check script only with no hosted CI yet.

2. What trigger set should the sync-drift job use? Options: (a) `pull_request`
   targeting `main` only, (b) every `push` to any branch, (c) PRs + push to
   `main` post-merge, (d) all of the above plus `workflow_dispatch` for manual
   re-checks.

3. The drift check calls `./sync-copilot.sh --check`, which requires `pwsh`
   (PowerShell 7+). GitHub's `ubuntu-latest` runner does not ship `pwsh`; it
   must be set up via `actions/setup-pwsh` or the job must run on
   `windows-latest` where `pwsh` is pre-installed. Which runner is preferred?
   Options: (a) `ubuntu-latest` + `setup-pwsh` step, (b) `windows-latest`,
   (c) matrix over both.

4. Currently `sync-copilot.ps1 -Check` exits `0` even when files differ — the
   `$changed` counter is printed but never surfaced as a non-zero exit code.
   Should CI reliability require fixing this first (make the script exit
   non-zero on drift), and is that fix in scope for this change?

5. What should a frontmatter/name lint job validate? Confirm which of these are
   in scope:
   - Every `claude/agents/*.md` has `name:` and `description:` fields.
   - Every `claude/commands/**/*.md` has a `description:` field.
   - Every `claude/skills/*/SKILL.md` has `name:` and `description:` fields.
   - Every `agent:` reference in a command file resolves to an actual agent file
     under `claude/agents/` or to a built-in name (`build`, `agent`).
   - `model:` fields use aliases (`opus`, `sonnet`, `haiku`), never pinned ids.
   - Referenced skill names in `Load skill X` instructions resolve to an actual
     `claude/skills/<X>/SKILL.md`.

6. Should the lint job be a second step in the same GitHub Actions job as the
   drift check, or a separate parallel job?

7. Is adding a `CODEOWNERS` file or branch-protection rule in scope for this
   change, or a separate future item?

---

## OpenSpec version single-sourcing (finding #2)

8. The version `1.4.1` appears in at least 11 locations (confirmed by grep):
   `claude/commands/init.md` (3x), `README.md` (3x), `openspec/config.yaml`,
   five `generatedBy:` fields in the OpenSpec-generated skills, and
   `.claude/settings.local.json` (3 allowedTools entries). What is the
   desired single-source mechanism? Options:
   (a) A CI lint that counts/compares occurrences and fails if any location
   drifts from the others — no generation step, no new file.
   (b) A `$OpenSpecVersion` constant at the top of `sync-copilot.ps1` that is
   substituted into generated Copilot files during sync; Claude-side files
   (`init.md`, README) remain manually bumped but the authoritative list is
   documented precisely.
   (c) A plain `.openspec-version` file or new `openspecVersion` key in
   `plugin.json` that humans and scripts read from.
   (d) Accept manual discipline for now; just fix the README's false
   "two coupled places" claim with an accurate list of all locations.

9. `README.md` currently references the pin location as
   `claude/commands/qrspi:init.md` — a stale filename (the file is now
   `claude/commands/init.md`). Should fixing this stale reference and expanding
   the "two coupled places" list to all real locations be part of this change,
   regardless of which single-source mechanism is chosen?

10. The `generatedBy: "1.4.1"` metadata in the OpenSpec-generated skill files is
    set by the OpenSpec CLI at generation time. When the pin is bumped those
    files must be regenerated. Should the bump process for those fields be
    documented in `CONTRIBUTING.md` or in the README's "Updating the pinned
    OpenSpec version" section?

---

## Stage choreography DRY refactor (finding #3)

11. The 8 stage command files (`questions.md` through `pr.md`) each contain a
    structurally identical "Commit step" block (ask AskUserQuestion → run git
    add/commit/push) and "Next-stage handoff" block (ask whether to continue).
    Should this be DRYed as:
    (a) A new `qrspi-stage-handoff` skill each command loads and references.
    (b) A shared template snippet in a common file that `sync-copilot.ps1`
    stitches in at generation time — DRY at the source but self-contained in
    `copilot/`.
    (c) Accepted as intentional duplication — each command is self-contained so
    contributors can read one file without following skill links.

12. Beyond commit/handoff, two other patterns repeat across stage commands: (1)
    the Glob-based precondition check ("verify file X exists; if not, tell the
    user to run stage Y"), and (2) the backlog-edit reminder ("backlog edits
    commit atomically with the state change they reflect"). Are these in scope
    for this DRY pass, or is the change limited to the commit/handoff block only?

13. If a new skill is extracted (option a above), should it expand the existing
    `qrspi-workflow` skill file, or be a separate skill file
    (e.g. `qrspi-stage-handoff`)?

---

## "Load skills" preamble DRY (finding #4)

14. All 7 agents open with a "Load skills `qrspi-workflow` and `openspec-workflow`
    (plus stack-cheatsheet if present)" instruction block. The backlog suggests
    factoring this into a single bootstrap step. What form? Options:
    (a) A `qrspi-bootstrap` skill that each agent loads first, which itself loads
    the other two skills (indirection works for Claude Code; Copilot instruction
    files are still referenced manually).
    (b) A shared template snippet that `sync-copilot.ps1` injects at the top of
    each agent's body (DRY at the source, self-contained in generated output).
    (c) Move the load list into `plugin.json` as globally pre-loaded skills, if
    Claude Code's plugin format supports that.
    (d) Accept the duplication as intentional, document in `CONTRIBUTING.md`
    that the preamble must be kept in sync across agents.

15. The researcher agent adds the additional rule "do NOT open
    `openspec/changes/<id>/questions.md`". Does a shared preamble need to carry
    a per-agent exception mechanism, or is that researcher-specific rule always
    in the agent body (not the preamble)?

---

## `sync-copilot.ps1` hardening (finding #5)

> ⮕ Resolved by PQ2: finding #5 is no longer "harden the PowerShell script" — the
> generator is being **ported to Node** (dropping the `pwsh` dependency and the
> `sync-copilot.sh` wrapper). The robustness items below (Q16 source-exists guard,
> Q17 cleanup, Q18 missing-SKILL warning, Q19 per-line diff, Q20 deleted-file
> detection, and body Q4's non-zero exit on drift) carry over as requirements of
> the Node rewrite rather than edits to the `.ps1`.

16. The script calls `Remove-Item $dst -Recurse -Force` before validating that
    `$src` (`claude/`) exists. If the source is missing, `copilot/` would be
    wiped to produce an empty output. Should the guard be: (a) a simple
    `Test-Path $src` check that exits with an error message, (b) a fuller
    validation that `claude/agents/`, `claude/commands/`, and `claude/skills/`
    all exist and are non-empty, or (c) both?

17. In `-Check` mode the temp directory is removed on the last line. Under
    `$ErrorActionPreference = 'Stop'`, a mid-run error exits before that line,
    leaving the temp dir behind. Should the `-Check` body be wrapped in a
    `try/finally` block to guarantee cleanup?

18. When a skill directory under `claude/skills/` has no `SKILL.md`, the current
    code silently returns. The scope calls for a warning instead. Should the
    warning: (a) go to stderr only (non-fatal), (b) increment a counter that
    causes the script to exit non-zero after completing all other work (CI
    catches it), or (c) be an immediate hard throw that aborts the run?

19. The `-Check` diff reports a count of differing files but does not show which
    lines differ within each file. Should per-line diff use PowerShell's
    `Compare-Object` on split lines (pure PowerShell, always available), or
    call the system `diff` command (more readable but not guaranteed on all
    platforms)?

20. Reading the current `-Check` loop: it iterates over files in `$dst` (the
    freshly generated temp tree), so a file that exists in `copilot/` but would
    no longer be generated (i.e. a deleted file) is NOT flagged as drift. Should
    this deleted-file detection gap be fixed in this hardening pass?

---

## Governance: versioning, CONTRIBUTING, CHANGELOG (finding #6)

21. Should `CONTRIBUTING.md` be a new file, or should the relevant content from
    `CLAUDE.md` be moved there (leaving `CLAUDE.md` as a Claude-specific pointer)?
    Or should `CLAUDE.md` remain unchanged and `CONTRIBUTING.md` cover only the
    general contributor rules (semver discipline, sync workflow, template sync)?

22. What semver discipline applies to the plugin version in `plugin.json`?
    Specifically: what change type (bug fix in the script, prompt-text fix, new
    stage command, breaking artifact format change) triggers a patch / minor /
    major bump?

23. Should `CHANGELOG.md` follow Keep a Changelog format (`## [Unreleased]`,
    `## [0.1.0]` sections), or a lighter "release notes in the README" approach?

24. The backlog says to add "a rule tying the plugin version + OpenSpec pin
    together." When the OpenSpec pin is bumped (e.g. `1.4.1` -> `1.5.0`), does
    that always require a `plugin.json` version bump, and if so which semver
    component? Is the inverse true (any plugin bump triggers an OpenSpec pin
    assessment)?

25. Should `plugin.json` `version` be the single authority for the kit version,
    or should there be a separate `VERSION` file?

---

## Precondition checks & error-recovery messaging (finding #7)

26. The 8 stage commands each hand-roll their Glob-based precondition check and
    write their own "run `/qrspi:<prev-stage>` first" message. Should a unified
    pattern be: (a) a shared lookup table in a skill listing each stage, its
    required artifact, and the fallback command, (b) a canonical wording template
    in `CONTRIBUTING.md` that contributors copy-paste when adding a new stage
    (not technically DRY but acceptable at this kit's scale), or (c) left as-is
    (each command is intentionally self-contained)?

27. Several agents restate the same precondition as their command file. For
    example, `qrspi-architect.md` and `structure.md` both check for
    `design.md` existing. Which layer owns the authoritative check -- the command
    (orchestrator) or the agent -- and should the other layer be made to trust
    the first and skip re-checking?

---

## Least-privilege tool audit (finding #8)

28. Current agent tool grants:
    - `qrspi-researcher`: `Read, Write, Edit, Bash, Glob, Grep, Skill` -- the
      agent writes `research.md` fresh (needs Write), but does it ever Edit an
      existing file? If not, `Edit` is unused.
    - `qrspi-planner`: same set -- writes `tasks.md` fresh; `Edit` appears
      unused.
    - `qrspi-questioner`: same set -- writes `questions.md` fresh; `Edit`
      appears unused.
    - `qrspi-designer`: adds `Agent` -- is `Agent` actively used in the designer's
      body to spawn a sub-subagent, or is it a leftover grant?
    - `qrspi-architect`: `Read, Write, Edit, Bash, Glob, Grep, Skill, Agent` --
      `Edit` is used (overwrites existing `proposal.md`/`worktree.md` on re-run);
      `Agent` appears in the backlog as potentially vestigial (the body says
      "read the relevant expert's definition file directly" -- no Agent call found).
    Should the audit: (a) produce a minimal-tools table and apply it in this
    change (edit frontmatter), or (b) produce a minimal-tools table in a comment
    and defer frontmatter edits to a follow-up?

29. If `Edit` is removed from `qrspi-researcher` and `qrspi-planner`, do the
    Copilot-side tool grants (generated by `Map-Tools` in `sync-copilot.ps1`)
    also need to be checked? Currently `Map-Tools` maps `Write|Edit` to
    `edit/editFiles` -- removing `Edit` from an agent whose body never uses it
    also removes the Copilot tool grant. Is that the desired outcome?

---

## Reference example change & CI fixture (finding #9)

30. What content must the reference example contain to serve both as documentation
    (what a fully-worked QRSPI change looks like) and as a CI fixture (exercised
    by `openspec validate <id>`)? Must-haves for `openspec validate`:
    `proposal.md` + `specs/<capability>/spec.md`. Nice-to-haves for
    documentation: `questions.md`, `research.md`, `design.md`, `tasks.md`,
    `worktree.md`. What is the minimum acceptable set?

31. Should the example be: (a) a realistic fictional minimal change (e.g.
    "add-greeting" with invented content), (b) a retrospective of the
    `qrspi-init` bootstrapping work that already happened (predates QRSPI but
    has a real scope), or (c) derived from this very `kit-quality-hardening`
    change after it ships?

32. Where exactly should the reference example live? Options: (a)
    `openspec/changes/archive/YYYY-MM-DD-<example-id>/` (consistent with archive
    format, looks like a real historical change), (b)
    `openspec/changes/example-<id>/` (clearly marked as non-production). Option
    (a) is preferred by the backlog wording.

33. Should `openspec validate <id>` run in CI against the reference example, or
    only as a documented local developer check? If in CI, does it run in the same
    job as the drift check (requires Node.js in the runner)?

---

## Artifact skeleton single-sourcing (finding #10)

34. The canonical artifact shapes live in two active locations: (1) agent inline
    skeletons (e.g. the `proposal.md` skeleton in `qrspi-architect.md`, the
    spec-delta skeleton embedded there, the `worktree.md` skeleton), and (2)
    `openspec-templates/*.template.md`. A third location (per-repo
    `openspec/templates/`) was eliminated by `init.md` already. What is the
    desired single source of truth going forward? Options:
    (a) `openspec-templates/` is authoritative; add a CI check that fails if an
    agent's inline skeleton diverges from the corresponding template.
    (b) The agent inline copy is authoritative; `openspec-templates/` is derived
    (or removed).
    (c) Both remain manually kept in sync; this change adds a note in
    `CONTRIBUTING.md` and a CI heading-level check (confirm the canonical section
    headings appear in both places).
    (d) Remove `openspec-templates/` entirely (agents are the sole source); update
    the README which currently says "canonical templates live in
    `openspec-templates/`".

35. If a CI diff check is added between agent inline skeletons and template files,
    what is a practical extraction strategy given that inline skeletons are
    embedded in triple-backtick fences inside agent markdown? Options: (a) a
    PowerShell script that extracts fenced blocks by language/filename hint and
    diffs them, (b) a simpler heuristic (check that the required section headings
    from the template all appear in the agent file), (c) treat the diff as a
    manual code-review checklist item (no automation).

36. The `openspec-templates/questions.template.md` file -- is it currently used
    by any agent or script at runtime, or purely documentation? (The
    `qrspi-questioner.md` agent says "the shape ships with the QRSPI kit -- there
    is no per-repo template file to read" and carries the shape inline, suggesting
    the template file is currently documentation only.)

---

## Trimming the opsx / openspec-* surface (finding #11)

> ⮕ Resolved by PQ5: drop **all 5** opsx commands (including `opsx/archive.md` and
> `opsx/sync.md`) plus the 3 orphaned skills; keep only the 3 load-bearing
> *skills*. This supersedes Q37's proposed keep-list — the `opsx:archive`/`opsx:sync`
> *commands* are NOT load-bearing (QRSPI's `/qrspi:archive` and the architect call
> the `openspec-archive-change` / `openspec-sync-specs` *skills* directly). Q38
> (clean up the generator's stale opsx table entries) and Q39/PQ6 (user-scope
> sweep via the install scripts) still apply.

37. The scope proposes deleting 5 opsx commands and 3 orphaned skills while
    keeping 3 load-bearing skills. Confirm the intended delete/keep breakdown:
    - Delete commands: `claude/commands/opsx/propose.md`,
      `claude/commands/opsx/explore.md`, `claude/commands/opsx/apply.md`.
    - Delete skills: `claude/skills/openspec-propose/`,
      `claude/skills/openspec-explore/`, `claude/skills/openspec-apply-change/`.
    - Keep commands: `claude/commands/opsx/archive.md`,
      `claude/commands/opsx/sync.md`.
    - Keep skills: `claude/skills/openspec-archive-change/`,
      `claude/skills/openspec-sync-specs/`, `claude/skills/openspec-workflow/`.
    Is `opsx/sync.md` truly load-bearing (is it called by any QRSPI stage
    command), or is it only used interactively and therefore also droppable?

38. `sync-copilot.ps1` references the opsx commands by name in its `$agentFor`
    and `$hintFor` tables (entries for `opsx-propose`, `opsx-explore`, `opsx-apply`,
    `opsx-archive`, `opsx-sync`). After removing the source commands, the
    generated `copilot/prompts/opsx-*.prompt.md` files for the deleted commands
    will disappear on the next sync run automatically. But the stale table entries
    in the script remain. Should they be deleted cleanly or left as commented-out
    stubs for history?

39. The scope says "ensure the removal survives `openspec update`/`init`
    regeneration." The `init.md` command already sweeps project-scope opsx
    tooling (step 3). But if a user's `~/.claude/` (user scope) already has
    `commands/opsx/` and `skills/openspec-*/` from a prior kit install, those
    would not be cleaned by `init.md`. How should user-scope cleanup be handled?
    Options: (a) add an explicit sweep of the deleted files to the install
    script(s) and document the migration in `CHANGELOG.md`, (b) document the
    manual cleanup step only (no script change), (c) bump the plugin version and
    let the marketplace update handle it (the plugin's file list no longer
    includes the deleted files, so the marketplace `update` would uninstall them
    -- confirm whether the marketplace actually does this).

40. Are there any consuming repos or users known to rely on the Copilot-side
    `opsx-*.prompt.md` files that need a deprecation notice before the removal?

---

## Auth & authorization

Not applicable — the kit has no user accounts, roles, or authorization layer.
Repo-level access control (branch protection, CODEOWNERS) is a governance
concern addressed under "CI & drift enforcement" above.

---

## Testing

41. What test strategy is appropriate for a kit that ships markdown files and a
    PowerShell script? Candidates:
    - `./sync-copilot.sh --check` (drift check) -- already planned for CI.
    - `openspec validate <example-id>` on the reference example -- planned.
    - A frontmatter lint script (PowerShell or a GitHub Actions step using
      grep/awk on YAML front matter).
    - Manual smoke test (install the kit locally, run `/qrspi:status` in a
      throwaway repo).
    Are automated unit tests for the sync script's rewrite rules (e.g. Pester
    for `Rewrite-All`, `Map-Tools`, `Apply-Fixups`) in scope, or is the drift
    check sufficient?

42. Should the CI test matrix cover multiple OS runners (ubuntu-latest,
    windows-latest, macos-latest) to confirm `sync-copilot.sh` works on all
    three, or is a single runner sufficient?

---

## Sequencing & scope

43. Should all 11 scope points ship in a single PR (the branch already exists),
    or be decomposed into sequenced changes? Proposed grouping for discussion:
    - Group A (mechanical, low-risk): items #5 (script hardening) + #2 (version
      pin documentation fix) + #8 (tool audit).
    - Group B (CI gates): items #1 (CI drift + lint job).
    - Group C (governance/DRY): items #6 (CONTRIBUTING/CHANGELOG) + #3 (stage
      choreography DRY) + #4 (Load skills preamble DRY) + #7 (precondition
      pattern).
    - Group D (content/surface): items #9 (reference example) + #10 (artifact
      skeleton check) + #11 (opsx trim).
    Is this grouping sensible, or does the human prefer a different cut?

44. Hard dependency check -- confirm or correct:
    - Item #1 (CI) depends on item #4 in question 4 above (exit-code fix in the
      script) to be reliable; the drift check CI job would pass vacuously today
      because the script never exits non-zero.
    - Item #11 (opsx trim) should be done before item #1's lint job is authored,
      otherwise the lint job must account for files that are about to be deleted.
    - Item #9 (reference example) is independent and can ship at any time.

45. Are there scope items the human wants to explicitly cut from this change and
    promote to separate backlog entries? Which of the 11 findings is most
    acceptable to defer?

---

## Open product questions (for the human)

- [x] **PQ1 — Single PR vs. sequenced changes:** Should all 11 scope points ship
  in one PR (branch already exists), or be split into multiple sequenced changes?
  Options: (a) single PR -- all 11 findings together; (b) two PRs -- Group A+B
  (script hardening + CI) first, then Group C+D (governance + opsx + content);
  (c) three or more PRs -- CI, governance/DRY, and opsx-trim each separate;
  (d) decide per finding after seeing design.md.
  **Answer: (d). Keep one change folder for now; stage D recommends whether to
  split/sequence once the design surfaces dependencies.**

- [x] **PQ2 — Sync generator language (reframed from "CI runner"):** The
  awkward part is the PowerShell dependency, not the CI runner. How should the
  generator be handled? Options considered: keep PowerShell (CI uses
  `ubuntu-latest`, which *does* ship `pwsh`); port to bash; port to Node.
  **Answer: Port the generator to Node. Rationale: Node is already a hard
  dependency of the kit (everything runs through `npx @fission-ai/openspec`), so
  a Node generator adds no new dependency and removes both the `pwsh`
  requirement and the `sync-copilot.sh` → `pwsh` wrapper. CI then runs on plain
  `ubuntu-latest` with no setup step. THIS SUPERSEDES finding #5's "harden the
  .ps1" framing — see the reconciliation note in the `sync-copilot` section
  above. The drift-check must still exit non-zero on drift (body Q4) and detect
  deleted files (body Q20); those carry over to the Node rewrite.**

- [x] **PQ3 — Version single-sourcing mechanism:** How should the `1.4.1` pin be
  kept in sync across its ~11 occurrences? Options: (a) a CI lint that compares
  all occurrences and fails on drift; (b) a version constant in the generator
  substituted into generated files; (c) a plain `.openspec-version` file or new
  `openspecVersion` key in `plugin.json`; (d) accept manual discipline and just
  fix the README's false "two coupled places" claim.
  **Answer: (a) CI lint that asserts every real occurrence agrees and fails on
  drift. Also fix the README's false "two coupled places" claim AND its stale
  `claude/commands/qrspi:init.md` path (now `claude/commands/init.md`). Exclude
  the auto-managed `generatedBy:` lines from the lint. Depends on CI existing
  (PQ2 keeps CI in scope).**

- [x] **PQ4 — Stage choreography DRY approach:** For the repeated commit/handoff
  block across 8 stage commands (finding #3) and the "Load skills" preamble
  across 7 agents (finding #4), which approach is preferred? Options: (a)
  extract to a referenced skill; (b) DRY at the generator level only; (c) accept
  the duplication; (d) defer.
  **Answer: (a) Extract to a referenced skill. Move the canonical commit/handoff
  description and the bootstrap/"load skills" step into `qrspi-workflow` (or a
  new `qrspi-stage-handoff` / `qrspi-bootstrap` skill); commands and agents
  reference it, trimming the inline duplication. Note the constraint that Claude
  command files have no runtime include — stage D should settle exactly how much
  collapses to a reference vs. stays inline.**

- [x] **PQ5 — opsx surface removal:** Should all 5 opsx commands and the 3
  orphaned skills be removed? Options: (a) drop all 5 opsx commands + 3 orphaned
  skills; (b) keep `opsx:explore`; (c) keep `opsx:archive` and `opsx:sync` as
  aliases, drop only propose/explore/apply; (d) defer.
  **Answer: (a) Drop ALL 5 opsx commands AND the 3 orphaned skills
  (`openspec-propose`, `openspec-explore`, `openspec-apply-change`); keep the 3
  load-bearing skills (`openspec-workflow`, `openspec-archive-change`,
  `openspec-sync-specs`). Confirmed safe: the orphaned skills have zero non-opsx
  references; QRSPI's own `/qrspi:archive` and the architect use the *skills*
  directly, not the `opsx:archive`/`opsx:sync` *commands*; remaining references
  (README, init.md prose, plugin.json glob, sync-script tables) are doc/cleanup
  edits; `init.md` step 3 already prunes project-scope regeneration. THIS
  OVERTURNS body Q37, which proposed keeping `opsx/archive.md` and `opsx/sync.md`
  — see the reconciliation note in the opsx section above.**

- [x] **PQ6 — User-scope cleanup after opsx removal:** How should existing
  installs clean up the deleted files? Options: (a) add an explicit sweep to the
  install scripts + document in CHANGELOG; (b) document only; (c) rely on the
  marketplace update.
  **Answer: (a) Add an explicit sweep of the deleted files to `install.ps1` /
  `install.sh` (Copilot `~/.copilot` scope) and document the migration in
  `CHANGELOG.md`. The Claude plugin side self-cleans on `marketplace update`
  because the plugin directory is replaced wholesale.**

- [x] **PQ7 — Reference example:** What form should the reference example change
  take? Options: (a) hand-authored minimal fictional change with full artifact
  set; (b) validate-only `proposal.md` + `specs/` fixture; (c) retrospective of
  the qrspi-init work; (d) defer.
  **Answer: (a) A hand-authored minimal fictional change with the full artifact
  set, placed under `openspec/changes/archive/` so it doubles as end-to-end
  documentation AND a CI `openspec validate` fixture.**

- [x] **PQ8 — Artifact skeleton strategy (finding #10):** How to resolve the
  duplication between agent inline skeletons and `openspec-templates/`? Options:
  (a) keep both + CI heading-level check; (b) agents sole source; (c) templates
  authoritative + CI fenced-block diff; (d) accept duplication.
  **Answer: (a) Keep both. Agents keep their inline skeletons (needed so the
  subagents stay self-contained), `openspec-templates/` stays as the canonical
  human-readable reference, and CI adds a heading-level check that the canonical
  section headings appear in both places.**

- [x] **PQ9 — CONTRIBUTING.md:** Should a `CONTRIBUTING.md` be added? Options:
  (a) new `CONTRIBUTING.md`, `CLAUDE.md` stays Claude-specific; (b) expand
  `CLAUDE.md` only; (c) consolidate into `CONTRIBUTING.md` and reduce `CLAUDE.md`
  to a pointer.
  **Answer: (a) Add a new `CONTRIBUTING.md` for human-readable contributor rules
  (semver discipline, the sync workflow, the version-bump checklist); `CLAUDE.md`
  stays as Claude-specific guidance.**
