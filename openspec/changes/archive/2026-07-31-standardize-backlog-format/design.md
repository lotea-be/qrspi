# Design — standardize-backlog-format

> Stage D of QRSPI. Generated 2026-07-29.
> **Implementation is BLOCKED until a human approves this file.**

## Context

We are freezing the QRSPI kit's own `openspec/backlog.md` ad-hoc shape into a
canonical, machine-checkable schema — for the kit maintainers first, and for
public consumers who will soon `/qrspi:init` and start writing backlog rows.
This is the Tier 1.5 road-to-1.0 readiness item: freeze the last ad-hoc schema
before public installs write it.

**What exists today (from research):** `openspec/backlog.md` (1,250 lines) has
three `##` sections in a fixed order — `## In progress`, `## Proposed`,
`## Ideas` — and 58 `###` rows. The live heading grammar is
`### <id> — \`<status> (<note>)\` · **P<n>**` using a real em-dash (U+2014) and a
` · ` middle-dot separator. `**Why:**` appears on every row; `**Shape:**` appears
on only **4 of 55** standalone rows. Three rows are `bundled into <id> (<date>)`
and carry a `>` blockquote pointer instead of a full body. No template and no
lint check govern this file — it is the only QRSPI artifact with neither. The
`workflow` skill's "Backlog atomicity" prose is the sole normative source and it
has **drifted**: it writes the separator as `--` (double hyphen) and omits the
` · **P<n>**` band entirely.

**Desired end state after this change:** a canonical
`openspec-templates/backlog.template.md`; a new `scripts/lint.mjs` Check that
enforces the row grammar, status enum, body-field rule, and section/preamble
presence; `/qrspi:init` seeding the template when absent; an additive-only
migration manifest; and the kit's own backlog + `workflow` prose brought into
compliance so `node scripts/lint.mjs` passes green.

## Goals / Non-Goals

**Goals:**
- Freeze the row heading grammar exactly as PQ1 specifies and enforce it in lint.
- Enforce the status enum (leading-keyword only) and the `**Why:**`+`**Shape:**`
  body rule scoped to standalone `idea`/`proposed` rows (PQ2/PQ3/PQ8).
- Ship a self-documenting template seeded by `/qrspi:init` (PQ5/PQ6).
- Ship an additive-only, idempotent migration manifest (PQ7).
- Leave `node scripts/lint.mjs` green: backfill `**Shape:**` on the kit's own
  standalone rows and correct the `workflow` skill's drifted grammar prose.

**Non-Goals (named follow-ups):**
- The per-file `backlog/<id>.md` model — explicitly deferred to post-1.0.
- `/qrspi:idea` dedicated writer command — remains the `[[idea-capture-command]]`
  backlog idea (deferred; this change is its schema prerequisite).
- Wikilink (`[[...]]`) target resolution — out of scope for the Check (PQ-Q5).
- Linting narrative editorial (the "Road to 1.0" / "Next up" blockquotes) beyond
  the P-band preamble presence assertion (PQ4).
- Rewriting existing consumer rows in the migration (additive-only, PQ7).

## Decisions

### D1 — Check number: **Check 22** + fix the Check-10 collision in-scope (per OQ1)

The next free integer is 22 (research: Checks 1–21 registered, with a duplicate
"Check 10" label collision — `checkBudgetGateEmbed` + `checkTriagePaths`). I
register `checkBacklogSchema` as **Check 22** at the tail of `main()`, after
Check 21. **Per OQ1 (folded in), this change ALSO fixes the Check-10 collision:**
the second colliding check is renumbered to a free slot and the tail re-sequenced
as needed, with every downstream check-number reference and the README Check-list
brought into agreement. Structure must sequence the collision fix as its own
mechanical renumber slice (distinct from the new Check 22) so the two concerns
stay reviewable separately. Rejected: reusing a sub-letter like "21b" — the
collision is a defect, not a precedent to imitate.

### D2 — Check 22 assertion set (five assertions, hard-fail, over `openspec/backlog.md` only)

