# Research — archive-auto-create-pr

> Stage R of QRSPI. Generated 2026-08-04.
> Ticket is hidden from this stage by design.

## Areas investigated

- Archive command flow: full step structure of `claude/commands/archive.md` (steps 1-7), including step 3 PR-merge gate, step 5 "New branch + push" branch, and step 6 relay text.
- PR command flow: `claude/commands/pr.md` host-CLI resolution, PR creation, PR number/URL capture, and where the link is recorded; run-mode gate around PR creation.
- Host-CLI resolution convention: stack-cheatsheet `## PR & git workflow` block and how `archive.md`/`pr.md` reference vendor-specific CLI detection.
- Lint checks over command bodies: `scripts/lint.mjs` checks that assert anything about `archive.md` or `pr.md` (structure, phrase anchors, command-name/README coverage).
- Templates and `pr.md` format: `openspec-templates/` inventory; whether a `pr.md` template exists; canonical field format `/qrspi:pr` writes.
- README archive-flow documentation: where `/qrspi:archive` is documented in the stage table and helper list; any prose describing the push/PR step.

---

## File map

### Archive command flow

- `claude/commands/archive.md` — QRSPI `/qrspi:archive` command; thin wrapper over OpenSpec's archive logic. `agent: build` (no non-builtin subagent in frontmatter; AskUserQuestion is called directly by this command). Depends on: skills `context-budget-gate`, `openspec-archive-change`; spawns agent `qrspi:spec-syncer` (via Agent tool); reads stack-cheatsheet via Glob.

**Step structure (archive.md:20-238):**

| Step | What it does | Host CLI / tool invoked |
|------|-------------|------------------------|
| 1 | Guard: `openspec/` must exist | Glob tool (pattern `openspec/`) |
| 2 | Sanity-check: `followups.md` un-ticked boxes | Read tool on `openspec/changes/<id>/followups.md`; inform-only, not hard-block |
| 3 | PR-merge gate (hard-stop) | Read tool on `openspec/changes/<id>/pr.md`; Bash tool running host CLI status-query |
| 4a | Sync delta specs into base specs (before folder move) | Glob `openspec/changes/<id>/specs/**/spec.md`; Agent tool (`subagent_type: qrspi:spec-syncer`, `model: opus`) |
| 4 | Delegate folder move to archive skill | Load and run `openspec-archive-change` skill |
| 5 | Remove backlog row; propose commit target; commit archive | AskUserQuestion (commit target); Bash tool (`git checkout -b`, `git commit`, `git push`) |
| 6 | Relay completion summary | Text output to user |
| 7 | Offer fresh session for next change | AskUserQuestion |

**Step 3 detail — PR-merge gate (`archive.md:31-74`):**

- Reads PR number from `pr.md`: prefers `#<N>` on the `- **PR:** #<N>` line; falls back to trailing digits of a `URL:` or `PR link:` line (`.../pull/<N>`, `.../pulls/<N>`, `.../merge_requests/<N>`).
- Host-CLI resolution: checks for a project-scope stack-cheatsheet (`Glob` pattern `.claude/skills/*-stack/SKILL.md`); reads its `## PR & git workflow` section for a PR-status-query line; otherwise infers from repo signals: `.github/` directory or GitHub remote -> `gh`; `azure-pipelines.yml` -> `az repos`; `.gitlab-ci.yml` -> `glab`; default: `gh`.
- Status-query command (Bash tool): e.g. `gh pr view <N> --json state,url,number`, `az repos pr show --id <N>`, `glab mr view <N>`.
- "Merged" definition per host: GitHub `state == MERGED`; Azure DevOps `status == completed`; GitLab `state == merged`.
- On non-merged state (open or closed-unmerged): hard-stop unconditionally with wording: `PR #<N> for '<id>' is **<state>** (not merged): <url>` / `Archival is blocked until the PR merges. Merge PR #<N>, then re-run /qrspi:archive <id>.` (`archive.md:72-74`)
- On merged: proceed silently to step 4.

