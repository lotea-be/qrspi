# Backlog

Candidate changes for this repo, tracked before they enter the QRSPI flow
(Q → R → D → S → V → P → I → PR). Status is one of `idea` / `proposed` /
`in-progress` / `merged`. Completed work lives under
`openspec/changes/archive/`, not here.

## In progress

### spec-sync-contract — `in-progress (Q, R, D, S, V, P, I complete)` · **P2** · bundle of [[sync-modified-delta-scenario-loss]] + [[dedicated-spec-sync-agent]]

Entered the QRSPI flow 2026-07-28. Bundles the P2 correctness fix
[[sync-modified-delta-scenario-loss]] with its P3 vehicle
[[dedicated-spec-sync-agent]]: stand up a least-privilege `qrspi:spec-syncer`
agent whose system prompt owns the delta-merge contract (ADDED/MODIFIED/REMOVED/
renamed semantics), have `/qrspi:archive` own the sync delegation instead of the
un-editable generated `openspec-archive-change` skill, and encode in that same
contract the MODIFIED-replaces-wholesale rule (re-state kept scenarios) plus a
count-drop guard — the P2's "natural home." Bundled because doing the P2 alone
would force inlining or duplicating a contract the P3 exists to extract once;
authored together it lands in the right place with no rework. Scope spans the new
sync agent (+ `/qrspi:archive` delegation, `claude/agents/spec-syncer.md`,
Read-Matrix "Helper agents" row, lint Check 17 banner) **and** architect (stage S)
guidance that a MODIFIED delta re-state the scenarios it keeps. Carries the P2 band
overall (silent spec-coverage loss); it bit the 2026-07-28 `unify-implement-paths-on-variants`
archive. Sequencing vs the road-to-1.0 orchestrator-context pair is deferred to
the human.

---

## Proposed

_None._

---

## Ideas

Listed in priority order (highest first). Each carries a `P1`–`P3` band:
**P1** = correctness/safety of the live workflow, a highly visible defect in
every generated artifact, or a systemic token/cost regression that recurs on
every live run — do next;
**P2** = high-value enhancements, larger or lightly dependent;
**P3** = strategic bets or items sequenced behind another change. Re-evaluate
this ordering whenever an item is added, modified, or archived (see
[[backlog-prioritization]]).

**Token/cost levers** (the recurring cost band, salient with burn climbing) are
kept adjacent near the top so the cost story reads at a glance: the **input** and
**output** levers shipped together as `context-budget` (merged and archived
2026-07-24); [[simplify-per-slice-model-selection]] and
[[configurable-effort-and-thinking]] shipped together as `per-slice-compute-knobs`
(merged and archived 2026-07-25), whose compute follow-ons
[[per-slice-effort-via-agent-variants]] and [[haiku-model-tier]] are now bundled
into `per-slice-compute-tier` (proposed, in the QRSPI flow); and
[[standardize-recurring-ops-scripts]]
(reasoning/exploration) remains here. The
**surface-taxonomy family** spun off [[repo-applicable-artifact-sections]]:
`enforce-artifact-surface-applicability` and `kit-self-surfaces` shipped as
`kit-surface-dogfooding` (merged and archived 2026-07-25); the remaining
[[privacy-gdpr-surface]] (P2, the highest-value surface-extension instance),
[[structured-surface-schema]] and [[extend-surface-taxonomy]] are kept
contiguous below across the P2/P3 boundary.

> **▶ Next up:** the [[unify-implement-paths-on-variants]] + [[commands-assert-cwd-change-folder]]
> bundle. Sequenced ahead of the P1 [[spec-anchored-code-comments]] by explicit
> decision (2026-07-27): it **completes an already-shipped mechanism** — the
> compute-variant dispatch from `per-slice-compute-tier` left the base implementer
> vestigial (D9) — and is the last piece before cutting the **0.10.0** breaking
> release (whose `migrations/0.10.0.yaml` this repo already carries). Finishing
> shipped-but-incomplete work outranks starting new P1 scope. `spec-anchored-code-comments`
> remains the top **new-scope** priority after it.
>
> **Road to 1.0 (2026-07-27):** the [[rename-qrspi-to-qrnchi]] rebrand is the
> vehicle for the first **stable v1.0.0** and public debut (submission to Anthropic's
> `claude-plugins-community` marketplace). Because 1.0 is a *schema-freeze* and
> first-impression-at-scale point, a short runway of readiness work is sequenced
> **ahead of the rename**, filtered by one lens — *what would bite a stranger or
> embarrass us in week one of a public 1.0* — not by band alone:
>
> - **Tier 1 — bites a stranger (do first):** the unify bundle above (removes the
>   vestigial base-implementer dead path before it ships in a "stable" artifact),
>   then the orchestrator-context pair — [[reset-and-resume-between-boundaries]] then
>   [[orchestrator-context-budget-gate]] (a real consumer hit **98% context** at the
>   D review of their *second* change; nothing enforces the `context-hygiene`
>   budget, so a marathon session silently detonates — the sharpest edge for a
>   plugin whose premise is long multi-stage sessions).
> - **Tier 1.5 — freeze the last ad-hoc schema (cheap, good timing):**
>   [[standardize-backlog-format]], **template + lint floor only** (defer the heavier
>   per-file `backlog/<id>.md` model to post-1.0). The backlog is the one QRSPI
>   surface with no schema behind it; locking it is far cheaper before public
>   installs write the ad-hoc shape than after. Encodes the P-band convention
>   [[backlog-prioritization]] already applies informally.
> - **Tier 2 — fixes "it's heavy" for newcomers:** [[init-conductor-plus-overview]]
>   + [[flow-entry-right-sizing]] (onboarding is a feature when the audience is
>   strangers, not colleagues who know the lore).
> - **Deferred past 1.0:** [[spec-anchored-code-comments]] (P1 but large — 1.1
>   flagship, needs stable spec ids first); [[privacy-gdpr-surface]] and the
>   alignment-quality trio [[real-runtime-slice-checkpoints]] /
>   [[architect-real-runtime-done-decomposition]] / [[designer-flag-shared-artifact-coupling]]
>   (all still P2, just sequenced after the 1.0 cut). [[automate-marketplace-source-bump]]
>   rides *with* the release mechanics, not before.
>
> Bands unchanged throughout; this records sequencing, not a re-banding. Supersedes
> the prior 2026-07-27 abkf-handover sequencing (privacy + trio next) — those slip
> behind the road-to-1.0 readiness work.

### spec-anchored-code-comments — `idea` · **P1**

**Why:** Implementation code comments sometimes reference the *process* artifacts
that produced the code — a `design.md` decision ("per D4"), a `slices.md`/
`tasks.md` item, or a change/PR id. **This shouldn't happen, and it's a highly
visible, ugly defect** — it lands directly in shipped code every reader sees, and
it *rots*: those artifacts are transient (they archive) and mutable, so the
reference outlives or diverges from the thing it names, and whoever chases it hits
stale or moved content. The only durable, human-review surface a comment should
lean on is the **spec** (`openspec/specs/**`), which persists past archive as the
kit's standing contract. So the rule should be: **a shipped code comment may
reference a spec and nothing else** — no `design.md` / `slices.md` / `tasks.md` /
PR references in code.

**Shape:** Give specs a stable **identifier** (a short requirement/scenario id) that
a comment can cite (e.g. `// see spec AUTH-3`), and have the spec grammar carry/emit
those ids. Then establish the convention in the implementer's guidance — and ideally
a `scripts/lint.mjs`-style check over changed code — that comments cite a spec id
only. Keep the comment **terse: the id, not a paraphrase.** A descriptive
restatement of the spec inside the comment is itself a second source of truth that
drifts from the spec it quotes; the id *points*, the spec *says*.

**Supersedes `enforce-d-number-tags-in-slices`:** once specs carry stable ids,
slices should tag a **spec-id**, not a `(D<n>)` — one id-space, not two parallel
tag schemes on a slice (the same two-sources-of-truth smell). That removes the
standalone D-number lint idea; its open question folds in here for this change's
D stage: does the slice→spec *contract* link replace the slice→design *rationale*
link `tighten-stage-read-boundaries` relied on at implement time (design.md out of
read scope)? If contract-level grounding suffices for the implementer, yes; if the
implementer needs the *why* and not just the *what*, the spec-id tag must be made
to carry it. Was the inverse traceability link — `(D<n>)` tags bound slices back to
design; this binds code forward to specs — now unified onto specs. Also relates to
the two-source-of-truth caution in [[optional-technology-specs]]. **P1 like
[[repo-applicable-artifact-sections]]:** a highly visible artifact-quality defect
(ugly process references baked into shipped code) rather than a live-workflow
correctness gap. Surfaced 2026-07-24.

### researcher-apply-surface-gate — `idea` · **P2**

