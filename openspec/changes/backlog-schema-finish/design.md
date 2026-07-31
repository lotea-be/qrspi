# Design — backlog-schema-finish

> Stage D of QRSPI. Generated 2026-07-31.
> **Implementation is BLOCKED until a human approves this file.**

## Context

`standardize-backlog-format` froze the `openspec/backlog.md` grammar (heading
regex, status enum, body-field rule, section-heading + P-band-preamble presence)
and shipped it as Check 22 plus `migrations/0.13.0.yaml` (archived 2026-07-31).
This change finishes three loose ends that fall out of that frozen grammar (plus a
fourth consolidation folded in at design review — see D11). They are largely
independent on the codebase:

1. **Migration `edit-file` idempotency + anchor fallback.** The `qrspi-update`
   dispatcher's `insert_after` is only *marker*-idempotent, not *content*-idempotent
   (a Stop between the insert and the marker bump replays the insert and duplicates
   the legend), and it **hard-stops** when the anchor is absent (a consumer whose
   backlog title differs is wedged at update time).
2. **Backlog wikilink-resolution lint.** Check 22 freezes row grammar but never
   resolves `[[slug]]` cross-references, so a dangling `[[slug]]` passes CI silently.
3. **`/qrspi:idea` capture command.** No lightweight main-loop command exists to
   append a canonical, schema-conformant `idea` row on demand; today that append is
   hand-crafted or reconstructed from the Q/D/S deferred-work prose each time.

The desired end state: the dispatcher is safe to replay and degrades gracefully on a
missing anchor; dangling backlog cross-references redden CI; and capturing a new idea
is a one-command interview that lands a Check-22-valid row. The per-file
`backlog/<id>.md` model stays a **Non-Goal** — the frozen flat-file schema is not
reopened.

## Goals / Non-Goals

**Goals:**
- Make the `edit-file` dispatcher content-idempotent and anchor-fault-tolerant via
  two additive, optional YAML fields (`skip_if_contains`, `anchor_missing`),
  backfilled onto `0.13.0.yaml`.
- Add Check 23 that resolves every *real* `[[slug]]` in `openspec/backlog.md` to a
  live row or an archived change folder, with an inline self-test.
- Ship `/qrspi:idea` as a lightweight main-loop command that dedups, proposes band +
  placement, prompts for the one-sentence shape, and stages a valid row.
- Extract a shared `backlog-writer` skill that owns the canonical row-append procedure,
  and migrate every append site (`/qrspi:idea` + the Q/D/S deferred-work capture + the
  `followup` P3 path) onto it — one source of truth for how a conformant row is written,
  so the "cannot drift from the schema" guarantee holds at every write site.
- Leave this repo's own `openspec/backlog.md` passing Check 23 (clean up the small
  set of pre-existing dangling links inside this change).

**Non-Goals:**
- The per-file `backlog/<id>.md` model (deferred post-1.0; do not reopen the schema).
- Any idea *research / complexity assessment* inside `/qrspi:idea` — capture ≠
  research; that is deferred to the Q→R→D flow when the idea is picked up (PQ5).
- A dedicated lint check over `idea.md`'s runtime behaviour beyond Check 4's
  doc-coverage assertion (see D7 / Risks).
- A runtime-verification harness for slash-command behaviour (`/qrspi:idea`'s
  interview / dedup / gate flow) beyond Check 4's doc-coverage — a separate, larger
  post-1.0 bet, captured as a backlog idea (see Risks).

## Decisions

### D1 — `skip_if_contains` semantics: search the whole file, literal substring (Slice 1)

Per **PQ1**, add optional `skip_if_contains: "<marker>"` to the `edit-file` step;
the dispatcher skips the insert when the marker is already present. Two judgment
calls the PQ left open:

- **Search region.** Search the **whole file**, not just the post-anchor
  neighbourhood. Rationale: the failure being guarded is a *duplicated insert*, and a
  duplicate can only exist if the marker is somewhere in the file; a whole-file scan
  is strictly safe (no false "not present"), simpler to specify, and the marker is
  chosen to be unique. A neighbourhood-only scan risks a false negative if the anchor
  moved. Rejected: neighbourhood scan (fragile, no upside here).
