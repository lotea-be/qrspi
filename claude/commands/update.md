---
description: Update a QRSPI-initialized repo to a newer kit version. Reads the openspec/.qrspi-version marker, walks each intervening release's migration entry in ascending SemVer order, and (in later slices) hybrid-applies mechanical steps while gating judgment steps. Runs on the main loop so AskUserQuestion gates are reachable.
---

Bring the current repo's `openspec/` layout and workflow assumptions up to date
with a newer QRSPI kit version.

This command runs on the **main-loop orchestrator** (it carries no `agent:`
frontmatter). That is deliberate: the walk gates each judgment step with
`AskUserQuestion`, which is main-loop-only and unavailable inside a subagent.
Do not route this command to a subagent.

**Load skill `qrspi-update` before doing any other work.** That skill carries
the authoritative logic for this command: the migration-manifest schema
contract, the SemVer-ordered walk algorithm, target-version resolution
(auto-detect primary, explicit-arg fallback), and the edge-case handling.
Follow it exactly. This command body only names the inputs and the scope of
the current stage.

## Argument

`$ARGUMENTS` is an **optional** `<target-version>` — the bare SemVer string of
the kit version you want to reach (e.g. `0.7.0`), with no `v` prefix. Delegate
parsing to the skill:

- **If an argument is present**, treat it as the explicit target version (the
  guaranteed-portable path). The skill validates its SemVer shape.
- **If no argument is present**, the skill attempts auto-detect (derive the
  target from the installed plugin's shipped version/manifest) and falls back
  to asking the human when auto-detect is unavailable. See the skill's
  "Resolving the target version" section, including the stage-I watch-item on
  auto-detect portability.

## Scope of this stage (plan-only)

For now this command is **read-only / plan-only**. Following the skill, it:

1. Reads the marker `openspec/.qrspi-version` (using the Read/Glob tools, never
   shelling out).
2. Resolves the target version (auto-detect primary, `$ARGUMENTS` fallback).
3. Handles the edge cases (already up to date, no marker, downgrade) per the
   skill.
4. Selects each `migrations/<v>.yaml` for `A < v <= B` in ascending SemVer
   order and prints a per-version plan: the version, its one-line `summary`,
   and the count of `automated` and `manual` steps it carries.

It applies **no file edits and bumps no marker** at this stage. The automated
`edit-file` dispatch, the per-manual-step `AskUserQuestion` gate, the marker
bump, and the stage-and-print-commit tail are added in a later slice; the skill
notes where they attach.

Do not use exclamation-prefixed shell-injection to inspect the repo. Read the
marker and the manifest files with the Read and Glob tools — they have no
permission requirements and work on every platform.

User argument (optional `<target-version>`): $ARGUMENTS
