# ci-quality-gates Specification

## Purpose
TBD - created by archiving change kit-quality-hardening. Update Purpose after archive.
## Requirements
### Requirement: CI workflow file exists and triggers correctly
The system MUST provide a `.github/workflows/ci.yml` GitHub Actions workflow
that triggers on `pull_request` targeting `main`, `push` to `main` (post-merge
re-check), and `workflow_dispatch` (manual re-check).

#### Scenario: PR opened against main
- **WHEN** a pull request is opened or updated targeting the `main` branch
- **THEN** the CI workflow runs all parallel jobs automatically.

#### Scenario: direct push to main
- **WHEN** a commit is pushed directly to `main`
- **THEN** the CI workflow runs all parallel jobs to re-check the merged state.

### Requirement: Lint job validates pin agreement
The CI `lint` job MUST assert that every hand-maintained occurrence of the
OpenSpec version pin (excluding `generatedBy:` lines in OpenSpec-generated skill
files) agrees, and MUST fail if any occurrence diverges from the others.

#### Scenario: pin mismatch introduced
- **WHEN** a contributor updates the pin in one location but not all others and
  the lint job runs
- **THEN** the lint job reports the mismatched occurrence(s) and exits non-zero.

#### Scenario: generatedBy lines excluded from pin lint
- **WHEN** the lint job runs and `generatedBy: "1.4.1"` appears in
  OpenSpec-generated skill files
- **THEN** those occurrences are not counted as hand-maintained pin sites and
  do not cause lint failures.

### Requirement: Lint job validates frontmatter and name resolution
The CI `lint` job MUST verify that every agent file has `name:` and
`description:` frontmatter fields, every command file has a `description:`
field, every skill `SKILL.md` has `name:` and `description:` fields, every
`agent:` reference in a command file resolves to an actual agent file or
built-in name, every `model:` field uses an alias (`opus`, `sonnet`, `haiku`)
and not a pinned model id, every `Load skill X` reference in an agent body
resolves to a real `claude/skills/<X>/SKILL.md`, and every `effort:` field in
an agent frontmatter uses a value from `{low, medium, high}` (rejecting
`xhigh` and `max` to keep the kit surface small).

#### Scenario: dangling skill reference
- **WHEN** an agent body contains `Load skill missing-skill` and no
  `claude/skills/missing-skill/SKILL.md` exists, and the lint job runs
- **THEN** the lint job reports the unresolved reference and exits non-zero.

#### Scenario: model alias used correctly
- **WHEN** all agent `model:` frontmatter fields use aliases (`opus`, `sonnet`,
  or `haiku`) and the lint job runs
- **THEN** the lint job passes the model-alias check.

#### Scenario: valid effort value passes Check 2
- **WHEN** an agent file carries `effort: high` in its frontmatter and `node scripts/lint.mjs` is run
- **THEN** Check 2 passes the effort-value check for that agent.

#### Scenario: invalid effort value fails Check 2
- **WHEN** an agent file carries `effort: xhigh` in its frontmatter and `node scripts/lint.mjs` is run
- **THEN** Check 2 reports a violation because `xhigh` is not in `{low, medium, high}` and exits non-zero.

#### Scenario: missing effort field fails Check 2
- **WHEN** an agent file is missing the `effort:` frontmatter key after the change ships and `node scripts/lint.mjs` is run
- **THEN** Check 2 reports a violation because all seven stage agents are required to carry `effort:`.

### Requirement: Lint job checks skeleton heading alignment
The CI `lint` job MUST verify that the canonical section headings from each
`openspec-templates/*.template.md` file also appear in the corresponding inline
skeleton embedded in the relevant agent file, failing if any canonical heading
is absent from the agent's inline skeleton. For the questioner agent and its
`questions.template.md`, the canonical heading set MUST be the three
surface-independent headings only: `## Testing`, `## Sequencing & scope`, and
`## Open product questions (for the human)`. The seven CRUD headings previously
in the questioner's required set (`## Data model`, `## Indexing & query
performance`, `## API`, `## UI`, `## Front-end state`, `## Auth & authorization`,
`## Migrations & data`) MUST NOT be in the canonical required set; their
presence or absence in a skeleton is governed by the `repo-surface` filter and
guarded against hard-coding by Check 11. The designer, architect, and planner
canonical heading sets are unchanged (surface-independent headers only). For the
researcher agent and its `research.template.md`, the canonical heading set MUST
be the five spine headings: `## Areas investigated`, `## File map`,
`## Notable discrepancies`, `## Implicit contracts and conventions`, and
`## Open gaps`.

#### Scenario: inline skeleton missing a canonical heading
- **WHEN** a canonical heading such as `## ADDED Requirements` appears in
  `openspec-templates/spec-delta.template.md` but is absent from the inline
  skeleton in `qrspi-architect.md`, and the lint job runs
- **THEN** the lint job reports the missing heading and exits non-zero.

#### Scenario: questioner skeleton missing Testing heading is caught
- **WHEN** `## Testing` is absent from the questioner's inline skeleton and
  `node scripts/lint.mjs` is run
- **THEN** Check 3 reports a violation because `## Testing` is in the
  surface-independent required set.

#### Scenario: questioner skeleton lacking a CRUD heading does not trigger Check 3
- **WHEN** the questioner's inline skeleton contains no `## Data model` heading
  because it has been replaced by a conditional placeholder, and
  `node scripts/lint.mjs` is run
- **THEN** Check 3 does NOT report a violation for the missing CRUD heading,
  because `## Data model` is no longer in the questioner's required set.

#### Scenario: researcher skeleton missing a spine heading is caught
- **WHEN** `## Open gaps` is absent from the researcher's inline skeleton and
  `node scripts/lint.mjs` is run
- **THEN** Check 3 reports a violation because `## Open gaps` is in the
  researcher's canonical required set.

#### Scenario: researcher skeleton containing all five spine headings passes Check 3
- **WHEN** the researcher's inline skeleton contains all five spine headings and
  `node scripts/lint.mjs` is run
- **THEN** Check 3 reports `OK` for the researcher and does not contribute a
  non-zero exit.

