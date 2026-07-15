# Design — tighten-stage-read-boundaries

> Stage D of QRSPI. Generated 2026-07-15.
> **Implementation is BLOCKED until a human approves this file.**

## Context

QRSPI's seven Q→PR stage agents (`researcher`, `questioner`, `designer`,
`architect`, `planner`, `implementer`, `reviewer`) each read change-folder
artifacts via an unrestricted `Read` grant. Today the read scopes drift: the
architect reads `questions.md` + `research.md` + `design.md` at S, the planner
reads `design.md` cover-to-cover, and several agents could reach into *other*
changes' folders (in-flight or archived) — the questioner already skims an
archived `questions.md`, and the designer honours triggers recorded in an
archived `design.md`. In long flows this redundant reading burns tokens and
blurs stage boundaries. There is **no tool-level path restriction** available
(the `tools:` frontmatter grants tool *classes*, not paths), so every read
boundary is prose-enforced.

The desired end state: each stage reads the strict minimum the human approved
in Q — **R** none · **D** questions+research · **S** design · **V**
proposal+specs · **P** slices · **I** tasks · **PR** full-folder — plus a
cross-change boundary on every agent (no other change's *process* artifacts;
`spec.md` is the sole exception). This is enforced three ways: (1) tightened
prose in each `claude/agents/*.md`, (2) a per-agent read-contract banner + a
read-matrix table documenting the contract, and (3) a new `scripts/lint.mjs`
string-search check. The change also ships its own `migrations/<version>.yaml`
entry, now required by the release gate (lint Check 6) merged on `main`.

## Goals / Non-Goals

**Goals:**
- Narrow each stage agent's declared read set to the approved read-matrix row.
- Make the D-number traceability chain self-carrying so P and I never open
  `design.md`: the architect embeds `(D<n>)` tags in every `slices.md` bullet.
- Add a cross-change read boundary to all seven stage agents (spec.md excepted).
- Document the matrix (workflow skill table + per-agent banner) and add a
  string-search lint floor that fails on a forbidden artifact named in prose.
- Ship this change's `migrations/<version>.yaml` entry (release-gate deliverable).

**Non-Goals (out of scope; separate backlog items):**
- Tool-level / path-level read enforcement — no such mechanism exists in the
  Agent tool. The lint is a *prose* floor; it cannot catch Glob-discovery.
- `enforce-research-ticket-hiding` — the mechanical guard layered on the
  researcher *later* (sequenced after this change; PQ8).
- Changing what the designer *writes* into `design.md` (only what downstream
  stages may *read* is in scope).
- Changing the divergence rubric / hard-stop conditions (settled by `add-auto-mode`).
- Read-contract banner / lint coverage for `/qrspi:update` + `qrspi-update`
  (PQ13 — they read manifests + the marker, not change artifacts).

## Decisions

