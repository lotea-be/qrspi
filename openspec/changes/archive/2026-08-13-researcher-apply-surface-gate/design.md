# Design — researcher-apply-surface-gate

> Stage D of QRSPI. Generated 2026-08-13.
> **Implementation is BLOCKED until a human approves this file.**

## Context

The four artifact-producing QRSPI stage agents (questioner, designer,
architect, researcher) all load the `repo-surface` skill and are meant to
suppress surface-gated section headings when the repo lacks the controlling
surface (e.g. no `## Data model` when `data-store` is absent). The researcher
is the odd one out: it loads `repo-surface` in step 1 (so Check 2b passes) and
its output skeleton carries the surface-to-heading mapping as an advisory
comment, **but its `## What to do` prose contains no actual gate *instruction***
(unlike the questioner, whose step 6 states the omit rule explicitly). The
result is that the researcher can emit an absent-surface heading (the backlog
records it emitting `## Data model` in a repo without `data-store`). That miss
is caught only by `scripts/lint.mjs` Check 14 (`checkSurfaceApplicability`),
which runs at CI/PR time — i.e. it lands as a hard-stop **mid-implementation**,
far from its stage-R cause.

Desired end state: the researcher's `## What to do` step 1 carries a single,
concise gate-instruction sentence pointing at the `repo-surface` skill, so the
researcher omits absent-surface headings at stage R. `repo-surface` stays the
one source of truth (no copied enumeration). **Two hardening additions the human
elected at the D review (OQ1, OQ2):** a Check 7-style static lint assertion that
the gate-instruction phrase is present in the researcher's step 1 (so it cannot
silently regress), and matching per-section surface-gate comments in
`research.template.md` (closing the template/agent consistency gap). Still
unchanged: the skill registry is already correct, no R-commit-time lint run is
added (PQ2), and no migration manifest is emitted (PQ3). The change is
forward-only and touches three files: the researcher agent, `scripts/lint.mjs`,
and the research template.

## Goals / Non-Goals

**Goals:**
- Add an explicit surface-gate instruction to `claude/agents/researcher.md`
  step 1 so the researcher suppresses absent-surface inventory headings.
- Keep the instruction a concise pointer to `repo-surface` (per PQ1), not a
  copied enumeration — `repo-surface` remains the single source of truth.
- Do not over-gate: present-surface inventory headings must still be emitted.
- Add a Check 7-style static lint assertion that the gate-instruction phrase is
  present in the researcher's step 1, so it cannot silently regress (OQ1).
- Fold matching per-section surface-gate comments into `research.template.md`
  so the template and agent shapes stay consistent (OQ2).
- Keep the change forward-only, no schema surface (three files, no contract
  change).

**Non-Goals:**
- No R-commit-time lint run in the agent or the orchestrator (PQ2 = no).
- No migration-manifest entry (PQ3 = no); forward-only, delivered via plugin.
- No touch to `scripts/skill-sets.mjs` — the registry is already correct
  (Check 2b passes today).
- No audit / edit of the other three agents' gate wording (out of scope; they
  pass Check 14 in practice — Q26).
- `git-host-and-remote-awareness` and `lint-auto-mode-gate-coverage` (the rest
  of the Tier 1.6 cluster) are explicitly out of scope — this change is taken
  up standalone (Q24, Q25). If the human wants them tracked, they remain their
  own backlog rows.

## Decisions

### D1 — Gate-instruction form: concise pointer in step 1 (settled by PQ1)

Add one sentence to the researcher's `## What to do` **step 1** (the existing
`Load skills … repo-surface …` step), immediately after the sentence that says
`repo-surface` "defines which inventory sections to emit". Exact wording (PQ1
answer, verbatim):

> Apply the surface-gate rule per the `repo-surface` skill: emit each inventory
> section only when its surface is present, omitting absent-surface headings
> entirely.

