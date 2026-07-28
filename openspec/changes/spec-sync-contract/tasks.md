# Tasks — spec-sync-contract

> Stage P of QRSPI. Tick boxes as you implement. Order matters.

## 1. Corrected merge contract, end-to-end runtime path

**Compute:** model=opus effort=high — first-of-kind helper agent with a non-obvious count-drop contract, re-spawn flag semantics, three distinct result-signal branches, and the generated-skill bypass that is the highest-risk element of the design (D2).

- [ ] 1.1 Write `claude/agents/spec-syncer.md` with least-privilege tool set (Read, Edit, Bash, Glob, Skill), `> **Read contract**` banner, authoritative wholesale-replacement body, count-drop hard-stop logic, structured result signals (`synced` / `blocked-on-count-drop` / `escape-hatch`), and confirmed-count-drop-ok re-spawn flag handling. (D1, D3)
- [ ] 1.2 Add a `spec-syncer` entry to `plugin.json`'s `agents` array. (D1)
- [ ] 1.3 Edit `claude/commands/archive.md` to insert step 4a that spawns `spec-syncer` (`subagent_type: qrspi:spec-syncer`) before the folder move; remove the happy-path "Sync now / Archive without syncing" prompt; retain the escape-hatch prompt (`escape-hatch` signal only); add count-drop AskUserQuestion flow (confirm -> re-spawn with flag / abort); add the already-synced bypass instruction so the generated skill's post-4a sync prompt is declined. (D2, D4, D5)
- [ ] 1.4 Run `node scripts/lint.mjs` from the repo root -- must exit 0 (Checks 1-16 only; Checks 17-19 do not exist yet at this slice). Fix any failures before proceeding.
- [ ] 1.5 (human) Dev-install the in-development copy (`claude --plugin-dir /workspaces/git/qrspi`) in a fresh terminal outside this repo. Build throwaway consumer fixture (a) in the scratchpad: a delta with a `## MODIFIED Requirements` block containing fewer `#### Scenario:` blocks than the base spec. Invoke `/qrspi:archive <fixture-a>` and verify the command hard-stops naming the requirement and counts, with the base spec untouched.
- [ ] 1.6 (human) Build throwaway consumer fixture (b) in the scratchpad: a clean delta (equal or more scenarios). Invoke `/qrspi:archive <fixture-b>` and verify archive completes with no sync prompt and the generated skill's sync phase is bypassed (already-synced branch, no second sync spawn). **Watch item (D2):** confirm the generated skill does NOT offer a second "Sync anyway" prompt after step 4a; if it does, the bypass instruction in `archive.md` is incomplete.

## 2. Author-side guidance and kit CI guards (Checks 18 & 19)

**Compute:** model=sonnet effort=medium — mechanical lint checks following the established dependency-free ESM pattern already in `scripts/lint.mjs`; no novel reasoning, templated after existing checks.

- [ ] 2.1 Strengthen the MODIFIED comment in `openspec-templates/spec-delta.template.md` to state unambiguously that MODIFIED = wholesale replacement and all scenarios must be repeated in full. (D7)
- [ ] 2.2 Add `checkModifiedScenarioCounts` (Check 18) to `scripts/lint.mjs` after the highest existing Check number, using the dependency-free ESM async-function pattern. Check must: parse delta specs at `openspec/changes/*/specs/**/spec.md`; count `#### Scenario:` blocks under `## MODIFIED Requirements` per requirement title; look up the base count in `openspec/specs/<capability>/spec.md`; flag any reduction; skip requirements where the base capability spec does not exist (new capability). (D6)
- [ ] 2.3 Add `checkAuthoritativeSyncDelegator` (Check 19) to `scripts/lint.mjs` after Check 18: assert (a) `claude/commands/archive.md` contains `qrspi:spec-syncer`; (b) no kit-owned file under `claude/commands/` or `claude/agents/` contains `subagent_type: general-purpose` in proximity to a sync-context string. (D8)
- [ ] 2.4 Run `node scripts/lint.mjs` with a synthetic scenario-dropping delta fixture placed at `openspec/changes/lint-test-fixture/specs/foo/spec.md` (with a matching base at `openspec/specs/foo/spec.md`) -- Check 18 must exit non-zero and name the requirement and counts.
- [ ] 2.5 Run `node scripts/lint.mjs` with `claude/commands/archive.md` temporarily missing the `qrspi:spec-syncer` reference -- Check 19 must exit non-zero.
- [ ] 2.6 Restore `archive.md` and remove the synthetic fixture. Run `node scripts/lint.mjs` clean -- must exit 0. Commit only after the clean pass.

## 3. Read-contract wiring and Check 17

> **Ordering note for the implementer:** Check 17 (`checkHelperAgentReadContracts`) is added in this slice but is numerically earlier than Checks 18 and 19 written in Slice 2. Insert Check 17 **before** the Check 18 function in `scripts/lint.mjs` (i.e., between Check 16 and Check 18 by line order), not appended at the end of the file.

**Compute:** model=sonnet effort=low — Read Matrix prose addition is templated (mirrors the existing stage-agent rows); Check 17 follows the established lint check pattern and the map has a single entry.

- [ ] 3.1 Add a "Helper agents" subsection to the Read Matrix table (or its surrounding prose) in `claude/skills/workflow/SKILL.md` with a `spec-syncer` row stating within-change reads (`specs/**` delta) and cross-change reads (`openspec/specs/**` via the spec.md exception), and explicitly stating it opens no process artifacts. (D9)
- [ ] 3.2 Add `checkHelperAgentReadContracts` (Check 17) to `scripts/lint.mjs`, inserted before Check 18 so that Check numbers are sequential (17 -> 18 -> 19) in file order. Check must: maintain a separate hardcoded `HELPER_READ_CONTRACT_EXPECTED` map (distinct from Check 7's `READ_CONTRACT_EXPECTED` for stage agents) with initial entry `{ "spec-syncer": "specs/** (delta) and openspec/specs/** (main)" }`; assert each helper agent file carries a `> **Read contract**` banner whose `Reads:` field matches the map entry; include an inline in-memory self-test following Check 15's pattern (run banner-detection logic against a synthetic fixture string representing a missing banner, assert the detector fires, push a Check 17 error if the self-test fails); NOT widen Check 7's nine-agent scope. (D9)
- [ ] 3.3 Run `node scripts/lint.mjs` from the repo root with `claude/agents/spec-syncer.md` as written by Slice 1 -- Check 17 must report OK and the overall exit code must be 0.
- [ ] 3.4 Temporarily remove the `> **Read contract**` banner line from `spec-syncer.md` -- Check 17 must exit non-zero and name `spec-syncer` as missing. Restore the banner immediately after confirming the failure. Verify Check 17 does NOT flag `claude/agents/architect.md` (a stage agent, not in `HELPER_READ_CONTRACT_EXPECTED`).
- [ ] 3.5 Run `node scripts/lint.mjs` clean (all three checks -- 17, 18, 19 -- in place, correct `spec-syncer.md`, clean fixtures) -- must exit 0. This is the final lint gate before committing this slice.
