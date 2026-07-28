# Questions — unify-implement-paths-on-variants

> Stage Q of QRSPI. Generated 2026-07-27.
> Change summary: Unify all implementer dispatch paths so every `/qrspi:implement`
> and `/qrspi:followup` invocation routes through the effort-variant mechanism
> (no dead or vestigial base-implementer path), and add a one-line cwd/change-folder
> invariant note to affected stage commands as bundled completion work.

<!-- Surface-gate applied: the qrspi-stack cheatsheet declares surfaces
     slash-command, stage-agent, skill, lint-gate, template, migration-manifest.
     None of these map to data-store / http-api / ui / auth in the repo-surface
     taxonomy, so those four sections are omitted. Only surface-independent
     sections (Testing, Sequencing & scope, Open product questions) are emitted. -->

---

## Implementer dispatch — current state

1. **Normal slice path** (`/qrspi:implement`): the command reads the next slice's
   `**Compute:** effort=<low|medium|high>` token and spawns the matching
   `qrspi:implementer-<effort>` variant. The base `implementer.md` is NOT spawned
   here.

2. **Post-PR FIX MODE path** (`/qrspi:followup`): spawns `qrspi:implementer`
   (the base) with `model: sonnet` (or the inline `(compute: model=…)` override).
   `effort=` from the inline spec is noted as documenting intent but has no
   mechanically-enforced effect (the Agent tool carries no per-invocation effort
   param; only frontmatter `effort:` applies at spawn time). The base agent's
   frontmatter is `effort: high`, so FIX MODE today always spawns a high-effort
   agent even though fixes are typically small.

3. **Trivial / inline-plan path** (`/qrspi:implement` with no `tasks.md`): the
   command allows a one-paragraph plan stated by the user and then spawns an
   implementer — but the command text does not specify which variant to spawn in
   this case. Reading the prose, it appears to fall through to the base.

4. **Skill-set registry** (`scripts/skill-sets.mjs`): the `implementer` entry
   lists `['context-hygiene', 'implementer-core', 'vertical-slice', 'workflow']`.
   Lint Check 2 asserts this against the actual agent file. The three variants
   (`implementer-low/medium/high`) are each a one-liner that loads only
   `implementer-core`; Check 15 enforces that invariant.

5. **Read/Output contract banners** (Checks 7 and 12): the banners live on the
   base `implementer.md` only. No banners exist on the three variants (Check 15's
   scope is explicitly "NOT covered here -- they are covered by Check 7").

6. **Lint Check 15** asserts the variant set equals `IMPLEMENTER_VARIANTS`
   constant, each variant loads only `implementer-core`, and each variant's
   `effort:` frontmatter matches its stem suffix. It does NOT assert anything
   about the base `implementer.md`.

---

## Dispatch unification — variant routing

7. **Effort token for FIX MODE.** The followup command currently parses an
   optional inline `(compute: effort=…)` spec but documents it as "documents
   intent only -- the frontmatter `effort:` is the actual knob." To make the
   followup path use a variant, the command must map the parsed (or default)
   `effort=` to a spawnable variant `subagent_type`. What should the default
   effort be for FIX MODE when no `(compute: effort=…)` is present?
   Options: (a) `low` (most fixes are single-file, below-sonnet complexity),
   (b) `medium` (a safe mid-point covering the typical bug-fix scope),
   (c) `high` (matches the current implicit behavior -- base agent has
   `effort: high`).

8. **Trivial / inline-plan effort.** When `tasks.md` is absent and the user
   supplies a one-paragraph inline plan, which variant should be spawned?
   Options: (a) `medium` (default, captures the uncertainty of an unplanned
   change), (b) `low` (user invoked inline-plan mode, implying a small scope),
   (c) require the user to also specify an `effort=` token alongside the
   inline plan.

