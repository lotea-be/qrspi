# Design — reconcile-plan-worktree-order

> Stage D of QRSPI. Generated 2026-06-19. Revised at D-review (direction
> changed from "collapse" to "rename + reconcile" — see D1).
> **APPROVED by the human 2026-06-19** (A1=no new template, A2=letter V / word
> Slices, A3=stay eight stages). Cleared for stage S (Structure).

## Context

The QRSPI kit (this repo) ships an eight-stage workflow as markdown
command/agent/skill files plus a Node sync script that mirrors `claude/` into
`copilot/`. Two stages — **S (Structure)** and **W (Worktree)** — are both
driven by the `architect` agent, split by which artifact they write: S writes
`proposal.md` + `specs/`; W writes `worktree.md` (the vertical-slice plan). **P
(Plan)** then transcribes the slices into `tasks.md` via the read-only `planner`.

Two problems, both found in research.md:
1. **Naming collision.** "Worktree" has nothing to do with git worktrees (a real
   Claude Code feature). The source called it two words ("Work Tree" = a tree of
   work); the kit compressed it to the git token.
2. **Ordering inconsistency.** The execution chain runs **S→W→P** (command
   next-stage lines + `status.md`), but four documents state or imply **P before
   W** (`qrspi-workflow` frontmatter + body grouping, `openspec-workflow` table,
   `backlog.md` header; `context-hygiene` merely omits W).

## Decisions

### D1 — Keep three stages; **rename**, do not collapse

