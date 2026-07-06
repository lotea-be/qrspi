# Backlog

Candidate changes for this repo, tracked before they enter the QRSPI flow
(Q → R → D → S → V → P → I → PR). Status is one of `idea` / `proposed` /
`in-progress` / `merged`. Completed work lives under
`openspec/changes/archive/`, not here.

## In progress

### add-auto-mode — `in-progress (draft PR #13 open)`

**Why:** Running the full 8-stage QRSPI flow requires answering many interactive prompts (commit gate, next-stage handoff, per-slice checkpoints, backlog-capture offers, PR step); an auto mode that suppresses all but the Q and D pauses would let teams run an unattended alignment-through-PR pipeline for low-risk changes.
**Likely shape:** A ternary mode-choice prompt (Full auto / Semi-auto / Manual) asked via AskUserQuestion at the top of every fresh stage invocation — no disk persistence; the mode is carried in-process across an auto chain and re-asked on resume. In Full auto the orchestrator chains `Q → R → D → S → V → P → I → PR`, auto-advancing the commit (commit + push), handoff, Structure design-approval (auto-Yes after D), per-slice checkpoints, and PR-create gates, pausing only at the Q open-questions pass, the D review, the (still-interactive) backlog offers, and hard-stops (precondition fail, git fail, subagent error/block, design divergence). Blast radius: all 8 stage commands (+ possibly `followup.md`), `qrspi-workflow` SKILL.md choreography section, README, and regenerated `copilot/` tree (Claude-only, zero-drift). See `openspec/changes/add-auto-mode/questions.md` PQ1–PQ13 for resolved decisions.

## Ideas

Listed in priority order (highest first). Each carries a `P1`–`P3` band:
**P1** = correctness/safety of the live workflow, low cost — do next;
**P2** = high-value enhancements, larger or lightly dependent;
**P3** = strategic bets or items sequenced behind another change. Re-evaluate
this ordering whenever an item is added, modified, or archived (see
[[backlog-prioritization]]).

### archive-requires-merged-pr — `idea` · **P1**

**Why:** Archiving a change today doesn't verify the linked PR actually merged —
`/qrspi:archive` moves the folder under `archive/` regardless, so a change can be
archived while its PR is still open or was closed unmerged. Before archiving,
fetch the linked PR's status (via `gh`) and only proceed when it's `merged`;
otherwise stop and surface the state. As part of the archive, also update the
change's entry in `openspec/backlog.md` (e.g. flip status to `merged` / move it
out of "In progress") so the backlog and the archive stay in sync.

### pr-review-open-tasks-and-followups — `idea` · **P1**

**Why:** The PR stage jumps straight to drafting the PR without reconciling
loose ends. Before creating the PR, first walk the still-open tasks in
`tasks.md` — loop over each open item and ask the user what to do with it
(finish, defer, drop) — then loop over the entries in `followups.md` and ask the
user what to do with each. Only after both review passes are resolved should the
stage create the PR, so nothing open is silently carried into the PR.

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

### lint-auto-mode-gate-coverage — `idea` · **P2** (blocked until `add-auto-mode` merges)

**Why:** `add-auto-mode` introduces a convention that every stage command must
reference the run-mode procedure in the `workflow` skill; a future command that
silently drops that reference would quietly fail to suppress (or keep) a gate in
auto mode. A structural `scripts/lint.mjs` check could assert the reference and
per-gate auto-branch wiring stays consistent — the runtime suppression itself is
not statically checkable. Surfaced by `add-auto-mode` stage D (offered, not built).
Low-cost correctness guard (hence P2, not P3); blocked until `add-auto-mode`
merges, since the convention it enforces ships with that change.

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
