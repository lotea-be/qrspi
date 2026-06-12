---
description: Bootstrap OpenSpec in this repo if it has not been done yet. Runs `npx @fission-ai/openspec init`. Safe to run more than once — will detect existing setup.
agent: agent
---

Bootstrap OpenSpec for the current project.

**Detecting current state — use Glob, never shell out.** The single source of
truth for "is OpenSpec initialized?" is the file `openspec/config.yaml`. Check
it with the **Glob** tool, pattern `openspec/config.yaml`: a match means
initialized, no match means not initialized. Do not test for the `openspec/`
directory by other means and do not shell out for this check (Glob has no
permission requirements and works on every platform).

Steps 1 and 2 are mutually exclusive paths chosen by that check. **Steps 3–5
are a shared postcondition: run them in order regardless of which path you
took** (the OpenSpec CLI can emit project-scope tooling on both `init` and
`update`, so the cleanup is unconditional).

## Step 1 — already initialized (Glob matched `openspec/config.yaml`)

Run `npx @fission-ai/openspec@1.4.1 update` (not `init`) to refresh agent
guidance, and tell the user it was already initialized.

Then **verify the skeleton is intact** with Glob: `openspec/changes/` and
`openspec/specs/` must both exist. If `config.yaml` matched but either
directory is missing, the repo is in a corrupted partial-init state: tell the
user, then run `npx @fission-ai/openspec@1.4.1 init --tools none` to repair the
skeleton before continuing.

Then proceed to the shared postcondition (steps 3–5).

## Step 2 — not initialized (Glob found no `openspec/config.yaml`)

a. Confirm npx is available by running `npx --version` as a normal tool call
   (so it goes through the usual permission flow rather than failing at
   command-expansion time). If `npx --version` fails or npx is not found, stop
   and tell the user: "npx is required but was not found. Install Node.js
   (https://nodejs.org) and retry."

b. Run `npx @fission-ai/openspec@1.4.1 init --tools none`. This creates
   `openspec/changes/`, `openspec/specs/`, and the rest of the directory
   skeleton. If the command exits non-zero (network error, registry
   unavailable, etc.), stop, show the command output to the user, and do NOT
   proceed to later steps.

   **It does NOT create `openspec/config.yaml`.** As of CLI v1.4.1, `--tools
   none` forces non-interactive mode, and in non-interactive mode the CLI
   prints `Config: skipped` and writes no config file (`--profile` does not
   change this). OpenSpec itself treats a missing config as valid, but QRSPI
   uses `openspec/config.yaml` as its "is-initialized" sentinel, so step b-bis
   writes a minimal one.

   `--tools none` is a best-effort request to suppress tooling, **not a
   guarantee**: without it the OpenSpec CLI writes its own native
   slash-commands (`.github/prompts/opsx-*`) and skills
   (`.github/instructions/openspec-*`) into the repo at **project scope**. QRSPI does
   not use OpenSpec's native `opsx` workflow — it ships its own `/qrspi-*` and
   `/openspec-*` tooling in **user scope** (`~/.copilot/`) — so those per-repo
   copies are redundant duplicates. We want only OpenSpec's *data* directory
   (`openspec/`) in the repo, never its Copilot tooling. Because older CLI
   versions ignore the flag, step 3 sweeps unconditionally regardless.

b-bis. **Write the QRSPI sentinel config.** Because the CLI skips it (step b),
   create `openspec/config.yaml` yourself with the repo-default schema and a
   record of the CLI version that initialized the repo. The `schema` field is
   the only one OpenSpec reads (`spec-driven` is the repo default);
   `openspec_version` is informational — OpenSpec ignores unknown top-level
   keys. Use the Write tool with this content:

   ```yaml
   # OpenSpec project configuration.
   # `schema` selects the workflow schema; `spec-driven` is the repo default.
   # Written by /qrspi-init because the OpenSpec CLI skips config in
   # non-interactive (`--tools none`) mode, yet QRSPI uses this file as its
   # "is-initialized" sentinel.
   #
   # `openspec_version` is informational only — OpenSpec reads just
   # `schema`/`context`/`rules` and ignores any other top-level key.
   schema: spec-driven
   openspec_version: 1.4.1
   ```

   Keep `openspec_version` in sync with the pinned version run in step b. If a
   future repo is re-initialized with a newer pinned CLI, update this value.

c. Verify the result with Glob: `openspec/config.yaml`, `openspec/changes/`,
   and `openspec/specs/` must all exist. (`config.yaml` exists because step
   b-bis wrote it; `changes/` and `specs/` come from the CLI.) If any are
   missing, report the missing paths and stop.

d. **No per-repo template seeding (shared shape).** Earlier versions copied the
   canonical templates into this repo's `openspec/templates/`. They are no longer
   copied: the QRSPI kit ships the templates. The stage agents carry the artifact
   shapes inline, and the canonical `*.template.md` files travel with the kit
   (bundled in the plugin; also in the kit's own `openspec-templates/`). A
   consuming repo needs no per-repo template copy — there is nothing to seed here.
   Proceed to step 3.

## Step 3 — strip any project-scope OpenSpec Claude tooling (always)

This runs on both paths. The `opsx` commands and `openspec-*` skills belong in
user scope only — never committed per-repo:

```powershell
Remove-Item -Recurse -Force .github/prompts -ErrorAction SilentlyContinue
Get-ChildItem .github/instructions -Filter 'openspec-*' -Directory -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force
```

POSIX equivalent (non-Windows shells):

```bash
rm -rf .github/prompts
rm -rf .github/instructions/openspec-*
```

If `.github/` is now empty, remove it too. Then report the result to the user:
list the removed paths as a bullet list, or if nothing matched, say exactly
"No project-scope OpenSpec tooling found — nothing removed."

## Step 4 — commit the new files (always)

Stage **only** the OpenSpec directory explicitly — do not use `git add -A` /
`git add .`, which could sweep in unrelated working-tree changes that were
already present before this command ran:

```
git add openspec/
```

Then run `git status --short` and confirm that no `.github/prompts*` or
`.github/instructions/openspec-*` paths appear in the staged output before
committing. Commit in a single commit with message
`chore(openspec): initialize OpenSpec scaffolding + QRSPI templates`.

If the commit fails because there is no git repository or git is unavailable,
tell the user the OpenSpec files were created successfully but could not be
committed, and that they should commit `openspec/` manually.

## Step 5 — print next steps (always)

```
OpenSpec initialized.

Next: open your first change.
  /qrspi-questions <change-id>   (kebab-case, verb-first)

Or read the workflow:
  /qrspi-status
```

User argument (optional, ignored for init): ${input}