### Requirement: Validate job runs openspec validate on the reference example
The CI `validate` job MUST run `npx @fission-ai/openspec@<pin> validate --all`
(strict) on `ubuntu-latest`, validating every base spec under `openspec/specs/`
and every active change under `openspec/changes/` — including the hand-authored
reference example — and failing the job if any item reports an error. Because
`--all` runs strict, it enforces rules the non-strict `openspec validate <id>`
skips (notably that each requirement's **first line** contains `MUST`/`SHALL`);
authoring stages therefore validate locally with `openspec validate <id>
--strict` to match this gate rather than discovering violations only in CI.

#### Scenario: all specs and active changes pass strict validation
- **WHEN** the validate CI job runs and every base spec and active change (the
  reference example included) is well-formed under strict rules
- **THEN** `openspec validate --all` exits 0 and the job passes.

#### Scenario: a spec violates the strict format
- **WHEN** any base spec or active change violates the spec-delta format — e.g.
  a `## MODIFIED` requirement title does not match a base requirement, or a
  requirement's first line lacks `MUST`/`SHALL` under strict validation
- **THEN** `openspec validate --all` exits non-zero and the job fails.

### Requirement: CI jobs run in parallel on ubuntu-latest
The two CI jobs (`lint`, `validate`) MUST run in parallel (no
`needs:` dependency between them) on the `ubuntu-latest` runner. No OS matrix
is required.

#### Scenario: lint failure does not mask validate failure
- **WHEN** both the lint and validate jobs fail in the same CI run
- **THEN** both failures are reported independently and visible in the GitHub
  Actions summary.

### Requirement: Lint job checks gate-tool / executor agreement
The CI `lint` job MUST include a Check 5 (`checkGateExecutor`) that maintains
a hardcoded `MAIN_LOOP_ONLY` set (at minimum `{'AskUserQuestion'}`) and, for
each `claude/commands/*.md`, flags a violation if the command's frontmatter
declares a non-builtin `agent:` AND the command's body **reaches** a tool in
`MAIN_LOOP_ONLY`. A body reaches such a tool either **directly** (the tool name
appears in the body text) or **transitively** (the body references the
`workflow` "Stage choreography" procedures — commit step / next-stage
handoff / approval gate — which invoke a main-loop-only tool on the command's
behalf). Builtins (`build`, `agent`) MUST be excluded from the check. Check 5
MUST be registered in `scripts/lint.mjs` after Check 4 using the same
dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 5: ...')` label in `main()`).

#### Scenario: stage command carries gate-trapping agent: pairing (inline tool)
- **WHEN** a `claude/commands/*.md` file declares `agent: questioner` (a
  non-builtin) AND its body references `AskUserQuestion`, and the lint job runs
- **THEN** Check 5 reports a violation and `node scripts/lint.mjs` exits
  non-zero.

#### Scenario: stage command traps gates transitively via the skill
- **WHEN** a `claude/commands/*.md` file declares `agent: researcher` (a
  non-builtin) AND its body does NOT name `AskUserQuestion` directly but
  references the `workflow` "Stage choreography" commit step / next-stage
  handoff (which invoke `AskUserQuestion`), and the lint job runs
- **THEN** Check 5 reports a violation, because the body transitively reaches a
  main-loop-only tool that would be trapped in the subagent.

#### Scenario: stage commands after fix pass Check 5
- **WHEN** the nine stage commands have had `agent:` and the fork directive
  removed (per this change) and the lint job runs
- **THEN** Check 5 finds no command with both a non-builtin `agent:` and a
  body reference to a main-loop-only tool, and reports `OK`.

#### Scenario: helper commands with builtin agent: are not flagged
- **WHEN** `archive.md`, `init.md`, or `stack.md` declare `agent: build`
  and the lint job runs
- **THEN** Check 5 does not flag them, because `build` is in the
  `BUILTIN_AGENTS` exclusion set.

#### Scenario: no-agent commands pass Check 5
- **WHEN** `retro.md` and `status.md` (which carry no `agent:` field) are
  evaluated by Check 5
- **THEN** Check 5 does not flag them, because the check only applies to
  commands with a non-builtin `agent:` declaration.

#### Scenario: future command re-adds gate-trapping pattern is caught
- **GIVEN** a contributor adds a new command with `agent: planner` in
  frontmatter and an `AskUserQuestion` call in the body
- **WHEN** `node scripts/lint.mjs` runs in CI
- **THEN** Check 5 flags the new command as a violation, preventing the
  gate-trapping bug from recurring silently.

### Requirement: Lint job checks migration manifest presence and schema
The CI `lint` job MUST include a check that, for every `## [X.Y.Z]` section in
`CHANGELOG.md` (i.e. every historically released version), a corresponding
`migrations/<version>.yaml` file exists in the kit. The check MUST also validate
schema well-formedness of every `migrations/*.yaml` file: required fields
(`version`, `summary`, `automated`, `manual`) must be present; every item in
`automated` must have `action: edit-file` and no other action value; every
`automated` item's `path` field must start with `openspec/`. The check MUST
validate, where `openspec/.qrspi-version` exists in the repo being linted, that
its contents match a bare SemVer regex (no `v` prefix, no key). The check MUST
be implemented in `scripts/lint.mjs` using the same dependency-free ESM pattern
(async function, errors pushed to `errors[]`, labelled `process.stdout.write`
line in `main()`). Because `release.yml` already runs `node scripts/lint.mjs`,
this check is enforced both on every PR and at every tag push without a separate
`release.yml` assertion.

#### Scenario: release version missing a manifest entry
- **WHEN** `CHANGELOG.md` contains a `## [0.7.0]` section but
  `migrations/0.7.0.yaml` does not exist, and the lint job runs
- **THEN** the lint check reports the missing entry and `node scripts/lint.mjs`
  exits non-zero.

#### Scenario: every released version has a manifest entry
- **WHEN** every version section in `CHANGELOG.md` has a corresponding
  `migrations/<version>.yaml` and all files are schema-well-formed
- **THEN** the lint check passes and does not contribute to a non-zero exit.

#### Scenario: automated step with disallowed action is caught
- **WHEN** a `migrations/<version>.yaml` file contains an `automated` step with
  `action: run-command` (not `edit-file`) and the lint job runs
- **THEN** the lint check reports the schema violation and exits non-zero.

#### Scenario: automated step with non-openspec path is caught
- **WHEN** a `migrations/<version>.yaml` file contains an `automated` step whose
  `path` does not start with `openspec/` and the lint job runs
- **THEN** the lint check reports the path scope violation and exits non-zero.

#### Scenario: marker file with malformed SemVer is caught
- **WHEN** `openspec/.qrspi-version` exists and contains `v0.6.0` (with a `v`
  prefix) or any non-SemVer string, and the lint job runs
- **THEN** the lint check reports the format violation and exits non-zero.

#### Scenario: valid stub for a no-action release passes
- **WHEN** `migrations/0.6.0.yaml` exists with `version: 0.6.0`, a `summary`
  string, `automated: []`, and `manual: []`
- **THEN** the lint check treats this as a valid stub and does not flag it.

### Requirement: Lint job validates agent read-contract banners via Check 7
The CI `lint` job MUST include a Check 7 (`checkReadContracts`) that parses
each of the nine spawnable QRSPI agent files — the six stage agents
(`claude/agents/researcher.md`, `questioner.md`, `designer.md`, `architect.md`,
`planner.md`, `reviewer.md`) plus the three implementer effort-variant agents
(`implementer-low.md`, `implementer-medium.md`, `implementer-high.md`) — for
their read-contract banner's `Reads:` field and asserts it equals the agent's
expected row in the approved read-matrix. The `READ_CONTRACT_EXPECTED` map MUST
NOT contain an `implementer` key (the base agent is deleted); it MUST contain
three keys `implementer-low`, `implementer-medium`, `implementer-high`, each
with expected value `Reads: tasks.md.` (identical to the value the former
`implementer` key carried). The check MUST handle the architect's two-mode
contract (stage S: `design.md` only; stage V: `proposal.md + specs/`) and MUST
special-case the reviewer as "full change-folder by design." The check MUST NOT
flag `/qrspi:update`, `qrspi-update`, or any non-stage-agent file. Check 7
MUST be registered in `scripts/lint.mjs` after Check 6 using the same
dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 7: ...')` label in `main()`).

#### Scenario: all nine agent files carry matching read-contract banners
- **WHEN** the six stage agents and the three implementer variant agents all
  carry read-contract banners whose `Reads:` fields match the approved
  read-matrix rows and `node scripts/lint.mjs` is run
- **THEN** Check 7 reports `OK` and exits 0.

#### Scenario: variant banner Reads field matches tasks.md expectation
- **WHEN** `claude/agents/implementer-medium.md` carries a read-contract banner
  with `Reads: tasks.md.` and `node scripts/lint.mjs` is run
- **THEN** Check 7 reports `OK` for that variant because the field matches the
  `implementer-medium` entry in `READ_CONTRACT_EXPECTED`.

#### Scenario: base implementer key absent from READ_CONTRACT_EXPECTED
- **WHEN** `claude/agents/implementer.md` has been deleted and
  `READ_CONTRACT_EXPECTED` no longer contains an `implementer` key, and
  `node scripts/lint.mjs` is run
- **THEN** Check 7 does NOT attempt to open or check `implementer.md` and
  reports `OK` for the nine-agent set.

#### Scenario: banner missing from a variant file is caught
- **WHEN** one of the three variant agent files lacks a read-contract banner
  entirely and `node scripts/lint.mjs` is run
- **THEN** Check 7 reports a missing-banner violation for that variant and
  exits non-zero.

### Requirement: Lint job checks PR reconciliation passes via Check 8
The CI `lint` job MUST include a Check 8 (`checkPrReconciliationPasses`) that
asserts `claude/commands/pr.md` contains both reconciliation passes. The check
MUST match on stable structural anchors — the presence of a "tasks pass" and
a "follow-ups pass" section and the two option-set signatures (`Finish`,
`Drop`, `Pause` for tasks; and the four-option set `Fix now`, `Defer`, `Drop`,
`Promote` for follow-ups) — rather than incidental wording, to remain robust
against prose edits while still catching the accidental deletion of an entire
pass. Check 8 MUST be registered in `scripts/lint.mjs` after Check 7 using
the same dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 8: ...')` label in `main()`).

#### Scenario: pr.md carrying both passes passes Check 8
- **WHEN** `claude/commands/pr.md` contains both a tasks-pass section (with
  Finish / Drop / Pause option anchors) and a follow-ups-pass section (with
  Fix now / Defer / Drop / Promote option anchors) and `node scripts/lint.mjs`
  is run
- **THEN** Check 8 reports `OK` and does not contribute a non-zero exit.

#### Scenario: tasks pass deleted from pr.md is caught by Check 8
- **WHEN** a contributor edits `claude/commands/pr.md` and removes the tasks
  pass section (including its Finish / Drop / Pause option anchors), and the
  lint job runs
- **THEN** Check 8 reports a violation ("tasks pass missing from pr.md") and
  `node scripts/lint.mjs` exits non-zero.

#### Scenario: follow-ups pass deleted from pr.md is caught by Check 8
- **WHEN** a contributor edits `claude/commands/pr.md` and removes the
  follow-ups pass section (including its Fix now / Defer / Drop / Promote
  option anchors), and the lint job runs
- **THEN** Check 8 reports a violation ("follow-ups pass missing from pr.md")
  and `node scripts/lint.mjs` exits non-zero.

#### Scenario: Check 8 uses structural anchors, not exact prose
- **WHEN** a contributor rewrites the prose around the tasks pass (changing
  wording) but keeps the Finish / Drop / Pause option labels and the tasks-pass
  heading, and the lint job runs
- **THEN** Check 8 passes, because it matches on the structural anchors (option
  labels + section heading), not on incidental surrounding prose.

### Requirement: Lint job asserts version-check embed in all nine command bodies via Check 9
The CI `lint` job MUST include a Check 9 (`checkVersionCheckEmbed`) that reads
each of the nine QRSPI command files (`claude/commands/status.md`,
`questions.md`, `research.md`, `design.md`, `structure.md`, `slices.md`,
`plan.md`, `implement.md`, `pr.md`) and asserts that each body contains an
inline reference to skill `qrspi-version-check` on a "follow skill" or "Load
skill" line. The list of nine command stems MUST be hardcoded in the check (as
Check 7's seven-agent map is hardcoded), so that a future command added without
the embed fails lint rather than being silently excluded. The check MUST require
the **inline** form (the command file names `qrspi-version-check` directly on
its own load line); transitive-only embedding is not sufficient and MUST be
flagged as a violation. Check 9 MUST be registered in `scripts/lint.mjs` after
Check 8 using the same dependency-free ESM pattern (async function pushing to
`errors[]`, `process.stdout.write('Check 9: ...')` label in `main()`).

#### Scenario: all nine command bodies carry the embed — check passes
- **WHEN** every file in the nine-command set contains an inline `qrspi-version-check`
  load reference and `node scripts/lint.mjs` is run
- **THEN** Check 9 reports `OK` and does not contribute a non-zero exit.

#### Scenario: one command body drops the embed — check fails
- **WHEN** a contributor edits `claude/commands/plan.md` and removes the
  `qrspi-version-check` load line, and `node scripts/lint.mjs` is run
- **THEN** Check 9 reports a violation naming `plan.md` and `node scripts/lint.mjs`
  exits non-zero.

#### Scenario: new command added without the embed — check fails
- **WHEN** a contributor adds a new stage command file to `claude/commands/` that
  is in the hardcoded nine-command set but omits the `qrspi-version-check` load
  line, and `node scripts/lint.mjs` is run
- **THEN** Check 9 reports a violation for the new command file and exits non-zero.

#### Scenario: transitive-only reference does not satisfy the check
- **WHEN** a command body does not name `qrspi-version-check` directly but
  reaches the check via another skill, and `node scripts/lint.mjs` is run
- **THEN** Check 9 reports a violation for that command, because the inline
  form is required.

### Requirement: Lint job asserts triage choice labels present in followup.md via Check 10
The CI `lint` job MUST include a Check 10 (`checkTriagePaths`) that reads
`claude/commands/followup.md` and asserts the file contains all three triage
choice-label prefixes: `"P1 — implement directly`, `"P2 — amend this change in place`, and
`"P3 — defer`. A missing label MUST cause the check to report a violation and
exit non-zero. Check 10 MUST be registered in `scripts/lint.mjs` after Check 9
using the same dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 10: ...')` label in `main()`).

#### Scenario: followup.md carrying all three choice labels passes Check 10
- **WHEN** `claude/commands/followup.md` contains the strings
  `"P1 — implement directly`, `"P2 — amend this change in place`, and `"P3 — defer`, and
  `node scripts/lint.mjs` is run
- **THEN** Check 10 reports `OK` and does not contribute a non-zero exit.

#### Scenario: a triage choice label removed from followup.md is caught
- **WHEN** a contributor edits `claude/commands/followup.md` and removes the
  P2 choice label (e.g., deletes the `"P2 — amend this change in place` line), and
  `node scripts/lint.mjs` is run
- **THEN** Check 10 reports a violation naming the missing anchor and
  `node scripts/lint.mjs` exits non-zero.

#### Scenario: wording change to a choice label is caught by Check 10
- **WHEN** a contributor renames the P3 choice to `"P3 — backlog` (changing the
  anchor prefix) in `claude/commands/followup.md`, and `node scripts/lint.mjs`
  is run
- **THEN** Check 10 reports a violation because `"P3 — defer` is no longer
  present, preventing a silent path rename.

### Requirement: Lint job forbids CRUD headings inside fenced skeleton blocks via Check 11
The CI `lint` job MUST include a Check 11 (`checkNoCrudSkeletonHeadings`) that
scans fenced code blocks in each of the six artifact-producing agent files
(`claude/agents/questioner.md`, `designer.md`, `architect.md`, `planner.md`,
`reviewer.md`, and `researcher.md`) and asserts that none of the following
surface-gated heading lines appear as a heading line inside those blocks:
`## Data model`, `## Indexing & query performance`, `## API`, `## UI`,
`## Front-end state`, `## Auth & authorization`, `## Migrations & data`,
`## Data model changes`, `## API surface`, `## UI surface`, `## Authorization`,
`## Migrations`, `## Slash-command surface`, `## Command changes`,
`## Stage-agent surface`, `## Agent changes`, `## Skill surface`,
`## Skill changes`, `## Lint-gate surface`, `## Lint changes`,
`## Template surface`, `## Migration manifest`. The check MUST match on lines
beginning with the heading marker to avoid false positives on prose mentions
outside fenced blocks. The denylist MUST be stored in a constant named
`SURFACE_GATED_DENYLIST_HEADINGS` (not `CRUD_DENYLIST_HEADINGS`). Check 11
MUST carry a header comment stating two disjoint-scope invariants: (a) Check 3
requires surface-independent headings to be present anywhere in the body; Check
11 requires surface-gated headings to be absent from fenced blocks; no heading
is simultaneously required-present and forbidden. (b) Check 11 scans agent
SOURCE fenced skeletons for a hardcoded gated heading; Check 14 scans committed
ARTIFACT bodies outside fences for an emitted heading whose surface is absent;
the scopes are disjoint (source vs. output; inside-fence vs. outside-fence) so
the checks never fire on the same line. Check 11 MUST be registered in
`scripts/lint.mjs` using the same dependency-free ESM pattern (async function
pushing to `errors[]`, `process.stdout.write('Check 11: ...')` label in
`main()`). The agent list used internally by Check 11 (the `CRUD_CHECK_AGENTS`
constant or equivalent) MUST include `researcher` so the researcher's fenced
skeleton is covered.

#### Scenario: fenced skeleton in questioner.md contains no surface-gated headings
- **WHEN** `claude/agents/questioner.md` has all surface-gated skeleton headings
  expressed as conditional placeholder comments and `node scripts/lint.mjs` is run
- **THEN** Check 11 reports `OK` for that file and does not contribute a
  non-zero exit.

#### Scenario: re-introduced surface-gated heading inside a fence is caught
- **WHEN** a contributor re-introduces `## Skill changes` as a literal heading
  line inside a fenced skeleton block of one of the six agent files and
  `node scripts/lint.mjs` is run
- **THEN** Check 11 reports a violation naming the file and the offending
  heading, and `node scripts/lint.mjs` exits non-zero.

#### Scenario: prose mention of a surface-gated heading outside a fence is not flagged
- **WHEN** the body of an agent file contains a prose reference to `## Data model`
  outside any fenced block and `node scripts/lint.mjs` is run
- **THEN** Check 11 does not flag that mention, because the check is scoped
  to lines inside fenced blocks only.

#### Scenario: Check 11 does not conflict with Check 3
- **WHEN** `node scripts/lint.mjs` runs after this change ships
- **THEN** Check 3 passes (surface-independent headings `## Testing`,
  `## Sequencing & scope`, `## Open product questions` are present in the
  questioner body) AND Check 11 passes (no surface-gated headings appear inside
  fenced blocks), because the two checks cover disjoint heading sets and
  disjoint scopes.

#### Scenario: Check 11 and Check 14 cover disjoint scopes
- **WHEN** `node scripts/lint.mjs` runs
- **THEN** Check 11 examines agent source files (inside fenced blocks) and Check
  14 examines artifact markdown files (outside fenced blocks); neither check can
  fire on the same line as the other.

#### Scenario: researcher fenced skeleton with a literal surface-gated heading is caught by Check 11
- **WHEN** a contributor introduces `## Data model` as a literal heading line
  inside the researcher's fenced skeleton block and `node scripts/lint.mjs` is run
- **THEN** Check 11 reports a violation naming `researcher.md` and the offending
  heading, and `node scripts/lint.mjs` exits non-zero.

### Requirement: Lint job asserts each agent loads exactly its declared skill set via checkSkillSets
The CI `lint` job MUST include a `checkSkillSets` check (extension of Check 2 or
a sibling registered after Check 2) that maintains a hardcoded `SKILL_SET_EXPECTED`
map (agent stem → array of unconditional kit skill names, mirroring the existing
`READ_CONTRACT_EXPECTED` shape) and, for each of the seven stage agent files
(`claude/agents/researcher.md`, `questioner.md`, `designer.md`, `architect.md`,
`planner.md`, `implementer.md`, `reviewer.md`), harvests the skill names from the
agent's `Load skills` line and asserts that the harvested set (after filtering out
the conditional `<repo>-stack` cheatsheet, which is Glob-discovered and therefore
excluded from the registry) equals the declared set for that agent stem. The check
MUST report added skills (present in the agent but absent from the registry) and
missing skills (present in the registry but absent from the agent) separately, and
MUST exit non-zero on any mismatch.