**Step 5 detail — "New branch + push" branch (`archive.md:153-206`):**

The step always shows an AskUserQuestion (never suppressible by run-mode):

- question: `"Where should the archive commit land?"`
- choices: `"New branch + push (open a PR)"` (default/recommended) | `"Commit straight to main"`

**"New branch + push" path** (`archive.md:183-193`):
```
git checkout -b chore/archive-<id>
git commit -m "chore(<id>): archive change + remove backlog row"
git push -u origin chore/archive-<id>
```
After the push, the command surfaces the project's PR-create command (the host CLI named in the stack-cheatsheet) as the suggested next step. The exact wording from `archive.md:191-193`:

> Then surface the project's PR-create command (the host CLI named in its stack-cheatsheet — e.g. `gh pr create` or `az repos pr create`) as the suggested next step, mirroring how `/qrspi:pr` surfaces its PR-create line. Do not run it automatically — just print it.

**"Commit straight to main" path** (`archive.md:194-200`):
```
git commit -m "chore(<id>): archive change + remove backlog row"
git push
```
No PR-create suggestion follows.

On any non-zero exit from `git checkout -b`, `git commit`, or `git push` in either path: hard-stop, surface git error verbatim, state "tree is now moved-but-uncommitted", stop (`archive.md:201-206`).

**Step 6 detail — relay text (`archive.md:208-216`):**

- **New branch chosen:** name the branch (`chore/archive-<id>`), confirm commit landed and was pushed, repeat the suggested PR-create command as the next step.
- **Main chosen:** confirm the archive commit landed and was pushed on the current branch, no new branch.

**Step 7 (`archive.md:219-233`):** AskUserQuestion "Start a new session for the next change?" — never suppressible. On "Yes": prints `Run /clear, then /qrspi:status to see what is next -- the change folder on disk is the truth.` and ends the turn.

---

### PR command flow

- `claude/commands/pr.md` — QRSPI `/qrspi:pr` command. `agent:` field absent (not set to a non-builtin agent); the command runs in the main-loop orchestrator. Depends on: skills `qrspi-version-check`, `context-budget-gate`, `workflow`; spawns `qrspi:reviewer` via Agent tool; loads `backlog-writer` skill.

**Run-mode gate around PR creation (`pr.md:229-243`):**

```
**PR-create step (mode-aware — follow the PR-create auto-advance rule in
skill `workflow`).**
- In Full or Semi auto: skip the question and run the PR-create command directly.
- In Manual: AskUserQuestion:
    question: "The PR description is ready. Would you like me to create the PR now, or do you want to review the description first?"
    choices: ["Create the PR now", "Show me the description first — I'll create it manually"]
```

**Host-CLI resolution for PR creation (`pr.md:238-242`):**

> Run the project's PR-create command (the host CLI named in its stack-cheatsheet -- e.g. `gh pr create` or `az repos pr create`), capturing the output so you get the PR number and URL...

No explicit multi-vendor fallback procedure is described inline in `pr.md`; the command relies on the stack-cheatsheet's `## PR & git workflow` section to name the host CLI. The reviewer subagent drafts the PR description and provides the suggested PR-create command; the orchestrator runs it.

**PR number and URL capture (`pr.md:244-267`):**

Recorded in two places upon PR creation:

1. **`openspec/changes/<id>/pr.md`** — canonical format (`pr.md:249-262`):
   ```markdown
   # Pull request -- <id>

   - **PR:** #<N>
   - **URL:** <url>
   - **Title:** <id>: <summary>
   - **Source branch:** <change branch>
   - **Target branch:** <default branch>
   - **Created:** <YYYY-MM-DD>
   ```

2. **`openspec/backlog.md`** — row heading backtick note changed from `in-progress (Q, R, D, S, V, P, I complete)` to `in-progress (draft PR #<N> open)` (`pr.md:263-267`).