**Chosen** over the questioner's full-enumeration paragraph (option a) and the
bare-phrase-only edit (option c). The full enumeration would duplicate the
surface→heading map that already lives in `repo-surface` *and* in the
researcher's own skeleton comment — three copies to keep in sync. The concise
pointer is DRY and sufficient because step 1 already loads and reads
`repo-surface` (which carries the `## Omit mechanic`). This is a settled
product constraint, restated here so S/V/I build to it exactly.

**Placement note:** the sentence lands in step 1, not as a new numbered step —
matching the convention that all four agents carry gate logic inside existing
`## What to do` steps, not in a dedicated `## Surface-gate` section (Q10). Step
1 is the natural home because it is where `repo-surface` is loaded.

### D2 — Skeleton comment block: leave untouched (settled by Q3)

The output-skeleton comment (`<!-- Surface-gated inventory sections: emit each
section below only when its controlling surface is present … Omit the heading
entirely … -->`) already carries the surface→heading mapping and the omit
phrasing. The fix lands entirely in the `## What to do` prose. **Do not edit
the skeleton comment.** Rationale: the miss was the *absence of an instruction
in the prose*, not a defect in the comment; editing the comment adds diff
noise and risks a Check 11 fence-scan regression for no benefit. The prose
sentence and the skeleton comment stay phrase-aligned ("omit … entirely" /
"Omit the heading entirely") but need not be byte-identical (Q4).

### D3 — Gate only the surface-gated inventory sections, not the spine (settled by Q5)

The researcher emits five always-emitted spine headings (`## Areas
investigated`, `## File map`, `## Notable discrepancies`, `## Implicit
contracts and conventions`, `## Open gaps`) that are surface-independent and
appear in none of `SURFACE_GATED_HEADINGS`. The new instruction says "each
**inventory** section", scoping it to the surface-gated blocks only. The spine
headings require no gate logic and must continue to emit unconditionally. This
is why the pointer sentence says "inventory section", not "section".

### D4 — No registry / skill-set change (settled by Q6, Q21)

`scripts/skill-sets.mjs` already lists `researcher: ['context-hygiene',
'repo-surface', 'workflow']`, so Check 2b passes unchanged. This change touches
no `Load skills` line membership — it adds a sentence *after* the skill-load
sentence, leaving the backtick-wrapped skill names Check 2b harvests untouched.
No note or documentation edit is warranted; "no edit needed" is the correct
silent state.

### D5 — No R-commit-time lint, no migration manifest (settled by PQ2, PQ3)

