# Spec — backlog-writer

> New capability introduced by the `backlog-schema-finish` change. Shared kit skill owning the canonical procedure for appending a Check-22-valid idea row to openspec/backlog.md.

## ADDED Requirements

### Requirement: backlog-writer skill MUST carry the full canonical row-append procedure
The system MUST ship `claude/skills/backlog-writer/SKILL.md` containing the
complete procedure for appending a new `idea` row to `openspec/backlog.md` in a
Check-22-valid form. The procedure MUST cover the following steps in order: (1)
dedup by intent — read the backlog, identify near-matches by intent (not exact
wording), and offer the human an AskUserQuestion choice of proceed or abort if a
near-match exists; (2) propose P-band placement — offer the P-band (`P1`, `P2`,
or `P3`) and `## Ideas` section placement interactively via `AskUserQuestion`;
(3) construct the row — build a `### <slug> — \`idea\` · **P<n>**` heading (real
em-dash U+2014, middle-dot U+00B7, bold band token) with `**Why:**` (from the
captured intent) and `**Shape:**` (from an interactive prompt) body fields; (4)
stage the append — write the row under `## Ideas` and stage the file. The skill
MUST reference the frozen row grammar (the backlog template and Check 22 remain
the single sources of truth) rather than restating it; the skill is the procedure,
not the grammar.

#### Scenario: skill is loadable from the kit plugin
- **WHEN** a command or agent body contains `Load skill backlog-writer` in a
  consumer repo where the kit plugin is installed
- **THEN** `claude/skills/backlog-writer/SKILL.md` is found under the plugin's
  `claude/skills/backlog-writer/` directory and loads successfully.

#### Scenario: skill carries the dedup step
- **WHEN** `claude/skills/backlog-writer/SKILL.md` is read
- **THEN** the procedure includes an explicit dedup step: read the backlog, check
  for near-matches by intent, and offer the human a proceed/abort choice before
  continuing.

#### Scenario: skill carries the interactive P-band proposal step
- **WHEN** `claude/skills/backlog-writer/SKILL.md` is read
- **THEN** the procedure includes an explicit step to propose a P-band and
  `## Ideas` placement via `AskUserQuestion` (always interactive; no positional
  argument bypasses this step).

#### Scenario: row produced by the skill satisfies Check 22
- **WHEN** a caller follows the backlog-writer procedure and the resulting row is
  written to `openspec/backlog.md`, and `node scripts/lint.mjs` is run
- **THEN** Check 22 finds the row satisfies all six assertions: frozen heading
  grammar, valid status keyword, both `**Why:**` and `**Shape:**` present.

### Requirement: backlog-writer skill MUST be registered in scripts/skill-sets.mjs
The system MUST register `backlog-writer` in `scripts/skill-sets.mjs` so that
Check 2 (`checkSkillSets`) can resolve `Load skill backlog-writer` references in
agent bodies. The registration MUST appear in the `SKILL_SET_EXPECTED` map for
every agent that loads the skill (questioner, designer, architect) and the skill
directory `claude/skills/backlog-writer/` MUST be present so Check 2's file-system
resolution succeeds.

#### Scenario: Check 2 resolves backlog-writer for the questioner
- **WHEN** `claude/agents/questioner.md` references `Load skill backlog-writer`
  and `node scripts/lint.mjs` is run
- **THEN** Check 2 resolves the reference to `claude/skills/backlog-writer/SKILL.md`
  and reports no dangling skill reference.

#### Scenario: Check 2 resolves backlog-writer for the designer
- **WHEN** `claude/agents/designer.md` references `Load skill backlog-writer`
  and `node scripts/lint.mjs` is run
- **THEN** Check 2 resolves the reference and reports `OK` for that agent.

#### Scenario: Check 2 resolves backlog-writer for the architect
- **WHEN** `claude/agents/architect.md` references `Load skill backlog-writer`
  and `node scripts/lint.mjs` is run
- **THEN** Check 2 resolves the reference and reports `OK` for that agent.

### Requirement: backlog-writer skill MUST NOT restate the frozen row grammar
The system MUST ensure that `claude/skills/backlog-writer/SKILL.md` does not
contain a standalone inline copy of the heading regex, the status enum, or the
separator character specification from Check 22 or the backlog template. The skill
MUST reference those sources (e.g., "per the frozen grammar in
`openspec-templates/backlog.template.md` and Check 22") rather than restating
them, so that `backlog-writer` is not a second grammar source and cannot drift
from the template independently.

#### Scenario: skill references the template rather than restating the regex
- **WHEN** `claude/skills/backlog-writer/SKILL.md` is read
- **THEN** the skill prose points to `openspec-templates/backlog.template.md`
  and/or Check 22 as the authoritative grammar source, and does not contain a
  standalone copy of the heading grammar regex or the separator character list.
