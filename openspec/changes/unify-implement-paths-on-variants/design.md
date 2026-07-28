# Design — unify-implement-paths-on-variants

> Stage D of QRSPI. Generated 2026-07-27.
> **Implementation is BLOCKED until a human approves this file.**

<!-- Surface-gate: the qrspi-stack cheatsheet's `## Repo surface` block lists
     slash-command, stage-agent, skill, lint-gate, template, migration-manifest.
     None map to data-store / http-api / ui / auth, so the four surface-gated
     detail sections (Data model changes / API surface / UI surface /
     Authorization) are omitted entirely -- no heading, no body. -->

## Context

`per-slice-compute-tier` shipped effort-variant dispatch: `/qrspi:implement`
reads each slice's required `effort=<low|medium|high>` token and spawns the
matching `qrspi:implementer-<effort>` variant, with the whole implementer body
living in the `implementer-core` skill. Each variant agent is a one-liner that
loads only `implementer-core`. That left the base `claude/agents/implementer.md`
**vestigial for the normal slice flow** — it is no longer spawned there — but
two paths still fall through to it: (1) `/qrspi:followup` (FIX MODE) spawns
`qrspi:implementer` directly, and (2) `/qrspi:implement` with no `tasks.md` +
an inline one-paragraph plan has undefined dispatch prose that reads as "falls
through to the base." So today there are **two live routes to the base and one
implicit one**, plus the effort-variant route — four routes, two implementers.

The base file also anchors three lint responsibilities the variants do not:
the `> **Read contract**` banner (Check 7), the `> **Output contract**` banner
(Check 12), and the `implementer` entry in `scripts/skill-sets.mjs` (Check 2b,
also consumed by `context-footprint.mjs`). Check 15 guards the variant fleet
but asserts nothing about the base.

**Desired end state.** Every dispatch path — normal slice, FIX MODE, and the
trivial inline-plan path — routes through an effort-variant. The base
`implementer.md` is deleted from the repo and from `plugin.json`'s `agents`
array (PQ3). Its three responsibilities relocate to a single well-chosen home.
The four affected lint checks (2b/7/12/15) are updated so lint stays green with
no dead route left to guard. As a bundled rider, a one-line cwd/change-folder
invariant note is added to every command that resolves `openspec/changes/<id>/`
(all eleven change-folder-resolving commands — scope broadened from PQ4 at the
D gate; see D9).

## Goals / Non-Goals

**Goals:**
- Every implementer spawn — `/qrspi:implement` (normal + trivial), and
  `/qrspi:followup` (FIX MODE) — routes through `qrspi:implementer-<effort>`.
- Delete `claude/agents/implementer.md` and its `plugin.json` registration
  cleanly; relocate its Read/Output contract banners and skill-set entry.
- Update lint Checks 2b, 7, 12, 15 so they guard the new topology and stay
  green at every slice boundary.
- Add the cwd/change-folder note to all eleven change-folder-resolving commands
  (scope broadened from PQ4 at the D gate — see D9).

**Non-Goals (named follow-up backlog ideas — do not implement here):**
- New effort tiers (`xhigh`, `max`) — `richer-effort-vocab-and-thinking`.
  `IMPLEMENTER_VARIANTS` stays `{low, medium, high}`; the design imposes no
  constraint blocking a later variant append (Q24).
- Compute escalation-on-failure re-spawn — `compute-escalation-on-failure`.
  This change is its prerequisite (FIX MODE must use variants first) but
  implements no escalation logic (Q25).
- ~~Broadening the cwd note to all stage commands~~ — **now IN scope** (D9,
  human decision at the D gate); no longer a deferred non-goal.

## Decisions

### D1 — FIX MODE (`followup.md`) maps to a variant subagent_type; default `medium` (PQ1, Q7)

`followup.md` today spawns `subagent_type: qrspi:implementer` and threads an
explicit `model:` parameter. Rewrite the spawn to select a **variant** stem
from the follow-up's effort, exactly as `implement.md` does for slices:

- Parse the optional inline `(compute: effort=<low|medium|high>)` token
  (the parser already exists in the command).
- Map `effort=` → `subagent_type`: `low`→`qrspi:implementer-low`,
  `medium`→`qrspi:implementer-medium`, `high`→`qrspi:implementer-high`.
