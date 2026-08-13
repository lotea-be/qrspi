---
name: git-host-workflow
description: Shared derivation procedure for git-host and remote awareness -- resolves the host CLI (gh/az repos/glab), PR-create/PR-status commands, and branch-naming slots (feature/archive) that /qrspi:pr, /qrspi:archive, and /qrspi:questions need. Load this skill whenever a command needs to resolve a vendor CLI or a branch-slot name instead of hardcoding one.
---

## What this skill does

This skill centralizes the vendor (git host) resolution and branch-slot
resolution logic that used to be duplicated inline across `pr.md`,
`archive.md`, and `questions.md`. It is **pure derivation text** -- a set of
ordered steps a calling command follows to arrive at a CLI name, a command
string, or a branch name. It does not itself call `AskUserQuestion` and does
not itself invoke `git` or any host CLI; every actual tool call (Bash,
AskUserQuestion) stays in the calling command body. This keeps the skill
read-only and reusable from any command.

## When to load this skill

Load this skill whenever a command needs to:
- resolve which host CLI to use for PR-create or PR-status queries, or
- resolve the branch name for the `feature` or `archive` slot.

## Step A -- Remote-presence check

Before any push-related resolution, the calling command determines whether
this repo has a configured git remote. (In Slice 1 this step's *procedure*
is owned here, but no calling command wires a live check yet -- every
command in this slice assumes a remote is present, matching pre-existing
behavior. Wiring the live check into command bodies is a later slice.)

The check itself, when a command does wire it: run `git remote` (or
equivalent) and treat a non-empty result as "remote present." An empty
result means "no remote" and routes to Step D (the no-remote menu) instead
of Steps B/C's host resolution.

## Step B -- Vendor resolution

Resolve the git host vendor (and therefore the CLI to use) in this priority
order:

1. **Cheatsheet override wins.** If the repo's project-scope stack-cheatsheet
   skill (discoverable via Glob pattern `.claude/skills/*-stack/SKILL.md`)
   has a `## PR & git workflow` block with a `Git host:` line, use that value
   directly (e.g. `Git host: GitHub` selects `gh`; `Git host: Azure DevOps`
   selects `az repos`; `Git host: GitLab` selects `glab`). Stop here -- do not
   live-derive when an explicit override is present.
2. **Otherwise, live-derive from repo signals**, checked in this order (first
   match wins):
   - A `.github/` directory, or a GitHub remote URL (`github.com` in
     `.git/config`) -- selects **GitHub** (`gh`).
   - An `azure-pipelines.yml` file at the repo root -- selects **Azure
     DevOps** (`az repos`).
   - A `.gitlab-ci.yml` file at the repo root -- selects **GitLab** (`glab`).
3. **Default.** If none of the live-derive signals match, default to
   **GitHub** (`gh`).

Use the Glob tool for all file-presence checks in this step (`.github`,
`azure-pipelines.yml`, `.gitlab-ci.yml`) -- never shell out to `ls` or `find`.

### Vendor -> CLI / PR-create / PR-status lookup table

| Vendor       | CLI       | PR-create command                                   | PR-status command                                    | "Merged" test              |
|--------------|-----------|------------------------------------------------------|-------------------------------------------------------|-----------------------------|
| GitHub       | `gh`      | `gh pr create --title <title> --body <body> --base <target> --head <source>` | `gh pr view <N> --json state,url,number`              | `state == "MERGED"`         |
| Azure DevOps | `az repos`| `az repos pr create --title <title> --description <body> --target-branch <target> --source-branch <source>` | `az repos pr show --id <N>`                            | `status == "completed"`     |
| GitLab       | `glab`    | `glab mr create --title <title> --description <body> --target-branch <target> --source-branch <source>` | `glab mr view <N>`                                     | `state == "merged"`         |

The calling command substitutes its own `<title>`, `<body>`, `<target>`,
`<source>`, and `<N>` values and runs the resulting command via the Bash
tool -- this skill only names the command shape, it does not execute it.

## Step C -- Branch-slot resolution

Two named branch slots exist. Resolve each from the repo's stack-cheatsheet
`## PR & git workflow` -> `Branch naming` sub-block when present; otherwise
fall back to the default shown.

| Slot      | Cheatsheet key    | Default (no cheatsheet override) |
|-----------|--------------------|-----------------------------------|
| `feature` | `feature:`         | `features/<id>`                   |
| `archive` | `archive:`         | `chore/archive-<id>`              |

Resolution order per slot:

1. Read the repo's stack-cheatsheet skill (Glob pattern
   `.claude/skills/*-stack/SKILL.md`), if present.
2. If its `## PR & git workflow` block contains a `Branch naming` sub-block
   with a value for the requested slot, use that value (substituting `<id>`
   with the change id).
3. Otherwise use the slot's default from the table above (substituting
   `<id>` with the change id).

If neither the cheatsheet nor a default resolves a value at all (should not
happen given the built-in defaults above), that is the "missing field"
condition handled by Step E (a later slice).

## Step D -- No-remote menu procedure (text owned here; not wired in Slice 1)

When Step A determines no remote is configured, the calling command's push
site branches to a menu instead of attempting `git push`. The menu this
skill defines (for the calling command to present via its own
`AskUserQuestion` call -- this skill does not call it):

- **Local branch** -- commit to a local-only branch; no push.
- **Patch file** -- write the diff to a patch file for the human to apply
  elsewhere.
- **Commit straight to current branch** -- skip branching entirely.

No "push" option is offered in this menu, since there is no remote to push
to. Wiring this menu into any command's live push site, and the
human-confirmed merge-back that follows a local-branch or
commit-to-current choice, is out of scope for Slice 1 (see Slice 2).

## Step E -- Missing branch-naming field (owned here; not wired in Slice 1)

When Step C cannot resolve a slot from either the cheatsheet or a built-in
default, the calling command prompts once via `AskUserQuestion`, offers to
write the answer back into the cheatsheet's `## PR & git workflow` block,
and continues the run using the supplied value without re-prompting later
in the same run. Since Steps B/C above always have a built-in default, this
condition does not currently trigger for `feature`/`archive`; it is defined
here for the legacy-cheatsheet-fallback slice (Slice 3) to wire.
