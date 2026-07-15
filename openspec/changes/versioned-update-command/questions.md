# Questions — versioned-update-command

> Stage Q of QRSPI. Generated 2026-07-15.
> Change summary: Add a version marker to QRSPI-initialized (consuming) repos so they know which plugin version they are on, plus a new `/qrspi:update` command and backing skill that walks the repo from its recorded version to the current plugin version using a per-version migration/checklist manifest, then bumps the marker.

This is a **kit-tooling and workflow change** — it adds a new command, a new skill, a new manifest artifact, and an install-time marker to the kit itself, and changes what `qrspi:init` (and potentially the release flow) must do. The standard Data model / Indexing / API / UI / Front-end state / Migrations sections are **Not applicable** — kept as headings so stage S does not re-litigate — and replaced with sections that fit this cross-cutting infrastructure change.

---

## Scope guard (explicit out-of-scope)

The following topics are **explicitly out of scope** for this change. Questions about them MUST NOT be raised at stage S:

- **Read-boundary narrowing itself.** The behavioral change that restricts which files each stage agent may read is part of the sibling change `tighten-stage-read-boundaries`, not here. This change provides only the update/migration infrastructure that `tighten-stage-read-boundaries` needs to be safely deployed to consumers.
- **Per-change scheduled triggers** in consuming-repo `openspec/` base specs. Those stay in base specs per `tighten-stage-read-boundaries`'s own scope decisions.
- **Copilot-specific gate analogues.** Whether Copilot's runtime has an interactive update mechanism is deferred to `reassess-copilot-port`.

---

## Data model — Not applicable