Check 22 reads exactly `openspec/backlog.md` (the kit's own file) and pushes to
the shared `errors[]` array on any violation (hard-fail, exit 1 — consistent with
every other Check; PQ-Q22 resolved to uniform hard-fail). If the file is absent,
Check 22 **passes silently** (a consumer or the kit may legitimately have no
backlog yet; the seed path is PQ6, not this Check). The five assertions:

1. **Section presence (PQ4/PQ-Q24).** The three `## ` headings `## In progress`,
   `## Proposed`, `## Ideas` are all present. Presence-only; order not asserted
   (the live order happens to match, but I do not lint order — cheaper, and a
   reorder is not a corruption).
2. **P-band preamble presence (PQ4).** At least one line between the `## Ideas`
   heading and its first `### ` row mentions all three band tokens `P1`, `P2`,
   `P3`. Presence-only, not text-match (PQ4 option (b) explicitly).
3. **Row heading grammar (PQ1).** Every `### ` line matches the frozen regex
   (D3). Em-dash, backtick status, ` · ` middle-dot, bold `**P<n>**`, band
   required.
4. **Status keyword enum (PQ2).** The leading keyword inside the backticks is one
   of `{idea, proposed, in-progress, merged, bundled}`. Everything after the
   keyword (a space + `(...)` or `into ...`) is free text and unchecked.
5. **Body-field rule scoped by row class (PQ3/PQ8).** For each **standalone**
   row (status keyword `idea` or `proposed`), both `**Why:**` and `**Shape:**`
   appear in the row body (between this `### ` heading and the next `### ` / `## `
   / EOF). **Bundled/merged rows are exempt** and are only required to carry a
   `>` blockquote pointer note (D5).

6. **Template file presence (OQ4).** A cheap presence assertion that
   `openspec-templates/backlog.template.md` exists (existsSync-style). This is the
   one assertion that reads a path other than `openspec/backlog.md`; it checks
   existence only, NOT template content (D7's no-content-scan decision stands).
   Closes the template-file-missing half of the drift gap (Risks).

Rejected for assertion 5: requiring Why+Shape on all rows (PQ8 (b)) — forces
backfilling bodies onto pointer rows, contradicting PQ8 (a).

### D3 — The frozen heading regex (PQ1)

The canonical heading, with a **real em-dash** (U+2014) to match the live file
(the `workflow` prose's `--` is the drift to fix, D8 — not the shape to freeze):

```
### <id> — `<status>` · **P<n>**
```

Proposed regex (anchored, per `### ` line):

```
/^### (?<id>[a-z0-9]+(?:-[a-z0-9]+)*) — `(?<status>[^`]+)` · \*\*P(?<band>[123])\*\*$/
```

- `id`: kebab-case.
- `status`: any non-backtick run; the **enum check (assertion 4)** parses its
  leading keyword separately. Keeping the regex permissive on the full status
  string and enforcing the enum on the keyword only is what lets
  `bundled into <id> (<date>)` pass the grammar while the keyword `bundled` is
  validated.
- ` — ` is the em-dash with single spaces; ` · ` is space + U+2014-neighbour
  middle-dot (U+00B7) + space; band is bold `P1`/`P2`/`P3` (PQ-Q23: yes, assert
  the band token is one of the three and bold — folded into the regex).

**Watch-item for stage I:** the regex embeds two non-ASCII code points (em-dash
U+2014, middle-dot U+00B7). The kit's house rule is ASCII-only in commit
messages and PR text, but source files already contain these code points (the
live backlog). The implementer must author the regex with explicit `—` /
`·` escapes rather than pasting literal glyphs, so the check is robust to
editor normalization. Fallback if `\u` escapes prove awkward: a literal-glyph
regex is acceptable since the file itself is UTF-8.

### D4 — Check 22 carries an inline self-test fixture (PQ-Q21/Q36/Q37)

Per the Check-14/15/21 convention (research: non-trivial detectors carry in-
memory fixtures that run before file I/O and push to `errors[]`), Check 22's
row-parsing/classification logic is non-trivial (regex + enum + row-class +
scoped body rule), so it **carries a self-test**. Minimum fixtures:

- (a) a well-formed standalone `idea` row with Why+Shape → passes;
- (b) a malformed heading (wrong separator / missing band) → detector fires;
- (c) a standalone `idea` row missing `**Shape:**` → body-rule fires (guards the
  PQ3 tightening);
- (d) a `bundled into <id> (<date>)` row with only a `>` pointer note → passes
  (guards PQ8: no false-positive on the exempt class).

The fixtures operate on synthetic multi-line strings, not the real file.

### D5 — Canonical bundled/exempt row form + reconciliation with `propose-bundling-ideas` (PQ8)

A **bundled/merged/superseded** row is a recognized row class. Its canonical
form:

```markdown
### <id> — `bundled into <target-id> (<date>)` · **P<n>**

> **Bundled into `<target-id>`** (<date>) with [[<sibling-id>]] — see the
> `## Proposed` entry above.
```

- Status keyword `bundled` (enum-valid); the ` into <target-id> (<date>)` tail is
  free text (assertion 4 ignores it).
- The `>` blockquote pointer note is the row's body **in lieu of** Why+Shape;
  assertion 5 exempts this class. The Check classifies a row as exempt when its
  status keyword is `bundled` or `merged` (D6).

**Reconciliation with `[[propose-bundling-ideas]]`:** that future idea proposes a
command that, when several ideas are folded into one QRSPI run, rewrites each
subsumed idea row into exactly this bundled form. This design **is** the schema
that command will emit — freezing it here means the later command has a canonical
target to write to, not a moving one. No conflict; this change is its
prerequisite. (Captured only as an assumption, not new scope.)

### D6 — Standalone-vs-exempt classification is by **status keyword**, not by presence of a pointer note

The Check decides row class from the parsed **leading status keyword**:
`idea`/`proposed` → standalone (Why+Shape required); `bundled`/`merged` →
exempt (pointer note only). This is deterministic and avoids the circularity of
"a row is exempt if it has a pointer note" (which would let a standalone row skip
Why+Shape merely by adding a blockquote). `in-progress` rows are neither asserted
for Why+Shape nor for a pointer note — they are transient (one row, moved by the
Implement stage) and carry a PR-reference note; the Check requires only that they
pass grammar + enum. Rejected: treating `in-progress` as standalone — it would
force Shape onto a row that is mid-flight and already scoped elsewhere.

### D7 — The seeded template must itself pass Check 22 (PQ4/PQ5 dependency)

Because assertion 2 requires the P-band preamble and assertion 5 requires
Why+Shape on the sample standalone rows, a freshly-seeded backlog must satisfy
Check 22 out of the box. Therefore the template (Template surface below) carries
the canonical preamble verbatim and its sample rows carry real `**Why:**` +
`**Shape:**` bodies. **However** — the template lives at
`openspec-templates/backlog.template.md`, which is **not** `openspec/backlog.md`,
so Check 22 does not scan it directly. The template's correctness is guarded by
(a) being seeded verbatim (the inline copy in `init.md` is byte-identical to the
template file, enforced by Check 3's drift guard) and (b) the Check-3 decision in
D-Template. I do **not** extend Check 22 to scan the template's *content* — that
would couple the live-file check to template internals. **Per OQ4, Check 22 does
add a one-line *existence* assertion** (assertion 6, D2) that the template file is
present — existence only, not content. That closes the template-missing gap.
The residual drift gap noted in the original design (a broken sample row in the
template shipping undetected) is now closed by Check 3's full-content drift guard
(D-Template section).

## Template surface

`openspec-templates/backlog.template.md` (new, PQ5). Contents:

- A leading `<!-- legend -->` grammar comment (anonymous `<!-- ... -->` block, the
  house convention research found in `questions.template.md` /
  `research.template.md`) documenting: the `### <id> — \`<status>\` · **P<n>**`
  heading grammar, the status enum, the ` · ` / em-dash separators, and the
  standalone-vs-bundled body rule.
- The three `## ` section headings in canonical order (`## In progress`,
  `## Proposed`, `## Ideas`), with `## In progress` seeded as `_None._`.
- The canonical P1/P2/P3 preamble **verbatim** under `## Ideas` (satisfies
  assertion 2 on a fresh seed).
- One sample standalone `idea` row carrying `**Why:**` + `**Shape:**` (satisfies
  assertion 5), and one sample `bundled` row with a `>` pointer note (documents
  the exempt class).

**Check 3 handling (PQ-Q31/Q32 -- updated after dogfood).** Check 3 maps each
`*.template.md` to a target file and asserts the inline copy is in sync with the
template. `backlog.template.md` maps to **`claude/commands/init.md`** (a COMMAND,
not an agent), because `init.md` embeds the template content inline between
sentinel markers. The `TEMPLATE_CANONICAL_HEADINGS` entry now carries a `driftGuard`
object (instead of an empty `headings: []` skip): `checkHeadingAlignment` detects
this field and performs a **full-content byte-comparison** of the fenced block
extracted between `<!-- backlog-template:begin -->` / `<!-- backlog-template:end -->`
against `openspec-templates/backlog.template.md`. A mismatch makes Check 3 exit
non-zero. This is the strongest feasible check — full-content equality of the
extracted block vs. the template file.

Initial design had `headings: []` (empty-heading skip, same as `tasks.template.md`),
but that asserted nothing about the content. The inline-embed mechanism (required
because runtime file-reads are non-portable) made a real drift guard both necessary
and feasible: now that the content is in the command body, Check 3 can compare it.
Rejected: mapping it to `workflow` skill prose — Check 3 reads agent/command bodies,
not skills; adding a skill-reading branch is scope creep for one file.

## Command changes

`claude/commands/init.md` (PQ6). Today `/qrspi:init` does **not** seed any
template and does **not** create `openspec/backlog.md` (research confirmed). Add
one step to the "not initialized" path (step `b-quater`): after writing
`openspec/config.yaml`, seed `openspec/backlog.md` **only if `openspec/backlog.md`
is absent** (Glob check; skip silently if present — PQ6 option (a)).

**Portability constraint (dogfood finding, slice 3 re-open):** a QRSPI command
has no portable way to read its own plugin bundle's files at runtime. When the
command runs, the CWD is the consumer repo; `openspec-templates/backlog.template.md`
resolves to the consumer's working tree, not the plugin directory, so a runtime
file-read silently fails to seed the file. The fix: embed the full canonical
backlog-template content **inline** in `init.md` itself, between greppable
sentinel markers (`<!-- backlog-template:begin -->` / `<!-- backlog-template:end -->`),
inside a fenced block. The agent Writes that inline content verbatim to
`openspec/backlog.md`. Check 3 (see D-Template below) enforces that the inline
copy stays in sync with `openspec-templates/backlog.template.md`.

Use the Glob tool for the presence check (house rule: no shell-out in command
bodies). The seeded file is staged in the existing `git add openspec/` of step 4 —
no new commit. No AskUserQuestion refresh prompt (PQ6 rejected (b)).

**Per OQ2 (decided: add fenced examples),** the row-writing command bodies each
gain a fenced canonical row example so they emit lint-clean rows deterministically:
`followup.md` (P3 promote row), `pr.md` (promote prose), and the `design`/
`structure`/`slices` deferred-work-append paths. Each fenced example must match the
template's sample row verbatim — the template stays the single source of truth and
these mirror it (same relationship templates have to agent skeletons today). The
downstream Check 22 on commit remains the enforcement floor; the fenced examples
reduce hand-typos of the em-dash grammar rather than replacing the lint gate.

## Skill changes

### D8 — Correct the drifted `workflow` grammar prose to the frozen shape

`claude/skills/workflow/SKILL.md` "Backlog atomicity" section (PQ-Q17/Q18, and
the ticket's explicit "correct the drifted prose" scope). The prose currently
reads `### <id> -- \`<status> (<note>)\`` (double hyphen, no band). Correct it to
the frozen grammar `### <id> — \`<status>\` · **P<n>**` and add a one-line pointer
to `openspec-templates/backlog.template.md` as the authoritative shape. I keep
the grammar **restated** in the skill (not replaced by a bare pointer) because the
skill is loaded by every stage and the orchestrator needs the shape inline; the
pointer names the canonical source for drift-resolution. No new `backlog-schema`
skill (PQ-Q19 rejected — one more skill to keep in sync; the template is the
single source, the workflow skill mirrors it, exactly as templates mirror agent
skeletons today).

**Backfill note (in scope, PQ3):** the same Skill/prose pass is where I flag the
kit's own backlog cleanup — see Migration manifest + Risks. The `followup.md` P3
row template and `pr.md` promote prose also use `--`; correcting those to the
frozen em-dash grammar is folded into this change so newly-written rows are lint-
clean (else Check 22 fails the next time those paths run on the kit's own repo).

## Lint changes

Covered by D1–D4/D6 above: register `checkBacklogSchema` as **Check 22** at the
tail of `main()` (after Check 21), with the five-assertion set (D2), the frozen
regex (D3), the inline self-test (D4), and keyword-based row classification (D6).
Check 22 scans only `openspec/backlog.md` and passes silently when the file is
absent. **Check 14 interaction (PQ-Q26):** Check 14 scans `openspec/changes/**`
only; `openspec/backlog.md` is outside that scope, so Check 14 needs no change and
does not double-cover the backlog. README Check-list/count references get a
mechanical bump (PQ-Q44) — `CHANGELOG.md` `[Unreleased]` records the change; no
`plugin.json` version bump in feature work (house rule).

## Migration manifest

`migrations/<next-version>.yaml` (PQ7) — additive-only, idempotent, non-
destructive. **Tension surfaced (OQ3):** the `edit-file` dispatcher's
`insert_after`/`insert_before`/`find` patterns all **stop-and-report when the
anchor string is absent** (verified in the `qrspi-update` skill). A consumer whose
backlog lacks `## Ideas`, or who has no `openspec/backlog.md` at all, would hard-
stop the walk. Two consequences the steps must respect:

1. **No hard anchor on possibly-absent content.** Adding a section heading "if
   absent" is not expressible as a single `insert_after` (it stops if the anchor
   is missing). The additive intent is better carried as a **`manual` step**
   ("if your backlog lacks `## Ideas` / the P-band preamble, add it — see the new
   template") plus, at most, an `automated` `insert_after` keyed on an anchor that
   is guaranteed present (e.g. the file's title line) for the legend comment.
   This is the safest reading of PQ7's "additive-only, never rewrite existing
   rows".
2. **Consumers with no backlog at all.** The migration must not create one blind
   (that is `/qrspi:init`'s job, PQ6). A `manual` step directs them to the seed.

Because the manifest ships an actual `automated` `edit-file` step (the **first**
in kit history — research: all 8 shipped manifests are `automated: []`), the
implementer should treat this as the maiden exercise of that untested code path
and keep the single automated edit maximally simple (append/prepend the legend on
a guaranteed anchor), pushing all conditional/consumer-specific logic to `manual`
steps. This forces a version bump at release (PQ7, acknowledged). Whether the
legend insert is even worth an `automated` step vs. fully `manual` is OQ3.

## Vertical slices (preview)

The Structure stage will detail these; each ends in something demoable end-to-end:

- **Lint gate live:** Check 22 (regex + enum + section/preamble presence + self-
  test) landing red on a deliberately-broken fixture and green on a compliant
  backlog — the schema is now enforceable end-to-end.
- **Kit backlog compliant:** backfill `**Shape:**` on the ~51 standalone kit rows
  + correct the `workflow`/`followup`/`pr` grammar prose, so
  `node scripts/lint.mjs` passes green on the real repo.
- **Seed path:** `backlog.template.md` + `/qrspi:init` seeding-when-absent +
  Check 3 empty-heading mapping — a fresh `/qrspi:init` produces a lint-clean
  backlog end-to-end.
- **Consumer migration:** the additive-only `migrations/<next-version>.yaml` +
  CHANGELOG entry — an existing consumer can `/qrspi:update` and gain the
  legend/section scaffolding without losing customized rows.

## Risks / Trade-offs

- **Backfill blast radius (largest risk).** Only 4 of 55 standalone rows carry
  `**Shape:**` today; ~51 need a real `**Shape:**` line written to pass Check 22.
  This is genuine authoring, not mechanical — a hollow `**Shape:** TBD` would pass
  lint but degrade the backlog. Trade-off: the PQ3 answer accepted this cost. The
  Structure stage should scope the backfill as its own slice and the human should
  expect to review/rewrite Shape text. Ordering matters: Check 22 must not be
  committed green until the backfill lands, or CI reddens (PQ-Q38: write the Check
  and bring the backlog compliant in the same slice, not "loosen then tighten").
- **Non-ASCII regex.** The em-dash/middle-dot in the frozen grammar clash with the
  ASCII-only house rule for commit/PR text; the regex must use `\u` escapes
  (D3 watch-item). If a future contributor "fixes" a row to `--`, Check 22 fails —
  that is intended (freeze the em-dash), but it will surprise anyone who trusts the
  workflow prose over the file. Correcting the prose (Skill changes) mitigates.
- **Maiden `automated` edit-file step.** This change is the first to ship a non-
  empty `automated:` list, exercising a code path that has never run in
  production (research). Keep it trivial; lean on `manual` steps.
- **Check 22 vs. template coupling.** Check 22 does not scan the template (D7);
  but the residual gap (a drifted template shipping undetected) is now closed by
  Check 3's full-content drift guard: Check 3 extracts the `init.md` inline copy
  and compares it byte-for-byte to `openspec-templates/backlog.template.md`, so any
  drift between the two files reddens CI immediately. The original "empty-heading
  skip" (no content assertion) was replaced by this drift guard as part of the
  inline-embed fix (slice 3 re-open, dogfood finding).

## Open questions for the human

- [x] **OQ1 — Check-10 collision.** Two checks share the "Check 10" label
  (`checkBudgetGateEmbed` + `checkTriagePaths`).
  **Answer: FOLD THE RENUMBER IN.** This change also fixes the Check-10 collision
  (renumber the second colliding check and shift the tail as needed). D1 updated:
  the collision is in-scope, not a captured backlog idea. SCOPE IMPACT: touches the
  numbering of the checks after the collision — Structure must sequence this as a
  mechanical renumber slice and re-verify every downstream check number + the
  README Check-list references.
- [x] **OQ2 — inline row snippets in writer commands.**
  **Answer: ADD FENCED ROW EXAMPLES.** `followup.md`/`pr.md` and the
  `design`/`structure`/`slices` deferred-work-append paths each carry a fenced
  canonical row example so they emit lint-clean rows deterministically (the em-dash
  grammar is easy to hand-typo). SCOPE IMPACT: more command bodies edited than the
  designer's original "prose + lint" lean; each fenced example must match the
  template verbatim (single source = the template; these mirror it).
- [x] **OQ3 — migration: `automated` legend insert vs. fully `manual`.**
  **Answer: ONE AUTOMATED INSERT + MANUAL REST.** Ship a single `automated`
  `edit-file` step keyed on a guaranteed-present anchor (the file title line) for the
  legend comment; push all conditional/section-heading/consumer-specific logic to
  `manual` steps. Honors PQ7's "additive edit-file migration" while keeping the maiden
  `automated` step trivial. Matches the Migration-manifest section's safest reading.
- [x] **OQ4 — Check 22 template-existence presence-assert.**
  **Answer: YES, ADD THE EXISTENCE ASSERTION.** Check 22 gains a sixth assertion: a
  cheap presence check that `openspec-templates/backlog.template.md` exists (not a
  content scan — D7's no-content-scan decision stands). Closes the template-file-
  missing half of the drift gap in Risks. D2 and D7 updated below.
