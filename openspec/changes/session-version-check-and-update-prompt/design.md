# Design — session-version-check-and-update-prompt

> Stage D of QRSPI. Generated 2026-07-23.
> **Implementation is BLOCKED until a human approves this file.**

## Context

QRSPI-initialized consumer repos carry a one-line marker
`openspec/.qrspi-version` (bare SemVer, written by `/qrspi:init`) recording the
kit version the repo was last aligned with. The kit ships a `migrations/`
directory and a `/qrspi:update` command (driven by the `qrspi-update` skill)
that walks intervening releases to bring a repo forward. Today nothing tells a
user their repo is behind — they only discover it if they think to run
`/qrspi:update`. This change adds a **session-start version check**: at the top
of `/qrspi:status` and all eight stage commands, compare the repo marker `A`
against the installed kit version `B` (from `.claude-plugin/plugin.json`
`version`, local only, no network) and, when the repo is behind, **offer** to
run `/qrspi:update` — a human-gated prompt, never a silent auto-migration. The
check degrades gracefully when the marker is absent, when the kit version is
unreadable, and warns (no gate) on a downgrade.

All seven binding product answers (PQ1–PQ7) are settled in `questions.md`; this
design turns them into a concrete, DRY, lint-covered implementation. The end
state: a single new shipped skill `qrspi-version-check` holds the check logic;
each of the nine command bodies gains one short "run the check first" preamble
line ahead of every side-effecting step; the orchestrator holds an in-context
"checked this session" flag (same mechanism as run-mode) so an auto-chain checks
once; lint gains a coverage check; the README and `copilot/` are synced.

## Goals / Non-Goals

**Goals:**
- Surface "repo is behind" at every QRSPI entry point (status + 8 stages) with a
  two-choice offer to run `/qrspi:update` now (PQ2, PQ5).
- Single source of truth for the check logic — one shipped skill, not prose
  duplicated across nine files (PQ2 implies DRY).
- In-context once-per-session suppression via an orchestrator-held flag, no disk
  state (PQ3).
- Graceful degradation: no-marker reuses `/qrspi:update`'s existing gate (PQ4);
  unreadable kit version warns and proceeds; downgrade warns, no gate (PQ6).
- The check sits ahead of every side-effecting step so accepting the offer loses
  no partial state (PQ7).
- Mechanical lint coverage that the embed is present in all nine command bodies.

**Non-Goals:**
- No network / marketplace "latest version" lookup — version source is strictly
  local installed kit files (PQ1, settles Q5).
- No disk-based session marker / temp file (PQ3 rejects option (b)).
- No auto-resume of the interrupted stage after `/qrspi:update` — the user
  re-invokes the original stage fresh (PQ7 chose check-first, not auto-resume).
- No reverse/downgrade migration — downgrade is warn-only (PQ6); `/qrspi:update`
  still owns the downgrade hard-stop if the user runs it.
- Not solving the auto-detect portability problem in general — this design
  frames the unverified read as a stage-I watch-item with a defined fallback
  (see D2), consistent with `qrspi-update` OQ1.
- Follow-up idea (not this change): mechanically asserting `config.yaml`
  `openspec_version` vs kit version coupling (an existing open gap, unrelated).

## Decisions

### D1 — DRY mechanism: a new shipped skill `qrspi-version-check`, named-loaded by each command body

The check logic (read `B`, read `A`, numeric-tuple compare, branch on
up-to-date / behind / downgrade / no-marker / unreadable, hold the session flag)
lives in **one new shipped skill** `claude/skills/qrspi-version-check/SKILL.md`.
Each of the nine command bodies carries a single short preamble line —
"Before any other work, run the session version check by following skill
`qrspi-version-check`" — rather than duplicating the branch logic inline.

- **Chosen:** shipped skill (in `claude/skills/`, not `.claude/skills/`) — it
  ships to consumers, who run the check; mirrors the `workflow` /
  `qrspi-update` single-source pattern (research Area 5: skills are
  named-loaded, one authoritative home). Skills are auto-registered from the
  `skills: ./claude/skills` directory, so `plugin.json` needs no edit
  (research: no per-skill opt-in list; settles Q23).
