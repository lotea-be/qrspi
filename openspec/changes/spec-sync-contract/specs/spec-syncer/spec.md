# Spec — spec-syncer

> New capability introduced by the `spec-sync-contract` change. A kit-owned
> least-privilege helper agent that owns the authoritative delta-merge contract
> and enforces the scenario-count-drop hard-stop when syncing change specs into
> base specs at archive time.

## ADDED Requirements

### Requirement: spec-syncer is a named least-privilege agent registered in plugin.json
The system MUST provide `claude/agents/spec-syncer.md` as a named agent
registered in `plugin.json`'s `agents` array with exactly the following tool
set: Read, Edit, Bash, Glob, Skill. The agent MUST NOT be granted Write, Agent,
or AskUserQuestion. Bash access is scoped by the agent's contract to
`openspec validate` invocations only. The agent name MUST use the kebab-slug
convention `spec-syncer`.

#### Scenario: spec-syncer agent file and registration exist
- **WHEN** the kit is installed and `plugin.json` is read
- **THEN** `plugin.json`'s `agents` array contains a reference to
  `./claude/agents/spec-syncer.md` and the file exists with `name: spec-syncer`
  frontmatter and a `> **Read contract**` banner.

#### Scenario: spec-syncer lacks write and agent tools
- **WHEN** `claude/agents/spec-syncer.md` is read
- **THEN** no `Write` tool, `Agent` tool, or `AskUserQuestion` tool appears in
  the agent's declared tool set; the agent edits existing spec files via the
  `Edit` tool only and cannot create new files.

### Requirement: spec-syncer carries the authoritative MODIFIED = wholesale-replacement contract
The spec-syncer agent MUST carry, in its system prompt, the authoritative
delta-merge contract stating that `## MODIFIED Requirements` semantics are
wholesale replacement: the delta's requirement body plus its complete scenario
list overwrite the corresponding base requirement — the delta is the complete
new state, never a patch. The agent MUST NOT load the generated
`openspec-sync-specs` skill and MUST NOT inherit its contradictory
"preserve scenarios not mentioned" clause.

#### Scenario: agent body states wholesale-replacement rule
- **WHEN** `claude/agents/spec-syncer.md` is read
- **THEN** the body contains a clause stating MODIFIED replaces the base
  requirement body and entire scenario list, and does not contain the phrase
  "preserve scenarios" or "scenarios not mentioned".

#### Scenario: agent does not load openspec-sync-specs
- **WHEN** `claude/agents/spec-syncer.md` is read
- **THEN** no step instructs the agent to load the `openspec-sync-specs` skill,
  and no Load-skill line references it.

### Requirement: spec-syncer hard-stops on any MODIFIED scenario-count reduction
Before writing a MODIFIED requirement, the spec-syncer agent MUST read the
pre-sync base spec at `openspec/specs/<capability>/spec.md`, count the number of
`#### Scenario:` blocks for that requirement, and compare with the delta's count.
If the delta count is lower than the base count, the agent MUST hard-stop: it
MUST NOT write that requirement, MUST return an error/blocked signal naming the
requirement and the pre/post counts, and MUST leave the base spec unmodified.
The hard-stop MUST fire on any reduction including a reduction to zero.

#### Scenario: MODIFIED delta with fewer scenarios triggers hard-stop
- **GIVEN** a base spec requirement `### Requirement: Foo` that has 3
  `#### Scenario:` blocks and a delta `## MODIFIED Requirements` block for
  `### Requirement: Foo` that lists only 2 scenarios
- **WHEN** spec-syncer processes the MODIFIED block
- **THEN** the agent does NOT overwrite the base requirement, returns an
  error/blocked signal stating "Foo: 3 -> 2 scenarios", and the base spec
  remains unchanged.

#### Scenario: MODIFIED delta with equal or more scenarios proceeds
- **GIVEN** a base spec requirement with 2 scenarios and a MODIFIED delta for
  that requirement listing 2 or more scenarios