9. **Base `implementer.md` fate after unification.** Three options for the
   base file once every dispatch path routes through variants:
   (a) Delete it entirely -- the variants plus `implementer-core` carry all
   behavior; remove from `plugin.json`'s `agents` array and drop the
   skill-sets registry entry.
   (b) Demote it to a thin "documentation-only / non-spawnable anchor" file --
   keep it in the repo but remove it from `plugin.json`'s `agents` array so
   it cannot be spawned; host the Read/Output contract banners (Checks 7 and 12)
   and the skill-set registry entry on it.
   (c) Promote the base to a dispatcher stub -- keep it spawnable
   (`plugin.json`) but rewrite its body to route to a variant at runtime (not
   currently possible: the Agent tool requires a static `subagent_type`, and an
   agent cannot re-spawn a sibling agent without orchestrator involvement).
   Which option fits the design intent?

10. **Contract banner relocation.** Checks 7 and 12 currently assert Read/Output
    contract banners on `implementer.md` (the base). When option (a) or (b) from
    Q9 is chosen, the banners must move. Three candidate landing spots:
    (a) Keep them on the base file, which is retained as a non-spawnable doc anchor
    (aligns with Q9-b).
    (b) Duplicate them onto all three variants (Check 7/12 would need to expand
    their scope from `implementer` to include the three variant stems).
    (c) Move them to `implementer-core/SKILL.md` -- the single source of truth
    for all implementer behavior already lives there.
    Note: Check 7 currently uses a hardcoded seven-agent stem list including
    `implementer`. Any relocation requires a lint update.

11. **Skill-set registry entry for `implementer`.** `scripts/skill-sets.mjs`
    exports `SKILL_SET_EXPECTED` with an `implementer` key listing four skills.
    After unification, should that entry:
    (a) Move entirely -- rename the key from `implementer` to cover variants
    (e.g. `implementer-low`, `implementer-medium`, `implementer-high`, each
    with the same four skills)?
    (b) Stay as `implementer` on the base doc-anchor file (if Q9-b), and add
    variant entries that only list `['implementer-core']`?
    (c) Be dropped from `skill-sets.mjs` for the base, and variants continue
    to be excluded (Check 15 already covers them separately)?

12. **Check 15 scope expansion.** Check 15 today asserts the three variants match
    `IMPLEMENTER_VARIANTS` and load only `implementer-core`. After Q9/Q10 land,
    should Check 15 also assert:
    (a) The base file is ABSENT from `plugin.json` agents (if Q9-a: deleted)?
    (b) The base file is present but NOT listed in `plugin.json` agents (if Q9-b:
    demoted)?
    (c) No change to Check 15 -- rely on Check 2 and Check 7/12 to cover the
    base file's new form?

---

## CWD / change-folder invariant (bundled rider)

13. **Scope of the cwd note.** The `commands-assert-cwd-change-folder` backlog
    item asks for a note clarifying that `openspec/changes/<id>/` resolves against
    the current working repo (CWD), not the plugin install dir. Which command
    files should carry the note?
    Options: (a) Only the files this bundle already rewrites (`implement.md`,
    `followup.md`), keeping the rider's blast radius exactly at zero net-new files.
    (b) All nine stage command files (the ones that reference change-folder paths),
    since the confusion is not unique to implement/followup.
    (c) Only the precondition/Glob preamble section of every command that Globs
    `openspec/changes/<id>/` -- a targeted structural anchor rather than a
    prose note.

14. **Note landing spot.** Where in the command file should the cwd note appear?
    Options: (a) In the precondition section, immediately before or after the Glob
    instruction ("Glob `openspec/changes/<id>/...` from the **current repo root**,
    not from the plugin install directory").
    (b) In the `qrspi-dogfood` skill's gotchas section only (since the confusion
    is observed exclusively in `--plugin-dir` dogfood sessions, not in real consumer
    installs).
    (c) Both (a) and (b): a brief in-command anchor plus a fuller gotchas entry.

