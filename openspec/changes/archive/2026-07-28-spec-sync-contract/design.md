# Design — spec-sync-contract

> Stage D of QRSPI. Generated 2026-07-28.
> **Implementation is BLOCKED until a human approves this file.**

## Context

The archive-time delta-spec → main-spec sync is where a change's
`openspec/changes/<id>/specs/**` deltas are folded into the durable
`openspec/specs/**`. Today `/qrspi:archive` step 4 delegates the whole archive
mechanics — including the sync — to the **generated** `openspec-archive-change`
skill, which spawns the sync via the `Task` tool with
`subagent_type: "general-purpose"` (all tools, no read contract) and gates it
behind a "Sync now (recommended) / Archive without syncing" prompt on every
run. That spawn in turn invokes the generated `openspec-sync-specs` skill, whose
"intelligent merging" text tells the LLM to *preserve* scenarios a MODIFIED
delta doesn't mention.

Two defects follow. (1) OpenSpec `## MODIFIED Requirements` semantics are a
**wholesale replacement** — the delta's requirement body + scenario list
overwrite the base. A MODIFIED delta that lists only its *changed* scenarios
silently drops the carried-forward ones (observed 2026-07-28 archiving
`unify-implement-paths-on-variants`). The generated sync skill's "preserve"
clause directly contradicts the delta-spec template and the architect's own
skeleton, so the corrected contract cannot lean on that skill. (2) The sync is
run by an unconstrained `general-purpose` agent the kit does not own and cannot
give a read contract or the corrected merge rule.