- **WHEN** spec-syncer processes the MODIFIED block
- **THEN** the agent overwrites the base requirement with the delta's full body
  and scenario list without triggering the hard-stop.

#### Scenario: hard-stop fires on reduction to zero scenarios
- **GIVEN** a base spec requirement with 1 scenario and a MODIFIED delta for
  that requirement that lists 0 scenarios
- **WHEN** spec-syncer processes the MODIFIED block
- **THEN** the agent hard-stops and does NOT write the requirement, even though
  the delta is syntactically valid.

### Requirement: spec-syncer returns a structured result signal
The spec-syncer agent MUST return one of three distinct structured signals as its
final message so that `/qrspi:archive` can route the outcome correctly:
(a) `synced` — all delta specs were merged successfully;
(b) `blocked-on-count-drop` — at least one MODIFIED requirement reduced scenario
count; the signal MUST name each affected requirement and its pre/post counts;
(c) `escape-hatch` — the delta spec is malformed or fails `openspec validate
<id> --strict` in a way that would corrupt the base spec; the signal MUST
describe the failure.

#### Scenario: successful sync returns synced signal
- **GIVEN** a change whose delta specs all pass the count-drop check and
  `openspec validate <id> --strict`
- **WHEN** spec-syncer completes the merge
- **THEN** the agent's final message contains a `synced` signal and names the
  capabilities it updated.

#### Scenario: count-drop returns blocked-on-count-drop signal
- **GIVEN** at least one MODIFIED block with fewer scenarios than the base
- **WHEN** spec-syncer detects the reduction
- **THEN** the agent's final message contains a `blocked-on-count-drop` signal
  naming the requirement and `<pre> -> <post>` counts; the base spec is
  untouched.

#### Scenario: malformed delta returns escape-hatch signal
- **GIVEN** a delta spec that fails `openspec validate <id> --strict`
- **WHEN** spec-syncer runs validation before merging
- **THEN** the agent's final message contains an `escape-hatch` signal
  describing the validation error; no base specs are modified.

### Requirement: spec-syncer accepts a confirmed-count-drop-ok flag for re-spawning
spec-syncer MUST accept a "confirmed count-drop OK" flag (identifying the
confirmed requirement by name) when `/qrspi:archive` re-spawns it after the
human confirms an intentional scenario-count reduction, and MUST skip the
count-drop hard-stop for that specific requirement while continuing to enforce
it for all others. This preserves the single write path: the command carries no
partial merge state.

#### Scenario: re-spawn with confirmed flag skips the guard for that requirement
- **GIVEN** the human has confirmed that the scenario-count reduction in
  requirement `### Requirement: Foo` is intentional
- **WHEN** `/qrspi:archive` re-spawns spec-syncer with a "confirmed count-drop
  OK: Foo" flag
- **THEN** spec-syncer skips the count-drop check for `Foo` and proceeds to
  write the MODIFIED block, while still enforcing the guard for all other
  MODIFIED requirements in the same run.

#### Scenario: confirmed flag does not suppress guard for other requirements
- **GIVEN** a re-spawn with a confirmed flag for requirement `Foo`
- **WHEN** spec-syncer processes a different MODIFIED requirement `Bar` that
  also has a count reduction
- **THEN** the agent hard-stops on `Bar`'s reduction regardless of the flag
  for `Foo`.

### Requirement: spec-syncer carries a read-contract banner
The `claude/agents/spec-syncer.md` file MUST carry a `> **Read contract**`
banner near the top of the file. The banner's `Reads:` field MUST state:
`specs/**` (delta) and `openspec/specs/**` (main, via the spec.md exception).
The banner MUST state that the agent opens no process artifacts.

#### Scenario: banner Reads field matches the helper row in the Read Matrix
- **WHEN** `claude/agents/spec-syncer.md` is opened
- **THEN** the `> **Read contract**` banner states that the agent reads the
  change's `specs/**` delta files and the base `openspec/specs/**` specs, and
  explicitly states it opens no process artifacts (questions.md, research.md,
  design.md, proposal.md, slices.md, tasks.md, pr.md, followups.md).
