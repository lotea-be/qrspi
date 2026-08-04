# backlog-writer Specification

## Purpose
TBD - created by archiving change backlog-schema-finish. Update Purpose after archive.

## Requirements
### Requirement: backlog-writer skill MUST carry the full canonical row-append procedure
The system MUST ship `claude/skills/backlog-writer/SKILL.md` containing the
complete procedure for appending a new `idea` row to `openspec/backlog.md` in a
Check-22-valid form. The procedure MUST cover the following steps in order: (1)
dedup by intent — read the backlog, identify near-matches by intent (not exact
wording), and offer the human an AskUserQuestion choice of proceed or abort if a
near-match exists; (2) propose P-band placement — offer the P-band (`P1`, `P2`,
or `P3`) and `## Ideas` section placement interactively via `AskUserQuestion`;
(3) collect the body fields and construct the row — collect **both** `**Why:**`
and `**Shape:**` as a **per-idea** interactive propose-and-confirm prompt
(propose a concrete value derived from the captured intent, then offer the human
`Use this` / `Write my own` via `AskUserQuestion`, processing **one idea at a
time** — never batching several ideas' Why/Shape prose into a single plain-text
prompt, and never offering a lone free-text placeholder option), then build a
`### <slug> — \`idea\` · **P<n>**` heading (real em-dash U+2014, middle-dot
U+00B7, bold band token) carrying those `**Why:**` and `**Shape:**` body fields;
(4) stage the append — write the row under `## Ideas` and stage the file. The skill
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

#### Scenario: every free-text body field is collected per-idea via propose-and-confirm
- **WHEN** `claude/skills/backlog-writer/SKILL.md` is read
- **THEN** the procedure collects **both** the `**Why:**` and the `**Shape:**` as a
  per-idea `AskUserQuestion` propose-and-confirm step (a proposed value plus a
  `Use this` / `Write my own` choice, never a lone free-text placeholder),
  processing one idea at a time, and does not instruct batching multiple ideas'
  Why or Shape prose into a single plain-text prompt.

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

### Requirement: command-level backlog-append sites MUST delegate to backlog-writer
The system MUST ensure that every command body that appends an `idea` row to
`openspec/backlog.md` — the Q-stage capture in `claude/commands/questions.md`, the
D-stage capture in `claude/commands/design.md`, the S-stage capture in
`claude/commands/structure.md`, and the "Promote to backlog idea" path in
`claude/commands/pr.md` — loads `backlog-writer` and delegates row construction and
staging to its procedure, rather than embedding an inline copy of the frozen heading
grammar. These command bodies are the genuine orchestrator-level append sites for
stages Q, D, and S (and the PR follow-up promote path), because the capture offer is
an `AskUserQuestion` that only the main-loop orchestrator, not the stage agent, can
issue. The questioner, designer, and architect agents retain their `backlog-writer`
registration (harmless — they load the skill and identify candidate separable
changes, but the orchestrator that spawns them owns the offer + append). The
referential grammar copy in `claude/commands/slices.md` (which does not itself
append — stage V does not capture) MUST be trimmed to a pointer to the frozen grammar
rather than a full inline block.

#### Scenario: questions.md Q-stage capture delegates to backlog-writer
- **WHEN** `claude/commands/questions.md`'s deferred-work capture step is read
- **THEN** it instructs the main-loop orchestrator to offer each candidate separable
  change (via `AskUserQuestion`) and, on accept, load `backlog-writer` and follow its
  append procedure; and the questioner agent (`claude/agents/questioner.md`) no longer
  issues the capture `AskUserQuestion` offer itself (which a subagent cannot), instead
  surfacing candidate separable changes in its returned summary for the orchestrator.

#### Scenario: design.md D-stage capture delegates to backlog-writer
- **WHEN** `claude/commands/design.md`'s "Capture deferred work" step is read
- **THEN** it instructs loading `backlog-writer` and following its append procedure,
  and does not contain a standalone inline `### <slug> — \`idea\` · **P<n>**` heading
  grammar block with `**Why:**`/`**Shape:**` construction prose.

#### Scenario: structure.md S-stage capture delegates to backlog-writer
- **WHEN** `claude/commands/structure.md`'s capture step is read
- **THEN** it instructs loading `backlog-writer` and following its append procedure,
  and does not contain a standalone inline heading-grammar construction block.

#### Scenario: pr.md promote-to-backlog path delegates to backlog-writer
- **WHEN** `claude/commands/pr.md`'s "Promote to backlog idea" reconciliation path
  is read
- **THEN** it instructs loading `backlog-writer` and following its append procedure,
  and does not contain a standalone inline heading-grammar construction block.

#### Scenario: no inline grammar copy remains at any append site after migration
- **WHEN** the kit source tree is scanned for the inline row-construction pattern
  (`### <slug> — \`idea\`` followed by `**Why:**`/`**Shape:**` construction prose)
  outside `claude/skills/backlog-writer/` and `openspec-templates/`
- **THEN** no command or agent body contains such an inline block — the shared
  `backlog-writer` procedure (and the frozen template) are the only places the row
  grammar is expressed.
