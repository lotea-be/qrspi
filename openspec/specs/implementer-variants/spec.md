# implementer-variants Specification

## Purpose
TBD - created by archiving change per-slice-compute-tier. Update Purpose after archive.
## Requirements
### Requirement: Three effort-variant implementer agents exist with effort-suffixed filenames
The system MUST provide three implementer variant agent files —
`claude/agents/implementer-low.md`, `claude/agents/implementer-medium.md`, and
`claude/agents/implementer-high.md` — each carrying YAML frontmatter with
`name:`, `description:`, `tools:`, `model: sonnet` (neutral fallback default),
and an `effort:` field whose value matches the file's suffix (`low`, `medium`,
or `high` respectively). No `profile:` frontmatter field is present.

#### Scenario: implementer-low carries correct frontmatter
- **WHEN** `claude/agents/implementer-low.md` is read
- **THEN** its frontmatter contains `effort: low`, `model: sonnet`, and a `name:` and `description:` field; no `profile:` key is present.

#### Scenario: implementer-high carries correct frontmatter
- **WHEN** `claude/agents/implementer-high.md` is read
- **THEN** its frontmatter contains `effort: high`, `model: sonnet`, and a `name:` and `description:` field; no `profile:` key is present.

#### Scenario: effort value matches the filename suffix for all three variants
- **WHEN** each of the three variant agent files is read after the change ships
- **THEN** the `effort:` frontmatter value equals the suffix of the filename: `implementer-low` → `effort: low`, `implementer-medium` → `effort: medium`, `implementer-high` → `effort: high`.

### Requirement: Each variant's body loads only implementer-core as its step-1 skill
The system MUST write each variant agent body so that its first numbered step
is "Load skill `implementer-core`" and no other unconditional kit skill is
listed. Each variant MUST carry a `> **Read contract**` banner (full verbatim
text matching the read-matrix row for stage I: `Reads: tasks.md.`) and a
`> **Output contract**` banner (presence matching the pattern
`/^>\s*\*\*Output contract\*\*/`) near the top of the file, before the
numbered step. No `context-hygiene`, `vertical-slice`, or `workflow` skill is
loaded directly by a variant; the `implementer-core` skill is the sole home of
those delegations. The banners MUST be blockquote lines, NOT numbered-step
lines, so that `extractStep1Skills` does not harvest them and Check 15
sub-check (b) is not tripped.

#### Scenario: implementer-medium body loads only implementer-core as step-1
- **WHEN** `claude/agents/implementer-medium.md` body is read
- **THEN** its step-1 numbered line names `implementer-core` and no other
  unconditional kit skill appears on any numbered-step load line.

#### Scenario: all three variants carry read-contract banner verbatim
- **WHEN** any of the three variant agent files is read after the change ships
- **THEN** a line matching `/^>\s*\*\*Read contract\*\*/` is present near the
  top, and the `Reads:` field in that banner reads exactly `Reads: tasks.md.`

#### Scenario: all three variants carry output-contract banner
- **WHEN** any of the three variant agent files is read after the change ships
- **THEN** a line matching `/^>\s*\*\*Output contract\*\*/` is present near
  the top of the file.

#### Scenario: banners are blockquotes, not numbered steps
- **WHEN** `claude/agents/implementer-low.md` is read and the step-1 harvest
  regex is applied
- **THEN** the banner lines are not harvested as step-1 skill loads because
  they begin with `>` not with a digit-dot pattern; Check 15 sub-check (b)
  sees only `implementer-core` in the step-1 set and reports no violation.

### Requirement: implementer-core skill exists with required frontmatter and the shared implementer body
The system MUST maintain `claude/skills/implementer-core/SKILL.md` with YAML
frontmatter containing `name:` and `description:`, where the `description:`
MUST reference the effort-variant agents (e.g. "Load this from the implementer
effort-variant agents") and MUST NOT mention `implementer.md`. The body holds
the complete, reusable implementer logic: precondition check, cross-change read
boundary, "What to do" prose, coding rules, "when you get stuck" guidance,
ASCII rule, "what you must NOT do" list, divergence self-check, fix mode
instructions, and the per-slice final-message format.

#### Scenario: implementer-core description no longer mentions implementer.md
- **WHEN** `claude/skills/implementer-core/SKILL.md` frontmatter is read after
  the change ships
- **THEN** the `description:` field does not contain the string `implementer.md`
  and instead references the variant agents (e.g. "Load this from the
  implementer effort-variant agents").

#### Scenario: implementer-core body is still complete and self-contained
- **WHEN** `claude/skills/implementer-core/SKILL.md` body is read
- **THEN** it still contains all sections of the shared implementer logic:
  precondition check, fix mode section, divergence self-check, and per-slice
  final-message format.

### Requirement: Base implementer agent is absent from the repo and plugin.json
The system MUST NOT include `claude/agents/implementer.md` in the repository,
and MUST NOT register `"./claude/agents/implementer.md"` in `plugin.json`'s
`agents` array. The `SKILL_SET_EXPECTED` map in `scripts/lint.mjs` MUST NOT
contain an `implementer` key; it MUST instead contain three keys
`implementer-low`, `implementer-medium`, and `implementer-high`, each with
value `['implementer-core']`, so that Check 2b (`checkSkillSets`) and
`context-footprint.mjs` iterate the variant set correctly.

#### Scenario: implementer.md does not exist after the change ships
- **WHEN** the repository is read after the change ships
- **THEN** no file at the path `claude/agents/implementer.md` exists.

#### Scenario: plugin.json agents array does not list the base agent
- **WHEN** `.claude-plugin/plugin.json` is read after the change ships
- **THEN** the `agents` array does not contain `"./claude/agents/implementer.md"`,
  and contains exactly nine agent paths (the six stage agents plus the three
  implementer variants).

#### Scenario: SKILL_SET_EXPECTED carries three variant keys, no base key
- **WHEN** `scripts/lint.mjs` is read after the change ships
- **THEN** `SKILL_SET_EXPECTED` contains keys `implementer-low`,
  `implementer-medium`, and `implementer-high` (each mapping to
  `['implementer-core']`) and does NOT contain an `implementer` key.

#### Scenario: checkSkillSets passes for all three variants after registry update
- **WHEN** each variant agent body loads `implementer-core` and the
  `SKILL_SET_EXPECTED` registry contains the three variant keys, and
  `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports `OK` for all three variants and does not
  contribute a non-zero exit.