- **Match kind.** **Literal substring** on the raw file text, no normalization. The
  marker is an author-chosen unique token from the inserted `content` (for
  `0.13.0.yaml`: a stable line of the legend block such as
  `Backlog schema legend (frozen by standardize-backlog-format).`). Rejected:
  normalized/whitespace-tolerant match — unneeded complexity; the marker is a fixed
  literal we control.

`skip_if_contains` is **evaluated before** the `insert_after` anchor search (D2), so a
consumer who already has the block is a clean skip regardless of anchor state.

### D2 — `anchor_missing: warn-and-skip` interaction with the walk; marker still bumps (Slice 1)

Per **PQ2**, add optional `anchor_missing: warn-and-skip`. When the `insert_after`
(or `insert_before`) anchor is absent **and** this field is set, the dispatcher
emits a one-line human-readable warning naming the file, the missing anchor, and the
step description, then **skips that step and continues the walk** — instead of the
current hard-stop.

The load-bearing open decision: **does the version marker still bump after a
warn-and-skipped step?** Decision: **yes — the marker bumps normally at end of walk.**
Rationale: `anchor_missing: warn-and-skip` is a deliberate author annotation that says
"this step is best-effort; a missing anchor is an expected consumer-drift case the
`manual:` section already covers." Blocking the marker bump would re-introduce the
wedge PQ2 set out to remove (the consumer could never advance past this version). The
warning + the existing `manual:` instructions are the safety net. Absent the field,
the current hard-stop behaviour is unchanged (default stays strict). Rejected:
skip-but-withhold-marker (re-creates the wedge); relax the anchor to a fuzzy match
(silent, unpredictable edits).

### D3 — Check 6 validates the new fields as an optional, closed value domain (Slice 1)

Per **PQ1/PQ2**, Check 6 is **extended to accept** the fields. Judgment calls:

- **Optional, never required.** No `edit-file` step is forced to carry either field
  (rejects the PQ16 "require `skip_if_contains` on every `insert_after`" option —
  too strict, would redden unrelated future manifests). Check 6 must still pass a
  manifest that omits both fields.
- **Value-domain validation.** `anchor_missing`, when present, must equal the closed
  literal `warn-and-skip` (the only value in the vocabulary today); any other value
  is a Check 6 error. `skip_if_contains`, when present, must be a non-empty string.
  This keeps the closed-vocabulary discipline Check 6 already applies to `action`.
- **Positive-path self-test (PQ/TQ24).** Check 6 gains a positive fixture: a synthetic
  manifest carrying both new fields must pass schema validation (not only a negative
  test that an unknown value fails).

### D4 — Backfill `0.13.0.yaml` in place; no `0.13.1.yaml` re-run manifest (Slice 1)

Per **TQ18/TQ20**, backfill both fields onto the existing `0.13.0.yaml` `insert_after`
step **in place**. Do **not** ship a `0.13.1.yaml` re-run manifest.

Rationale: the guard is *additive and behaviour-preserving for a first-time applier* —
a consumer who has not yet run `0.13.0` gets the identical insert, now guarded. A
consumer who already ran `0.13.0` cleanly has the marker at ≥ `0.13.0` and will never
re-walk that step, so they need nothing. The only population a re-run manifest would
serve is "ran `0.13.0`, got a duplicate legend, and has since not noticed" — and for
them the `0.13.0.yaml` step's own `description` already says "if run twice remove the
duplicate comment block." A new manifest cannot retroactively de-duplicate their file;
it would only add walk surface. So in-place edit suffices. Rejected: `0.13.1.yaml`
(serves no reachable population; adds a stub manifest and a CHANGELOG section for no
consumer benefit).

Marker string chosen for `skip_if_contains` (**settled via OQ1**):
`Backlog schema legend (frozen by standardize-backlog-format).` — a stable, unique line
from the inserted legend block, verified present in the `content`.

### D5 — Check 23 resolves only *bare* wikilinks; slug grammar = row-id grammar; archive match strips the date prefix (Slice 2)

Per **PQ4/PQ7**, ship a **separate Check 23** that collects every `[[slug]]` in
`openspec/backlog.md` and asserts each resolves. Judgment calls, several settled by a
real audit of this repo's backlog (see D6):

