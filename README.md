# QRSPI

A spec-driven, multi-stage workflow for [Claude Code](https://claude.com/claude-code)
**and [GitHub Copilot](https://github.com/features/copilot)**, built on top of
[OpenSpec](https://github.com/Fission-AI/OpenSpec). QRSPI breaks a feature from vague
request to merged PR into eight reviewable stages, each producing one durable artifact
under `openspec/changes/<id>/`. A human approval gate sits at the Design stage, so the
expensive thinking is reviewed before any code is written.

This repository is the **source of truth** for the QRSPI kit. The Claude Code artifacts
under [`claude/`](claude/) are authoritative; the Copilot artifacts under
[`copilot/`](copilot/) are **generated** from them (see
[Two tools](#two-tools-claude--copilot)). Claude Code installs it as a **plugin** (from the
`lotea-be/ai-agent-marketplace` marketplace); GitHub Copilot installs the generated
artifacts into `~/.copilot/` with a script. Either way, the kit is available in every
repository on your machine.

The kit is **stack-agnostic**. It references a project's "stack-cheatsheet" skill
generically and degrades gracefully when a repo doesn't provide one — so the same
workflow drives a .NET/Blazor app, a TypeScript service, or anything else.

---

## The eight stages

| # | Stage | Command | Artifact | Notes |
|---|-------|---------|----------|-------|
| 1 | Questions | `/qrspi:questions <id>` | `questions.md` | Turns a vague request into concrete technical questions. |
| 2 | Research | `/qrspi:research <id>` | `research.md` | Read-only map of the current codebase. The ticket is hidden by design. |
| 3 | Design | `/qrspi:design <id>` | `design.md` | The "brain surgery" stage. **⛔ HUMAN APPROVAL REQUIRED before stage 4.** |
| 4 | Structure | `/qrspi:structure <id>` | `proposal.md` + `specs/` | Canonical proposal + OpenSpec spec deltas. |
| 5 | Slices | `/qrspi:slices <id>` | `slices.md` | Vertical slices, not horizontal layers. |
| 6 | Plan | `/qrspi:plan <id>` | `tasks.md` | Canonical numbered task list. |
| 7 | Implement | `/qrspi:implement <id>` | code + tests | One slice at a time; stops at each checkpoint. |
| 8 | PR | `/qrspi:pr <id>` | PR description | Read-only review + final checklist. |

> **Acronym lineage note.** QRSPI / "Crispy" is a lineage label from the RPI ancestry; Design, Slices, and PR sit outside the five acronym letters (Q-R-S-P-I). The kit intentionally orders Slices (V) before Plan (P) -- slices-then-tasks is the natural data flow and an intentional divergence from the RPI blog's Plan-before-Work-Tree ordering.

Helpers: `/qrspi` (print the stage map), `/qrspi:init` (bootstrap `openspec/` +
templates — per-repo onboarding), `/qrspi:stack` (bootstrap this repo's
stack-cheatsheet skill — per-repo onboarding), `/qrspi:followup <id>` (post-PR fix loop),
`/qrspi:archive <id>` (archive a change after its PR merges),
`/qrspi:retro <id> <stage>` (retrospective that improves the prompts themselves).

Each artifact follows a **canonical OpenSpec shape** — see
[`openspec-templates/`](openspec-templates/).

---

## Repository layout

```
qrspi/
  claude/                    # SOURCE OF TRUTH — Claude Code plugin payload
    agents/                  #   7 subagent definitions (questioner … reviewer)
    commands/                #   /qrspi:* slash commands
    skills/                  #   workflow + convention skills (stack-agnostic)
  copilot/                   # GENERATED from claude/ — GitHub Copilot artifacts (mirror ~/.copilot/)
    agents/                  #   *.agent.md   (custom agents)
    prompts/                 #   *.prompt.md  (slash prompts)
    instructions/            #   *.instructions.md (referenced on demand)
  openspec-templates/        # the 5 canonical artifact templates (tool-independent, shared)
  sync-copilot.mjs           # deterministic claude/ -> copilot/ generator (Node.js)
  install.ps1 / install.sh   # installs the Copilot kit into ~/.copilot (Claude = plugin)
  uninstall.ps1 / uninstall.sh  # removes only the files this kit ships
  .claude/                   # kit-DEV tooling, project scope, NOT shipped to users:
                             #   /qrspi-sync-copilot command + skill (only useful in THIS repo)
  README.md
```

`copilot/` mirrors `~/.copilot/`, so the **Copilot install is a straight copy**; `claude/`
is the Claude Code **plugin** payload, delivered via the marketplace. Never hand-edit
`copilot/` — edit `claude/` and run `/qrspi-sync-copilot` (see
[Two tools](#two-tools-claude--copilot)).

---

## Requirements

- **One of:**
  - **[Claude Code](https://claude.com/claude-code)** — CLI, desktop, or IDE extension.
    The `claude/{agents,commands,skills}/` formats are Claude Code's.
  - **[GitHub Copilot](https://github.com/features/copilot)** in VS Code — uses the
    generated `copilot/{agents,prompts,instructions}/` (`.agent.md` / `.prompt.md` /
    `.instructions.md`).
- **[Node.js](https://nodejs.org/)** (for `npx`) — the OpenSpec CLI runs via
  `npx @fission-ai/openspec@1.4.1` (pinned). Used to bootstrap `openspec/` and to
  `openspec validate` spec deltas.
- **Git** — QRSPI is a git-centric workflow (branch per change, PR at the end).
- **(Optional, per consuming repo)** stack-specific helpers the agents will use *if
  present*: a "stack-cheatsheet" skill and expert subagents. These are **not** shipped
  here — they belong to each consuming repo because they encode that repo's stack. See
  [Consuming in another repo](#consuming-in-another-repo).

---

## Install

### Claude Code — via the plugin marketplace

QRSPI ships as a Claude Code plugin. Add the marketplace once, then install:

```
/plugin marketplace add lotea-be/ai-agent-marketplace
/plugin install qrspi@lotea-agents
```

Commands are namespaced under the plugin — `/qrspi:questions`, `/qrspi:design`, …,
`/qrspi:status`.

**Updating to a newer release** is a two step — refreshing the marketplace catalog
does **not** by itself upgrade an installed plugin:

```
/plugin marketplace update lotea-agents   # refresh the catalog
/plugin install qrspi@lotea-agents        # pull the new version
```

(Or open `/plugin` → **Installed** → `qrspi` and use the update action.) Third-party
marketplaces don't auto-update by default; enable it per-marketplace under `/plugin`
→ **Marketplaces** if you'd rather upgrades land automatically. After an update,
Claude Code may prompt `/reload-plugins` to activate it in the current session.

### GitHub Copilot — via the install script

Copilot can't consume a Claude Code plugin, so its artifacts install from this repo
with a script — **PowerShell** (Windows/macOS/Linux):

```powershell
./install.ps1                  # install the Copilot kit + offer VS Code settings
./install.ps1 -SkipSettings    # don't touch VS Code settings.json
```

…or the **Bash** equivalent (Linux/macOS, no PowerShell needed):

```bash
./install.sh                   # install the Copilot kit + offer VS Code settings
./install.sh --skip-settings   # don't touch VS Code settings.json
```

The script merges — overwrites same-named files, leaves your other user-scope files
untouched. It copies `copilot/{agents,instructions,prompts}` into `~/.copilot/`, then
**offers to patch your VS Code user `settings.json`** so
`chat.{prompt,agent,instructions}FilesLocations` point at `~/.copilot/...` (VS Code
won't discover the prompts otherwise). It asks before writing, backs the file up first,
edits as text so your comments survive, and skips any key you've already set. Decline
with `-SkipSettings` / `--skip-settings` (or just answer `N`) to get the lines printed
for hand-editing. Either way, **reload the VS Code window** afterwards.

### Verify

- **Claude:** run `/qrspi:status` in any repo — it should print the stage map.
- **Copilot:** in Copilot Chat, type `/` and confirm the `qrspi-*` prompts appear; the
  `qrspi-*` agents appear in the agents dropdown.

### Uninstall

- **Claude:** `/plugin uninstall qrspi` (and `/plugin marketplace remove lotea-agents`
  to drop the catalog too).
- **Copilot:** the inverse of the install script — removes **only the files this kit
  ships** (it walks the repo's source trees and deletes the matching file under
  `~/.copilot/`), leaving any other file you keep there alone. Empty folders are pruned.

```powershell
./uninstall.ps1            # remove the Copilot kit
./uninstall.ps1 -DryRun    # list what would be removed, delete nothing
./uninstall.ps1 -Yes       # skip the confirmation prompt
```

```bash
./uninstall.sh             # remove the Copilot kit
./uninstall.sh --dry-run   # list what would be removed, delete nothing
./uninstall.sh --yes       # skip the confirmation prompt
```

The Copilot uninstall does **not** touch your VS Code `settings.json` — if you let
install patch in the `chat.*FilesLocations` keys, remove them by hand.

---

## Two tools (Claude + Copilot)

The workflow is identical for both tools; only the file format differs. **`claude/` is
the single source of truth**; `copilot/` is generated from it.

| Claude Code (`claude/…`) | GitHub Copilot (`copilot/…`) | Installs to |
|---|---|---|
| `agents/<x>.md` (subagents) | `agents/<x>.agent.md` (custom agents) | `~/.copilot/agents/` |
| `commands/<x>.md` (`/qrspi:*`) | `prompts/<x>.prompt.md` (slash prompts) | `~/.copilot/prompts/` |
| `skills/<x>/SKILL.md` (model-invoked) | `instructions/<x>.instructions.md` (referenced on demand) | `~/.copilot/instructions/` |

A Copilot prompt carries an `agent:` field, so `/qrspi:questions` runs inside the
`questioner` agent — mirroring how the Claude command delegates to its subagent.

### Sync workflow

```
edit claude/…  →  node sync-copilot.mjs  →  review & commit copilot/
```

Regeneration is **deterministic and drop-and-recreate**:
[`sync-copilot.mjs`](sync-copilot.mjs) wipes `copilot/` and rebuilds it from `claude/`
by fixed rules — fast, free, reproducible, no Claude session needed
(`node sync-copilot.mjs --check` proves zero drift). The generated `copilot/` tree is
**committed** so Copilot-only users install without ever running the sync.

For a higher-fidelity pass, the Claude-side **`/qrspi-sync-copilot`** runs the script,
reviews the output against the `qrspi-sync-copilot` skill, and — when it finds a
systematic gap — **edits the script** (a `Rewrite-All` rule or an `Apply-Fixups` entry),
never the generated files. So fixes compound in the script and stay reproducible.

> Never hand-edit `copilot/` — it's overwritten on every run. Improve `sync-copilot.mjs`
> instead.

### Copilot fidelity gaps (by design, not hidden)

Copilot's model is less expressive than Claude Code's, so the port is faithful but lossy:

- **Per-slice model selection.** Claude picks sonnet/opus per slice automatically;
  Copilot can't, so the `**Model:**` annotation becomes advisory — you set the model in
  the Copilot model picker.
- **Subagent orchestration.** Deep delegation becomes a single `agent:` per prompt plus
  human-driven agent switches.
- **Skill auto-loading.** Instruction files are referenced on demand, not auto-loaded.
- **Shell injection / file includes** in commands degrade to written steps.

---

## Consuming in another repo

QRSPI lives in user scope, so it's already available everywhere once installed. To use
it on a project (paths below are Claude's `.claude/`; Copilot users substitute the
`.github/` equivalents — e.g. `/qrspi:stack` writes
`.github/instructions/<repo>-stack.instructions.md`):

1. **Bootstrap OpenSpec (once per repo):**

   ```
   /qrspi:init
   ```

   This runs `npx @fission-ai/openspec@1.4.1 init --tools none` to scaffold `openspec/`.
   Templates are **not** copied into the repo — the kit ships the artifact shapes (the
   stage agents carry them inline; the canonical files travel with the plugin), so there
   is nothing per-repo to seed.

2. **Run the stages** for a change (kebab-case, verb-first id):

   ```
   /qrspi:questions add-user-export
   /qrspi:research  add-user-export
   /qrspi:design    add-user-export      # ← review & approve design.md here
   /qrspi:structure add-user-export
   /qrspi:slices    add-user-export
   /qrspi:plan      add-user-export
   /qrspi:implement add-user-export
   /qrspi:pr        add-user-export
   /qrspi:archive   add-user-export      # ← after the PR merges
   ```

3. **(Recommended) give the repo its stack-cheatsheet.** The agents look for — but do
   not require — a **stack-cheatsheet skill** (`<repo>-stack`) describing the repo's
   languages, libraries, and conventions. Bootstrap it once:

   ```
   /qrspi:stack
   ```

   This detects the stack from the repo's manifests, interviews you to fill gaps, and
   writes `<repo>/.claude/skills/<repo>-stack/SKILL.md` (project scope, committed). From
   then on every QRSPI stage loads it automatically.

4. **(Optional) other project-scope helpers.** The agents also degrade gracefully around
   **expert subagents** for deep domain questions (DB, API, UI, …).

   Add them as project-scope files under `<repo>/.claude/`. Project scope overrides user
   scope on name collisions, so a repo can also customize any QRSPI agent/command/skill
   by dropping a same-named file in `<repo>/.claude/`.

---

## Developing QRSPI further

The intended loop:

1. Edit the source under `claude/` (+ `openspec-templates/`) **here** in your local clone.
2. If you touched anything Copilot ships, run `node sync-copilot.mjs` to regenerate
   `copilot/` (or `/qrspi-sync-copilot` for a reviewed pass), and review the diff.
3. Test the **Claude** side with `claude --plugin-dir .` (loads this repo as the plugin,
   no install). For **Copilot**, run `./install.ps1` or `./install.sh` to push `copilot/`
   into `~/.copilot/`.
4. Restart Claude Code / reload the VS Code window and test in a real repo.

> Never edit `copilot/` by hand — it is regenerated from `claude/`. The `qrspi-sync-copilot`
> command and skill (Claude-only) are not ported to Copilot.

### Keeping the templates in sync

The canonical templates live in `openspec-templates/` (here) and travel bundled with the
plugin. They are **not** copied into consuming repos (shared shape — the agents carry the
artifact shapes inline). **This repo is canonical** — edit the templates and the matching
inline skeletons in the agents here, then republish the plugin; downstream repos pick the
shapes up automatically.

### Updating the pinned OpenSpec version

The OpenSpec CLI version is **pinned** (currently `1.4.1`) in the following
hand-maintained locations:

- `claude/commands/init.md` -- all `@fission-ai/openspec@<version>` invocations
  and the inline `openspec_version:` value in the YAML snippet it writes
- `README.md` (this file) -- prose references to `@fission-ai/openspec@<version>`
- `openspec/config.yaml` -- the `openspec_version:` sentinel field

`copilot/prompts/qrspi-init.prompt.md` is **generated** from `claude/commands/init.md`
and must not be edited by hand -- it is updated automatically by `node sync-copilot.mjs`.

To bump the pin, update every `@fission-ai/openspec@<version>` occurrence in the
hand-maintained files above, then run:

```
node sync-copilot.mjs
```

Review the diff (the generated `copilot/` tree will update automatically), commit
both the source and generated changes, re-run `./install.ps1` or `./install.sh`,
and reload the VS Code window. A CI lint job (`node scripts/lint.mjs`) asserts that
all hand-maintained occurrences agree -- the lint will catch any missed location.

---

## Conventions for contributors

- **Agent `model:` fields use aliases** (`opus` / `sonnet` / `haiku`), never pinned
  version ids. Design/Implement default to `opus`; the turn-the-crank stages to `sonnet`.
- **Stay stack-agnostic.** Reference project helpers descriptively ("the project's
  stack-cheatsheet skill, if any"), never by a stack-specific name.
- **Keep repo and user copies identical in shape.** When you change an artifact's
  canonical structure, update the matching `openspec-templates/` file too.
- **Spec deltas are the only strictly-validated artifact.** `openspec validate` enforces
  the `## ADDED/MODIFIED/REMOVED Requirements → ### Requirement → #### Scenario` grammar;
  proposal/design/tasks follow OpenSpec's canonical headers so they round-trip cleanly.

---

## Relationship to OpenSpec

QRSPI uses OpenSpec as its **filesystem**: every stage writes one OpenSpec artifact, and
spec deltas are validated by the OpenSpec CLI. The canonical artifact shapes in
`openspec-templates/` follow OpenSpec's own templates (with QRSPI's richer detail nested
inside). QRSPI adds the staged human-in-the-loop process, the subagents, and the
vertical-slice discipline on top.
