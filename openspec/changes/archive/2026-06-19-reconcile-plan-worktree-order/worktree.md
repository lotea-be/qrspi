# Worktree — reconcile-plan-worktree-order

> Stage W of QRSPI. Generated 2026-06-19.
> Vertical slices, not horizontal layers.

## Overview

This change is a pure markdown-and-script rename with no runtime app to demo.
The invariant that stands in for a browser checkpoint is: **`node
scripts/lint.mjs` exits 0 AND `node sync-copilot.mjs --check` reports zero
drift** after each slice. Every slice must leave the repository in that
green state.

Three slices cover the full change surface. Slice 1 is the most constrained:
the command file rename, the `sync-copilot.mjs` key renames, and the README
stage-table row must all land together because lint Check 4 is bi-directional
(command filename ↔ README entry) and `--check` compares the generated
`copilot/` tree against what `sync-copilot.mjs` would produce from the current
`claude/` source. Splitting any of those three edits across slices would leave
an intermediate state that fails one of the two gatekeepers. Slices 2 and 3
are independent of each other and of Slice 1's coupling constraint; they could
be applied in either order, but the sequencing below (prose then migration
annotations) is the natural reading order for a reviewer.

Note: because there is no Mock API / Frontend / DB / Tests decomposition
applicable to a pure-markdown change, each slice's bullets use the labels
Files (the files edited), Lint (the mechanical check that replaces "T —
Tests"), and Checkpoint (the human verification step). The per-slice
model annotation follows the `vertical-slice` skill heuristic: all three
slices are mechanical renames and text substitutions with no judgment
required, so all are `sonnet`.

## Slices

### Slice 1 — Atomic rename: command, sync script, copilot regeneration, README table row

The human can verify at the end of this slice that `/qrspi:slices` exists as
a command (the command file is present and its frontmatter names the new stage
correctly), that `copilot/prompts/qrspi-slices.prompt.md` has been generated
and `copilot/prompts/qrspi-worktree.prompt.md` is gone, and that both lint
gates are green. This slice deliberately bundles several touch-points because
they form an atomic correctness unit: separating them would leave intermediate
states that fail `--check` or lint Check 4.

- Files:
  - `claude/commands/worktree.md` → **rename** to `claude/commands/slices.md`;
    update stage code `W` → `V`, title, headings, artifact name
    `worktree.md` → `slices.md`; next-stage pointer (`/qrspi:plan`) and
    preconditions (`proposal.md` + `specs/`) stay unchanged; update commit
    message and git-add line.
  - `claude/commands/structure.md`: next-stage pointer `/qrspi:worktree` →
    `/qrspi:slices`; the "then `/qrspi:plan`" aside updated to name Slices.
  - `claude/commands/plan.md`: precondition artifact `worktree.md` →
    `slices.md`; on-failure pointer `/qrspi:worktree` → `/qrspi:slices`.
  - `claude/commands/status.md`: inference table row `worktree.md → P` →
    `slices.md → P`; stage labels `W` → `V` / Slices.
  - `claude/agents/architect.md`: rename the W branch to Slices / V
    throughout — `## Stage routing`, `## What to do — Worktree (W)` →
    `## What to do — Slices (V)`, W-only final-message format, and
    `worktree.md` → `slices.md` throughout.
  - `claude/agents/planner.md`: input filename `worktree.md` → `slices.md`.
  - `sync-copilot.mjs`: rename `'qrspi-worktree'` key → `'qrspi-slices'` in
    both the `agentFor` map (lines ~34-40) and the `hintFor` map (lines
    ~41-48).
  - Run `node sync-copilot.mjs` to regenerate `copilot/` (the wipe-and-rebuild
    drops `qrspi-worktree.prompt.md` and emits `qrspi-slices.prompt.md`
    automatically).
  - `README.md`: stage table row 5 → "Slices" / `/qrspi:slices` / `slices.md`
    (the rename in the table; the acronym note lands in Slice 2).
- **Model:** sonnet — mechanical rename and string substitution across known
  files; no architectural judgment required.
- Checkpoint:
  1. `grep -r "qrspi:worktree" /workspaces/git/qrspi/claude/ /workspaces/git/qrspi/copilot/ /workspaces/git/qrspi/README.md` returns no output.
  2. `ls /workspaces/git/qrspi/claude/commands/slices.md` exists; `ls /workspaces/git/qrspi/claude/commands/worktree.md` returns "No such file".
  3. `ls /workspaces/git/qrspi/copilot/prompts/qrspi-slices.prompt.md` exists; `ls /workspaces/git/qrspi/copilot/prompts/qrspi-worktree.prompt.md` returns "No such file".
  4. `node /workspaces/git/qrspi/sync-copilot.mjs --check` exits 0 (zero drift).
  5. `node /workspaces/git/qrspi/scripts/lint.mjs` exits 0 (all checks pass, including Check 4).

### Slice 2 — Prose reconciliation: skill bodies, acronym note, CLAUDE.md, CONTRIBUTING.md, backlog header

The human can verify at the end of this slice that no unintentional "Worktree"
/ "stage W" wording survives in the kit's prose layer, that the acronym
lineage note appears in both the `qrspi-workflow` skill and `README.md`, and
that both lint gates remain green. The implement skill reference to "architect
at stage W" in `claude/commands/implement.md` is also cleaned up here since it
is a prose-layer concern, not part of the atomic rename constraint.

- Files:
  - `claude/skills/qrspi-workflow/SKILL.md`: frontmatter `description:` list
    order updated to Q, R, D, S, Slices, P, I, PR; `## The eight stages` W
    bullet → Slices (V); add QRSPI acronym lineage note (D6); add one-line
    note that the kit orders Slices → Plan (intentional divergence from the
    RPI blog, D3).
  - `claude/skills/vertical-slice/SKILL.md`: "(W stage)" → "(Slices stage)";
    `worktree.md` → `slices.md`.
  - `claude/skills/openspec-workflow/SKILL.md`: stage table row
    `W — Worktree → worktree.md` → `V — Slices → slices.md`; reorder row to
    appear between S and P.
  - `claude/skills/context-hygiene/SKILL.md`: verify only (line 71 already
    lists alignment as `Q, R, D, S, P` with no W); no edit needed.
  - `claude/commands/implement.md`: "architect at stage W" → "architect at
    stage V (Slices)"; `worktree.md` references in prose → `slices.md`.
  - `README.md`: add acronym lineage note (D6) in the appropriate prose
    section (near or after the stage table introduced in Slice 1); confirm
    "eight stages" count is unchanged.
  - `CLAUDE.md`: any `Worktree` / `worktree.md` references not already covered
    by Slice 1 → `Slices` / `slices.md`.
  - `CONTRIBUTING.md`: same substitution as CLAUDE.md.
  - `openspec/backlog.md`: header chain
    `(Q → R → D → S → P → W → I → PR)` → `(Q → R → D → S → V → P → I → PR)`.
- **Model:** sonnet — prose-level text substitution and addition of a
  documented one-liner note; the content of the acronym note is specified
  verbatim in D6 and the spec; no novel prose composition required.
- Checkpoint:
  1. `grep -ri "stage w\b\|worktree" /workspaces/git/qrspi/claude/ /workspaces/git/qrspi/README.md /workspaces/git/qrspi/CLAUDE.md /workspaces/git/qrspi/CONTRIBUTING.md /workspaces/git/qrspi/openspec/backlog.md` returns no matches (only intentional historical references in the migrated change folders should remain).
  2. `grep -i "lineage\|Q-R-S-P-I\|crispy" /workspaces/git/qrspi/claude/skills/qrspi-workflow/SKILL.md` returns the acronym note line.
  3. `grep -i "lineage\|Q-R-S-P-I\|crispy" /workspaces/git/qrspi/README.md` returns the acronym note line.
  4. `node /workspaces/git/qrspi/sync-copilot.mjs --check` exits 0 (zero drift — no `claude/` skill/agent bodies changed that affect `copilot/` since Slice 1 already regenerated it; skills are not synced to copilot/).
  5. `node /workspaces/git/qrspi/scripts/lint.mjs` exits 0.

### Slice 3 — Migration annotations on historical worktree.md files

The human can verify at the end of this slice that the two historical
`worktree.md` artifacts each carry the one-line header note and that their
body content is unchanged below the annotation. This is a read-then-prepend
operation with no downstream coupling; lint and sync remain green because
neither tool inspects these archived change-folder files.

- Files:
  - `openspec/changes/example-greeting/worktree.md`: prepend a one-line
    header note immediately after the `# Worktree — example-greeting` title:
    `> Produced under the pre-rename Worktree stage; the current kit calls this Slices (\`slices.md\`).`
    All original content below is unchanged.
  - `openspec/changes/kit-quality-hardening/worktree.md`: same annotation,
    immediately after that file's `# Worktree — kit-quality-hardening` title.
    All original content below is unchanged.
- **Model:** sonnet — single-line prepend to two files; the exact wording is
  specified in D7 and the spec; no judgment required.
- Checkpoint:
  1. `head -3 /workspaces/git/qrspi/openspec/changes/example-greeting/worktree.md` shows the title on line 1 and the annotation note on line 2 (or 3 after a blank line).
  2. `head -3 /workspaces/git/qrspi/openspec/changes/kit-quality-hardening/worktree.md` shows the same pattern.
  3. Diff the two files against HEAD to confirm only the annotation line was prepended and no other content changed.
  4. `node /workspaces/git/qrspi/scripts/lint.mjs` exits 0.
  5. `node /workspaces/git/qrspi/sync-copilot.mjs --check` exits 0.
