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
listed. The variant body MUST NOT carry a `> **Read contract**` or
`> **Output contract**` banner (those banners remain on `implementer.md`
only). No `context-hygiene`, `vertical-slice`, or `workflow` skill is loaded
directly by a variant; the `implementer-core` skill is the sole home of
those delegations.

#### Scenario: implementer-medium body loads only implementer-core
- **WHEN** `claude/agents/implementer-medium.md` body is read
- **THEN** its step-1 line names `implementer-core` and no other unconditional kit skill appears on any numbered-step load line; no `> **Read contract**` or `> **Output contract**` banner is present in the file.

#### Scenario: variant carries no read/output-contract banner
- **WHEN** any of the three variant agent files is read after the change ships
- **THEN** no line matching `/^>\s*\*\*Read contract\*\*/` or `/^>\s*\*\*Output contract\*\*/` appears in the file.

### Requirement: implementer-core skill exists with required frontmatter and the shared implementer body
The system MUST create `claude/skills/implementer-core/SKILL.md` with YAML
frontmatter containing `name:` and `description:`, and a body that holds the
complete, reusable implementer logic: precondition check, cross-change read
boundary, "What to do" prose, coding rules, "when you get stuck" guidance,
ASCII rule, "what you must NOT do" list, divergence self-check, fix mode
instructions, and the per-slice final-message format.

#### Scenario: implementer-core skill passes frontmatter lint
- **WHEN** `claude/skills/implementer-core/SKILL.md` is read and `node scripts/lint.mjs` is run
- **THEN** Check 2 passes for `implementer-core` because the file carries both `name:` and `description:` frontmatter fields.

#### Scenario: implementer-core skill is resolvable from a variant body
- **WHEN** `claude/agents/implementer-low.md` references `implementer-core` and `node scripts/lint.mjs` is run
- **THEN** Check 2's skill-reference check resolves `claude/skills/implementer-core/SKILL.md` and does not report a dangling reference.

### Requirement: Base implementer.md loads implementer-core and its SKILL_SET_EXPECTED entry includes it
The system MUST update `claude/agents/implementer.md` so its body loads
`implementer-core` (the refactored shared body), and MUST update the
`SKILL_SET_EXPECTED['implementer']` entry in `scripts/lint.mjs` to include
`implementer-core` alongside the existing skills. The read/output-contract
banners MUST remain on `implementer.md`. The base `implementer.md` keeps
`model: opus` in its frontmatter.

#### Scenario: base implementer loads implementer-core
- **WHEN** `claude/agents/implementer.md` is read after the change ships
- **THEN** a numbered-step load line for `implementer-core` is present in the body; the `> **Read contract**` and `> **Output contract**` banners are also present.

#### Scenario: SKILL_SET_EXPECTED registry includes implementer-core for the implementer stem
- **WHEN** `scripts/lint.mjs` is read after the change ships
- **THEN** the `SKILL_SET_EXPECTED['implementer']` (or equivalent map entry) array includes `implementer-core` alongside the other declared skills.

#### Scenario: checkSkillSets passes for the base implementer after the registry update
- **WHEN** `claude/agents/implementer.md` loads `implementer-core` and the `SKILL_SET_EXPECTED` registry entry reflects that addition, and `node scripts/lint.mjs` is run
- **THEN** `checkSkillSets` reports `OK` for `implementer.md` and does not contribute a non-zero exit.