- **Bare-only, not code-span.** The audit found that *every* illustrative meta-token
  (`` `[[wikilink]]` ``, `` `[[wikilinks]]` ``, `` `[[<slug>]]` ``,
  `` `[[dangling-idea]]` ``, `` `[[slug]]` ``) appears **inside a backtick code span**,
  while *every real cross-reference* (`[[migration-edit-file-idempotency-guard]]`) is
  **bare**. Check 23 therefore resolves only wikilinks **outside** backtick code spans.
  This is a principled inline/transitive distinction: a backticked `[[…]]` is
  *documentation of the syntax*, a bare `[[…]]` is *a live link*. This reconciles PQ4
  ("check all occurrences in the file, preamble prose included") with the reality that
  the preamble legally contains syntax examples — PQ4's "all occurrences" means all
  *link* occurrences (bare), file-wide, not only inside `### <id>` bodies. Rejected:
  a hardcoded allowlist of meta-tokens (brittle; the code-span rule is self-maintaining).
- **Slug grammar = row-id grammar.** A resolvable slug matches `[a-z0-9]+(?:-[a-z0-9]+)*`
  (the frozen row-id grammar). A `[[…]]` whose inner text is not kebab-case (e.g.
  `[[<slug>]]`) is treated as non-resolving illustrative text — and in practice is
  always code-spanned anyway, so it is skipped by the bare-only rule first.
- **Archive resolution strips the date prefix.** A slug resolves to an archived change
  when a folder `openspec/changes/archive/<YYYY-MM-DD>-<slug>/` exists — i.e. strip the
  leading `\d{4}-\d{2}-\d{2}-` date prefix from each archive folder name and compare the
  remainder to the slug. Per **PQ3**, an archive-folder resolution **passes silently**
  even if the live row is gone.

### D6 — This repo's backlog needs a 5-link cleanup inside this change; count stated (Slice 2)

A real audit was run (65 unique slugs; resolution against live `### ` rows and
date-stripped archive folders, honouring PQ3 archive-passes and the D5 bare-only rule):

- **4 code-spanned meta-tokens** (`[[wikilink]]`, `[[wikilinks]]`, `[[<slug>]]`,
  `[[slug]]`, `[[dangling-idea]]`) — **not** flagged (excluded by the bare-only rule).
- **5 genuinely dangling *bare* links**, all ideas absorbed into bundle archive changes
  whose folder name differs from the individual slug:
  `[[simplify-per-slice-model-selection]]`, `[[configurable-effort-and-thinking]]` (3×),
  `[[per-slice-effort-via-agent-variants]]` (2×), `[[haiku-model-tier]]`,
  `[[kit-self-surfaces]]`.

These 5 will **fail Check 23 as-written**, so this change must clean them up **in the
same change** for CI to pass. The prose already names the resolving bundle in-line (e.g.
"shipped together as `per-slice-compute-knobs`"), so the cleanup is a mechanical rewrite
of each bare `[[absorbed-slug]]` into plain back-ticked text `` `absorbed-slug` ``.
**Settled via OQ2: uniform demotion — all 5 bare links become back-ticked plain text**
(no relink to the resolving bundle changes). This is content-only editing of
`openspec/backlog.md` and does not touch the frozen schema.

### D7 — Check 23 self-test injects the archive-folder list; no committed fixture tree (Slice 2)

Per **TQ22/TQ23**, the archive-folder resolution is filesystem-dependent, so factor
Check 23 as a **pure resolver** `resolveWikilinks(text, liveRowIds, archiveSlugs)` that
takes the archive-slug list as a **parameter**. The inline self-test calls the resolver
with a **canned in-memory corpus** and an injected synthetic archive-slug list —
exercising: a live-row hit, an archive-folder hit (date-stripped), a code-spanned
meta-token (must NOT fire), and a bare dangling slug (must fire) — with no file I/O and
no committed fixture tree. The file-I/O path then reads the real
`openspec/changes/archive/` listing (via the existing `fs.readdir` pattern) and the live
row ids parsed from `openspec/backlog.md`, and calls the same resolver. Rejected:
committed fixture directory under a temp path (adds tracked scaffolding; the
injected-list pattern matches how Checks 14/15/21/22 already self-test).

### D8 — `/qrspi:idea` is a main-loop command; interview-driven; band always proposed; consumes the shared backlog-writer (Slice 3)

Per **PQ5/PQ6**, `claude/commands/idea.md` is a **main-loop** command (no `agent:`
frontmatter — `AskUserQuestion` must be reachable). Judgment calls:

