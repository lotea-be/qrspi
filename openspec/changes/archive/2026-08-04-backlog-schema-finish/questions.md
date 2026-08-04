# Questions — backlog-schema-finish

> Stage Q of QRSPI. Generated 2026-07-31.
> Change summary: Finish the backlog-as-schema story by adding an idempotency guard to the `edit-file` migration dispatcher, a wikilink-resolution lint check for backlog cross-references, and a dedicated `/qrspi:idea` command for provisioning canonical backlog rows.

## Slash-command surface

1. Does `/qrspi:idea` ship as a standalone `claude/commands/idea.md` (a new slash command), or as an agent invoked by an existing command, or purely as a prose skill with no dedicated command file?

2. If `/qrspi:idea` is a slash command, does it run on the main loop (using `AskUserQuestion` to confirm the proposed band and placement), or does it delegate to a subagent that writes the row and returns the diff for orchestrator staging?

3. What is the exact invocation surface: positional args only (`/qrspi:idea <slug> <why>`), a single quoted string for the why, or an interactive interview that prompts for slug, why, and shape separately?

4. Should `/qrspi:idea` accept an explicit band argument (`/qrspi:idea <slug> <why> P2`) or always propose the band interactively and require the human to confirm?

5. Check 4 (README command coverage) asserts every `claude/commands/<stem>.md` must be documented as `/qrspi:<stem>` in `README.md`. When `/qrspi:idea` is added, what section of the README receives its entry (the stage table, the helpers line, or a new subsection)? Is there a "helpers" or "utility commands" category already, or does the README need a new one?

6. Check 9 (version-check embed) and Check 10 (budget-gate embed) each list exact command stems that must carry the embed lines. Does `/qrspi:idea` join either list — and if so, what is the policy (all stage commands get both; all non-stage commands that can chain stages get the budget gate)?

## Skill surface

7. Should the dedup logic for `/qrspi:idea` live in the command file prose, in a dedicated new skill (e.g. `backlog-writer`), or inline in the `qrspi-update` skill (since it already documents the manifest schema and backlog append mechanic)?

8. The `qrspi-update` skill currently documents the manifest schema and the `edit-file` dispatcher. When an idempotency-guard field (`skip_if_contains` or similar) is added, does the skill's "manifest schema contract" section gain a new sub-field entry, or does the guard live entirely in the dispatcher prose with no schema surface?

9. Does the deferred-work append mechanic (Q/D/S "capture deferred work" and `followup` P3 promote path) need to be extracted into a shared prose section (or skill) that `/qrspi:idea` reuses, or can the command duplicate the mechanic without risking schema drift?

## Lint-gate surface

10. Which Check number does the new wikilink-resolution check receive — Check 23 (next after the current last Check 22), or does it replace / extend Check 22 (`checkBacklogSchema`) in-place as an additional assertion inside that function?

11. The wikilink pattern in `openspec/backlog.md` is `[[<slug>]]`. Is the slug inside a wikilink always the same grammar as the row `<id>` field (kebab-case, `[a-z0-9]+(?:-[a-z0-9]+)*`), or can wikilinks reference other things (change folder names that contain date prefixes, arbitrary free text)? Does the lint check need to strip date prefixes when matching against archived folder names (e.g. `[[foo-bar]]` resolves to `openspec/changes/archive/2026-07-31-foo-bar/`)?

12. The current `openspec/backlog.md` contains many existing `[[slug]]` wikilinks (including some referencing items that may have been archived and had their backlog rows removed). If the new lint check fires immediately on the existing file as-written (before any cleanup), how many failures would that generate? Should the check ship behind a TODO-comment gate or `--fix` path to allow incremental cleanup, or does the check only apply to newly added rows?

13. For the archived-change resolution branch: when a slug resolves to an archived folder (`openspec/changes/archive/*-<slug>/`) but the row itself no longer exists in `openspec/backlog.md`, is that a pass, a warn, or a hard-fail? The backlog idea says "warn-only for the archived-row case if noisy" — has a count been made of how many existing wikilinks would hit this branch?