No entities, tables, or DTOs. The closest analogue is the version marker (a file or field in the consuming repo's `openspec/`) and the migration manifest (a file in the kit source). Both are covered under dedicated sections below.

## Indexing & query performance — Not applicable

## API — Not applicable

No HTTP surface. The "API" is the slash-command surface (`/qrspi:update`) and the manifest format the skill reads, both covered below.

## UI — Not applicable

## Front-end state — Not applicable

## Migrations & data — Not applicable

No data migration in the traditional sense. The analogue (what a consuming repo must do when it bumps the plugin) is the purpose of this entire change, and is covered under "Update walk & migration manifest" and "Consuming repo integration" below.

---

## Version marker (consuming repo)

1. **Where does the version marker live in a consuming repo?** The marker records which qrspi plugin version the repo is currently on. Enumerate the options and their trade-offs:
   - (a) A dedicated file, e.g. `openspec/.qrspi-version` (plain text, one line: `0.5.0`). Advantages: Glob-readable, no coupling to other files, easy to diff. Disadvantage: a new file to explain to consumers.
   - (b) A field in `openspec/config.yaml`, e.g. `qrspi_version: 0.5.0`. Advantages: already exists (created by `/qrspi:init`), co-located with other OpenSpec config. Disadvantage: `config.yaml` is described as a QRSPI sentinel; coupling a runtime-mutable field to it may confuse the "is-initialized" check.
   - (c) A field in `openspec/backlog.md` (e.g. a header comment or metadata block). Advantage: single file. Disadvantage: `backlog.md` is a prose list; adding metadata fields breaks its format conventions.
   - (d) No file in the consuming repo — the marker lives somewhere else (e.g. in a plugin-managed settings file the Claude Code plugin infrastructure already provides). Confirm whether such a mechanism exists before ruling this out.
   Which option is chosen, and what is the exact path and key name?

2. **What exactly does the marker record — the plugin.json `version` string, the marketplace tag ref, or something else?** The kit uses `plugin.json` `version` as its single source of truth (e.g. `0.5.0`). The marketplace entry pins to a tag ref (e.g. `v0.5.0`). Are these always in sync? Could a consuming repo be on `v0.5.0` tag but with a different `plugin.json` version if the tag was cut mid-PR? Confirm the exact string format the marker stores.

3. **When is the marker written in a consuming repo?** Three candidate moments exist, and they are not mutually exclusive:
   - At `/qrspi:init` time (first installation). If the marker is not written here, a repo initialized before this change shipped has no marker and `/qrspi:update` must handle the "no marker present" case.
   - On each successful `/qrspi:update` completion (the marker is bumped to the new version after the update walk finishes).
   - Any other moment (e.g. a `/qrspi:status` command that detects drift and offers to write the marker). Confirm all moments.

4. **How does `/qrspi:update` determine the "current plugin version" to update TO?** The plugin is installed via the marketplace and the kit's own `plugin.json` carries the version, but the running agent may not have a direct path to read `plugin.json` in the kit's installed location. Options:
   - (a) The skill reads the version from the plugin's installed `plugin.json` (requires knowing the install path, e.g. `~/.claude/plugins/cache/lotea-agents/qrspi/<version>/`). Is this path stable and readable across machines?
   - (b) The `qrspi:update` command receives the target version as an argument (the human types `/qrspi:update 0.6.0`).
   - (c) The manifest file (see "Update walk & migration manifest") embeds a "latest known version" header, and the command uses that.
   - (d) Some other mechanism (e.g. the skill fetches the latest release from the GitHub API).

5. **What happens when the consuming repo's marker version is ALREADY at the current plugin version?** The command should gracefully report "already up to date" without walking any migration steps. Confirm the exact behavior and output in this case.

6. **What happens when the consuming repo has NO marker at all?** This will be the initial state for all repos initialized before this change ships. Options:
   - (a) Treat "no marker" as "version 0.0.0" and walk all migration steps from the beginning.
   - (b) Treat "no marker" as "unknown" and ask the human to specify their current version before proceeding.
   - (c) Ask the human if they want to initialize the marker to the current plugin version (assuming they are already up to date) and skip the walk.
   - (d) Refuse and explain how to bootstrap the marker.
   Which option prevents data loss while remaining usable?

7. **What happens if the marker records a version HIGHER than the current plugin version (downgrade scenario)?** This could happen if a consumer ran `/qrspi:update` against a pre-release or if they downgraded. Options:
   - (a) Hard-stop and warn the human.
   - (b) Silently skip (treat as up-to-date).
   - (c) Walk the migration manifest in reverse (if reversible steps exist).
   Confirm the expected behavior and whether reverse migrations are in scope.

---

## Update walk & migration manifest

8. **What is the "walk" strategy — step-by-step through each intervening version, or one cumulative jump?** If the consumer is on `0.4.0` and the kit is now `0.6.0`, does `/qrspi:update` apply `0.5.0`'s migration steps first, then `0.6.0`'s? Or does it present a single merged "what changed between 0.4.0 and 0.6.0" checklist? Consider:
   - Step-by-step preserves the order of intermediate changes and catches inter-version dependencies.
   - Cumulative jump is simpler to implement but loses ordering guarantees if two versions touched the same artifact.
   Which strategy is chosen?

9. **Is `/qrspi:update` interactive (asks questions per step) or report-only (prints a checklist the human works through manually)?** Options:
   - (a) Fully interactive: the command presents each migration step and waits for the human to confirm/complete before moving to the next.
   - (b) Report-only: the command prints the full checklist of what to adapt/verify and exits; the human applies changes manually.
   - (c) Hybrid: the command applies any *mechanical* changes it can (e.g. editing a marker file, updating a field in `config.yaml`) and lists the *judgment* steps (e.g. "review your `questions.md` template for stage R changes") for the human.
   Note that option (a) implies the skill can make file edits in the consuming repo; option (b) means the skill is read-only.

10. **What does `/qrspi:update` actually DO to a consuming repo?** Enumerate the candidate actions:
    - (a) Edit files in the consuming repo (e.g. patch `openspec/config.yaml`, remove stale command stubs, etc.). Requires explicit permission from the human.
    - (b) Print a diff or checklist of required manual changes only.
    - (c) Run `node sync-copilot.mjs` in the consuming repo (if the consuming repo has its own Copilot artifacts). Note: consuming repos typically do NOT have `sync-copilot.mjs`; that is kit-repo tooling.
    - (d) Re-run `npx @fission-ai/openspec@<new-version> update` if the OpenSpec pin changed between versions.
    - (e) Commit the marker file bump on behalf of the human.
    Which actions are in scope, and which require explicit human confirmation?

11. **Where does the migration manifest live, and what format does it use?** Options for location:
    - (a) A new top-level directory in the kit, e.g. `migrations/` or `changelog-migrations/`, with one file per version (e.g. `migrations/0.6.0.md`).
    - (b) A single file, e.g. `migrations.yaml` or `update-manifest.md`, with one section per version.
    - (c) Embedded in `CHANGELOG.md` using a machine-readable convention (e.g. a `### Migration` subsection under each `## [X.Y.Z]` section).
    - (d) Embedded in the skill file itself (`claude/skills/qrspi-update/SKILL.md`) as a data table.
    Options for format (for whichever location is chosen):
    - Prose checklist (markdown bullets): human-readable, agent-parseable, but not machine-executable.
    - YAML/JSON structured entries with `type: manual|automated` and `action:` fields: enables the skill to distinguish what it can do vs. what the human must do.
    - Mixed: prose for judgment steps, structured for mechanical steps.
    Which combination is chosen?

12. **Who authors the manifest entries and when?** Is writing a manifest entry a required step when cutting a release? Options:
    - (a) The release author writes the manifest entry in the same PR as the behavior-changing changes, before the release is cut. This makes migration entries a release prerequisite (analogous to the CHANGELOG entry requirement).
    - (b) The manifest is authored post-release (a follow-up PR after the release tag is pushed). Risk: a consumer who upgrades before the manifest entry exists gets an incomplete update walk.
    - (c) Manifest entries are optional — only versions that require consumer action get an entry; patch releases with no consumer impact have no entry and the update command treats them as "no action needed."
    Which approach is chosen, and does it gate the release or not?

13. **Does every release version need a manifest entry, or only versions with breaking changes / behavioral changes that consumers must adapt to?** Specifically:
    - A bug-fix patch release that changes nothing a consuming repo needs to adapt — does it get an entry (even a "no consumer action required" stub) or is it silently skipped by the update walk?
    - A minor release that adds a new command consumers may optionally adopt (not required for correctness) — does it get an entry?
    Define the rule that determines whether a version needs a manifest entry.

14. **How does the manifest relate to `CHANGELOG.md`?** The CHANGELOG already describes what changed per version. Options:
    - (a) The manifest is a separate machine-readable layer; CHANGELOG prose is the human-readable counterpart. They are maintained in parallel (risk: drift).
    - (b) CHANGELOG is extended with a structured migration subsection, making it the single file. The update skill parses the CHANGELOG directly.
    - (c) The manifest is generated from the CHANGELOG (e.g. the release process extracts migration steps from CHANGELOG bullets). Requires a generator (adds complexity).
    Which option is chosen, and how is drift between the two prevented?

---

## `/qrspi:update` command and skill surface

15. **What is the exact command signature?** Options:
    - `/qrspi:update` (no argument — the command reads the marker and auto-detects the target version).
    - `/qrspi:update <target-version>` (the human specifies the version to update to, useful for partial updates or testing).
    - `/qrspi:update [--dry-run]` (optional flag to preview what would change without applying anything).
    Which signature is adopted, and does the command support partial/incremental updates?

16. **Does the skill make file edits in the consuming repo?** If `/qrspi:update` is interactive and applies mechanical changes (question 9c / 10a), the agent needs Write permission on the consuming repo's files. This is a broader permission than the read-only Research stage. Confirm:
    - Which files may the skill write/edit in the consuming repo?
    - Does the human have to grant explicit permission per file or per command invocation?
    - Is the update skill edit-capable or strictly report-only (no Write calls)?

17. **Where does the new command file live in the kit source?** The shipped commands live under `claude/commands/`. Does this new command follow the same pattern (a `claude/commands/update.md` file that ships to consumers via the plugin), or does it live somewhere else (e.g. a `.claude/commands/` local-dev-only command)? Note: if it ships in `claude/commands/`, it also generates a Copilot artifact via `sync-copilot.mjs`.

18. **Where does the backing skill live?** The skill carries the manifest-reading logic, the walk algorithm, and the checklist-output format. Options:
    - `claude/skills/qrspi-update/SKILL.md` (a shipped skill, loaded by the update command and potentially other stages).
    - Inline in the command body (no separate skill file — suitable only if the logic is short enough).
    - A `.claude/skills/` local dev-tooling skill (not shipped to consumers — wrong placement if consumers need it).
    Confirm whether the skill ships to consumers or stays local.

19. **Does the README need a new entry for `/qrspi:update`?** Per CLAUDE.md, any new command that ships in `claude/commands/` must appear in the README stage table and helpers line. If the command ships, confirm which README section it lands in (the eight-stage table is for the main flow; the helpers line covers `/qrspi:init`, `/qrspi:stack`, etc.) and whether a new "Updating" section is warranted.

---

## Release flow integration

20. **Does cutting a release now require a manifest entry as a prerequisite?** The existing release flow (CONTRIBUTING.md "Releases (tag-based)") already requires a `CHANGELOG.md` entry. If manifest entries are required per version (question 12a), adding a manifest entry becomes a new release prerequisite. Confirm:
    - Is "write/update the migration manifest" added to the "To cut a release" checklist in CONTRIBUTING.md?
    - Is a corresponding check added to `release.yml` (analogous to the CHANGELOG-section assertion)?
    - Is it added to the `qrspi-release` skill's "Preconditions" section?

21. **Does `release.yml` need a new validation gate?** Currently `release.yml` asserts: tag matches `plugin.json` version; a matching CHANGELOG section exists; lint exits 0; drift exits 0. If the manifest is a separate file, should `release.yml` also assert that the new version has a manifest entry (or explicitly has a "no consumer action" stub)? Options:
    - (a) Add a manifest-presence assertion to `release.yml` (mechanical check, easy to add).
    - (b) Add a lint check in `scripts/lint.mjs` instead (consistent with the existing lint pattern).
    - (c) Leave it as a convention (documented in CONTRIBUTING but not enforced by CI).
    Which level of enforcement is appropriate?

22. **Does the `qrspi-release` dev-tooling skill/command need to change?** The skill currently: bumps `plugin.json`, rolls CHANGELOG, re-runs lint + drift, commits, and gates the tag push. If manifest entries are required, the skill should also: check for the manifest entry presence, or prompt the release author to write it. Confirm whether the `qrspi-release` skill (`.claude/skills/qrspi-release/SKILL.md`) is in scope for this change.

23. **Does the "version-bump checklist" in CONTRIBUTING.md need updating?** The checklist in CONTRIBUTING.md "Version-bump checklist" section currently covers: semver decision, `plugin.json` bump, CHANGELOG roll, OpenSpec pin coupling, lint, drift. A new line for "write the migration manifest entry" (if required) would be added here. Confirm whether CONTRIBUTING.md is in scope.

---

## `/qrspi:init` integration

24. **Does `/qrspi:init` write the version marker in a freshly initialized repo?** If the marker is written at init time (question 3), the `init.md` command body must be updated to write it after creating `openspec/config.yaml`. Confirm:
    - Which step in the existing init flow writes the marker (after step 2 / b-bis, which already writes `openspec/config.yaml`)?
    - Is the marker written in the same `git add openspec/` commit, or a separate commit?
    - Does re-running `/qrspi:init` on an already-initialized repo update the marker (i.e. "you re-ran init after upgrading the plugin, so the marker is now current")?

25. **What version does `/qrspi:init` write into the marker?** At init time, the consuming repo is being initialized to the current plugin version. Confirm the marker value matches `plugin.json` `version` from the installed kit (currently `0.5.0`), and how the init command reads or knows this value.

---

## Copilot parity

26. **Is this change Claude-only with `node sync-copilot.mjs --check` zero-drift, or does it also add a Copilot-specific update mechanism?** The new `claude/commands/update.md` will generate a Copilot artifact via the sync script. But the Copilot update flow (if it exists at all) is different from Claude's — Copilot consumers update by re-running `install.sh`. Options:
    - (a) Claude-only: regenerate `copilot/` for zero-drift; the Copilot update path is not a new command (re-running `install.sh` is the existing Copilot update path).
    - (b) Also add a Copilot prompt for the update checklist.
    Confirm whether the Copilot port scope is in or out.

---

## Testing & verification

27. **How is "the marker is correctly written at init time" verified?** Options:
    - (a) A manual dogfood walk: run `/qrspi:init` in a test repo and confirm the marker file exists with the correct version.
    - (b) A lint check in `scripts/lint.mjs` that reads `openspec/config.yaml` (or the marker file) and asserts the version field is present and matches a known format.
    - (c) No automated check — the init command is the source and manual verification is sufficient.
    Confirm the verification bar.

28. **How is "the update walk applies the right steps for a given version delta" verified?** The walk logic is the most complex part of this change. Options:
    - (a) Manual dogfood walk: test by simulating "consumer on 0.4.0, kit at 0.6.0" and observing the output.
    - (b) A unit test script (e.g. `scripts/test-update-walk.mjs`) that exercises the manifest parsing and step selection logic.
    - (c) The manifest format is simple enough that code review of the skill + a manual smoke test suffices.
    Confirm what the acceptance bar is.

29. **Does `scripts/lint.mjs` need a new check for this change?** Existing checks cover: pin agreement, frontmatter/name, heading alignment, README-command correspondence. A new check could assert:
    - Every version in `plugin.json` history (or every `## [X.Y.Z]` CHANGELOG section) has a corresponding manifest entry.
    - The marker file format is valid (e.g. the version string is semver-shaped).
    Is a new lint check in scope, or is convention + manual review sufficient?

---

## Sequencing & scope

30. **Is `versioned-update-command` a hard prerequisite for `tighten-stage-read-boundaries`, or could `tighten-stage-read-boundaries` ship first with a "manual migration note" in its CHANGELOG entry?** The brief says it is a prerequisite. Confirm: what specifically does `tighten-stage-read-boundaries` need from this change before it can safely ship? Is it the version marker (so consumers know they need to update), the update command (so consumers have a tool to do it), the manifest (so the update command has instructions for the read-boundary change), or all three?

31. **Should `versioned-update-command` also retroactively write manifest entries for all shipped versions (0.1.0–0.5.0), or only for versions after this change ships?** If a consumer was on 0.3.0 and runs `/qrspi:update` after this change ships, should the walk include what changed in 0.4.0, 0.5.0, etc.? Options:
    - (a) Write retroactive entries for 0.1.0–0.5.0 (all shipped versions). High effort; may not be worth it for pre-1.0 consumers who are assumed to be early adopters.
    - (b) Only write entries starting from the version that ships this change (e.g. 0.6.0 and beyond). Consumers on older versions see "no migration steps for your version range" and are told to review the CHANGELOG manually.
    - (c) Write a single catch-all "pre-update" entry that covers all changes before this feature shipped.
    Which option is chosen?

32. **How does this change interact with `archive-requires-merged-pr` (currently in-progress, PR #15 open)?** If that change ships before this one, is there anything in the consuming-repo update path that references it? Does the order of merge matter for the manifest entries?

33. **Scope guard: is writing a new `scripts/` helper (per `standardize-recurring-ops-scripts`) in scope, or is the update walk logic self-contained in the skill file?** The `standardize-recurring-ops-scripts` backlog item proposes extracting recurring ops to Node scripts. The update walk could be such a script. Confirm whether this change should extract a script or keep the logic in the skill markdown.

---

## Open product questions (for the human)

- [x] **PQ1 — Version marker location:** Where should the version marker live in a consuming repo? Options: (a) `openspec/.qrspi-version` (dedicated plain-text file, one line); (b) a `qrspi_version:` field added to `openspec/config.yaml` (already exists, written by `/qrspi:init`); (c) no separate marker — the marker is a new key in `openspec/backlog.md`'s header block. Note: if PQ2 answers "the command is report-only and never edits files", the marker still needs to be written somewhere so the command can read it on the next run.
  **Answer: (a) A dedicated `openspec/.qrspi-version` file — one-line plain text
  (e.g. `0.5.0`). Glob-readable, single-purpose, no coupling to the OpenSpec-owned
  `config.yaml`.**

- [x] **PQ2 — Update command interaction model:** Should `/qrspi:update` be: (a) interactive — present each migration step and apply mechanical ones automatically (edit files, bump the marker), asking the human to confirm; (b) report-only — print a checklist and exit, the human applies changes manually then re-runs `/qrspi:update` to bump the marker; (c) hybrid — apply mechanical file edits automatically, list judgment steps for the human? Note: option (a) requires Write permission in the consuming repo; option (b) means the agent never edits files as part of the update walk.
  **Answer: (c) Hybrid — auto-apply the mechanical steps (marker bump, deterministic
  file edits), surface judgment/verify steps to the human for confirmation, then bump
  the marker. Matches QRSPI's 'mechanical auto, judgment gated' ethos.**

- [x] **PQ3 — Migration manifest format and location:** Where should the migration manifest live, and in what format? Options: (a) a new `migrations/` directory in the kit with one `.md` file per version (e.g. `migrations/0.6.0.md`), prose checklist; (b) a new `migrations/` directory with structured YAML per version (machine-readable, distinguishes `manual` vs `automated` steps); (c) extend `CHANGELOG.md` with a `### Migration` subsection under each `## [X.Y.Z]` section (single source of truth, no separate file to maintain); (d) embedded in the skill body as a data table (no external file, but harder to maintain). Note: if PQ5 says manifest entries are NOT required for every release, option (a)/(b) with sparse per-version files is cleaner than option (c) with empty Migration subsections.
  **Answer: (b) A `migrations/` directory in the kit with one structured YAML file
  per version (e.g. `migrations/0.6.0.yaml`) that distinguishes `automated` vs
  `manual` steps — the structure the hybrid command (PQ2) needs to know what it may
  auto-apply vs surface.**

- [x] **PQ4 — Walk strategy — step-by-step vs. cumulative:** When a consumer is multiple versions behind, should `/qrspi:update`: (a) walk each intervening version's manifest entry in sequence (0.4.0 → 0.5.0 → 0.6.0), preserving intermediate ordering; (b) present a single merged checklist of all changes since the consumer's recorded version (simpler, but loses intermediate ordering)? Note: if PQ3 chooses a per-version manifest (options a/b), step-by-step (option a here) is natural. If PQ3 chooses CHANGELOG extension (option c), cumulative may be easier to extract.
  **Answer: (a) Step-by-step — walk each intervening version's manifest entry in
  sequence, preserving intermediate ordering. Natural with the per-version manifest
  (PQ3(b)).**

- [x] **PQ5 — Release prerequisite gate:** Should writing a migration manifest entry be a required step when cutting a release? Options: (a) yes — required for any release that changes something a consuming repo may need to adapt; a CI gate in `release.yml` (or `scripts/lint.mjs`) asserts the entry exists; (b) yes — required for ALL releases without exception (even patch-only releases get a "no consumer action required" stub); (c) no — it is a convention documented in CONTRIBUTING but not CI-enforced; release authors are trusted to write the entry when appropriate. Note: if PQ3 picks CHANGELOG extension (option c), a CI gate becomes simpler (the CHANGELOG is already parsed by `release.yml`).
  **Answer: (b) Required for ALL releases without exception — a patch with no consumer
  impact still ships a `migrations/<version>.yaml` "no consumer action required" stub.
  A mechanical CI/lint gate asserts presence for every tag (no relevance judgment
  needed).**

- [x] **PQ6 — Retroactive manifest entries:** Should this change also write migration manifest entries for all versions already shipped (0.1.0–0.5.0), so consumers who initialize the marker at an old version get guided through what changed? Options: (a) yes — write retroactive entries for all shipped versions (allows the full update walk from any point); (b) no — only write entries from the first version that ships this feature onward; consumers on older versions see "no steps for your range" and are pointed to the CHANGELOG for manual review; (c) write a single umbrella "before this feature" entry covering 0.0.0–0.5.0. Note: PQ6's answer determines the scope of implementation work significantly.
  **Answer: (b) No retroactive entries — the manifest begins at the first version that
  ships this feature. Consumers on older versions get "no steps for your range" and are
  pointed to the CHANGELOG. Keeps scope tight.**

- [x] **PQ7 — `tighten-stage-read-boundaries` dependency:** What specifically must `versioned-update-command` deliver before `tighten-stage-read-boundaries` can ship? Is it: (a) all three pieces (marker + update command + manifest for the read-boundary change); (b) just the marker and the update command (the manifest entry for `tighten-stage-read-boundaries` can be written in that change's own PR); (c) just the manifest mechanism (the marker and update command can ship alongside `tighten-stage-read-boundaries`)? This determines the minimum viable scope for this change.
  **Answer: (b) This change ships the infrastructure — the `.qrspi-version` marker,
  the `/qrspi:update` command + skill, and the manifest format + release gate. The
  migration entry FOR the read-boundary change is authored in
  `tighten-stage-read-boundaries`'s own PR (per PQ5, every release writes its entry).
  Clean separation of mechanism from content.**
