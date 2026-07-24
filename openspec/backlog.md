# Backlog

Candidate changes for this repo, tracked before they enter the QRSPI flow
(Q → R → D → S → V → P → I → PR). Status is one of `idea` / `proposed` /
`in-progress` / `merged`. Completed work lives under
`openspec/changes/archive/`, not here.

## In progress

### right-size-followup-handling — `in-progress (Q, R, D, S, V, P, I complete)` · **P2**

**Why:** `/qrspi:followup` (the `postpr-fix` skill) has a single hard-coded
path — delegate to the implementer in FIX MODE for a small, atomic post-PR fix
— but not every follow-up is that small, and forcing a large one through the
small-fix path patches blind (no re-alignment, specs drift). The command should
first **right-size** the follow-up and pick one of three paths: (1) **implement
directly** — call the implementer and, when the fix changes behavior, adapt the
change folder's DELTA specs in place (today's flow, correct for small fixes);
(2) **addendum flow** — for a follow-up big enough to need re-alignment, spin up
an addendum that re-enters the QRSPI pipeline from an earlier stage (any of
Q/R/D/S/V/P/I) rather than patching without a plan; (3) **defer** — when it is
really new scope, drop it here as a backlog idea instead of squeezing it into
the current change. The triage itself is a size/scope judgment, kept
human-in-the-loop, added up front so a large follow-up isn't silently run
through the small-fix path. Relates to [[pr-review-open-tasks-and-followups]].

**Likely shape (after Q):** Changes to `claude/commands/followup.md` (insert
triage gate before handing off to the implementer), `claude/skills/postpr-fix/SKILL.md`
(possibly a brief three-path overview or pointer), and the `workflow` skill's
"After PR — the fix loop" section. Regenerated `copilot/` tree via
`sync-copilot.mjs`. No data-model, API, or migration changes — pure
prompt/skill/command edits.

---

## Proposed

_None._

---

## Ideas

Listed in priority order (highest first). Each carries a `P1`–`P3` band:
**P1** = correctness/safety of the live workflow, or a highly visible defect in
every generated artifact — do next;
**P2** = high-value enhancements, larger or lightly dependent;
**P3** = strategic bets or items sequenced behind another change. Re-evaluate
this ordering whenever an item is added, modified, or archived (see
[[backlog-prioritization]]).

### repo-applicable-artifact-sections — `idea` · **P1**

**Why:** QRSPI artifacts should carry **only sections and checks applicable to
the repository (and the change)** — not a fixed CRUD/web skeleton that every
document reproduces regardless of what the repo is. The boilerplate assumes a
data-store + HTTP + web-UI app, so on a docs/prompt project like this kit it
emits content that has nothing to do with the change or the repo. **This is a
highly visible, ugly defect** — it lands in *every* generated artifact a human
reads (questions, design, proposal, tasks, and the PR body itself), so despite
being artifact-quality rather than a live-workflow correctness gap, it is P1 to
fix. A sweep (2026-07-23) found it baked in across **most of the pipeline**, in
two kinds:

**(A) Fixed section/checklist skeletons emitted verbatim into artifacts** — the
core problem. The same CRUD/web section list is reproduced by every artifact-
producing stage:
- **Q — `claude/agents/questioner.md` + `openspec-templates/questions.template.md`.**
  Fixed list (Data model, Indexing & query performance, API surface, State,
  Migrations & seed data, Auth) stamped `Not applicable` per section — seven
  near-identical stanzas in `right-size-followup-handling`'s `questions.md`,
  several just restating the label ("No entities, tables, or DTOs. Not
  applicable to this repo.").
- **D — `claude/agents/designer.md` + `openspec-templates/design.template.md`.**
  Mirrors it with `## Data model changes` / `## API surface` / `## UI surface`
  / `## Authorization` sections.
- **S — `claude/agents/architect.md` + `openspec-templates/proposal.template.md`.**
  `Impact — Migrations: <yes/no>` line.
- **P — `claude/agents/planner.md` + `openspec-templates/tasks.template.md`.**
  Seeds a "Generate the data-store migration (D6)" task line.
- **PR — `claude/agents/reviewer.md`.** Hard-codes a `## Migrations` section and
  checklist items — "No raw SQL in feature code", "No nullable suppression
  (`!`) without justification comment", "All new endpoints use authorization
  policies", "Migration is reversible" — none of which can apply to a repo with
  no SQL/DB/endpoints.

**(B) CRUD/web-shaped *illustrative framing*** — softer, not emitted boilerplate
but web-app-shaped examples/vocabulary that bias the agent and read oddly for a
non-web repo: `claude/skills/vertical-slice/SKILL.md` (the whole mock-API →
entity → migration → DTO slice example set), the architect's slice examples
(`entity + migration + seed`, "all the endpoints"), and
`claude/skills/workflow/SKILL.md` ("touches the data model, an API surface, or
auth" as the full-pipeline trigger; the researcher "maps the data model"). Fix
this more lightly — examples need *some* concrete domain — but at least flag
that these are illustrative, not a required shape.

**The tension to resolve:** the questions template deliberately keeps N/A
headings "so stage S doesn't re-litigate whether they were considered"
(`openspec-templates/questions.template.md`). That rule guards the wrong
scope — it makes sense **per change** (a dimension a given change skipped could
apply to the next one), but not **per repo** (a dimension the repo can never
have). Separate the two levels: dimensions permanently absent at the **repo**
level are simply not sections/checks anywhere, while "considered but N/A for
*this* change" keeps its explicit heading. The natural source of truth for
"does this repo have a data-store / HTTP / web-UI surface at all" is the
`<repo>-stack` cheatsheet, which already declares the tech surface — every
stage that emits a fixed section/checklist list should filter it against that.

**Shape:** Take the whole thing up as **one big change** spanning the pipeline
rather than per-stage patches — the fix is a single shared convention (a
section/checklist list is a *starting menu filtered by repo surface*, not a
fixed skeleton every artifact reproduces) applied consistently at Q/D/S/P/PR.
Touches the (A) skeleton sources — `claude/agents/questioner.md`,
`claude/agents/designer.md`, `claude/agents/architect.md`,
`claude/agents/planner.md`, `claude/agents/reviewer.md` and the four templates
`openspec-templates/{questions,design,proposal,tasks}.template.md` — and,
lightly, the (B) framing sources (`claude/skills/vertical-slice/SKILL.md`,
`claude/skills/workflow/SKILL.md`). The `<repo>-stack` cheatsheet is the
filter's source of truth. Regenerate the `copilot/` tree via
`sync-copilot.mjs` at the end. Highly visible artifact-quality defect in every
generated artifact — hence P1 despite not being a live-workflow correctness
gap. Surfaced 2026-07-23 reviewing `right-size-followup-handling` (questions.md
N/A stanzas; irrelevant PR-checklist items). Relates to
[[init-conductor-plus-overview]] (the overview/stack skills are where "what
surface does this repo have" would live).

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
updating (per the CLAUDE.md "keep the README current" rule), plus the regenerated
`copilot/` tree. Relates to [[multi-repo-central-specs]] (a central spec repo
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

**Why:** Several QRSPI operations recur across changes, and today the agent
re-derives "the best method" each run (which risks drift and costs re-exploration).
The kit already proves the fix — [`scripts/lint.mjs`](scripts/lint.mjs) and
[`sync-copilot.mjs`](sync-copilot.mjs) are recurring mechanical tasks extracted to
Node scripts. Extend that pattern to the **deterministic** recurring ops so stage
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
rejects shell-injection in slash commands, so helpers follow the lint/sync
precedent. (2) **A shipped runtime helper is a bigger commitment than a CI-only
script** — lint/sync run in this repo's CI, but a helper a stage command invokes
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
lint Check 7 banner, and the regenerated `copilot/` tree. Least-privilege +
convention-consistency (every other QRSPI stage has a named agent), not a live-
workflow correctness gap — hence P3. Surfaced 2026-07-16 while archiving
`progressive-task-ticking`. Relates to [[standardize-recurring-ops-scripts]] and
[[retro-as-extension-plugin]] (both concern the consumer/maintainer + generated-
artifact boundary).

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
when ready" message). Mirror the change into the generated `copilot/` PR prompt
and the workflow-skill choreography if the loop wording lives there. Surfaced
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
maintainer-only (note `readme-audit` / `sync-copilot` are already `.claude/`
dev-tooling, not plugin-shipped, so likely already on the right side). Surfaced
during `add-auto-mode`'s stage-I/PR retro.

### reassess-copilot-port — `idea` · **P3**

**Why:** The Copilot half drops the core QRSPI mechanisms (subagent orchestration,
per-slice model, skill auto-load) the source calls the whole point, leaving a
checklist. Weigh relabeling it a "lite" companion against the ongoing
sync/maintenance tax.

### reassess-openspec-dependency — `idea` · **P3**

**Why:** The source only asks to "persist to disk," but the kit pins an external
OpenSpec CLI (npx, a version pin spread across files, a CI lint to police it) to
gain `openspec validate` on the delta specs. (`openspec/specs/` is now populated
as of the 2026-06-19 archives, so the validated surface is real — re-weigh the
dependency against a vendored folder convention + a small validator with that in
mind.)

### simplify-per-slice-model-selection — `idea` · **P3**

**Why:** Per-slice model intent is endorsed by the source, but the mechanism (the
architect writes a markdown `**Model:**` annotation; the implementer self-halts and
asks to be re-invoked when on the wrong model) is fragile and breaks on Copilot.
Consider a simpler lever or a single implement-stage model.

### configurable-effort-and-thinking — `idea` · **P3**

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
bolting on a third fragile markdown knob.

### agentFor-frontmatter-crosscheck — `idea` · **P3**

**Why:** `sync-copilot.mjs`'s hardcoded `agentFor` table and the Claude command's
declared subagent are parallel representations of the same delegation with no
automated cross-check (research open gap #3). Deferred from
`verify-stage-gate-execution` (Non-Goal). Note the framing shifts after that
change lands: it drops `agent:` from the stage commands, so the cross-check becomes
`agentFor` vs the subagent named in each command **body**, not its frontmatter.

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