The Q stage's initial answer (PQ1) was to collapse S+W into two stages. **At
D-review the human reversed this:** keep three stages so each has a clear,
separate role — **Structure** produces `proposal.md` + `specs/`; **Slices**
(renamed Worktree) takes the proposal and cuts it into the vertical-slice plan;
**Plan** turns those slices into `tasks.md`. The collapse is explicitly **not**
pursued (it risked a ~350-line `proposal.md` for complex changes — e.g.
`kit-quality-hardening` would be proposal 144 + slices 207 lines — and blurred
the architect's two distinct jobs).

### D2 — Stage code **V** (Vertical); Structure stays **S**

Renaming Worktree → "Slices" collides with Structure's stage letter S. Structure
must keep **S** because it is the literal S in the QRSPI/"Crispy" acronym.
Worktree was **never** in the acronym (QRSPI = Q-R-S-P-I), so renaming it leaves
the acronym untouched. The Slices stage takes the single-letter code **V**
("Vertical slices" — emphasizing the kit's core vertical-not-horizontal
discipline), matching the existing one-letter codes (D, P, I) and staying
visually distinct from S. **Rejected:** two-letter `St`/`Sl` (read near-
identically); `L` (weaker mnemonic than V).

| | name | command | artifact | stage code |
|---|---|---|---|---|
| before | Worktree | `/qrspi:worktree` | `worktree.md` | W |
| after | Slices | `/qrspi:slices` | `slices.md` | V |

### D3 — Reconcile all sources to **S → Slices → P** (the execution order)

We adopt the kit's **existing execution order** (S→Slices→P) and fix the four
documents that disagree — we do **not** adopt the cited blog's S→P→Work-Tree.
Rationale: slices-then-tasks-from-slices is the natural data flow (Plan needs the
slices as input), and it is what the commands already do. The divergence from the
blog is now intentional and documented (a one-line note in `qrspi-workflow`).

### D4 — `architect` stays dual-use (S + Slices); `planner` re-points filename

The architect keeps its two-stage routing — only the W branch is **renamed** to
Slices (`## Stage routing`, `## What to do — Worktree (W)` → `## ... — Slices
(V)`, the W final-message format, and worktree.md → slices.md). The inline slice
skeleton (architect.md:201-230) stays inline and is retitled. `planner.md` +
`plan.md` change only their precondition/input filename: `worktree.md` →
`slices.md`. `tasks.md` shape is unchanged.

### D5 — No new template (parity with today)

Research confirms **no `worktree.template.md` ever existed** — the slice shape was
inline-only in `architect.md`. We keep that: **no `slices.template.md` is added**
(minimal change; the inline skeleton remains the single source). The five existing
templates are untouched. *(Open question A1 below offers to revisit this.)*

### D6 — Acronym note in skill **and** README (A3)

Add a one-line note where the acronym is first explained (the `qrspi-workflow`
skill intro) **and** in the README: *"QRSPI / 'Crispy' is a lineage label from the
RPI ancestry; Design, Slices, and PR sit outside the five acronym letters
(Q-R-S-P-I)."* The acronym is kept (PQ3); the stage count stays **eight**.

### D7 — Migrate existing folders by **annotation, not rewrite** (A2)

`example-greeting` and `kit-quality-hardening` keep their `worktree.md` files
**as-is**, each gaining a one-line header note: *"Produced under the pre-rename
**Worktree** stage; the current kit calls this **Slices** (`slices.md`)."* No
silent rewrite — history is preserved, and the note prevents confusion when both
`worktree.md` (historical) and `slices.md` (going forward) exist in the repo.

## Affected files (the change surface)

**Commands (`claude/commands/`):**

| File | Edit |
|---|---|
| `worktree.md` | **rename file → `slices.md`**; stage `W`→`V`, title/heading, `worktree.md`→`slices.md`; next-stage stays `/qrspi:plan`; precondition stays `proposal.md` + `specs/` |
| `structure.md` | next-stage `/qrspi:worktree`→`/qrspi:slices`; backlog `Next QRSPI command:` line same; the "then `/qrspi:plan`" aside updated |
| `plan.md` | precondition `worktree.md`→`slices.md`; on-failure pointer `/qrspi:worktree`→`/qrspi:slices` |
| `status.md` | inference table `worktree.md → P` row → `slices.md`; stage labels `W`→`V`/Slices; "eight stages" intro unchanged |

**Agents (`claude/agents/`):** `architect.md` (D4 — rename W branch to Slices/V),
`planner.md` (input filename). No agent file is renamed or deleted.

**Skills (`claude/skills/`):**

| File | Edit |
|---|---|
| `qrspi-workflow/SKILL.md` | frontmatter `description:` "Worktree"→"Slices"; `## The eight stages` W bullet → Slices (V); intro acronym note (D6); one-line note that the kit orders Slices→Plan (diverging from the blog, D3) |
| `vertical-slice/SKILL.md` | "written by the architect (W stage)"→"(Slices stage)"; `worktree.md`→`slices.md` |
| `openspec-workflow/SKILL.md` | stage table `W — Worktree → worktree.md` row → `V — Slices → slices.md`; place it as `S → Slices → P` |
| `context-hygiene/SKILL.md` | verify only — line 71 already lists alignment `(Q,R,D,S,P)`; no W to rename |

**Docs:** `README.md` (stage table row 5 → Slices/`/qrspi:slices`/`slices.md`;
acronym note D6; keep "eight"), `CLAUDE.md` + `CONTRIBUTING.md` (any
`Worktree`/`worktree.md` → `Slices`/`slices.md`), `openspec/backlog.md` header
`(Q → R → D → S → P → W → I → PR)` → `(Q → R → D → S → V → P → I → PR)` (fixes
**both** the order and the rename).

## Copilot / sync impact

Deterministic through `sync-copilot.mjs` (research Area 6):
- Renaming `claude/commands/worktree.md` → `slices.md` makes the generator emit
  `copilot/prompts/qrspi-slices.prompt.md`; the **wipe-and-rebuild** drops the
  stale `qrspi-worktree.prompt.md` automatically — no manual `copilot/` edit.
- The `agentFor` (lines 34-40) and `hintFor` (41-48) maps carry a
  `'qrspi-worktree'` key → **rename both keys to `'qrspi-slices'`**. This is a
  **script** edit (`sync-copilot.mjs`), not a forbidden `copilot/` edit.
- `scripts/lint.mjs` Check 4 (every command file ↔ a `/qrspi:*` in README) stays
  green because the command rename and the README row change land together.
- Acceptance: `node sync-copilot.mjs --check` zero-drift + `node scripts/lint.mjs`
  green + README table matches commands + `grep -ri "worktree"` over
  `claude/ README.md CLAUDE.md CONTRIBUTING.md` returns only the intentional
  historical notes in the migrated folders.

## Risks / Trade-offs

- **Wide rename.** Many "Worktree"/"worktree.md"/"stage W" touch-points; the
  `grep` gate is the backstop, and `/qrspi-readme-audit` should run post-edit
  (CLAUDE.md "Keep the README current").
- **Code `V` ≠ command `slices`.** Slight letter/name mismatch (V for Slices),
  accepted to avoid the S-collision and documented in the skill.
- **Two artifact names coexist.** Historical `worktree.md` (in migrated folders)
  vs going-forward `slices.md`; the D7 header note disambiguates.
- **Order divergence from the blog is now load-bearing.** We keep S→Slices→P;
  the D3 note must state this is intentional so a future reader doesn't "re-fix"
  it back toward the blog.

## Open questions for the human

- [ ] **A1 — Add a `slices.template.md`?** D5 keeps the skeleton inline-only
  (matches today's no-worktree-template state). Now that Slices is a first-class
  named artifact, do you want a template under `openspec-templates/` for parity
  with the other five? *(Recommend: no — keep inline, minimal change; revisit
  separately if template drift becomes a problem.)*
- [ ] **A2 — Letter vs word in lists.** Use the single letter **V** in
  letter-style sequences (backlog header, "stage V" labels) and the word
  **Slices** in name columns (README table)? *(Recommend: yes.)*
- [ ] **A3 — Stage count prose.** Stays **eight stages** (no collapse). Confirm
  no "seven stages" wording is introduced anywhere. *(Recommend: confirm.)*
