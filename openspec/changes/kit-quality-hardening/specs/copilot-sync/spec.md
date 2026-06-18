# Spec — copilot-sync

> New capability introduced by the `kit-quality-hardening` change. Defines the
> Node.js generator that produces the `copilot/` tree from `claude/` sources,
> including correctness guards and the `--check` drift-detection mode.

## ADDED Requirements

### Requirement: Node generator replaces PowerShell
The system MUST provide a committed `sync-copilot.mjs` (Node.js ES module) at
the repo root that performs the same `claude/ → copilot/` transform previously
performed by `sync-copilot.ps1`, invoked as `node sync-copilot.mjs [--check]`.
The PowerShell script (`sync-copilot.ps1`) and its bash wrapper
(`sync-copilot.sh`) SHALL be deleted from the repo.

#### Scenario: normal generation run
- **WHEN** a contributor runs `node sync-copilot.mjs`
- **THEN** the `copilot/` directory is fully regenerated from `claude/` sources,
  the console prints a summary line (`Generated -> copilot/: agents=N prompts=N
  instructions=N`), and the process exits 0.

#### Scenario: no pwsh dependency required
- **WHEN** the generator runs on any OS with Node.js installed
- **THEN** it completes successfully without requiring `pwsh` or PowerShell 7+.

### Requirement: Source guard before wiping output
The generator MUST verify that `claude/agents/`, `claude/commands/`, and
`claude/skills/` all exist and are non-empty before deleting and recreating the
`copilot/` output directory, aborting with a clear error message to stderr if
any directory is missing or empty.

#### Scenario: source directory missing
- **WHEN** `sync-copilot.mjs` is invoked and `claude/agents/` does not exist or
  is empty
- **THEN** the generator prints an error to stderr ("Source directory missing or
  empty: claude/agents/") and exits non-zero without touching `copilot/`.

### Requirement: Check mode exits non-zero on drift
When invoked with `--check`, the generator MUST exit with a non-zero exit code
if any file in the freshly generated output differs from the committed `copilot/`
tree, and MUST exit 0 if and only if the two trees are identical.

#### Scenario: drift detected
- **WHEN** `node sync-copilot.mjs --check` is run and one or more generated
  files differ from `copilot/`
- **THEN** the differing files are reported to stdout with per-line diff detail,
  a summary count is printed, and the process exits 1.

#### Scenario: no drift detected
- **WHEN** `node sync-copilot.mjs --check` is run and the generated tree exactly
  matches `copilot/`
- **THEN** the process prints no diff output and exits 0.

### Requirement: Deleted-file detection in check mode
In `--check` mode, the generator MUST compare the union of the committed
`copilot/` tree and the freshly generated tree, so that a file present in the
committed `copilot/` but no longer produced by generation is flagged as drift.

#### Scenario: file deleted from generation
- **WHEN** a source file is removed from `claude/` such that its corresponding
  `copilot/` output would no longer be generated, and `node sync-copilot.mjs --check`
  is run
- **THEN** the now-orphaned `copilot/` file is reported as a difference and the
  process exits 1.

### Requirement: Temp-dir cleanup on error in check mode
In `--check` mode, the generator MUST wrap temporary directory operations in a
try/finally block so that the scratch directory is removed even if the generator
encounters an unhandled error mid-run.

#### Scenario: mid-run error in check mode
- **WHEN** `node sync-copilot.mjs --check` is run and an unhandled error occurs
  after the temp directory is created but before generation completes
- **THEN** the temp directory is removed before the process exits, leaving no
  stale scratch directories behind.

### Requirement: Missing SKILL.md warning exits non-zero
The generator MUST warn to stderr and increment an error counter when a
directory under `claude/skills/` does not contain a `SKILL.md` file, and MUST
exit non-zero after completing all other work if any such missing-SKILL
condition was encountered.

#### Scenario: skill directory without SKILL.md
- **WHEN** a directory exists under `claude/skills/` but contains no `SKILL.md`
  file and the generator runs
- **THEN** a warning is printed to stderr identifying the directory, generation
  of all valid skills proceeds to completion, and the process exits 1.

### Requirement: Opsx entries removed from generator tables
The generator MUST NOT contain `$agentFor` / `$hintFor` table entries (or their
Node.js equivalents) for the deleted opsx commands (`opsx-propose`,
`opsx-explore`, `opsx-apply`, `opsx-archive`, `opsx-sync`).

#### Scenario: generator tables are clean
- **WHEN** `sync-copilot.mjs` is inspected or run
- **THEN** no references to `opsx-propose`, `opsx-explore`, `opsx-apply`,
  `opsx-archive`, or `opsx-sync` appear in the command-mapping or hint tables.
