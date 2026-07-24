# Companion design: `rename-qrspi-to-qrnchi` (the "crunchy" rebrand)

> Design detail for the [`rename-qrspi-to-qrnchi`](../backlog.md) backlog idea.
> The backlog row is too small to hold this; when the idea enters the flow as a
> crouton, its R/D stages start from here (and may still revise it).

## 1. Naming decision & rationale

The plugin name `qrspi` is not arbitrary: the stage initials **Q-R-S-P-I**
phonetically spell **"crispy"** — a lineage nickname inherited from Dex Horthy's
**RPI** (Research → Plan → Implement). Design, Slices, and PR sit outside those
five acronym letters.

This change rebrands to **`qrnchi`** (pronounced **"crunchy"**) and *preserves the
defining property* — the plugin name is the acronym of its own stages — by
re-lettering three middle stages so the initials still spell the name:
**Q-R-N-C-H-I**. Neat inversion of the lineage: "crispy" kept the RPI-ish core
(Q/R/S/P/I); "crunchy" pulls the design-heavy middle (Nail/Chart/Hew) into the
name instead.

Alongside the rename, friendlier vocabulary:

- A single run through the workflow (an OpenSpec "change") is a **"crouton"** —
  the small, deliberate thing you bake first. Prose/UX only; the OpenSpec-owned
  `openspec/changes/` directory is **not** renamed.
- Tagline: **"If you wish to make a bread from scratch, you must first bake a
  crouton."**

## 2. Stage re-letter (the crux)

| Code | Stage (new) | Was | Command | Artifact (unchanged filename) | Agent (unchanged) |
|------|-------------|-----|---------|-------------------------------|-------------------|
| **Q** | Questions | Questions | `/qrnchi:questions` | `questions.md` | questioner |
| **R** | Research | Research | `/qrnchi:research` | `research.md` | researcher |
| **N** | **Nail** | Design | `/qrnchi:nail` | `design.md` | designer |
| **C** | **Chart** | Structure | `/qrnchi:chart` | `proposal.md` + `specs/` | architect |
| **H** | **Hew** | Slices | `/qrnchi:hew` | `slices.md` | architect |
| — | Plan | Plan | `/qrnchi:plan` | `tasks.md` | planner |
| **I** | Implement | Implement | `/qrnchi:implement` | code + tests | implementer |
| — | PR | PR | `/qrnchi:pr` | `pr.md` | reviewer |

Plan (P) and PR sit **outside** the acronym, exactly as Design/Slices/PR did for
"crispy".

**Command files rename, artifacts do not.** The command basename drives the
`/qrnchi:<name>` interface, so `claude/commands/design.md` → `nail.md`,
`structure.md` → `chart.md`, `slices.md` → `hew.md`. But the artifacts those
commands *write* keep their descriptive names (`design.md`, `proposal.md`,
`slices.md`) — decoupled, just as the Structure stage already wrote
`proposal.md`, not `structure.md`. This keeps the artifacts self-descriptive and
avoids churning the ~200 `design.md`/`slices.md` references across the kit.