Per PQ2, do NOT add `node scripts/lint.mjs` at R-commit time — not in the
researcher agent and not in `/qrspi:research`'s commit step. The gate-instruction
fix removes the cause at the source; the existing CI/PR Check 14 run is the
sufficient backstop. Per PQ3, emit no `migrations/<version>.yaml` entry: the fix
is a plugin-shipped agent file consumers receive on plugin refresh, and it applies
forward from the next R run. Existing committed `research.md` artifacts are not
retroactively re-gated — acceptable forward-only behaviour. Consequently
`claude/commands/research.md` is **not** touched, and the researcher's `## Final
message format` output contract is unchanged (Q27 is moot).

### D6 — Add a Check 7-style static assertion of the gate instruction (settled by OQ1)

The human elected to harden against silent regression: add a static lint check
(a new check in `scripts/lint.mjs`, following the Check 7 read-contract-banner
precedent) that asserts `claude/agents/researcher.md` step 1 contains the
gate-instruction phrase. The Check 7 precedent proves `scripts/lint.mjs` can
assert a delimited prose field, so this is feasible. Design intent:

- The check looks for the D1 pointer sentence (or a stable delimited fragment of
  it — e.g. the phrase "surface-gate rule per the `repo-surface` skill") in the
  researcher agent file, and fails if absent.
- Prefer asserting a **stable substring** over a byte-for-byte match so trivial
  rewording (punctuation, line wrapping) does not falsely redden; the required
  fragment must be specific enough that dropping the instruction fails the check.
- Ships with the standard self-test pattern the other checks use (a synthetic
  pass/fail fixture) so the check itself is covered.
- Open sub-point deferred to S/V/I: whether this is a **new standalone check** or
  an **extension of the existing read-contract check (Check 7)** — an
  implementation-level structuring call, not a contract change. Either satisfies
  the goal.

This widens scope beyond the PQ1/PQ2 prose-only floor, per the human's explicit
OQ1 choice, and turns the "prose-only enforcement remains advisory" risk into a
mechanically-guarded invariant.

### D7 — Fold surface-gate comments into research.template.md (settled by OQ2)

The human elected to fix the template/agent consistency gap in the same change.
`openspec-templates/research.template.md` today states the gate rule only in its
preamble prose and carries no per-section `<!-- SURFACE-GATED: … -->` comments,
unlike `questions.template.md`. Design intent:

- Add per-section surface-gate comments to `research.template.md`'s surface-gated
  inventory sections, matching the convention `questions.template.md` already
  uses, so a human reading the template sees the same gate signal the agent applies.
- The template remains the human-facing shape; the agent prose (D1) stays the
  operative gate. This addition is for **consistency/legibility**, not a second
  enforcement path.
- Keep the comment wording phrase-aligned with the `repo-surface` omit mechanic
  and the researcher skeleton comment (same "omit … entirely" phrasing family,
  not necessarily byte-identical — consistent with D2/Q4).

<!-- Surface-gated detail sections below: this change touches the stage-agent
     surface (the researcher agent file), the lint-gate surface (Check 14 backstop
     + the new D6 static assertion), and the template surface (the D7 gate-comment
     fold-in). data-store / http-api / ui / auth / slash-command / skill /
     migration-manifest sections are omitted (absent or out of scope). -->

## Agent changes

Single file edited: `claude/agents/researcher.md`.

- **Step 1 (`## What to do`)** gains the D1 sentence, appended after the existing
  "The `repo-surface` skill defines which inventory sections to emit based on the
  surfaces present in the repo; the stack cheatsheet declares those surfaces."
  sentence. One added sentence; the numbered-step structure (5 steps) is unchanged.
- No frontmatter change (`tools`, `model`, `effort` untouched).
- No `Load skills` membership change (D4); no Read/Output-contract banner change.
- The output skeleton and its gate comment are untouched (D2).

Net diff to this file: one sentence added to one paragraph — a low-effort edit.
(The change as a whole also touches `scripts/lint.mjs` (D6) and
`research.template.md` (D7); see those sections.)

## Lint changes

**A new static assertion is added (D6, per OQ1).** `scripts/lint.mjs` gains a
check — new standalone or an extension of the Check 7 read-contract precedent
(the structuring is an S/V/I call) — that asserts the researcher agent's step 1
contains the gate-instruction phrase, failing if it is dropped. It prefers a
stable-substring match over byte-for-byte to avoid false reddening on trivial
rewording, and ships with the standard synthetic pass/fail self-test. Check 14
still catches the downstream symptom as the runtime backstop, and Check 2b /
Check 11 continue to pass unchanged. (No R-commit-time lint *run* is added —
that was PQ2 = no; D6 is a CI-time static presence check, a different lever.)

## Template surface