**Commit step after PR creation (`pr.md:286-294`):**
```
git add openspec/changes/<id>/pr.md openspec/backlog.md openspec/changes/<id>/followups.md
git commit -m "docs(<id>): record PR #<N> link"
git push
```
`followups.md` omitted from `git add` if it was not created. Commit is skipped if the human chose "Show me the description first" (no PR exists yet).

---

### Host-CLI resolution convention

- **Stack-cheatsheet `## PR & git workflow` block** (`.claude/skills/qrspi-stack/SKILL.md`):
  ```
  ## PR & git workflow

  - Git host: GitHub
  - PR creation: `gh pr create`
  - PR status query: `gh pr view <N> --json state`
  - Source-branch naming: `features/<id>` (derived from the change id)
  - Default target branch: `main`
  - Version-bump and release: tag-based only (see `.claude/skills/qrspi-release/`)
  ```
  This is the canonical per-repo declaration. Both `archive.md` and `pr.md` read this block to derive the host CLI and its commands.

- **`archive.md` fallback** (`archive.md:46-53`): when no stack-cheatsheet or no `## PR & git workflow` section is found, infer from repo signals: `.github/` directory or GitHub remote -> `gh`; `azure-pipelines.yml` -> `az repos`; `.gitlab-ci.yml` -> `glab`; default `gh`.

- **`pr.md`**: does not describe a separate fallback; refers to "the host CLI named in its stack-cheatsheet" without its own inference logic. The convention to read the stack-cheatsheet is the only documented path.

---

### Lint checks over command bodies

- **`scripts/lint.mjs`** — CI quality gate (Checks 1-23; exits 0 on pass, 1 on any failure). No npm runtime dependencies; uses Node.js built-ins only.

**Checks touching `archive.md` or `pr.md` directly:**

| Check | Name | What it asserts about archive/pr | Inspects body prose vs. structural markers |
|-------|------|----------------------------------|-------------------------------------------|
| 4 | `checkReadmeCoverage` | `claude/commands/archive.md` must be documented as `/qrspi:archive` in `README.md`; `/qrspi:pr` must resolve to `claude/commands/pr.md` | Structural: forward/reverse scan of `/qrspi:<token>` tokens — name coverage only, not body prose |
| 8 | `checkPrReconciliationPasses` | `claude/commands/pr.md` must contain: `## Tasks pass`, `## Follow-ups pass`, and the choice labels `'Finish it now'`, `'Drop -- no longer needed'`, `'Pause --'`, `'Fix now'`, `'Defer --'`, `'Promote to backlog'` | Structural: `text.includes(anchor)` substring check — presence of specific phrase strings |
| 10 (budget-gate) | `checkBudgetGateEmbed` | Both `archive.md` and `pr.md` must contain: `'Load skill \`context-budget-gate\` and follow its instructions exactly.'` | Body prose: collapsed-whitespace `includes()` check |
| 19 | `checkAuthoritativeSyncDelegator` | `archive.md` must contain the string `qrspi:spec-syncer`; no kit command/agent may have `subagent_type: general-purpose` within 15 lines of sync-context strings | Body prose: substring check on `qrspi:spec-syncer`; proximity-window scan for `general-purpose` near sync strings |

**Checks that touch `pr.md` indirectly (through command frontmatter resolution):**

| Check | What it asserts |
|-------|----------------|
| 2 (`checkFrontmatter`) | `pr.md` must have `description:` in frontmatter; any `Load skill X` reference must resolve to a real `claude/skills/<X>/` directory |
| 9 (`checkVersionCheckEmbed`) | `pr.md` is in `VERSION_CHECK_COMMAND_STEMS`; must contain `'Load skill \`qrspi-version-check\` and follow its instructions exactly.'` |
| 2b (`checkSkillSets`) | `pr.md` not in `COMMAND_SKILL_SET_EXPECTED` (that map covers `archive` and `followup` — need to verify); skill refs in command body resolve to real skill dirs |