#### Scenario: all seven agents match their registry entries
- **WHEN** every stage agent's `Load skills` line names exactly the skills in
  `SKILL_SET_EXPECTED` for its stem (after the conditional stack-cheatsheet is
  excluded) and `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports `OK` and does not contribute a non-zero exit.

#### Scenario: agent loads a skill not in its registry entry
- **WHEN** a contributor adds `Load skill openspec-workflow` to `claude/agents/planner.md`
  (not in the planner's `SKILL_SET_EXPECTED` entry) and `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports the added-but-undeclared skill for `planner.md`
  and `node scripts/lint.mjs` exits non-zero.

#### Scenario: agent drops a skill that is in its registry entry
- **WHEN** a contributor removes `context-hygiene` from `claude/agents/researcher.md`
  (which is in the researcher's `SKILL_SET_EXPECTED` entry) and
  `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports the missing-but-declared skill for `researcher.md`
  and `node scripts/lint.mjs` exits non-zero.

#### Scenario: conditional stack-cheatsheet is excluded from the comparison
- **WHEN** a stage agent's body contains a conditional Glob-based load of a
  `<repo>-stack` cheatsheet alongside its declared unconditional skills, and
  `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` does not flag the cheatsheet name as an undeclared
  skill, because the filter strips it before the set-equality compare.

### Requirement: Lint job asserts output-contract banner presence on all nine agents via Check 12
The CI `lint` job MUST include a Check 12 (`checkOutputContracts`) that reads
each of the nine spawnable QRSPI agent files — the six stage agents
(`claude/agents/researcher.md`, `questioner.md`, `designer.md`, `architect.md`,
`planner.md`, `reviewer.md`) plus the three implementer effort-variant agents
(`implementer-low.md`, `implementer-medium.md`, `implementer-high.md`) — and
asserts that each file contains at least one line matching the pattern
`/^>\s*\*\*Output contract\*\*/`. The check MUST report a violation for any
agent file that lacks the banner and MUST exit non-zero. The agent set iterated
by Check 12 MUST be derived from the same `READ_CONTRACT_EXPECTED` map as Check
7 (so both checks stay in sync when the map changes). Check 12 MUST be
registered in `scripts/lint.mjs` after Check 11 using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 12: ...')` label in `main()`).

