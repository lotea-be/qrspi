# Design — architect-must-leads-requirement-first-line

> Stage D of QRSPI. Generated 2026-07-28.
> **Implementation is BLOCKED until a human approves this file.**

## Context

OpenSpec `validate --strict` (which CI runs as `validate --all`) reads only the
**first physical line** of a requirement body when checking for `MUST`/`SHALL`.
A stage-S architect that opens a requirement body with a wrapped `When …` clause
and lets `MUST` fall to line 2 authors a delta that reads fine, passes non-strict
lint, then hard-stops the Implement stage at the `openspec validate --strict`
slice gate — far from the cause. This was observed 2026-07-28 implementing
`spec-sync-contract` slice 1 (three ADDED requirements each began `When …` with
`MUST` on line 2; the implementer returned blocked and the orchestrator had to
reorder each body).

**Today** the MUST-leads rule is stated only in a Format-rules bullet in two
places (`claude/agents/architect.md` and `openspec-templates/spec-delta.template.md`),
each with the negative example buried mid-sentence, and it is enforced **only**
by the CLI at CI/I time — `scripts/lint.mjs` has no local check for it. **After
this change** the rule is (1) surfaced as a bolded prose warning where the
architect reads its skeleton, (2) shown as an explicit forbidden-vs-permitted
counter-example in the template, and (3) enforced by a new `lint.mjs` check that
fires at S-commit — an earlier, more actionable signal than the I-stage CLI gate.

This is a **kit self-improvement change**: the repo *is* the kit. The changed
files are kit source (`claude/agents/`, `openspec-templates/`, `scripts/`),
delivered to consumers by a plugin update — no consumer-workspace file changes
(PQ5).

## Goals / Non-Goals

**Goals:**
- Make the MUST-leads rule impossible to miss at authoring time (architect prose
  warning + template counter-example) — PQ1, PQ2, PQ3.
- Add a mechanical `lint.mjs` guard that catches a MUST-on-line-2 body at
  S-commit, scanning both delta specs and base specs — PQ1, PQ4.
- Add a second `lint.mjs` guard (parity) that fails when the MUST-leads
  Format-rules guidance drifts between its two hand-synced copies (architect +
  template) — OQ2 (folded in at the D-gate), D9.
- Keep the new checks consistent with existing lint conventions (named check
  function, bracketed error label, inline self-test).