15. **Note form -- command vs. skill.** Should the note be:
    (a) A one-line prose note embedded directly in the command file body (low
    friction, immediately visible to the agent reading the command).
    (b) A reference to the `qrspi-dogfood` skill ("see the `qrspi-dogfood` skill
    for cwd/plugin-dir gotchas") so the command stays thin.
    (c) A one-line note in both the command and the skill (belt-and-suspenders,
    at the cost of a two-place edit when the wording changes).

---

## Lint consistency

16. **Check 7 stem list.** Check 7 uses a hardcoded list of the seven stage agents
    whose Read-contract banners it asserts. If the base `implementer.md` is deleted
    (Q9-a) or demoted to a non-spawnable file, does the Check 7 stem list contract
    or stay at seven? Who "owns" the implementer row's banner after relocation?

17. **Check 2 (frontmatter/skill resolution).** Check 2 validates that every skill
    name referenced in a `Load skill X` line resolves to a real
    `claude/skills/<X>/SKILL.md`. After unification, if the base `implementer.md`
    drops its `Load skills implementer-core, workflow, …` preamble (because it is
    no longer spawnable), does Check 2 need updating, or does removing the load
    lines automatically satisfy it?

18. **New check needed?** Is there a structural invariant the unification introduces
    that no existing check covers, and that would be cheap to add? For example:
    asserting that `followup.md` never spawns `qrspi:implementer` (the base) -- only
    `qrspi:implementer-<effort>` variant stems.

---

## Testing

19. **Lint self-test for Check 15 post-change.** Check 15 includes an inline
    self-test that asserts the detector fires on a synthetic bad-variant fixture.
    After the base-file disposition (Q9) and any Check 15 scope expansion (Q12),
    the self-test fixture must still match the new expected-set logic. What is the
    minimal adjustment needed to the inline self-test?

20. **Dogfood scenario for FIX MODE variant routing.** The key behavioral change
    is that `/qrspi:followup` now spawns a variant rather than the base. The
    `qrspi-dogfood` skill defines how to verify `(human)` tasks in a real
    `--plugin-dir` session. What is the minimal end-to-end scenario that confirms
    the right variant is spawned (e.g., a test change with a `followups.md` entry
    and a `(compute: effort=low)` spec, observing the agent name in the session
    output)?

21. **Trivial-path dogfood.** The inline-plan bypass (no `tasks.md`) should also
    spawn a variant after this change. Is there a quick way to assert the right
    variant fires -- e.g., a deliberate one-liner fix stated inline, observing
    which subagent is launched?

22. **Lint green after each slice.** The lint script (`node scripts/lint.mjs`) is
    the sole test gate. Each implementation slice must leave the lint green before
    committing. Which checks are expected to turn red mid-change (temporarily, as
    files are edited) and therefore determine the slice order? Candidate ordering
    constraint: Check 7 and Check 12 must stay green at every slice boundary
    (banners must always live somewhere valid); Check 15 may be temporarily red
    only during the slice that moves the base file.

---

## Sequencing & scope

23. **Slice ordering.** Given the dependencies between sub-tasks (followup dispatch
    rewrite, base file disposition, lint check updates, cwd note insertion), what
    is the natural vertical slice order? Candidate: (1) followup.md dispatch rewrite
    + trivial-path fix in implement.md (the behavioral change), (2) base-file
    disposition + contract banner relocation + skill-sets.mjs update + lint check
    updates, (3) cwd note insertion (the bundled rider). Does this ordering keep
    lint green at every boundary?

24. **Interaction with `richer-effort-vocab-and-thinking`.** That backlog idea adds
    new effort tiers (e.g. `xhigh`, `max`) and notes "each new tier needs its own
    static `implementer-<tier>` variant." This change is explicitly NOT bundling
    that item (per the backlog entry). Confirm: this change only handles
    `{low, medium, high}` and leaves `IMPLEMENTER_VARIANTS` at those three stems.
    Any new tier added later just appends a new variant -- no structural constraint
    from this change's design prevents that.

25. **Interaction with `compute-escalation-on-failure`.** That backlog idea would
    have the orchestrator re-spawn a slice on a higher-effort variant after a
    failure. This change's dispatch unification is a prerequisite (the followup
    path must use variants before escalation can re-target one). Confirm that this
    change does NOT implement escalation logic -- it only standardizes the routing;
    escalation remains a separate, subsequent backlog item.

26. **Migration manifest.** `migrations/0.10.0.yaml` already exists in the repo.
    Does this change require a new or amended migration step in that manifest, or
    does the base-file disposition (Q9) fall entirely within the "rewrite existing
    command/agent files" category that a migration manifest is not needed for?