### D1 — Architect (S) reads `design.md` only (PQ1)
Drop `questions.md` and `research.md` from `architect.md` step 2 (S path);
`design.md` is the sole source of truth. The designer has already distilled
the other two into `design.md` by the time S runs. Also reword the S-path
"Open questions surfaced" final-message field (currently cites answers "by
`design.md`, `questions.md`, or `research.md`") to "not answered by `design.md`
alone", and confirm no divergence-check wording cites the dropped files. The
V path already reads only `proposal.md` + `specs/` — verify, do not widen.
*Rejected:* keeping `research.md` for a codebase-anchor (b) — the human chose
(a); the design carries enough grounding.

### D2 — Planner never opens `design.md`; carries `(D<n>)` from `slices.md` (PQ2, PQ3)
`planner.md` step 2 becomes "Read `slices.md`" only. D-number back-references
are carried forward from the `(D<n>)` tags the architect embeds in each slice
bullet — the planner never opens `design.md`. This depends on D3. Also resolve
the existing Inputs/What-to-do inconsistency (Inputs lists `proposal.md` +
`specs/`; step 2 said `design.md` + `slices.md`): the read set is `slices.md`
only, so drop `proposal.md`/`specs/`/`design.md` from the planner's read list.
*Rejected:* lazy per-decision `design.md` lookup (PQ2 option a) — the human
chose (c), a strictly closed read set, made viable by D3.

### D3 — Architect MUST embed `(D<n>)` tags in every `slices.md` bullet (PQ3)
This is a **required output-format rule** (not best-effort) added to the
`slices.md` shape the architect writes. It is the mechanism that lets D2 and D4
close their read sets: every slice bullet that implements a numbered design
decision carries its `(D<n>)` / `(D<n>, D<m>)` tag, so the tags propagate
`slices.md → tasks.md → implementer` without any downstream `design.md` read.
The `(D<n>)` convention already exists for `tasks.md` (defined in
`tasks.template.md`); this extends the *source* of those tags upstream to V.
**Settled (OQ6):** make `(D<n>)` embedding a required part of the slices shape in
BOTH the architect's inline `slices.md` skeleton AND the relevant template, and fold
in the stale `worktree.md` → `slices.md` label fix in `tasks.template.md`.

### D4 — Implementer never opens `design.md`; conflict → hard-stop (PQ4)
`implementer.md` continues to read `tasks.md` only. The `(D<n>)` tags in
`tasks.md` suffice for the divergence self-check. If a slice appears to
conflict with a design decision, the implementer **hard-stops to the human**
(stop-and-ask) rather than opening `design.md`. This routes through the
existing hard-stop condition (4) machinery in the workflow skill — no new
gate. *Rejected:* lazy divergence-time `design.md` read (PQ4 option b).

### D5 — Researcher bans the whole `openspec/changes/<id>/` folder (PQ5)
Extend the researcher's current single-sentence `questions.md` ban to the whole
change folder: prohibit opening *any* file under `openspec/changes/<id>/`. Do
**not** add explicit bans on `openspec/changes/archive/` or `openspec/specs/`
base specs here — those are left to `enforce-research-ticket-hiding` (PQ5, PQ8).
(The cross-change boundary in D8 covers other changes' folders separately.)

### D6 — Cross-change read boundary on EVERY stage agent (PQ9)
Add to all seven stage agents: no agent may read another change's *process*
artifacts (`questions.md`, `research.md`, `design.md`, `proposal.md`,
`slices.md`, `tasks.md`, `pr.md`, `followups.md`) — whether in-flight under
`openspec/changes/<other-id>/` or archived under `openspec/changes/archive/`.
**Sole exception: any `spec.md`** — base specs under `openspec/specs/**` and
delta `specs/**/spec.md` in other/archived changes. See OQ4 for *where* this
clause lives (central + reference vs. repeated per banner).

### D7 — Questioner drops the archived worked-example read (PQ10)
`questioner.md` step 5 (skim the most recent archived `questions.md` as a
worked example) is a now-forbidden cross-change read under D6. Replace it with
a reference to the stable checked-in fixture
`openspec-templates/questions.template.md` and the agent's own inline canonical
shape. **Watch-item (I):** `questioner.md` currently says "there is no per-repo
template file to read" — confirm whether `openspec-templates/` is reachable by
the agent in a *consuming* repo. If it is not, the inline shape alone stands
and the archived read is simply removed (fallback, no functional loss).

### D8 — Designer sources triggers from base specs, not archived designs (PQ11)
`designer.md` step 6 ("Honour prior conditional triggers") is reworded to source
scheduled triggers from base specs (`openspec/specs/**`, read via the D6
`spec.md` exception), never from another change's `design.md`. This preserves
trigger continuity through an allowed, durable channel. (A richer per-version
trigger home is a separate backlog idea — out of scope.)

### D9 — Document the matrix: workflow-skill table + per-agent banner (PQ6)
Both: (a) a net-new read-matrix table in `claude/skills/workflow/SKILL.md`
(the skill has no per-stage input table today — the natural home is a new
subsection near `## The eight stages`), and (b) a per-agent read-contract
banner at the top of each of the seven agent files. **Settled:** banner is a terse
uniform block atop each agent (OQ1); the cross-change / `spec.md`-exception rule
lives ONCE in the workflow-skill Read-Matrix section and each banner references it
(OQ4).

### D10 — New `scripts/lint.mjs` Check 7: read-contract string-search (PQ7)
Add a seventh check following the existing 6-check pattern (async
`checkReadContracts(errors)`, push to `errors[]`, OK-line in `main()`). It
asserts each stage agent's read section names no forbidden artifact for its row
(string-search floor). The closest precedent is Check 5's `reachesMainLoopOnlyTool`
— a per-file body scan with a small allow/deny set. **The lint must NOT flag**
`/qrspi:update` / `qrspi-update` (PQ13) — scope it to the seven stage agents
only. Accepted limitation: it cannot catch a file opened via Glob without being
named in prose. **Settled:** Check 7 is a banner-keyed POSITIVE check — it parses
each banner's `Reads:` field and asserts it equals the agent's matrix row (OQ2), with
the expected allow-set derived from the matrix (architect two-mode S/V; reviewer
special-cased full-folder) (OQ3). This sidesteps free-prose false-positives.

### D11 — Ship this change's `migrations/<version>.yaml` (PQ12)
Add one manifest: empty `automated: []`, and a `manual` list with ONE note —
"if you have locally overridden any QRSPI stage-agent file, re-align it to the
new per-agent read contracts." No `automated` edit-file step (the plugin
delivers the new agent files itself). The version string is chosen at release
time; Design/Plan add the task, Implement writes the file. Required by the
release gate (lint Check 6) now on `main` — treat as an in-scope deliverable,
not a follow-up.

## Data model changes

No data model. The "model" is the read-matrix — which change-folder artifact
each of the seven stage agents may open — encoded as prose + banner in
`claude/agents/*.md`, a table in the workflow skill, and asserted by lint
Check 7. The authoritative matrix (approved in Q):

| Stage | Agent | Reads (within-change) | Cross-change |
|-------|-------|-----------------------|--------------|
| R  | researcher  | *none* (whole `changes/<id>/` banned, D5) | spec.md only |
| Q  | questioner  | backlog + templates (no change-folder read) | spec.md only |
| D  | designer    | questions.md + research.md | spec.md only |
| S  | architect   | design.md | spec.md only |
| V  | architect   | proposal.md + specs/ | spec.md only |
| P  | planner     | slices.md | spec.md only |
| I  | implementer | tasks.md | spec.md only |
| PR | reviewer    | full `changes/<id>/` folder (by design) | spec.md only |

## API surface

No HTTP surface. The analogous surface is the set of files edited:
- `claude/agents/researcher.md` — whole-folder ban (D5) + cross-change (D6) + banner (D9).
- `claude/agents/questioner.md` — drop archived read (D7) + cross-change (D6) + banner.
- `claude/agents/designer.md` — trigger source → base specs (D8) + cross-change + banner.
- `claude/agents/architect.md` — S reads design.md only (D1); `(D<n>)` embed rule (D3);
  V verified; cross-change + banner.
- `claude/agents/planner.md` — read `slices.md` only (D2) + cross-change + banner.
- `claude/agents/implementer.md` — tasks.md only, conflict→hard-stop (D4) + cross-change + banner.
- `claude/agents/reviewer.md` — "full folder by design" note + cross-change + banner (D9).
- `claude/skills/workflow/SKILL.md` — new read-matrix table (D9).
- `scripts/lint.mjs` — new Check 7 (D10).
- `migrations/<version>.yaml` — new manifest (D11).
- `CHANGELOG.md` `## [Unreleased]` — entry (reviewer-mandated for agent edits).
- `copilot/**` — regenerated by `node sync-copilot.mjs`; never hand-edited.
- **Watch-item (I):** whether any `claude/commands/*.md` needs rewording (see OQ5).

## UI surface

None. The user-visible surface is the agent-file banners and the workflow-skill
table (documentation only).

## Authorization

Not applicable — no roles or policies. The analogue is "which agent may open
which artifact", fully captured by the read-matrix above.

## Vertical slices (preview)

These are user-facing/verifiable end-to-end units (each ends in a demoable
state — a passing `node scripts/lint.mjs` and/or `node sync-copilot.mjs --check`):

- **Slice 1 — Within-change narrowing + banners:** tighten the read prose in
  all seven agents to their matrix row (D1, D2, D4, D5) and add the per-agent
  read-contract banner (D9b). Demo: each agent file reads its minimal set.
- **Slice 2 — D-number self-carry:** add the `(D<n>)` embed rule to the
  architect's `slices.md` shape (D3), completing the P/I closed-read chain.
- **Slice 3 — Cross-change boundary + trigger relocation:** apply D6 to all
  seven agents, drop the questioner's archived read (D7), relocate the
  designer's trigger source (D8).
- **Slice 4 — Documentation + lint gate:** add the workflow-skill matrix table
  (D9a) and the lint Check 7 (D10); run sync + lint green.
- **Slice 5 — Migration entry + changelog:** write `migrations/<version>.yaml`
  (D11) and the `## [Unreleased]` entry; final sync + lint green.

*Slice count/grouping is a preview — the architect refines it at V. The order
above front-loads the prose changes so the lint (Slice 4) has something to
assert.*

## Risks / Trade-offs

- **Prose-only enforcement is soft.** An agent can still Glob-discover and open
  a forbidden file without naming it. The lint (D10) is a floor, not a wall —
  accepted (PQ7). The real guard is instruction + human design review + the
  eventual `enforce-research-ticket-hiding` mechanical layer.
- **D3 is a new hard constraint on V output.** If the architect omits a `(D<n>)`
  tag, the planner/implementer lose that traceability link with no `design.md`
  fallback (D2/D4 closed the read). Mitigation: make D3 a *required* output rule
  and consider a lint/heading assertion later (not this change).
- **Lint fragility (OQ2).** A free-prose scan may false-positive on legitimate
  mentions (e.g. a banner that *names* a forbidden file to prohibit it). A
  banner-keyed scan is more robust but needs a machine-readable banner block —
  this trade-off is unresolved and surfaced as an open question.
- **Consuming-repo template reachability (D7).** If `openspec-templates/` is not
  present in a consuming repo, the questioner's inline shape must fully stand in.
  Flagged as a stage-I watch-item with a fallback, not an approved default.
- **Copilot drift.** Every agent/command edit must round-trip through
  `sync-copilot.mjs`; `--check` must exit 0 in the PR. Standard for this repo.

## Open questions for the human

- [x] **OQ1 — Banner format & placement.** What exact shape/wording should the
  per-agent read-contract banner take, and where does it sit (top of file, above
  or below the role sentence / `> Recommended model` blockquote)? A terse,
  uniform block ("**Reads:** X. **Never opens:** Y, Z, other changes' process
  artifacts.") reads well and is lint-friendly; a prose paragraph is softer.
  **Answer: Terse uniform machine-readable block at the top of each agent file
  (near the role sentence / `> Recommended model` blockquote), fixed shape:
  `> **Read contract** — Reads: <set>. Never opens: <deny>; no other change's
  process artifacts (spec.md excepted — see workflow skill Read Matrix).`
  Consistent + lint-parseable. (Sets the D9b banner shape.)**
- [x] **OQ2 — Lint keys off a banner block vs. free-prose scan.** Should Check 7
  scan a machine-readable banner block (robust, but couples lint to banner shape
  and requires the banner to *name* forbidden files, which then must be excluded
  from the "forbidden-token appears in prose" heuristic), or free-scan the whole
  read section (simpler, but fragile — risks false-positives on legitimate
  prohibition mentions)? This is the central lint-design fork.
  **Answer: Banner-keyed POSITIVE check. Check 7 parses each agent banner's
  `Reads:` field and asserts it EQUALS that agent's expected matrix row (a positive
  equality, not a forbidden-token prose scan). The banner's own `Never opens:` list
  therefore cannot self-trip the check, and legitimate prohibition prose elsewhere
  is ignored. Couples the lint to the banner shape (OQ1) — acceptable. (Sets D10's
  keying.)**
- [x] **OQ3 — Exact forbidden-token list per agent.** The precise per-agent deny
  set the lint asserts (e.g. architect-S must not name `questions.md`/`research.md`;
  planner must not name `design.md`/`proposal.md`/`specs`). Needs pinning before P,
  and it interacts with OQ2 (banner mentions must not self-trip the check).
  **Answer: Derive the expected allow-set mechanically from the approved read-matrix
  (Data-model section), one row per agent. Two special cases: the ARCHITECT carries a
  two-mode contract (S: `design.md` / V: `proposal.md` + `specs/`) since one file
  serves both stages; the REVIEWER is special-cased as "full change-folder by design."
  With the OQ2 positive check, "allow-set = matrix row" is the assertion; no separate
  hand-curated deny list is needed. (Pins D10's expected sets.)**
- [x] **OQ4 — Cross-change rule: central + reference, or repeated per banner?**
  State D6's cross-change/spec.md-exception clause once in the workflow skill and
  reference it from each banner (DRY, single source), or repeat the full clause in
  every agent banner (self-contained, but 7× duplication to keep in sync)?
  **Answer: Central + reference. State the full cross-change / `spec.md`-exception
  rule ONCE in the workflow skill's Read-Matrix section; each agent banner ends with
  a short pointer ("…no other change's process artifacts — spec.md excepted; see
  workflow skill Read Matrix"). DRY, single source of truth. (Sets D6/D9 placement.)**
- [x] **OQ5 — Command-file rewording scope.** Do any `claude/commands/*.md` files
  need edits, or do all restrictions live in the agent files alone? Research
  found the command files pass only the change id (not artifact paths) for the
  narrowed stages, suggesting agent-file-only — but confirm no command body
  implies a now-forbidden read.
  **Answer: Agent files only. Restrictions live in the agent files + banners; do NOT
  reword commands. Implement includes a verification pass over the command bodies to
  confirm none implies a now-forbidden read (expected: none, per research).**
- [x] **OQ6 — `(D<n>)` template change.** Does embedding `(D<n>)` in `slices.md`
  (D3) require a change to the `slices`/`tasks` template shape, or only to the
  architect's inline `slices.md` skeleton? (Adjacent: research flagged a stale
  `worktree.md` label in `tasks.template.md` that should read `slices.md` — note
  it; fold in only if trivially adjacent to the D3 edit, else leave out of scope.)
  **Answer: Update BOTH the architect's inline `slices.md` skeleton AND the relevant
  template so `(D<n>)` embedding is a required part of the slices shape. Fold in the
  stale `worktree.md` → `slices.md` label fix in `tasks.template.md` (trivially
  adjacent, and a real bug). (Extends D3's surface.)**