- **Rejected:** inline prose in each of nine files — nine copies of the branch
  logic drift, and a fix must touch nine files. This is exactly the duplication
  the workflow-skill pattern exists to avoid.
- **Rejected:** auto-loading the skill via every stage-agent system prompt —
  the check runs in the command *body* (main loop), not in the subagent; and a
  third always-loaded skill carries a context-budget cost with no benefit
  (settles Q22). It is named-loaded only by the nine command bodies that embed
  the check.

Answers Q9, Q20–Q23, Q31 (thin wrapper — see D5).

### D2 — Version source `B`: read `.claude-plugin/plugin.json` `version`; unverified-read fallback is a warn-and-proceed, not a hard block (PQ1)

`B` is read from the installed plugin's `.claude-plugin/plugin.json` `version`
field — the same file `/qrspi:init` reads to write the marker, and the same
source `qrspi-update` auto-detect targets. **Local only, no network** (PQ1,
Q5).

The portability problem is real and identical to `qrspi-update` OQ1: *there is
no portable primitive for a command body to learn its own install directory*,
and the plugin cache path encodes the version
(`~/.claude/plugins/cache/<marketplace>/qrspi/<version>/…`), so guessing the
path is fragile. This design does **not** claim to have solved it. Instead:

- The skill attempts the read best-effort. **If `B` cannot be read reliably, the
  check does not guess a wrong version** — it prints a one-line "version check
  unavailable — run `/qrspi:update` manually if needed" notice, sets the
  session flag (so it does not re-nag), and **proceeds with the stage** (Q17
  chooses warn-not-silent; proceeding, never blocking).
- The exact read mechanism is a **stage-I watch-item** carried into
  implementation with the explicit fallback above, mirroring `qrspi-update`'s
  own watch-item wording rather than presenting an unverified read path as a
  settled default.

**Rejected** the migrations-stem fallback (Q4 option) as a *primary* source — it
is a second source of truth that can diverge from `plugin.json` if a stub is
omitted (research: migrations mirror `plugin.json` but are not guaranteed
identical). PQ1 binds source to `plugin.json` `version`; the migrations stem is
not adopted even as fallback here — an unreadable `B` degrades to the warn path
above, which is safer than silently comparing against a possibly-divergent
number. Answers Q1–Q4, Q17.

### D3 — SemVer comparison: reuse `qrspi-update`'s numeric-tuple compare (not string equality)

The comparison parses each version as a `(major, minor, patch)` integer tuple
and compares left-to-right numerically — the **exact** algorithm the
`qrspi-update` skill already documents as load-bearing (`0.10.0` vs `0.9.0`:
string sort is wrong, tuple compare is right).

- **Chosen:** numeric-tuple compare, referenced from the `qrspi-update` skill's
  "walk algorithm" section rather than re-derived, so the two never drift.
- **Rejected:** strict string equality (Q12 alternative). Equality alone cannot
  tell *behind* from *downgrade* (PQ5 vs PQ6 need direction), and cannot render
  "1 version behind". Direction is required, so a full tuple compare is
  mandatory. Three branches on the compare result: `A == B` up-to-date;
  `A < B` behind (offer); `A > B` downgrade (warn). Answers Q12, Q13.

### D4 — Placement: the check is the FIRST step in each command body, ahead of run-mode establishment and every side effect (PQ7)

In each of the nine command bodies the version-check line is positioned **at the
very top — before run-mode establishment, before the precondition Glob, before
any branch/folder/subagent/commit work**. This gives PQ2's broad placement a
clean interrupt boundary: accepting "Run `/qrspi:update` now" re-enters update
with nothing partial to unwind (PQ7 (a): check-first, re-run fresh).

- Ordering within the check itself: (1) session-flag guard (D6) — if already
  checked this session, return immediately and do nothing; (2) read `B`
  (degrade per D2 on failure); (3) read `A` (no-marker → D7); (4) compare (D3)
  and branch. The check ends by setting the flag.
