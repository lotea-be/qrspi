# Tasks — reconcile-plan-worktree-order

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Atomic rename: command, sync script, copilot regeneration, README table row

**Model:** sonnet — mechanical rename and string substitution across known files; no architectural judgment required.

- [x] 1.1 Rename `claude/commands/worktree.md` → `claude/commands/slices.md`; update stage code `W` → `V`, title, all headings, artifact name `worktree.md` → `slices.md`; keep next-stage pointer `/qrspi:plan` and preconditions `proposal.md` + `specs/` unchanged; update the commit-message string and the `git add` line inside the file (D2, D4)
- [x] 1.2 Edit `claude/commands/structure.md`: replace next-stage pointer `/qrspi:worktree` → `/qrspi:slices`; update the "then `/qrspi:plan`" aside to name Slices (D3)
- [x] 1.3 Edit `claude/commands/plan.md`: replace precondition artifact `worktree.md` → `slices.md`; replace on-failure pointer `/qrspi:worktree` → `/qrspi:slices` (D4)
- [x] 1.4 Edit `claude/commands/status.md`: replace inference table row `worktree.md → P` → `slices.md → P`; replace stage labels `W` → `V` / Slices throughout (D2, D3)
- [x] 1.5 Edit `claude/agents/architect.md`: rename W branch to Slices / V throughout — `## Stage routing`, `## What to do — Worktree (W)` → `## What to do — Slices (V)`, W-only final-message format, and all `worktree.md` → `slices.md` occurrences (D4)
- [x] 1.6 Edit `claude/agents/planner.md`: replace input filename `worktree.md` → `slices.md` (D4)
- [x] 1.7 Edit `sync-copilot.mjs`: rename `'qrspi-worktree'` key → `'qrspi-slices'` in the `agentFor` map (lines ~34-40) and in the `hintFor` map (lines ~41-48) (D2)
- [x] 1.8 Run `node sync-copilot.mjs` to wipe and regenerate `copilot/`; confirm `copilot/prompts/qrspi-slices.prompt.md` is created and `copilot/prompts/qrspi-worktree.prompt.md` is gone (D2)
- [x] 1.9 Edit `README.md`: update stage table row 5 → Slices / `/qrspi:slices` / `slices.md` (the acronym note is Slice 2) (D2, D3)
- [x] 1.10 Checkpoint — run all five gates:
  - `grep -r "qrspi:worktree" /workspaces/git/qrspi/claude/ /workspaces/git/qrspi/copilot/ /workspaces/git/qrspi/README.md` returns no output
  - `ls /workspaces/git/qrspi/claude/commands/slices.md` exists; `ls /workspaces/git/qrspi/claude/commands/worktree.md` returns "No such file"
  - `ls /workspaces/git/qrspi/copilot/prompts/qrspi-slices.prompt.md` exists; `ls /workspaces/git/qrspi/copilot/prompts/qrspi-worktree.prompt.md` returns "No such file"
  - `node /workspaces/git/qrspi/sync-copilot.mjs --check` exits 0 (zero drift)
  - `node /workspaces/git/qrspi/scripts/lint.mjs` exits 0 (all checks pass, including Check 4)

## 2. Prose reconciliation: skill bodies, acronym note, CLAUDE.md, CONTRIBUTING.md, backlog header

**Model:** sonnet — prose-level text substitution and addition of a documented one-liner note; the content of the acronym note is specified verbatim in D6 and the spec; no novel prose composition required.

- [ ] 2.1 Edit `claude/skills/qrspi-workflow/SKILL.md`: update frontmatter `description:` list order to Q, R, D, S, Slices, P, I, PR; rename `## The eight stages` W bullet → Slices (V); add QRSPI acronym lineage note (D6); add one-line note that the kit orders Slices → Plan (intentional divergence from the RPI blog, D3)
- [ ] 2.2 Edit `claude/skills/vertical-slice/SKILL.md`: replace "(W stage)" → "(Slices stage)"; replace `worktree.md` → `slices.md` throughout (D4)
- [ ] 2.3 Edit `claude/skills/openspec-workflow/SKILL.md`: update stage table row `W — Worktree → worktree.md` → `V — Slices → slices.md`; reorder the row so it falls between S and P (D3)
- [ ] 2.4 Verify `claude/skills/context-hygiene/SKILL.md` line 71: confirm it already lists alignment as `Q, R, D, S, P` with no W reference — no edit needed (D4)
- [ ] 2.5 Edit `claude/commands/implement.md`: replace "architect at stage W" → "architect at stage V (Slices)"; replace any `worktree.md` prose references → `slices.md` (D4)
- [ ] 2.6 Edit `README.md`: add acronym lineage note (D6) in the prose section near or after the stage table; confirm "eight stages" count is unchanged (D6)
- [ ] 2.7 Edit `CLAUDE.md`: replace any remaining `Worktree` / `worktree.md` references not covered by Slice 1 → `Slices` / `slices.md`
- [ ] 2.8 Edit `CONTRIBUTING.md`: replace `Worktree` / `worktree.md` → `Slices` / `slices.md` throughout
- [ ] 2.9 Edit `openspec/backlog.md`: update header chain from `(Q → R → D → S → P → W → I → PR)` → `(Q → R → D → S → V → P → I → PR)` (D3)
- [ ] 2.10 Checkpoint — run all five gates:
  - `grep -ri "stage w\b\|worktree" /workspaces/git/qrspi/claude/ /workspaces/git/qrspi/README.md /workspaces/git/qrspi/CLAUDE.md /workspaces/git/qrspi/CONTRIBUTING.md /workspaces/git/qrspi/openspec/backlog.md` returns no matches (only intentional historical references in migrated change folders)
  - `grep -i "lineage\|Q-R-S-P-I\|crispy" /workspaces/git/qrspi/claude/skills/qrspi-workflow/SKILL.md` returns the acronym note line
  - `grep -i "lineage\|Q-R-S-P-I\|crispy" /workspaces/git/qrspi/README.md` returns the acronym note line
  - `node /workspaces/git/qrspi/sync-copilot.mjs --check` exits 0 (zero drift — skills are not synced to copilot/)
  - `node /workspaces/git/qrspi/scripts/lint.mjs` exits 0

## 3. Migration annotations on historical worktree.md files

**Model:** sonnet — single-line prepend to two files; the exact wording is specified in D7 and the spec; no judgment required.

- [ ] 3.1 Edit `openspec/changes/example-greeting/worktree.md`: prepend the annotation note immediately after the `# Worktree — example-greeting` title line: `> Produced under the pre-rename Worktree stage; the current kit calls this Slices (\`slices.md\`).` — all original content below stays unchanged (D7)
- [ ] 3.2 Edit `openspec/changes/kit-quality-hardening/worktree.md`: prepend the same annotation note immediately after the `# Worktree — kit-quality-hardening` title line — all original content below stays unchanged (D7)
- [ ] 3.3 Checkpoint — run all five gates:
  - `head -3 /workspaces/git/qrspi/openspec/changes/example-greeting/worktree.md` shows the title on line 1 and the annotation note on line 2 or 3
  - `head -3 /workspaces/git/qrspi/openspec/changes/kit-quality-hardening/worktree.md` shows the same pattern
  - `git diff HEAD -- openspec/changes/example-greeting/worktree.md openspec/changes/kit-quality-hardening/worktree.md` shows only the annotation line added and no other content changed
  - `node /workspaces/git/qrspi/scripts/lint.mjs` exits 0
  - `node /workspaces/git/qrspi/sync-copilot.mjs --check` exits 0