#### Scenario: all nine agents carry the output-contract banner
- **WHEN** every stage agent and every implementer variant agent file contains a
  line beginning with `> **Output contract**` and `node scripts/lint.mjs` is run
- **THEN** Check 12 reports `OK` and does not contribute a non-zero exit.

#### Scenario: output-contract banner removed from a variant is caught
- **WHEN** a contributor edits `claude/agents/implementer-low.md` and deletes
  the `> **Output contract**` line, and `node scripts/lint.mjs` is run
- **THEN** Check 12 reports a violation for `implementer-low.md` and
  `node scripts/lint.mjs` exits non-zero.

### Requirement: Lint job validates Compute annotation values via Check 13
The CI `lint` job MUST include a Check 13 (`checkComputeAnnotations`) that
parses every `**Compute:**` line in `openspec/changes/**/slices.md` and
`**/tasks.md` and flags: a `model=` value not in `{haiku, sonnet, opus}`; an
`effort=` value that is present but not in `{low, medium, high}`; and a
missing or empty `effort=` token (effort is now required — a `**Compute:**`
line with no `effort=` token MUST be flagged as a violation). Check 13 MUST
tolerate both structural forms of the line (the `-` bullet form in `slices.md`
and the bare bold form in `tasks.md`) by matching on the `**Compute:**` token
rather than the line prefix. Check 13 MUST perform value-validation only — it
MUST NOT assert the presence of a `**Compute:**` line on every slice, nor
validate that a model value matches any heuristic. The `COMPUTE_MODELS`
constant in `scripts/lint.mjs` MUST be updated to `['sonnet', 'opus', 'haiku']`
and its adjacent comment MUST be updated to reflect that a haiku heuristic now
exists. Check 13 MUST be registered in `scripts/lint.mjs` after Check 12 using
the same dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 13: ...')` label in `main()`).