- In `/qrspi:status` specifically, the version check runs **before** the
  existing onboarding check (Steps 1–5) — it is the first thing status does
  (settles Q30). Rationale: an out-of-date kit can change what "next stage" even
  means, so surface the version gap before the stage map.
- **One caveat, surfaced as an OQ below:** the run-mode procedure also wants to
  be "at the top … before the precondition check." Placing the version check
  *ahead of* run-mode means the version check runs even before a run-mode is
  established. That is intended (the version check is orthogonal to run mode and
  must precede all side effects), but the two "top of body" instructions need an
  explicit ordering in the skill text — see OQ1. Answers Q7, Q15, Q30, PQ7.

### D5 — Behind-offer and no-marker reuse `/qrspi:update`; the skill is a thin wrapper (PQ4, PQ5, Q31)

When `A < B` (behind), the skill issues **one AskUserQuestion** with exactly two
choices, showing the gap explicitly:
- question: e.g. `This repo is on QRSPI 0.6.0; installed kit is 0.7.0 (1 version behind). Run /qrspi:update now?`
- choices: `["Run /qrspi:update now", "Continue on the current version"]`

On "Run now", the orchestrator re-enters `/qrspi:update` as a slash command on
the main loop (PQ7: safe because the check is pre-side-effect). On "Continue",
set the flag and proceed with the stage.

When the marker is **absent**, the check does **not** invent a parallel path —
it **delegates to `/qrspi:update`'s existing no-marker gate** (PQ4, Q31): the
version-check skill hands off to `/qrspi:update`, which already offers
"initialize marker to current version / supply actual version" via
AskUserQuestion. The version-check skill is thus a **thin wrapper** — it reads
two values, compares, and defers all walk/edge-case machinery to `qrspi-update`
(Q31). Because the no-marker case is a real AskUserQuestion gate, it must run on
the main loop — which it does, since all nine embedding commands are main-loop
(research Area 3; D8).

- **Note on the no-marker/onboarding overlap:** PQ4 binds the no-marker case to
  `/qrspi:update`'s gate. In `/qrspi:status`, this sits alongside the existing
  onboarding check that already tells an un-bootstrapped user to run
  `/qrspi:init`. If `openspec/` itself is absent (never initialized), status's
  onboarding check fires first and the user is sent to `/qrspi:init`; the
  no-marker gate is only reached when `openspec/` exists but the marker does not.
  See OQ2. Answers Q14, Q16, Q31, PQ4, PQ5.

### D6 — Session suppression: an orchestrator-held "version-checked this session" flag, same mechanism as run-mode; re-checked on each auto-chained re-entry (PQ3)

Suppression is **in-context only** — the orchestrator holds a boolean
"version-checked this session" flag in its conversational context, the **same
mechanism as the held run-mode** (research Area 4: run-mode is context-only, no
disk state, and is the documented precedent). No disk file, no temp marker, no
frontmatter (PQ3 rejects option (b)).

