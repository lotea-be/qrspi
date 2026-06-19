# Spec — qrspi-command-surface

> Delta against `openspec/changes/kit-quality-hardening/specs/qrspi-command-surface/spec.md`
> for the `reconcile-plan-worktree-order` change.
> Renames the Worktree stage to Slices (stage code V, command `/qrspi:slices`,
> artifact `slices.md`), reconciles the stage sequence to S → Slices → P in
> all five disagreeing sources, and adds an acronym lineage note.

## ADDED Requirements

### Requirement: Stage sequence is S → Slices → P
The stage execution sequence MUST be Q R D S Slices P I PR, with the Slices
stage occurring between Structure and Plan. No shipped document or file in the
kit SHALL state or imply that Plan (P) precedes the Slices stage (V).

#### Scenario: README stage table reflects correct order
- **WHEN** a reader opens `README.md` and reads the numbered stage table
- **THEN** row 5 is "Slices" and row 6 is "Plan" (Slices before Plan), and
  no row is labeled "Worktree".

#### Scenario: qrspi-workflow skill description reflects correct order
- **WHEN** the `claude/skills/qrspi-workflow/SKILL.md` frontmatter
  `description:` field is read
- **THEN** it lists the stages in the order: Questions, Research, Design,
  Structure, Slices, Plan, Implement, PR (Slices before Plan).

#### Scenario: openspec-workflow skill table reflects correct order
- **WHEN** the stage-to-artifact table in
  `claude/skills/openspec-workflow/SKILL.md` is read
- **THEN** the V (Slices) row appears between S (Structure) and P (Plan),
  and no row is labeled W or Worktree.

#### Scenario: backlog header reflects correct order and stage code
- **WHEN** the header chain in `openspec/backlog.md` is read
- **THEN** it reads `Q → R → D → S → V → P → I → PR` (V before P, not P before W).

#### Scenario: command next-stage chain enforces order
- **WHEN** the `Next-stage command:` lines in the stage command files are
  read in sequence
- **THEN** `structure.md` points to `/qrspi:slices`, `slices.md` (the renamed
  command file) points to `/qrspi:plan`, and no command file references
  `/qrspi:worktree` as a next stage.

### Requirement: Slice-planning stage named Slices with code V
The slice-planning stage (previously named Worktree, code W) MUST be renamed
to "Slices" with stage code V. It SHALL be invoked by the command
`/qrspi:slices`, write the artifact `slices.md`, and be driven by the
`architect` agent. No shipped command, agent body, skill, or documentation
file SHALL refer to this stage as "Worktree" or use the stage code W for this
stage, except in the migration annotation on historical `worktree.md` artifacts.

#### Scenario: no shipped command named /qrspi:worktree
- **WHEN** a user lists available QRSPI commands
- **THEN** no command named `/qrspi:worktree` appears; instead `/qrspi:slices`
  is available.

#### Scenario: slices command writes slices.md
- **WHEN** `/qrspi:slices <id>` is run for a change that has `proposal.md`
  and at least one `specs/<capability>/spec.md`
- **THEN** the architect agent writes
  `openspec/changes/<id>/slices.md` (not `worktree.md`).

#### Scenario: plan command reads slices.md
- **WHEN** `/qrspi:plan <id>` is invoked
- **THEN** its precondition check Globs for `openspec/changes/<id>/slices.md`
  (not `worktree.md`), and points the user to `/qrspi:slices` on failure.

#### Scenario: architect agent stage routing updated
- **WHEN** the `claude/agents/architect.md` `## Stage routing` section is read
- **THEN** it names `/qrspi:slices` and `slices.md` (not `/qrspi:worktree`
  and `worktree.md`) for the slice-planning branch.

#### Scenario: status command inference table updated
- **WHEN** `status.md`'s artifact-to-stage inference table is read
- **THEN** the presence of `slices.md` maps to the next command `/qrspi:plan`,
  and no row maps `worktree.md` to P.

#### Scenario: copilot sync produces qrspi-slices prompt not qrspi-worktree
- **WHEN** `node sync-copilot.mjs` is run after the rename
- **THEN** `copilot/prompts/qrspi-slices.prompt.md` is generated and
  `copilot/prompts/qrspi-worktree.prompt.md` does not exist.

#### Scenario: lint check 4 passes with renamed command
- **WHEN** `node scripts/lint.mjs` is run after the rename
- **THEN** Check 4 passes: `slices.md` command is documented as `/qrspi:slices`
  in README, and no undocumented command file or stale README entry is found.

### Requirement: QRSPI acronym documented as a lineage label
The `qrspi-workflow` skill body and the `README.md` MUST each contain a note
clarifying that "QRSPI" / "Crispy" is a lineage label inherited from the RPI
ancestry, and that the Design, Slices, and PR stages sit outside the five
acronym letters (Q-R-S-P-I). The Structure stage MUST be identified as the S
in the acronym. No documentation SHALL introduce "seven stages" wording; the
stage count remains eight.

#### Scenario: acronym note appears in qrspi-workflow skill
- **WHEN** the `claude/skills/qrspi-workflow/SKILL.md` body is read
- **THEN** it contains a note that QRSPI / Crispy is a lineage label from RPI
  ancestry, and that Design, Slices, and PR sit outside the five acronym
  letters.

#### Scenario: acronym note appears in README
- **WHEN** a reader opens `README.md`
- **THEN** the document contains a note that the acronym letters Q-R-S-P-I
  correspond to Questions, Research, Structure, Plan, Implement, and that
  Design, Slices, and PR are additional stages outside the acronym.

#### Scenario: stage count remains eight
- **WHEN** any prose in the kit is searched for a stage count
- **THEN** all count references read "eight stages", not "seven stages" or
  "nine stages".

### Requirement: Historical worktree.md files annotated on pre-rename history
The kit MUST annotate each `worktree.md` artifact in existing change folders
(produced before this rename) with a one-line header note stating that the
file was produced under the pre-rename Worktree stage and that the current kit
calls this stage Slices with artifact `slices.md`. The file content after the
annotation MUST NOT be altered.

#### Scenario: example-greeting worktree.md is annotated
- **WHEN** `openspec/changes/example-greeting/worktree.md` is read
- **THEN** the first or second line contains a note referencing the Worktree
  stage rename and the new Slices / slices.md name, and all original content
  below the annotation is unchanged.

#### Scenario: kit-quality-hardening worktree.md is annotated
- **WHEN** `openspec/changes/kit-quality-hardening/worktree.md` is read
- **THEN** the first or second line contains a note referencing the Worktree
  stage rename and the new Slices / slices.md name, and all original content
  below the annotation is unchanged.