#### Scenario: haiku is now a valid model alias under Check 13
- **WHEN** `openspec/changes/<id>/slices.md` contains `- **Compute:** effort=low model=haiku — mechanical rename` and `node scripts/lint.mjs` is run
- **THEN** Check 13 passes for that line; `haiku` is in the `{haiku, sonnet, opus}` allowed set and does not cause a violation.

#### Scenario: missing effort= token is flagged by Check 13
- **WHEN** `openspec/changes/<id>/slices.md` contains `- **Compute:** model=sonnet — first real-time hub` (no `effort=` token) and `node scripts/lint.mjs` is run
- **THEN** Check 13 reports a violation because `effort=` is now required on every `**Compute:**` line, and `node scripts/lint.mjs` exits non-zero.

#### Scenario: valid Compute line with all tokens passes Check 13
- **WHEN** `openspec/changes/<id>/slices.md` contains `- **Compute:** effort=medium model=sonnet — boilerplate entity` and `node scripts/lint.mjs` is run
- **THEN** Check 13 passes for that line and does not contribute a non-zero exit.

#### Scenario: valid Compute line with effort= only (model= omitted) passes Check 13
- **WHEN** `openspec/changes/<id>/tasks.md` contains `**Compute:** effort=high — first-of-kind pattern` (no `model=`) and `node scripts/lint.mjs` is run
- **THEN** Check 13 passes for that line; an absent `model=` token is valid (it defaults to sonnet at runtime) and does not cause a violation.

#### Scenario: unknown model alias is flagged by Check 13
- **WHEN** `openspec/changes/<id>/slices.md` contains `- **Compute:** effort=low model=gemini — small task` and `node scripts/lint.mjs` is run
- **THEN** Check 13 reports a violation because `gemini` is not in `{haiku, sonnet, opus}` and `node scripts/lint.mjs` exits non-zero.

#### Scenario: invalid effort value is flagged by Check 13
- **WHEN** `openspec/changes/<id>/tasks.md` contains `**Compute:** effort=medium-high model=sonnet — rationale` and `node scripts/lint.mjs` is run
- **THEN** Check 13 reports a violation because `medium-high` is not in `{low, medium, high}` and exits non-zero.

#### Scenario: Check 13 does not assert presence of Compute on every slice
- **WHEN** `openspec/changes/<id>/slices.md` has a `### Slice N` block with no `**Compute:**` line and `node scripts/lint.mjs` is run
- **THEN** Check 13 does NOT report a violation for the absence, because Check 13 is value-validation only.

### Requirement: Lint job validates surface applicability of live artifacts via Check 14
The CI `lint` job MUST include a Check 14 (`checkSurfaceApplicability`) that:
(1) reads `.claude/skills/qrspi-stack/SKILL.md`, locates the `## Repo surface`
block, and parses the present-surface list (bullet lines = present surfaces;
the `_No present surfaces._` sentinel = empty set); (2) fails loudly with a
`[surface-applicability]` error if the `## Repo surface` heading is absent OR
if the block yields neither the sentinel nor a parseable bullet list — it MUST
NOT treat absence as "no surfaces" or silently skip the check; (3) uses an
inline-hardcoded `SURFACE_GATED_HEADINGS` map (surface name → array of its
gated heading strings) to compute the absent-surface heading set (union of
headings for all taxonomy surfaces NOT in the present-set); (4) scans every
`*.md` file under `openspec/changes/**` excluding any path containing
`/archive/`, using the existing `walkMd` helper and a path filter; (5) for each
scanned file, skips heading lines inside fenced code blocks (reusing Check 11's
fence-tracking logic) and flags any non-fenced line that equals an absent-surface
heading; (6) on any hit, pushes a `[surface-applicability]` error naming the
file path, line number, the heading found, and the absent surface it belongs to.
Check 14 MUST include an inline in-memory self-test that runs the detection logic
against a synthetic in-memory fixture string containing a known absent-surface
heading, asserts the detector fires, and pushes a `[surface-applicability]` error
to the errors array if the self-test fails to detect the violation. Check 14 MUST
be registered in `scripts/lint.mjs` after Check 13 using the same
dependency-free ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 14: ...')` label in `main()`). The header comment
block in `scripts/lint.mjs` MUST be updated to list checks 1-14.

#### Scenario: kit with all six surfaces present has no absent-surface heading violations
- **WHEN** the `## Repo surface` block in `qrspi-stack` lists all six kit
  surfaces and no file under `openspec/changes/**` (outside archive) contains a
  web-app surface heading such as `## Data model` or `## API surface`, and
  `node scripts/lint.mjs` is run
- **THEN** Check 14 reports `OK` and does not contribute a non-zero exit.

#### Scenario: an artifact containing an absent-surface heading is flagged
- **WHEN** a file under `openspec/changes/**` (outside archive) contains a line
  `## Data model` and `data-store` is not in the kit's present-surface set, and
  `node scripts/lint.mjs` is run
- **THEN** Check 14 reports a `[surface-applicability]` error naming the file,
  line number, heading, and the `data-store` surface, and exits non-zero.

#### Scenario: fenced heading inside a change artifact is not flagged
- **WHEN** a change artifact contains `## Data model` inside a fenced code block
  as an illustrative example and `node scripts/lint.mjs` is run
- **THEN** Check 14 does not flag the fenced occurrence, because the fence
  tracker skips heading lines inside fenced blocks.

#### Scenario: files under archive are excluded from scanning
- **WHEN** `openspec/changes/archive/YYYY-MM-DD-some-change/design.md` contains
  an absent-surface heading and `node scripts/lint.mjs` is run
- **THEN** Check 14 does not flag the archived file, because the scanner
  excludes paths containing `/archive/`.

#### Scenario: absent Repo surface block causes Check 14 to fail loudly
- **WHEN** `.claude/skills/qrspi-stack/SKILL.md` does not contain a
  `## Repo surface` heading and `node scripts/lint.mjs` is run
- **THEN** Check 14 pushes a `[surface-applicability]` error stating that the
  `## Repo surface` block is required and exits non-zero; it does NOT silently
  treat absence as "no surfaces present".

#### Scenario: inline self-test catches a broken detector
- **WHEN** Check 14's detection logic is invoked and the inline self-test runs
  against a synthetic fixture string containing a known absent-surface heading
- **THEN** the detector fires on the fixture heading; if it fails to fire, a
  `[surface-applicability]` error is pushed to the errors array so CI reports
  the regression.

### Requirement: Lint job validates implementer variant fleet coverage and consistency via Check 15
The CI `lint` job MUST include a Check 15 (`checkVariantAgents`) registered in
`scripts/lint.mjs` after Check 14, using the same dependency-free ESM pattern
(async function pushing to `errors[]`, `process.stdout.write('Check 15: ...')`
label in `main()`). Check 15 MUST assert all four drift-prevention invariants:
(a) Coverage: the set of `claude/agents/implementer-*.md` stems exactly equals
the registry constant `IMPLEMENTER_VARIANTS = ['implementer-low',
'implementer-medium', 'implementer-high']` — any missing or stray variant MUST
be flagged; (b) Core load: each variant's step-1 "Load skills" line (as
harvested by the Check 2b harvest logic) loads only `implementer-core` — the
allowed set is exactly `{implementer-core}`, and any other unconditional skill
on that line MUST be flagged; (c) Content-matches-name: each variant's
frontmatter `effort:` value MUST match its stem suffix (`implementer-low` →
`effort: low`, etc.) — a mismatch MUST be flagged; (d) Each variant is
registered in `plugin.json` — missing registration MUST be flagged; (e)
**Base absent**: `"./claude/agents/implementer.md"` MUST NOT be present in
`plugin.json`'s `agents` array — if it is found, Check 15 MUST report a
violation and exit non-zero. Check 15 MUST carry an inline in-memory self-test
that runs the detection logic against a synthetic fixture and asserts the
detector fires; if it fails, a Check 15 error is pushed to the errors array so
CI reports the regression.

