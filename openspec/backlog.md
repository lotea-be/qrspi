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

### lint-auto-mode-gate-coverage — `idea`

**Why:** `add-auto-mode` introduces a convention that every stage command must
reference the run-mode procedure in the `workflow` skill; a future command that
silently drops that reference would quietly fail to suppress (or keep) a gate in
auto mode. A structural `scripts/lint.mjs` check could assert the reference and
per-gate auto-branch wiring stays consistent — the runtime suppression itself is
not statically checkable. Surfaced by `add-auto-mode` stage D (offered, not built).

### repo-branch-protection — `idea`

**Why:** The CI gates added by `kit-quality-hardening` are only advisory until
the `main` branch requires them; a `CODEOWNERS` file would also route reviews.
Deferred from `kit-quality-hardening` as a separate governance concern (its Q7).
**Fresh evidence (2026-06-19):** PR #5 merged while its CI run was still
`UNSTABLE` — confirming `main` has no required checks today. Pair this with the
new `release.yml` so a tag can't publish on a red build either.

### enforce-research-ticket-hiding — `idea`

**Why:** Ticket-hiding (the source's most important rule) is enforced only by
telling the researcher not to open `questions.md`, though it has Read on the whole
repo -- the "persona, not mechanism" anti-pattern `context-hygiene` itself warns
against. Consider a mechanical guard.

### reassess-copilot-port — `idea`

**Why:** The Copilot half drops the core QRSPI mechanisms (subagent orchestration,
per-slice model, skill auto-load) the source calls the whole point, leaving a
checklist. Weigh relabeling it a "lite" companion against the ongoing
sync/maintenance tax.

### agentFor-frontmatter-crosscheck — `idea`

**Why:** `sync-copilot.mjs`'s hardcoded `agentFor` table and the Claude command's
declared subagent are parallel representations of the same delegation with no
automated cross-check (research open gap #3). Deferred from
`verify-stage-gate-execution` (Non-Goal). Note the framing shifts after that
change lands: it drops `agent:` from the stage commands, so the cross-check becomes
`agentFor` vs the subagent named in each command **body**, not its frontmatter.

### reassess-openspec-dependency — `idea`

**Why:** The source only asks to "persist to disk," but the kit pins an external
OpenSpec CLI (npx, a version pin spread across files, a CI lint to police it) to
gain `openspec validate` on the delta specs. (`openspec/specs/` is now populated
as of the 2026-06-19 archives, so the validated surface is real — re-weigh the
dependency against a vendored folder convention + a small validator with that in
mind.)

### simplify-per-slice-model-selection — `idea`

**Why:** Per-slice model intent is endorsed by the source, but the mechanism (the
architect writes a markdown `**Model:**` annotation; the implementer self-halts and
asks to be re-invoked when on the wrong model) is fragile and breaks on Copilot.
Consider a simpler lever or a single implement-stage model.

### tutorial-mode-narrated-tour — `idea`

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

### tutorial-mode-coaching-overlay — `idea`

**Why:** Follow-up to `tutorial-mode-narrated-tour` once the tour format proves
out (higher build cost). A `/qrspi:learn` mode that runs the *real* stages on the
user's *own* repo, but with extra inline coaching at each stage ("what's happening
here / what you should check before continuing") and explicit pauses at the human
gates (design approval, commit, next-stage handoff). The payoff is learning on
productive work — the training wheels come off naturally as the first real change
ships. More invasive to build than the tour because it wraps the live command path
rather than narrating a static artifact set.