14. Should the wikilink lint also check wikilinks that appear in the body narrative text of the `## Ideas` P-band preamble block (the long prose paragraph at the top of the Ideas section) and in blockquote pointer notes, or only inside `### <id>` row bodies?

15. Does Check 6 (migration manifest schema) need to be extended to validate any new optional fields added by the idempotency guard (`skip_if_contains`, `skip_if_present`, or similar), or is the guard a dispatcher-only behaviour change that leaves the YAML schema (and therefore Check 6's assertions) unchanged?

16. If the idempotency guard is surfaced as a new YAML field validated by Check 6, does the check enforce it as optional (any `edit-file` step may omit it) or required (any `insert_after` step must carry it, to prevent future unguarded inserts from shipping)?

17. Check 22's self-test fixtures (`_stA` through `_stD`) run before file I/O to catch broken detectors. When the wikilink check is added (as a new assertion inside Check 22 or as a new Check 23), should it also carry inline fixtures that fire on a synthetic wikilink corpus, following the same pattern?

## Migration manifest

18. The idempotency guard must be backfilled onto `migrations/0.13.0.yaml`'s existing `insert_after` step. What is the exact new field name — `skip_if_contains`, `skip_if_present`, or something else — and what value does it hold: the marker string to search for, a boolean, or the full inserted `content` string?

19. The `0.13.0.yaml` `insert_after` step keys on `"# Backlog\n"` as its anchor. The anchor-fallback concern (a consumer whose backlog title differs hits a hard-stop) is a sibling concern in `migration-edit-file-idempotency-guard`. Should the anchor fallback be expressed as a new YAML field (`anchor_fallback: manual`), as a new `manual` step that pre-checks the anchor and instructs renaming before the automated step runs, or purely as dispatcher-only logic with no YAML surface?

20. Does backfilling the guard onto `0.13.0.yaml` require a new migration manifest (e.g. `0.13.1.yaml` that re-applies the guarded insert) so consumers who ran `0.13.0` without the guard can safely re-run, or is direct in-place editing of `0.13.0.yaml` sufficient (since the guard is additive and the step itself doesn't change behaviour for consumers who haven't yet applied it)?

21. After this change ships (at some new kit version `X.Y.Z`), should a new migration step in `migrations/X.Y.Z.yaml` carry a `manual` instruction asking consumers to verify their `openspec/backlog.md` has no dangling wikilinks (as a companion to the new wikilink lint check), or is the lint check enforcement enough on its own?

## Testing

22. `scripts/lint.mjs` is the sole test harness. The wikilink-resolution check will need to read archived folder names from the filesystem. How does the inline self-test fixture pattern handle filesystem-dependent assertions — does the check mock the archive folder list, or does it use a real sub-path under a temp/fixture directory that is committed alongside the check?

23. The current `checkBacklogSchema` in-line self-test (fixtures `_stA` through `_stD`) passes a raw text string without file I/O. If the wikilink check is added as an assertion inside that function, how does the fixture corpus encode "this slug has a matching archive folder" vs "this slug is dangling" — does the function accept an injected archive-folder list for test purposes, or does the test always operate on a canned text with no archive resolution?

24. Check 6 validates `automated[].action === 'edit-file'` and `automated[].path` starts with `openspec/`. If a new optional `skip_if_contains` field is added, does Check 6's validation need a positive-path test confirming a manifest with that field still passes schema validation (not just a negative test that an unknown field fails)?

25. For the `/qrspi:idea` command, there is no automated lint check covering its behaviour (the command runs in a Claude Code session, not in `node scripts/lint.mjs`). Does Check 4's README-coverage assertion suffice as the mechanical test (it asserts the command file exists and is documented), or should a new check (e.g. Check 23 or a new Check 4b) assert that `claude/commands/idea.md` carries specific structural markers (like the version-check embed)?

## Sequencing & scope

26. All three items depend on the just-frozen backlog schema (`standardize-backlog-format`, archived 2026-07-31). Is there any ordering dependency _among_ the three items within this bundle — specifically, does the wikilink lint (item 2) need to wait for the existing backlog wikilinks to be cleaned up before it can pass CI on this repo's own backlog, and does that cleanup belong inside this change or as a separate pre-step?

27. `backlog-wikilink-resolution-lint` is listed as "Depends on `[[standardize-backlog-format]]` having landed the row-id grammar first" — that dependency is now satisfied. Is there any dependency on `migration-edit-file-idempotency-guard` or `idea-capture-command` within this bundle, or can the three items be implemented as three independent slices in any order?

28. `per-slice-compute-tier` is currently `proposed` and in the QRSPI flow. Does any part of `backlog-schema-finish` touch the same files as `per-slice-compute-tier` (e.g., `scripts/lint.mjs`, `openspec-templates/`, or `claude/skills/qrspi-update/SKILL.md`) in a way that could produce merge conflicts if both flows are in flight simultaneously?

29. The `idea-capture-command` item notes it "reuses the same append mechanic the Q/D/S deferred-work flow and the `/qrspi:pr` / `/qrspi:followup` P3 path already embed." Should this change also refactor those embedded mechanics into the shared location (a form of cleanup/dedup), or strictly add the new command without touching the existing flows?

30. The per-file `backlog/<id>.md` model is explicitly out of scope (deferred to post-1.0). Does the design of `/qrspi:idea` need to leave any extension point or hook for that future model, or should it be built to the current flat `openspec/backlog.md` grammar only, with the assumption that post-1.0 can migrate?

## Open product questions (for the human)

- [x] **PQ1 — idempotency guard field name and schema surface:** **Answer: (a) `skip_if_contains: "<marker>"` — a new optional YAML field; the dispatcher skips the insert when the marker is already present in the target region; Check 6 extended to accept (not require) it.** What should the idempotency guard field for `edit-file` steps be called, and should it appear in the YAML manifest schema (making it a validator-visible field) or live only in the dispatcher prose? Options:
  (a) `skip_if_contains: "<marker>"` — a new optional YAML field; the dispatcher checks for the marker string in the target file region before applying the insert; Check 6 is extended to accept (but not require) the new field (Recommended) — closest to the described mechanism and fully self-documenting in the YAML,
  (b) `skip_if_present: true` — a simpler boolean that tells the dispatcher to skip if the full `content` string is already found in the file; less flexible but trivially derivable without a separate marker,
  (c) dispatcher-only behaviour, no YAML surface — the dispatcher always checks for content presence before `insert_after` with no new YAML field; existing manifests are unmodified in their YAML shape.

- [x] **PQ2 — anchor fallback for absent/renamed backlog title:** **Answer: (a) `anchor_missing: warn-and-skip` — the dispatcher emits a human-readable warning and skips the step instead of hard-stopping when the anchor is absent.** When the `insert_after` anchor (e.g. `"# Backlog\n"`) is absent from the consumer's file, should the dispatcher degrade gracefully or keep its current hard-stop? Options:
  (a) New `anchor_missing: warn-and-skip` YAML field — the dispatcher emits a human-readable warning and skips the step rather than hard-stopping; the migration's `manual` section already instructs the human on what to do (Recommended) — avoids silent failure and avoids a hard-stop that blocks all subsequent migration steps,
  (b) Add a guarded `manual` pre-step to `0.13.0.yaml` instructing consumers to rename their backlog title before the automated step runs — no dispatcher change needed; the manual step is the safety net,
  (c) Keep the current hard-stop — the `# Backlog` title is required by the template and consumers who deviate have already broken the schema; a hard-stop is the right signal. Note: if PQ1 picks option (c) (dispatcher-only), this question also folds into dispatcher behaviour.

- [x] **PQ3 — wikilink lint severity for archived-row references:** **Answer: (a) Pass silently — a `[[slug]]` resolving to an archived change folder is a valid resolved state, even when the live backlog row is gone.** When a `[[slug]]` in `openspec/backlog.md` resolves to an archived change folder (`openspec/changes/archive/*-<slug>/`) but the row no longer exists in the backlog itself, should the lint check pass, warn, or hard-fail? Options:
  (a) Pass silently — an archived-folder resolution is a valid resolved state; the pointer is informational and the change landed (Recommended) — avoids noise since many existing wikilinks reference archived changes,
  (b) Warn (non-blocking) — emit a note that the cross-reference target is archived; useful for eventual cleanup but doesn't fail CI,
  (c) Hard-fail — all `[[slug]]` references must point to a live backlog row; archived references are stale and must be updated to prose. Note: PQ3's answer also determines the scope of pre-shipping backlog cleanup required in this very change.

- [x] **PQ4 — wikilink lint scope (which occurrences are checked):** **Answer: (a) Check all `[[slug]]` occurrences in the file — including the P-band preamble prose and blockquote pointer notes, not just `### <id>` row bodies.** Should the new wikilink lint check every `[[slug]]` occurrence in `openspec/backlog.md` (including the P-band narrative prose block, blockquote pointer notes, and row bodies), or only `[[slug]]` references inside `### <id>` row bodies? Options:
  (a) Check all occurrences in the file — the most complete coverage; catches broken links in the preamble prose too (Recommended) — the preamble prose is the most wikilink-dense part of the current backlog,
  (b) Check only `### <id>` row bodies — simpler to implement (the parser already tokenises rows); the preamble prose is narrative and wikilinks there are less formal.

- [x] **PQ5 — `/qrspi:idea` command vs. agent:** **Answer: (a) Main-loop, lightweight command — pure capture (read `openspec/backlog.md`, dedup by intent, propose band + placement, prompt for the one-sentence shape, stage the row); no subagent, no new `claude/agents/` file. Idea complexity/research is deferred to the Q→R→D flow when the idea is later picked up — capture ≠ research.** Should `/qrspi:idea` be a main-loop command (no `agent:` frontmatter, runs directly with `AskUserQuestion` gates) or delegate to a subagent that produces the row diff and returns it for the orchestrator to stage? Options:
  (a) Main-loop command — simpler, no Agent tool overhead; the command itself deduplicates by reading `openspec/backlog.md`, proposes a band + placement, asks for confirmation via AskUserQuestion, and stages the edit (Recommended) — a single-row append is well within main-loop complexity,
  (b) Subagent — wraps the append logic in an agent for context isolation; useful only if the dedup logic becomes complex enough to warrant it. Note: the PQ5 answer drives whether a new `claude/agents/` file is needed (if PQ5(b), one is required and Check 7 would need to be extended for the new agent).

- [x] **PQ6 — `/qrspi:idea` shape prompt:** **Answer: (a) Prompt for the one-sentence `**Shape:**` interactively so the row is complete and schema-valid (Check 22) on capture.** Should `/qrspi:idea` prompt the human for a `**Shape:**` sketch during the interactive interview, or write a `**Shape:** TBD.` placeholder that the human fills in later? Options:
  (a) Prompt for Shape interactively — the command asks for a one-sentence sketch before staging; the row is complete immediately (Recommended) — avoids a lint violation (Check 22 requires `**Shape:**` on standalone idea rows),
  (b) Write `**Shape:** TBD.` placeholder — faster capture but leaves the row technically schema-compliant only if Check 22 accepts bare "TBD"; confirm that Check 22's `**Shape:**` detector accepts any non-empty value (it scans for `/^\*\*Shape:\*\*/m`, so "TBD" would pass). Note: if PQ6(b), the command description should warn that the row needs a shape before it is meaningful.

- [x] **PQ7 — check numbering for the wikilink lint:** **Answer: (a) Separate Check 23 in `scripts/lint.mjs` — its own numbered check with header + self-test, matching the one-concern-per-check pattern.** Should the new wikilink-resolution lint be added as an additional assertion inside the existing `checkBacklogSchema` function (Check 22 gains a new assertion 7) or as a separate top-level Check 23 with its own header comment and self-test block? Options:
  (a) Separate Check 23 — consistent with how every other check is structured; gives the check its own header in the lint output, its own self-test, and a clear "check N" identity for future citation (Recommended) — the pattern in `scripts/lint.mjs` is one logical concern per numbered check,
  (b) Additional assertion inside Check 22 — keeps all backlog-schema logic together; simpler if the wikilink check shares the parser and archive-folder lookup with the rest of Check 22.