- **Invocation surface (TQ3/TQ4).** Accept an optional free-text seed as the argument
  (`/qrspi:idea <one-line intent>`), then run a short **interview**: (1) derive/confirm a
  kebab-case slug, (2) dedup against existing rows by intent (read `openspec/backlog.md`,
  show near-matches, offer proceed/abort), (3) **propose** a P-band + `## Ideas`
  placement via `AskUserQuestion` (always interactive — no positional band arg; the
  human confirms or overrides), (4) prompt for the one-sentence `**Shape:**` (**PQ6** —
  interactive, so the row is Check-22-valid on capture), then stage the append. Rejected:
  positional `<slug> <why> <band>` (a band arg the human never sees is a friction smell;
  the whole value is the proposal + confirm loop).
- **Row shape.** Append a standalone `idea` row `### <slug> — \`idea\` · **P<n>**` with
  `**Why:**` (from the seed/intent) and `**Shape:**` (from the prompt), under `## Ideas`,
  conforming to the frozen grammar (em-dash, middle-dot). No `**Shape:** TBD` — PQ6
  rejects the placeholder path.
- **Consumes the shared backlog-writer (TQ29 — reversed during D-review).** `/qrspi:idea`
  is the **first consumer** of a new shared `backlog-writer` skill (D11) that owns the
  canonical row-append procedure. The command drives the interactive interview and
  delegates the actual row construction/staging to that skill rather than embedding its
  own copy of the grammar. The original D8 chose to duplicate (least-drift-during-change);
  the human reversed that at review because five hand-rolled copies of the row grammar are
  the exact drift `backlog-schema-finish` exists to eliminate. The extraction is folded in
  as Slice 4 (see D11).

### D9 — `/qrspi:idea` README placement + embed policy (Slice 3)

- **README section (TQ5, Check 4).** `/qrspi:idea` is a **helper**, not a QRSPI stage —
  it documents under the README's existing helpers listing (the same line/subsection that
  carries `status`, `update`, `archive`, `init`, `stack`, etc.), **not** the eight-stage
  table. Check 4 only needs `/qrspi:idea` to appear somewhere in `README.md`; the helpers
  listing is the correct home. Update the README in this same change (CLAUDE.md rule).
- **Embed policy (TQ6, Checks 9/10).** `/qrspi:idea` is a **non-stage, non-chaining**
  helper. It does **not** carry the version-check embed (Check 9 enumerates only the 9
  stage commands) and does **not** carry the budget-gate embed (Check 10 enumerates 10
  commands — 8 stage + `archive` + `followup`; `status`/`update`/`retro` are excluded).
  `/qrspi:idea` joins the excluded set. It does not open or advance a QRSPI flow, so
  neither embed applies. Confirm no lint check *requires* the embeds on new commands
  (Checks 9/10 assert an explicit enumerated set, not "all commands").

### D10 — Slice independence and ordering

Four slices. Slices 1 and 2 are file-disjoint and order-free; Slice 4 **depends on**
Slice 3 (the `backlog-writer` skill must exist before the existing sites migrate onto it):

- Slice 1 → `claude/skills/qrspi-update/SKILL.md` (dispatcher + schema prose),
  `migrations/0.13.0.yaml`, `scripts/lint.mjs` (Check 6).
- Slice 2 → `scripts/lint.mjs` (new Check 23), `openspec/backlog.md` (D6 cleanup).
- Slice 3 → `claude/skills/backlog-writer/SKILL.md` (new), `claude/commands/idea.md` (new),
  `scripts/skill-sets.mjs` (register the new skill), `README.md`.
- Slice 4 → `claude/agents/questioner.md`, `designer.md`, `architect.md` (`Load skills` +
  deferred-work prose), `claude/commands/followup.md` (P3 path), `scripts/skill-sets.mjs`
  (agent→skill wiring).

Shared files: `scripts/lint.mjs` (Slice 1 edits Check 6; Slice 2 adds Check 23 — different
functions, no collision) and `scripts/skill-sets.mjs` (Slice 3 registers the skill; Slice 4
wires the agents to it — Slice 4-after-3 ordering already required, so no conflict).
`per-slice-compute-tier` (named in the ticket as possibly in-flight) is **already archived**,
so there is no live cross-change file collision.

### D11 — Extract a shared `backlog-writer` skill; migrate all append sites onto it (Slice 3 + Slice 4)