- **When `effort=` is absent, default to `medium`** (PQ1) → spawn
  `qrspi:implementer-medium`. This replaces today's implicit `effort: high`
  (the base agent's frontmatter), which over-provisioned typical small fixes.
- `model:` threading is **unchanged**: still pass `model:` explicitly
  (`sonnet` default, or the parsed inline `model=`), because the Agent-tool
  `model:` parameter overrides the variant's frontmatter `model:` (see D8).
- The FIX MODE instruction text ("You are in POST-PR FIX MODE… load skill
  `postpr-fix`…") is unchanged — it is passed to whichever variant is spawned;
  the variant loads `implementer-core`, whose Fix-mode section loads `postpr-fix`.

*Rejected:* keeping `qrspi:implementer` as the FIX-MODE target (that is the
dead route we are removing). Because the base is deleted (D3), `followup.md`
**must** target a variant or it would name a non-spawnable stem.

### D2 — Trivial / inline-plan path (`implement.md`) spawns `implementer-medium`; no new token (PQ2, Q8)

The precondition's trivial exception (no `tasks.md`, user states a one-paragraph
inline plan) currently has undefined dispatch. Make it explicit: **spawn
`qrspi:implementer-medium`** with `model: sonnet` (PQ2). Do **not** demand a
new `effort=` token in this path — the trivial path stays frictionless; an
absent plan is treated as unspecified scope (medium), not assumed-small (low).
The `implementer-core` skill already handles the no-`tasks.md` + inline-plan
case in its Precondition section, so only the command's spawn-selection prose
needs the addition. The missing-`effort=` hard-stop is **unchanged** and
continues to apply only to the normal `tasks.md` slice path (a slice with no
`effort=` is a planning gap; the inline-plan path has no slice to gap).

### D3 — Delete the base `implementer.md`; relocate its three responsibilities (PQ3)

Delete `claude/agents/implementer.md` from the repo and remove
`"./claude/agents/implementer.md"` from `.claude-plugin/plugin.json`'s `agents`
array (dropping it from ten to nine agent paths). Its three responsibilities
relocate as follows (D4, D5). This is the "no dead route" endpoint and aligns
with the road-to-1.0 goal of removing vestigial paths.

The `implementer-core/SKILL.md` **description** currently reads "Load this from
implementer.md (and variant agents)"; update it to drop the `implementer.md`
mention (e.g. "Load this from the implementer effort-variant agents").

### D4 — Read/Output contract banners relocate onto the three variants; Check 7/12 scope expands (Q10, Q16)

The Read/Output contract banners describe the **stage-I read/output contract**
(Reads: `tasks.md`; Returns: per-slice status block). After deletion the three
variants are the sole spawnable stage-I agents, yet they carry no banners today
(Check 15 deliberately excludes them). Choose landing spot **(b) from Q10:
put the banners on all three variants and expand Check 7/12 to cover them.**

Rationale over the alternatives:
- **Rejected (c) — move banners into `implementer-core/SKILL.md`.** Check 7's
  `extractReadsField` and Check 12's presence regex read `claude/agents/<stem>.md`
  and assert an *agent* banner; a skill is not a spawnable agent and carries no
  Read/Output contract in the read-matrix sense. Retargeting the checks at a
  skill path would blur the "banners live on spawnable agents" invariant and the
  workflow Read-Matrix mirror (each banner mirrors a matrix row for an agent).
- **Rejected (a) — keep a non-spawnable base doc anchor.** PQ3 = delete, so
  this option is foreclosed; retaining the file to host banners contradicts the
  delete decision.

Concrete lint edits (both checks are keyed off the single `READ_CONTRACT_EXPECTED`
map, so they move together):
- In `READ_CONTRACT_EXPECTED` (lint.mjs ~L1162): **remove the `implementer`
  key** and **add three keys** — `implementer-low`, `implementer-medium`,
  `implementer-high` — each with `Reads: tasks.md.` (identical to the old
  `implementer` value). Check 7 iterates these keys (7 → still 9 entries:
  6 stage agents + 3 variants; net keys 7→9), Check 12 iterates the same keys
  for presence.
- Each of the three variant files gains, near the top of its body: the
  `> **Read contract** — Reads: tasks.md. Never opens: …` banner (identical
  Reads-field text the base carried, so the extractor matches) and the
  `> **Output contract** — Returns: per-slice status block …` banner. The
  variant's single "Load skill `implementer-core`" step is unchanged.
- **Interaction with Check 15 sub-check (b):** Check 15 asserts each variant's
  *step-1 Load-skills line* loads only `implementer-core`. The banners are
  blockquote lines, not numbered step-1 lines, so `extractStep1Skills` does
  **not** harvest them — the banners are inert to Check 15. No Check-15
  step-1 conflict. (Verified against the harvest regex `^\s*\d+\.\s…Load skills?`.)

### D5 — Skill-set registry entry: move `implementer` → three variant keys listing only `implementer-core` (Q11, Check 2b)

`scripts/skill-sets.mjs` `SKILL_SET_EXPECTED` currently has an `implementer`
key listing four skills. The variants load only `implementer-core`. Because
the base agent (which loaded the four-skill set) is deleted and the variants
are the real agents, **remove the `implementer` key and add three keys**
`implementer-low`, `implementer-medium`, `implementer-high`, each listing
`['implementer-core']`. This keeps `checkSkillSets` (Check 2b) and
`context-footprint.mjs` — both iterate `Object.keys(SKILL_SET_EXPECTED)` —
correct without special-casing.

*Interaction with Check 15 sub-check (b):* Check 15 already asserts the variant
step-1 line loads only `implementer-core`; the new Check 2b entries assert the
same set from the registry side. This is intentional double-coverage from two
angles (registry vs. on-file harvest), not a conflict — both expect exactly
`['implementer-core']`. *Rejected Q11(c)* (drop from skill-sets entirely):
`context-footprint.mjs` would then omit the stage-I agents from its per-stage
table, losing the footprint signal for the heaviest stage.

### D6 — Check 15: assert base ABSENT from `plugin.json`; keep variant guarantees (Q12, PQ3)

Check 15 today asserts (a) the `implementer-*` stem set equals
`IMPLEMENTER_VARIANTS`, (b) step-1 loads only `implementer-core`, (c) `effort:`
matches the suffix, (d) each variant is registered in `plugin.json`. Its set
filter (`stem.startsWith('implementer-') && stem !== 'implementer'`) already
ignores the base, so **deletion does not trip (a)**. Add a small
sub-assertion (Q12-a) — a new sub-check **(e)**: assert
`"./claude/agents/implementer.md"` is **NOT** present in `plugin.json`'s
`agents` array (the delete branch's structural invariant — the base must never
be re-registered). This is cheap (the `agents` list is already parsed in
sub-check (d)) and gives the delete a positive guard. *Rejected Q12-c* (no
Check-15 change): leaving the base unguarded means a future re-add of
`implementer.md` to `plugin.json` would silently reintroduce the dead route.

### D7 — New check: assert `followup.md` never spawns the base stem (Q18)

Add a targeted assertion (either a new tiny check or an extension of Check 15's
new sub-check (e)) that **`claude/commands/followup.md` contains no
`qrspi:implementer` spawn that is not a variant** — i.e. no
`subagent_type: qrspi:implementer` that lacks a `-low|-medium|-high` suffix.
Recommend a small standalone check (call it Check 16) that greps `followup.md`
for `qrspi:implementer` occurrences and flags any that are the bare base stem
(the string `qrspi:implementer` **not** immediately followed by `-`). This is
the FIX-MODE analogue of Check 15(d)/(e): it pins the behavioural half of D1
(the routing) the way (e) pins the structural half (the registration).

**Watch-item (transitive manifestation, stage I):** the predicate must match
the base stem in *all* the forms `followup.md` writes it — the fenced
`subagent_type: qrspi:implementer` in the spawn block **and** the inline prose
`qrspi:implementer` on the "Spawn the … subagent via the Agent tool" line.
A predicate anchored only to `subagent_type:` would miss the prose mention.
The implementer must enumerate both inline occurrences before pinning the
regex (negative-lookahead `qrspi:implementer(?!-)` over the whole file, not a
single anchored line).

### D8 — `model:` precedence is a documented contract, not a runtime-verified fact (open gap a)

Research open-gap (a): whether the Agent-tool `model:` parameter overrides an
agent's frontmatter `model:` at runtime cannot be verified from static reading.
This design does **not** rest on that: after D1 the FIX-MODE spawn targets a
variant whose frontmatter is already `model: sonnet` — so even if per-invocation
`model:` did **not** override, the spawned model would still be `sonnet` (the
FIX-MODE default), not the base's old `opus`. Deletion of the base removes the
only `model: opus` frontmatter from the implementer fleet, so the override
question becomes moot for defaults. The explicit `model:` threading is retained
(D1) so an inline `(compute: model=opus)` still escalates; **that** escalation
path is the one relying on override, and it is carried forward unchanged from
today — a **stage-I watch-item** (dogfood: spawn FIX MODE with
`(compute: model=opus)` and confirm the session runs opus), with the fallback
being "frontmatter already yields the safe default" if override proves flaky.

### D9 — cwd/change-folder note: one-line prose in the precondition section of ALL change-folder-resolving commands (supersedes PQ4; Q13/Q14/Q15)

**Scope revised at the D gate (human decision, 2026-07-27):** the human elected
to broaden the note beyond PQ4's implement+followup pairing to **every command
that resolves `openspec/changes/<id>/`** — applying the invariant uniformly
rather than leaving a deliberate inconsistency, in keeping with the road-to-1.0
goal of a uniform, stable command surface. This **supersedes PQ4** (which had
scoped it to implement+followup); the questions.md PQ4 answer stands as the
historical Q-stage record.

Add a one-line note (Q15-a: prose in the command body; Q14-a: in/adjacent to the
precondition/Glob section), placed right after each file's Glob/precondition
line, to **all eleven** change-folder-resolving command files:
`questions.md`, `research.md`, `design.md`, `structure.md`, `slices.md`,
`plan.md`, `implement.md`, `pr.md`, `followup.md`, `archive.md`, `retro.md`.
(The four non-resolving commands — `init.md`, `stack.md`, `status.md`,
`update.md` — do not carry it; `status`/`update`/`stack`/`init` do not Glob a
specific change folder.) Wording:

> Resolve `openspec/changes/<id>/…` against the **current working repo root**
> (the consumer's CWD), not the plugin install directory — the change folder
> lives in the repo you are running the command in.

*Rejected:* Q14-b/c (dogfood-skill-only placement). The blast radius is now the
full set of change-folder-resolving commands (a larger, uniform diff), which the
Structure stage folds into the Slice-4 rider.

### D10 — Migration manifest: no automated step; one manual note appended to `0.10.0.yaml` (Q26)

Deleting `claude/agents/implementer.md` touches only **kit** files, not any
consumer `openspec/` state, and the `automated` step schema (Check 6) restricts
`action: edit-file` to `path` values starting with `openspec/` — it **cannot**
delete a `claude/agents/` file. So no `automated` step is possible or needed.

Recommend **appending one `manual` note** to the existing `migrations/0.10.0.yaml`
(the change ships in the same 0.10.0 line as the grammar swap): tell consumers
who **locally overrode `claude/commands/followup.md`** to re-apply their
customizations onto the new variant-routing logic (FIX MODE now spawns
`qrspi:implementer-<effort>`, default `medium`, instead of `qrspi:implementer`),
mirroring the existing implement.md override note. Consumers with no local
override need no action — updating the kit swaps the files wholesale. No
new manifest file, no version bump (per CLAUDE.md: version changes only at
release; record under CHANGELOG `## [Unreleased]`).

### D11 — README + CHANGELOG sync in the same change (CLAUDE.md contract)

CLAUDE.md mandates README updates in the same change that re-scopes agents or
touches lint checks. Required edits: (1) README Check 7/12 descriptions say
"seven stage agents" — after D4 the banner-carrying set is 6 stage agents +
3 variants; reword to match (e.g. "the six stage agents plus the three
implementer variants"). (2) Check 15 description gains the new base-absent
sub-check (e) and the note that variants now carry banners. (3) Any agent-
inventory / count prose that says "seven QRSPI stage subagents" or lists the
base implementer must drop it. (4) Add a `## [Unreleased]` CHANGELOG entry.
Run `/qrspi-readme-audit` at stage I to catch prose drift the lint cannot.

## Vertical slices (preview)

The Structure stage will detail these; each ends in a demoable end-to-end
routing behaviour, and each must leave `node scripts/lint.mjs` **green** at its
boundary (the sole test gate). Ordering is chosen so no banner/skill-set entry
is ever orphaned mid-change (Q22/Q23):

- **Slice 1 — FIX MODE + trivial path route to variants (D1, D2).** Rewrite
  `followup.md` (default `medium` variant) and `implement.md`'s trivial-path
  spawn (`implementer-medium`). Demo: `/qrspi:followup` with no inline effort
  spawns `qrspi:implementer-medium`; inline-plan `/qrspi:implement` spawns the
  medium variant. The base still exists here, so lint stays green.
- **Slice 2 — delete the base and relocate its responsibilities (D3, D4, D5).**
  Add banners to the three variants + expand `READ_CONTRACT_EXPECTED`; move the
  skill-set entry to three variant keys; delete `implementer.md` + its
  `plugin.json` entry; update `implementer-core`'s description. Banners must
  land on the variants *before or in the same commit as* the base deletion so
  Check 7/12 never see a missing `implementer` stem. Demo: full lint green with
  no base file; every spawn resolves.
- **Slice 3 — tighten the guards (D6, D7).** Add Check 15 sub-check (e)
  (base absent from `plugin.json`) and the new Check 16 (`followup.md` never
  names the bare base stem). Demo: a deliberate re-add of `implementer.md` to
  `plugin.json`, or a base-stem spawn in `followup.md`, reddens lint.
- **Slice 4 — bundled rider: cwd note + docs sync (D9, D10, D11).** Add the
  cwd note to all eleven change-folder-resolving commands; append the migration
  manual note; sync README/CHANGELOG. Demo: `/qrspi-readme-audit` clean; lint
  green.

## Risks / Trade-offs

- **Banner duplication across three variants (D4).** The Read/Output banner text
  is now triplicated. Trade-off accepted: Check 7 asserts each is byte-identical
  to the shared `Reads: tasks.md.` expected value, so drift is mechanically
  caught. The alternative (single skill home) breaks the "banners on spawnable
  agents" invariant the read-matrix mirror depends on.
- **Slice-2 ordering fragility.** If the base file is deleted before its
  `READ_CONTRACT_EXPECTED` key is removed / variant keys added, Check 7/12 go red
  ("file not found"). The slice must sequence the map edit + variant banners
  *with* the deletion in one commit. Called out in the Slice-2 preview.
- **Model-override runtime assumption (D8).** The inline `(compute: model=opus)`
  escalation still relies on per-invocation `model:` overriding variant
  frontmatter — unverifiable statically. Mitigated: the *default* path no longer
  depends on it (variant frontmatter is already `sonnet`). Carried as a stage-I
  dogfood watch-item, not an approved-and-forgotten fact.
- **`context-footprint.mjs` table shape changes.** Moving one `implementer` row
  to three variant rows changes the report's row count. It is report-only
  (always exits 0), so no gate breaks; noted so the diff is not a surprise.

## Open questions for the human

- [x] **D7 shape — new Check 16 vs. fold into Check 15(e)?** The design
  recommends a small standalone Check 16 (`followup.md` never spawns the bare
  base stem) for separation of concerns, but it could fold into Check 15's new
  base-absent sub-check to avoid a new numbered check. Which do you prefer?
  **Answer: Standalone Check 16 — separation of concerns; Check 16 pins the
  behavioural half (followup routing), Check 15(e) the structural half
  (plugin.json registration). D7 stands as written.**
- [x] **D9 wording/anchor.** Is the proposed one-line cwd note wording and its
  placement (right after the Glob precondition line) acceptable, or do you want
  a tighter/looser phrasing?
  **Answer: Accept as proposed — the wording and after-the-Glob-line placement
  ship as written in D9.**
- [x] **D4 banner text on variants.** Confirm the variants should carry the
  *full* Read + Output contract banners (matching the base verbatim), rather
  than a shorter variant-specific form. Check 7 needs the Reads-field to match
  `Reads: tasks.md.` exactly; the Output banner is presence-only so its prose
  is freer.
  **Answer: Full verbatim — the three variants carry the full Read + Output
  contract banners matching the base's text, so Check 7's exact Reads-field
  match holds and drift stays mechanically caught. D4 stands as written.**
