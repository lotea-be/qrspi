# Questions — reconcile-plan-worktree-order

> Stage Q of QRSPI. Generated 2026-06-19.
> Change summary: Decide and document the canonical placement of slice-definition
> and the Plan/Worktree stage order, reconciling the kit's S -> W -> P flow against
> the cited QRSPI source's S -> P -> Work-Tree.

## Decisions (resolved at Q via PQ answers)

> ⮕ **Superseded at D-review (see [design.md](design.md) D1–D3).** PQ1's
> *collapse to two stages* was **reversed** during Design: keep **three** stages,
> **rename** Worktree → **Slices** (stage code **V**), and reconcile all docs to
> **S → Slices → P**. The acronym/migration/absorption decisions below still hold;
> only the collapse is overturned. The original Q answers are kept for the record.

> These narrow the scope for stages R/D/S. The "Stage topology" body sections
> below were written before the decision and are now constrained by it.

- **Collapse to two stages (PQ1).** Remove the Worktree stage. **S** owns
  `proposal.md` + `specs/` **plus the vertical-slice plan**; **P** (read-only
  planner) owns `tasks.md` derived from those slices. Net stage set:
  **Q R D S P I PR (7)**. Rationale: the source already defines slices at S, the
  Plan stage today is pure transcription, and parallel/per-slice-worktree
  execution (the one reason to keep a slice-tree stage) would fight the kit's
  per-slice human-checkpoint model.
- **This change absorbs both sibling items (PQ2).** `rename-worktree-stage`
  becomes **moot** (the stage ceases to exist) and `clarify-qrspi-acronym` folds
  in as a one-line note carried here.
- **Keep the QRSPI / "Crispy" acronym; accept the count dropping to seven (PQ3).**
  Removing Worktree makes the acronym *more* honest (Q-R-S-P-I are all real
  stages; only D and PR sit outside). Update "eight stages" prose to seven.
- **Migrate everything (PQ4).** All three PRs are merged (none open), so rewrite
  `example-greeting` (canonical docs/CI fixture) **and** `kit-quality-hardening`
  to the new stage set for consistency.

This is a **kit-design change** (it edits the QRSPI workflow itself), not a CRUD
data feature. The standard Data model / Indexing / API / UI / Front-end state /
Migrations sections are therefore **Not applicable** — kept as headings so stage S
does not re-litigate — and replaced with sections that fit a workflow change.

## Data model — Not applicable
No entities, tables, or DTOs. The "model" here is the stage topology, encoded in
markdown files, not a data store.

## Indexing & query performance — Not applicable

## API — Not applicable
No HTTP surface. The closest analogue is the slash-command surface (`/qrspi:*`),
covered under "Stage topology & affected files" below.

## UI — Not applicable

## Front-end state — Not applicable

## Migrations & data — Not applicable
No data migration. The analogue is migrating *existing change-folder artifacts*
(in-flight `kit-quality-hardening`, `example-greeting`) that already encode the old
order — covered under "Backward compatibility" below.