**Note on Check 8 (`checkPrReconciliationPasses`):** inspects body prose via substring matching — it tests that specific choice-label strings are present in `pr.md`. This is the only check that pins specific wording inside the `pr.md` command body.

**Note on Check 19 (`checkAuthoritativeSyncDelegator`):** inspects `archive.md` body for the string `qrspi:spec-syncer` — a substring presence check. It does not inspect the surrounding narrative structure of step 4a.

**Check 5 (`checkGateExecutor`)** is relevant to `archive.md`: it flags any command whose frontmatter declares a non-builtin `agent:` while the body reaches `AskUserQuestion` (directly or transitively). `archive.md` has `agent: build` — but `build` is in `BUILTIN_AGENTS`, so `archive.md` is skipped by this check. `pr.md` has no `agent:` field, so it is also skipped.

---

### Templates and the `pr.md` format

**Templates present in `openspec-templates/`:**

| File | Purpose |
|------|---------|
| `backlog.template.md` | `openspec/backlog.md` shape; inline-embedded in `claude/commands/init.md` |
| `design.template.md` | `design.md` shape; consumed by `claude/agents/designer.md` |
| `proposal.template.md` | `proposal.md` shape; consumed by `claude/agents/architect.md` |
| `questions.template.md` | `questions.md` shape; consumed by `claude/agents/questioner.md` |
| `research.template.md` | `research.md` shape; consumed by `claude/agents/researcher.md` |
| `spec-delta.template.md` | Delta `spec.md` shape; consumed by `claude/agents/architect.md` |
| `tasks.template.md` | `tasks.md` shape; consumed by `claude/agents/planner.md` |

**No `pr.md` template exists** in `openspec-templates/`. The format for `openspec/changes/<id>/pr.md` is defined inline in the `claude/commands/pr.md` command body (`pr.md:249-262`):

```markdown
# Pull request -- <id>

- **PR:** #<N>
- **URL:** <url>
- **Title:** <id>: <summary>
- **Source branch:** <change branch>
- **Target branch:** <default branch>
- **Created:** <YYYY-MM-DD>
```

This is the format the archive command's step 3 parses to extract the PR number (`- **PR:** #<N>` line preferred; URL line as fallback).

---

### README archive-flow documentation

- **Stage table / helper list** (`README.md:262, 68`): `/qrspi:archive` appears in the "Run the stages" example at line 262 with comment `# <- after the PR merges`, and in the Helpers list at line 68 as: `/qrspi:archive <id>` (archive a change after its PR merges).

- **No push/PR-create prose** in the README about what `/qrspi:archive` does after the commit. The README does not describe the "New branch + push" branch or the PR-create suggestion from step 5/6. The description in the helpers list is one line only.

