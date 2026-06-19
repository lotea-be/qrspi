# Proposal — reconcile-plan-worktree-order

> Stage S of QRSPI. Generated 2026-06-19.

## Why

The QRSPI kit's "Worktree" stage had two problems: its name collided with the
real git concept of a git worktree (a built-in Claude Code feature), and five
sources (the `qrspi-workflow` skill description, the `openspec-workflow` table,
`backlog.md` header, and `context-hygiene` prose) stated the stage order as
S → P → W, while the actual execution chain (command `Next-stage command:`
lines and `status.md`) correctly implements S → W → P. This change resolves
both problems by renaming the stage to "Slices" (stage code `V`, command
`/qrspi:slices`, artifact `slices.md`) and reconciling all five disagreeing
sources to the correct execution order S → Slices → P. The acronym QRSPI is
kept and a lineage note is added to explain that Design, Slices, and PR sit
outside the five acronym letters. Existing change folders retain their
`worktree.md` files with a one-line annotation noting the pre-rename stage
name, so history is preserved without silent rewriting.

## What Changes

- **Rename command** `claude/commands/worktree.md` → `claude/commands/slices.md`;
  update stage code W → V, artifact name `worktree.md` → `slices.md`, title and
  headings; next-stage pointer (`/qrspi:plan`) and preconditions
  (`proposal.md` + `specs/`) stay unchanged.
- **Update `structure.md`** next-stage pointer `/qrspi:worktree` →
  `/qrspi:slices`; update the "then `/qrspi:plan`" aside.
- **Update `plan.md`** precondition artifact `worktree.md` → `slices.md`;
  on-failure pointer `/qrspi:worktree` → `/qrspi:slices`.
- **Update `status.md`** inference table: `worktree.md → P` row →
  `slices.md`; stage labels W → V / Slices; "eight stages" count stays.
- **Update `claude/agents/architect.md`** (D4): rename the W branch to
  Slices / V throughout — `## Stage routing`, `## What to do — Worktree (W)` →
  `## What to do — Slices (V)`, W-only final-message format, and
  `worktree.md` → `slices.md` throughout.
- **Update `claude/agents/planner.md`** input filename `worktree.md` →
  `slices.md`; no agent rename.
- **Update `claude/skills/qrspi-workflow/SKILL.md`** (D3, D6): frontmatter
  `description:` list order to Q, R, D, S, Slices, P, I, PR; `## The eight
  stages` W bullet → Slices (V); add QRSPI acronym lineage note; add one-line
  note that the kit orders Slices → Plan (intentional divergence from the RPI
  blog).
- **Update `claude/skills/vertical-slice/SKILL.md`**: "(W stage)" →
  "(Slices stage)"; `worktree.md` → `slices.md`.
- **Update `claude/skills/openspec-workflow/SKILL.md`**: stage table row
  `W — Worktree → worktree.md` → `V — Slices → slices.md`; reorder to
  S → V (Slices) → P.
- **Verify `claude/skills/context-hygiene/SKILL.md`**: no W mention to rename
  (line 71 lists alignment as `Q, R, D, S, P` — no edit needed).
- **Update `README.md`**: stage table row 5 → Slices / `/qrspi:slices` /
  `slices.md`; add acronym lineage note (D6); "eight stages" count stays.
- **Update `CLAUDE.md`** and **`CONTRIBUTING.md`**: any `Worktree` /
  `worktree.md` → `Slices` / `slices.md`.
- **Update `openspec/backlog.md`** header chain
  `(Q → R → D → S → P → W → I → PR)` → `(Q → R → D → S → V → P → I → PR)`.
- **Update `sync-copilot.mjs`**: rename `'qrspi-worktree'` key →
  `'qrspi-slices'` in both the `agentFor` map (lines 34-40) and the `hintFor`
  map (lines 41-48); the wipe-and-rebuild drops `qrspi-worktree.prompt.md`
  automatically.
- **Annotate `example-greeting/worktree.md`** and
  **`kit-quality-hardening/worktree.md`** with a one-line header note:
  "Produced under the pre-rename Worktree stage; the current kit calls this
  Slices (`slices.md`)." No content rewrite.

## Capabilities

### New Capabilities

- _none_

### Modified Capabilities

- `qrspi-command-surface`: The slice-planning stage is renamed from Worktree
  (W, `/qrspi:worktree`, `worktree.md`) to Slices (V, `/qrspi:slices`,
  `slices.md`); the stage sequence is reconciled to Q R D S Slices P I PR;
  the QRSPI acronym is documented as a lineage label with a note that Design,
  Slices, and PR sit outside the five letters — needs a delta spec.

## Impact

- Migrations: no schema migrations; two historical `worktree.md` files gain a
  one-line annotation comment (D7).
- Breaking changes: the command `/qrspi:worktree` is replaced by
  `/qrspi:slices`; any external reference to the old command name or artifact
  name will need updating. The Copilot prompt `qrspi-worktree.prompt.md` is
  replaced by `qrspi-slices.prompt.md` on next sync.
- Phases: single phase (all edits ship together); no multi-epic split needed.
- Affected code / APIs / dependencies: `claude/commands/worktree.md` (rename),
  `claude/commands/structure.md`, `claude/commands/plan.md`,
  `claude/commands/status.md`, `claude/agents/architect.md`,
  `claude/agents/planner.md`, `claude/skills/qrspi-workflow/SKILL.md`,
  `claude/skills/vertical-slice/SKILL.md`,
  `claude/skills/openspec-workflow/SKILL.md`, `README.md`, `CLAUDE.md`,
  `CONTRIBUTING.md`, `openspec/backlog.md`, `sync-copilot.mjs`,
  `openspec/changes/example-greeting/worktree.md`,
  `openspec/changes/kit-quality-hardening/worktree.md`.

## Out of scope

- **Adding a `slices.template.md`** — design D5 explicitly rejects this.
  The inline skeleton in `architect.md` remains the single source. Can be
  revisited separately if template drift becomes a problem.
- **The `AskUserQuestion`-ownership gap** — research surfaced that
  `AskUserQuestion` appears in agent body text for questioner, designer, and
  implementer but is absent from those agents' `tools:` lists. This is an
  independent concern unrelated to the Worktree → Slices rename; it belongs
  in a separate backlog item.
- **`context-hygiene/SKILL.md` line 71 grouping rationale** — research noted
  the skill does not explicitly state why P is in alignment and W is in
  execution. The reconciliation here fixes the label (P stays in alignment,
  Slices takes the V code in execution); a more thorough narrative update to
  context-hygiene is out of scope.