How the flag survives auto-chained re-entries: the skill instructs each command
to check "do I already hold a version-checked flag from earlier in this
orchestrator context? If yes, skip the check entirely." Because auto-chained
stages (Full/Semi mode) re-enter as slash commands **in the same orchestrator
context** that already ran the first stage's check, the flag is already held and
the ~8 downstream checks are suppressed — exactly parallel to how run-mode
inheritance works (workflow skill: "if you already hold a run-mode established
earlier in this orchestrator context, skip the prompt and reuse it"). A fresh
session, a `/clear`, or a standalone stage call holds no flag and legitimately
re-checks (PQ3). This is correct behaviour, not a bug — same rationale the
run-mode spec gives for re-asking after a new session. Answers Q8, Q24, Q26,
PQ3.

### D7 — Downgrade: warn once, no gate, then proceed (PQ6)

When `A > B` (marker ahead of installed kit — a rolled-back plugin), the skill
prints a **one-line notice** ("Installed kit 0.6.0 is older than this repo's
marker 0.7.0 — you may be running a stale plugin"), sets the session flag, and
**proceeds with the stage**. No AskUserQuestion: a downgrade offers nothing to
update *toward*, so a gate would be a dead end (PQ6 (b)). `/qrspi:update` retains
its own downgrade hard-stop for the user who runs it explicitly. Answers Q13,
PQ6.

### D8 — All nine embedding commands are main-loop; the check can host AskUserQuestion; lint Check 5 is unaffected

Research Area 3 confirms every stage command and `status.md` carry **no
`agent:` frontmatter** — they run their bodies on the main-loop orchestrator and
delegate only bounded writes to subagents via the Agent tool. So the version
check's AskUserQuestion (behind-offer, no-marker gate) is reachable from every
command body (settles Q10, Q11 — no command needs restructuring). Lint Check 5
(`checkGateExecutor`) only fires on commands **with a non-builtin `agent:`
field** (lint.mjs:641 `if (!agentRef …) continue`); none of the nine have one,
so adding AskUserQuestion-bearing prose to their bodies raises no Check 5
violation. Answers Q10, Q11.

### D9 — Lint coverage: assert the embed line is present in all nine command bodies, matching BOTH the inline and skill-delegated form

Add a lint check (or extend an existing one) asserting the version-check embed
is present in each of the nine command bodies (`status` + the eight stage
commands), analogous to Check 7's read-contract banner assertion and Check 4's
README coverage. Predicate: each of the nine bodies must reference skill
`` `qrspi-version-check` `` on a "follow skill" / "Load skill" line.

**Enumerate inline vs. transitive manifestation before pinning the predicate**
(per the static-check trigger). The invariant "this command runs the version
check" shows up in two forms: **(inline)** the command body names
`qrspi-version-check` directly on a load line — the intended, checkable form;
**(transitive)** a command could instead reach the check via the `workflow`
choreography or another shared include without naming the skill. To avoid the
Check-5-style under-coverage bug (a predicate that matched only the inline form
and missed the transitive `research`/`plan`/`slices` bodies, caught late at
stage I), the design pins the contract to the **inline** form: every embedding
command MUST name `qrspi-version-check` on its own load line (no transitive-only
embedding is permitted), and the lint predicate asserts exactly that inline
reference in all nine files. The list of nine command stems is enumerated in the
check (like Check 7's hardcoded 7-agent map), so a future stage command added
without the embed fails lint. Exact check number/placement is a stage-S/I
detail. Answers Q27, Q28.

### D10 — README + copilot-sync impact (mandatory, same change)

Adding a shipped skill and touching nine command files requires:
- **README:** add `qrspi-version-check` to the skills list / two-tool mapping
  table (research: skills are enumerated in README; CLAUDE.md "Keep the README
  current" makes this same-change, not later). Command *count* is unchanged (no
  new command), so the command table and Check 4 are unaffected — but the new
  skill is prose-level drift the lint cannot catch, so it must be added by hand
  and `/qrspi-readme-audit` run.
- **copilot sync:** the new skill auto-generates
  `copilot/instructions/qrspi-version-check.instructions.md`; the nine touched
  command bodies regenerate their prompts (the `Load skill …` →
  `Consult the … instructions` and `AskUserQuestion` → `vscode/askQuestions`
  rewrites apply automatically). No `agentFor`/`hintFor` entry is needed (the
  skill is not a command). Run `node sync-copilot.mjs` and never hand-edit
  `copilot/` (CLAUDE.md). Answers Q32.

## Data model changes

None. No new persisted schema. The check reads two existing values
(`.claude-plugin/plugin.json` `version` = `B`; `openspec/.qrspi-version` = `A`)
and holds one **in-context** boolean (the session-checked flag, no on-disk
representation — same as run-mode). No migration manifest is required (this
change adds behaviour to the kit, not a consumer-repo `openspec/` layout change;
a `migrations/<next>.yaml` stub with empty `automated`/`manual` is authored only
if/when this ships in a release, per the CHANGELOG/lint Check 6 floor rule).

## API surface

Kit "API" = slash commands + skills. Changes:
- **New skill** `qrspi-version-check` (shipped, `claude/skills/`). Inputs: none
  (reads `A`, `B` itself). Behaviour: the branch logic in D2–D7. Auth: n/a.
- **Nine modified command bodies** (`status`, `questions`, `research`, `design`,
  `structure`, `slices`, `plan`, `implement`, `pr`): each gains one preamble
  line naming the skill, positioned first (D4).
- No new command; no `plugin.json` edit (skills auto-registered from directory).

## UI surface

CLI/orchestrator only. The one new interactive surface is the behind-offer
AskUserQuestion (D5, two choices) and the reused no-marker gate (D5, delegated
to `/qrspi:update`). Downgrade and unreadable-`B` are print-only notices (D7,
D2). Up-to-date is **silent** (no confirmation line — Q18: avoid nagging on the
common path).

## Authorization

No auth model. The check never mutates repo state itself — it only reads two
files and, on acceptance, re-enters the human-gated `/qrspi:update`. The
"never a silent auto-migration" invariant is preserved: every state-changing
path (running update, initializing a marker) remains behind an AskUserQuestion.

## Vertical slices (preview)

Slices are cut by user-facing path (Structure will detail):
- **Slice 1 — the check surfaces in one command end-to-end:** author
  `qrspi-version-check` skill + embed it in `/qrspi:status` (the natural
  "where am I?" entry); demoable: running status on a behind repo shows the gap
  and offers update; up-to-date is silent; downgrade warns.
- **Slice 2 — the offer wires through to update:** accepting "Run now" re-enters
  `/qrspi:update`; no-marker delegates to update's gate; unreadable-`B`
  degrades. Demoable: full behind → accept → walk path.
- **Slice 3 — embed across the eight stage commands + session suppression:** add
  the preamble line to all eight stage bodies and the in-context flag so an
  auto-chain checks once. Demoable: a Q→PR chain checks at Q, stays quiet after.
- **Slice 4 — lint coverage + README + copilot sync:** the nine-body embed
  assertion, README skills-list entry, `sync-copilot.mjs` run. Demoable: lint
  fails if a command drops the embed; `--check` shows zero copilot drift.

## Risks / Trade-offs

- **Unverified `B` read (D2, primary risk).** The plugin-own-path read is the
  same unsolved OQ1 as `qrspi-update`. Mitigation: warn-and-proceed fallback +
  stage-I watch-item; the check never blocks a stage and never guesses a wrong
  version. If the read proves reliably impossible on some platforms, the feature
  degrades to "silent on those platforms" — acceptable, not a regression.
- **Nag frequency (D6).** Broad placement (nine commands) without suppression
  would nag ~9× per chain. The in-context flag makes it once-per-session; the
  residual risk is a user who runs many *standalone* stage calls in one OS
  session (each re-checks). Accepted per PQ3 — cheaper than disk state.
- **Two "top of body" instructions (D4/OQ1).** The version check and run-mode
  both claim "first thing." Ordering must be explicit in the skill or one may
  shadow the other. Surfaced as OQ1.
- **Session-flag durability (shared with run-mode).** A context compaction mid
  long session could drop the flag and re-trigger one check — the same known
  boundary run-mode already has (research open gap). Low impact (one extra
  cheap check), no new mechanism warranted.
- **`config.yaml` `openspec_version` vs kit version coupling** is an existing
  un-enforced gap (research) — explicitly out of scope here (Non-Goal).

## Open questions for the human

- [x] **OQ1 — ordering of the two "top of body" instructions.** D4 places the
  version check *before* run-mode establishment (so it precedes all side
  effects). Confirm: the version check runs first, then run-mode is established,
  then the precondition Glob? Or should run-mode come first (so the check can be
  suppressed in the same context branch)? Recommended: **version check first**,
  because its own session-flag guard (D6) already handles suppression
  independently of run-mode, and PQ7 requires it ahead of *all* side effects.
  **Answer: version check first** — runs before run-mode establishment and
  before the precondition Glob; run-mode is established immediately after. D4
  already encodes this ordering (no change needed).

- [x] **OQ2 — no-marker vs. onboarding overlap in `/qrspi:status` (PQ4).** In
  status, both the version check's no-marker delegation (→ `/qrspi:update`'s
  gate) and the existing onboarding check (→ `/qrspi:init`) can address a
  missing marker. Confirm the guard order: if `openspec/` is absent, onboarding
  wins (send to `/qrspi:init`) and the version check does nothing; the no-marker
  gate is reached only when `openspec/` exists but `.qrspi-version` does not.
  Recommended as stated — avoids two prompts for the same "not initialized" root
  cause while still honouring PQ4 for the marker-missing-but-initialized case.
  **Answer: onboarding wins when `openspec/` absent** — the version check does
  nothing when `openspec/` is missing (onboarding sends the user to
  `/qrspi:init`); its no-marker gate is reached only when `openspec/` exists but
  `.qrspi-version` does not. D5's no-marker/onboarding note already encodes this
  (no change needed).

## Dogfood findings (2026-07-23) — D2 REOPENED, implementation paused

Dogfooding the implemented change (`claude --plugin-dir` into a real consumer
fixture) surfaced a design-blocking finding. **Implementation is paused pending a
human design rethink of D2; the code is committed but must not ship as-is.**

**Finding (empirical).** Running `/qrspi:status` in a consumer repo whose CWD is
*not* the kit repo always hits the unreadable-`B` branch and prints
`version check unavailable — run /qrspi:update manually if needed`. Cause: step 2
of the `qrspi-version-check` skill reads `.claude-plugin/plugin.json` on a
**CWD-relative** path, but in a real consumer the plugin manifest lives at the
plugin's install location, not the working directory. The warn-and-proceed
fallback (D2) behaves correctly (no guess, no block), but the feature is
therefore **inert in its primary scenario** — it can never detect "behind". The
earlier 1.3 "behind" pass was a false positive: that session's CWD happened to be
the kit repo.

**This contradicts D2's founding premise** (and `qrspi-update` OQ1): the design
assumed *"no portable primitive for a command body to learn its own install
directory."* That assumption is **false**.

**Discovered portable source.** Claude Code exports `CLAUDE_CONFIG_DIR`
(default `~/.claude`), and `$CLAUDE_CONFIG_DIR/plugins/installed_plugins.json`
authoritatively records the installed version from any CWD:
```json
"qrspi@<marketplace>": [ { "installPath": ".../qrspi/0.7.0", "version": "0.7.0" } ]
```
`B` = that `.version` (match the `qrspi@*` key to avoid marketplace-name
coupling). This is arguably a *better* source than `plugin.json` — it is the
source of truth for "what is actually installed," which is exactly what the
marker should be compared against.

**Caveats to weigh in the rethink:**
- Reads Claude Code **internal state** (undocumented file shape; may change across
  CC versions) — a coupling `plugin.json` did not have.
- Marketplace-key coupling (`qrspi@lotea-agents`) — mitigate by matching `qrspi@*`.
- Under `--plugin-dir` this file reflects the *installed* release, not the
  working-dir plugin — a **dogfooding** caveat only; for a normally-installed
  consumer it is correct.

**Options for the reopened D2 (human decides):**
- **(a)** Adopt the portable source above; revise D2 + the `session-version-check`
  delta spec's "Version source B" requirement; re-implement skill step 2;
  re-dogfood.
- **(b)** Keep `plugin.json`; accept the feature is inert in real repos; document
  the limitation (low value — near-defeats the change's purpose).
- **(c)** Broader rethink of version sourcing (installed_plugins.json vs
  migrations-stem vs dropping/deferring the feature).

**Downstream if (a) or (c):** the `session-version-check` spec's Version-source
requirement + scenarios change; skill step 2 + task 1.x/2.6 re-verify; the up-to-
date-silence fix (commit `e0c4e9e`) stands regardless.