**Word choices** Nail / Chart / Hew are the design proposal; the letters N/C/H are
fixed by the acronym but the words are refinable (alternatives: N→Note/Nut-out).
For **C** (writes `proposal.md` + delta `specs/`), candidates: **Compose**
(most universally understood, non-native-friendly, slightly generic), **Chart**
(blueprint feel, stays distinct from the cutting sense of the H stage),
**Codify** (most precise — specs = codified requirements — but lower-frequency),
**Craft** (common, positive, generic), **Contract** (apt — specs are behavioral
contracts — but overloaded and awkward as `/qrnchi:contract`). Avoid Carve/Chisel:
they mean *cutting* and collide with the H stage. Current lean: **Compose** for
clarity, or keep **Chart** for the blueprint image; the D stage decides.
For **H**, weigh clarity vs. connotation: **Hack** ("hack into
vertical slices") is far more transparent — including to non-native speakers,
since "hew" is archaic — but carries software baggage (a "hack" = quick-and-dirty
fix; "hacking" = security) that clashes with the *disciplined*-decomposition
intent of the stage. **Hew** is obscure but connotation-clean; **Halve** wrongly
implies exactly two. Current lean: **Hack** for accessibility, with the
connotation noted; the D stage makes the final call. **Agent role-names stay descriptive**
(questioner, researcher, designer, architect, planner, implementer, reviewer);
only their namespace flips to `qrnchi:*`. Precedent: `architect` already spans two
stages.

## 3. Scope / coupling layers

Three layers, from cheapest to breaking:

1. **Auto-derived** — flipping `"name"` in the plugin manifest auto-derives the
   `/qrnchi:*` command prefix and the `qrnchi:<agent>` subagent namespace.
2. **Hardcoded strings** — `/qrspi:…` cross-refs, `subagent_type: qrspi:*`,
   commit-message literals, stage codes/names, loaded skill names, the
   `openspec/.qrspi-version` marker, internal `specs/qrspi-*` dirs.
3. **External / breaking** — the marketplace slug, install commands, and existing
   installs (their markers + `/qrspi:*` muscle memory). Handled by the migration
   + deprecation shim in §4.

**Excluded from edits:** `openspec/changes/archive/**` (immutable history — leave
the old `qrspi` references as record).

## 4. Migration & backward-compat

Grounded in `claude/skills/qrspi-version-check/SKILL.md` and `migrations/*.yaml`
(schema: `version`, `summary`, `automated:` mechanical steps, `manual:`
judgment/human steps).

**Marker rename + bridge.** Consumers carry `openspec/.qrnchi-version` going
forward. A repo still on `qrspi` has `openspec/.qrspi-version` and no
`.qrnchi-version`. The new plugin bridges:

1. **`qrnchi-version-check`** reads B from `installed_plugins.json` matching the
   glob **`qrnchi@*`** (was `qrspi@*`), and reads marker A from `.qrnchi-version`,
   **falling back to the legacy `.qrspi-version`** when the new marker is absent.
   Finding only the legacy marker → hand off to `/qrnchi:update`'s no-marker /
   legacy gate.
2. **`/qrnchi:update`** detects a legacy `.qrspi-version`, adopts its SemVer as
   the starting point, and runs the rename migration before walking forward.

**Rename migration** `migrations/1.0.0.yaml`:

- `automated`: rename `openspec/.qrspi-version` → `openspec/.qrnchi-version`.
  Because artifacts keep their filenames, this marker rename is the **only**
  consumer-repo filesystem change — no in-flight-artifact rewriting.
- `manual`: re-apply any local overrides of the three renamed command files.

**Deprecation shim (external).** The command namespace is derived from the plugin
name, so live `/qrspi:*` aliases from the `qrnchi` plugin are **impossible**.
Instead:

- Publish one final **`qrspi`** release whose command bodies are replaced with a
  one-line notice: *"qrspi is now qrnchi — run `/plugin install
  qrnchi@lotea-agents`, then `/qrnchi:update`."*
- Coordinate `lotea-be/ai-agent-marketplace` to add a **`qrnchi`** entry pointing
  at the `v1.0.0` tag and mark **`qrspi`** deprecated.

Both are **maintainer hand-offs** (outside this repo) — call them out in the
release notes.

## 5. Source file inventory (source only; excludes archive)

- **Manifest** — `.claude-plugin/plugin.json` (`"name"`; homepage URL if it
  embeds `qrspi`).
- **Commands** `claude/commands/*.md` (15) — 3 file renames (design→nail,
  structure→chart, slices→hew) + body edits on all 15 (`/qrspi:` cross-refs,
  `subagent_type: qrspi:*`, commit strings, `status.md` inference table, loaded
  skill names).
- **Agents** `claude/agents/*.md` (7) — body edits (`QRSPI stage <code>` →
  `QRNCHI stage <code>`, D→N / S→C / V→H references). Filenames unchanged.
- **Skills** `claude/skills/**` — rename dirs `qrspi-update` → `qrnchi-update` and
  `qrspi-version-check` → `qrnchi-version-check` (+ `name:` + refs); prose-edit
  `workflow` (stage list, Read Matrix, acronym-lineage note → QRSPI/crispy →
  QRNCHI/crunchy), `vertical-slice` (Slices(V) → Hew(H)), `context-hygiene`,
  `openspec-*`, `postpr-fix`, `retrospective`.
- **Dev tooling** `.claude/skills/qrspi-{dogfood,release}/` and
  `.claude/commands/qrspi-*.md` — rename + internal refs (the dogfood skill also
  references `.qrspi-version`).
- **openspec source** — `openspec-templates/**` (prose-edit only; template
  filenames keep their descriptive names), `openspec/specs/qrspi-*` dir renames +
  cross-refs, `openspec/backlog.md`.
- **Lint** — `scripts/lint.mjs` (Check
  1 pin, Check 4 command↔README sync, Check 7 read contracts, `.qrspi-version`).
- **Docs** — `README.md` (stage table, command list, install cmd
  `/plugin install qrnchi@lotea-agents`, acronym section, repo
  layout, + crouton vocabulary + tagline); `CONTRIBUTING.md`; `CLAUDE.md`;
  `CHANGELOG.md` (`[Unreleased]`, no version bump).

## 6. Release & verification

- **Release:** breaking namespace change ⇒ cut the next release as **`v1.0.0`**
  via the `qrnchi-release` skill. Per `CLAUDE.md`, do **not** bump `plugin.json`
  in the feature work — record under `CHANGELOG.md` `[Unreleased]`.
- **Verification:**
  - `node scripts/lint.mjs` — all checks pass.
  - `grep -rn 'qrspi' claude/ .claude/ openspec-templates openspec/specs scripts/
    README.md CONTRIBUTING.md CLAUDE.md .claude-plugin/` — only intentional
    lineage mentions remain (the "was qrspi/crispy" notes); no stray `/qrspi:`
    refs or `.qrspi-version`.
  - **Dogfood** (per `CLAUDE.md`, via `qrnchi-dogfood` in a
    `claude --plugin-dir` session against a throwaway fixture outside this tree):
    `/qrnchi:nail`, `/qrnchi:chart`, `/qrnchi:hew` resolve and behave; and a
    fixture carrying a legacy `openspec/.qrspi-version` proves the version-check
    bridge fires and `/qrnchi:update` runs the marker-rename migration.