---

## Open product questions (for the human)

- [x] **PQ1 — FIX MODE default effort:** When `/qrspi:followup` has no inline
  `(compute: effort=…)` spec, which variant should it spawn by default?
  Options: (a) `low` -- most post-PR fixes are small, single-file, below-sonnet
  complexity; (b) `medium` -- a safe mid-point that covers the typical bug-fix
  scope without over-provisioning; (c) `high` -- preserves today's implicit
  behavior (base agent's `effort: high` frontmatter). Note: if PQ1 selects
  `medium` or `high`, PQ2's "user states effort inline for trivial path" option
  becomes more consistent.
  **Answer: (b) `medium` — FIX MODE defaults to the `medium` variant when no
  inline `effort=` is present. Safe mid-point; avoids both the over-provisioning
  of today's implicit `high` and the under-provisioning of `low` on subtle fixes.**

- [x] **PQ2 — trivial / inline-plan effort:** When the user invokes
  `/qrspi:implement` without a `tasks.md` and provides a one-paragraph plan,
  which effort should be used?
  Options: (a) `medium` (safe default for an unspecified scope); (b) `low`
  (caller chose inline mode, implying a small scope); (c) require the user to
  supply an explicit `effort=<low|medium|high>` token alongside the inline plan
  (most rigorous; adds a friction bump). Note: the answer here also determines
  whether the "trivial exception" prose in `implement.md` needs a new required
  token.
  **Answer: (a) `medium` — the inline-plan / no-`tasks.md` path spawns the
  `medium` variant, no new required token. Keeps the trivial path frictionless
  (no extra token demanded) while treating the absent plan as unspecified scope
  rather than assumed-small. Consistent with PQ1's `medium` default; option (c)
  is rejected to avoid the friction bump.**

- [x] **PQ3 — base `implementer.md` fate:** After all paths route through
  variants, what happens to `implementer.md`?
  Options: (a) Delete it -- remove from `plugin.json` and the repo entirely
  (cleanest, smallest surface, requires Check 7/12 banners and the skill-sets
  entry to move elsewhere); (b) Demote to a non-spawnable doc anchor -- keep
  the file, remove from `plugin.json` agents, retain Check 7/12 banners and
  the skill-sets entry on it (lowest disruption to lint, preserves a
  human-readable "what is the implementer" doc); (c) Something else the design
  stage should propose. Note: PQ3 is the highest-leverage decision -- it
  directly determines the scope of the lint check updates (Q10, Q11, Q12, Q16).
  **Answer: (a) Delete it — remove `implementer.md` from `plugin.json`'s `agents`
  array and from the repo entirely. This is the whole point of "unify — no dead
  route," and aligns with the road-to-1.0 goal of removing vestigial paths before
  declaring stable. Consequence for the D/S stages: the Read/Output contract
  banners (Checks 7 & 12) and the `skill-sets.mjs` `implementer` entry must
  relocate — the D stage designs the landing spot (leaning `implementer-core` as
  the single source of truth). This resolves the demote-oriented sub-options in
  Q10 (→ not 10a), Q11, Q12, and Q16 toward the delete branch.**

- [x] **PQ4 — cwd note blast radius:** Should the CWD / change-folder invariant
  note be added only to the files this bundle already rewrites (`implement.md`
  and `followup.md`), or to all nine stage command files?
  Options: (a) Implement + followup only (zero net-new blast radius); (b) All
  nine stage commands (thorough, consistent, larger diff); (c) Only commands
  that Glob `openspec/changes/<id>/` in their precondition (targeted, roughly
  the same set as (b) minus the trivial ones). Note: PQ4's answer determines
  whether the bundled rider is a one-file edit or a broader sweep; the Design
  stage should scope this precisely from the answer.
  **Answer: (a) Implement + followup only — the cwd/change-folder invariant note
  lands only on the two files this bundle already rewrites. Keeps the P3 rider a
  genuine free rider with zero net-new blast radius; the bundle stays focused on
  the unify work. Broadening to the full stage-command set is left as a possible
  future consistency pass, out of scope here.**