Folded in during the D-review (reverses the original D8 duplicate-and-defer). Extract the
canonical backlog-row append **procedure** into a new shared kit skill
`claude/skills/backlog-writer/SKILL.md`. The skill *references* the frozen row grammar
(the template + Check 22 remain the single source of truth for the grammar itself) and
carries the **procedure**: dedup by intent, propose a P-band + `## Ideas` placement,
construct a Check-22-valid `idea` row (em-dash, middle-dot, `**Why:**`/`**Shape:**`), stage
the edit.

- **Slice 3** creates the skill and ships `/qrspi:idea` as its **first consumer**.
- **Slice 4** migrates the four existing append sites — the questioner (Q), designer (D),
  and architect (S) deferred-work capture prose, and the `followup.md` P3 promote path — to
  **load `backlog-writer` and follow its procedure** instead of each embedding the grammar.
  Register the skill in `scripts/skill-sets.mjs` (Check 2) and add it to each agent's
  `Load skills` line.

Rationale: five hand-rolled copies of the append procedure are the exact drift this change
exists to prevent; one procedure skill makes "cannot drift from the schema" true at every
write site. The skill stays **thin** (it references, not restates, the grammar), so it does
not create a second grammar source. Ordering: Slice 4 depends on Slice 3; Slices 1–2 are
independent of both.

## Command changes

`/qrspi:idea` (new `claude/commands/idea.md`, main-loop, no `agent:` frontmatter): reads
`openspec/backlog.md`, dedups by intent, proposes band + `## Ideas` placement via
`AskUserQuestion`, prompts for the one-sentence `**Shape:**`, then delegates row
construction/staging to the shared `backlog-writer` skill (D11). No version-check /
budget-gate embed (D9). README helpers listing updated in the same change.

The Q/D/S deferred-work capture prose (questioner/designer/architect agents) and the
`followup.md` P3 promote path are migrated (Slice 4) to load `backlog-writer` and follow
its append procedure instead of embedding the grammar inline.

## Skill changes

`claude/skills/qrspi-update/SKILL.md`: the manifest-schema-contract section gains two
optional `edit-file` sub-fields — `skip_if_contains: "<marker>"` and
`anchor_missing: warn-and-skip` — and the `edit-file` dispatcher prose (section 4.1)
documents (a) the whole-file literal-substring skip check evaluated **before** the anchor
search (D1), and (b) the warn-and-skip degradation that continues the walk and still
bumps the marker (D2). No new `edit-file` action is added; the `action` vocabulary stays
closed at `edit-file`.

`claude/skills/backlog-writer/SKILL.md` (new, D11/Slice 3): the shared row-append
procedure — references the frozen grammar (template + Check 22), then dedup → propose band
+ placement → construct a Check-22-valid `idea` row → stage. Consumed by `/qrspi:idea`
(Slice 3) and by the questioner/designer/architect agents + `followup.md` P3 path after
migration (Slice 4). Registered in `scripts/skill-sets.mjs` (Check 2).

## Lint changes

- **Check 6** extended (D3): accept optional `skip_if_contains` (non-empty string) and
  `anchor_missing` (closed value `warn-and-skip`) on `edit-file` steps; both optional;
  add a positive-path self-test fixture.
- **Check 23** added (D5/D7): `checkBacklogWikilinks` — collects bare (non-code-span)
  `[[slug]]` occurrences file-wide in `openspec/backlog.md`, resolves each against live
  `### ` row ids and date-stripped archive folder names (PQ3 archive-passes-silently),
  with an inline self-test built from an injected archive-slug list. Own numbered header
  + self-test, per the one-concern-per-check pattern.

## Migration manifest

`migrations/0.13.0.yaml` backfilled **in place** (D4): the single `insert_after` step
gains `skip_if_contains: "<legend marker>"` and `anchor_missing: warn-and-skip`. No new
`0.13.1.yaml`. No new `manual` companion step for wikilink hygiene (TQ21) — the lint
check is enforcement enough; a `manual` "verify no dangling wikilinks" step would fire on
every future kit update for a one-time concern.

## Vertical slices (preview)

Independent, each demoable end-to-end (Structure stage will detail):