- **Full-auto gate table** (`README.md:47-51`): lists what is suppressed in Full/Semi-auto. "PR-create (runs `gh pr create` without prompting)" refers to the `/qrspi:pr` PR-create auto-advance, not to `/qrspi:archive`. The archive commit-target prompt (step 5's AskUserQuestion) is not listed there — it is a command-owned gate documented only in `archive.md` as "always shown — not a suppressible confirmation."

---

## Slash-command surface

### Archive command

- `claude/commands/archive.md` — see File map above. `agent: build` (builtin). Loads skill `context-budget-gate`. References skills: `openspec-archive-change` (generated, do not hand-edit), `workflow` (canonical commit step / hard-stop procedure), `context-budget-gate`. Spawns `qrspi:spec-syncer` (Agent tool).

### PR command

- `claude/commands/pr.md` — see File map above. No `agent:` field (main-loop orchestrator). Loads skills: `qrspi-version-check`, `context-budget-gate`, `workflow`. Spawns `qrspi:reviewer` (Agent tool, `model: sonnet`). Loads `backlog-writer` skill for "Promote to backlog idea" path in follow-ups pass.

---

## Lint-gate surface

- `scripts/lint.mjs` — 23 checks; Node.js built-ins only. Checks most relevant to the areas of interest: Check 4 (README command coverage), Check 8 (`pr.md` reconciliation-pass structural anchors), Check 10 budget-gate-embed (both `archive.md` and `pr.md`), Check 19 (`archive.md` wires `qrspi:spec-syncer`). See File map section for full per-check detail.

---

## Template surface

- `openspec-templates/research.template.md` — five always-emitted headings; surface-driven inventory sections not enumerated here (injected dynamically at write time).
- No `pr.md` template exists. The `pr.md` format is defined inline in `claude/commands/pr.md:249-262`.

---

## Migration manifest

- `migrations/` — per-version `.yaml` manifests. Not directly relevant to this change's areas of interest.

---

## Notable discrepancies

- Step 5's AskUserQuestion (commit-target prompt) is described in `archive.md:176-179` as "always shown — not a suppressible confirmation," but this phrase is not asserted by any lint check. It is purely procedural prose; no structural anchor pins it in `archive.md`.
- The `pr.md` format (the canonical `pr.md` file written by `/qrspi:pr`) is not backed by any `openspec-templates/` file. It is defined only in the command body at `pr.md:249-262`. The archive command's step 3 depends on this format for PR number extraction.
- `pr.md` has no `agent:` frontmatter field. This means it runs entirely in the main-loop orchestrator context. Check 5 (`checkGateExecutor`) skips it because there is no non-builtin `agent:` to flag.
- The "New branch + push" path in `archive.md` step 5 calls `git push -u origin chore/archive-<id>` and then surfaces the PR-create command as a suggested next step with the explicit instruction "Do not run it automatically — just print it" (`archive.md:191-193`). This is a print-only instruction, not an automated PR creation.

## Implicit contracts and conventions

- The `pr.md` file written by `/qrspi:pr` is the sole durable record of the PR link; it travels into `archive/` on archive and is never deleted. The backlog row is the convenient in-progress lookup and is deleted on archive.
- PR number extraction in `archive.md` step 3 follows a preference order: `- **PR:** #<N>` line first, then URL-based fallback. This ties archive's step 3 to the exact field format that `/qrspi:pr` writes.
- The archive commit message is fixed: `"chore(<id>): archive change + remove backlog row"` — same message regardless of which commit-target branch was chosen.
- `git add` in the archive step 5 uses explicit paths (never `git add -A`): `openspec/changes/archive/<YYYY-MM-DD>-<id>/`, `openspec/changes/<id>/`, and `openspec/backlog.md`. This follows the canonical commit-step rule from skill `workflow`.
- The stack-cheatsheet's `## PR & git workflow` block is the authoritative multi-vendor declaration; `archive.md` has its own fallback inference logic for when the block is absent; `pr.md` does not have its own fallback.
- Both `archive.md` and `pr.md` must carry the `context-budget-gate` embed line (asserted by Check 10). Only `pr.md` must carry the `qrspi-version-check` embed line (Check 9; `archive` is not in `VERSION_CHECK_COMMAND_STEMS`).
- `archive.md` is the sole authoritative sync delegator — it must wire `qrspi:spec-syncer` (asserted by Check 19). No other command or agent may spawn a general-purpose subagent near sync-context strings.

## Open gaps

- [ ] `COMMAND_SKILL_SET_EXPECTED` in `scripts/skill-sets.mjs` was not read — could not confirm which commands are in the command skill-set registry and whether `pr.md` or `archive.md` entries exist there. Need to read `scripts/skill-sets.mjs` if skill-load assertions on these commands are relevant.
- [ ] The exact behaviour of the reviewer subagent's PR-create-command suggestion (how it composes the `gh pr create` command, which flags it includes) was not examined — `claude/agents/reviewer.md` was not read.
- [ ] Whether lint Check 4 inspects the PR-create prose inside `archive.md` step 6 (the "suggested next step" print) cannot be confirmed from reading the check alone; Check 4 only covers the `/qrspi:<token>` name coverage in README, not body prose.