Desired end state: a least-privilege, kit-owned **`spec-syncer`** agent owns the
delta-merge contract (including the wholesale-MODIFIED rule and a scenario-count
-drop hard-stop guard); the kit-owned `/qrspi:archive` command owns the sync
delegation and calls `spec-syncer` directly, bypassing the generated skill's own
spawn; sync runs by default (no happy-path prompt); and the guard is enforced at
two independent layers — the runtime agent (protects *consumer* repos) and a
kit-only `scripts/lint.mjs` check (protects *this kit's* dogfooded deltas).

## Goals / Non-Goals

**Goals:**
- Stand up `claude/agents/spec-syncer.md` — a least-privilege helper agent
  (Read/Edit + `openspec validate` via Bash) carrying the corrected delta-merge
  contract, including MODIFIED = wholesale replacement.
- Make `/qrspi:archive` the authoritative sync delegator: it spawns
  `spec-syncer` directly, and the generated skill's own `general-purpose` sync
  spawn is bypassed, not run in addition.
- Ship the scenario-count-drop guard as a runtime hard-stop in `spec-syncer`
  (PQ1) plus a kit-only CI check in `scripts/lint.mjs` (PQ4).
- Remove the "Sync now / Archive without syncing" prompt from the happy path;
  keep a narrow escape-hatch prompt (PQ2).
- Strengthen the delta-spec template's MODIFIED comment (PQ3), add a "Helper
  agents" section + `spec-syncer` row to the workflow Read Matrix (PQ5), and add
  Check 17 for non-stage helper-agent banners (PQ6).

**Non-Goals:**
- **Do not hand-edit the generated skills** (`openspec-archive-change`,
  `openspec-sync-specs`) — they are CLI-regenerated. The fix lives entirely in
  kit-owned files.
- **No consumer-shipped lint** — `scripts/lint.mjs` does not ship in the plugin
  (PQ4). Consumers are protected only by the runtime agent guard.
- No change to ADDED/REMOVED/RENAMED sync semantics beyond documenting them in
  the agent contract.
- Not touching the broader road-to-1.0 items (`reset-and-resume-…`,
  `orchestrator-context-budget-gate`) — orthogonal (Q30).

## Decisions

### D1 — `spec-syncer` is a named least-privilege agent, replacing the `general-purpose` spawn
Answers Q6, Q8, Q59-frontmatter. Add `claude/agents/spec-syncer.md` and register
it in the `plugin.json` `agents` array (explicit array, not directory
discovery — research §Stage-agent). Name `spec-syncer` matches the kebab-slug
convention. **Tools: `Read, Edit, Bash, Glob, Skill`** — no `Write` (it edits
existing main specs, never creates files), no `Agent`, no `AskUserQuestion`
(main-loop-only; the agent *returns* a blocked signal, the command asks the
human). `Bash` is present but the contract scopes it to `openspec validate`
only. **Rejected:** narrowing Bash out entirely — `openspec validate <id>
--strict` is the post-merge correctness gate and needs a shell. **Rejected:**
keeping the `general-purpose` spawn — it has no read contract, all tools, and
carries none of the corrected merge rule.

### D2 — `/qrspi:archive` owns the sync; the generated skill's step-4 spawn is bypassed, not additive
Answers Q1, Q3, Q4 — the double-spawn tension. Restructure `archive.md` so the
sync happens **in the command, before** the generated skill's folder-move, and
the skill is invoked in a mode where its own sync spawn does not fire. Concrete
call sequence:
1. `archive.md` steps 1-3 unchanged (init check, followups sanity, PR-merge
   hard-stop).
2. **New command-owned step 4a — sync.** The command detects delta specs (Glob
   `openspec/changes/<id>/specs/**/spec.md`). If present, it spawns
   `spec-syncer` (`subagent_type: qrspi:spec-syncer`) with the change id. The
   agent merges each delta into `openspec/specs/**`, runs `openspec validate
   <id> --strict`, and returns a structured result (synced / blocked-on-count
   -drop / escape-hatch). This is the *only* sync path.
3. **Step 4b — folder move only.** The command still loads
   `openspec-archive-change` for the artifact/task-completion checks and the
   `mv`, but because the delta specs are **already synced** by 4a, the skill's
   step-4 sync assessment sees the main spec already matches and offers "Archive
   now / Sync anyway / Cancel" (its already-synced branch) rather than re-running
   sync. The command instructs: **do not accept the skill's "Sync anyway" —
   sync is already done by 4a.** No second `spec-syncer`/`general-purpose` spawn
   occurs.
**Rejected:** letting the generated skill keep driving sync and merely swapping
its `subagent_type` — that requires hand-editing a regenerated file (forbidden,
Q4). **Watch-item for stage I:** confirm at dogfood time that pre-syncing in 4a
reliably lands the skill on its already-synced branch across the CLI's actual
status output; if the skill still offers "Sync now", the command must
explicitly decline. Fallback: the command hard-declines any sync prompt the
skill raises after 4a.

### D3 — MODIFIED = wholesale replacement; the corrected contract lives in `spec-syncer`, not in the generated skill
Answers Q9, Q11, Q13, and the two-source conflict. The `spec-syncer` system
prompt carries the **authoritative** delta-merge contract and states MODIFIED
replaces the base requirement **body + entire scenario list** — the delta is the
complete new state, never a patch. The agent **does not load
`openspec-sync-specs`** and does not inherit its contradictory "preserve
scenarios not mentioned" clause. The template's existing rule ("Repeat every
scenario it should still have", spec-delta.template.md line 58) is the
author-side mirror of this merge-side rule. **Rejected:** loading the generated
skill and "overriding only MODIFIED" — the override would sit next to the
contradictory text and invites drift the moment the CLI regenerates it.

### D4 — Count-drop guard is a runtime hard-stop (PQ1), fired on any MODIFIED reduction
Answers Q10, Q17, Q20, Q21, Q22, PQ1. Before writing a MODIFIED requirement, the
agent reads the pre-sync `openspec/specs/<capability>/spec.md` (present in the
working tree at archive time — Q17) and counts its scenarios for that
requirement, then counts the delta's. **If the delta count is lower, the agent
hard-stops**: it does NOT write that requirement, returns an error/blocked signal
naming the requirement + `<pre> → <post>` counts, and the command surfaces it via
AskUserQuestion (hard-stop condition 3). **Fire on ANY reduction** (including to
zero) — a legitimate consolidation is exactly the case a human should confirm
once; a threshold would let the silent-loss bug through at N-1. **Rejected:** a
`<!-- REPLACES-ALL -->` override marker (PQ1 option c) — adds delta-spec syntax
the human explicitly did not pick; the human confirmation *is* the override.
**Open question OQ1:** does the confirmation resume the *same* `spec-syncer` run
or re-spawn after the human edits the delta? (see Open questions).

### D5 — Happy-path sync prompt removed; escape-hatch prompt retained (PQ2)
Answers Q2, PQ2. The command runs sync by default in 4a with no "Sync now /
Archive without syncing" prompt. A prompt is reserved for **escape-hatch cases
only**: (a) the delta spec is malformed / fails `openspec validate` in a way that
would corrupt main specs, or (b) an abandoned/superseded change whose deltas
should not be synced. In those cases `spec-syncer` returns a distinct signal and
the command asks the human whether to archive-without-syncing. **The count-drop
hard-stop (D4) is separate** — it is not an escape hatch, it is a "confirm this
intentional loss" pause.

### D6 — Guard also added to `scripts/lint.mjs` as a kit-only Check (PQ4), NOT shipped to consumers
Answers Q18, Q19, Q27, PQ4. A new static check compares each committed delta
spec's MODIFIED scenario count against the corresponding `openspec/specs/**`
count (both are in the working tree together — Q19 confirms the invariant).
Because `scripts/lint.mjs` is **kit-internal CI and does not ship in the
plugin**, this half guards only *this repo's own dogfooded* delta specs; it is
**not** inherited by consumer repos. The runtime D4 guard is the consumer-facing
protection. The design must not present the lint half as consumer coverage. This
is the number after the current highest (Check 16) that is **not** the helper
-agent banner check — see D8 for numbering. **This is a distinct check from D8's
Check 17.** **Watch-item:** the count-drop lint needs a delta MODIFIED whose base
requirement exists in `openspec/specs/**`; a delta against a not-yet-created base
(new capability) has no pre-count and must be skipped, not flagged.

### D7 — Strengthen the template comment (PQ3), single home
Answers Q14, Q15, Q16, Q23, Q24, PQ3. The rule lives **only** in
`openspec-templates/spec-delta.template.md` (already partially there, line 57-58).
Strengthen the inline MODIFIED comment to be unambiguous — e.g. "sync REPLACES
this requirement wholesale (body + every scenario). List **every** scenario the
requirement should still have, including unchanged ones; any scenario you omit is
**deleted** from the main spec." Do **not** duplicate into `architect.md` or
`openspec-workflow` (avoids the two-source drift PQ3 rejected). The architect's
inline skeleton already points at this template.

### D8 — New Check 17 for non-stage helper-agent banners; Read Matrix gets a "Helper agents" section (PQ5, PQ6)
Answers Q7, Q12, Q26, PQ5, PQ6. Add a **"Helper agents"** subsection to the
workflow Read Matrix with a `spec-syncer` row: **Reads (within-change):**
`specs/**` (delta) + `openspec/specs/**` (main, cross-change via the spec.md
exception); it opens **no** process artifacts. Add **Check 17** to
`scripts/lint.mjs` asserting the `spec-syncer` banner's `Reads:` field matches a
new `HELPER_READ_CONTRACT_EXPECTED` map — **do NOT widen Check 7** (which is
scoped to the 9 stage-agent keys incl. the three implementer variants). Check 17
follows Check 15's inline-self-test pattern (Q26). **READ_CONTRACT ↔ Read Matrix
drift** (research §Lint-gate): the map and the table are kept in sync by
convention only; the new helper row inherits that same convention — note it but
do not build automated cross-verification (out of scope).

### D9 — No migration manifest entry required; add an authoritative-delegator lint check (OQ2)
Answers Q25, Q33, OQ2. The change touches kit-owned files (`claude/agents/`,
`claude/commands/`, `openspec-templates/`, `scripts/lint.mjs`, `plugin.json`) —
none under a consumer's `openspec/` workspace. Migration manifests cover
consumer-repo `openspec/`-scoped edits only, so **no `migrations/*.yaml` entry**
is added. Consumers pick up the new agent + command via the normal plugin update.
**Per OQ2 = include-now:** add a `scripts/lint.mjs` check (kit-only, numbered
after D6's and D8's checks) asserting `claude/commands/archive.md` is the
authoritative sync delegator — i.e. it spawns `qrspi:spec-syncer` and the kit
carries **no** `subagent_type: general-purpose` sync spawn in a kit-owned file —
so a future OpenSpec CLI regeneration re-adding `general-purpose` cannot silently
regress the ownership. Statically, the check asserts (a) `archive.md` references
the `qrspi:spec-syncer` spawn, and (b) no kit-owned command/agent delegates sync
to `general-purpose`. This is a distinct check from D6 (count-drop) and D8
(Check 17, helper banner).

## Vertical slices (preview)

- **Slice 1 — Corrected merge contract, end-to-end runtime path:** add
  `claude/agents/spec-syncer.md` (contract + wholesale-MODIFIED rule + count-drop
  hard-stop) + register in `plugin.json`; rewire `archive.md` to spawn it (D1-D5).
  Demoable: `/qrspi:archive` on a fixture with a scenario-dropping MODIFIED delta
  hard-stops instead of silently losing scenarios.
- **Slice 2 — Author-side + kit CI guards:** strengthen the template comment (D7)
  and add two kit-only `scripts/lint.mjs` checks — the count-drop check (D6) and
  the authoritative-delegator check (D9, OQ2). Demoable: `node scripts/lint.mjs`
  fails on a synthetic scenario-dropping delta fixture, and fails if a kit-owned
  file delegates sync to `general-purpose`.
- **Slice 3 — Read-contract wiring:** add the "Helper agents" Read Matrix section
  + `spec-syncer` row and Check 17 with its inline self-test (D8). Demoable:
  `node scripts/lint.mjs` passes with the banner present, fails if the banner
  drifts.

## Risks / Trade-offs

- **Double-sync race (D2) is the highest risk.** If the generated skill's step-4
  spawn still fires after 4a pre-syncs, the main spec is merged twice. Mitigation:
  the command hard-declines any sync prompt the skill raises post-4a; confirmed at
  dogfood. If the CLI's status output can't be made to reliably land on the
  already-synced branch, fallback is to not load the generated skill for sync at
  all and have the command own the `mv` too (larger `archive.md`, but removes the
  race).
- **Generated-skill regeneration (Q4, Q33):** a future OpenSpec bump could
  re-introduce the `general-purpose` spawn or change status JSON shape. The kit
  command owning sync insulates behaviour, and per OQ2 = include-now the new
  authoritative-delegator lint check (D9) guards the ownership against a
  regeneration that re-adds `general-purpose`. A status-JSON-shape change (D2's
  already-synced branch) remains a dogfood watch-item, not statically lintable.
- **`archive.md` length (Q5):** moving sync ownership in makes the command
  longer. Trade-off accepted — no hard length cap exists; the alternative
  (hand-editing the generated skill) is forbidden.
- **Count heuristic false-positives (D4):** firing on any reduction will pause on
  legitimate consolidations. Accepted — a single human confirmation is cheap
  versus silent loss; the whole change exists because the silent path was wrong.
- **Two guards, different populations (D6/PQ4):** the design must keep the
  runtime and CI guards conceptually separate — a reviewer might assume the lint
  protects consumers. It does not. Documented explicitly in D6.

## Open questions for the human

- [x] **OQ1 — count-drop resume semantics (D4).** On a hard-stop, after the human
  confirms the intentional loss (or edits the delta to re-state scenarios), does
  the archive **re-spawn** `spec-syncer` from scratch, or does the human's
  confirmation tell the command to proceed and write the requirement as-is? A
  re-spawn is cleaner (single write path) but re-runs the whole merge; a
  "proceed" flag is lower-friction but means the command carries partial merge
  state. Recommendation: re-spawn with a "confirmed count-drop OK" flag passed to
  the agent so it skips the guard for that requirement.
  **Answer: Re-spawn `spec-syncer` from scratch, passing a "confirmed
  count-drop OK" flag so the re-run skips the guard for the confirmed
  requirement. Single write path; the command carries no partial merge state.**
- [x] **OQ2 — assert the kit command stays the authoritative sync delegator
  (Q33).** Should a lint check assert `archive.md` (not the generated skill) owns
  the sync spawn, so a future CLI regeneration that re-adds `general-purpose`
  doesn't silently regress? Deferred as a backlog candidate in D9; confirm defer
  vs. include-now.
  **Answer: Include now — this change adds the lint check (see updated D9). It is
  NOT deferred to the backlog.**