#### Scenario: base implementer.md absent from plugin.json passes sub-check (e)
- **WHEN** `./claude/agents/implementer.md` does not appear in `plugin.json`'s
  `agents` array and `node scripts/lint.mjs` is run
- **THEN** Check 15 sub-check (e) reports no violation for the base-absent
  assertion.

#### Scenario: base implementer.md re-added to plugin.json is caught by sub-check (e)
- **WHEN** a contributor re-adds `"./claude/agents/implementer.md"` to
  `plugin.json`'s `agents` array and `node scripts/lint.mjs` is run
- **THEN** Check 15 sub-check (e) reports a violation ("base implementer must
  not be registered in plugin.json") and exits non-zero.

#### Scenario: all three variants registered in plugin.json pass sub-check (d)
- **WHEN** `plugin.json` lists all three variant agent paths and `node scripts/lint.mjs`
  is run
- **THEN** Check 15 sub-check (d) reports no violation.

#### Scenario: all three variants present with correct stems pass Check 15 coverage
- **WHEN** `claude/agents/implementer-low.md`, `implementer-medium.md`, and `implementer-high.md` exist and no other `implementer-*.md` file is present, and `node scripts/lint.mjs` is run
- **THEN** Check 15 reports `OK` for the coverage assertion (sub-check (a)) and does not contribute a non-zero exit.

#### Scenario: stray variant file is caught by Check 15 coverage
- **WHEN** a contributor adds `claude/agents/implementer-xhigh.md` alongside the three approved variants and `node scripts/lint.mjs` is run
- **THEN** Check 15 reports a coverage violation (sub-check (a)) because `implementer-xhigh` is not in `IMPLEMENTER_VARIANTS`, and `node scripts/lint.mjs` exits non-zero.

#### Scenario: missing variant file is caught by Check 15 coverage
- **WHEN** `claude/agents/implementer-medium.md` is deleted and `node scripts/lint.mjs` is run
- **THEN** Check 15 reports a coverage violation (sub-check (a)) because `implementer-medium` is in `IMPLEMENTER_VARIANTS` but has no corresponding file, and `node scripts/lint.mjs` exits non-zero.

#### Scenario: variant loading an extra skill beyond implementer-core is caught by Check 15
- **WHEN** `claude/agents/implementer-low.md` step-1 line lists both `implementer-core` and `workflow` and `node scripts/lint.mjs` is run
- **THEN** Check 15 reports a core-load violation (sub-check (b)) because the allowed set is exactly `{implementer-core}` and `workflow` is not permitted, and exits non-zero.

#### Scenario: variant whose effort frontmatter mismatches its stem is caught by Check 15
- **WHEN** `claude/agents/implementer-high.md` frontmatter contains `effort: low` (wrong value for the `-high` stem) and `node scripts/lint.mjs` is run
- **THEN** Check 15 reports a content-matches-name violation (sub-check (c)) and `node scripts/lint.mjs` exits non-zero.

#### Scenario: inline self-test catches a broken Check 15 detector
- **WHEN** Check 15's detection logic is invoked and the inline self-test runs
  against a synthetic fixture
- **THEN** the detector fires on the fixture violation; if it fails to fire, a
  Check 15 error is pushed to the errors array so CI reports the regression.

### Requirement: Lint job asserts followup.md never spawns the bare implementer base stem via Check 16
The CI `lint` job MUST include a standalone Check 16 (`checkFollowupStem`)
registered in `scripts/lint.mjs` after Check 15, using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 16: ...')` label in `main()`). Check 16 MUST read
`claude/commands/followup.md` and assert that the string `qrspi:implementer`
appears only in variant forms — i.e., is always immediately followed by `-low`,
`-medium`, or `-high`. The check MUST flag any occurrence of `qrspi:implementer`
that is NOT immediately followed by a `-` character (negative-lookahead:
`qrspi:implementer(?!-)`), covering BOTH the fenced `subagent_type:
qrspi:implementer` form in Agent-tool spawn blocks AND any inline prose mention
of `qrspi:implementer` in the command body. A single predicate applied over the
whole file content (not anchored to `subagent_type:` lines only) satisfies this.

#### Scenario: followup.md with only variant spawns passes Check 16
- **WHEN** `claude/commands/followup.md` contains `qrspi:implementer-medium`
  and `qrspi:implementer-low` but no bare `qrspi:implementer` occurrence, and
  `node scripts/lint.mjs` is run
- **THEN** Check 16 reports `OK` and does not contribute a non-zero exit.

#### Scenario: bare base stem in subagent_type: block is caught
- **WHEN** `claude/commands/followup.md` contains a fenced spawn block with
  `subagent_type: qrspi:implementer` (no suffix) and `node scripts/lint.mjs`
  is run
- **THEN** Check 16 reports a violation (bare base stem detected) and exits
  non-zero.

#### Scenario: bare base stem in prose is also caught
- **WHEN** `claude/commands/followup.md` contains an inline prose line such as
  "Spawn the `qrspi:implementer` subagent via the Agent tool" (no suffix) and
  `node scripts/lint.mjs` is run
- **THEN** Check 16 reports a violation for the prose mention, because the
  check scans the whole file and not only `subagent_type:` lines.

#### Scenario: future revert of followup.md to bare base stem is caught
- **WHEN** a contributor edits `claude/commands/followup.md` and reverts the
  FIX MODE spawn to `subagent_type: qrspi:implementer` (without a suffix), and
  `node scripts/lint.mjs` runs in CI
- **THEN** Check 16 flags the revert and prevents the dead-route reintroduction
  from merging silently.

### Requirement: Lint job validates helper-agent read-contract banners via Check 17
The CI `lint` job MUST include a Check 17 (`checkHelperAgentReadContracts`)
registered in `scripts/lint.mjs` after Check 16, using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 17: ...')` label in `main()`). Check 17 MUST
maintain a separate hardcoded `HELPER_READ_CONTRACT_EXPECTED` map — distinct from
the `READ_CONTRACT_EXPECTED` map used by Check 7, which is scoped to the nine
spawnable stage agents — and assert that each non-stage helper agent file listed
in that map carries a `> **Read contract**` banner whose `Reads:` field matches
the map entry. The initial map MUST contain exactly one key: `spec-syncer`, with
expected value matching the spec-syncer's approved read contract
(`specs/** (delta) and openspec/specs/** (main)`). Check 17 MUST NOT widen Check
7's nine-agent scope. Check 17 MUST carry an inline in-memory self-test following
Check 15's inline self-test pattern — it MUST run the banner-detection logic
against a synthetic in-memory fixture, assert the detector fires on a missing
banner, and push a Check 17 error to the errors array if the self-test fails.

#### Scenario: spec-syncer carries a matching banner — Check 17 passes
- **WHEN** `claude/agents/spec-syncer.md` carries a `> **Read contract**` banner
  whose `Reads:` field matches the `HELPER_READ_CONTRACT_EXPECTED` entry for
  `spec-syncer` and `node scripts/lint.mjs` is run
- **THEN** Check 17 reports `OK` and does not contribute a non-zero exit.

#### Scenario: banner missing from spec-syncer is caught
- **WHEN** `claude/agents/spec-syncer.md` lacks a `> **Read contract**` banner
  entirely and `node scripts/lint.mjs` is run
- **THEN** Check 17 reports a missing-banner violation for `spec-syncer` and
  exits non-zero.

#### Scenario: Check 17 does not flag stage agents
- **WHEN** Check 17 runs and `claude/agents/architect.md` is present with its
  read-contract banner
- **THEN** Check 17 does not evaluate `architect.md` (it is not in
  `HELPER_READ_CONTRACT_EXPECTED`) and does not flag it.

#### Scenario: inline self-test catches a broken Check 17 detector
- **WHEN** Check 17's inline self-test runs against a synthetic fixture string
  simulating a missing banner
- **THEN** the detector fires; if it fails to fire, a Check 17 error is pushed
  to the errors array so CI reports the regression.

### Requirement: Lint job guards against MODIFIED scenario-count reduction via Check 18
The CI `lint` job MUST include a Check 18 (`checkModifiedScenarioCounts`)
registered in `scripts/lint.mjs` after Check 17, using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 18: ...')` label in `main()`). For each delta spec
file at `openspec/changes/*/specs/**/spec.md`, Check 18 MUST parse every
`### Requirement:` block under `## MODIFIED Requirements`, count the number of
`#### Scenario:` blocks in the delta for that requirement, locate the
corresponding `### Requirement:` block in `openspec/specs/<capability>/spec.md`
(using the requirement title as the lookup key), count its scenarios, and flag a
violation if the delta count is lower than the base count. If the base capability
spec does not yet exist under `openspec/specs/**` (a new capability with no base
spec), the check MUST skip that requirement rather than flagging it. Check 18
MUST exit non-zero on any scenario-count reduction found.

#### Scenario: delta MODIFIED block with fewer scenarios is flagged
- **GIVEN** `openspec/specs/foo/spec.md` has requirement `Bar` with 3 scenarios,
  and a delta at `openspec/changes/some-change/specs/foo/spec.md` has a
  `## MODIFIED Requirements` block for `Bar` with only 2 scenarios
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 18 reports a violation naming the change, the requirement
  `Bar`, and the counts `3 -> 2`, and exits non-zero.

#### Scenario: delta MODIFIED block with equal scenario count passes
- **GIVEN** `openspec/specs/foo/spec.md` has requirement `Bar` with 2 scenarios
  and the delta has a `## MODIFIED` block for `Bar` with 2 scenarios
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 18 reports no violation for that requirement.

#### Scenario: delta against a new (not-yet-created) base capability is skipped
- **GIVEN** a delta spec under `openspec/changes/some-change/specs/new-cap/spec.md`
  where `openspec/specs/new-cap/spec.md` does not exist
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 18 skips the MODIFIED blocks in that delta rather than
  flagging them, because there is no base spec to compare against.

#### Scenario: ADDED requirements are not evaluated by Check 18
- **GIVEN** a delta spec with requirements only under `## ADDED Requirements`
  and none under `## MODIFIED Requirements`
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 18 reports no violation, because the check applies only to
  `## MODIFIED Requirements` blocks.

### Requirement: Lint job asserts archive.md is the authoritative sync delegator via Check 19
The CI `lint` job MUST include a Check 19 (`checkAuthoritativeSyncDelegator`)
registered in `scripts/lint.mjs` after Check 18, using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 19: ...')` label in `main()`). Check 19 MUST
assert two static invariants: (a) `claude/commands/archive.md` contains a
reference to `qrspi:spec-syncer` (confirming it is the sync delegator); and (b)
no kit-owned file under `claude/commands/` or `claude/agents/` contains a
`subagent_type: general-purpose` spawn whose surrounding context indicates it is
performing delta-spec sync (detected by proximity to the string `sync` within
a span of lines). A violation of either invariant MUST cause Check 19 to report
an error and exit non-zero. This check guards against a future OpenSpec CLI
regeneration re-adding a `general-purpose` sync spawn in a kit-owned file.

#### Scenario: archive.md references qrspi:spec-syncer — sub-check (a) passes
- **WHEN** `claude/commands/archive.md` contains the string `qrspi:spec-syncer`
  and `node scripts/lint.mjs` is run
- **THEN** Check 19 sub-check (a) reports no violation.

#### Scenario: archive.md missing qrspi:spec-syncer reference is caught
- **WHEN** `claude/commands/archive.md` does not contain `qrspi:spec-syncer`
  and `node scripts/lint.mjs` is run
- **THEN** Check 19 sub-check (a) reports a violation ("archive.md must
  reference qrspi:spec-syncer as the sync delegator") and exits non-zero.

#### Scenario: general-purpose sync spawn re-added to a kit file is caught
- **GIVEN** a future CLI regeneration edits a kit-owned command or agent file
  to add `subagent_type: general-purpose` near a sync context
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 19 sub-check (b) flags the file and the violating line, and
  exits non-zero, preventing the ownership regression from merging silently.

#### Scenario: general-purpose in a non-sync context is not flagged
- **GIVEN** a kit-owned file contains `subagent_type: general-purpose` for a
  non-sync task (e.g., a research step) with no `sync`-related context nearby
- **WHEN** `node scripts/lint.mjs` is run
- **THEN** Check 19 does not flag that occurrence, because sub-check (b)
  requires both the `general-purpose` string and a sync-context indicator in
  proximity.

### Requirement: Lint job asserts context-budget-gate embed in 10 command bodies via BUDGET_GATE_COMMAND_STEMS
The CI `lint` job MUST include a `checkBudgetGateEmbed` check (registered in
`scripts/lint.mjs` after Check 9, following the same dependency-free ESM pattern
with an `async` function pushing to `errors[]` and a labelled
`process.stdout.write` line in `main()`) that reads each of the 10 gate-scoped
QRSPI command files (`claude/commands/questions.md`, `research.md`, `design.md`,
`structure.md`, `slices.md`, `plan.md`, `implement.md`, `pr.md`, `followup.md`,
`archive.md`) and asserts that each body contains an inline load reference to
skill `context-budget-gate`. The list of 10 command stems MUST be hardcoded in a
constant named `BUDGET_GATE_COMMAND_STEMS` so that a future command added without
the embed fails lint rather than being silently excluded. The three excluded
commands (`status.md`, `update.md`, `retro.md`) MUST NOT be in the constant.
The check MUST require the inline form (the command file names
`context-budget-gate` directly on its own load line); transitive-only embedding
MUST be flagged as a violation.

#### Scenario: all 10 command bodies carry the embed -- check passes
- **WHEN** every file in the 10-command set contains an inline `context-budget-gate`
  load reference and `node scripts/lint.mjs` is run
- **THEN** `checkBudgetGateEmbed` reports `OK` and does not contribute a
  non-zero exit.

#### Scenario: one command body drops the embed -- check fails
- **WHEN** a contributor edits `claude/commands/plan.md` and removes the
  `context-budget-gate` load line, and `node scripts/lint.mjs` is run
- **THEN** `checkBudgetGateEmbed` reports a violation naming `plan.md` and
  `node scripts/lint.mjs` exits non-zero.

#### Scenario: new gate-scoped command added without the embed -- check fails
- **WHEN** a contributor adds a new command file that is in `BUDGET_GATE_COMMAND_STEMS`
  but omits the `context-budget-gate` load line, and `node scripts/lint.mjs` is run
- **THEN** `checkBudgetGateEmbed` reports a violation for the new command file
  and exits non-zero.

#### Scenario: excluded command does not need the embed -- check does not flag it
- **WHEN** `claude/commands/status.md` carries no `context-budget-gate` load
  line and `node scripts/lint.mjs` is run
- **THEN** `checkBudgetGateEmbed` does not flag `status.md`, because it is not
  in `BUDGET_GATE_COMMAND_STEMS`.

#### Scenario: transitive-only reference does not satisfy the check
- **WHEN** a command body does not name `context-budget-gate` directly but
  reaches the gate via another skill, and `node scripts/lint.mjs` is run
- **THEN** `checkBudgetGateEmbed` reports a violation for that command, because
  the inline form is required.

### Requirement: Lint job guards against first-line-modal violation in requirement bodies via Check 20
The CI `lint` job MUST include a Check 20 (`checkRequirementFirstLineModal`)
registered in `scripts/lint.mjs` after Check 19, using the same dependency-free
ESM pattern (async function pushing to `errors[]`,
`process.stdout.write('Check 20: ...')` label in `main()`). Check 20 MUST scan
two file classes: delta specs at `openspec/changes/*/specs/**/spec.md` (excluding
any path containing `/archive/`) and base specs at `openspec/specs/**/spec.md`.
For delta files, the check MUST scan `### Requirement:` blocks under
`## ADDED Requirements` and `## MODIFIED Requirements` and MUST skip
`## REMOVED Requirements` entirely — a REMOVED body is a one-line "why removed"
rationale, not a MUST statement. For base files, the check MUST scan
`### Requirement:` blocks under `## Requirements`. For every scanned requirement,
the check MUST locate the first non-blank line of the requirement body (the first
non-blank line after the `### Requirement:` heading, up to the first
`#### Scenario:` or next `###`/`##` boundary). If that first non-blank body line
contains neither `MUST` nor `SHALL` (case-sensitive), the check MUST push a
`[must-leads]` error. If the requirement body is empty (the heading is immediately
followed by `#### Scenario:` or the next heading with no intervening non-blank
lines), the check MUST skip it without flagging — empty-body detection is a
separate concern the OpenSpec CLI owns. Check 20 MUST carry an inline in-memory
self-test covering: a passing body whose first line is `The system MUST …`; a
failing body whose first line is `When X …` with `MUST` on line 2; a `## REMOVED`
block that MUST be skipped; a base-spec-shaped fixture under `## Requirements`
with a violating body that MUST be flagged; and a fence-skip guard asserting that
a `### Requirement:` line inside a fenced code block is not treated as a real
requirement. If any self-test assertion fails the check MUST push
`[must-leads] SELF-TEST FAILED: …` and return early. Check 20 MUST report every
violating requirement in a file without short-circuiting on the first hit.

#### Scenario: ADDED requirement body leading with MUST passes Check 20
- **WHEN** a delta spec's `## ADDED Requirements` block contains a requirement
  whose first non-blank body line begins `The system MUST …` and
  `node scripts/lint.mjs` is run
- **THEN** Check 20 does not flag that requirement and does not contribute a
  non-zero exit for it.

#### Scenario: ADDED requirement body leading with When fails Check 20
- **WHEN** a delta spec's `## ADDED Requirements` block contains a requirement
  whose first line is `When the token is expired,` with `the system MUST …` on
  line 2, and `node scripts/lint.mjs` is run
- **THEN** Check 20 pushes a `[must-leads]` error naming the file, the
  requirement title, and the offending first line, and `node scripts/lint.mjs`
  exits non-zero.

#### Scenario: REMOVED requirement body is skipped by Check 20
- **WHEN** a delta spec contains a `## REMOVED Requirements` block whose
  requirement body is a one-line rationale with no modal keyword, and
  `node scripts/lint.mjs` is run
- **THEN** Check 20 does not flag that requirement, because `## REMOVED` blocks
  are excluded from scanning.

#### Scenario: base spec requirement body leading with When fails Check 20
- **WHEN** `openspec/specs/<capability>/spec.md` contains a requirement under
  `## Requirements` whose first non-blank body line lacks `MUST` or `SHALL`, and
  `node scripts/lint.mjs` is run
- **THEN** Check 20 pushes a `[must-leads]` error for the base spec requirement
  and exits non-zero.

#### Scenario: archived delta spec is excluded from Check 20
- **WHEN** `openspec/changes/archive/YYYY-MM-DD-old-change/specs/cap/spec.md`
  contains a requirement body whose first line lacks `MUST`/`SHALL`, and
  `node scripts/lint.mjs` is run
- **THEN** Check 20 does not flag the archived delta, because paths containing
  `/archive/` are excluded from the delta glob.

#### Scenario: requirement with empty body (heading followed immediately by Scenario) is skipped
- **WHEN** a delta spec contains a requirement block where `### Requirement: Foo`
  is immediately followed by `#### Scenario:` with no intervening non-blank body
  line, and `node scripts/lint.mjs` is run
- **THEN** Check 20 skips that requirement without flagging it; empty-body
  detection is a separate CLI concern.

#### Scenario: Requirement heading inside a fenced block is not evaluated
- **WHEN** a spec file contains a `### Requirement:` line inside a fenced code
  block (e.g., an example in the spec prose) and `node scripts/lint.mjs` is run
- **THEN** Check 20 does not treat that fenced line as a real requirement and
  does not evaluate it.

#### Scenario: inline self-test catches a broken Check 20 detector
- **WHEN** Check 20's inline self-test runs at the top of the check function
- **THEN** each fixture assertion fires correctly; if any assertion fails a
  `[must-leads] SELF-TEST FAILED` error is pushed so CI reports the regression.

### Requirement: Lint job asserts Format-rules bullet parity between architect.md and spec-delta.template.md via Check 21
The CI `lint` job MUST include a Check 21 (`checkFormatRulesParity`) registered
in `scripts/lint.mjs` after Check 20, using the same dependency-free ESM pattern
(async function pushing to `errors[]`,
`process.stdout.write('Check 21: ...')` label in `main()`). Check 21 MUST
extract the text delimited by `<!-- must-leads:begin -->` and
`<!-- must-leads:end -->` sentinel comments from both
`claude/agents/architect.md` and `openspec-templates/spec-delta.template.md`,
and assert the two extracted blocks are byte-identical. If either sentinel pair
is missing from either file, the check MUST push a `[format-rules-parity]`
error stating which file is missing its anchors and exit non-zero — the check
MUST NOT silently pass when an anchor is absent. If the two extracted blocks
differ, the check MUST push a `[format-rules-parity]` error indicating the two
files differ and exit non-zero. Check 21 MUST carry an inline in-memory self-test
covering: a matching pair (MUST pass); a drifted pair (MUST fail); and a
missing-anchor case (MUST fail). If any self-test assertion fails the check MUST
push `[format-rules-parity] SELF-TEST FAILED: …` and return early.

#### Scenario: matching sentinel blocks pass Check 21
- **WHEN** the `<!-- must-leads:begin/end -->` blocks in `architect.md` and
  `spec-delta.template.md` contain byte-identical text and `node scripts/lint.mjs`
  is run
- **THEN** Check 21 reports `OK` and does not contribute a non-zero exit.

#### Scenario: drifted sentinel blocks fail Check 21
- **WHEN** the Format-rules counter-example bullet is edited in `architect.md`
  but not mirrored into `spec-delta.template.md` (or vice versa), and
  `node scripts/lint.mjs` is run
- **THEN** Check 21 pushes a `[format-rules-parity]` error stating the two files
  differ and exits non-zero.

#### Scenario: missing sentinel in architect.md fails Check 21
- **WHEN** the `<!-- must-leads:begin -->` or `<!-- must-leads:end -->` comment
  is deleted from `claude/agents/architect.md` and `node scripts/lint.mjs` is run
- **THEN** Check 21 pushes a `[format-rules-parity]` error stating that
  `architect.md` is missing its sentinel anchors and exits non-zero.

#### Scenario: missing sentinel in spec-delta.template.md fails Check 21
- **WHEN** the `<!-- must-leads:begin -->` or `<!-- must-leads:end -->` comment
  is deleted from `openspec-templates/spec-delta.template.md` and
  `node scripts/lint.mjs` is run
- **THEN** Check 21 pushes a `[format-rules-parity]` error stating that
  `spec-delta.template.md` is missing its sentinel anchors and exits non-zero.

#### Scenario: inline self-test catches a broken Check 21 detector
- **WHEN** Check 21's inline self-test runs at the top of the check function
- **THEN** all three assertions (match, drift, missing-anchor) fire correctly;
  if any fails a `[format-rules-parity] SELF-TEST FAILED` error is pushed so CI
  reports the regression.