## Current state (facts to confirm before designing)
1. Does the kit today run **S -> W -> P -> I**? (Confirm via the `Next-stage
   command` lines: [structure.md:58](../../../claude/commands/structure.md#L58)
   -> worktree, [worktree.md:34](../../../claude/commands/worktree.md#L34) ->
   plan, [plan.md:33](../../../claude/commands/plan.md#L33) -> implement.)
2. Does the cited source run **S -> P -> Work-Tree -> I**, with vertical slices
   defined *at Structure*, and Work-Tree only *organizing tasks into a hierarchy
   based on the slices from the Structure Outline*? (Source:
   alexlavaee.me/blog/from-rpi-to-qrspi.)
3. Where does the kit define slices today — in S or in W? (Today: W, via
   [worktree.md:18-21](../../../claude/commands/worktree.md#L18-L21) +
   `vertical-slice` skill. S writes only proposal.md + specs/.)
4. Does the kit's own `backlog.md` header already list `P -> W`
   ([backlog.md:4](../../../openspec/backlog.md#L4)) while the commands run W
   before P — i.e. is the repo already internally inconsistent?
5. What exactly does the Plan stage add over Worktree today? (Today: planner turns
   worktree.md into a checkbox `tasks.md`; the command calls it "quick and
   mechanical" — confirm it is purely a transcription step.)

## Stage topology & affected files
6. Which files encode the S/W/P order and slice-ownership, and must therefore
   change in lockstep? At minimum: the three commands above, `claude/agents/`
   (`architect`, `planner`), skills (`qrspi-workflow`, `vertical-slice`,
   `context-hygiene` mentions), the README stage table, `backlog.md` header, and
   `openspec-templates/` (worktree/tasks shapes).
7. If a stage is removed or merged, which slash command(s) and agent(s) get
   deleted vs repurposed? (e.g. does `planner` survive, or fold into `architect`?)
8. Does Check 4 of `scripts/lint.mjs` (every shipped `/qrspi:*` command is
   documented, every documented one resolves) need updating if a command is
   removed or renamed?

## Choreography & human gates
9. How many human gates does the current S -> W -> P chain impose (precondition +
   commit + handoff per stage), and how many would the target topology impose?
10. Does the shared "Stage choreography" section in `qrspi-workflow` need editing,
    or only the per-stage variables in the affected commands?
11. Do the backlog-atomicity `Next QRSPI command:` lines (set by S->worktree,
    W->plan, P->implement) need rewiring to the new order?

## Naming overlap with sibling backlog items
12. Does this change touch the same files as `rename-worktree-stage` and
    `clarify-qrspi-acronym`? (It does — all three edit the stage list/naming.)
    Should they be sequenced, merged, or kept independent? (See PQ2.)

## Copilot parity & sync
13. Any reorder/rename of `claude/commands/*` regenerates `copilot/prompts/*` via
    `sync-copilot.mjs`. Confirm the change must include the regenerated `copilot/`
    tree and pass `node sync-copilot.mjs --check` (zero drift) — Copilot may not lag.

## Templates & inline skeletons
14. The artifact shapes live in three places (agent-inline, `openspec-templates/`,
    and the README description). If a stage merges, all three must move together —
    which is canonical, and does `centralize-the-artifact-skeletons` (a
    `kit-quality-hardening` scope item) front-run or conflict with this?

## Documentation
15. Beyond the README stage table, which prose must change: the `backlog.md`
    header order, the eight-stages narrative in `qrspi-workflow`, and any
    "S -> W -> P" reference in `CLAUDE.md` / `CONTRIBUTING.md`?

## Backward compatibility
16. Existing artifacts already encode the old order: in-flight
    `kit-quality-hardening` has `worktree.md` + `tasks.md`; `example-greeting`
    does too. Do we migrate these, or apply the new topology to *new* changes only
    and leave historical ones as-is? (See PQ4.)

## Testing / verification
17. How is the reordered flow verified end-to-end given item #4
    (`verify-stage-gate-execution`) — by an actual `/qrspi` run, or only by lint +
    sync-check? Should this change *also* settle who holds `AskUserQuestion`, or
    stay narrowly scoped to ordering?
18. What is the acceptance test: `node scripts/lint.mjs` green, `node
    sync-copilot.mjs --check` zero-drift, README stage table matches commands,
    and a manual stage walk?

## Sequencing & scope
19. Is this change a prerequisite for `rename-worktree-stage` (rename is cheaper
    once the stage's existence/placement is settled), or independent?
20. Should the fix to the `backlog.md` header inconsistency (#4 above) ship inside
    this change, or is it a trivial doc fix to do immediately regardless of the
    larger topology decision?

## Open product questions (for the human)
- [x] **PQ1 — Target topology:** Which structure do we adopt? Options:
  (a) **Realign to the source** — slices defined at S, run S -> P -> Work-Tree;
  (b) **Keep S -> W -> P** as-is and just *document* the deliberate divergence;
  (c) **Collapse to two stages** — fold slice-definition into S, merge W's task
  breakdown into P (drop a stage, a subagent, and a human gate);
  (d) **Collapse the other way** — keep W (slices + tasks together), delete the
  separate P stage.
  **Answer: (c) Collapse to two stages. S owns proposal + specs + the slice plan; P (read-only planner) owns tasks.md. Worktree stage removed; stage set becomes Q R D S P I PR (7).**
- [x] **PQ2 — Bundle the naming items?** This change overlaps `rename-worktree-stage`
  and `clarify-qrspi-acronym`. Options: (a) merge all three into one "stage-model
  cleanup" change; (b) make this one land first, then do the renames as follow-ons;
  (c) keep strictly independent. (Depends on PQ1: a collapse that removes the
  Worktree stage *moots* `rename-worktree-stage`.)
  **Answer: (a) This change absorbs both. `rename-worktree-stage` is moot (stage removed); `clarify-qrspi-acronym` folds in as a one-line note.**
- [x] **PQ3 — Public stage count:** If PQ1 collapses a stage, the "eight stages"
  identity (README, skill narrative, the QRSPI acronym story) changes. Options:
  (a) accept a new count (e.g. "seven stages") and update all docs; (b) preserve
  "eight stages" framing and reject any option that changes the count; (c) defer —
  let stage S decide once the topology is chosen.
  **Answer: (a) Keep the QRSPI / "Crispy" acronym (it's the branding) and accept the count dropping to seven; update the "eight stages" prose accordingly.**
- [x] **PQ4 — Migrate existing artifacts?** `kit-quality-hardening` and
  `example-greeting` already encode the old order. Options: (a) new topology
  applies to *new* changes only, leave history untouched; (b) migrate the
  reference `example-greeting` (it doubles as docs/CI fixture) but not the
  in-flight one; (c) migrate everything for consistency.
  **Answer: (c) Migrate everything — all PRs are merged (none open), so rewrite both `example-greeting` and `kit-quality-hardening` to the new stage set.**