**Non-Goals:**
- Enumerating every possible non-MUST-leading opener the CLI rejects (see D6 /
  OQ) — the check keys on the *positive* invariant ("first line contains
  `MUST`/`SHALL`"), not on a denylist of prohibited openers.
- Any migration manifest work beyond a no-action stub if the release's CHANGELOG
  entry demands one per Check 6 (PQ5).
- Adding a MUST-leads note to `spec-syncer` (Q5): the syncer merges already-
  validated deltas into base specs; it authors no new requirement bodies. Out of
  scope.

## Decisions

### D1 — Architect prose warning: bolded paragraph immediately before the delta-spec skeleton (PQ2)

The architect's MUST-leads rule lives today only in the quick-reference table
(`Body` row) and a Format-rules bullet that appear **after** both spec skeletons
(research confirms all prose guidance trails the skeletons). An architect reading
top-to-bottom hits the skeleton — and may pattern-match its `The system MUST …`
placeholder into a `When …, the system MUST …` body — before ever reaching the
rule. Chose (PQ2 = a) to add a bolded warning paragraph **immediately before the
delta-spec skeleton** (before the "New capability" fenced block at line ~113 of
`architect.md`), so the rule is read before the skeleton it governs, not after.

Rejected: table-only (PQ2 = b) — the table already carries "**first line** has
MUST/SHALL" and the gotcha still happened, so the table is demonstrably not
enough. Rejected: both table counter-example + prose (PQ2 = c) — the human chose
(a); a table cell is a poor host for a wrapped negative example.

**Wording** (placed before the "New capability" heading, applies to both S-mode
skeletons):

> **Warning — the first line of every requirement body MUST contain `MUST` or
> `SHALL`.** OpenSpec's `validate --strict` (which CI runs as `validate --all`)
> reads only the requirement's **first physical line** as its statement. A body
> that opens with a `When …` / `If …` / `For each …` clause and lets `MUST` wrap
> onto line 2 passes non-strict `openspec validate <id>` but **hard-stops the
> Implement stage at CI's strict gate** — far from where you authored it. Write
> `The system MUST … when X`, never `When X, the\nsystem MUST …`.

Marker resolved (OQ1): use the ASCII lead `**Warning —**`, no glyph —
`architect.md` is emoji-free per house rules.

### D2 — Template counter-example in the Format-rules section (PQ3)

`spec-delta.template.md` is the canonical source of truth (Check 3 aligns the
agent's inline skeleton headings to it). Chose (PQ3 = a) to add an explicit
forbidden-vs-permitted counter-example in the existing "Format rules" section,
adjacent to the existing MUST-leads bullet (lines 91–94), rather than in the
skeleton. Placing it in Format rules keeps the skeleton terse and co-locates the
example with the rule it illustrates.

**Wording** (extends the existing bullet at template line 91–94):

> - **Permitted:** `The system MUST reject a request when the token is expired.`
>   **Forbidden:** `When the token is expired,` on line 1 with `the system MUST
>   reject the request.` on line 2 — the modal has wrapped off the first physical
>   line, so `--strict` does not see it. Keep the subject + `MUST`/`SHALL` on
>   line 1; move any `when` / `if` condition to the tail of that same line.

Mirror the same permitted/forbidden pair into `architect.md`'s Format-rules
bullet (lines 189–192) so the two surfaces stay identical — research flagged they
are currently kept in sync by hand. (This is the manual sync D1+D2 both touch;
see OQ2 for why no lint enforces it yet.)

Rejected: template-only, no architect mirror — would immediately create the drift
research warned about. Rejected: skeleton-embedded counter-example — clutters the
copy-paste skeleton with a deliberately-wrong form.

**Human review (D-gate, 2026-07-29):** confirmed the **sentence form**
(`The system MUST … when X`) as the single house pattern for the permitted
example. Rationale: leading with a `When …` / `If …` clause forces subject and
verb to the tail, so the requirement reads as inverted, subject-trailing prose
("When the token expired, reject it the system must") — the *same* move that hides the
modal from `--strict` also degrades readability, so the fix is one instruction,
not a trade-off. Considered and rejected: a `MUST:` label-prefix form
(`MUST: when X, do y`) — it passes `--strict` (the modal is on line 1) but
introduces a label not used anywhere in the repo's existing specs and reads
redundantly against the sentence's own modal; keeping the plain sentence form
preserves house-style consistency.

### D3 — New lint check scans BOTH delta and base spec bodies (PQ4)

Chose (PQ4 = b): scan `openspec/changes/*/specs/**/spec.md` (delta) AND
`openspec/specs/**/spec.md` (base). A delta that passes will normally produce a
passing base after sync, but a **manually authored or manually edited base spec**
can violate the rule independently (base specs are hand-edited during
`spec-syncer` MODIFIED replacements), and PQ4 = b buys belt-and-suspenders
coverage at trivial extra cost (one more file-glob root).

**The base-spec wrinkle (critical):** base specs use `## Requirements` as their
section header, NOT the delta operation headers `## ADDED` / `## MODIFIED` /
`## REMOVED` (confirmed against `openspec/specs/ci-quality-gates/spec.md`). So
the check's section-selection logic differs by file class:
- **Delta files** (`openspec/changes/*/specs/**`): scan requirement bodies under
  `## ADDED Requirements` and `## MODIFIED Requirements`. **Skip `## REMOVED
  Requirements`** — a REMOVED body is a one-line "why removed", not a MUST
  statement (Q11b, Q16c).
- **Base files** (`openspec/specs/**`): scan requirement bodies under
  `## Requirements` (there are no ADDED/MODIFIED/REMOVED headers in a base spec).

### D4 — "First line of a requirement body" = first non-blank line after the `### Requirement:` heading, up to the first `#### Scenario:` (Q11c)

The requirement body is the text between a `### Requirement: <title>` line and
the first `#### Scenario:` (or the next `###`/`##`). The **first line** to test
is the **first non-blank** line in that span. The check flags the requirement
when that first non-blank line contains neither `MUST` nor `SHALL` (case-
sensitive, matching OpenSpec — the CLI keys on the uppercase modal; a lowercase
"must" is not a modal keyword).

Edge cases the parser must handle:
- Blank line(s) between the heading and the body → skip them; test the first
  non-blank line.
- A requirement with a body but *no* scenario → still test the body's first line
  (the missing-scenario violation is a separate concern the CLI/other checks own;
  do not double-report).
- A `### Requirement:` immediately followed by `#### Scenario:` (empty body) →
  **skip**, no first-line body to test (openspec `validate` will reject an empty
  body separately; this check does not overlap).

### D5 — Reuse the Check 18 parser *shape*, re-implement the body scan (Q12)

Check 18 (`checkModifiedScenarioCounts`) carries a section-scoped per-requirement
walker (`parseModifiedRequirements`) that finds `### Requirement:` blocks within a
named `##` section and counts `#### Scenario:` lines. Its **shape** — line-split,
track "in section", track "current requirement", stop at next `##` — is exactly
what the new check needs, but it counts scenarios rather than inspecting the body
first line, and it is hard-scoped to `## MODIFIED Requirements` only.

Chose to **re-implement a small dedicated scanner** in the new check function
(`checkRequirementFirstLineModal` or similar) rather than extract/refactor Check
18's inner function. Rationale: (a) the new check needs a different section set
(ADDED+MODIFIED for deltas, `## Requirements` for bases) and a different per-
requirement operation (grab first non-blank body line, not count scenarios);
(b) Check 18's parser is a nested closure, not an exported helper, and hoisting it
into a shared module is a larger refactor than this change warrants; (c) the two
scanners share only ~10 lines of trivial line-walking that is cheaper to duplicate
than to parameterize. Reuse the *pattern*, not the *function*. (If a third
requirement-body check ever lands, that is the trigger to extract a shared
`parseRequirements(text, sectionPredicate)` helper — noted for the backlog, not
this change.)

### D6 — The check keys on the positive invariant, not a denylist of forbidden openers (resolves research Open-gap 3)

Research flagged that the only documented prohibited form is `When …`, and it is
unclear whether `If …` / `For each …` are also rejected by the CLI. The check
sidesteps this entirely: it asserts the **positive** rule the CLI actually
enforces — *the first physical line contains `MUST` or `SHALL`* — so it fires on
**any** opener that defers the modal (`When`, `If`, `For each`, `Given`, a bare
subordinate clause, anything), without needing to enumerate them. This is both
more correct (matches the CLI's actual predicate) and more future-proof than a
`When`-specific regex.

### D7 — Error message, check number, self-test, and archive scope

**Error-message format** (matches the `[label] <file>: <message>` convention;
Q14). One error per violating requirement, listing every violation (do not
short-circuit on the first — Q18):
```
[must-leads] openspec/changes/<id>/specs/<cap>/spec.md: requirement "<title>" — first line of the body does not contain MUST or SHALL (found: "<first-line-excerpt>"). OpenSpec strict validation reads only the first physical line; move the subject + MUST/SHALL onto line 1.
```
Truncate `<first-line-excerpt>` to ~60 chars. Use the same `[must-leads]` label
in both delta and base findings; the file path disambiguates the class.

**Check number: Check 20.** Research inventoried Checks 1–19; the next free slot
is 20 (Q14). Register it in `main()` after Check 19 with the header line
`process.stdout.write('\nCheck 20: Requirement first-line MUST/SHALL guard\n')`
and an `await checkRequirementFirstLineModal(errors)` call, mirroring the existing
tail. Note (Q22): check numbering is first-in-wins at S-commit — if a concurrent
change also claims 20, whichever merges first keeps it and the other renumbers.
Flag this to the human if another in-flight change is adding a check.

**Inline self-test** (mandatory, per Checks 13/14/15/17 pattern — Q15, Q16, Q18).
An in-memory fixture at the top of the check function, run through the detector
before any file I/O; on misfire push `[must-leads] SELF-TEST FAILED: …` and
`return 1`. The fixture is a **multi-requirement** delta string (Q18) covering:
- (a) a body whose first non-blank line is `The system MUST …` → must PASS
  (detector returns no hit);
- (b) a body whose first line is `When X …` with `MUST` on line 2 → must FAIL
  (detector returns a hit) — the observed real-world form;
- (c) a `## REMOVED` requirement with a one-line "why removed" body → must be
  SKIPPED (no hit), proving REMOVED is excluded;
- (d) a base-spec-shaped fixture under `## Requirements` with a violating body →
  must FAIL, proving the base-spec section path works;
- and a fence-skip guard (a `### Requirement:` line inside a ``` fence must not be
  treated as a real requirement), mirroring Check 14's fenced self-test.
Fixtures live as in-memory strings inside `lint.mjs` (Q15), not as fixture files.

**Archive scope.** Exclude `/archive/` paths for the *delta* glob — archived
changes are frozen and already passed CI; re-flagging them adds noise. (This
differs from Check 18, which deliberately does not exclude archives; but Check 18
guards a non-reduction invariant where a stale archived violation is still worth
surfacing, whereas a MUST-leads violation in an archived, already-shipped change
is unactionable.) Base specs under `openspec/specs/**` are never archived, so no
exclusion applies there. Confirm at I that no current archived delta trips the
check; if one does, exclude archives as designed and note it.

### D8 — Detection point is S-commit; low false-positive risk (Q13)

The lint runs in CI over the committed tree, so the new check fires at the
S-commit step (architect commits `proposal.md` + `specs/`) — the earliest point
the delta exists on disk, and well before the I-stage slice gate. Research found
no legitimate interim-commit path that would author a MUST-on-line-2 body as an
accepted intermediate state, so false-positive risk is low. The check is a pure
static scan (no CLI invocation), so it costs nothing and needs no network.

### D9 — Fold in a Format-rules parity check (OQ2 = fold in)

Per the human's D-gate decision (OQ2), this change also adds a **second** lint
check, `checkFormatRulesParity` (**Check 21**), that fails when the MUST-leads
Format-rules guidance drifts between its hand-synced copies.

**Scope of the parity set (precise).** The byte-identical set is the **two
Format-rules counter-example bullets** that D2 deliberately mirrors:
`claude/agents/architect.md`'s Format-rules bullet and
`openspec-templates/spec-delta.template.md`'s Format-rules bullet. The D1 prose
*warning* is **not** in the parity set — it is a longer, differently-worded
warning paragraph, not a copy of the bullet; forcing it byte-equal to the bullet
would be wrong. So "three hand-synced surfaces" (Risks) reduces to **one
byte-identical pair** the check enforces, plus the D1 warning that parity leaves
alone.

**Mechanism.** Wrap the mirrored bullet in each of the two files with stable
sentinel anchors — HTML comments `<!-- must-leads:begin -->` /
`<!-- must-leads:end -->` — and have the check extract the text between the
anchors from both files and assert exact equality. Anchor-delimited extraction
(rather than line-number ranges) keeps the check robust as the surrounding files
grow. On mismatch push:
```
[format-rules-parity] claude/agents/architect.md and openspec-templates/spec-delta.template.md MUST-leads Format-rules blocks differ — edit both or neither.
```
Also hard-stop (self-test-style failure) if either sentinel pair is missing, so
the check cannot silently pass when an anchor is deleted.

**Self-test** (inline, per the Check 13/14 pattern): a matching pair (must PASS)
and a drifted pair (must FAIL), plus a missing-anchor case (must FAIL).

**Check number: 21** (after Check 20); same first-in-wins numbering caveat as D7
if a concurrent change also claims 21. The implementer MAY choose an equivalent
stable-extraction mechanism if anchors prove awkward, provided the check still
fails closed on drift and on a missing anchor.

## Command changes

None. No `claude/commands/*.md` file changes — the architect is a subagent, and
its invoking commands (`structure.md`, `slices.md`) are untouched.

## Agent changes

`claude/agents/architect.md` — add the D1 bolded prose warning immediately before
the "New capability" delta-spec skeleton (~line 113), and mirror the D2
permitted/forbidden counter-example into the existing Format-rules bullet
(lines 189–192). No read-contract, output-contract, or routing change.

## Skill changes

None. The MUST-leads rule is embedded in the architect agent and the template,
not in a skill (research confirmed no skill carries requirement-body guidance).

## Lint changes

Add **Check 20** (`checkRequirementFirstLineModal`) to `scripts/lint.mjs` per D3–
D8: a static scanner over delta specs (ADDED+MODIFIED bodies, REMOVED skipped) and
base specs (`## Requirements` bodies), flagging any requirement whose first non-
blank body line lacks `MUST`/`SHALL`, with a `[must-leads]` error label, a multi-
requirement inline self-test, and `main()` registration after Check 19.

Add **Check 21** (`checkFormatRulesParity`) per D9 (OQ2 folded in): assert the
sentinel-delimited MUST-leads Format-rules bullet is byte-identical between
`claude/agents/architect.md` and `openspec-templates/spec-delta.template.md`,
with a `[format-rules-parity]` error label, an inline self-test (match / drift /
missing-anchor), and `main()` registration after Check 20.

Update the check-inventory comment header block at the top of `lint.mjs` to
describe Checks 20 and 21. Fix the stale "Checks 1–14" range in the `qrspi-stack`
cheatsheet's layout note in this change (OQ3 = fix here) — update it to the new
top check number (21).

## Template surface

`openspec-templates/spec-delta.template.md` — add the D2 permitted/forbidden
counter-example to the "Format rules" section (adjacent to the existing MUST-leads
bullet, lines 91–94). No skeleton or section-header change (so Check 3 heading
alignment is unaffected).

## Migration manifest

Per PQ5 = a: no migration manifest is functionally needed — the changed files are
kit source delivered by a plugin update, not consumer-workspace files. If the
release that ships this change carries a `## [X.Y.Z]` CHANGELOG entry at/above the
Check-6 floor, add a **no-action stub** manifest (non-empty `summary`, empty
`automated` and `manual` lists) at release time — this is a release concern, not
work this change performs.

## Vertical slices (preview)

Each slice ends in an observable, independently verifiable outcome (running
`node scripts/lint.mjs` and/or reading the rendered guidance):

- **Slice 1 — Authoring guidance is unmissable.** Add the D1 prose warning to
  `architect.md` and the D2 counter-example to both `architect.md` Format-rules
  and `spec-delta.template.md`, wrapping the two mirrored Format-rules bullets in
  the `<!-- must-leads:begin/end -->` sentinels (D9). Demoable: a reader of either
  file sees the permitted/forbidden pair; `node scripts/lint.mjs` still passes
  (Check 3 heading alignment unbroken).
- **Slice 2 — Mechanical MUST-leads guard fires on a broken body.** Add Check 20
  with its inline self-test, registered in `main()`. Demoable end-to-end: `node
  scripts/lint.mjs` runs Check 20, the self-test proves the detector fires on the
  `When …` fixture and skips REMOVED, and the full suite passes on the current
  (clean) tree. Optionally hand-break a scratch delta to watch Check 20 flag it,
  then revert.
- **Slice 3 — Parity guard keeps the two bullets in lock-step.** Add Check 21
  (`checkFormatRulesParity`) with its inline self-test (match / drift /
  missing-anchor), registered in `main()`; update the `lint.mjs` check-inventory
  header and fix the stale `qrspi-stack` "Checks 1–14" range (OQ3). Demoable:
  `node scripts/lint.mjs` runs Check 21 green on the synced pair; editing one
  bullet without the other turns it red, then revert.

(3 slices — one authoring-surface slice and two independent lint guards, each
ending in an observable `node scripts/lint.mjs` outcome. No data/API/UI surface
to demo across; this is a kit self-improvement change.)

## Risks / Trade-offs

- **Guidance/template drift is now lint-enforced for the mirrored bullet (OQ2
  folded in).** D2 keeps the two Format-rules counter-example bullets (architect +
  template) byte-identical by hand; **Check 21** (D9) now fails CI if they drift.
  Residual risk: the D1 prose *warning* is intentionally outside the parity set
  (it is not a byte-copy of the bullet), so a reword of the warning that
  contradicts the bullet is still not caught — acceptable, since the warning and
  the bullet are different artifacts serving different spots.
- **Base-spec section-header divergence.** The check must special-case
  `## Requirements` (base) vs `## ADDED`/`## MODIFIED` (delta). If OpenSpec ever
  changes base-spec section conventions, the check needs updating — but so would
  much of the kit. Low risk, called out for the self-test to pin.
- **CLI-actual-behaviour watch-items (stage I).** Two research open-gaps cannot be
  verified from repo files alone and become **stage-I watch-items with a
  fallback**, not approved defaults: (1) the verbatim CLI error text for a `When …`
  body (research Open-gap 1) — our check's message is self-authored and does not
  depend on it, so no action needed; (2) whether v1.4.1 `--strict`/`--all`
  enforces the modal rule on **base-spec** bodies as well as delta bodies
  (research Open-gap 2). Our check enforces it on base specs regardless (D3), which
  is stricter-or-equal to the CLI — worst case the check is redundant with the CLI
  on base specs, never wrong. Fallback if a base spec legitimately cannot lead with
  a modal: none is known; if one surfaces at I, narrow the base-spec scan or
  exclude that file with a comment, and note it.
- **Check-number collision** with a concurrent lint-adding change (Q22) — first-in-
  wins; renumber at merge if needed (D7).

## Open questions for the human

- [x] **OQ1 — Warning glyph.** D1 drafts the prose warning with a `⚠`. House
  rules say no emoji unless prose already uses one, and `architect.md` is
  currently emoji-free. Default at implementation: use `**Warning —**` (no
  glyph). Confirm, or approve a specific ASCII marker.
  **Answer: use `**Warning —**` (ASCII, no glyph).** D1 wording updated.
- [x] **OQ2 — Defer the guidance/template equivalence lint?** This change adds a
  third hand-synced copy of the Format-rules wording without a check asserting the
  copies agree. Recommended: **defer** as a separate backlog `idea` (a
  `checkFormatRulesParity` that asserts the architect and template MUST-leads
  bullets are byte-identical). Confirm defer, or fold a parity check into this
  change's Check 20 work.
  **Answer: FOLD IN — build `checkFormatRulesParity` (Check 21) in this change.**
  See D9; Goals/Non-Goals/Risks/Lint/Slices updated. The parity set is the two
  mirrored Format-rules bullets (architect + template); the D1 prose warning is
  intentionally excluded.
- [x] **OQ3 — Stale "Checks 1–14" range.** `scripts/lint.mjs` reaches Check 19
  today and this change adds Check 20, but the `qrspi-stack` cheatsheet's layout
  note still says "Checks 1–14". Fix it in this change (one-line edit, keeps the
  cheatsheet honest) or leave a follow-up? Recommended: fix in this change since
  we are already adding a check.
  **Answer: FIX IN THIS CHANGE** — update the cheatsheet range to the new top
  check number (21). Folded into Slice 3.
