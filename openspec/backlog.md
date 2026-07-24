# Backlog

Candidate changes for this repo, tracked before they enter the QRSPI flow
(Q → R → D → S → V → P → I → PR). Status is one of `idea` / `proposed` /
`in-progress` / `merged`. Completed work lives under
`openspec/changes/archive/`, not here.

## In progress

### repo-applicable-artifact-sections — `in-progress (Q, R, D, S, V, P, I complete)` · **P1**

In progress 2026-07-24 (branch `features/repo-applicable-artifact-sections`; all
implementation slices 1–4 committed; 9 `(human)` dogfood tasks in `tasks.md`
pending; next stage `/qrspi:pr`). See
`openspec/changes/repo-applicable-artifact-sections/`.

**Why:** QRSPI artifact-producing stages (Q/D/S/P/PR) stamp a fixed CRUD/web
section & checklist skeleton (Data model, API surface, Migrations, Auth, "no raw
SQL", "endpoints use authorization policies", …) into **every** generated
artifact regardless of the repo's actual surface — a highly visible, ugly defect
that lands in every document a human reads. Make each artifact carry only the
sections/checks applicable to the repo (and the change), driven off the
`<repo>-stack` cheatsheet as the source of truth for the repo's tech surface.

**Scope (settled at Q):** never emit "Not applicable" sections at all — a section
appears only when it applies, at **both** the repo level and the change level
(PQ1/PQ2); this fully retires the "keep N/A headings so S doesn't re-litigate"
rule. No-cheatsheet repos get the full menu + a warning pointing to `/qrspi:stack`
(PQ3). Ships as **one big change** spanning the pipeline including Part B skill
framing (PQ4): the (A) skeleton sources — `claude/agents/{questioner,designer,
architect,planner,reviewer}.md` + `openspec-templates/{questions,design,proposal,
tasks}.template.md` — and (B) framing in `claude/skills/{vertical-slice,workflow}/
SKILL.md`. The filter convention lives in a shared skill loaded by all five agents
(PQ6), a new `scripts/lint.mjs` check (scoped to fenced skeleton blocks) guards
against regressions (PQ5), and the change also establishes a `qrspi-stack`
cheatsheet for the kit itself so it dogfoods its own fix (PQ7). Surfaced
2026-07-23 reviewing `right-size-followup-handling`. Relates to
[[init-conductor-plus-overview]].

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
drifts from the spec it quotes; the id *points*, the spec *says*. Relates to
[[enforce-d-number-tags-in-slices]] (the inverse traceability link — `(D<n>)` tags
bind slices back to design; this binds code forward to specs) and to the
two-source-of-truth caution in [[optional-technology-specs]]. **P1 like
[[repo-applicable-artifact-sections]]:** a highly visible artifact-quality defect
(ugly process references baked into shipped code) rather than a live-workflow
correctness gap. Surfaced 2026-07-24.

### trim-per-stage-context-loading — `idea` · **P1**

**Why:** Per-run token burn is dominated by **input** — what each QRSPI stage
auto-loads (the `<repo>-stack` skill + the workflow/convention skills) plus the
files its subagent reads — yet nothing audits or caps that surface.
`context-hygiene` states the principle (keep windows under 40%, subagents as
context firewalls) but enforces nothing, so the per-stage load creeps silently as
skills, agents, and templates accrete, and every stage of every change pays it.
This is the single biggest lever on the runaway token cost.

**Shape:** Audit the per-stage load surface — which skills each stage
command/agent auto-loads, and the typical read footprint — and trim each stage to
only what it needs (not every stage needs every skill; scope reads by stage). Add
a lightweight visibility signal (e.g. log context% at stage entry) so regressions
are noticeable, and consider a `scripts/lint.mjs`-style check that a stage loads
only its declared skill set. Relates to `context-hygiene` (the standing principle
this makes measurable/enforced), [[enforce-research-ticket-hiding]] (the same
"guard, don't just ask nicely" move applied to a reader's inputs),
[[bounded-subagent-return-summaries]] (the complementary output-side lever), and
[[configurable-effort-and-thinking]] (the compute-side lever). **P1 under the
recurring token/cost band:** not a correctness gap, but a systemic per-run cost
defect that compounds on every stage of every change. Surfaced 2026-07-24 (token
burn flagged as climbing).

### bounded-subagent-return-summaries — `idea` · **P2**

**Why:** Every QRSPI stage delegation returns its subagent's final message into
the **main-loop** context, and nothing bounds that payload — a verbose return
re-inflates exactly the context the subagent firewall exists to protect, undoing
part of the delegation's token benefit. Establish a convention that each stage
subagent hands back a **bounded, structured** result — the artifact path, a short
N-line summary, and the next command — not free-form prose. Small, low-cost,
always-on lever on the output side (complements input-side
[[trim-per-stage-context-loading]]). Could ride each agent file's output-contract
section, with a lint asserting the return-contract wording is present. Surfaced
2026-07-24 (token burn flagged as climbing).

### simplify-per-slice-model-selection — `idea` · **P2**

**Why:** Per-slice model intent is endorsed by the source, but the mechanism (the
architect writes a markdown `**Model:**` annotation; the implementer self-halts and
asks to be re-invoked when on the wrong model) is fragile.
Consider a simpler lever or a single implement-stage model. **Reprioritized
P3→P2 (2026-07-24):** running mechanical slices on a cheaper model is a direct
token/cost lever, now salient with burn climbing — and it's the mechanism
[[configurable-effort-and-thinking]] wants to ride, so it sequences first.

### configurable-effort-and-thinking — `idea` · **P2**

**Why:** A change can already set a per-slice **model** (the architect writes a
`**Model:**` annotation the implementer honors), but reasoning **effort** and
**thinking budget** are not similarly configurable — they inherit whatever the
invoking session defaults to. That leaves tokens on the table in both
directions: mechanical slices could run at low effort with no extended thinking,
while the design-adjacent "brain surgery" work wants high effort and a large
thinking budget. Consider making effort and thinking declarable alongside model
(per-slice, or as a stage-level knob) and have the stage command/agent pass them
through on delegation. Weigh against [[simplify-per-slice-model-selection]],
which argues the existing `**Model:**` annotation is already too fragile — any
effort/thinking lever should ride the same (simpler) mechanism rather than
bolting on a third fragile markdown knob. **Reprioritized P3→P2 (2026-07-24):**
effort/thinking is a direct token lever and token burn is now the pressing
concern.

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

### enforce-research-ticket-hiding — `idea` · **P2**

**Why:** Ticket-hiding (the source's most important rule) is enforced only by
telling the researcher not to open `questions.md`, though it has Read on the whole
repo -- the "persona, not mechanism" anti-pattern `context-hygiene` itself warns
against. Consider a mechanical guard.

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

### standardize-recurring-ops-scripts — `idea` · **P2**

**Why (two payoffs — consistency *and* token cost):** Several QRSPI operations
recur across changes, and today the agent re-derives "the best method" each run.
That has two costs. (1) **Consistency** — the re-derivation risks drift, so the
same op runs slightly differently run-to-run. (2) **Token/exploration cost** —
computing a deterministic fact by reading files and reasoning through an approach
spends tokens each run that a single `node scripts/foo.mjs` call could return in
one tool result; this is the fourth token lever alongside input load
([[trim-per-stage-context-loading]]), output payload
([[bounded-subagent-return-summaries]]), and compute
([[configurable-effort-and-thinking]]) — it targets the **reasoning/exploration**
axis. The kit already proves the fix — [`scripts/lint.mjs`](scripts/lint.mjs) is a
recurring mechanical task extracted to a Node script. Extend that pattern to the
**deterministic** recurring ops so stage
commands call a helper instead of reinventing it: "does the linked PR show
`merged`?", "create the PR from this title/body template", "flip a backlog entry's
status", "list open items in `tasks.md`/`followups.md`". Direct enabler for
[[archive-requires-merged-pr]] (the PR-status check) and
[[pr-review-open-tasks-and-followups]] (PR-create + open-item enumeration) — do
those first and the first one or two helpers worth extracting fall out naturally.

**Scope boundary — mechanical, not judgment.** Script only ops with one correct
answer; leave decisions (finish/defer/drop a task, reprioritize, approve a design)
to the human/agent. The script supplies the *fact*; the caller makes the *call*.
Two constraints: (1) **Node, not shell** — per CLAUDE.md the permission checker
rejects shell-injection in slash commands, so helpers follow the lint
precedent. (2) **A shipped runtime helper is a bigger commitment than a CI-only
script** — lint runs in this repo's CI, but a helper a stage command invokes
at runtime ships into consumer repos and inherits their `gh`/auth availability and
cross-platform concerns; be deliberate about that split.

### lint-auto-mode-gate-coverage — `idea` · **P2**

**Why:** `add-auto-mode` introduces a convention that every stage command must
reference the run-mode procedure in the `workflow` skill; a future command that
silently drops that reference would quietly fail to suppress (or keep) a gate in
auto mode. A structural `scripts/lint.mjs` check could assert the reference and
per-gate auto-branch wiring stays consistent — the runtime suppression itself is
not statically checkable. Surfaced by `add-auto-mode` stage D (offered, not built).
Low-cost correctness guard (hence P2, not P3). Now **unblocked** — `add-auto-mode`
merged 2026-07-06 (archived), so the convention it enforces is live.

### enforce-artifact-surface-applicability — `idea` · **P2**

**Why:** [[repo-applicable-artifact-sections]] ships lint Check 11, which only
catches *hard-coded* CRUD headings sitting literally in an agent's fenced
skeleton block (a static string denylist over the kit's source). It cannot
validate that a *generated* artifact's emitted sections actually match the
repo's declared surface — that needs a live parse of the `<repo>-stack`
cheatsheet's `## Repo surface` block, which lint has no access to today. Add a
this-repo CI check that parses the kit's own `qrspi-stack` surface block and
asserts the kit's committed `openspec/changes/**` artifacts carry no sections
for absent surfaces (validating OUTPUT vs declared surface). Low-cost
correctness guard sequenced behind `repo-applicable-artifact-sections` (hence
P2, like [[lint-auto-mode-gate-coverage]]). **Scope boundary:** this is the kit
linting its *own* artifacts; pushing the same enforcement into *consumer* repos'
CI is the separate shipped-runtime-helper problem tracked in
[[standardize-recurring-ops-scripts]]. Surfaced 2026-07-24 as a Non-Goal of
`repo-applicable-artifact-sections` (stage D).

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
- **`infra` / IaC** — provisioned resources, deployment topology, environments.
- **`ml-model`** — model artifacts, training data provenance, evaluation metrics, versioning.
- **`realtime` / streaming** — websockets/SSE/streaming endpoints, backpressure.

**Kit-specific self-surfaces (a distinct flavor, surfaced 2026-07-24).** The five
web surfaces leave *this* kit repo with **no present surfaces**, so its own QRSPI
artifacts fall to the always-emitted minimum. But the kit has real surfaces of its
own that could gate genuinely useful sections for kit changes — e.g.
**`slash-command`** (a change adds/renames a `/qrspi:*` command → a command-surface
+ README-sync section), **`stage-agent`** (touches an agent read-contract / the
Read Matrix), **`skill`**, **`template`**, **`lint-gate`** (`scripts/lint.mjs`
checks), **`migration-manifest`** (`migrations/<v>.yaml` needed for a release).
Adding these would let the kit dogfood richer self-surfaces (its `qrspi-stack`
`## Repo surface` block would then list present surfaces instead of none). Same
add-surface-with-its-sections mechanism as above.

Each cluster needs the same treatment as the original five: a mapping row in
`repo-surface`, the gated section(s) in the relevant agent skeleton(s)/template(s),
and (if it introduces a heading a fenced skeleton must not hardcode) a Check 11
denylist entry. Surfaced 2026-07-24 during stage-I dogfooding of
`repo-applicable-artifact-sections` (the "could the surface list be bigger?"
question). Relates to [[structured-surface-schema]].

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

### enforce-d-number-tags-in-slices — `idea` · **P3**

**Why:** `tighten-stage-read-boundaries` makes embedding `(D<n>)` decision tags in
every `slices.md` bullet a *prose* "required output rule" (its D3), and removes the
planner's/implementer's `design.md` fallback (D2/D4). So a missing `(D<n>)` tag now
silently breaks the design→task traceability chain with nothing to catch it. Add a
structural `scripts/lint.mjs` check (or heading assertion) that every slice bullet
which implements a decision carries its tag, mechanically enforcing D3. Flagged in
that change's design Risks section as "not this change".

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