**The template gains per-section gate comments (D7, per OQ2).**
`openspec-templates/research.template.md` today states the surface-gate rule only
in its preamble prose ("injected dynamically by the researcher agent at write
time") and carries no per-section `<!-- SURFACE-GATED: … -->` comments, unlike
`questions.template.md`. The human elected (OQ2) to close that gap in this change:
add matching per-section gate comments to the template's surface-gated inventory
sections. The gate remains operative in the agent (D1); these comments are for
human-facing consistency/legibility, not a second enforcement path. Wording stays
phrase-aligned with the `repo-surface` omit mechanic (D2/Q4). `questions.template.md`
itself is not changed (Q17) — it already carries the convention being matched.

## Vertical slices (preview)

With the OQ1/OQ2 additions the change has three units of work. They are small and
related; the architect (V) makes the final cut, but the natural decomposition is:

- **Slice 1 — Researcher gates absent surfaces at stage R (D1).** Add the gate
  sentence to `claude/agents/researcher.md` step 1. Demoable: inspect the prose /
  run the researcher and confirm it now instructs suppression of absent-surface
  inventory headings while present-surface headings still emit. Verified by
  `node scripts/lint.mjs` staying green (Checks 2b/11/14 unaffected).
- **Slice 2 — Static assertion of the gate instruction (D6).** Add the
  `scripts/lint.mjs` check (new or Check 7 extension) + its synthetic self-test.
  Demoable: deleting the gate sentence reddens the check; restoring it greens it.
- **Slice 3 — Template gate comments (D7).** Add per-section
  `<!-- SURFACE-GATED: … -->` comments to `research.template.md`. Demoable: the
  template's gated sections now carry the same signal `questions.template.md` does;
  lint stays green.

These could equally be grouped as one small multi-part slice; the ordering above
(agent prose → its static guard → the template mirror) is the natural build order.

## Risks / Trade-offs

- **Over-gating (Q23).** The chief risk is that the instruction causes the
  researcher to suppress a *present*-surface heading. Mitigation: the D1 wording
  says "emit … only when its surface is **present**, omitting **absent**-surface
  headings" — it gates on absence only; it does not touch present surfaces or the
  always-emitted spine (D3). Verification is a runtime observation, not a static
  check: run the researcher against a repo that HAS `stage-agent` present and
  confirm `## Stage-agent surface` still emits (this repo itself is such a case).
- **Prose-only enforcement → mechanically guarded (D6).** The gate is still a
  prose instruction the model executes, but with the D6 static check the
  *presence* of that instruction is now mechanically asserted at CI — a future
  edit that drops the sentence reddens lint immediately, rather than the miss only
  surfacing later via Check 14 on a generated artifact. This closes the main
  advisory-enforcement gap the lean-only scope would have left open.
- **Widened scope (OQ1/OQ2).** The change grew from one file to three
  (`researcher.md`, `scripts/lint.mjs`, `research.template.md`) by the human's
  election at the D review. Still no code/runtime contract change and no schema
  surface; the added lint check is CI-only. The trade-off (more diff, more durable)
  was the human's explicit call.
- **Forward-only leaves stale artifacts (PQ3).** Already-committed `research.md`
  files with absent-surface headings are not re-gated and could still redden
  Check 14. Accepted as forward-only behaviour; a consumer who hits it re-runs
  stage R. No migration step (PQ3).
- **Low blast radius.** Even widened, the change is small: one agent sentence,
  one CI-only lint check + self-test, and template comments — no runtime/contract
  change and no registry change. Still consistent with the backlog framing
  ("researcher-gate is cheap and lands first").

## Open questions for the human

- [x] **OQ1 — static assertion of the gate instruction?** Should this change
  ALSO add a Check 7-style static lint assertion (a new check, or an extension of
  the read-contract precedent) that asserts the researcher's step 1 contains the
  gate-instruction phrase — so the instruction cannot silently regress or be
  dropped in a future edit?
  **Answer: Yes — add it to this change (D6).** The human elected the durable
  enforcement lever over the lean prose-only floor. `scripts/lint.mjs` gains a
  static check asserting the gate-instruction phrase is present in the
  researcher's step 1 (new check or Check 7 extension — an S/V/I structuring
  call), preferring a stable-substring match with a synthetic self-test.
- [x] **OQ2 — research.template.md gate comments?** Should the template gain
  per-section `<!-- SURFACE-GATED: … -->` comments to match the questions
  template convention, closing the discrepancy research noted?
  **Answer: Yes — fold into this change (D7).** Add matching per-section
  surface-gate comments to `research.template.md`'s inventory sections, fixing
  the template/agent consistency gap in the same change. The gate stays operative
  in the agent (D1); the template comments are for human-facing consistency.