**Why:** The `questioner`, `designer`, and `architect` agents apply the
`repo-surface` surface-gate (emitting the omit-comment and suppressing
surface-specific headings absent from the repo's `## Repo surface` block), but the
`researcher` (stage R) does **not** — it emitted a `## Data model` heading in a
repo with no `data-store` surface, which `scripts/lint.mjs` Check 14
(surface-applicability) rejects. The failure only surfaces at stage-I lint (R-stage
commits don't run lint), so it lands as a mid-implementation hard-stop far from its
cause. Fix: have the researcher load `repo-surface` and surface-gate its headings
like the other artifact-producing agents (and/or run lint at R-commit time to catch
it at the source). Surfaced 2026-07-27 while implementing
[[unify-implement-paths-on-variants]] (its research.md tripped Check 14).

### architect-must-leads-requirement-first-line — `idea` · **P2**

**Why:** OpenSpec `validate --strict` (1.4.1) only scans the **first line** of a
requirement body for `MUST`/`SHALL`. An architect (stage S) that opens a
requirement body with a wrapped `When …` clause and lets `MUST` fall to line 2
authors a delta that reads fine, passes a non-strict eye, and passes lint — then
**hard-stops the Implement stage** at the `openspec validate --strict` slice gate
(CI runs strict), far from its cause. Observed 2026-07-28 implementing
[[spec-sync-contract]] slice 1: three ADDED requirements each began `When …` with
`MUST` on the next line; the implementer returned blocked and the orchestrator
had to reorder each body so `MUST` leads. Fix, cheapest first: (1) add a line to
`claude/agents/architect.md` (and/or the `spec-delta.template.md` requirement
comment) — "put `MUST`/`SHALL` on the requirement body's **first line**, before
any `When …` clause"; (2) optionally a `scripts/lint.mjs` check mirroring the
strict first-line scan so the gotcha fails at S-commit, not mid-implement.
Relates to [[dedicated-spec-sync-agent]]/[[spec-sync-contract]]'s delta-merge
authoring rules and the general "artifact-authoring gate fires late at stage I"
smell shared with [[researcher-apply-surface-gate]].

### standardize-recurring-ops-scripts — `idea` · **P2**

**Why (two payoffs — consistency *and* token cost):** Several QRSPI operations
recur across changes, and today the agent re-derives "the best method" each run.
That has two costs. (1) **Consistency** — the re-derivation risks drift, so the
same op runs slightly differently run-to-run. (2) **Token/exploration cost** —
computing a deterministic fact by reading files and reasoning through an approach
spends tokens each run that a single `node scripts/foo.mjs` call could return in
one tool result; this is the fourth token lever alongside the input-load and
output-payload levers (both shipped in `context-budget`) and compute
([[configurable-effort-and-thinking]]) — it targets the **reasoning/exploration**
axis. The kit already proves the fix — [`scripts/lint.mjs`](scripts/lint.mjs) is a
recurring mechanical task extracted to a Node script. Extend that pattern to the
**deterministic** recurring ops so stage
commands call a helper instead of reinventing it: "does the linked PR show
`merged`?", "create the PR from this title/body template", "flip a backlog entry's
status", "list open items in `tasks.md`/`followups.md`". Direct enabler for
[[archive-requires-merged-pr]] (the PR-status check) and
[[pr-review-open-tasks-and-followups]] (PR-create + open-item enumeration). Now
**unblocked** — both merged (archived 2026-07-15 and 2026-07-22), so the inline
PR-status and open-item logic they introduced already exists and is ripe for
extraction.

**Scope boundary — mechanical, not judgment.** Script only ops with one correct
answer; leave decisions (finish/defer/drop a task, reprioritize, approve a design)
to the human/agent. The script supplies the *fact*; the caller makes the *call*.
Two constraints: (1) **Node, not shell** — per CLAUDE.md the permission checker
rejects shell-injection in slash commands, so helpers follow the lint
precedent. (2) **A shipped runtime helper is a bigger commitment than a CI-only
script** — lint runs in this repo's CI, but a helper a stage command invokes
at runtime ships into consumer repos and inherits their `gh`/auth availability and
cross-platform concerns; be deliberate about that split.

### reset-and-resume-between-boundaries — `idea` · **P2**

**Why:** QRSPI firewalls *stage work* into subagents (`context-hygiene`), keeping
the orchestrator lean **per stage** — but the orchestrator itself accumulates
**unbounded across stages and changes** in one session: every AskUserQuestion +
answer, every stage-handoff commit + bash output, every subagent return summary,
every Full-auto pause and hard-stop. `context-hygiene` *says* keep the orchestrator
under ~40% and reset at 60%, but nothing enforces it, so a marathon session blows
past it silently (a consumer session hit **982k/1m = 98%, 95.8% "Messages"** at the
D review of its *second* change — abkf `QRSPI-HANDOVER-context-overflow.md`,
2026-07-27; this repo's own compute-tier session is the same shape). The fix is
cheap because **the orchestrator conversation is disposable and the change folder is
truth** — each stage reads only its input artifact from disk, so a fresh session
resumes losslessly at any boundary. Make reset-and-resume a **blessed, first-class
step** at the natural boundaries (no harness capability needed — these are
*structural* triggers): (1) after `/qrspi:archive`, actively recommend a new session
before the next `/qrspi:questions` — starting change N+1 in the same orchestrator is
the single biggest contributor; (2) document/one-command the resume path ("fresh
session, `/qrspi:<next> <id>`") so reset is routine hygiene not a "did I lose state?"
scare — `/qrspi:status` partly does this; (3) nudge a reset after a
`/qrspi:followup` batch (the handover's deploy saga ran ~10+ followups ≈ half the
message volume); (4) harden `context-hygiene`'s prose to name the marathon
anti-pattern explicitly (subagent firewalling does NOT bound cross-session
accumulation). Sibling to [[orchestrator-context-budget-gate]] (the live-%
nudge/gate mechanism — this item is the structural half that needs no new harness
primitive). Distinct axis from the archived `context-budget` (per-stage input/output
load) — this is cross-session orchestrator accumulation. Surfaced by the abkf
consumer handover (2026-07-27).

### orchestrator-context-budget-gate — `idea` · **P2**

**Why:** The mechanism half of the context-overflow fix (abkf
`QRSPI-HANDOVER-context-overflow.md`, 2026-07-27, proposal #1 — "the single thing
that would have prevented this"): at the top of each `/qrspi:<stage>` command
(alongside the version check), read the harness **context utilization %** and, above
a threshold (~60%), emit a one-line "reset recommended" notice pointing at the
resume path; above ~80%, a soft gate (AskUserQuestion: *reset now / continue*).
**Load-bearing unknown (needs R/D):** whether a slash-command body can actually read
live context utilization mid-run — the version-check reads a *static* file
(`installed_plugins.json`); live context % is a different capability that may not be
exposed to command bodies. If it is not, this degrades to a **structural heuristic**
(a stages-run / followups-run counter maintained in orchestrator context) — which is
exactly the trigger [[reset-and-resume-between-boundaries]] already uses, so the two
converge if the %-read proves infeasible. Could rise to **P1** if a live-% read is
feasible (a recurring systemic cost/quality regression on every long session —
reasoning degrades near the ceiling before autocompact fires). Sibling to
[[reset-and-resume-between-boundaries]] (the structural half, buildable now) and
[[orchestrator-effort-targeting]] (both manage the orchestrator's own resources).
Surfaced by the abkf consumer handover (2026-07-27).

### orchestrator-effort-targeting — `idea` · **P3**

**Why:** The QRSPI **orchestrator** (the main loop driving the stages) runs at a
single session reasoning-effort for the whole flow, but its turns split sharply
by marginal value: most are *mechanical* (Glob preconditions, `git add`/commit,
stage handoff, backlog staging) and get near-zero benefit from a large thinking
budget, while a few are *judgment-heavy* (orchestrating the D review, and the
S→V→P→I hard-stop **divergence self-assessment** — "materially diverges vs.
immaterial elaboration"). Running the whole session at high effort spends
reasoning (output) tokens on the mechanical turns for no quality gain; running it
at medium under-thinks the gates. Add guidance (and/or a light mechanism) to
**escalate effort per-turn only at the judgment-heavy gates** — e.g. extended-
thinking triggers in the stage-command bodies at exactly those points — so
mechanical turns stay cheap and the expensive reasoning lands where it pays. This
is the compute-lever thesis (spend compute by marginal value) applied to the
**orchestrator's own turns**, complementing [[per-slice-compute-tier]] /
[[per-slice-effort-via-agent-variants]] (which target the *subagent* slices) and
[[configurable-effort-and-thinking]] (per-*stage* effort). It sits on the
cost-per-quality frontier: it does not minimise tokens versus always-medium, but
it beats always-high at equal or better gate quality.

**Design tension (needs Q/D):** per-turn thinking triggers are *prose-level* and
cannot be mechanically enforced (the "persona, not mechanism" caution — cf.
[[hooks-as-mechanical-guards]]); scope which gates genuinely warrant the bump
rather than sprinkling triggers everywhere; and confirm the billing model (whether
retained thinking blocks from a bumped turn re-bill as downstream input, which
would shrink the margin) before committing. Surfaced 2026-07-27 while advising on
what model/effort to run the orchestrator in, during the `per-slice-compute-tier`
flow.

### richer-effort-vocab-and-thinking — `idea` · **P3**

**Why:** `per-slice-compute-tier` keeps the `**Compute:**` effort vocabulary at
`{low, medium, high}` and ships no thinking-budget control. Some slices may
warrant more (a deep, design-heavy slice) or an explicit thinking budget. Extend
the `effort=` vocabulary (e.g. `xhigh` / `max`) and/or add a thinking-budget knob
to the grammar + Check 13, **together with** heuristics for when each tier is
warranted — mis-annotation risk grows with the vocabulary (cf. the haiku heuristic
this change ships). Note the variant-agent consequence: each new effort tier needs
its own static `implementer-<tier>` variant (D1/D2). Part of the adaptive-compute
cluster with [[orchestrator-effort-targeting]] and
[[compute-escalation-on-failure]]. Surfaced as a Non-Goal of
`per-slice-compute-tier` (stage D, 2026-07-27).

### compute-escalation-on-failure — `idea` · **P3**

**Why:** When an implementer slice fails its build/tests at the slice boundary, the
orchestrator hard-stops and asks the human (workflow hard-stop condition 3).
Because effort is baked into the *static* variant agent (per
`per-slice-compute-tier`'s D1), the implementer cannot raise its own effort — so
adaptive retry must be **orchestrator-driven**: on a slice failure, re-spawn the
slice on a higher tier (bump effort and/or model up a ladder) before falling to the
human hard-stop. Design questions: which dimension escalates first (effort vs
model) and the ladder order; max retries / cost cap; and how escalation stays
compatible with the never-suppressed human gate (escalate-then-ask, not
escalate-silently-forever). Depends on `per-slice-compute-tier`'s tier mechanism.
Part of the adaptive-compute cluster with [[orchestrator-effort-targeting]] and
[[richer-effort-vocab-and-thinking]]. Surfaced as an afterthought during
`per-slice-compute-tier` stage-D review (2026-07-27).

<!-- unify-implement-paths-on-variants moved to ## Proposed (2026-07-27) -->
<!-- commands-assert-cwd-change-folder bundled into unify (see ## Proposed) -->

### decompose-tasks-md-per-slice — `idea` · **P2**

**Why:** The implementer (stage I) reads the whole `tasks.md` on **every** slice,
so a change with N slices re-reads the same growing file N times — an input-side
read-footprint cost on one of the two heaviest stages. This is the same lever as
[[context-budget]] (input read footprint) but at the *artifact-structure* level
rather than skill loads, so it is deliberately out of that change's scope (which
holds a "no artifact-structure change" contract). Two related decompositions:

1. **One file per slice** (e.g. `tasks/slice-<n>.md`) so each implementer
   invocation reads only its own slice, not the full checklist.
2. **Separate the `(human)` checkpoint tasks** out of the per-slice implementer
   files into their own surface (e.g. `checkpoints.md`), so the per-slice files
   stay purely machine-actionable (code + tests the implementer acts on) and the
   runtime-verification checkpoints collect in one place for the PR reconciliation
   gate and the dogfood flow. The implementer never reads tasks it cannot action.

**Coupling / design tension (needs Q/R/D):** touches the planner (writes the split
files), the implementer Read-Matrix row, the reviewer (reads the full folder),
progressive task-ticking + the per-slice commit flow, the PR human-task
reconciliation gate in `claude/commands/pr.md`, the `qrspi-dogfood` skill,
`scripts/lint.mjs` checks that parse `tasks.md`, and `openspec-templates/`. Note
the countervailing pull: `tasks.md` doubles as the single-glance progress view for
the human and the reviewer, so a naive split fragments that — likely wants a
top-level index + per-slice detail, and the `(human)` checkpoints still need a
slice association. Surfaced 2026-07-24 during the `context-budget` flow.

**Bundle (proposed — one QRSPI run):** take up together with
[[compute-annotation-presence-lint]] (P3, below) under this entry as anchor. Both
live on the **same `tasks.md` slice-boundary parser** — decompose *builds* it (to
split/route per-slice files), and the presence lint *needs* it (to assert every
slice block carries a `**Compute:**` line). The coupling is order-dependent, so
bundling avoids throwaway work: doing the presence lint alone builds a boundary
parser over today's flat `tasks.md` that decompose then obsoletes, and once
decompose splits to `tasks/slice-<n>.md` the presence check collapses to a per-file
scan. Bundling is what makes the boundary-parsing cost — the very reason both were
deferred — worth paying once, so it *raises* the lint's effective priority rather
than lowering decompose's. `enforce-d-number-tags-in-slices` was considered for this
bundle but pulled out — it's entangled with spec-id numbering, now folded into
[[spec-anchored-code-comments]] instead. Bundle reassessed 2026-07-27.

### init-conductor-plus-overview — `idea` · **P2**

**Why:** Onboarding a repo currently means discovering two separate commands —
`/qrspi:init` (scaffolds OpenSpec) and `/qrspi:stack` (bootstraps the per-repo
stack-cheatsheet skill) — and there's no home at all for a *product/domain*
description (the "what/why" the stack skill deliberately omits; the stack skill
is "how we build" only). Every QRSPI stage loads the stack skill for tech
context but has no equivalent for domain context, which especially hurts the
ticket-blind R stage (a stable "what is this app" doc is grounding it's *allowed*
to have) and the Q/D framing stages.

**Shape:** Make `/qrspi:init` a **conductor** for first-time onboarding that runs
three steps in sequence, while each step stays its own re-runnable command so a
later change can refresh just one:
1. **Application description** → a new `/qrspi:overview` command that writes a
   short domain/overview project-scope skill (`<repo>-overview`), sibling to the
   stack skill and loaded by every stage. Not skipped. Keep it lean per
   `context-hygiene` (a page — purpose, users, core concepts/glossary, non-obvious
   constraints), and distinct from README (user-facing) / CLAUDE.md (agent rules)
   / stack (tech) to avoid drift.
2. **Tech stack (optional)** → the existing `/qrspi:stack`.
3. **OpenSpec scaffold** → the current `npx openspec init` core, but *seeded* from
   step 1: feed the application description into OpenSpec's project context
   (`project.md` / the specs' `Purpose` fields, which today start as literal
   `TBD - created by archiving…`) so "bootstrap based on the previous steps" is a
   real linkage, not cosmetic ordering.

Re-running `/qrspi:init` must **detect and offer to refresh** each of the three
(the way `/qrspi:stack` already does "Read it first — this is a refresh"), never
clobber. README's install/onboarding section and the stage table would need
updating (per the CLAUDE.md "keep the README current" rule). Relates to [[multi-repo-central-specs]] (a central spec repo
would want a shared overview too) and [[optional-technology-specs]].

### backlog-prioritization — `idea` · **P2**

**Why:** The Ideas list has no ordering signal — items accrete in roughly the
order they were surfaced, so "what should we pick up next" isn't answerable from
the file. Introduce a lightweight priority/ranking convention for the backlog,
and make it self-maintaining: each time the backlog changes materially — an item
is archived (moved out of "In progress"), a new item is added, or an existing
item is modified — propose re-evaluating the backlog and reprioritizing if the
change shifts the relative ordering. The re-evaluation is a *proposal to the
user*, not an automatic silent reshuffle. Pairs naturally with the archive flow
in [[archive-requires-merged-pr]] (which already updates the backlog entry on
archive) — that's a natural trigger point to offer the reprioritization pass.
(The `P1`–`P3` bands + priority ordering now used in this file are a first,
hand-maintained cut of this convention.)

### flow-entry-right-sizing — `idea` · **P2**

**Why:** Nothing formally assesses, when a backlog idea is picked up, whether it
needs the full eight-stage flow or a lighter path — the agent applies the
`workflow` skill's static "When you can skip stages" prose ad hoc (trivial →
straight to `/qrspi:implement`; data-model/API/auth → full flow). Make it an
explicit, recorded **right-sizing gate at flow entry**: assess the chosen scope's
surface/risk and route it to full-flow vs a trimmed path (e.g. a middle tier that
skips R but keeps the D alignment gate), recording the decision + rationale. This
is the entry-side sibling of the archived `right-size-followup-handling` triage
(which right-sizes POST-PR follow-ups), and the third axis of "what to do next"
alongside [[backlog-prioritization]] (which idea) and [[propose-bundling-ideas]]
(how much at once) — this one decides *how heavy* a flow. **Hard constraint
(design tension):** it must be a right-sizer, not an escape hatch — QRSPI's thesis
is front-loading Q+R+D to beat the plan-reading illusion, so the gate MUST
preserve "any data-model / API / auth / contract surface ⇒ full flow" and only
trim genuinely low-surface changes. Surfaced 2026-07-25.

### real-runtime-slice-checkpoints — `idea` · **P2**

**Why:** QRSPI slices default to acceptance the automated suite can reach
(unit/integration tests, lint, `openspec validate`), but a slice's real acceptance
often depends on behaviour tests **cannot** exercise — deployment/image rollout,
identity/secret wiring, external-API integration, plugin/agent registration. Today
nothing forces a checkpoint for those, so the gap surfaces only in the target
environment (the abkf `dsr-self-service` retro: a background Job passed CI and bicep
validation but failed three ways in staging — image never rolled, auth missing,
config drift). The kit already has the right primitive — the `(human)`
runtime-verification checkpoint — it is just under-applied. Generalize the
`vertical-slice` skill (and the architect/planner that emit checkpoints) so **any
slice whose acceptance cannot be reached by the automated suite MUST carry a
`(human)` checkpoint verifying it in the real target environment.** Stack-agnostic
by construction (covers deployment, external integration, and e.g. this repo's own
Check-15 plugin-registration bug that lint was blind to until the dogfood). Sibling
to [[architect-real-runtime-done-decomposition]] (decompose it — this one verifies
it). Surfaced by the abkf `dsr-self-service` consumer retro (2026-07-27).

### architect-real-runtime-done-decomposition — `idea` · **P2**

**Why:** The architect (S) decomposes a change into slices/tasks but tends to stop
at *code-complete* ("compiles, tests pass") rather than *runtime-complete* ("what
does shipping this resource to its real environment actually entail?"). In the abkf
`dsr-self-service` retro, deploying a new background Job — image distribution,
identity registration, secret injection, cross-context config parity — arrived as
ad-hoc post-PR work because the architecture never decomposed it. Add generic
architect guidance to decompose **what "done in the real runtime" means for each
new resource**, not just the code that produces it. **Keep the kernel generic** —
the specific cloud checklist (image/identity/secret/parity) is stack-specific and
belongs behind an `infra`/deployment **surface**, NOT hardcoded into every architect
run (see [[extend-surface-taxonomy]]); baking IaC steps into the generic prompt
would regress the kit's stack-agnostic, surface-gated design. Sibling to
[[real-runtime-slice-checkpoints]] (verify it). Surfaced by the abkf
`dsr-self-service` consumer retro (2026-07-27).

### designer-flag-shared-artifact-coupling — `idea` · **P2**

**Why:** When a design reuses one artifact across multiple roles/contexts (in the
abkf `dsr-self-service` retro, a single image served both a web and a job runtime via
a mode flag), the contexts become permanently config-coupled — but the design never
recorded that parity must be maintained, so each missing role-specific setting became
a separate production incident. Add designer (D) guidance to **flag any artifact
reused across multiple roles and require the design to state the coupling contract
explicitly** — whether configuration/behaviour parity is maintained across the shared
artifact, or the roles are split into separate slim startups. Stack-agnostic
hidden-coupling surfacing — squarely the designer's "surface your assumptions" job,
not a deployment-specific concern. Relates to the two-source-of-truth caution in
[[optional-technology-specs]]. Surfaced by the abkf `dsr-self-service` consumer retro
(2026-07-27).

### standardize-backlog-format — `idea` · **P2**

**Why:** The kit's commands all *mutate* `openspec/backlog.md` — `questions`
flips a row to `proposed`, `pr` promotes/appends an idea row under `## Ideas`,
`archive` removes a row, `retro` may edit one — but **none define its schema**.
The structure (the `## In progress` / `## Proposed` / `## Ideas` sections, the
`### <id> — <status> · P<band>` heading, the `**Why:**` body, the `idea` /
`proposed` / `in-progress` / `merged` status enum, `[[wikilink]]` cross-refs)
lives only as prose inside *this* repo's own backlog. Nothing ships it to
consumer repos and `scripts/lint.mjs` doesn't check it, so each repo
reverse-engineers the shape from whatever its commands happened to write — and
even this repo already runs a second, unspecified shape (`openspec/backlog/<id>.md`
companion files). Contrast `openspec/changes/<id>/`, which is fully
schema-driven (`openspec status --json`, lint, templates); the backlog is the
one QRSPI surface with no schema behind it. Fix, cheapest first: (1) ship a
canonical `backlog.md` template in `openspec-templates/` so `/qrspi:init` seeds
the sections + a row-format legend; (2) add a `lint.mjs` check validating each
row's heading shape, status enum, and required sections as the mechanical floor.
Weigh a heavier per-file `backlog/<id>.md` model (frontmatter, mirroring
`changes/`) against the lighter template+lint path. Pairs with
[[backlog-prioritization]] (which standardizes the *ordering* convention this
would encode) and [[structured-surface-schema]] (the same "give an ad-hoc
surface a real schema" move); a natural trigger is the archive flow in
[[archive-requires-merged-pr]], which already rewrites the backlog on archive.
Surfaced 2026-07-25.

### propose-bundling-ideas — `idea` · **P3**

**Why:** When a flow starts — or when the user asks "what should we take up
next?" — the agent tends to pick a *single* backlog item, but several ideas
often share a theme, a mechanism, or a sequencing dependency and are cheaper to
design and ship as **one QRSPI flow** (the eight-stage ceremony amortizes across
the bundle, and co-designing coupled items avoids building a fragile mechanism
twice). Today nothing prompts the agent to *look for* those bundles; it happens
ad hoc. Add a convention: at run-start / "what next?" time, scan the backlog for
bundle-worthy clusters (shared mechanism, complementary levers, explicit
"must be co-designed" cross-references) and **propose** a bundle to the user —
offer, never auto-bundle; the human picks the scope. Pairs with
[[backlog-prioritization]] — that item ranks *what's next*; this one decides
*how much* to take at once — and is itself dogfooded by the `context-budget`
change (which bundled the input + output token levers into one flow). Kept
adjacent to [[backlog-prioritization]] despite the band gap, per the
"keep families contiguous" convention above. Surfaced 2026-07-24.

### enforce-research-ticket-hiding — `idea` · **P2**

**Why:** Ticket-hiding (the source's most important rule) is enforced only by
telling the researcher not to open `questions.md`, though it has Read on the whole
repo -- the "persona, not mechanism" anti-pattern `context-hygiene` itself warns
against. Consider a mechanical guard.

### hooks-as-mechanical-guards — `idea` · **P2**

**Why:** QRSPI enforces its load-bearing invariants — ticket-hiding during
Research, the per-stage Read Matrix boundaries — by *prose instruction* to the
agent: the "persona, not mechanism" anti-pattern `context-hygiene` warns against
and the same gap [[enforce-research-ticket-hiding]] flags. Claude Code ships two
mechanical enforcement primitives QRSPI does not use: **`PreToolUse` hooks**
(settings.json) that can *block* a tool call (e.g. deny the researcher any Read of
`questions.md` or the change ticket), and **agent-definition tool restrictions**
that structurally narrow a stage agent's toolset. Together they turn the Read
Matrix from a request into a guard; a `Stop`/`PostToolUse` hook could also
auto-run `node scripts/lint.mjs` after a stage commit. **Research before
committing:** (a) which invariants are worth a hook vs. left as prose, and *where*
each hook/restriction lives (plugin-shipped `settings.json`? per-agent
frontmatter?); (b) token-usage-vs-quality — hooks add no model tokens (they run
outside the model) but a blocked-then-retry loop can burn turns, so weigh
enforcement value against added friction. Supersedes the "consider a mechanical
guard" line in [[enforce-research-ticket-hiding]] by naming the mechanism.
Anchors the Claude Code capability cluster with [[github-mcp-for-pr-ops]],
[[scheduled-backlog-hygiene]], [[research-websearch-external]], and
[[richer-askuserquestion-formats]]. Surfaced 2026-07-25.

### repo-branch-protection — `idea` · **P2**

**Why:** The CI gates added by `kit-quality-hardening` are only advisory until
the `main` branch requires them; a `CODEOWNERS` file would also route reviews.
Deferred from `kit-quality-hardening` as a separate governance concern (its Q7).
**Fresh evidence (2026-06-19):** PR #5 merged while its CI run was still
`UNSTABLE` — confirming `main` has no required checks today. Pair this with the
new `release.yml` so a tag can't publish on a red build either.

### tutorial-mode-narrated-tour — `idea` · **P2**

**Why:** Some users report not "getting" the eight-stage workflow from the docs
alone. **Preferred first step** (low cost — the artifacts already exist): a
read-only, zero-footprint narrated tour `/qrspi:tour` that walks through the
already-shipped `example-greeting` reference change stage by stage, opening each
real artifact and explaining it in situ ("here's what Research produced — notice
it's ticket-blind, here's why"). Teaches both the *mechanics* (which command, what
artifact, where the gates are) and the *judgment* (why alignment de-risks) without
polluting the user's repo or recreating a second example. Decided against a
hands-on hello-world build: trivial changes are exactly the ones the workflow tells
you to skip, so they misrepresent why the alignment stages matter. Reuses the
`reference-example` asset already maintained. Pairs with
`tutorial-mode-coaching-overlay` as the deeper, hands-on follow-up.

### lint-auto-mode-gate-coverage — `idea` · **P2**

**Why:** `add-auto-mode` introduces a convention that every stage command must
reference the run-mode procedure in the `workflow` skill; a future command that
silently drops that reference would quietly fail to suppress (or keep) a gate in
auto mode. A structural `scripts/lint.mjs` check could assert the reference and
per-gate auto-branch wiring stays consistent — the runtime suppression itself is
not statically checkable. Surfaced by `add-auto-mode` stage D (offered, not built).
Low-cost correctness guard (hence P2, not P3). Now **unblocked** — `add-auto-mode`
merged 2026-07-06 (archived), so the convention it enforces is live.

### automate-marketplace-source-bump — `idea` · **P2**

**Why:** Cutting a release (`/qrspi-release`) publishes the GitHub Release but
stops there — the release does not reach installed users until the qrspi entry's
`source` ref is bumped to `vX.Y.Z` in the **separate**
`lotea-be/ai-agent-marketplace` repo, done by hand (the release skill can only
print the reminder). That manual, forgettable step gates every release's actual
delivery to consumers. Automate it from
[`release.yml`](../../.github/workflows/release.yml) after the Publish step.
The blocker is auth: the workflow's `github.token` is scoped to *this* repo and
cannot write to the marketplace. Preferred shape: a `repository_dispatch` firing
a `qrspi-release` event carrying the version, handled by a workflow **in** the
marketplace repo that opens a PR bumping its own pin — keeps qrspi ignorant of
the marketplace manifest format and puts the write + token where they belong.
Alternative: a fine-grained PAT / GitHub App installation token letting
`release.yml` edit + PR the marketplace directly. Hard constraints: open a
**PR, not a push** (the pin is every consumer's install source — no unreviewed
auto-ship), and run as an **isolated job** (`continue-on-error`) so a bump
failure can't red an already-published, irreversible-ish release. Needs the
marketplace manifest's exact shape confirmed first (which file; `source: …@vX`
vs a `ref:`/`version:` key). Pairs with [[qrspi-release-auto-stub-manifest]]
(the other release-time automation idea) and relates to
[[assert-openspec-version-pin-coupling]]. Surfaced 2026-07-25.

### privacy-gdpr-surface — `idea` · **P2**

**Why:** Add a **`privacy` (GDPR) repo-surface** to the taxonomy so that, when a
repo declares it, the Questioner/Designer/Architect emit privacy-specific sections —
front-loading the privacy dimension into alignment (Q/D/S), the cheapest place to
catch it, instead of discovering it reactively one bug/gap at a time. Evidence from
a GDPR-central consumer (abkf `QRSPI-HANDOVER-gdpr-surface.md`, 2026-07-27 — Belgian
kendo federation: participant PII, **minors**, **health documents**): it discovered
its obligations reactively across many changes (a privacy audit → `dsr-self-service`
export/erase/scheduled-deletion → `add-gdpr-audit-logging` → deferred
retention/consent/health-upload/subprocessor work → a live prod gap: a deleted
user's lingering JWT). Several were caught *only* because a human happened to ask "is
X covered?" A `privacy` surface turns those into **standing prompts on every
personal-data change** (audit-logged? does erase reach the new field? lawful basis?
retention? minors? transfers? DPIA?). **Non-goal:** not legal advice / a DPO
substitute — a structured "did you consider…" so the dimension is never silently
skipped.

**Section mappings (from the handover):** Q → a `## Personal data & privacy` section
(fields/categories incl. Art. 9 special-category, lawful basis, consent, retention,
erasure-reachability, audit hook, minors, transfers/sub-processors, DPIA); D → a
`## Privacy / GDPR` decisions block (data-minimization, retention/erasure design,
audit-hook, consent model, lawful basis) that become binding downstream constraints;
S/V → privacy requirements as **delta-spec requirements** ("erasure MUST anonymize
field X", "admin read MUST emit an audit entry") + cross-cutting hooks enumerated as
tasks rather than found post-PR.

**Distinct enough to be its own item (not folded into [[extend-surface-taxonomy]]):**
(1) it is a new *kind* of surface — a cross-cutting **compliance/governance** concern,
not a technical capability like that item's `cli`/`mq`/`storage` candidates — which is
the "taxonomy mixes different kinds of surface" observation [[rationalize-surface-taxonomy]]
already flags; (2) it needs a genuinely new mechanic every existing surface lacks — a
**per-change relevance trigger** ("does *this* change touch personal data?", vs the
current emit-whenever-declared model) plus an optional cheatsheet **personal-data
inventory** block (PII fields + which are Art. 9), which relates to
[[structured-surface-schema]]. **Built-in, not [[consumer-extensible-surfaces]]:**
GDPR is broadly applicable across consumer domains, unlike that idea's niche examples.

**Design tension (needs Q/D — do not pre-decide):** privacy's cross-cutting nature
makes **alarm-fatigue** sharper than for other surfaces — the emit-whenever-declared
MVP (consistent with today's surfaces, mitigated by an "N/A — no personal data"
fast-path) will fire on many non-PII changes, and rubber-stamped N/As kill the value.
The trigger heuristic (match a personal-data signal from the cheatsheet inventory /
touched files) mitigates it but is the hard part — so it is a *higher-priority*
follow-on for privacy than for a technical surface. Ship MVP consistent with existing
surfaces; treat the smart trigger + PII-inventory block as fast-follow. Unblocked —
the surface machinery already shipped (`repo-applicable-artifact-sections`,
`kit-surface-dogfooding`); the consumer offers concrete dogfood test cases
(`define-data-retention-policy`, `enforce-minor-parental-consent`,
`secure-health-document-uploads`, `document-subprocessors-and-dpas`). Surfaced by the
abkf consumer handover (2026-07-27).

### structured-surface-schema — `idea` · **P3**

**Why:** [[repo-applicable-artifact-sections]] deliberately reads a repo's tech
surface from *prose* (LLM inference over the `<repo>-stack` cheatsheet, silence
= absent), with only an optional `## Repo surface` block for determinism — no
machine-readable schema (a Non-Goal of that change). If prose inference proves
unreliable at scale, or a downstream tool wants to consume surface flags
programmatically, promote the surface declaration to a structured,
machine-readable schema/DSL (e.g. typed `data-store: absent` fields) with a
validator, rather than an optional free-form block. Weigh against the
two-source-of-truth caution — a structured block plus the prose it duplicates
can drift. Relates to [[optional-technology-specs]] (formal machine-validatable
artifacts) and [[reassess-openspec-dependency]]. Surfaced 2026-07-24 as a
Non-Goal of `repo-applicable-artifact-sections` (stage D).

### extend-surface-taxonomy — `idea` · **P3**

**Why:** [[repo-applicable-artifact-sections]] ships a closed 5-surface taxonomy
(`data-store`, `http-api`, `ui`, `auth`, `typed-nullable`) in the `repo-surface`
skill. The list is closed *by construction* — a surface exists only to gate a
cluster of the artifact **sections** the agents emit, and today those sections are
the CRUD/web set. To serve more repo types, grow the taxonomy — but each new
surface must be added **together with** the section(s) it gates (a surface that
gates no emitted section is inert). Candidate surface + section clusters to design
(each is a potential standalone change, or bundle a few):

- **`cli`** — command/flag surface, subcommand structure, exit codes, help/usage output.
- **`message-queue` / async-messaging** — topics/queues, delivery & ordering semantics, idempotency, dead-letter handling.
- **`background-jobs` / scheduling** — scheduled/worker tasks, retries, concurrency limits.
- **`object-storage` / filesystem** — blob/object stores, path layout, retention/lifecycle.
- **`caching`** — cache keys, invalidation strategy, TTL/staleness.
- **`observability`** — logging, metrics, tracing, alerting surfaces.
- **`infra` / deployment / IaC** — provisioned resources, deployment topology,
  environments; and the **deployable-resource lifecycle** a real consumer incident
  concretely motivates (abkf `dsr-self-service` retro, 2026-07-27): image
  distribution/rollout, identity registration, secret injection, and cross-context
  config parity. This is the surface-gated home for the deployment specifics that
  [[architect-real-runtime-done-decomposition]] deliberately keeps OUT of the
  generic architect prompt.
- **`ml-model`** — model artifacts, training data provenance, evaluation metrics, versioning.
- **`realtime` / streaming** — websockets/SSE/streaming endpoints, backpressure.

Each cluster needs the same treatment as the original five: a mapping row in
`repo-surface`, the gated section(s) in the relevant agent skeleton(s)/template(s),
and (if it introduces a heading a fenced skeleton must not hardcode) a Check 11
denylist entry. Surfaced 2026-07-24 during stage-I dogfooding of
`repo-applicable-artifact-sections` (the "could the surface list be bigger?"
question). Relates to [[structured-surface-schema]]. The kit's *own* self-surfaces
(the distinct "let this repo dogfood richer surfaces" flavor) split out into
[[kit-self-surfaces]] as a higher-value standalone.

### rationalize-surface-taxonomy — `idea` · **P3**

**Why:** The current `repo-surface` taxonomy is a flat list that mixes three
different kinds of surface: generic web surfaces (`data-store`, `http-api`, `ui`,
`auth`), Claude-plugin-shaped ones (`slash-command`, `stage-agent`, `skill`), and
repo-local kit ones (`lint-gate`, `template`, `migration-manifest`) — plus
`typed-nullable`, which gates only a PR-checklist item (no section heading).
Rationalize it: (1) **group** the three plugin surfaces under one coarser
`claude-plugin` / `llm-agent` surface; (2) **mark** `lint-gate` / `template` /
`migration-manifest` explicitly as repo-local (kit-specific) rather than
general-purpose; (3) **drop** `typed-nullable`. **Design tension (needs Q/D):**
each surface today gates a *distinct* artifact section, so collapsing three into
one either merges their inventory sections (coarser research/design output) or
needs sub-surface granularity to keep the per-artifact sections apart — resolve
before shaping. Distinct from [[extend-surface-taxonomy]] (which *adds* built-in
surfaces) — this one *prunes and regroups* the existing set; relates to
[[structured-surface-schema]] (the same "give the surface list a real shape" move)
and [[consumer-extensible-surfaces]]. Surfaced 2026-07-27 during the stage-PR
dogfood review of `researcher-surface-generic`.

### consumer-extensible-surfaces — `idea` · **P3**

**Why:** The surface taxonomy is **closed by construction** today — surfaces and
the artifact sections they gate are hardcoded in the kit's `repo-surface` skill
and lint arrays, so a consumer repo whose domain has a surface the kit never
imagined (a game engine's `scene-graph`, a compiler's `ir-pass`) cannot gate its
own artifact sections without forking the kit. Add a mechanism for a
**qrspi-enabled consumer repo to declare its own surfaces and the section(s) each
gates**, picked up per-repo at stage time (e.g. a consumer-side surface manifest
the `repo-surface` skill merges with the built-in taxonomy), so custom surfaces
flow through the questioner/designer/researcher gating without editing kit source.
**Design tension (needs Q/R/D):** the built-in Check 11 / Check 14 lint arrays are
the enforcement floor and cannot see consumer-defined headings, so consumer
surfaces need either a shipped validation path or an accepted "unenforced in the
consumer" trade; also weigh the two-source-of-truth risk. Distinct from
[[extend-surface-taxonomy]] (grow the *kit's* built-in list) and
[[rationalize-surface-taxonomy]] (restructure it) — this one makes the taxonomy
*open/extensible per consumer*; builds naturally on [[structured-surface-schema]]
(a machine-readable schema is the obvious carrier). Surfaced 2026-07-27 during the
stage-PR dogfood of `researcher-surface-generic`.

### per-surface-review-fanout — `idea` · **P3**

**Why:** The PR stage runs a **single** read-only reviewer. A review fan-out (N
reviewers in parallel over one diff) is the cheapest form of "more review" —
read-only, so no worktree machinery and near-zero added wall-clock; cost is
token-linear in N, mitigated by prompt-caching the shared diff/spec prefix. But a
*fixed generic panel* mostly wastes tokens: undirected reviewers cluster on the
same obvious findings, so you pay N× for ~1× coverage. The insight is that
**QRSPI already owns the diverse lens set** — the `repo-surface` taxonomy. Fan out
**one reviewer per *present* surface** (a `data-store` reviewer over migrations/
indexing/data-model, an `http-api` reviewer over the API contract, an `auth`
reviewer over authz, …), each scoped to the gated sections + code its surface
owns. Because surfaces are a *disjoint, closed* vocabulary the lenses can't
collapse into clones, and because width tracks *present* surfaces the cost
auto-scales to the repo (docs-only repo → 2 reviewers; full web app → 4) — you
never pay for absent surfaces. Symmetric with how the artifacts are produced (each
emits surface-gated sections; each reviewer reviews the sections it emitted).

**Shape:** In the PR (or Implement-checkpoint) reviewer, read the present-surface
list from the stack-cheatsheet's `## Repo surface` block (same source Check 14
uses), spawn one read-only reviewer subagent per present surface in a parallel
fan-out, each briefed on its surface's gated sections + matching code, then merge/
dedup findings. **Two gaps that must be designed, not assumed away:** (1) surfaces
gate *artifact sections*, not *all code* — a plain business-logic bug belongs to
no surface, so the fan-out needs a **non-surface baseline correctness reviewer** as
a floor (specialists + floor, not a partition); (2) the nastiest bugs live at the
**seams** (missing `auth` check on an `http-api` endpoint returning `data-store`
data) — a surface-scoped reviewer with tunnel vision can each pass while the
*interaction* is broken, so the baseline reviewer must be explicitly assigned the
cross-surface interactions. **Timing / band:** deferred **post-1.0** — the road-to-1.0
runway wants schema-freeze, not a new review subsystem, and there is **no observed
miss** yet justifying it; build only when a retro shows the single PR reviewer
letting a specific failure class through, and even then add the surface lens that
was missed rather than the whole panel. On a doc-heavy repo like the kit itself the
present surfaces (`slash-command`/`stage-agent`/`skill`/…) are lower-diversity than
the web surfaces, so the payoff is strongest on consumer repos. Relates to
[[hooks-as-mechanical-guards]] (the other "more enforcement at review time" line)
and the surface family ([[rationalize-surface-taxonomy]] /
[[structured-surface-schema]] — a machine-readable surface→section map would make
the per-surface reviewer briefing mechanical). Prior art: `dfrysinger/qrspi-plus`
runs an 8-reviewer tier, but *un-scoped by surface* and with no lint/human floor —
this entry is the QRSPI-native, surface-scaled version. Surfaced 2026-07-27 while
comparing QRSPI against the public `qrspi-plus` fork.

### assert-openspec-version-pin-coupling — `idea` · **P3**

**Why:** `openspec/config.yaml` carries an `openspec_version` field recording the
OpenSpec CLI version a consumer repo was scaffolded with, but its own comment
notes it is "informational only" and nothing asserts it stays coupled to the
kit's pinned OpenSpec version (the pin the README documents and lint Check 1
guards at the source). So a consumer's `openspec_version` can silently drift
from the kit's pin with no check noticing — the same "version marker rots
unnoticed" failure mode [[session-version-check-and-update-prompt]] fixes for
`.qrspi-version`, but for this parallel, un-enforced OpenSpec-CLI version field.
Add a mechanical guard (lint/CI, distinct from the session-time qrspi-version
check) that flags divergence. Surfaced as a Non-Goal of
[[session-version-check-and-update-prompt]] (stage D, 2026-07-23).

### dedicated-spec-sync-agent — `idea` · **P3**

> **Bundled into `spec-sync-contract`** (proposed) with
> [[sync-modified-delta-scenario-loss]] — this item is the vehicle; see the
> Proposed-section entry.

**Why:** The archive flow's delta-spec → main-spec sync is delegated to a
catch-all `general-purpose` subagent (with `*` — all tools), because that
`subagent_type` is hard-coded inside the *generated* `openspec-archive-change`
skill (which must not be hand-edited — it is regenerated from the OpenSpec CLI).
The sync only needs Read/Edit plus `openspec validate` on `openspec/specs/**`,
so a dedicated least-privilege agent (e.g. `qrspi:spec-syncer`) would be a
tighter fit: it can't wander outside the specs tree, and its system prompt could
carry the delta-merge contract (ADDED/MODIFIED/REMOVED/renamed semantics, "never
alter unrelated requirements") so the caller doesn't re-inject those rules each
run. The catch is *where* the fix lands: since the generated skill owns the
`general-purpose` spawn, the clean change is to have the `/qrspi:archive`
**command** (which the kit owns, in `claude/commands/`) perform the sync
delegation itself with the dedicated agent instead of deferring to the generated
skill's spawn — plus a new `claude/agents/spec-syncer.md`, its Read-Matrix row,
and lint Check 7 banner. Least-privilege +
convention-consistency (every other QRSPI stage has a named agent), not a live-
workflow correctness gap — hence P3. Surfaced 2026-07-16 while archiving
`progressive-task-ticking`. **Second motivation (2026-07-24, archiving
`right-size-followup-handling`):** command-owns-sync would also let
`/qrspi:archive` drop the near-redundant "Sync now / Archive without syncing"
prompt on the happy path — reserving a prompt for the escape-hatch cases only (a
malformed delta that would corrupt the main specs, or an abandoned/superseded
change) — since that prompt currently lives in the same un-editable generated
`openspec-archive-change` skill. Relates to
[[standardize-recurring-ops-scripts]] and [[retro-as-extension-plugin]] (both
concern the consumer/maintainer + generated-artifact boundary).

### sync-modified-delta-scenario-loss — `idea` · **P2**

> **Bundled into `spec-sync-contract`** (proposed) with
> [[dedicated-spec-sync-agent]] — this item is the P2 driver; see the
> Proposed-section entry.

**Why:** OpenSpec's `## MODIFIED Requirements` semantics replace a requirement
**wholesale** — body *and* every scenario. When an architect authors a MODIFIED
delta at stage S that lists only the new/changed scenarios (not re-stating the
existing carried-forward ones), the archive-time delta→main sync **silently
drops** those omitted scenarios from `openspec/specs/**`. Observed 2026-07-28
archiving [[unify-implement-paths-on-variants]]: the Check 15 MODIFIED delta
carried only the new (d)/(e) plugin.json/base-absent scenarios, so the sync
dropped the pre-existing (a)/(b)/(c) coverage scenarios (stray/missing variant,
extra-skill, effort-mismatch) — the lint *code* still enforces them, but the
standing contract stopped documenting them (hand-restored during that archive).
This silently erodes spec coverage exactly where the spec is supposed to be the
durable truth. Fix, cheapest first: (1) **architect guidance** — a MODIFIED
requirement MUST re-state the scenarios it intends to keep, not just the deltas;
(2) a **sync/lint guard** that warns when a MODIFIED requirement's post-sync
scenario count is lower than the pre-sync main spec's (a "did you mean to drop
N scenarios?" gate). Belongs with the delta-merge contract in
[[dedicated-spec-sync-agent]] (the natural home for encoding MODIFIED/REMOVED
semantics once). P2 (correctness — silent loss of contract coverage), not P3.

### pr-human-task-loop-stop-option — `idea` · **P3**

**Why:** The PR reconciliation gate in `claude/commands/pr.md` is asymmetric. The
**regular-task loop** offers a `Pause — let me check the code first` choice with a
defined early-exit commit that ends the turn; the **`(human)`-task loop** offers
only `Confirm-done` / `Drop` / `Leave-for-now` — none of which halts the gate. A
human who wants to stop the human-task review partway (e.g. to go run the live
dev-install verifications before deciding, rather than clicking `Leave-for-now`
through every remaining item) has no clean exit. Add a `Pause/Stop the review`
choice to the `(human)`-task loop that reuses the regular-task loop's early-exit
commit (commit any edits already made, end the turn with a "re-run `/qrspi:pr`
when ready" message). Mirror the change into the workflow-skill choreography if
the loop wording lives there. Surfaced
2026-07-23 during the PR stage of [[session-version-check-and-update-prompt]],
whose change embeds many `(human)` live-session checks that made the missing
exit obvious.

### richer-askuserquestion-formats — `idea` · **P3**

**Why:** Every QRSPI gate uses `AskUserQuestion` in its plainest single-select,
text-only form, but the tool also supports `multiSelect` (pick N of M) and
`preview` (side-by-side rendered markdown/mockups per option). Several gates map
naturally onto these: the surface-subset / present-set style "which of these N?"
questions and the **backlog-capture offers** in Q/D/S (today an *offer-per-item*
loop) are textbook `multiSelect`; section-name choices and design decisions with
competing concrete shapes (a heading layout, a code snippet, a table form) are
where `preview` adds real signal over prose. Needs its own Q/R/D: `multiSelect`
**removes** the deliberate one-at-a-time cadence that the "offer, never
auto-append" backlog rule and the per-decision D review rely on, so it is not a
blanket swap — the work is identifying which gates genuinely benefit, then
updating the `workflow` skill choreography and the command bodies that prescribe
those prompts. Relates to [[pr-human-task-loop-stop-option]] (both refine
AskUserQuestion gate ergonomics). Part of the Claude Code capability cluster
anchored by [[hooks-as-mechanical-guards]]. Surfaced 2026-07-25.

### github-mcp-for-pr-ops — `idea` · **P3**

**Why:** The PR and archive stages shell out to the `gh` CLI (PR-status check,
`gh pr create`, the merge-gate query) with the cross-platform/auth caveats
CLAUDE.md notes. A **GitHub MCP server** exposes those operations as structured
tools instead of shell invocations — more portable, no `gh` binary/auth
assumption in consumer repos. Direct alternative mechanism for the PR-status and
PR-create helpers [[standardize-recurring-ops-scripts]] wants to extract.
**Research before committing:** (a) whether an MCP dependency is an acceptable
consumer install burden vs. the Node-helper path, and which ops actually benefit;
(b) token-usage-vs-quality — MCP tool schemas load into context (a token cost per
tool exposed) and headless/cron runs may lack an interactively-authenticated MCP
server, so weigh reliability against the `gh` status quo. Part of the Claude Code
capability cluster ([[hooks-as-mechanical-guards]]). Surfaced 2026-07-25.

### scheduled-backlog-hygiene — `idea` · **P3**

**Why:** Several kit-maintenance chores are "remember to do it" today: running
`/qrspi-readme-audit` after source drift, the [[backlog-prioritization]]
re-evaluation pass, and detecting stale in-flight changes. Claude Code
**scheduled/cron agents (routines)** could run these on a cadence and open a PR or
surface a summary. **Research before committing:** (a) which chores are safe to
automate vs. need a human in the loop, and where the schedule definition lives
(this repo only — it is maintainer tooling, cf. [[retro-as-extension-plugin]]);
(b) token-usage-vs-quality — a recurring cloud agent spends tokens every run
whether or not there is drift, so weigh cadence against a cheaper event-triggered
or on-demand check. Part of the Claude Code capability cluster
([[hooks-as-mechanical-guards]]). Surfaced 2026-07-25.

### research-websearch-external — `idea` · **P3**

**Why:** Stage R is codebase-only. For a change that integrates a third-party
API/library, letting the researcher use **WebSearch/WebFetch** to pull the
official docs would ground the design in the real external contract rather than
the agent's memory of it. Opt-in and bounded — most kit changes touch no external
surface. **Research before committing:** (a) how to scope *when* R may go external
without eroding the ticket-blind discipline, and where the allowance is expressed
(a research-area flag from the orchestrator?); (b) token-usage-vs-quality —
fetched pages are large and can blow the R context budget [[context-budget]]
guards, so weigh grounding value against the read footprint (summarise-then-
discard?). Relates to [[optional-technology-specs]] (formal external-contract
artifacts). Part of the Claude Code capability cluster
([[hooks-as-mechanical-guards]]). Surfaced 2026-07-25.

### pr-md-tracks-superseding-pr — `idea` · **P3**

**Why:** When a change's PR is closed unmerged and a *new* PR is later opened for
the same change, `openspec/changes/<id>/pr.md` still points at the stale closed
PR — so the archive merge-gate ([[archive-requires-merged-pr]]) queries the wrong
PR and reports "not merged" even after the replacement PR merged. Have
`/qrspi:pr` update `pr.md` when it opens a superseding PR. Surfaced as a Non-Goal
of `archive-requires-merged-pr` (its Q5).

### validate-pr-md-shape — `idea` · **P3**

**Why:** `pr.md`'s canonical six-field shape (`PR:`/`URL:`/`Title:`/`Source
branch:`/`Target branch:`/`Created:`, prescribed in `claude/commands/pr.md`) is
not validated anywhere; archived examples show real format drift, forcing
downstream consumers (the archive merge-gate in [[archive-requires-merged-pr]],
which must parse the PR number defensively) to tolerate non-canonical shapes. Add
a lint/guard that enforces the shape at source. Surfaced as a Non-Goal of
`archive-requires-merged-pr`.

### optional-technology-specs — `idea` · **P3**

**Why:** QRSPI delta specs today are stack-agnostic `Requirement` + `Scenario`
markdown (WHEN/THEN). For changes that expose a concrete technical surface, a
formal industry-standard artifact would be more precise and machine-validatable
than prose — e.g. **OpenAPI** for HTTP APIs, **gRPC `.proto`** for RPC contracts,
**Gherkin `.feature`** for executable acceptance criteria. Let a change
**optionally** attach one or more such artifacts alongside its markdown spec (not
replacing it — the requirement/scenario spec stays the human-review surface and
the universal format for changes with no API/RPC/BDD surface, e.g. this repo's
own command files). When present, QRSPI's validate step should run the matching
linter/compiler (openapi validate, `protoc`, a Gherkin parser) so the formal
artifact can't silently drift. Kept as one item because the mechanism is shared:
a per-change convention for where these live and how they're validated, with the
specific formats as pluggable instances. Watch the two-source-of-truth risk —
prefer generating from or cross-checking against the markdown spec rather than
maintaining both by hand. Relates to [[reassess-openspec-dependency]].

### multi-repo-central-specs — `idea` · **P3**

**Why:** QRSPI is scoped per repo today — `openspec/` (specs, changes, backlog)
lives inside the one repo it governs. A solution that spans multiple repos
(e.g. a service + its clients, or a set of microservices) has no home for
cross-repo specs and no shared backlog; each repo runs its own isolated flow.
Support a multi-repo topology with a **central spec repository** that holds the
shared/contract-level specs and backlog, with the individual sub-repos consuming
or referencing them.

**Open question (unresolved):** whether the sub-repos should *also* carry their
own `openspec/` specs. Options to weigh: (a) central-only — sub-repos hold no
specs, all specs live centrally; (b) split — cross-repo contracts live centrally,
repo-local behavior specs stay in each sub-repo, with a link/reference mechanism
between them; (c) mirror — central is the source of truth and sub-repos hold a
generated/pinned copy. Each has a different drift and ownership story. Needs the
Q/R/D stages to resolve before shaping. Note the natural fit with
[[optional-technology-specs]]: cross-repo contracts (OpenAPI, proto) are exactly
the kind of shared artifact a central spec repo would hold.

### retro-as-extension-plugin — `idea` · **P3**

**Why:** The retrospective tooling — the `/qrspi:retro` command and the
`retrospective` skill — ships inside the base `qrspi` plugin, but it is
**kit-maintenance** tooling, not something a consumer runs against their own repo:
the retro's whole job is to edit the kit's own `claude/` command/skill/template
sources (which exist only in this repo, not in an installed consumer). Bundling it
bloats the consumer-facing plugin and blurs the consumer/maintainer boundary.
Split it into a **separate plugin that extends/depends on the base `qrspi`
plugin**, so the base stays lean (just the eight-stage workflow consumers actually
run) and maintainers opt into the retro tooling. Open questions: does Claude Code's
plugin model support plugin-to-plugin dependency/extension (or just a standalone
sibling plugin sharing the marketplace)? Does the same argument extend to other
kit-only meta-tooling — audit whether anything else in the base plugin is
maintainer-only (note `readme-audit` is already `.claude/`
dev-tooling, not plugin-shipped, so likely already on the right side). Surfaced
during `add-auto-mode`'s stage-I/PR retro.

### reassess-openspec-dependency — `idea` · **P3**

**Why:** The source only asks to "persist to disk," but the kit pins an external
OpenSpec CLI (npx, a version pin spread across files, a CI lint to police it) to
gain `openspec validate` on the delta specs. (`openspec/specs/` is now populated
as of the 2026-06-19 archives, so the validated surface is real — re-weigh the
dependency against a vendored folder convention + a small validator with that in
mind.)

**Folded-in concern — qrspi-branded workspace folder (2026-07-28):** a related
want is renaming the `openspec/` workspace root to `qrspi/` for the road-to-1.0
rebrand. It is *not* a free cosmetic rename: `openspec/` is the OpenSpec CLI's
hardcoded workspace root (`openspec init`/`validate`/`status --json` and the
generated archive/sync skills all assume it), so QRSPI cannot rename it
unilaterally. Two paths, both landing here: (a) OpenSpec upstream adds a
**configurable workspace root** (unverified whether the current CLI exposes
this — needs checking against its config surface, `openspec/config.yaml`); or
(b) dropping the CLI for the vendored convention + small validator this entry
already weighs, at which point QRSPI owns the folder name outright. Ties to the
[[rename-qrspi-to-qrnchi]] rebrand vehicle. Surfaced as a user question during
the `spec-sync-contract` D stage.

### tutorial-mode-coaching-overlay — `idea` · **P3**

**Why:** Follow-up to `tutorial-mode-narrated-tour` once the tour format proves
out (higher build cost). A `/qrspi:learn` mode that runs the *real* stages on the
user's *own* repo, but with extra inline coaching at each stage ("what's happening
here / what you should check before continuing") and explicit pauses at the human
gates (design approval, commit, next-stage handoff). The payoff is learning on
productive work — the training wheels come off naturally as the first real change
ships. More invasive to build than the tour because it wraps the live command path
rather than narrating a static artifact set.

### qrspi-release-auto-stub-manifest — `idea` · **P3**

**Why:** `/qrspi-release` precondition 4 halts when the release version's
`migrations/<version>.yaml` is missing, but the human must write the stub by
hand. Have the release skill offer to auto-generate a "no consumer action" stub
(empty `automated`/`manual`, placeholder `summary`) when absent, so a routine
release doesn't require a manual file. Surfaced by `versioned-update-command`
PR review (non-blocking).

### update-walk-resume-idempotency — `idea` · **P3**

**Why:** `/qrspi:update`'s hybrid walk has no mid-run checkpoint — aborting
mid-walk re-applies already-run `edit-file` steps on the next run, so
non-idempotent steps (e.g. `append`) can double-apply. The skill warns about
this today. Add per-version resume state (or a completed-versions marker) plus
idempotency guidance for manifest authors. Surfaced by `versioned-update-command`
PR review (non-blocking).

### compute-annotation-presence-lint — `idea` · **P3**

**Why:** `per-slice-compute-knobs` ships lint Check 13 as **value-validation only** —
it checks that a `**Compute:**` line's values are valid (`model` in `{sonnet, opus}`,
`effort` in `{low, medium, high}`) *if the line exists*, but does not assert that
every slice actually carries one. So a slice authored with no `**Compute:**` line
passes lint and only fails at runtime when `implement` hits it (the orchestrator
hard-stop). Promote the check to also assert **presence on every slice** — which
requires parsing slice boundaries (`### Slice N` in `slices.md`, `## N.` in
`tasks.md`) and confirming each block has a `**Compute:**` line. Kept separate
because boundary-parsing is more involved than the value scan, and the runtime
hard-stop is a sufficient backstop for now. Deferred as a Non-Goal of
`per-slice-compute-knobs` (stage D, D6, 2026-07-25). Sibling to
[[content-lint-output-contract]] (the same existence→content lint-promotion move).

**Bundle:** proposed to ride with [[decompose-tasks-md-per-slice]] (P2) in one
QRSPI run — that change builds the `tasks.md` slice-boundary parser this check
needs, and its per-slice-file split reshapes the check into a per-file scan. See
that entry's Bundle note for the full rationale. Reassessed 2026-07-27.

### content-lint-output-contract — `idea` · **P3**

**Why:** [[context-budget]] ships an existence-only lint (Check 12) that asserts
each stage agent carries an `> **Output contract**` banner but does **not** parse
or enforce the banner's *content* — a banner could claim a bound (e.g. "5-line
summary, no file bodies") while the agent's actual return drifts well past it, and
nothing would catch it (existence-only was the settled PQ3 scope for that change).
If that drift appears in practice, promote Check 12 to a content-level check that
parses a machine-readable bound from the banner (e.g. `max-lines: N`) and asserts
the declared cap is present/consistent. Weigh the brittleness PQ3 flagged: a
parsed cap is a second source of truth that can itself drift from the real return.
Surfaced 2026-07-24 as a Non-Goal of `context-budget` (stage D).

### rename-qrspi-to-qrnchi — `idea` · **P3**

**Why:** The plugin name `qrspi` is the acronym of its own stages (Q-R-S-P-I,
pronounced "crispy", from RPI lineage). Rebrand to **`qrnchi`** (pronounced
"crunchy"), preserving that property by re-lettering three stages so the initials
still spell the name — plus friendlier vocabulary: a workflow run becomes a
**"crouton"**, with the tagline *"If you wish to make a bread from scratch, you
must first bake a crouton."*

**Shape:** One big change spanning the whole surface — plugin manifest, the
`/qrnchi:*` command namespace, three stage re-letters (Design→**Nail** N,
Structure→**Chart** C, Slices→**Hew** H; the command files rename but the
artifacts keep their descriptive names — `design.md`, `proposal.md`, `slices.md`
all stay), agents/skills/templates,
`scripts/lint.mjs`, and README/CONTRIBUTING/CLAUDE.md. Because it's a *published*
plugin, it is **breaking**: ship as a `migrations/<v>.yaml` entry (rename only the
`openspec/.qrspi-version` marker → `.qrnchi-version`) with the
`qrnchi-version-check` bridged to detect the legacy marker, plus a final `qrspi`
deprecation-shim release and a marketplace slug change (maintainer hand-offs).
Recommend cutting it as **v1.0.0** (breaking namespace change). Full design,
acronym mapping, migration bridge, and ordered file inventory:
[openspec/backlog/rename-qrspi-to-qrnchi.md](backlog/rename-qrspi-to-qrnchi.md).
Relates to [[retro-as-extension-plugin]] (consumer/maintainer boundary).
