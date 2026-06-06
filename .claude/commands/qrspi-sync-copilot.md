---
description: Regenerate the GitHub Copilot artifacts (copilot/) from the Claude Code source of truth (claude/). Runs the deterministic sync-copilot.ps1, then LLM-reviews the output and improves the SCRIPT (never the generated files) when it finds a systematic gap. Run after editing anything under claude/agents, claude/commands, or claude/skills.
agent: build
---

Regenerate `copilot/` from `claude/`. **`claude/` is the source of truth** and
`copilot/` is a generated, drop-and-recreated artifact.

The generation is **deterministic**: [`sync-copilot.ps1`](../../sync-copilot.ps1)
(repo root) wipes and rebuilds `copilot/` by applying fixed rules. Your job is to
run it, review the result, and — when you find a systematic problem — **fix the
script, never the generated files** (hand-edits to `copilot/` are wiped on the
next run). This way every fix compounds and stays reproducible.

Load skill `qrspi-sync-copilot` first — it is the spec the script implements
(frontmatter, tool-name + model-alias maps, body-mechanic + path rewrites,
per-file fixups, fidelity gaps) and the review checklist.

Steps:

1. **Regenerate.** Run `./sync-copilot.ps1`. It reports the counts written.

2. **Review the output** against the skill. Spot-check a few regenerated files
   (Grep `copilot/` for residual Claude-isms the rules should have caught:
   `$ARGUMENTS`, `\.claude`, `Load skill`, `restart Claude Code`, `ask_user`,
   `AskUserQuestion`, `Agent tool`/`Task tool`/`Skill tool`). Compare a couple
   of `claude/` sources to their `copilot/` outputs for correctness. Distinguish:
   - **Systematic** (a rule is missing/wrong — affects a class of files) → fix in
     step 3.
   - **Accepted fidelity gap** (documented in the skill, e.g. conceptual
     "subagent" language in the OpenSpec-generated `opsx`/`openspec-*` files) →
     leave it; note it in the report.

3. **Improve the script, then re-run.** For each systematic problem, edit
   `sync-copilot.ps1`:
   - a broad pattern → add a rule to `Rewrite-All`;
   - a single file's semantic divergence → add an `LRep` literal replacement to
     `Apply-Fixups` keyed by the output path.
   Then run `./sync-copilot.ps1` again. **Never edit `copilot/` directly.**

4. **Confirm & report.** Run `./sync-copilot.ps1 -Check` (must report `0 file(s)
   differ`). Then summarize: counts, any script rules you added/changed, any
   accepted fidelity gaps. Remind the user to **commit both `copilot/` and
   `sync-copilot.ps1`** (the script is the durable record of the transform; the
   tree ships to Copilot-only users who never run the sync).

Note: `install.ps1 -Target copilot` copies the generated tree into `~/.copilot/`;
it does not regenerate. This command (and `sync-copilot.ps1`) only rebuilds the
repo tree.

To peek at the current generated tree, use the **Glob** tool with pattern
`copilot/{agents,prompts,instructions}/*` (it returns nothing if `copilot/`
has not been generated yet — in that case just run `./sync-copilot.ps1`). Do
not shell out — Glob has no permission requirements and works on every platform.

User argument (ignored): $ARGUMENTS