- **Slice 1 — Replayable, fault-tolerant migration:** `skip_if_contains` +
  `anchor_missing: warn-and-skip` in the `qrspi-update` dispatcher & schema prose, Check 6
  acceptance + positive self-test, and the `0.13.0.yaml` backfill. Demo: a double-run of
  the `0.13.0` step no longer duplicates the legend; a title-renamed backlog warns and
  the walk continues.
- **Slice 2 — Dangling wikilinks fail CI:** Check 23 (`checkBacklogWikilinks`) + inline
  self-test, plus the 5-link cleanup of this repo's own `openspec/backlog.md` (D6). Demo:
  `node scripts/lint.mjs` passes on the cleaned backlog and reddens on an injected bare
  `[[does-not-exist]]`.
- **Slice 3 — One-command idea capture on a shared writer:** new `backlog-writer` skill +
  `/qrspi:idea` command (its first consumer) + skill registration + README helpers entry.
  Demo: `/qrspi:idea "<intent>"` dedups, proposes a band, prompts for shape, and stages a
  Check-22-valid row via the shared writer.
- **Slice 4 — Every append site on the shared writer:** migrate the Q/D/S deferred-work
  capture prose and the `followup` P3 path to load `backlog-writer`. Demo: a deferred-work
  capture in Q/D/S and a P3 followup promotion both produce a Check-22-valid row through the
  one shared procedure — no per-site grammar copy remains.

## Risks / Trade-offs

- **`skip_if_contains` marker drift.** If the chosen marker line is later edited in the
  `0.13.0.yaml` `content`, the skip check silently stops matching. Mitigation: pick a
  marker that is a *stable identifying line* of the block (the "frozen by
  standardize-backlog-format" legend line), and note in the skill prose that the marker
  must be a substring of `content`. OQ1 pins the exact string.
- **`anchor_missing` marker-still-bumps could mask a real problem.** A consumer whose
  backlog genuinely lacks the title gets a warning and advances; if they ignore the
  warning the legend is never inserted. Accepted: this is strictly better than the current
  hard-stop wedge, and the `manual:` section documents the remedy. The warning must be
  loud (name file + anchor + step).
- **Code-span detection in Check 23.** The bare-only rule depends on correctly detecting
  backtick code spans. A malformed/unbalanced backtick in the backlog could misclassify a
  link. Mitigation: keep the code-span stripper simple (remove `` `...` `` inline spans
  and fenced blocks before scanning) and cover it in the self-test. Watch-item for Slice 2
  implementation.
- **`/qrspi:idea` has no runtime lint.** Its interview behaviour (dedup, band proposal,
  shape prompt) is not mechanically testable — only Check 4 asserts it is documented (D9,
  PQ/TQ25). This is a `(human)` dogfood checkpoint, not a static check. Accepted; a
  runtime-verification harness for commands is a separate, larger concern.
- **Shared-writer coupling (D11).** Extracting `backlog-writer` and routing all five append
  sites through it means a bug in the shared skill now affects *every* site (previously each
  copy failed independently). Mitigation: the skill stays **thin** — it references the frozen
  grammar (template + Check 22) rather than restating it, so it is not a second grammar
  source, and Check 22 still catches any malformed row regardless of which writer produced
  it. Net: fewer places for the grammar to drift, one place to get the procedure right.
- **Slice 4 scope creep.** Migrating four existing sites touches three agent files +
  `followup.md` + `scripts/skill-sets.mjs`; a botched migration could regress a working
  capture flow. Mitigation: Slice 4 is behaviour-preserving (same rows, one source), gated
  by Check 2 (skill registration) and the agents' own `(human)` dogfood checkpoints.

## Open questions for the human

- [x] **OQ1 — `skip_if_contains` marker string for `0.13.0.yaml`.** **Answer: use the legend
  heading line `Backlog schema legend (frozen by standardize-backlog-format).`** (verified
  unique, stable, and present in the manifest `content`). Pins D1's marker and D4's chosen
  string.
- [x] **OQ2 — per-link disposition for the 5-link D6 cleanup.** **Answer: demote all 5
  absorbed slugs to back-ticked plain text `` `slug` ``** (`simplify-per-slice-model-selection`,
  `configurable-effort-and-thinking`, `per-slice-effort-via-agent-variants`, `haiku-model-tier`,
  `kit-self-surfaces`). Uniform demotion — no relink to bundle changes; the prose already
  names the resolving bundle inline. Resolves D6's disposition.
